import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

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

import { POST } from '@/app/api/lavori/[id]/cassetta/route'

/**
 * Mock di `.rpc()` che riproduce la pigrizia di `PostgrestFilterBuilder` —
 * stesso pattern di `tests/unit/parco.test.ts`/`tests/unit/rpc-retry.test.ts`
 * e del test gemello `cassette-riordino-route.test.ts`. `dispatched` diventa
 * `true` SOLO dentro `then()`.
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
const LAVORO_ID = 'lavoro-1'
// Id in forma UUID valida: dopo il fix Minor #1 la route scarta PRIMA della
// RPC un `cassetta_id` che non abbia questa forma — placeholder tipo
// 'cassetta-1' non passerebbero più la guardia di forma.
const CASSETTA_1 = '33333333-3333-3333-3333-333333333333'
const CASSETTA_ALTRO_LAB = '44444444-4444-4444-4444-444444444444'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const params = Promise.resolve({ id: LAVORO_ID })

function req(body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/cassetta`, init)
}

/** Come `req`, ma con un body testuale grezzo — per simulare un JSON malformato in arrivo. */
function rawReq(rawBody: string, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/cassetta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: rawBody,
  })
}

/**
 * Mock di `svc.from('lavori')` per il pre-check di appartenenza al lab (Step 3
 * del brief). Ritorna la `chain` (review Important #2): `createChain` risolve
 * allo STESSO risultato indipendentemente dai filtri applicati — l'unico modo
 * di provare che la route scopi DAVVERO per `laboratorio_id` (e non solo per
 * `id`) è ispezionare `chain.calls`, non solo il codice di stato della risposta.
 */
function mockLavoroTrovato(trovato = true) {
  const chain = createChain({ data: trovato ? { id: LAVORO_ID } : null, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') return chain
    throw new Error(`Unexpected table: ${table}`)
  })
  return chain
}

describe('POST /api/lavori/[id]/cassetta', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('cross-origin (isSameOrigin false) → 403, nessuna query né RPC', async () => {
    const res = await POST(req({ nome: 'C9' }, { origin: 'http://evil.com', host: 'localhost' }), { params })
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(403)
  })

  it('laboratorio in blacklist (assertLabOperativo) → 403, nessuna query né RPC', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lavoro non trovato (assente o di un altro lab) → 404, nessuna RPC, e il pre-check ha DAVVERO scopato per laboratorio_id', async () => {
    const chain = mockLavoroTrovato(false)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta_id: CASSETTA_1, nome: 'C9' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(404)
    expect(chiamate).toHaveLength(0)
    // Important #2 (review): senza questa asserzione, cancellare
    // `.eq('laboratorio_id', labId)` dalla route lascerebbe questo (e gli altri)
    // test verdi — `createChain` risolve allo stesso risultato a prescindere
    // dai filtri. Qui si blocca l'invariante multi-tenant sul serio.
    expect(chain.calls).toContainEqual({ method: 'eq', args: ['id', LAVORO_ID] })
    expect(chain.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
  })

  it('{nome:\'C9\'} → chiama rpc(\'cassetta_assegna_atomica\', {p_lab, p_lavoro, p_cassetta_id: null, p_nome:\'C9\', p_colore: null}), pre-check scopato per lab', async () => {
    const chain = mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta_id: CASSETTA_1, nome: 'C9' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[0].args).toEqual([
      'cassetta_assegna_atomica',
      { p_lab: LAB_ID, p_lavoro: LAVORO_ID, p_cassetta_id: null, p_nome: 'C9', p_colore: null },
    ])
    const json = await res.json()
    expect(json).toEqual({ esito: 'ok', nome: 'C9' })
    // Important #2 (review): stessa guardia dell'invariante multi-tenant sul ramo happy path.
    expect(chain.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
  })

  it(`{cassetta_id:'${CASSETTA_1}'} → chiama rpc('cassetta_assegna_atomica', {…, p_cassetta_id, p_nome: null, p_colore: null})`, async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta_id: CASSETTA_1, nome: 'C3' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ cassetta_id: CASSETTA_1 }), { params })
    expect(res.status).toBe(200)
    expect(chiamate[0].args).toEqual([
      'cassetta_assegna_atomica',
      { p_lab: LAB_ID, p_lavoro: LAVORO_ID, p_cassetta_id: CASSETTA_1, p_nome: null, p_colore: null },
    ])
  })

  it('esito occupata → 409 con {errore:\'occupata\', nome}', async () => {
    mockLavoroTrovato(true)
    const { rpc } = mockRpcLazy([{ data: { esito: 'occupata', nome: 'C9' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json).toEqual({ errore: 'occupata', nome: 'C9' })
  })

  it('esito cassetta_non_trovata (cassetta_id in forma valida ma inesistente/di altro lab) → 404', async () => {
    mockLavoroTrovato(true)
    const { rpc } = mockRpcLazy([{ data: { esito: 'cassetta_non_trovata' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ cassetta_id: CASSETTA_ALTRO_LAB }), { params })
    expect(res.status).toBe(404)
  })

  it('esito lavoro_non_valido (lavoro chiuso/annullato tra il pre-check e la RPC) → 422', async () => {
    mockLavoroTrovato(true)
    const { rpc } = mockRpcLazy([{ data: { esito: 'lavoro_non_valido' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(422)
  })

  it('correzione 21/07 #1: nome oltre 20 caratteri → 422 validato dalla ROUTE, MAI dalla RPC (niente bugia "cassetta non trovata")', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta_id: CASSETTA_1, nome: 'x' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const nomeTroppoLungo = 'targa-lunghissima-25ch'
    expect(nomeTroppoLungo.length).toBeGreaterThan(20)
    const res = await POST(req({ nome: nomeTroppoLungo }), { params })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toEqual({ errore: 'nome_non_valido' })
    expect(chiamate).toHaveLength(0)
  })

  it('nome vuoto/solo spazi → 422 senza mai chiamare la RPC', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta_id: CASSETTA_1, nome: 'x' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: '   ' }), { params })
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  // ─── Important #1 (review): un body non riconosciuto NON deve MAI liberare
  // in silenzio con 200 — solo l'ASSENZA delle chiavi cassetta_id/nome libera.
  // Un valore presente ma di tipo sbagliato o vuoto è un 422, mai un fallback. ───

  it('Important #1: {cassetta_id: 123} (tipo sbagliato) → 422 cassetta_id_non_valido, MAI liberazione, nessuna RPC', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: null }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ cassetta_id: 123 }), { params })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toEqual({ errore: 'cassetta_id_non_valido' })
    expect(chiamate).toHaveLength(0)
  })

  it('Important #1: {nome: 42} (tipo sbagliato) → 422 nome_non_valido, MAI liberazione, nessuna RPC', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: null }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 42 }), { params })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toEqual({ errore: 'nome_non_valido' })
    expect(chiamate).toHaveLength(0)
  })

  it('Important #1: {cassetta_id: "   "} (vuoto dopo il trim) → 422 cassetta_id_non_valido, MAI liberazione', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: null }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ cassetta_id: '   ' }), { params })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toEqual({ errore: 'cassetta_id_non_valido' })
    expect(chiamate).toHaveLength(0)
  })

  it('Important #1: body JSON malformato (non vuoto, non parsabile) → 400, MAI liberazione, nessuna RPC', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: null }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(rawReq('{ questo non è JSON'), { params })
    expect(res.status).toBe(400)
    expect(chiamate).toHaveLength(0)
  })

  it('Minor #1: {cassetta_id: "abc"} (non ha forma UUID) → 422 cassetta_id_non_valido, nessuna RPC (eviterebbe un cast error 500)', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', cassetta_id: CASSETTA_1, nome: 'x' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ cassetta_id: 'abc' }), { params })
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json).toEqual({ errore: 'cassetta_id_non_valido' })
    expect(chiamate).toHaveLength(0)
  })

  it('body con chiave estranea e nessuna delle due note ({foo:"bar"}) → liberazione manuale, come {} (scelta deliberata, non regressione)', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: 'C9' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ foo: 'bar' }), { params })
    expect(res.status).toBe(200)
    expect(chiamate[0].args).toEqual(['cassetta_libera_atomica', { p_lab: LAB_ID, p_lavoro: LAVORO_ID, p_motivo: 'manuale' }])
  })

  it('body null → liberazione manuale: chiama rpc(\'cassetta_libera_atomica\', {p_lab, p_lavoro, p_motivo:\'manuale\'}) → 200', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: 'C9' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(null), { params })
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].args).toEqual(['cassetta_libera_atomica', { p_lab: LAB_ID, p_lavoro: LAVORO_ID, p_motivo: 'manuale' }])
    const json = await res.json()
    expect(json).toEqual({ esito: 'ok', nome: 'C9' })
  })

  it('body {} (nessun campo) → liberazione manuale, stessa RPC di body null', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: null }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({}), { params })
    expect(res.status).toBe(200)
    expect(chiamate[0].args).toEqual(['cassetta_libera_atomica', { p_lab: LAB_ID, p_lavoro: LAVORO_ID, p_motivo: 'manuale' }])
  })

  it('body assente del tutto (nessun testo) → trattato come liberazione manuale', async () => {
    mockLavoroTrovato(true)
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', nome: null }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req(undefined), { params })
    expect(res.status).toBe(200)
    expect(chiamate[0].args).toEqual(['cassetta_libera_atomica', { p_lab: LAB_ID, p_lavoro: LAVORO_ID, p_motivo: 'manuale' }])
  })

  it('retry sul 40P01 (R-D) sul ramo assegna: primo tentativo deadlock, secondo ok → 200, RPC dispatched 2 volte', async () => {
    mockLavoroTrovato(true)
    vi.useFakeTimers()
    const { rpc, chiamate } = mockRpcLazy([
      { data: null, error: { code: '40P01', message: 'deadlock detected' } },
      { data: { esito: 'ok', cassetta_id: 'c1', nome: 'C9' }, error: null },
    ])
    mockRpc.mockImplementation(rpc)
    const promessa = POST(req({ nome: 'C9' }), { params })
    await vi.advanceTimersByTimeAsync(1000)
    const res = await promessa
    vi.useRealTimers()

    expect(chiamate).toHaveLength(2)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[1].dispatched).toBe(true)
    expect(res.status).toBe(200)
  })

  it('retry sul 40P01 (R-D) sul ramo libera: primo tentativo deadlock, secondo ok → 200, RPC dispatched 2 volte', async () => {
    mockLavoroTrovato(true)
    vi.useFakeTimers()
    const { rpc, chiamate } = mockRpcLazy([
      { data: null, error: { code: '40P01', message: 'deadlock detected' } },
      { data: { esito: 'ok', nome: 'C9' }, error: null },
    ])
    mockRpc.mockImplementation(rpc)
    const promessa = POST(req(null), { params })
    await vi.advanceTimersByTimeAsync(1000)
    const res = await promessa
    vi.useRealTimers()

    expect(chiamate).toHaveLength(2)
    expect(res.status).toBe(200)
  })

  it('errore RPC non-40P01 (es. connessione) → 500', async () => {
    mockLavoroTrovato(true)
    const { rpc } = mockRpcLazy([{ data: null, error: { code: '08006', message: 'connection error, socket 5432 refused' } }])
    mockRpc.mockImplementation(rpc)
    const res = await POST(req({ nome: 'C9' }), { params })
    expect(res.status).toBe(500)
  })
})
