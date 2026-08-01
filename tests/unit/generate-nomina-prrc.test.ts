// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PDFParse } from 'pdf-parse'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateNominaPrrc } from '../../src/lib/pdf/generate-nomina-prrc'

describe('generateNominaPrrc', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('genera una nomina PRRC con dati completi', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    const buffer = await generateNominaPrrc('lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('rifiuta se il laboratorio non ha prrc_nome configurato (comportamento esistente)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: { ...LAB_FIXTURE, prrc_nome: null }, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    await expect(generateNominaPrrc('lab-test-001')).rejects.toThrow('Dati PRRC non configurati')
  })

  it('il titolo di sezione porta l\'accento: «Responsabilità ai sensi dell\'Art. 15(1)»', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    const buffer = await generateNominaPrrc('lab-test-001')
    const parser = new PDFParse({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()
    // styles.sectionTitle ha textTransform: 'uppercase' (NominaPrrcTemplate.tsx:111) —
    // il titolo, come ogni titolo di sezione in questo template, esce in maiuscolo
    // nel PDF: verificato leggendo lo stile prima di scrivere l'asserzione (vedi
    // anche DdcTemplate/ddc-pdf-content.test.ts, stesso comportamento provato lì).
    expect(result.text).toContain('RESPONSABILITÀ AI SENSI')
    // Stem nudo, non solo la frase intera — stessa rete di ddc-pdf-content.test.ts
    // (righe 125-126): si accende su qualunque residuo non accentato nel foglio
    // reso, non solo su quello che l'asserzione positiva già copre.
    expect(result.text).not.toContain('RESPONSABILITA')
  }, 30_000)
})
