import { describe, expect, it, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/lavori/[id]/prescrizione/fonte — «allega la fonte» (T4, ondata B ③)
//
// La route chiama `lavoro_prescrizione_allega_fonte` (SECURITY DEFINER, EXECUTE
// al solo service_role). L'UPSERT è deliberato: i lavori nati prima dell'ondata
// B non hanno la riga di `lavori_prescrizioni`, e allegare la fonte a posteriori
// la crea con `contenuto '{}'` (D101, via legacy provata dalla sonda S1).
//
// ═══ ENUMERAZIONE DELLE FORME D'INPUT (R-P4) ═══════════════════════════════
// Corpo: `{ fonte_tipo?, fonte_immagine_id?, fonte_riferimento? }`
//
//  ① corpo non-JSON (testo grezzo)               → 400
//  ② corpo `null` (la stringa "null" È JSON)     → 400
//  ③ corpo array                                 → 400
//  ④ corpo scalare (numero/stringa)              → 400
//  ⑤ chiave ignota (`pippo`, `laboratorio_id`)   → 422 · la RPC non parte
//  ⑥ `{}` — nessun corpo della fonte             → 422 (S2) · la RPC non parte
//  ⑦ solo `fonte_tipo`, senza corpo              → 422 (sarebbe 23514 → 500)
//  ⑧ `fonte_tipo` fuori dizionario ('fax')       → 422
//  ⑨ `fonte_tipo` non stringa (numero/array)     → 422
//  ⑩ `fonte_tipo: null` esplicito + riferimento  → 200 (assente ≡ null, V7)
//  ⑪ `fonte_riferimento` vuoto o di soli spazi   → 422 (non è un corpo)
//  ⑫ `fonte_riferimento` non stringa             → 422
//  ⑬ `fonte_immagine_id` non stringa             → 422
//  ⑭ `fonte_immagine_id` non-uuid                → 422 (sarebbe 22P02 → 500)
//  ⑮ `fonte_immagine_id` di un altro laboratorio → 403 · la RPC non parte
//  ⑯ `fonte_immagine_id` cancellata (soft)       → 403
//  ⑰ esiti della RPC: ok · non_trovato · fonte_congelata · fonte_tipo_non_valido
//  ⑱ errore PostgREST · esito sconosciuto        → 500
//
// 🛑 NON coperte, e con la ragione:
//  · duplicati/forma dell'UUID oltre la sintassi: l'esistenza e il tenant li
//    prova il lookup (⑮), la forma la prova ⑭ — non c'è una terza domanda.
//  · `fonte_riferimento` lunghissimo: la colonna è `text`, nessun limite in
//    banca dati; inventarne uno qui sarebbe una regola senza autorità.
// ═══════════════════════════════════════════════════════════════════════════

const rpcMock = vi.fn()
const fromMock = vi.fn()
const contextMock = vi.fn()
const sameOriginMock = vi.fn(() => true)

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: rpcMock, from: fromMock }),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: () => contextMock(),
}))
vi.mock('@/lib/supabase/lab-guard', () => ({ assertLabOperativo: () => null }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => sameOriginMock() }))

import { POST } from '@/app/api/lavori/[id]/prescrizione/fonte/route'

const LAB = 'lab-A'
const IMG = '3f2504e0-4f89-11d3-9a0c-0305e82c3301'
const params = { params: Promise.resolve({ id: 'L1' }) }

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori/L1/prescrizione/fonte', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
/** Corpo TESTUALE, per le forme che JSON.stringify non sa produrre. */
function richiestaGrezza(testo: string) {
  return new Request('http://localhost/api/lavori/L1/prescrizione/fonte', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testo,
  })
}

/** select → eq → is → single: la catena del lookup tenant sull'immagine. */
function immagine(data: unknown) {
  return {
    select: () => ({
      eq: () => ({ is: () => ({ single: async () => ({ data, error: null }) }) }),
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  sameOriginMock.mockReturnValue(true)
  contextMock.mockResolvedValue({
    userId: 'U1',
    laboratorioId: LAB,
    ruolo: 'titolare',
    lab: { stato: 'attivo', trial_ends_at: null },
  })
  rpcMock.mockResolvedValue({ data: { esito: 'ok' }, error: null })
  fromMock.mockImplementation((t: string) => {
    if (t === 'lavori_immagini') return immagine({ laboratorio_id: LAB })
    throw new Error(`Tabella inattesa: ${t}`)
  })
})

describe('POST …/prescrizione/fonte — la porta prima del database', () => {
  it('403 se la richiesta non arriva dalla nostra origine (CSRF)', async () => {
    sameOriginMock.mockReturnValue(false)
    const res = await POST(richiesta({ fonte_riferimento: 'x' }), params)
    expect(res.status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('401 senza sessione', async () => {
    contextMock.mockResolvedValue(null)
    expect((await POST(richiesta({ fonte_riferimento: 'x' }), params)).status).toBe(401)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('403 se l’utente non ha un laboratorio', async () => {
    contextMock.mockResolvedValue({ userId: 'U1', laboratorioId: null, ruolo: 'admin_sistema' })
    expect((await POST(richiesta({ fonte_riferimento: 'x' }), params)).status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('① 400 su un corpo che non è JSON', async () => {
    expect((await POST(richiestaGrezza('non sono json'), params)).status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('②③④ 400 su null, array e scalare — non sono oggetti', async () => {
    // `JSON.stringify(null)` è la stringa "null": `req.json()` la parsa SENZA
    // lanciare, quindi il catch di ① non scatta e ogni `body.campo` sarebbe un
    // TypeError → 500 non gestito.
    expect((await POST(richiesta(null), params)).status).toBe(400)
    expect((await POST(richiesta(['foglio']), params)).status).toBe(400)
    expect((await POST(richiesta('foglio'), params)).status).toBe(400)
    expect((await POST(richiesta(7), params)).status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑤ 422 su una chiave ignota — il contratto delle route NUOVE è chiuso', async () => {
    // Nota ② 6 del piano: 422 nelle route nuove (il POST /api/lavori resta
    // com'è, per retro-compatibilità D218). È anche ciò che rende impossibile
    // far scegliere al client il proprio tenant o l'utente della divergenza.
    const res = await POST(richiesta({ fonte_riferimento: 'x', laboratorio_id: 'lab-B' }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).errore).toMatch(/laboratorio_id/)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑥ 422 sul corpo VUOTO: la RPC creerebbe una riga senza fonte (S2)', async () => {
    // 🔑 Provato a banco: `lavoro_prescrizione_allega_fonte(lab, lavoro, NULL,
    // NULL, NULL)` risponde `ok` e CREA una riga di `lavori_prescrizioni` con
    // tutte e tre le colonne della fonte a NULL. La riga vuota poi mente al
    // precheck della DdC. Il rifiuto DEVE stare qui, prima della chiamata.
    const res = await POST(richiesta({}), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑦ 422 su una fonte dichiarata SENZA corpo: sarebbe il CHECK 23514 → 500', async () => {
    const res = await POST(richiesta({ fonte_tipo: 'foglio' }), params)
    expect(res.status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑧⑨ 422 su fonte_tipo fuori dizionario o della forma sbagliata', async () => {
    const corpi = [
      { fonte_tipo: 'fax', fonte_riferimento: 'x' },
      { fonte_tipo: 5, fonte_riferimento: 'x' },
      { fonte_tipo: ['foglio'], fonte_riferimento: 'x' },
      { fonte_tipo: 'FOGLIO', fonte_riferimento: 'x' },
      { fonte_tipo: ' foglio ', fonte_riferimento: 'x' },
    ]
    for (const corpo of corpi) {
      expect((await POST(richiesta(corpo), params)).status).toBe(422)
    }
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑩ `fonte_tipo: null` esplicito è legittimo: è la V7, «in attesa di conferma scritta»', async () => {
    // 🔑 ASIMMETRIA DELIBERATA con la route typo: qui l'UPSERT SOSTITUISCE
    // tutte e tre le colonne, quindi «chiave assente» e «null esplicito»
    // dicono la stessa cosa. Sul typo `null` è invece un ATTO (rimuove la
    // chiave dal contenuto) e la chiave assente è un errore.
    const res = await POST(
      richiesta({ fonte_tipo: null, fonte_riferimento: 'il dentista conferma via mail' }),
      params
    )
    expect(res.status).toBe(200)
    expect(rpcMock.mock.calls[0][1].p_fonte_tipo).toBeNull()
  })

  it('⑪ 422 su un riferimento vuoto o di soli spazi: non è un corpo', async () => {
    // `'' IS NOT NULL` è VERO: il CHECK `fonte_ck` passerebbe e la riga
    // sembrerebbe avere una fonte. È la stessa bugia di ⑥, detta più piano.
    expect((await POST(richiesta({ fonte_riferimento: '' }), params)).status).toBe(422)
    expect((await POST(richiesta({ fonte_riferimento: '   ' }), params)).status).toBe(422)
    expect(
      (await POST(richiesta({ fonte_tipo: 'email', fonte_riferimento: '' }), params)).status
    ).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑫⑬ 422 su riferimento o immagine della forma sbagliata', async () => {
    const corpi = [
      { fonte_riferimento: 5 },
      { fonte_riferimento: ['x'] },
      { fonte_riferimento: { testo: 'x' } },
      { fonte_immagine_id: 5 },
      { fonte_immagine_id: [IMG] },
    ]
    for (const corpo of corpi) {
      expect((await POST(richiesta(corpo), params)).status).toBe(422)
    }
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑭ 422 su un identificativo immagine che non è un UUID: sarebbe 22P02 → 500', async () => {
    const res = await POST(richiesta({ fonte_immagine_id: 'pippo' }), params)
    expect(res.status).toBe(422)
    expect(fromMock).not.toHaveBeenCalled()
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑮⑯ 403 se l’immagine è di un altro laboratorio o è stata cancellata', async () => {
    // La FK composita (fonte_immagine_id, laboratorio_id) morde con 23503 →
    // 500 illeggibile. Il controllo di appartenenza sta qui, col precedente
    // del POST /api/lavori (route.ts:158-174), che risponde 403.
    fromMock.mockImplementation(() => immagine({ laboratorio_id: 'lab-B' }))
    expect((await POST(richiesta({ fonte_immagine_id: IMG }), params)).status).toBe(403)

    fromMock.mockImplementation(() => immagine(null)) // inesistente o soft-deleted
    expect((await POST(richiesta({ fonte_immagine_id: IMG }), params)).status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })
})

describe('POST …/prescrizione/fonte — la chiamata e gli esiti', () => {
  it('200: i tre parametri arrivano alla RPC, tenant e lavoro da sessione e URL', async () => {
    const res = await POST(
      richiesta({ fonte_tipo: 'foglio', fonte_immagine_id: IMG, fonte_riferimento: 'busta 3' }),
      params
    )
    expect(res.status).toBe(200)
    const args = rpcMock.mock.calls[0][1]
    expect(rpcMock.mock.calls[0][0]).toBe('lavoro_prescrizione_allega_fonte')
    expect(args).toEqual({
      p_lab: LAB,
      p_lavoro: 'L1',
      p_fonte_tipo: 'foglio',
      p_fonte_immagine_id: IMG,
      p_fonte_riferimento: 'busta 3',
    })
    // La risposta rimanda la fonte NORMALIZZATA — quella davvero scritta —
    // così il chiamante ridisegna senza rileggere (precedente: PUT denti).
    expect(await res.json()).toEqual({
      fonte: { fonte_tipo: 'foglio', fonte_immagine_id: IMG, fonte_riferimento: 'busta 3' },
    })
  })

  it('le chiavi assenti diventano NULL: la fonte si SOSTITUISCE per intero', async () => {
    await POST(richiesta({ fonte_riferimento: 'solo questo' }), params)
    expect(rpcMock.mock.calls[0][1]).toEqual({
      p_lab: LAB,
      p_lavoro: 'L1',
      p_fonte_tipo: null,
      p_fonte_immagine_id: null,
      p_fonte_riferimento: 'solo questo',
    })
  })

  it('il riferimento viaggia INTATTO, spazi esterni compresi', async () => {
    // Il `.trim()` serve SOLO a decidere se la stringa è vuota (⑪): il valore
    // spedito non si normalizza. Precedente e ragione: il gettone del PUT denti.
    await POST(richiesta({ fonte_riferimento: '  busta 3  ' }), params)
    expect(rpcMock.mock.calls[0][1].p_fonte_riferimento).toBe('  busta 3  ')
  })

  it('404 quando la RPC non trova il lavoro — è anche il caso cross-tenant (R4)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'non_trovato' }, error: null })
    const res = await POST(richiesta({ fonte_riferimento: 'x' }), params)
    expect(res.status).toBe(404)
  })

  it('409 con l’esito quando la fonte è congelata da una DdC attiva (V8)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'fonte_congelata' }, error: null })
    const res = await POST(richiesta({ fonte_riferimento: 'x' }), params)
    expect(res.status).toBe(409)
    const body = await res.json()
    // 🔑 `esito` è la parte leggibile dalla macchina: la UI deve poter
    // distinguere «annulla la dichiarazione» da «prima allega il foglio» da
    // «ricarica». La frase è per l'umano, il codice è per il ramo di codice.
    expect(body.esito).toBe('fonte_congelata')
    expect(typeof body.errore).toBe('string')
  })

  it('422 se la RPC dice fonte_tipo_non_valido — difesa in profondità', async () => {
    // Non deve mai accadere (⑧ morde prima). Se accade, i due dizionari sono
    // divergenti: la risposta resta un 422, mai un 500.
    rpcMock.mockResolvedValue({ data: { esito: 'fonte_tipo_non_valido' }, error: null })
    const res = await POST(richiesta({ fonte_tipo: 'foglio', fonte_riferimento: 'x' }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).esito).toBe('fonte_tipo_non_valido')
  })

  it('⑱ 500 su errore PostgREST o esito sconosciuto — mai ignorati', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    expect((await POST(richiesta({ fonte_riferimento: 'x' }), params)).status).toBe(500)

    rpcMock.mockResolvedValue({ data: { esito: 'marziano' }, error: null })
    expect((await POST(richiesta({ fonte_riferimento: 'x' }), params)).status).toBe(500)

    rpcMock.mockResolvedValue({ data: null, error: null })
    expect((await POST(richiesta({ fonte_riferimento: 'x' }), params)).status).toBe(500)
  })
})
