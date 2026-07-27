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

beforeEach(() => {
  rpcMock.mockReset()
  fromMock.mockReset()
})

describe('PUT /api/lavori/[id]/denti — la porta rifiuta prima del database (R2)', () => {
  it('422 col valore incriminato su un dente che non esiste', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }, { fdi: 19 }] }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).valore).toBe(19)
    expect(rpcMock).not.toHaveBeenCalled()   // non arriva mai al database
  })

  it('422 sulla stringa «2.6», che è il difetto storico', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: '2.6' }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su un ruolo inventato', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11, ruolo: 'inventato' }] }), params)
    expect(res.status).toBe(422)
  })

  it('422 su un dente ripetuto: la lista è un insieme', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }, { fdi: 11 }] }), params)
    expect(res.status).toBe(422)
  })

  it('404 quando la RPC non trova il lavoro — è anche il caso cross-tenant (R4)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'non_trovato' }, error: null })
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(404)
  })

  it('409 col timestamp corrente quando qualcun altro ha scritto nel frattempo', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'conflitto', updated_at: '2026-07-27T10:00:00Z' }, error: null })
    const res = await PUT(
      richiesta({ atteso_updated_at: '2026-07-27T09:00:00.123456+00:00', denti: [{ fdi: 11 }] }),
      params
    )
    expect(res.status).toBe(409)
    expect((await res.json()).updated_at).toBe('2026-07-27T10:00:00Z')
    // 🔑 Il gettone viaggia COSÌ COM'È. `timestamptz` ha precisione al
    // microsecondo, `Date` di JS al millisecondo: qualunque `new Date(...)`
    // in mezzo troncherebbe .123456 a .123 e il confronto `IS DISTINCT FROM`
    // dentro la RPC non tornerebbe MAI vero → 409 permanente, insanabile
    // ricaricando. Questa asserzione è l'unica cosa che lo impedisce.
    expect(rpcMock.mock.calls[0][1].p_atteso_updated_at).toBe('2026-07-27T09:00:00.123456+00:00')
  })

  it('ignora laboratorio_id e lavoro_id mandati dal client: si derivano da sessione e URL', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'X' }, error: null })
    await PUT(richiesta({ laboratorio_id: 'lab-B', lavoro_id: 'L9', denti: [{ fdi: 11 }] }), params)
    const args = rpcMock.mock.calls[0][1]
    expect(args.p_lab).toBe('lab-A')
    expect(args.p_lavoro).toBe('L1')
  })

  it('una lista vuota è legittima: vuol dire «nessun dente»', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: 'X' }, error: null })
    const res = await PUT(richiesta({ denti: [] }), params)
    expect(res.status).toBe(200)
    // 🔑 Senza gettone la chiave va mandata comunque, valorizzata a null:
    // `p_atteso_updated_at` NON ha un DEFAULT in SQL (gen types lo emette
    // senza `?`), e PostgREST risolve l'overload sull'INSIEME DELLE CHIAVI del
    // body. Omettere la chiave darebbe PGRST202 «function not found» → 500
    // sul percorso più comune di tutti.
    expect(rpcMock.mock.calls[0][1].p_atteso_updated_at).toBeNull()
  })

  it('500 se la RPC torna un errore — mai ignorato', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    const res = await PUT(richiesta({ denti: [{ fdi: 11 }] }), params)
    expect(res.status).toBe(500)
  })

  // ─── Rinforzi: tre CHECK del database che il piano lasciava scoperti ───────
  // Ognuno di questi corpi passava la porta e andava a sbattere contro un
  // vincolo, cioè esattamente il 500 illeggibile che questo task esiste per
  // evitare.

  it('422 sulle zone senza scala: lavori_denti_zone_ck non deve mai scattare', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11, codice_collo: 'A1' }] }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('422 su scala/codice che non sono stringhe: al database arriverebbe testo', async () => {
    const res = await PUT(richiesta({ denti: [{ fdi: 11, scala: 123, codice: 'A1' }] }), params)
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
