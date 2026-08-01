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
    // …e l'emissione è stata chiesta per QUESTO laboratorio e QUESTO cliente,
    // in quest'ordine (`generateDpa(laboratorio_id, cliente_id)`).
    expect(mockGenerateDpa).toHaveBeenCalledWith(LAB_ID, CLIENTE_ID)
    // La rotta resta dentro `withServerTiming` (GET categoria A).
    expect(res.headers.get('server-timing')).toContain('total;dur=')
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
  // 🛑 Rilievo aperto dalla revisione del Task 6, chiuso qui. Delle ~12 strade
  //    d'errore che possono arrivare a questo `catch`, DIECI sono guasti del
  //    servizio: registro non leggibile, archivio non raggiungibile, numero non
  //    assegnato, documento non conservato, riga non registrata. Un 400 dice al
  //    chiamante «hai sbagliato tu» proprio quando è il servizio a essere giù —
  //    e nessuna sorveglianza tratta come errore un 4xx.
  //    ⚠️ La rotta NON può distinguere i casi: le arriva un `Error` e basta.
  //    Discriminare sul TESTO del messaggio legherebbe questa rotta alla prosa
  //    di `generate-dpa.ts` senza nessun aggancio che il compilatore veda —
  //    un legame che si rompe in silenzio. Quindi: 500 per tutto, e la
  //    classificazione fine resta da fare all'origine (riferita nel referto).
  it('un guasto di `generateDpa` risponde 500, non 400 — è il servizio, non la richiesta', async () => {
    mockGenerateDpa.mockRejectedValue(new Error('DPA: archivio non raggiungibile, riprovare fra qualche istante'))

    const res = await GET(richiesta(), parametri)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({
      error: 'DPA: archivio non raggiungibile, riprovare fra qualche istante',
    })
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

    // 🛑 B7 · il QUINTO ruolo, e la ragione per cui non è nell'elenco qui sopra.
    //    `admin_sistema` è nell'allowlist della rotta (`route.ts:21`) ma non ci
    //    arriva MAI: ha `laboratorio_id` NULL per progetto
    //    (`lab-context.ts:16`, `lab-guard.ts:50`) e la riga PRECEDENTE — il
    //    controllo su `laboratorioId` — lo ferma prima. La prova fissa il
    //    comportamento VERO (403) senza fabbricare un contesto che contraddice
    //    lo schema. Che quella voce d'allowlist sia irraggiungibile è un
    //    ritrovamento fuori mandato: riferito, non corretto (R-E2).
    it('B7 · admin_sistema (laboratorioId NULL by design) → 403, e si ferma alla riga del lab', async () => {
      mockContesto.mockResolvedValue({
        context: { ...CONTESTO, ruolo: 'admin_sistema', laboratorioId: null, lab: null },
        timings: TIMINGS,
      })

      const res = await GET(richiesta(), parametri)

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'Lab non trovato' }) // riga 20, NON la 21
      expect(mockGenerateDpa).not.toHaveBeenCalled()
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
