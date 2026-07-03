import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockVerifyAdminRete, mockFrom, mockSendInvitoReteEmail } = vi.hoisted(() => ({
  mockVerifyAdminRete: vi.fn(),
  mockFrom: vi.fn(),
  mockSendInvitoReteEmail: vi.fn(),
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
vi.mock('@/lib/invito/send-invito-rete-email', () => ({
  sendInvitoReteEmail: mockSendInvitoReteEmail,
}))

import { POST } from '../../src/app/api/rete/[id]/inviti/route'

const CTX = { userId: 'user-1', laboratorioId: 'lab-1', rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-1' } }

let insertedInvito: Record<string, unknown> | null = null
let updatedInvito: Record<string, unknown> | null = null

function mockScenario(opts: {
  destinatarioEsiste: boolean
  invitoPendenteEsistente?: { id: string; accepted_at: string | null; revoked_at: string | null; expires_at: string } | null
}) {
  insertedInvito = null
  updatedInvito = null
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          ilike: () => ({
            in: () => ({
              maybeSingle: async () => ({
                data: opts.destinatarioEsiste ? { id: 'user-destinatario' } : null,
                error: null,
              }),
            }),
          }),
        }),
      }
    }
    if (table === 'inviti_rete') {
      return {
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: opts.invitoPendenteEsistente ? [opts.invitoPendenteEsistente] : [], error: null }),
          }),
        }),
        insert: async (data: Record<string, unknown>) => {
          insertedInvito = data
          return { error: null }
        },
        update: (data: Record<string, unknown>) => {
          updatedInvito = data
          return { eq: async () => ({ error: null }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function postRequest(body: unknown) {
  return new Request('http://localhost/api/rete/rete-1/inviti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function postParams() {
  return { params: Promise.resolve({ id: 'rete-1' }) }
}

describe('POST /api/rete/[id]/inviti', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminRete.mockResolvedValue(CTX)
    mockSendInvitoReteEmail.mockResolvedValue({ emailSent: true })
  })

  it('utente non autorizzato → 403', async () => {
    mockVerifyAdminRete.mockResolvedValue(null)
    mockScenario({ destinatarioEsiste: true })

    const res = await POST(postRequest({ email: 'mario@lab.it' }), postParams())

    expect(res.status).toBe(403)
  })

  it('email senza account titolare/admin_rete esistente → 422, nessun invito creato', async () => {
    mockScenario({ destinatarioEsiste: false })

    const res = await POST(postRequest({ email: 'sconosciuto@lab.it' }), postParams())
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('Nessun account')
    expect(insertedInvito).toBeNull()
    expect(mockSendInvitoReteEmail).not.toHaveBeenCalled()
  })

  it('email valida, nessun invito pendente → crea nuovo invito e invia email', async () => {
    mockScenario({ destinatarioEsiste: true, invitoPendenteEsistente: null })

    const res = await POST(postRequest({ email: 'Mario@Lab.it' }), postParams())

    expect(res.status).toBe(201)
    expect(insertedInvito?.rete_id).toBe('rete-1')
    expect(insertedInvito?.email).toBe('mario@lab.it')
    expect(insertedInvito?.invitato_da).toBe(CTX.userId)
    expect(mockSendInvitoReteEmail).toHaveBeenCalledTimes(1)
  })

  it('invito pendente già esistente per stessa email+rete → aggiorna invece di duplicare', async () => {
    mockScenario({
      destinatarioEsiste: true,
      invitoPendenteEsistente: {
        id: 'invito-esistente',
        accepted_at: null,
        revoked_at: null,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    })

    const res = await POST(postRequest({ email: 'mario@lab.it' }), postParams())

    expect(res.status).toBe(201)
    expect(insertedInvito).toBeNull()
    expect(updatedInvito?.token_hash).toBeDefined()
  })

  it('campo "email" mancante → 422', async () => {
    mockScenario({ destinatarioEsiste: true })

    const res = await POST(postRequest({}), postParams())
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('email')
  })
})
