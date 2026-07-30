// O1b — UNICO punto dell'app che risponde a «che giorno/ora è adesso a Roma».
// `new Date().toISOString().split('T')[0]` è UTC: tra le 00:00 e le 02:00 di
// Roma restituisce il giorno PRIMA (KPI «consegne di oggi» sbagliati di notte).
// Dal fix date-fiscali (20/07/2026) passano da qui ANCHE fatture, XML
// FatturaPA, DdC, buono e DPA (annoRoma/oggiRomaISO): la data documento è il
// giorno civile italiano ex Art. 21 DPR 633/72. I timestamptz completi
// (data_emissione, *_at) restano invece istanti assoluti — corretti così.

const FMT_ISO_ROMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
})

/** «Oggi» come giorno civile di Roma, formato YYYY-MM-DD. */
export function oggiRomaISO(d: Date = new Date()): string {
  return FMT_ISO_ROMA.format(d)
}

/** L'anno del giorno civile di Roma — per numeri documento e serie progressive
 *  fiscali (a capodanno l'anno UTC resta indietro di 1-2 ore). */
export function annoRoma(d: Date = new Date()): number {
  return Number(oggiRomaISO(d).slice(0, 4))
}

/** L'orologio a muro di Roma come Date locale (per getHours/getDay/getDate). */
export function adessoRoma(d: Date = new Date()): Date {
  return new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Rome' }))
}

/** Aritmetica su date-only (YYYY-MM-DD) senza mai passare da UTC. */
export function aggiungiGiorniISO(iso: string, giorni: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const data = new Date(y, m - 1, d + giorni)
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  const dd = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mm}-${dd}`
}

/**
 * Indietro di `mesi` su una data-only (YYYY-MM-DD), **senza traboccare**.
 *
 * ── Il difetto che questa funzione esiste per togliere di mezzo (31/07/2026) ──
 * `d.setFullYear(d.getFullYear() - 1)` e `d.setMonth(d.getMonth() - n)` non
 * falliscono MAI: se il giorno corrente non esiste nel punto d'arrivo — il **29
 * febbraio** guardato da un anno non bisestile, il **31** guardato da un mese di
 * 30 — JavaScript scivola in avanti al mese successivo, e la finestra nasce
 * spostata **in silenzio**. È lo stesso difetto trovato la stessa notte in
 * `src/lib/dashboard/queries.ts` (là il grafico dipingeva un mese futuro a zero);
 * qui la finestra «ultimi dodici mesi» di `src/app/api/clienti/[id]/route.ts`
 * cominciava un giorno più tardi ogni 29 febbraio.
 *
 * ── La regola, ed è una scelta dichiarata ────────────────────────────────────
 * Quando il giorno non esiste nel mese d'arrivo ci si ferma all'**ULTIMO giorno
 * di quel mese**, mai al primo del successivo: una finestra all'indietro deve
 * poter solo allargarsi, mai stringersi sotto il periodo chiesto. Il 29 febbraio
 * 2028, dodici mesi indietro, è il **28 febbraio 2027**.
 * 🔑 Il traboccamento è impossibile per costruzione, non per attenzione: si parte
 * dal **giorno 1** del mese d'arrivo — che esiste sempre — e solo dopo si posa il
 * giorno, limitato alla lunghezza vera di quel mese.
 *
 * `mesi` negativo va in avanti, con la stessa protezione.
 * Come `aggiungiGiorniISO`, non passa **mai** da UTC: entra ed esce una data
 * civile.
 */
export function mesiFaISO(iso: string, mesi: number): string {
  const [anno, mese, giorno] = iso.split('-').map(Number)
  const bersaglio = new Date(anno, mese - 1 - mesi, 1)
  // Giorno 0 del mese SEGUENTE = ultimo giorno del mese d'arrivo.
  const ultimoGiorno = new Date(bersaglio.getFullYear(), bersaglio.getMonth() + 1, 0).getDate()
  bersaglio.setDate(Math.min(giorno, ultimoGiorno))
  const mm = String(bersaglio.getMonth() + 1).padStart(2, '0')
  const dd = String(bersaglio.getDate()).padStart(2, '0')
  return `${bersaglio.getFullYear()}-${mm}-${dd}`
}

export const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export function saluto(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}
