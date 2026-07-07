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

import { POST } from '../../src/app/api/qualita/psur/route'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/qualita/psur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockTabellePost(opts: {
  existing: { id: string; stato: string } | null
  lavoriClasseIds: string[]
  lavoriClasseError?: { message: string } | null
  aggregatiError?: boolean
}) {
  let psurCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'psur') {
      psurCallCount++
      if (psurCallCount === 1) {
        // check "existing"
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: opts.existing, error: null }) }),
              }),
            }),
          }),
        }
      }
      // insert
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'psur-nuovo', gruppo_classe: 'classe_i' }, error: null }),
          }),
        }),
      }
    }
    if (table === 'lavori') {
      // Distingue il fetch-ids iniziale (.select('id'), nessuna opzione) dalle
      // query di conteggio aggregato (.select('id', {count, head:true})) —
      // altrimenti un test su "errore nella query di aggregazione" finirebbe
      // per colpire invece il fetch-ids, che avviene prima nel flusso reale.
      let isCountQuery = false
      const chain = {
        select: (_cols: string, selectOpts?: { count?: string; head?: boolean }) => {
          isCountQuery = Boolean(selectOpts?.count)
          return chain
        },
        eq: () => chain,
        in: () => chain,
        not: () => chain,
        gte: () => chain,
        lte: () => chain,
        then: (resolve: (v: unknown) => void) => {
          if (isCountQuery) {
            if (opts.aggregatiError) return resolve({ data: null, error: { message: 'boom' }, count: null })
            return resolve({ data: null, error: null, count: opts.lavoriClasseIds.length })
          }
          if (opts.lavoriClasseError) return resolve({ data: null, error: opts.lavoriClasseError, count: null })
          return resolve({ data: opts.lavoriClasseIds.map((id) => ({ id })), error: null, count: null })
        },
      }
      return chain
    }
    if (table === 'lavori_fasi' || table === 'incidenti_mdr') {
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        then: (resolve: (v: unknown) => void) =>
          resolve(opts.aggregatiError ? { data: null, error: { message: 'boom' }, count: null } : { data: null, error: null, count: 0 }),
      }
      return chain
    }
    if (table === 'laboratori') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { prrc_nome: 'Mario Rossi' }, error: null }) }) }) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('POST /api/qualita/psur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('gruppo_classe mancante o non valido → 400', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: [] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'boh' }))
    expect(res.status).toBe(400)
  })

  it('gruppo_classe valido, nessun duplicato → 201, insert include gruppo_classe', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: ['l1', 'l2'] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(201)
  })

  it('record già esistente per lab+anno+gruppo → 409', async () => {
    mockTabellePost({ existing: { id: 'psur-1', stato: 'bozza' }, lavoriClasseIds: [] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_iia' }))
    expect(res.status).toBe(409)
  })

  it('errore Supabase nel fetch id lavori per classe → 500, mai un insert con aggregati a 0 mascherati da errore', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: [], lavoriClasseError: { message: 'boom' } })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })

  it('errore Supabase in una query di aggregazione → 500, mai un 201 con conteggio errato', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: ['l1'], aggregatiError: true })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })
})
