import 'server-only'
import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { generaProgressivo } from '@/lib/db/progressivi'
import { generaFatturaPA } from '@/lib/fattura/generate-xml'
import type { LavoroDettaglio } from '@/types/domain'

export interface BatchResult {
  lavoro_id: string
  numero_lavoro: string
  ok: boolean
  numero_fattura?: string
  error?: string
}

// ─── POST /api/fatture/batch ──────────────────────────────────────────────────
// Genera fatture in batch per un array di lavori consegnati non ancora fatturati.
//
// Body: { lavoro_ids: string[] }
// Response: { results: BatchResult[], generati: number, errori: number }
export async function POST(req: Request) {
  // ── CSRF + auth ──────────────────────────────────────────────────────────
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const {
    data: { user },
  } = await userClient.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }

  const svc = getServiceClient()

  const { data: utente } = await svc
    .from('utenti')
    .select('laboratorio_id')
    .eq('id', user.id)
    .single()

  if (!utente?.laboratorio_id) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const labId: string = utente.laboratorio_id

  // ── Parsing body ─────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const lavoro_ids: string[] = Array.isArray(body?.lavoro_ids) ? (body.lavoro_ids as string[]) : []

  if (lavoro_ids.length === 0) {
    return NextResponse.json({ error: 'Nessun lavoro selezionato' }, { status: 400 })
  }

  if (lavoro_ids.length > 50) {
    return NextResponse.json({ error: 'Massimo 50 lavori per batch' }, { status: 400 })
  }

  // ── Processa ogni lavoro ─────────────────────────────────────────────────
  const results: BatchResult[] = []

  // Rollback del claim di Step 0: senza reset il lavoro resterebbe con
  // incluso_in_fattura=true "orfano" (nessuna fattura), bloccando l'annullo
  // via cintura fiscale e ogni retry futuro del batch.
  const rollbackClaim = async (lavoroId: string) => {
    await svc
      .from('lavori')
      .update({ incluso_in_fattura: false })
      .eq('id', lavoroId)
      .eq('laboratorio_id', labId)
  }

  for (const lavoro_id of lavoro_ids) {
    // Step 0: Claim atomico — previene doppia fatturazione con richieste batch concorrenti.
    // Solo la prima richiesta che esegue questo UPDATE procede; l'altra trova incluso_in_fattura=true.
    const { data: claimed } = await svc
      .from('lavori')
      .update({ incluso_in_fattura: true })
      .eq('id', lavoro_id)
      .eq('laboratorio_id', labId)
      .eq('stato', 'consegnato')
      .eq('incluso_in_fattura', false)
      .eq('decisione_fatturazione', 'fatturare')
      .is('deleted_at', null)
      .select('id')
      .single()

    if (!claimed) {
      results.push({
        lavoro_id,
        numero_lavoro: lavoro_id,
        ok: false,
        error: 'Lavoro non trovato, non consegnato, già fatturato, o claim concorrente',
      })
      continue
    }

    // Step 1: Carica lavoro completo con tutti i join necessari per generaFatturaPA
    const { data: lavoro, error: lavoroErr } = await svc
      .from('lavori')
      .select(`
        id,
        laboratorio_id,
        numero_lavoro,
        consegna_in_corso,
        anno_lavoro,
        codice_interno,
        numero_prescrizione,
        numero_cassetta,
        cliente_id,
        paziente_id,
        tecnico_id,
        ciclo_id,
        paziente_nome_snapshot,
        paziente_nascita_snapshot,
        tipo_dispositivo,
        descrizione,
        note_interne,
        richiedente_nome,
        colore_dente,
        colore_collo,
        colore_corpo,
        colore_incisale,
        effetti_speciali,
        tecnica_colore,
        colorazione_esterna,
        denti_coinvolti,
        arcata,
        anamnesi_note,
        anamnesi_bruxismo,
        anamnesi_precauzioni,
        anamnesi_altri_dispositivi,
        classe_rischio,
        norma_riferimento,
        da_conformare,
        dispositivo_semilavorato,
        stato,
        priorita,
        data_ingresso,
        data_consegna_prevista,
        ora_consegna,
        data_prima_prova,
        data_seconda_prova,
        data_terza_prova,
        data_consegna_effettiva,
        file_stl_url,
        immagini_urls,
        impronta_digitale,
        incluso_in_fattura,
        listino_id,
        prezzo_unitario,
        codice_iva,
        natura_iva,
        conformato,
        data_conformazione,
        is_rifacimento,
        consegna_tap_at,
        consegna_completata_at,
        post_consegna_correzioni,
        consegna_precheck_passato_al_primo_tentativo,
        spedizione_corriere,
        spedizione_tracking,
        spedizione_stato,
        spedizione_data_prevista,
        spedizione_note,
        created_at,
        updated_at,
        deleted_at,
        cliente:clienti(*),
        paziente:pazienti(*),
        tecnico:tecnici(*),
        lavorazioni:lavori_lavorazioni(*),
        appuntamenti:lavori_appuntamenti(*),
        immagini:lavori_immagini(*),
        fasi:lavori_fasi(*, fase:fasi_produzione(*)),
        materiali:lavori_materiali(*),
        ddc:dichiarazioni_conformita(*)
      `)
      .eq('id', lavoro_id)
      .eq('laboratorio_id', labId)
      .eq('stato', 'consegnato')
      .eq('decisione_fatturazione', 'fatturare')
      .is('deleted_at', null)
      .neq('ddc.stato', 'annullata')
      .single()

    if (lavoroErr || !lavoro) {
      // La load è fallita dopo un claim riuscito: senza rollback il claim resta orfano.
      await rollbackClaim(lavoro_id)

      results.push({
        lavoro_id,
        numero_lavoro: lavoro_id,
        ok: false,
        error: 'Lavoro non trovato, non consegnato, o già fatturato',
      })
      continue
    }

    const numeroLavoro = (lavoro as { numero_lavoro: string }).numero_lavoro

    // Step 2: Crea draft fattura (stesso pattern di orchestraConsegna Step 6)
    let draftCreatoId: string | null = null
    try {
      const annoFattura = new Date().getFullYear()
      const progFattura = await generaProgressivo(svc, labId, 'fattura')
      const numeroDraft = `${annoFattura}-${String(progFattura).padStart(4, '0')}`

      const { data: draftFattura, error: draftErr } = await svc
        .from('fatture')
        .insert({
          laboratorio_id: labId,
          cliente_id: (lavoro as { cliente_id: string }).cliente_id,
          lavoro_id, // B-2: unico writer — abilita il gate fiscale dell'annullo
          numero: numeroDraft,
          anno: annoFattura,
          progressivo: progFattura,
          data: new Date().toISOString().split('T')[0],
          tipo_documento: 'TD01',
          stato_sdi: 'draft',
          imponibile: 0,
          iva_importo: 0,
          bollo: 0,
          totale: 0,
          codice_iva: 'N4',
          natura_iva: 'N4',
          cliente_denominazione: '',
          cliente_indirizzo: '',
        })
        .select('id')
        .single()

      if (draftErr || !draftFattura?.id) {
        // 23505 su fatture_lavoro_attiva_unique = esiste DAVVERO una fattura
        // attiva per questo lavoro: incluso_in_fattura=true è coerente con lo
        // stato reale e NON va rollbackato (riaprirebbe la doppia fatturazione).
        const fatturaAttivaEsistente =
          draftErr?.code === '23505' &&
          (draftErr.message ?? '').includes('fatture_lavoro_attiva_unique')

        if (!fatturaAttivaEsistente) {
          // Ogni altro errore (transitorio, o 23505 su altri vincoli come la
          // collisione di progressivo): rollback del claim per permettere il retry.
          await rollbackClaim(lavoro_id)
        }

        results.push({
          lavoro_id,
          numero_lavoro: numeroLavoro,
          ok: false,
          error: fatturaAttivaEsistente
            ? 'Esiste già una fattura attiva per questo lavoro'
            : 'Errore creazione draft fattura',
        })
        continue
      }

      draftCreatoId = draftFattura.id

      // Step 3: Genera XML FatturaPA aggiornando il draft
      const esito = await generaFatturaPA(
        lavoro as unknown as LavoroDettaglio,
        draftFattura.id
      )

      results.push({
        lavoro_id,
        numero_lavoro: numeroLavoro,
        ok: true,
        numero_fattura: esito.numero,
      })
    } catch (err) {
      // Il draft creato in QUESTA iterazione e mai arrivato a 'generata' va
      // rimosso: con lavoro_id valorizzato resterebbe "attivo" per l'indice
      // parziale fatture_lavoro_attiva_unique e ogni retry colliderebbe in un
      // 23505 letto come "fattura attiva esistente" → lavoro bloccato per sempre.
      // La guardia su stato_sdi='draft' impedisce di toccare una fattura generata.
      if (draftCreatoId) {
        const { error: cleanupErr } = await svc
          .from('fatture')
          .delete()
          .eq('id', draftCreatoId)
          .eq('laboratorio_id', labId)
          .eq('stato_sdi', 'draft')
        if (cleanupErr) {
          console.error('[BATCH] cleanup draft orfano fallito:', cleanupErr.message)
        }
      }

      await rollbackClaim(lavoro_id)

      results.push({
        lavoro_id,
        numero_lavoro: numeroLavoro,
        ok: false,
        error: err instanceof Error ? err.message : 'Errore generazione fattura',
      })
    }
  }

  return NextResponse.json({
    results,
    generati: results.filter((r) => r.ok).length,
    errori: results.filter((r) => !r.ok).length,
  })
}
