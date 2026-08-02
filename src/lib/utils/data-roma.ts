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

// ═══════════════════════════════════════════════════════════════════════════
// P9 — LE DATE CHE FINISCONO STAMPATE SU UN DOCUMENTO (02/08/2026)
//
// Undici punti nei modelli PDF rendevano una data con `toLocaleDateString('it-IT',
// …)` senza dichiarare il fuso, cioè nel fuso della MACCHINA che genera il file —
// e in produzione quella macchina gira a UTC.
//   `provato:` 2026-03-10T23:30:00Z (le 00:30 dell'11 marzo a Roma)
//              a UTC → «10/03/2026» · a Roma → «11/03/2026»
//
// 🔑 E la metà del lavoro era già fatta, il che rendeva il difetto PEGGIORE: il
//    NUMERO del documento passa da `annoRoma()` dal 20/07/2026, la data stampata
//    no. Fra le 00:00 e le 02:00 un documento portava un numero della serie di un
//    giorno e stampava la data del giorno prima.
//
// 🔑 PERCHÉ SONO FUNZIONI CONDIVISE E NON UN'OPZIONE AGGIUNTA IN UNDICI PUNTI.
//    Undici copie della stessa opzione sono undici occasioni di dimenticarla la
//    prossima volta — ed è esattamente così che P9 è nata: il fuso era stato
//    dichiarato in UN punto (`DpaTemplate`) e in nessuno degli altri dieci.
//
// ⚠️ VALGONO SIA PER GLI ISTANTI SIA PER LE DATE CIVILI, e non per caso: Roma è
//    SEMPRE avanti a UTC (+1 o +2, mai negativa), quindi `new Date('2026-03-10')`
//    — che è mezzanotte UTC — letta a Roma resta il 10 (sono le 01:00). Se il
//    fuso di riferimento fosse a ovest di Greenwich questa uniformità cadrebbe.
//
// 🛑 NON usarle per un'ora che deve restare un istante assoluto (un registro di
//    accessi, una traccia tecnica): lì il fuso di lettura è una scelta di chi
//    legge, non del documento.
// ═══════════════════════════════════════════════════════════════════════════

const FMT_DATA_BREVE = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric',
})
const FMT_DATA_ORA = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})
const FMT_DATA_ESTESA = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome', day: 'numeric', month: 'long', year: 'numeric',
})

/** Il trattino che i modelli PDF già usavano per «non c'è». */
const ASSENTE = '—'

function formattaARoma(fmt: Intl.DateTimeFormat, iso: string | null | undefined): string {
  if (!iso) return ASSENTE
  const d = new Date(iso)
  // ⚠️ Il controllo è QUI e non in un `catch`, perché un `catch` non basterebbe:
  // `provato:` `new Date('pippo').toLocaleDateString('it-IT', …)` NON lancia —
  // restituisce la stringa «Invalid Date», che i modelli stampavano sul PDF.
  if (Number.isNaN(d.getTime())) return ASSENTE
  return fmt.format(d)
}

/** Data da documento, gg/mm/aaaa, nel giorno civile italiano. */
export function dataItalianaBreve(iso: string | null | undefined): string {
  return formattaARoma(FMT_DATA_BREVE, iso)
}

/** Data e ora dell'orologio di Roma, gg/mm/aaaa, hh:mm. */
export function dataOraItaliana(iso: string | null | undefined): string {
  return formattaARoma(FMT_DATA_ORA, iso)
}

/** Formato lungo da contratto: «11 marzo 2026». */
export function dataItalianaEstesa(iso: string | null | undefined): string {
  return formattaARoma(FMT_DATA_ESTESA, iso)
}

export const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export function saluto(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}
