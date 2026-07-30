// T8 (ondata b) — `src/app/api/lavori/[id]/immagini/[imgId]/route.ts`.
// Il file esisteva già con solo PATCH; qui si copre:
//  (A) il DELETE. 🔧 EMENDATO da T4 (30/07/2026): fino a quel giorno questa
//      riga diceva «soft-delete: scrive `deleted_at`, NON tocca lo storage», e
//      da D61 è FALSA. Il DELETE toglie il FILE dall'archivio e poi la RIGA
//      dalla tabella, in quest'ordine, e scrive una riga di traccia in
//      `lavori_immagini_eliminazioni` (D63). La colonna `deleted_at` e i suoi
//      otto lettori restano al loro posto: cambia COME si cancella, non CHI
//      legge.
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
//
// ── R-P4, seconda misura: T4 (D61 + D63), 30/07/2026 ──
// Qui l'abbozzo inerte non andava fabbricato: c'era già, ed era l'handler
// stesso prima di T4 — tutte le guardie, la finestra e il conteggio al loro
// posto, ma cancellazione MORBIDA, nessuna chiamata all'archivio e nessuna
// traccia. Le prove di D61/D63 sono state scritte contro quello.
// Comando: `npx vitest run tests/unit/lavori-id-immagini-imgid-route.test.ts`
// Esito: **16 falliti su 64** (48 verdi). I 48 verdi sono ciò che l'handler
// pre-T4 soddisfaceva già; i 16 rossi sono esattamente le prove nuove — il
// file tolto prima della riga, il percorso e il bucket, il fail-closed
// sull'errore dell'archivio e sulla sua eccezione, le chiavi e i valori della
// traccia, il fail-soft dichiarato — più le sonde «mutazione eseguita» che da
// T4 guardano `.delete()` invece del payload di `.update()`.
// ⚠️ Una prova (il fail-soft della traccia) alla prima stesura era verde
// contro l'abbozzo: «non fallisce» e «non ci prova» si somigliano troppo. Le
// è stata aggiunta l'asserzione che UN tentativo di scrittura c'è stato, e da
// lì è diventata rossa — è la differenza fra 15 e 16 falliti.
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
// Stessa forma che scrive il POST (`immagini/route.ts:111`): `lavori/<id>/<ms>.<ext>`.
const STORAGE_PATH = 'lavori/lavoro-1/1719000000000.webp'
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
// DELETE — cancellazione VERA (D61): il file esce dall'archivio, poi la riga
// esce dalla tabella, e resta la traccia (D63)
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
    deleteResult?: { data: unknown; error: unknown }
    tracciaResult?: { data: unknown; error: unknown }
  }) {
    // 🔑 T4: la guardia di esistenza legge ORA anche `storage_path` — è l'unico
    //    punto in cui la rotta lo conosce, e senza di esso non saprebbe quale
    //    file togliere né cosa scrivere nella traccia.
    const existing = opts.existing ?? { data: { id: IMG_ID, storage_path: STORAGE_PATH }, error: null }
    const lavoro = opts.lavoro ?? { data: { stato: 'in_lavorazione' }, error: null }
    const deleteResult = opts.deleteResult ?? { data: [{ id: IMG_ID }], error: null }
    const tracciaResult = opts.tracciaResult ?? { data: null, error: null }

    const existingChain = createChain(existing)
    const lavoroChain = createChain(lavoro)
    const mutazioneChain = createChain(deleteResult)
    const updateCalls: unknown[] = []
    const deleteCalls: true[] = []
    const tracciaInserita: Record<string, unknown>[] = []
    let immaginiCallCount = 0

    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori_immagini') {
        immaginiCallCount += 1
        if (immaginiCallCount === 1) return existingChain
        // 🔑 La finta espone ENTRAMBE le vie: `update` (la cancellazione
        //    morbida di prima di D61) e `delete` (quella vera). Se domani
        //    qualcuno tornasse a scrivere `deleted_at`, il test non morirebbe
        //    con «update is not a function» — resterebbe rosso sull'asserzione
        //    giusta, che è quella che deve parlare.
        return {
          update: (payload: unknown) => {
            updateCalls.push(payload)
            statoStorage.ordine.push('riga')
            return mutazioneChain
          },
          delete: () => {
            deleteCalls.push(true)
            statoStorage.ordine.push('riga')
            return mutazioneChain
          },
        }
      }
      if (table === 'lavori') return lavoroChain
      if (table === 'lavori_immagini_eliminazioni') {
        return {
          insert: async (payload: Record<string, unknown>) => {
            tracciaInserita.push(payload)
            return tracciaResult
          },
        }
      }
      throw new Error(`tabella inattesa nel mock: ${table}`)
    })

    return { existingChain, lavoroChain, mutazioneChain, updateCalls, deleteCalls, tracciaInserita }
  }

  // ---- forme d'ingresso: guardia di esistenza ----

  it('id inesistente → 404, nessuna mutazione e nessun file toccato', () => {
    const { deleteCalls } = mockDelete({ existing: { data: null, error: { code: 'PGRST116' } } })
    return DELETE(req('DELETE'), { params }).then(async (res) => {
      expect(res.status).toBe(404)
      expect(deleteCalls).toHaveLength(0)
      expect(statoStorage.removeCalls).toHaveLength(0)
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

  it('la finestra regge: lavoro consegnato → 409, e NIENTE viene toccato — né il file né la riga', async () => {
    const { deleteCalls, tracciaInserita } = mockDelete({ lavoro: { data: { stato: 'consegnato' }, error: null } })
    const res = await DELETE(req('DELETE'), { params })
    const json = await res.json()
    expect(res.status).toBe(409)
    expect(json.error.length).toBeGreaterThan(0)
    // 🔑 Da D61 il 409 non è più solo «non scrive»: deve arrivare PRIMA della
    //    rimozione del file, che è irreversibile. Senza questa riga, un
    //    `storage.remove` piazzato per sbaglio sopra la finestra cancellerebbe
    //    la foto di un lavoro consegnato e risponderebbe 409 con aria innocente.
    expect(statoStorage.removeCalls).toHaveLength(0)
    expect(deleteCalls).toHaveLength(0)
    expect(tracciaInserita).toHaveLength(0)
  })

  it('lavoro inesistente (difensivo — la FK lo rende irraggiungibile in pratica) → 404, nessuna mutazione e nessun file toccato', async () => {
    const { deleteCalls } = mockDelete({ lavoro: { data: null, error: { code: 'PGRST116' } } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
    expect(deleteCalls).toHaveLength(0)
    expect(statoStorage.removeCalls).toHaveLength(0)
  })

  it.each([
    'ricevuto', 'in_lavorazione', 'in_prova', 'in_prova_esterna', 'pronto', 'annullato', 'sospeso', 'in_ritardo',
  ])('lavoro in stato %s (≠ consegnato) → dentro la finestra, mutazione eseguita', async (stato) => {
    const { deleteCalls } = mockDelete({ lavoro: { data: { stato }, error: null } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(200)
    expect(deleteCalls).toHaveLength(1)
  })

  // ---- la mutazione: i TRE .eq() + is + select ----

  it('successo: risponde {ok:true} dopo aver tolto il file e la riga', async () => {
    mockDelete({})
    const res = await DELETE(req('DELETE'), { params })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json).toEqual({ ok: true })
  })

  it('la mutazione porta TRE .eq() — id, lavoro_id, laboratorio_id — sulla delete() stessa (non solo sul pre-controllo)', async () => {
    const { mutazioneChain } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    const eqCalls = mutazioneChain.calls.filter((c) => c.method === 'eq')
    expect(eqCalls).toHaveLength(3)
    expect(eqCalls.map((c) => c.args[0])).toEqual(['id', 'lavoro_id', 'laboratorio_id'])
    expect(eqCalls.find((c) => c.args[0] === 'id')?.args[1]).toBe(IMG_ID)
    expect(eqCalls.find((c) => c.args[0] === 'lavoro_id')?.args[1]).toBe(LAVORO_ID)
    expect(eqCalls.find((c) => c.args[0] === 'laboratorio_id')?.args[1]).toBe(LAB_ID)
  })

  it('la mutazione porta anche .is(deleted_at, null) e .select() per contare le righe toccate', async () => {
    const { mutazioneChain } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    expect(mutazioneChain.calls.some((c) => c.method === 'is' && c.args[0] === 'deleted_at' && c.args[1] === null)).toBe(true)
    expect(mutazioneChain.calls.some((c) => c.method === 'select')).toBe(true)
  })

  // ============================================================
  // D61 — il file sparisce davvero, e sparisce PRIMA della riga
  // ============================================================

  it('D61 — la mutazione è una cancellazione VERA: .delete(), e nessun payload di update (deleted_at non si scrive più)', async () => {
    const { updateCalls, deleteCalls } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    expect(deleteCalls).toHaveLength(1)
    // Il controllo che chiude la porta all'indietro: se qualcuno rimettesse la
    // cancellazione morbida, `deleteCalls` sarebbe 0 e questo 1 — due rossi.
    expect(updateCalls).toHaveLength(0)
  })

  it('D61 — toglie il FILE prima della riga, e nell\'ordine giusto', async () => {
    mockDelete({})
    await DELETE(req('DELETE'), { params })
    // 🛑 L'ordine NON è di stile. Se cadesse la riga prima del file, un guasto
    //    fra le due lascerebbe nell'archivio un file che nessuna query può più
    //    raggiungere — invisibile e non ritentabile. Nell'ordine giusto, un
    //    file già tolto con la riga ancora viva è un caso VISIBILE: la foto
    //    compare rotta e l'eliminazione si ripete.
    // 🔑 `ordine` è un array SOLO: due contatori separati resterebbero verdi
    //    anche invertendo le due istruzioni.
    expect(statoStorage.ordine).toEqual(['file', 'riga'])
  })

  it('D61 — il percorso passato a storage.remove è ESATTAMENTE lo storage_path della riga, sul bucket `documenti`', async () => {
    mockDelete({})
    await DELETE(req('DELETE'), { params })
    expect(statoStorage.removeCalls).toEqual([{ bucket: 'documenti', paths: [STORAGE_PATH] }])
  })

  it('D61 fail-closed — se il file non si toglie, la riga NON si cancella, la risposta è 500 e il messaggio è NOSTRO', async () => {
    const { deleteCalls, tracciaInserita } = mockDelete({})
    statoStorage.risultato = { data: null, error: { message: 'storage: object not found bucket-internals-xyz' } }
    const res = await DELETE(req('DELETE'), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    // Controllo POSITIVO: non ha nemmeno PROVATO a cancellare. Un 500
    // restituito DOPO la cancellazione sembrerebbe identico dal di fuori.
    expect(deleteCalls).toHaveLength(0)
    expect(tracciaInserita).toHaveLength(0)
    expect(json.error).not.toMatch(/object not found/i)
    expect(json.error).not.toMatch(/bucket-internals/i)
  })

  it('D61 fail-closed — anche se storage.remove SOLLEVA (rete caduta), la riga resta intatta', async () => {
    const { deleteCalls, tracciaInserita } = mockDelete({})
    statoStorage.solleva = true
    // ⚠️ Qui si fissa SOLO il fail-closed (riga intatta), non la forma della
    //    risposta: il client di Storage riporta gli errori nell'oggetto
    //    `error`, quindi un'eccezione è una caduta di rete e risale al gestore
    //    di Next come in ogni altra rotta di questo repo.
    await expect(DELETE(req('DELETE'), { params })).rejects.toThrow()
    expect(deleteCalls).toHaveLength(0)
    expect(tracciaInserita).toHaveLength(0)
  })

  // ============================================================
  // D63 — resta la traccia, e la traccia non è mai l'immagine
  // ============================================================

  it('D63 — scrive UNA riga di traccia, con le CHIAVI ESATTE e mai un byte dell\'immagine', async () => {
    const { tracciaInserita } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    expect(tracciaInserita).toHaveLength(1)
    expect(Object.keys(tracciaInserita[0]).sort()).toEqual(
      ['eliminata_da', 'laboratorio_id', 'lavori_immagine_id', 'lavoro_id', 'storage_path'].sort(),
    )
    // Un registro di cancellazioni che conservasse la cosa cancellata sarebbe
    // la cancellazione annullata (Art. 5(1)(c) GDPR, minimizzazione).
    expect(JSON.stringify(tracciaInserita[0])).not.toMatch(/base64|data:image|blob/)
  })

  it('D63 — la traccia porta i VALORI veri: laboratorio, lavoro, immagine, percorso, autore', async () => {
    const { tracciaInserita } = mockDelete({})
    await DELETE(req('DELETE'), { params })
    expect(tracciaInserita[0]).toEqual({
      laboratorio_id: LAB_ID,
      lavoro_id: LAVORO_ID,
      lavori_immagine_id: IMG_ID,
      storage_path: STORAGE_PATH,
      eliminata_da: CONTEXT.userId,
    })
  })

  it('D63 — fail-soft DICHIARATO: se la traccia non si scrive, la risposta resta 200', async () => {
    // La foto è già sparita da archivio e banca dati: far fallire la risposta
    // ora non la riporterebbe indietro, direbbe solo una bugia al client.
    // L'errore si registra sul server e si prosegue.
    const { tracciaInserita } = mockDelete({ tracciaResult: { data: null, error: { message: 'traccia non scritta' } } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    // 🔑 Senza questa riga il test sarebbe verde anche con ZERO tentativi di
    //    scrittura: «non fallisce» e «non ci prova» si somigliano troppo.
    expect(tracciaInserita).toHaveLength(1)
  })

  it('D63 — nessuna traccia se la riga non è stata cancellata (0 righe → 404)', async () => {
    const { tracciaInserita } = mockDelete({ deleteResult: { data: [], error: null } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
    expect(tracciaInserita).toHaveLength(0)
  })

  it('D63 — nessuna traccia se la cancellazione è fallita con errore del database', async () => {
    const { tracciaInserita } = mockDelete({ deleteResult: { data: null, error: { message: 'boom' } } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(500)
    expect(tracciaInserita).toHaveLength(0)
  })

  // ---- il conteggio delle righe toccate: fail-closed ----

  it('0 righe toccate dalla mutazione (race: già cancellata nel frattempo) → 404, non 200', async () => {
    mockDelete({ deleteResult: { data: [], error: null } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(404)
  })

  it('più di una riga toccata dalla mutazione (impossibile per PK, ma fail-closed) → 500, non 200', async () => {
    mockDelete({ deleteResult: { data: [{ id: IMG_ID }, { id: 'altra-riga' }], error: null } })
    const res = await DELETE(req('DELETE'), { params })
    expect(res.status).toBe(500)
  })

  it('errore DB nella mutazione → 500 con messaggio NOSTRO, mai il messaggio grezzo del database', async () => {
    mockDelete({ deleteResult: { data: null, error: { message: 'connection refused: internal db detail xyz' } } })
    const res = await DELETE(req('DELETE'), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/connection refused/i)
    expect(json.error).not.toMatch(/internal db detail/i)
  })

  // ---- guardie generali (CSRF, auth, lab) ----

  it('CSRF: origin diverso da same-origin → 403, nessuna chiamata a from() e nessun file toccato', async () => {
    const res = await DELETE(reqNoOrigin('DELETE'), { params })
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
    expect(statoStorage.removeCalls).toHaveLength(0)
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

  // ── Forme d'ingresso del DELETE, enumerate PRIMA delle asserzioni (R-P4) ──
  // COPERTE:
  //  • riga assente / di un altro lavoro / di un altro laboratorio / già
  //    cancellata → 404, e da T4 anche «nessun file toccato»
  //  • lavoro assente → 404 · lavoro consegnato → 409 con niente toccato
  //  • gli otto stati ≠ consegnato → dentro la finestra
  //  • storage.remove risponde `{ error }` → 500 fail-closed, riga intatta
  //  • storage.remove SOLLEVA → riga intatta (solo il fail-closed, v. sopra)
  //  • la mutazione tocca 0 righe → 404 · più di una → 500 · errore DB → 500
  //  • la traccia fallisce → 200 fail-soft dichiarato
  //  • CSRF / non autenticato / laboratorio assente / nessun gate di ruolo
  // NON COPERTE, dichiarate invece che ignorate in silenzio:
  //  • «corpo non-JSON»: il DELETE non legge un body — forma non applicabile.
  //  • storage.remove risponde `{ data: [], error: null }` perché il file non
  //    c'era già più: il client di Storage non distingue «rimosso» da «non
  //    c'era», quindi non esiste un comportamento NOSTRO da fissare — la riga
  //    si cancella comunque, ed è l'esito voluto.
  //  • `storage_path` NULL o vuoto sulla riga: la colonna è `NOT NULL` in banca
  //    dati (`002_fase2_schema.sql`) e il POST la scrive sempre — sarebbe una
  //    prova su uno stato che lo schema esclude, non su un ingresso.
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
