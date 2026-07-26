// Il ritardo del filtro delle ricerche client-side del DS v3 (riserva FE R4, ratifica 22/07
// «filtra e risali»): l'input resta controllato ISTANTANEO, il filtro/riordino segue con questo
// respiro — un FLIP per keystroke su decine di celle è il punto esatto dove WebKit peggiora.
//
// Vive QUI, in un modulo foglia, e non nel componente che per primo ne aveva bisogno (review
// finale whole-branch): `PareteClient` e `CassettaSheet` — la parete e la lista «Metti un
// lavoro» — sono due gemelli che devono avere lo STESSO ritardo, ma `PareteClient` importa
// `CassettaSheet`, quindi tenere la costante nel primo e leggerla dal secondo chiudeva un
// CICLO di import. Reggeva solo perché il valore veniva letto pigramente, dentro un
// `useEffect`: il primo uso a livello di modulo (una costante derivata, un valore di default)
// sarebbe diventato un `ReferenceError` in fase di import — e quale dei due moduli ne fa le
// spese dipende dall'ordine in cui il bundler risolve il ciclo, cioè un errore che compare in
// produzione e non in un test unitario che importa un solo file. Un modulo foglia, che non
// importa nessuno dei due, toglie il ciclo invece di conviverci.
export const DEBOUNCE_FILTRO_MS = 180
