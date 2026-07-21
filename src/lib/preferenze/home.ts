// src/lib/preferenze/home.ts
// Parsing difensivo della preferenza «La tua home» (colonna `utenti.nav_preferences`, Json).
// Scritta SOLO via RPC `utente_set_nav_pref` (route: src/app/api/impostazioni/preferenze/route.ts).
// Consumato in lettura dai Task 14 (home a due stanze), 15 (stanza Parete) e 17 (riga in
// /impostazioni).
export type HomePref = 'due_stanze' | 'pile' | 'parete'

const VALIDE: readonly HomePref[] = ['due_stanze', 'pile', 'parete']

/**
 * Validatore STRETTO per la scrittura (route PATCH): un valore fuori enum deve produrre un 422
 * esplicito. NON riusare `homePrefDa` per validare l'input in scrittura — la sua semantica di
 * default silenzioso a 'due_stanze' nasconderebbe l'errore invece di segnalarlo (avrebbe scritto
 * 'due_stanze' senza che l'utente l'avesse davvero scelto).
 */
export function isHomePref(v: unknown): v is HomePref {
  return typeof v === 'string' && (VALIDE as readonly string[]).includes(v)
}

/** Lettura difensiva (Task 14/15/17): default 'due_stanze' su null/garbage/valore ignoto. */
export function homePrefDa(navPreferences: unknown): HomePref {
  if (navPreferences && typeof navPreferences === 'object') {
    const v = (navPreferences as Record<string, unknown>).home
    if (isHomePref(v)) return v
  }
  return 'due_stanze'
}

/** Lettura difensiva del flag «intro Parete già vista» (Task 15): false di default, true SOLO
 *  se il valore booleano `true` è esplicitamente presente. */
export function pareteIntroVista(navPreferences: unknown): boolean {
  return !!(
    navPreferences &&
    typeof navPreferences === 'object' &&
    (navPreferences as Record<string, unknown>).parete_intro_vista === true
  )
}
