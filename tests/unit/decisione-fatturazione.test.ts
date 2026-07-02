import { describe, it, expect } from 'vitest'
import { validaDecisioneFatturazione } from '@/lib/contabilita/decisione-fatturazione'

describe('validaDecisioneFatturazione — regole PATCH /api/lavori/[id]/decisione-fatturazione', () => {
  it('valore non tra i 3 ammessi → rifiutata', () => {
    const r = validaDecisioneFatturazione('boh', 'pronto', false)
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/non valido/)
  })

  it('lavoro già incluso in fattura → immutabile, rifiutata anche con valore valido', () => {
    const r = validaDecisioneFatturazione('non_fatturare', 'consegnato', true)
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/immutabile/i)
  })

  it('stato diverso da pronto/consegnato → rifiutata', () => {
    const r = validaDecisioneFatturazione('fatturare', 'in_lavorazione', false)
    expect(r.ok).toBe(false)
    expect(r.errore).toMatch(/pronto o consegnato/)
  })

  it('stato pronto, non incluso in fattura, valore valido → accettata', () => {
    expect(validaDecisioneFatturazione('fatturare', 'pronto', false).ok).toBe(true)
    expect(validaDecisioneFatturazione('non_fatturare', 'pronto', false).ok).toBe(true)
    expect(validaDecisioneFatturazione('in_attesa', 'consegnato', false).ok).toBe(true)
  })
})
