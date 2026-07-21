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

import { PATCH, DELETE } from '../../src/app/api/cassette/[id]/route'

/** Stesso mock lazy di cassette-route.test.ts / cassette-riordino-route.test.ts:
 *  `dispatched` diventa true SOLO dentro `then()`, per distinguere «thunk invocata»
 *  da «richiesta davvero spedita» (necessario per il retry di `callRpcWithRetry`). */
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
const CASSETTA_ID = 'cassetta-1'
const params = Promise.resolve({ id: CASSETTA_ID })
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function patchReq(body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  return new Request(`http://localhost/api/cassette/${CASSETTA_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as never
}

function deleteReq(headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  return new Request(`http://localhost/api/cassette/${CASSETTA_ID}`, {
    method: 'DELETE',
    headers,
  }) as never
}

describe('PATCH /api/cassette/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('cross-origin (isSameOrigin false) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 'X' }, { origin: 'http://evil.com', host: 'localhost' }), { params })
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(403)
  })

  it('laboratorio in blacklist (assertLabOperativo) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('correzione 4: {nome, colore} insieme → 422, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 'X', colore: 'blu' }), { params })
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('correzione 4: PATCH {} (nessuno dei due campi) → 422, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({}), { params })
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('campi non previsti (es. posizione, laboratorio_id) vengono ignorati — allowlist, mai passthrough: senza nome/colore resta 422', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ posizione: 5, laboratorio_id: 'altro-lab' }), { params })
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('{nome} → rpc("cassetta_rinomina_atomica", {p_lab, p_cassetta_id, p_nome}); esito ok → 200', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 'Nuovo nome' }), { params })
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[0].args).toEqual(['cassetta_rinomina_atomica', { p_lab: LAB_ID, p_cassetta_id: CASSETTA_ID, p_nome: 'Nuovo nome' }])
  })

  it('{nome} campi extra nel body vengono ignorati nel payload RPC (allowlist)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    await PATCH(patchReq({ nome: 'Nuovo nome', laboratorio_id: 'altro-lab', id: 'altro-id' }), { params })
    expect(chiamate[0].args).toEqual(['cassetta_rinomina_atomica', { p_lab: LAB_ID, p_cassetta_id: CASSETTA_ID, p_nome: 'Nuovo nome' }])
  })

  it('{nome} esito "nome_occupato" → 409', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'nome_occupato' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 'Occupato' }), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.errore).toBe('nome_occupato')
  })

  it('{nome} esito "cassetta_non_trovata" → 404', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'cassetta_non_trovata' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(404)
  })

  it('{nome} esito "nome_non_valido" → 422', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'nome_non_valido' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(422)
  })

  it('{nome} non stringa (es. numero) → 422 in route, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 42 }), { params })
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('{colore} → rpc("cassetta_imposta_colore_atomica", {p_lab, p_cassetta_id, p_colore}); esito "cassetta_non_trovata" → 404', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'cassetta_non_trovata' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ colore: 'blu' }), { params })
    expect(res.status).toBe(404)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].args).toEqual(['cassetta_imposta_colore_atomica', { p_lab: LAB_ID, p_cassetta_id: CASSETTA_ID, p_colore: 'blu' }])
  })

  it('{colore} hex minuscolo → normalizzato MAIUSCOLO nel payload della RPC prima della chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', colore: '#FF00AA' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ colore: '#ff00aa' }), { params })
    expect(res.status).toBe(200)
    expect(chiamate[0].args).toEqual(['cassetta_imposta_colore_atomica', { p_lab: LAB_ID, p_cassetta_id: CASSETTA_ID, p_colore: '#FF00AA' }])
  })

  it('{colore} esito ok → 200', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'ok', colore: 'blu' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ colore: 'blu' }), { params })
    expect(res.status).toBe(200)
  })

  it('{colore} non valido (slug sconosciuto) → 422 in route, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok', colore: 'blu' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ colore: 'fucsia' }), { params })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('colore_non_valido')
    expect(chiamate).toHaveLength(0)
  })

  it('p_lab è SEMPRE dal context, mai dal body — anche se il body prova a iniettarlo', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    await PATCH(patchReq({ nome: 'X', p_lab: 'lab-attaccante', laboratorio_id: 'lab-attaccante' }), { params })
    expect(chiamate[0].args).toEqual(['cassetta_rinomina_atomica', { p_lab: LAB_ID, p_cassetta_id: CASSETTA_ID, p_nome: 'X' }])
  })

  it('errore RPC non-40P01 (es. connessione) su rinomina → 500', async () => {
    const { rpc } = mockRpcLazy([{ data: null, error: { code: '08006', message: 'connection error' } }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ nome: 'X' }), { params })
    expect(res.status).toBe(500)
  })

  it('errore RPC non-40P01 (es. connessione) su colore → 500', async () => {
    const { rpc } = mockRpcLazy([{ data: null, error: { code: '08006', message: 'connection error' } }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ colore: 'blu' }), { params })
    expect(res.status).toBe(500)
  })
})

describe('DELETE /api/cassette/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('cross-origin (isSameOrigin false) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await DELETE(deleteReq({ origin: 'http://evil.com', host: 'localhost' }), { params })
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(403)
  })

  it('laboratorio in blacklist (assertLabOperativo) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('rpc("cassetta_elimina_atomica", {p_lab, p_cassetta_id}); esito "occupata" → 409', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'occupata' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await DELETE(deleteReq(), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.errore).toBe('occupata')
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[0].args).toEqual(['cassetta_elimina_atomica', { p_lab: LAB_ID, p_cassetta_id: CASSETTA_ID }])
  })

  it('esito "cassetta_non_trovata" → 404', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'cassetta_non_trovata' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(404)
  })

  it('esito "ok" → 200', async () => {
    const { rpc } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(200)
  })

  it('p_lab è SEMPRE dal context server-side (nessun body su DELETE da cui poterlo iniettare, ma lo si asserisce comunque sugli argomenti esatti)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: { esito: 'ok' }, error: null }])
    mockRpc.mockImplementation(rpc)
    await DELETE(deleteReq(), { params })
    expect(chiamate[0].args).toEqual(['cassetta_elimina_atomica', { p_lab: LAB_ID, p_cassetta_id: CASSETTA_ID }])
  })

  it('errore RPC non-40P01 (es. connessione) → 500', async () => {
    const { rpc } = mockRpcLazy([{ data: null, error: { code: '08006', message: 'connection error' } }])
    mockRpc.mockImplementation(rpc)
    const res = await DELETE(deleteReq(), { params })
    expect(res.status).toBe(500)
  })
})
