import { describe, it, expect, vi, beforeEach } from 'vitest'

// Convenzione del repo (vedi `tests/unit/cicli-id-route.test.ts`,
// `tests/unit/api-pazienti-post.test.ts`): `assertLabOperativo` NON si mocka
// — si lascia la funzione reale e si guida l'esito con `lab.stato` nel
// context ('attivo' → guardia passa). Il brief (task-5-brief.md) proponeva
// `vi.mock('@/lib/supabase/lab-guard', ...)` e variabili di modulo semplici;
// adattato allo schema reale del repo (`vi.hoisted`, catene di query scritte
// a mano per `pazienti`), non all'implementazione.
const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { PATCH, DELETE } from '../../src/app/api/pazienti/[id]/route'

const LAB_ID = 'lab-1'
const PAZIENTE_ID = 'pz-1'
const params = Promise.resolve({ id: PAZIENTE_ID })
const CONTEXT = {
  userId: 'user-1',
  email: null,
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: null,
  cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function richiesta(body: unknown) {
  return new Request(`http://localhost/api/pazienti/${PAZIENTE_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

function richiestaDelete() {
  return new Request(`http://localhost/api/pazienti/${PAZIENTE_ID}`, {
    method: 'DELETE',
    headers: { origin: 'http://localhost', host: 'localhost' },
  })
}

const updateMock = vi.fn()
let rigaCorrente: { nome: string | null; cognome: string | null; codice_paziente: string | null } | null
let selectEqCalls: unknown[][]

/**
 * `pazienti` per i test PATCH: `select` registra OGNI `.eq(...)` in
 * `selectEqCalls` (catena permissiva, non un conteggio fisso — così una
 * mutazione che toglie un `.eq()` non crasha per forma sbagliata, ma si
 * verifica DAVVERO con un'asserzione sui valori, come lo scoping tenant
 * richiede) e risolve `rigaCorrente` a `single()`; `update` cattura il
 * payload in `updateMock` e risolve `updateResult` dopo 2 `.eq()` (schema
 * reale della route: nessun `.select()` dopo l'update).
 */
function mockPatchTabella(updateResult: { error: unknown } = { error: null }) {
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'pazienti') {
      const selectChain = {
        eq: (...args: unknown[]) => {
          selectEqCalls.push(args)
          return selectChain
        },
        single: async () => ({ data: rigaCorrente }),
      }
      return {
        select: () => selectChain,
        update: (dati: Record<string, unknown>) => {
          updateMock(dati)
          return { eq: () => ({ eq: async () => updateResult }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${tabella}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  updateMock.mockReset()
  selectEqCalls = []
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
  mockPatchTabella()
})

describe('PATCH /api/pazienti/[id] — rettifica del nome (G4, Art. 16 GDPR)', () => {
  it('correggere il cognome lo scrive davvero (il trigger risincronizza nome_cognome)', async () => {
    const res = await PATCH(richiesta({ cognome: 'Bagheria', nome: 'Giuseppe' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })

  it('la lettura della riga corrente è scoping al laboratorio (isolamento tenant)', async () => {
    await PATCH(richiesta({ cognome: 'Bagheria', nome: 'Giuseppe' }), { params })
    expect(selectEqCalls).toContainEqual(['id', PAZIENTE_ID])
    expect(selectEqCalls).toContainEqual(['laboratorio_id', LAB_ID])
  })

  it('🛑 svuotare ENTRAMBE le caselle NON scrive una coppia vuota: torna il codice', async () => {
    await PATCH(richiesta({ cognome: '', nome: '' }), { params })
    // Senza questa guardia nome_cognome diventerebbe ' ' → consegna bloccata.
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'PZ-0042', nome: '' })
  })

  it('solo il nome → finisce nel cognome (mai il codice accanto al nome)', async () => {
    await PATCH(richiesta({ cognome: '', nome: 'Giuseppe' }), { params })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('patch parziale: solo `cognome` nel body → il `nome` esistente non si perde', async () => {
    rigaCorrente = { nome: 'Giuseppe', cognome: 'Bagherra', codice_paziente: 'PZ-0042' }
    await PATCH(richiesta({ cognome: 'Bagheria' }), { params })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Bagheria', nome: 'Giuseppe' })
  })

  it('il «codice travestito» non fa da cognome: caselle vuote su un paziente-wizard restano il codice', async () => {
    rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
    await PATCH(richiesta({ nome: 'Giuseppe' }), { params })
    // `cognome` non è nel body: quello attuale È il codice → non vale come cognome.
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('una patch che non tocca il nome NON scrive nome/cognome', async () => {
    await PATCH(richiesta({ note: 'ciao' }), { params })
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('nome')
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('cognome')
    expect(updateMock.mock.calls[0][0]).toMatchObject({ note: 'ciao' })
  })

  it('paziente inesistente in questo laboratorio → 404, nessun update', async () => {
    rigaCorrente = null
    const res = await PATCH(richiesta({ cognome: 'Bagheria' }), { params })
    expect(res.status).toBe(404)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('nulla da scrivere, nemmeno il codice → 422', async () => {
    rigaCorrente = { nome: '', cognome: '', codice_paziente: '' }
    const res = await PATCH(richiesta({ cognome: '', nome: '' }), { params })
    expect(res.status).toBe(422)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('errore DB nell\'aggiornamento → messaggio generico, MAI il testo grezzo del DB (G9)', async () => {
    mockPatchTabella({ error: { message: 'duplicate key value violates unique constraint "pazienti_pkey"' } })
    const res = await PATCH(richiesta({ note: 'ciao' }), { params })
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('pazienti_pkey')
    expect(corpo.error).toBe('Non è stato possibile aggiornare il paziente')
  })
})

describe('DELETE /api/pazienti/[id] — archiviazione', () => {
  function mockDeleteTabella(opts: {
    esiste?: boolean
    softDeleteError?: unknown
  }) {
    const { esiste = true, softDeleteError = null } = opts
    mockFrom.mockImplementation((tabella: string) => {
      if (tabella === 'pazienti') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  single: async () => ({ data: esiste ? { id: PAZIENTE_ID } : null }),
                }),
              }),
            }),
          }),
          update: (dati: Record<string, unknown>) => {
            updateMock(dati)
            return { eq: () => ({ eq: async () => ({ error: softDeleteError }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${tabella}`)
    })
  }

  beforeEach(() => {
    mockDeleteTabella({ esiste: true })
  })

  it('paziente esistente → 200, soft-delete (archiviato:true)', async () => {
    const res = await DELETE(richiestaDelete(), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0]).toEqual({ archiviato: true })
  })

  it('paziente inesistente o di altro laboratorio → 404, nessun update', async () => {
    mockDeleteTabella({ esiste: false })
    const res = await DELETE(richiestaDelete(), { params })
    expect(res.status).toBe(404)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('errore DB nell\'archiviazione → messaggio generico, MAI il testo grezzo del DB (G9)', async () => {
    mockDeleteTabella({
      esiste: true,
      softDeleteError: { message: 'update or delete on table "pazienti" violates foreign key constraint' },
    })
    const res = await DELETE(richiestaDelete(), { params })
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('foreign key')
    expect(corpo.error).toBe('Non è stato possibile archiviare il paziente')
  })
})
