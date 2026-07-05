import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockGenerate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockGenerate: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/pdf/generate-scheda-fabbricazione', () => ({
  generateSchedaFabbricazione: mockGenerate,
}))

import { GET } from '../../src/app/api/lavori/[id]/scheda-fabbricazione/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const LAVORO_ID = 'lav-1'

function mockUtenteELavoro(lavoroResult: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }),
          }),
        }),
      }
    }
    if (table === 'lavori') {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'is']
      for (const m of methods) chain[m] = () => chain
      chain.single = async () => lavoroResult
      return chain
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/lavori/[id]/scheda-fabbricazione', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 404 (utente non trovato)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(404)
  })

  it('lavoro non trovato o di un altro lab → 404', async () => {
    mockUtenteELavoro({ data: null, error: null })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(404)
  })

  it('lavoro trovato → 200, Content-Type application/pdf, Content-Disposition con numero lavoro', async () => {
    mockUtenteELavoro({ data: { id: LAVORO_ID, numero_lavoro: 'LAV-2026-0007' }, error: null })
    mockGenerate.mockResolvedValue(Buffer.from('finto-pdf'))

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('LAV-2026-0007')
    expect(mockGenerate).toHaveBeenCalledWith(LAVORO_ID, LAB_ID)
  })

  it('errore nella generazione del PDF → 500, messaggio generico (nessun leak errore grezzo)', async () => {
    mockUtenteELavoro({ data: { id: LAVORO_ID, numero_lavoro: 'LAV-2026-0007' }, error: null })
    mockGenerate.mockRejectedValue(new Error('connection error, socket 5432 refused'))

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).not.toContain('connection error')
    expect(json.error).not.toContain('5432')
  })
})
