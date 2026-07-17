// tests/unit/fatture-stato-sdi-override.test.ts
// Task 12: POST /api/fatture/[id]/stato-sdi-override — override manuale
// titolare-only di uno stato SdI (fattura bloccata/senza ricevuta
// automatica riscontrabile). Pattern mock ricalcato da
// fatture-invia-pec-route.test.ts (coda di chain su from('fatture')).
//
// Task 12b: il writer (UPDATE fatture + INSERT evento audit) è stato reso
// atomico tramite la RPC public.override_stato_sdi (migration
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

import { POST } from '../../src/app/api/fatture/[id]/stato-sdi-override/route'

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

const FATTURA_OK: {
  id: string
  numero: string
  stato_sdi: string
  tipo_documento: string
  smtp_inviata_at?: string | null
} = {
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
  rpcCalls.length = 0
  rpcResult = { data: null, error: null }
  utenteRow = { laboratorio_id: 'lab-1', ruolo: 'titolare', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }
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

// Coda standard del percorso felice: select fattura → RPC applicato.
function happyQueue(overrides: Partial<typeof FATTURA_OK> = {}, esitoOverrides: Record<string, unknown> = {}) {
  fattureQueue = [selectChain({ data: { ...FATTURA_OK, ...overrides }, error: null })]
  rpcResult = {
    data: {
      esito: 'applicato',
      stato_da: overrides.stato_sdi ?? FATTURA_OK.stato_sdi,
      stato_a: BODY_OK.nuovo_stato,
      ...esitoOverrides,
    },
    error: null,
  }
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
    // DEVIAZIONE (Task 10, stesso pattern Task 9): riga utenti assente del
    // tutto collassa su context null (fail-closed getFreshLabContext) → 401,
    // non più 403. Qui testiamo lo scenario reale distinto: profilo trovato
    // ma SENZA laboratorio (laboratorio_id: null) → 403 preservato.
    utenteRow = { laboratorio_id: null, ruolo: 'titolare' }
    expect((await POST(req(BODY_OK), ctx)).status).toBe(403)
  })
  it('ruolo front_desk → 403 (SOLO titolare)', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'front_desk', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(403)
    expect(fattureQueue).toHaveLength(0)
  })
  it('ruolo tecnico → 403', async () => {
    utenteRow = { laboratorio_id: 'lab-1', ruolo: 'tecnico', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }
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
  it('stato_sdi_atteso ≠ stato corrente → 409, nessuna RPC (guardia route pre-esistente)', async () => {
    fattureQueue = [selectChain({ data: { ...FATTURA_OK, stato_sdi: 'pec_consegnata' }, error: null })]
    const res = await POST(req({ ...BODY_OK, stato_sdi_atteso: 'smtp_inviata' }), ctx)
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(0)
  })
  it('rank(nuovo_stato) <= rank(corrente) → 409 (transizione non monotona), nessuna RPC', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, stato_sdi: 'accettata' }, error: null }),
    ]
    const res = await POST(
      req({ stato_sdi_atteso: 'accettata', nuovo_stato: 'pec_consegnata', motivo: 'x' }),
      ctx
    )
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(0)
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

describe('POST /api/fatture/[id]/stato-sdi-override — guardia sorgente (Finding 4, review finale Task 17)', () => {
  // applica_ricevuta_sdi (writer gemello) blocca esplicitamente «generata
  // mai inviata» — override_stato_sdi deve fare lo stesso, sia lato route
  // (guardia pre-RPC qui testata) sia nella RPC stessa (migration
  // 20260716130000_override_guardia_sorgente.sql).
  it('stato corrente "draft" → 409, nessuna RPC', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, stato_sdi: 'draft', smtp_inviata_at: null }, error: null }),
    ]
    const res = await POST(
      req({ stato_sdi_atteso: 'draft', nuovo_stato: 'pec_consegnata', motivo: 'x' }),
      ctx
    )
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(0)
  })

  it('stato corrente "generata" MAI inviata (smtp_inviata_at NULL) → 409, nessuna RPC', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, stato_sdi: 'generata', smtp_inviata_at: null }, error: null }),
    ]
    const res = await POST(
      req({ stato_sdi_atteso: 'generata', nuovo_stato: 'pec_consegnata', motivo: 'x' }),
      ctx
    )
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(0)
  })

  it('stato corrente "generata" con smtp_inviata_at valorizzato (claim orfano) → passa il gate sorgente, RPC chiamata', async () => {
    happyQueue({ stato_sdi: 'generata', smtp_inviata_at: '2026-07-16T09:00:00.000Z' })
    const res = await POST(
      req({ stato_sdi_atteso: 'generata', nuovo_stato: 'pec_consegnata', motivo: 'x' }),
      ctx
    )
    expect(res.status).toBe(200)
    expect(rpcCalls).toHaveLength(1)
  })

  it('RPC ritorna esito "mai_inviata" (difesa in profondità, race sul dato persistito) → 409', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, stato_sdi: 'generata', smtp_inviata_at: '2026-07-16T09:00:00.000Z' }, error: null }),
    ]
    rpcResult = { data: { esito: 'mai_inviata', stato_corrente: 'generata' }, error: null }
    const res = await POST(
      req({ stato_sdi_atteso: 'generata', nuovo_stato: 'pec_consegnata', motivo: 'x' }),
      ctx
    )
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(1)
  })
})

describe('POST /api/fatture/[id]/stato-sdi-override — TD04 doppia conferma', () => {
  it('TD04 → rifiutata SENZA conferma_effetti_storno → 422, nessuna RPC', async () => {
    fattureQueue = [
      selectChain({ data: { ...FATTURA_OK, tipo_documento: 'TD04', stato_sdi: 'pec_consegnata' }, error: null }),
    ]
    const res = await POST(
      req({ stato_sdi_atteso: 'pec_consegnata', nuovo_stato: 'rifiutata', motivo: 'SdI ha scartato il TD04' }),
      ctx
    )
    expect(res.status).toBe(422)
    expect(rpcCalls).toHaveLength(0)
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
  it('caso valido → 200, RPC override_stato_sdi con i parametri attesi', async () => {
    happyQueue()
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, stato_da: 'smtp_inviata', stato_a: 'pec_consegnata' })

    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0]).toEqual({
      fn: 'override_stato_sdi',
      args: {
        p_fattura_id: 'fat-1',
        p_laboratorio_id: 'lab-1',
        p_stato_atteso: 'smtp_inviata',
        p_nuovo_stato: 'pec_consegnata',
        p_motivo: 'Confermato manualmente dal portale SdI',
        p_registrato_da: 'user-1',
      },
    })
  })
  it('importo_storno_visto presente → accettato ma NON passato alla RPC', async () => {
    happyQueue()
    const res = await POST(req({ ...BODY_OK, importo_storno_visto: 123.45 }), ctx)
    expect(res.status).toBe(200)
    expect(rpcCalls).toHaveLength(1)
    expect(JSON.stringify(rpcCalls[0].args)).not.toContain('importo_storno_visto')
  })
  it('RPC ritorna stato_stantio (race tra pre-check e RPC) → 409, difesa in profondità', async () => {
    fattureQueue = [selectChain({ data: FATTURA_OK, error: null })]
    rpcResult = { data: { esito: 'stato_stantio', stato_corrente: 'pec_consegnata' }, error: null }
    const res = await POST(req(BODY_OK), ctx)
    expect(res.status).toBe(409)
    expect(rpcCalls).toHaveLength(1)
  })
  it('errore Postgres su RPC → 500 senza leak', async () => {
    fattureQueue = [selectChain({ data: FATTURA_OK, error: null })]
    rpcResult = { data: null, error: { message: 'deadlock detected (dettaglio sensibile)' } }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(BODY_OK), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toContain('deadlock')
  })
  it('esito RPC inatteso → 500 fail-closed (difesa in profondità sul dato persistito)', async () => {
    fattureQueue = [selectChain({ data: FATTURA_OK, error: null })]
    rpcResult = { data: { esito: 'boh' }, error: null }
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await POST(req(BODY_OK), ctx)
    errSpy.mockRestore()
    expect(res.status).toBe(500)
  })
})
