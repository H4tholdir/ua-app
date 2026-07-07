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

import { GET, POST } from '../../src/app/api/cicli/route'

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

function postReq(body: unknown) {
  return new Request('http://localhost/api/cicli', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

function crossOriginPostReq(body: unknown) {
  return new Request('http://localhost/api/cicli', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://evil.com', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/cicli', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  function mockInsert(result: { data: unknown; error: unknown }) {
    const insertCalls: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      }
      if (table === 'cicli_produzione') {
        return {
          insert: (payload: unknown) => {
            insertCalls.push(payload)
            return { select: () => ({ single: async () => result }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    return insertCalls
  }

  function setupMockForValidation() {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  }

  it('nome mancante → 400', async () => {
    setupMockForValidation()
    const res = await POST(postReq({ codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    expect(res.status).toBe(400)
  })

  it('codice mancante → 400', async () => {
    setupMockForValidation()
    const res = await POST(postReq({ nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa' }))
    expect(res.status).toBe(400)
  })

  it('tipo_dispositivo mancante → 400', async () => {
    setupMockForValidation()
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1' }))
    expect(res.status).toBe(400)
  })

  it('tipo_dispositivo fuori dalla lista canonica → 400', async () => {
    setupMockForValidation()
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Slug non valido' }))
    expect(res.status).toBe(400)
  })

  it('classe_rischio non valida → 400', async () => {
    setupMockForValidation()
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa', classe_rischio: 'classe_x' }))
    expect(res.status).toBe(400)
  })

  it('happy path senza classe_rischio (facoltativa) → 201, created_by/updated_by = utente corrente', async () => {
    const insertCalls = mockInsert({
      data: { id: 'ciclo-nuovo', codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null },
      error: null,
    })
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.ciclo).toEqual({ id: 'ciclo-nuovo', codice: 'C1', nome: 'Corona ceramica', tipo_dispositivo: 'Protesi fissa', classe_rischio: null })
    expect(insertCalls).toHaveLength(1)
    expect(insertCalls[0]).toMatchObject({
      created_by: AUTH_USER.id,
      updated_by: AUTH_USER.id,
      attivo: true,
    })
  })

  it('happy path con classe_rischio → 201', async () => {
    mockInsert({
      data: { id: 'ciclo-nuovo', codice: 'C2', nome: 'Corona ceramica su impianto', tipo_dispositivo: 'Protesi fissa', classe_rischio: 'classe_iia' },
      error: null,
    })
    const res = await POST(postReq({ nome: 'Corona ceramica su impianto', codice: 'C2', tipo_dispositivo: 'Protesi fissa', classe_rischio: 'classe_iia' }))
    expect(res.status).toBe(201)
  })

  it('codice duplicato nello stesso laboratorio (23505) → 409', async () => {
    mockInsert({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } })
    const res = await POST(postReq({ nome: 'Corona ceramica', codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toBe('Esiste già un ciclo con questo codice in questo laboratorio')
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(postReq({ nome: 'X', codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    expect(res.status).toBe(401)
  })

  it('origin cross-site (CSRF) → 403', async () => {
    const res = await POST(crossOriginPostReq({ nome: 'X', codice: 'C1', tipo_dispositivo: 'Protesi fissa' }))
    expect(res.status).toBe(403)
  })
})
