// tests/unit/impostazioni-preferenze-route.test.ts
// PATCH /api/impostazioni/preferenze — preferenza «La tua home» per-utente (Task 6).
// NB percorso: `tests/unit/`, MAI `src/app/api/**/__tests__/` (non esiste in questo repo,
// `vitest.config.ts` non la scoprirebbe → RED finto).
//
// Contratto reale della RPC (letto dalla migration applicata, NON dal brief):
//   utente_set_nav_pref(p_lab uuid, p_user uuid, p_chiave text, p_valore jsonb) RETURNS void
// → 4 argomenti (non 3: con 3 PostgREST risponde PGRST202), nessun `esito` json da mappare:
// successo = assenza di `error`. Tutte le RAISE della RPC sono errori di PROGRAMMAZIONE — la
// route valida PRIMA e non le deve mai produrre (422 per input fuori contratto, senza chiamare).
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

import { PATCH } from '../../src/app/api/impostazioni/preferenze/route'

/** Stesso mock lazy di cassette-id-route.test.ts / parco.test.ts: `dispatched` diventa true
 *  SOLO dentro `then()`, per distinguere «chiamata registrata» da «richiesta davvero spedita»
 *  (necessario perché `callRpcWithRetry` deve poter ri-invocare una thunk, non riusare una
 *  promise già risolta — vedi src/lib/supabase/rpc-retry.ts). */
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
const USER_ID = 'user-1'
const CONTEXT = {
  userId: USER_ID, email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function patchReq(body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  return new Request('http://localhost/api/impostazioni/preferenze', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as never
}

describe('PATCH /api/impostazioni/preferenze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('cross-origin (isSameOrigin false) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: 'parete' }, { origin: 'http://evil.com', host: 'localhost' }))
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await PATCH(patchReq({ home: 'parete' }))
    expect(res.status).toBe(401)
  })

  // Corrisponde al caso "admin_sistema" descritto dalla RPC (laboratorio_id NULL): la RPC di
  // per sé farebbe un no-op silenzioso (R-4.3), ma questa route segue lo stesso pattern
  // standard di Task 4 (`laboratorioId → 403` PRIMA di chiamare qualunque RPC) — quindi
  // admin_sistema non raggiunge mai la RPC attraverso QUESTA route: si ferma a 403. Il no-op
  // a 200 di R-4.3 è testato più sotto al livello della RPC (mock), dove è davvero raggiungibile.
  it('utente senza laboratorio (es. admin_sistema) → 403, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await PATCH(patchReq({ home: 'parete' }))
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('laboratorio in blacklist (assertLabOperativo) → 403, nessuna RPC', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Test' } })
    const res = await PATCH(patchReq({ home: 'parete' }))
    expect(res.status).toBe(403)
    expect(chiamate).toHaveLength(0)
  })

  it('body vuoto {} → 422 "campi_non_validi", nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({}))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('campi_non_validi')
    expect(chiamate).toHaveLength(0)
  })

  it('body JSON letterale null → equivale a {} → 422, niente TypeError, nessuna RPC', async () => {
    // req.json() risolve `null` per un body 'null' SENZA lanciare: senza `?? {}` questo
    // handler farebbe `hasOwnProperty.call(null, 'home')`, un TypeError, non un 422 pulito.
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq(null))
    expect(res.status).toBe(422)
    expect(chiamate).toHaveLength(0)
  })

  it('entrambe le chiavi insieme ({home, parete_intro_vista}) → 422 "campi_non_validi", nessuna RPC (una chiave alla volta)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: 'parete', parete_intro_vista: true }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('campi_non_validi')
    expect(chiamate).toHaveLength(0)
  })

  it('chiave fuori allowlist (es. {foo}) → 422 "campi_non_validi", nessuna RPC — ignorata, non passthrough', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ foo: 'bar' }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('campi_non_validi')
    expect(chiamate).toHaveLength(0)
  })

  it('{home: "parete"} → rpc("utente_set_nav_pref", {p_lab, p_user, p_chiave:"home", p_valore:"parete"}); 200', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: 'parete' }))
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].dispatched).toBe(true)
    expect(chiamate[0].args).toEqual([
      'utente_set_nav_pref',
      { p_lab: LAB_ID, p_user: USER_ID, p_chiave: 'home', p_valore: 'parete' },
    ])
  })

  it('{home: "pile"} e {home: "due_stanze"} → accettati, RPC chiamata con lo stesso valore', async () => {
    for (const valore of ['pile', 'due_stanze'] as const) {
      const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
      mockRpc.mockImplementation(rpc)
      const res = await PATCH(patchReq({ home: valore }))
      expect(res.status).toBe(200)
      expect(chiamate[0].args).toEqual([
        'utente_set_nav_pref',
        { p_lab: LAB_ID, p_user: USER_ID, p_chiave: 'home', p_valore: valore },
      ])
    }
  })

  it('{home: "boh"} (fuori enum) → 422 "home_non_valido", nessuna RPC chiamata (asserzione reale, non fiducia)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: 'boh' }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('home_non_valido')
    expect(chiamate).toHaveLength(0)
  })

  it('{home: 42} (non stringa) → 422 "home_non_valido", nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: 42 }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('home_non_valido')
    expect(chiamate).toHaveLength(0)
  })

  it('{home: null} → 422 "home_non_valido", nessuna RPC chiamata (p_valore non deve MAI arrivare NULL alla RPC)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: null }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('home_non_valido')
    expect(chiamate).toHaveLength(0)
  })

  it('{parete_intro_vista: true} → rpc("utente_set_nav_pref", {p_lab, p_user, p_chiave:"parete_intro_vista", p_valore:true}); 200', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ parete_intro_vista: true }))
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(1)
    expect(chiamate[0].args).toEqual([
      'utente_set_nav_pref',
      { p_lab: LAB_ID, p_user: USER_ID, p_chiave: 'parete_intro_vista', p_valore: true },
    ])
  })

  it('{parete_intro_vista: false} → 422 "parete_intro_vista_non_valido", nessuna RPC chiamata (solo true è ammesso)', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ parete_intro_vista: false }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('parete_intro_vista_non_valido')
    expect(chiamate).toHaveLength(0)
  })

  it('{parete_intro_vista: "true"} (stringa, non booleano) → 422, nessuna RPC chiamata', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ parete_intro_vista: 'true' }))
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(json.errore).toBe('parete_intro_vista_non_valido')
    expect(chiamate).toHaveLength(0)
  })

  it('p_user è SEMPRE da context.userId e p_lab SEMPRE da context.laboratorioId — mai dal body, anche se il body prova a iniettarli', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    await PATCH(patchReq({ home: 'parete', p_user: 'attaccante', p_lab: 'lab-attaccante', laboratorio_id: 'lab-attaccante' }))
    expect(chiamate[0].args).toEqual([
      'utente_set_nav_pref',
      { p_lab: LAB_ID, p_user: USER_ID, p_chiave: 'home', p_valore: 'parete' },
    ])
  })

  // Corrisponde a R-4.3 (commento della migration): con RETURNS void, un UPDATE che tocca 0
  // righe (es. p_user/p_lab non corrispondono più a una riga viva) risolve ESATTAMENTE come un
  // UPDATE che ne tocca 1 — { data: null, error: null }. La route non ha modo di distinguerli e
  // NON deve provarci: qualunque risoluzione senza `error` è un successo, punto. Test a livello
  // di RPC (qui il no-op È raggiungibile, a differenza del test end-to-end "admin_sistema" sopra
  // che si ferma prima, a 403).
  it('R-4.3: RPC risolta senza errore ma "0 righe aggiornate" (no-op silenzioso) → 200 comunque, non un errore', async () => {
    const { rpc, chiamate } = mockRpcLazy([{ data: null, error: null }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ parete_intro_vista: true }))
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(1)
  })

  it('deadlock (40P01) al primo tentativo → un solo retry via callRpcWithRetry, poi 200', async () => {
    const { rpc, chiamate } = mockRpcLazy([
      { data: null, error: { code: '40P01', message: 'deadlock detected' } },
      { data: null, error: null },
    ])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: 'parete' }))
    expect(res.status).toBe(200)
    expect(chiamate).toHaveLength(2)
  })

  it('errore RPC non-40P01 (es. connessione) → 500, console.error chiamato', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rpc } = mockRpcLazy([{ data: null, error: { code: '08006', message: 'connection error' } }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ home: 'parete' }))
    expect(res.status).toBe(500)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('RAISE di programmazione dalla RPC (es. p_valore NULL, non dovrebbe mai accadere data la validazione route) → 500, non un esito di dominio 4xx', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { rpc } = mockRpcLazy([{ data: null, error: { code: 'P0001', message: 'valore nav_preferences non valido: NULL' } }])
    mockRpc.mockImplementation(rpc)
    const res = await PATCH(patchReq({ parete_intro_vista: true }))
    expect(res.status).toBe(500)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})
