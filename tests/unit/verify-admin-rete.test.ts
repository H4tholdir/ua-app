import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { verifyAdminRete } from '../../src/lib/rete/verify-admin-rete'

interface Scenario {
  utente?: { laboratorio_id: string | null; ruolo: string } | null
  rete?: { id: string; nome: string; admin_laboratorio_id: string } | null
}

function mockTables({ utente = null, rete = null }: Scenario) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: utente, error: null }),
          }),
        }),
      }
    }
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
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockTables({})

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('utente autenticato ma senza laboratorio_id → null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockTables({ utente: { laboratorio_id: null, ruolo: 'titolare' } })

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('utente autenticato con laboratorio_id ma ruolo non ammesso (tecnico) → null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockTables({ utente: { laboratorio_id: 'lab-1', ruolo: 'tecnico' } })

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('ruolo titolare, ma la rete richiesta non esiste → null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockTables({ utente: { laboratorio_id: 'lab-1', ruolo: 'titolare' }, rete: null })

    const result = await verifyAdminRete('rete-inesistente')

    expect(result).toBeNull()
  })

  it('ruolo admin_rete, rete esiste ma admin_laboratorio_id è di un ALTRO lab → null (difesa anti-cross-tenant)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockTables({
      utente: { laboratorio_id: 'lab-1', ruolo: 'admin_rete' },
      rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-ALTRO' },
    })

    const result = await verifyAdminRete('rete-1')

    expect(result).toBeNull()
  })

  it('ruolo titolare, rete esiste e admin_laboratorio_id corrisponde al lab dell\'utente → contesto valido', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockTables({
      utente: { laboratorio_id: 'lab-1', ruolo: 'titolare' },
      rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-1' },
    })

    const result = await verifyAdminRete('rete-1')

    expect(result).toEqual({
      userId: 'user-1',
      laboratorioId: 'lab-1',
      rete: { id: 'rete-1', nome: 'Rete Toscana', admin_laboratorio_id: 'lab-1' },
    })
  })
})
