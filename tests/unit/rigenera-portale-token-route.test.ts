// tests/unit/rigenera-portale-token-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(), mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/clienti/[id]/rigenera-portale-token/route'

function req(): Request {
  return new Request('http://localhost/api/clienti/cli-1/rigenera-portale-token', { method: 'POST' })
}
const ctx = { params: Promise.resolve({ id: 'cli-1' }) }

let updatePayload: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let ruolo = 'titolare'
let clienteEsiste = true

beforeEach(() => {
  updatePayload = null
  auditInserts = []
  ruolo = 'titolare'
  clienteEsiste = true
  mockGetFreshLabContext.mockImplementation(async () => ({
    userId: 'user-1', email: null, ruolo, laboratorioId: 'lab-1', nome: null, cognome: null, lab: null,
  }))
  mockFrom.mockImplementation((table: string) => {
    if (table === 'portale_accessi') {
      return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: null } } }
    }
    // clienti
    return {
      update: (payload: Record<string, unknown>) => {
        updatePayload = payload
        return {
          eq: () => ({
            eq: () => ({
              is: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: clienteEsiste ? { id: 'cli-1' } : null, error: null }),
                }),
              }),
            }),
          }),
        }
      },
    }
  })
})

describe('POST /api/clienti/[id]/rigenera-portale-token', () => {
  it('401 senza user autenticato', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST(req(), ctx)
    expect(res.status).toBe(401)
  })

  it('403 se ruolo tecnico', async () => {
    ruolo = 'tecnico'
    const res = await POST(req(), ctx)
    expect(res.status).toBe(403)
  })

  it('200 con token UUID nuovo, update con portale_token/portale_token_scade_at, audit link_rigenerato', async () => {
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.portale_token).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    expect(updatePayload).toHaveProperty('portale_token', json.portale_token)
    expect(updatePayload).toHaveProperty('portale_token_scade_at')
    expect(auditInserts).toHaveLength(1)
    expect(auditInserts[0]).toMatchObject({ azione: 'link_rigenerato', cliente_id: 'cli-1' })
    expect((auditInserts[0].dettaglio as Record<string, unknown>).autore).toBe('user-1')
  })

  it('404 se il cliente non esiste', async () => {
    clienteEsiste = false
    const res = await POST(req(), ctx)
    expect(res.status).toBe(404)
  })
})
