'use client'

/**
 * Il caricamento diretto, dal lato del browser: chiedi il permesso → manda i
 * byte al magazzino → dillo al server.
 *
 * 🔑 PERCHÉ TRE PASSI E NON UNO. Un file che passa dalla funzione trova il
 *    tetto della piattaforma (~4,2 MB misurati in produzione, non comprabili su
 *    alcun piano). Qui i byte non passano di lì: vanno dritti al magazzino, che
 *    ne accetta 50 MB.
 *
 * 🔑 PERCHÉ L'XHR E NON `uploadToSignedUrl` DELLA LIBRERIA: serve
 *    l'AVANZAMENTO. Con file fino a 50 MB su rete mobile, una schermata che
 *    non dice a che punto è sembra bloccata — e chi non sa se sta succedendo
 *    qualcosa riprova, cioè carica due volte. `fetch` non espone il progresso
 *    del caricamento; `XMLHttpRequest.upload.onprogress` sì, ed è lo stesso
 *    meccanismo già in casa nella scheda.
 *
 * 🔒 La forma dell'indirizzo e il suo comportamento sono MISURATI, non dedotti
 *    (sonda del 05/08/2026):
 *      PUT …/storage/v1/object/upload/sign/<bucket>/<percorso>?token=<gettone>
 *        → 200, e il file risulta col peso e col tipo giusti
 *      stesso gettone su un ALTRO percorso → 400 «InvalidSignature»
 *      senza gettone                        → 400 «must have required property 'token'»
 */

import type { LavoroImmagine } from '@/types/domain'
import type { CategoriaFoto } from '@/lib/domain/categorie-foto'

const BUCKET = 'documenti'

/** Quello che il server ci ha concesso. */
interface Permesso {
  percorso: string
  gettone: string
}

/** L'errore che si può mostrare a chi sta caricando: porta già la frase del
 *  server quando c'è, invece di una generica. */
export class ErroreCaricamento extends Error {
  readonly stato: number | null
  constructor(messaggio: string, stato: number | null = null) {
    super(messaggio)
    this.name = 'ErroreCaricamento'
    this.stato = stato
  }
}

/** Legge `{error}` dalla risposta senza esplodere se non è JSON — un 502 di un
 *  proxy non lo è, e in quel caso la frase generica è meglio di un errore di
 *  lettura che nasconde il vero. */
async function fraseDelServer(res: Response, ripiego: string): Promise<string> {
  try {
    const corpo = (await res.json()) as { error?: unknown } | null
    return typeof corpo?.error === 'string' && corpo.error ? corpo.error : ripiego
  } catch {
    return ripiego
  }
}

async function chiediPermesso(
  lavoroId: string,
  file: File,
  categoria: CategoriaFoto,
): Promise<Permesso> {
  const res = await fetch(`/api/lavori/${lavoroId}/immagini/firma`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: file.type, categoria, byte: file.size }),
  })
  if (!res.ok) {
    throw new ErroreCaricamento(
      await fraseDelServer(res, 'Non è stato possibile avviare il caricamento.'),
      res.status,
    )
  }
  const dati = (await res.json()) as { percorso?: unknown; gettone?: unknown }
  if (typeof dati.percorso !== 'string' || typeof dati.gettone !== 'string') {
    throw new ErroreCaricamento('Risposta del server non valida.')
  }
  return { percorso: dati.percorso, gettone: dati.gettone }
}

function mandaIByte(
  permesso: Permesso,
  file: File,
  onProgress?: (percento: number) => void,
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return Promise.reject(new ErroreCaricamento('Magazzino non configurato.'))

  const url =
    `${base}/storage/v1/object/upload/sign/${BUCKET}/${permesso.percorso}` +
    `?token=${encodeURIComponent(permesso.gettone)}`

  return new Promise<void>((risolvi, rifiuta) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !onProgress) return
      // Si ferma a 99: il 100 lo dice la conferma, non il caricamento. Chi
      // vede 100% e poi aspetta ancora pensa che si sia bloccato.
      onProgress(Math.min(Math.round((e.loaded / e.total) * 100), 99))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return risolvi()
      rifiuta(new ErroreCaricamento('Il caricamento non è riuscito.', xhr.status))
    }
    xhr.onerror = () => rifiuta(new ErroreCaricamento('Errore di rete durante il caricamento.'))
    xhr.onabort = () => rifiuta(new ErroreCaricamento('Caricamento annullato.'))
    xhr.open('PUT', url)
    xhr.setRequestHeader('content-type', file.type)
    // 🛑 Esplicito: un permesso non si riusa (misurato: «The resource already
    //    exists»), e un upsert acceso trasformerebbe un doppio invio in una
    //    sovrascrittura silenziosa.
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.send(file)
  })
}

async function conferma(
  lavoroId: string,
  percorso: string,
  categoria: CategoriaFoto,
  nomeFile: string | null,
): Promise<LavoroImmagine> {
  const res = await fetch(`/api/lavori/${lavoroId}/immagini/conferma`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ percorso, categoria, nome_file: nomeFile }),
  })
  if (!res.ok) {
    throw new ErroreCaricamento(
      await fraseDelServer(res, 'Il file è stato caricato ma non salvato. Riprova.'),
      res.status,
    )
  }
  const dati = (await res.json()) as { immagine?: LavoroImmagine }
  if (!dati.immagine) throw new ErroreCaricamento('Risposta del server non valida.')
  return dati.immagine
}

/**
 * Carica un file e restituisce la riga scritta dal server.
 *
 * ⚠️ Se il terzo passo non arriva (rete persa, scheda chiusa, ascensore) il
 *    file resta nel magazzino **senza riga**. È una finestra che esiste per
 *    costruzione, e la chiude il mietitore degli orfani (T6) — non un
 *    ritentativo qui, che raddoppierebbe i byte già spesi.
 */
export async function caricaImmagineDiretta(opts: {
  lavoroId: string
  file: File
  categoria: CategoriaFoto
  onProgress?: (percento: number) => void
}): Promise<LavoroImmagine> {
  const { lavoroId, file, categoria, onProgress } = opts
  const permesso = await chiediPermesso(lavoroId, file, categoria)
  await mandaIByte(permesso, file, onProgress)
  return conferma(lavoroId, permesso.percorso, categoria, file.name || null)
}
