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
 *  📌 Nota di portata, misurata invece che supposta: attraverso **questa** rotta
 *  «Laboratorio non trovato» (`:100`) è di fatto irraggiungibile — il lab-guard
 *  ha già letto `lab.stato` dall'embed LEFT su `laboratori`
 *  (`lab-context.ts:24`), quindi se la richiesta è passata la riga esiste. Ci si
 *  arriva solo per una corsa fra le due letture. I cammini che cambiano davvero
 *  faccia all'utente sono TRE.
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
