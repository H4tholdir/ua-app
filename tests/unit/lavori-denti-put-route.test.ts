import { describe, expect, it, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
const fromMock = vi.fn()

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: rpcMock, from: fromMock }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: async () => ({ laboratorioId: 'lab-A', ruolo: 'titolare' }),
}))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PUT } from '@/app/api/lavori/[id]/denti/route'

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori/L1/denti', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const params = { params: Promise.resolve({ id: 'L1' }) }

// ⚠️ Coi MICROSECONDI: è la forma vera di un `timestamptz` letto da PostgREST.
const GETTONE = '2026-07-27T09:00:00.123456+00:00'

/**
 * I casi che NON parlano del gettone lo mandano comunque. Dal 28/07/2026 la
 * porta lo PRETENDE (rilievo M1): senza, ognuno di questi test tornerebbe 422
 * per la ragione sbagliata — cioè smetterebbe di poter fallire per la propria,
 * che è la terza classe di difetto trovata in quest'ondata.
 *
 * 🛑 I quattro casi del gettone NON passano di qui, e usano `richiesta` nuda:
 * un aiutante che fornisce da sé il campo sotto esame è il modo classico per
 * disarmare la guardia che si sta provando.
 */
const conGettone = (body: Record<string, unknown>) =>
  richiesta({ atteso_updated_at: GETTONE, ...body })

beforeEach(() => {
  rpcMock.mockReset()
  fromMock.mockReset()
})

describe('PUT /api/lavori/[id]/denti — la porta rifiuta prima del database (R2)', () => {
  it('422 col valore incriminato su un dente che non esiste', async () => {
    const res = await PUT(conGettone({ denti: [{ fdi: 11 }, { fdi: 19 }] }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).valore).toBe(19)
    expect(rpcMock).not.toHaveBeenCalled()   // non arriva mai al database
  })

  it('422 sulla stringa «2.6», che è il difetto storico', async () => {
    const res = await PUT(conGettone({ denti: [{ fdi: '2.6' }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su un ruolo inventato', async () => {
    const res = await PUT(conGettone({ denti: [{ fdi: 11, ruolo: 'inventato' }] }), params)
    expect(res.status).toBe(422)
  })

  it('422 su un dente ripetuto: la lista è un insieme', async () => {
    const res = await PUT(conGettone({ denti: [{ fdi: 11 }, { fdi: 11 }] }), params)
    expect(res.status).toBe(422)
  })

  it('404 quando la RPC non trova il lavoro — è anche il caso cross-tenant (R4)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'non_trovato' }, error: null })
    const res = await PUT(conGettone({ denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(404)
  })

  it('409 col timestamp corrente quando qualcun altro ha scritto nel frattempo', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'conflitto', updated_at: '2026-07-27T10:00:00Z' }, error: null })
    const res = await PUT(
      richiesta({ atteso_updated_at: GETTONE, denti: [{ fdi: 11 }] }),
      params
    )
    expect(res.status).toBe(409)
    expect((await res.json()).updated_at).toBe('2026-07-27T10:00:00Z')
    // 🔑 Il gettone viaggia COSÌ COM'È. `timestamptz` ha precisione al
    // microsecondo, `Date` di JS al millisecondo: qualunque `new Date(...)`
    // in mezzo troncherebbe .123456 a .123 e il confronto `IS DISTINCT FROM`
    // dentro la RPC non tornerebbe MAI vero → 409 permanente, insanabile
    // ricaricando. Questa asserzione è l'unica cosa che lo impedisce.
    expect(rpcMock.mock.calls[0][1].p_atteso_updated_at).toBe(GETTONE)
  })

  it('ignora laboratorio_id e lavoro_id mandati dal client: si derivano da sessione e URL', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'X' }, error: null })
    await PUT(conGettone({ laboratorio_id: 'lab-B', lavoro_id: 'L9', denti: [{ fdi: 11 }] }), params)
    const args = rpcMock.mock.calls[0][1]
    expect(args.p_lab).toBe('lab-A')
    expect(args.p_lavoro).toBe('L1')
  })

  it('una lista vuota è legittima: vuol dire «nessun dente»', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'X' }, error: null })
    const res = await PUT(conGettone({ denti: [] }), params)
    expect(res.status).toBe(200)
    // 🔑 La chiave `p_atteso_updated_at` va mandata SEMPRE: non ha un DEFAULT in
    // SQL (gen types la emette senza `?`) e PostgREST risolve l'overload
    // sull'INSIEME DELLE CHIAVI del body — ometterla darebbe PGRST202
    // «function not found» → 500 sul percorso più comune di tutti.
    // ⚠️ Fino al 28/07/2026 qui si chiedeva `toBeNull()`, perché il gettone era
    // facoltativo. Ora è obbligatorio (rilievo M1) e quel valore non esiste
    // più: la guardia sull'overload resta, e a portarla è questa asserzione —
    // se un giorno la chiave sparisse dalla chiamata, questa riga si accende.
    expect(rpcMock.mock.calls[0][1].p_atteso_updated_at).toBe(GETTONE)
  })

  it('500 se la RPC torna un errore — mai ignorato', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    const res = await PUT(conGettone({ denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(500)
  })

  // ─── Rinforzi: tre CHECK del database che il piano lasciava scoperti ───────
  // Ognuno di questi corpi passava la porta e andava a sbattere contro un
  // vincolo, cioè esattamente il 500 illeggibile che questo task esiste per
  // evitare.

  it('422 sulle zone senza scala: lavori_denti_zone_ck non deve mai scattare', async () => {
    const res = await PUT(conGettone({ denti: [{ fdi: 11, codice_collo: 'A1' }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su scala/codice che non sono stringhe: al database arriverebbe testo', async () => {
    const res = await PUT(conGettone({ denti: [{ fdi: 11, scala: 123, codice: 'A1' }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('400 e non un crash quando il corpo non è un oggetto', async () => {
    // `JSON.stringify(null)` è la stringa "null": `req.json()` la parsa senza
    // lanciare e il `catch` non scatta. Leggere `body.denti` su null è un
    // TypeError → 500 non gestito.
    expect((await PUT(richiesta(null), params)).status).toBe(400)
    expect((await PUT(richiesta([{ fdi: 11 }]), params)).status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su un gettone di concorrenza che non è una stringa', async () => {
    const res = await PUT(richiesta({ atteso_updated_at: 12345, denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// IL GETTONE È OBBLIGATORIO — rilievo M1 della revisione pre-merge (28/07/2026)
//
// Il difetto, riprodotto sul database vero in una transazione annullata: due
// chiamate consecutive a `lavoro_denti_sostituisci_atomica` con
// `p_atteso_updated_at := NULL` tornano ENTRAMBE `{"esito":"ok"}`, e alla fine
// resta un dente solo — la seconda ha cancellato quello della prima, senza
// nessun 409. La RPC salta il confronto quando il gettone è NULL
// (`20260727120300_lavori_denti_rpc.sql:61`, `IS NOT NULL AND …`) e la route lo
// permetteva (`?? null`).
//
// Perché è grave e non teorico: il PUT è a SOSTITUZIONE INTEGRALE. Chiunque
// parli con l'endpoint senza mandare la chiave — una scheda aperta da ieri, un
// secondo client, uno script — CANCELLA la lista denti scritta da un collega e
// riceve 200. E quella lista alimenta la denormalizzazione che la Dichiarazione
// di Conformità stampa.
//
// 🛑 Questi quattro casi usano `richiesta` NUDA, mai `conGettone`: un aiutante
// che fornisce da sé il campo sotto esame disarma la guardia che si prova.
// ═══════════════════════════════════════════════════════════════════════════
describe('PUT /api/lavori/[id]/denti — il gettone di concorrenza è obbligatorio (M1)', () => {
  // 🔑 La RPC risponde «ok» di suo: senza questa riga il rosso sarebbe un
  // TypeError dentro `callRpcWithRetry` (data non simulato) e direbbe solo «è
  // esplosa», nascondendo il fatto. Con essa il rosso dice ciò che va detto —
  // `expected 200 to be 422`, cioè: la porta ha accettato, la sostituzione
  // integrale è partita, il chiamante ha letto «va tutto bene».
  beforeEach(() => {
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'X' }, error: null })
  })

  it('🔴 422 quando il gettone MANCA DEL TUTTO: è il caso del difetto', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).error).toMatch(/atteso_updated_at/)
    // La prova che conta: la sostituzione integrale non parte nemmeno. Senza
    // questa riga il test passerebbe anche se la route cancellasse i denti e
    // POI rispondesse 422.
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('🔴 422 su un gettone esplicitamente null — è la stessa cosa, detta a voce', async () => {
    const res = await PUT(richiesta({ atteso_updated_at: null, denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su un gettone stringa vuota: al database sarebbe un 500, non un 422', async () => {
    // Provato sul database vero: `SELECT ''::timestamptz` →
    // «invalid input syntax for type timestamp with time zone: ""» (SQLSTATE
    // 22007). Senza questo controllo la stringa vuota passava la porta come
    // gettone valido e tornava indietro come 500 illeggibile.
    const res = await PUT(richiesta({ atteso_updated_at: '', denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su un gettone di soli spazi', async () => {
    // Stessa prova, stesso errore: `SELECT '   '::timestamptz` →
    // «invalid input syntax for type timestamp with time zone: "   "».
    const res = await PUT(richiesta({ atteso_updated_at: '   ', denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('un gettone valido passa e arriva alla RPC INTATTO, spazi esterni compresi', async () => {
    // 🔑 Il valore NON si normalizza: si controlla e si lascia stare. Un
    // `.trim()` applicato al valore spedito sarebbe una trasformazione, e le
    // trasformazioni su questo campo sono esattamente ciò che produce il 409
    // permanente (v. il caso del microsecondo qui sopra). Il trim serve SOLO a
    // decidere se la stringa è vuota.
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'NUOVO' }, error: null })
    const res = await PUT(richiesta({ atteso_updated_at: GETTONE, denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(200)
    expect(rpcMock.mock.calls[0][1].p_atteso_updated_at).toBe(GETTONE)
  })
})
