import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/lavori/route'
import { PATCH } from '../../src/app/api/lavori/[id]/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'

function postReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

function patchReq(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

const patchParams = Promise.resolve({ id: LAVORO_ID })

const BASE_BODY = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-01',
}

describe('POST /api/lavori — validazione enum tipo_dispositivo (B2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
    mockRpc.mockResolvedValue({ data: 1, error: null })
  })

  function setupTables() {
    const insertSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      }
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      }
      if (table === 'lavori') {
        return {
          insert: (row: unknown) => {
            insertSpy(row)
            return { select: () => ({ single: async () => ({ data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' }, error: null }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    return insertSpy
  }

  it('tipo_dispositivo granulare (corona_zirconia, non un macro) → 422', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(postReq({ ...BASE_BODY, tipo_dispositivo: 'corona_zirconia' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('tipo_dispositivo non valido')
  })

  it('tipo_dispositivo sconosciuto (xyz) → 422', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(postReq({ ...BASE_BODY, tipo_dispositivo: 'xyz' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('tipo_dispositivo non valido')
  })

  it('tipo_dispositivo bite_splint (macro valido) → passa la validazione, arriva all\'INSERT', async () => {
    const insertSpy = setupTables()

    const res = await POST(postReq({ ...BASE_BODY, tipo_dispositivo: 'bite_splint' }))

    expect(res.status).toBe(201)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_dispositivo: 'bite_splint' })
    )
  })
})

describe('PATCH /api/lavori/[id] — validazione enum tipo_dispositivo (B2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  function buildMockFrom(updateSpy: (payload: Record<string, unknown>) => void) {
    return vi.fn((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      }
      if (table === 'lavori') {
        return {
          select: (cols: string) => {
            if (cols === 'incluso_in_fattura') {
              return { eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { incluso_in_fattura: false }, error: null }) }) }) }) }
            }
            return { eq: () => ({ eq: () => ({ single: async () => ({ data: { id: LAVORO_ID, numero_lavoro: 'L-001', stato: 'in_lavorazione', updated_at: '2026-07-05T00:00:00Z' }, error: null }) }) }) }
          },
          update: (payload: Record<string, unknown>) => {
            updateSpy(payload)
            return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: LAVORO_ID, numero_lavoro: 'L-001', stato: 'in_lavorazione', updated_at: '2026-07-05T00:00:00Z' }, error: null }) }) }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  }

  it('body con tipo_dispositivo: xyz → 422', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom(updateSpy))

    const res = await PATCH(patchReq({ tipo_dispositivo: 'xyz' }), { params: patchParams })
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('tipo_dispositivo non valido')
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('body senza tipo_dispositivo → nessuna validazione scatta, 200', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom(updateSpy))

    const res = await PATCH(patchReq({ descrizione: 'Corona ceramica' }), { params: patchParams })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ descrizione: 'Corona ceramica' })
    )
  })
})
