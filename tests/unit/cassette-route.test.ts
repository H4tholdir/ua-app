import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: mockRpc }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

import { POST } from '../../src/app/api/cassette/route'
import { normalizzaColore } from '../../src/lib/cassette/colore'

/**
 * Mock di `.rpc()` che riproduce la pigrizia di `PostgrestFilterBuilder` (stesso
 * pattern di `tests/unit/cassette-riordino-route.test.ts` e `tests/unit/parco.test.ts`):
 * un `vi.fn().mockResolvedValue(...)` classico risolve nel momento stesso in cui
 * viene invocato, mascherando la differenza fra «la thunk è stata invocata» e
 * «la richiesta è stata davvero spedita» (`.then()` invocato). Qui `dispatched`
 * diventa `true` SOLO dentro `then()` — necessario per provare che
 * `callRpcWithRetry` (e il retry di payload della correzione 8) ri-invocano
 * DAVVERO `svc.rpc(...)` una seconda volta, invece di riusare la stessa promise
 * già creata.
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
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function req(body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  return new Request('http://localhost/api/cassette', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as never
}

describe('normalizzaColore', () => {
  it('nullish (assente) → default "bianca"', () => {
    expect(normalizzaColore(undefined)).toBe('bianca')
    expect(normalizzaColore(null)).toBe('bianca')
  })

  it('slug canonico → invariato', () => {
    expect(normalizzaColore('azzurra')).toBe('azzurra')
    expect(normalizzaColore('grigia')).toBe('grigia')
  })

  it('hex minuscolo → MAIUSCOLO (R-5: il CHECK di tabella vuole A-F maiuscole)', () => {
    expect(normalizzaColore('#ff00aa')).toBe('#FF00AA')
  })

  it('hex già maiuscolo → invariato', () => {
    expect(normalizzaColore('#FF00AA')).toBe('#FF00AA')
  })

  it('slug sconosciuto → null (422 in route)', () => {
    expect(normalizzaColore('fucsia')).toBeNull()
  })

  it('hex malformato (lunghezza sbagliata) → null', () => {
    expect(normalizzaColore('#ff00a')).toBeNull()
    expect(normalizzaColore('#ff00aabb')).toBeNull()
  })

  it('hex con caratteri fuori A-F/0-9 → null', () => {
    expect(normalizzaColore('#gg00aa')).toBeNull()
  })

  it('tipo non stringa → null', () => {
    expect(normalizzaColore(42)).toBeNull()
    expect(normalizzaColore({})).toBeNull()
  })
})

describe('POST /api/cassette', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('cross-origin (isSameOrigin false) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta: {} }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({}, { origin: 'http://evil.com', host: 'localhost' }))
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST(req({}))
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await POST(req({}))
    expect(res.status).toBe(403)
  })

  it('laboratorio in blacklist (assertLabOperativo) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta: {} }, error: null }])
    mockRpc.mockImplementation(rpc)
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await POST(req({}))
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('colore non valido (slug sconosciuto tipo "fucsia") → 422 in route, nessuna RPC chiamata (né slug né hex)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta: {} }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ colore: 'fucsia' }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('colore_non_valido')
    expect(chiamate).toHaveLength(0)
  })

  it('senza nome → rpc(cassetta_crea_atomica, {p_lab, p_nome: null, p_colore: "bianca"}), 201 (il nome C{n} lo calcola la RPC)', async () => {
    const cassetta = { id: 'c1', nome: 'C7', colore: 'bianca', posizione: 6 }
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({}))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.cassetta).toEqual(cassetta)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[0].args).toEqual(['cassetta_crea_atomica', { p_lab: LAB_ID, p_nome: null, p_colore: 'bianca' }])
  })

  it('{nome:"Banco Ciro", colore:"#ff00aa"} → hex NORMALIZZATO "#FF00AA" nel payload della RPC, 201', async () => {
    const cassetta = { id: 'c2', nome: 'Banco Ciro', colore: '#FF00AA', posizione: 1 }
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'Banco Ciro', colore: '#ff00aa' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.cassetta).toEqual(cassetta)
    expect(chiamate[0].args).toEqual(['cassetta_crea_atomica', { p_lab: LAB_ID, p_nome: 'Banco Ciro', p_colore: '#FF00AA' }])
  })

  it('p_lab è SEMPRE dal context server-side, mai dal body — anche se il body prova a iniettarlo', async () => {
    const cassetta = { id: 'c3', nome: 'C1', colore: 'bianca', posizione: 0 }
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ p_lab: 'lab-attaccante', laboratorio_id: 'lab-attaccante' }))
    expect(res.status).toBe(201)
    expect(chiamate[0].args).toEqual(['cassetta_crea_atomica', { p_lab: LAB_ID, p_nome: null, p_colore: 'bianca' }])
  })

  it('{nome:"C7"} con esito {esito:"nome_occupato"} → 409, UNA sola chiamata RPC (nome esplicito: niente retry)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'nome_occupato', nome: 'C7' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C7' }))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.errore).toBe('nome_occupato')
    expect(chiamate).toHaveLength(1)
  })

  it('correzione 8: SENZA nome, esito "nome_occupato" PERSISTENTE su entrambi i tentativi → la route ritenta una volta, poi 409. Asserisce DUE chiamate alla RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([
      { data: { esito: 'nome_occupato', nome: 'C7' }, error: null },
      { data: { esito: 'nome_occupato', nome: 'C8' }, error: null },
    ])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({}))
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.errore).toBe('nome_occupato')
    expect(chiamate).toHaveLength(2)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[1].dispatched).toBe(true)
    expect(chiamate[1].args).toEqual(chiamate[0].args)
  })

  it('correzione 8: SENZA nome, primo tentativo "nome_occupato" e secondo "ok" → 201, due chiamate RPC', async () => {
    const cassetta = { id: 'c9', nome: 'C8', colore: 'bianca', posizione: 7 }
    const { rpc, chiamate } = mockRpcLazy([
      { data: { esito: 'nome_occupato', nome: 'C7' }, error: null },
      { data: { esito: 'ok', cassetta }, error: null },
    ])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({}))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.cassetta).toEqual(cassetta)
    expect(chiamate).toHaveLength(2)
  })

  it('esito "nome_non_valido" dalla RPC → 422', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'nome_non_valido' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'AB' }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('nome_non_valido')
    expect(chiamate).toHaveLength(1)
  })

  it('nome esplicito troppo lungo (>20 char) → 422 in route, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta: {} }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'X'.repeat(21) }))
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('nome esplicito vuoto dopo trim → 422 in route, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta: {} }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: '   ' }))
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('review Minor #2: body JSON letterale null → trattato come {} (nome automatico, colore bianca), niente TypeError → 201', async () => {
    // req.json() risolve `null` per un body 'null' SENZA lanciare: `.catch(() => ({}))` da
    // solo non basterebbe, serve il `?? {}` dopo — altrimenti body.colore lancerebbe.
    const cassetta = { id: 'c1', nome: 'C1', colore: 'bianca', posizione: 0 }
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(null))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.cassetta).toEqual(cassetta)
    expect(chiamate[0].args).toEqual(['cassetta_crea_atomica', { p_lab: LAB_ID, p_nome: null, p_colore: 'bianca' }])
  })

  it('review Minor #4: esito sconosciuto dalla RPC (né ok né nome_occupato né nome_non_valido) → 500 esplicito, non un 201 silenzioso', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'qualcosa_di_futuro' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C1' }))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toMatch(/esito inatteso/i)
  })

  it('errore RPC non-40P01 (es. connessione) → 500', async () => {
    const { rpc } = mockRpcLazy([{ data: null, error: { code: '08006', message: 'connection error, socket 5432 refused' } }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C1' }))
    expect(res.status).toBe(500)
  })

  it('retry sul 40P01 di callRpcWithRetry (deadlock, non il retry di payload della correzione 8): primo deadlock, secondo ok → 201, RPC dispatched 2 volte', async () => {
    vi.useFakeTimers()
    const cassetta = { id: 'c1', nome: 'C1', colore: 'bianca', posizione: 0 }
    const { rpc, chiamate } = mockRpcLazy([
      { data: null, error: { code: '40P01', message: 'deadlock detected' } },
      { data: { esito: 'ok', cassetta }, error: null },
    ])
    mockRpc.mockImplementation(rpc)
    const promessa = POST(req({ nome: 'C1' }))
    await vi.advanceTimersByTimeAsync(1000)
    const res = await promessa
    vi.useRealTimers()
    expect(chiamate).toHaveLength(2)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[1].dispatched).toBe(true)
    expect(res.status).toBe(201)
  })
})
