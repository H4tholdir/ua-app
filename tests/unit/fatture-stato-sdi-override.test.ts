// tests/unit/fatture-stato-sdi-override.test.ts
// Task 12: POST /api/fatture/[id]/stato-sdi-override — override manuale
// titolare-only di uno stato SdI (fattura bloccata/senza ricevuta
// automatica riscontrabile). Pattern mock ricalcato da
// fatture-invia-pec-route.test.ts (coda di chain su from('fatture')).
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

import { POST } from '../../src/app/api/fatture/[id]/stato-sdi-override/route'

type MockResult = { data: unknown; error: unknown }
const insertPayloads: Array<Record<string, unknown>> = []
const updatePayloads: Array<{ payload: Record<string, unknown>; filters: Record<string, unknown> }> = []

function selectChain(result: MockResult) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is']) c[m] = () => c
  c.single = async () => result
  return c
}
function updateChain(result: MockResult) {
  const filters: Record<string, unknown> = {}
  const c: Record<string, unknown> = {}
  let payload: Record<string, unknown> = {}
  c.update = (p: Record<string, unknown>) => { payload = p; return c }
  c.eq = (field: string, value: unknown) => { filters[field] = value; return c }
  c.select = async () => {
    updatePayloads.push({ payload, filters: { ...filters } })
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

const FATTURA_OK = {
  id: 'fat-1', numero: '2026-0007', stato_sdi: 'smtp_inviata', tipo_documento: 'TD01',
}

function req(body: unknown) {
  return new Request('http://localhost/api/fatture/fat-1/stato-sdi-override', {
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

// Coda standard del percorso felice: select fattura → update ok → insert evento ok.
function happyQueue(overrides: Partial<typeof FATTURA_OK> = {}) {
  fattureQueue = [
    selectChain({ data: { ...FATTURA_OK, ...overrides }, error: null }),
    updateChain({ data: [{ id: 'fat-1' }], error: null }),
  ]
  eventiQueue = [insertChain({ error: null })]
}

const BODY_OK = {
  stato_sdi_atteso: 'smtp_inviata',
  nuovo_stato: 'pec_consegnata',
  motivo: 'Confermato manualmente dal portale SdI',
}

describe('POST /api/fatture/[id]/stato-sdi-override — guardie', () => {
  it('CSRF: origin diverso → 403, nessuna query', async () => {
    const bad = new Request('http://localhost/api/fatture/fat-1/stato-sdi-override', {
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

describe('POST /api/fatture/[id]/stato-sdi-override — validazione body', () => {
  it('nuovo_stato fuori allowlist → 422', async () => {
    const res = await POST(req({ ...BODY_OK, nuovo_stato: 'ricevuta_sdi' }), ctx)
    expect(res.status).toBe(422)
    expect(fattureQueue).toHaveLength(0)
  })
  it('nuovo_stato "scaduta" → 422 (allowlist esplicita)', async () => {
    const res = await POST(req({ ...BODY_OK, nuovo_stato: 'scaduta' }), ctx)
    expect(res.status).toBe(422)
  })
  it('nuovo_stato mancante → 422', async () => {
    const res = await POST(req({ stato_sdi_atteso: 'smtp_inviata', motivo: 'x' }), ctx)
    expect(res.status).toBe(422)
  })
  it('motivo vuoto → 422', async () => {
    const res = await POST(req({ ...BODY_OK, motivo: '' }), ctx)
    expect(res.status).toBe(422)
    expect(fattureQueue).toHaveLength(0)
  })
  it('motivo solo whitespace → 422', async () => {
    const res = await POST(req({ ...BODY_OK, motivo: '   ' }), ctx)
    expect(res.status).toBe(422)
  })
  it('motivo mancante → 422', async () => {
    const res = await POST(
      req({ stato_sdi_atteso: BODY_OK.stato_sdi_atteso, nuovo_stato: BODY_OK.nuovo_stato }),
      ctx
    )
    expect(res.status).toBe(422)
  })
  it('body non-JSON → 422 (trattato come campi mancanti, fail-closed)', async () => {
    const bad = new Request('http://localhost/api/fatture/fat-1/stato-sdi-override', {
      method: 'POST', headers: { origin: 'http://localhost', host: 'localhost' },
      body: 'non-json{{{',
    }) as never
    const res = await POST(bad, ctx)
    expect(res.status).toBe(422)
  })
})

describe('POST /api/fatture/[id]/stato-sdi-override — anti-stale-read e monotonia', () => {
  it('fattura non trovata / altro lab → 404', async () => {
    fattureQueue = [selectChain({ data: null, error: null })]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(404)
  })
  it('stato_sdi_atteso ≠ stato corrente → 409, nessun update', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_OK, stato_sdi: 'pec_consegnata' }, error: null })]
    const res = await POST(req({ ...BODY_OK, stato_sdi_atteso: 'smtp_inviata' }), ctx)
    expect(res.status).toBe(409)
    expect(updatePayloads).toHaveLength(0)
  })
  it('rank(nuovo_stato) <= rank(corrente) → 409 (transizione non monotona)', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, stato_sdi: 'accettata' }, error: null }),
    ]
    const res = await POST(
      req({ stato_sdi_atteso: 'accettata', nuovo_stato: 'pec_consegnata', motivo: 'x' }),
      ctx
    )
    expect(res.status).toBe(409)
    expect(updatePayloads).toHaveLength(0)
  })
  it('rank(nuovo_stato) == rank(corrente) (accettata→rifiutata, entrambi rank 6) → 409', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, stato_sdi: 'accettata' }, error: null }),
    ]
    const res = await POST(
      req({ stato_sdi_atteso: 'accettata', nuovo_stato: 'rifiutata', motivo: 'x', conferma_effetti_storno: true }),
      ctx
    )
    expect(res.status).toBe(409)
  })
})

describe('POST /api/fatture/[id]/stato-sdi-override — TD04 doppia conferma', () => {
  it('TD04 → rifiutata SENZA conferma_effetti_storno → 422, nessun update', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, tipo_documento: 'TD04', stato_sdi: 'pec_consegnata' }, error: null }),
    ]
    const res = await POST(
      req({ stato_sdi_atteso: 'pec_consegnata', nuovo_stato: 'rifiutata', motivo: 'SdI ha scartato il TD04' }),
      ctx
    )
    expect(res.status).toBe(422)
    expect(updatePayloads).toHaveLength(0)
  })
  it('TD04 → rifiutata con conferma_effetti_storno:false → 422', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, tipo_documento: 'TD04', stato_sdi: 'pec_consegnata' }, error: null }),
    ]
    const res = await POST(
      req({
        stato_sdi_atteso: 'pec_consegnata', nuovo_stato: 'rifiutata',
        motivo: 'SdI ha scartato il TD04', conferma_effetti_storno: false,
      }),
      ctx
    )
    expect(res.status).toBe(422)
  })
  it('TD04 → rifiutata CON conferma_effetti_storno:true → 200, procede', async () => {
    happyQueue({ tipo_documento: 'TD04', stato_sdi: 'pec_consegnata' })
    const res = await POST(
      req({
        stato_sdi_atteso: 'pec_consegnata', nuovo_stato: 'rifiutata',
        motivo: 'SdI ha scartato il TD04', conferma_effetti_storno: true,
      }),
      ctx
    )
    expect(res.status).toBe(200)
  })
  it('TD01 → rifiutata SENZA conferma_effetti_storno → 200 (gate solo per TD04)', async () => {
    happyQueue({ tipo_documento: 'TD01', stato_sdi: 'pec_consegnata' })
    const res = await POST(
      req({ stato_sdi_atteso: 'pec_consegnata', nuovo_stato: 'rifiutata', motivo: 'SdI ha scartato il TD01' }),
      ctx
    )
    expect(res.status).toBe(200)
  })
})

describe('POST /api/fatture/[id]/stato-sdi-override — percorso felice', () => {
  it('caso valido → 200, UPDATE guardato + INSERT evento origine=override_manuale', async () => {
    happyQueue()
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(200)

    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].payload).toEqual({ stato_sdi: 'pec_consegnata' })
    expect(updatePayloads[0].filters).toEqual({
      id: 'fat-1', laboratorio_id: 'lab-1', stato_sdi: 'smtp_inviata',
    })

    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0]).toMatchObject({
      laboratorio_id: 'lab-1',
      fattura_id: 'fat-1',
      origine: 'override_manuale',
      stato_da: 'smtp_inviata',
      stato_a: 'pec_consegnata',
      motivo: 'Confermato manualmente dal portale SdI',
      registrato_da: 'user-1',
    })
    // lista_errori è riservato agli errori NS (Array<{codice, descrizione}>):
    // l'evento override non deve MAI valorizzarlo.
    expect(insertPayloads[0]).not.toHaveProperty('lista_errori')
  })
  it('importo_storno_visto presente → accettato ma NON persistito (lista_errori riservato a errori NS)', async () => {
    happyQueue()
    const res = await POST(req({ ...BODY_OK, importo_storno_visto: 123.45 }), ctx)
    expect(res.status).toBe(200)
    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0]).not.toHaveProperty('lista_errori')
    expect(JSON.stringify(insertPayloads[0])).not.toContain('importo_storno_visto')
  })
  it('update guardato ritorna 0 righe (race) → 409, INSERT evento MAI chiamato', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
      updateChain({ data: [], error: null }),
    ]
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(insertPayloads).toHaveLength(0)
  })
  it('errore Postgres su UPDATE → 500 senza leak', async () => {
    fattureQueue = [
      selectChain({ data: FATTURA_OK, error: null }),
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
      selectChain({ data: FATTURA_OK, error: null }),
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
