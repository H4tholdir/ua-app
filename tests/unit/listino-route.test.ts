import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain, type MockChain } from './helpers/supabase-chain-mock'

const { mockFrom, mockGetLabContextWithTimings, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetLabContextWithTimings: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

// GET usa getLabContextWithTimings (Task 9); POST (Task 10) usa getFreshLabContext.
vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
  getFreshLabContext: mockGetFreshLabContext,
}))

vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { GET, POST } from '../../src/app/api/listino/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

let insertedData: Record<string, unknown> | null = null

function mockUtenteRuolo(ruolo: string) {
  insertedData = null
  mockGetFreshLabContext.mockResolvedValue({
    userId: AUTH_USER.id, email: null, ruolo, laboratorioId: LAB_ID, nome: null, cognome: null,
    lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listino') {
      return {
        insert: (data: Record<string, unknown>) => {
          insertedData = data
          return {
            select: () => ({
              single: async () => ({
                data: { id: 'voce-1', codice: data.codice, nome: data.nome, categoria: data.categoria, prezzo_1: data.prezzo_1 },
                error: null,
              }),
            }),
          }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/listino', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VOCE_BODY = {
  nome: 'Corona in zirconia monolitica',
  codice: 'CAD010',
  categoria: 'cad_cam',
  tipo_dispositivo_mdr: 'Corona in zirconia monolitica',
  classe_rischio: 'classe_iia',
  da_conformare: true,
}

describe('POST /api/listino — gating ruolo e campi MDR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ruolo tecnico → 403, nessuna voce creata', async () => {
    mockUtenteRuolo('tecnico')

    const res = await POST(postRequest(VOCE_BODY))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe('Non autorizzato a creare voci di listino')
    expect(insertedData).toBeNull()
  })

  it('ruolo front_desk → 403', async () => {
    mockUtenteRuolo('front_desk')

    const res = await POST(postRequest(VOCE_BODY))

    expect(res.status).toBe(403)
  })

  it('ruolo titolare → 201, campi MDR passati intatti all\'insert', async () => {
    mockUtenteRuolo('titolare')

    const res = await POST(postRequest(VOCE_BODY))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.voce.id).toBe('voce-1')
    expect(insertedData?.tipo_dispositivo_mdr).toBe('Corona in zirconia monolitica')
    expect(insertedData?.classe_rischio).toBe('classe_iia')
    expect(insertedData?.da_conformare).toBe(true)
  })

  it('ruolo admin_rete → 201', async () => {
    mockUtenteRuolo('admin_rete')

    const res = await POST(postRequest(VOCE_BODY))

    expect(res.status).toBe(201)
  })

  it('campo "nome" mancante → 422, anche con ruolo autorizzato (regressione)', async () => {
    mockUtenteRuolo('titolare')

    const res = await POST(postRequest({ ...VOCE_BODY, nome: '' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('nome')
  })
})

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}
const TIMINGS = { authMs: 1, dbMs: 2 }

function mockLabRead(result: { data: unknown; error: unknown }): MockChain {
  const listinoChain = createChain(result)
  mockFrom.mockImplementation((table: string) => {
    if (table === 'listino') return listinoChain
    throw new Error(`Unexpected table: ${table}`)
  })
  return listinoChain
}

function getRequest(url: string) {
  return new Request(url)
}

describe('GET /api/listino', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: TIMINGS })
  })

  it('context null → 401', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: null, timings: { authMs: 1, dbMs: 0 } })
    const res = await GET(getRequest('http://localhost/api/listino?q=zirconia'))
    expect(res.status).toBe(401)
  })

  it('laboratorioId assente → 403', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: { ...CONTEXT, laboratorioId: null }, timings: TIMINGS })
    const res = await GET(getRequest('http://localhost/api/listino?q=zirconia'))
    expect(res.status).toBe(403)
  })

  it('ricerca con match → 200, scoping tenant verificato sugli argomenti esatti di .eq()', async () => {
    const listinoChain = mockLabRead({ data: [], error: null })
    const res = await GET(getRequest('http://localhost/api/listino?q=zirconia'))
    expect(res.status).toBe(200)
    expect(listinoChain.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
  })

  it('ricerca con caratteri riservati PostgREST (virgola/parentesi) → .or() riceve il pattern quotato, non spezzato', async () => {
    const listinoChain = mockLabRead({ data: [], error: null })
    await GET(getRequest(`http://localhost/api/listino?q=${encodeURIComponent('corona, (zirconia)')}`))
    expect(listinoChain.calls).toContainEqual({
      method: 'or',
      args: [
        'nome.ilike."%corona, (zirconia)%",codice.ilike."%corona, (zirconia)%",descrizione.ilike."%corona, (zirconia)%"',
      ],
    })
  })
})
