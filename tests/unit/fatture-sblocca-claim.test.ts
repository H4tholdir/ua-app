// tests/unit/fatture-sblocca-claim.test.ts
// Task 12: POST /api/fatture/[id]/sblocca-claim — sblocco titolare-only del
// claim anti-doppio-invio PEC (smtp_inviata_at, vedi
// src/lib/fattura/invio-claim.ts) su un claim ORFANO (crash post-claim,
// pre-invio). Pattern mock ricalcato da fatture-invia-pec-route.test.ts.
//
// Task 12b: il writer (UPDATE fatture + INSERT evento audit) è stato reso
// atomico tramite la RPC public.sblocca_claim_fattura (migration
// 20260716110000) — i test del percorso felice/errori sul writer ora
// mockano `.rpc()` invece di update/insert su from('fatture').
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))

import { POST } from '../../src/app/api/fatture/[id]/sblocca-claim/route'

type MockResult = { data: unknown; error: unknown }

function selectChain(result: MockResult) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is']) c[m] = () => c
  c.single = async () => result
  return c
}

let fattureQueue: Array<Record<string, unknown>> = []
let utenteRow: Record<string, unknown> | null = null
const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = []
let rpcResult: { data: unknown; error: { message: string } | null } = { data: null, error: null }

const FATTURA_ORFANA = {
  id: 'fat-1', numero: '2026-0007', stato_sdi: 'generata', smtp_inviata_at: '2026-07-15T09:00:00Z',
}

function req(body: unknown) {
  return new Request('http://localhost/api/fatture/fat-1/sblocca-claim', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as never
}
const ctx = { params: Promise.resolve({ id: 'fat-1' }) }

beforeEach(() => {
  vi.clearAllMocks()
  rpcCalls.length = 0
  rpcResult = { data: null, error: null }
  utenteRow = { laboratorio_id: 'lab-1', ruolo: 'titolare' }
  fattureQueue = []
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockRpc.mockImplementation(async (fn: string, args: Record<string, unknown>) => {
    rpcCalls.push({ fn, args })
    return rpcResult
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return selectChain({ data: utenteRow, error: null })
    if (table === 'fatture') {
      const next = fattureQueue.shift()
      if (!next) throw new Error('fattureQueue esaurita')
      return next
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

function happyQueue() {
  fattureQueue = [selectChain({ data: FATTURA_ORFANA, error: null })]
  rpcResult = { data: { esito: 'sbloccato' }, error: null }
}

const BODY_OK = { motivo: 'Verificata cartella inviata PEC — mail presente', verificata_cartella_inviata: true }

describe('POST /api/fatture/[id]/sblocca-claim — guardie', () => {
  it('CSRF: origin diverso → 403, nessuna query', async () => {
    const bad = new Request('http://localhost/api/fatture/fat-1/sblocca-claim', {
      method: 'POST', headers: { origin: 'http://evil.example', host: 'localhost' },
    }) as never
    const res = await POST(bad, ctx)
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })
  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    expect((await POST(req(BODY_OK), ctx)).status).toBe(401)
  })
  it('utente senza laboratorio → 403', async () => {
    // DEVIAZIONE (Task 10, stesso pattern Task 9): riga utenti assente del
    // tutto collassa su context null (fail-closed getFreshLabContext) → 401,
    // non più 403. Qui testiamo lo scenario reale distinto: profilo trovato
    // ma SENZA laboratorio (laboratorio_id: null) → 403 preservato.
    utenteRow = { laboratorio_id: null, ruolo: 'titolare' }
    expect((await POST(req(BODY_OK), ctx)).status).toBe(403)
  })
  it('ruolo front_desk → 403 (SOLO titolare)', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'front_desk' }
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(403)
    expect(fattureQueue).toHaveLength(0)
  })
  it('ruolo tecnico → 403', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'tecnico' }
    expect((await POST(req(BODY_OK), ctx)).status).toBe(403)
  })
})

describe('POST /api/fatture/[id]/sblocca-claim — validazione body', () => {
  it('senza verificata_cartella_inviata:true → 422, nessuna query fatture', async () => {
    const res = await POST(req({ motivo: 'x' }), ctx)
    expect(res.status).toBe(422)
    expect(fattureQueue).toHaveLength(0)
  })
  it('verificata_cartella_inviata:false → 422', async () => {
    const res = await POST(req({ motivo: 'x', verificata_cartella_inviata: false }), ctx)
    expect(res.status).toBe(422)
  })
  it('motivo vuoto → 422', async () => {
    const res = await POST(req({ motivo: '', verificata_cartella_inviata: true }), ctx)
    expect(res.status).toBe(422)
    expect(fattureQueue).toHaveLength(0)
  })
  it('motivo mancante → 422', async () => {
    const res = await POST(req({ verificata_cartella_inviata: true }), ctx)
    expect(res.status).toBe(422)
  })
  it('body non-JSON → 422 (fail-closed)', async () => {
    const bad = new Request('http://localhost/api/fatture/fat-1/sblocca-claim', {
      method: 'POST', headers: { origin: 'http://localhost', host: 'localhost' },
      body: 'non-json{{{',
    }) as never
    const res = await POST(bad, ctx)
    expect(res.status).toBe(422)
  })
})

describe('POST /api/fatture/[id]/sblocca-claim — claim orfano', () => {
  it('fattura non trovata / altro lab → 404', async () => {
    fattureQueue = [selectChain({ data: null, error: null })]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(404)
  })
  it('stato_sdi ≠ generata → 409, nessuna RPC (guardia route pre-esistente)', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_ORFANA, stato_sdi: 'smtp_inviata' }, error: null })]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(0)
  })
  it('smtp_inviata_at NULL (nessun claim in corso) → 409, nessuna RPC', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_ORFANA, smtp_inviata_at: null }, error: null })]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(0)
  })
})

describe('POST /api/fatture/[id]/sblocca-claim — percorso felice', () => {
  it('caso valido → 200, RPC sblocca_claim_fattura con i parametri attesi', async () => {
    happyQueue()
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0]).toEqual({
      fn: 'sblocca_claim_fattura',
      args: {
        p_fattura_id: 'fat-1',
        p_laboratorio_id: 'lab-1',
        p_motivo: 'Verificata cartella inviata PEC — mail presente',
        p_registrato_da: 'user-1',
      },
    })
  })
  it('RPC ritorna non_in_claim (race tra pre-check e RPC) → 409, difesa in profondità', async () => {
    fattureQueue = [selectChain({ data: FATTURA_ORFANA, error: null })]
    rpcResult = { data: { esito: 'non_in_claim', stato_corrente: 'smtp_inviata' }, error: null }
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(1)
  })
  it('errore Postgres su RPC → 500 senza leak', async () => {
    fattureQueue = [selectChain({ data: FATTURA_ORFANA, error: null })]
    rpcResult = { data: null, error: { message: 'deadlock detected (dettaglio sensibile)' } }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(BODY_OK), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('deadlock')
  })
  it('esito RPC inatteso → 500 fail-closed (difesa in profondità sul dato persistito)', async () => {
    fattureQueue = [selectChain({ data: FATTURA_ORFANA, error: null })]
    rpcResult = { data: { esito: 'boh' }, error: null }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(BODY_OK), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(500)
  })
})
