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

// ============================================================
// T4 — Passo 1: la finta cresce PRIMA del codice
// ============================================================
// 🔴 Fino a T4 la finta del client di servizio esponeva SOLO `from`
//    (`getServiceClient: () => ({ from: mockFrom })`). Da D61 il DELETE tocca
//    l'archivio, e la PRIMA chiamata a `svc.storage` avrebbe fatto fallire un
//    test esistente con «Cannot read properties of undefined (reading 'from')»
//    — un rosso che NON è un difetto del codice ma un buco della finta. Per
//    questo la finta si estende prima di scrivere una riga di handler.
// 🔑 `statoStorage` vive dentro `vi.hoisted` perché la fabbrica di `vi.mock`
//    viene eseguita all'IMPORT del modulo finto, cioè prima che i `const` di
//    questo file siano inizializzati: un riferimento a una costante di modulo
//    esploderebbe in zona morta temporale.
// 🔑 `ordine` è UNO SOLO e condiviso con la finta della mutazione: è ciò che
//    rende la prova dell'ordine (file → riga) capace di avere una vittima. Due
//    contatori separati resterebbero verdi anche invertendo le due istruzioni.
const { mockFrom, mockGetFreshLabContext, storageFinto, statoStorage } = vi.hoisted(() => {
  const statoStorage = {
    /** ogni chiamata a `storage.from(bucket).remove(paths)`, col bucket registrato */
    removeCalls: [] as { bucket: string; paths: string[] }[],
    /** cosa risponde `remove` — di norma successo, per la prova fail-closed un errore */
    risultato: { data: [] as unknown, error: null as { message: string } | null },
    /** `remove` solleva invece di restituire `{ error }` (caduta di rete) */
    solleva: false,
    /** traccia condivisa dell'ORDINE reale: 'file' dallo storage, 'riga' dalla mutazione */
    ordine: [] as string[],
  }
  const storageFinto = {
    from: (bucket: string) => ({
      remove: async (paths: string[]) => {
        // 🛑 Il bucket si REGISTRA e si asserisce fuori: un `expect` dentro la
        //    finta non gira mai se l'handler non la chiama — sarebbe un
        //    controllo che tace proprio nel caso in cui dovrebbe gridare.
        statoStorage.removeCalls.push({ bucket, paths })
        statoStorage.ordine.push('file')
        if (statoStorage.solleva) throw new Error('rete caduta durante la rimozione')
        return statoStorage.risultato
      },
    }),
  }
  return { mockFrom: vi.fn(), mockGetFreshLabContext: vi.fn(), storageFinto, statoStorage }
})

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, storage: storageFinto }),
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
  // `vi.clearAllMocks()` non sa niente di questi array: si azzerano a mano, o
  // il secondo test erediterebbe le chiamate del primo.
  statoStorage.removeCalls.length = 0
  statoStorage.ordine.length = 0
  statoStorage.risultato = { data: [], error: null }
  statoStorage.solleva = false
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
// PATCH — la finta condivisa
// ============================================================
// 🔧 SPOSTATA A LIVELLO DI MODULO da T3 (30/07): la usano DUE describe (D52 e
//    T3/R26). Restare dentro il primo avrebbe voluto dire duplicarla, cioè due
//    finte da tenere allineate a mano.
function mockPatch(opts: { existing?: { data: unknown; error: unknown }; updateResult?: { data: unknown; error: unknown } }) {
  const existing = opts.existing ?? { data: { id: IMG_ID }, error: null }
  // 🔴 CORREZIONE DEL PIANO (T3, 30/07) — `data` È UN ARRAY, non un oggetto.
  //    Fino a T3 l'update terminava con `.single()` e questo ripiego era un
  //    oggetto. Con R26 la catena termina con `.select()` e la rotta CONTA le
  //    righe toccate: un oggetto darebbe `righe?.length === undefined` → 0 →
  //    404, e la prova «immagine viva → 200» (D52) diventerebbe rossa per un
  //    difetto della FINTA, non del codice. Il piano aveva avvisato di questo
  //    identico incastro per il DELETE (P12) e NON per il PATCH.
  const updateResult = opts.updateResult ?? { data: [{ id: IMG_ID, descrizione: 'nuova' }], error: null }
  const existingChain = createChain(existing)
  const updateChain = createChain(updateResult)
  const updateCalls: unknown[] = []
  let immaginiCallCount = 0
  mockFrom.mockImplementation((table: string) => {
    if (table !== 'lavori_immagini') throw new Error(`tabella inattesa: ${table}`)
    immaginiCallCount += 1
    // Prima chiamata: guardia (select...single). Seconda: update...select().
    if (immaginiCallCount === 1) return existingChain
    return {
      update: (payload: unknown) => {
        updateCalls.push(payload)
        return updateChain
      },
    }
  })
  return { existingChain, updateChain, updateCalls }
}

/** Corpo grezzo, non-JSON: `req.json()` solleva e la rotta deve rispondere 400. */
function reqCorpoRotto() {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/immagini/${IMG_ID}`, {
    method: 'PATCH',
    headers: { origin: 'http://localhost', host: 'localhost', 'Content-Type': 'application/json' },
    body: 'questo non e JSON {',
  })
}

// ============================================================
// PATCH — i due difetti chiusi da D52 (nel mandato di T8)
// ============================================================
describe('PATCH /api/lavori/[id]/immagini/[imgId] — D52', () => {
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

// ============================================================
// T3 — la validazione dei VALORI (422, non 500) e la corsa D52-a chiusa (R26)
// ============================================================
// 🛑 Provato scrivendo il piano (P10): `ALLOWED_PATCH_FIELDS` non era coperta da
//    NESSUNA prova — i tre test PATCH qui sopra mandano tutti `{descrizione}` e
//    asseriscono solo lo status. Aggiungere `categoria` all'allowlist non
//    avrebbe acceso niente di rosso. Questo blocco è il rosso che mancava.
// 🛑 E P11: `if (field in body)` copiava il valore SENZA controllarlo, quindi un
//    valore fuori elenco usciva 500 (errore del database mascherato) invece di
//    422 (errore del client). Il 422 è il punto del task.
describe('PATCH /api/lavori/[id]/immagini/[imgId] — T3: la categoria si valida', () => {
  // ---- le forme di RIFIUTO: tipo sbagliato, null, array, oggetto, fuori elenco ----
  it.each<[string, unknown]>([
    ['fuori elenco', 'pippo'],
    ['stringa vuota', ''],
    ['maiuscola — l\'elenco è esatto', 'RX'],
    ['la vecchia colonna `tipo` non è una categoria', 'foto'],
    ['spazi intorno a un valore buono — nessuna normalizzazione silenziosa', ' rx '],
    ['numero al posto di stringa', 3],
    ['booleano al posto di stringa', true],
    ['null esplicito', null],
    ['array al posto di scalare', ['rx']],
    ['oggetto al posto di scalare', { valore: 'rx' }],
  ])('categoria %s → 422, e la riga NON viene toccata', async (_nome, valore) => {
    const { updateCalls } = mockPatch({})
    const res = await PATCH(req('PATCH', { categoria: valore }), { params })
    expect(res.status).toBe(422)
    // Il controllo POSITIVO: non ha nemmeno PROVATO a scrivere. Senza questo,
    // un 422 restituito DOPO l'update sembrerebbe identico dal di fuori.
    expect(updateCalls).toHaveLength(0)
  })

  it('il 422 porta un motivo leggibile dal client', async () => {
    mockPatch({})
    const res = await PATCH(req('PATCH', { categoria: 'pippo' }), { params })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(String(json.error).length).toBeGreaterThan(0)
    expect(json.motivo).toBe('categoria_non_valida')
  })

  // ---- le forme di ACCETTAZIONE ----
  it.each(['impronta', 'pre_lavoro', 'colore', 'post_prova', 'rx', 'altro'])(
    'categoria «%s» → 200, e il payload porta esattamente quella chiave',
    async (categoria) => {
      const { updateCalls } = mockPatch({})
      const res = await PATCH(req('PATCH', { categoria }), { params })
      expect(res.status).toBe(200)
      expect(updateCalls).toEqual([{ categoria }])
    },
  )

  it('`descrizione` resta patchabile, ma non è più la categoria (D73)', async () => {
    const { updateCalls } = mockPatch({})
    const res = await PATCH(req('PATCH', { descrizione: 'nota libera' }), { params })
    expect(res.status).toBe(200)
    expect(updateCalls).toEqual([{ descrizione: 'nota libera' }])
  })

  // ---- `tipo` è USCITO dall'allowlist: la colonna non esiste più (T1) ----
  it('`tipo` nel corpo viene SCARTATO e non arriva mai all\'update (la colonna è stata eliminata)', async () => {
    const { updateCalls } = mockPatch({})
    const res = await PATCH(req('PATCH', { tipo: 'foto', categoria: 'rx' }), { params })
    expect(res.status).toBe(200)
    expect(updateCalls).toEqual([{ categoria: 'rx' }])
  })

  it('un corpo con SOLO `tipo` → 400 «nessun campo aggiornabile», non un 200 silenzioso', async () => {
    // R-P6: un nome tolto da un'allowlist porta la sua destinazione. Qui la
    // destinazione è visibile — il client riceve un errore, non un «salvato»
    // su un dato che non si è salvato.
    const { updateCalls } = mockPatch({})
    const res = await PATCH(req('PATCH', { tipo: 'foto' }), { params })
    expect(res.status).toBe(400)
    expect(updateCalls).toHaveLength(0)
  })

  it('corpo vuoto {} → 400, nessuna scrittura', async () => {
    const { updateCalls } = mockPatch({})
    const res = await PATCH(req('PATCH', {}), { params })
    expect(res.status).toBe(400)
    expect(updateCalls).toHaveLength(0)
  })

  it('corpo non-JSON → 400, nessuna scrittura', async () => {
    const { updateCalls } = mockPatch({})
    const res = await PATCH(reqCorpoRotto(), { params })
    expect(res.status).toBe(400)
    expect(updateCalls).toHaveLength(0)
  })
})

// ============================================================
// R26 — l'update prende la STESSA forma del DELETE: tre .eq(), il filtro su
// deleted_at, e il conteggio delle righe al posto di .single()
// ============================================================
// 🛑 È la corsa D52-a, rimasta aperta: fra la guardia di esistenza e l'update,
//    una cancellazione concorrente lasciava il PATCH rispondere 200 su un
//    fantasma. Il controllo NEGATIVO da solo non basterebbe — con zero righe
//    cancellate in banca dati un filtro inerte darebbe lo stesso esito — quindi
//    si asserisce sui filtri COSTRUITI, come fanno le prove del DELETE.
describe('PATCH /api/lavori/[id]/immagini/[imgId] — R26: l\'update si allinea al DELETE', () => {
  it('l\'update porta TRE .eq() — id, lavoro_id, laboratorio_id — sulla update() stessa', async () => {
    const { updateChain } = mockPatch({})
    await PATCH(req('PATCH', { categoria: 'rx' }), { params })
    const eqCalls = updateChain.calls.filter((c) => c.method === 'eq')
    expect(eqCalls).toHaveLength(3)
    expect(eqCalls.map((c) => c.args[0]).sort()).toEqual(['id', 'laboratorio_id', 'lavoro_id'])
    expect(eqCalls.find((c) => c.args[0] === 'id')?.args[1]).toBe(IMG_ID)
    expect(eqCalls.find((c) => c.args[0] === 'lavoro_id')?.args[1]).toBe(LAVORO_ID)
    expect(eqCalls.find((c) => c.args[0] === 'laboratorio_id')?.args[1]).toBe(LAB_ID)
  })

  it('l\'update porta anche .is(deleted_at, null) e .select() per contare le righe', async () => {
    const { updateChain } = mockPatch({})
    await PATCH(req('PATCH', { categoria: 'rx' }), { params })
    expect(updateChain.calls.some((c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true)
    expect(updateChain.calls.some((c) => c.method === 'select')).toBe(true)
    // .single() sparisce: con il conteggio delle righe non serve più, e con
    // zero righe toccate darebbe un errore invece di un 404 pulito.
    expect(updateChain.calls.some((c) => c.method === 'single')).toBe(false)
  })

  it('0 righe toccate (race: cancellata fra la guardia e l\'update) → 404, non 200', async () => {
    mockPatch({ updateResult: { data: [], error: null } })
    const res = await PATCH(req('PATCH', { categoria: 'rx' }), { params })
    expect(res.status).toBe(404)
  })

  it('più di una riga toccata (impossibile per PK, ma fail-closed) → 500, non 200', async () => {
    mockPatch({ updateResult: { data: [{ id: IMG_ID }, { id: 'altra-riga' }], error: null } })
    const res = await PATCH(req('PATCH', { categoria: 'rx' }), { params })
    expect(res.status).toBe(500)
  })

  it('esattamente una riga → 200 e nel corpo LA RIGA, non l\'array', async () => {
    mockPatch({ updateResult: { data: [{ id: IMG_ID, categoria: 'rx' }], error: null } })
    const res = await PATCH(req('PATCH', { categoria: 'rx' }), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.immagine).toEqual({ id: IMG_ID, categoria: 'rx' })
  })
})

// ── Forme d'ingresso NON coperte, dichiarate invece che ignorate (R-P4) ──
// • `ordine` con un valore assurdo (`{"ordine":"pippo"}`) → resta 500, non 422.
//   NON coperta di proposito: il mandato di T3 valida `categoria`, e il
//   censimento R-P6 mette `ordine` fra i campi che questa ondata NON tocca e
//   NON usa. Coprirla qui congelerebbe sotto prova un comportamento che il
//   piano ha deliberatamente lasciato aperto. Riferita nel rapporto (R-E2).
// • corpo JSON valido ma non-oggetto (`"stringa"`, `[1,2]`): `field in body`
//   solleva su un primitivo — `provato:` `node -e "'descrizione' in 'stringa'"`
//   → `TypeError: Cannot use 'in' operator to search for 'descrizione' in
//   stringa`. Forma reale, ma FUORI dal mandato di T3: riferita, non corretta.
//   ⚠️ La stessa GRAFIA `in body` compare in **7 file** sotto `src/app/api`
//   (`provato:` `grep -rln "in body" src/app/api` → 7). Che tutte e sette siano
//   ugualmente scoperte è **non verificato**: misurata è la grafia, non
//   l'assenza di guardia in ciascuna.
