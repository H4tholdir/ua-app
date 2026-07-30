// T8 (ondata b) — `src/app/api/lavori/[id]/immagini/[imgId]/route.ts`.
// Il file esisteva già con solo PATCH; qui si copre:
//  (A) il nuovo DELETE (soft-delete: scrive `deleted_at`, NON tocca lo storage)
//  (B) i due difetti del PATCH che D52 mette nel mandato di T8:
//      (a) la guardia di esistenza non filtrava `deleted_at`
//      (b) `updateError.message` arrivava grezzo al client (G9-76)
//
// Mock builder: `createChain` (tests/unit/helpers/supabase-chain-mock.ts),
// stesso pattern di `cicli-id-route.test.ts` per il DELETE (`.from()` chiamato
// più volte sulla STESSA tabella con comportamento diverso ad ogni chiamata
// → si distingue per numero di invocazione, non per nome tabella).
//
// ============================================================
// R-P4 — misura con l'abbozzo inerte (fatta PRIMA dell'implementazione vera)
// ============================================================
// Primo rosso (comando: `npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts`,
// nessun export `DELETE` nel route file): 27 falliti su 28 (1 verde: il PATCH
// non toccato, "immagine viva → 200", che passava già con l'implementazione
// PATCH preesistente).
//
// Poi è stato incollato in `route.ts` questo ABBOZZO INERTE — le guardie
// iniziali copiate identiche dal PATCH esistente (CSRF, auth, lab, lab-guard),
// ma NESSUNA guardia di esistenza sull'immagine, NESSUNA lettura della
// finestra, NESSUNA mutazione: risponde sempre `{ ok: true }` se supera le
// guardie iniziali:
//
//   export async function DELETE(req: Request, { params }: RouteContext) {
//     const { id: lavoro_id, imgId } = await params
//     void lavoro_id; void imgId
//     if (!isSameOrigin(req)) {
//       return NextResponse.json({ error: 'Richiesta non consentita' }, { status: 403 })
//     }
//     const context = await getFreshLabContext()
//     if (!context) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 })
//     if (!context.laboratorioId) return NextResponse.json({ error: 'Laboratorio non trovato' }, { status: 403 })
//     const guard = assertLabOperativo(context, 'DELETE')
//     if (guard) return guard
//     return NextResponse.json({ ok: true })
//   }
//
// Comando: `npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts`
// Esito con l'abbozzo: **6 su 28** si accendono (passano) — sono esattamente
// le guardie iniziali replicabili senza guardia/finestra/mutazione reale:
// CSRF 403, non-autenticato 401, laboratorio-non-trovato 403, nessun-gate-di-
// ruolo 200, "successo → {ok:true}" 200 (trivialmente vero con l'abbozzo), e
// il PATCH non toccato. **22 su 28 restano rosse** — sono le prove che
// contano davvero (guardia di esistenza, deleted_at, finestra sullo stato,
// i tre .eq() sulla mutazione, il conteggio delle righe, l'errore mascherato,
// i due difetti D52): l'abbozzo NON le soddisfa, quindi misurano qualcosa di
// reale, non l'assenza di codice. L'abbozzo è stato rimosso subito dopo la
// misura e sostituito dall'implementazione vera qui sotto.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: (req: Request) => req.headers.get('origin') === 'http://localhost' }))

import { PATCH, DELETE } from '@/app/api/lavori/[id]/immagini/[imgId]/route'

const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'
const IMG_ID = 'img-1'
const params = Promise.resolve({ id: LAVORO_ID, imgId: IMG_ID })

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function req(method: string, body?: unknown) {
  const init: RequestInit = {
    method,
    headers: { origin: 'http://localhost', host: 'localhost' },
  }
  if (body !== undefined) {
    init.headers = { ...init.headers, 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/immagini/${IMG_ID}`, init)
}

function reqNoOrigin(method: string) {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/immagini/${IMG_ID}`, { method })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
})

// ============================================================
// DELETE — soft delete: scrive deleted_at, non tocca lo storage
// ============================================================
describe('DELETE /api/lavori/[id]/immagini/[imgId]', () => {
  /**
   * Ricostruisce le tre letture/scritture della rotta nell'ordine in cui la
   * route le esegue:
   *  1. guardia di esistenza  — lavori_immagini.select('id')...single()
   *  2. finestra              — lavori.select('stato')...single()
   *  3. mutazione             — lavori_immagini.update(...)...select()
   * `.from('lavori_immagini')` è invocato DUE volte (guardia e mutazione):
   * si distingue per ordine di chiamata, non per nome tabella — altrimenti
   * un mock che restituisse sempre lo stesso oggetto non potrebbe far
   * rispondere le due query in modo diverso.
   */
  function mockDelete(opts: {
    existing?: { data: unknown; error: unknown }
    lavoro?: { data: unknown; error: unknown }
    updateResult?: { data: unknown; error: unknown }
  }) {
    const existing = opts.existing ?? { data: { id: IMG_ID }, error: null }
    const lavoro = opts.lavoro ?? { data: { stato: 'in_lavorazione' }, error: null }
    const updateResult = opts.updateResult ?? { data: [{ id: IMG_ID }], error: null }

    const existingChain = createChain(existing)
    const lavoroChain = createChain(lavoro)
    const updateChain = createChain(updateResult)
    const updateCalls: unknown[] = []
    let immaginiCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori_immagini') {
        immaginiCallCount += 1
        if (immaginiCallCount === 1) return existingChain
        return {
          update: (payload: unknown) => {
            updateCalls.push(payload)
            return updateChain
          },
        }
      }
      if (table === 'lavori') return lavoroChain
      throw new Error(`tabella inattesa nel mock: ${table}`)
    })

    return { existingChain, lavoroChain, updateChain, updateCalls }
  }

  // ---- forme d'ingresso: guardia di esistenza ----

  it('id inesistente → 404, nessuna mutazione', () => {
    const { updateCalls } = mockDelete({ existing: { data: null, error: { code: 'PGRST116' } } })
    return DELETE(req('DELETE'), { params }).then(async (res) => {
      expect(res.status).toBe(404)
      expect(updateCalls).toHaveLength(0)
    })
  })

  it('immagine di un altro lavoro → 404 (la guardia filtra anche lavoro_id, verificato dagli argomenti)', async () => {
    const { existingChain } = mockDelete({ existing: { data: null, error: { code: 'PGRST116' } } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
    expect(existingChain.calls.some((c) => c.method === 'eq' && c.args[0] === 'lavoro_id' && c.args[1] === LAVORO_ID)).toBe(true)
  })

  it('immagine di un altro laboratorio → 404 (la guardia filtra anche laboratorio_id)', async () => {
    const { existingChain } = mockDelete({ existing: { data: null, error: { code: 'PGRST116' } } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
    expect(existingChain.calls.some((c) => c.method === 'eq' && c.args[0] === 'laboratorio_id' && c.args[1] === LAB_ID)).toBe(true)
  })

  it('immagine già cancellata → 404 (la guardia filtra deleted_at IS NULL, verificato dagli argomenti)', async () => {
    // Nella realtà .is('deleted_at', null) esclude la riga e Supabase risponde PGRST116/null.
    const { existingChain } = mockDelete({ existing: { data: null, error: { code: 'PGRST116' } } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
    expect(existingChain.calls.some((c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true)
  })

  // ---- la finestra ----

  it('lavoro consegnato → 409, messaggio che dice perché, nessuna mutazione eseguita', async () => {
    const { updateCalls } = mockDelete({ lavoro: { data: { stato: 'consegnato' }, error: null } })
    const res = await DELETE(req('DELETE'), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error.length).toBeGreaterThan(0)
    expect(updateCalls).toHaveLength(0)
  })

  it('lavoro inesistente (difensivo — la FK lo rende irraggiungibile in pratica) → 404, nessuna mutazione', async () => {
    const { updateCalls } = mockDelete({ lavoro: { data: null, error: { code: 'PGRST116' } } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
    expect(updateCalls).toHaveLength(0)
  })

  it.each([
    'ricevuto', 'in_lavorazione', 'in_prova', 'in_prova_esterna', 'pronto', 'annullato', 'sospeso', 'in_ritardo',
  ])('lavoro in stato %s (≠ consegnato) → dentro la finestra, mutazione eseguita', async (stato) => {
    const { updateCalls } = mockDelete({ lavoro: { data: { stato }, error: null } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(200)
    expect(updateCalls).toHaveLength(1)
  })

  // ---- la mutazione: i TRE .eq() + is + select, e nessuna chiamata allo storage ----

  it('successo: risponde {ok:true}, blob non toccato (getServiceClient() mockato senza `storage` — una chiamata a storage.remove romperebbe il test)', async () => {
    mockDelete({})
    const res = await DELETE(req('DELETE'), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
  })

  it('la mutazione scrive SOLO deleted_at (nessuna altra colonna nel payload di update)', async () => {
    const { updateCalls } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    expect(updateCalls).toHaveLength(1)
    const payload = updateCalls[0] as Record<string, unknown>
    expect(Object.keys(payload)).toEqual(['deleted_at'])
    expect(typeof payload.deleted_at).toBe('string')
  })

  it('la mutazione porta TRE .eq() — id, lavoro_id, laboratorio_id — sulla update() stessa (non solo sul pre-controllo)', async () => {
    const { updateChain } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    const eqCalls = updateChain.calls.filter((c) => c.method === 'eq')
    expect(eqCalls).toHaveLength(3)
    expect(eqCalls.map((c) => c.args[0])).toEqual(['id', 'lavoro_id', 'laboratorio_id'])
    expect(eqCalls.find((c) => c.args[0] === 'id')?.args[1]).toBe(IMG_ID)
    expect(eqCalls.find((c) => c.args[0] === 'lavoro_id')?.args[1]).toBe(LAVORO_ID)
    expect(eqCalls.find((c) => c.args[0] === 'laboratorio_id')?.args[1]).toBe(LAB_ID)
  })

  it('la mutazione porta anche .is(deleted_at, null) e .select() per contare le righe toccate', async () => {
    const { updateChain } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    expect(updateChain.calls.some((c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true)
    expect(updateChain.calls.some((c) => c.method === 'select')).toBe(true)
  })

  // ---- il conteggio delle righe toccate: fail-closed ----

  it('0 righe toccate dalla mutazione (race: già cancellata nel frattempo) → 404, non 200', async () => {
    mockDelete({ updateResult: { data: [], error: null } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('più di una riga toccata dalla mutazione (impossibile per PK, ma fail-closed) → 500, non 200', async () => {
    mockDelete({ updateResult: { data: [{ id: IMG_ID }, { id: 'altra-riga' }], error: null } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(500)
  })

  it('errore DB nella mutazione → 500 con messaggio NOSTRO, mai il messaggio grezzo del database', async () => {
    mockDelete({ updateResult: { data: null, error: { message: 'connection refused: internal db detail xyz' } } })
    const res = await DELETE(req('DELETE'), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/connection refused/i)
    expect(json.error).not.toMatch(/internal db detail/i)
  })

  // ---- guardie generali (CSRF, auth, lab) ----

  it('CSRF: origin diverso da same-origin → 403, nessuna chiamata a from()', async () => {
    const res = await DELETE(reqNoOrigin('DELETE'), { params })
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('non autenticato → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(401)
  })

  it('laboratorio non trovato nel context → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(403)
  })

  it('nessun gate di ruolo: front_desk elimina con successo quanto titolare (D-3)', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, ruolo: 'front_desk' })
    mockDelete({})
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(200)
  })

  // «corpo non-JSON dove serve» — DELETE non legge un body: forma non applicabile,
  // dichiarata qui invece che ignorata in silenzio (R-P4 §enumerazione forme d'ingresso).
})

// ============================================================
// PATCH — i due difetti chiusi da D52 (nel mandato di T8)
// ============================================================
describe('PATCH /api/lavori/[id]/immagini/[imgId] — D52', () => {
  function mockPatch(opts: { existing?: { data: unknown; error: unknown }; updateResult?: { data: unknown; error: unknown } }) {
    const existing = opts.existing ?? { data: { id: IMG_ID }, error: null }
    const updateResult = opts.updateResult ?? { data: { id: IMG_ID, descrizione: 'nuova' }, error: null }
    const existingChain = createChain(existing)
    const updateChain = createChain(updateResult)
    let immaginiCallCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'lavori_immagini') throw new Error(`tabella inattesa: ${table}`)
      immaginiCallCount += 1
      // Prima chiamata: guardia (select...single). Seconda: update...select().single().
      if (immaginiCallCount === 1) return existingChain
      return {
        update: (payload: unknown) => {
          void payload
          return updateChain
        },
      }
    })
    return { existingChain, updateChain }
  }

  it('D52(a): la guardia di esistenza ORA filtra deleted_at IS NULL (immagine già cancellata → 404, non 200)', async () => {
    const { existingChain } = mockPatch({ existing: { data: null, error: { code: 'PGRST116' } } })
    const res = await PATCH(req('PATCH', { descrizione: 'x' }), { params })
    expect(res.status).toBe(404)
    expect(existingChain.calls.some((c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true)
  })

  it('D52(a): immagine viva (deleted_at NULL) → PATCH funziona normalmente (200)', async () => {
    mockPatch({})
    const res = await PATCH(req('PATCH', { descrizione: 'nuova' }), { params })
    expect(res.status).toBe(200)
  })

  it('D52(b): errore DB nell\'update → 500 con messaggio NOSTRO, mai updateError.message grezzo', async () => {
    mockPatch({ updateResult: { data: null, error: { message: 'duplicate key value violates unique constraint xyz_pkey' } } })
    const res = await PATCH(req('PATCH', { descrizione: 'x' }), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/duplicate key/i)
    expect(json.error).not.toMatch(/xyz_pkey/i)
  })
})
