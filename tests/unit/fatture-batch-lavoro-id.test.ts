// tests/unit/fatture-batch-lavoro-id.test.ts
// B-2 (spec §3 punto 2): il batch è il writer di fatture.lavoro_id.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, insertPayloads, insertResult } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  insertPayloads: [] as Array<Record<string, unknown>>,
  insertResult: { value: { data: { id: 'fat-1' }, error: null } as { data: unknown; error: unknown } },
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: async () => 7 }))
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: async () => ({ numero: '2026-0007' }) }))

import { POST } from '../../src/app/api/fatture/batch/route'

// Chain generica: ogni metodo ritorna se stessa, i terminali risolvono result.
function chain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {}
  for (const m of ['select', 'update', 'eq', 'is', 'neq', 'in']) c[m] = () => c
  c.single = async () => result
  c.maybeSingle = async () => result
  return c
}

function req() {
  return new Request('http://localhost/api/fatture/batch', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
    body: JSON.stringify({ lavoro_ids: ['lav-1'] }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  insertPayloads.length = 0
  insertResult.value = { data: { id: 'fat-1' }, error: null }
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') return chain({ data: { laboratorio_id: 'lab-1' }, error: null })
    if (table === 'lavori')
      return chain({
        data: { id: 'lav-1', numero_lavoro: 'n.1', cliente_id: 'cli-1', laboratorio_id: 'lab-1' },
        error: null,
      })
    if (table === 'fatture') {
      return {
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload)
          return { select: () => ({ single: async () => insertResult.value }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/fatture/batch — lavoro_id sul draft', () => {
  it("l'INSERT del draft valorizza lavoro_id", async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0].lavoro_id).toBe('lav-1')
  })

  it('23505 (fattura attiva già collegata) → errore pulito senza leak del vincolo', async () => {
    insertResult.value = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint "fatture_lavoro_attiva_unique"' },
    }
    const res = await POST(req())
    const json = await res.json()
    expect(json.errori).toBe(1)
    expect(json.results[0].ok).toBe(false)
    expect(JSON.stringify(json)).not.toContain('fatture_lavoro_attiva_unique')
    expect(JSON.stringify(json)).not.toContain('duplicate key')
  })
})
