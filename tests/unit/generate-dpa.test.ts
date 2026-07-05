// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, CLIENTE_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateDpa } from '../../src/lib/pdf/generate-dpa'

function mockTables(lab: typeof LAB_FIXTURE, cliente: typeof CLIENTE_FIXTURE) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'clienti') return createChain({ data: cliente, error: null })
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDpa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('genera una DPA con dati fiscali completi', async () => {
    mockTables(LAB_FIXTURE, CLIENTE_FIXTURE)
    const buffer = await generateDpa('lab-test-001', 'cli-001')
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('rifiuta se il laboratorio non ha né Partita IVA né Codice Fiscale', async () => {
    mockTables({ ...LAB_FIXTURE, partita_iva: null, codice_fiscale: null }, CLIENTE_FIXTURE)
    await expect(generateDpa('lab-test-001', 'cli-001')).rejects.toThrow(
      'DPA: laboratorio privo di Partita IVA e Codice Fiscale'
    )
  })

  it('rifiuta se il cliente non ha né Partita IVA né Codice Fiscale', async () => {
    mockTables(LAB_FIXTURE, { ...CLIENTE_FIXTURE, partita_iva: null, codice_fiscale: null })
    await expect(generateDpa('lab-test-001', 'cli-001')).rejects.toThrow(
      'DPA: cliente privo di Partita IVA e Codice Fiscale'
    )
  })
})
