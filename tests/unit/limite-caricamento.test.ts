import { describe, it, expect } from 'vitest'
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_DIRETTO_BYTES,
  MAX_UPLOAD_DIRETTO_ETICHETTA,
  MAX_UPLOAD_ETICHETTA,
  pesoLeggibile,
  troppoGrande,
} from '@/lib/storage/limite-caricamento'

// M3-T39-6 — chiuso il 05/08/2026 MISURANDO sul deployment vivo, non deducendo.
// Il codice diceva 20MB e la frase all'utente diceva «più grande di 20MB»: erano
// d'accordo fra loro e sbagliate entrambe, perché la piattaforma taglia a ~4,2MB
// prima ancora di arrivare all'applicazione (401 a 4,10MB · 413 a 4,30MB).
// Chi caricava una foto da 6MB — misura ordinaria per un telefono di oggi —
// leggeva che il suo file superava i 20MB, e riprovava con lo stesso file.

describe('il limite di caricamento (M3-T39-6)', () => {
  it('sta SOTTO la soglia misurata della piattaforma (~4,2MB), con margine', () => {
    // Il limite della piattaforma è sul CORPO INTERO, non sul file: il multipart
    // aggiunge confini, intestazioni di parte e il campo `categoria`. Se questa
    // asserzione cade, un file «ammesso» dal nostro controllo verrebbe comunque
    // tagliato prima di arrivare — cioè si tornerebbe a mentire, solo più vicino.
    expect(MAX_UPLOAD_BYTES).toBeLessThan(4.2 * 1024 * 1024)
    expect(MAX_UPLOAD_BYTES).toBe(4 * 1024 * 1024)
  })

  it("l'etichetta mostrata combacia col numero applicato — mai due verità", () => {
    expect(MAX_UPLOAD_ETICHETTA).toBe('4MB')
    expect(`${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`).toBe(MAX_UPLOAD_ETICHETTA)
  })

  it('un file al limite esatto passa: il confronto è «maggiore di», non «maggiore o uguale»', () => {
    expect(troppoGrande({ size: MAX_UPLOAD_BYTES })).toBeNull()
    expect(troppoGrande({ size: MAX_UPLOAD_BYTES + 1 })).not.toBeNull()
  })

  it('la frase dice il peso VERO del file, che chi legge può ritrovare nella galleria', () => {
    const frase = troppoGrande({ size: 6.3 * 1024 * 1024 })
    expect(frase).toContain('6,3 MB')
    expect(frase).toContain('4MB')
    // 🛑 E non deve MAI dire il numero vecchio, che è la bugia da cui nasce tutto.
    expect(frase).not.toContain('20MB')
  })

  it('i pesi si leggono come li direbbe una persona', () => {
    expect(pesoLeggibile(6.3 * 1024 * 1024)).toBe('6,3 MB')
    expect(pesoLeggibile(820 * 1024)).toBe('820 KB')
    // Mai «0 KB» per un file che esiste: chi lo legge penserebbe a un guasto.
    expect(pesoLeggibile(1)).toBe('1 KB')
  })

  // ══ La frase parla della cosa GIUSTA (05/08/2026) ═══════════════════════
  // Il terzo percorso di caricamento (`TabImmagini`, la scheda del lavoro)
  // accetta anche i PDF, che non si comprimono. Dire a chi allega un modulo
  // scansionato «questa IMMAGINE pesa…» e «scattala di nuovo più da vicino» è
  // un consiglio impossibile da seguire: non c'è niente da riscattare.
  describe('la frase si adatta a ciò che l\'utente ha davvero allegato', () => {
    it('per un\'immagine resta quella di prima, consiglio compreso', () => {
      const frase = troppoGrande({ size: 6.3 * 1024 * 1024 })
      expect(frase).toContain('immagine')
      expect(frase).toContain('scattala di nuovo')
    })

    it('per un documento NON dice «immagine» e NON dice «scattala di nuovo»', () => {
      const frase = troppoGrande({ size: 6.3 * 1024 * 1024 }, { natura: 'documento' })
      expect(frase).not.toBeNull()
      expect(frase).toContain('6,3 MB')
      expect(frase).toContain('4MB')
      expect(frase).not.toContain('immagine')
      expect(frase).not.toContain('scattala')
    })

    it('un documento sotto il limite passa comunque: la natura cambia la frase, mai la soglia', () => {
      expect(troppoGrande({ size: MAX_UPLOAD_BYTES }, { natura: 'documento' })).toBeNull()
      expect(troppoGrande({ size: MAX_UPLOAD_BYTES + 1 }, { natura: 'documento' })).not.toBeNull()
    })
  })

  // ══ I DUE CORRIDOI (T5) ═══════════════════════════════════════════════════
  // 🛑 I tetti sono due e non diventeranno uno: il file che passa dalla
  // funzione trova il muro della piattaforma (~4,2MB, non comprabile), quello
  // che va dritto al magazzino trova solo il tetto del bucket. Un numero solo
  // per due strade diverse è esattamente il difetto del 05/08 (20MB dichiarati
  // contro 4,2 veri), e non si ripete.
  describe('i due corridoi hanno due tetti', () => {
    const DODICI_MB = 12 * 1024 * 1024

    it('12MB: la funzione lo rifiuta, il corridoio diretto lo accetta', () => {
      expect(troppoGrande({ size: DODICI_MB })).not.toBeNull()
      expect(troppoGrande({ size: DODICI_MB }, { corridoio: 'diretto' })).toBeNull()
    })

    it('il tetto del corridoio diretto è quello VERO del bucket, misurato', () => {
      // `SELECT file_size_limit FROM storage.buckets WHERE id='documenti'`
      //   → 52428800. Se il nostro controllo fosse più largo, il rifiuto
      //   arriverebbe alla FINE di un caricamento da decine di MB.
      expect(MAX_UPLOAD_DIRETTO_BYTES).toBe(52428800)
      expect(`${MAX_UPLOAD_DIRETTO_BYTES / (1024 * 1024)}MB`).toBe(MAX_UPLOAD_DIRETTO_ETICHETTA)
    })

    it('oltre 50MB nemmeno il corridoio diretto passa, e la frase dice 50MB', () => {
      const frase = troppoGrande({ size: 62 * 1024 * 1024 }, { corridoio: 'diretto' })
      expect(frase).toContain('62,0 MB')
      expect(frase).toContain('50MB')
      expect(frase).not.toContain('4MB')
    })

    it('🛑 senza dire il corridoio vale il tetto PIÙ STRETTO — si sbaglia dalla parte giusta', () => {
      // Dimenticare il parametro deve dare «rifiuta un file che sarebbe
      // passato», mai «lascia partire un file che verrà tagliato a metà».
      expect(troppoGrande({ size: DODICI_MB })).not.toBeNull()
    })
  })
})
