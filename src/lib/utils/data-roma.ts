// O1b — UNICO punto dell'app che risponde a «che giorno/ora è adesso a Roma»,
// e — da D286 (06/08/2026) — anche a «che ISTANTE è questo momento scritto senza
// fuso», che è la stessa domanda letta al contrario. Le due stanno insieme di
// proposito: separarle vorrebbe dire due moduli che dichiarano `Europe/Rome`,
// cioè due occasioni di dimenticarlo (v. il riquadro P9 più sotto).
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

// ═══════════════════════════════════════════════════════════════════════════
// D286 — LEGGERE un momento con l'orologio di Roma (06/08/2026)
//
// > «sempre l'app deve seguire l'orario italiano di Roma, quello di qualsiasi
// >  dispositivo in Italia» (Francesco)
//
// Fin qui questo file sapeva SCRIVERE l'ora di Roma (formattare, dare il giorno
// civile). Non sapeva LEGGERLA: quando un testo senza fuso arrivava dal client,
// a interpretarlo era `Date.parse`, cioè il fuso della MACCHINA che esegue.
//
// 🛑 IL DIFETTO CHE QUESTA SEZIONE CHIUDE, misurato:
//    un campo `datetime-local` di un browser restituisce `2026-08-06T10:00`,
//    **senza fuso**. `provato:` con `TZ=UTC` (il fuso del server dell'app)
//    `Date.parse('2026-08-06T10:00')` → `2026-08-06T10:00:00.000Z`, cioè le
//    **12:00 di Roma**: due ore in AVANTI. Su `conosciuto_il` quelle due ore
//    spostano il momento zero dei termini dell'Art. 87 MDR (2, 10, 15 giorni).
//    Sulla macchina di sviluppo, che è `Europe/Rome`, il difetto è INVISIBILE —
//    ed è il motivo per cui le prove forzano `TZ=UTC`.
//
// 🔑 SECONDO SINTOMO, chiuso dallo stesso cambio: «adesso» preso dal telefono
//    di un'operatrice italiana e mandato senza fuso finiva 2 ore nel futuro, e
//    sbatteva contro la guardia sui momenti futuri della rotta (tolleranza 5
//    minuti) → 422 su un valore predefinito legittimo.
//
// ⚠️ L'OFFSET NON È CABLATO, ed è un requisito esplicito: si RISOLVE per la data
//    in questione, così vale sia per l'ora legale (+2) sia per quella solare
//    (+1) — e continuerà a valere se un giorno l'Unione europea abolisse il
//    cambio dell'ora, senza che nessuno debba ricordarsi di venire qui.
// ═══════════════════════════════════════════════════════════════════════════

/** Le parti dell'orologio a muro di Roma. `h23` e non `hour12: false`: su certe
 *  build di ICU `hour12: false` rende l'ora `24` a mezzanotte, e un `24` letto
 *  come numero sposta di un giorno in silenzio. */
const FMT_PARTI_ROMA = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Rome',
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hourCycle: 'h23',
})

/** Millisecondi UTC da parti di calendario, **senza** la trappola di `Date.UTC`
 *  che mappa gli anni 0-99 sul Novecento. */
function msUTC(anno: number, mese: number, giorno: number, ora: number, minuto: number, secondo: number, ms: number): number {
  const d = new Date(0)
  d.setUTCFullYear(anno, mese - 1, giorno)
  d.setUTCHours(ora, minuto, secondo, ms)
  return d.getTime()
}

/** Di quanto Roma è avanti a UTC NELL'ISTANTE `t`, in millisecondi. */
function offsetRomaMs(t: number): number {
  const p: Record<string, number> = {}
  for (const parte of FMT_PARTI_ROMA.formatToParts(t)) {
    if (parte.type !== 'literal') p[parte.type] = Number(parte.value)
  }
  const muroComeSeFosseUTC = msUTC(p.year, p.month, p.day, p.hour, p.minute, p.second, 0)
  // `t` troncato al secondo, perché le parti sopra non portano i millesimi.
  return muroComeSeFosseUTC - Math.floor(t / 1000) * 1000
}

/** La stessa forma ammessa dalla rotta: data sola, oppure data e ora con o senza
 *  fuso in coda. Le parentesi catturano ciò che serve a costruire l'istante. */
const PARTI_ISO_8601 =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(Z|[+-]\d{2}:?\d{2})?)?$/

const GIORNO_MS = 86_400_000

export type EsitoIstante =
  | { ok: true; ms: number }
  /** `forma`: non è ISO 8601 (`01/08/2026`, `pippo`, il 30 febbraio…).
   *  `ora_inesistente`: è ISO 8601, ma quell'ora a Roma non è mai esistita —
   *  l'ultima domenica di marzo si salta dalle 2 alle 3. */
  | { ok: false; causa: 'forma' | 'ora_inesistente' }

/**
 * Legge un momento ISO 8601 e restituisce l'ISTANTE che rappresenta.
 *
 * - **Con** fuso in coda (`Z` o `±HH:MM`) → è già un istante non ambiguo: si
 *   rispetta com'è, senza toccarlo.
 * - **Senza** fuso → si legge sull'orologio di **Roma**, mai su quello del
 *   processo. La sola data vale **mezzanotte di Roma**.
 *
 * ⚖️ **L'ora che esiste DUE volte** (l'ultima domenica di ottobre, fra le 2 e le
 * 3) si legge come l'istante **PRECEDENTE**, cioè quello ancora in ora legale.
 * È la lettura che rende la scadenza più VICINA — stesso principio di D280,
 * «a parità vince il termine più breve», e stessa direzione dell'Art. 87(7),
 * nel dubbio si segnala. Nel codice è `Math.min`: l'istante minore è quello con
 * l'offset maggiore.
 *
 * 🔑 **Come si risolve l'offset senza cablarlo.** Si prende il momento come se
 * fosse UTC, si guarda che offset ha Roma il giorno PRIMA e il giorno DOPO — i
 * due soli candidati possibili attorno a un cambio d'ora — e si tiene solo
 * quello che, applicato, si RICONFERMA. Se nessuno si riconferma, quell'ora a
 * Roma non esiste.
 */
export function istanteDaTestoRoma(testo: string): EsitoIstante {
  const pulito = testo.trim()
  const m = PARTI_ISO_8601.exec(pulito)
  if (!m) return { ok: false, causa: 'forma' }

  const [, aa, mm, gg, oo, mi, ss, frazione, fuso] = m
  const anno = Number(aa)
  const mese = Number(mm)
  const giorno = Number(gg)
  const ora = oo === undefined ? 0 : Number(oo)
  const minuto = mi === undefined ? 0 : Number(mi)
  const secondo = ss === undefined ? 0 : Number(ss)
  // La regex ammette fino a 9 decimali; un istante JavaScript ne porta 3.
  const ms = frazione === undefined ? 0 : Number((frazione + '000').slice(0, 3))

  const comeSeFosseUTC = msUTC(anno, mese, giorno, ora, minuto, secondo, ms)

  // 🛑 Il calendario si verifica per ANDATA E RITORNO: `setUTCFullYear` non
  // fallisce mai — il 30 febbraio diventa il 2 marzo, l'ora 25 diventa il
  // giorno dopo. Senza questo controllo `2026-02-30` entrerebbe come una data
  // valida spostata in silenzio (oggi `Date.parse` la rifiuta: non si regredisce).
  const v = new Date(comeSeFosseUTC)
  if (
    v.getUTCFullYear() !== anno || v.getUTCMonth() !== mese - 1 || v.getUTCDate() !== giorno ||
    v.getUTCHours() !== ora || v.getUTCMinutes() !== minuto || v.getUTCSeconds() !== secondo
  ) {
    return { ok: false, causa: 'forma' }
  }

  // ── il momento porta già il suo fuso: è un istante, non si interpreta ──────
  if (fuso !== undefined) {
    if (fuso === 'Z') return { ok: true, ms: comeSeFosseUTC }
    const segno = fuso[0] === '-' ? -1 : 1
    const cifre = fuso.slice(1).replace(':', '')
    const spostamento = segno * (Number(cifre.slice(0, 2)) * 60 + Number(cifre.slice(2))) * 60_000
    return { ok: true, ms: comeSeFosseUTC - spostamento }
  }

  // ── nessun fuso: l'orologio è quello di Roma ───────────────────────────────
  const candidati = [...new Set([
    offsetRomaMs(comeSeFosseUTC - GIORNO_MS),
    offsetRomaMs(comeSeFosseUTC + GIORNO_MS),
  ])]

  const validi: number[] = []
  for (const offset of candidati) {
    const istante = comeSeFosseUTC - offset
    // Si tiene solo l'offset che si RICONFERMA sull'istante che produce.
    if (offsetRomaMs(istante) === offset) validi.push(istante)
  }

  if (validi.length === 0) return { ok: false, causa: 'ora_inesistente' }
  // ⚖️ D286: fra due letture possibili vince la PRECEDENTE (scadenza più vicina).
  return { ok: true, ms: Math.min(...validi) }
}

export const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export function saluto(d: Date): string {
  const h = d.getHours()
  if (h >= 5 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}
