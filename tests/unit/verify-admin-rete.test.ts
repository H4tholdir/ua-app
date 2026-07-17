import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))

// verifyAdminRete (Task 10) usa getFreshLabContext per il self-lookup —
// resta solo la query 'reti' su getServiceClient diretto.
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { verifyAdminRete } from '../../src/lib/rete/verify-admin-rete'

interface Scenario {
  context?: { userId: string; laboratorioId: string | null; ruolo: string } | null
  rete?: { id: string; nome: string; admin_laboratorio_id: string } | null
}

function mockScenario({ context = null, rete = null }: Scenario) {
  mockGetFreshLabContext.mockResolvedValue(
    context
      ? { userId: context.userId, email: null, ruolo: context.ruolo, laboratorioId: context.laboratorioId, nome: null, cognome: null, lab: null }
      : null
  )
  mockFrom.mockImplementation((table: string) => {
    if (table === 'reti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: rete, error: null }),
          }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('verifyAdminRete — barriera di isolamento multi-tenant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('utente non autenticato → null', async () => {
    mockScenario({ context: null })

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('utente autenticato ma senza laboratorio_id → null', async () => {
    mockScenario({ context: { userId: 'user-1', laboratorioId: null, ruolo: 'titolare' } })

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('utente autenticato con laboratorio_id ma ruolo non ammesso (tecnico) → null', async () => {
    mockScenario({ context: { userId: 'user-1', laboratorioId: 'lab-1', ruolo: 'tecnico' } })

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('ruolo titolare, ma la rete richiesta non esiste → null', async () => {
    mockScenario({ context: { userId: 'user-1', laboratorioId: 'lab-1', ruolo: 'titolare' }, rete: null })

    const result = await verifyAdminRete('rete-inesistente')

    expect(result).toBeNull()
  })

  it('ruolo admin_rete, rete esiste ma admin_laboratorio_id è di un ALTRO lab → null (difesa anti-cross-tenant)', async () => {
    mockScenario({
      context: { userId: 'user-1', laboratorioId: 'lab-1', ruolo: 'admin_rete' },
      rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-ALTRO' },
    })

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('ruolo titolare, rete esiste e admin_laboratorio_id corrisponde al lab dell\'utente → contesto valido', async () => {
    mockScenario({
      context: { userId: 'user-1', laboratorioId: 'lab-1', ruolo: 'titolare' },
      rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-1' },
    })

    const result = await verifyAdminRete('rete-1')

    expect(result).toEqual({
      userId: 'user-1',
      laboratorioId: 'lab-1',
      rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-1' },
      // N13: il wrapper espone anche ruolo + lab (LabGuardInput)
      ruolo: 'titolare',
      lab: null,
    })
  })
})
