import { describe, it, expect } from 'vitest'
import { isTrialExpiringSoon } from '../../src/lib/utils/lab-stato'

describe('isTrialExpiringSoon', () => {
  it('ritorna false se lo stato non è trial, anche con trial_ends_at vicino', () => {
    const now = new Date('2026-07-05T12:00:00Z')
    const trialEndsAt = new Date('2026-07-08T12:00:00Z').toISOString() // 3 giorni dopo, < 7gg
    expect(isTrialExpiringSoon('attivo', trialEndsAt, now)).toBe(false)
  })

  it('ritorna false se lo stato è trial ma trial_ends_at è null', () => {
    const now = new Date('2026-07-05T12:00:00Z')
    expect(isTrialExpiringSoon('trial', null, now)).toBe(false)
  })

  it('ritorna false se lo stato è trial ma la scadenza è oltre 7 giorni', () => {
    const now = new Date('2026-07-05T12:00:00Z')
    const trialEndsAt = new Date('2026-07-20T12:00:00Z').toISOString() // 15 giorni dopo
    expect(isTrialExpiringSoon('trial', trialEndsAt, now)).toBe(false)
  })

  it('ritorna true se lo stato è trial e la scadenza è entro 7 giorni (happy path)', () => {
    const now = new Date('2026-07-05T12:00:00Z')
    const trialEndsAt = new Date('2026-07-08T12:00:00Z').toISOString() // 3 giorni dopo
    expect(isTrialExpiringSoon('trial', trialEndsAt, now)).toBe(true)
  })

  it('ritorna false se lo stato è sospeso, anche con trial_ends_at vicino', () => {
    const now = new Date('2026-07-05T12:00:00Z')
    const trialEndsAt = new Date('2026-07-06T12:00:00Z').toISOString()
    expect(isTrialExpiringSoon('sospeso', trialEndsAt, now)).toBe(false)
  })
})
