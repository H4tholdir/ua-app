// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, CLIENTE_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpload, mockProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(), mockInsert: vi.fn(), mockUpload: vi.fn(), mockProgressivo: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload }) },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: mockProgressivo }))

import { generateDpa } from '../../src/lib/pdf/generate-dpa'

function mockTables(lab: typeof LAB_FIXTURE, cliente: typeof CLIENTE_FIXTURE) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'clienti') return createChain({ data: cliente, error: null })
    if (table === 'data_processing_agreements') {
      const c = createChain({ data: null, error: null })
      c.insert = mockInsert
      return c
    }
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDpa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockProgressivo.mockResolvedValue(7)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-1' }, error: null }))
  })

  it('genera una DPA con dati fiscali completi', async () => {
    mockTables(LAB_FIXTURE, CLIENTE_FIXTURE)
    const r = await generateDpa('lab-test-001', 'cli-001')
    expect(r.buffer.length).toBeGreaterThan(0)
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
