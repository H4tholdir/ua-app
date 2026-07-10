// tests/unit/orchestra-consegna-gate.test.ts
// Gate B1 (spec §3 punto 5): solo 'pronto' e 'in_ritardo' sono consegnabili,
// verificato SERVER-SIDE. 7 stati non consegnabili → errore + lock rilasciato.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, mockUpdateCalls } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  mockUpdateCalls: [] as Array<{ table: string; values: Record<string, unknown> }>,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: mockRpc, from: mockFrom }),
}))
vi.mock('@/lib/notifications/trigger', () => ({ triggerPushByRole: vi.fn() }))

import { orchestraConsegna } from '@/lib/consegna/orchestrate'

function mockLavoro(stato: string) {
  mockRpc.mockResolvedValue({ data: { lock_acquisito: true }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'lavori') {
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({
            data: { id: 'lav-1', laboratorio_id: 'lab-1', stato, numero_lavoro: 'n.1',
                    cliente: null, paziente: null, lavorazioni: [], materiali: [] },
            error: null,
          }) }) }) }),
        }),
        update: (values: Record<string, unknown>) => {
          mockUpdateCalls.push({ table, values })
          return { eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('gate B1 — stato consegnabile server-side', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUpdateCalls.length = 0 })

  for (const stato of ['ricevuto','in_lavorazione','in_prova','in_prova_esterna','sospeso','annullato','consegnato']) {
    it(`stato "${stato}" → stato_non_consegnabile + lock rilasciato`, async () => {
      mockLavoro(stato)
      const result = await orchestraConsegna('lav-1', 'lab-1')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.tipo).toBe('stato_non_consegnabile')
      // rilasciaLock: un update lavori con consegna_in_corso=false
      expect(mockUpdateCalls.some(c => c.values.consegna_in_corso === false)).toBe(true)
    })
  }
})
