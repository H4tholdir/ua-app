import { describe, expect, it, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/lavori/[id]/prescrizione/typo — «era scritto così sulla
// prescrizione» (T4, ondata B ③, gesto V4/D212).
//
// Correggere un typo RISCRIVE la trascrizione: lo snapshot che la Dichiarazione
// di Conformità fotografa. Per questo la porta è severa — e per questo il
// gettone di concorrenza è OBBLIGATORIO (v. il describe dedicato in fondo).
//
// ═══ ENUMERAZIONE DELLE FORME D'INPUT (R-P4) ═══════════════════════════════
// Corpo: `{ campo, valore, atteso_updated_at }`
//
//  ① corpo non-JSON · ② null · ③ array · ④ scalare      → 400
//  ⑤ chiave ignota                                       → 422 · RPC non parte
//  ⑥ `campo` assente / non stringa / array               → 422
//  ⑦ `campo` fuori dizionario ('pippo')                  → 422 · RPC non parte
//  ⑧ `valore` — CHIAVE ASSENTE                           → 422 (S6)
//  ⑨ `valore: null` esplicito                            → 200, rimozione
//  ⑩ `colore`/`tipo` con valore non stringa              → 422
//  ⑪ `elementi` con valore non array                     → 422
//  ⑫ `elementi` con elementi non interi                  → 422
//  ⑬ `elementi: []`                                      → 422 (la rimozione è ⑨)
//  ⑭ `atteso_updated_at` assente / null / vuoto / numero → 422 · RPC non parte
//  ⑮ gettone valido coi microsecondi                     → arriva INTATTO (S5)
//  ⑯ esiti: ok · non_trovato · conflitto · congelata · senza_prescrizione ·
//     campo_non_valido
//  ⑰ errore PostgREST · esito sconosciuto                → 500
//
// 🛑 NON coperte, e con la ragione:
//  · `elementi` con DUPLICATI o fuori numerazione FDI: `contenuto` è una
//    TRASCRIZIONE, e la sua regola fondativa è la fedeltà al foglio, non la
//    validità di catalogo (D210; fatto 6 del censimento: un colore fuori
//    catalogo resta trascritto anche se il CASO lo scarta). Importare qui la
//    regola di `denti-validazione` contraddirebbe lo snapshot. Si prova la
//    FORMA (interi), non il DOMINIO (quali interi).
//  · gettone stringa non vuota ma non interpretabile come istante ('pippo'):
//    LIMITE DICHIARATO — supera la porta e sbatte su 22007 → 500. Chiuderlo
//    vorrebbe dire riconoscere qui tutte le forme che Postgres accetta. È lo
//    stesso limite, dichiarato allo stesso modo, del PUT denti (route.ts:100).
// ═══════════════════════════════════════════════════════════════════════════

const rpcMock = vi.fn()
const contextMock = vi.fn()
const sameOriginMock = vi.fn(() => true)

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: rpcMock, from: vi.fn() }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: () => contextMock(),
}))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => sameOriginMock() }))

import { POST } from '@/app/api/lavori/[id]/prescrizione/typo/route'

const LAB = 'lab-A'
const params = { params: Promise.resolve({ id: 'L1' }) }

// ⚠️ Coi MICROSECONDI: è la forma vera di un `timestamptz` letto da PostgREST.
const GETTONE = '2026-08-04T09:00:00.123456+00:00'
const NUOVO = '2026-08-04T09:30:11.654321+00:00'

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori/L1/prescrizione/typo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function richiestaGrezza(testo: string) {
  return new Request('http://localhost/api/lavori/L1/prescrizione/typo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testo,
  })
}

/**
 * I casi che NON parlano del gettone lo mandano comunque: senza, tornerebbero
 * 422 per la ragione sbagliata — cioè smetterebbero di poter fallire per la
 * propria.
 *
 * 🛑 I casi del gettone NON passano di qui e usano `richiesta` nuda: un aiutante
 * che fornisce da sé il campo sotto esame disarma la guardia che si sta
 * provando (lezione del PUT denti, 28/07/2026).
 */
const conGettone = (body: Record<string, unknown>) =>
  richiesta({ atteso_updated_at: GETTONE, ...body })

beforeEach(() => {
  vi.clearAllMocks()
  sameOriginMock.mockReturnValue(true)
  contextMock.mockResolvedValue({
    userId: 'U1',
    laboratorioId: LAB,
    ruolo: 'titolare',
    lab: { stato: 'attivo', trial_ends_at: null },
  })
  rpcMock.mockResolvedValue({ data: { esito: 'ok', updated_at: NUOVO }, error: null })
})

describe('POST …/prescrizione/typo — la porta prima del database', () => {
  it('403 fuori origine · 401 senza sessione · 403 senza laboratorio', async () => {
    sameOriginMock.mockReturnValue(false)
    expect((await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)).status).toBe(403)

    sameOriginMock.mockReturnValue(true)
    contextMock.mockResolvedValue(null)
    expect((await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)).status).toBe(401)

    contextMock.mockResolvedValue({ userId: 'U1', laboratorioId: null, ruolo: 'admin_sistema' })
    expect((await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)).status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('①②③④ 400 su corpo non-JSON, null, array, scalare', async () => {
    expect((await POST(richiestaGrezza('{ rotto'), params)).status).toBe(400)
    expect((await POST(richiesta(null), params)).status).toBe(400)
    expect((await POST(richiesta([{ campo: 'colore' }]), params)).status).toBe(400)
    expect((await POST(richiesta('colore'), params)).status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑤ 422 su una chiave ignota', async () => {
    const res = await POST(conGettone({ campo: 'colore', valore: 'A3', motivo: 'altro' }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).errore).toMatch(/motivo/)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑥⑦ 422 su un campo assente, della forma sbagliata o fuori dizionario', async () => {
    const corpi = [
      { valore: 'A3' }, // assente
      { campo: 5, valore: 'A3' },
      { campo: ['colore'], valore: 'A3' },
      { campo: null, valore: 'A3' },
      { campo: 'pippo', valore: 'A3' }, // il valore della sonda S4
      { campo: 'numero_prescrizione', valore: 'X' }, // esiste, ma non è un campo del contenuto
    ]
    for (const corpo of corpi) {
      expect((await POST(conGettone(corpo), params)).status).toBe(422)
    }
    // 🔑 Il dizionario morde ANCHE nella RPC (esito `campo_non_valido`), ma
    // qui deve mordere PRIMA: un 422 leggibile, non un giro fino al database.
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑧ 422 quando la chiave `valore` MANCA: la rimozione è un atto, non un vuoto', async () => {
    // 🔑 S6, ed è la ragione per cui questa prova esiste: `JSON.stringify` fa
    // SPARIRE le chiavi con valore `undefined`. Se la route derivasse la
    // rimozione da `body.valore === undefined`, un client con un bug di
    // costruzione del corpo CANCELLEREBBE una caratteristica trascritta e
    // leggerebbe 200. La rimozione si chiede: `{valore: null}`.
    const res = await POST(conGettone({ campo: 'colore' }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).errore).toMatch(/valore/)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑨ `valore: null` esplicito RIMUOVE la chiave dal contenuto', async () => {
    const res = await POST(conGettone({ campo: 'colore', valore: null }), params)
    expect(res.status).toBe(200)
    // La RPC distingue: jsonb 'null' (e il NULL SQL) → `contenuto - campo`.
    expect(rpcMock.mock.calls[0][1].p_valore).toBeNull()
  })

  it('⑩ 422 su colore/tipo che non sono testo, e sul testo VUOTO', async () => {
    const corpi = [
      { campo: 'colore', valore: 5 },
      { campo: 'colore', valore: ['A3'] },
      { campo: 'colore', valore: { scala: 'A3' } },
      { campo: 'colore', valore: true },
      { campo: 'tipo', valore: 5 },
      { campo: 'tipo', valore: ['corona'] },
      // 🔑 La stringa vuota non è la trascrizione di niente — stessa regola di
      // `componiSnapshot` (che OMETTE la chiave su `''`). Scriverla creerebbe
      // una chiave presente e vuota, cioè un terzo stato fra «trascritto» e
      // «non prescritto». Chi ha svuotato il campo manda `{valore: null}`.
      { campo: 'colore', valore: '' },
      { campo: 'tipo', valore: '' },
    ]
    for (const corpo of corpi) {
      expect((await POST(conGettone(corpo), params)).status).toBe(422)
    }
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑪⑫⑬ 422 su elementi che non sono una lista di interi, e sulla lista vuota', async () => {
    const corpi = [
      { campo: 'elementi', valore: '11,12' },
      { campo: 'elementi', valore: 11 },
      { campo: 'elementi', valore: { fdi: 11 } },
      { campo: 'elementi', valore: ['11'] },
      { campo: 'elementi', valore: [11, 1.5] },
      { campo: 'elementi', valore: [11, null] },
      { campo: 'elementi', valore: [] }, // ⑬ «niente di prescritto» si dice con ⑨
    ]
    for (const corpo of corpi) {
      expect((await POST(conGettone(corpo), params)).status).toBe(422)
    }
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('una lista di interi passa, e arriva alla RPC così com’è', async () => {
    // 🔑 Nessun controllo sulla numerazione FDI: `contenuto` è la TRASCRIZIONE
    // del foglio, non un dato di catalogo (v. testa del file). Si prova la
    // forma, non il dominio.
    const res = await POST(conGettone({ campo: 'elementi', valore: [11, 12, 99] }), params)
    expect(res.status).toBe(200)
    expect(rpcMock.mock.calls[0][1].p_valore).toEqual([11, 12, 99])
  })

  it('il colore passa COME DIGITATO: nessun trim, nessun maiuscolo (D210)', async () => {
    await POST(conGettone({ campo: 'colore', valore: '  a3,5  ' }), params)
    expect(rpcMock.mock.calls[0][1].p_valore).toBe('  a3,5  ')
  })
})

describe('POST …/prescrizione/typo — la chiamata e gli esiti', () => {
  it('200: parametri completi, tenant e lavoro da sessione e URL', async () => {
    const res = await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)
    expect(res.status).toBe(200)
    expect(rpcMock.mock.calls[0][0]).toBe('lavoro_prescrizione_correggi_typo')
    expect(rpcMock.mock.calls[0][1]).toEqual({
      p_lab: LAB,
      p_lavoro: 'L1',
      p_campo: 'colore',
      p_valore: 'A3',
      p_atteso_updated_at: GETTONE,
    })
    // Il gettone NUOVO torna al chiamante: senza, la correzione successiva
    // nascerebbe già stantia e prenderebbe un 409 immeritato.
    expect(await res.json()).toEqual({ updated_at: NUOVO })
  })

  it('404 quando la RPC non trova il lavoro — è anche il caso cross-tenant (R4)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'non_trovato' }, error: null })
    expect((await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)).status).toBe(404)
  })

  it('409 col gettone CORRENTE quando qualcun altro ha scritto nel frattempo', async () => {
    rpcMock.mockResolvedValue({
      data: { esito: 'conflitto', updated_at: NUOVO },
      error: null,
    })
    const res = await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.esito).toBe('conflitto')
    // 🔑 Il gettone corrente torna INTATTO: è quello con cui il client
    // riproverà. Un `new Date(...)` in mezzo troncherebbe i microsecondi e il
    // secondo tentativo prenderebbe un altro 409 — per sempre.
    expect(body.updated_at).toBe(NUOVO)
  })

  it('409 con l’esito quando lo snapshot è congelato da una DdC attiva (V8)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'congelata' }, error: null })
    const res = await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)
    expect(res.status).toBe(409)
    expect((await res.json()).esito).toBe('congelata')
  })

  it('409 «prima allega il foglio» quando la trascrizione non esiste ancora', async () => {
    // La via c'è ed è provata (sonda S1): allegare la fonte CREA la riga anche
    // per i lavori nati prima dell'ondata B. La risposta deve dirlo, perché è
    // il rimedio, non un vicolo cieco.
    rpcMock.mockResolvedValue({ data: { esito: 'senza_prescrizione' }, error: null })
    const res = await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.esito).toBe('senza_prescrizione')
    expect(body.errore).toMatch(/allega/i)
  })

  it('422 se la RPC dice campo_non_valido — difesa in profondità', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'campo_non_valido' }, error: null })
    const res = await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).esito).toBe('campo_non_valido')
  })

  it('⑰ 500 su errore PostgREST, esito sconosciuto o `ok` senza gettone nuovo', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    expect((await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)).status).toBe(500)

    rpcMock.mockResolvedValue({ data: { esito: 'marziano' }, error: null })
    expect((await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)).status).toBe(500)

    // 🔑 Un `ok` senza `updated_at` non è un successo: il client ripartirebbe
    // col gettone VECCHIO e prenderebbe un 409 immeritato al gesto dopo —
    // sembrando un conflitto che non è mai esistito.
    rpcMock.mockResolvedValue({ data: { esito: 'ok' }, error: null })
    expect((await POST(conGettone({ campo: 'colore', valore: 'A3' }), params)).status).toBe(500)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// IL GETTONE DI CONCORRENZA È OBBLIGATORIO
//
// La RPC salta il confronto quando `p_atteso_updated_at IS NULL`
// (20260804152403:222): senza gettone, due correzioni consecutive tornano
// ENTRAMBE `ok` e l'ultima vince in silenzio. È lo stesso difetto — rilievo M1,
// riprodotto sul database vero il 28/07/2026 — che ha reso obbligatorio il
// gettone sul PUT denti; qui il campo sovrascritto è la trascrizione della
// prescrizione, cioè ciò che la Dichiarazione di Conformità fotografa.
//
// 🛑 LA GUARDIA VIVE QUI E LA RPC RESTA PERMISSIVA, per la stessa ragione di
//    vocabolario del PUT denti: la RPC conosce `conflitto` («qualcun altro ha
//    scritto»), e «non hai mandato la chiave» non è quello. Farglielo dire
//    sarebbe una bugia all'utente.
//
// 🔑 Il contratto è esigibile: `GET /api/lavori/[id]` fa `select('*')` su
//    `lavori` (route.ts:302-315) e `Lavoro.updated_at` è nel tipo
//    (domain.ts) — chi apre la scheda ha già il gettone in mano.
//
// 🛑 Questi casi usano `richiesta` NUDA, mai `conGettone`.
// ═══════════════════════════════════════════════════════════════════════════
describe('POST …/prescrizione/typo — il gettone di concorrenza è obbligatorio', () => {
  it('🔴 422 quando il gettone MANCA DEL TUTTO', async () => {
    const res = await POST(richiesta({ campo: 'colore', valore: 'A3' }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).errore).toMatch(/atteso_updated_at/)
    // Senza questa riga la prova passerebbe anche se la route riscrivesse la
    // trascrizione e POI rispondesse 422.
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('🔴 422 su un gettone null, vuoto, di soli spazi o numerico', async () => {
    const corpi = [
      { atteso_updated_at: null, campo: 'colore', valore: 'A3' },
      { atteso_updated_at: '', campo: 'colore', valore: 'A3' },
      { atteso_updated_at: '   ', campo: 'colore', valore: 'A3' },
      { atteso_updated_at: 12345, campo: 'colore', valore: 'A3' },
    ]
    for (const corpo of corpi) {
      expect((await POST(richiesta(corpo), params)).status).toBe(422)
    }
    // La stringa vuota è respinta perché `''::timestamptz` è un errore di cast
    // (22007): sarebbe un 500 illeggibile al posto di un 422.
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑮ il gettone arriva alla RPC INTATTO: si controlla, non si normalizza', async () => {
    // Il gettone è una STRINGA OPACA end-to-end (sonda S5, primo giro rosso
    // proprio per questo): `timestamptz` ha precisione al microsecondo, `Date`
    // di JS al millisecondo. Un solo giro di riparsing troncherebbe `.123456`
    // a `.123` e il confronto `IS DISTINCT FROM` dentro la RPC non tornerebbe
    // MAI uguale: 409 permanente, che nemmeno ricaricando la pagina si sana.
    await POST(richiesta({ atteso_updated_at: ` ${GETTONE} `, campo: 'colore', valore: 'A3' }), params)
    expect(rpcMock.mock.calls[0][1].p_atteso_updated_at).toBe(` ${GETTONE} `)
  })
})
