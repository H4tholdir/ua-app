// tests/unit/fatture-xml-errori.test.ts
// POST /api/fatture/[id]/xml — gli errori interni (PostgREST, Postgres via
// generaFatturaPA) non devono MAI finire grezzi nella risposta API
// (regola trasversale del progetto: errori senza leak).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockGeneraFatturaPA, lavoriResult } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockGeneraFatturaPA: vi.fn(),
  lavoriResult: {
    value: { data: [] as unknown, error: null as unknown },
  },
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

// La query lavori è un builder awaitato direttamente: un oggetto non-thenable
// awaitato risolve se stesso, la route destruttura { data, error } da lì.
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
  lavoriResult.value = { data: [], error: null }
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockGeneraFatturaPA.mockResolvedValue({ numero: '2026-0001', stato_sdi: 'generata' })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1' }, error: null })
    if (table === 'fatture')
      return chain({ data: { id: 'fat-1', numero: '2026-0001', stato_sdi: 'draft' }, error: null })
    if (table === 'lavori') return lavoriChain()
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/fatture/[id]/xml — errori senza leak', () => {
  it('errore PostgREST sulla load dei lavori → 500 generico, mai il messaggio grezzo', async () => {
    lavoriResult.value = {
      data: null,
      error: { message: 'canceling statement due to statement timeout' },
    }
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('statement timeout')
    expect(json.error).toBeTruthy()
  })

  it('generaFatturaPA lancia (es. 23505 Postgres) → 500 con numero lavoro ma senza il messaggio grezzo', async () => {
    lavoriResult.value = {
      data: [{ id: 'lav-1', numero_lavoro: 'n.7', laboratorio_id: 'lab-1' }],
      error: null,
    }
    mockGeneraFatturaPA.mockRejectedValue(
      new Error('INSERT fattura fallito: duplicate key value violates unique constraint "fatture_lavoro_attiva_unique"')
    )
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('duplicate key')
    expect(JSON.stringify(json)).not.toContain('fatture_lavoro_attiva_unique')
    // Il numero lavoro resta: è l'informazione azionabile per l'utente
    expect(json.error).toContain('n.7')
  })
})
