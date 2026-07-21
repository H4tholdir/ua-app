import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

const MOTIVI_VALIDI = [
  'colore_sbagliato',
  'misura_errata',
  'fusione_difettosa',
  'rottura_produzione',
  'non_confortevole',
  'errore_prescrizione',
  'altro',
] as const

const RILEVATO_IN_VALIDI = ['produzione', 'prova_1', 'prova_2', 'prova_3', 'post_consegna']

type RouteContext = { params: Promise<{ id: string }> }

/**
 * Task 9 (D-10): dopo l'esito ok di `crea_rifacimento_atomico` (RPC MDR,
 * NON toccata — R-6), trasferisce al lavoro nuovo la cassetta che aveva il
 * lavoro vecchio, via `cassetta_trasferisci_rifacimento(p_lab,
 * p_lavoro_vecchio, p_lavoro_nuovo)` (Task 1; contratto ratificato 21/07 —
 * 4 esiti), avvolta in `callRpcWithRetry` (coda di deadlock 40P01
 * documentata in testa alla migration, condivisa dai Task 4/5/8/9).
 *
 * **Fail-soft ASSOLUTO** (vincolo più importante — il rifacimento è già
 * committato quando questa funzione viene chiamata): la route deve SEMPRE
 * ritornare `{lavoro_nuovo_id, numero_lavoro}`, con la response invariata
 * per forma e semantica — il trasferimento è silenzioso, non cambia il
 * contratto. L'intero corpo vive dentro un try/catch e la funzione non può
 * mai lanciare:
 *  - `error` non-null (postgrest-js NON lancia sugli errori del database —
 *    torna `{data:null, error:{...}}` — un `try/catch` da solo non lo
 *    intercetterebbe) → log;
 *  - `esito === 'trasferita'` → successo, nessun log;
 *  - `esito === 'niente_da_trasferire'` → non-evento legittimo (il vecchio
 *    non era in nessuna cassetta, o è cambiato tutto sotto il lock): nessun
 *    log, stessa filosofia di `{esito:'ok', nome:null}` nel Task 7;
 *  - `esito === 'occupata'` → **console.warn**, non error: il lavoro nuovo
 *    aveva già una riga viva, quindi il pre-check anti-sfratto ha protetto
 *    un'assegnazione esistente. È anomalo-ma-spiegabile (una corsa
 *    concorrente), non un difetto — descrive un'ipotesi, non un'accusa;
 *  - `esito === 'lavoro_non_valido'` → **console.error**, distinto da
 *    `occupata`: il lavoro nuovo è assente/di altro lab/soft-deleted/
 *    consegnato/annullato. Su un lavoro appena creato da
 *    `crea_rifacimento_atomico` — con lo stesso `p_lab` — questo non ha una
 *    causa benigna comune (a differenza di `niente_da_riassegnare` nel
 *    Task 8): segnala un difetto altrove;
 *  - esito ignoto (un esito futuro non mappato qui) → log, mai un successo
 *    silenzioso;
 *  - eccezione di rete vera → `try/catch` esterno, ultima difesa.
 */
async function trasferisciCassettaAlRifacimento(
  svc: ReturnType<typeof getServiceClient>,
  laboratorio_id: string,
  lavoro_vecchio_id: string,
  lavoro_nuovo_id: string
): Promise<void> {
  try {
    const { data, error } = await callRpcWithRetry(() =>
      svc.rpc('cassetta_trasferisci_rifacimento', {
        p_lab: laboratorio_id,
        p_lavoro_vecchio: lavoro_vecchio_id,
        p_lavoro_nuovo: lavoro_nuovo_id,
      })
    )

    if (error) {
      console.error('[RIFACIMENTO] trasferimento cassetta fail-soft — RPC in errore:', error)
      return
    }

    const esito = (data as { esito?: string; nome?: string } | null)?.esito

    switch (esito) {
      case 'trasferita':
      case 'niente_da_trasferire':
        return
      case 'occupata':
        console.warn(
          `[RIFACIMENTO] cassetta non trasferita al lavoro nuovo ${lavoro_nuovo_id} — ha già una riga viva in un'altra cassetta (il pre-check anti-sfratto ha protetto quell'assegnazione):`,
          data
        )
        return
      case 'lavoro_non_valido':
        console.error(
          `[RIFACIMENTO] cassetta non trasferita — il lavoro nuovo ${lavoro_nuovo_id} risulta non valido per la RPC (assente/di altro lab/soft-deleted/consegnato/annullato): su un lavoro appena creato dal rifacimento questo indica un difetto altrove:`,
          data
        )
        return
      default:
        console.error('[RIFACIMENTO] trasferimento cassetta — esito inatteso dalla RPC:', data)
        return
    }
  } catch (err) {
    console.error('[RIFACIMENTO] trasferimento cassetta fail-soft — eccezione:', err)
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const context = await getFreshLabContext()
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }

  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const { id: lavoro_id } = await params
  const svc = getServiceClient()

  const { data: lavoro } = await svc
    .from('lavori')
    .select('id, stato')
    .eq('id', lavoro_id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) {
    return NextResponse.json({ error: 'Lavoro non trovato' }, { status: 404 })
  }

  // State guard: blocca solo annullati (il rifacimento avviene post-consegna o su sospeso/pronto)
  if (lavoro.stato === 'annullato') {
    return NextResponse.json(
      { error: `Impossibile creare rifacimento per lavoro annullato` },
      { status: 409 }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { motivo, rilevato_in, costo_interno, note } = body as {
    motivo?: string
    rilevato_in?: string
    costo_interno?: number | string
    note?: string
  }

  if (!motivo || !(MOTIVI_VALIDI as readonly string[]).includes(motivo)) {
    return NextResponse.json(
      { error: `motivo non valido: ${motivo}` },
      { status: 400 }
    )
  }

  if (note !== undefined && note !== null && typeof note !== 'string') {
    return NextResponse.json({ error: 'note deve essere una stringa' }, { status: 400 })
  }
  if (note && note.length > 1000) {
    return NextResponse.json({ error: 'note troppo lunghe (max 1000 caratteri)' }, { status: 400 })
  }

  if (rilevato_in !== undefined && rilevato_in !== null && !RILEVATO_IN_VALIDI.includes(rilevato_in)) {
    return NextResponse.json({ error: `rilevato_in non valido: ${rilevato_in}` }, { status: 400 })
  }

  const costoNum = costo_interno != null && costo_interno !== '' ? parseFloat(String(costo_interno)) : null
  if (costoNum !== null && (!Number.isFinite(costoNum) || costoNum < 0)) {
    return NextResponse.json({ error: 'costo_interno non valido' }, { status: 400 })
  }

  // RPC atomica — nessun INSERT separato (MDR-safe)
  const { data, error } = await svc.rpc('crea_rifacimento_atomico', {
    p_lavoro_originale_id: lavoro_id,
    p_motivo: motivo,
    p_rilevato_in: rilevato_in ?? null,
    p_costo_interno: costoNum,
    p_note: note ?? null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const risultato = data as { lavoro_nuovo_id: string; numero_lavoro: string }

  // Task 9 (D-10): trasferimento cassetta al rifacimento — fail-soft
  // assoluto, response invariata (vedi trasferisciCassettaAlRifacimento).
  await trasferisciCassettaAlRifacimento(svc, context.laboratorioId, lavoro_id, risultato.lavoro_nuovo_id)

  return NextResponse.json(risultato)
}
