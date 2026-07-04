import { describe, it, expect, vi, beforeEach } from 'vitest'

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
vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { POST } from '../../src/app/api/rete/inviti/[token]/accept/route'

function mockUtenteRuolo(ruolo: string) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { ruolo }, error: null }),
          }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function acceptRequest() {
  return new Request('http://localhost/api/rete/inviti/tok-123/accept', { method: 'POST' })
}

function acceptParams() {
  return { params: Promise.resolve({ token: 'tok-123' }) }
}

describe('POST /api/rete/inviti/[token]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockUtenteRuolo('titolare')

    const res = await POST(acceptRequest(), acceptParams())

    expect(res.status).toBe(401)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('ruolo tecnico → 403, RPC mai chiamata', async () => {
    mockUtenteRuolo('tecnico')

    const res = await POST(acceptRequest(), acceptParams())

    expect(res.status).toBe(403)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('ruolo titolare, RPC ok=true → 200, ritorna rete_id', async () => {
    mockUtenteRuolo('titolare')
    mockRpc.mockResolvedValue({ data: { ok: true, rete_id: 'rete-9' }, error: null })

    const res = await POST(acceptRequest(), acceptParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rete_id).toBe('rete-9')
    expect(mockRpc).toHaveBeenCalledWith('accept_invito_rete_atomic', {
      p_token_hash: expect.any(String),
      p_user_id: 'user-1',
    })
  })

  it('ruolo admin_rete, RPC ok=false → 422 con messaggio della RPC', async () => {
    mockUtenteRuolo('admin_rete')
    mockRpc.mockResolvedValue({ data: { ok: false, error: "Il laboratorio è già in un'altra rete" }, error: null })

    const res = await POST(acceptRequest(), acceptParams())
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('già in un')
  })

  it('errore RPC a livello DB → 500', async () => {
    mockUtenteRuolo('titolare')
    mockRpc.mockResolvedValue({ data: null, error: { message: 'connection error' } })

    const res = await POST(acceptRequest(), acceptParams())

    expect(res.status).toBe(500)
  })
})
