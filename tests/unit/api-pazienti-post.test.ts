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

  it('errore di insert → messaggio generico, MAI il testo grezzo del DB (G9)', async () => {
    mockTabelle({ data: null, error: { message: 'duplicate key value violates unique constraint "pazienti_pkey"' } })
    const res = await POST(richiesta({ cliente_id: 'cli-1', codice_paziente: 'PZ-0042', nome: '', cognome: '' }))
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('pazienti_pkey')
    expect(corpo.error).toBe('Non è stato possibile creare il paziente')
  })
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
