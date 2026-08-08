import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * `POST /api/lavori/[id]/dichiarazione/riemetti` — il CHIAMANTE del Task 5.
 *
 * 🛑 PERCHÉ LA ROTTA NASCE INSIEME AL MECCANISMO, e non «dopo, col Task 6».
 * Stamattina questa stessa ondata ha pagato il difetto opposto:
 * `riapri_lavoro_atomica` era costruita, applicata al database e provata — e non
 * la chiamava nessuno, perché il piano diceva «lo farà il Task 6» e non era vero.
 * Una funzione senza chiamanti sembra copertura e non gira. La rotta è ciò che il
 * Task 6 premerà: esiste oggi, ed è esercitata oggi.
 */

const { mockGetFreshLabContext, mockFrom, mockRiemetti, mockCorreggi } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
  mockRiemetti: vi.fn(),
  mockCorreggi: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({ getFreshLabContext: mockGetFreshLabContext }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
// ⚠️ La fabbrica del finto SOSTITUISCE il modulo per intero: una funzione non
// elencata qui arriva alla rotta come `undefined` e il difetto si vede solo
// quando qualcuno la chiama. Le due strade della rotta sono due nomi.
vi.mock('@/lib/pdf/generate-ddc', () => ({
  riemettiDdC: mockRiemetti,
  correggiERiemettiDdC: mockCorreggi,
}))

import { POST } from '@/app/api/lavori/[id]/dichiarazione/riemetti/route'

const LAB_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '99999999-9999-9999-9999-999999999999'
const LAVORO_ID = '33333333-3333-3333-3333-333333333333'
const EVENTO_ID = '44444444-4444-4444-4444-444444444444'
const PAZIENTE_ID = '55555555-5555-4555-8555-555555555555'

const CONTEXT = {
  userId: USER_ID, email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const URL_R = `http://localhost/api/lavori/${LAVORO_ID}/dichiarazione/riemetti`
const params = (id: string = LAVORO_ID) => ({ params: Promise.resolve({ id }) })

function req(body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  return new Request(URL_R, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is']) c[m] = () => c
  c.single = async () => result
  c.maybeSingle = async () => result
  return c
}

/**
 * Come `chain`, ma ANNOTA i filtri.
 *
 * 🔑 PERCHÉ SERVE, e l'ho scoperto rileggendo le mie stesse prove: un finto che
 * risponde in base all'ORDINE della chiamata e non alla COLONNA su cui si
 * filtra passa anche se le due letture della porta d'idempotenza fossero
 * INVERTITE — cioè se la rotta cercasse per `sostituisce_id` la riga che deve
 * cercare per `annullata_da_evento_id`. E quella colonna **è** il difetto del
 * piano che questo compito ha trovato: una prova che non la guarda non prova
 * proprio la cosa per cui esiste.
 */
function chainSpia(result: { data: unknown; error: unknown }, filtri: Array<[string, unknown]>) {
  const c: Record<string, unknown> = {}
  c.select = () => c
  c.is = () => c
  c.eq = (colonna: string, valore: unknown) => {
    filtri.push([colonna, valore])
    return c
  }
  c.single = async () => result
  c.maybeSingle = async () => result
  return c
}

const LAVORO_RIGA = {
  id: LAVORO_ID, laboratorio_id: LAB_ID, stato: 'consegnato', descrizione: 'Corona',
  tipo_dispositivo: 'protesi_fissa', classe_rischio: 'classe_iia',
  cliente: { id: 'c1', nome: 'Mario', cognome: 'Rossi' }, paziente: null,
  lavorazioni: [], materiali: [], prescrizione: [{ contenuto: {} }],
}

/** Le due letture in più che fa SOLO la strada delle correzioni. */
type Extra = {
  paziente?: unknown
  /** la dichiarazione che QUESTO evento ha già annullato, se c'è */
  giaAnnullata?: unknown
  /** e quella che l'ha superata */
  successore?: unknown
}

/** I filtri di ogni lettura su `dichiarazioni_conformita`, in ordine di
 *  chiamata: `filtriDdc[0]` è la prima lettura, `filtriDdc[1]` la seconda. */
let filtriDdc: Array<Array<[string, unknown]>> = []

function banco(
  lavoro: unknown = LAVORO_RIGA,
  motivoEvento: string | null = 'errore_dato_dichiarazione',
  extra: Extra = {}
) {
  filtriDdc = []
  let letturaDdc = 0
  mockFrom.mockImplementation((t: string) => {
    if (t === 'lavori') return chain({ data: lavoro, error: lavoro ? null : { code: 'PGRST116' } })
    if (t === 'eventi_qualita') {
      return chain({ data: motivoEvento ? { motivo: motivoEvento } : null, error: motivoEvento ? null : { code: 'PGRST116' } })
    }
    if (t === 'pazienti') return chain({ data: extra.paziente ?? null, error: null })
    if (t === 'dichiarazioni_conformita') {
      // ① la già annullata da questo evento, ② il suo successore.
      const dato = letturaDdc++ === 0 ? (extra.giaAnnullata ?? null) : (extra.successore ?? null)
      const filtri: Array<[string, unknown]> = []
      filtriDdc.push(filtri)
      return chainSpia({ data: dato, error: null }, filtri)
    }
    throw new Error(`tabella inattesa: ${t}`)
  })
}

describe('POST …/dichiarazione/riemetti', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
    mockRiemetti.mockResolvedValue({
      stato: 'ok', numero: 'DDC-2026-0002', url: 'https://nuovo.test/ddc.pdf',
      nuovaId: 'n1', vecchiaId: 'v1', numeroSuperato: 'DDC-2026-0001',
    })
    mockCorreggi.mockResolvedValue({
      stato: 'ok', numero: 'DDC-2026-0002', url: 'https://nuovo.test/ddc.pdf',
      nuovaId: 'n1', vecchiaId: 'v1', numeroSuperato: 'DDC-2026-0001',
      updatedAt: '2026-08-08T11:00:00.000001+00:00',
    })
  })

  // ── le guardie d'ingresso, come ogni rotta mutante di casa ────────────────
  it('cross-origin → 403 e non tocca niente', async () => {
    banco()
    const res = await POST(req({ evento_id: EVENTO_ID }, { origin: 'http://evil.com', host: 'localhost' }), params())
    expect(res.status).toBe(403)
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('non autenticato → 401', async () => {
    banco()
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST(req({ evento_id: EVENTO_ID }), params())
    expect(res.status).toBe(401)
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('id di percorso non a forma di UUID → 404, e nessuna query', async () => {
    banco()
    const res = await POST(req({ evento_id: EVENTO_ID }), params('non-un-uuid'))
    expect(res.status).toBe(404)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('lavoro di un altro laboratorio (o inesistente) → 404', async () => {
    banco(null)
    const res = await POST(req({ evento_id: EVENTO_ID }), params())
    expect(res.status).toBe(404)
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('🛑 senza evento → 422: mai una riemissione senza motivo (D263)', async () => {
    banco()
    const res = await POST(req({}), params())
    expect(res.status).toBe(422)
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('evento non a forma di UUID → 422, e non arriva al database', async () => {
    banco()
    const res = await POST(req({ evento_id: 'pippo' }), params())
    expect(res.status).toBe(422)
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('corpo non leggibile → 400, mai 500', async () => {
    banco()
    const res = await POST(
      new Request(URL_R, { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' }, body: '{rotto' }),
      params()
    )
    expect(res.status).toBe(400)
  })

  // ── il caso buono ─────────────────────────────────────────────────────────
  it('riemette, e restituisce il numero NUOVO insieme a quello superato', async () => {
    banco()
    const res = await POST(req({ evento_id: EVENTO_ID }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.numero).toBe('DDC-2026-0002')
    expect(body.numero_superato).toBe('DDC-2026-0001')
    expect(mockRiemetti).toHaveBeenCalledTimes(1)
    expect(mockRiemetti.mock.calls[0][1]).toBe(EVENTO_ID)
  })

  it('🔑 l\'embed della prescrizione si normalizza PRIMA di generare (D295)', async () => {
    // PostgREST restituisce `prescrizione` come ARRAY: passarlo così darebbe un
    // `contenuto` sempre `undefined`, cioè la voce 6 dell'Allegato XIII di nuovo
    // vuota — il difetto riparato il 07/08, che qui potrebbe rientrare dalla
    // finestra se questa rotta caricasse il lavoro in modo diverso dalla consegna.
    // ⚠️ Le chiavi valide di `contenuto` sono tre — `elementi`, `colore`, `tipo`
    // (`prescrizione-mapper.ts:209-248`, che scarta il resto): una fixture con
    // chiavi inventate sarebbe passata verde senza provare niente.
    banco({ ...LAVORO_RIGA, prescrizione: [{ contenuto: { elementi: [26], colore: 'A3', tipo: 'corona' } }] })
    await POST(req({ evento_id: EVENTO_ID }), params())
    const lavoroPassato = mockRiemetti.mock.calls[0][0] as { prescrizione?: unknown }
    expect(Array.isArray(lavoroPassato.prescrizione)).toBe(false)
    expect((lavoroPassato.prescrizione as { contenuto?: unknown } | null)?.contenuto)
      .toEqual({ elementi: [26], colore: 'A3', tipo: 'corona' })
  })

  // ═══ IL MOTIVO DEVE AMMETTERE LA RIEMISSIONE — e uno solo su nove lo fa ════
  //
  // 🛑 SENZA QUESTA GUARDIA la sequenza «registra un evento con motivo X» →
  // «riemetti» ANNULLA la dichiarazione per QUALUNQUE X. Ma l'elenco degli
  // effetti dice il contrario per otto motivi su nove — e per D291 («persona
  // sbagliata») il documento **resta valido perché diceva il vero**. Annullarlo
  // significherebbe cancellare l'unica prova che quel manufatto è esistito
  // (D293). ➡️ Stessa famiglia della coppia incoerente chiusa stamattina sulla
  // rotta degli eventi, e la guardia sta nell'API per la stessa ragione: un atto
  // distruttivo su un documento di legge non si affida a una schermata.
  describe('il motivo dell\'evento deve ammettere la riemissione (elenco degli effetti)', () => {
    it('🛑 «persona sbagliata» NON può rifare la carta: D291 dice che il documento resta valido', async () => {
      banco(LAVORO_RIGA, 'destinatario_errato')
      const res = await POST(req({ evento_id: EVENTO_ID }), params())
      expect(res.status).toBe(422)
      expect(mockRiemetti).not.toHaveBeenCalled()
    })

    it('🛑 nessuno degli altri sette motivi apre questa porta', async () => {
      for (const motivo of [
        'difetto_lavorazione', 'difetto_materiale', 'destinatario_errato',
        'modifica_clinica_richiesta', 'errore_prezzo_quantita', 'reso_senza_difetto',
        'errore_registrazione', 'altro',
      ]) {
        vi.clearAllMocks()
        mockGetFreshLabContext.mockResolvedValue(CONTEXT)
        banco(LAVORO_RIGA, motivo)
        const res = await POST(req({ evento_id: EVENTO_ID }), params())
        expect(res.status, motivo).toBe(422)
        expect(mockRiemetti, motivo).not.toHaveBeenCalled()
      }
    })

    it('✅ «dato sbagliato sul documento» è l\'unico che la apre, ed è quello per cui la riemissione esiste', async () => {
      banco(LAVORO_RIGA, 'errore_dato_dichiarazione')
      const res = await POST(req({ evento_id: EVENTO_ID }), params())
      expect(res.status).toBe(200)
      expect(mockRiemetti).toHaveBeenCalledTimes(1)
    })

    it('un evento che non esiste (o è di un altro lavoro) → 422, e non si arriva alla riemissione', async () => {
      banco(LAVORO_RIGA, null)
      const res = await POST(req({ evento_id: EVENTO_ID }), params())
      expect(res.status).toBe(422)
      expect(mockRiemetti).not.toHaveBeenCalled()
    })
  })

  // ── gli esiti che non sono un successo ────────────────────────────────────
  it('🛑 nessuna dichiarazione viva → 409, NON un 200 con un numero', async () => {
    banco()
    mockRiemetti.mockResolvedValue({ stato: 'nessuna_dichiarazione_viva' })
    const res = await POST(req({ evento_id: EVENTO_ID }), params())
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.numero).toBeUndefined()
    expect(String(body.error).length).toBeGreaterThan(0)
  })

  it('evento non valido → 422', async () => {
    banco()
    mockRiemetti.mockResolvedValue({ stato: 'evento_non_valido' })
    const res = await POST(req({ evento_id: EVENTO_ID }), params())
    expect(res.status).toBe(422)
  })

  it('🛑 se la riemissione LANCIA → 500 con un messaggio leggibile, mai il testo del database', async () => {
    banco()
    mockRiemetti.mockRejectedValue(new Error('riemissione: annullo della dichiarazione violates check constraint'))
    const res = await POST(req({ evento_id: EVENTO_ID }), params())
    expect(res.status).toBe(500)
    const testo = String((await res.json()).error)
    expect(testo).not.toMatch(/violates|constraint|23505/i)
    expect(testo.length).toBeGreaterThan(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
//  TASK C — LA STRADA DELLE CORREZIONI (l'atto unico)
//
//  🔑 SI ESTENDE, NON SI RIRSCRIVE, e il confine è UNA CHIAVE: senza
//     `correzioni` la rotta fa esattamente ciò che faceva prima (tutte le prove
//     qui sopra restano vere e girano sulla stessa POST). Con `correzioni`
//     entra l'atto unico, che applica le correzioni e rifà il documento in una
//     transazione sola.
//  📌 È anche la ragione per cui `{}` mandato apposta si rifiuta: chi vuole
//     solo rifare la carta OMETTE la chiave — quella strada resta aperta, e
//     `{}` diventa una richiesta che non chiede niente.
// ════════════════════════════════════════════════════════════════════════════
const GETTONE = '2026-08-08T10:54:08.314024+00:00'

/** Il corpo della strada nuova: evento + gettone + almeno una correzione.
 *
 *  ⚠️ Il «gettone assente» si chiede con `SENZA_GETTONE`, non con `undefined`:
 *  passare `undefined` a un parametro con valore predefinito fa scattare IL
 *  PREDEFINITO, quindi la prova mandava il gettone e passava per un altro
 *  motivo. Difetto della prova, trovato al primo verde. */
const SENZA_GETTONE = Symbol('senza gettone')
function corpo(correzioni: unknown, gettone: unknown = GETTONE) {
  const b: Record<string, unknown> = { evento_id: EVENTO_ID, correzioni }
  if (gettone !== SENZA_GETTONE) b.atteso_updated_at = gettone
  return b
}

describe('POST …/riemetti — con le CORREZIONI (Task C)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
    mockCorreggi.mockResolvedValue({
      stato: 'ok', numero: 'DDC-2026-0002', url: 'https://nuovo.test/ddc.pdf',
      nuovaId: 'n1', vecchiaId: 'v1', numeroSuperato: 'DDC-2026-0001',
      updatedAt: '2026-08-08T11:00:00.000001+00:00',
    })
  })

  it('✅ con una correzione vera passa dall\'ATTO UNICO, non dalla riemissione vecchia', async () => {
    banco()
    const res = await POST(req(corpo({ descrizione: 'Corona in zirconia' })), params())
    expect(res.status).toBe(200)
    expect(mockCorreggi).toHaveBeenCalledTimes(1)
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('🛑 senza `correzioni` la rotta resta quella di prima: nessuna regressione', async () => {
    banco()
    mockRiemetti.mockResolvedValue({
      stato: 'ok', numero: 'DDC-2026-0002', url: 'https://x/ddc.pdf',
      nuovaId: 'n1', vecchiaId: 'v1', numeroSuperato: 'DDC-2026-0001',
    })
    const res = await POST(req({ evento_id: EVENTO_ID }), params())
    expect(res.status).toBe(200)
    expect(mockRiemetti).toHaveBeenCalledTimes(1)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  // ── il gettone ────────────────────────────────────────────────────────────
  it('🔑 senza gettone → 422, e non si genera niente', async () => {
    banco()
    const res = await POST(req(corpo({ descrizione: 'x' }, SENZA_GETTONE)), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  it('gettone stringa vuota → 422 (al database darebbe un 22007 illeggibile)', async () => {
    banco()
    const res = await POST(req(corpo({ descrizione: 'x' }, '   ')), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  it('gettone che non è una stringa → 422', async () => {
    banco()
    const res = await POST(req(corpo({ descrizione: 'x' }, 1754650448)), params())
    expect(res.status).toBe(422)
  })

  it('🛑 il gettone arriva all\'atto unico COSÌ COM\'È, mai riconvertito', async () => {
    banco()
    await POST(req(corpo({ descrizione: 'x' })), params())
    expect(mockCorreggi.mock.calls[0][3]).toBe(GETTONE)
  })

  // ── le correzioni ─────────────────────────────────────────────────────────
  it('🛑 `correzioni: {}` → 422: non è una correzione, ed è la strada sbagliata per rifare e basta', async () => {
    banco()
    const res = await POST(req(corpo({})), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  it.each([
    ['un array', []],
    ['una stringa', 'descrizione'],
    ['null', null],
  ])('`correzioni` come %s → 422', async (_n, v) => {
    banco()
    const res = await POST(req(corpo(v)), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  it('una chiave fuori dalle otto → 422 PRIMA di generare, e il messaggio la nomina', async () => {
    banco()
    const res = await POST(req(corpo({ classe_rischio: 'classe_i' })), params())
    expect(res.status).toBe(422)
    expect(String((await res.json()).error)).toContain('classe_rischio')
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  it('🛑 C2 — valori vuoti → 422: svuoterebbero i campi con esito «ok»', async () => {
    banco()
    const res = await POST(req(corpo({ descrizione: '', paziente_nome_snapshot: '  ' })), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  it('🛑 `denti_coinvolti` come array di stringhe → 422, e nessun PDF caricato', async () => {
    banco()
    const res = await POST(req(corpo({ denti_coinvolti: ['21', '22'] })), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  // ── il paziente, e il tenant ──────────────────────────────────────────────
  it('🔴 `paziente_id` di un ALTRO laboratorio → 422 PRIMA del render: nessun file resta su Storage', async () => {
    // Il PDF si rende e si carica prima della transazione: validare dopo
    // lascerebbe su Storage un documento col paziente di un altro laboratorio
    // anche dopo il rollback.
    banco(LAVORO_RIGA, 'errore_dato_dichiarazione', { paziente: null })
    const res = await POST(req(corpo({ paziente_id: PAZIENTE_ID })), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  it('🔴 `paziente_id` valido → l\'EMBED viaggia col lavoro corretto, o il PDF stampa il paziente vecchio', async () => {
    banco(
      { ...LAVORO_RIGA, paziente_nome_snapshot: null, paziente: { id: 'vecchio', nome_cognome: 'Mario Rossi' } },
      'errore_dato_dichiarazione',
      { paziente: { id: PAZIENTE_ID, laboratorio_id: LAB_ID, nome_cognome: 'Giuseppa Esposito' } }
    )
    const res = await POST(req(corpo({ paziente_id: PAZIENTE_ID })), params())
    expect(res.status).toBe(200)
    const lavoroPassato = mockCorreggi.mock.calls[0][0] as { paziente?: { nome_cognome?: string } }
    expect(lavoroPassato.paziente?.nome_cognome).toBe('Giuseppa Esposito')
  })

  it('🛑 il laboratorio NON si sceglie dal corpo: si deriva dalla sessione', async () => {
    banco()
    await POST(req({ ...corpo({ descrizione: 'x' }), laboratorio_id: 'altro-lab', lavoro_id: 'altro-lavoro' }), params())
    const lavoroPassato = mockCorreggi.mock.calls[0][0] as { laboratorio_id?: string; id?: string }
    expect(lavoroPassato.laboratorio_id).toBe(LAB_ID)
    expect(lavoroPassato.id).toBe(LAVORO_ID)
  })

  it('correggere le caratteristiche di un lavoro SENZA prescrizione → 422 prima del render', async () => {
    banco({ ...LAVORO_RIGA, prescrizione: [] })
    const res = await POST(req(corpo({ prescrizione_caratteristiche: { colore: 'A3' } })), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  // ── la porta d'ingresso sull'EVENTO (C3: da comodità a portante) ──────────
  it('🔑 secondo tocco con lo STESSO evento → si restituisce il documento GIÀ RIFATTO, non se ne fa un altro', async () => {
    banco(LAVORO_RIGA, 'errore_dato_dichiarazione', {
      giaAnnullata: { id: 'v1', numero_ddc: 'DDC-2026-0001' },
      successore: { id: 'n1', numero_ddc: 'DDC-2026-0002', pdf_url: 'https://nuovo.test/ddc.pdf', sostituisce_id: 'v1' },
    })
    const res = await POST(req(corpo({ descrizione: 'Corona in zirconia' })), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.numero).toBe('DDC-2026-0002')
    // 🛑 …e non si è bruciato un secondo progressivo né caricato un secondo PDF.
    //    ⚠️ SERVONO ENTRAMBE: con la sola prima riga la prova passava anche su
    //    una rotta che ignorava del tutto le correzioni e rifaceva il documento
    //    dalla strada vecchia. Misurato con l'abbozzo inerte (R-P4).
    expect(mockCorreggi).not.toHaveBeenCalled()
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('🛑 il documento restituito è il SUCCESSORE, mai quello annullato dall\'evento', async () => {
    // `annullata_da_evento_id = E` marca la dichiarazione ANNULLATA: restituire
    // quella vorrebbe dire consegnare il documento VECCHIO dicendo «rifatto».
    banco(LAVORO_RIGA, 'errore_dato_dichiarazione', {
      giaAnnullata: { id: 'v1', numero_ddc: 'DDC-2026-0001' },
      successore: { id: 'n1', numero_ddc: 'DDC-2026-0002', pdf_url: 'https://nuovo.test/ddc.pdf', sostituisce_id: 'v1' },
    })
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    const body = await res.json()
    expect(body.numero).not.toBe('DDC-2026-0001')
    expect(body.sostituisce_id).toBe('v1')
    expect(body.dichiarazione_id).toBe('n1')
    expect(mockCorreggi).not.toHaveBeenCalled()
    expect(mockRiemetti).not.toHaveBeenCalled()
  })

  it('🔴 …e le DUE letture guardano le colonne GIUSTE, non due colonne qualunque nell\'ordine giusto', async () => {
    // 🛑 QUESTA È LA PROVA DEL DIFETTO DEL PIANO, e senza di lei le due qui
    //    sopra sarebbero verdi anche con le due letture INVERTITE — cioè con la
    //    rotta che cerca per `sostituisce_id` la riga da cercare per
    //    `annullata_da_evento_id`, e restituisce il documento ANNULLATO dicendo
    //    «rifatto». Il finto risponde per ordine di chiamata: l'ordine da solo
    //    non prova niente sulla condizione.
    banco(LAVORO_RIGA, 'errore_dato_dichiarazione', {
      giaAnnullata: { id: 'v1', numero_ddc: 'DDC-2026-0001' },
      successore: { id: 'n1', numero_ddc: 'DDC-2026-0002', pdf_url: 'https://nuovo.test/ddc.pdf' },
    })
    await POST(req(corpo({ descrizione: 'x' })), params())

    expect(filtriDdc).toHaveLength(2)
    // ① la dichiarazione che QUESTO evento ha annullato, dentro il laboratorio
    //    della sessione: è la coppia di `ddc_evento_annulla_unique`
    //    (`laboratorio_id, annullata_da_evento_id`), che è ciò che rende sicuro
    //    il `maybeSingle()` — senza il filtro sul laboratorio quella lettura
    //    potrebbe tornare più righe e diventare un errore a tempo d'esecuzione.
    expect(filtriDdc[0]).toEqual(
      expect.arrayContaining([['annullata_da_evento_id', EVENTO_ID], ['laboratorio_id', LAB_ID]])
    )
    expect(filtriDdc[0].map((f) => f[0])).not.toContain('sostituisce_id')
    // ② e il SUCCESSORE, cercato per `sostituisce_id` sull'id della prima.
    expect(filtriDdc[1]).toEqual(
      expect.arrayContaining([['sostituisce_id', 'v1'], ['laboratorio_id', LAB_ID]])
    )
    expect(filtriDdc[1].map((f) => f[0])).not.toContain('annullata_da_evento_id')
  })

  it('🔴 evento già consumato da un ALTRO intervento (nessun successore) → 409, mai un 200 vuoto', async () => {
    // `riapri_lavoro_atomica` e `riporta_a_pronto_atomica` scrivono anch'esse
    // `annullata_da_evento_id` e NON creano un successore: lo stato «annullata
    // da questo evento, senza chi la superi» è raggiungibile davvero.
    banco(LAVORO_RIGA, 'errore_dato_dichiarazione', {
      giaAnnullata: { id: 'v1', numero_ddc: 'DDC-2026-0001' },
      successore: null,
    })
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    expect(res.status).toBe(409)
    expect((await res.json()).numero).toBeUndefined()
    expect(mockCorreggi).not.toHaveBeenCalled()
  })

  // ── la traduzione degli esiti ─────────────────────────────────────────────
  it.each([
    ['non_trovato', 404],
    ['conflitto', 409],
    ['evento_non_valido', 422],
    ['paziente_non_valido', 422],
    ['senza_prescrizione', 422],
    ['nessuna_dichiarazione_viva', 409],
    ['evento_gia_consumato', 409],
    ['gia_superata', 409],
    ['numero_gia_usato', 409],
  ])('🛑 «%s» → %i, e MAI un 200 con un numero', async (stato, atteso) => {
    banco()
    mockCorreggi.mockResolvedValue({ stato, updatedAt: GETTONE })
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    expect(res.status).toBe(atteso)
    const body = await res.json()
    expect(body.numero).toBeUndefined()
    expect(String(body.error).length).toBeGreaterThan(0)
  })

  it('il `conflitto` restituisce il gettone FRESCO: senza, il secondo tentativo fallisce uguale', async () => {
    banco()
    mockCorreggi.mockResolvedValue({ stato: 'conflitto', updatedAt: GETTONE })
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    expect((await res.json()).updated_at).toBe(GETTONE)
  })

  it('una richiesta rifiutata dal contratto → 400, col motivo che il contratto ha scritto', async () => {
    banco()
    mockCorreggi.mockResolvedValue({
      stato: 'richiesta_rifiutata',
      messaggio: 'atto unico: chiavi che non sono voci correggibili del documento: {classe_rischio}',
    })
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    expect(res.status).toBe(400)
    expect(String((await res.json()).error).length).toBeGreaterThan(0)
  })

  it('🛑 un guasto interno LANCIA e diventa 500 — mai un 400 che dà la colpa a chi ha chiesto', async () => {
    banco()
    mockCorreggi.mockRejectedValue(new Error('atto unico: la penna dei denti ha risposto {"esito":"conflitto"}'))
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    expect(res.status).toBe(500)
    const testo = String((await res.json()).error)
    expect(testo).not.toMatch(/penna|esito|23505/i)
  })

  it('l\'esito buono porta il numero nuovo, quello superato e il gettone aggiornato', async () => {
    banco()
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    const body = await res.json()
    expect(body).toMatchObject({
      numero: 'DDC-2026-0002',
      numero_superato: 'DDC-2026-0001',
      dichiarazione_id: 'n1',
      sostituisce_id: 'v1',
      updated_at: '2026-08-08T11:00:00.000001+00:00',
    })
  })

  it('🛑 il motivo dell\'evento comanda anche qui: «persona sbagliata» non corregge niente', async () => {
    banco(LAVORO_RIGA, 'destinatario_errato')
    const res = await POST(req(corpo({ descrizione: 'x' })), params())
    expect(res.status).toBe(422)
    expect(mockCorreggi).not.toHaveBeenCalled()
  })
})
