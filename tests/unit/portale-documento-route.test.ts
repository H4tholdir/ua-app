import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetSignedUrl } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/storage/signed-url', () => ({
  getSignedUrl: mockGetSignedUrl,
}))

import { GET } from '../../src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route'

const TOKEN = 'tok-abc'
const LAB_ID = 'lab-1'
const CLIENTE_ID = 'cli-1'
const LAVORO_ID = 'lav-1'

function makeParams(documento: string) {
  return { params: Promise.resolve({ token: TOKEN, lavoro_id: LAVORO_ID, documento }) }
}

function mockCliente(result: { data: unknown; error: unknown } = {
  data: { id: CLIENTE_ID, laboratorio_id: LAB_ID, portale_token_scade_at: null, laboratori: { stato: 'attivo' } },
  error: null,
}) {
  return {
    select: () => ({
      eq: () => ({
        is: () => ({
          single: async () => result,
        }),
      }),
    }),
  }
}

function mockLavoro(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is']
  for (const m of methods) chain[m] = () => chain
  chain.single = async () => result
  return chain
}

describe('GET /api/portale/[token]/lavori/[lavoro_id]/[documento]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('documento non valido → 400', async () => {
    const res = await GET(new Request('http://x'), makeParams('altro'))
    expect(res.status).toBe(400)
  })

  it('token non valido → 404', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente({ data: null, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('ddc'))
    expect(res.status).toBe(404)
  })

  it('token scaduto → 403', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return mockCliente({
          data: { id: CLIENTE_ID, laboratorio_id: LAB_ID, portale_token_scade_at: '2020-01-01T00:00:00Z', laboratori: { stato: 'attivo' } },
          error: null,
        })
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('ddc'))
    expect(res.status).toBe(403)
  })

  it('lavoro non trovato, non consegnato, o di un altro cliente → 404', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: null, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('ddc'))
    expect(res.status).toBe(404)
  })

  it('buono senza storage path → 404', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID, buono_storage_path: null }, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams('buono'))
    expect(res.status).toBe(404)
  })

  it('buono con storage path → redirect 307 all\'URL firmato + log accesso', async () => {
    let insertPayload: Record<string, unknown> = {}
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID, buono_storage_path: 'lab-1/buoni/2026/BUO-2026-0001.pdf' }, error: null })
      if (table === 'portale_accessi') {
        return { insert: (payload: Record<string, unknown>) => { insertPayload = payload; return Promise.resolve({ error: null }) } }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mockGetSignedUrl.mockResolvedValue('https://storage.test/signed-buono.pdf')

    const res = await GET(new Request('http://x'), makeParams('buono'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://storage.test/signed-buono.pdf')
    expect(mockGetSignedUrl).toHaveBeenCalledWith(expect.anything(), 'documenti', 'lab-1/buoni/2026/BUO-2026-0001.pdf', 300)
    expect(insertPayload.azione).toBe('download_buono')
  })

  it('ddc con storage path → redirect 307 all\'URL firmato', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID }, error: null })
      if (table === 'dichiarazioni_conformita') {
        return {
          select: () => ({ eq: () => ({ neq: () => ({ maybeSingle: async () => ({ data: { storage_path_pdf: 'lab-1/ddc/2026/DDC-2026-0001.pdf' }, error: null }) }) }) }),
        }
      }
      if (table === 'portale_accessi') return { insert: async () => ({ error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    mockGetSignedUrl.mockResolvedValue('https://storage.test/signed-ddc.pdf')

    const res = await GET(new Request('http://x'), makeParams('ddc'))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://storage.test/signed-ddc.pdf')
  })

  it('errore nella generazione dell\'URL firmato → 500', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') return mockCliente()
      if (table === 'lavori') return mockLavoro({ data: { id: LAVORO_ID, buono_storage_path: 'lab-1/buoni/2026/BUO-2026-0001.pdf' }, error: null })
      throw new Error(`Unexpected table: ${table}`)
    })
    mockGetSignedUrl.mockResolvedValue(null)

    const res = await GET(new Request('http://x'), makeParams('buono'))
    expect(res.status).toBe(500)
  })
})
