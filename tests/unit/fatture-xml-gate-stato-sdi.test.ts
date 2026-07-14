// tests/unit/fatture-xml-gate-stato-sdi.test.ts
// N7: POST /api/fatture/[id]/xml deve rifiutare (409) la rigenerazione di una
// fattura già emessa (stato_sdi !== 'draft'). Il gate vive nella ROUTE, PRIMA
// del loop generaFatturaPA — così non ri-deriva l'imponibile dal lavoro vivo e
// NON brucia un progressivo SDI (generaProgressivo è dentro generaFatturaPA).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockGeneraFatturaPA, lavoriResult, fatturaStato } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockGeneraFatturaPA: vi.fn(),
  lavoriResult: { value: { data: [] as unknown, error: null as unknown } },
  fatturaStato: { value: 'draft' as string },
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: mockGeneraFatturaPA }))
vi.mock('@/lib/fattura/send-pec', () => ({ sendFatturaPEC: vi.fn() }))

import { POST } from '../../src/app/api/fatture/[id]/xml/route'

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  c.single = async () => result
  return c
}
function lavoriChain() {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  Object.defineProperty(c, 'data', { get: () => (lavoriResult.value as { data: unknown }).data })
  Object.defineProperty(c, 'error', { get: () => (lavoriResult.value as { error: unknown }).error })
  return c
}
function req() {
  return new Request('http://localhost/api/fatture/fat-1/xml', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify({ lavori_ids: ['lav-1'] }),
  })
}
const ctx = { params: Promise.resolve({ id: 'fat-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  lavoriResult.value = { data: [{ id: 'lav-1', numero_lavoro: 'n.1', laboratorio_id: 'lab-1' }], error: null }
  fatturaStato.value = 'draft'
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockGeneraFatturaPA.mockResolvedValue({ numero: '2026-0001', stato_sdi: 'generata' })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1' }, error: null })
    if (table === 'fatture')
      return chain({ data: { id: 'fat-1', numero: '2026-0001', stato_sdi: fatturaStato.value }, error: null })
    if (table === 'lavori') return lavoriChain()
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/fatture/[id]/xml — gate stato_sdi (N7)', () => {
  it('fattura già generata → 409 e generaFatturaPA NON chiamata (nessun progressivo SDI bruciato)', async () => {
    fatturaStato.value = 'generata'
    const res = await POST(req(), ctx)
    expect(res.status).toBe(409)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
    const json = await res.json()
    expect(json.error).toBeTruthy()
  })

  it('fattura in stato inviata → 409 (allowlist: solo draft passa)', async () => {
    fatturaStato.value = 'inviata'
    const res = await POST(req(), ctx)
    expect(res.status).toBe(409)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
  })

  it('fattura draft → procede: generaFatturaPA chiamata, non 409', async () => {
    fatturaStato.value = 'draft'
    const res = await POST(req(), ctx)
    expect(res.status).not.toBe(409)
    expect(mockGeneraFatturaPA).toHaveBeenCalledTimes(1)
  })
})
