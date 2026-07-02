import { describe, it, expect } from 'vitest'
import { calcolaCreditoCliente, type CreditoClienteInput } from '@/lib/contabilita/credito-cliente'

function input(overrides: Partial<CreditoClienteInput> = {}): CreditoClienteInput {
  return {
    fattureNonSaldate: [],
    lavoriNonFatturareNonSaldati: [],
    lavoriFatturareNonInclusi: [],
    lavoriInAttesa: [],
    creditoDisponibile: 0,
    ...overrides,
  }
}

describe('calcolaCreditoCliente — 4 numeri distinti (spec B2 §5)', () => {
  it('nessun dovuto, nessun credito → tutti i bucket a zero', () => {
    const r = calcolaCreditoCliente(input())
    expect(r).toEqual({ confermato: 0, potenziale: 0, disponibile: 0, totale: 0 })
  })

  it('confermato somma fatture non saldate + lavori non_fatturare + lavori fatturare-non-inclusi', () => {
    const r = calcolaCreditoCliente(input({
      fattureNonSaldate: [{ residuo: 100 }],
      lavoriNonFatturareNonSaldati: [{ residuo: 50 }],
      lavoriFatturareNonInclusi: [{ residuo: 30 }],
    }))
    expect(r.confermato).toBe(180)
    expect(r.potenziale).toBe(0)
    expect(r.totale).toBe(180)
  })

  it('potenziale = solo lavori in_attesa, non entra nel confermato', () => {
    const r = calcolaCreditoCliente(input({ lavoriInAttesa: [{ residuo: 200 }] }))
    expect(r.confermato).toBe(0)
    expect(r.potenziale).toBe(200)
    expect(r.totale).toBe(200)
  })

  it('totale = confermato + potenziale', () => {
    const r = calcolaCreditoCliente(input({
      fattureNonSaldate: [{ residuo: 100 }],
      lavoriInAttesa: [{ residuo: 50 }],
    }))
    expect(r.totale).toBe(150)
  })

  it('disponibile è passato invariato (calcolato altrove da calcolaCreditoDisponibile)', () => {
    const r = calcolaCreditoCliente(input({ creditoDisponibile: 42.5 }))
    expect(r.disponibile).toBe(42.5)
  })

  it('regressione monotonicità (finding di review B2): il totale non deve MAI scendere durante ' +
     'la transizione in_attesa → fatturare (non incluso) → incluso_in_fattura=true', () => {
    // Stato 1: lavoro da 100 in_attesa
    const stato1 = calcolaCreditoCliente(input({ lavoriInAttesa: [{ residuo: 100 }] }))
    expect(stato1.totale).toBe(100)

    // Stato 2: titolare decide "fatturare", non ancora incluso in una fattura —
    // il lavoro esce da in_attesa ed entra nel terzo bucket "confermato"
    const stato2 = calcolaCreditoCliente(input({ lavoriFatturareNonInclusi: [{ residuo: 100 }] }))
    expect(stato2.totale).toBe(100)

    // Stato 3: il lavoro è stato incluso in una fattura — esce dal terzo bucket
    // ed entra nel primo (fattura non saldata), mai contato due volte
    const stato3 = calcolaCreditoCliente(input({ fattureNonSaldate: [{ residuo: 100 }] }))
    expect(stato3.totale).toBe(100)

    // In nessuno stato intermedio il totale è mai sceso a 0
    expect([stato1.totale, stato2.totale, stato3.totale].every((t) => t === 100)).toBe(true)
  })
})
