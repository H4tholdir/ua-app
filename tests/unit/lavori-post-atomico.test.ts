import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Task 9 — POST /api/lavori passa dall'RPC atomica `lavoro_crea_atomico`.
//
// Il rischio chiuso è R1: prima di questa modifica il lavoro nasceva con un
// INSERT e i denti arrivavano dopo, con una PATCH fail-soft. Se quella falliva
// restava un lavoro senza i suoi denti — e un colore perso in silenzio produce
// una Dichiarazione priva di un contenuto obbligatorio dell'Allegato XIII.
//
// ⚠️ `vi.hoisted` NON è cosmetico: `vi.mock` viene issato SOPRA gli import, e
// una `const` di modulo referenziata dentro la sua factory esploderebbe in TDZ
// («Cannot access 'rpcMock' before initialization»). È la forma già usata dai
// due test vicini sulla stessa route.
const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/lavori/route'
// Il modulo del wizard, quello vero: serve a costruire il corpo della richiesta
// con lo stesso codice che gira nel browser (v. «LA STRETTA DI MANO», in fondo).
import { mappaElementi } from '@/lib/wizard/crea-lavoro'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

const UTENTE_ROW = {
  laboratorio_id: LAB_ID,
  ruolo: 'titolare',
  laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

// La forma che la RPC restituisce davvero (json_build_object in
// 20260727120300_lavori_denti_rpc.sql).
const ESITO_OK = {
  esito: 'ok',
  id: 'lavoro-1',
  numero_lavoro: '2026/0042',
  stato: 'ricevuto',
}

const CORPO_BASE = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-30',
}

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

/** Body grezzo, per i casi in cui il JSON non deve nemmeno essere valido. */
function richiestaGrezza(raw: string) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: raw,
  })
}

/** select → eq → is → single: la catena usata sia dal lookup utenti sia dalle FK. */
function singolo(data: unknown) {
  return {
    select: () => ({
      eq: () => ({ is: () => ({ single: async () => ({ data, error: null }) }) }),
    }),
  }
}

/**
 * Restituisce la spia dell'INSERT diretto su `lavori`. Dopo il Task 9 quella
 * spia deve restare MUTA: la creazione passa solo dalla RPC.
 */
function setup({ clienteLab = LAB_ID }: { clienteLab?: string } = {}) {
  const insertSpy = vi.fn()
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return singolo(UTENTE_ROW)
    if (table === 'clienti') return singolo({ laboratorio_id: clienteLab })
    // Task 11: la route confronta il colore di caso col catalogo prima di
    // spedirlo alla RPC (`lavori_colore_caso_fk` morde nel database, e «a3»
    // farebbe fallire la CREAZIONE del lavoro). Senza questa riga il solo caso
    // di questo file che manda un colore moriva con «Tabella inattesa». Il
    // comportamento di degradazione ha casa sua:
    // `tests/unit/lavori-post-colore-catalogo.test.ts`.
    if (table === 'colori_dentali') {
      return {
        select: () => ({
          eq: (_colonna: string, valore: string) =>
            Promise.resolve({
              data: valore === 'A2' ? [{ scala: 'vita_classical', codice: 'A2' }] : [],
              error: null,
            }),
        }),
      }
    }
    if (table === 'lavori') {
      return {
        insert: (row: unknown) => {
          insertSpy(row)
          return {
            select: () => ({
              single: async () => ({
                data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' },
                error: null,
              }),
            }),
          }
        },
      }
    }
    throw new Error(`Tabella inattesa: ${table}`)
  })
  return insertSpy
}

/** Gli argomenti dell'unica chiamata a `lavoro_crea_atomico`. */
function argomentiRpc() {
  const chiamata = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_crea_atomico')
  if (!chiamata) throw new Error('lavoro_crea_atomico non è mai stata chiamata')
  return chiamata[1] as { p_lab: string; p_lavoro: Record<string, unknown>; p_denti: unknown[] }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  mockRpc.mockResolvedValue({ data: ESITO_OK, error: null })
})

// Orologio e fuso tornano SEMPRE al reale: un clock fermo o un TZ appiccicato
// avvelenerebbe gli altri casi del file (e, nello stesso worker, dei file dopo).
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describe('POST /api/lavori — lavoro e denti nascono insieme o non nascono (R1)', () => {
  it('chiama lavoro_crea_atomico e NON fa più un INSERT diretto su lavori', async () => {
    const insertSpy = setup()

    const res = await POST(
      richiesta({ ...CORPO_BASE, denti: [{ fdi: 11, scala: 'vita_classical', codice: 'A3' }] })
    )

    expect(res.status).toBe(201)
    expect(mockRpc).toHaveBeenCalledWith('lavoro_crea_atomico', expect.objectContaining({ p_lab: LAB_ID }))
    expect(argomentiRpc().p_denti).toEqual([
      expect.objectContaining({ fdi: 11, scala: 'vita_classical', codice: 'A3' }),
    ])
    // Il progressivo non si genera più a parte: è dentro la transazione.
    expect(mockRpc).not.toHaveBeenCalledWith('genera_progressivo', expect.anything())
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('il corpo del lavoro viaggia dentro p_lavoro, colore compreso', async () => {
    setup()

    await POST(
      richiesta({ ...CORPO_BASE, colore_scala: 'vita_classical', colore_codice: 'A2', priorita: 'urgente' })
    )

    expect(argomentiRpc().p_lavoro).toEqual(
      expect.objectContaining({
        tipo_dispositivo: 'protesi_fissa',
        descrizione: 'Corona 14',
        data_consegna_prevista: '2026-08-30',
        cliente_id: 'cliente-1',
        colore_scala: 'vita_classical',
        colore_codice: 'A2',
        priorita: 'urgente',
      })
    )
  })

  it('senza denti: 201, lista vuota alla RPC, numero_lavoro preso dall\'esito', async () => {
    setup()

    const res = await POST(richiesta(CORPO_BASE))
    const json = await res.json()

    expect(res.status).toBe(201)
    // ⚠️ Questa asserzione è ciò che distingue «facoltativa» da «persa»: la
    // chiave assente deve arrivare alla RPC come lista VUOTA, non sparire.
    expect(argomentiRpc().p_denti).toEqual([])
    expect(json.lavoro).toEqual({ id: 'lavoro-1', numero_lavoro: '2026/0042', stato: 'ricevuto' })
  })

  it('denti: [] esplicito → 201 con lista vuota', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: [] }))

    expect(res.status).toBe(201)
    expect(argomentiRpc().p_denti).toEqual([])
  })
})

describe('POST /api/lavori — le forme d\'ingresso patologiche di `denti`', () => {
  it('fdi inesistente (19) → 422 PRIMA di bruciare un progressivo', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: [{ fdi: 19 }] }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('numero di dente non valido')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('fdi come stringa "11" → 422 (il tipo sbagliato non si converte in silenzio)', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: [{ fdi: '11' }] }))

    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('dente ripetuto → 422: la lista è un insieme', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: [{ fdi: 11 }, { fdi: 11 }] }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('dente ripetuto')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('elemento non-oggetto dentro la lista → 422, non un 500 dal database', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: ['11'] }))

    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('elemento null dentro la lista → 422', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: [null] }))

    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // 🔴 IL CASO CHE IL PIANO NON COPRIVA. `Array.isArray(body.denti) ? ... : []`
  // trasformava un oggetto o una stringa in «nessun dente»: 201, zero denti,
  // nessun errore. Il dato spariva e l'utente leggeva «Salvato». È esattamente
  // la classe di difetto che questa ondata esiste per uccidere.
  it('denti come OGGETTO invece che lista → 422, mai 201 con zero denti', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: { fdi: 11 } }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('denti deve essere una lista')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('denti come STRINGA invece che lista → 422', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: '11,12' }))

    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('denti: null → 422 (presente ma non è una lista)', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: null }))

    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

describe('POST /api/lavori — il corpo della richiesta e gli esiti della RPC', () => {
  it('body non-JSON → 400', async () => {
    setup()

    const res = await POST(richiestaGrezza('non-json{'))

    expect(res.status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  // `JSON.stringify(null)` è la stringa "null": `req.json()` la parsa SENZA
  // lanciare, quindi il catch non scatta e `body.cliente_id` sarebbe un
  // TypeError → 500 non gestito. Stessa classe già chiusa in
  // `lavori/[id]/cassetta/route.ts` e dichiarata in `[id]/denti/route.ts:77-84`.
  it('body null → 400, non un 500 non gestito', async () => {
    setup()

    const res = await POST(richiestaGrezza('null'))

    expect(res.status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('body array alla radice → 400', async () => {
    setup()

    const res = await POST(richiestaGrezza('[]'))

    expect(res.status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('RPC in errore → 500, e nessun lavoro dichiarato creato', async () => {
    setup()
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })

    const res = await POST(richiesta(CORPO_BASE))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('boom')
    expect(json.lavoro).toBeUndefined()
  })

  it('RPC che torna esito != ok → 500 col dettaglio della funzione', async () => {
    setup()
    mockRpc.mockResolvedValue({
      data: { esito: 'errore', dettaglio: 'progressivo non generato' },
      error: null,
    })

    const res = await POST(richiesta(CORPO_BASE))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('progressivo non generato')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// LA STRETTA DI MANO (Task 11).
//
// 🔴 Perché questo blocco esiste. Fino al Task 10 c'era un test verde che
// asseriva la PATCH del wizard con `fetch` finto: misurava l'INTENZIONE del
// client e mai l'ACCETTAZIONE del server, e quando il server ha smesso di
// accettare è rimasto verde lo stesso. La stessa forma si stava ricostruendo
// qui: `crea-lavoro-denti.test.ts` prova cosa il wizard SPEDISCE (con fetch
// finto), questo file prova cosa la route ACCETTA (con corpi scritti a mano).
// Due metà che non si toccano. Qui il corpo NON è scritto a mano: esce da
// `mappaElementi`, cioè dallo stesso codice che gira nel browser.
//
// Il difetto che intercetta è concreto: se un domani `mappaElementi` tornasse
// stringhe («'26'») invece di numeri, i test del client resterebbero verdi, i
// test della route pure — e il wizard comincerebbe a prendere 422 dal vero,
// perché `isFdiValido` rifiuta le stringhe di proposito.
// ═══════════════════════════════════════════════════════════════════════════
describe('POST /api/lavori — il corpo che il wizard produce DAVVERO passa la porta', () => {
  it('«2.6, 2.7» dalla casella «Elemento» → 201, due righe alla RPC', async () => {
    setup()

    const { denti, scartati } = mappaElementi('2.6, 2.7')
    expect(scartati).toEqual([])

    const res = await POST(
      richiesta({
        ...CORPO_BASE,
        denti: denti.map((fdi) => ({ fdi, ruolo: 'elemento', provenienza: 'prescritto' })),
        colore_codice: 'a2'.trim().toUpperCase(),
      })
    )

    expect(res.status).toBe(201)
    expect(argomentiRpc().p_denti).toEqual([
      { fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' },
      { fdi: 27, ruolo: 'elemento', provenienza: 'prescritto' },
    ])
    expect(argomentiRpc().p_lavoro).toEqual(
      expect.objectContaining({ colore_scala: 'vita_classical', colore_codice: 'A2' })
    )
  })

  // La deduplica di `mappaElementi` non è un vezzo: senza, questo corpo sarebbe
  // un 422 «dente ripetuto» e l'odontotecnico perderebbe il LAVORO per un dente
  // digitato due volte in due forme. Il caso lo misura da capo a fondo.
  it('«2.6, 26» (stesso dente, due forme) → 201, una riga sola, mai un 422', async () => {
    setup()

    const { denti } = mappaElementi('2.6, 26')
    const res = await POST(
      richiesta({ ...CORPO_BASE, denti: denti.map((fdi) => ({ fdi, ruolo: 'elemento', provenienza: 'prescritto' })) })
    )

    expect(res.status).toBe(201)
    expect(argomentiRpc().p_denti).toEqual([{ fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' }])
  })
})

// La RPC `lavoro_crea_atomico` NON verifica che cliente_id/paziente_id/
// tecnico_id/ciclo_id appartengano a p_lab: sono FK semplici, non composite
// (limite dichiarato in testa a 20260727120300_lavori_denti_rpc.sql). L'unica
// guardia è `FK_FIELDS_INSERT` nella route, e deve restare PRIMA della RPC.
describe('POST /api/lavori — la guardia FK sopravvive al passaggio all\'RPC', () => {
  it('cliente_id di un altro laboratorio → 403, RPC mai chiamata', async () => {
    setup({ clienteLab: 'lab-di-un-altro' })

    const res = await POST(richiesta(CORPO_BASE))
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe('cliente_id non appartiene a questo laboratorio')
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

// L'anno che la route manda alla RPC è il giorno civile di ROMA, non l'orologio
// del processo. Non è cosmesi: `anno_lavoro` diventa `v_anno` dentro
// lavoro_crea_atomico e alimenta DIRETTAMENTE
// genera_progressivo(p_lab, 'lavoro', v_anno)
// (20260727120300_lavori_denti_rpc.sql:138,144) — cioè la serie progressiva del
// numero di lavoro, che finisce nella Dichiarazione di Conformità e in fattura.
// Con l'anno del server, fra le 00:00 e l'01:00 di Roma del 1° gennaio il lavoro
// nascerebbe con `data_ingresso` 2027-01-01 e un numero pescato dalla serie 2026.
//
// ⚠️ `vi.stubEnv('TZ', 'UTC')` NON è decorativo, ed è la ragione per cui questo
// caso ha valore: `new Date().getFullYear()` è l'anno LOCALE DEL PROCESSO (in
// produzione su Vercel è UTC, ma su una macchina di sviluppo italiana è già
// Europe/Rome). Senza il pin, su quella macchina i due anni coincidono a ogni
// istante e il caso passerebbe anche col difetto in casa. Qui si finge il server
// di produzione. `annoRoma()` resta invece indifferente al fuso del processo:
// FMT_ISO_ROMA fissa `timeZone: 'Europe/Rome'` (data-roma.ts:9-11).
describe('POST /api/lavori — a capodanno la serie progressiva segue Roma', () => {
  it('23:30 UTC del 31/12 → anno_lavoro 2027, concorde con data_ingresso', async () => {
    setup()
    vi.stubEnv('TZ', 'UTC')
    vi.useFakeTimers()
    // A Roma qui è già il 1° gennaio 2027, 00:30 (CET = UTC+1).
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))

    const res = await POST(richiesta(CORPO_BASE))

    expect(res.status).toBe(201)
    const inviato = argomentiRpc().p_lavoro
    // L'anno PRIMA della data: è l'asserzione che porta il difetto, e va letta
    // per prima quando il caso è rosso.
    expect(inviato.anno_lavoro).toBe(2027)
    // …e i due devono CONCORDARE: è il punto dell'intero caso.
    expect(inviato.data_ingresso).toBe('2027-01-01')
  })
})
