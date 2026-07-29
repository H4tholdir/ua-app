import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

// Convenzione del repo (vedi `tests/unit/cassette-route.test.ts`,
// `tests/unit/listino-route.test.ts`): `assertLabOperativo` NON si mocka —
// si lascia la funzione reale e si guida l'esito con `lab.stato` nel
// context (`'attivo'` → guardia passa). Il brief proponeva
// `vi.mock('@/lib/supabase/lab-guard', ...)`, ma nessun test di route
// esistente lo fa; adattato il mock allo schema reale, non l'implementazione.
const { mockFrom, mockGetFreshLabContext, mockGetLabContextWithTimings } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
  mockGetLabContextWithTimings: vi.fn(),
}))

vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { POST, GET } from '../../src/app/api/pazienti/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1',
  email: null,
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: null,
  cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const insertMock = vi.fn()

/**
 * `clienti` → chain di sola lettura (il cliente esiste sempre, via
 * `createChain`, stesso helper di `tests/unit/clienti-route.test.ts`).
 * `pazienti` → insert custom (schema di `tests/unit/listino-route.test.ts`):
 * cattura il payload passato a `.insert()` in `insertMock` e risolve con
 * `insertResult`, o con `{data: {id:'pz-1', ...dati}, error:null}` di default.
 */
function mockTabelle(insertResult?: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'clienti') {
      return createChain({ data: { id: 'cli-1' }, error: null })
    }
    if (tabella === 'pazienti') {
      return {
        insert: (dati: Record<string, unknown>) => {
          insertMock(dati)
          return {
            select: () => ({
              single: async () =>
                insertResult ?? { data: { id: 'pz-1', ...dati }, error: null },
            }),
          }
        },
      }
    }
    throw new Error(`Unexpected table: ${tabella}`)
  })
}

function richiesta(body: unknown) {
  return new Request('http://localhost/api/pazienti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/pazienti — la regola §5 applicata server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMock.mockReset()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
    mockTabelle()
  })

  it('caselle vuote → scrive il CODICE nel cognome (mai una coppia vuota)', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: '', cognome: '' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'PZ-0042', nome: '', codice_paziente: 'PZ-0042' })
    expect(insertMock.mock.calls[0][0].laboratorio_id).toBe(LAB_ID)
  })

  it('solo il nome → finisce nel COGNOME (mai «PZ-0042 GIUSEPPE»)', async () => {
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: '' }))
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('entrambe piene → coppia intatta', async () => {
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: 'Bagheria' }))
    // `codice_paziente` qui, e non nel primo test («caselle vuote»): lì
    // cognome e codice sono entrambi vuoti in input, quindi
    // `risolviNomePaziente` fa collassare `coppia.cognome` sul CODICE
    // stesso (regola §5) — `codice_paziente` e `cognome` finiscono
    // matematicamente identici ('PZ-0042' in entrambi), e uno scambio fra i
    // due campi sarebbe lì indistinguibile da qualunque asserzione. Qui i
    // due valori sono diversi ('PZ-0042' vs 'Bagheria'): è il test che può
    // davvero smascherare lo scambio.
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe', codice_paziente: 'PZ-0042' })
  })

  it('`nome` mai null: anche se il client manda null, si scrive stringa vuota', async () => {
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: null, cognome: null }))
    expect(insertMock.mock.calls[0][0].nome).toBe('')
    expect(insertMock.mock.calls[0][0].nome).not.toBeNull()
  })

  it('🛑 codice mandato come cognome mentre il nome è pieno → il codice NON finisce in targa', async () => {
    // Senza `cognomeEffettivo` a monte, nome_cognome diventerebbe
    // «PZ-0042 GIUSEPPE» e la targa scriverebbe «Pz-0042 Giuseppe».
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: 'Giuseppe', cognome: 'PZ-0042' }))
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('idempotenza — ciò che il wizard manda OGGI attraversa la regola invariato (nessuna regressione)', async () => {
    // Oggi il wizard manda `{nome:'', cognome: alias || pz}`. Questa prova è
    // la rete che dice che il Task 4 non cambia comportamento a valle finché
    // il wizard resta com'è.
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: '', cognome: 'PZ-0042' }))
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'PZ-0042', nome: '' })
    insertMock.mockClear()
    await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0002', nome: '', cognome: 'Mario R.' }))
    expect(insertMock.mock.calls[0][0]).toMatchObject({ cognome: 'Mario R.', nome: '' })
  })

  it('niente da scrivere (nemmeno il codice) → 422, nessun insert', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: '', nome: '', cognome: '' }))
    expect(res.status).toBe(422)
    expect(insertMock).not.toHaveBeenCalled()
    expect(await res.json()).toEqual({ error: 'Serve almeno il codice paziente' })
  })

  // 🟠 ALTO 1 — il valore usato per alimentare la regola del nome
  // (`codiceGrezzo`) e il valore scritto nella colonna `codice_paziente`
  // devono coincidere. Prima della correzione: la regola vedeva `null` (una
  // guardia di tipo su `codice_paziente` non-stringa) mentre l'insert
  // scriveva il valore grezzo (`42`) — i due divergevano, e il «codice
  // travestito» tornava in targa perché la guardia a valle non lo riconosceva
  // più (il valore salvato non era quello su cui la regola si era basata).
  it('🟠 ALTO 1: un codice_paziente non-stringa normalizza IDENTICO per la regola e per la colonna scritta', async () => {
    await POST(richiesta({ cliente_id: 'cli-1', cognome: '42', nome: 'Giuseppe', codice_paziente: 42 }))
    const scritto = insertMock.mock.calls[0][0]
    // '42' come cognome non coincide con un codice null: resta un cognome vero.
    expect(scritto.cognome).toBe('42')
    expect(scritto.nome).toBe('Giuseppe')
    // La colonna scritta deve essere lo stesso valore usato dalla regola: null.
    expect(scritto.codice_paziente).toBeNull()
  })

  it('errore di insert → messaggio generico, MAI il testo grezzo del DB (G9)', async () => {
    mockTabelle({ data: null, error: { message: 'duplicate key value violates unique constraint "pazienti_pkey"' } })
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: '', cognome: '' }))
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('pazienti_pkey')
    expect(corpo.error).toBe('Non è stato possibile creare il paziente')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Z2 — il codice paziente si normalizza IN SCRITTURA.
//
// Le asserzioni guardano il payload passato a `.insert()`, mai il giro di
// ritorno: è la colonna che deve ricevere il valore ripulito, e il finto
// client rispedisce indietro ciò che gli si dà (rispecchiarlo proverebbe solo
// che il mock funziona).
//
// 🔑 Ciò che queste prove NON dicono, e va detto: la regola del nome
// (`risolviNomePaziente` / `cognomeEffettivo`) è INDIFFERENTE a questa
// normalizzazione, perché entrambe fanno già `(x ?? '').trim()` prima di
// decidere (`nome-paziente-scrittura.ts:60-62` e `:86-88`). Quindi `''` e
// `null` erano già indistinguibili per lei, e `'  X  '` era già uguale a
// `'X'`. Z2 cambia SOLO il valore che finisce in colonna. I due casi
// 200/422 qui sotto sono un lucchetto sulla finestra di correzione del
// 27/07, non la prova di un cambio di comportamento.
// ─────────────────────────────────────────────────────────────────────────
describe('POST /api/pazienti — Z2: normalizzazione del codice in scrittura', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMock.mockReset()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
    mockTabelle()
  })

  it('spazi ai bordi: `\'  PZ-0042  \'` arriva in colonna come `\'PZ-0042\'`', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria', nome: 'Giuseppe', codice_paziente: '  PZ-0042  ' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0].codice_paziente).toBe('PZ-0042')
    expect(insertMock.mock.calls[0][0].cognome).toBe('Bagheria')
  })

  it('tab e a-capo contano come spazi: `\'\\t PZ-0042 \\n\'` → `\'PZ-0042\'`', async () => {
    // ⚠️ `trim()` di JavaScript toglie PIÙ di `btrim()` di Postgres (tab,
    // a-capo, spazi unicode). Divergenza voluta e dalla parte sicura, come in
    // `dati-wizard.ts:50-53`: scrivendo il valore ripulito, due codici che
    // differiscono solo per un tab COLLIDONO all'indice di T5 invece di
    // convivere sotto chiavi diverse.
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria', codice_paziente: '\t PZ-0042 \n' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0].codice_paziente).toBe('PZ-0042')
  })

  it('casella svuotata: `\'\'` diventa ASSENZA (`null`), non stringa vuota — e il paziente si crea lo stesso', async () => {
    // Il ramo «200» del rischio Z-P6: c'è un cognome vero, quindi la regola
    // del nome ha di che scrivere e la creazione deve passare.
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria', nome: 'Giuseppe', codice_paziente: '' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0].codice_paziente).toBeNull()
    expect(insertMock.mock.calls[0][0].cognome).toBe('Bagheria')
  })

  it('soli spazi: `\'   \'` vale quanto una casella vuota → `null`', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria', codice_paziente: '   ' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0].codice_paziente).toBeNull()
  })

  it('chiave assente dal body → `null` in colonna (la normalizzazione non inventa un valore)', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0].codice_paziente).toBeNull()
  })

  it('`null` esplicito nel body → `null` in colonna', async () => {
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria', codice_paziente: null }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0].codice_paziente).toBeNull()
  })

  it('🛑 la MAIUSCOLA non si tocca: `\'  pz-0042  \'` si scrive `\'pz-0042\'`, mai `\'PZ-0042\'`', async () => {
    // L'indice di T5 confronterà con `lower(btrim(...))`, ma il valore si
    // CONSERVA come l'utente l'ha scritto: è un identificativo che finisce su
    // documenti conservati per legge (Art. 10(5) + Allegato XIII p.4).
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria', codice_paziente: '  pz-0042  ' }))
    expect(res.status).toBe(201)
    expect(insertMock.mock.calls[0][0].codice_paziente).toBe('pz-0042')
    expect(insertMock.mock.calls[0][0].codice_paziente).not.toBe('PZ-0042')
  })

  it('🔑 UN SOLO valore: il codice con spazi che la regola del nome ha già spogliato è lo stesso che va in colonna', async () => {
    // Estensione agli spazi del contratto 🟠 ALTO 1. `cognomeEffettivo`
    // confronta il cognome col codice RIPULITO (fa `.trim()` da sé), quindi
    // 'PZ-0042' come cognome viene spogliato; senza Z2 la colonna riceveva
    // invece '  PZ-0042  ' — cioè un valore diverso da quello su cui la
    // regola si era basata, che è esattamente la divergenza già pagata.
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'PZ-0042', nome: 'Giuseppe', codice_paziente: '  PZ-0042  ' }))
    expect(res.status).toBe(201)
    const scritto = insertMock.mock.calls[0][0]
    expect(scritto.cognome).toBe('Giuseppe')
    expect(scritto.nome).toBe('')
    expect(scritto.codice_paziente).toBe('PZ-0042')
  })

  it('ramo 422: soli spazi nel codice e nessun nome → «Serve almeno il codice paziente», nessun insert', async () => {
    // Il ramo «422» del rischio Z-P6, ed è giusto che sia 422: resterebbe una
    // scheda senza alcun identificativo.
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: '   ', nome: '', cognome: '' }))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: 'Serve almeno il codice paziente' })
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('body non-JSON → 400 «Body non valido» (la normalizzazione vive a valle del parse)', async () => {
    const req = new Request('http://localhost/api/pazienti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'questo non è JSON',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Body non valido' })
    expect(insertMock).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Z1 — un codice occupato diventa un 409 di dominio.
//
// ⚠️ QUESTE PROVE SONO L'UNICA PROVA POSSIBILE, e va detto: su `pazienti` NON
// esiste oggi alcun vincolo di unicità sul codice (verificato il 30/07 su
// `pg_constraint`: c'è solo `pazienti_pkey` su `id`, che è un uuid generato
// dal database — e nessun trigger che scriva su altre tabelle). Il ramo 23505
// NON può accendersi in produzione finché T5 non crea l'indice: qui si prova
// col finto client, mai «verificando in produzione».
//
// 🛑 La prova che conta di più è la NEGATIVA: un errore di database che non è
// 23505 — o un 23505 arrivato mentre NON stavamo scrivendo un codice — deve
// restare 500 col testo generico. Un 409 di troppo insegnerebbe all'app a dire
// «il codice è occupato» ogni volta che il database ha un singhiozzo.
// ─────────────────────────────────────────────────────────────────────────
const TESTO_409 = 'Questo codice è già di un altro paziente. Scrivine un altro.'

/**
 * L'errore come arriva DAVVERO da PostgREST quando l'indice di T5 morde:
 * `message` e `details` portano il nome dell'indice, le colonne e il valore.
 * È questa forma — non un `{message}` scarno — che rende non vacua
 * l'asserzione G9 qui sotto.
 */
const ERRORE_23505 = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "pazienti_codice_lab_uniq"',
  details: 'Key (laboratorio_id, lower(btrim(codice_paziente)))=(lab-1, pz-0042) already exists.',
  hint: null,
}

describe('POST /api/pazienti — Z1: il codice occupato è un 409 di dominio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMock.mockReset()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('23505 mentre si scrive un codice → 409, testo ratificato (D36) e motivo leggibile dalla macchina', async () => {
    mockTabelle({ data: null, error: ERRORE_23505 })
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', cognome: 'Bagheria' }))
    expect(res.status).toBe(409)
    // Il corpo per intero: `error` alla lettera (il testo è ratificato, non
    // parafrasabile) e `motivo`, che è ciò che il client guarda — mai il testo.
    expect(await res.json()).toEqual({ error: TESTO_409, motivo: 'codice_gia_in_uso' })
  })

  it('🛑 G9: dal 409 non esce NIENTE del database — né indice, né colonne, né il valore', async () => {
    mockTabelle({ data: null, error: ERRORE_23505 })
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', cognome: 'Bagheria' }))
    const corpo = await res.json()
    const serializzato = JSON.stringify(corpo)
    for (const frammento of [
      'pazienti_',
      'constraint',
      'duplicate key',
      'unique',
      'btrim',
      'laboratorio_id',
      // Anche il nome della colonna resta fuori: per questo il motivo si
      // chiama `codice_gia_in_uso` e non `codice_paziente_occupato`.
      'codice_paziente',
      'Key (',
    ]) {
      expect(serializzato).not.toContain(frammento)
    }
    // Nessun campo di troppo: due chiavi, quelle e basta.
    expect(Object.keys(corpo).sort()).toEqual(['error', 'motivo'])
  })

  it('🛑 NEGATIVA: un errore di database che NON è 23505 resta 500 col testo generico', async () => {
    mockTabelle({
      data: null,
      error: { code: '23502', message: 'null value in column "nome_cognome" violates not-null constraint' },
    })
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', cognome: 'Bagheria' }))
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).toBe('Non è stato possibile creare il paziente')
    expect(corpo).not.toHaveProperty('motivo')
  })

  it('🛑 NEGATIVA: 23505 mentre NON stavamo scrivendo un codice → resta 500 (il messaggio dev\'essere VERO)', async () => {
    // Senza codice nel corpo la colonna riceve `null`: un 23505 nasce allora
    // da un vincolo che non è il nostro (oggi, di fatto, solo `pazienti_pkey`
    // su un uuid generato dal database). Dire «il codice è occupato» sarebbe
    // una bugia, e la porta da cui un guasto qualunque si traveste da
    // conflitto di codice.
    mockTabelle({ data: null, error: ERRORE_23505 })
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Non è stato possibile creare il paziente')
  })

  it('🛑 NEGATIVA: codice fatto di soli spazi (→ `null` in colonna) + 23505 → resta 500', async () => {
    mockTabelle({ data: null, error: ERRORE_23505 })
    const res = await POST(richiesta({ cliente_id: 'cli-1', cognome: 'Bagheria', codice_paziente: '   ' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toBe('Non è stato possibile creare il paziente')
  })

  // Un errore SENZA il campo `code` è già coperto sopra, a `:160-167`
  // («errore di insert → messaggio generico… (G9)»): quel finto errore porta
  // solo `message`, e l'asserzione pretende 500. Non si duplica qui.
})

describe('GET /api/pazienti — errore grezzo del DB mai al client (G9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertMock.mockReset()
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: { authMs: 0, dbMs: 0 } })
  })

  it('errore di lettura → messaggio generico, MAI il testo grezzo del DB (G9)', async () => {
    // GET non fa un `.insert()` (schema di `mockTabelle`) ma una query-chain
    // (`.select().eq().eq().order().order().limit()`) risolta con `await` —
    // riusa `createChain`, già pensato per questo (vedi header del helper).
    mockFrom.mockImplementation((tabella: string) => {
      if (tabella === 'pazienti') {
        return createChain({
          data: null,
          error: { message: 'column "cognome" does not exist in relation "pazienti"' },
        })
      }
      throw new Error(`Unexpected table: ${tabella}`)
    })
    const res = await GET(new Request('http://localhost/api/pazienti'))
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('cognome')
    expect(corpo.error).toBe('Non è stato possibile leggere i pazienti')
  })
})
