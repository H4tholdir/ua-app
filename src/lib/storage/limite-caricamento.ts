/**
 * Il limite VERO di un caricamento, e perché non è quello che credevamo.
 *
 * 🔴 MISURATO SUL DEPLOYMENT VIVO il 05/08/2026 (check M3-T39-6, subito dopo la
 *    pubblicazione della sessione ③), interrogando `POST /api/lavori/<uuid>/immagini`
 *    su `https://uachelab.com` con corpi di taglia crescente e SENZA autenticazione —
 *    il taglio della piattaforma avviene prima dell'handler, quindi la risposta
 *    discrimina da sola: `401` = il corpo è arrivato all'app, `413` = tagliato prima.
 *
 *      4,10 MB → 401  (arriva)
 *      4,30 MB → 413  «Request Entity Too Large  FUNCTION_PAYLOAD_TOO_LARGE»
 *      5,00 MB → 413
 *
 * 🛑 Il codice dichiarava **20MB** e la frase all'utente diceva «più grande di
 *    20MB». Erano ENTRAMBI falsi: nessun file sopra ~4,2MB è mai arrivato
 *    all'applicazione, e chi caricava una foto da 6MB — misura ordinaria per un
 *    telefono di oggi — leggeva che il suo file superava i 20MB. Un messaggio che
 *    mente manda l'utente in un ciclo chiuso: guarda il file, vede 6MB, non
 *    capisce, riprova con lo stesso file.
 *
 * 🔑 Perché 4MB e non 4,2: il limite della piattaforma è sul CORPO INTERO della
 *    richiesta, non sul file. Un `multipart/form-data` porta con sé i confini,
 *    le intestazioni di parte e gli altri campi (`categoria`), e il nome del file
 *    ne allunga uno: la soglia utile scivola di qualche decina di KB a seconda del
 *    nome. 4MB tondi stanno sotto quel margine con un po' d'aria, e sono un numero
 *    che si può dire a voce.
 *
 * ⚠️ Questo NON è il modo giusto di risolverlo, è il modo onesto di dirlo. La cura
 *    vera è non far passare il file dalla funzione: un caricamento firmato diretto
 *    allo storage aggira del tutto il limite e regge le foto grandi. Voce di
 *    roadmap dedicata — qui si chiude solo la bugia.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** «4MB» — una volta sola, così la frase all'utente non può divergere dal numero
 *  che il server applica. È esattamente il modo in cui la coppia precedente
 *  (20MB nel controllo, «20MB» nella frase) è rimasta d'accordo con se stessa
 *  mentendo a entrambe le estremità. */
export const MAX_UPLOAD_ETICHETTA = '4MB'

/** Quanto pesa, detto come lo direbbe una persona: «6,3 MB», «820 KB». */
export function pesoLeggibile(byte: number): string {
  if (byte >= 1024 * 1024) {
    // Una cifra decimale: «6,3 MB» dice abbastanza, «6,28 MB» dice troppo.
    return `${(byte / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  }
  return `${Math.max(1, Math.round(byte / 1024))} KB`
}

/**
 * Il controllo PRIMA di partire: se il file è troppo grande restituisce la frase
 * da mostrare, altrimenti `null`.
 *
 * 🔑 Perché lato client e non solo sul server: oltre ~4,2MB la richiesta non
 *    arriva nemmeno all'applicazione — la piattaforma la taglia e risponde un
 *    `413` grezzo. Aspettare quel viaggio significa far caricare all'utente
 *    (su rete mobile, per decine di secondi) qualcosa che è già condannato in
 *    partenza. Qui si sa subito, senza spendere un byte.
 *
 * 🔑 La frase dice il peso VERO del file, non solo il limite: «questa pesa
 *    6,3 MB» è verificabile da chi legge — apre la galleria e ritrova quel
 *    numero — mentre «è troppo grande» lo lascia a indovinare quanto.
 */
export function troppoGrande(file: { size: number }): string | null {
  if (file.size <= MAX_UPLOAD_BYTES) return null
  return `Questa immagine pesa ${pesoLeggibile(file.size)} e il massimo è ${MAX_UPLOAD_ETICHETTA}: scattala di nuovo più da vicino, o scegline una più leggera.`
}
