import { describe, expect, it } from 'vitest'
import { DENTI_FDI_VALIDI, isFdiValido, quadranteDa, arcataDa } from '@/lib/domain/denti-fdi-dominio'
import { DENTI_ADULTO, DENTI_DECIDUO } from '@/components/features/odontogramma/denti-fdi'

describe('dominio FDI — 52 codici strutturati, non un intervallo (spec §3.1, verbale ⑤)', () => {
  it('ha esattamente 52 membri', () => {
    expect(DENTI_FDI_VALIDI.size).toBe(52)
  })

  it('coincide con i denti dichiarati dai due cataloghi', () => {
    const daiCataloghi = new Set([...DENTI_ADULTO, ...DENTI_DECIDUO].map((d) => d.numero))
    expect(daiCataloghi.size).toBe(52)
    for (const n of daiCataloghi) expect(DENTI_FDI_VALIDI.has(n)).toBe(true)
  })

  it('rifiuta i buchi che un BETWEEN 11 AND 48 lascerebbe passare', () => {
    for (const buco of [19, 20, 29, 30, 39, 40, 49, 50]) {
      expect(isFdiValido(buco)).toBe(false)
    }
  })

  it('rifiuta i decidui inesistenti (sesta posizione)', () => {
    for (const buco of [56, 66, 76, 86]) expect(isFdiValido(buco)).toBe(false)
  })

  it('rifiuta tutto ciò che non è un intero nel dominio', () => {
    for (const v of [0, -11, 4.5, '11 ', '2.6', '11', null, undefined, NaN, Infinity, 100]) {
      expect(isFdiValido(v)).toBe(false)
    }
  })

  it('deriva il quadrante dalla decina, non da un campo scritto a mano', () => {
    expect(quadranteDa(18)).toBe(1)
    expect(quadranteDa(28)).toBe(2)
    expect(quadranteDa(38)).toBe(3)
    expect(quadranteDa(48)).toBe(4)
    expect(quadranteDa(55)).toBe(5) // ⑥: era 1
    expect(quadranteDa(65)).toBe(6)
    expect(quadranteDa(75)).toBe(7)
    expect(quadranteDa(85)).toBe(8)
  })

  it('deriva l arcata: quadranti 1,2,5,6 sopra — 3,4,7,8 sotto', () => {
    expect(arcataDa(11)).toBe('superiore')
    expect(arcataDa(51)).toBe('superiore')
    expect(arcataDa(61)).toBe('superiore')
    expect(arcataDa(31)).toBe('inferiore')
    expect(arcataDa(81)).toBe('inferiore')
  })
})

describe('DENTI_DECIDUO — quadranti corretti (difetto ⑥)', () => {
  it('nessun deciduo porta più un quadrante 1-4', () => {
    for (const d of DENTI_DECIDUO) {
      expect(d.quadrante).toBe(quadranteDa(d.numero))
      expect(d.quadrante).toBeGreaterThanOrEqual(5)
    }
  })
})
