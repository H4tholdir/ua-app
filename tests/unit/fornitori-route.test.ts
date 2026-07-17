import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetLabContextWithTimings, mockFrom } = vi.hoisted(() => ({
  mockGetLabContextWithTimings: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

import { GET } from '../../src/app/api/fornitori/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: null,
}
const TIMINGS = { authMs: 1, dbMs: 2 }

const FORNITORI_ROWS = [
  { id: 'forn-1', ragione_sociale: 'Dental Depot SRL', telefono: '0512345678', email: 'ordini@dentaldepot.it' },
  { id: 'forn-2', ragione_sociale: 'Amann Girrbach Italia', telefono: null, email: null },
]

function fornitoriQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'order', 'limit']
  for (const m of methods) {
    chain[m] = () => chain
  }
  chain.then = (resolve: (v: unknown) => void) => resolve(result)
  return chain
}

function mockLab(fornitoriResult: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'fornitori') {
      return fornitoriQueryChain(fornitoriResult)
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('GET /api/fornitori', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: TIMINGS })
  })

  it('context null (non autenticato / soft-deleted) → 401', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: null, timings: { authMs: 1, dbMs: 0 } })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({
      context: { ...CONTEXT, laboratorioId: null },
      timings: TIMINGS,
    })

    const res = await GET()

    expect(res.status).toBe(403)
  })

  it('lab con fornitori attivi → 200, ragione_sociale mappata su "nome"', async () => {
    mockLab({ data: FORNITORI_ROWS, error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.fornitori).toEqual([
      { id: 'forn-1', nome: 'Dental Depot SRL', telefono: '0512345678', email: 'ordini@dentaldepot.it' },
      { id: 'forn-2', nome: 'Amann Girrbach Italia', telefono: null, email: null },
    ])
  })

  it('lab senza fornitori → 200, lista vuota', async () => {
    mockLab({ data: [], error: null })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.fornitori).toEqual([])
  })

  it('errore Supabase su lookup fornitori → 500, messaggio generico (nessun leak errore grezzo)', async () => {
    mockLab({ data: null, error: { message: 'connection error, socket 5432 refused' } })

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).not.toContain('connection error')
    expect(json.error).not.toContain('5432')
  })

  // DEVIAZIONE DICHIARATA (spec R2 Task 9): errore DB nel lookup laboratorio
  // era 500 quando il route handler leggeva 'utenti' direttamente; ora il
  // lookup vive in getLabContext (fail-closed, loggato) e collassa su
  // context null → 401.
  it('errore su lookup laboratorio (fail-closed in getLabContext) → 401', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: null, timings: { authMs: 1, dbMs: 2 } })

    const res = await GET()

    expect(res.status).toBe(401)
  })
})
