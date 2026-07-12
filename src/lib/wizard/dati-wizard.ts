import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { inizioGiorno, aggiungiGiorni } from '@/components/ds/Campo'
import { TIPI_LAVORO, labelTipo, CANONICI_DAY1 } from '@/lib/domain/tipi-lavoro'
import { fetchCampioniConsegna, calcolaGiorniPerTipo } from '@/lib/lavori/tempi-medi'

export type DentistaWizard = { id: string; label: string; count30: number }
export type DatiWizard = {
  dentisti: DentistaWizard[]
  frequenzeTipi: Record<string, number>
  topTipi: string[]
  prossimoPz: string
  giorniPerTipo: Record<string, { giorni: number; daStoria: boolean }>
}

type RawCliente = { id: string; nome: string; cognome: string; studio_nome: string | null }
type RawLavoro30 = { cliente_id: string; descrizione: string; data_ingresso: string }
type RawPaziente = { codice_paziente: string | null }

// Formatta 'YYYY-MM-DD' usando i componenti LOCALI del Date — MAI
// `toISOString().split('T')[0]`: convertirebbe a UTC e, per un lab in
// Italia (CEST +2), la mezzanotte locale diventerebbe le 22:00 del giorno
// PRIMA, spostando il cutoff di un giorno indietro (bug silenzioso).
function isoDataLocale(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

/**
 * Prossimo codice paziente 'PZ-####': max numerico dei codici che
 * matchano ESATTAMENTE `PZ-<cifre>` (ancorato, §brief) + 1, pad a 4
 * cifre. Codici non conformi (es. 'P-99', 'ALTRO', o un eventuale
 * 'PZ-ABC' sfuggito al filtro `.like` lato query) sono ignorati — la
 * query DB è solo un'ottimizzazione di banda, questa regex resta
 * l'unica fonte di verità sul formato.
 */
function calcolaProssimoPz(pazienti: RawPaziente[]): string {
  let max = 0
  for (const p of pazienti) {
    const match = p.codice_paziente?.match(/^PZ-(\d+)$/)
    if (match) max = Math.max(max, parseInt(match[1], 10))
  }
  return `PZ-${String(max + 1).padStart(4, '0')}`
}

/**
 * Aggregazione pura (nessuna rete) del wizard — mirror di
 * `calcolaGiorniPerTipo` (Task 6): testabile passando array semplici,
 * senza dover simulare la query-chain Supabase. `getDatiWizard` la
 * compone con `calcolaGiorniPerTipo(campioni)` per il campo mancante
 * `giorniPerTipo`.
 */
export function aggregaDatiWizard(
  clienti: RawCliente[],
  lavori: RawLavoro30[],
  pazienti: RawPaziente[],
  oggi: Date = new Date()
): Omit<DatiWizard, 'giorniPerTipo'> {
  // Ri-filtra in JS con la stessa soglia della query DB (`.gte` a monte è
  // un'ottimizzazione di banda, non l'unica garanzia): un client/mock che
  // ignori il filtro non deve mai gonfiare i conteggi.
  const cutoff = aggiungiGiorni(inizioGiorno(oggi), -30)
  const ultimi30gg = lavori.filter((l) => new Date(l.data_ingresso) >= cutoff)

  const countPerCliente = new Map<string, number>()
  for (const l of ultimi30gg) {
    countPerCliente.set(l.cliente_id, (countPerCliente.get(l.cliente_id) ?? 0) + 1)
  }

  const dentisti: DentistaWizard[] = clienti
    .map((c) => ({
      id: c.id,
      label: c.studio_nome ?? `Dr. ${c.cognome}`,
      count30: countPerCliente.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.count30 - a.count30 || a.label.localeCompare(b.label))

  const frequenzeTipi: Record<string, number> = {}
  for (const t of TIPI_LAVORO) {
    const label = labelTipo(t)
    frequenzeTipi[t.id] = ultimi30gg.filter((l) => l.descrizione === label).length
  }

  // Top 4: i tipi con count>0 ordinati per frequenza desc — `.sort` è
  // stabile (ES2019+), quindi filtrare prima nell'ordine canonico di
  // TIPI_LAVORO e ordinare dopo per frequenza preserva l'ordine canonico
  // a parità di conteggio (tie-break richiesto dal brief).
  const conFrequenza = TIPI_LAVORO
    .filter((t) => frequenzeTipi[t.id] > 0)
    .sort((a, b) => frequenzeTipi[b.id] - frequenzeTipi[a.id])
    .map((t) => t.id)

  const topTipi = conFrequenza.slice(0, 4)
  for (const id of CANONICI_DAY1) {
    if (topTipi.length >= 4) break
    if (!topTipi.includes(id)) topTipi.push(id)
  }

  const prossimoPz = calcolaProssimoPz(pazienti)

  return { dentisti, frequenzeTipi, topTipi, prossimoPz }
}

/**
 * Dati server per il wizard nuovo lavoro (`/lavori/nuovo`, Task 8): dentisti
 * ordinati per frequenza 30gg, frequenze granulari per tipo, top-4 tipi,
 * prossimo codice paziente PZ e giorni medi di consegna per tipo (riuso
 * Task 6). Fail-closed su ogni query (prassi post-Ondata 3): un errore di
 * lettura propaga, mai un wizard silenziosamente vuoto/sbagliato.
 *
 * `oggi` è opzionale (default `new Date()`, come `dataSuggerita` in
 * tempi-medi.ts) — solo per rendere testabile la finestra dei 30gg senza
 * fake-timers; i chiamanti reali (Task 8) continuano a invocarla a 2 argomenti.
 */
export async function getDatiWizard(svc: SupabaseClient, labId: string, oggi: Date = new Date()): Promise<DatiWizard> {
  const cutoff = isoDataLocale(aggiungiGiorni(inizioGiorno(oggi), -30))

  const [clientiRes, lavoriRes, pazientiRes, campioni] = await Promise.all([
    svc.from('clienti').select('id, nome, cognome, studio_nome').eq('laboratorio_id', labId).is('deleted_at', null),
    svc.from('lavori').select('cliente_id, descrizione, data_ingresso').eq('laboratorio_id', labId).is('deleted_at', null).gte('data_ingresso', cutoff),
    svc.from('pazienti').select('codice_paziente').eq('laboratorio_id', labId).is('deleted_at', null).like('codice_paziente', 'PZ-%'),
    fetchCampioniConsegna(svc, labId),
  ])

  if (clientiRes.error) throw new Error(`[dati wizard] lettura clienti: ${clientiRes.error.message}`)
  if (lavoriRes.error) throw new Error(`[dati wizard] lettura lavori: ${lavoriRes.error.message}`)
  if (pazientiRes.error) throw new Error(`[dati wizard] lettura pazienti: ${pazientiRes.error.message}`)

  const clienti = (clientiRes.data ?? []) as unknown as RawCliente[]
  const lavori = (lavoriRes.data ?? []) as unknown as RawLavoro30[]
  const pazienti = (pazientiRes.data ?? []) as unknown as RawPaziente[]

  const aggregato = aggregaDatiWizard(clienti, lavori, pazienti, oggi)
  const giorniPerTipo = calcolaGiorniPerTipo(campioni)

  return { ...aggregato, giorniPerTipo }
}
