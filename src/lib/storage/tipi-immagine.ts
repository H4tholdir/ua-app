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
 * 🟡 SI SA CHE `image/heic` È DISALLINEATO COL BUCKET, ed è la **voce 16** di
 *    roadmap, non una svista: `allowed_mime_types` del bucket `documenti` non
 *    lo contiene (misurato), quindi un HEIC supera questo controllo e viene
 *    rifiutato dopo, dal magazzino, con una frase generica. È il formato
 *    predefinito della fotocamera iPhone. ⚠️ La strada coerente con D237 è
 *    **accettarlo nel bucket**, non convertirlo nel browser — ma la prova su un
 *    iPhone vero viene prima del rimedio, ed è la prova che manca.
 */
export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'application/pdf': 'pdf',
}

/** I tipi, detti come li direbbe una persona: per la frase del 415. */
export const TIPI_AMMESSI_ETICHETTA = 'JPG, PNG, WEBP, GIF, HEIC o PDF'
