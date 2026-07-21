import 'server-only'
import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Retry condiviso per le RPC SECURITY DEFINER della Parete delle Cassette
 * (contratto: `supabase/migrations/20260721090000_parete_cassette.sql:48-52`,
 * risoluzione R-C del Task 4 — usato anche dai Task 5/8/9).
 *
 * Tre classi di concorrenza NOTE e DELIBERATAMENTE non chiuse in SQL (vedi
 * il commento di testa alla migration) producono un deadlock Postgres
 * (SQLSTATE 40P01) come coda prevista di questa architettura, non un bug
 * da inseguire lì. La cura ratificata è UN solo ritentativo qui in route,
 * non un lock/indice nuovo in SQL.
 *
 * **`chiamata` è una thunk RI-INVOCABILE, non una promise già creata.**
 * `PostgrestFilterBuilder`/`PostgrestBuilder` (il ritorno di `svc.rpc(...)`)
 * è un thenable pigro: la richiesta HTTP parte SOLO dentro `.then()`. Se
 * l'helper accettasse una promise già costruita (cioè `svc.rpc(...)`
 * invocato una volta sola dal chiamante e passato qui), il "secondo
 * tentativo" riutilizzerebbe lo stesso oggetto già (eventualmente) risolto
 * invece di spedire una nuova richiesta: il retry sarebbe teatro — esattamente
 * il difetto che ha fatto bocciare il primo giro del Task 3 (vedi
 * `src/lib/cassette/parco.ts`). Per ritentare DAVVERO occorre invocare
 * `svc.rpc(...)` una seconda volta, da cui la thunk.
 */
const SQLSTATE_DEADLOCK = '40P01'
const RPC_RETRY_BACKOFF_MS = 50

export type RpcEsito<T> = { data: T | null; error: PostgrestError | null }

/**
 * Esegue `chiamata()` una prima volta. Se l'errore è un deadlock (40P01),
 * attende un breve backoff e ri-invoca `chiamata()` una seconda (e ultima)
 * volta: un solo ritentativo, due tentativi totali — non di più, anche se
 * anche il secondo tentativo torna 40P01 (in quel caso l'esito del secondo
 * tentativo, deadlock incluso, è quello che viene ritornato al chiamante).
 * Qualunque altro codice di errore (o nessun errore) torna dal primo
 * tentativo senza attese.
 */
export async function callRpcWithRetry<T>(
  chiamata: () => PromiseLike<RpcEsito<T>>
): Promise<RpcEsito<T>> {
  const primo = await chiamata()
  if (primo.error?.code !== SQLSTATE_DEADLOCK) return primo
  await new Promise((resolve) => setTimeout(resolve, RPC_RETRY_BACKOFF_MS))
  return chiamata()
}
