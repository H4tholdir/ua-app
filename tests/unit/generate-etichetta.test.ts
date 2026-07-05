// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateEtichettaBuffer } from '../../src/lib/pdf/generate-etichetta'

describe('generateEtichettaBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return createChain({ data: LAVORO_FIXTURE, error: null })
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera il buffer etichetta con dati completi', async () => {
    const buffer = await generateEtichettaBuffer('lav-test-001', 'lab-test-001')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
