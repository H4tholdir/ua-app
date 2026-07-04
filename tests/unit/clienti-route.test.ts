import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain, type MockChain } from './helpers/supabase-chain-mock'

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

import { GET } from '../../src/app/api/clienti/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

const CLIENTI_ROWS = [
  { id: 'cliente-1', studio_nome: 'Studio Rossi', nome: 'Mario', cognome: 'Rossi' },
]

function mockLab(result: { data: unknown; error: unknown }): MockChain {
  const clientiChain = createChain(result)
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    if (table === 'clienti') return clientiChain
    throw new Error(`Unexpected table: ${table}`)
  })
  return clientiChain
}

function req(url: string) {
  return new Request(url)
}

describe('GET /api/clienti', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(req('http://localhost/api/clienti?q=Rossi'))
    expect(res.status).toBe(401)
  })

  it('ricerca con match → 200, scoping tenant verificato sugli argomenti esatti di .eq()', async () => {
    const clientiChain = mockLab({ data: CLIENTI_ROWS, error: null })
    const res = await GET(req('http://localhost/api/clienti?q=Rossi'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.clienti).toEqual(CLIENTI_ROWS)
    expect(clientiChain.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
    expect(clientiChain.calls).toContainEqual({ method: 'is', args: ['deleted_at', null] })
  })

  it('ricerca con caratteri riservati PostgREST (virgola/parentesi) → .or() riceve il pattern quotato, non spezzato', async () => {
    const clientiChain = mockLab({ data: [], error: null })
    await GET(req(`http://localhost/api/clienti?q=${encodeURIComponent('Rossi, (Studio)')}`))
    expect(clientiChain.calls).toContainEqual({
      method: 'or',
      args: [
        'cognome.ilike."%Rossi, (Studio)%",nome.ilike."%Rossi, (Studio)%",studio_nome.ilike."%Rossi, (Studio)%"',
      ],
    })
  })

  it('errore Supabase → 500', async () => {
    mockLab({ data: null, error: { message: 'connection error' } })
    const res = await GET(req('http://localhost/api/clienti?q=Rossi'))
    expect(res.status).toBe(500)
  })
})
