// tests/unit/nota-credito-route.test.ts
// Task 6: POST /api/fatture/[id]/nota-credito — orchestrazione a due fasi
// (RPC emetti_nota_credito_atomica → generaFatturaPA). La route mappa gli
// esiti della RPC su HTTP e NON genera XML per esiti diversi da 'ok'
// (nessun progressivo SDI bruciato su non_stornabile/non_trovato).
// Pattern di riferimento: fatture-xml-gate-stato-sdi.test.ts (mock chain +
// vi.hoisted) e annulla-consegna-route.test.ts (route RPC-mapped).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc, mockGeneraFatturaPA, esistenteResult } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGeneraFatturaPA: vi.fn(),
  esistenteResult: { value: null as { id: string; numero: string; stato_sdi: string } | null },
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: mockGeneraFatturaPA }))

import { POST } from '../../src/app/api/fatture/[id]/nota-credito/route'

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'is']) c[m] = () => c
  c.single = async () => result
  c.maybeSingle = async () => ({ data: esistenteResult.value, error: null })
  return c
}

function req(body: unknown = { causale: 'Reso merce' }) {
  return new Request('http://localhost/api/fatture/fat-orig/nota-credito', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'fat-orig' }) }

beforeEach(() => {
  vi.clearAllMocks()
  esistenteResult.value = null
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockGeneraFatturaPA.mockResolvedValue({ numero: '2026-0099', stato_sdi: 'generata' })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null })
    if (table === 'fatture') return chain({ data: null, error: null })
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/fatture/[id]/nota-credito', () => {
  it('causale mancante → 400, RPC non chiamata', async () => {
    const res = await POST(req({}), ctx)
    expect(res.status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
  })

  it('causale solo spazi bianchi → 400', async () => {
    const res = await POST(req({ causale: '   ' }), ctx)
    expect(res.status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('RPC non_stornabile → 409, generaFatturaPA NON chiamata', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'non_stornabile' }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(409)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
  })

  it('RPC non_trovato → 404, generaFatturaPA NON chiamata', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'non_trovato' }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(404)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
  })

  it('RPC error → 500 senza leak del messaggio Postgres', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'duplicate key value violates...' } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('duplicate key')
  })

  it('esito RPC ignoto → 500', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'boh' }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(500)
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
  })

  it('RPC ok → chiama generaFatturaPA(null, td04_id), 200 {td04_id, numero}', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'ok', td04_id: 'td04-nuovo' }, error: null })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    expect(mockGeneraFatturaPA).toHaveBeenCalledWith(null, 'td04-nuovo')
    const json = await res.json()
    expect(json).toEqual({ td04_id: 'td04-nuovo', numero: '2026-0099' })
  })

  it('chiama la RPC coi parametri attesi (originale/causale/laboratorio)', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'ok', td04_id: 'td04-nuovo' }, error: null })
    await POST(req({ causale: '  Reso merce  ' }), ctx)
    expect(mockRpc).toHaveBeenCalledWith('emetti_nota_credito_atomica', {
      p_originale_id: 'fat-orig',
      p_causale: 'Reso merce',
      p_laboratorio_id: 'lab-1',
    })
  })

  it('resume: TD04 draft già esistente per l\'originale → non chiama la RPC, riprende solo generaFatturaPA', async () => {
    esistenteResult.value = { id: 'td04-esistente', numero: '2026-0050', stato_sdi: 'draft' }
    const res = await POST(req(), ctx)
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockGeneraFatturaPA).toHaveBeenCalledWith(null, 'td04-esistente')
    expect(res.status).toBe(200)
  })

  it('resume: TD04 generata già esistente → 200 idempotente, generaFatturaPA NON richiamata (nessun progressivo SDI ri-bruciato)', async () => {
    esistenteResult.value = { id: 'td04-gia', numero: '2026-0050', stato_sdi: 'generata' }
    const res = await POST(req(), ctx)
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockGeneraFatturaPA).not.toHaveBeenCalled()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ td04_id: 'td04-gia', numero: '2026-0050' })
  })

  it('errore in generaFatturaPA (fase 2) → 200 {td04_id, xml_pending:true}, draft resta per retry', async () => {
    mockRpc.mockResolvedValue({ data: { esito: 'ok', td04_id: 'td04-nuovo' }, error: null })
    mockGeneraFatturaPA.mockRejectedValue(new Error('Upload XML fallito'))
    const res = await POST(req(), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ td04_id: 'td04-nuovo', xml_pending: true })
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await POST(req(), ctx)
    expect(res.status).toBe(401)
  })

  it('CSRF: origin diverso da host → 403', async () => {
    const badReq = new Request('http://localhost/api/fatture/fat-orig/nota-credito', {
      method: 'POST',
      headers: { origin: 'http://evil.example', host: 'localhost', 'content-type': 'application/json' },
      body: JSON.stringify({ causale: 'x' }),
    }) as never
    const res = await POST(badReq, ctx)
    expect(res.status).toBe(403)
  })
})
