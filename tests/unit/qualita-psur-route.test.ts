import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { GET } from '../../src/app/api/qualita/psur/route'

const LAB_ID = 'lab-1'

function mockTabelle(opts: {
  psurRows: Array<Record<string, unknown>>
  lavoriClassi: Array<{ classe_rischio: string }>
  lavoriClassiError?: { message: string } | null
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'psur') {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: opts.psurRows, error: null }),
          }),
        }),
      }
    }
    if (table === 'lavori') {
      return {
        select: () => ({
          eq: async () =>
            opts.lavoriClassiError
              ? { data: null, error: opts.lavoriClassiError }
              : { data: opts.lavoriClassi, error: null },
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('GET /api/qualita/psur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('nessun lavoro → gruppiRilevati vuoto, nonClassificabili 0', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [] })
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.gruppiRilevati).toEqual([])
    expect(json.nonClassificabili).toBe(0)
  })

  it('lavori di classe mista → gruppi rilevati in ordine fisso', async () => {
    mockTabelle({
      psurRows: [],
      lavoriClassi: [{ classe_rischio: 'classe_iii' }, { classe_rischio: 'classe_i' }],
    })
    const res = await GET()
    const json = await res.json()
    expect(json.gruppiRilevati).toEqual(['classe_i', 'classe_iib_iii'])
  })

  it('classe_rischio non mappata → mai scartata, contata in nonClassificabili', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [{ classe_rischio: 'boh' }] })
    const res = await GET()
    const json = await res.json()
    expect(json.gruppiRilevati).toEqual([])
    expect(json.nonClassificabili).toBe(1)
  })

  it('errore Supabase su query classi rischio → 500, mai un 200 con dati parziali', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [], lavoriClassiError: { message: 'boom' } })
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
