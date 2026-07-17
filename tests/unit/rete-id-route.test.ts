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

import { PATCH } from '../../src/app/api/rete/[id]/route'

const CTX = { userId: 'user-1', laboratorioId: 'lab-1', ruolo: 'admin_rete', lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' }, rete: { id: 'rete-1', nome: 'Rete Vecchia', admin_laboratorio_id: 'lab-1' } }

let updatedNome: string | null = null

function mockUpdateSuccess() {
  updatedNome = null
  mockFrom.mockImplementation((table: string) => {
    if (table === 'reti') {
      return {
        update: (data: Record<string, unknown>) => {
          updatedNome = data.nome as string
          return {
            eq: () => ({
              select: () => ({
                single: async () => ({ data: { id: 'rete-1', nome: data.nome }, error: null }),
              }),
            }),
          }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/rete/rete-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patchParams() {
  return { params: Promise.resolve({ id: 'rete-1' }) }
}

describe('PATCH /api/rete/[id] — rinomina', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerifyAdminRete.mockResolvedValue(CTX)
    mockUpdateSuccess()
  })

  it('utente non autorizzato (verifyAdminRete null) → 403, nessun update', async () => {
    mockVerifyAdminRete.mockResolvedValue(null)

    const res = await PATCH(patchRequest({ nome: 'Rete Nuova' }), patchParams())

    expect(res.status).toBe(403)
    expect(updatedNome).toBeNull()
  })

  it('campo "nome" mancante → 422', async () => {
    const res = await PATCH(patchRequest({ nome: '' }), patchParams())
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('nome')
    expect(updatedNome).toBeNull()
  })

  it('body JSON null → 422, nessun crash/500', async () => {
    const res = await PATCH(patchRequest(null), patchParams())
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBeDefined()
    expect(updatedNome).toBeNull()
  })

  it('payload valido → 200, nome aggiornato', async () => {
    const res = await PATCH(patchRequest({ nome: 'Rete Toscana Rinnovata' }), patchParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rete.nome).toBe('Rete Toscana Rinnovata')
    expect(updatedNome).toBe('Rete Toscana Rinnovata')
  })
})
