import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/cicli/[id]/fasi/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const CICLO_ID = 'ciclo-1'
const params = Promise.resolve({ id: CICLO_ID })
const CONTEXT = {
  userId: AUTH_USER.id, email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/cicli/ciclo-1/fasi', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/cicli/[id]/fasi — salvataggio batch (RPC atomica)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('ciclo di un altro laboratorio → 404 (RPC ritorna { ok: false, error: "Ciclo non trovato" })', async () => {
    mockRpc.mockResolvedValue({ data: { ok: false, error: 'Ciclo non trovato' }, error: null })

    const res = await PATCH(req({ fasi: [{ codice_fase: 'X1', descrizione: 'Test' }] }), { params })

    expect(res.status).toBe(404)
    expect(mockRpc).toHaveBeenCalledWith('salva_fasi_ciclo_atomico', {
      p_ciclo_id: CICLO_ID,
      p_laboratorio_id: LAB_ID,
      p_user_id: AUTH_USER.id,
      p_fasi: [{ codice_fase: 'X1', descrizione: 'Test' }],
    })
  })

  it('fase senza descrizione → 422 (RPC ritorna { ok: false, error: "Fase #1: ..." })', async () => {
    mockRpc.mockResolvedValue({
      data: { ok: false, error: 'Fase #1: campo "descrizione" obbligatorio' },
      error: null,
    })

    const res = await PATCH(req({ fasi: [{ codice_fase: 'X1', descrizione: '' }] }), { params })

    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.error).toMatch(/descrizione/)
  })

  it('2 fasi nuove (senza id) → RPC chiamata con p_fasi = array fasi nuove, 200', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null })

    const fasi = [
      { codice_fase: 'X1', descrizione: 'Prima fase' },
      { codice_fase: 'X2', descrizione: 'Seconda fase' },
    ]
    const res = await PATCH(req({ fasi }), { params })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(mockRpc).toHaveBeenCalledWith('salva_fasi_ciclo_atomico', {
      p_ciclo_id: CICLO_ID,
      p_laboratorio_id: LAB_ID,
      p_user_id: AUTH_USER.id,
      p_fasi: fasi,
    })
  })

  it('fase esistente presente nell\'array (con id) → RPC chiamata con p_fasi contenente l\'id, 200', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null })

    const fasi = [{ id: 'fase-esistente', codice_fase: 'X1', descrizione: 'Descrizione modificata' }]
    const res = await PATCH(req({ fasi }), { params })

    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('salva_fasi_ciclo_atomico', expect.objectContaining({
      p_fasi: fasi,
    }))
  })

  it('fasi rimosse (array vuoto) → RPC chiamata con p_fasi = [], 200 (soft-delete demandato alla RPC)', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true }, error: null })

    const res = await PATCH(req({ fasi: [] }), { params })

    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('salva_fasi_ciclo_atomico', expect.objectContaining({
      p_fasi: [],
    }))
  })

  it('BUG FIX: la RPC ritorna un errore Supabase (es. connessione rifiutata) → 500, messaggio generico, mai { ok: true }', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection refused' } })

    const res = await PATCH(req({ fasi: [{ codice_fase: 'X1', descrizione: 'Prima fase' }] }), { params })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toMatch(/connection refused/)
    expect(body).not.toEqual({ ok: true })
  })
})
