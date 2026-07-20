// tests/unit/lavori-export-route.test.ts
// Bundle E (A16): export CSV lavori — esente N13 (portabilità) con blocco
// blacklist esplicito; scoping tenant verificato (riserva advisor).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET } from '../../src/app/api/lavori/export/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const LAVORO_BASE = {
  numero_lavoro: 'L-2026-0001', created_at: '2026-03-01T10:00:00.000Z',
  stato: 'consegnato', priorita: 'normale', tipo_dispositivo: 'corona',
  descrizione: 'Corona zirconia 1.6', paziente_nome_snapshot: 'M.R.',
  data_consegna_prevista: '2026-03-10', data_consegna_effettiva: '2026-03-09',
  conformato: true, incluso_in_fattura: false, spedizione_stato: null,
  spedizione_tracking: null,
  cliente: { nome: 'Mario', cognome: 'Rossi', studio_nome: 'Studio Rossi' },
  tecnico: { nome: 'Luca', cognome: 'Bianchi' },
}

let lavori: Array<Record<string, unknown>>
let pagine: Array<Array<Record<string, unknown>>> | null
let chiamateEq: Array<[string, unknown]>
let chiamateGte: Array<[string, unknown]>
let chiamateLt: Array<[string, unknown]>
let chiamateOrder: string[]

function setupBuilder() {
  chiamateEq = []; chiamateGte = []; chiamateLt = []; chiamateOrder = []
  let pagina = 0
  const builder: Record<string, unknown> = {}
  Object.assign(builder, {
    select: () => builder,
    eq: (c: string, v: unknown) => { chiamateEq.push([c, v]); return builder },
    is: () => builder,
    gte: (c: string, v: unknown) => { chiamateGte.push([c, v]); return builder },
    lt: (c: string, v: unknown) => { chiamateLt.push([c, v]); return builder },
    order: (c: string) => { chiamateOrder.push(c); return builder },
    range: async () => {
      if (pagine) {
        const data = pagine[pagina] ?? []
        pagina += 1
        return { data, error: null }
      }
      return { data: lavori, error: null }
    },
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') return builder
    throw new Error(`tabella inattesa: ${table}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  lavori = [LAVORO_BASE]
  pagine = null
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  setupBuilder()
})

describe('GET /api/lavori/export — auth e guardie', () => {
  it('401 senza utente', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(401)
  })
  it('403 senza laboratorio', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(403)
  })
  it('403 blacklist (terminale anche su route esente)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'blacklist' },
    })
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(403)
  })
  it('200 con lab sospeso (esente N13: portabilità aperta)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'sospeso' },
    })
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/lavori/export — scoping tenant (riserva advisor)', () => {
  it('la query filtra SEMPRE per laboratorio_id del context', async () => {
    await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    expect(chiamateEq).toContainEqual(['laboratorio_id', LAB_ID])
  })
})

describe('GET /api/lavori/export — CSV', () => {
  it('header 15 colonne + riga dati con cliente=studio e booleani Sì/No', async () => {
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="lavori-2026.csv"')
    const [header, riga] = (await res.text()).split('\n')
    expect(header).toContain('Numero Lavoro')
    expect(header).toContain('Tracking')
    expect(header.split(';')).toHaveLength(15)
    expect(riga).toContain('L-2026-0001')
    expect(riga).toContain('2026-03-01')       // created_at → date-only
    expect(riga).toContain('Studio Rossi')      // studio_nome vince su nome/cognome
    expect(riga).toContain('Bianchi Luca')      // tecnico cognome+nome
    expect(riga).toContain('Sì')                // conformato
  })
  it('anti CSV-injection: descrizione che inizia con = viene neutralizzata', async () => {
    lavori = [{ ...LAVORO_BASE, descrizione: '=SUM(A1:A9)' }]
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    const [, riga] = (await res.text()).split('\n')
    expect(riga).toContain(`"'=SUM(A1:A9)"`)
    expect(riga).not.toContain(';=SUM')
  })
  it('cella con separatore: quotata', async () => {
    lavori = [{ ...LAVORO_BASE, descrizione: 'ponte; 3 elementi' }]
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    const [, riga] = (await res.text()).split('\n')
    expect(riga).toContain('"ponte; 3 elementi"')
  })
})

describe('GET /api/lavori/export — anno', () => {
  it('default = annoRoma() (31/12 23:30 UTC → anno nuovo a Roma)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const res = await GET(new Request('http://localhost/api/lavori/export'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="lavori-2027.csv"')
    expect(chiamateGte).toContainEqual(['created_at', '2027-01-01'])
    expect(chiamateLt).toContainEqual(['created_at', '2028-01-01'])
  })
  it('year malformato → default annoRoma()', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    const res = await GET(new Request('http://localhost/api/lavori/export?year=abcd'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="lavori-2026.csv"')
  })
})

describe('GET /api/lavori/export — paginazione', () => {
  it('1000+2 righe su due pagine: tutte nel CSV, ordinamento con tiebreaker id', async () => {
    const mille = Array.from({ length: 1000 }, (_, i) => ({
      ...LAVORO_BASE, numero_lavoro: `L-${String(i).padStart(4, '0')}`,
    }))
    pagine = [mille, [{ ...LAVORO_BASE, numero_lavoro: 'L-ULTIMO-1' }, { ...LAVORO_BASE, numero_lavoro: 'L-ULTIMO-2' }]]
    const res = await GET(new Request('http://localhost/api/lavori/export?year=2026'))
    const righe = (await res.text()).split('\n')
    expect(righe).toHaveLength(1 + 1002)
    expect(righe[1002]).toContain('L-ULTIMO-2')
    expect(chiamateOrder).toEqual(expect.arrayContaining(['created_at', 'id']))
  })
})
