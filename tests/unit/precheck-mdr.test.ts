import { describe, it, expect } from 'vitest'
import { runPrecheckMdr, type PrecheckInput } from '@/lib/consegna/precheck-mdr'

const validInput: PrecheckInput = {
  laboratorio_itca: 'ITCA01051686',
  materiali: [{ nome: 'Zirconia', lotto: 'LOT2025001', scadenza: '2027-01-01' }],
  paziente_codice_gdpr: 'PAZ_ABC123',
  tipo_dispositivo: 'protesi_fissa',
  lavorazioni: [{ id: 'l1', nome: 'Corona ceramica', quantita: 1 }],
  dentista_piva: '03508740655',
  data_consegna: new Date().toISOString(),
  numero_ddc: 'DDC-2026-0094',
  prescrizione_ricevuta: true,
  conformita_fornitore: true,
  non_conformita_aperte: false,
  laboratorio_firma_url: 'https://storage.ua.app/firme/lab1.png',
}

describe('runPrecheckMdr', () => {
  it('passes with complete valid data', () => {
    const r = runPrecheckMdr(validInput)
    expect(r.passed).toBe(true)
    expect(r.errors).toHaveLength(0)
  })

  it('fails without ITCA', () => {
    const r = runPrecheckMdr({ ...validInput, laboratorio_itca: '' })
    expect(r.passed).toBe(false)
    expect(r.errors[0].campo).toBe('laboratorio_itca')
    expect(r.errors[0].riferimento).toContain('ITCA')
  })

  it('fails with material missing lotto', () => {
    const r = runPrecheckMdr({ ...validInput, materiali: [{ nome: 'Zirconia', lotto: '', scadenza: '2027-01-01' }] })
    expect(r.passed).toBe(false)
    expect(r.errors.some(e => e.campo === 'materiali_lotti')).toBe(true)
  })

  it('fails without paziente GDPR code', () => {
    const r = runPrecheckMdr({ ...validInput, paziente_codice_gdpr: '' })
    expect(r.passed).toBe(false)
    expect(r.errors[0].campo).toBe('paziente_codice_gdpr')
  })

  it('fails with open non-conformita', () => {
    const r = runPrecheckMdr({ ...validInput, non_conformita_aperte: true })
    expect(r.passed).toBe(false)
    expect(r.errors[0].campo).toBe('non_conformita_aperte')
  })

  it('every error has riferimento normativo and messaggio', () => {
    const r = runPrecheckMdr({ ...validInput, laboratorio_itca: '', prescrizione_ricevuta: false })
    r.errors.forEach(e => {
      expect(e.riferimento).toBeTruthy()
      expect(e.messaggio).toBeTruthy()
    })
  })
})
