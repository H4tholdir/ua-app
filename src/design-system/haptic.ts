// Pattern tattili UÀ — sempre enhancement, mai requisito.
// Fallback silenzioso su iOS e dispositivi non supportati.

export function haptic(pattern: number | readonly number[] = 8): void {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern as number | number[]);
  }
}

export const hapticPatterns = {
  light:   8,                      // Tap leggero
  medium:  20,                     // Conferma azione
  heavy:   50,                     // Azione importante
  double:  [20, 30, 20],           // Doppio tap
  success: [30, 20, 60],           // CONSEGNA completata
  error:   [50, 20, 50, 20, 100],  // Errore — pattern irregolare
} as const;

export type HapticPattern = keyof typeof hapticPatterns;

export function hapticNamed(name: HapticPattern): void {
  haptic(hapticPatterns[name]);
}
