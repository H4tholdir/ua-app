// H1b — canale diagnostico TEMPORANEO del motore suoni (overlay `?diag=suoni`).
// Verbale QA 2026-07-24 «Ri-collaudo device #1», punto D1: il primo tocco sul device Android
// resta muto nonostante due fix corretti (prefetch+unlock su pointerdown, init anticipata su
// tutte le superfici). Direttiva di Francesco: STOP ai fix alla cieca — prima la misura.
// Questo file è SOLA lettura/notifica: non chiama mai `resume()`, non tocca `sbloccato`/`ctx`,
// non aggiunge un solo listener sul motore. `sound.ts` lo chiama nei punti già esistenti
// (v. commenti lì) e l'overlay (`DiagnosticaSuoni.tsx`) lo legge per disegnare a schermo.
// DA RIMUOVERE — questo file, le chiamate in `sound.ts` che lo referenziano, il componente e
// il mount nel root layout — quando il fix definitivo (dopo H1b) è chiuso e verificato.
//
// Perché il canale si attiva leggendo l'URL (`decidiDiagSuoni`) e non alla prima `registra()`:
// l'overlay monta nel root layout DOPO `{children}` (v. layout.tsx) — di proposito, cosi i SUOI
// listener di gesto arrivano dopo quelli del motore (§ punto 4 del brief H1b). MA questo
// significa che `initSuoni()` (chiamato nell'effect della pagina, dentro `{children}`) ha già
// finito di girare PRIMA che l'overlay si registri: se il canale si accendesse solo al primo
// subscriber, l'evento `init` — il primo e più importante — sarebbe già perso. Leggere l'URL
// permette al canale di iniziare a registrare fin dalla primissima chiamata di `initSuoni()`,
// e consegnare lo storico già accumulato al subscriber tardivo (v. `suonoDiagRegistra`).
// Per l'utente normale (niente `?diag=suoni`) resta un semplice confronto booleano: zero
// allocazioni, zero listener, zero lavoro.

export type EventoDiagSuono = {
  /** performance.now() al momento dell'evento */
  t: number
  tipo: 'init' | 'statechange' | 'prefetch' | 'gesto' | 'sblocca' | 'suona'
  dettagli: Record<string, unknown>
}

/** Pura: `?diag=suoni` attiva overlay e canale. Qualsiasi altro valore/assenza → spento.
 *  Niente persistenza (a differenza dell'overlay viewport P-STATUSBAR): questo strumento vive
 *  di solo query param, per tutta la vita della pagina/tab in cui è stato aperto. */
export function decidiDiagSuoni(search: string): boolean {
  return new URLSearchParams(search).get('diag') === 'suoni'
}

let attivoCache: boolean | null = null
/** Attivo lette dall'URL alla prima chiamata utile, poi cache per il resto della vita pagina
 *  (query param non cambia con una navigazione client-side — accettato, stesso limite di
 *  P-STATUSBAR). Esportata per `sound.ts`: evita di aggiungere il listener `statechange` in
 *  più (v. `initSuoni`) quando nessuno sta osservando. */
export function suonoDiagAttivo(): boolean {
  if (attivoCache === null) {
    attivoCache = typeof window !== 'undefined' && decidiDiagSuoni(window.location.search)
  }
  return attivoCache
}

const MAX_STORICO = 200 // ring buffer: strumento di collaudo usa-e-getta, non serve storia illimitata
let storico: EventoDiagSuono[] = []
type Subscriber = (storico: EventoDiagSuono[]) => void
let subscriber: Subscriber | null = null

/** Evento diagnostico. No-op se il canale non è attivo — costo di un confronto booleano.
 *  `dettagli` è una funzione lazy: costruita SOLO se il canale è attivo, cosi l'utente normale
 *  non paga mai l'allocazione dell'oggetto dettagli. */
export function suonoDiagEmetti(tipo: EventoDiagSuono['tipo'], dettagli: () => Record<string, unknown>): void {
  if (!suonoDiagAttivo()) return
  storico = [...storico.slice(-(MAX_STORICO - 1)), { t: performance.now(), tipo, dettagli: dettagli() }]
  subscriber?.(storico)
}

/** Registra l'overlay come unico subscriber: notifica SUBITO con lo storico già accumulato
 *  (può contenere eventi emessi prima del mount, es. `init` — v. nota di testa) e poi ogni
 *  evento successivo. Ritorna la funzione di deregistrazione ("spegnimento"). */
export function suonoDiagRegistra(cb: Subscriber): () => void {
  subscriber = cb
  cb(storico)
  return () => {
    if (subscriber === cb) subscriber = null
  }
}
