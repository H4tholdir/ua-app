import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetLabContextWithTimings, mockFrom, mockGenerate } = vi.hoisted(() => ({
  mockGetLabContextWithTimings: vi.fn(),
  mockFrom: vi.fn(),
  mockGenerate: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/pdf/generate-scheda-fabbricazione', () => ({
  generateSchedaFabbricazione: mockGenerate,
}))

import { GET } from '../../src/app/api/lavori/[id]/scheda-fabbricazione/route'

const LAB_ID = 'lab-1'
const LAVORO_ID = 'lav-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: null,
}
const TIMINGS = { authMs: 1, dbMs: 2 }

function mockUtenteELavoro(lavoroResult: { data: unknown; error: unknown }) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'is']
      for (const m of methods) chain[m] = () => chain
      chain.single = async () => lavoroResult
      return chain
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/lavori/[id]/scheda-fabbricazione', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: TIMINGS })
  })

  // DEVIAZIONE DICHIARATA (spec R2 Task 9): "non autenticato" (401) e "utente
  // senza laboratorio/soft-deleted" (404 "utente non trovato") collassano
  // entrambi su context null → 401 (getLabContext fail-closed).
  it('context null (non autenticato / utente non trovato) → 401', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: null, timings: { authMs: 1, dbMs: 0 } })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(401)
  })

  it('lavoro non trovato o di un altro lab → 404', async () => {
    mockUtenteELavoro({ data: null, error: null })

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(404)
  })

  it('lavoro trovato → 200, Content-Type application/pdf, Content-Disposition con numero lavoro', async () => {
    mockUtenteELavoro({ data: { id: LAVORO_ID, numero_lavoro: 'LAV-2026-0007' }, error: null })
    mockGenerate.mockResolvedValue(Buffer.from('finto-pdf'))

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/pdf')
    expect(res.headers.get('Content-Disposition')).toContain('LAV-2026-0007')
    expect(mockGenerate).toHaveBeenCalledWith(LAVORO_ID, LAB_ID)
  })

  it('errore nella generazione del PDF → 500, messaggio generico (nessun leak errore grezzo)', async () => {
    mockUtenteELavoro({ data: { id: LAVORO_ID, numero_lavoro: 'LAV-2026-0007' }, error: null })
    mockGenerate.mockRejectedValue(new Error('connection error, socket 5432 refused'))

    const res = await GET(new Request('http://x'), makeParams(LAVORO_ID))
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).not.toContain('connection error')
    expect(json.error).not.toContain('5432')
  })
})
