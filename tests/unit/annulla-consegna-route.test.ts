import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(), mockFrom: vi.fn(), mockRpc: vi.fn(),
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))

import { POST } from '../../src/app/api/lavori/[id]/annulla-consegna/route'
import { FINESTRA_ANNULLO_MS } from '@/lib/consegna/costanti'

function req() {
  return new Request('http://localhost/api/lavori/lav-1/annulla-consegna', {
    method: 'POST', headers: { origin: 'http://localhost', host: 'localhost' },
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'lav-1' }) }

describe('POST /api/lavori/[id]/annulla-consegna', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('chiama la RPC con la finestra condivisa (10 min)', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_assente: false }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith('annulla_consegna_atomica', {
      p_lavoro_id: 'lav-1', p_laboratorio_id: 'lab-1', p_finestra_ms: FINESTRA_ANNULLO_MS,
    })
  })

  const casi: Array<[string, number]> = [
    ['non_trovato', 404], ['non_consegnato', 400], ['finestra_scaduta', 400],
    ['fattura_gia_emessa', 409],
  ]
  for (const [esito, status] of casi) {
    it(`esito ${esito} → ${status}`, async () => {
      mockRpc.mockResolvedValue({ data: { esito }, error: null })
      const res = await POST(req(), ctx)
      expect(res.status).toBe(status)
    })
  }

  it('errore RPC → 500 senza leak del messaggio Postgres', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'duplicate key value violates...' } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('duplicate key')
  })

  it('esito ignoto → 500', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'fattura_in_emissione' }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(401)
  })
})
