import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { generaFatturaPA } from '@/lib/fattura/generate-xml'
import { sendFatturaPEC } from '@/lib/fattura/send-pec'
import { RUOLI_INVIO_PEC, claimInvioPec, releaseInvioPec } from '@/lib/fattura/invio-claim'
import type { LavoroDettaglio } from '@/types/domain'

interface RouteContext {
  params: Promise<{ id: string }>
}

// ─── POST /api/fatture/[id]/xml ───────────────────────────────────────────────
// Genera XML FatturaPA per la fattura indicata e, opzionalmente, invia via PEC.
//
// Il parametro [id] è il fattura_id.
// Il body JSON può contenere:
//   - lavori_ids?: string[]   — IDs dei lavori da includere (se omesso, usa quelli in fatture_righe)
//   - invia_pec?: boolean     — se true, invia la fattura a sdi01@pec.fatturapa.it via PEC
export async function POST(req: Request, { params }: RouteContext) {
  // ── CSRF + auth ──────────────────────────────────────────────────────────
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const context = await getFreshLabContext()

  if (!context) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const svc = getServiceClient()
  const labId: string = context.laboratorioId
  const { id: fatturaId } = await params

  // ── Leggi body ────────────────────────────────────────────────────────────
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    // body opzionale
  }

  const inviaPec: boolean = body.invia_pec === true
  const lavoriIds: string[] | undefined =
    Array.isArray(body.lavori_ids) ? (body.lavori_ids as string[]) : undefined

  // N10: l'invio fiscale richiede ruolo dedicato; la sola generazione resta libera.
  if (inviaPec && !RUOLI_INVIO_PEC.includes(context.ruolo as (typeof RUOLI_INVIO_PEC)[number])) {
    return NextResponse.json({ error: "Ruolo non autorizzato all'invio fiscale" }, { status: 403 })
  }

  // ── Verifica che la fattura appartenga al laboratorio ─────────────────────
  const { data: fatturaCheck, error: fatturaCheckErr } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi')
    .eq('id', fatturaId)
    .eq('laboratorio_id', labId)
    .single()

  if (fatturaCheckErr || !fatturaCheck) {
    return NextResponse.json({ error: 'Fattura non trovata' }, { status: 404 })
  }

  // ── Gate stato_sdi (N7) ───────────────────────────────────────────────────
  // Allowlist: solo una fattura ancora in bozza può essere (ri)generata. Una
  // fattura già emessa (generata/inviata/…) ri-deriverebbe l'imponibile dal
  // lavoro VIVO e brucerebbe un progressivo SDI (generaProgressivo è dentro
  // generaFatturaPA). Il gate vive qui, PRIMA del loop, non nell'helper
  // (condiviso col flusso Consegna auto-emit). Spec: N7 2026-07-14.
  if (fatturaCheck.stato_sdi !== 'draft') {
    return NextResponse.json(
      { error: `Fattura già emessa (stato: ${fatturaCheck.stato_sdi ?? 'sconosciuto'}). Rigenerazione non consentita.` },
      { status: 409 }
    )
  }

  // ── Carica i lavori associati ─────────────────────────────────────────────
  let lavoriQuery = svc
    .from('lavori')
    .select(
      `
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
      listino_id,
      prezzo_unitario,
      codice_iva,
      natura_iva,
      incluso_in_fattura,
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
    `
    )
    .eq('laboratorio_id', labId)
    .is('deleted_at', null)
    .neq('ddc.stato', 'annullata')

  if (lavoriIds && lavoriIds.length > 0) {
    lavoriQuery = lavoriQuery.in('id', lavoriIds)
  } else {
    // Fallback: recupera lavori dalle righe della fattura
    const { data: righe } = await svc
      .from('fatture_righe')
      .select('lavoro_id')
      .eq('fattura_id', fatturaId)
      .not('lavoro_id', 'is', null)

    const righeIds = (righe ?? [])
      .map((r: { lavoro_id: string | null }) => r.lavoro_id)
      .filter((id): id is string => id != null)

    if (righeIds.length === 0) {
      return NextResponse.json(
        { error: 'Nessun lavoro associato alla fattura. Fornire lavori_ids nel body.' },
        { status: 422 }
      )
    }

    lavoriQuery = lavoriQuery.in('id', righeIds)
  }

  const { data: lavoriRaw, error: lavoriErr } = await lavoriQuery

  if (lavoriErr) {
    console.error('[FATTURE-XML] load lavori fallita:', lavoriErr.message)
    return NextResponse.json({ error: 'Errore nel caricamento dei lavori' }, { status: 500 })
  }

  if (!lavoriRaw || lavoriRaw.length === 0) {
    return NextResponse.json({ error: 'Nessun lavoro trovato' }, { status: 404 })
  }

  // ── Genera XML per ogni lavoro ────────────────────────────────────────────
  // Passiamo fatturaId al primo lavoro per AGGIORNARE il draft esistente.
  // Per i lavori successivi (caso multi-lavoro per stessa fattura) inseriamo nuove righe.
  // Nella pratica UÀ una fattura corrisponde a un cliente — un solo giro di generazione.
  const risultati: Array<{ numero: string; stato_sdi: 'generata' }> = []

  for (let i = 0; i < lavoriRaw.length; i++) {
    const lavoro = lavoriRaw[i]
    // Solo il primo lavoro aggiorna il draft identificato da fatturaId
    const targetFatturaId = i === 0 ? fatturaId : undefined

    try {
      const risultato = await generaFatturaPA(
        lavoro as unknown as LavoroDettaglio,
        targetFatturaId
      )
      risultati.push(risultato)
    } catch (err) {
      // Dettaglio (può contenere messaggi Postgres grezzi) solo nei log server
      console.error('[FATTURE-XML] generaFatturaPA fallita:', err)
      return NextResponse.json(
        {
          error: `Generazione XML fallita per il lavoro ${(lavoro as { numero_lavoro: string }).numero_lavoro}`,
        },
        { status: 500 }
      )
    }
  }

  // ── Invia PEC (opzionale) ─────────────────────────────────────────────────
  // Usa fatturaId (il draft aggiornato) — ora ha xml_storage_path valorizzato dopo generaFatturaPA
  let pecInviata = false
  let pecErrore: string | null = null

  if (inviaPec) {
    const { claimed, error: claimErr } = await claimInvioPec(svc, fatturaId, labId)
    if (claimErr || !claimed) {
      pecErrore = claimErr
        ? "Errore durante l'invio — riprova"
        : 'Invio già in corso o già effettuato'
      if (claimErr) console.error('[FATTURE-XML] claim invio fallito:', claimErr)
    } else {
      try {
        await sendFatturaPEC(fatturaId)
        pecInviata = true
      } catch (err) {
        // Dettaglio (host SMTP, Vault) SOLO nei log server — mai nel body (N10).
        console.error('[FATTURE-XML] invio PEC fallito:', err)
        await releaseInvioPec(svc, fatturaId, labId)
        pecErrore = 'Invio PEC fallito — riprova o verifica la configurazione PEC'
      }
    }
  }

  // ── Recupera stato aggiornato ─────────────────────────────────────────────
  const { data: fatturaAggiornata } = await svc
    .from('fatture')
    .select('id, numero, stato_sdi, xml_storage_path, nome_file_xml, inviata_at, inviata_via')
    .eq('id', fatturaId)
    .single()

  return NextResponse.json({
    fattura: fatturaAggiornata,
    xml_generati: risultati,
    pec_inviata: pecInviata,
    pec_errore: pecErrore,
  })
}
