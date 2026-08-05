// T3 (ondata b) — `src/app/api/lavori/[id]/immagini/route.ts` (POST).
//
// 🔴 PRIMA prova in assoluto di questa rotta. Fino al 30/07/2026 nessun file di
//    test importava `@/app/api/lavori/[id]/immagini/route` (rilievo R28): lo
//    scrittore che carica le foto non era guardato da niente — e nemmeno da
//    `tsc`, perché i quattro fabbricanti del client Supabase creano il client
//    SENZA il generico `<Database>` (rilievo R27): un nome di colonna sbagliato
//    dentro un `.insert()` lascia il compilatore a uscita 0. Provato da T1
//    aggiungendo `colonna_che_non_esiste_sonda: 42` all'insert.
//    ➡️ Le chiavi vere spedite all'`insert()` si asseriscono QUI, non altrove.
//
// Copre:
//  (A) T3 — `categoria` obbligatoria e validata: 422 se manca o è fuori elenco,
//      e il controllo sta PRIMA del caricamento su Storage (un rifiuto dopo
//      l'upload lascerebbe un file orfano nell'archivio).
//  (B) R28/G9 — `insertError.message` non arriva più grezzo al browser.
//  (C) le guardie preesistenti (CSRF, auth, lab, lavoro, file, MIME, dimensione)
//      che nessuno aveva mai messo sotto prova.
//
// ============================================================
// R-P4 — misura sull'implementazione «inerte» (fatta PRIMA del codice di T3)
// ============================================================
// Qui non esiste il rosso da «modulo non trovato»: la rotta esiste già. L'ABBOZZO
// INERTE è quindi la rotta com'era al commit `b29b46fa` — cioè con la riga-ponte
// di T1 (`categoria: 'altro'` costante), nessuna lettura del campo `categoria`,
// e `insertError.message` rimandato al client.
// Comando: `npx vitest run tests/unit/lavori-id-immagini-route.test.ts`
// Esito MISURATO con la rotta inerte: `Tests 16 failed | 11 passed (27)`.
// **11 su 27** si accendono — le otto guardie preesistenti (CSRF, 401, 403,
// 404 lavoro, FormData illeggibile, file mancante, MIME, dimensione), più
// `descrizione` a null, «l'upload avviene una volta», e il solo caso
// `categoria: 'altro'`, che passa PER CASO: il ponte di T1 scriveva proprio
// quella costante.
// **16 su 27 restano rosse**: le nove forme di rifiuto (le sei di `it.each`,
// il tipo sbagliato, la chiave ripetuta, il motivo nel corpo), i cinque valori
// validi diversi da 'altro', l'asserzione sulle chiavi dell'insert, e la 500
// con messaggio nostro. Sono le prove che misurano il lavoro di T3, non
// l'assenza di codice.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom, mockGetFreshLabContext, mockIsSameOrigin, mockUpload } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
  mockIsSameOrigin: vi.fn(),
  mockUpload: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: mockIsSameOrigin }))
// 🔑 Lo Storage è finto e REGISTRA le chiamate: è così che «il controllo della
//    categoria viene prima dell'upload» smette di essere una lettura di numeri
//    di riga e diventa un'asserzione — su un 422 questa finta non deve essere
//    stata chiamata NEMMENO UNA VOLTA.
vi.mock('@/lib/storage/upload', () => ({ uploadToStorage: mockUpload }))
// D236 — la rotta firma una URL per la RISPOSTA (la foto appena caricata deve
// vedersi subito) ma non la salva più: la colonna `url` non esiste.
// 🔑 La finta restituisce una URL FIRMATA, non una `/object/public/…`: se un
//    giorno il codice tornasse a costruire un indirizzo pubblico, il test che
//    controlla la forma se ne accorgerebbe invece di specchiare l'errore.
vi.mock('@/lib/storage/signed-url', () => ({
  getSignedUrl: vi.fn(async (_c: unknown, _b: string, path: string) =>
    `https://storage.example/object/sign/documenti/${path}?token=finto`
  ),
}))

import { POST } from '@/app/api/lavori/[id]/immagini/route'

const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'
const params = Promise.resolve({ id: LAVORO_ID })
const URL_FINTA = 'https://storage.example/lavori/lavoro-1/1.jpg'

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const fileValido = () => new File(['contenuto-finto'], 'foto.jpg', { type: 'image/jpeg' })

/**
 * Richiesta finta.
 *
 * 🛑 NON si costruisce una `Request` multipart vera: l'ambiente dei test è
 *    jsdom, dove `FormData`/`File` vengono da jsdom mentre `Request` viene da
 *    undici — la serializzazione multipart fra i due non è garantita, e un
 *    fallimento lì sarebbe un difetto del test, non della rotta. La rotta usa
 *    della richiesta SOLO `req.formData()` (la CSRF è mockata), quindi questa
 *    finta è fedele a tutto ciò che il codice sotto prova osserva.
 */
function richiesta(campi: Array<[string, string | File]>): Request {
  const fd = new FormData()
  for (const [nome, valore] of campi) fd.append(nome, valore)
  return { formData: async () => fd } as unknown as Request
}

/** FormData illeggibile: `req.formData()` che solleva, come fa undici su un
 *  corpo che non è multipart. */
function richiestaCorpoRotto(): Request {
  return {
    formData: async () => { throw new TypeError('Could not parse content as FormData') },
  } as unknown as Request
}

/**
 * `.from()` è invocato su DUE tabelle: `lavori` (finestra di appartenenza,
 * `.single()`) e `lavori_immagini` (l'insert, `.select().single()`).
 * `insert` NON è nella lista passthrough di `createChain` — si scrive a mano,
 * per poter registrare il payload esatto.
 */
function mockPost(opts: {
  lavoro?: { data: unknown; error: unknown }
  insertResult?: { data: unknown; error: unknown }
} = {}) {
  const lavoro = opts.lavoro ?? { data: { id: LAVORO_ID }, error: null }
  const insertResult = opts.insertResult ?? { data: { id: 'img-1' }, error: null }
  const lavoroChain = createChain(lavoro)
  const insertChain = createChain(insertResult)
  const insertCalls: unknown[] = []

  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') return lavoroChain
    if (table === 'lavori_immagini') {
      return {
        insert: (payload: unknown) => {
          insertCalls.push(payload)
          return insertChain
        },
      }
    }
    throw new Error(`tabella inattesa nel mock: ${table}`)
  })

  return { lavoroChain, insertChain, insertCalls }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  mockIsSameOrigin.mockReturnValue(true)
  mockUpload.mockResolvedValue(URL_FINTA)
})

// ============================================================
// (A) T3 — la categoria è obbligatoria, validata, e controllata PRIMA dell'upload
// ============================================================
describe('POST /api/lavori/[id]/immagini — la categoria (T3)', () => {
  // ---- le forme di RIFIUTO ----

  it.each([
    ['chiave assente', null],
    ['fuori elenco', 'pippo'],
    ['stringa vuota', ''],
    ['maiuscola — l\'elenco è esatto, non case-insensitive', 'RX'],
    ['la vecchia colonna `tipo` non è una categoria', 'foto'],
    ['spazi intorno a un valore buono — nessuna normalizzazione silenziosa', ' rx '],
  ])('categoria %s → 422, nessun upload e nessun insert', async (_nome, valore) => {
    const { insertCalls } = mockPost()
    const campi: Array<[string, string | File]> = [['file', fileValido()]]
    if (valore !== null) campi.push(['categoria', valore])

    const res = await POST(richiesta(campi), { params })

    expect(res.status).toBe(422)
    // 🔑 IL controllo che conta: se l'upload fosse già avvenuto, il rifiuto
    //    lascerebbe un file orfano nell'archivio che nessuna riga referenzia.
    expect(mockUpload).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
  })

  it('categoria di tipo sbagliato (un File al posto di una stringa) → 422', async () => {
    const { insertCalls } = mockPost()
    const res = await POST(
      richiesta([['file', fileValido()], ['categoria', new File(['x'], 'rx.txt', { type: 'text/plain' })]]),
      { params },
    )
    expect(res.status).toBe(422)
    expect(mockUpload).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
  })

  it('categoria ripetuta (array al posto di scalare): vale la PRIMA — se è fuori elenco → 422', async () => {
    // FormData.get() rende la prima occorrenza. Un client che ne mandasse due
    // non può «recuperare» con la seconda: il rifiuto resta.
    const { insertCalls } = mockPost()
    const res = await POST(
      richiesta([['file', fileValido()], ['categoria', 'pippo'], ['categoria', 'rx']]),
      { params },
    )
    expect(res.status).toBe(422)
    expect(insertCalls).toHaveLength(0)
  })

  it('il 422 porta un motivo leggibile dal client, non un messaggio vuoto', async () => {
    mockPost()
    const res = await POST(richiesta([['file', fileValido()], ['categoria', 'pippo']]), { params })
    const json = await res.json()
    expect(res.status).toBe(422)
    expect(String(json.error).length).toBeGreaterThan(0)
    expect(json.motivo).toBe('categoria_non_valida')
  })

  // ---- le forme di ACCETTAZIONE ----

  // 🛑 I sette valori NON sono ricopiati qui a mano per caso: sono l'elenco che la
  //    rotta deve accettare, e se la rotta si scrivesse una copia locale invece
  //    di importare `isCategoriaFoto` questa prova resterebbe verde. La rete
  //    contro la terza copia è l'import nella rotta + la spia di T2; questa
  //    prova verifica il COMPORTAMENTO, non la provenienza.
  it.each(['impronta', 'pre_lavoro', 'colore', 'post_prova', 'prescrizione', 'rx', 'altro'])(
    'categoria «%s» → 201, e il valore arriva TALE E QUALE all\'insert',
    async (categoria) => {
      const { insertCalls } = mockPost()
      const res = await POST(richiesta([['file', fileValido()], ['categoria', categoria]]), { params })
      expect(res.status).toBe(201)
      expect(insertCalls).toHaveLength(1)
      expect((insertCalls[0] as Record<string, unknown>).categoria).toBe(categoria)
    },
  )

  it('il payload dell\'insert porta esattamente le colonne attese — e NON porta più `tipo`', async () => {
    // R27: `tsc` non guarda dentro le query su questo repo, quindi le chiavi
    // vere si asseriscono qui. `tipo` è stata ELIMINATA dalla tabella da T1:
    // se ricomparisse nel payload, il database risponderebbe 500 in produzione
    // e nessun compilatore lo direbbe.
    const { insertCalls } = mockPost()
    await POST(richiesta([['file', fileValido()], ['categoria', 'rx'], ['descrizione', 'nota libera']]), { params })

    const payload = insertCalls[0] as Record<string, unknown>
    expect(Object.keys(payload).sort()).toEqual([
      'categoria', 'descrizione', 'laboratorio_id', 'lavoro_id', 'nome_file', 'ordine', 'storage_path',
    ])
    expect(payload).not.toHaveProperty('tipo')
    // D236 (05/08/2026) — `url` è stata TOLTA dalla tabella: era NOT NULL e
    // conteneva una URL «pubblica» su un bucket privato, cioè un indirizzo che
    // non ha mai funzionato (misurato: 5 righe su 5). Se ricomparisse nel
    // payload, il database risponderebbe 500 in produzione — e su questa rotta
    // NESSUN compilatore lo direbbe, perché usa il client non tipizzato.
    expect(payload).not.toHaveProperty('url')
    expect(payload.laboratorio_id).toBe(LAB_ID)
    expect(payload.lavoro_id).toBe(LAVORO_ID)
    expect(payload.categoria).toBe('rx')
    expect(payload.descrizione).toBe('nota libera')
    expect(payload.nome_file).toBe('foto.jpg')
    expect(String(payload.storage_path)).toMatch(/^lavori\/lavoro-1\/\d+\.jpg$/)
  })

  // D236 — la foto appena caricata deve comunque VEDERSI: `TabImmagini` la
  // mostra da `json.immagine.url` (`TabImmagini.tsx:218` → `onAdd`). Tolta la
  // colonna, quella URL non viene più dalla banca dati: la rotta ne firma una
  // al momento, valida un'ora. È l'unica forma che può funzionare su un bucket
  // privato — e quella salvata prima, «pubblica», non funzionava affatto.
  it('la risposta porta una URL FIRMATA per la foto appena caricata, non una pubblica', async () => {
    mockPost()
    const res = await POST(richiesta([['file', fileValido()], ['categoria', 'rx']]), { params })
    expect(res.status).toBe(201)
    const corpo = (await res.json()) as { immagine: Record<string, unknown> }
    expect(typeof corpo.immagine.url).toBe('string')
    expect(String(corpo.immagine.url)).not.toContain('/object/public/')
  })

  it('descrizione assente → null nel payload, e NON viene riempita con la categoria (D73)', async () => {
    const { insertCalls } = mockPost()
    await POST(richiesta([['file', fileValido()], ['categoria', 'rx']]), { params })
    const payload = insertCalls[0] as Record<string, unknown>
    expect(payload.descrizione).toBeNull()
  })

  it('con una categoria valida l\'upload avviene UNA volta, prima dell\'insert', async () => {
    const { insertCalls } = mockPost()
    await POST(richiesta([['file', fileValido()], ['categoria', 'colore']]), { params })
    expect(mockUpload).toHaveBeenCalledTimes(1)
    expect(insertCalls).toHaveLength(1)
  })
})

// ============================================================
// (B) R28 / G9 — il messaggio del database non esce dal server
// ============================================================
describe('POST /api/lavori/[id]/immagini — G9 (R28)', () => {
  it('errore DB nell\'insert → 500 con messaggio NOSTRO, mai insertError.message grezzo', async () => {
    mockPost({
      insertResult: {
        data: null,
        error: { message: 'new row violates check constraint "lavori_immagini_categoria_check"' },
      },
    })
    const res = await POST(richiesta([['file', fileValido()], ['categoria', 'rx']]), { params })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).not.toMatch(/check constraint/i)
    expect(json.error).not.toMatch(/lavori_immagini_categoria_check/i)
    expect(String(json.error).length).toBeGreaterThan(0)
  })
})

// ============================================================
// (C) le guardie preesistenti, mai messe sotto prova prima d'ora
// ============================================================
describe('POST /api/lavori/[id]/immagini — le guardie', () => {
  it('CSRF: origin diverso → 403, nessuna chiamata a from()', async () => {
    mockIsSameOrigin.mockReturnValue(false)
    mockPost()
    const res = await POST(richiesta([['file', fileValido()], ['categoria', 'rx']]), { params })
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('non autenticato → 401', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    mockPost()
    const res = await POST(richiesta([['file', fileValido()], ['categoria', 'rx']]), { params })
    expect(res.status).toBe(401)
  })

  it('laboratorio non trovato nel context → 403', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    mockPost()
    const res = await POST(richiesta([['file', fileValido()], ['categoria', 'rx']]), { params })
    expect(res.status).toBe(403)
  })

  it('lavoro di un altro laboratorio (o inesistente) → 404, nessun upload', async () => {
    const { lavoroChain } = mockPost({ lavoro: { data: null, error: { code: 'PGRST116' } } })
    const res = await POST(richiesta([['file', fileValido()], ['categoria', 'rx']]), { params })
    expect(res.status).toBe(404)
    expect(mockUpload).not.toHaveBeenCalled()
    expect(lavoroChain.calls.some((c) => c.method === 'eq' && c.args[0] === 'laboratorio_id' && c.args[1] === LAB_ID)).toBe(true)
  })

  it('FormData illeggibile (corpo non multipart) → 400', async () => {
    mockPost()
    const res = await POST(richiestaCorpoRotto(), { params })
    expect(res.status).toBe(400)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('campo `file` mancante → 400', async () => {
    const { insertCalls } = mockPost()
    const res = await POST(richiesta([['categoria', 'rx']]), { params })
    expect(res.status).toBe(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('MIME fuori allowlist → 415, nessun upload', async () => {
    mockPost()
    const file = new File(['x'], 'brutto.exe', { type: 'application/x-msdownload' })
    const res = await POST(richiesta([['file', file], ['categoria', 'rx']]), { params })
    expect(res.status).toBe(415)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('file oltre 20MB → 413, nessun upload', async () => {
    mockPost()
    const file = fileValido()
    Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 })
    const res = await POST(richiesta([['file', file], ['categoria', 'rx']]), { params })
    expect(res.status).toBe(413)
    expect(mockUpload).not.toHaveBeenCalled()
  })
})

// ── Forme d'ingresso NON coperte, dichiarate invece che ignorate (R-P4) ──
// • `laboratorio_id`/`lavoro_id` contraffatti dal client: non esiste la forma —
//   nessuno dei due arriva dal corpo, vengono dal context di sessione e dai
//   params della rotta.
// • richieste concorrenti sullo stesso lavoro: nessuna sezione critica in questo
//   handler (l'insert è atomico e `ordine` è pinnata a 0 — v. censimento R-P6,
//   riga `ordine`: NON si tocca e NON si usa in questa ondata).
// • upload che fallisce nello Storage: il ramo esiste (`route.ts:88-94`) ma il
//   suo messaggio d'errore è un rilievo FUORI dal mandato di T3, riferito e non
//   corretto (R-E2) — coprirlo qui congelerebbe un comportamento che sta per
//   cambiare.
