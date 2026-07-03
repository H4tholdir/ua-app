import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockVerifyAdminRete, mockFrom } = vi.hoisted(() => ({
  mockVerifyAdminRete: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/rete/verify-admin-rete', () => ({
  verifyAdminRete: mockVerifyAdminRete,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { DELETE } from '../../src/app/api/rete/[id]/inviti/[invitoId]/route'

const CTX = { userId: 'user-1', laboratorioId: 'lab-1', rete: { id: 'rete-1', nome: 'Rete', admin_laboratorio_id: 'lab-1' } }

let revokedAtSet: string | null = null

function mockScenario(opts: { invitoTrovato: boolean }) {
  revokedAtSet = null
  mockFrom.mockImplementation((table: string) => {
    if (table === 'inviti_rete') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                is: () => ({
                  maybeSingle: async () => ({
                    data: opts.invitoTrovato ? { id: 'invito-1' } : null,
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
        update: (data: Record<string, unknown>) => {
          revokedAtSet = data.revoked_at as string
          return { eq: async () => ({ error: null }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function deleteRequest() {
  return new Request('http://localhost/api/rete/rete-1/inviti/invito-1', { method: 'DELETE' })
}

function deleteParams() {
  return { params: Promise.resolve({ id: 'rete-1', invitoId: 'invito-1' }) }
}

describe('DELETE /api/rete/[id]/inviti/[invitoId] — revoca', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminRete.mockResolvedValue(CTX)
  })

  it('utente non autorizzato → 403', async () => {
    mockVerifyAdminRete.mockResolvedValue(null)
    mockScenario({ invitoTrovato: true })

    const res = await DELETE(deleteRequest(), deleteParams())

    expect(res.status).toBe(403)
    expect(revokedAtSet).toBeNull()
  })

  it('invito inesistente o già accettato → 404', async () => {
    mockScenario({ invitoTrovato: false })

    const res = await DELETE(deleteRequest(), deleteParams())

    expect(res.status).toBe(404)
    expect(revokedAtSet).toBeNull()
  })

  it('invito pendente valido → 200, revoked_at impostato', async () => {
    mockScenario({ invitoTrovato: true })

    const res = await DELETE(deleteRequest(), deleteParams())

    expect(res.status).toBe(200)
    expect(revokedAtSet).not.toBeNull()
  })
})
