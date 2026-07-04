import { describe, it, expect, vi, beforeEach } from 'vitest'

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
const CICLO_ID = 'ciclo-1'

function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'is', 'order', 'insert', 'single']
  for (const m of methods) c[m] = () => c
  c.single = async () => result
  return c
}

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/lavori', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  })
}

const BASE_BODY = {
  cliente_id: 'cliente-1',
  tipo_dispositivo: 'protesi_fissa',
  descrizione: 'Corona 14',
  data_consegna_prevista: '2026-08-01',
}

describe('POST /api/lavori — generazione fasi da ciclo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
    mockRpc.mockResolvedValue({ data: 1, error: null })
  })

  function setupTables({ cicloOwned = true, fasiRows = [] as unknown[], insertLavoriFasi = { error: null } } = {}) {
    const insertedRows: unknown[] = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      }
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      }
      if (table === 'cicli_produzione') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: cicloOwned ? { laboratorio_id: LAB_ID } : { laboratorio_id: 'other-lab' }, error: null }) }) }) }) }
      }
      if (table === 'lavori') {
        return {
          insert: () => ({
            select: () => ({ single: async () => ({ data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' }, error: null }) }),
          }),
        }
      }
      if (table === 'fasi_produzione') {
        return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ order: async () => ({ data: fasiRows, error: null }) }) }) }) }) }
      }
      if (table === 'lavori_fasi') {
        return { insert: (rows: unknown[]) => { insertedRows.push(...rows); return Promise.resolve(insertLavoriFasi) } }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    return insertedRows
  }

  it('ciclo con fasi → genera N righe lavori_fasi ordinate', async () => {
    const fasiRows = [
      { id: 'fase-1', ordine: 1, responsabile_id: null },
      { id: 'fase-2', ordine: 2, responsabile_id: 'tecnico-1' },
    ]
    const inserted = setupTables({ fasiRows })

    const res = await POST(req({ ...BASE_BODY, ciclo_id: CICLO_ID }))

    expect(res.status).toBe(201)
    expect(inserted).toEqual([
      { lavoro_id: 'lavoro-1', fase_id: 'fase-1', laboratorio_id: LAB_ID, tecnico_id: null },
      { lavoro_id: 'lavoro-1', fase_id: 'fase-2', laboratorio_id: LAB_ID, tecnico_id: 'tecnico-1' },
    ])
  })

  it('ciclo senza fasi → 201, nessun insert su lavori_fasi', async () => {
    setupTables({ fasiRows: [] })
    const insertSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori_fasi') { insertSpy(); return { insert: () => Promise.resolve({ error: null }) } }
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'clienti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'cicli_produzione') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'lavori') return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' }, error: null }) }) }) }
      if (table === 'fasi_produzione') return { select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ order: async () => ({ data: [], error: null }) }) }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(req({ ...BASE_BODY, ciclo_id: CICLO_ID }))

    expect(res.status).toBe(201)
    expect(insertSpy).not.toHaveBeenCalled()
  })

  it('nessun ciclo_id → comportamento invariato, nessuna query su cicli_produzione/fasi_produzione', async () => {
    const cicloQuerySpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'cicli_produzione' || table === 'fasi_produzione') { cicloQuerySpy(table); throw new Error('non deve essere chiamato') }
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'clienti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'lavori') return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'lavoro-1', numero_lavoro: '2026/0001', stato: 'ricevuto' }, error: null }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(req(BASE_BODY))

    expect(res.status).toBe(201)
    expect(cicloQuerySpy).not.toHaveBeenCalled()
  })

  it('ciclo_id di un altro laboratorio → 403, lavoro non creato', async () => {
    const lavoriInsertSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }
      if (table === 'clienti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'cicli_produzione') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'other-lab' }, error: null }) }) }) }) }
      if (table === 'lavori') { lavoriInsertSpy(); return { insert: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) } }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await POST(req({ ...BASE_BODY, ciclo_id: CICLO_ID }))

    expect(res.status).toBe(403)
    expect(lavoriInsertSpy).not.toHaveBeenCalled()
  })
})
