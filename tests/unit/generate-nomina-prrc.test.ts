// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
})
