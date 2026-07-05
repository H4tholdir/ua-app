// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockUpload, mockGetPublicUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }) },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: async () => 1,
}))

import { generateBuono } from '../../src/lib/pdf/generate-buono'

describe('generateBuono', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/buono.pdf' } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'lavori') {
        return {
          update: () => ({ eq: () => ({ eq: async () => ({ count: 1, error: null }) }) }),
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera un buono con dati completi', async () => {
    const result = await generateBuono(LAVORO_FIXTURE)
    expect(result.numero).toMatch(/^BUO-\d{4}-0001$/)
    expect(result.url).toBe('https://example.test/buono.pdf')
  })
})
