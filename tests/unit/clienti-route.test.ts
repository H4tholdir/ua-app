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

import { GET } from '../../src/app/api/clienti/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1',
  email: 'a@b.it',
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: 'Anna',
  cognome: 'Bianchi',
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
}
const TIMINGS = { authMs: 1, dbMs: 2 }

const CLIENTI_ROWS = [
  { id: 'cliente-1', studio_nome: 'Studio Rossi', nome: 'Mario', cognome: 'Rossi' },
]

function mockLab(result: { data: unknown; error: unknown }): MockChain {
  const clientiChain = createChain(result)
  mockFrom.mockImplementation((table: string) => {
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
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: TIMINGS })
  })

  // DEVIAZIONE DICHIARATA (spec R2 Task 9 §Step 3): prima un utente
  // soft-deleted (riga `utenti` assente per via del `.is('deleted_at', null)`
  // solo lato getLabContext, non applicato dal lookup manuale precedente)
  // poteva passare o prendere 403; ora getLabContext filtra deleted_at →
  // context null → 401 sempre, anche per soft-deleted.
  it('non autenticato (o soft-deleted) → context null → 401', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: null, timings: { authMs: 1, dbMs: 0 } })
    const res = await GET(req('http://localhost/api/clienti?q=Rossi'))
    expect(res.status).toBe(401)
  })

  it('laboratorio non trovato (context senza laboratorioId) → 403', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({
      context: { ...CONTEXT, laboratorioId: null },
      timings: TIMINGS,
    })
    const res = await GET(req('http://localhost/api/clienti?q=Rossi'))
    expect(res.status).toBe(403)
  })

  it('Server-Timing valorizzato con auth/db/total (wiring withServerTiming + getLabContextWithTimings)', async () => {
    mockLab({ data: CLIENTI_ROWS, error: null })
    const res = await GET(req('http://localhost/api/clienti?q=Rossi'))
    expect(res.headers.get('Server-Timing')).toMatch(/^auth;dur=\d+, db;dur=\d+, total;dur=\d+$/)
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
