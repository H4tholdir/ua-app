import { describe, it, expect, vi, beforeEach } from 'vitest'

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
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/cicli/[id]/fasi/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const CICLO_ID = 'ciclo-1'
const params = Promise.resolve({ id: CICLO_ID })

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/cicli/ciclo-1/fasi', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

/** Costruisce un mockFrom con: ciclo esistente per il lab, fasi esistenti date,
 *  e spy separati per insert/update/delete su fasi_produzione. */
function setupTables({
  cicloOwned = true,
  existingFasi = [] as Array<{ id: string; codice_fase: string }>,
  existingFasiError = null as { message: string } | null,
  insertSpy = vi.fn(),
  updateSpy = vi.fn(),
} = {}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'cicli_produzione') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: cicloOwned ? { id: CICLO_ID, laboratorio_id: LAB_ID } : null, error: null }) }) }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
    }
    if (table === 'fasi_produzione') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ is: () => Promise.resolve({ data: existingFasiError ? null : existingFasi, error: existingFasiError }) }) }) }),
        insert: (rows: unknown[]) => { insertSpy(rows); return Promise.resolve({ error: null }) },
        update: (payload: Record<string, unknown>) => {
          updateSpy(payload)
          // .update(...).eq('id', ...).eq('laboratorio_id', ...) — 2 livelli di chain
          return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  return { insertSpy, updateSpy }
}

describe('PATCH /api/cicli/[id]/fasi — salvataggio batch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('ciclo di un altro laboratorio → 404', async () => {
    setupTables({ cicloOwned: false })
    const res = await PATCH(req({ fasi: [{ codice_fase: 'X1', descrizione: 'Test' }] }), { params })
    expect(res.status).toBe(404)
  })

  it('fase senza descrizione → 422, nessuna scrittura', async () => {
    const { insertSpy } = setupTables({ existingFasi: [] })
    const res = await PATCH(req({ fasi: [{ codice_fase: 'X1', descrizione: '' }] }), { params })
    expect(res.status).toBe(422)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('2 fasi nuove (senza id) → 2 insert con ciclo_id/laboratorio_id/ordine/updated_by corretti', async () => {
    const { insertSpy } = setupTables({ existingFasi: [] })
    const res = await PATCH(req({
      fasi: [
        { codice_fase: 'X1', descrizione: 'Prima fase' },
        { codice_fase: 'X2', descrizione: 'Seconda fase' },
      ],
    }), { params })

    expect(res.status).toBe(200)
    expect(insertSpy).toHaveBeenCalledWith([
      expect.objectContaining({ ciclo_id: CICLO_ID, laboratorio_id: LAB_ID, ordine: 1, codice_fase: 'X1', updated_by: AUTH_USER.id }),
      expect.objectContaining({ ciclo_id: CICLO_ID, laboratorio_id: LAB_ID, ordine: 2, codice_fase: 'X2', updated_by: AUTH_USER.id }),
    ])
  })

  it('fase esistente presente nell\'array → update, non insert', async () => {
    const { insertSpy, updateSpy } = setupTables({ existingFasi: [{ id: 'fase-esistente', codice_fase: 'X1' }] })
    const res = await PATCH(req({
      fasi: [{ id: 'fase-esistente', codice_fase: 'X1', descrizione: 'Descrizione modificata' }],
    }), { params })

    expect(res.status).toBe(200)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ descrizione: 'Descrizione modificata', ordine: 1, updated_by: AUTH_USER.id }))
  })

  it('fase esistente NON presente nell\'array → soft delete (updateSpy con deleted_at)', async () => {
    const { updateSpy } = setupTables({ existingFasi: [{ id: 'fase-rimossa', codice_fase: 'X0' }] })
    const res = await PATCH(req({ fasi: [] }), { params })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ deleted_at: expect.any(String), updated_by: AUTH_USER.id }))
  })

  it('fase esistente con codice_fase modificato → il payload di update include il nuovo codice_fase', async () => {
    const { insertSpy, updateSpy } = setupTables({ existingFasi: [{ id: 'fase-esistente', codice_fase: 'X1' }] })
    const res = await PATCH(req({
      fasi: [{ id: 'fase-esistente', codice_fase: 'X1-BIS', descrizione: 'Descrizione invariata' }],
    }), { params })

    expect(res.status).toBe(200)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ codice_fase: 'X1-BIS' }))
  })

  it('errore nella query delle fasi esistenti → 500, nessuna scrittura', async () => {
    const { insertSpy, updateSpy } = setupTables({ existingFasiError: { message: 'connection refused' } })
    const res = await PATCH(req({
      fasi: [{ codice_fase: 'X1', descrizione: 'Prima fase' }],
    }), { params })

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).not.toMatch(/connection refused/)
    expect(insertSpy).not.toHaveBeenCalled()
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
