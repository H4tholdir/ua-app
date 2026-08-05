// `src/lib/storage/compressione-immagine.ts` — il normalizzatore di formato.
//
// 🔴 NASCE DA DUE DIFETTI VIVI IN PRODUZIONE (handoff 05/08 §0②), non da un
//    abbellimento:
//    (a) si comprimeva in **WebP**, che per specifica NON PUÒ avere il colore
//        pieno (RFC 6386: VP8 lavora solo in YUV 4:2:0) — ed è proprio il colore
//        a portare il tratto di una penna blu. D237 conseguenza ②: si passa a
//        JPEG.
//    (b) su **Safari/iPhone** quella conversione non avveniva affatto: il canvas
//        non ha mai saputo scrivere WebP e **non dà errore** — restituisce un
//        PNG (MDN, spec di `toBlob`). La libreria in casa passa il tipo
//        richiesto e **non controlla mai** cosa ha ricevuto indietro
//        (verificato in `node_modules/browser-image-compression@2.0.2`), e per
//        rientrare nel suo tetto di 0,4MB continua a **tagliare risoluzione**.
//
// ⚠️ QUESTE PROVE NON GIRANO UN CODEC. jsdom non ha canvas: la libreria è
//    sostituita da un doppio che restituisce ciò che il caso vuole provare.
//    Ciò che qui si prova è **come reagiamo a quello che la libreria ci
//    restituisce** — che è esattamente il punto in cui il difetto (b) è
//    passato. La prova che manca resta quella su un **iPhone vero**, ed è
//    dichiarata tale nel piano e nell'handoff.
//
// Forme d'ingresso enumerate PRIMA delle asserzioni (R-P4): un JPEG · un PNG ·
// un HEIC · un PDF · un file senza tipo · la libreria che restituisce il tipo
// giusto · la libreria che restituisce un tipo DIVERSO da quello chiesto · la
// libreria che restituisce qualcosa di più pesante dell'originale · la libreria
// che lancia un errore.

import { describe, it, expect, vi } from 'vitest'
import {
  FORMATO_COMPRESSIONE,
  OPZIONI_COMPRESSIONE,
  comprimiSePossibile,
} from '@/lib/storage/compressione-immagine'

/** Un File di peso dichiarato: `new File([...])` in jsdom pesa quanto il suo
 *  contenuto, e allocare 6MB per ogni prova è tempo buttato. */
function fileDaByte(nome: string, tipo: string, byte: number): File {
  const f = new File(['x'], nome, { type: tipo })
  Object.defineProperty(f, 'size', { value: byte, configurable: true })
  return f
}

const MB = 1024 * 1024

describe('compressione-immagine — il formato è JPEG, e non si finge mai', () => {
  describe('le opzioni', () => {
    it('chiede JPEG, MAI WebP: WebP con perdita non può avere il colore pieno (D237②)', () => {
      expect(FORMATO_COMPRESSIONE).toBe('image/jpeg')
      expect(OPZIONI_COMPRESSIONE.fileType).toBe('image/jpeg')
      expect(JSON.stringify(OPZIONI_COMPRESSIONE)).not.toContain('webp')
    })

    it('chiede di conservare i metadati: data di scatto e orientamento non si buttano', () => {
      // La libreria li conserva SOLO se il file di partenza è JPEG e il tipo
      // richiesto è lo stesso (verificato nel suo sorgente: `preserveExif &&
      // "image/jpeg" === e.type && (!o.fileType || o.fileType === e.type)`).
      // Col WebP di prima la condizione era falsa SEMPRE: i metadati si
      // perdevano a ogni caricamento, senza che nessuno lo chiedesse.
      expect(OPZIONI_COMPRESSIONE.preserveExif).toBe(true)
    })
  })

  describe('che cosa si comprime e che cosa no', () => {
    it('un PDF non si comprime: torna identico, e lo dice', async () => {
      const pdf = fileDaByte('referto.pdf', 'application/pdf', 6 * MB)
      const doppio = vi.fn()
      const esito = await comprimiSePossibile(pdf, doppio)

      expect(doppio).not.toHaveBeenCalled()
      expect(esito.file).toBe(pdf)
      expect(esito.esito).toBe('non-immagine')
    })

    it('un file senza tipo dichiarato non si comprime (non è detto che sia un\'immagine)', async () => {
      const ignoto = fileDaByte('scansione', '', 2 * MB)
      const doppio = vi.fn()
      const esito = await comprimiSePossibile(ignoto, doppio)

      expect(doppio).not.toHaveBeenCalled()
      expect(esito.esito).toBe('non-immagine')
    })

    it('un JPEG si comprime, e il risultato è quello che si spedisce', async () => {
      const foto = fileDaByte('impronta.jpg', 'image/jpeg', 6 * MB)
      const compressa = fileDaByte('impronta.jpg', 'image/jpeg', 380 * 1024)
      const doppio = vi.fn(async () => compressa)

      const esito = await comprimiSePossibile(foto, doppio)

      expect(doppio).toHaveBeenCalledWith(foto, OPZIONI_COMPRESSIONE)
      expect(esito.file).toBe(compressa)
      expect(esito.esito).toBe('compressa')
    })

    it('un HEIC (formato predefinito della fotocamera iPhone) passa dalla compressione: è lì che si normalizza', async () => {
      const heic = fileDaByte('IMG_0042.HEIC', 'image/heic', 4 * MB)
      const compressa = fileDaByte('IMG_0042.HEIC', 'image/jpeg', 390 * 1024)
      const doppio = vi.fn(async () => compressa)

      const esito = await comprimiSePossibile(heic, doppio)

      expect(doppio).toHaveBeenCalled()
      expect(esito.file.type).toBe('image/jpeg')
    })
  })

  describe('🛑 quando la libreria restituisce qualcosa di diverso da quel che si è chiesto', () => {
    it('tipo INATTESO e più pesante dell\'originale (il caso Safari/WebP): si tiene l\'ORIGINALE e lo si dichiara', async () => {
      // Esattamente la catena del difetto (b): si chiede WebP/JPEG, torna un
      // PNG, che su una foto è molto più pesante del JPEG di partenza.
      const foto = fileDaByte('scatto.jpg', 'image/jpeg', 3 * MB)
      const png = fileDaByte('scatto.png', 'image/png', 9 * MB)
      const doppio = vi.fn(async () => png)

      const esito = await comprimiSePossibile(foto, doppio)

      expect(esito.file).toBe(foto)
      expect(esito.esito).toBe('formato-inatteso')
    })

    it('tipo INATTESO ma più leggero: si tiene il più leggero, e resta dichiarato come inatteso', async () => {
      const foto = fileDaByte('scatto.jpg', 'image/jpeg', 6 * MB)
      const png = fileDaByte('scatto.png', 'image/png', 2 * MB)
      const doppio = vi.fn(async () => png)

      const esito = await comprimiSePossibile(foto, doppio)

      expect(esito.file).toBe(png)
      expect(esito.esito).toBe('formato-inatteso')
    })

    it('tipo giusto ma risultato PIÙ PESANTE dell\'originale: si spedisce l\'originale', async () => {
      // Succede sui file già piccoli o già ottimizzati: ricomprimere aggiunge
      // peso invece di toglierlo. Mandare il più pesante dei due sarebbe
      // pagare due volte.
      const foto = fileDaByte('minuscola.jpg', 'image/jpeg', 40 * 1024)
      const gonfia = fileDaByte('minuscola.jpg', 'image/jpeg', 120 * 1024)
      const doppio = vi.fn(async () => gonfia)

      const esito = await comprimiSePossibile(foto, doppio)

      expect(esito.file).toBe(foto)
      expect(esito.esito).toBe('originale-piu-leggero')
    })

    it('la libreria LANCIA: non si perde il caricamento, si ripiega sull\'originale', async () => {
      const foto = fileDaByte('impronta.jpg', 'image/jpeg', 900 * 1024)
      const doppio = vi.fn(async () => {
        throw new Error('canvas non disponibile')
      })

      const esito = await comprimiSePossibile(foto, doppio)

      expect(esito.file).toBe(foto)
      expect(esito.esito).toBe('compressione-fallita')
    })
  })
})
