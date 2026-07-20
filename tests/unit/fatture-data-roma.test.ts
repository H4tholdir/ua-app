// POST /api/fatture — data/anno dal giorno civile di Roma (fix date fiscali 20/07)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(), mockFrom: vi.fn(), mockRpc: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext, getLabContextWithTimings: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/fatture/route'

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: 'lab-1',
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}
function req(body: unknown): Request {
  return new Request('http://localhost/api/fatture', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}

let inserted: Record<string, unknown>[]
beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  inserted = []
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  mockRpc.mockResolvedValue({ data: 1, error: null })
  mockFrom.mockImplementation(() => ({
    insert: (payload: Record<string, unknown>) => {
      inserted.push(payload)
      return { select: () => ({ single: async () => ({ data: { id: 'f1', ...payload }, error: null }) }) }
    },
  }))
})
afterEach(() => { vi.useRealTimers() })

describe('POST /api/fatture — capodanno Europe/Rome', () => {
  it('23:30 UTC del 31/12 → numero 2027-0001, anno 2027, data 2027-01-01, serie p_anno 2027', async () => {
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const res = await POST(req({ cliente_id: 'cli-1' }))
    expect(res.status).toBe(201)
    expect(mockRpc).toHaveBeenCalledWith('genera_progressivo', expect.objectContaining({ p_anno: 2027 }))
    expect(inserted[0]).toMatchObject({ numero: '2027-0001', anno: 2027, data: '2027-01-01' })
  })
  it('body.data di un anno DIVERSO dalla serie → 422, nessun progressivo bruciato', async () => {
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'))
    const res = await POST(req({ cliente_id: 'cli-1', data: '2025-12-31' }))
    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
    expect(inserted).toHaveLength(0)
  })
  it('body.data dello STESSO anno → accettata (retrodatazione infra-anno legittima)', async () => {
    vi.setSystemTime(new Date('2026-07-20T10:00:00Z'))
    const res = await POST(req({ cliente_id: 'cli-1', data: '2026-07-01' }))
    expect(res.status).toBe(201)
    expect(inserted[0]).toMatchObject({ data: '2026-07-01', anno: 2026 })
  })
})
