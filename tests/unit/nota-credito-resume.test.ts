// tests/unit/nota-credito-resume.test.ts
// Task 8a — Idempotenza/resume del TD04.
//
// Cosa è GIÀ coperto da nota-credito-route.test.ts (Task 6), NON duplicato qui:
//   - resume da draft (TD04 draft esistente → salta RPC, riprende generaFatturaPA)
//   - idempotenza da generata (200, nessun ri-XML, nessun progressivo SDI bruciato)
//   - fallimento fase 2 → 200 {xml_pending:true}, draft persiste
//
// Cosa aggiunge questo file: la SEQUENZA reale di retry (due POST consecutive)
// che dimostra il contratto end-to-end — dopo un XML fallito, la seconda POST
// riprende lo STESSO TD04 senza richiamare la RPC (nessun secondo TD04 creato).
// La race concorrente (due POST simultanee) è coperta a livello DB dal
// claim-first della RPC (UPDATE ... WHERE stornata_at IS NULL serializza i
// concorrenti: il perdente ottiene non_stornabile → 409), verificato
// dall'integration test emetti-nota-credito-atomica.rpc.test.ts
// ("seconda chiamata → non_stornabile, un solo TD04"): nessun 23505 raggiunge
// mai la route, quindi nessun handler dedicato è necessario.
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
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null })
    if (table === 'fatture') return chain({ data: null, error: null })
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('resume idempotente TD04 — sequenza retry dopo XML fallito', () => {
  it('prima POST: XML fallisce → 200 {xml_pending:true}; seconda POST: riprende lo stesso TD04 senza secondo claim RPC', async () => {
    // ── Chiamata 1: RPC crea il draft, ma la fase 2 (XML) fallisce ──────────
    mockRpc.mockResolvedValueOnce({ data: { esito: 'ok', td04_id: 'td04-1' }, error: null })
    mockGeneraFatturaPA.mockRejectedValueOnce(new Error('Upload SdI down'))

    const res1 = await POST(req(), ctx)
    expect(res1.status).toBe(200)
    expect(await res1.json()).toEqual({ td04_id: 'td04-1', xml_pending: true })
    expect(mockRpc).toHaveBeenCalledTimes(1)

    // ── Fra le due chiamate il draft 'td04-1' è persistito nel DB ───────────
    esistenteResult.value = { id: 'td04-1', numero: '2026-0077', stato_sdi: 'draft' }

    // ── Chiamata 2 (retry): trova il draft → NON richiama la RPC (nessun
    //    secondo TD04), riprende solo la generazione XML, ora riuscita ───────
    mockGeneraFatturaPA.mockResolvedValueOnce({ numero: '2026-0077', stato_sdi: 'generata' })

    const res2 = await POST(req(), ctx)
    expect(res2.status).toBe(200)
    expect(await res2.json()).toEqual({ td04_id: 'td04-1', numero: '2026-0077' })
    // La RPC (claim-first) NON è stata richiamata: nessun secondo storno/TD04.
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockGeneraFatturaPA).toHaveBeenLastCalledWith(null, 'td04-1')
  })
})
