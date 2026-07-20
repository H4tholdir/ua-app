// tests/unit/cedolini-batch-route.test.ts
// Bundle E (A16): cedolini di tutto il lab in un CSV — GUARDED N13,
// RBAC solo titolare/admin_rete (espone i compensi di TUTTI i tecnici).
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

import { GET } from '../../src/app/api/tecnici/cedolini-batch/route'

const LAB_ID = 'lab-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

const riga = (tecnico: { id: string; nome: string; cognome: string }, voce: string, cu: number, quantita = 1) => ({
  quantita,
  lavori: { tecnico_id: tecnico.id, tecnici: { nome: tecnico.nome, cognome: tecnico.cognome } },
  listino: { nome: voce, compenso_tecnico: cu },
})
const ROSSI = { id: 'tec-1', nome: 'Mario', cognome: 'Rossi' }
const VERDI = { id: 'tec-2', nome: 'Anna', cognome: 'Verdi' }

let righe: Array<Record<string, unknown>>
let chiamateEq: Array<[string, unknown]>
let chiamateGte: Array<[string, unknown]>
let chiamateLt: Array<[string, unknown]>

function setupBuilder() {
  chiamateEq = []; chiamateGte = []; chiamateLt = []
  const builder: Record<string, unknown> = {}
  Object.assign(builder, {
    select: () => builder,
    eq: (c: string, v: unknown) => { chiamateEq.push([c, v]); return builder },
    gte: (c: string, v: unknown) => { chiamateGte.push([c, v]); return builder },
    lt: (c: string, v: unknown) => { chiamateLt.push([c, v]); return builder },
    not: () => builder,
    order: () => builder,
    range: async () => ({ data: righe, error: null }),
  })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori_lavorazioni') return builder
    throw new Error(`tabella inattesa: ${table}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
  righe = []
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  setupBuilder()
})

describe('GET /api/tecnici/cedolini-batch — auth, guard N13, RBAC', () => {
  it('401 senza utente', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(401)
  })
  it('403 senza laboratorio', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, laboratorioId: null })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(403)
  })
  it('403 blacklist (guard N13, terminale anche sui GET)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'blacklist' },
    })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(403)
  })
  it('200 con lab sospeso (matrice N13: GET in sola lettura consentito)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...CONTEXT, lab: { ...CONTEXT.lab, stato: 'sospeso' },
    })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(200)
  })
  it.each(['tecnico', 'front_desk'])('403 per ruolo %s', async (ruolo) => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, ruolo })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(403)
  })
  it('200 per admin_rete', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, ruolo: 'admin_rete' })
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.status).toBe(200)
  })
})

describe('GET /api/tecnici/cedolini-batch — scoping tenant', () => {
  it('filtra per laboratorio_id su tabella E su lavori embedded', async () => {
    await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    expect(chiamateEq).toContainEqual(['laboratorio_id', LAB_ID])
    expect(chiamateEq).toContainEqual(['lavori.laboratorio_id', LAB_ID])
    expect(chiamateEq).toContainEqual(['lavori.stato', 'consegnato'])
  })
})

describe('GET /api/tecnici/cedolini-batch — CSV e aggregazione', () => {
  it('aggrega per tecnico × voce, ordina per cognome poi voce, totali giusti', async () => {
    righe = [
      riga(VERDI, 'Corona zirconia', 12, 2),
      riga(ROSSI, 'Scheletrato', 30, 1),
      riga(VERDI, 'Corona zirconia', 12, 3),
      riga(ROSSI, 'Corona zirconia', 12, 1),
    ]
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="cedolini-2026-05.csv"')
    const testo = await res.text()
    const [header, ...dati] = testo.split('\n')
    expect(header.split(';')).toHaveLength(5)
    expect(dati).toHaveLength(3)
    expect(dati[0]).toBe('Rossi Mario;Corona zirconia;1;12,00;12,00')
    expect(dati[1]).toBe('Rossi Mario;Scheletrato;1;30,00;30,00')
    expect(dati[2]).toBe('Verdi Anna;Corona zirconia;5;12,00;60,00')
  })
  it('nessuna lavorazione nel mese: solo header', async () => {
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    const testo = await res.text()
    expect(testo.split('\n')).toHaveLength(1)
  })
  it('anti CSV-injection sul nome voce listino', async () => {
    righe = [riga(ROSSI, '=HYPERLINK("http://evil")', 10, 1)]
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-05'))
    const testo = await res.text()
    expect(testo).toContain(`'=HYPERLINK`)
  })
})

describe('GET /api/tecnici/cedolini-batch — mese', () => {
  it('mese esplicito: confini [from, to) corretti', async () => {
    await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=2026-12'))
    expect(chiamateGte).toContainEqual(['lavori.data_consegna_effettiva', '2026-12-01'])
    expect(chiamateLt).toContainEqual(['lavori.data_consegna_effettiva', '2027-01-01'])
  })
  it('default = mese corrente Europe/Rome (31/12 23:30 UTC → gennaio nuovo anno)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="cedolini-2027-01.csv"')
  })
  it('mese malformato → default', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    const res = await GET(new Request('http://localhost/api/tecnici/cedolini-batch?mese=maggio'))
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="cedolini-2026-06.csv"')
  })
})
