import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, calls } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  calls: [] as Array<{ table: string; method: string; args: unknown[] }>,
}))

vi.mock('@/lib/pdf/typed-service-client', () => ({
  getTypedServiceClient: () => ({ from: mockFrom, storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'http://x/p.pdf' } }) }) } }),
}))
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: async () => Buffer.from('pdf') }))
vi.mock('@/components/features/pdf/DdcTemplate', () => ({ DdcTemplate: () => null }))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: async () => 7 }))

import { generateDdC } from '@/lib/pdf/generate-ddc'

function chain(table: string, result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq', 'is', 'insert']) {
    c[m] = (...args: unknown[]) => { calls.push({ table, method: m, args }); return c }
  }
  c.maybeSingle = async () => result
  c.single = async () => result
  return c
}

describe('generateDdC — idempotenza filtrata su stato', () => {
  beforeEach(() => { vi.clearAllMocks(); calls.length = 0 })

  it('il guard di idempotenza esclude le DdC annullate', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dichiarazioni_conformita') return chain(table, { data: { numero_ddc: 'DDC-X', pdf_url: 'u' }, error: null })
      if (table === 'laboratori') return chain(table, { data: { id: 'lab-1', nome: 'Lab' }, error: null })
      if (table === 'rischi_tipo_dispositivo') return chain(table, { data: null, error: null })
      return chain(table, { data: null, error: null })
    })
    await generateDdC({ id: 'lav-1', laboratorio_id: 'lab-1', tipo_dispositivo: 'Corona', descrizione: 'x',
      classe_rischio: 'classe_i', cliente: { cognome: 'R', nome: 'M' }, lavorazioni: [], materiali: [] } as never)
    expect(calls).toContainEqual({ table: 'dichiarazioni_conformita', method: 'neq', args: ['stato', 'annullata'] })
  })
})
