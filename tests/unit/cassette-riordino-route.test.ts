import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

import { POST } from '@/app/api/cassette/riordino/route'

/**
 * Mock di `.rpc()` che riproduce la pigrizia di `PostgrestFilterBuilder` (stesso
 * pattern di `tests/unit/parco.test.ts` e `tests/unit/rpc-retry.test.ts`): un
 * `vi.fn().mockResolvedValue(...)` classico risolve nel momento stesso in cui
 * viene invocato, mascherando la differenza fra «la thunk è stata invocata» e
 * «la richiesta è stata davvero spedita» (`.then()` invocato). Qui `dispatched`
 * diventa `true` SOLO dentro `then()` — necessario per provare che
 * `callRpcWithRetry` ri-nvoca DAVVERO `svc.rpc(...)` una seconda volta sul
 * 40P01, invece di riusare la stessa promise già creata (R-D/R-E).
 */
function mockRpcLazy(sequenza: Array<{ data: unknown; error: unknown }>) {
  const chiamate: Array<{ args: unknown[]; dispatched: boolean }> = []
  const rpc = (...args: unknown[]) => {
    const indice = chiamate.length
    const chiamata = { args, dispatched: false }
    chiamate.push(chiamata)
    const risultato = sequenza[indice] ?? sequenza[sequenza.length - 1]
    return {
      then(resolve: (v: { data: unknown; error: unknown }) => void) {
        chiamata.dispatched = true
        resolve(risultato)
      },
    }
  }
  return { rpc, chiamate }
}

const LAB_ID = 'lab-1'
// Id in forma UUID valida: dopo il fix Minor #1 la route scarta PRIMA della
// RPC qualunque elemento che non abbia questa forma (per non far arrivare a
// Postgres un cast `uuid[]` destinato a fallire) — placeholder tipo 'c1'/'c2'
// non passerebbero più la guardia di forma.
const C1 = '11111111-1111-1111-1111-111111111111'
const C2 = '22222222-2222-2222-2222-222222222222'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function req(body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  return new Request('http://localhost/api/cassette/riordino', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/cassette/riordino', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('cross-origin (isSameOrigin false) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: ['a', 'b'] }, { origin: 'http://evil.com', host: 'localhost' }))
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST(req({ ordine: ['a', 'b'] }))
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await POST(req({ ordine: ['a', 'b'] }))
    expect(res.status).toBe(403)
  })

  it('laboratorio in blacklist (assertLabOperativo) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await POST(req({ ordine: ['a', 'b'] }))
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('{ordine:[C1,C2]} → chiama rpc(\'cassette_riordina\', {p_lab, p_ordine}) con lo scoping tenant dal context server-side', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: [C1, C2] }))
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[0].args).toEqual(['cassette_riordina', { p_lab: LAB_ID, p_ordine: [C1, C2] }])
  })

  it('esito ok → 200', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: [C1, C2] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toMatchObject({ esito: 'ok' })
  })

  it('esito ordine_non_valido (dalla RPC: es. duplicati o id estranei — forma valida, ma la RPC li rifiuta) → 422', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ordine_non_valido' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: [C1, C1] }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toMatchObject({ errore: 'ordine_non_valido' })
    // La forma è valida (due UUID): la route la inoltra comunque alla RPC,
    // che è lei a scoprire il duplicato — non è un 422 route-side per forma.
    expect(chiamate).toHaveLength(1)
  })

  it('correzione 21/07 #3: array con elementi NULL → forwardato alla RPC as-is, esito ordine_non_valido → 422', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ordine_non_valido' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: [C1, null, C2] }))
    expect(res.status).toBe(422)
    // La route NON filtra i NULL: li passa alla RPC, che è lei a rifiutarli (contratto D5).
    expect(chiamate[0].args).toEqual(['cassette_riordina', { p_lab: LAB_ID, p_ordine: [C1, null, C2] }])
  })

  it('ordine assente dal body (non è un array) → 422 senza mai chiamare la RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({}))
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('ordine non è un array (es. stringa) → 422 senza mai chiamare la RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: `${C1},${C2}` }))
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  // Minor #1 (review): un elemento non-NULL che non ha forma UUID farebbe
  // fallire il cast Postgres `uuid[]` (500), non l'esito ordine_non_valido —
  // la route deve scartarlo PRIMA di chiamare la RPC.
  it('Minor #1: elemento non-UUID (es. "abc") → 422 senza mai chiamare la RPC (eviterebbe un cast error 500)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: ['abc', C2] }))
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toMatchObject({ errore: 'ordine_non_valido' })
    expect(chiamate).toHaveLength(0)
  })

  it('Minor #1: elemento di tipo sbagliato (numero) → 422 senza mai chiamare la RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: [C1, 42] }))
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('retry sul 40P01 (R-D): primo tentativo deadlock, secondo tentativo ok → 200 con l\'esito del SECONDO tentativo, RPC dispatched 2 volte', async () => {
    vi.useFakeTimers()
    const { rpc, chiamate } = mockRpcLazy([
      { data: null, error: { code: '40P01', message: 'deadlock detected' } },
      { data: { esito: 'ok' }, error: null },
    ])
    mockRpc.mockImplementation(rpc)
    const promessa = POST(req({ ordine: [C1, C2] }))
    await vi.advanceTimersByTimeAsync(1000)
    const res = await promessa
    vi.useRealTimers()

    expect(chiamate).toHaveLength(2)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[1].dispatched).toBe(true)
    expect(res.status).toBe(200)
  })

  it('errore RPC non-40P01 (es. connessione) → 500', async () => {
    const { rpc } = mockRpcLazy([{ data: null, error: { code: '08006', message: 'connection error, socket 5432 refused' } }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ ordine: [C1, C2] }))
    expect(res.status).toBe(500)
  })
})
