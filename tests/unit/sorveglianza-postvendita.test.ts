import { describe, it, expect } from 'vitest'
import { getStatoSorveglianza } from '../../src/lib/utils/sorveglianza-postvendita'

describe('getStatoSorveglianza', () => {
  const NOW = new Date('2026-07-07T12:00:00Z')

  it('classe_i, mai creato (null) → PMS Report, mai scaduto, alert info', () => {
    const r = getStatoSorveglianza('classe_i', null, NOW)
    expect(r).toEqual({
      tipoDocumento: 'PMS Report',
      cadenzaLabel: 'Nessuna cadenza fissa (MDR Art. 85) — aggiornare quando necessario',
      scaduto: false,
      alertLivello: 'info',
    })
  })

  it('classe_i, ultimo report 100gg fa (<365) → nessun alert', () => {
    const data = new Date('2026-03-29T12:00:00Z').toISOString() // 100gg prima di NOW
    const r = getStatoSorveglianza('classe_i', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('nessuno')
  })

  it('classe_i, ultimo report 400gg fa (>365) → mai scaduto, ma alert info (promemoria soft)', () => {
    const data = new Date('2025-06-02T12:00:00Z').toISOString() // ~400gg prima
    const r = getStatoSorveglianza('classe_i', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('info')
  })

  it('classe_iia, mai creato (null) → PSUR, scaduto true, alert urgente', () => {
    const r = getStatoSorveglianza('classe_iia', null, NOW)
    expect(r.tipoDocumento).toBe('PSUR')
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })

  it('classe_iia, ultimo report 700gg fa (<730) → non scaduto', () => {
    const data = new Date(NOW.getTime() - 700 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iia', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('nessuno')
  })

  it('classe_iia, ultimo report 731gg fa (>730) → scaduto, urgente', () => {
    const data = new Date(NOW.getTime() - 731 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iia', data, NOW)
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })

  it('classe_iib_iii, mai creato (null) → PSUR, scaduto true, urgente', () => {
    const r = getStatoSorveglianza('classe_iib_iii', null, NOW)
    expect(r.tipoDocumento).toBe('PSUR')
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })

  it('classe_iib_iii, ultimo report 300gg fa (<365) → non scaduto', () => {
    const data = new Date(NOW.getTime() - 300 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iib_iii', data, NOW)
    expect(r.scaduto).toBe(false)
    expect(r.alertLivello).toBe('nessuno')
  })

  it('classe_iib_iii, ultimo report 366gg fa (>365) → scaduto, urgente', () => {
    const data = new Date(NOW.getTime() - 366 * 24 * 60 * 60 * 1000).toISOString()
    const r = getStatoSorveglianza('classe_iib_iii', data, NOW)
    expect(r.scaduto).toBe(true)
    expect(r.alertLivello).toBe('urgente')
  })
})
