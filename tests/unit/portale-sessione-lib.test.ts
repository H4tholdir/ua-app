// tests/unit/portale-sessione-lib.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-di-sessione-di-test')
})

import {
  creaSessioneEconomica, verificaSessioneEconomica, estraiCookie,
  SESSIONE_ECONOMICA_COOKIE, SESSIONE_ECONOMICA_DURATA_MS,
} from '@/lib/portale/sessione'

const attesi = { clienteId: 'cli-1', pinGeneration: 3 }

describe('sessione economica', () => {
  it('round-trip valido', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    expect(verificaSessioneEconomica(tok, attesi)).toBe(true)
  })
  it('binding cookie↔token: cliente diverso → invalida (F2)', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    expect(verificaSessioneEconomica(tok, { clienteId: 'cli-2', pinGeneration: 3 })).toBe(false)
  })
  it('cambio PIN (pin_generation) invalida la sessione', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    expect(verificaSessioneEconomica(tok, { clienteId: 'cli-1', pinGeneration: 4 })).toBe(false)
  })
  it('scadenza: oltre 30 minuti → invalida', () => {
    vi.useFakeTimers()
    const tok = creaSessioneEconomica('cli-1', 3)
    vi.advanceTimersByTime(SESSIONE_ECONOMICA_DURATA_MS + 1000)
    expect(verificaSessioneEconomica(tok, attesi)).toBe(false)
    vi.useRealTimers()
  })
  it('firma manomessa → invalida', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    const [body] = tok.split('.')
    expect(verificaSessioneEconomica(`${body}.AAAA`, attesi)).toBe(false)
  })
  it('payload manomesso (firma di un altro payload) → invalida', () => {
    const tok = creaSessioneEconomica('cli-1', 3)
    const sig = tok.split('.')[1]
    const forged = Buffer.from(JSON.stringify({ cliente_id: 'cli-1', exp: Date.now() + 9e9, pin_generation: 3 })).toString('base64url')
    expect(verificaSessioneEconomica(`${forged}.${sig}`, attesi)).toBe(false)
  })
  it('token assente/garbage → invalida senza throw', () => {
    expect(verificaSessioneEconomica(null, attesi)).toBe(false)
    expect(verificaSessioneEconomica(undefined, attesi)).toBe(false)
    expect(verificaSessioneEconomica('non.un.token', attesi)).toBe(false)
  })
})

describe('estraiCookie', () => {
  it('estrae il cookie dal header', () => {
    expect(estraiCookie(`a=1; ${SESSIONE_ECONOMICA_COOKIE}=tok123; b=2`, SESSIONE_ECONOMICA_COOKIE)).toBe('tok123')
  })
  it('null se assente o header nullo', () => {
    expect(estraiCookie('a=1', SESSIONE_ECONOMICA_COOKIE)).toBeNull()
    expect(estraiCookie(null, SESSIONE_ECONOMICA_COOKIE)).toBeNull()
  })
})
