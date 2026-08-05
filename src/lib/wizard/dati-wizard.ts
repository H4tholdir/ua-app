import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { inizioGiorno, aggiungiGiorni } from '@/lib/date/giorni'
import { TIPI_LAVORO, labelTipo, CANONICI_DAY1 } from '@/lib/domain/tipi-lavoro'
import { fetchCampioniConsegna, calcolaGiorniPerTipo } from '@/lib/lavori/tempi-medi'

export type DentistaWizard = {
  id: string
  label: string
  count30: number
  /**
   * OPZIONALE (Task 10, Ondata B ②/P37): il codice reale (`aggregaDatiWizard`
   * sotto) lo valorizza SEMPRE — è opzionale nel TIPO solo per non forzare
   * ogni fixture di test esistente (nessuna delle quali tocca il gate del
   * mini-foglio «Chi ha prescritto?») a portarlo. `null`/assente = dottore
   * singolo (D196): il Passo 1 non fa MAI la `GET /studio-members` per lui —
   * non solo perché la risposta sarebbe `[]` (route.ts:41-43, `studio_nome`
   * nullo → array vuoto), ma perché quella chiamata di rete in più non deve
   * esistere per il caso comune.
   */
  studioNome?: string | null
}
export type DatiWizard = {
  dentisti: DentistaWizard[]
  frequenzeTipi: Record<string, number>
  topTipi: string[]
  prossimoPz: string
  giorniPerTipo: Record<string, { giorni: number; daStoria: boolean }>
}

// `nome` NON è nella select: la label wizard usa solo studio_nome/cognome
// ('Dr. Cognome'), diversamente da pile-home che mostra 'Nome Cognome'.
type RawCliente = { id: string; cognome: string; studio_nome: string | null }
type RawLavoro30 = { cliente_id: string; descrizione: string; data_ingresso: string }
type RawPaziente = { codice_paziente: string | null }

// Formatta 'YYYY-MM-DD' componendo da getFullYear/getMonth/getDate —
// convenzione del wizard decisa dal piano (Task 12, coerente con W7 /
// Campo.tsx): tutta l'aritmetica di date del wizard resta in componenti
// locali, senza passare da `toISOString().split('T')[0]` (che usa il fuso
// UTC). Ragioni: coerenza con `inizioGiorno`/`aggiungiGiorni` usati qui
// sopra, e robustezza se il TZ del processo differisse da UTC — non
// un'affermazione che il pattern toISOString usato altrove sia buggato oggi.
function isoDataLocale(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const g = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${g}`
}

/**
 * Prossimo codice paziente 'PZ-####': max numerico dei codici che — una volta
 * ripuliti dagli spazi ai bordi — matchano `PZ-<cifre>` SENZA distinguere
 * maiuscole da minuscole, + 1, pad a 4 cifre.
 *
 * 🔑 REGOLA DI Z3: il generatore dev'essere UGUALE O PIÙ CONSERVATIVO
 * dell'arbitro, mai meno. L'arbitro è l'indice unico su
 * `(laboratorio_id, lower(btrim(codice_paziente)))` previsto da T5: due codici
 * che collidono LÌ devono contare anche QUI, altrimenti il wizard propone un
 * codice che la scrittura poi rifiuta — ed è un anello chiuso, perché
 * `prossimoPz` non si ricalcola (`WizardNuovoLavoro.tsx:258`).
 *   · maiuscole/minuscole → `/i`: un `pz-0043` digitato a mano era invisibile;
 *   · spazi ai bordi → `.trim()`: `' PZ-0043 '` collide a database.
 *
 * ⚠️ `trim()` di JavaScript toglie PIÙ di `btrim()` di Postgres (tab, a-capo,
 * spazi unicode; `btrim` di default toglie solo lo spazio ASCII). La divergenza
 * è voluta e cade dalla parte sicura: al più il generatore salta un numero che
 * a database sarebbe libero, mai ne propone uno occupato.
 *
 * Perché il trim si fa anche se oggi le righe con spazi sono ZERO (sondato il
 * 30/07: `con_spazi 0` su 915 codici): «zero oggi» è un fatto sui dati, non un
 * invariante. `codice_paziente` si scrive anche fuori dalle rotte API — p.es.
 * `scripts/seed-arturo-pepe.ts:313` scrive col service client — quindi la
 * normalizzazione in scrittura non chiude ogni porta. E la regola regge sotto
 * entrambe le forme che T5 può dare all'indice: se normalizza, il trim serve;
 * se non normalizza, il trim resta innocuo perché ci rende solo più prudenti.
 *
 * Codici non conformi ('P-99', 'ALTRO', 'PAZ/2026/0001') restano ignorati: la
 * query è solo un'ottimizzazione di banda, questa regex è l'unica fonte di
 * verità sul formato.
 */
function calcolaProssimoPz(pazienti: RawPaziente[]): string {
  let max = 0
  for (const p of pazienti) {
    const match = p.codice_paziente?.trim().match(/^PZ-(\d+)$/i)
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
      studioNome: c.studio_nome,
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
    svc.from('clienti').select('id, cognome, studio_nome').eq('laboratorio_id', labId).is('deleted_at', null),
    svc.from('lavori').select('cliente_id, descrizione, data_ingresso').eq('laboratorio_id', labId).is('deleted_at', null).gte('data_ingresso', cutoff),
    // `ilike '%PZ-%'`, non `like 'PZ-%'`, per due motivi distinti: (a) senza
    // case-insensitive un `pz-0043` non viene nemmeno letto; (b) senza togliere
    // l'ancoraggio a sinistra, `' PZ-0043 '` non viene letto — il pattern lo
    // valuta Postgres sulla colonna GREZZA, e nessun `trim()` in JS può
    // recuperare una riga che la query non ha portato a casa.
    // Costo: su `codice_paziente` non esiste alcun indice (verificato il 30/07
    // su `pg_indexes`), quindi entrambi i pattern erano già una scansione, e
    // oggi le righe lette restano le stesse 4.
    // 🛑 Niente `.is('deleted_at', null)` qui: l'indice unico non filtrerà per
    // stato, quindi un paziente cancellato o archiviato occupa il suo numero lo
    // stesso. Il filtro RESTA sulle due query qui sopra, che col codice
    // paziente non c'entrano nulla.
    svc.from('pazienti').select('codice_paziente').eq('laboratorio_id', labId).ilike('codice_paziente', '%PZ-%'),
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
