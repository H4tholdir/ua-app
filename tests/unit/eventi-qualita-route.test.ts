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

/**
 * Corpo minimo valido per la prima rotta.
 *
 * 🛑 **IL MOTIVO PREDEFINITO È CAMBIATO CON IL TASK 7, e non è cosmesi.** Qui
 * c'era `difetto_lavorazione`, cioè **uno dei due motivi del bivio** (D304): da
 * quando la rotta pretende `scelta_intervento` su quei due, un corpo «minimo
 * valido» che li usasse non sarebbe più valido — e le ~40 prove che chiamano
 * `corpoValido()` senza indicare un motivo uscirebbero tutte **422**, cioè un
 * rosso di massa che non parla del difetto che ciascuna sorveglia.
 *
 * Il ripiego è `errore_dato_dichiarazione`, scelto per tre proprietà misurate,
 * non a caso: ① non chiede nessuna scelta (`MOTIVI_CON_SCELTA` non lo contiene);
 * ② non porta **nessuna azione automatica** (`effetti.ts:112-127`, `azione: null`),
 * quindi nessuna prova generica fa partire una RPC per sbaglio; ③ la sua natura
 * derivata è `dato_documentale`, che **non** è fra le tre esenzioni di
 * `classifica.ts:161-183` — la proposta resta `reclamo`, esattamente com'era con
 * `difetto_lavorazione` (natura `difetto_fisico`). Con `errore_prezzo_quantita`
 * (natura `commerciale`) l'esito sarebbe diventato `nessuna_azione` e le prove
 * sul contratto della risposta sarebbero cambiate di significato.
 */
function corpoValido(extra: Record<string, unknown> = {}) {
  return {
    motivo: 'errore_dato_dichiarazione',
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
  /** Le letture su `lavori_rifacimenti` — esistono solo sul ramo `23505` (T7). */
  rifacimenti: Chain[]
  rigaInserita: Record<string, unknown> | null
}

function bancoEvento(opts: {
  lavoroTrovato?: boolean
  postConsegnaCorrezioni?: number
  erroreInsert?: { code?: string; message?: string } | null
  erroreUpdate?: { code?: string; message?: string } | null
  /** La riga che `lavori_rifacimenti` restituisce sul ramo dell'idempotenza
   *  (T7, Passo 5): `null` = nessuna riga trovata, cioè il 23505 resta un guasto. */
  rifacimentoGia?: { lavoro_nuovo: { id: string; numero_lavoro: string } } | null
} = {}): BancoEvento {
  const {
    lavoroTrovato = true,
    postConsegnaCorrezioni = 0,
    erroreInsert = null,
    erroreUpdate = null,
    rifacimentoGia = null,
  } = opts
  const banco: BancoEvento = { lavori: [], eventi: [], rifacimenti: [], rigaInserita: null }

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
    if (tabella === 'lavori_rifacimenti') {
      const c = chain({ data: rifacimentoGia, error: null })
      banco.rifacimenti.push(c)
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
    // 🔑 L'ORDINE DELLE DUE GUARDIE, e senza questa riga non sarebbe provato.
    // Questo corpo è sbagliato DUE volte: natura incoerente **e** — dal Task 7 —
    // `scelta_intervento` mancante su un motivo del bivio. A parlare deve essere
    // la guardia della natura, che viene prima: se un giorno il blocco del bivio
    // salisse sopra, l'operatrice leggerebbe «dicci come si procede» su un corpo
    // il cui difetto vero è un altro.
    expect((await res.json()).error).toContain('si ricava dal motivo scelto')
  })

  it('natura coerente col motivo derivabile → 201', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      // ⚠️ Era `difetto_lavorazione` + `difetto_fisico`. Dal Task 7 quel motivo
      // pretende anche la scelta del bivio, e la prova qui riguarda la NATURA:
      // si usa un motivo derivabile che non apre nessun bivio, così il 201 non
      // dipende da un secondo campo che non c'entra.
      req(URL_EVENTO, corpoValido({ motivo: 'errore_dato_dichiarazione', natura: 'dato_documentale' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.natura).toBe('dato_documentale')
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

  it('conosciuto_il con data e ora ma SENZA fuso → 201, letto sull\'orologio di ROMA (D286)', async () => {
    // ⚖️ D286 (06/08/2026) CHIUDE l'ambiguità che questa prova dichiarava aperta.
    // Diceva: «senza fuso JavaScript legge nell'ora LOCALE di chi esegue — sul
    // server (UTC) e sul telefono (CEST) lo stesso testo è un istante diverso …
    // riferita a Francesco, non presa qui». Francesco l'ha presa: l'app segue
    // sempre l'orario italiano. Le 10:00 del 1º agosto a Roma (CEST) sono le
    // 08:00 UTC — e l'asserzione ora è sull'ISTANTE, non più sul solo tipo.
    // La rete completa sta in `tests/unit/istante-roma.test.ts`, che forza
    // `TZ=UTC` perché qui il difetto sarebbe invisibile.
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: '2026-08-01T10:00:00' })), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.conosciuto_il).toBe('2026-08-01T08:00:00.000Z')
  })

  it('conosciuto_il come sola data ISO (`2026-08-01`) → 201, mezzanotte di ROMA', async () => {
    // 🔄 CAMBIATA da D286, e il cambio è dichiarato invece che scoperto dopo:
    // valeva mezzanotte UTC, cioè le 02:00 italiane — un momento che in Italia
    // era già il giorno indicato, ma spostato di due ore dentro la giornata.
    // Ora vale mezzanotte di Roma: le 22:00 UTC del giorno prima. È anche la
    // lettura CONSERVATIVA — l'istante più indietro, quindi la scadenza più
    // vicina: la direzione dell'Art. 87(7) e di D280.
    const banco = bancoEvento()
    const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ conosciuto_il: '2026-08-01' })), paramsLavoro())
    expect(res.status).toBe(201)
    expect(banco.rigaInserita?.conosciuto_il).toBe('2026-07-31T22:00:00.000Z')
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

/**
 * ⚖️ D288 — LA GIUNTURA: dal motivo scelto all'effetto davvero applicato.
 *
 * 🛑 PERCHÉ LE PROVE STANNO QUI E NON SUI DUE LATI. Il 07/08 questo progetto ha
 * pagato la lezione per intero: «due metà giuste non fanno una cosa che
 * funziona, e nessuna prova guarda la giuntura». `riapri_lavoro_atomica` era
 * costruita, applicata al database e **provata** (Task 3) — e non la chiamava
 * nessuno: tre prove su quattro erano verdi mentre la funzione non girava mai.
 * ➡️ Le prove che contano sono quelle che vanno DAL MOTIVO ALLA CHIAMATA.
 *
 * 🔑 E la prova che una correzione morde è la STESSA ROTTURA RIFATTA: qui la
 * rottura è «l'effetto non parte», e la si rifà chiedendo che `mockRpc` sia
 * stato chiamato con quegli argomenti — non che la risposta contenga una parola.
 */
describe('POST …/eventi-qualita — D288: l\'effetto si deriva dal motivo, e per uno solo si ESEGUE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  const corpoSbagliatoTasto = (extra: Record<string, unknown> = {}) =>
    corpoValido({ motivo: 'errore_registrazione', stato_dispositivo: 'mai_uscito_dal_lab', ...extra })

  it('«ho sbagliato a premere consegna» CHIAMA riapri_lavoro_atomica, con lavoro, laboratorio ed evento', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_assente: false }, error: null })

    const res = await POST_EVENTO(req(URL_EVENTO, corpoSbagliatoTasto()), paramsLavoro())
    expect(res.status).toBe(201)

    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('riapri_lavoro_atomica', {
      p_lavoro_id: LAVORO_ID,
      p_laboratorio_id: LAB_ID,
      p_evento_id: EVENTO_ID,
    })

    const body = await res.json()
    expect(body.effetto.lavoro).toBe('ripristina_tutto')
    expect(body.effetto.azione).toBe('riapri_lavoro')
    // 🛑 IL CAMPO SI CHIAMA `esito_azione` DAL TASK 7, e `riapertura` NON resta
    // come sinonimo: un nome che dice «riapertura» su un'azione che CREA un
    // lavoro sarebbe un testo falso. La seconda riga è la parte che morde.
    expect(body.esito_azione).toEqual({ stato: 'applicato', dichiarazione_assente: false })
    expect(body.riapertura).toBeUndefined()
  })

  it('🛑 l\'evento si registra PRIMA: l\'id passato alla RPC è quello della riga appena salvata', async () => {
    // Senza questo ordine la RPC riceverebbe un evento inesistente e
    // restituirebbe `evento_non_valido` — la guardia D263 dentro la funzione.
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_assente: false }, error: null })
    await POST_EVENTO(req(URL_EVENTO, corpoSbagliatoTasto()), paramsLavoro())
    const body = mockRpc.mock.calls[0][1] as { p_evento_id: string }
    expect(body.p_evento_id).toBe(EVENTO_ID)
  })

  // ⚖️ D312 + TASK 7 — DA SEI A QUATTRO, e i due che sono usciti sono usciti per
  // ragioni diverse:
  //   · `destinatario_errato` era già uscito col Task 6 (la sua riga fissa porta
  //     `azione: 'torna_pronto'`), e ora ha la prova che la sua RPC parte davvero;
  //   · `difetto_lavorazione` e `difetto_materiale` escono ADESSO: dal Task 7 non
  //     sono più corpi validi senza `scelta_intervento`, e con la scelta portano
  //     un'azione. Le loro prove stanno nel blocco del bivio, più in basso.
  // Restano i quattro motivi che davvero non fanno succedere niente.
  it('🛑 GLI ALTRI QUATTRO MOTIVI NON chiamano nessuna RPC e non portano azione — la giuntura tiene anche nel verso opposto', async () => {
    for (const motivo of [
      'errore_dato_dichiarazione',
      'modifica_clinica_richiesta', 'errore_prezzo_quantita',
      'reso_senza_difetto',
    ]) {
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      bancoEvento()
      const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo })), paramsLavoro())
      expect(res.status, motivo).toBe(201)
      expect(mockRpc, motivo).not.toHaveBeenCalled()
      const body = await res.json()
      expect(body.effetto.azione, motivo).toBeNull()
      expect(body.esito_azione, motivo).toBeUndefined()
    }
  })

  // ⚖️ D312 — «PERSONA SBAGLIATA»: DAL TASK 7 L'AZIONE SI ESEGUE.
  // 🔄 Questa prova diceva l'opposto — «ma a questo task nessuna RPC parte» — ed
  // era VERA al Task 6, perché lì la rotta smistava solo su `riapri_lavoro`. Il
  // Task 7 cabla lo smistamento, quindi la prova si CAMBIA: era il suo stesso
  // commento a dirlo («se un giorno questa prova si accende sulla riga della RPC,
  // è QUI che va aggiornata, non aggirata»).
  // 🛑 E la riga che conta più di tutte è la TERZA: la RPC chiamata è la gemella
  // NON distruttiva. Se un giorno partisse `riapri_lavoro_atomica`, la
  // dichiarazione di un manufatto uscito DAVVERO verrebbe annullata — è ciò che
  // D293 vieta, e la differenza fra le due funzioni sta tutta nel nome.
  it('⚖️ D312 «persona sbagliata» chiama riporta_a_pronto_atomica — e MAI la gemella che annulla il documento', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_viva: true }, error: null })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'destinatario_errato' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.effetto.azione).toBe('torna_pronto')
    expect(body.effetto.lavoro).toBe('torna_pronto')
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith('riporta_a_pronto_atomica', {
      p_lavoro_id: LAVORO_ID,
      p_laboratorio_id: LAB_ID,
      p_evento_id: EVENTO_ID,
    })
    expect(mockRpc).not.toHaveBeenCalledWith('riapri_lavoro_atomica', expect.anything())
    expect(body.esito_azione).toEqual({ stato: 'applicato', dichiarazione_viva: true })
  })

  // 🛑 LA PROMESSA CHE NON HA OGGETTO. «La dichiarazione resta valida» è una
  // frase, e se non c'è nessuna dichiarazione viva è una frase FALSA: la RPC lo
  // dice con `ddc_viva:false` (`20260807182614:96`) e la rotta lo fa VIAGGIARE
  // nella risposta. Un campo negativo che non arriva a chi legge è
  // indistinguibile da un successo (R10).
  it('🛑 se non c\'era nessuna dichiarazione viva, la risposta lo DICE (ddc_viva → dichiarazione_viva)', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_viva: false }, error: null })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'destinatario_errato' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect((await res.json()).esito_azione).toEqual({ stato: 'applicato', dichiarazione_viva: false })
  })

  // 🛑 GEMELLA DELLA GUARDIA SU `errore_registrazione` (Task 7, Passo 3). Se il
  // manufatto non è mai uscito dal laboratorio non può essere andato alla persona
  // sbagliata: quel caso è «ho premuto consegna per sbaglio», che ha il suo
  // motivo e la sua transizione — distruttiva, e per questo va scelta apposta.
  // La guardia sta nell'API e non nella schermata: è il confine di un atto che
  // sposta un lavoro, e una schermata non è un confine.
  it('🛑 «persona sbagliata» su un manufatto MAI USCITO → 422, nessun evento salvato, nessuna RPC', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'destinatario_errato', stato_dispositivo: 'mai_uscito_dal_lab', origine_informazione: 'laboratorio_interno' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
    expect(mockRpc).not.toHaveBeenCalled()
    // Il messaggio dice DOVE andare, non solo che è vietato (D262).
    expect((await res.json()).error).toContain('consegna')
  })

  it('«persona sbagliata» resta ammessa su ogni ALTRO stato del dispositivo — la guardia è mirata', async () => {
    for (const stato of ['consegnato_non_applicato', 'applicato', 'non_noto']) {
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      bancoEvento()
      mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_viva: true }, error: null })
      const res = await POST_EVENTO(
        req(URL_EVENTO, corpoValido({ motivo: 'destinatario_errato', stato_dispositivo: stato })),
        paramsLavoro()
      )
      expect(res.status, stato).toBe(201)
      expect(mockRpc, stato).toHaveBeenCalledWith('riporta_a_pronto_atomica', expect.anything())
    }
  })

  it('anche «altro» non la chiama, e porta comunque il suo effetto neutro', async () => {
    bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'altro', motivo_libero: 'caso strano', natura: 'nessun_difetto' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(mockRpc).not.toHaveBeenCalled()
    expect((await res.json()).effetto.lavoro).toBe('nessuno')
  })

  // ── I TRE ESITI NEGATIVI SONO TRE COSE DIVERSE, e un booleano li appiattirebbe ──
  it('lavoro non più consegnato → «non applicabile», NON un fallimento', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'non_consegnato' }, error: null })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoSbagliatoTasto()), paramsLavoro())
    expect(res.status).toBe(201)
    expect((await res.json()).esito_azione).toEqual({ stato: 'non_applicabile', motivo: 'non_consegnato' })
  })

  it('🛑 la RPC FALLISCE → 201 (il fatto non si perde) ma la risposta lo DICE: mai un successo silenzioso', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: null, error: { message: 'riapertura: dichiarazione in stato incoerente per lavoro …' } })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoSbagliatoTasto()), paramsLavoro())
    // Il FATTO è salvato e non si butta via: 201, come per ogni altro motivo.
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.evento).toBeTruthy()
    // 🛑 Ma NON dice «applicato». È il difetto della §8.1 — «fallire dichiarando successo».
    expect(body.esito_azione.stato).toBe('fallito')
    // …e il testo Postgres grezzo non arriva a chi legge (precondizione ②).
    nessunTestoGrezzo(body.esito_azione.messaggio)
  })

  it('applicata su un lavoro senza dichiarazione (dato vecchio) → applicata, ma il caveat si vede', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_assente: true }, error: null })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoSbagliatoTasto()), paramsLavoro())
    expect((await res.json()).esito_azione).toEqual({ stato: 'applicato', dichiarazione_assente: true })
  })

  it('un\'eccezione della RPC non fa cadere la richiesta: il fatto resta salvato', async () => {
    bancoEvento()
    mockRpc.mockRejectedValue(new Error('rete giù'))
    const res = await POST_EVENTO(req(URL_EVENTO, corpoSbagliatoTasto()), paramsLavoro())
    expect(res.status).toBe(201)
    expect((await res.json()).esito_azione.stato).toBe('fallito')
  })

  // ── LA PORTA DI «ALTRO» SU QUESTA NATURA SI CHIUDE (R8) ────────────────────
  it('🛑 «altro» NON può prendersi la natura «errore di registrazione»: sarebbe una promessa che nessuno mantiene', async () => {
    bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'altro', motivo_libero: 'boh', natura: 'errore_registrazione' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
    // Il messaggio dice DOVE andare, non cosa è vietato (D262).
    expect((await res.json()).error).toContain('ho sbagliato a premere consegna')
  })

  // ── 🛑 LA COMBINAZIONE CHE DISTRUGGE UNA PROVA DI LEGGE ────────────────────
  // «Ho premuto consegna per sbaglio» e «il manufatto era APPLICATO a un
  // paziente» non possono essere veri insieme: se è stato applicato, la consegna
  // è avvenuta. Ma niente lo impediva, e le conseguenze erano due, entrambe gravi:
  //   ① `classifica()` fa scattare il passo ① (dispositivo uscito + potenziale di
  //      danno) e propone **INCIDENTE**;
  //   ② l'effetto derivato dal motivo chiama comunque la RPC, che **annulla la
  //      dichiarazione** — su un manufatto uscito DAVVERO.
  // 🔑 È esattamente ciò che D293 vieta: annullare il documento di una consegna
  // realmente avvenuta cancella l'unica prova che quel manufatto è esistito ed è
  // andato a un paziente. La guardia sta QUI e non nell'interfaccia: il confine
  // di un atto distruttivo su un documento a valore legale è dell'API.
  it('🛑 «ho sbagliato a premere consegna» su un manufatto APPLICATO → 422, e la RPC non parte', async () => {
    bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'errore_registrazione', stato_dispositivo: 'applicato', potenziale_di_danno: 'possibile' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('🛑 e nemmeno su un manufatto CONSEGNATO o di cui non si sa: la consegna o è avvenuta o no', async () => {
    for (const stato of ['consegnato_non_applicato', 'non_noto']) {
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      bancoEvento()
      const res = await POST_EVENTO(
        req(URL_EVENTO, corpoValido({ motivo: 'errore_registrazione', stato_dispositivo: stato })),
        paramsLavoro()
      )
      expect(res.status, stato).toBe(422)
      expect(mockRpc, stato).not.toHaveBeenCalled()
    }
  })

  it('l\'unico stato coerente resta ammesso, e lì la RPC parte', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_assente: false }, error: null })
    const res = await POST_EVENTO(req(URL_EVENTO, corpoSbagliatoTasto()), paramsLavoro())
    expect(res.status).toBe(201)
    expect(mockRpc).toHaveBeenCalledTimes(1)
  })

  // ⚠️ «GLI ALTRI» SONO DIVENTATI DUE INSIEMI, e la riga va letta con la spec §4.4:
  //   · i DUE DIFETTI restano liberi su ogni stato — e in particolare su
  //     `mai_uscito_dal_lab` **non** c'è nessun 422: a rispondere è il cancello di
  //     stato DENTRO la RPC, che dice `non_consegnato`, e la rotta lo traduce in
  //     «non applicabile». È l'ultima riga della tabella §4.4, quella marcata «da
  //     verificare in FASE 6»: qui è provata la TRADUZIONE, non il cancello (che
  //     vive in `20260807182614:73` ed è materia delle prove d'integrazione, T10);
  //   · `destinatario_errato` invece NON è più libero, e ha la sua guardia
  //     dedicata più sopra.
  it('i DUE DIFETTI restano liberi su ogni stato del dispositivo — la guardia è mirata, non un blocco', async () => {
    for (const stato of ['mai_uscito_dal_lab', 'consegnato_non_applicato', 'applicato', 'non_noto']) {
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      bancoEvento()
      mockRpc.mockResolvedValue({
        data: stato === 'mai_uscito_dal_lab' ? { esito: 'non_consegnato' } : { esito: 'ok', ddc_viva: true },
        error: null,
      })
      const res = await POST_EVENTO(
        req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_sistema', stato_dispositivo: stato })),
        paramsLavoro()
      )
      expect(res.status, stato).toBe(201)
      expect(res.status, stato).not.toBe(422)
    }
  })

  it('«altro» resta invece libero sulle altre naturae, che non portano nessuna azione', async () => {
    for (const natura of ['commerciale', 'nuova_esigenza_clinica', 'difetto_fisico']) {
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      bancoEvento()
      const res = await POST_EVENTO(
        req(URL_EVENTO, corpoValido({ motivo: 'altro', motivo_libero: 'caso', natura })),
        paramsLavoro()
      )
      expect(res.status, natura).toBe(201)
    }
  })
})

/**
 * ⚖️ D304 · D305 · D306 · D307 — IL BIVIO DEI DUE DIFETTI, E LE DUE AZIONI NUOVE
 * (Task 7 dell'ondata «torna a `pronto` col documento intatto»).
 *
 * 🔑 PERCHÉ OGNI GUARDIA STA NELL'API. La lezione è stata pagata tre volte il
 * 07/08: una coppia incoerente (motivo, azione) che arriva a un atto che **crea o
 * sposta** cose non si ferma con una schermata. Una schermata la si aggira con
 * `curl`, con una PWA aperta da ieri, con un tocco doppio — e quello che sta
 * dall'altra parte qui brucia un progressivo d'anno o sposta un lavoro.
 *
 * 📋 FORME D'INGRESSO CENSITE per `scelta_intervento` (R-P4), ognuna col suo caso
 * o col suo «non coperta, perché»:
 *   · chiave assente su un motivo del bivio → 422 (caso ①)
 *   · `null` su un motivo del bivio → 422 (caso ①-bis: `null` non è una scelta)
 *   · stringa fuori vocabolario → 422 (caso ③)
 *   · numero, array, oggetto → 422 (caso ③-bis: `inVocabolario` regge ogni `unknown`)
 *   · valore valido su un motivo SENZA bivio → 422 (caso ②: mai uno scarto muto)
 *   · `null` su un motivo senza bivio → 201, trattato come assenza (caso ②-bis)
 *   · `undefined` esplicito → **non coperta, perché** `JSON.stringify` cancella la
 *     chiave: al confine HTTP quel caso *è* «chiave assente», già coperto da ①
 *   · corpo non-JSON / `null` / array → **già coperte** dalle prove d'ingresso del
 *     primo blocco (400, mai 500): quel confine è a monte e non è cambiato.
 */
describe('POST …/eventi-qualita — il bivio dei due difetti e le due azioni nuove (D304-D307)', () => {
  const LAVORO_NUOVO = '77777777-7777-7777-7777-777777777777'
  const ALTRO_EVENTO = '88888888-8888-8888-8888-888888888888'

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  /** Instrada le DUE RPC del percorso «si rifà»: la creazione e — solo dopo —
   *  il trasferimento della cassetta (D309, fail-soft). */
  function rpcRifacimento(opts: { crea?: Risultato; cassetta?: Risultato } = {}) {
    const crea = opts.crea ?? { data: { lavoro_nuovo_id: LAVORO_NUOVO, numero_lavoro: '2026-0042' }, error: null }
    const cassetta = opts.cassetta ?? { data: { esito: 'trasferita' }, error: null }
    mockRpc.mockImplementation((nome: string) =>
      Promise.resolve(nome === 'cassetta_trasferisci_rifacimento' ? cassetta : crea)
    )
  }

  // ── ① il valore che DEVE essere rifiutato: la scelta che manca ─────────────
  it('① un motivo del bivio SENZA scelta → 422, nessun evento salvato, nessuna RPC', async () => {
    for (const motivo of ['difetto_lavorazione', 'difetto_materiale']) {
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      const banco = bancoEvento()
      const res = await POST_EVENTO(req(URL_EVENTO, corpoValido({ motivo })), paramsLavoro())
      expect(res.status, motivo).toBe(422)
      expect(banco.rigaInserita, motivo).toBeNull()
      expect(mockRpc, motivo).not.toHaveBeenCalled()
      // Il messaggio è la DOMANDA, non un divieto: dice che cosa manca.
      expect((await res.json()).error, motivo).toContain('si sistema questo manufatto')
    }
  })

  it('①-bis `scelta_intervento: null` su un motivo del bivio → 422: `null` non è una scelta', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_materiale', scelta_intervento: null })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
  })

  // ── ② il valore che DEVE essere rifiutato: la scelta di troppo ─────────────
  it('② una scelta su un motivo che non ne ha → 422, mai uno scarto silenzioso', async () => {
    // 🔑 È la classe di difetto «Salvato su un dato che non c'è»: scartare la
    // chiave in silenzio farebbe leggere «Registrato» a chi ha appena indicato
    // una strada che nessuno prenderà. Stesso trattamento già riservato a
    // `natura` su un motivo derivabile.
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'errore_prezzo_quantita', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(banco.rigaInserita).toBeNull()
    expect(mockRpc).not.toHaveBeenCalled()
    expect((await res.json()).error).toContain('nessuna scelta da fare')
  })

  it('②-bis `scelta_intervento: null` su un motivo senza bivio → 201: assente e nullo si equivalgono', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'errore_prezzo_quantita', scelta_intervento: null })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(Object.hasOwn(banco.rigaInserita!, 'scelta_intervento')).toBe(false)
  })

  // ── ③ i valori che DEVONO essere rifiutati: le forme storte ────────────────
  it('③ `scelta_intervento: \'forse\'` → 422', async () => {
    const banco = bancoEvento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'forse' })),
      paramsLavoro()
    )
    expect(res.status).toBe(422)
    expect(res.status).not.toBe(500)
    expect(banco.rigaInserita).toBeNull()
  })

  it('③-bis numero, array e oggetto al posto della scelta → 422, mai 500', async () => {
    for (const valore of [7, ['si_sistema'], { scelta: 'si_sistema' }, true] as const) {
      vi.clearAllMocks()
      mockGetFreshLabContext.mockResolvedValue(CONTEXT)
      const banco = bancoEvento()
      const res = await POST_EVENTO(
        req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: valore })),
        paramsLavoro()
      )
      expect(res.status, JSON.stringify(valore)).toBe(422)
      expect(res.status, JSON.stringify(valore)).not.toBe(500)
      expect(banco.rigaInserita, JSON.stringify(valore)).toBeNull()
    }
  })

  // ── la scelta si SALVA, e quando non c'è non si inventa ────────────────────
  it('la scelta arriva in banca dati sulla riga dell\'evento, e senza bivio la chiave non esiste', async () => {
    const banco = bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_viva: true }, error: null })
    await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_sistema' })),
      paramsLavoro()
    )
    expect(banco.rigaInserita?.scelta_intervento).toBe('si_sistema')

    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
    const secondo = bancoEvento()
    await POST_EVENTO(req(URL_EVENTO, corpoValido()), paramsLavoro())
    // 🛑 Non `null`: la chiave proprio non si manda. Il CHECK in banca dati
    // ammette solo `NULL` fuori dai due motivi, e mandarla esplicita sarebbe un
    // valore in più da spiegare a ogni futuro lettore.
    expect(Object.hasOwn(secondo.rigaInserita!, 'scelta_intervento')).toBe(false)
  })

  // ── «si sistema» → la gemella che NON annulla il documento ─────────────────
  it('«si sistema» chiama riporta_a_pronto_atomica, e MAI la gemella distruttiva', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'ok', ddc_viva: true }, error: null })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_sistema' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(mockRpc).toHaveBeenCalledWith('riporta_a_pronto_atomica', {
      p_lavoro_id: LAVORO_ID,
      p_laboratorio_id: LAB_ID,
      p_evento_id: EVENTO_ID,
    })
    expect(mockRpc).not.toHaveBeenCalledWith('riapri_lavoro_atomica', expect.anything())
    const body = await res.json()
    // 🔑 L'effetto viaggia GIÀ RISOLTO: la schermata finale non deve ristampare
    // la domanda a cui la persona ha appena risposto (spec §4.3).
    expect(body.effetto.lavoro).toBe('torna_pronto')
    expect(body.effetto.azione).toBe('torna_pronto')
    expect(body.effetto.perche).not.toContain('serve una scelta')
    expect(body.esito_azione).toEqual({ stato: 'applicato', dichiarazione_viva: true })
  })

  // ── ⑤ la riga che il piano dichiara NON PROVATA ────────────────────────────
  // 🛑 CHE COSA PROVA QUESTA RIGA, E CHE COSA NO. Prova che la rotta **traduce**
  // `esito: 'non_consegnato'` in «non applicabile» invece di gridare al guasto —
  // un lavoro che non era da riportare indietro non è un errore, e chiamarlo tale
  // insegna a ignorare gli avvisi. NON prova che la RPC risponda davvero così su
  // un lavoro non consegnato: qui la RPC è finta. Il cancello vero sta in
  // `20260807182614:73` (`IF v_lavoro.stato <> 'consegnato' THEN … 'non_consegnato'`),
  // e la prova a runtime è materia del Task 10.
  it('⑤ «si sistema» su un lavoro NON consegnato → 201 con esito «non applicabile», non un guasto', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'non_consegnato' }, error: null })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_sistema' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.evento.id).toBe(EVENTO_ID) // il fatto resta agli atti
    expect(body.esito_azione).toEqual({ stato: 'non_applicabile', motivo: 'non_consegnato' })
  })

  it('un esito ignoto dalla RPC di ripristino NON si legge come successo (fail-closed)', async () => {
    bancoEvento()
    mockRpc.mockResolvedValue({ data: { esito: 'boh' }, error: null })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_sistema' })),
      paramsLavoro()
    )
    expect((await res.json()).esito_azione.stato).toBe('fallito')
  })

  // ── ⑥ «si rifà» → nasce un lavoro nuovo ───────────────────────────────────
  it('⑥ «si rifà» crea il rifacimento e restituisce il numero del lavoro nuovo', async () => {
    bancoEvento()
    rpcRifacimento()
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_materiale', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect(mockRpc).toHaveBeenCalledWith('crea_rifacimento_atomico', {
      p_lavoro_originale_id: LAVORO_ID,
      p_motivo: 'difetto_materiale',
      p_rilevato_in: 'post_consegna',
      p_costo_interno: null,
      p_note: null,
      p_evento_id: EVENTO_ID,
    })
    const body = await res.json()
    expect(body.effetto.azione).toBe('crea_rifacimento')
    expect(body.esito_azione.stato).toBe('applicato')
    expect(body.esito_azione.lavoro_nuovo).toEqual({ id: LAVORO_NUOVO, numero_lavoro: '2026-0042' })
    // 🛑 «riapertura» sarebbe un nome FALSO qui: non si riapre niente, nasce un
    // lavoro. È la ragione per cui il campo è stato rinominato in questo task.
    expect(body.riapertura).toBeUndefined()
  })

  it('il motivo scritto sul rifacimento è quello VERO, non un «altro» di ripiego', async () => {
    // 🔑 La RPC non valida `p_motivo` e la rotta HTTP del rifacimento non accetta
    // questi due valori: l'unico guardiano del dato è questa derivazione. Se
    // scrivesse `altro` si perderebbe l'unica informazione che conta.
    bancoEvento()
    rpcRifacimento()
    await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    const args = mockRpc.mock.calls.find((c) => c[0] === 'crea_rifacimento_atomico')![1] as { p_motivo: string }
    expect(args.p_motivo).toBe('difetto_lavorazione')
  })

  // ── 🔴 PASSO 4-bis — L'EMENDAMENTO: nessuno lega l'evento al lavoro ────────
  // Il trigger `assert_same_lab_rifacimento` guarda solo i due lavori, mai
  // l'evento; la FK composita difende dal «evento di un altro laboratorio», non
  // dal «evento dello stesso laboratorio ma di un ALTRO lavoro». E quel secondo
  // caso non resta innocuo: `rifacimento_evento_unique` BRUCIA quell'evento, così
  // un rifacimento legittimo successivo su di esso uscirebbe 23505.
  // ➡️ Questa rotta è l'ultimo punto in cui l'identificativo giusto è garantito,
  // e ce l'ha in mano: l'evento l'ha appena inserito lei, su QUESTO lavoro.
  it('🔴 l\'evento passato al rifacimento è quello appena salvato, MAI uno che arriva dal corpo', async () => {
    bancoEvento()
    rpcRifacimento()
    await POST_EVENTO(
      req(URL_EVENTO, corpoValido({
        motivo: 'difetto_lavorazione',
        scelta_intervento: 'si_rifa',
        evento_id: ALTRO_EVENTO,
        p_evento_id: ALTRO_EVENTO,
      })),
      paramsLavoro()
    )
    const args = mockRpc.mock.calls.find((c) => c[0] === 'crea_rifacimento_atomico')![1] as { p_evento_id: string }
    expect(args.p_evento_id).toBe(EVENTO_ID)
    expect(args.p_evento_id).not.toBe(ALTRO_EVENTO)
  })

  // ── ⑦ il secondo tocco non crea un secondo lavoro ─────────────────────────
  it('⑦ un secondo invio sullo stesso evento (23505) restituisce il lavoro che c\'è già', async () => {
    const banco = bancoEvento({ rifacimentoGia: { lavoro_nuovo: { id: LAVORO_NUOVO, numero_lavoro: '2026-0042' } } })
    rpcRifacimento({ crea: { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "rifacimento_evento_unique"' } } })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    // 🔑 Non è un guasto: è il secondo tocco, o il ritentativo dopo un timeout.
    expect(body.esito_azione.stato).toBe('applicato')
    expect(body.esito_azione.lavoro_nuovo).toEqual({ id: LAVORO_NUOVO, numero_lavoro: '2026-0042' })
    nessunTestoGrezzo(JSON.stringify(body.esito_azione))
    // La lettura di riparazione filtra per laboratorio ED evento: mai il
    // rifacimento di un altro laboratorio.
    const eq = banco.rifacimenti[0].calls.filter((c) => c.method === 'eq')
    expect(eq).toContainEqual({ method: 'eq', args: ['laboratorio_id', LAB_ID] })
    expect(eq).toContainEqual({ method: 'eq', args: ['evento_id', EVENTO_ID] })
    // …e nessun secondo tentativo di creazione.
    expect(mockRpc.mock.calls.filter((c) => c[0] === 'crea_rifacimento_atomico')).toHaveLength(1)
  })

  it('⑦-bis un 23505 senza riga da restituire resta un GUASTO, non un successo inventato', async () => {
    bancoEvento({ rifacimentoGia: null })
    rpcRifacimento({ crea: { data: null, error: { code: '23505', message: 'duplicate key' } } })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.esito_azione.stato).toBe('fallito')
    nessunTestoGrezzo(body.esito_azione.messaggio)
  })

  it('la creazione fallita si DICE: 201 col fatto salvo, ma l\'esito non è «applicato»', async () => {
    bancoEvento()
    rpcRifacimento({ crea: { data: null, error: { code: '08006', message: 'connection failure' } } })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.evento.id).toBe(EVENTO_ID)
    expect(body.esito_azione.stato).toBe('fallito')
    expect(body.esito_azione.messaggio).toContain('non è stato creato')
    nessunTestoGrezzo(body.esito_azione.messaggio)
  })

  it('una risposta senza numero di lavoro non si legge come successo (fail-closed)', async () => {
    bancoEvento()
    rpcRifacimento({ crea: { data: { lavoro_nuovo_id: LAVORO_NUOVO }, error: null } })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect((await res.json()).esito_azione.stato).toBe('fallito')
  })

  it('un\'eccezione durante la creazione non fa cadere la richiesta', async () => {
    bancoEvento()
    mockRpc.mockRejectedValue(new Error('rete giù'))
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    expect((await res.json()).esito_azione.stato).toBe('fallito')
  })

  // ── D309 — la cassetta segue il rifacimento, ed è l'UNICA parte fail-soft ──
  it('la cassetta si sposta con lo stesso helper del percorso HTTP esistente', async () => {
    bancoEvento()
    rpcRifacimento()
    await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(mockRpc).toHaveBeenCalledWith('cassetta_trasferisci_rifacimento', {
      p_lab: LAB_ID,
      p_lavoro_vecchio: LAVORO_ID,
      p_lavoro_nuovo: LAVORO_NUOVO,
    })
  })

  it('🛑 ma un cassetto non spostato NON annulla un lavoro già creato (D309, fail-soft)', async () => {
    bancoEvento()
    rpcRifacimento({ cassetta: { data: null, error: { code: '40001', message: 'serialization failure' } } })
    const res = await POST_EVENTO(
      req(URL_EVENTO, corpoValido({ motivo: 'difetto_lavorazione', scelta_intervento: 'si_rifa' })),
      paramsLavoro()
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.esito_azione.stato).toBe('applicato')
    expect(body.esito_azione.lavoro_nuovo.numero_lavoro).toBe('2026-0042')
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
