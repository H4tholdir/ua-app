import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
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

import { GET } from '../../src/app/api/fornitori/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

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
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }),
          }),
        }),
      }
    }
    if (table === 'fornitori') {
      return fornitoriQueryChain(fornitoriResult)
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('GET /api/fornitori', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()

    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
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

  it('errore Supabase su lookup laboratorio → 500 (non 403 mascherato)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: { message: 'connection error' } }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await GET()

    expect(res.status).toBe(500)
  })
})
