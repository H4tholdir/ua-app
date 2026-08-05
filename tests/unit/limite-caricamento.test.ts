import { describe, it, expect } from 'vitest'
import {
  MAX_UPLOAD_BYTES,
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
})
