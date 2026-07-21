import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { derivaCassetteSuggerite } from './cassette-shared'
export * from './cassette-shared'

/** Le chips «dal parco» per lo sheet conferma-cassetta (Task 3, risoluzione
 *  R-D): 3 query invece della scansione di `lavori`.
 *  1. cassette vive del lab.
 *  2. occupate — SENZA limit: le righe vive sono al più una per cassetta
 *     (indice unico parziale), insieme piccolo e limitato per costruzione.
 *  3. storico ultimo uso, limitato alle 200 assegnazioni più recenti: la
 *     prima occorrenza di ogni `cassetta_id` nell'ordine desc è il suo
 *     `max(assegnato_at)`. Le cassette occupate da mesi restano corrette
 *     comunque, perché lette dalla query (2) che non ha limite — se le
 *     leggessimo dalla stessa finestra della (3) una cassetta fuori dalle 200
 *     assegnazioni più recenti sembrerebbe libera e verrebbe suggerita → 409
 *     all'assegnazione. Le cassette fuori da questa finestra restano
 *     `ultimoUso: null` e finiscono in coda (mai perse, mai lette come
 *     occupate per errore).
 *  Errori → [] (le chips sono un aiuto, mai un blocco). */
export async function getCassetteSuggerite(svc: SupabaseClient, labId: string): Promise<Array<{ id: string; nome: string }>> {
  try {
    const [{ data: cassette, error: errCassette }, { data: occupateRows, error: errOccupate }, { data: storico, error: errStorico }] = await Promise.all([
      svc.from('cassette').select('id, nome').eq('laboratorio_id', labId).is('deleted_at', null),
      svc.from('cassette_lavori').select('cassetta_id').eq('laboratorio_id', labId).is('liberato_at', null),
      svc.from('cassette_lavori').select('cassetta_id, assegnato_at').eq('laboratorio_id', labId)
        .order('assegnato_at', { ascending: false }).limit(200),
    ])
    if (errCassette) throw errCassette
    if (errOccupate) throw errOccupate
    if (errStorico) throw errStorico

    const occupate = new Set((occupateRows ?? []).map((r) => r.cassetta_id))
    const ultimoUso = new Map<string, string>()
    for (const r of storico ?? []) {
      if (!ultimoUso.has(r.cassetta_id)) ultimoUso.set(r.cassetta_id, r.assegnato_at)
    }
    const conUltimoUso = (cassette ?? []).map((c) => ({ id: c.id, nome: c.nome, ultimoUso: ultimoUso.get(c.id) ?? null }))
    return derivaCassetteSuggerite(conUltimoUso, occupate)
  } catch (err) {
    console.error('[getCassetteSuggerite] degrado a []:', err)
    return []
  }
}
