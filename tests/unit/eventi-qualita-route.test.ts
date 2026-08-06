import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Task 4 dell'ondata «si deve sempre poter intervenire» — le DUE rotte.
 *
 * 🔑 Le due rotte sono due atti diversi (spec §4, D267): la prima registra il
 * FATTO e RESTITUISCE la proposta; la seconda deposita il GIUDIZIO, con la
 * firma dell'utente. La prova che le tiene separate è
 * `body.valutazione === undefined` sulla prima: l'app propone, una persona
 * conferma.
 *
 * 🛑 Ogni forma d'ingresso malformata qui asserisce ANCHE `not.toBe(500)`: la
 * precondizione ③ del brief («`classifica(null)` è irraggiungibile dalla
 * rotta») è un'AFFERMAZIONE, e in questo progetto un'affermazione senza prova
 * vale zero. Un 500 al posto di un 422 sarebbe un blocco, e D262 dice che la
 * PWA non dà blocchi.
 */

const { mockFrom, mockRpc, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

import { POST as POST_EVENTO } from '@/app/api/lavori/[id]/eventi-qualita/route'
import { POST as POST_VALUTAZIONE } from '@/app/api/eventi-qualita/[id]/valutazioni/route'

// ── mock di chain, con insert/update (il helper condiviso non li ha) ─────────
type ChainCall = { method: string; args: unknown[] }
type Risultato = { data: unknown; error: unknown }
type Chain = { calls: ChainCall[]; [k: string]: unknown }

/**
 * Il risultato può essere un valore FISSO oppure una funzione risolta al
 * momento dell'uscita (`single`/`maybeSingle`/`then`). La forma pigra serve a
 * chi deve rispondere **in funzione di ciò che è stato inserito** — l'eco del
 * payload dell'insert, vedi `rigaSalvataDa`.
 *
 * 🛑 La forma pigra NON si usa per `lavori`: lì il risultato si sceglie
 * guardando `banco.lavori.length` PRIMA della `push`, e risolverlo più tardi
 * farebbe rispondere alla pre-verifica con la riga dell'incremento.
 */
function chain(result: Risultato | (() => Risultato)): Chain {
  const risolvi = (): Risultato => (typeof result === 'function' ? result() : result)
  const calls: ChainCall[] = []
  const c: Chain = { calls }
  for (const m of ['select', 'eq', 'is', 'insert', 'update', 'order', 'limit', 'neq'] as const) {
    c[m] = (...args: unknown[]) => {
      calls.push({ method: m, args })
      return c
    }
  }
  for (const m of ['single', 'maybeSingle'] as const) {
    c[m] = async (...args: unknown[]) => {
      calls.push({ method: m, args })
      return risolvi()
    }
  }
  c.then = (resolve: (v: unknown) => void) => resolve(risolvi())
  return c
}

const LAB_ID = '11111111-1111-1111-1111-111111111111'
const ALTRO_LAB = '22222222-2222-2222-2222-222222222222'
const USER_ID = '99999999-9999-9999-9999-999999999999'
const LAVORO_ID = '33333333-3333-3333-3333-333333333333'
const EVENTO_ID = '44444444-4444-4444-4444-444444444444'
const VALUTAZIONE_ID = '55555555-5555-5555-5555-555555555555'

const CONTEXT = {
  userId: USER_ID,
  email: null,
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: null,
  cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const IERI = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

// Corpo minimo valido per la prima rotta.
function corpoValido(extra: Record<string, unknown> = {}) {
  return {
    motivo: 'difetto_lavorazione',
    origine_informazione: 'odontoiatra',
    stato_dispositivo: 'consegnato_non_applicato',
    conosciuto_il: IERI,
    potenziale_di_danno: 'nessuno',
    ...extra,
  }
}

function req(url: string, body: unknown, headers: Record<string, string> = { origin: 'http://localhost', host: 'localhost' }) {
  const init: RequestInit = { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) init.body = JSON.stringify(body)
  return new Request(url, init)
}

function reqGrezza(url: string, raw: string) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: raw,
  })
}

const URL_EVENTO = `http://localhost/api/lavori/${LAVORO_ID}/eventi-qualita`
const URL_VALUTAZIONE = `http://localhost/api/eventi-qualita/${EVENTO_ID}/valutazioni`

const paramsLavoro = (id: string = LAVORO_ID) => ({ params: Promise.resolve({ id }) })
const paramsEvento = (id: string = EVENTO_ID) => ({ params: Promise.resolve({ id }) })

/**
 * L'ECO DEL PAYLOAD, con i default del DATABASE — e non è un vezzo di fedeltà.
 *
 * 🛑 Il difetto che questa funzione chiude: la fixture rispondeva sempre
 * `potenziale_di_danno: 'nessuno'`, qualunque cosa fosse stata inserita. Ma la
 * colonna è `NOT NULL DEFAULT 'da_valutare'`
 * (`20260806140823_eventi_qualita.sql:24`): **una riga inserita senza quella
 * chiave non può tornare `'nessuno'`** — è una riga che Postgres non potrebbe
 * mai produrre. Su una riga impossibile non si può scrivere l'asserzione che
 * conta, cioè che la proposta si calcola sulla riga SALVATA e non su quella
 * INVIATA: con la fixture vecchia, sostituire la lettura dalla riga salvata
 * con il valore grezzo del client lasciava tutta la suite verde.
 *
 * Quindi: si rimanda indietro ciò che è stato inserito, e per le sole chiavi
 * assenti si applica il default che applicherebbe il database.
 */
function rigaSalvataDa(payload: Record<string, unknown> | null): Record<string, unknown> {
  const p = payload ?? {}
  return {
    id: EVENTO_ID,
    created_at: new Date().toISOString(),
    ...p,
    // il DEFAULT della colonna, applicato SOLO se la chiave non è stata inviata
    potenziale_di_danno: Object.hasOwn(p, 'potenziale_di_danno') ? p.potenziale_di_danno : 'da_valutare',
  }
}

// ── banco della prima rotta ─────────────────────────────────────────────────
type BancoEvento = {
  lavori: Chain[]
  eventi: Chain[]
  rigaInserita: Record<string, unknown> | null
}

function bancoEvento(opts: {
  lavoroTrovato?: boolean
  postConsegnaCorrezioni?: number
  erroreInsert?: { code?: string; message?: string } | null
  erroreUpdate?: { code?: string; message?: string } | null
} = {}): BancoEvento {
  const {
    lavoroTrovato = true,
    postConsegnaCorrezioni = 0,
    erroreInsert = null,
    erroreUpdate = null,
  } = opts
  const banco: BancoEvento = { lavori: [], eventi: [], rigaInserita: null }

  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'lavori') {
      // il primo accesso è la pre-verifica, il secondo l'incremento
      const risultato = banco.lavori.length === 0
        ? {
            data: lavoroTrovato
              ? { id: LAVORO_ID, stato: 'consegnato', post_consegna_correzioni: postConsegnaCorrezioni }
              : null,
            error: lavoroTrovato ? null : { code: 'PGRST116', message: 'no rows' },
          }
        : { data: erroreUpdate ? null : [{ post_consegna_correzioni: postConsegnaCorrezioni + 1 }], error: erroreUpdate }
      const c = chain(risultato)
      const insertOriginale = c.insert as (...a: unknown[]) => Chain
      void insertOriginale
      banco.lavori.push(c)
      return c
    }
    if (tabella === 'eventi_qualita') {
      // 🔑 risultato PIGRO: la riga che torna è l'eco di quella inserita, e la
      // riga inserita si conosce solo dopo che `insert` è stato chiamato.
      const c = chain(() =>
        erroreInsert
          ? { data: null, error: erroreInsert }
          : { data: rigaSalvataDa(banco.rigaInserita), error: null }
      )
      const originale = c.insert as (...a: unknown[]) => Chain
      c.insert = (...args: unknown[]) => {
        banco.rigaInserita = args[0] as Record<string, unknown>
        return originale(...args)
      }
      banco.eventi.push(c)
      return c
    }
    throw new Error(`tabella inattesa: ${tabella}`)
  })
  return banco
}

// ── banco della seconda rotta ───────────────────────────────────────────────
type BancoValutazione = {
  eventi: Chain[]
  valutazioni: Chain[]
  rigaInserita: Record<string, unknown> | null
}

function bancoValutazione(opts: {
  eventoTrovato?: boolean
  erroreInsert?: { code?: string; message?: string } | null
} = {}): BancoValutazione {
  const { eventoTrovato = true, erroreInsert = null } = opts
  const banco: BancoValutazione = { eventi: [], valutazioni: [], rigaInserita: null }

  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'eventi_qualita') {
      const c = chain({
        data: eventoTrovato ? { id: EVENTO_ID, lavoro_id: LAVORO_ID } : null,
        error: eventoTrovato ? null : { code: 'PGRST116', message: 'no rows' },
      })
      banco.eventi.push(c)
      return c
    }
    if (tabella === 'valutazioni_evento') {
      const c = chain(
        erroreInsert
          ? { data: null, error: erroreInsert }
          : { data: { id: VALUTAZIONE_ID, evento_id: EVENTO_ID, esito: 'reclamo', superata: false }, error: null }
      )
      const originale = c.insert as (...a: unknown[]) => Chain
      c.insert = (...args: unknown[]) => {
        banco.rigaInserita = args[0] as Record<string, unknown>
        return originale(...args)
      }
      banco.valutazioni.push(c)
      return c
    }
    throw new Error(`tabella inattesa: ${tabella}`)
  })
  return banco
}

/** Nessun testo grezzo di Postgres deve uscire dalla rotta (precondizione ②). */
function nessunTestoGrezzo(messaggio: unknown) {
  const t = String(messaggio ?? '')
  expect(t).not.toMatch(/violates|constraint|duplicate key|invalid input syntax|null value in column|23505|23503|22P02|23514/i)
  expect(t.length).toBeGreaterThan(0)
}

describe('POST /api/lavori/[id]/eventi-qualita — registra il FATTO, propone, non giudica', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  // ── le quattro guardie d'ingresso ─────────────────────────────────────────
  it('cross-origin → 403 e nessuna query', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido(), { origin: 'http://evil.com', host: 'localhost' }), paramsLavoro())
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('non autenticato → 401', async () => {
    bancoEvento()
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(401)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('utente senza laboratorio → 403', async () => {
    bancoEvento()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(403)
  })

  it('laboratorio in blacklist → 403 e nessuna query', async () => {
    bancoEvento()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab' } })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  // ── le forme d'ingresso (R-P4) ────────────────────────────────────────────
  it('corpo non-JSON → 400, mai 500', async () => {
    bancoEvento()
    const res = await POST_EVENTO(reqGrezza(URL_EVENTO, '{non json'), paramsLavoro())
    expect(res.status).toBe(400)
    expect(res.status).not.toBe(500)
  })

  it('corpo `null` → 400, mai 500 (precondizione ③)', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, null), paramsLavoro())
    expect(res.status).toBe(400)
    expect(res.status).not.toBe(500)
  })

  it('corpo array → 400', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, [1, 2]), paramsLavoro())
    expect(res.status).toBe(400)
  })

  it('corpo `{}` → 422, mai 500', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, {}), paramsLavoro())
    expect(res.status).toBe(422)
    expect(res.status).not.toBe(500)
  })

  it('tutti i campi a `null` → 422, mai 500 (classifica() non riceve spazzatura)', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, { motivo: null, origine_informazione: null, stato_dispositivo: null, conosciuto_il: null, potenziale_di_danno: null }),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(res.status).not.toBe(500)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo fuori vocabolario (`pippo`) → 422, nessun insert', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: 'pippo' })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo `constructor` → 422: la guardia `isMotivo` viene PRIMA della derivazione', async () => {
    // 🛑 `'pippo'` non basta a provare l'ordine delle due guardie: dà comunque
    // `undefined`. `'constructor'` risale al prototipo di Object e restituisce
    // una FUNZIONE — è il valore che distingue le due guardie invertite
    // (qualita-costanti.ts:118-127).
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: 'constructor' })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(res.status).not.toBe(500)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo `__proto__` → 422, nessun insert', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: '__proto__' })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo numerico → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: 7 })), paramsLavoro())
    expect(res.status).toBe(422)
  })

  it('motivo array → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: ['difetto_lavorazione'] })), paramsLavoro())
    expect(res.status).toBe(422)
  })

  it('motivo_libero di tipo sbagliato (numero) → 422', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo_libero: 42 })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo_libero di soli spazi su un motivo DERIVABILE → salvato come `null`, mai stringa vuota', async () => {
    // 🛑 `note` (`route.ts:196`) normalizzava già a `null`, `motivo_libero` no:
    // `'   '.trim()` finiva in banca dati come stringa VUOTA. Due campi di testo
    // gemelli con due comportamenti diversi sono il modo in cui nasce un filtro
    // «senza descrizione» che salta metà delle righe.
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo_libero: '   ' })), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.motivo_libero).toBeNull()
  })

  it('motivo_libero oltre il tetto → 422 e nessun insert', async () => {
    // I route handler dell'App Router non impongono un limite al corpo: senza
    // un tetto qui, 5 MB incollati finirebbero in banca dati senza un errore.
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo_libero: 'a'.repeat(1001) })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
    expect((await res.json()).error).toMatch(/1000/)
  })

  it('motivo_libero al tetto esatto (1000) → 201: il confine si prova da entrambi i lati', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo_libero: 'a'.repeat(1000) })), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.motivo_libero).toBe('a'.repeat(1000))
  })

  it('note di tipo sbagliato (oggetto) → 422', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ note: { testo: 'ciao' } })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('note oltre il tetto → 422 e nessun insert', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ note: 'n'.repeat(1001) })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
    expect((await res.json()).error).toMatch(/1000/)
  })

  it('note al tetto esatto (1000) → 201', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ note: 'n'.repeat(1000) })), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.note).toBe('n'.repeat(1000))
  })

  it('origine_informazione fuori vocabolario → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ origine_informazione: 'passaparola' })), paramsLavoro())
    expect(res.status).toBe(422)
  })

  it('stato_dispositivo fuori vocabolario → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ stato_dispositivo: 'in_bocca' })), paramsLavoro())
    expect(res.status).toBe(422)
  })

  it('potenziale_di_danno fuori vocabolario → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ potenziale_di_danno: 'moltissimo' })), paramsLavoro())
    expect(res.status).toBe(422)
  })

  it('potenziale_di_danno assente → NON viene inviato: il default lo mette il database, ed è uno solo', async () => {
    const banco = bancoEvento()
    const corpo = corpoValido()
    delete (corpo as Record<string, unknown>).potenziale_di_danno
    const res = await POST_EVENTO(req(URL_EVENTO, corpo), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita).not.toBeNull()
    expect(Object.hasOwn(banco.rigaInserita!, 'potenziale_di_danno')).toBe(false)
  })

  it('potenziale_di_danno assente → la proposta si calcola sulla riga SALVATA (`da_valutare`), non su quella inviata: esito `incidente`', async () => {
    // 🔑 È l'asserzione che regge la proprietà più importante di questa rotta.
    // Il client non manda `potenziale_di_danno`; il DATABASE ci mette il suo
    // default `da_valutare` (`20260806140823:24`). La rotta rilegge quel valore
    // dalla riga tornata dall'insert, e `da_valutare` ≠ `nessuno` fa scattare il
    // passo ① di `classifica()` (`classifica.ts:136`) su un dispositivo uscito.
    // Se invece la proposta si calcolasse sul corpo INVIATO — con un ripiego
    // `'nessuno'` — l'esito uscirebbe `reclamo`, cioè un incidente
    // sotto-classificato: esattamente il «generatore silenzioso di
    // sotto-classificazione» che la spec §5 vieta.
    const banco = bancoEvento()
    const corpo = corpoValido()
    delete (corpo as Record<string, unknown>).potenziale_di_danno
    const res = await POST_EVENTO(req(URL_EVENTO, corpo), paramsLavoro())
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(banco.rigaInserita).not.toBeNull()
    expect(Object.hasOwn(banco.rigaInserita!, 'potenziale_di_danno')).toBe(false)
    expect(body.evento.potenziale_di_danno).toBe('da_valutare')
    expect(body.proposta.esito).toBe('incidente')
    expect(body.proposta.ramoIso).toBe('8.3.3')
  })

  // ── `altro`: natura e testo libero ────────────────────────────────────────
  it('motivo `altro` senza motivo_libero → 422', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: 'altro', natura: 'difetto_fisico' })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo_libero di soli spazi → 422 (specchio del CHECK evento_altro_ha_testo)', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'altro', motivo_libero: '   ', natura: 'difetto_fisico' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo `altro` senza natura → 422: per `altro` la natura si CHIEDE, non si indovina', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo: 'altro', motivo_libero: 'caso strano' })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo `altro` con natura fuori vocabolario → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'altro', motivo_libero: 'caso strano', natura: 'boh' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
  })

  it('motivo `altro` con natura valida → 201 e la natura scritta è quella scelta', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'altro', motivo_libero: 'caso strano', natura: 'difetto_fisico' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.natura).toBe('difetto_fisico')
    expect(banco.rigaInserita?.motivo_libero).toBe('caso strano')
  })

  it('natura incoerente con un motivo derivabile → 422, mai uno scarto silenzioso', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', natura: 'commerciale' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('natura coerente col motivo derivabile → 201', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', natura: 'difetto_fisico' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.natura).toBe('difetto_fisico')
  })

  // ── conosciuto_il: il momento zero dei termini di legge ───────────────────
  it('conosciuto_il assente → 422: è il momento zero dei termini di legge', async () => {
    const banco = bancoEvento()
    const corpo = corpoValido()
    delete (corpo as Record<string, unknown>).conosciuto_il
    const res = await POST_EVENTO(req(URL_EVENTO, corpo), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('conosciuto_il non-data (`domani`) → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: 'domani' })), paramsLavoro())
    expect(res.status).toBe(422)
  })

  it('conosciuto_il numerico → 422', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: 1754500000000 })), paramsLavoro())
    expect(res.status).toBe(422)
  })

  it('conosciuto_il in formato italiano (`01/08/2026`) → 422, MAI letto come 8 gennaio', async () => {
    // 🛑 Il difetto vero, e su un campo che fa partire i termini dell'Art. 87:
    // `Date.parse('01/08/2026')` in JavaScript dà l'**8 gennaio**, non il
    // 1º agosto. Sette mesi di scarto su una scadenza di legge, e nessun
    // errore da nessuna parte. Qui si pretende ISO 8601 e basta.
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: '01/08/2026' })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
    nessunTestoGrezzo((await res.json()).error)
  })

  it('conosciuto_il con data e ora ma SENZA fuso → 201: è ISO 8601 valido, e il mandato dice ISO 8601', async () => {
    // ⚠️ Ambiguità REALE, e la prova la fissa invece di nasconderla: senza fuso
    // JavaScript legge nell'ora LOCALE di chi esegue — sul server (UTC) e sul
    // telefono (CEST) lo stesso testo è un istante diverso. Pretendere il fuso
    // la chiuderebbe, ma è una decisione sul contratto con il client (un campo
    // `datetime-local` restituisce proprio questa forma), non una correzione
    // della rete di prove: riferita a Francesco, non presa qui.
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: '2026-08-01T10:00:00' })), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.conosciuto_il).toBeTypeOf('string')
  })

  it('conosciuto_il come sola data ISO (`2026-08-01`) → 201', async () => {
    // Ammessa: senza ora, JavaScript la legge a mezzanotte UTC — un istante
    // ANTICIPATO rispetto a qualunque momento di quel giorno in Italia, quindi
    // la scadenza si stringe. È la direzione dell'Art. 87(7).
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: '2026-08-01' })), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.conosciuto_il).toBe('2026-08-01T00:00:00.000Z')
  })

  it('conosciuto_il ISO con scostamento esplicito (`+02:00`) → 201', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: '2026-08-01T10:30:00+02:00' })), paramsLavoro())
    expect(res.status).toBe(201)
  })

  it('conosciuto_il nel futuro (mezz\'ora) → 422', async () => {
    const banco = bancoEvento()
    const fra30min = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: fra30min })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('conosciuto_il un minuto avanti → 201: è scarto di orologio, non una data futura', async () => {
    bancoEvento()
    const fra1min = new Date(Date.now() + 60 * 1000).toISOString()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: fra1min })), paramsLavoro())
    expect(res.status).toBe(201)
  })

  it('conosciuto_il molto nel passato → 201: nessun limite inferiore (Art. 87(7), nel dubbio si segnala)', async () => {
    bancoEvento()
    const annoScorso = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: annoScorso })), paramsLavoro())
    expect(res.status).toBe(201)
  })

  // ── il path e il tenant ───────────────────────────────────────────────────
  it('id di path non UUID → 404 e nessuna query (mai un 22P02 grezzo)', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro('pippo'))
    expect(res.status).toBe(404)
    expect(res.status).not.toBe(500)
    expect(mockFrom).not.toHaveBeenCalled()
    nessunTestoGrezzo((await res.json()).error)
  })

  it('lavoro di un altro laboratorio → 404, indistinguibile da «non esiste»', async () => {
    const banco = bancoEvento({ lavoroTrovato: false })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(404)
    expect(banco.rigaInserita).toBeNull()
  })

  it('la pre-verifica del lavoro filtra DAVVERO per laboratorio_id di sessione', async () => {
    const banco = bancoEvento()
    await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    const eq = banco.lavori[0].calls.filter((c) => c.method === 'eq')
    expect(eq).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
    expect(eq).toContainEqual({ method: 'eq', args: ['id', LAVORO_ID] })
  })

  it('laboratorio_id viene dalla SESSIONE anche se il corpo ne porta un altro', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ laboratorio_id: ALTRO_LAB, created_by: 'chiunque' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.laboratorio_id).toBe(LAB_ID)
    expect(banco.rigaInserita?.created_by).toBe(USER_ID)
  })

  // ── il contratto della risposta ───────────────────────────────────────────
  it('POST evento torna la PROPOSTA e non deposita la valutazione', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.proposta.esito).toBe('reclamo')
    expect(body.valutazione).toBeUndefined() // la firma è dell'utente, non dell'app
    expect(body.evento.id).toBe(EVENTO_ID)
    expect(mockFrom).not.toHaveBeenCalledWith('valutazioni_evento')
  })

  it('la proposta porta il suo «perché» in parole comuni e il ramo ISO', async () => {
    bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    const body = await res.json()
    expect(typeof body.proposta.perche).toBe('string')
    expect(body.proposta.perche.length).toBeGreaterThan(20)
    expect(body.proposta.ramoIso).toBe('8.3.3')
    expect(body.proposta).toHaveProperty('termineOre')
  })

  it('la risposta sulla gravità NON si accetta alla registrazione (D277: si chiede al giudizio)', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ risposta_gravita: 'grave_regola_generale' })), paramsLavoro())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  // ── post_consegna_correzioni ──────────────────────────────────────────────
  it('incrementa post_consegna_correzioni quando il dispositivo era uscito', async () => {
    const banco = bancoEvento({ postConsegnaCorrezioni: 3 })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.lavori.length).toBe(2)
    const update = banco.lavori[1].calls.find((c) => c.method === 'update')
    expect(update?.args[0]).toEqual({ post_consegna_correzioni: 4 })
  })

  it('l\'incremento porta il CONFRONTA-E-SCAMBIA: l\'UPDATE filtra sul valore letto', async () => {
    // 🔑 `.eq('post_consegna_correzioni', valoreLetto)` è ciò che rende
    // innocua la corsa dichiarata in testa a `incrementaCorrezioni`: due
    // incrementi concorrenti non si sovrascrivono, il secondo non trova più
    // la riga e fallisce in silenzio (fail-soft). Senza quel filtro,
    // leggi-modifica-scrivi perde un'unità **sovrascrivendo** l'altra.
    // Senza questa prova il filtro si può cancellare senza accendere niente.
    const banco = bancoEvento({ postConsegnaCorrezioni: 3 })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.lavori.length).toBe(2)
    const eq = banco.lavori[1].calls.filter((c) => c.method === 'eq')
    expect(eq).toContainEqual({ method: 'eq', args: ['post_consegna_correzioni', 3] })
    expect(eq).toContainEqual({ method: 'eq', args: ['id', LAVORO_ID] })
    expect(eq).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
  })

  it('NON incrementa quando il dispositivo non è mai uscito dal laboratorio', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ stato_dispositivo: 'mai_uscito_dal_lab', origine_informazione: 'laboratorio_interno' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(banco.lavori.length).toBe(1) // solo la pre-verifica, nessun update
  })

  it('se l\'incremento fallisce l\'evento resta registrato: 201 (fail-soft)', async () => {
    bancoEvento({ erroreUpdate: { code: '40001', message: 'serialization failure' } })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.evento.id).toBe(EVENTO_ID)
  })

  // ── gli errori del database, tradotti — UN CASO PER RAMO ─────────────────
  // 🛑 Qui c'era UN SOLO caso, e con `toBeGreaterThanOrEqual(400)`: un lucchetto
  // vuoto. Passava indifferentemente con 400, 404, 409, 422 o 500, e infatti
  // cancellare il ramo `23514` della rotta lasciava la suite tutta verde. I tre
  // rami sono tre risposte diverse a tre fatti diversi, e ognuno ha il suo caso
  // con il suo codice esatto.
  it('insert rifiutato da una FK (23503) → 404 esatto, senza testo Postgres grezzo', async () => {
    bancoEvento({ erroreInsert: { code: '23503', message: 'insert or update on table "eventi_qualita" violates foreign key constraint' } })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(404)
    nessunTestoGrezzo((await res.json()).error)
  })

  it('insert rifiutato da un CHECK (23514) → 422 esatto, senza testo Postgres grezzo', async () => {
    bancoEvento({ erroreInsert: { code: '23514', message: 'new row violates check constraint "evento_altro_ha_testo"' } })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(422)
    nessunTestoGrezzo((await res.json()).error)
  })

  it('guasto generico dell\'insert → 500 esatto, senza testo Postgres grezzo', async () => {
    bancoEvento({ erroreInsert: { code: '08006', message: 'connection failure' } })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    expect(res.status).toBe(500)
    nessunTestoGrezzo((await res.json()).error)
  })
})

describe('POST /api/eventi-qualita/[id]/valutazioni — deposita il GIUDIZIO, non riclassifica', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('cross-origin → 403 e nessuna query', async () => {
    bancoValutazione()
    const res = await POST_VALUTAZIONE(
      req(URL_VALUTAZIONE, { esito: 'reclamo' }, { origin: 'http://evil.com', host: 'localhost' }),
      paramsEvento()
    )
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('non autenticato → 401', async () => {
    bancoValutazione()
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento())
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio → 403', async () => {
    bancoValutazione()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento())
    expect(res.status).toBe(403)
  })

  it('laboratorio sospeso → 403 su una scrittura', async () => {
    bancoValutazione()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab' } })
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento())
    expect(res.status).toBe(403)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('corpo non-JSON → 400, mai 500', async () => {
    bancoValutazione()
    const res = await POST_VALUTAZIONE(reqGrezza(URL_VALUTAZIONE, 'non-json'), paramsEvento())
    expect(res.status).toBe(400)
    expect(res.status).not.toBe(500)
  })

  it('corpo `null` → 400, mai 500', async () => {
    bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, null), paramsEvento())
    expect(res.status).toBe(400)
    expect(res.status).not.toBe(500)
  })

  it('corpo `{}` → 422', async () => {
    bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, {}), paramsEvento())
    expect(res.status).toBe(422)
  })

  it('esito fuori vocabolario → 422, nessun insert', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'boh' }), paramsEvento())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('esito array → 422', async () => {
    bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: ['reclamo'] }), paramsEvento())
    expect(res.status).toBe(422)
  })

  it('giustificazione di tipo sbagliato (numero) → 422', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo', giustificazione: 7 }), paramsEvento())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('giustificazione oltre il tetto → 422 e nessun insert', async () => {
    // Stesso tetto e stessa forma degli altri due campi di testo libero: senza,
    // 5 MB incollati finirebbero in banca dati senza un errore.
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(
      req(URL_VALUTAZIONE, { esito: 'nessuna_azione', giustificazione: 'g'.repeat(1001) }),
      paramsEvento()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
    expect((await res.json()).error).toMatch(/1000/)
  })

  it('giustificazione al tetto esatto (1000) → 201', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(
      req(URL_VALUTAZIONE, { esito: 'nessuna_azione', giustificazione: 'g'.repeat(1000) }),
      paramsEvento()
    )
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.giustificazione).toBe('g'.repeat(1000))
  })

  it('id di path non UUID → 404 e nessuna query', async () => {
    bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento('pippo'))
    expect(res.status).toBe(404)
    expect(mockFrom).not.toHaveBeenCalled()
    nessunTestoGrezzo((await res.json()).error)
  })

  it('evento di un altro laboratorio → 404, e la pre-verifica filtra per laboratorio_id', async () => {
    const banco = bancoValutazione({ eventoTrovato: false })
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento())
    expect(res.status).toBe(404)
    expect(banco.rigaInserita).toBeNull()
    expect(banco.eventi[0].calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
  })

  it('«nessuna azione» senza giustificazione → 422 con un messaggio che dice cosa fare', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'nessuna_azione' }), paramsEvento())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
    nessunTestoGrezzo((await res.json()).error)
  })

  it('«nessuna azione» con giustificazione di soli spazi → 422', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'nessuna_azione', giustificazione: '  ' }), paramsEvento())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('«nessuna azione» con giustificazione → 201, giustificazione ripulita dagli spazi', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(
      req(URL_VALUTAZIONE, { esito: 'nessuna_azione', giustificazione: '  il dispositivo era conforme  ' }),
      paramsEvento()
    )
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.giustificazione).toBe('il dispositivo era conforme')
  })

  it('sostituisce_id dal client → 422: la riclassificazione è fuori da quest\'ondata', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(
      req(URL_VALUTAZIONE, { esito: 'reclamo', sostituisce_id: VALUTAZIONE_ID }),
      paramsEvento()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('motivo_riclassificazione dal client → 422', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(
      req(URL_VALUTAZIONE, { esito: 'reclamo', motivo_riclassificazione: 'ci ho ripensato' }),
      paramsEvento()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('superata dal client → 422: nascerebbe un evento senza alcun giudizio vivo', async () => {
    // `valutazione_viva_unique` è parziale su `superata = false`: una riga
    // inserita già `superata = true` scivola sotto l'indice e lascia l'evento
    // senza giudizio vivo. Il test difende il rifiuto.
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo', superata: true }), paramsEvento())
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  it('seconda valutazione viva sullo stesso evento (23505) → 409, non 500', async () => {
    bancoValutazione({ erroreInsert: { code: '23505', message: 'duplicate key value violates unique constraint "valutazione_viva_unique"' } })
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento())
    expect(res.status).toBe(409)
    nessunTestoGrezzo((await res.json()).error)
  })

  it('errore generico dell\'insert → 500 senza testo Postgres grezzo', async () => {
    bancoValutazione({ erroreInsert: { code: '08006', message: 'connection failure' } })
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento())
    expect(res.status).toBe(500)
    nessunTestoGrezzo((await res.json()).error)
  })

  it('deposito riuscito → 201, laboratorio_id e classificato_da dalla SESSIONE', async () => {
    const banco = bancoValutazione()
    const res = await POST_VALUTAZIONE(
      req(URL_VALUTAZIONE, { esito: 'reclamo', laboratorio_id: ALTRO_LAB, classificato_da: 'chiunque' }),
      paramsEvento()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.valutazione.id).toBe(VALUTAZIONE_ID)
    expect(banco.rigaInserita?.laboratorio_id).toBe(LAB_ID)
    expect(banco.rigaInserita?.classificato_da).toBe(USER_ID)
    expect(banco.rigaInserita?.evento_id).toBe(EVENTO_ID)
  })

  it('la rotta non chiama NESSUNA RPC: in particolare mai valutazione_supera()', async () => {
    // La riclassificazione è fuori ondata (D273): `valutazione_supera()` è
    // l'unica via per marcare `superata = true` dopo il REVOKE UPDATE, e
    // questa rotta non deve toccarla.
    bancoValutazione()
    const res = await POST_VALUTAZIONE(req(URL_VALUTAZIONE, { esito: 'reclamo' }), paramsEvento())
    expect(res.status).toBe(201)
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
