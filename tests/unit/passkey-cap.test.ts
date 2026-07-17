// tests/unit/passkey-cap.test.ts
// N14 deferral (requisito 4 decisione ratificata): cap lifetime ~3 proposte
// passkey — dopo 3 comparse del prompt non si ripropone più in automatico
// (resta l'ingresso manuale in Impostazioni→Sicurezza).
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  shouldShowPasskeyModal,
  registraPropostaPasskey,
  PASSKEY_PROMPT_MAX,
} from '@/components/features/auth/PasskeyRegistrationModal'

const EMAIL = 'titolare@lab.it'

beforeEach(() => {
  localStorage.clear()
})

describe('cap proposte passkey (N14)', () => {
  it('sotto il cap: si propone (nessuno skip attivo)', () => {
    expect(shouldShowPasskeyModal(EMAIL)).toBe(true)
    registraPropostaPasskey()
    registraPropostaPasskey()
    expect(shouldShowPasskeyModal(EMAIL)).toBe(true)
  })

  it('raggiunto il cap (3): non si propone più', () => {
    expect(PASSKEY_PROMPT_MAX).toBe(3)
    for (let i = 0; i < PASSKEY_PROMPT_MAX; i++) registraPropostaPasskey()
    expect(shouldShowPasskeyModal(EMAIL)).toBe(false)
  })

  it('contatore corrotto → trattato come 0 (si propone)', () => {
    localStorage.setItem('ua_passkey_prompt_count', 'banana')
    expect(shouldShowPasskeyModal(EMAIL)).toBe(true)
  })

  it('passkey già registrata per la stessa email → mai (invariato)', () => {
    localStorage.setItem('ua_passkey_email', EMAIL)
    expect(shouldShowPasskeyModal(EMAIL)).toBe(false)
  })

  it('skip 30gg attivo → mai, anche sotto il cap (invariato)', () => {
    const domani = new Date(Date.now() + 86_400_000).toISOString()
    localStorage.setItem('ua_passkey_skip_until', domani)
    expect(shouldShowPasskeyModal(EMAIL)).toBe(false)
  })
})
