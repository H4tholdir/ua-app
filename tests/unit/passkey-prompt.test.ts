// tests/unit/passkey-prompt.test.ts
// N14b — handoff cross-route del prompt passkey dal login alla dashboard
// (Opzione C). Il login "arma" il prompt in sessionStorage; la dashboard lo
// "consuma" una sola volta e solo entro una breve finestra TTL, così il modal
// appare sopra la dashboard appena atterrata ma NON in sessioni successive
// scollegate dal login appena avvenuto.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  armPasskeyPrompt,
  consumePasskeyPrompt,
  PASSKEY_PROMPT_TTL_MS,
} from '../../src/lib/auth/passkey-prompt'

beforeEach(() => {
  sessionStorage.clear()
})

describe('passkey-prompt handoff (N14b Opzione C)', () => {
  it('consuma il prompt armato entro il TTL → restituisce email', () => {
    const t0 = 1_000_000
    armPasskeyPrompt('filippo@lab.it', t0)
    expect(consumePasskeyPrompt(t0 + 500)).toBe('filippo@lab.it')
  })

  it('è one-shot: la seconda consume restituisce null', () => {
    const t0 = 1_000_000
    armPasskeyPrompt('filippo@lab.it', t0)
    expect(consumePasskeyPrompt(t0 + 100)).toBe('filippo@lab.it')
    expect(consumePasskeyPrompt(t0 + 200)).toBeNull()
  })

  it('scade oltre il TTL → restituisce null (sessione dashboard scollegata dal login)', () => {
    const t0 = 1_000_000
    armPasskeyPrompt('filippo@lab.it', t0)
    expect(consumePasskeyPrompt(t0 + PASSKEY_PROMPT_TTL_MS + 1)).toBeNull()
  })

  it('senza arm precedente → null', () => {
    expect(consumePasskeyPrompt(1_000_000)).toBeNull()
  })

  it('payload corrotto → null, senza throw', () => {
    sessionStorage.setItem('ua_passkey_prompt', 'not-json{')
    expect(consumePasskeyPrompt(1_000_000)).toBeNull()
  })
})
