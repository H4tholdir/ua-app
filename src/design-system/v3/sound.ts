// DS v3 §9 — player dei 7 suoni firmati. Web Audio.
// FIX-D1 (verbale QA 2026-07-24 «Ri-collaudo device #1», punto D1 — primo tocco muto):
// prima di questo fix il fetch+decode dei 7 wav partiva SOLO dentro `sblocca()`, cioè dopo il
// primo touchend/click — ma quell'evento arriva DOPO che il tap ha già chiamato `suona()` nel
// proprio onClick (bubbling: target prima, document dopo), quindi il primissimo tap trovava
// sempre `sbloccato === false` ed usciva muto, buffer o no.
// Ora: il prefetch (fetch dei file) e la creazione dell'AudioContext partono SUBITO a
// `initSuoni()`, senza aspettare alcun gesto — NON è autoplay: un AudioContext creato fuori da
// un gesto nasce 'suspended' e non produce un solo sample finché non viene esplicitamente
// "resumed"; scaricare/decodificare bytes non emette suono. Lo sblocco vero (il resume, l'unica
// azione legata alla policy iOS Safari) avviene sul primo `pointerdown` del documento — evento
// che nella sequenza reale di un tap arriva PRIMA di click/touchend — cosi il resume() ha tutta
// la finestra reale fra dito-giù e dito-su per completarsi prima che il tap chiami `suona()`.
// touchend/click restano come fallback per i rari contesti senza Pointer Events.
// I suoni NON veicolano mai informazione esclusiva (c'è sempre il visivo — L3).

export type NomeSuono = 'tap' | 'fatta' | 'ua' | 'errore' | 'arrivo' | 'stacco' | 'riaggancio'
const FILES: Record<NomeSuono, string> = {
  tap: '/sounds/tap.wav', fatta: '/sounds/fatta.wav', ua: '/sounds/ua.wav',
  errore: '/sounds/errore.wav', arrivo: '/sounds/arrivo.wav',
  stacco: '/sounds/stacco.wav', riaggancio: '/sounds/riaggancio.wav',
}
const KEY = 'ua_sounds_v3'

let ctx: AudioContext | null = null
let sbloccato = false
let initFatto = false
let rimuoviListener: (() => void) | null = null
const buffers = new Map<NomeSuono, AudioBuffer>()

export function suoniAttivi(): boolean {
  if (typeof window === 'undefined') return false
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true } // default ATTIVI (§9.2)
}
export function impostaSuoni(on: boolean): void {
  try { localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* privato/quota: ignora */ }
}

/** Crea l'AudioContext se non esiste ancora. Fuori da un gesto utente nasce 'suspended': non
 *  emette nulla finché non viene "resumed" — crearlo qui non è autoplay. Idempotente. */
function creaContesto(): AudioContext | null {
  if (ctx) return ctx
  try { ctx = new AudioContext() } catch { ctx = null }
  return ctx
}

/** Scarica e decodifica i 7 file. `fetch` e `decodeAudioData` non richiedono un gesto utente:
 *  può partire subito a `initSuoni()`, cosi i buffer sono già pronti al primo gesto reale. */
async function precarica(): Promise<void> {
  const c = ctx
  if (!c) return
  await Promise.all((Object.keys(FILES) as NomeSuono[]).map(async nome => {
    try {
      const res = await fetch(FILES[nome])
      if (!res.ok) return
      const dati = await res.arrayBuffer()
      buffers.set(nome, await c.decodeAudioData(dati))
    } catch { /* singolo file mancante: quel suono resta muto */ }
  }))
}

/** L'unica azione legata alla policy iOS Safari: il resume() dell'AudioContext, chiamato
 *  SINCRONAMENTE dentro l'handler del gesto (pointerdown, o touchend/click di fallback). */
async function sblocca(): Promise<void> {
  if (sbloccato) return
  try {
    const c = creaContesto()
    if (!c) return
    if (c.state === 'suspended') await c.resume()
    sbloccato = true
    rimuoviListener?.()
    rimuoviListener = null
  } catch { /* dispositivo senza audio: resta muto */ }
}

/** Avvia prefetch + registra l'unlock. Chiamare una volta nel root client dell'app v3.
 *  Idempotente: chiamate ripetute non ricreano il contesto né ri-scaricano i file. */
export function initSuoni(): void {
  if (typeof window === 'undefined' || initFatto) return
  initFatto = true
  const c = creaContesto()
  if (c) void precarica()
  const handler = () => { void sblocca() }
  // pointerdown: arriva prima di click/touchend nella sequenza reale di un tap (FIX-D1).
  document.addEventListener('pointerdown', handler, { passive: true })
  // fallback per contesti senza Pointer Events.
  document.addEventListener('touchend', handler, { once: true, passive: true })
  document.addEventListener('click', handler, { once: true, passive: true })
  rimuoviListener = () => {
    document.removeEventListener('pointerdown', handler)
    document.removeEventListener('touchend', handler)
    document.removeEventListener('click', handler)
  }
}

/** Fire-and-forget: mai throw, mai await necessario. Max 1 suono per gesto (§9.2);
 *  DEROGA ratificata 23/07 (spec redesign §2.6): stacco+riaggancio sono due momenti
 *  dello STESSO gesto continuo di trascinamento — l'unica coppia ammessa.
 *  `gain` < 1 = variante attenuata (ri-aggancio dopo annullo). */
export function suona(nome: NomeSuono, opts?: { gain?: number }): void {
  try {
    if (!suoniAttivi() || !sbloccato || !ctx) return
    const buf = buffers.get(nome)
    if (!buf) return
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = opts?.gain ?? 1
    src.connect(g)
    g.connect(ctx.destination)
    src.start()
  } catch { /* mai rompere l'app per un suono */ }
}
