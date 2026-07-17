import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain, type MockChain } from './helpers/supabase-chain-mock'

const { mockGetLabContextWithTimings, mockFrom } = vi.hoisted(() => ({
  mockGetLabContextWithTimings: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/fasi-produzione/ricerca/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: null,
}
const TIMINGS = { authMs: 1, dbMs: 2 }

const ROWS = [
  { codice_fase: 'OL10', descrizione: 'Disegno modelli progettazione', attrezzatura: null, controllo_misura: null, esito_atteso: null, materiali_nota: null, obbligatoria: true },
]

function mockLab(result: { data: unknown; error: unknown }): MockChain {
  const fasiChain = createChain(result)
  mockFrom.mockImplementation((table: string) => {
    if (table === 'fasi_produzione') return fasiChain
    throw new Error(`Unexpected table: ${table}`)
  })
  return fasiChain
}

function req(url: string) { return new Request(url) }

describe('GET /api/fasi-produzione/ricerca', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: TIMINGS })
  })

  it('non autenticato (context null) → 401', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: null, timings: { authMs: 1, dbMs: 0 } })
    const res = await GET(req('http://localhost/api/fasi-produzione/ricerca?q=disegno'))
    expect(res.status).toBe(401)
  })

  it('match trovato → 200, solo campi copiabili (mai id/ciclo_id), scoping tenant verificato', async () => {
    const fasiChain = mockLab({ data: ROWS, error: null })
    const res = await GET(req('http://localhost/api/fasi-produzione/ricerca?q=disegno'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.fasi).toEqual(ROWS)
    expect(json.fasi[0]).not.toHaveProperty('id')
    expect(json.fasi[0]).not.toHaveProperty('ciclo_id')
    expect(fasiChain.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
    expect(fasiChain.calls).toContainEqual({ method: 'is', args: ['deleted_at', null] })
  })

  it('ricerca con virgola nel testo → .or() riceve il pattern quotato, non spezzato', async () => {
    const fasiChain = mockLab({ data: [], error: null })
    await GET(req(`http://localhost/api/fasi-produzione/ricerca?q=${encodeURIComponent('OL01, OL02')}`))
    expect(fasiChain.calls).toContainEqual({
      method: 'or',
      args: ['codice_fase.ilike."%OL01, OL02%",descrizione.ilike."%OL01, OL02%"'],
    })
  })

  it('nessun match → 200, lista vuota', async () => {
    mockLab({ data: [], error: null })
    const res = await GET(req('http://localhost/api/fasi-produzione/ricerca?q=xxxxx'))
    const json = await res.json()
    expect(json.fasi).toEqual([])
  })
})
