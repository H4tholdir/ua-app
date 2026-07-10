import { describe, it, expect } from 'vitest'
import {
  STATI_CONSEGNABILI, FINESTRA_ANNULLO_MS, MAX_TENTATIVI_EMISSIONE,
  OUTBOX_BATCH_MAX, OUTBOX_TIME_BUDGET_MS, WATCHDOG_IN_LAVORAZIONE_MIN,
  isStatoConsegnabile,
} from '@/lib/consegna/costanti'

describe('costanti consegna', () => {
  it('STATI_CONSEGNABILI contiene esattamente pronto e in_ritardo', () => {
    expect([...STATI_CONSEGNABILI]).toEqual(['pronto', 'in_ritardo'])
  })
  it('finestra annullo è 10 minuti', () => {
    expect(FINESTRA_ANNULLO_MS).toBe(10 * 60 * 1000)
  })
  it('valori outbox', () => {
    expect(MAX_TENTATIVI_EMISSIONE).toBe(8)
    expect(OUTBOX_BATCH_MAX).toBe(20)
    expect(OUTBOX_TIME_BUDGET_MS).toBe(45_000)
    expect(WATCHDOG_IN_LAVORAZIONE_MIN).toBe(5)
  })
  it('isStatoConsegnabile', () => {
    expect(isStatoConsegnabile('pronto')).toBe(true)
    expect(isStatoConsegnabile('in_ritardo')).toBe(true)
    for (const s of ['ricevuto','in_lavorazione','in_prova','in_prova_esterna','consegnato','sospeso','annullato']) {
      expect(isStatoConsegnabile(s)).toBe(false)
    }
  })
})
