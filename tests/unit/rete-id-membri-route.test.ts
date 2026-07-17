import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockVerifyAdminRete, mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockVerifyAdminRete: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/rete/verify-admin-rete', () => ({
  verifyAdminRete: mockVerifyAdminRete,
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { DELETE } from '../../src/app/api/rete/[id]/membri/[laboratorioId]/route'

const CTX = { userId: 'user-1', laboratorioId: 'lab-1', ruolo: 'admin_rete', lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' }, rete: { id: 'rete-1', nome: 'Rete', admin_laboratorio_id: 'lab-1' } }

let deletedFilter: { reteId?: string; laboratorioId?: string } = {}

function mockScenario(opts: { reteAdminLabId: string; ruoloUtente?: string }) {
  deletedFilter = {}
  mockGetFreshLabContext.mockResolvedValue({
    userId: 'user-x', email: null, ruolo: opts.ruoloUtente ?? 'tecnico', laboratorioId: 'lab-x', nome: null, cognome: null, lab: null,
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'reti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { admin_laboratorio_id: opts.reteAdminLabId }, error: null }),
          }),
        }),
      }
    }
    if (table === 'reti_membri') {
      return {
        delete: () => ({
          eq: (col: string, val: string) => {
            if (col === 'rete_id') deletedFilter.reteId = val
            return {
              eq: (col2: string, val2: string) => {
                if (col2 === 'laboratorio_id') deletedFilter.laboratorioId = val2
                return Promise.resolve({ error: null })
              },
            }
          },
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function deleteRequest() {
  return new Request('http://localhost/api/rete/rete-1/membri/lab-2', { method: 'DELETE' })
}

function deleteParams() {
  return { params: Promise.resolve({ id: 'rete-1', laboratorioId: 'lab-2' }) }
}

describe('DELETE /api/rete/[id]/membri/[laboratorioId] — rimozione membro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('titolare/admin_rete del lab admin → 200, membro rimosso', async () => {
    mockVerifyAdminRete.mockResolvedValue(CTX)
    mockScenario({ reteAdminLabId: 'lab-1' })

    const res = await DELETE(deleteRequest(), deleteParams())

    expect(res.status).toBe(200)
    expect(deletedFilter.reteId).toBe('rete-1')
    expect(deletedFilter.laboratorioId).toBe('lab-2')
  })

  it('admin_sistema (verifyAdminRete fallisce, ma ruolo admin_sistema) → 200', async () => {
    mockVerifyAdminRete.mockResolvedValue(null)
    mockScenario({ reteAdminLabId: 'lab-1', ruoloUtente: 'admin_sistema' })

    const res = await DELETE(deleteRequest(), deleteParams())

    expect(res.status).toBe(200)
  })

  it('né admin_rete né admin_sistema → 403, nessuna rimozione', async () => {
    mockVerifyAdminRete.mockResolvedValue(null)
    mockScenario({ reteAdminLabId: 'lab-1', ruoloUtente: 'tecnico' })

    const res = await DELETE(deleteRequest(), deleteParams())

    expect(res.status).toBe(403)
    expect(deletedFilter.reteId).toBeUndefined()
  })

  it('tentativo di rimuovere il lab amministratore della rete → 400', async () => {
    mockVerifyAdminRete.mockResolvedValue(CTX)
    mockScenario({ reteAdminLabId: 'lab-2' }) // il lab-2 (target della DELETE) è l'admin

    const res = await DELETE(deleteRequest(), deleteParams())
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toContain('amministratore')
    expect(deletedFilter.reteId).toBeUndefined()
  })
})
