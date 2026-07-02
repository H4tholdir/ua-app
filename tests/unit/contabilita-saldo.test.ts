import { describe, it, expect } from 'vitest'
import {
  calcolaResiduo,
  calcolaStatoSaldo,
  calcolaEccedenza,
  calcolaCreditoDisponibile,
} from '@/lib/contabilita/saldo'

describe('calcolaResiduo — residuo = dovuto - pagamenti attivi - applicazioni credito', () => {
  it('nessun pagamento → residuo pari all\'intero dovuto', () => {
    expect(calcolaResiduo(100, [], [])).toBe(100)
  })

  it('pagamento parziale → residuo positivo', () => {
    expect(calcolaResiduo(100, [{ importo: 40 }], [])).toBe(60)
  })

  it('pagamento pieno → residuo zero', () => {
    expect(calcolaResiduo(100, [{ importo: 100 }], [])).toBe(0)
  })

  it('più pagamenti attivi si sommano', () => {
    expect(calcolaResiduo(100, [{ importo: 30 }, { importo: 30 }], [])).toBe(40)
  })

  it('applicazioni di credito riducono il residuo come i pagamenti', () => {
    expect(calcolaResiduo(100, [{ importo: 40 }], [{ importo: 20 }])).toBe(40)
  })

  it('eccedenza: pagamento superiore al dovuto → residuo negativo (l\'eccedenza si calcola altrove)', () => {
    expect(calcolaResiduo(100, [{ importo: 150 }], [])).toBe(-50)
  })

  it('arrotonda a 2 decimali per evitare drift float', () => {
    expect(calcolaResiduo(10.1, [{ importo: 3.33 }, { importo: 3.33 }, { importo: 3.34 }], [])).toBe(0.1)
  })
})

describe('calcolaStatoSaldo — classifica il residuo rispetto al dovuto', () => {
  it('residuo <= 0 → saldato', () => {
    expect(calcolaStatoSaldo(100, 0)).toBe('saldato')
    expect(calcolaStatoSaldo(100, -10)).toBe('saldato')
  })

  it('residuo pari all\'intero dovuto → insoluto (nessun pagamento ricevuto)', () => {
    expect(calcolaStatoSaldo(100, 100)).toBe('insoluto')
  })

  it('residuo tra 0 e il dovuto → parziale', () => {
    expect(calcolaStatoSaldo(100, 60)).toBe('parziale')
  })
})

describe('calcolaEccedenza — quanto un pagamento supera il residuo pre-esistente', () => {
  it('pagamento inferiore o pari al residuo → nessuna eccedenza', () => {
    expect(calcolaEccedenza(60, 60)).toBe(0)
    expect(calcolaEccedenza(40, 60)).toBe(0)
  })

  it('pagamento superiore al residuo → eccedenza pari alla differenza', () => {
    expect(calcolaEccedenza(80, 60)).toBe(20)
  })

  it('residuo pre-esistente già a zero (dovuto già saldato) → tutto il pagamento è eccedenza', () => {
    expect(calcolaEccedenza(50, 0)).toBe(50)
  })

  it('arrotonda a 2 decimali', () => {
    expect(calcolaEccedenza(10.333, 10)).toBe(0.33)
  })
})

describe('calcolaCreditoDisponibile — saldo = eccedenze - applicazioni - rimborsi', () => {
  it('nessun movimento → zero', () => {
    expect(calcolaCreditoDisponibile([])).toBe(0)
  })

  it('solo eccedenze → il loro totale', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 30 },
      { tipo: 'eccedenza', importo: 20 },
    ])).toBe(50)
  })

  it('eccedenza parzialmente applicata → residuo disponibile', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 50 },
      { tipo: 'applicazione', importo: 20 },
    ])).toBe(30)
  })

  it('eccedenza interamente rimborsata → zero', () => {
    expect(calcolaCreditoDisponibile([
      { tipo: 'eccedenza', importo: 50 },
      { tipo: 'rimborso', importo: 50 },
    ])).toBe(0)
  })
})
