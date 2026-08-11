import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

/**
 * D286 — «l'app deve seguire l'orario italiano di Roma, quello di qualsiasi
 * dispositivo in Italia» (Francesco, 06/08/2026).
 *
 * 🛑 QUESTE PROVE NON PROVANO NIENTE SE GIRANO NEL FUSO DI ROMA, e per un po'
 * questo file è stato scritto proprio per non cadere in quella trappola.
 * `provato:` su questa macchina (`Europe/Rome`) `Date.parse('2026-08-06T10:00')`
 * restituisce `2026-08-06T08:00:00.000Z`, che è la risposta GIUSTA: il difetto è
 * invisibile da qui. Con `TZ=UTC` — il fuso del server dell'app — lo stesso testo
 * diventa `2026-08-06T10:00:00.000Z`, **due ore avanti**, e quelle due ore
 * cadono su `conosciuto_il`, cioè sul momento zero dei termini dell'Art. 87 MDR.
 * Per questo il fuso del processo si forza a UTC in `beforeAll`.
 *
 * ⚠️ E si RIMETTE com'era in `afterAll`: `tests/unit/striscia-trial.test.ts:51`
 * dipende esplicitamente dal fatto che la macchina di prova sia `Europe/Rome`.
 * Un file che sposta il fuso e non lo restituisce fa fallire i file che gli
 * capitano dopo nello stesso worker, con un rosso che sembra di qualcun altro.
 */

const FUSO_ORIGINALE = process.env.TZ

// ── il banco della rotta (mock isolati: la suite grande non si tocca) ────────
const { mockFrom, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: vi.fn() }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

import { istanteDaTestoRoma } from '@/lib/utils/data-roma'
import { POST } from '@/app/api/lavori/[id]/eventi-qualita/route'

beforeAll(() => {
  process.env.TZ = 'UTC'
})
afterAll(() => {
  if (FUSO_ORIGINALE === undefined) delete process.env.TZ
  else process.env.TZ = FUSO_ORIGINALE
})

/** L'istante atteso, scritto come istante e non come testo. */
function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function ok(testo: string): number {
  const esito = istanteDaTestoRoma(testo)
  if (!esito.ok) throw new Error(`atteso un istante, ricevuto rifiuto «${esito.causa}» per «${testo}»`)
  return esito.ms
}

describe('istanteDaTestoRoma — un momento SENZA fuso è ora di Roma, non ora del processo', () => {
  it('il fuso del processo è davvero UTC: senza questo, le prove qui sotto non morderebbero', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')
    // 🛑 La sonda del difetto: è ciò che la rotta faceva PRIMA, e il valore
    // sbagliato si legge qui in chiaro. Se un giorno questa riga smette di
    // valere, il file intero ha perso il suo potere di distinzione.
    expect(iso(Date.parse('2026-08-06T10:00'))).toBe('2026-08-06T10:00:00.000Z')
  })

  it('ORA LEGALE (agosto, CEST +2): le 10:00 di Roma sono le 08:00 UTC', () => {
    expect(iso(ok('2026-08-06T10:00'))).toBe('2026-08-06T08:00:00.000Z')
  })

  it('ORA SOLARE (gennaio, CET +1): le 10:00 di Roma sono le 09:00 UTC', () => {
    // 🔑 La prova che l'offset è RISOLTO per la data, non cablato: se qualcuno
    // scrivesse `-2h` fisso, questa riga diventerebbe rossa e quella di agosto
    // resterebbe verde.
    expect(iso(ok('2026-01-15T10:00'))).toBe('2026-01-15T09:00:00.000Z')
  })

  it('i secondi e i millesimi non si perdono per strada', () => {
    expect(iso(ok('2026-08-06T10:00:30.250'))).toBe('2026-08-06T08:00:30.250Z')
  })
})

describe('istanteDaTestoRoma — un momento CON fuso è già un istante: si rispetta', () => {
  it('la coda Z resta UTC, non viene spostata a Roma', () => {
    expect(iso(ok('2026-08-06T10:00:00Z'))).toBe('2026-08-06T10:00:00.000Z')
  })

  it('un offset esplicito +02:00 si rispetta', () => {
    expect(iso(ok('2026-08-06T10:00:00+02:00'))).toBe('2026-08-06T08:00:00.000Z')
  })

  it('un offset esplicito senza i due punti (+0200) si rispetta — la forma è già ammessa oggi', () => {
    // ⚠️ Non è un capriccio: `ISO_8601_RE` della rotta accetta `[+-]\d{2}:?\d{2}`,
    // e `Date.parse` la legge. Toglierla sarebbe una regressione silenziosa.
    expect(iso(ok('2026-08-06T10:00:00+0200'))).toBe('2026-08-06T08:00:00.000Z')
  })

  it('un offset negativo si rispetta', () => {
    expect(iso(ok('2026-08-06T10:00:00-05:00'))).toBe('2026-08-06T15:00:00.000Z')
  })
})

describe('istanteDaTestoRoma — la sola data è mezzanotte di ROMA', () => {
  it('2026-08-06 è la mezzanotte italiana, cioè le 22:00 UTC del giorno prima', () => {
    // 🛑 Prima valeva mezzanotte UTC, cioè le 02:00 di Roma: la stessa forma
    // accettata oggi cambia significato, e la si dichiara invece di lasciarla
    // decidere al caso. Mezzanotte di Roma è anche la lettura CONSERVATIVA —
    // è l'istante più indietro, quindi la scadenza più vicina (stesso principio
    // di D280 e della guardia sul futuro già in rotta).
    expect(iso(ok('2026-08-06'))).toBe('2026-08-05T22:00:00.000Z')
  })

  it('in ora solare la sola data è le 23:00 UTC del giorno prima', () => {
    expect(iso(ok('2026-01-15'))).toBe('2026-01-14T23:00:00.000Z')
  })
})

describe('istanteDaTestoRoma — i due giorni all\'anno in cui l\'ora non è una funzione', () => {
  it('ORA DOPPIA (25/10/2026, le 02:30 esistono due volte): vince l\'istante PRECEDENTE', () => {
    // D286 + D280 «a parità vince il termine più breve»: fra le 00:30 UTC
    // (CEST, +2) e le 01:30 UTC (CET, +1) si prende la prima, che rende la
    // scadenza più vicina.
    // `provato:` ICU conferma che entrambe rendono «02:30» a Roma quel giorno.
    expect(iso(ok('2026-10-25T02:30'))).toBe('2026-10-25T00:30:00.000Z')
  })

  it('ORA DOPPIA — l\'altra lettura possibile NON viene scelta', () => {
    // L'asserzione che morde davvero: senza la regola del minimo, un'implementazione
    // ragionevole prenderebbe +1 e passerebbe la prova precedente solo per caso.
    expect(iso(ok('2026-10-25T02:30'))).not.toBe('2026-10-25T01:30:00.000Z')
  })

  it('ORA INESISTENTE (29/03/2026, le 02:30 non esistono): si rifiuta', () => {
    const esito = istanteDaTestoRoma('2026-03-29T02:30')
    expect(esito.ok).toBe(false)
    if (esito.ok) throw new Error('non raggiungibile')
    expect(esito.causa).toBe('ora_inesistente')
  })

  it('ORA INESISTENTE — le 03:00 dello stesso giorno invece esistono', () => {
    expect(iso(ok('2026-03-29T03:00'))).toBe('2026-03-29T01:00:00.000Z')
  })
})

describe('istanteDaTestoRoma — ciò che non è una data non deve diventarlo', () => {
  it('01/08/2026 si rifiuta — è la forma che Date.parse leggerebbe come 8 GENNAIO', () => {
    const esito = istanteDaTestoRoma('01/08/2026')
    expect(esito.ok).toBe(false)
    if (esito.ok) throw new Error('non raggiungibile')
    expect(esito.causa).toBe('forma')
  })

  it.each(['pippo', '', '   ', '2026-13-01', '2026-02-30', '2026-08-06T25:00', 'null'])(
    '«%s» si rifiuta per FORMA',
    (testo) => {
      const esito = istanteDaTestoRoma(testo)
      expect(esito.ok).toBe(false)
      if (!esito.ok) expect(esito.causa).toBe('forma')
    }
  )
})

describe('istanteDaTestoRoma — l\'esito NON dipende dal fuso di chi esegue', () => {
  // 🔑 La prova di casa per «non dipende dal fuso» è `dpa-modello.test.ts:38-41`
  // («verde in Europe/Rome · America/New_York · Pacific/Kiritimati»): lì il giro
  // dei fusi era stato fatto a mano. Qui si fa dentro la prova, così non serve
  // ricordarsi di rifarlo.
  const FUSI = ['UTC', 'Europe/Rome', 'America/New_York', 'Pacific/Kiritimati', 'Pacific/Midway']

  it.each(FUSI)('con TZ=%s le 10:00 di Roma del 6 agosto restano le 08:00 UTC', (tz) => {
    try {
      process.env.TZ = tz
      expect(iso(ok('2026-08-06T10:00'))).toBe('2026-08-06T08:00:00.000Z')
      expect(iso(ok('2026-01-15T10:00'))).toBe('2026-01-15T09:00:00.000Z')
      expect(iso(ok('2026-08-06'))).toBe('2026-08-05T22:00:00.000Z')
    } finally {
      // 🛑 Si rimette la COSTANTE, non una variabile catturata prima: assegnare
      // `undefined` a `process.env.TZ` non lo cancella, lo scrive come la
      // STRINGA «undefined» — che ICU fa ripiegare su UTC. Le asserzioni
      // resterebbero verdi e il file smetterebbe di provare ciò che dichiara.
      // Stessa ragione della guardia in `afterAll`, che qui mancava.
      process.env.TZ = 'UTC'
    }
  })

  it('dopo il giro dei fusi il processo è ancora a UTC — la prova non si è avvelenata da sola', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')
    expect(process.env.TZ).toBe('UTC')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LA ROTTA — perché una funzione verde non prova che qualcuno la chiami
// ═══════════════════════════════════════════════════════════════════════════

const LAB_ID = '11111111-1111-1111-1111-111111111111'
const USER_ID = '99999999-9999-9999-9999-999999999999'
const LAVORO_ID = '33333333-3333-3333-3333-333333333333'
const EVENTO_ID = '44444444-4444-4444-4444-444444444444'

const CONTEXT = {
  userId: USER_ID,
  email: null,
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: null,
  cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

type Risultato = { data: unknown; error: unknown }

function chain(result: Risultato | (() => Risultato)) {
  const risolvi = (): Risultato => (typeof result === 'function' ? result() : result)
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'insert', 'update', 'order', 'limit', 'neq']) {
    c[m] = (...args: unknown[]) => {
      if (m === 'insert') c.__inserito = args[0]
      return c
    }
  }
  for (const m of ['single', 'maybeSingle']) c[m] = async () => risolvi()
  c.then = (resolve: (v: unknown) => void) => resolve(risolvi())
  return c
}

/** Restituisce la riga che la rotta ha provato a INSERIRE su `eventi_qualita`. */
function bancoRotta(): { rigaInserita: () => Record<string, unknown> | null } {
  let inserita: Record<string, unknown> | null = null
  let accessiLavori = 0
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'lavori') {
      accessiLavori += 1
      return chain(
        accessiLavori === 1
          ? { data: { id: LAVORO_ID, post_consegna_correzioni: 0 }, error: null }
          : { data: [{ post_consegna_correzioni: 1 }], error: null }
      )
    }
    const c = chain(() => ({
      data: { id: EVENTO_ID, created_at: new Date().toISOString(), ...(inserita ?? {}) },
      error: null,
    })) as Record<string, unknown>
    const insertOriginale = c.insert as (...a: unknown[]) => unknown
    c.insert = (...args: unknown[]) => {
      inserita = args[0] as Record<string, unknown>
      return insertOriginale(...args)
    }
    return c
  })
  return { rigaInserita: () => inserita }
}

function req(body: unknown) {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/eventi-qualita`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

const params = { params: Promise.resolve({ id: LAVORO_ID }) }

/**
 * ⚠️ IL MOTIVO È CAMBIATO COL TASK 7 dell'ondata «torna a `pronto` col documento
 * intatto», e questa è la SECONDA fixture del progetto che portava lo stesso
 * valore (l'altra è `corpoValido` in `eventi-qualita-route.test.ts`).
 *
 * Qui c'era `difetto_lavorazione`, cioè uno dei due motivi del **bivio**: da
 * quando la rotta pretende `scelta_intervento` su quei due, questo corpo non è
 * più valido, e la guardia del bivio sta **prima** della lettura di
 * `conosciuto_il`. Conseguenza doppia, e la seconda è la peggiore: le prove che
 * si aspettano 201 uscivano 422, e quelle che si aspettano 422 restavano verdi
 * **per il motivo sbagliato** — cioè non misuravano più niente sull'orologio di
 * Roma. Il ripiego è un motivo derivabile che non apre nessun bivio.
 */
function corpo(conosciuto_il: unknown) {
  return {
    motivo: 'errore_dato_dichiarazione',
    origine_informazione: 'odontoiatra',
    stato_dispositivo: 'consegnato_non_applicato',
    potenziale_di_danno: 'nessuno',
    conosciuto_il,
  }
}

describe('POST /api/lavori/[id]/eventi-qualita — conosciuto_il segue l\'orologio di Roma', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('🛑 IL DIFETTO CHE CHIUDE: 2026-08-06T10:00 dal telefono si salva come 08:00 UTC, non 10:00', async () => {
    const banco = bancoRotta()
    // Un momento nel PASSATO rispetto a `Date.now()`, altrimenti scatta la
    // guardia sul futuro e la prova misurerebbe quella.
    const res = await POST(req(corpo('2026-08-06T10:00')), params)
    expect(res.status).toBe(201)
    expect(banco.rigaInserita()?.conosciuto_il).toBe('2026-08-06T08:00:00.000Z')
  })

  it('un momento con la coda Z attraversa la rotta invariato', async () => {
    const banco = bancoRotta()
    const res = await POST(req(corpo('2026-08-06T10:00:00Z')), params)
    expect(res.status).toBe(201)
    expect(banco.rigaInserita()?.conosciuto_il).toBe('2026-08-06T10:00:00.000Z')
  })

  it('l\'ora inesistente di fine marzo esce 422, con un messaggio che dice cosa fare', async () => {
    bancoRotta()
    const res = await POST(req(corpo('2026-03-29T02:30')), params)
    expect(res.status).toBe(422)
    const body = await res.json()
    // Il messaggio deve indicare l'azione, non il divieto (direttiva permanente).
    expect(typeof body.error).toBe('string')
    expect(body.error.length).toBeGreaterThan(20)
  })

  it('01/08/2026 resta rifiutato con 422 — nessuna regressione sulla guardia di forma', async () => {
    bancoRotta()
    const res = await POST(req(corpo('01/08/2026')), params)
    expect(res.status).toBe(422)
    expect(res.status).not.toBe(500)
  })

  it('🔑 il secondo sintomo che si chiude: «adesso» dal telefono non finisce più nel futuro', async () => {
    // Un campo `datetime-local` a Roma manda l'ora a MURO senza fuso. Letta come
    // UTC dal server, «adesso» diventava 2 ore avanti e sbatteva contro la
    // guardia `TOLLERANZA_OROLOGIO_MS` (5 minuti): 422 su un valore predefinito
    // legittimo. Letta come Roma, è semplicemente adesso.
    const banco = bancoRotta()
    const adessoRoma = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Rome',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date()).replace(' ', 'T')

    const res = await POST(req(corpo(adessoRoma)), params)
    expect(res.status).toBe(201)
    expect(banco.rigaInserita()?.conosciuto_il).toBeTruthy()
  })
})
