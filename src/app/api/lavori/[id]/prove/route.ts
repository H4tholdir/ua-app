import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getLabContextWithTimings, getFreshLabContext } from '@/lib/supabase/lab-context'
import { withServerTiming } from '@/lib/api/server-timing'
import { triggerPushToUser } from '@/lib/notifications/trigger'
import type { StatoLavoro } from '@/types/domain'

type RouteParams = { params: Promise<{ id: string }> }

// N12 (spec R2 §D-5): entrambi i rami del POST sono stati resi atomici tramite
// RPC (supabase/migrations/20260717120000_n12_prove_atomiche.sql), sostituendo
// transizioneLavoro + query separate su lavoro_prove/lavori con una singola
// transazione lato Postgres (FOR UPDATE sul lavoro elimina la race sul
// calcolo di numero_prova tra due manda_in_prova concorrenti sullo stesso lavoro).

interface RpcError {
  code?: string
  message?: string
}

/**
 * Mappa gli errori delle RPC atomiche N12 sugli status HTTP odierni della route.
 * - UA404: lavoro non trovato o fuori tenant → stesso messaggio odierno.
 * - UA409: transizione non consentita → messaggio della RPC (deviazione dichiarata:
 *   prima il 409 su rientro portava il messaggio generato in TS da transizioneLavoro,
 *   `Transizione X→Y non consentita`; ora porta quello generato dalla RPC,
 *   `transizione non consentita da X a Y` — stesso significato, testo diverso).
 *   Edge case "prova orfana": se un lavoro esce da in_prova_esterna per altra
 *   via (es. patch diretta di stato) mentre una prova è ancora aperta, il
 *   successivo rientro trova uno stato non più in whitelist e la RPC risponde
 *   UA409 con questo stesso messaggio generico — actionable per i log, ma
 *   TabProve (src/components/features/lavori/TabProve.tsx) non legge il body
 *   dell'errore: mostra solo `Errore ${res.status}`, quindi non fa alcun
 *   matching sul testo e non è impattato da questa deviazione.
 * - 23505 (unique numero_prova, backstop): messaggio amichevole anziché Postgres
 *   grezzo, per evitare leak di dettagli interni al client.
 * - 23514 (CHECK lavoro_prove.esito, migration 005): backstop — non dovrebbe
 *   mai scattare perché la whitelist `validEsiti` qui sotto valida PRIMA di
 *   chiamare la RPC; mappato a 400 per coerenza con lo status usato oggi per
 *   "esito non valido".
 * - altro: 500 sanitizzato (mai il messaggio Postgres grezzo al client).
 */
function mapRpcError(error: RpcError): NextResponse {
  if (error.code === 'UA404') {
    return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })
  }
  if (error.code === 'UA409') {
    return NextResponse.json({ error: error.message ?? 'Operazione non consentita' }, { status: 409 })
  }
  if (error.code === '23505') {
    return NextResponse.json({ error: 'Prova già in corso — ricarica e riprova' }, { status: 409 })
  }
  if (error.code === '23514') {
    return NextResponse.json({ error: 'esito non valido' }, { status: 400 })
  }
  return NextResponse.json({ error: 'Errore interno' }, { status: 500 })
}

// GET — lista prove di un lavoro
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params

  return withServerTiming(async (t) => {
    const { context, timings } = await getLabContextWithTimings()
    Object.assign(t, timings)
    if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

    if (!context.laboratorioId) {
      return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
    }
    const labId: string = context.laboratorioId

    const svc = getServiceClient()
    // Guard cross-tenant: verifica che il lavoro appartenga al lab dell'utente
    const { data: lavoro } = await svc
      .from('lavori')
      .select('id')
      .eq('id', id)
      .eq('laboratorio_id', labId)
      .is('deleted_at', null)
      .single()

    if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

    const { data, error } = await svc
      .from('lavoro_prove')
      .select('*')
      .eq('lavoro_id', id)
      .eq('laboratorio_id', labId)  // defense-in-depth: filtro tenant su child table
      .order('numero_prova', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  })
}

// POST — manda_in_prova OPPURE registra_rientro
export async function POST(req: NextRequest, { params }: RouteParams) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'CSRF' }, { status: 403 })
  }

  const { id } = await params

  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })

  if (!context.laboratorioId) {
    return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
  }
  const svc = getServiceClient()

  // Guard cross-tenant — invariato: 404 identico odierno se il lavoro non
  // esiste o non appartiene al lab dell'utente. La RPC ripete comunque lo
  // stesso controllo (con FOR UPDATE) dentro la propria transazione: questo
  // fetch resta solo per fallire veloce con lo stesso messaggio di prima
  // di validare il body.
  const { data: lavoro } = await svc
    .from('lavori')
    .select('id')
    .eq('id', id)
    .eq('laboratorio_id', context.laboratorioId)
    .is('deleted_at', null)
    .single()

  if (!lavoro) return NextResponse.json({ error: 'Lavoro non trovato o accesso negato' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
  }

  const { action } = body

  if (action === 'manda_in_prova') {
    const { data_rientro_prevista, istruzioni } = body

    if (!data_rientro_prevista) {
      return NextResponse.json({ error: 'data_rientro_prevista obbligatoria' }, { status: 400 })
    }

    // N12: transizione + calcolo numero_prova + insert, tutto atomico dentro
    // manda_in_prova_atomico (FOR UPDATE sul lavoro elimina la race sul
    // MAX(numero_prova) tra due chiamate concorrenti sullo stesso lavoro).
    const { data, error } = await svc.rpc('manda_in_prova_atomico', {
      p_lavoro_id: id,
      p_laboratorio_id: context.laboratorioId,
      p_data_rientro: data_rientro_prevista,
      p_istruzioni: istruzioni ?? null,
      p_user_id: context.userId,
    })

    if (error) return mapRpcError(error)

    // FASE 6b eseguita (types rigenerati post-apply): la RPC ritorna jsonb →
    // tipo generato `Json`, il cast allo shape reale { prova, stato } resta
    // necessario e documenta il contratto.
    return NextResponse.json(data as { prova: unknown; stato: string })
  }

  if (action === 'registra_rientro') {
    const { prova_id, esito, note_dentista, nuova_data_consegna } = body
    // Whitelist esito: resta in TS — la RPC non valida esito (solo il CHECK
    // backstop lavoro_prove.esito, migration 005, mappato a 400 in mapRpcError
    // via 23514 se mai dovesse scattare).
    const validEsiti = ['ok', 'modifiche', 'rifare', 'sospeso']

    if (!validEsiti.includes(esito as string)) {
      return NextResponse.json({ error: `esito non valido: ${esito}` }, { status: 400 })
    }

    // Mapping esito→stato destinazione: resta in TS, logica odierna invariata
    // (nessun arco verso 'pronto' qui: solo rifare→annullato, sospeso→sospeso,
    // ok|modifiche→in_lavorazione).
    const nuovoStato = (esito === 'rifare' ? 'annullato'
                     : esito === 'sospeso' ? 'sospeso'
                     : 'in_lavorazione') as StatoLavoro

    // N12: update prova + transizione stato + (se richiesto) allineamento
    // data_consegna_prevista, tutto atomico dentro registra_rientro_atomico.
    // Se la RPC fallisce (es. UA409 su prova orfana, vedi commento su
    // mapRpcError sopra) NON resta alcun update parziale: niente più
    // .from('lavoro_prove').update(...) separato lato route.
    const { data, error } = await svc.rpc('registra_rientro_atomico', {
      p_lavoro_id: id,
      p_laboratorio_id: context.laboratorioId,
      p_prova_id: prova_id,
      p_esito: esito,
      p_note: note_dentista ?? null,
      p_stato_destinazione: nuovoStato,
      p_user_id: context.userId,
      // truthiness (non ??): parità col comportamento odierno (route.ts passava
      // extraFields a transizioneLavoro solo se nuova_data_consegna era truthy —
      // '' non aggiornava data_consegna_prevista). Con ?? null, '' passerebbe
      // come stringa vuota alla RPC e Postgres fallirebbe il cast a date → 500
      // dove oggi era un no-op silenzioso.
      p_nuova_data_consegna: nuova_data_consegna || null,
    })

    if (error) return mapRpcError(error)

    // FASE 6b eseguita (types rigenerati post-apply): la RPC ritorna jsonb →
    // tipo generato `Json`, il cast allo shape reale resta necessario.
    const result = data as { stato: string; tecnico_id: string | null; numero_lavoro: string | number | null }

    // Push notification — prova rientrata → tecnico assegnato (fire-and-forget,
    // POST-commit: la RPC ha già committato quando arriviamo qui, quindi
    // l'invio non può far fallire né bloccare la transazione già chiusa).
    // tecnico_id/numero_lavoro vengono dal payload della RPC (letti sotto
    // FOR UPDATE nella stessa transazione), non dalla select di guardia
    // sopra — più robusto in caso di modifiche concorrenti al lavoro.
    if (result.tecnico_id) {
      await triggerPushToUser(result.tecnico_id, context.laboratorioId, {
        title: '🔄 Prova rientrata',
        body: `La prova per il lavoro ${result.numero_lavoro ?? ''} è rientrata`,
        url: `/lavori/${id}`,
      })
    }

    return NextResponse.json({ esito, stato: result.stato })
  }

  return NextResponse.json({ error: 'action non valida' }, { status: 400 })
}
