import { describe, it, expect } from 'vitest'
import { prezzoEffettivoLavoro, divergenzaPrezzo } from '@/lib/domain/prezzo-lavoro'

describe('prezzoEffettivoLavoro', () => {
  it('somma le righe quando esistono (grezzo, no round per-riga)', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322, lavorazioni: [{ importo: 100 }, { importo: 12 }] })).toBe(112)
  })
  it('usa prezzo_unitario se non ci sono righe', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322, lavorazioni: [] })).toBe(322)
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322, lavorazioni: null })).toBe(322)
    expect(prezzoEffettivoLavoro({ prezzo_unitario: 322 })).toBe(322)
  })
  it('0 se né righe né prezzo_unitario', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: null, lavorazioni: [] })).toBe(0)
  })
  it('ignora importi null nelle righe', () => {
    expect(prezzoEffettivoLavoro({ prezzo_unitario: null, lavorazioni: [{ importo: 50 }, { importo: null }] })).toBe(50)
  })
})

describe('divergenzaPrezzo', () => {
  it('divergente quando righe e prezzo_unitario differiscono oltre 1 cent', () => {
    const d = divergenzaPrezzo({ prezzo_unitario: 322, lavorazioni: [{ importo: 112 }] })
    expect(d.divergente).toBe(true)
    expect(d.deltaCents).toBe(21000)
  })
  it('non divergente se coincidono (entro rounding a centesimi interi)', () => {
    expect(divergenzaPrezzo({ prezzo_unitario: 112, lavorazioni: [{ importo: 112 }] }).divergente).toBe(false)
  })
  it('non divergente se non ci sono righe (nessuna seconda fonte)', () => {
    expect(divergenzaPrezzo({ prezzo_unitario: 322, lavorazioni: [] }).divergente).toBe(false)
  })
  it('non divergente se prezzo_unitario è 0/null (solo righe → nessun conflitto)', () => {
    expect(divergenzaPrezzo({ prezzo_unitario: 0, lavorazioni: [{ importo: 112 }] }).divergente).toBe(false)
    expect(divergenzaPrezzo({ prezzo_unitario: null, lavorazioni: [{ importo: 112 }] }).divergente).toBe(false)
  })
})
