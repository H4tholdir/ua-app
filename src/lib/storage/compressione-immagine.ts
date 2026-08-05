/**
 * La compressione delle foto di lavorazione — e il controllo di ciò che torna
 * indietro, che è la parte che mancava.
 *
 * ⚖️ D237 (05/08/2026): **le impronte si comprimono, la prescrizione no.**
 *    Questo modulo serve le impronte — materiale clinico di lavoro. Il costo
 *    vero che ripaga la compressione non è lo spazio: è il **tempo di
 *    caricamento** sul wifi del laboratorio o in 4G.
 *
 * 🛑 PERCHÉ NON PIÙ WEBP. Fino al 05/08/2026 si comprimeva in `image/webp`.
 *    WebP con perdita è **obbligato** al colore dimezzato: non è
 *    un'impostazione, è nella specifica del codec sottostante (RFC 6386, «*VP8
 *    works exclusively with an 8-bit YUV 4:2:0 image format*»; confermato da
 *    FAQ Google e MDN). E il colore dimezzato è proprio ciò che danneggia di
 *    più il **tratto colorato** — misurato: blu a qualità 75 col colore pieno
 *    è 3,4× più leggero E più fedele del blu a qualità 95 col colore dimezzato
 *    (`docs/roadmap/2026-08-05-ricerca-compressione-senza-perdita.md` §A1).
 *
 * 🛑 E PERCHÉ IL CONTROLLO SUL RITORNO NON È PARANOIA. Su **Safari, né su Mac
 *    né su iPhone**, il canvas non ha mai saputo scrivere WebP — e il
 *    fallimento **non dà errore**: la specifica di `toBlob` dice che se il
 *    formato non è supportato «*i dati saranno esportati come `image/png`*»
 *    (MDN). La libreria in casa (`browser-image-compression` 2.0.2) passa il
 *    tipo richiesto e **non verifica mai** che tipo abbia ricevuto indietro
 *    (letto nel suo sorgente). Su iPhone si otteneva quindi un **PNG**, che su
 *    una foto pesa molto più del JPEG di partenza; e per rientrare nel tetto
 *    di 0,4MB la libreria continuava a **tagliare risoluzione** — l'unica cosa
 *    che non abbiamo da regalare.
 *    ⚠️ **Non ancora misurato su un iPhone vero**: è la prova che manca, ed è
 *    dichiarata tale nel piano. Il meccanismo però è certo — sta nella
 *    specifica del browser e nel sorgente della libreria, non in un'inferenza.
 *
 * 🔑 La regola che ne esce: **non si finge**. Si guarda cosa è tornato, e se
 *    non è ciò che si è chiesto si spedisce il più leggero fra i due dicendolo,
 *    invece di far finta che la conversione sia avvenuta.
 */
import imageCompression from 'browser-image-compression'

/** JPEG, non WebP — v. il blocco qui sopra. */
export const FORMATO_COMPRESSIONE = 'image/jpeg'

/**
 * 📌 `maxSizeMB: 0.4` resta quello di prima **di proposito**: finché il file
 *    passa dalla funzione, il corridoio taglia a ~4,2MB (`limite-caricamento
 *    .ts`) e alzarlo qui avvicinerebbe il tetto senza guadagno. Si alza col
 *    caricamento diretto (T5 del piano), dove il tetto diventa quello del
 *    magazzino: 50MB.
 *
 * 📌 `preserveExif` conserva data di scatto e orientamento. La libreria lo
 *    onora **solo** se il file di partenza è JPEG e il tipo richiesto è lo
 *    stesso (`preserveExif && "image/jpeg" === e.type && (!o.fileType ||
 *    o.fileType === e.type)`, letto nel suo sorgente): col WebP di prima la
 *    condizione era falsa **sempre**, e i metadati si perdevano a ogni
 *    caricamento senza che nessuno l'avesse chiesto.
 */
export const OPZIONI_COMPRESSIONE = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: FORMATO_COMPRESSIONE,
  initialQuality: 0.85,
  preserveExif: true,
} as const

/** Come è andata: si dichiara sempre, anche quando è andata bene. */
export type EsitoCompressione =
  /** Il file è stato compresso come richiesto. */
  | 'compressa'
  /** Non è un'immagine (un PDF, o un file senza tipo): non si tocca. */
  | 'non-immagine'
  /** La libreria ha restituito un formato DIVERSO da quello chiesto. */
  | 'formato-inatteso'
  /** Comprimere ha aggiunto peso invece di toglierne: si spedisce l'originale. */
  | 'originale-piu-leggero'
  /** La compressione è fallita: si spedisce l'originale, non si perde il file. */
  | 'compressione-fallita'

export interface RisultatoCompressione {
  /** Il file da spedire davvero. */
  file: File
  esito: EsitoCompressione
}

type Compressore = (file: File, opzioni: typeof OPZIONI_COMPRESSIONE) => Promise<File>

/**
 * Comprime un'immagine, e **guarda cosa è tornato**.
 *
 * Il secondo parametro esiste per le prove: jsdom non ha un canvas, quindi la
 * libreria vera lì non può girare. Non è un punto di estensione.
 */
export async function comprimiSePossibile(
  file: File,
  comprimi: Compressore = imageCompression as unknown as Compressore,
): Promise<RisultatoCompressione> {
  // Un PDF non si comprime in nessun caso (D237), e un file senza tipo
  // dichiarato non si può presumere immagine.
  if (!file.type.startsWith('image/')) {
    return { file, esito: 'non-immagine' }
  }

  let compressa: File
  try {
    compressa = await comprimi(file, OPZIONI_COMPRESSIONE)
  } catch {
    // Ripiegare sull'originale è meglio che perdere il caricamento: se sta
    // sotto il limite passa lo stesso, e se non ci sta lo dirà il controllo di
    // peso, con la frase giusta.
    return { file, esito: 'compressione-fallita' }
  }

  // 🛑 Qui sta il difetto che era passato: si CONTROLLA il tipo ricevuto.
  if (compressa.type !== FORMATO_COMPRESSIONE) {
    return {
      file: compressa.size < file.size ? compressa : file,
      esito: 'formato-inatteso',
    }
  }

  if (compressa.size >= file.size) {
    return { file, esito: 'originale-piu-leggero' }
  }

  return { file: compressa, esito: 'compressa' }
}
