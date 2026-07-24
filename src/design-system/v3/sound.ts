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
// listener. RESTA (a differenza di quanto previsto sopra): serve al ri-collaudo device #4
// del fix H1c sotto — DA RIMUOVERE (queste righe + i due file) solo dopo quel collaudo.
//
// H1c (diagnosi device provata al millisecondo + panel 3 advisor — solution-architect,
// specialista Web Audio, UX — 3/3 «strategia approvata con riserve», v.
// `.superpowers/sdd/h1-diagnosi.md`): l'overlay H1b sopra ha isolato la vera corsa, ed era
// un'altra rispetto a FIX-D1. `pointerdown` da TOCCO non conferisce user activation
// (`isActive=false` misurato): il `resume()` chiamato lì resta appeso finché `touchend`/
// `click` non la conferiscono, 8-15ms dopo — ma la `suona()` del tap parte dal click handler
// PRIMA che quel resume risolva. Il vecchio gate `if (!sbloccato) return` guardava l'ESITO
// della promise di sblocco, non lo stato del gesto: perdeva il primo tap per un margine di
// ~11ms, strutturalmente, non per hardware lento (il resume, una volta l'activation arrivata,
// risolve in 8-15ms — non è un problema di latenza hardware).
// Fix: quando il gesto è IN CORSO (`navigator.userActivation.isActive === true`) e il
// contesto NON è ancora `running`, la source si crea e si avvia SUBITO (`start()` sincrono,
// nello stesso gesto) — Chromium accoda il sample e lo fa partire da solo al passaggio a
// `running`, che arriva nella stessa finestra di activation. `sbloccato` degrada da GATE a
// sola ottimizzazione (evita `resume()` ridondanti): il vero gate diventa lo STATO del
// contesto + l'activation del gesto CORRENTE, non più la promise risolta. Guardia
// fuori-gesto (isActive===false — es. un suono `arrivo` da evento di rete a tab in
// background): MAI accodare, niente suoni fantasma al rientro. `interrupted` (bug NUOVO
// scoperto dal panel: dopo una telefonata `sbloccato` restava già true ma il resume non
// veniva mai ritentato → motore muto per sempre) ora si ritenta come `suspended`. Scadenza
// 150ms + max 1 pending: una source accodata che non diventa udibile in tempo (cold HAL) si
// scarta, mai più di una in coda per volta. `navigator.userActivation` assente (Safari
// legacy, jsdom): fallback ESATTO al vecchio gate `sbloccato` — path iOS/legacy intatto,
// nessuna regressione. Path iOS invariato per un altro motivo (riserva R1 del panel):
// l'auto-resume su `start()` con contesto non-running è comportamento Chromium, NON WebKit —
// il `resume()` esplicito nel gesto (`void sblocca()`) resta quindi OBBLIGATORIO in coppia
// con l'enqueue, non un residuo da rimuovere.

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

// H1c — stato dell'enqueue in corso (v. `suona()` ramo 4a). Al più UNA source pending per
// volta (UX req 3 panel): una nuova `suona()` durante la finestra sopprime la precedente.
/** Scadenza dell'enqueue (UX req 1 panel — `h1-diagnosi.md` §Riserve/4): oltre questa soglia
 *  dal gesto che l'ha originata, una source accodata che non è ancora diventata udibile
 *  (cold HAL) si scarta piuttosto che rischiare un suono percepibilmente disallineato dal
 *  tap. Il resolve della promise di `resume()` NON garantisce audio udibile (precisazione
 *  WebAudio advisor sul cold output) — per questo la scadenza guarda lo STATO del contesto,
 *  non l'esito della promise. */
const SCADENZA_ENQUEUE_MS = 150
let pendingSource: AudioBufferSourceNode | null = null
let pendingNome: NomeSuono | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null
let resumeInVolo = false // H1c (tidy, panel): evita i resume() concorrenti osservati sul
// device (pointerdown+touchend+click sullo stesso tap chiamavano 3 resume() ridondanti).

/** H1c: scarta la source pending corrente (stop + pulizia timer/stato) ed emette il motivo
 *  sul canale diagnostico. Chiamata sia quando una nuova `suona()` la soppianta, sia quando
 *  scade senza che il contesto sia arrivato a `running`. */
function scartaPending(motivo: string): void {
  if (!pendingSource) return
  try { pendingSource.stop() } catch { /* già ferma/finita: ignora */ }
  if (pendingTimer) clearTimeout(pendingTimer)
  suonoDiagEmetti('suona', () => ({ nome: pendingNome, esito: motivo }))
  pendingSource = null
  pendingNome = null
  pendingTimer = null
}

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

/** L'unica azione legata alla policy iOS Safari: il resume() dell'AudioContext. Chiamata
 *  SINCRONAMENTE dentro l'handler del gesto (pointerdown, o touchend/click di fallback) per
 *  il primo sblocco, E da `suona()` ramo 4a per ogni gesto successivo mentre il contesto non
 *  è `running` (H1c). Guardata sullo STATO del contesto, non più sul flag `sbloccato`: se
 *  guardasse `sbloccato` un `interrupted` post-telefonata (riserva R3 panel — bug NUOVO
 *  scoperto in diagnosi: `sbloccato` è già true, quindi il resume non veniva MAI ritentato)
 *  lascerebbe il motore muto per sempre. `resumeInVolo` evita resume() concorrenti (i 3
 *  osservati sul device per lo stesso tap: pointerdown+touchend+click). */
async function sblocca(): Promise<void> {
  const c = creaContesto()
  if (!c) return
  if (c.state !== 'suspended' && c.state !== 'interrupted') return // già running: nulla da fare
  if (resumeInVolo) return
  resumeInVolo = true
  const inizio = performance.now()
  const statePrima = c.state
  try {
    suonoDiagEmetti('sblocca', () => ({ fase: 'inizio', statePrima }))
    await c.resume()
    sbloccato = true
    if (rimuoviListener) { rimuoviListener(); rimuoviListener = null }
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
  } finally {
    resumeInVolo = false
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
  // qualcuno lo sta osservando (H1b) — zero listener in più per l'utente normale. try/catch
  // difensivo: questa è l'unica riga H1b che tocca il vero AudioContext, non deve MAI romperlo.
  if (c && suonoDiagAttivo()) {
    try {
      c.addEventListener('statechange', () => {
        suonoDiagEmetti('statechange', () => ({ state: c.state }))
      })
    } catch { /* contesto senza addEventListener: nessuna transizione osservata, motore intatto */ }
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
 *  `gain` < 1 = variante attenuata (ri-aggancio dopo annullo).
 *
 *  H1c: `suoniAttivi()` resta la prima guardia (§9, invariato); il vecchio gate `!sbloccato`
 *  NON è più la seconda — guardava l'ESITO della promise di sblocco, non lo stato del gesto,
 *  perdendo strutturalmente il primo tap (diagnosi device, v. commento di testa). Il gate ora
 *  è: contesto già `running` → riproduce; non-`running` con gesto in corso (`navigator.
 *  userActivation.isActive`) → accoda; non-`running` fuori gesto → scarta senza accodare;
 *  `userActivation` assente → fallback ESATTO al vecchio gate `sbloccato` (Safari legacy/
 *  jsdom, path iOS intatto). */
export function suona(nome: NomeSuono, opts?: { gain?: number }): void {
  try {
    if (!suoniAttivi()) {
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: !suoniAttivi' }))
      return
    }
    if (!ctx) {
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: !ctx' }))
      return
    }
    const c = ctx
    const buf = buffers.get(nome)
    if (!buf) {
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: buffer mancante' }))
      return
    }

    const avvia = (): AudioBufferSourceNode => {
      const src = c.createBufferSource()
      src.buffer = buf
      const g = c.createGain()
      g.gain.value = opts?.gain ?? 1
      src.connect(g)
      g.connect(c.destination)
      src.start()
      return src
    }

    if (c.state === 'running') {
      avvia()
      suonoDiagEmetti('suona', () => ({ nome, esito: 'giocato' }))
      return
    }

    // Non-running (suspended o interrupted): il gate diventa l'activation del gesto
    // CORRENTE, non l'esito della promise di sblocco (v. commento di testa, diagnosi device).
    const ua = (navigator as unknown as { userActivation?: { isActive: boolean } }).userActivation
    if (!ua) {
      // 4c — API assente (Safari legacy/jsdom): fallback ESATTO al comportamento pre-H1c.
      if (!sbloccato) {
        suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: !sbloccato' }))
        return
      }
      avvia()
      suonoDiagEmetti('suona', () => ({ nome, esito: 'giocato' }))
      return
    }
    if (!ua.isActive) {
      // 4b — fuori gesto (es. `arrivo` da evento di rete, tab in background): MAI accodare
      // (riserva R2 panel — niente suoni fantasma al rientro).
      suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: fuori-gesto' }))
      return
    }
    // 4a — gesto in corso, contesto non pronto: enqueue sincrono (fix H1c). Max 1 pending:
    // una nuova suona() in finestra sopprime la precedente.
    if (pendingSource) scartaPending('scartato: soppiantato')
    const statePrima = c.state
    const src = avvia()
    pendingSource = src
    pendingNome = nome
    void sblocca() // R1 panel: resume esplicito nel gesto resta OBBLIGATORIO per iOS/WebKit
    pendingTimer = setTimeout(() => {
      if (pendingSource !== src) return // già superata da un'altra suona() o già scaduta
      if (!ctx || ctx.state !== 'running') {
        try { src.stop() } catch { /* già ferma/finita: ignora */ }
        suonoDiagEmetti('suona', () => ({ nome, esito: 'scartato: scadenza 150ms' }))
      }
      pendingSource = null
      pendingNome = null
      pendingTimer = null
    }, SCADENZA_ENQUEUE_MS)
    suonoDiagEmetti('suona', () => ({ nome, esito: `enqueued (state=${statePrima})` }))
  } catch (e) {
    suonoDiagEmetti('suona', () => ({ nome, esito: `errore: ${e instanceof Error ? e.message : String(e)}` }))
    /* mai rompere l'app per un suono */
  }
}
