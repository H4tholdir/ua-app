import { NextResponse } from 'next/server'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { isSameOrigin } from '@/lib/utils/csrf'
import { RUOLI_INVIO_PEC } from '@/lib/fattura/invio-claim'
import { verificaFirmaRicevuta } from '@/lib/fattura/ricevute/verifica-firma'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface RpcEsito {
  esito: string
  stato_da?: string
  stato_a?: string
}

// ─── POST /api/pec/ricevute/[id]/applica ──────────────────────────────────
// Conferma un evento «proposta» (Task 10) applicando la transizione stato_sdi
// tramite l'unico writer post-invio, la RPC applica_ricevuta_sdi (Task 9,
// spec R1 §4.4). Route sottile: auth/ruolo/CSRF/fetch evento qui, la
// riverifica firma su evento in quarantena e la RPC fanno il resto.
//
// Riverifica quarantena (spec §4.4, riga «Re-upload dopo quarantena»): un
// evento non ancora completato (`stato_a` NULL) la cui firma non è
// (ancora) 'valida' viene ri-scaricato dallo storage e ri-passato a
// verificaFirmaRicevuta PRIMA di invocare la RPC — così un fix di libreria o
// una rotazione del trust anchor sblocca le quarantene senza vincoli ciechi.
// Se la firma è ora 'valida', l'unico UPDATE ammesso dal guard trigger
// sulla riga «proposta» (esito_verifica_firma) viene applicato e si procede
// con la RPC; se resta 'fallita' → 409 senza mai chiamare la RPC.
export async function POST(req: Request, { params }: RouteContext) {
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
  if (!RUOLI_INVIO_PEC.includes(context.ruolo as (typeof RUOLI_INVIO_PEC)[number])) {
    return NextResponse.json({ error: 'Ruolo non autorizzato ad applicare ricevute SdI' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const svc = getServiceClient()

  const labId: string = context.laboratorioId
  const { id: eventoId } = await params

  const { data: evento } = await svc
    .from('fatture_sdi_eventi')
    .select('id, esito_verifica_firma, stato_a, ricevuta_storage_path')
    .eq('id', eventoId)
    .eq('laboratorio_id', labId)
    .maybeSingle()

  if (!evento) {
    return NextResponse.json({ error: 'Ricevuta non trovata' }, { status: 404 })
  }

  try {
    // Ramo riverifica: evento non completato + firma non (ancora) valida.
    if (evento.stato_a === null && evento.esito_verifica_firma !== 'valida') {
      if (!evento.ricevuta_storage_path) {
        return NextResponse.json({ esito: 'quarantena' }, { status: 409 })
      }

      const { data: fileData, error: downloadErr } = await svc.storage
        .from('fatture-pdf')
        .download(evento.ricevuta_storage_path)
      if (downloadErr || !fileData) {
        throw new Error(`download ricevuta fallito: ${downloadErr?.message ?? 'dati mancanti'}`)
      }

      const buffer = Buffer.from(await fileData.arrayBuffer())
      const nuovoEsito = await verificaFirmaRicevuta(buffer)

      if (nuovoEsito !== 'valida') {
        return NextResponse.json({ esito: 'quarantena' }, { status: 409 })
      }

      // Unico UPDATE ammesso dal guard trigger sulla riga «proposta» (spec
      // §3.2, migration 20260716090000): esito_verifica_firma soltanto.
      const { error: updateErr } = await svc
        .from('fatture_sdi_eventi')
        .update({ esito_verifica_firma: 'valida' })
        .eq('id', eventoId)
        .eq('laboratorio_id', labId)
      if (updateErr) {
        throw new Error(`aggiornamento esito firma fallito: ${updateErr.message}`)
      }
    }

    const { data, error: rpcErr } = await svc.rpc('applica_ricevuta_sdi', {
      p_evento_id: eventoId,
      p_laboratorio_id: labId,
    })
    if (rpcErr) {
      throw new Error(`RPC applica_ricevuta_sdi fallita: ${rpcErr.message}`)
    }

    const result = data as RpcEsito | null

    switch (result?.esito) {
      case 'applicata':
      case 'duplicata':
        return NextResponse.json(result, { status: 200 })
      case 'stato_incompatibile':
      case 'quarantena':
      case 'non_matchata':
        return NextResponse.json(result, { status: 409 })
      case 'non_trovato':
        return NextResponse.json({ error: 'Ricevuta non trovata' }, { status: 404 })
      default:
        throw new Error(`esito RPC inatteso: ${JSON.stringify(result)}`)
    }
  } catch (err) {
    // Dettaglio (Postgres, storage) SOLO nei log server — fail-closed su
    // ogni errore inatteso, mai un 200/leak del messaggio.
    console.error('[PEC-RICEVUTE-APPLICA] errore:', err)
    return NextResponse.json({ error: "Errore durante l'applicazione — riprova" }, { status: 500 })
  }
}
