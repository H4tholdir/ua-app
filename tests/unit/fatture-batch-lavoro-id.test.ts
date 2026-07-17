// tests/unit/fatture-batch-lavoro-id.test.ts
// B-2 (spec §3 punto 2): il batch è il writer di fatture.lavoro_id.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockGeneraFatturaPA, insertPayloads, insertResult, fattureDeleteEqCalls } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockGeneraFatturaPA: vi.fn(),
  insertPayloads: [] as Array<Record<string, unknown>>,
  insertResult: { value: { data: { id: 'fat-1' }, error: null } as { data: unknown; error: unknown } },
  fattureDeleteEqCalls: [] as Array<Array<[string, unknown]>>,
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: async () => 7 }))
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: mockGeneraFatturaPA }))

import { POST } from '../../src/app/api/fatture/batch/route'

// Chain generica: ogni metodo ritorna se stessa, i terminali risolvono result.
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'update', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  c.single = async () => result
  c.maybeSingle = async () => result
  return c
}

// ── Tracking per la tabella 'lavori' ────────────────────────────────────────
// Ogni chiamata a svc.from('lavori') apre una nuova "chain" (0 = claim UPDATE,
// 1 = load SELECT, 2 = eventuale rollback UPDATE su load fallita). Registriamo
// gli .eq() per-chain e i payload di ogni .update() così i test possono
// verificare cosa filtra la query di load e se il rollback viene emesso.
let lavoriCallIndex = 0
let lavoriEqCallsByChain: Array<Array<[string, unknown]>> = []
let lavoriUpdatePayloads: Array<Record<string, unknown>> = []
const claimResult = {
  value: { data: { id: 'lav-1' }, error: null } as { data: unknown; error: unknown },
}
const loadResult = {
  value: {
    data: { id: 'lav-1', numero_lavoro: 'n.1', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
    error: null,
  } as { data: unknown; error: unknown },
}

function lavoriChain() {
  const idx = lavoriCallIndex++
  const eqCalls: Array<[string, unknown]> = []
  lavoriEqCallsByChain[idx] = eqCalls
  const c: Record<string, unknown> = {}
  c.select = () => c
  c.update = (payload: Record<string, unknown>) => {
    lavoriUpdatePayloads.push(payload)
    return c
  }
  c.eq = (k: string, v: unknown) => {
    eqCalls.push([k, v])
    return c
  }
  c.is = () => c
  c.neq = () => c
  c.in = () => c
  c.single = async () => {
    if (idx === 0) return claimResult.value
    if (idx === 1) return loadResult.value
    return { data: null, error: null }
  }
  c.maybeSingle = c.single
  return c
}

function req() {
  return new Request('http://localhost/api/fatture/batch', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify({ lavoro_ids: ['lav-1'] }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  insertPayloads.length = 0
  insertResult.value = { data: { id: 'fat-1' }, error: null }
  fattureDeleteEqCalls.length = 0
  lavoriCallIndex = 0
  lavoriEqCallsByChain = []
  lavoriUpdatePayloads = []
  claimResult.value = { data: { id: 'lav-1' }, error: null }
  loadResult.value = {
    data: { id: 'lav-1', numero_lavoro: 'n.1', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
    error: null,
  }
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockGeneraFatturaPA.mockResolvedValue({ numero: '2026-0007' })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null })
    if (table === 'lavori') return lavoriChain()
    if (table === 'fatture') {
      return {
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload)
          return { select: () => ({ single: async () => insertResult.value }) }
        },
        // delete().eq()... : chain awaitable (await su oggetto non-thenable
        // risolve l'oggetto stesso; la route destruttura solo `error`).
        delete: () => {
          const eqCalls: Array<[string, unknown]> = []
          fattureDeleteEqCalls.push(eqCalls)
          const c: Record<string, unknown> = { error: null }
          c.eq = (k: string, v: unknown) => {
            eqCalls.push([k, v])
            return c
          }
          return c
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/fatture/batch — lavoro_id sul draft', () => {
  it("l'INSERT del draft valorizza lavoro_id", async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0].lavoro_id).toBe('lav-1')
  })

  it('23505 (fattura attiva già collegata) → errore pulito senza leak del vincolo', async () => {
    insertResult.value = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "fatture_lavoro_attiva_unique"' },
    }
    const res = await POST(req())
    const json = await res.json()
    expect(json.errori).toBe(1)
    expect(json.results[0].ok).toBe(false)
    expect(JSON.stringify(json)).not.toContain('fatture_lavoro_attiva_unique')
    expect(JSON.stringify(json)).not.toContain('duplicate key')
  })
})

describe('POST /api/fatture/batch — claim atomico + load post-claim (bugfix)', () => {
  it('la query di load non filtra su incluso_in_fattura', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)

    // Chain 1 = la SELECT di load (chain 0 = claim UPDATE, che filtra
    // legittimamente su incluso_in_fattura=false per l'esclusività del claim).
    const loadEqCalls = lavoriEqCallsByChain[1] ?? []
    const hasInclusoFilter = loadEqCalls.some(([k, v]) => k === 'incluso_in_fattura' && v === false)
    expect(hasInclusoFilter).toBe(false)
  })

  it('load fallita → rollback del claim', async () => {
    loadResult.value = { data: null, error: { message: 'boom' } }

    const res = await POST(req())
    const json = await res.json()
    expect(json.errori).toBe(1)

    // Il claim (Step 0) fa update({incluso_in_fattura: true}); il rollback
    // atteso dopo una load fallita è un secondo update con incluso_in_fattura:false.
    const rollbackIssued = lavoriUpdatePayloads.some((p) => p.incluso_in_fattura === false)
    expect(rollbackIssued).toBe(true)
    void res
  })
})

describe('POST /api/fatture/batch — draft-insert fallito (rollback claim)', () => {
  it('errore generico sul draft → rollback del claim, senza leak del messaggio DB', async () => {
    insertResult.value = {
      data: null,
      error: { code: 'XX000', message: 'connection reset by peer' },
    }
    const res = await POST(req())
    const json = await res.json()
    expect(json.errori).toBe(1)

    const rollbackIssued = lavoriUpdatePayloads.some((p) => p.incluso_in_fattura === false)
    expect(rollbackIssued).toBe(true)
    expect(JSON.stringify(json)).not.toContain('connection reset')
  })

  it('23505 su fatture_lavoro_attiva_unique → claim NON rollbackato (la fattura attiva esiste davvero)', async () => {
    insertResult.value = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "fatture_lavoro_attiva_unique"' },
    }
    const res = await POST(req())
    const json = await res.json()
    expect(json.results[0].error).toBe('Esiste già una fattura attiva per questo lavoro')

    // incluso_in_fattura=true è COERENTE con lo stato reale (una fattura
    // attiva per il lavoro esiste): il rollback qui riaprirebbe la porta
    // alla doppia fatturazione al prossimo batch.
    const rollbackIssued = lavoriUpdatePayloads.some((p) => p.incluso_in_fattura === false)
    expect(rollbackIssued).toBe(false)
  })

  it('generaFatturaPA fallisce (Step 3) → draft orfano rimosso (guardato su stato_sdi=draft) + rollback claim', async () => {
    // Senza cleanup, il draft creato con lavoro_id resterebbe "attivo" per
    // l'indice parziale fatture_lavoro_attiva_unique: ogni retry colliderebbe
    // in 23505 interpretato come "fattura attiva esiste" → blocco permanente.
    mockGeneraFatturaPA.mockRejectedValue(new Error('storage upload failed'))

    const res = await POST(req())
    const json = await res.json()
    expect(json.errori).toBe(1)

    // Cleanup del draft: delete su fatture guardata su id + tenant + stato draft
    expect(fattureDeleteEqCalls).toHaveLength(1)
    expect(fattureDeleteEqCalls[0]).toContainEqual(['id', 'fat-1'])
    expect(fattureDeleteEqCalls[0]).toContainEqual(['laboratorio_id', 'lab-1'])
    expect(fattureDeleteEqCalls[0]).toContainEqual(['stato_sdi', 'draft'])

    // E il claim torna libero per il retry
    const rollbackIssued = lavoriUpdatePayloads.some((p) => p.incluso_in_fattura === false)
    expect(rollbackIssued).toBe(true)
  })

  it('23505 su un ALTRO vincolo (es. collisione progressivo) → rollback + messaggio generico', async () => {
    insertResult.value = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "fatture_laboratorio_id_anno_progressivo_key"' },
    }
    const res = await POST(req())
    const json = await res.json()

    const rollbackIssued = lavoriUpdatePayloads.some((p) => p.incluso_in_fattura === false)
    expect(rollbackIssued).toBe(true)
    // Nessuna fattura per QUESTO lavoro esiste: il messaggio "già esistente" sarebbe fuorviante.
    expect(json.results[0].error).not.toBe('Esiste già una fattura attiva per questo lavoro')
    expect(JSON.stringify(json)).not.toContain('progressivo_key')
    expect(JSON.stringify(json)).not.toContain('duplicate key')
  })
})
