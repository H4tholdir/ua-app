// Estratta da generate-cedolino-tecnico (Bundle E): confini [from, to) di un
// mese YYYY-MM come date-only ISO — riusata da cedolino singolo e batch.
import { describe, it, expect } from 'vitest'
import { meseBoundaries } from '@/lib/utils/mese'

describe('meseBoundaries', () => {
  it('mese centrale', () => {
    expect(meseBoundaries('2026-05')).toEqual({ from: '2026-05-01', to: '2026-06-01' })
  })
  it('dicembre: to sfora nell anno successivo', () => {
    expect(meseBoundaries('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
  })
  it('gennaio', () => {
    expect(meseBoundaries('2026-01')).toEqual({ from: '2026-01-01', to: '2026-02-01' })
  })
})
