// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockUpload, mockGetPublicUrl, mockGeneraProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockGeneraProgressivo: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }) },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: mockGeneraProgressivo,
}))

import { generateBuono } from '../../src/lib/pdf/generate-buono'

describe('generateBuono', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/buono.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
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

  it('genera un buono con dati completi e salva anche buono_storage_path', async () => {
    let updatePayload: Record<string, unknown> = {}
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'lavori') {
        return {
          update: (payload: Record<string, unknown>) => {
            updatePayload = payload
            return { eq: () => ({ eq: async () => ({ count: 1, error: null }) }) }
          },
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    const result = await generateBuono(LAVORO_FIXTURE)

    expect(result.numero).toMatch(/^BUO-\d{4}-0001$/)
    expect(result.url).toBe('https://example.test/buono.pdf')
    expect(updatePayload.buono_storage_path).toMatch(/^lab-test-001\/buoni\/\d{4}\/BUO-\d{4}-0001\.pdf$/)
  })

  it('non rigenera se lavoro.buono_pdf_url è già valorizzato (idempotenza retry)', async () => {
    const lavoroConBuono = {
      ...LAVORO_FIXTURE,
      buono_pdf_url: 'https://example.test/buono-esistente.pdf',
      buono_numero: 'BUO-2020-0042',
    }

    const result = await generateBuono(lavoroConBuono)

    expect(result).toEqual({ numero: 'BUO-2020-0042', url: 'https://example.test/buono-esistente.pdf' })
    expect(mockGeneraProgressivo).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
  })
})
