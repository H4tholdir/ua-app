import { NextResponse } from 'next/server'
import { getServerUserClient } from '@/lib/supabase/server-user'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { isSameOrigin } from '@/lib/utils/csrf'
import { MACRO_SLUGS } from '@/lib/domain/tipi-lavoro'

// Campi prezzo da bloccare quando il lavoro è già incluso in fattura
const LOCKED_PRICE_FIELDS = [
  'prezzo_unitario',
  'listino_id',
  'codice_iva',
  'natura_iva',
] as const

// Allowlist esplicita dei campi di `lavori` scrivibili via questa route.
// CLAUDE.md: "PATCH allowlist: API PATCH di risorse lab usa sempre allowlist
// esplicita di campi — MAI blocklist". Qualunque chiave del body non presente
// qui viene scartata silenziosamente (incluse le relazioni annidate che il
// GET restituisce via embed PostgREST — appuntamenti, fasi, immagini, cliente,
// paziente, tecnico, lavorazioni, materiali, ddc — che NON sono colonne dirette
// della tabella `lavori` e causavano un 500 "column not found" se inoltrate,
// perché la blocklist precedente non le conosceva.
//
// Fonti verificate per ogni campo (grep mirati sul form + su altri caller
// della stessa route):
// - TabDati.tsx:        tipo_dispositivo, descrizione, richiedente_nome,
//                        data_consegna_prevista, ora_consegna, priorita,
//                        dispositivo_semilavorato, note_interne
// - TabAccettazione.tsx: numero_cassetta, tipo_impronte, disinfettante_usato,
//                        lotto_disinfettante, materiali_allegati,
//                        anamnesi_bruxismo, anamnesi_difficolta_manuali,
//                        anamnesi_precauzioni
// - TabClinica.tsx:      denti_coinvolti, denti_mancanti, denti_impianti,
//                        colore_dente, colore_collo, colore_corpo,
//                        colore_incisale, effetti_speciali, tecnica_colore,
//                        anamnesi_altri_dispositivi
// - TabDate.tsx:         data_prima_prova, data_seconda_prova,
//                        data_terza_prova, spedizione_corriere,
//                        spedizione_tracking, spedizione_data_prevista
// - LavoroCard.tsx:      tecnico_id, priorita (assegnazione tecnico/priorità
//                        dalla lista lavori, stessa route PATCH root)
// - FK_FIELDS validati sotto: cliente_id, paziente_id, tecnico_id, ciclo_id
// - LOCKED_PRICE_FIELDS applicati dopo il filtro: prezzo_unitario, listino_id,
//   codice_iva, natura_iva (editabili finché non incluso_in_fattura)
//
// Esclusi deliberatamente (verificato: nessun writer nel form React attuale):
// arcata, colorazione_esterna, impronta_digitale, numero_prescrizione,
// norma_riferimento, richiedente_email, stato_fisico, tipo_arco,
// codice_interno, anamnesi_note, classe_rischio, paziente_nascita_snapshot,
// paziente_nome_snapshot, prescrizione_digitale_id, spedizione_note,
// spedizione_stato — oltre a IMMUTABLE, segnalazione_* (route dedicata
// /segnala e /segnala/risolvi), is_rifacimento/rifacimento_motivo (RPC
// crea_rifacimento_atomico), tracciabilita_materiali_ok/da_conformare/
// materiali_incompleti_dettaglio (calcolati server-side in orchestrate.ts),
// buono_*/file_stl_url/immagini_urls (gestiti da altri processi/route).
// ═══ SENTINELLA D7 (spec portale-dentista-v2 §7) ══════════════════════════
// proposta_dentista e proposta_at NON devono MAI entrare in questa allowlist:
// si scrivono SOLO dall'API portale (/api/portale/[token]/fatturazione/[id]).
// Test di regressione: tests/unit/lavori-patch-invariante-d7.test.ts
// ═══════════════════════════════════════════════════════════════════════════
const PATCHABLE_FIELDS = [
  'tipo_dispositivo',
  'descrizione',
  'richiedente_nome',
  'data_consegna_prevista',
  'ora_consegna',
  'priorita',
  'dispositivo_semilavorato',
  'note_interne',
  'numero_cassetta',
  'tipo_impronte',
  'disinfettante_usato',
  'lotto_disinfettante',
  'materiali_allegati',
  'anamnesi_bruxismo',
  'anamnesi_difficolta_manuali',
  'anamnesi_precauzioni',
  'denti_coinvolti',
  'denti_mancanti',
  'denti_impianti',
  'colore_dente',
  'colore_collo',
  'colore_corpo',
  'colore_incisale',
  'effetti_speciali',
  'tecnica_colore',
  'anamnesi_altri_dispositivi',
  'data_prima_prova',
  'data_seconda_prova',
  'data_terza_prova',
  'spedizione_corriere',
  'spedizione_tracking',
  'spedizione_data_prevista',
  'cliente_id',
  'paziente_id',
  'tecnico_id',
  'ciclo_id',
  ...LOCKED_PRICE_FIELDS,
] as const

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
    }

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }
    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    const { data: lavoro, error } = await svc
      .from('lavori')
      .select(`
        *,
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
      .eq('id', id)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .neq('ddc.stato', 'annullata')
      .single()

    if (error || !lavoro) {
      const status = error?.code === 'PGRST116' ? 404 : 500
      return NextResponse.json(
        { error: error?.message ?? 'Lavoro non trovato' },
        { status }
      )
    }

    return NextResponse.json({ lavoro })
  })
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params

  // CSRF check
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
  }

  const userClient = await getServerUserClient()
  const { data: { user } } = await userClient.auth.getUser()
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

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  // Verifica se il lavoro è già incluso in fattura — legge solo il campo necessario
  const { data: existing } = await svc
    .from('lavori')
    .select('incluso_in_fattura')
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .is('deleted_at', null)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // Allowlist esplicita: tiene solo le chiavi in PATCHABLE_FIELDS, scartando
  // silenziosamente qualunque altro campo (relazioni annidate, campi
  // immutabili/di stato, campi calcolati server-side, ecc. — vedi commento
  // sopra PATCHABLE_FIELDS per l'elenco completo di ciò che è escluso e perché).
  const payload: Record<string, unknown> = {}
  for (const field of PATCHABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = body[field]
    }
  }

  // Validazione enum tipo_dispositivo (B2): solo se il campo è presente nel payload
  if (payload.tipo_dispositivo !== undefined && !(MACRO_SLUGS as string[]).includes(payload.tipo_dispositivo as string)) {
    return NextResponse.json({ error: 'tipo_dispositivo non valido' }, { status: 422 })
  }

  // Se incluso in fattura: rimuovi i campi prezzo dal payload per protezione
  if (existing.incluso_in_fattura) {
    for (const field of LOCKED_PRICE_FIELDS) {
      delete payload[field]
    }
  }

  // N4: se il prezzo è gestito dalle righe di lavorazione, prezzo_unitario è
  // read-only (eccezione: azzeramento a null = riconciliazione, consentito).
  // Se il lavoro è incluso in fattura, prezzo_unitario è già stato rimosso
  // dal payload sopra, quindi questo blocco non scatta (composizione con il
  // lock fattura senza query extra).
  if ('prezzo_unitario' in payload && payload.prezzo_unitario !== null) {
    const { count: righeAttive } = await svc
      .from('lavori_lavorazioni')
      .select('id', { count: 'exact', head: true })
      .eq('lavoro_id', id)
      .is('deleted_at', null)
    if ((righeAttive ?? 0) > 0) {
      return NextResponse.json({ error: 'prezzo gestito dalle righe di lavorazione' }, { status: 422 })
    }
  }

  // Fix cross-tenant FK: validare che cliente_id, paziente_id, tecnico_id, ciclo_id
  // appartengano al laboratorio dell'utente prima di aggiornare
  const FK_FIELDS = [
    { field: 'cliente_id',  table: 'clienti' },
    { field: 'paziente_id', table: 'pazienti' },
    { field: 'tecnico_id',  table: 'tecnici' },
    { field: 'ciclo_id',    table: 'cicli_produzione' },
  ] as const

  for (const { field, table } of FK_FIELDS) {
    if (payload[field] != null) {
      const { data: fkRow } = await svc
        .from(table)
        .select('id')
        .eq('id', payload[field] as string)
        .eq('laboratorio_id', utente.laboratorio_id)
        .is('deleted_at', null)
        .single()
      if (!fkRow) {
        return NextResponse.json(
          { error: `${field} non appartiene a questo laboratorio` },
          { status: 403 }
        )
      }
    }
  }

  // Forza aggiornamento timestamp (non allowlisted: sempre gestito server-side)
  payload.updated_at = new Date().toISOString()

  const { data: lavoro, error: updateError } = await svc
    .from('lavori')
    .update(payload)
    .eq('id', id)
    .eq('laboratorio_id', utente.laboratorio_id)
    .select('id, numero_lavoro, stato, updated_at')
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ lavoro })
}
