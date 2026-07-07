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

import { PATCH, DELETE } from '../../src/app/api/cicli/[id]/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const CICLO_ID = 'ciclo-1'
const params = Promise.resolve({ id: CICLO_ID })

function patchReq(body: unknown) {
  return new Request(`http://localhost/api/cicli/${CICLO_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

function mockUpdate(result: { data: unknown; error: unknown }) {
  const updateCalls: unknown[] = []
  const eqCalls: unknown[][] = []
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
    }
    if (table === 'cicli_produzione') {
      return {
        update: (payload: unknown) => {
          updateCalls.push(payload)
          return {
            eq: (...args: unknown[]) => {
              eqCalls.push(args)
              return {
                eq: (...args2: unknown[]) => {
                  eqCalls.push(args2)
                  return { select: () => ({ single: async () => result }) }
                },
              }
            },
          }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  return { updateCalls, eqCalls }
}

describe('PATCH /api/cicli/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('aggiornamento parziale (solo nome) → 200', async () => {
    mockUpdate({
      data: { id: CICLO_ID, codice: 'C1', nome: 'Nuovo nome', tipo_dispositivo: 'Protesi fissa', classe_rischio: null, attivo: true },
      error: null,
    })
    const res = await PATCH(patchReq({ nome: 'Nuovo nome' }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ciclo.nome).toBe('Nuovo nome')
  })

  it('tipo_dispositivo fuori dalla lista canonica → 400', async () => {
    const res = await PATCH(patchReq({ tipo_dispositivo: 'Slug non valido' }), { params })
    expect(res.status).toBe(400)
  })

  it('classe_rischio non valida → 400', async () => {
    const res = await PATCH(patchReq({ classe_rischio: 'classe_x' }), { params })
    expect(res.status).toBe(400)
  })

  it('attivo non booleano → 400', async () => {
    const res = await PATCH(patchReq({ attivo: 'sì' }), { params })
    expect(res.status).toBe(400)
  })

  it('ciclo non trovato o di altro laboratorio (PGRST116) → 404', async () => {
    const { eqCalls } = mockUpdate({ data: null, error: { code: 'PGRST116', message: 'no rows' } })
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(404)
    expect(eqCalls[0]).toEqual(['id', CICLO_ID])
    expect(eqCalls[1]).toEqual(['laboratorio_id', LAB_ID])
  })

  it('codice duplicato (23505) → 409', async () => {
    mockUpdate({ data: null, error: { code: '23505', message: 'duplicate' } })
    const res = await PATCH(patchReq({ codice: 'GIA-USATO' }), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toBe('Esiste già un ciclo con questo codice in questo laboratorio')
  })

  it('attivo:false disattiva il ciclo → 200', async () => {
    mockUpdate({
      data: { id: CICLO_ID, codice: 'C1', nome: 'Ciclo X', tipo_dispositivo: 'Protesi fissa', classe_rischio: null, attivo: false },
      error: null,
    })
    const res = await PATCH(patchReq({ attivo: false }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ciclo.attivo).toBe(false)
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(401)
  })

  it('campi non ammessi (laboratorio_id, created_by, id) vengono ignorati dal payload di update', async () => {
    const { updateCalls } = mockUpdate({
      data: { id: CICLO_ID, codice: 'C1', nome: 'Nuovo nome', tipo_dispositivo: 'Protesi fissa', classe_rischio: null, attivo: true },
      error: null,
    })
    const res = await PATCH(
      patchReq({
        nome: 'Nuovo nome',
        laboratorio_id: 'other-lab',
        created_by: 'someone-else',
        id: 'altro-id',
      }),
      { params }
    )
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(1)
    expect(updateCalls[0]).toEqual({ nome: 'Nuovo nome', updated_by: AUTH_USER.id })
    expect(updateCalls[0]).not.toHaveProperty('laboratorio_id')
    expect(updateCalls[0]).not.toHaveProperty('created_by')
    expect(updateCalls[0]).not.toHaveProperty('id')
  })
})

function deleteReq() {
  return new Request(`http://localhost/api/cicli/${CICLO_ID}`, {
    method: 'DELETE',
    headers: { origin: 'http://localhost', host: 'localhost' },
  })
}

describe('DELETE /api/cicli/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  function mockDeleteFlow(opts: {
    cicloEsiste?: boolean
    countLavori?: number
    countError?: unknown
    listinoUpdateError?: unknown
    softDeleteError?: unknown
  }) {
    const {
      cicloEsiste = true,
      countLavori = 0,
      countError = null,
      listinoUpdateError = null,
      softDeleteError = null,
    } = opts

    const softDeleteCalls: unknown[] = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      }
      if (table === 'cicli_produzione') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({
            data: cicloEsiste ? { id: CICLO_ID } : null,
            error: cicloEsiste ? null : { code: 'PGRST116' },
          }) }) }) }) }),
          update: (payload: unknown) => {
            softDeleteCalls.push(payload)
            return { eq: () => ({ eq: () => Promise.resolve({ error: softDeleteError }) }) }
          },
        }
      }
      if (table === 'lavori') {
        return { select: () => ({ eq: (): unknown => ({ eq: () => Promise.resolve({ count: countLavori, error: countError }) }) }) }
      }
      if (table === 'listino') {
        return { update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: listinoUpdateError }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    return { softDeleteCalls }
  }

  it('ciclo non referenziato da nessun lavoro → 200, listino.ciclo_id nullato, soft-delete', async () => {
    mockDeleteFlow({ countLavori: 0 })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
  })

  it('ciclo referenziato da 3 lavori → 409, nessun soft-delete eseguito', async () => {
    const { softDeleteCalls } = mockDeleteFlow({ countLavori: 3 })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error).toBe('Ciclo in uso da 3 lavori — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.')
    expect(softDeleteCalls).toHaveLength(0)
  })

  it('errore nella query di conteggio lavori → 500, nessun soft-delete eseguito', async () => {
    const { softDeleteCalls } = mockDeleteFlow({ countError: { message: 'connection error' } })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/connection error/i)
    expect(softDeleteCalls).toHaveLength(0)
  })

  it('errore nell\'aggiornamento del listino → 500, nessun soft-delete eseguito', async () => {
    const { softDeleteCalls } = mockDeleteFlow({ countLavori: 0, listinoUpdateError: { message: 'connection error' } })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/connection error/i)
    expect(softDeleteCalls).toHaveLength(0)
  })

  it('ciclo referenziato da 1 lavoro → messaggio singolare corretto', async () => {
    mockDeleteFlow({ countLavori: 1 })
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(json.error).toBe('Ciclo in uso da 1 lavoro — impossibile eliminare. Disattivalo per nasconderlo dalle nuove assegnazioni.')
  })

  it('ciclo non trovato o di altro laboratorio → 404', async () => {
    mockDeleteFlow({ cicloEsiste: false })
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(404)
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(401)
  })
})
