/**
 * I tipi di file che si possono allegare a un lavoro, e l'estensione con cui
 * atterrano nel magazzino.
 *
 * 🔑 VIVE IN UN POSTO SOLO da quando i corridoi sono due (T3, 05/08/2026): la
 *    rotta che riceve i byte e la rotta che firma il caricamento diretto
 *    leggono questo elenco. Due copie che si scostano vorrebbero dire un file
 *    ammesso da una strada e rifiutato dall'altra — e nessuno se ne
 *    accorgerebbe finché non capita a un utente, sul secondo dei due.
 *
 * 🔴 `image/heic` È USCITO DA QUESTA LISTA IL 05/08/2026, e non è un ripensamento
 *    di gusto: **il magazzino non lo accetta.**
 *    `provato:` i tipi ammessi dal bucket `documenti`, letti dal vivo →
 *    `["application/pdf","image/jpeg","image/png","image/webp","image/gif"]`.
 *    Finché il file passava dalla funzione, dichiararlo ammesso costava un
 *    viaggio da ≤4MB e un rifiuto tardivo. Col **caricamento diretto** costa un
 *    viaggio da **fino a 50MB su rete mobile**, che finisce con un errore dello
 *    Storage che non è nemmeno JSON.
 *    🛑 E cade sulla superficie peggiore: la **prescrizione non si comprime**
 *    (D237), quindi il file dell'iPhone arriva com'è — HEIC. Con la lista
 *    allineata, quel rifiuto arriva **subito**, alla scelta del file, con la
 *    frase che dice quali formati usare.
 *    ➡️ **Questa è la toppa, non la decisione.** La scelta vera della voce 16 —
 *    aggiungere `image/heic` ai tipi del bucket, oppure rifiutarlo al selettore
 *    — resta a Francesco e viene **dopo la prova su un iPhone vero**. Il giorno
 *    in cui il bucket lo accetterà, questa riga torna: la guardia
 *    `scripts/guardia-tipi-bucket.mjs` verifica che le due liste combacino, in
 *    entrambe le direzioni.
 */
export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
}

/** I tipi, detti come li direbbe una persona: per la frase del 415. */
export const TIPI_AMMESSI_ETICHETTA = 'JPG, PNG, WEBP, GIF o PDF'
