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
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { GET } from '../../src/app/api/qualita/psur/route'

const LAB_ID = 'lab-1'

function mockTabelle(opts: {
  psurRows: Array<Record<string, unknown>>
  lavoriClassi: Array<{ classe_rischio: string }>
  lavoriClassiError?: { message: string } | null
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID, laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    if (table === 'psur') {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: opts.psurRows, error: null }),
          }),
        }),
      }
    }
    if (table === 'lavori') {
      return {
        select: () => ({
          eq: async () =>
            opts.lavoriClassiError
              ? { data: null, error: opts.lavoriClassiError }
              : { data: opts.lavoriClassi, error: null },
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('GET /api/qualita/psur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('nessun lavoro → gruppiRilevati vuoto, nonClassificabili 0', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [] })
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.gruppiRilevati).toEqual([])
    expect(json.nonClassificabili).toBe(0)
  })

  it('lavori di classe mista → gruppi rilevati in ordine fisso', async () => {
    mockTabelle({
      psurRows: [],
      lavoriClassi: [{ classe_rischio: 'classe_iii' }, { classe_rischio: 'classe_i' }],
    })
    const res = await GET()
    const json = await res.json()
    expect(json.gruppiRilevati).toEqual(['classe_i', 'classe_iib_iii'])
  })

  it('classe_rischio non mappata → mai scartata, contata in nonClassificabili', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [{ classe_rischio: 'boh' }] })
    const res = await GET()
    const json = await res.json()
    expect(json.gruppiRilevati).toEqual([])
    expect(json.nonClassificabili).toBe(1)
  })

  it('errore Supabase su query classi rischio → 500, mai un 200 con dati parziali', async () => {
    mockTabelle({ psurRows: [], lavoriClassi: [], lavoriClassiError: { message: 'boom' } })
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

import { POST } from '../../src/app/api/qualita/psur/route'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/qualita/psur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Simula il submit nativo del form HTML in src/app/(app)/qualita/psur/page.tsx:
// nessun JS, nessun fetch — il browser invia sempre
// Content-Type: application/x-www-form-urlencoded, MAI application/json.
function postFormRequest(fields: Record<string, string>) {
  const params = new URLSearchParams(fields)
  return new Request('http://localhost/api/qualita/psur', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
}

function mockTabellePost(opts: {
  existing: { id: string; stato: string } | null
  lavoriClasseIds: string[]
  lavoriClasseError?: { message: string } | null
  aggregatiError?: boolean
  // Fa fallire UNA SOLA delle quattro query di aggregazione (le altre restano
  // valide con conteggi reali) — serve a pinnare la semantica OR del check
  // `if (disp.error || nc.error || inc.error || rifac.error)`: con questo flag
  // un'eventuale regressione ad AND (tutte devono fallire) farebbe tornare
  // erroneamente 201 invece di 500.
  failOnly?: 'disp' | 'nc' | 'inc' | 'rifac'
  // Simula l'errore Postgres di unique_violation sull'insert finale — usato per
  // riprodurre la race condition: due richieste concorrenti passano entrambe il
  // pre-check "existing: null" (nessuna delle due lo vede ancora), ma la seconda
  // viola il vincolo UNIQUE (laboratorio_id, anno_riferimento, gruppo_classe) al
  // momento dell'insert.
  insertError?: { code: string; message: string } | null
}) {
  let psurCallCount = 0
  // Conta solo le chiamate di CONTEGGIO su 'lavori' (non il fetch-ids iniziale):
  // la 1a è sempre `disp`, la 2a è sempre `rifac` — ordine fisso dato dalla
  // posizione nell'array passato a Promise.all nella route.
  let lavoriCountCallIndex = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID, laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    if (table === 'psur') {
      psurCallCount++
      if (psurCallCount === 1) {
        // check "existing"
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: opts.existing, error: null }) }),
              }),
            }),
          }),
        }
      }
      // insert
      return {
        insert: () => ({
          select: () => ({
            single: async () =>
              opts.insertError
                ? { data: null, error: opts.insertError }
                : { data: { id: 'psur-nuovo', gruppo_classe: 'classe_i' }, error: null },
          }),
        }),
      }
    }
    if (table === 'lavori') {
      // Distingue il fetch-ids iniziale (.select('id'), nessuna opzione) dalle
      // query di conteggio aggregato (.select('id', {count, head:true})) —
      // altrimenti un test su "errore nella query di aggregazione" finirebbe
      // per colpire invece il fetch-ids, che avviene prima nel flusso reale.
      let isCountQuery = false
      let myCountIndex = -1
      const chain = {
        select: (_cols: string, selectOpts?: { count?: string; head?: boolean }) => {
          isCountQuery = Boolean(selectOpts?.count)
          if (isCountQuery) {
            lavoriCountCallIndex++
            myCountIndex = lavoriCountCallIndex
          }
          return chain
        },
        eq: () => chain,
        in: () => chain,
        not: () => chain,
        gte: () => chain,
        lte: () => chain,
        then: (resolve: (v: unknown) => void) => {
          if (isCountQuery) {
            const isDisp = myCountIndex === 1
            const isRifac = myCountIndex === 2
            const shouldFail =
              opts.aggregatiError ||
              (opts.failOnly === 'disp' && isDisp) ||
              (opts.failOnly === 'rifac' && isRifac)
            if (shouldFail) return resolve({ data: null, error: { message: 'boom' }, count: null })
            return resolve({ data: null, error: null, count: opts.lavoriClasseIds.length })
          }
          if (opts.lavoriClasseError) return resolve({ data: null, error: opts.lavoriClasseError, count: null })
          return resolve({ data: opts.lavoriClasseIds.map((id) => ({ id })), error: null, count: null })
        },
      }
      return chain
    }
    if (table === 'lavori_fasi' || table === 'incidenti_mdr') {
      const isNc = table === 'lavori_fasi'
      const isInc = table === 'incidenti_mdr'
      const shouldFail =
        opts.aggregatiError ||
        (opts.failOnly === 'nc' && isNc) ||
        (opts.failOnly === 'inc' && isInc)
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        is: () => chain,
        gte: () => chain,
        lte: () => chain,
        then: (resolve: (v: unknown) => void) =>
          resolve(shouldFail ? { data: null, error: { message: 'boom' }, count: null } : { data: null, error: null, count: 0 }),
      }
      return chain
    }
    if (table === 'laboratori') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { prrc_nome: 'Mario Rossi' }, error: null }) }) }) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('POST /api/qualita/psur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  })

  it('gruppo_classe mancante o non valido → 400', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: [] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'boh' }))
    expect(res.status).toBe(400)
  })

  it('gruppo_classe valido, nessun duplicato → 201, insert include gruppo_classe', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: ['l1', 'l2'] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(201)
  })

  it('record già esistente per lab+anno+gruppo → 409', async () => {
    mockTabellePost({ existing: { id: 'psur-1', stato: 'bozza' }, lavoriClasseIds: [] })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_iia' }))
    expect(res.status).toBe(409)
  })

  it('errore Supabase nel fetch id lavori per classe → 500, mai un insert con aggregati a 0 mascherati da errore', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: [], lavoriClasseError: { message: 'boom' } })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })

  it('errore Supabase in una query di aggregazione → 500, mai un 201 con conteggio errato', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: ['l1'], aggregatiError: true })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })

  it('errore in una SOLA query di aggregazione (incidenti_mdr) con le altre tre valide → 500 (pinna semantica OR, non AND)', async () => {
    // Le altre tre (disp, nc, rifac) ricevono conteggi reali e nessun errore —
    // solo `inc` fallisce. Se il check `||` regredisse ad `&&` questo test
    // tornerebbe erroneamente 201 invece di 500.
    mockTabellePost({ existing: null, lavoriClasseIds: ['l1', 'l2'], failOnly: 'inc' })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })

  it('short-circuit su nc/inc (0 lavori nella classe) + errore reale su disp → 500, lo short-circuit non maschera l\'errore altrove', async () => {
    // lavoriClasseIds: [] fa scattare lo short-circuit Promise.resolve({count:0,error:null})
    // per nc/inc dentro la route stessa (mockFrom non viene nemmeno invocato per
    // lavori_fasi/incidenti_mdr). disp e rifac, invece, interrogano sempre
    // direttamente 'lavori' e qui `disp` riceve un errore reale: la 500 finale
    // deve arrivare comunque, provando che lo short-circuit non nasconde un
    // fallimento reale sulle altre query.
    mockTabellePost({ existing: null, lavoriClasseIds: [], failOnly: 'disp' })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })

  it('form-urlencoded body (submit HTML nativo) → 201, non 400', async () => {
    // Il form nativo in src/app/(app)/qualita/psur/page.tsx non ha onSubmit/fetch:
    // il browser invia application/x-www-form-urlencoded, non JSON. Prima del fix
    // req.json() lancia su questo body, `body` resta {}, gruppo_classe è undefined
    // e la route torna sempre 400 — bug bloccante verificato in QA browser.
    mockTabellePost({ existing: null, lavoriClasseIds: [] })
    const res = await POST(postFormRequest({ anno_riferimento: '2025', gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(201)
  })

  it('form-urlencoded senza gruppo_classe → 400 (validazione resta attiva anche per i form)', async () => {
    mockTabellePost({ existing: null, lavoriClasseIds: [] })
    const res = await POST(postFormRequest({ anno_riferimento: '2025' }))
    expect(res.status).toBe(400)
  })

  it('race condition: due richieste concorrenti passano entrambe il pre-check, la seconda viola il vincolo UNIQUE (23505) → 409 pulito, mai 500 con messaggio Postgres grezzo', async () => {
    // Il pre-check "existing" vede null in entrambe le richieste (nessuna delle
    // due sa dell'altra), ma l'insert della "perdente" viola
    // psur_lab_anno_gruppo_key. Prima del fix questo tornava 500 con
    // insertError.message (testo Postgres grezzo, leak di dettagli interni).
    mockTabellePost({
      existing: null,
      lavoriClasseIds: [],
      insertError: { code: '23505', message: 'duplicate key value violates unique constraint "psur_lab_anno_gruppo_key"' },
    })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).not.toMatch(/psur_lab_anno_gruppo_key|duplicate key value/i)
  })

  it('errore insert non da unique-violation (es. connessione) → resta 500, non declassato a 409', async () => {
    mockTabellePost({
      existing: null,
      lavoriClasseIds: [],
      insertError: { code: '08006', message: 'connection failure' },
    })
    const res = await POST(postRequest({ anno_riferimento: 2025, gruppo_classe: 'classe_i' }))
    expect(res.status).toBe(500)
  })
})
