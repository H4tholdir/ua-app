import { describe, expect, it } from 'vitest'
import { miniaturaPerLavoro } from '@/lib/domain/miniature-lavoro'

describe('miniaturaPerLavoro', () => {
  it('risolve il livello granulare dalla descrizione (aliases)', () => {
    expect(miniaturaPerLavoro('Corona su impianto', 'implantologia')).toBe('impianto')
    expect(miniaturaPerLavoro('Ponte', 'protesi_fissa')).toBe('ponte')
    expect(miniaturaPerLavoro('Provvisorio in resina', 'provvisorio')).toBe('provvisorio')
  })
  it('cade sul macro quando la descrizione non matcha', () => {
    expect(miniaturaPerLavoro('Lavoro strano', 'protesi_mobile')).toBe('totale')
    expect(miniaturaPerLavoro(null, 'scheletrato')).toBe('scheletrato')
    expect(miniaturaPerLavoro(null, 'ortodonzia')).toBe('allineatore')
    expect(miniaturaPerLavoro(null, 'bite_splint')).toBe('mascherina')
    expect(miniaturaPerLavoro(null, 'riparazione')).toBe('riparazione')
    expect(miniaturaPerLavoro(null, 'cad_cam')).toBe('corona')
  })
  it('fallback generico su macro sconosciuto o assente', () => {
    expect(miniaturaPerLavoro(null, null)).toBe('generica')
    expect(miniaturaPerLavoro(null, 'altro')).toBe('generica')
    expect(miniaturaPerLavoro(null, 'boh')).toBe('generica')
  })
})
