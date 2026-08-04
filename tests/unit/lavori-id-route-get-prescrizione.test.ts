import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

// Task 6 (ondata B, sessione ③) — la lettura per la scheda (server).
//
// PERCHÉ UN FILE NUOVO E NON UN'AGGIUNTA a `lavori-id-route.test.ts`.
// Quel file testa SOLO `PATCH` (nessun `import { GET }` in tutto il repo,
// censito prima di scrivere questo file): il nome generico avrebbe nascosto
// che il GET non aveva ancora nessuna prova. `tests/unit/prescrizione-mapper.test.ts`
// prova la funzione pura `normalizzaPrescrizione` in isolamento; QUESTO file
// prova che la route la usi davvero — una funzione di mapping scritta ma mai
// collegata è la stessa classe di difetto silenzioso di un campo tolto da
// un'allowlist senza destinazione (R-P6).
//
// 🛑 IL FINTO È GRASSO. La riga finta di `lavori` porta molte più colonne di
// quelle strettamente necessarie a QUESTI test (stesso principio di
// `api-pazienti-get-ricerca.test.ts:14-22`): con una riga magra, un domani un
// refactor della route potrebbe smettere di restituire `lavoro` per intero e
// questi test resterebbero verdi senza accorgersene.
//
// 📏 R-P4 — MISURA CON L'ABBOZZO INERTE.
// Abbozzo: si commenta la riga `lavoro.prescrizione =
// normalizzaPrescrizione(lavoro.prescrizione)` in
// `src/app/api/lavori/[id]/route.ts` (la route torna a restituire la forma
// grezza dell'embed, esattamente come prima del Task 6).
// Comando: `npx vitest run tests/unit/lavori-id-route-get-prescrizione.test.ts`
// Esito misurato il 04/08/2026: **3 rosse su 5**. Le due verdi a vuoto sono
// legittime: sono i due casi (senza embed nel select-mock, e senza campo
// affatto) in cui l'abbozzo e l'implementazione vera producono lo stesso
// risultato per costruzione — non provano la normalizzazione, provano solo
// che la route non esplode. Le tre rosse sono la prova vera: l'array con un
// elemento va spacchettato, l'array vuoto sparisce dalla risposta JSON, e il
// select deve nominare esplicitamente l'embed.

const { mockGetLabContextWithTimings } = vi.hoisted(() => ({
  mockGetLabContextWithTimings: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: vi.fn(),
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/lavori/[id]/route'

const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'
const CONTEXT = {
  userId: 'user-1',
  email: null,
  ruolo: 'titolare',
  laboratorioId: LAB_ID,
  nome: null,
  cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const params = Promise.resolve({ id: LAVORO_ID })

const RIGA_LAVORO_BASE = {
  id: LAVORO_ID,
  laboratorio_id: LAB_ID,
  numero_lavoro: '2026/0001',
  stato: 'in_lavorazione',
  tipo_dispositivo: 'corona',
  descrizione: 'Corona ceramica 14',
  cliente: { id: 'cli-1', nome: 'Studio Rossi' },
  paziente: null,
  tecnico: null,
  lavorazioni: [],
  appuntamenti: [],
  immagini: [],
  fasi: [],
  materiali: [],
  ddc: null,
  denti: [],
}

const RIGA_PRESCRIZIONE = {
  id: 'presc-1',
  laboratorio_id: LAB_ID,
  lavoro_id: LAVORO_ID,
  contenuto: { elementi: [14], colore: 'A3' },
  divergenze: [],
  fonte_tipo: 'foglio',
  fonte_immagine_id: null,
  fonte_riferimento: 'foglio in cartella',
  numero_prescrizione: 'P-2026-001',
  confermata_da: null,
  confermata_at: null,
  created_at: '2026-08-04T09:00:00Z',
  updated_at: '2026-08-04T09:00:00Z',
}

function mockLavoriFrom(prescrizioneRaw: unknown) {
  return vi.fn((table: string) => {
    if (table === 'lavori') {
      return createChain({
        data: { ...RIGA_LAVORO_BASE, prescrizione: prescrizioneRaw },
        error: null,
      })
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('GET /api/lavori/[id] — embed lavori_prescrizioni (Task 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: {} })
  })

  it('il select nomina esplicitamente l\'embed prescrizione:lavori_prescrizioni(*)', async () => {
    const from = mockLavoriFrom([RIGA_PRESCRIZIONE])
    mockFrom.mockImplementation(from)

    await GET(new Request(`http://localhost/api/lavori/${LAVORO_ID}`), { params })

    const chain = from.mock.results[0].value as ReturnType<typeof createChain>
    const selectCall = chain.calls.find((c) => c.method === 'select')
    expect(selectCall).toBeDefined()
    expect(String(selectCall!.args[0])).toContain('prescrizione:lavori_prescrizioni(*)')
  })

  it('riga presente come array (forma REALE PostgREST, isOneToOne:false) → lavoro.prescrizione è un oggetto singolo normalizzato', async () => {
    mockFrom.mockImplementation(mockLavoriFrom([RIGA_PRESCRIZIONE]))

    const res = await GET(new Request(`http://localhost/api/lavori/${LAVORO_ID}`), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.lavoro.prescrizione)).toBe(false)
    expect(body.lavoro.prescrizione).toMatchObject({
      id: 'presc-1',
      numero_prescrizione: 'P-2026-001',
      fonte_tipo: 'foglio',
    })
  })

  it('array vuoto (nessuna trascrizione per questo lavoro) → prescrizione assente dal JSON di risposta', async () => {
    mockFrom.mockImplementation(mockLavoriFrom([]))

    const res = await GET(new Request(`http://localhost/api/lavori/${LAVORO_ID}`), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect('prescrizione' in body.lavoro).toBe(false)
  })

  it('null (imbarazzo ipotetico se PostgREST lo trattasse one-to-one) → prescrizione assente dal JSON', async () => {
    mockFrom.mockImplementation(mockLavoriFrom(null))

    const res = await GET(new Request(`http://localhost/api/lavori/${LAVORO_ID}`), { params })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect('prescrizione' in body.lavoro).toBe(false)
  })

  it('resto della risposta (numero_lavoro, descrizione) resta intatto — la normalizzazione tocca solo prescrizione', async () => {
    mockFrom.mockImplementation(mockLavoriFrom([RIGA_PRESCRIZIONE]))

    const res = await GET(new Request(`http://localhost/api/lavori/${LAVORO_ID}`), { params })
    const body = await res.json()

    expect(body.lavoro.numero_lavoro).toBe('2026/0001')
    expect(body.lavoro.descrizione).toBe('Corona ceramica 14')
  })
})
