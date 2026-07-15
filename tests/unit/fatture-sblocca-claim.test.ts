// tests/unit/fatture-sblocca-claim.test.ts
// Task 12: POST /api/fatture/[id]/sblocca-claim — sblocco titolare-only del
// claim anti-doppio-invio PEC (smtp_inviata_at, vedi
// src/lib/fattura/invio-claim.ts) su un claim ORFANO (crash post-claim,
// pre-invio). Pattern mock ricalcato da fatture-invia-pec-route.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { POST } from '../../src/app/api/fatture/[id]/sblocca-claim/route'

type MockResult = { data: unknown; error: unknown }
const insertPayloads: Array<Record<string, unknown>> = []
const updatePayloads: Array<{ payload: Record<string, unknown>; filters: Record<string, unknown>; nots: Record<string, unknown> }> = []

function selectChain(result: MockResult) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is']) c[m] = () => c
  c.single = async () => result
  return c
}
function updateChain(result: MockResult) {
  const filters: Record<string, unknown> = {}
  const nots: Record<string, unknown> = {}
  const c: Record<string, unknown> = {}
  let payload: Record<string, unknown> = {}
  c.update = (p: Record<string, unknown>) => { payload = p; return c }
  c.eq = (field: string, value: unknown) => { filters[field] = value; return c }
  c.not = (field: string, op: string, value: unknown) => { nots[field] = { op, value }; return c }
  c.select = async () => {
    updatePayloads.push({ payload, filters: { ...filters }, nots: { ...nots } })
    return result
  }
  return c
}
function insertChain(result: { error: unknown }) {
  const c: Record<string, unknown> = {}
  c.insert = (payload: Record<string, unknown>) => {
    insertPayloads.push(payload)
    return Promise.resolve(result)
  }
  return c
}

let fattureQueue: Array<Record<string, unknown>> = []
let eventiQueue: Array<Record<string, unknown>> = []
let utenteRow: Record<string, unknown> | null = null

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
  insertPayloads.length = 0
  updatePayloads.length = 0
  utenteRow = { laboratorio_id: 'lab-1', ruolo: 'titolare' }
  fattureQueue = []
  eventiQueue = []
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return selectChain({ data: utenteRow, error: null })
    if (table === 'fatture') {
      const next = fattureQueue.shift()
      if (!next) throw new Error('fattureQueue esaurita')
      return next
    }
    if (table === 'fatture_sdi_eventi') {
      const next = eventiQueue.shift()
      if (!next) throw new Error('eventiQueue esaurita')
      return next
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

function happyQueue() {
  fattureQueue = [
    selectChain({ data: FATTURA_ORFANA, error: null }),
    updateChain({ data: [{ id: 'fat-1' }], error: null }),
  ]
  eventiQueue = [insertChain({ error: null })]
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
    utenteRow = null
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
  it('stato_sdi ≠ generata → 409, nessun update', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_ORFANA, stato_sdi: 'smtp_inviata' }, error: null })]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(updatePayloads).toHaveLength(0)
  })
  it('smtp_inviata_at NULL (nessun claim in corso) → 409, nessun update', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_ORFANA, smtp_inviata_at: null }, error: null })]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(updatePayloads).toHaveLength(0)
  })
})

describe('POST /api/fatture/[id]/sblocca-claim — percorso felice', () => {
  it('caso valido → 200, UPDATE smtp_inviata_at=NULL guardato + INSERT evento origine=sblocco_claim', async () => {
    happyQueue()
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(200)

    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].payload).toEqual({ smtp_inviata_at: null })
    expect(updatePayloads[0].filters).toEqual({ id: 'fat-1', laboratorio_id: 'lab-1', stato_sdi: 'generata' })
    expect(updatePayloads[0].nots).toEqual({ smtp_inviata_at: { op: 'is', value: null } })

    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0]).toMatchObject({
      laboratorio_id: 'lab-1',
      fattura_id: 'fat-1',
      origine: 'sblocco_claim',
      motivo: 'Verificata cartella inviata PEC — mail presente',
      registrato_da: 'user-1',
    })
  })
  it('update guardato ritorna 0 righe (race) → 409, INSERT evento MAI chiamato', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_ORFANA, error: null }),
      updateChain({ data: [], error: null }),
    ]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(insertPayloads).toHaveLength(0)
  })
  it('errore Postgres su UPDATE → 500 senza leak', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_ORFANA, error: null }),
      updateChain({ data: null, error: { message: 'deadlock detected (dettaglio sensibile)' } }),
    ]
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(BODY_OK), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('deadlock')
    expect(insertPayloads).toHaveLength(0)
  })
  it('errore Postgres su INSERT evento → 500 senza leak (update già avvenuto)', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_ORFANA, error: null }),
      updateChain({ data: [{ id: 'fat-1' }], error: null }),
    ]
    eventiQueue = [insertChain({ error: { message: 'constraint violata (dettaglio sensibile)' } })]
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(BODY_OK), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('constraint violata')
  })
})
