// tests/unit/portale-pin-lib.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.stubEnv('PORTALE_PIN_PEPPER', 'pepper-di-test-lungo-a-sufficienza')
})

import { validaPinNuovo, hashPin, verifyPin } from '@/lib/portale/pin'

describe('validaPinNuovo', () => {
  it('accetta un PIN a 6 cifre non banale', () => {
    expect(validaPinNuovo('483951')).toEqual({ ok: true })
  })
  it.each(['12345', '1234567', 'abc123', '12 456', ''])('rifiuta formato non valido: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
  it.each(['000000', '111111', '999999'])('rifiuta le ripetizioni: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
  it.each(['123456', '654321', '012345', '543210', '456789', '987654'])('rifiuta le sequenze: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
  it.each(['010190', '311299', '250626'])('rifiuta le date evidenti DDMMYY: %s', (pin) => {
    expect(validaPinNuovo(pin).ok).toBe(false)
  })
})

describe('hashPin / verifyPin', () => {
  it('round-trip: il PIN corretto verifica, uno sbagliato no', () => {
    const stored = hashPin('483951')
    expect(stored).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/)
    expect(verifyPin('483951', stored)).toBe(true)
    expect(verifyPin('483952', stored)).toBe(false)
  })
  it('due hash dello stesso PIN differiscono (salt casuale)', () => {
    expect(hashPin('483951')).not.toBe(hashPin('483951'))
  })
  it('il pepper è parte dell\'input: con pepper diverso la verifica fallisce', () => {
    const stored = hashPin('483951')
    vi.stubEnv('PORTALE_PIN_PEPPER', 'un-altro-pepper')
    expect(verifyPin('483951', stored)).toBe(false)
  })
  it('verifyPin è robusta su stored malformato', () => {
    expect(verifyPin('483951', 'garbage')).toBe(false)
    expect(verifyPin('483951', 'scrypt$32768$8$1$soloquattroparti')).toBe(false)
  })
  it('hashPin esplode se il pepper manca (mai hash senza pepper — F1)', () => {
    vi.stubEnv('PORTALE_PIN_PEPPER', '')
    expect(() => hashPin('483951')).toThrow()
  })
})
