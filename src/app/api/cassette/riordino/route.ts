import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server-service'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { isSameOrigin } from '@/lib/utils/csrf'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

// Forma UUID canonica: vedi lo stesso pattern e lo stesso motivo in
// `src/app/api/lavori/[id]/cassetta/route.ts` (review Minor #1).
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Riordino della parete delle cassette (spec parete-cassette §5).
 *
 * Contratto della RPC `cassette_riordina` (migration 20260721090000_parete_cassette.sql:446-...):
 * unico esito di errore `ordine_non_valido` copre array NULL/vuoto, elementi NULL,
 * duplicati e id estranei al lab o di cassette eliminate — validati dalla RPC
 * stessa: la route non li rifiltra (correzione 21/07 #3, gli elementi NULL
 * vanno forwardati as-is). La route valida SOLO due cose che, se lasciate
 * passare, produrrebbero un errore di firma/cast PostgREST invece di un esito
 * di dominio (mai visto dalla RPC): che il body contenga affatto un array, e
 * che ogni elemento non-NULL abbia forma UUID valida — un elemento tipo
 * `'abc'` farebbe fallire il cast Postgres `uuid[]` con un errore 500, non con
 * l'esito `ordine_non_valido` che la route promette (review Minor #1).
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
  const ordineRaw =
    body && typeof body === 'object' && Array.isArray((body as { ordine?: unknown }).ordine)
      ? (body as { ordine: unknown[] }).ordine
      : null

  if (!ordineRaw) {
    return NextResponse.json({ errore: 'ordine_non_valido' }, { status: 422 })
  }

  // NULL ammesso (la RPC lo rifiuta da sé, correzione 21/07 #3 — non va
  // filtrato qui); qualunque altra cosa deve avere forma UUID valida.
  const formaValida = ordineRaw.every((el) => el === null || (typeof el === 'string' && UUID_RE.test(el)))
  if (!formaValida) {
    return NextResponse.json({ errore: 'ordine_non_valido' }, { status: 422 })
  }
  const ordine = ordineRaw as (string | null)[]

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
