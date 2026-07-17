// tests/unit/lab-guard-wrappers.test.ts
// N13 Task 3: verifyTitolare/verifyAdminRete devono esporre ruolo + lab
// (LabGuardInput) per la guard lab.stato negli handler che li usano.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

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

import { verifyTitolare } from '@/lib/invito/verify-titolare'
import { verifyAdminRete } from '@/lib/rete/verify-admin-rete'

const LAB = { stato: 'sospeso', trial_ends_at: null, nome: 'Lab Uno' }
const CONTEXT = {
  userId: 'user-1',
  email: 'a@b.it',
  ruolo: 'titolare',
  laboratorioId: 'lab-1',
  nome: 'Anna',
  cognome: 'Bianchi',
  lab: LAB,
}

describe('verifyTitolare — espone ruolo + lab (N13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  })

  it('propaga ruolo e lab identici al context', async () => {
    const tit = await verifyTitolare()
    expect(tit).not.toBeNull()
    expect(tit!.ruolo).toBe('titolare')
    expect(tit!.lab).toEqual(LAB)
  })

  it('non-titolare → null (invariato)', async () => {
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, ruolo: 'tecnico' })
    expect(await verifyTitolare()).toBeNull()
  })
})

describe('verifyAdminRete — espone ruolo + lab (N13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue({ ...CONTEXT, ruolo: 'admin_rete' })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'reti') {
        return createChain({
          data: { id: 'rete-1', nome: 'Rete Uno', admin_laboratorio_id: 'lab-1' },
          error: null,
        })
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('propaga ruolo e lab identici al context', async () => {
    const ctx = await verifyAdminRete('rete-1')
    expect(ctx).not.toBeNull()
    expect(ctx!.ruolo).toBe('admin_rete')
    expect(ctx!.lab).toEqual(LAB)
  })
})
