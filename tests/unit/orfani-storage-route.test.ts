// T6 — `POST /api/internal/orfani-storage`: il mietitore dei file senza riga.
//
// 🔑 PERCHÉ NON È IGIENE. Col caricamento diretto il file atterra PRIMA della
//    riga: se la conferma non arriva (rete persa, scheda chiusa, ascensore)
//    resta un file che l'applicazione non sa di avere. E `DpaTemplate.tsx`
//    dichiara ai clienti che le immagini di lavorazione «sono conservate per il
//    solo tempo necessario alla lavorazione»: la cancellazione parte SEMPRE
//    dalla riga, quindi un file che nessuna riga nomina non lo cancella
//    nessuno, mai. È una promessa scritta che senza questo mietitore il sistema
//    non può mantenere.
//
// 🛑 UN MIETITORE È CODICE CHE CANCELLA: ogni prova qui sotto guarda cosa NON
//    tocca, non solo cosa toglie.
//
// Forme d'ingresso (R-P4): segreto non configurato · nessun segreto ·
// segreto sbagliato · segreto di lunghezza diversa · Bearer · x-internal-secret
// · file nominato da una riga · file orfano ma GIOVANE · file orfano e vecchio
// · file senza data · lettura del magazzino fallita · lettura delle righe
// fallita · niente da fare.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFrom, mockList, mockRemove } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockList: vi.fn(),
  mockRemove: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ list: mockList, remove: mockRemove }) },
  }),
}))

import { POST } from '@/app/api/internal/orfani-storage/route'

const SEGRETO = 'segreto-di-prova-molto-lungo'
const LAB = '971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c'
const LAVORO = '7dba9a57-15bc-400e-a36f-28440980556f'

const oreFa = (n: number) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString()

function richiesta(headers: Record<string, string> = {}): Request {
  return { headers: new Headers(headers) } as unknown as Request
}
const conSegreto = () => richiesta({ authorization: `Bearer ${SEGRETO}` })

/** Il magazzino finto: radice → lavori → file. */
function magazzino(files: Array<{ nome: string; creato: string | null }>) {
  mockList.mockImplementation(async (prefisso: string) => {
    if (prefisso === '') return { data: [{ name: LAB }], error: null }
    if (prefisso === `${LAB}/lavori`) return { data: [{ name: LAVORO }], error: null }
    if (prefisso === `${LAB}/lavori/${LAVORO}`) {
      return { data: files.map((f) => ({ name: f.nome, created_at: f.creato })), error: null }
    }
    return { data: [], error: null }
  })
}

function righe(percorsi: string[]) {
  mockFrom.mockImplementation(() => ({
    select: async () => ({ data: percorsi.map((p) => ({ storage_path: p })), error: null }),
  }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('CRON_SECRET', SEGRETO)
  mockRemove.mockResolvedValue({ data: [], error: null })
  righe([])
  magazzino([])
})
afterEach(() => {
  vi.unstubAllEnvs()
})

describe('mietitore — la serratura', () => {
  it('🛑 segreto NON configurato → 503, e non tocca NIENTE (mai una porta socchiusa)', async () => {
    vi.stubEnv('CRON_SECRET', '')
    const res = await POST(conSegreto())
    expect(res.status).toBe(503)
    expect(mockList).not.toHaveBeenCalled()
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it.each([
    ['nessuna intestazione', {}],
    ['segreto sbagliato, stessa lunghezza', { authorization: `Bearer ${'x'.repeat(SEGRETO.length)}` }],
    ['segreto di lunghezza diversa', { authorization: 'Bearer corto' }],
    ['segreto nel posto sbagliato', { 'x-qualcosa': SEGRETO }],
  ])('%s → 401, niente viene toccato', async (_n, headers) => {
    const res = await POST(richiesta(headers))
    expect(res.status).toBe(401)
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('accetta anche `x-internal-secret` (la forma già in casa)', async () => {
    const res = await POST(richiesta({ 'x-internal-secret': SEGRETO }))
    expect(res.status).toBe(200)
  })
})

describe('mietitore — che cosa NON tocca', () => {
  it('un file NOMINATO da una riga non si tocca, per quanto vecchio sia', async () => {
    magazzino([{ nome: 'vecchio.jpg', creato: oreFa(24 * 365) }])
    righe([`${LAB}/lavori/${LAVORO}/vecchio.jpg`])

    const res = await POST(conSegreto())
    const corpo = await res.json()
    expect(mockRemove).not.toHaveBeenCalled()
    expect(corpo).toMatchObject({ esaminati: 1, tolti: 0 })
  })

  it('🛑 un orfano GIOVANE non si tocca: potrebbe essere un caricamento in corso', async () => {
    // Il permesso di caricamento dura 2 ORE (misurato): un file può atterrare
    // fino a due ore dopo la firma. Cancellare un file giovane vorrebbe dire
    // cancellare il lavoro di qualcuno mentre lo sta facendo.
    magazzino([{ nome: 'appena-arrivato.jpg', creato: oreFa(3) }])
    righe([])

    const res = await POST(conSegreto())
    const corpo = await res.json()
    expect(mockRemove).not.toHaveBeenCalled()
    expect(corpo).toMatchObject({ tolti: 0, ancoraGiovani: 1 })
  })

  it('un file SENZA data non si tocca: l\'ignoto si lascia stare, non si mangia', async () => {
    magazzino([{ nome: 'senza-data.jpg', creato: null }])
    righe([])

    await POST(conSegreto())
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('🛑 FAIL-CLOSED: se la lettura delle righe fallisce NON si cancella niente', async () => {
    // Senza sapere quali file sono nominati, ogni file sembra orfano. Cancellare
    // in dubbio è irreversibile: si preferisce non fare niente e dirlo.
    magazzino([{ nome: 'a.jpg', creato: oreFa(100) }])
    mockFrom.mockImplementation(() => ({
      select: async () => ({ data: null, error: { message: 'connessione persa' } }),
    }))

    const res = await POST(conSegreto())
    expect(res.status).toBe(500)
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('se la lettura del magazzino fallisce → 500, nessuna cancellazione', async () => {
    mockList.mockResolvedValue({ data: null, error: { message: 'magazzino irraggiungibile' } })
    const res = await POST(conSegreto())
    expect(res.status).toBe(500)
    expect(mockRemove).not.toHaveBeenCalled()
  })
})

describe('mietitore — che cosa toglie', () => {
  it('un orfano più vecchio della finestra si toglie, e si dice quale', async () => {
    magazzino([{ nome: 'abbandonato.jpg', creato: oreFa(30) }])
    righe([])

    const res = await POST(conSegreto())
    const corpo = await res.json()

    expect(mockRemove).toHaveBeenCalledWith([`${LAB}/lavori/${LAVORO}/abbandonato.jpg`])
    expect(corpo).toMatchObject({ esaminati: 1, tolti: 1, ancoraGiovani: 0 })
  })

  it('fra quattro file toglie SOLO quello che è insieme orfano e vecchio', async () => {
    magazzino([
      { nome: 'con-riga.jpg', creato: oreFa(50) },
      { nome: 'orfano-giovane.jpg', creato: oreFa(2) },
      { nome: 'orfano-vecchio.jpg', creato: oreFa(50) },
      { nome: 'senza-data.jpg', creato: null },
    ])
    righe([`${LAB}/lavori/${LAVORO}/con-riga.jpg`])

    const res = await POST(conSegreto())
    const corpo = await res.json()

    expect(mockRemove).toHaveBeenCalledTimes(1)
    expect(mockRemove).toHaveBeenCalledWith([`${LAB}/lavori/${LAVORO}/orfano-vecchio.jpg`])
    expect(corpo).toMatchObject({ tolti: 1, ancoraGiovani: 1 })
  })

  it('niente da togliere → non chiama nemmeno la rimozione', async () => {
    magazzino([{ nome: 'con-riga.jpg', creato: oreFa(50) }])
    righe([`${LAB}/lavori/${LAVORO}/con-riga.jpg`])

    const res = await POST(conSegreto())
    expect(res.status).toBe(200)
    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('la rimozione fallisce → 500, e lo dice invece di rispondere «fatto»', async () => {
    magazzino([{ nome: 'abbandonato.jpg', creato: oreFa(30) }])
    righe([])
    mockRemove.mockResolvedValue({ data: null, error: { message: 'permesso negato' } })

    const res = await POST(conSegreto())
    expect(res.status).toBe(500)
  })
})
