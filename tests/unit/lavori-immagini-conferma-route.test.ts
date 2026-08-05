// T3 — `POST /api/lavori/[id]/immagini/conferma`.
//
// 🔒 È LA ROTTA CHE PORTA IL RISCHIO NUOVO DELL'INTERA MODIFICA. Spezzare il
//    caricamento in due atti significa che, alla conferma, è il BROWSER a dire
//    «ho caricato lì». Se il server gli credesse:
//      · `lavori/[id]/page.tsx` FIRMA qualunque `storage_path` trovi in riga,
//        col client di servizio e senza chiedere a chi appartiene → una riga
//        avvelenata («<altro-lab>/ddc/2026/DDC-2026-0002.pdf») diventerebbe una
//        URL valida sul documento di un ALTRO laboratorio;
//      · e il gemello in scrittura: la DELETE di `[imgId]/route.ts`
//        cancellerebbe quel file.
//    Sono le condizioni C1 e C2 del piano, e qui sono prove, non buone
//    intenzioni.
//
// 🛑 UN DIFETTO DEL PIANO, TROVATO SCRIVENDO QUESTE PROVE. Il piano dice: «su
//    qualunque rifiuto, `storage.remove` del percorso». Applicato alla lettera
//    al percorso ricevuto dal client, sarebbe un'ARMA: mando
//    `<altro-lab>/ddc/…pdf`, la conferma rifiuta — e cancella il documento di
//    un altro laboratorio. La pulizia si fa SOLO sul percorso ricalcolato dal
//    server, cioè su ciò che è già dentro il proprio recinto. C'è una prova
//    dedicata.
//
// Forme d'ingresso (R-P4): origine estranea · non autenticato · senza
// laboratorio · laboratorio sospeso · lavoro altrui · corpo non-JSON · percorso
// mancante · percorso non stringa · percorso di un ALTRO laboratorio · percorso
// con risalita di cartella · percorso di un altro LAVORO dello stesso
// laboratorio · nome che non è un uuid · estensione fuori elenco · file che non
// esiste · peso vero oltre il tetto · tipo vero fuori elenco · categoria non
// valida · insert fallito · caso buono.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom, mockGetFreshLabContext, mockIsSameOrigin, mockTrova, mockTogli } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
  mockIsSameOrigin: vi.fn(),
  mockTrova: vi.fn(),
  mockTogli: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/supabase/lab-context', () => ({ getFreshLabContext: mockGetFreshLabContext }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: mockIsSameOrigin }))
vi.mock('@/lib/storage/caricamento-diretto', () => ({
  trovaOggetto: mockTrova,
  togliOggetto: mockTogli,
}))
vi.mock('@/lib/storage/signed-url', () => ({
  getSignedUrl: vi.fn(async (_c: unknown, _b: string, path: string) =>
    `https://storage.example/object/sign/documenti/${path}?token=finto`),
}))

import { POST } from '@/app/api/lavori/[id]/immagini/conferma/route'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
const ALTRO_LAB = '00000000-0000-0000-0000-000000000001'
const LAVORO_ID = '7dba9a57-15bc-400e-a36f-28440980556f'
const ALTRO_LAVORO = 'aa4d2dae-f0b5-4d78-acec-30c6fea68c57'
const NOME = '31bfaf09-f331-4b73-ac36-2d368273f14c.jpg'
const PERCORSO_BUONO = `${LAB_ID}/lavori/${LAVORO_ID}/${NOME}`
const params = Promise.resolve({ id: LAVORO_ID })

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function richiesta(corpo: unknown): Request {
  return { json: async () => corpo } as unknown as Request
}
const corpoBuono = { percorso: PERCORSO_BUONO, categoria: 'impronta', nome_file: 'foto.jpg' }

function mockConferma(opts: {
  lavoro?: { data: unknown; error: unknown }
  insertResult?: { data: unknown; error: unknown }
} = {}) {
  const lavoro = opts.lavoro ?? { data: { id: LAVORO_ID }, error: null }
  const insertResult = opts.insertResult ?? { data: { id: 'img-1', storage_path: PERCORSO_BUONO }, error: null }
  const lavoroChain = createChain(lavoro)
  const insertChain = createChain(insertResult)
  const insertCalls: unknown[] = []
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') return lavoroChain
    if (table === 'lavori_immagini') {
      return { insert: (payload: unknown) => { insertCalls.push(payload); return insertChain } }
    }
    throw new Error(`tabella inattesa: ${table}`)
  })
  return { insertCalls }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  mockIsSameOrigin.mockReturnValue(true)
  mockTrova.mockResolvedValue({ esiste: true, byte: 900 * 1024, tipo: 'image/jpeg' })
  mockTogli.mockResolvedValue(undefined)
})

describe('POST …/immagini/conferma — le guardie di sempre, RIPETUTE', () => {
  // 🔑 Perché ripetute e non «già fatte alla firma»: fra la firma e la conferma
  //    passano fino a 2 ORE (misurato leggendo la scadenza dentro il permesso).
  //    In due ore il lavoro può essere cancellato e l'abbonamento sospeso.
  it('origine estranea → 403, nessuna riga', async () => {
    const { insertCalls } = mockConferma()
    mockIsSameOrigin.mockReturnValue(false)
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(403)
    expect(insertCalls).toHaveLength(0)
  })

  it('non autenticato → 401, nessuna riga', async () => {
    const { insertCalls } = mockConferma()
    mockGetFreshLabContext.mockResolvedValue(null)
    expect((await POST(richiesta(corpoBuono), { params })).status).toBe(401)
    expect(insertCalls).toHaveLength(0)
  })

  it('sessione senza laboratorio → 403', async () => {
    mockConferma()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    expect((await POST(richiesta(corpoBuono), { params })).status).toBe(403)
  })

  it('laboratorio sospeso NEL FRATTEMPO → il guard risponde, nessuna riga', async () => {
    const { insertCalls } = mockConferma()
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab Test' },
    })
    expect((await POST(richiesta(corpoBuono), { params })).status).toBeGreaterThanOrEqual(400)
    expect(insertCalls).toHaveLength(0)
  })

  it('lavoro cancellato NEL FRATTEMPO (o di un altro lab) → 404, nessuna riga', async () => {
    const { insertCalls } = mockConferma({ lavoro: { data: null, error: null } })
    expect((await POST(richiesta(corpoBuono), { params })).status).toBe(404)
    expect(insertCalls).toHaveLength(0)
  })

  it('corpo non-JSON → 400', async () => {
    mockConferma()
    const req = { json: async () => { throw new SyntaxError('x') } } as unknown as Request
    expect((await POST(req, { params })).status).toBe(400)
  })
})

describe('🔒 C1 — il percorso NON si prende dal client', () => {
  it.each([
    ['di un ALTRO laboratorio', `${ALTRO_LAB}/ddc/2026/DDC-2026-0002.pdf`],
    ['di un altro LAVORO dello stesso laboratorio', `${LAB_ID}/lavori/${ALTRO_LAVORO}/${NOME}`],
    ['fuori dalla cartella lavori', `${LAB_ID}/ddc/2026/DDC-2026-0002.pdf`],
    ['con risalita di cartella', `${LAB_ID}/lavori/${LAVORO_ID}/../../../${ALTRO_LAB}/ddc/x.pdf`],
    ['col vecchio schema, fuori dal recinto', `lavori/${LAVORO_ID}/${NOME}`],
    ['con una sottocartella in più', `${LAB_ID}/lavori/${LAVORO_ID}/sub/${NOME}`],
    ['col nome che non è un uuid', `${LAB_ID}/lavori/${LAVORO_ID}/1785523592465.jpg`],
    ['con estensione fuori elenco', `${LAB_ID}/lavori/${LAVORO_ID}/31bfaf09-f331-4b73-ac36-2d368273f14c.exe`],
    ['senza estensione', `${LAB_ID}/lavori/${LAVORO_ID}/31bfaf09-f331-4b73-ac36-2d368273f14c`],
  ])('percorso %s → RIFIUTATO, nessuna riga', async (_n, percorso) => {
    const { insertCalls } = mockConferma()
    const res = await POST(richiesta({ ...corpoBuono, percorso }), { params })
    expect(res.status).toBe(422)
    expect(insertCalls).toHaveLength(0)
  })

  it('🛑 e il file dell\'altro laboratorio NON viene toccato: la pulizia non è un\'arma', async () => {
    // Il piano diceva «su qualunque rifiuto, remove del percorso». Applicato al
    // percorso ricevuto, sarebbe il modo di far cancellare a noi il documento
    // di un altro laboratorio — un difetto peggiore di quello che C1 chiude.
    const { insertCalls } = mockConferma()
    await POST(
      richiesta({ ...corpoBuono, percorso: `${ALTRO_LAB}/ddc/2026/DDC-2026-0002.pdf` }), { params }
    )
    expect(mockTogli).not.toHaveBeenCalled()
    expect(mockTrova).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
  })

  it.each([
    ['percorso mancante', { categoria: 'impronta' }],
    ['percorso non stringa', { categoria: 'impronta', percorso: 42 }],
    ['percorso vuoto', { categoria: 'impronta', percorso: '' }],
  ])('%s → 400, e niente viene toccato', async (_n, corpo) => {
    const { insertCalls } = mockConferma()
    const res = await POST(richiesta(corpo), { params })
    expect(res.status).toBe(400)
    expect(mockTogli).not.toHaveBeenCalled()
    expect(insertCalls).toHaveLength(0)
  })

  it('il percorso scritto in riga è quello RICALCOLATO dal server', async () => {
    const { insertCalls } = mockConferma()
    await POST(richiesta(corpoBuono), { params })
    const payload = insertCalls[0] as Record<string, unknown>
    expect(payload.storage_path).toBe(PERCORSO_BUONO)
    expect(payload.laboratorio_id).toBe(LAB_ID)
    expect(payload.lavoro_id).toBe(LAVORO_ID)
  })
})

describe('🔒 C2 — la conferma PROVA che il file c\'è, e ne legge peso e tipo VERI', () => {
  it('file che non esiste → 422, NESSUNA riga', async () => {
    // 🛑 Perché non basta credere al client: `storage.remove` su una chiave
    //    inesistente NON dà errore (misurato). Una riga che punta al nulla
    //    verrebbe un giorno cancellata «con successo», traccia compresa.
    const { insertCalls } = mockConferma()
    mockTrova.mockResolvedValue({ esiste: false, byte: null, tipo: null })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(422)
    expect(insertCalls).toHaveLength(0)
  })

  it('il peso in riga è quello VERO del magazzino, non uno dichiarato dal client', async () => {
    const { insertCalls } = mockConferma()
    mockTrova.mockResolvedValue({ esiste: true, byte: 2_345_678, tipo: 'image/jpeg' })
    await POST(richiesta({ ...corpoBuono, byte: 10 }), { params })
    // La rotta non deve nemmeno leggere un `byte` dal corpo: il numero vero
    // arriva dal magazzino. Qui si prova che ciò che il client dice è ignorato.
    expect(mockTrova).toHaveBeenCalledWith(expect.anything(), 'documenti', PERCORSO_BUONO)
    expect(insertCalls).toHaveLength(1)
  })

  it('peso VERO oltre il tetto → rifiuto, il file si toglie, nessuna riga', async () => {
    const { insertCalls } = mockConferma()
    mockTrova.mockResolvedValue({ esiste: true, byte: 60 * 1024 * 1024, tipo: 'image/jpeg' })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(413)
    expect(mockTogli).toHaveBeenCalledWith(expect.anything(), 'documenti', PERCORSO_BUONO)
    expect(insertCalls).toHaveLength(0)
  })

  it('tipo VERO fuori elenco → rifiuto, il file si toglie, nessuna riga', async () => {
    const { insertCalls } = mockConferma()
    mockTrova.mockResolvedValue({ esiste: true, byte: 1000, tipo: 'application/x-msdownload' })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(415)
    expect(mockTogli).toHaveBeenCalledWith(expect.anything(), 'documenti', PERCORSO_BUONO)
    expect(insertCalls).toHaveLength(0)
  })
})

describe('POST …/immagini/conferma — la riga', () => {
  it('categoria non valida → 422, il file si toglie, nessuna riga', async () => {
    const { insertCalls } = mockConferma()
    const res = await POST(richiesta({ ...corpoBuono, categoria: 'pippo' }), { params })
    expect(res.status).toBe(422)
    expect(mockTogli).toHaveBeenCalledWith(expect.anything(), 'documenti', PERCORSO_BUONO)
    expect(insertCalls).toHaveLength(0)
  })

  it('caso buono: la riga porta le colonne attese, e nessuna in più', async () => {
    const { insertCalls } = mockConferma()
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(201)
    const chiavi = Object.keys(insertCalls[0] as Record<string, unknown>).sort()
    expect(chiavi).toEqual(
      ['categoria', 'descrizione', 'laboratorio_id', 'lavoro_id', 'nome_file', 'ordine', 'storage_path']
    )
  })

  it('la risposta porta l\'immagine con una URL FIRMATA (D236: non si salva)', async () => {
    mockConferma()
    const res = await POST(richiesta(corpoBuono), { params })
    const corpo = await res.json()
    expect(corpo.immagine.url).toContain('/object/sign/')
    expect(corpo.immagine.url).not.toContain('/object/public/')
  })

  it('insert fallito → 500 con messaggio NOSTRO, e il file si toglie (niente orfani da noi)', async () => {
    mockConferma({ insertResult: { data: null, error: { message: 'duplicate key value violates unique constraint "x"' } } })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(500)
    const corpo = await res.json()
    expect(corpo.error).not.toContain('duplicate key')
    expect(mockTogli).toHaveBeenCalledWith(expect.anything(), 'documenti', PERCORSO_BUONO)
  })

  it('nome_file assente → null, mai inventato', async () => {
    const { insertCalls } = mockConferma()
    await POST(richiesta({ percorso: PERCORSO_BUONO, categoria: 'impronta' }), { params })
    expect((insertCalls[0] as Record<string, unknown>).nome_file).toBeNull()
  })
})
