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
vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { POST } from '../../src/app/api/admin/reti/[id]/membri/route'

let insertedMembro: Record<string, unknown> | null = null

function mockScenario(opts: {
  ruoloChiamante: string
  giaAdmin?: { id: string } | null
  giaMembro?: { rete_id: string } | null
}) {
  insertedMembro = null
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { ruolo: opts.ruoloChiamante }, error: null }),
          }),
        }),
      }
    }
    if (table === 'reti') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.giaAdmin ?? null, error: null }),
          }),
        }),
      }
    }
    if (table === 'reti_membri') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: opts.giaMembro ?? null, error: null }),
          }),
        }),
        insert: async (data: Record<string, unknown>) => {
          insertedMembro = data
          return { error: null }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/admin/reti/rete-1/membri', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postParams() {
  return { params: Promise.resolve({ id: 'rete-1' }) }
}

describe('POST /api/admin/reti/[id]/membri — force-add', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
  })

  it('ruolo non admin_sistema → 403, nessun insert', async () => {
    mockScenario({ ruoloChiamante: 'titolare' })

    const res = await POST(postRequest({ laboratorio_id: 'lab-2' }), postParams())

    expect(res.status).toBe(403)
    expect(insertedMembro).toBeNull()
  })

  it('campo "laboratorio_id" mancante → 422', async () => {
    mockScenario({ ruoloChiamante: 'admin_sistema' })

    const res = await POST(postRequest({}), postParams())

    expect(res.status).toBe(422)
  })

  it('lab già admin di un\'altra rete → 409, nessun insert', async () => {
    mockScenario({ ruoloChiamante: 'admin_sistema', giaAdmin: { id: 'altra-rete' } })

    const res = await POST(postRequest({ laboratorio_id: 'lab-2' }), postParams())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toContain('già')
    expect(insertedMembro).toBeNull()
  })

  it('lab già membro di un\'altra rete → 409, nessun insert', async () => {
    mockScenario({ ruoloChiamante: 'admin_sistema', giaAdmin: null, giaMembro: { rete_id: 'altra-rete' } })

    const res = await POST(postRequest({ laboratorio_id: 'lab-2' }), postParams())

    expect(res.status).toBe(409)
    expect(insertedMembro).toBeNull()
  })

  it('lab libero → 201, insert con ruolo membro e aggiunto_da_admin valorizzato', async () => {
    mockScenario({ ruoloChiamante: 'admin_sistema', giaAdmin: null, giaMembro: null })

    const res = await POST(postRequest({ laboratorio_id: 'lab-2' }), postParams())

    expect(res.status).toBe(201)
    expect(insertedMembro?.rete_id).toBe('rete-1')
    expect(insertedMembro?.laboratorio_id).toBe('lab-2')
    expect(insertedMembro?.ruolo).toBe('membro')
    expect(insertedMembro?.aggiunto_da_admin).toBe('admin-1')
  })
})
