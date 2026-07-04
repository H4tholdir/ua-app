/**
 * Racchiude un valore utente tra doppi apici per un uso sicuro dentro un
 * filtro `.or()`/`.and()` di PostgREST. PostgREST tratta `, . : ( )` come
 * caratteri strutturali della sintassi del filtro (separatore condizioni,
 * operatore colonna/op/valore, raggruppamento) — un valore che li contiene
 * romperebbe il parsing invece di essere trattato come testo letterale.
 * Il meccanismo ufficiale PostgREST per un valore letterale con caratteri
 * riservati è racchiuderlo tra doppi apici, con backslash/apici interni
 * escapati (stesse regole di escaping di una stringa JSON).
 */
export function pgrestQuote(value: string): string {
  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"${escaped}"`
}
