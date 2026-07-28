import { describe, it, expect, vi, beforeEach } from 'vitest'

// Task 11 — il colore di caso si normalizza e si confronta col CATALOGO,
// dentro il POST, e non fa MAI fallire la creazione del lavoro.
//
// 🔴 Il fatto che obbliga a farlo qui e non nel client (provato il 28/07/2026):
//
//   node scripts/tmp/sql.mjs "begin; update lavori set colore_scala='vita_classical',
//     colore_codice='a3' where id=(select id from lavori limit 1); rollback;"
//   → ERRORE SQL: insert or update on table "lavori" violates foreign key
//     constraint "lavori_colore_caso_fk"
//
// La chiave esterna verso `colori_dentali` esiste ANCHE su `lavori`, non solo
// su `lavori_denti`. Un «a3» minuscolo — al banco si digita di fretta — non
// «non si salva»: fa fallire la CREAZIONE DEL LAVORO con un 500. Una garanzia
// che vive solo nel client non è una garanzia: il client si aggira, e domani
// i client saranno più d'uno.
//
// La regola dura, e ogni caso qui sotto la misura: se il colore non si
// riconosce **si perde il colore, mai il lavoro**. Si corregge dalla scheda.

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

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

const UTENTE_ROW = {
  laboratorio_id: LAB_ID,
  ruolo: 'titolare',
  laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const ESITO_OK = { esito: 'ok', id: 'lavoro-1', numero_lavoro: '2026/0042', stato: 'ricevuto' }

const CORPO_BASE = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-30',
}

// Il catalogo vero, ridotto ai codici che servono qui. Forma verificata sul
// database il 28/07/2026: 48 righe, 16 vita_classical + 29 vita_3d_master +
// 3 fuori_scala, e NESSUN codice ripetuto fra scale diverse — è questo che
// rende deducibile la scala dal solo codice.
const CATALOGO: Array<{ scala: string; codice: string }> = [
  { scala: 'vita_classical', codice: 'A2' },
  { scala: 'vita_classical', codice: 'A3' },
  { scala: 'vita_classical', codice: 'A3.5' },
  { scala: 'fuori_scala', codice: 'BL' },
  { scala: 'vita_3d_master', codice: '2M2' },
]

function richiesta(body: unknown) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

function singolo(data: unknown) {
  return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data, error: null }) }) }) }) }
}

/**
 * `setup` monta anche `colori_dentali`. La spia restituita dice se il catalogo
 * è stato interrogato e con quale codice: una lettura fatta quando non serve
 * (nessun colore) è un viaggio in più su ogni creazione.
 */
function setup({ erroreCatalogo = false }: { erroreCatalogo?: boolean } = {}) {
  const spiaCatalogo = vi.fn()
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return singolo(UTENTE_ROW)
    if (table === 'clienti') return singolo({ laboratorio_id: LAB_ID })
    if (table === 'colori_dentali') {
      return {
        select: () => ({
          eq: (colonna: string, valore: string) => {
            spiaCatalogo(colonna, valore)
            if (erroreCatalogo) return Promise.resolve({ data: null, error: { message: 'catalogo giù' } })
            return Promise.resolve({
              data: CATALOGO.filter((r) => r.codice === valore),
              error: null,
            })
          },
        }),
      }
    }
    throw new Error(`Tabella inattesa: ${table}`)
  })
  return spiaCatalogo
}

function coloreInviato() {
  const chiamata = mockRpc.mock.calls.find((c) => c[0] === 'lavoro_crea_atomico')
  if (!chiamata) throw new Error('lavoro_crea_atomico non è mai stata chiamata')
  const p = (chiamata[1] as { p_lavoro: Record<string, unknown> }).p_lavoro
  return { colore_scala: p.colore_scala, colore_codice: p.colore_codice }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  mockRpc.mockResolvedValue({ data: ESITO_OK, error: null })
})

describe('POST /api/lavori — il colore si normalizza e la scala si deduce', () => {
  it('«a3» minuscolo, senza scala → «A3» + vita_classical, e 201', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 'a3' }))

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: 'vita_classical', colore_codice: 'A3' })
  })

  it('«bl» → «BL» + fuori_scala: la scala giusta anche quando non è VITA', async () => {
    setup()

    await POST(richiesta({ ...CORPO_BASE, colore_codice: '  bl ' }))

    expect(coloreInviato()).toEqual({ colore_scala: 'fuori_scala', colore_codice: 'BL' })
  })

  it('«2m2» → «2M2» + vita_3d_master', async () => {
    setup()

    await POST(richiesta({ ...CORPO_BASE, colore_codice: '2m2' }))

    expect(coloreInviato()).toEqual({ colore_scala: 'vita_3d_master', colore_codice: '2M2' })
  })

  it('«a3.5» → «A3.5»: il punto è parte del codice, non si tocca', async () => {
    setup()

    await POST(richiesta({ ...CORPO_BASE, colore_codice: 'a3.5' }))

    expect(coloreInviato()).toEqual({ colore_scala: 'vita_classical', colore_codice: 'A3.5' })
  })

  it('scala dichiarata e coerente col catalogo → passa, normalizzata', async () => {
    setup()

    await POST(richiesta({ ...CORPO_BASE, colore_scala: 'vita_classical', colore_codice: 'a2' }))

    expect(coloreInviato()).toEqual({ colore_scala: 'vita_classical', colore_codice: 'A2' })
  })
})

describe('POST /api/lavori — 🛑 si perde il colore, MAI il lavoro', () => {
  it('codice inesistente in catalogo → 201, colore scartato, lavoro creato', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 'ZZ9' }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.lavoro).toEqual({ id: 'lavoro-1', numero_lavoro: '2026/0042', stato: 'ricevuto' })
    // La coppia non arriva MAI al database: sarebbe `lavori_colore_caso_fk`,
    // cioè un 500 e nessun lavoro.
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('coppia (scala, codice) entrambe esistenti ma ACCOPPIATE MALE → scartata, 201', async () => {
    setup()

    const res = await POST(
      richiesta({ ...CORPO_BASE, colore_scala: 'vita_3d_master', colore_codice: 'A3' })
    )

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('scala inventata → scartata insieme al codice, 201', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_scala: 'pippo', colore_codice: 'A3' }))

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })

  // 🔴 `lavori_colore_caso_coppia_ck` impone `(scala IS NULL) = (codice IS NULL)`:
  // una scala orfana farebbe abortire l'INSERT dentro la RPC. Mezza coppia non è
  // mezzo colore: è nessun colore.
  it('scala senza codice → tutte e due a null, 201 (mai mezza coppia al database)', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_scala: 'vita_classical' }))

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('codice che non è una stringa (numero) → scartato, 201, nessun 500', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 3 }))

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('codice oggetto → scartato, 201', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: { codice: 'A3' } }))

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('codice di soli spazi → scartato senza nemmeno interrogare il catalogo, 201', async () => {
    const spia = setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: '   ' }))

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
    expect(spia).not.toHaveBeenCalled()
  })

  it('catalogo irraggiungibile → il colore si perde, il lavoro NO', async () => {
    setup({ erroreCatalogo: true })

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 'A3' }))

    expect(res.status).toBe(201)
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })
})

// M2 (revisione pre-merge ondata a) — «si perde il colore, mai il lavoro»
// giustifica il NON far fallire, non il NON dirlo. Fino a qui il POST degradava
// il colore e rispondeva 201 senza una parola: al banco si digita «A3,5» con la
// virgola (tastiera italiana), il lavoro nasce, il colore viene buttato e la
// schermata dice «Fatto!». L'odontotecnico non sa di dover correggere.
//
// 🔴 Il fatto, letto sul catalogo vero il 28/07/2026:
//   node scripts/tmp/sql.mjs "select codice, scala from colori_dentali
//     where codice in ('A3.5','A3,5','A3') order by codice"
//   → [{"codice":"A3","scala":"vita_classical"},
//      {"codice":"A3.5","scala":"vita_classical"}]
//   «A3,5» NON esiste: la virgola al posto del punto perde davvero il colore.
//
// La risposta porta quindi `colore_scartato`, e il wizard lo trasforma in un
// Avviso (v. crea-lavoro.test.ts / FrameFatto.test.tsx). Il campo è SEMPRE
// presente: un consumatore non deve distinguere «false» da «non me l'ha detto».
describe('POST /api/lavori — il colore scartato si DICE (M2)', () => {
  it('«A3,5» (virgola, tastiera italiana) → 201, lavoro creato, colore_scartato: true', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 'A3,5' }))
    const json = await res.json()

    // Prima di tutto: il lavoro c'è. La regola dura non si tocca.
    expect(res.status).toBe(201)
    expect(json.lavoro).toEqual({ id: 'lavoro-1', numero_lavoro: '2026/0042', stato: 'ricevuto' })
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
    // …e adesso lo dice.
    expect(json.colore_scartato).toBe(true)
  })

  it('coppia accoppiata male → colore_scartato: true', async () => {
    setup()

    const res = await POST(
      richiesta({ ...CORPO_BASE, colore_scala: 'vita_3d_master', colore_codice: 'A3' })
    )

    expect((await res.json()).colore_scartato).toBe(true)
  })

  it('catalogo irraggiungibile → colore_scartato: true (il colore è perso davvero)', async () => {
    setup({ erroreCatalogo: true })

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 'A3' }))

    expect((await res.json()).colore_scartato).toBe(true)
  })

  it('codice non-stringa (numero) → colore_scartato: true: qualcosa era stato chiesto', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 3 }))

    expect((await res.json()).colore_scartato).toBe(true)
  })

  // 🛑 L'altra metà, quella che conta di più: MAI un falso allarme. Un avviso che
  // compare quando non serve si impara a ignorare, e allora non avvisa più.
  it('colore riconosciuto → colore_scartato: false', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: 'a3' }))
    const json = await res.json()

    expect(json.lavoro).toEqual({ id: 'lavoro-1', numero_lavoro: '2026/0042', stato: 'ricevuto' })
    expect(json.colore_scartato).toBe(false)
  })

  it('casella «Colore» lasciata vuota (nessuna chiave) → colore_scartato: false', async () => {
    setup()

    const res = await POST(richiesta(CORPO_BASE))

    expect((await res.json()).colore_scartato).toBe(false)
  })

  it('codice di soli spazi → colore_scartato: false (nessun colore chiesto, nessun colore perso)', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: '   ' }))

    expect((await res.json()).colore_scartato).toBe(false)
  })

  it('colore_codice: null → colore_scartato: false («nessun colore», detto esplicitamente)', async () => {
    setup()

    const res = await POST(richiesta({ ...CORPO_BASE, colore_codice: null }))

    expect((await res.json()).colore_scartato).toBe(false)
  })
})

describe('POST /api/lavori — nessun colore, nessun viaggio in più', () => {
  it('senza colore il catalogo non si interroga affatto', async () => {
    const spia = setup()

    const res = await POST(richiesta(CORPO_BASE))

    expect(res.status).toBe(201)
    expect(spia).not.toHaveBeenCalled()
    expect(coloreInviato()).toEqual({ colore_scala: null, colore_codice: null })
  })

  it('il catalogo si interroga UNA volta sola, sul codice normalizzato', async () => {
    const spia = setup()

    await POST(richiesta({ ...CORPO_BASE, colore_codice: 'a3' }))

    expect(spia).toHaveBeenCalledTimes(1)
    expect(spia).toHaveBeenCalledWith('codice', 'A3')
  })
})
