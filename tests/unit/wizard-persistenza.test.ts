import { describe, it, expect, beforeEach } from 'vitest'
import { salvaStato, leggiStato, azzeraStato, CHIAVE_WIZARD, type StatoSalvato } from '@/lib/wizard/persistenza'

const ORA = new Date('2026-07-12T10:00:00.000Z').getTime()

function statoBase(overrides: Partial<StatoSalvato> = {}): StatoSalvato {
  return {
    v: 1,
    salvatoA: ORA,
    userId: 'u1',
    labId: 'lab1',
    passo: 2,
    cliente: { id: 'c1', label: 'Dr. Esposito' },
    tipo: { kind: 'catalogo', tipoId: 'corona_zirconia' },
    pz: 'PZ-0001',
    alias: '',
    elemento: '',
    colore: '',
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('persistenza wizard — salvaStato/leggiStato/azzeraStato (Task 13, spec §9)', () => {
  it('roundtrip: salva e rilegge esattamente lo stesso stato (stessi userId/labId, entro 24h)', () => {
    const s = statoBase()
    salvaStato(s)
    expect(leggiStato('u1', 'lab1', ORA + 1000)).toEqual(s)
  })

  it('assente: nessuna chiave salvata → null', () => {
    expect(leggiStato('u1', 'lab1', ORA)).toBeNull()
  })

  it('scaduto: salvatoA = ora - 25h → null E la chiave viene rimossa', () => {
    const s = statoBase({ salvatoA: ORA })
    salvaStato(s)
    const oraLettura = ORA + 25 * 60 * 60 * 1000
    expect(leggiStato('u1', 'lab1', oraLettura)).toBeNull()
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).toBeNull()
  })

  it('entro le 24h (23h59) → NON scaduto, resta leggibile', () => {
    const s = statoBase({ salvatoA: ORA })
    salvaStato(s)
    const oraLettura = ORA + (23 * 60 + 59) * 60 * 1000
    expect(leggiStato('u1', 'lab1', oraLettura)).toEqual(s)
  })

  it('userId diverso (dispositivo condiviso) → null', () => {
    salvaStato(statoBase({ userId: 'u1' }))
    expect(leggiStato('u2', 'lab1', ORA + 1000)).toBeNull()
  })

  it('labId diverso (dispositivo condiviso, altro lab) → null', () => {
    salvaStato(statoBase({ labId: 'lab1' }))
    expect(leggiStato('u1', 'lab2', ORA + 1000)).toBeNull()
  })

  it('v diverso da 1 (formato futuro/vecchio) → null', () => {
    window.localStorage.setItem(CHIAVE_WIZARD, JSON.stringify({ ...statoBase(), v: 2 }))
    expect(leggiStato('u1', 'lab1', ORA + 1000)).toBeNull()
  })

  it('JSON corrotto → null senza throw', () => {
    window.localStorage.setItem(CHIAVE_WIZARD, '{non è json valido')
    expect(() => leggiStato('u1', 'lab1', ORA)).not.toThrow()
    expect(leggiStato('u1', 'lab1', ORA)).toBeNull()
  })

  it('azzeraStato rimuove la chiave', () => {
    salvaStato(statoBase())
    azzeraStato()
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).toBeNull()
    expect(leggiStato('u1', 'lab1', ORA + 1000)).toBeNull()
  })

  it('azzeraStato su chiave già assente non lancia', () => {
    expect(() => azzeraStato()).not.toThrow()
  })
})
