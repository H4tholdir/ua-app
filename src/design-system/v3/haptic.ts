// DS v3 §9.3 — vibrazione = progressive enhancement Android.
// iOS Safari NON supporta navigator.vibrate (verificato 2026): lì il tatto
// lo danno molla `press` + suono. La UI chiama sempre vibra(): qui è no-op sicuro.

const PATTERN = {
  selection: 10 as number | number[],
  light: 15 as number | number[],
  medium: 30 as number | number[],
  success: [15, 80, 25] as number | number[],
  error: [40, 60, 40, 60, 40] as number | number[],
} as const

export type TipoVibrazione = keyof typeof PATTERN
const KEY = 'ua_haptic_v3'

export function hapticDisponibile(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator
}
function attivo(): boolean {
  if (!hapticDisponibile()) return false
  try { return localStorage.getItem(KEY) !== 'off' } catch { return true }
}
/** Mai throw, mai raffiche: un pattern per gesto. */
export function vibra(tipo: TipoVibrazione): void {
  try { if (attivo()) navigator.vibrate(PATTERN[tipo]) } catch { /* no-op */ }
}
