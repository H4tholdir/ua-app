import { describe, it, expect } from 'vitest'
import {
  STATI_CONSEGNABILI, FINESTRA_ANNULLO_MS, isStatoConsegnabile,
} from '@/lib/consegna/costanti'

describe('costanti condivise consegna/annullo', () => {
  it('STATI_CONSEGNABILI è la coppia pronto/in_ritardo (E4)', () => {
    expect(STATI_CONSEGNABILI).toEqual(['pronto', 'in_ritardo'])
  })

  it('FINESTRA_ANNULLO_MS è 10 minuti (C4)', () => {
    expect(FINESTRA_ANNULLO_MS).toBe(10 * 60 * 1000)
  })

  it('isStatoConsegnabile riconosce solo gli stati consegnabili', () => {
    expect(isStatoConsegnabile('pronto')).toBe(true)
    expect(isStatoConsegnabile('in_ritardo')).toBe(true)
    expect(isStatoConsegnabile('ricevuto')).toBe(false)
    expect(isStatoConsegnabile('consegnato')).toBe(false)
  })

  it('le costanti outbox non esistono più (M-2)', async () => {
    const mod = await import('@/lib/consegna/costanti')
    expect('MAX_TENTATIVI_EMISSIONE' in mod).toBe(false)
    expect('OUTBOX_BATCH_MAX' in mod).toBe(false)
    expect('OUTBOX_TIME_BUDGET_MS' in mod).toBe(false)
    expect('WATCHDOG_IN_LAVORAZIONE_MIN' in mod).toBe(false)
  })
})
