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

// Richiesta ostile: un'intestazione `x-lab-id` che punta a un altro
// laboratorio, come se il client provasse a suggerire lo scoping tenant
// invece di lasciarlo decidere al context server-side.
function richiestaDeleteOstile() {
  return new Request(`http://localhost/api/pazienti/${PAZIENTE_ID}`, {
    method: 'DELETE',
    headers: { origin: 'http://localhost', host: 'localhost', 'x-lab-id': 'lab-altro' },
  })
}

const updateMock = vi.fn()
let rigaCorrente: { nome: string | null; cognome: string | null; codice_paziente: string | null } | null
let selectEqCalls: unknown[][]
let updateEqCalls: unknown[][]
let selectError: { message: string; code?: string } | null

/**
 * `pazienti` per i test PATCH: `select` registra OGNI `.eq(...)` in
 * `selectEqCalls` e `update` registra OGNI `.eq(...)` in `updateEqCalls`
 * (catene permissive, non un conteggio fisso — così una mutazione che toglie
 * un `.eq()` non crasha per forma sbagliata, ma si verifica DAVVERO con
 * un'asserzione sui valori, come lo scoping tenant richiede). `select`
 * risolve `rigaCorrente`/`selectError` a `single()`; `update` cattura il
 * payload in `updateMock` e risolve `updateResult`.
 */
function mockPatchTabella(updateResult: { error: unknown } = { error: null }) {
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'pazienti') {
      const selectChain = {
        eq: (...args: unknown[]) => {
          selectEqCalls.push(args)
          return selectChain
        },
        single: async () => ({ data: rigaCorrente, error: selectError }),
      }
      return {
        select: () => selectChain,
        update: (dati: Record<string, unknown>) => {
          updateMock(dati)
          const chain = {
            eq: (...args: unknown[]) => {
              updateEqCalls.push(args)
              return chain
            },
            then: (r: (v: unknown) => unknown) => Promise.resolve(updateResult).then(r),
          }
          return chain
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
  updateEqCalls = []
  selectError = null
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

  it('anche la SCRITTURA è ristretta al laboratorio corrente (isolamento fra laboratori)', async () => {
    await PATCH(richiesta({ note: 'ciao' }), { params })
    expect(updateEqCalls).toContainEqual(['id', PAZIENTE_ID])
    expect(updateEqCalls).toContainEqual(['laboratorio_id', LAB_ID])
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

  it('codice rinominato + nome, senza `cognome` nel body: il vecchio codice NON diventa cognome', async () => {
    rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
    await PATCH(richiesta({ codice_paziente: 'PZ-9999', nome: 'Giuseppe' }), { params })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('codice svuotato + nome, senza `cognome` nel body: stesso esito', async () => {
    rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
    await PATCH(richiesta({ codice_paziente: '', nome: 'Giuseppe' }), { params })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Giuseppe', nome: '' })
  })

  it('una patch che non tocca il nome NON scrive nome/cognome', async () => {
    await PATCH(richiesta({ note: 'ciao' }), { params })
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('nome')
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('cognome')
    expect(updateMock.mock.calls[0][0]).toMatchObject({ note: 'ciao' })
    // La lettura extra della riga corrente gira SOLO quando la modifica tocca
    // il nome: qui non lo tocca, quindi nessuna query di lettura deve partire.
    expect(selectEqCalls).toEqual([])
  })

  it('paziente inesistente in questo laboratorio → 404, nessun update', async () => {
    rigaCorrente = null
    const res = await PATCH(richiesta({ cognome: 'Bagheria' }), { params })
    expect(res.status).toBe(404)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('guasto DB nella lettura della riga corrente → messaggio generico, MAI 404 (il paziente non è sparito, il DB è caduto)', async () => {
    rigaCorrente = null
    selectError = { message: 'connection to server was lost', code: '08006' }
    const res = await PATCH(richiesta({ cognome: 'Bagheria' }), { params })
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('connection to server')
    expect(corpo.error).toBe('Non è stato possibile aggiornare il paziente')
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

  it('un cognome VERO uguale al vecchio codice NON viene cancellato quando il codice cambia', async () => {
    rigaCorrente = { nome: 'Giuseppe', cognome: 'Rossi', codice_paziente: 'Rossi' }
    await PATCH(richiesta({ codice_paziente: 'PZ-0042', cognome: 'Rossi' }), { params })
    expect(updateMock.mock.calls[0][0]).toMatchObject({ cognome: 'Rossi', nome: 'Giuseppe' })
  })

  it('un laboratorio indicato dal client NON può dirottare la scrittura', async () => {
    await PATCH(richiesta({ note: 'ciao', laboratorio_id: 'lab-altro' }), { params })
    expect(updateEqCalls).toContainEqual(['laboratorio_id', LAB_ID])
    expect(updateEqCalls).not.toContainEqual(['laboratorio_id', 'lab-altro'])
  })

  // 🔴 CRITICAL — `data_nascita` è di tipo data e `sesso` ammette solo 'M'/'F':
  // una stringa vuota su queste due colonne fa fallire l'UPDATE. Il pannello
  // manda '' quando il campo è assente sul paziente (caso normale per i
  // pazienti creati dal wizard) — qui '' deve diventare null PRIMA di
  // arrivare a `.update()`.
  it("🔴 CRITICAL: 'data_nascita' e 'sesso' vuoti nel body diventano null, non ''", async () => {
    const res = await PATCH(richiesta({ data_nascita: '', sesso: '' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0].data_nascita).toBeNull()
    expect(updateMock.mock.calls[0][0].sesso).toBeNull()
  })

  it("le colonne di testo (note, anamnesi, asl) restano '' quando il body manda ''", async () => {
    // Solo `data_nascita`/`sesso` hanno un vincolo che rompe su ''; le altre
    // colonne di testo non vanno toccate da questa normalizzazione.
    const res = await PATCH(richiesta({ note: '', anamnesi: '', asl: '' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0]).toMatchObject({ note: '', anamnesi: '', asl: '' })
  })

  it('data_nascita e sesso valorizzati passano invariati', async () => {
    const res = await PATCH(richiesta({ data_nascita: '1990-05-12', sesso: 'F' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0]).toMatchObject({ data_nascita: '1990-05-12', sesso: 'F' })
  })

  // 🟠 ALTO 1 — il valore che alimenta la regola del nome (`codice`, usato da
  // `risolviNomePaziente`/`cognomeEffettivo`) e il valore scritto nella
  // colonna `codice_paziente` devono coincidere SEMPRE, anche quando il
  // client manda un codice non-stringa. Prima della correzione: il primo
  // collassava a `null` (guardia di tipo) mentre il secondo veniva scritto
  // grezzo (`42`) — i due valori divergevano.
  it('🟠 ALTO 1: un codice_paziente non-stringa nel body normalizza IDENTICO per la regola e per la colonna scritta', async () => {
    rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
    await PATCH(richiesta({ cognome: '42', nome: 'Giuseppe', codice_paziente: 42 }), { params })
    const scritto = updateMock.mock.calls[0][0]
    // Il codice non-stringa collassa a null per la regola: '42' come cognome
    // NON coincide con un codice null, quindi resta un cognome vero.
    expect(scritto.cognome).toBe('42')
    expect(scritto.nome).toBe('Giuseppe')
    // La colonna scritta deve essere lo STESSO valore usato dalla regola: null.
    expect(scritto.codice_paziente).toBeNull()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Z2 — il codice paziente si normalizza IN SCRITTURA, anche in rettifica.
//
// Le asserzioni guardano il payload passato a `.update()`: è la colonna che
// deve ricevere il valore ripulito.
//
// 🔑 Come nel POST: la regola del nome è INDIFFERENTE a questa
// normalizzazione (`nome-paziente-scrittura.ts:60-62` e `:86-88` fanno già
// `(x ?? '').trim()`), quindi `''` e `null` le erano già indistinguibili.
// Z2 cambia SOLO il valore in colonna. La coppia 200/422 qui sotto è il
// lucchetto sulla finestra di correzione del 27/07 — «ogni campo del lavoro
// si corregge, fino alla consegna» — non la prova di un cambio.
// ─────────────────────────────────────────────────────────────────────────
describe('PATCH /api/pazienti/[id] — Z2: normalizzazione del codice in scrittura', () => {
  it('spazi ai bordi: `\'  PZ-0042  \'` arriva in colonna come `\'PZ-0042\'`', async () => {
    const res = await PATCH(richiesta({ codice_paziente: '  PZ-0042  ' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0].codice_paziente).toBe('PZ-0042')
  })

  it('tab e a-capo contano come spazi: `\'\\t PZ-0042 \\n\'` → `\'PZ-0042\'`', async () => {
    // ⚠️ `trim()` di JavaScript toglie PIÙ di `btrim()` di Postgres. Voluto e
    // dalla parte sicura (v. `dati-wizard.ts:50-53`): scrivendo il valore
    // ripulito, due codici che differiscono solo per un tab COLLIDONO
    // all'indice di T5 invece di convivere sotto chiavi diverse.
    const res = await PATCH(richiesta({ codice_paziente: '\t PZ-0042 \n' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0].codice_paziente).toBe('PZ-0042')
  })

  it('🔑 RAMO 200: a un paziente CON un cognome vero si può svuotare il codice — diventa `null`, e la modifica passa', async () => {
    // La finestra di correzione ratificata il 27/07: se questo diventasse un
    // 422, l'addetta non potrebbe più togliere un codice sbagliato.
    // Il pannello (`PazienteEditSheet.tsx:36,53`) rimanda l'intero form, con
    // `cognome` già passato per `cognomeEffettivo`: qui il cognome è vero,
    // quindi arriva pieno.
    rigaCorrente = { nome: 'Giuseppe', cognome: 'Bagheria', codice_paziente: 'PZ-0042' }
    const res = await PATCH(richiesta({ codice_paziente: '', cognome: 'Bagheria', nome: 'Giuseppe' }), { params })
    expect(res.status).toBe(200)
    const scritto = updateMock.mock.calls[0][0]
    expect(scritto.codice_paziente).toBeNull()
    expect(scritto.cognome).toBe('Bagheria')
    expect(scritto.nome).toBe('Giuseppe')
  })

  it('soli spazi al posto del codice, su un paziente con cognome vero → `null`, 200', async () => {
    rigaCorrente = { nome: 'Giuseppe', cognome: 'Bagheria', codice_paziente: 'PZ-0042' }
    const res = await PATCH(richiesta({ codice_paziente: '   ', cognome: 'Bagheria', nome: 'Giuseppe' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0].codice_paziente).toBeNull()
  })

  it('🔑 RAMO 422: a un paziente SENZA cognome vero, svuotare il codice si rifiuta — resterebbe una scheda senza identificativo', async () => {
    // Paziente nato dal wizard: il codice VIVE dentro `cognome` (invariante
    // 2), e il pannello lo nasconde con `cognomeEffettivo` → la casella
    // «Cognome» parte vuota e torna vuota. Svuotando anche il codice non
    // resta niente da scrivere: 422, ed è giusto.
    rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
    const res = await PATCH(richiesta({ codice_paziente: '', cognome: '', nome: '' }), { params })
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ error: 'Serve almeno il codice paziente' })
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('🛑 chiave assente dal body → la colonna NON si tocca (mai un codice cancellato di straforo)', async () => {
    // La normalizzazione deve restare DENTRO il ramo `'codice_paziente' in
    // body`: se collassasse l'assenza su `null`, ogni salvataggio di una nota
    // cancellerebbe il codice del paziente — in silenzio, con 200 e senza
    // errore.
    const res = await PATCH(richiesta({ note: 'ciao' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0]).not.toHaveProperty('codice_paziente')
  })

  it('`null` esplicito nel body → `null` in colonna (la chiave c\'è, il valore no)', async () => {
    const res = await PATCH(richiesta({ codice_paziente: null }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0].codice_paziente).toBeNull()
  })

  it('🛑 la MAIUSCOLA non si tocca: `\'  pz-0042  \'` si scrive `\'pz-0042\'`, mai `\'PZ-0042\'`', async () => {
    const res = await PATCH(richiesta({ codice_paziente: '  pz-0042  ' }), { params })
    expect(res.status).toBe(200)
    expect(updateMock.mock.calls[0][0].codice_paziente).toBe('pz-0042')
    expect(updateMock.mock.calls[0][0].codice_paziente).not.toBe('PZ-0042')
  })

  it('🔑 UN SOLO valore: il codice con spazi che la regola del nome ha già spogliato è lo stesso che va in colonna', async () => {
    // Estensione agli spazi del contratto 🟠 ALTO 1 (`:45-50` della route):
    // le due destinazioni di `codiceDalBody` — la colonna e la regola del
    // nome — devono vedere lo STESSO valore. Senza Z2 la regola confrontava
    // 'PZ-0042' (perché `cognomeEffettivo` fa `.trim()` da sé) mentre la
    // colonna riceveva '  PZ-0042  '.
    rigaCorrente = { nome: '', cognome: 'PZ-0042', codice_paziente: 'PZ-0042' }
    const res = await PATCH(richiesta({ codice_paziente: '  PZ-0042  ', cognome: 'PZ-0042', nome: 'Giuseppe' }), { params })
    expect(res.status).toBe(200)
    const scritto = updateMock.mock.calls[0][0]
    expect(scritto.cognome).toBe('Giuseppe')
    expect(scritto.nome).toBe('')
    expect(scritto.codice_paziente).toBe('PZ-0042')
  })
})

describe('DELETE /api/pazienti/[id] — archiviazione', () => {
  let deleteSelectEqCalls: unknown[][]
  let deleteUpdateEqCalls: unknown[][]

  /**
   * `select` registra OGNI `.eq(...)` in `deleteSelectEqCalls` e `update`
   * registra OGNI `.eq(...)` in `deleteUpdateEqCalls` (catene permissive, non
   * un conteggio fisso — come per il PATCH: così una mutazione che toglie un
   * filtro non crasha per forma sbagliata, ma si verifica DAVVERO con
   * un'asserzione sui valori, cosa che lo scoping tenant richiede anche in
   * scrittura).
   */
  function mockDeleteTabella(opts: {
    esiste?: boolean
    softDeleteError?: unknown
  }) {
    const { esiste = true, softDeleteError = null } = opts
    mockFrom.mockImplementation((tabella: string) => {
      if (tabella === 'pazienti') {
        const selectChain = {
          eq: (...args: unknown[]) => {
            deleteSelectEqCalls.push(args)
            return selectChain
          },
          single: async () => ({ data: esiste ? { id: PAZIENTE_ID } : null }),
        }
        return {
          select: () => selectChain,
          update: (dati: Record<string, unknown>) => {
            updateMock(dati)
            const updateChain = {
              eq: (...args: unknown[]) => {
                deleteUpdateEqCalls.push(args)
                return updateChain
              },
              then: (r: (v: unknown) => unknown) => Promise.resolve({ error: softDeleteError }).then(r),
            }
            return updateChain
          },
        }
      }
      throw new Error(`Unexpected table: ${tabella}`)
    })
  }

  beforeEach(() => {
    deleteSelectEqCalls = []
    deleteUpdateEqCalls = []
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

  it('la lettura pre-cancellazione è ristretta al laboratorio corrente (isolamento fra laboratori)', async () => {
    await DELETE(richiestaDelete(), { params })
    expect(deleteSelectEqCalls).toContainEqual(['id', PAZIENTE_ID])
    expect(deleteSelectEqCalls).toContainEqual(['laboratorio_id', LAB_ID])
    expect(deleteSelectEqCalls).toContainEqual(['archiviato', false])
  })

  it('un laboratorio indicato in un header ostile NON può dirottare la LETTURA pre-cancellazione', async () => {
    await DELETE(richiestaDeleteOstile(), { params })
    expect(deleteSelectEqCalls).toContainEqual(['laboratorio_id', LAB_ID])
    expect(deleteSelectEqCalls).not.toContainEqual(['laboratorio_id', 'lab-altro'])
  })

  it('un laboratorio indicato in un header ostile NON può dirottare la SCRITTURA della cancellazione', async () => {
    await DELETE(richiestaDeleteOstile(), { params })
    expect(deleteUpdateEqCalls).toContainEqual(['laboratorio_id', LAB_ID])
    expect(deleteUpdateEqCalls).not.toContainEqual(['laboratorio_id', 'lab-altro'])
  })
})
