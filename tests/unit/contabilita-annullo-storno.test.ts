import { describe, it, expect } from 'vitest'
import { calcolaCreditoDisponibile, type MovimentoCreditoRiga } from '@/lib/contabilita/saldo'

describe('calcolaCreditoDisponibile — annullo_storno (spec R1 §6)', () => {
  it('sottrae annullo_storno dal saldo (rifiuto TD04 post-applicazione → saldo negativo visibile)', () => {
    const movimenti: MovimentoCreditoRiga[] = [
      { tipo: 'storno', importo: 100 },        // TD04 emesso su fattura pagata
      { tipo: 'applicazione', importo: 60 },   // credito già speso
      { tipo: 'annullo_storno', importo: 100 }, // TD04 rifiutato da SdI
    ]
    expect(calcolaCreditoDisponibile(movimenti)).toBe(-60)
  })

  it('ciclo doppio storno→rifiuto con importi diversi: saldo netto 0', () => {
    const movimenti: MovimentoCreditoRiga[] = [
      { tipo: 'storno', importo: 100 }, { tipo: 'annullo_storno', importo: 100 },
      { tipo: 'storno', importo: 80 }, { tipo: 'annullo_storno', importo: 80 },
    ]
    expect(calcolaCreditoDisponibile(movimenti)).toBe(0)
  })

  it('annullo_storno assente = comportamento attuale invariato', () => {
    const movimenti: MovimentoCreditoRiga[] = [
      { tipo: 'eccedenza', importo: 50 }, { tipo: 'storno', importo: 30 },
      { tipo: 'applicazione', importo: 20 }, { tipo: 'rimborso', importo: 10 },
    ]
    expect(calcolaCreditoDisponibile(movimenti)).toBe(50)
  })
})
