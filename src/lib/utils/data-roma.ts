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

export const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export function saluto(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}
