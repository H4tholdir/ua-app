import { describe, it, expect, vi, beforeEach } from 'vitest'

// T11-bis / rilievo G2 della revisione pre-merge (28/07/2026).
//
// 🔴 IL FATTO. I denti entrano nel sistema da DUE porte, e non validavano lo
// stesso corpo. `PUT /api/lavori/[id]/denti` controllava `ruolo`,
// `provenienza`, i cinque campi testo, la coppia e le zone, e NORMALIZZAVA;
// `POST /api/lavori` controllava `fdi` e i duplicati, poi passava alla RPC
// l'oggetto GREZZO. E `lavoro_crea_atomico` non ha exception handler attorno
// all'INSERT dei denti (`20260727120300_lavori_denti_rpc.sql:181-183`): un
// vincolo violato aborta l'INTERA funzione.
// Misurate sette forme, sette su sette: **422 sul PUT, 500 col messaggio
// Postgres crudo sul POST — e il lavoro che non nasceva affatto.**
// 🛑 È il rovescio esatto della regola dura del ramo (`lib/api/colore-caso.ts`:
// «si perde IL COLORE, non il lavoro»): lì si perde un colore, qui il lavoro.
//
// 🔑 PERCHÉ QUESTO FILE ASSERISCE IL *MESSAGGIO*, NON SOLO IL 422. Due porte
// che rispondono «422» per ragioni diverse, o con parole diverse, sono ancora
// due porte diverse: chi legge la risposta non può scrivere UN solo pezzo di
// interfaccia. Un test che guardasse il solo codice di stato resterebbe verde
// attraverso esattamente la divergenza che questa correzione toglie di mezzo.
// Per la stessa ragione si confronta anche `valore`, che è ciò che dice QUALE
// dente ha sbagliato.
//
// ⚠️ Le differenze che RESTANO, e sono volute: la chiave `denti` assente è un
// errore sul PUT (lì la lista è il corpo della richiesta) e vuol dire «nessun
// dente» sul POST. Coperte dai file di casa loro
// (`lavori-post-atomico.test.ts`, `lavori-denti-put-route.test.ts`).

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

import { POST } from '@/app/api/lavori/route'
import { PUT } from '@/app/api/lavori/[id]/denti/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const UTENTE_ROW = {
  laboratorio_id: LAB_ID,
  ruolo: 'titolare',
  laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const CORPO_LAVORO = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-30',
}

// Coi microsecondi: è la forma vera di un `timestamptz` letto da PostgREST.
const GETTONE = '2026-07-27T09:00:00.123456+00:00'

function singolo(data: unknown) {
  return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data, error: null }) }) }) }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return singolo(UTENTE_ROW)
    if (table === 'clienti') return singolo({ laboratorio_id: LAB_ID })
    throw new Error(`Tabella inattesa: ${table}`)
  })
  // 🔑 Le due RPC rispondono «ok» di loro. Senza, un corpo che passasse la
  // porta esploderebbe dentro `callRpcWithRetry` e il rosso direbbe solo «è
  // esplosa», nascondendo il fatto: che la porta ha ACCETTATO.
  mockRpc.mockImplementation((fn: string) =>
    Promise.resolve({
      data:
        fn === 'lavoro_crea_atomico'
          ? { esito: 'ok', id: 'lavoro-1', numero_lavoro: '2026/0042', stato: 'ricevuto' }
          : { esito: 'ok', updated_at: 'NUOVO' },
      error: null,
    })
  )
})

/** La risposta della porta di CREAZIONE a una lista di denti. */
async function daPost(denti: unknown) {
  const res = await POST(
    new Request('http://localhost/api/lavori', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
      body: JSON.stringify({ ...CORPO_LAVORO, denti }),
    })
  )
  return { status: res.status, corpo: await res.json() }
}

/** La risposta della porta di SOSTITUZIONE alla stessa lista di denti. */
async function daPut(denti: unknown) {
  const res = await PUT(
    new Request('http://localhost/api/lavori/L1/denti', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ atteso_updated_at: GETTONE, denti }),
    }),
    { params: Promise.resolve({ id: 'L1' }) }
  )
  return { status: res.status, corpo: await res.json() }
}

/**
 * Le sette forme misurate dal revisore. Ognuna porta il messaggio che il PUT
 * dava GIÀ: il PUT è la fonte, e chi converge è il POST.
 */
const FORME: Array<{ nome: string; dente: unknown; errore: string; valore: unknown }> = [
  { nome: "ruolo inventato", dente: { fdi: 11, ruolo: 'pippo' }, errore: 'ruolo non valido', valore: 'pippo' },
  { nome: "provenienza inventata", dente: { fdi: 11, provenienza: 'boh' }, errore: 'provenienza non valida', valore: 'boh' },
  { nome: "scala numero", dente: { fdi: 11, scala: 123, codice: 'A1' }, errore: 'scala non valido', valore: 123 },
  { nome: "mezza coppia (codice senza scala)", dente: { fdi: 11, codice: 'A1' }, errore: 'scala e codice vanno insieme', valore: 'A1' },
  { nome: "zona senza base", dente: { fdi: 11, codice_collo: 'A1' }, errore: 'le zone del colore richiedono scala e codice', valore: 11 },
  { nome: "codice di soli spazi", dente: { fdi: 11, codice: '   ' }, errore: 'codice non valido', valore: '   ' },
  { nome: "scala oggetto", dente: { fdi: 11, scala: { a: 1 }, codice: 'A1' }, errore: 'scala non valido', valore: { a: 1 } },
]

describe('denti — le due porte rispondono ALLO STESSO MODO allo stesso corpo (G2)', () => {
  for (const forma of FORME) {
    it(`${forma.nome}: 422 identico da POST e da PUT, col dente e la ragione`, async () => {
      const post = await daPost([forma.dente])
      const chiamateDopoPost = mockRpc.mock.calls.length
      const put = await daPut([forma.dente])

      // ① Nessuna delle due arriva al database: è lì che il POST perdeva il
      //    lavoro, non nella risposta.
      expect(chiamateDopoPost).toBe(0)
      expect(mockRpc).not.toHaveBeenCalled()

      // ② Lo stesso codice di stato…
      expect({ porta: 'POST', status: post.status }).toEqual({ porta: 'POST', status: 422 })
      expect({ porta: 'PUT', status: put.status }).toEqual({ porta: 'PUT', status: 422 })

      // ③ …e le stesse identiche parole, con lo stesso dente incriminato.
      //    È questa riga a distinguere «tutte e due rifiutano» da «tutte e due
      //    rispondono la stessa cosa».
      expect(post.corpo).toEqual({ error: forma.errore, valore: forma.valore })
      expect(put.corpo).toEqual({ error: forma.errore, valore: forma.valore })
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// 🛑 IL CASO CHE OBBLIGA A NORMALIZZARE, NON SOLO A CONTROLLARE.
//
// `scala: '  vita_classical  '` è una stringa non vuota: supera ogni controllo
// di FORMA. Ma `d->>'scala'` la consegna al database con gli spazi attaccati, e
// `lavori_denti_colore_fk` non conosce nessuna scala con gli spazi: violazione,
// 500, e sul POST — che non ha exception handler attorno all'INSERT — il lavoro
// non nasce. Un POST che si fosse limitato a VALIDARE avrebbe lasciato aperta
// esattamente la stessa perdita che questo task chiude.
// ═══════════════════════════════════════════════════════════════════════════
describe('denti — la normalizzazione arriva al database da tutte e due le porte', () => {
  const CON_SPAZI = { fdi: 11, ruolo: 'elemento', scala: '  vita_classical  ', codice: ' A3 ' }
  const NORMALIZZATO = {
    fdi: 11,
    ruolo: 'elemento',
    scala: 'vita_classical',
    codice: 'A3',
    codice_collo: null,
    codice_corpo: null,
    codice_incisale: null,
    provenienza: 'prescritto',
  }

  it('gli spazi si tolgono PRIMA della RPC, e le due porte mandano la stessa riga', async () => {
    const post = await daPost([CON_SPAZI])
    const inviatoDaPost = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_crea_atomico')![1].p_denti

    const put = await daPut([CON_SPAZI])
    const inviatoDaPut = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_denti_sostituisci_atomica')![1].p_denti

    expect(post.status).toBe(201)
    expect(put.status).toBe(200)
    // `toEqual` esatto, non `objectContaining`: una chiave in più o in meno da
    // una delle due parti è di nuovo una differenza fra le porte.
    expect(inviatoDaPost).toEqual([NORMALIZZATO])
    expect(inviatoDaPut).toEqual([NORMALIZZATO])
  })

  it('i default di ruolo e provenienza li applicano tutte e due, non solo il PUT', async () => {
    await daPost([{ fdi: 26 }])
    const inviatoDaPost = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_crea_atomico')![1].p_denti

    await daPut([{ fdi: 26 }])
    const inviatoDaPut = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_denti_sostituisci_atomica')![1].p_denti

    const atteso = [
      {
        fdi: 26,
        ruolo: 'elemento',
        scala: null,
        codice: null,
        codice_collo: null,
        codice_corpo: null,
        codice_incisale: null,
        provenienza: 'prescritto',
      },
    ]
    expect(inviatoDaPost).toEqual(atteso)
    expect(inviatoDaPut).toEqual(atteso)
  })
})

// Le due forme che il POST validava GIÀ, rimesse alla prova dal lato «stessa
// risposta»: la correzione non doveva togliergliele, e il messaggio del
// duplicato è quello del PUT (il POST diceva solo «dente ripetuto»).
describe('denti — anche ciò che il POST già rifiutava lo dice come il PUT', () => {
  it('dente ripetuto: stesso messaggio da tutte e due', async () => {
    const post = await daPost([{ fdi: 11 }, { fdi: 11 }])
    const put = await daPut([{ fdi: 11 }, { fdi: 11 }])

    expect(post.corpo).toEqual({ error: 'dente ripetuto: la lista è un insieme', valore: 11 })
    expect(put.corpo).toEqual({ error: 'dente ripetuto: la lista è un insieme', valore: 11 })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('elemento non-oggetto: stesso messaggio e stesso valore', async () => {
    const post = await daPost(['11'])
    const put = await daPut(['11'])

    expect(post.corpo).toEqual({ error: 'ogni dente deve essere un oggetto', valore: '11' })
    expect(put.corpo).toEqual({ error: 'ogni dente deve essere un oggetto', valore: '11' })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('fdi che non esiste (19): stesso messaggio e stesso dente', async () => {
    const post = await daPost([{ fdi: 19 }])
    const put = await daPut([{ fdi: 19 }])

    expect(post.corpo).toEqual({ error: 'numero di dente non valido', valore: 19 })
    expect(put.corpo).toEqual({ error: 'numero di dente non valido', valore: 19 })
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
