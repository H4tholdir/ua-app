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
 * 🛑 IL LIMITE NON È NOSTRO, E NON SI COMPRA. È il tetto sul corpo di una funzione
 *    Vercel: **4,5 MB**, dichiarato in `vercel.com/docs/functions/limitations`
 *    («*the maximum payload size for the request body … is 4.5 MB*»), **uguale su
 *    Hobby, Pro ed Enterprise** — cambiano memoria, durata e concorrenza, non
 *    questo. Non esiste un'impostazione da alzare, né in `vercel.json` né nel
 *    pannello: passare a un piano superiore non sposta di un byte.
 *
 * 🔑 E il collo di bottiglia è SOLO il corridoio, non il magazzino: il bucket
 *    `documenti` accetta già **50 MB** per file (misurato:
 *    `SELECT file_size_limit FROM storage.buckets WHERE id='documenti'` → 52428800).
 *    È il passaggio dalla funzione a stringere, non la destinazione.
 *
 * ⚠️ Questo NON è il modo giusto di risolverlo, è il modo onesto di dirlo. La cura
 *    vera è non far passare il file dalla funzione: un caricamento firmato diretto
 *    allo storage (`createSignedUploadUrl`, che la libreria in casa già offre)
 *    aggira del tutto il tetto e arriva ai 50 MB che il magazzino già concede —
 *    è anche ciò che Vercel stessa raccomanda. Voce **15** di roadmap: qui si
 *    chiude solo la bugia.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

/** «4MB» — una volta sola, così la frase all'utente non può divergere dal numero
 *  che il server applica. È esattamente il modo in cui la coppia precedente
 *  (20MB nel controllo, «20MB» nella frase) è rimasta d'accordo con se stessa
 *  mentendo a entrambe le estremità. */
export const MAX_UPLOAD_ETICHETTA = '4MB'

/**
 * ═══ IL SECONDO TETTO — il corridoio diretto (T3, 05/08/2026) ═══════════════
 *
 * 🛑 I TETTI RESTANO DUE, E NON DIVENTERANNO MAI UNO. Sono due corridoi con due
 *    vincoli diversi: il file che passa dalla funzione trova il tetto della
 *    piattaforma (~4,2 MB, non comprabile); il file che va **dritto al
 *    magazzino** trova solo il tetto del bucket. Un numero solo per due
 *    corridoi diversi tornerebbe a mentire su uno dei due — che è esattamente
 *    il difetto del 05/08 (20 MB dichiarati contro 4,2 veri), e non si ripete.
 *
 * 📌 `provato:` `SELECT file_size_limit FROM storage.buckets WHERE id='documenti'`
 *    → **52428800** (50 MiB). Il numero qui sotto è QUELLO, non uno più
 *    generoso: se il nostro controllo fosse più largo del bucket, il rifiuto
 *    arriverebbe alla fine di un caricamento da decine di MB su rete mobile —
 *    cioè nel momento peggiore possibile.
 */
export const MAX_UPLOAD_DIRETTO_BYTES = 50 * 1024 * 1024

/** «50MB» — stessa coppia numero/parola dell'altro corridoio, stessa ragione. */
export const MAX_UPLOAD_DIRETTO_ETICHETTA = '50MB'

/** Quanto pesa, detto come lo direbbe una persona: «6,3 MB», «820 KB». */
export function pesoLeggibile(byte: number): string {
  if (byte >= 1024 * 1024) {
    // Una cifra decimale: «6,3 MB» dice abbastanza, «6,28 MB» dice troppo.
    return `${(byte / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
  }
  return `${Math.max(1, Math.round(byte / 1024))} KB`
}

/**
 * Che cosa ha allegato l'utente, per il solo scopo di sceglierne il NOME nella
 * frase. 🛑 Non cambia la soglia — quella è una sola, ed è della piattaforma.
 *
 * 🔑 Perché serve: il terzo percorso di caricamento (la scheda del lavoro,
 *    `TabImmagini`) accetta anche i PDF, che per D237 non si comprimono mai.
 *    Dire «questa IMMAGINE pesa…» e «scattala di nuovo più da vicino» a chi ha
 *    allegato un modulo scansionato è un consiglio impossibile da eseguire: non
 *    c'è niente da riscattare, e chi legge resta senza una mossa da fare.
 */
export type NaturaFile = 'immagine' | 'documento'

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
export function troppoGrande(
  file: { size: number },
  opzioni?: { natura?: NaturaFile },
): string | null {
  if (file.size <= MAX_UPLOAD_BYTES) return null
  const peso = `${pesoLeggibile(file.size)} e il massimo è ${MAX_UPLOAD_ETICHETTA}`
  if (opzioni?.natura === 'documento') {
    return `Questo documento pesa ${peso}: allegane uno più leggero.`
  }
  return `Questa immagine pesa ${peso}: scattala di nuovo più da vicino, o scegline una più leggera.`
}
