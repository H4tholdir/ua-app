import { describe, it, expect } from 'vitest'
import { numeroPerWhatsapp } from '@/lib/consegna/whatsapp-template'

describe('numeroPerWhatsapp — prepara un numero per wa.me (P31, D182)', () => {
  it('il caso normale: cellulare italiano come lo scrive chiunque', () => {
    expect(numeroPerWhatsapp('333 1234567')).toBe('393331234567')
  })

  it("rispetta il + gia' presente", () => {
    expect(numeroPerWhatsapp('+39 333 1234567')).toBe('393331234567')
  })

  it('il fisso vero in banca dati', () => {
    expect(numeroPerWhatsapp('0976 71439')).toBe('39097671439')
  })

  it('un + straniero SI RISPETTA — non si italianizza', () => {
    expect(numeroPerWhatsapp('+33 6 12 34 56 78')).toBe('33612345678')
  })

  it('la forma internazionale con 00', () => {
    expect(numeroPerWhatsapp('00 39 333 1234567')).toBe('393331234567')
  })

  // 🔑 IL CASO CHE SMONTA «comincia per 39»: 391 è un prefisso di
  //    cellulare italiano (Wind). 10 cifre -> è NAZIONALE.
  it("un cellulare 391… senza prefisso e' NAZIONALE, non internazionale", () => {
    expect(numeroPerWhatsapp('391 2345678')).toBe('393912345678')
  })

  // ...e il verso opposto: 11 cifre che cominciano per 39 -> gia' internazionale
  it("un fisso gia' internazionale resta intatto", () => {
    expect(numeroPerWhatsapp('39 0976 71439')).toBe('39097671439')
  })

  it.each([null, undefined, '', '   ', '---', '()'])('senza un numero usabile da null: %s', (v) => {
    expect(numeroPerWhatsapp(v as string | null | undefined)).toBeNull()
  })
})
