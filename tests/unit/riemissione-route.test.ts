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

const { mockGetFreshLabContext, mockFrom, mockRiemetti } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
  mockRiemetti: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({ getFreshLabContext: mockGetFreshLabContext }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/pdf/generate-ddc', () => ({ riemettiDdC: mockRiemetti }))

import { POST } from '@/app/api/lavori/[id]/dichiarazione/riemetti/route'

const LAB_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '99999999-9999-9999-9999-999999999999'
const LAVORO_ID = '33333333-3333-3333-3333-333333333333'
const EVENTO_ID = '44444444-4444-4444-4444-444444444444'

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

const LAVORO_RIGA = {
  id: LAVORO_ID, laboratorio_id: LAB_ID, stato: 'consegnato', descrizione: 'Corona',
  tipo_dispositivo: 'protesi_fissa', classe_rischio: 'classe_iia',
  cliente: { id: 'c1', nome: 'Mario', cognome: 'Rossi' }, paziente: null,
  lavorazioni: [], materiali: [], prescrizione: [{ contenuto: {} }],
}

function banco(lavoro: unknown = LAVORO_RIGA, motivoEvento: string | null = 'errore_dato_dichiarazione') {
  mockFrom.mockImplementation((t: string) => {
    if (t === 'lavori') return chain({ data: lavoro, error: lavoro ? null : { code: 'PGRST116' } })
    if (t === 'eventi_qualita') {
      return chain({ data: motivoEvento ? { motivo: motivoEvento } : null, error: motivoEvento ? null : { code: 'PGRST116' } })
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
