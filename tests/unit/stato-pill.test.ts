import { describe, it, expect } from 'vitest'
import { pillStatoScheda } from '../../src/lib/lavori/stato-pill'

const OGGI = new Date(2026, 6, 13) // 13 lug 2026 (mese 0-based)

describe('pillStatoScheda', () => {
  it('pronto in giornata → PRONTA ✓ verde', () => {
    const r = pillStatoScheda({ stato: 'pronto', data_consegna_prevista: '2026-07-20', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'PRONTA ✓', famiglia: 'green' })
  })
  it('consegnato → CONSEGNATO ✓ verde (fuori-pila, pillTempo null)', () => {
    const r = pillStatoScheda({ stato: 'consegnato', data_consegna_prevista: '2026-07-10', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'CONSEGNATO ✓', famiglia: 'green' })
  })
  it('annullato → ANNULLATO ambra', () => {
    const r = pillStatoScheda({ stato: 'annullato', data_consegna_prevista: '2026-07-10', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'ANNULLATO', famiglia: 'amber' })
  })
  it('in_lavorazione senza ritardo → IN LAVORAZIONE ambra (pillTempo null)', () => {
    const r = pillStatoScheda({ stato: 'in_lavorazione', data_consegna_prevista: '2026-07-20', ora_consegna: null }, OGGI)
    expect(r).toEqual({ testo: 'IN LAVORAZIONE', famiglia: 'amber' })
  })
  it('in ritardo → usa la pill di derivaUrgenza (rossa)', () => {
    const r = pillStatoScheda({ stato: 'in_ritardo', data_consegna_prevista: '2026-07-12', ora_consegna: null }, OGGI)
    expect(r.famiglia).toBe('red')
  })
})
