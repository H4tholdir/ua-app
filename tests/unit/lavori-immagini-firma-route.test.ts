// T3 — `POST /api/lavori/[id]/immagini/firma`.
//
// 🔑 CHE COS'È: il server concede al browser il permesso di scrivere UN file in
//    UN percorso, e il file poi va DRITTO al magazzino senza passare dalla
//    funzione. È l'unico modo di superare il tetto della piattaforma (~4,2 MB,
//    misurato in produzione, non comprabile su alcun piano) e di arrivare ai
//    50 MB che il bucket già concede.
//
// 🔒 QUESTA ROTTA È UN CANCELLO. Prima concedeva il permesso la rotta stessa
//    che riceveva i byte: chi non passava i controlli non scriveva niente.
//    Ora il permesso e la scrittura sono separati, quindi OGNI controllo che
//    prima proteggeva l'upload deve proteggere la FIRMA — se un controllo
//    manca qui, non c'è nessun altro posto in cui recuperarlo.
//
// Forme d'ingresso enumerate PRIMA delle asserzioni (R-P4): origine estranea ·
// non autenticato · sessione senza laboratorio · laboratorio non operativo ·
// lavoro di un altro laboratorio · corpo non-JSON · tipo mancante · tipo fuori
// elenco · categoria mancante · categoria fuori elenco · peso mancante · peso
// non numerico · peso oltre il tetto del corridoio diretto · peso al tetto
// esatto · caso buono.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom, mockGetFreshLabContext, mockIsSameOrigin, mockPermesso } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
  mockIsSameOrigin: vi.fn(),
  mockPermesso: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/supabase/lab-context', () => ({ getFreshLabContext: mockGetFreshLabContext }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: mockIsSameOrigin }))
vi.mock('@/lib/storage/caricamento-diretto', () => ({ creaPermessoCaricamento: mockPermesso }))

import { POST } from '@/app/api/lavori/[id]/immagini/firma/route'
import { MAX_UPLOAD_DIRETTO_BYTES } from '@/lib/storage/limite-caricamento'

const LAB_ID = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
const LAVORO_ID = '7dba9a57-15bc-400e-a36f-28440980556f'
const params = Promise.resolve({ id: LAVORO_ID })

const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function richiesta(corpo: unknown): Request {
  return { json: async () => corpo } as unknown as Request
}
function richiestaCorpoRotto(): Request {
  return { json: async () => { throw new SyntaxError('Unexpected token') } } as unknown as Request
}

const corpoBuono = {
  tipo: 'image/jpeg',
  categoria: 'impronta',
  byte: 12 * 1024 * 1024,   // 12MB: impossibile dal corridoio vecchio, normale da questo
}

/** `.from()` serve per il lavoro (appartenenza) e per il conteggio del limite
 *  di frequenza su `lavori_immagini`. */
function mockFirma(opts: { lavoro?: { data: unknown; error: unknown }; quante?: number } = {}) {
  const lavoro = opts.lavoro ?? { data: { id: LAVORO_ID }, error: null }
  const lavoroChain = createChain(lavoro)
  // `createChain` tipizza il risultato come `{data, error}`; il conteggio
  // (`select(…, {count:'exact', head:true})`) risolve un oggetto che porta
  // anche `count`. Il cast dice esattamente questo, e niente di più.
  const conteggioChain = createChain(
    { data: null, error: null, count: opts.quante ?? 0 } as unknown as { data: unknown; error: unknown }
  )
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') return lavoroChain
    if (table === 'lavori_immagini') return conteggioChain
    throw new Error(`tabella inattesa: ${table}`)
  })
  return { lavoroChain, conteggioChain }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  mockIsSameOrigin.mockReturnValue(true)
  mockPermesso.mockImplementation(async (_svc: unknown, _bucket: string, percorso: string) => ({
    percorso, gettone: 'gettone-finto',
  }))
})

describe('POST …/immagini/firma — il cancello', () => {
  it('origine estranea → 403, e NESSUN permesso concesso', async () => {
    mockFirma()
    mockIsSameOrigin.mockReturnValue(false)
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(403)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it('non autenticato → 401, nessun permesso', async () => {
    mockFirma()
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(401)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it('sessione senza laboratorio → 403, nessun permesso', async () => {
    mockFirma()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(403)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it('laboratorio sospeso → il guard risponde, nessun permesso', async () => {
    mockFirma()
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab Test' },
    })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it('lavoro di un ALTRO laboratorio (o inesistente) → 404, nessun permesso', async () => {
    mockFirma({ lavoro: { data: null, error: null } })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(404)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it('corpo non-JSON → 400, nessun permesso', async () => {
    mockFirma()
    const res = await POST(richiestaCorpoRotto(), { params })
    expect(res.status).toBe(400)
    expect(mockPermesso).not.toHaveBeenCalled()
  })
})

describe('POST …/immagini/firma — che cosa si dichiara', () => {
  it.each([
    ['tipo mancante', { categoria: 'impronta', byte: 1000 }],
    ['tipo fuori elenco (TIFF)', { tipo: 'image/tiff', categoria: 'impronta', byte: 1000 }],
    ['tipo non stringa', { tipo: 42, categoria: 'impronta', byte: 1000 }],
  ])('%s → 415, nessun permesso', async (_n, corpo) => {
    mockFirma()
    const res = await POST(richiesta(corpo), { params })
    expect(res.status).toBe(415)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it.each([
    ['categoria mancante', { tipo: 'image/jpeg', byte: 1000 }],
    ['categoria fuori elenco', { tipo: 'image/jpeg', categoria: 'pippo', byte: 1000 }],
  ])('%s → 422, nessun permesso', async (_n, corpo) => {
    mockFirma()
    const res = await POST(richiesta(corpo), { params })
    expect(res.status).toBe(422)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it.each([
    ['peso mancante', { tipo: 'image/jpeg', categoria: 'impronta' }],
    ['peso non numerico', { tipo: 'image/jpeg', categoria: 'impronta', byte: 'tanti' }],
    ['peso zero', { tipo: 'image/jpeg', categoria: 'impronta', byte: 0 }],
    ['peso negativo', { tipo: 'image/jpeg', categoria: 'impronta', byte: -1 }],
  ])('%s → 400, nessun permesso', async (_n, corpo) => {
    mockFirma()
    const res = await POST(richiesta(corpo), { params })
    expect(res.status).toBe(400)
    expect(mockPermesso).not.toHaveBeenCalled()
  })

  it('peso OLTRE il tetto del corridoio diretto → 413, nessun permesso', async () => {
    mockFirma()
    const res = await POST(
      richiesta({ ...corpoBuono, byte: MAX_UPLOAD_DIRETTO_BYTES + 1 }), { params }
    )
    expect(res.status).toBe(413)
    expect(mockPermesso).not.toHaveBeenCalled()
    // 🔑 Il rifiuto arriva PRIMA di spendere un byte: se aspettassimo il
    //    magazzino, l'utente avrebbe caricato 50 MB su rete mobile per sentirsi
    //    dire di no alla fine.
  })

  it('peso AL tetto esatto → passa: il confronto è «maggiore di», non «maggiore o uguale»', async () => {
    mockFirma()
    const res = await POST(richiesta({ ...corpoBuono, byte: MAX_UPLOAD_DIRETTO_BYTES }), { params })
    expect(res.status).toBe(200)
  })

  it('🛑 il peso dichiarato NON è una prova: la conferma rileggerà quello vero', async () => {
    // Qui si documenta il confine. Il peso serve a dire no SUBITO su un file
    // palesemente fuori misura; ma un client può dichiarare 1 KB e caricarne
    // 40 MB, e il bucket lo accetterebbe. Chi legge il peso VERO è la conferma
    // (condizione C2), non questa rotta.
    mockFirma()
    const res = await POST(richiesta({ ...corpoBuono, byte: 1024 }), { params })
    expect(res.status).toBe(200)
  })
})

describe('POST …/immagini/firma — il percorso lo decide il SERVER', () => {
  it('il permesso è per `<laboratorio>/lavori/<lavoro>/<uuid>.<ext>`', async () => {
    mockFirma()
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(200)

    const percorso = mockPermesso.mock.calls[0][2] as string
    expect(percorso).toMatch(
      new RegExp(`^${LAB_ID}/lavori/${LAVORO_ID}/[0-9a-f-]{36}\\.jpg$`)
    )
  })

  it('🔒 un percorso mandato DAL CLIENT viene ignorato — non è nemmeno un ingresso', async () => {
    mockFirma()
    await POST(
      richiesta({ ...corpoBuono, percorso: 'altro-lab/ddc/2026/DDC-2026-0002.pdf' }), { params }
    )
    const percorso = mockPermesso.mock.calls[0][2] as string
    expect(percorso.startsWith(`${LAB_ID}/`)).toBe(true)
    expect(percorso).not.toContain('altro-lab')
    expect(percorso).not.toContain('DDC')
  })

  it('la risposta porta percorso e gettone, e il percorso è quello firmato', async () => {
    mockFirma()
    const res = await POST(richiesta(corpoBuono), { params })
    const corpo = await res.json()
    expect(typeof corpo.percorso).toBe('string')
    expect(corpo.gettone).toBe('gettone-finto')
    expect(corpo.percorso).toBe(mockPermesso.mock.calls[0][2])
  })

  it('l\'estensione segue il TIPO dichiarato, non il nome del file', async () => {
    mockFirma()
    await POST(richiesta({ ...corpoBuono, tipo: 'application/pdf' }), { params })
    expect(mockPermesso.mock.calls[0][2] as string).toMatch(/\.pdf$/)
  })
})

describe('POST …/immagini/firma — il limite di frequenza', () => {
  it('sotto la soglia: si firma', async () => {
    mockFirma({ quante: 10 })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(200)
  })

  it('oltre la soglia → 429, e nessun permesso concesso', async () => {
    // 🔑 Perché serve proprio qui: prima un caricamento costava all'attaccante
    //    un'invocazione e valeva 4 MB; adesso una richiesta da poche centinaia
    //    di byte autorizza fino a 50 MB scritti diretti.
    mockFirma({ quante: 500 })
    const res = await POST(richiesta(corpoBuono), { params })
    expect(res.status).toBe(429)
    expect(mockPermesso).not.toHaveBeenCalled()
  })
})
