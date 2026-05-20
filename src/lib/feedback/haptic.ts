/**
 * Haptic feedback via Vibration API.
 * Rispetta prefers-reduced-motion e preferenza utente in localStorage.
 * Usare solo su azioni critiche/irreversibili, mai su scroll/hover.
 */

function isHapticEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return false
  // Rispetta preferenza utente salvata in localStorage
  try {
    return localStorage.getItem('ua_haptic') !== 'off'
  } catch {
    return true
  }
}

/** Successo: doppio tap breve (conferma pagamento, invio sollecito) */
export function hapticSuccess() {
  if (!isHapticEnabled()) return
  navigator.vibrate([10, 50, 10])
}

/** Tap singolo leggero (selezione, toggle) */
export function hapticLight() {
  if (!isHapticEnabled()) return
  navigator.vibrate(10)
}

/** Azione decisa (invio, conferma) */
export function hapticMedium() {
  if (!isHapticEnabled()) return
  navigator.vibrate(20)
}

/** Errore critico */
export function hapticError() {
  if (!isHapticEnabled()) return
  navigator.vibrate([100, 30, 100])
}

export function setHapticEnabled(enabled: boolean) {
  try {
    localStorage.setItem('ua_haptic', enabled ? 'on' : 'off')
  } catch {
    // ignore
  }
}
