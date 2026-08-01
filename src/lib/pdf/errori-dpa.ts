// src/lib/pdf/errori-dpa.ts

/** Un guasto che NON è del servizio.
 *
 *  🔑 La distinzione che questa classe porta, e perché è nata. `generateDpa()`
 *  solleva UNDICI errori diversi —
 *  `provato:` `grep -n "throw new" src/lib/pdf/generate-dpa.ts` → 11 righe.
 *  **SETTE** sono guasti del servizio (`:106` lettura fallita · `:159` registro
 *  non leggibile · `:182` archivio non raggiungibile · `:206` orfana non
 *  archiviata · `:231` numero non assegnato · `:281` PDF non conservato ·
 *  `:384` riga non scritta): per quelli il 500 è la verità, e resta un `Error`
 *  nudo. **QUATTRO** no: due dati fiscali incompleti (`:81`, `:84`) e due «non
 *  trovato» (`:115`, `:116`) — e sono questi quattro a sollevare questa classe.
 *
 *  🛑 Su quei quattro il 500 affermava una cosa FALSA — che è UÀ a essere rotta —
 *  mentre la richiesta punta a un dato che non c'è o non basta. E il caso vivo
 *  non è teorico: `generate-dpa.ts:93` filtra il cliente anche per
 *  `laboratorio_id`, quindi un collegamento vecchio, un cliente cancellato o
 *  l'id di un ALTRO laboratorio finiscono tutti su «Cliente non trovato».
 *
 *  ⚠️ Perché lo stato vive all'ORIGINE e non nella rotta: l'unica alternativa
 *  sarebbe una mappa dal TESTO del messaggio allo stato HTTP — undici voci
 *  copiate a mano dalla prosa di `generate-dpa.ts`, senza NESSUN aggancio che
 *  il compilatore veda, che si romperebbe in silenzio alla prima riscrittura di
 *  un messaggio. Qui lo stato viaggia insieme all'errore, e chi aggiunge un
 *  `throw` deve scegliere di proposito da che parte sta.
 *
 *  🛑 Ciò che NON è una ragione, e va detto perché era scritto in tre posti:
 *  «un 4xx nessuna sorveglianza lo conta come errore». In questo repo una
 *  sorveglianza NON C'È — `provato:`
 *  `grep -rniE "sentry|captureException" src package.json` → nessuna riga, e
 *  `vercel.json` è `{"regions":["dub1"]}` e basta. Quell'argomento è RITIRATO.
 *  La ragione buona è un'altra, e non ha bisogno di sistemi che non esistono:
 *  lo stato HTTP è un'affermazione su CHI ha sbagliato, e su questi quattro
 *  cammini era falsa.
 *
 *  📌 Nota di portata — e va detta con la distinzione che questo file predica.
 *  `provato:` `pg_constraint`, `contype = 'f'` su `public.utenti` (sola lettura)
 *    → `utenti_laboratorio_id_fkey FOREIGN KEY (laboratorio_id) REFERENCES laboratori(id)`
 *  `ragionato:` da lì — se `context.laboratorioId` non è nullo, quella chiave
 *  esterna **garantisce** che la riga di `laboratori` esista (e non ammette
 *  nemmeno di cancellarla mentre qualcuno la punta: nessun `ON DELETE`). Quindi
 *  attraverso **questa** rotta «Laboratorio non trovato» (`:115`) non si
 *  raggiunge, e i cammini che cambiano davvero faccia all'utente sono **TRE**.
 *
 *  🛑 NON lo garantisce il lab-guard, ed è la ragione sbagliata che era scritta
 *  qui: `lab-guard.ts:50` esce con `null` per `admin_sistema` **prima** di
 *  leggere `ctx.lab` (`:51`), quindi per quel ruolo il guard il laboratorio non
 *  lo guarda affatto — un contesto `admin_sistema` con `laboratorioId`
 *  valorizzato e `lab: null` passerebbe il guard intero. È la chiave esterna a
 *  fermarlo, non il guard. 🔑 Ed è lo stesso difetto che questo lavoro è venuto
 *  a chiudere: un commento che si dichiarava «misurato» per una cosa dedotta.
 *  ⚠️ Lo stato si fissa comunque, perché quella garanzia è del CHIAMANTE e non
 *  di questa funzione: `generateDpa` non è della sola rotta DPA, e domani può
 *  essere chiamata da dove quella chiave esterna non dice niente.
 */
export class ErroreDatiDpa extends Error {
  /** 404 = il dato a cui la richiesta punta non c'è.
   *  422 = il dato c'è ma non basta per emettere (Partita IVA / Codice Fiscale
   *  mancanti): la richiesta è ben formata, il documento no. */
  readonly stato: 404 | 422

  constructor(message: string, stato: 404 | 422) {
    super(message)
    this.name = 'ErroreDatiDpa'
    this.stato = stato
  }
}
