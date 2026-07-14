import { describe, it, expect } from 'vitest'
import { isNuovaRichiestaDentista } from '@/lib/portale/richiesta-dentista'

describe('isNuovaRichiestaDentista', () => {
  it('true per lavoro da portale se ruolo titolare/front_desk', () => {
    expect(isNuovaRichiestaDentista({ da_portale: true }, 'titolare')).toBe(true)
    expect(isNuovaRichiestaDentista({ da_portale: true }, 'front_desk')).toBe(true)
  })
  it('false se da_portale non true (regressione: note_interne svuotata non deve rompere)', () => {
    expect(isNuovaRichiestaDentista({ note_interne: '' }, 'titolare')).toBe(false)
    expect(isNuovaRichiestaDentista({ da_portale: false }, 'titolare')).toBe(false)
    expect(isNuovaRichiestaDentista({}, 'titolare')).toBe(false)
  })
  it('false per ruoli non ammessi', () => {
    expect(isNuovaRichiestaDentista({ da_portale: true }, 'tecnico')).toBe(false)
  })
})
