import { describe, it, expect, vi, beforeEach } from 'vitest'

// Task 5b: applicare credito a una fattura stornata o a un TD04 (nota di
// credito) creerebbe un doppio movimento contabile su un documento annullato
// o mai pagabile — la route deve rifiutare con lo stesso stile 4xx già usato
// per le altre validazioni (400).

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

import { POST } from '../../src/app/api/clienti/[id]/credito/applica/route'

const LAB_ID = 'lab-1'
const CLIENTE_ID = 'cli-1'

interface Opts {
  utente?: { laboratorio_id: string; ruolo: string } | null
  cliente?: { id: string } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fattura?: Record<string, any> | null
  movimenti?: Array<{ tipo: string; importo: number }>
  erroreInsert?: { message: string } | null
}

function mockSupabase(opts: Opts) {
  const insertedMovimenti: Record<string, unknown>[] = []
  const utente = opts.utente ?? { laboratorio_id: LAB_ID, ruolo: 'titolare' }
  mockGetFreshLabContext.mockResolvedValue(
    utente
      ? { userId: 'user-1', email: null, ruolo: utente.ruolo, laboratorioId: utente.laboratorio_id, nome: null, cognome: null, lab: null }
      : null
  )
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: opts.cliente ?? { id: CLIENTE_ID }, error: null }) }) }) }),
        }),
      }
    }
    if (table === 'fatture') {
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: opts.fattura ?? null, error: null }) }) }) }) }),
        }),
      }
    }
    if (table === 'credito_clienti_movimenti') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        insert: (row: Record<string, unknown>) => { insertedMovimenti.push(row); return chain },
        single: async () => ({
          data: opts.erroreInsert ? null : { id: 'mov-1', ...(insertedMovimenti[insertedMovimenti.length - 1] ?? {}) },
          error: opts.erroreInsert ?? null,
        }),
        then: (resolve: (v: { data: unknown; error: null }) => void) => resolve({ data: opts.movimenti ?? [], error: null }),
      }
      return chain
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  return { insertedMovimenti }
}

function req(body: unknown) {
  return new Request('http://localhost/api/clienti/cli-1/credito/applica', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as never
}

const ctx = { params: Promise.resolve({ id: CLIENTE_ID }) }

describe('POST /api/clienti/[id]/credito/applica', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applicazione su fattura TD01 non stornata con credito disponibile → 200, movimento creato', async () => {
    const { insertedMovimenti } = mockSupabase({
      fattura: { id: 'fatt-1' },
      movimenti: [{ tipo: 'storno', importo: 100 }],
    })
    const res = await POST(req({ fattura_id: 'fatt-1', importo: 50 }), ctx)
    expect(res.status).toBe(200)
    expect(insertedMovimenti).toHaveLength(1)
    expect(insertedMovimenti[0]).toMatchObject({ tipo: 'applicazione', fattura_id: 'fatt-1', importo: 50 })
  })

  it('applicazione su fattura stornata → 400, nessun movimento creato', async () => {
    const { insertedMovimenti } = mockSupabase({
      fattura: { id: 'fatt-storno', stornata_at: '2026-07-10T10:00:00Z' },
      movimenti: [{ tipo: 'storno', importo: 100 }],
    })
    const res = await POST(req({ fattura_id: 'fatt-storno', importo: 50 }), ctx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/storn/i)
    expect(insertedMovimenti).toHaveLength(0)
  })

  it('applicazione su nota di credito (TD04) → 400, nessun movimento creato', async () => {
    const { insertedMovimenti } = mockSupabase({
      fattura: { id: 'fatt-td04', tipo_documento: 'TD04' },
      movimenti: [{ tipo: 'storno', importo: 100 }],
    })
    const res = await POST(req({ fattura_id: 'fatt-td04', importo: 50 }), ctx)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/TD04/)
    expect(insertedMovimenti).toHaveLength(0)
  })
})
