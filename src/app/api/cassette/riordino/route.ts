import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

/**
 * Riordino della parete delle cassette (spec parete-cassette §5).
 *
 * Contratto della RPC `cassette_riordina` (migration 20260721090000_parete_cassette.sql:446-...):
 * unico esito di errore `ordine_non_valido` copre array NULL/vuoto, elementi NULL,
 * duplicati e id estranei al lab o di cassette eliminate — **tutti** validati
 * dalla RPC stessa, non qui: la route inoltra l'array così com'è (correzione
 * 21/07 #3), tranne il caso in cui il body non contenga affatto un array (in
 * quel caso richiamare la RPC produrrebbe solo un errore di firma/cast, non
 * un esito di dominio, quindi si risponde 422 prima di chiamarla).
 */
export async function POST(req: Request) {
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
  const labId: string = context.laboratorioId

  const body = await req.json().catch(() => null)
  const ordine =
    body && typeof body === 'object' && Array.isArray((body as { ordine?: unknown }).ordine)
      ? ((body as { ordine: unknown[] }).ordine as (string | null)[])
      : null

  if (!ordine) {
    return NextResponse.json({ errore: 'ordine_non_valido' }, { status: 422 })
  }

  const svc = getServiceClient()
  const { data, error } = await callRpcWithRetry(() =>
    svc.rpc('cassette_riordina', { p_lab: labId, p_ordine: ordine })
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const esito = (data as { esito?: string } | null)?.esito

  if (esito === 'ok') {
    return NextResponse.json({ esito: 'ok' })
  }
  if (esito === 'ordine_non_valido') {
    return NextResponse.json({ errore: 'ordine_non_valido' }, { status: 422 })
  }

  // Contratto RPC (migration 20260721090000_parete_cassette.sql): solo questi
  // due esiti esistono, nessuna RAISE. Se arriviamo qui è un bug della route
  // (o un cambio di contratto non recepito), non un esito di dominio.
  return NextResponse.json({ error: 'Esito inatteso dalla RPC cassette_riordina' }, { status: 500 })
}
