import { describe, expect, it, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/lavori/[id]/prescrizione/divergenza — «lo cambiamo noi» (T4,
// ondata B ③, gesto V4/V9/D212).
//
// La divergenza NON riscrive la trascrizione: il contenuto resta ciò che il
// dentista ha prescritto, e al registro si APPENDE {campo, motivo, nota,
// utente_id, registrata_at}.
//
// 🔴 IL DIZIONARIO DEL CAMPO VIVE QUI, E OGGI SOLO QUI. Provato a banco (sonda
//    S3): `lavoro_prescrizione_registra_divergenza` accetta `p_campo := 'pippo'`
//    e perfino `NULL`, e risponde `ok`. Una divergenza registrata su un campo
//    che non esiste è una riga che nessuna schermata mostrerà mai e che nessuno
//    saprà di avere. Il Task 5 chiude il buco anche in banca dati; fino ad
//    allora questa porta è l'UNICA guardia — e resta comunque la prima.
//
// ═══ ENUMERAZIONE DELLE FORME D'INPUT (R-P4) ═══════════════════════════════
// Corpo: `{ campo, motivo, nota? }`
//
//  ① corpo non-JSON · ② null · ③ array · ④ scalare   → 400
//  ⑤ chiave ignota (`utente_id`, `atteso_updated_at`) → 422 · RPC non parte
//  ⑥ `campo` assente / non stringa / array / null     → 422
//  ⑦ `campo` fuori dizionario ('pippo')               → 422 · RPC non parte (S3)
//  ⑧ `motivo` assente / non stringa / fuori dizionario→ 422
//  ⑨ `nota` assente o `null`                          → 200, p_nota = null
//  ⑩ `nota` vuota o di soli spazi                     → 200, p_nota = null
//  ⑪ `nota` non stringa                               → 422
//  ⑫ `p_utente` = utente della sessione, MAI dal corpo
//  ⑬ esiti: ok(+divergenze) · non_trovato · congelata · senza_prescrizione ·
//     motivo_non_valido · campo_non_valido (arriva col Task 5)
//  ⑭ errore PostgREST · esito sconosciuto             → 500
//
// 🛑 NON coperte, e con la ragione:
//  · gettone di concorrenza: NON ESISTE per questo gesto. La RPC non tocca
//    `lavori.updated_at` (fatto 12 del censimento) e l'operazione è un
//    APPEND — due divergenze concorrenti sono due righe legittime, non una
//    sovrascrittura. Mandare `atteso_updated_at` cade in ⑤: 422, non un 409
//    che qui non esisterebbe.
//  · `nota` obbligatoria quando il motivo è `altro`: la RPC non la chiede e
//    nessuna decisione ratificata la impone. Sarebbe una regola inventata
//    dalla porta; se servirà, la porterà la UI del Task 7 con la sua D.
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

import { POST } from '@/app/api/lavori/[id]/prescrizione/divergenza/route'

const LAB = 'lab-A'
const UTENTE = 'utente-di-sessione'
const params = { params: Promise.resolve({ id: 'L1' }) }

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori/L1/prescrizione/divergenza', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
function richiestaGrezza(testo: string) {
  return new Request('http://localhost/api/lavori/L1/prescrizione/divergenza', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: testo,
  })
}

const VALIDO = { campo: 'colore', motivo: 'esigenza_tecnica' }

beforeEach(() => {
  vi.clearAllMocks()
  sameOriginMock.mockReturnValue(true)
  contextMock.mockResolvedValue({
    userId: UTENTE,
    laboratorioId: LAB,
    ruolo: 'tecnico',
    lab: { stato: 'attivo', trial_ends_at: null },
  })
  rpcMock.mockResolvedValue({ data: { esito: 'ok', divergenze: 2 }, error: null })
})

describe('POST …/prescrizione/divergenza — la porta prima del database', () => {
  it('403 fuori origine · 401 senza sessione · 403 senza laboratorio', async () => {
    sameOriginMock.mockReturnValue(false)
    expect((await POST(richiesta(VALIDO), params)).status).toBe(403)

    sameOriginMock.mockReturnValue(true)
    contextMock.mockResolvedValue(null)
    expect((await POST(richiesta(VALIDO), params)).status).toBe(401)

    contextMock.mockResolvedValue({ userId: 'U1', laboratorioId: null, ruolo: 'admin_sistema' })
    expect((await POST(richiesta(VALIDO), params)).status).toBe(403)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('①②③④ 400 su corpo non-JSON, null, array, scalare', async () => {
    expect((await POST(richiestaGrezza('<html>'), params)).status).toBe(400)
    expect((await POST(richiesta(null), params)).status).toBe(400)
    expect((await POST(richiesta([VALIDO]), params)).status).toBe(400)
    expect((await POST(richiesta(3), params)).status).toBe(400)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑤ 422 su una chiave ignota — `utente_id` dal corpo non esiste', async () => {
    // 🔑 Il «chi» non si chiede al client: si legge dalla sessione (⑫). La
    // chiave ignota rende l'inganno impossibile invece di ignorarlo in
    // silenzio — e vale anche per `atteso_updated_at`, che qui non ha senso.
    const res = await POST(richiesta({ ...VALIDO, utente_id: 'altro-utente' }), params)
    expect(res.status).toBe(422)
    expect((await res.json()).errore).toMatch(/utente_id/)

    expect((await POST(richiesta({ ...VALIDO, atteso_updated_at: 'X' }), params)).status).toBe(422)
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑥⑦ 422 su un campo assente, della forma sbagliata o fuori dizionario (S3)', async () => {
    const corpi = [
      { motivo: 'altro' }, // campo assente
      { campo: null, motivo: 'altro' }, // il NULL che la RPC oggi accetta
      { campo: 5, motivo: 'altro' },
      { campo: ['colore'], motivo: 'altro' },
      { campo: 'pippo', motivo: 'altro' }, // il valore della sonda S3
    ]
    for (const corpo of corpi) {
      expect((await POST(richiesta(corpo), params)).status).toBe(422)
    }
    // La prova che conta: nessuna di queste arriva al database, dove OGGI
    // sarebbero tutte `ok` e diventerebbero righe fantasma nel registro.
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑧ 422 su un motivo assente, della forma sbagliata o fuori dizionario', async () => {
    const corpi = [
      { campo: 'colore' },
      { campo: 'colore', motivo: null },
      { campo: 'colore', motivo: 5 },
      { campo: 'colore', motivo: ['altro'] },
      { campo: 'colore', motivo: 'perche_si' },
      { campo: 'colore', motivo: 'ALTRO' },
    ]
    for (const corpo of corpi) {
      expect((await POST(richiesta(corpo), params)).status).toBe(422)
    }
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('⑨⑩ la nota assente, null, vuota o di soli spazi diventa NULL', async () => {
    // Una nota vuota non è una nota: registrarla come stringa vuota
    // costringerebbe ogni lettore a distinguere due vuoti diversi.
    for (const corpo of [VALIDO, { ...VALIDO, nota: null }, { ...VALIDO, nota: '' }, { ...VALIDO, nota: '   ' }]) {
      rpcMock.mockClear()
      const res = await POST(richiesta(corpo), params)
      expect(res.status).toBe(200)
      expect(rpcMock.mock.calls[0][1].p_nota).toBeNull()
    }
  })

  it('⑪ 422 su una nota che non è testo', async () => {
    for (const nota of [5, ['x'], { testo: 'x' }, true]) {
      expect((await POST(richiesta({ ...VALIDO, nota }), params)).status).toBe(422)
    }
    expect(rpcMock).not.toHaveBeenCalled()
  })

  it('la nota viaggia INTATTA, spazi interni ed esterni compresi', async () => {
    await POST(richiesta({ ...VALIDO, nota: '  il dentista ha detto  «va bene»  ' }), params)
    expect(rpcMock.mock.calls[0][1].p_nota).toBe('  il dentista ha detto  «va bene»  ')
  })
})

describe('POST …/prescrizione/divergenza — la chiamata e gli esiti', () => {
  it('⑫ 200: p_utente è quello della SESSIONE, tenant e lavoro da sessione e URL', async () => {
    const res = await POST(richiesta({ ...VALIDO, nota: 'colore non disponibile' }), params)
    expect(res.status).toBe(200)
    expect(rpcMock.mock.calls[0][0]).toBe('lavoro_prescrizione_registra_divergenza')
    expect(rpcMock.mock.calls[0][1]).toEqual({
      p_lab: LAB,
      p_lavoro: 'L1',
      p_campo: 'colore',
      p_motivo: 'esigenza_tecnica',
      p_nota: 'colore non disponibile',
      p_utente: UTENTE,
    })
    // Il conteggio del registro torna al chiamante: è l'unica cosa che il
    // client non può dedurre da sé senza rileggere.
    expect(await res.json()).toEqual({ divergenze: 2 })
  })

  it('404 quando la RPC non trova il lavoro — è anche il caso cross-tenant (R4)', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'non_trovato' }, error: null })
    expect((await POST(richiesta(VALIDO), params)).status).toBe(404)
  })

  it('409 con l’esito su congelata e su senza_prescrizione', async () => {
    rpcMock.mockResolvedValue({ data: { esito: 'congelata' }, error: null })
    let res = await POST(richiesta(VALIDO), params)
    expect(res.status).toBe(409)
    expect((await res.json()).esito).toBe('congelata')

    rpcMock.mockResolvedValue({ data: { esito: 'senza_prescrizione' }, error: null })
    res = await POST(richiesta(VALIDO), params)
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.esito).toBe('senza_prescrizione')
    expect(body.errore).toMatch(/allega/i)
  })

  it('422 su motivo_non_valido e su campo_non_valido — difesa in profondità', async () => {
    // `campo_non_valido` NON esiste ancora: lo aggiunge il Task 5 alla RPC.
    // Mapparlo oggi significa che il giorno del deploy della migration questa
    // porta risponde 422 invece di 500, senza toccare niente.
    rpcMock.mockResolvedValue({ data: { esito: 'motivo_non_valido' }, error: null })
    let res = await POST(richiesta(VALIDO), params)
    expect(res.status).toBe(422)
    expect((await res.json()).esito).toBe('motivo_non_valido')

    rpcMock.mockResolvedValue({ data: { esito: 'campo_non_valido' }, error: null })
    res = await POST(richiesta(VALIDO), params)
    expect(res.status).toBe(422)
    expect((await res.json()).esito).toBe('campo_non_valido')
  })

  it('⑭ 500 su errore PostgREST, esito sconosciuto o conteggio mancante', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom', code: 'XX000' } })
    expect((await POST(richiesta(VALIDO), params)).status).toBe(500)

    rpcMock.mockResolvedValue({ data: { esito: 'marziano' }, error: null })
    expect((await POST(richiesta(VALIDO), params)).status).toBe(500)

    // `ok` senza conteggio: il client mostrerebbe «registrata» con un registro
    // che non sa contare. Se l'esito è incompleto, non è un successo.
    rpcMock.mockResolvedValue({ data: { esito: 'ok' }, error: null })
    expect((await POST(richiesta(VALIDO), params)).status).toBe(500)
  })
})
