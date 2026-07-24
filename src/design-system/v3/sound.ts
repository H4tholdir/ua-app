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
//
// H1b (verbale QA 2026-07-24, stesso punto D1) — CANALE DIAGNOSTICO TEMPORANEO: il fix sopra
// non ha chiuso il sintomo sul device Android di Francesco (primo tocco ancora muto). Prima di
// un altro fix alla cieca, le chiamate a `suonoDiagEmetti` sotto raccolgono evidenza reale
// (overlay `?diag=suoni`, v. `sound-diag.ts` e `DiagnosticaSuoni.tsx`). Sono SOLA lettura/
// notifica: no-op per chi non ha aperto l'overlay, non toccano `sbloccato`/`ctx`/l'ordine dei
// listener. DA RIMUOVERE (queste righe + i due file) quando il fix definitivo è chiuso.

import { suonoDiagAttivo, suonoDiagEmetti } from './sound-diag'

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
      suonoDiagEmetti('prefetch', () => ({ nome, fase: 'fetch-fine', ok: res.ok }))
      if (!res.ok) return
      const dati = await res.arrayBuffer()
      buffers.set(nome, await c.decodeAudioData(dati))
      suonoDiagEmetti('prefetch', () => ({ nome, fase: 'decode-fine' }))
    } catch (e) {
      suonoDiagEmetti('prefetch', () => ({ nome, fase: 'errore', msg: e instanceof Error ? e.message : String(e) }))
      /* singolo file mancante: quel suono resta muto */
    }
  }))
}

/** L'unica azione legata alla policy iOS Safari: il resume() dell'AudioContext, chiamato
 *  SINCRONAMENTE dentro l'handler del gesto (pointerdown, o touchend/click di fallback). */
async function sblocca(): Promise<void> {
  if (sbloccato) return
  const inizio = performance.now()
  try {
    const c = creaContesto()
    if (!c) return
    const statePrima = c.state
    suonoDiagEmetti('sblocca', () => ({ fase: 'inizio', statePrima }))
    if (c.state === 'suspended') await c.resume()
    sbloccato = true
    rimuoviListener?.()
    rimuoviListener = null
    suonoDiagEmetti('sblocca', () => ({
      fase: 'esito', esito: 'resolve', durataMs: Math.round(performance.now() - inizio),
      statePrima, stateDopo: c.state,
    }))
  } catch (e) {
    suonoDiagEmetti('sblocca', () => ({
      fase: 'esito', esito: 'reject', durataMs: Math.round(performance.now() - inizio),
      msg: e instanceof Error ? e.message : String(e),
    }))
    /* dispositivo senza audio: resta muto */
  }
}

/** Avvia prefetch + registra l'unlock. Chiamare una volta nel root client dell'app v3.
 *  Idempotente: chiamate ripetute non ricreano il contesto né ri-scaricano i file. */
export function initSuoni(): void {
  if (typeof window === 'undefined' || initFatto) return
  initFatto = true
  const c = creaContesto()
  suonoDiagEmetti('init', () => ({
    esito: c ? 'ok' : 'fallita',
    state: c?.state ?? null,
    sampleRate: c?.sampleRate ?? null,
    baseLatency: c?.baseLatency ?? null,
  }))
  // `statechange` è additivo (nessun handler esistente lo usava): non altera il motore, serve
  // solo a vedere le transizioni suspended/running/interrupted sull'overlay. Aggiunto solo se
  // qualcuno lo sta osservando (H1b) — zero listener in più per l'utente normale.
  if (c && suonoDiagAttivo()) {
    c.addEventListener('statechange', () => {
      suonoDiagEmetti('statechange', () => ({ state: c.state }))
    })
  }
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
    // Stesso ordine di valutazione dell'originale `if (!suoniAttivi() || !sbloccato || !ctx)
    // return` (§9, invariato) — solo diviso in guardie sequenziali per etichettare il motivo
    // esatto di scarto sull'overlay (H1b), senza cambiare quale condizione decide l'uscita.
    if (!suoniAttivi()) {
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: !suoniAttivi' }))
      return
    }
    if (!sbloccato) {
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: !sbloccato' }))
      return
    }
    if (!ctx) {
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: !ctx' }))
      return
    }
    const buf = buffers.get(nome)
    if (!buf) {
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: buffer mancante' }))
      return
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = opts?.gain ?? 1
    src.connect(g)
    g.connect(ctx.destination)
    src.start()
    suonoDiagEmetti('suona', () => ({ nome, esito: 'giocato' }))
  } catch (e) {
    suonoDiagEmetti('suona', () => ({ nome, esito: `errore: ${e instanceof Error ? e.message : String(e)}` }))
    /* mai rompere l'app per un suono */
  }
}
