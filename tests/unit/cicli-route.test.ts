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

import { GET } from '../../src/app/api/cicli/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

const CICLI_ROWS = [
  { id: 'ciclo-1', codice: 'CNC.TitCer', nome: 'CNC Corona in titanio-ceramica', tipo_dispositivo: 'Protesi fissa' },
  { id: 'ciclo-2', codice: 'CNC.TitCerImp', nome: 'CNC Corona in titanio-ceramica su impianto', tipo_dispositivo: 'Protesi fissa' },
]

function mockLab(cicliResult: { data: unknown; error: unknown }): MockChain {
  const cicliChain = createChain(cicliResult)
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'cicli_produzione') return cicliChain
    throw new Error(`Unexpected table: ${table}`)
  })
  return cicliChain
}

function req(url: string) {
  return new Request(url)
}

describe('GET /api/cicli', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    expect(res.status).toBe(403)
  })

  it('ricerca con match → 200, lista cicli, scoping tenant verificato sugli argomenti esatti di .eq()', async () => {
    const cicliChain = mockLab({ data: CICLI_ROWS, error: null })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.cicli).toEqual(CICLI_ROWS)
    expect(cicliChain.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
    expect(cicliChain.calls).toContainEqual({ method: 'is', args: ['deleted_at', null] })
  })

  it('ricerca con caratteri riservati PostgREST (virgola/parentesi) → .or() riceve il pattern quotato, non spezzato', async () => {
    const cicliChain = mockLab({ data: [], error: null })
    await GET(req(`http://localhost/api/cicli?q=${encodeURIComponent('Rossi, (test)')}`))
    expect(cicliChain.calls).toContainEqual({
      method: 'or',
      args: ['codice.ilike."%Rossi, (test)%",nome.ilike."%Rossi, (test)%"'],
    })
  })

  it('nessun match → 200, lista vuota', async () => {
    mockLab({ data: [], error: null })
    const res = await GET(req('http://localhost/api/cicli?q=xxxxx'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.cicli).toEqual([])
  })

  it('errore Supabase → 500, messaggio generico', async () => {
    mockLab({ data: null, error: { message: 'connection error, socket 5432 refused' } })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toContain('5432')
  })

  it('errore su lookup laboratorio → 500 (non 403 mascherato)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'db down' } }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
    const res = await GET(req('http://localhost/api/cicli?q=CNC'))
    expect(res.status).toBe(500)
  })
})
