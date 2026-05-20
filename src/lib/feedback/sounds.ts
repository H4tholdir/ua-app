/**
 * Suoni sintetici via Web Audio API (oscillatori puri, zero bundle impact).
 * Lazy init: AudioContext creato solo dopo il primo user gesture (policy browser).
 * Rispetta prefers-reduced-motion e preferenza utente in localStorage.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!isSoundEnabled()) return null
  try {
    if (!ctx) ctx = new AudioContext()
    return ctx
  } catch {
    return null
  }
}

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false
  // Rispetta prefers-reduced-motion (suoni off se riduzione attiva)
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  try {
    return localStorage.getItem('ua_sounds') === 'on' // default OFF
  } catch {
    return false
  }
}

/** Pagamento confermato: due note ascendenti C5→E5 (positivo) */
export function soundPaymentSuccess() {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(523, c.currentTime)
  osc.frequency.setValueAtTime(659, c.currentTime + 0.12)
  gain.gain.setValueAtTime(0.25, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.45)
  osc.start()
  osc.stop(c.currentTime + 0.45)
}

/** Sollecito inviato: click morbido (singola nota breve) */
export function soundSollecito() {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, c.currentTime)
  gain.gain.setValueAtTime(0.2, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.18)
  osc.start()
  osc.stop(c.currentTime + 0.18)
}

/** Errore / azione bloccata: nota grave breve */
export function soundError() {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.connect(gain)
  gain.connect(c.destination)
  osc.type = 'square'
  osc.frequency.setValueAtTime(220, c.currentTime)
  gain.gain.setValueAtTime(0.15, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2)
  osc.start()
  osc.stop(c.currentTime + 0.2)
}

export function setSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem('ua_sounds', enabled ? 'on' : 'off')
  } catch {
    // ignore
  }
}
