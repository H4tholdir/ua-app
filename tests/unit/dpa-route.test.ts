// @vitest-environment node
//
// La ROTTA del DPA — `GET /api/clienti/[id]/dpa` (Task 7 dell'ondata registro).
//
// 🔑 Cosa prova questo file, in una riga: che il file che l'utente si ritrova sul
//    disco porta il NUMERO dell'EMISSIONE, non un pezzo dell'id del cliente — e
//    che un guasto del servizio non si racconta come una richiesta sbagliata.
//
// ⚠️ `assertLabOperativo` NON è simulato, ed è una scelta dichiarata (il brief
//    lasciava aperta la questione). Il contesto porta quindi la forma VERA di
//    `LabContext` (`src/lib/supabase/lab-context.ts:12-20`): lo stato del
//    laboratorio vive in `lab.stato`, NON alla radice del contesto.
//    🛑 Il brief diceva «serve `stato: 'attivo'`» e metteva quel campo alla
//    radice: con quella forma `decideLabOperativo` legge `ctx.lab` undefined,
//    va in fail-closed (`lab-guard.ts:51`) e la prima prova prende 403 invece
//    di 200 — verde impossibile, e per il motivo sbagliato.
// ⚠️ `UA_LAB_GUARD_MODE` è fissato a `'enforce'` come in
//    `lab-guard-routes-enforce.test.ts`: senza, un `'off'` d'ambiente farebbe
//    passare il guard SEMPRE e le prove sui ruoli/stati non proverebbero niente.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockContesto, mockGenerateDpa } = vi.hoisted(() => ({
  mockContesto: vi.fn(),
  mockGenerateDpa: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({ getLabContextWithTimings: mockContesto }))
vi.mock('@/lib/pdf/generate-dpa', () => ({ generateDpa: mockGenerateDpa }))

import { GET } from '@/app/api/clienti/[id]/dpa/route'
// 🔑 NON simulato, ed è il punto: la rotta fa `instanceof` su QUESTA classe.
//    Vive in un modulo suo (`errori-dpa.ts`) e non dentro `generate-dpa.ts`
//    proprio perché quello qui sopra è simulato per intero — un `instanceof`
//    contro un modulo finto non proverebbe niente.
import { ErroreDatiDpa } from '@/lib/pdf/errori-dpa'

const LAB_ID = 'lab-test-001'
const CLIENTE_ID = 'cli-001'
const TIMINGS = { authMs: 1, dbMs: 2 }

// Forma vera di LabContext — v. src/lib/supabase/lab-context.ts:12-20
const CONTESTO = {
  userId: 'user-1',
  email: 'a@b.it',
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: 'Anna',
  cognome: 'Bianchi',
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
}

const EMISSIONE = {
  buffer: Buffer.from('%PDF-x'),
  numero_dpa: 'DPA-2026-0007',
  emissione_id: 'em-1',
  riemessa: true,
}

const richiesta = () => new Request('http://localhost/api/clienti/cli-001/dpa')
const parametri = { params: Promise.resolve({ id: CLIENTE_ID }) }

describe('GET /api/clienti/[id]/dpa', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.UA_LAB_GUARD_MODE = 'enforce'
    mockContesto.mockResolvedValue({ context: CONTESTO, timings: TIMINGS })
    mockGenerateDpa.mockResolvedValue(EMISSIONE)
  })
  afterEach(() => {
    delete process.env.UA_LAB_GUARD_MODE
  })

  // ═══ C1 · il requisito del Task 7 ═══
  it("nomina il file col NUMERO dell'emissione, non con l'id del cliente", async () => {
    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="DPA-2026-0007.pdf"')
    expect(res.headers.get('content-type')).toBe('application/pdf')
    // La negativa accanto alla positiva: il vecchio nome era un pezzo dell'id
    // del cliente in maiuscolo (`DPA-CLI-001.pdf`), e non deve tornare.
    expect(res.headers.get('content-disposition')).not.toContain(CLIENTE_ID.slice(0, 8).toUpperCase())
    // Il FILE consegnato è quello dell'emissione, non un corpo vuoto.
    expect(Buffer.from(await res.arrayBuffer())).toEqual(EMISSIONE.buffer)
    // …e l'emissione è stata chiesta per QUESTO laboratorio, QUESTO cliente e
    // da QUESTO utente, in quest'ordine (`generateDpa(laboratorio_id, cliente_id, emesso_da)`).
    expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID, CONTESTO.userId)
    // 🛑 L'INSIEME degli header, non solo i tre che interessano. Asserire tre
    //    chiavi lascia entrare in silenzio la quarta: con `X-Emissione-Id` e
    //    `X-Riemessa` aggiunti alla risposta questo file restava VERDE, e
    //    `emissione_id` è un id INTERNO di registro — non ha niente da fare
    //    addosso a un documento che esce di casa.
    expect([...res.headers.keys()].sort()).toEqual([
      'content-disposition',
      'content-type',
      'server-timing',
    ])
    // La rotta resta dentro `withServerTiming` (GET categoria A) — e le FASI
    // ci sono davvero. 🛑 `toContain('total;dur=')` da solo non provava niente:
    // `total` il wrapper lo aggiunge SEMPRE da sé (`server-timing.ts:25`),
    // quindi restava verde anche togliendo `Object.assign(t, timings)` dalla
    // rotta. `auth` e `db` vengono solo da lì.
    expect(res.headers.get('server-timing')).toMatch(/^auth;dur=1, db;dur=2, total;dur=\d+$/)
  })

  // ═══ C2 · il nome viene dall'EMISSIONE, non dal fatto che sia nuova ═══
  it("un'emissione RIUSATA (riemessa: false) porta lo stesso numero nel nome del file", async () => {
    mockGenerateDpa.mockResolvedValue({ ...EMISSIONE, numero_dpa: 'DPA-2025-0042', riemessa: false })

    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(200)
    expect(res.headers.get('content-disposition')).toBe('attachment; filename="DPA-2025-0042.pdf"')
  })

  // ═══ C3 · un guasto del servizio NON è una richiesta sbagliata ═══
  //
  // 🛑 Rilievo aperto dalla revisione del Task 6, chiuso qui. E il conto va
  //    detto ESATTO: la riga che stava qui diceva «delle ~12 strade d'errore
  //    DIECI sono guasti del servizio», e non tornava.
  //    `provato:` `grep -n "throw new" src/lib/pdf/generate-dpa.ts`
  //    → **UNDICI** `throw`, di cui **SETTE** guasti del servizio (:106 · :159 ·
  //    :182 · :206 · :231 · :281 · :384) e **QUATTRO** che non lo sono
  //    (:81 e :84 Partita IVA mancante · :115 «Laboratorio non trovato» ·
  //    :116 «Cliente non trovato»).
  //    ⚠️ Un numero gonfiato non è un dettaglio: serviva a far sembrare
  //    trascurabile proprio la parte che il 500 raccontava male.
  //    🛑 RITIRATA anche la ragione «nessuna sorveglianza tratta come errore un
  //    4xx»: in questo repo una sorveglianza NON C'È — `provato:`
  //    `grep -rniE "sentry|captureException" src package.json` → nessuna riga,
  //    e `vercel.json` è `{"regions":["dub1"]}`.
  //    ✅ I quattro cammini sono stati classificati ALL'ORIGINE (`errori-dpa.ts`,
  //    03/08/2026): 404 e 422 li rende ora la rotta, e le prove C5-C7 qui sotto
  //    li tengono. QUESTA prova difende ciò che resta: i SETTE guasti veri, per
  //    cui il 500 è la parola giusta.
  it('un guasto di `generateDpa` risponde 500, non 400 — è il servizio, non la richiesta', async () => {
    mockGenerateDpa.mockRejectedValue(new Error('DPA: archivio non raggiungibile, riprovare fra qualche istante'))

    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: 'DPA: archivio non raggiungibile, riprovare fra qualche istante',
    })
  })

  // ═══ C5-C7 · i cammini che NON sono colpa del servizio ═══
  //
  // 🔑 Il seguito di C3: dei sette guasti veri il 500 dice la verità, dei
  //    quattro restanti no. Lo stato lo porta l'errore stesso
  //    (`ErroreDatiDpa.stato`), deciso all'ORIGINE — la rotta non indovina
  //    niente dal testo del messaggio.
  it('C5 · «Cliente non trovato» → 404: un collegamento vecchio non è un guasto di UÀ', async () => {
    mockGenerateDpa.mockRejectedValue(new ErroreDatiDpa('Cliente non trovato', 404))

    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Cliente non trovato' })
  })

  it('C6 · Partita IVA mancante → 422: la richiesta è buona, il documento non si può fare', async () => {
    mockGenerateDpa.mockRejectedValue(
      new ErroreDatiDpa('DPA: cliente privo di Partita IVA e Codice Fiscale', 422)
    )

    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      error: 'DPA: cliente privo di Partita IVA e Codice Fiscale',
    })
  })

  // 🛑 C7 · la NEGATIVA che tiene insieme le due precedenti: la rotta legge
  //    `e.stato`, non ne ha uno cucito addosso. C5 e C6 da sole sarebbero verdi
  //    anche con un `return 404` fisso (C6 no, ma il paio va detto esplicito) —
  //    qui si prova che uno stato TERZO, mai scritto nella rotta, arriva intero.
  it('C7 · la rotta rende lo stato che l\'errore porta, non uno cucito addosso', async () => {
    const finto = new ErroreDatiDpa('Laboratorio non trovato', 404)
    Object.defineProperty(finto, 'stato', { value: 418 })
    mockGenerateDpa.mockRejectedValue(finto)

    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(418)
  })

  // ═══ C4 · rifiuto con un non-`Error`: il ripiego regge ═══
  it('un rifiuto che non è un Error non finisce con `undefined` addosso al lettore', async () => {
    mockGenerateDpa.mockRejectedValue('esplosione senza Error')

    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Errore generazione DPA' })
  })

  // ═══ B · l'identità — i ruoli sono CINQUE, mai «admin» nudo ═══
  describe('chi passa e chi no', () => {
    it('B1 · nessun contesto (non autenticato o soft-deleted) → 401, e non si emette niente', async () => {
      mockContesto.mockResolvedValue({ context: null, timings: TIMINGS })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(401)
      expect(mockGenerateDpa).not.toHaveBeenCalled()
    })

    it.each([
      ['titolare', 200],
      ['admin_rete', 200],
      ['tecnico', 403],
      ['front_desk', 403],
    ] as const)('B3-B6 · ruolo %s → %i', async (ruolo, atteso) => {
      mockContesto.mockResolvedValue({ context: { ...CONTESTO, ruolo }, timings: TIMINGS })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(atteso)
      expect(mockGenerateDpa.mock.calls.length).toBe(atteso === 200 ? 1 : 0)
    })

    // 🛑 B7 · il QUINTO ruolo — e la premessa che stava qui era letta AL ROVESCIO.
    //
    //    Diceva: «`admin_sistema` è nell'allowlist ma non ci arriva MAI, ha
    //    `laboratorio_id` NULL **per progetto**» — e su quella premessa
    //    dichiarava morta la terza voce di `route.ts:21`. Il vincolo vero dice
    //    un'altra cosa:
    //    `provato:` catalogo vivo, 03/08/2026, `pg_constraint` su `public.utenti`
    //      utenti_lab_required_for_non_admin
    //      CHECK (((ruolo = 'admin_sistema') OR (laboratorio_id IS NOT NULL)))
    //    È un'IMPLICAZIONE, non un'equivalenza: il NULL è **permesso** a
    //    `admin_sistema`, non **imposto**. Un `admin_sistema` CON laboratorio è
    //    perfettamente legale per lo schema — e `lab-context.ts:53` gli
    //    porterebbe `laboratorioId` valorizzato come a chiunque altro.
    //    `provato:` `SELECT ruolo, count(*), count(laboratorio_id) … GROUP BY ruolo`
    //      → `admin_sistema`: 1 riga, 0 col laboratorio. Oggi. Non «per progetto».
    //
    //    Le due prove qui sotto tengono i due mondi, e sono entrambe necessarie:
    //    B7 fissa il caso di oggi (senza laboratorio → si ferma prima),
    //    B7-bis fissa la VOCE D'ALLOWLIST (con laboratorio → passa).
    it('B7 · admin_sistema SENZA laboratorio → 403: lo ferma il controllo del lab', async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, ruolo: 'admin_sistema', laboratorioId: null, lab: null },
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'Lab non trovato' })
      expect(mockGenerateDpa).not.toHaveBeenCalled()
    })

    // 🛑 B7-bis · LA TERZA VOCE DELL'ALLOWLIST, finalmente tenuta da qualcosa.
    //    Mutante della revisione: tolto `'admin_sistema'` da `route.ts:21`,
    //    l'INTERA suite (4392 prove) restava VERDE. B7 qui sopra si accreditava
    //    di coprirlo e invece si ferma alla riga PRIMA, senza mai valutare il
    //    ruolo. Questa prova ci arriva, perché il contesto ha il laboratorio.
    //    🛑 Non ridiscute i permessi — chi può scaricare è una decisione già
    //    presa: la FISSA, così che toglierla diventi rosso invece che silenzio.
    it("B7-bis · admin_sistema CON laboratorio → 200: la terza voce dell'allowlist è viva", async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, ruolo: 'admin_sistema' }, // laboratorioId e lab restano quelli veri
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(200)
      expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID, CONTESTO.userId)
    })

    it('B2 · laboratorioId assente su un ruolo qualunque → 403 «Lab non trovato»', async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, laboratorioId: null },
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(403)
      expect(mockGenerateDpa).not.toHaveBeenCalled()
    })

    // 🟢 B13 · l'ORDINE dei due controlli — e una prova DIFENSIVA, dichiarata.
    //
    //    Il commento di B7 si accreditava di fissare l'ordine («riga 20, NON la
    //    21»). Non lo fissava: col contesto di B7 il ruolo è `admin_sistema`,
    //    che è NELL'allowlist — invertire i due controlli dà 403 «Lab non
    //    trovato» in entrambi i versi, e il mutante sopravviveva.
    //    Discriminare l'ordine richiede le due condizioni INSIEME: ruolo FUORI
    //    dall'allowlist **e** laboratorio assente. Solo allora i due versi
    //    dicono cose diverse: il lab prima → «Lab non trovato»; il ruolo prima
    //    → «Non autorizzato — solo titolari».
    //
    //    🛑 E QUI VA DETTA LA COSA SCOMODA, invece di lasciarla implicita: quella
    //    coppia è VIETATA DALLO SCHEMA. `utenti_lab_required_for_non_admin`
    //    impone che `laboratorio_id IS NULL` valga solo per `admin_sistema`, che
    //    però è nell'allowlist. Quindi **non esiste una riga legale di `utenti`
    //    che distingua i due ordini**: in produzione, oggi, l'ordine non è
    //    osservabile. La fixture qui sotto è deliberatamente FUORI SCHEMA.
    //    Perché la prova resta utile lo stesso: è una rete fail-closed sul
    //    giorno in cui il vincolo cambi, o in cui un contesto arrivi da una via
    //    che non passa per quel CHECK. Fissa quale dei due fatti si rivela per
    //    primo a chi non deve saperlo. Precedente in casa: B2 fa lo stesso con
    //    `titolare` + `laboratorioId: null`.
    it('B13 · ruolo fuori allowlist E laboratorio assente → parla il LAB (riga 20 prima della 21) — fixture difensiva, fuori schema', async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, ruolo: 'tecnico', laboratorioId: null, lab: null },
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'Lab non trovato' })
      expect(mockGenerateDpa).not.toHaveBeenCalled()
    })

    it('B8 · ruolo assente → fail-closed 403 (il `?? \'\'` non deve diventare un lasciapassare)', async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, ruolo: undefined },
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(403)
      expect(mockGenerateDpa).not.toHaveBeenCalled()
    })
  })

  // ═══ B9-B10 · lo stato del laboratorio — wiring del lab-guard (N13) ═══
  describe('lab-guard in enforce', () => {
    it('B9 · titolare senza laboratorio collegato (lab null) → 403 fail-closed, nessuna emissione', async () => {
      mockContesto.mockResolvedValue({ context: { ...CONTESTO, lab: null }, timings: TIMINGS })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(403)
      expect(await res.json()).toMatchObject({ code: 'UA_LAB_NON_OPERATIVO' })
      expect(mockGenerateDpa).not.toHaveBeenCalled()
    })

    // 🛑 B12 · il METODO passato al guard — l'unica cosa che gli dice se questa
    //    è una lettura o una scrittura, e fino a qui non la fissava NIENTE.
    //    Mutante della revisione: `assertLabOperativo(context, 'GET')` → `'POST'`
    //    e tutta la suite restava verde. B9 (`lab: null`) e B10 (`blacklist`)
    //    non possono prenderlo nemmeno in linea di principio: sono i due stati
    //    in cui lettura e scrittura si comportano IDENTICAMENTE
    //    (`lab-guard.ts:51` per `lab: null` — il contesto c'è, quindi NON è la
    //    :49 — e `:65` per `blacklist`; entrambi tornano senza guardare `isRead`).
    //    🔑 La regressione vera che questa riga difende: un laboratorio
    //    `sospeso` — abbonamento fermo, ma titolato a LEGGERE i propri
    //    documenti (`lab-guard.ts:61`) — non scaricherebbe più il proprio
    //    contratto, e niente diventerebbe rosso.
    //    ⚠️ Il ruolo resta `titolare`: con `admin_sistema` il guard esce al
    //    bypass di `lab-guard.ts:50` e passerebbe sotto QUALUNQUE metodo — la
    //    prova sarebbe verde per il motivo sbagliato.
    it("B12 · laboratorio SOSPESO → 200: in lettura passa, e la rotta passa davvero 'GET'", async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab Uno' } },
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(200)
      expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID, CONTESTO.userId)
    })

    it('B10 · laboratorio in blacklist → 403 anche in LETTURA (stato terminale)', async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Uno' } },
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(403)
      expect(await res.json()).toMatchObject({ code: 'UA_LAB_BLACKLIST' })
      expect(mockGenerateDpa).not.toHaveBeenCalled()
    })
  })
})
