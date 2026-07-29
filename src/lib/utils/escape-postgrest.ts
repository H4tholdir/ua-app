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

/**
 * Rende LETTERALE un termine digitato dall'utente prima di incorniciarlo in un
 * pattern `%…%` per `ilike`. Complementare a `pgrestQuote`, non alternativa:
 * `pgrestQuote` difende la SINTASSI del filtro PostgREST (virgole, parentesi,
 * due punti), questa difende la SEMANTICA del pattern SQL.
 *
 * 🛑 ORDINE D'USO, e non è opinabile (D48):
 *   `ilikeLiterale(termine)` → guardia sul vuoto → cornice `%…%` → `pgrestQuote`
 * `pgrestQuote` va per ULTIMO perché è lui che raddoppia le barre di cui il
 * parser di PostgREST, dentro i doppi apici, ne mangia una: perché a SQL arrivi
 * `\%` deve viaggiare `\\%`. Nell'ordine inverso si escaperebbe la cornice e
 * **si cercherebbe un'altra stringa**.
 *
 * I quattro metacaratteri, e perché sono quattro:
 *   · `%` e `_` — i jolly di LIKE/ILIKE. Senza escape, `q='%'` restituisce
 *     l'anagrafica intera (provato: 911 righe su 911).
 *   · `\` — per Postgres è il carattere di escape DENTRO ILIKE: lasciato
 *     grezzo viene consumato per spegnere il carattere seguente e sparisce dal
 *     confronto, mentre nel dato resta (lezione già pagata, commit `068fc2f0`).
 *   · `*` — 🛑 NON è escapabile e quindi si RIMUOVE: PostgREST lo traduce in
 *     `%` sul valore **già spogliato dagli apici**, quindi `\*` diventerebbe un
 *     percento letterale, non un asterisco letterale.
 *
 * 🔑 UNA SOLA PASSATA sui tre da escapare. Due `replace` separate (prima `%`,
 * poi `\`) ri-escaperebbero le barre appena introdotte: `%` diventerebbe `\\%`,
 * cioè una barra LETTERALE seguita dal jolly — il buco che si stava chiudendo.
 *
 * ⚠️ Questa funzione può restituire la STRINGA VUOTA (`ilikeLiterale('*')`), e
 * chi la usa DEVE fermarsi lì: `%%` come pattern significa «tutto».
 *
 * 🛑 NON USARLA IN `trovaOccupanteCodice` (`src/lib/domain/codice-paziente-unicita.ts`),
 * che raddoppia il backslash a mano e lascia `%` e `_` LIBERI. Non è una
 * distrazione: è la seconda delle due sole occorrenze in casa di questa classe
 * di escape, ed è diversa APPOSTA.
 *   · Qui l'ilike È il cancello: il pattern decide che cosa l'utente vede, e un
 *     jolly lasciato acceso apre l'anagrafica intera. Si stringe tutto.
 *   · Là l'ilike è solo un PRE-FILTRO di banda, e il cancello vero è il
 *     confronto esatto che segue. Un pattern più stretto potrebbe FAR SPARIRE
 *     un candidato — cioè rispondere «codice libero» su un codice OCCUPATO,
 *     che è esattamente la classe di difetto che quella funzione esiste per
 *     chiudere. Là un metacarattere può solo ALLARGARE, mai stringere; il
 *     backslash è l'eccezione perché non allarga: CANCELLA.
 * ➡️ Unificare le due è la mossa che sembra ovvia e che rompe l'unicità del
 * codice paziente in silenzio. Se un giorno la seconda dovrà usare questa
 * funzione, prima si sposta il cancello, non l'escape.
 */
export function ilikeLiterale(value: string): string {
  return value.replace(/\*/g, '').replace(/([\\%_])/g, '\\$1')
}
