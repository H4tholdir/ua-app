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

import { POST } from '../../src/app/api/rete/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

let insertedReteData: Record<string, unknown> | null = null
let insertedMembroData: Record<string, unknown> | null = null

function mockUtenteRuolo(ruolo: string, opts: { existingRete?: { id: string } | null } = {}) {
  insertedReteData = null
  insertedMembroData = null
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
    if (table === 'reti') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.existingRete ?? null, error: null }),
          }),
        }),
        insert: (data: Record<string, unknown>) => {
          insertedReteData = data
          return {
            select: () => ({
              single: async () => ({
                data: {
                  id: 'rete-1',
                  nome: data.nome,
                  admin_laboratorio_id: data.admin_laboratorio_id,
                  created_at: '2026-07-03T00:00:00Z',
                  updated_at: '2026-07-03T00:00:00Z',
                },
                error: null,
              }),
            }),
          }
        },
      }
    }
    if (table === 'reti_membri') {
      return {
        insert: async (data: Record<string, unknown>) => {
          insertedMembroData = data
          return { error: null }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/rete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/rete — gating ruolo e guard 1-rete-per-lab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('ruolo tecnico → 403, nessuna rete creata', async () => {
    mockUtenteRuolo('tecnico')

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))

    expect(res.status).toBe(403)
    expect(insertedReteData).toBeNull()
  })

  it('ruolo front_desk → 403', async () => {
    mockUtenteRuolo('front_desk')

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))

    expect(res.status).toBe(403)
  })

  it('ruolo titolare senza rete propria → 201, insert reti + reti_membri con ruolo admin_rete', async () => {
    mockUtenteRuolo('titolare', { existingRete: null })

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.rete.id).toBe('rete-1')
    expect(insertedReteData?.nome).toBe('Rete Toscana')
    expect(insertedReteData?.admin_laboratorio_id).toBe(LAB_ID)
    expect(insertedMembroData?.rete_id).toBe('rete-1')
    expect(insertedMembroData?.laboratorio_id).toBe(LAB_ID)
    expect(insertedMembroData?.ruolo).toBe('admin_rete')
  })

  it('ruolo admin_rete senza rete propria → 201', async () => {
    mockUtenteRuolo('admin_rete', { existingRete: null })

    const res = await POST(postRequest({ nome: 'Rete Toscana' }))

    expect(res.status).toBe(201)
  })

  it('lab già admin di una rete → 409, nessuna nuova rete creata', async () => {
    mockUtenteRuolo('titolare', { existingRete: { id: 'rete-esistente' } })

    const res = await POST(postRequest({ nome: 'Seconda rete' }))
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe('Il laboratorio amministra già una rete')
    expect(insertedReteData).toBeNull()
  })

  it('campo "nome" mancante → 422, anche con ruolo autorizzato e nessuna rete esistente (regressione)', async () => {
    mockUtenteRuolo('titolare', { existingRete: null })

    const res = await POST(postRequest({ nome: '' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('nome')
  })
})
