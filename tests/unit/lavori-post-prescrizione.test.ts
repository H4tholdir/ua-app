import { describe, it, expect, vi, beforeEach } from 'vitest'

// Task 5 (ondata B ②) — POST /api/lavori compone lo snapshot della
// prescrizione SERVER-SIDE (V3: il client manda dati grezzi, mai testo MDR
// composto) e lo passa a `lavoro_crea_atomico` come `p_prescrizione`.
//
// ⚠️ LA GUARDIA M-T3-2 (review Task 3), ed è il cuore di questo file: la route
// non deve MAI passare un jsonb 'null' come p_prescrizione. `'null'::jsonb IS
// NOT NULL` è VERO in Postgres: la RPC entrerebbe nell'IF e inserirebbe una
// riga fantasma di lavori_prescrizioni per ogni lavoro legacy. Quando non c'è
// niente da trascrivere, la CHIAVE si omette dall'oggetto args — non si manda
// `p_prescrizione: null`.
//
// ═══ ENUMERAZIONE DELLE FORME D'INPUT (R-P4) — il body della route ═════════
//  ① body legacy (senza `prescrizione` né `istituzione_sanitaria`), CON denti
//    → chiamata RPC IDENTICA a oggi: p_prescrizione ASSENTE dagli args.
//    🔑 È il gate: la trascrizione nasce SOLO se il client la dichiara
//    (chiave `prescrizione` presente). Senza gate, ogni body legacy con denti
//    produrrebbe una riga di lavori_prescrizioni al deploy del server, prima
//    che il wizard nuovo esista.
//  ② prescrizione completa (colore + numero) + denti misti → p_prescrizione
//    FEDELE: elementi = solo i 'prescritto' (W20), colore come digitato (D210)
//  ③ prescrizione {} SENZA denti → componiSnapshot torna null → chiave OMESSA
//  ④ prescrizione {} CON denti → dichiarare la trascrizione basta: gli
//    elementi prescritti entrano nello snapshot
//  ⑤ istituzione_sanitaria → p_lavoro, fedele (P37)
//  ⑥ prescrizione stringa → 422, RPC mai chiamata
//  ⑦ prescrizione array → 422
//  ⑧ prescrizione null → 422 (chi non trascrive OMETTE la chiave — stessa
//    regola di `denti`, route.ts:190-197)
//  ⑨ prescrizione.colore non-stringa → 422
//  ⑩ prescrizione.numero_prescrizione non-stringa → 422
//  ⑪ `tipo` mai in p_prescrizione (D213) → coperto dai deep-equal di ②④
//  ⑫ body non-JSON / null / array alla radice → NON coperta qui: guardia già
//    esistente e già provata in lavori-post-atomico.test.ts (400 prima di
//    qualsiasi lettura del body)
// ═══════════════════════════════════════════════════════════════════════════

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

import { POST } from '../../src/app/api/lavori/route'

const LAB_ID = 'lab-1'

const UTENTE_ROW = {
  laboratorio_id: LAB_ID,
  ruolo: 'titolare',
  laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const ESITO_OK = {
  esito: 'ok',
  id: 'lavoro-1',
  numero_lavoro: '2026/0042',
  stato: 'ricevuto',
}

const CORPO_BASE = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-30',
}

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

/** select → eq → is → single: la catena usata sia dal lookup utenti sia dalle FK. */
function singolo(data: unknown) {
  return {
    select: () => ({
      eq: () => ({ is: () => ({ single: async () => ({ data, error: null }) }) }),
    }),
  }
}

function setup() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return singolo(UTENTE_ROW)
    if (table === 'clienti') return singolo({ laboratorio_id: LAB_ID })
    throw new Error(`Tabella inattesa: ${table}`)
  })
}

/** Gli argomenti dell'unica chiamata a `lavoro_crea_atomico`, chiavi comprese. */
function argomentiRpc() {
  const chiamata = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_crea_atomico')
  if (!chiamata) throw new Error('lavoro_crea_atomico non è mai stata chiamata')
  return chiamata[1] as Record<string, unknown>
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockRpc.mockResolvedValue({ data: ESITO_OK, error: null })
})

describe('POST /api/lavori — retro-compatibilità: il body legacy non cambia la chiamata', () => {
  it('① body senza i campi nuovi, CON denti → p_prescrizione ASSENTE dagli args', async () => {
    setup()

    const res = await POST(
      richiesta({ ...CORPO_BASE, denti: [{ fdi: 11, ruolo: 'elemento', provenienza: 'prescritto' }] })
    )

    expect(res.status).toBe(201)
    const args = argomentiRpc()
    // 🔑 La chiave DEVE mancare, non valere null: `'null'::jsonb IS NOT NULL`
    // è vero, e la RPC inserirebbe una riga fantasma (M-T3-2).
    expect(Object.keys(args).sort()).toEqual(['p_denti', 'p_lab', 'p_lavoro'])
    // `istituzione_sanitaria: null` dentro p_lavoro è equivalente alla chiave
    // assente per la RPC (`p_lavoro->>'istituzione_sanitaria'` → SQL NULL in
    // entrambi i casi) — è il pattern `?? null` di ogni campo facoltativo del
    // file (richiedente_nome, ora_consegna, …).
    expect((args.p_lavoro as Record<string, unknown>).istituzione_sanitaria).toBeNull()
  })
})

describe('POST /api/lavori — lo snapshot composto dal server (V3)', () => {
  it('② prescrizione completa + denti misti → p_prescrizione fedele, solo i prescritti (W20, D210)', async () => {
    setup()

    const res = await POST(
      richiesta({
        ...CORPO_BASE,
        denti: [
          { fdi: 11, ruolo: 'elemento', provenienza: 'prescritto' },
          { fdi: 21, ruolo: 'elemento', provenienza: 'eseguito' },
        ],
        prescrizione: { colore: ' a3 chiaro ', numero_prescrizione: 'RX-77' },
      })
    )

    expect(res.status).toBe(201)
    // Deep-equal, non objectContaining: prova anche che `tipo` NON c'è (D213)
    // e che il colore arriva COME DIGITATO — spazi e minuscole compresi.
    expect(argomentiRpc().p_prescrizione).toEqual({
      contenuto: { elementi: [11], colore: ' a3 chiaro ' },
      numero_prescrizione: 'RX-77',
    })
  })

  it('③ prescrizione {} senza denti → niente di trascritto: chiave OMESSA, mai jsonb null', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, prescrizione: {} }))

    expect(res.status).toBe(201)
    expect(Object.keys(argomentiRpc()).sort()).toEqual(['p_denti', 'p_lab', 'p_lavoro'])
  })

  it('④ prescrizione {} con denti → gli elementi prescritti entrano (il default di provenienza è "prescritto")', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, denti: [{ fdi: 14 }], prescrizione: {} }))

    expect(res.status).toBe(201)
    expect(argomentiRpc().p_prescrizione).toEqual({
      contenuto: { elementi: [14] },
      numero_prescrizione: null,
    })
  })

  it('⑤ istituzione_sanitaria → dentro p_lavoro, fedele (P37)', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, istituzione_sanitaria: 'ASL Napoli 1 Centro' }))

    expect(res.status).toBe(201)
    expect((argomentiRpc().p_lavoro as Record<string, unknown>).istituzione_sanitaria).toBe(
      'ASL Napoli 1 Centro'
    )
  })
})

describe('POST /api/lavori — le forme patologiche di `prescrizione`', () => {
  it('⑥ prescrizione stringa → 422, RPC mai chiamata', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, prescrizione: 'RX-77' }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('prescrizione deve essere un oggetto')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('⑦ prescrizione array → 422', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, prescrizione: [] }))

    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('⑧ prescrizione null → 422 (chi non trascrive omette la chiave, come per `denti`)', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, prescrizione: null }))

    expect(res.status).toBe(422)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('⑨ colore non-stringa → 422: il tipo sbagliato non si trascrive in silenzio', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, prescrizione: { colore: 3 } }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('colore della prescrizione non valido')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('⑩ numero_prescrizione non-stringa → 422', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, prescrizione: { numero_prescrizione: 77 } }))
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('numero_prescrizione non valido')
    expect(mockRpc).not.toHaveBeenCalled()
  })
})
