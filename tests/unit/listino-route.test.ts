import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { POST } from '../../src/app/api/listino/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

let insertedData: Record<string, unknown> | null = null

function mockUtenteRuolo(ruolo: string) {
  insertedData = null
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { laboratorio_id: LAB_ID, ruolo }, error: null }),
          }),
        }),
      }
    }
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
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
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
