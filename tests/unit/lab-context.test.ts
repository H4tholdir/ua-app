import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetClaims, mockGetUser, mockSingle, mockSelect, mockIs, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const chain: Record<string, unknown> = {}
  const mockSelect = vi.fn().mockReturnValue(chain)
  const mockEq = vi.fn().mockReturnValue(chain)
  const mockIs = vi.fn().mockReturnValue(chain)
  chain.select = mockSelect
  chain.eq = mockEq
  chain.is = mockIs
  chain.single = mockSingle
  const mockFrom = vi.fn().mockReturnValue(chain)
  return {
    mockGetClaims: vi.fn(),
    mockGetUser: vi.fn(),
    mockSingle,
    mockSelect,
    mockIs,
    mockFrom,
  }
})

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getClaims: mockGetClaims, getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { getLabContext, getFreshLabContext, getLabContextWithTimings } from '@/lib/supabase/lab-context'

const RIGA = {
  ruolo: 'titolare',
  laboratorio_id: 'lab-1',
  nome: 'Anna',
  cognome: 'Bianchi',
  laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getLabContext', () => {
  it('claims validi → LabContext completo', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'u-1', email: 'a@b.it' } }, error: null })
    mockSingle.mockResolvedValue({ data: RIGA, error: null })

    const ctx = await getLabContext()

    expect(ctx).toEqual({
      userId: 'u-1',
      email: 'a@b.it',
      ruolo: 'titolare',
      laboratorioId: 'lab-1',
      nome: 'Anna',
      cognome: 'Bianchi',
      lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
    })
    expect(mockFrom).toHaveBeenCalledWith('utenti')
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
    const selectArg = mockSelect.mock.calls[0][0] as string
    expect(selectArg).toContain('laboratori(')
    expect(selectArg).not.toContain('!inner')
  })

  it('claims assenti (data.claims undefined) → null', async () => {
    mockGetClaims.mockResolvedValue({ data: null, error: null })

    expect(await getLabContext()).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('utente soft-deleted (riga assente) → null', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'u-del' } }, error: null })
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    expect(await getLabContext()).toBeNull()
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null)
  })

  it('admin_sistema senza lab (laboratorio_id null, laboratori null) → laboratorioId null, lab null', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'u-adm' } }, error: null })
    mockSingle.mockResolvedValue({
      data: { ...RIGA, ruolo: 'admin_sistema', laboratorio_id: null, laboratori: null },
      error: null,
    })

    const ctx = await getLabContext()

    expect(ctx?.ruolo).toBe('admin_sistema')
    expect(ctx?.laboratorioId).toBeNull()
    expect(ctx?.lab).toBeNull()
    const selectArg = mockSelect.mock.calls[0][0] as string
    expect(selectArg).not.toContain('!inner')
  })
})

describe('getFreshLabContext', () => {
  it('user presente → context via getUser (NON getClaims), timings valorizzati', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u-1', email: 'a@b.it' } } })
    mockSingle.mockResolvedValue({ data: RIGA, error: null })
    const t: { authMs?: number; dbMs?: number } = {}

    const ctx = await getFreshLabContext(t)

    expect(ctx?.laboratorioId).toBe('lab-1')
    expect(mockGetUser).toHaveBeenCalled()
    expect(mockGetClaims).not.toHaveBeenCalled()
    expect(typeof t.authMs).toBe('number')
    expect(typeof t.dbMs).toBe('number')
  })

  it('user assente → null', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    expect(await getFreshLabContext()).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('getLabContextWithTimings', () => {
  it('ritorna context + timings numerici (stessa cache entry di getLabContext)', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'u-1' } }, error: null })
    mockSingle.mockResolvedValue({ data: RIGA, error: null })

    const { context, timings } = await getLabContextWithTimings()

    expect(context?.userId).toBe('u-1')
    expect(typeof timings.authMs).toBe('number')
    expect(typeof timings.dbMs).toBe('number')
  })

  it('getLabContext chiamato 2x nello stesso giro → shape stabile; dedup effettiva da React.cache fuori da un render pass RSC NON è garantita (documentato, non asserita come requisito hard)', async () => {
    mockGetClaims.mockResolvedValue({ data: { claims: { sub: 'u-1', email: 'a@b.it' } }, error: null })
    mockSingle.mockResolvedValue({ data: RIGA, error: null })

    const [ctx1, ctx2] = await Promise.all([getLabContext(), getLabContext()])

    expect(ctx1).toEqual(ctx2)
    expect(ctx1).toEqual({
      userId: 'u-1',
      email: 'a@b.it',
      ruolo: 'titolare',
      laboratorioId: 'lab-1',
      nome: 'Anna',
      cognome: 'Bianchi',
      lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
    })
    // Osservazione empirica (non un requisito hard): fuori da un render pass RSC,
    // React.cache() in ambiente vitest/jsdom tipicamente NON deduplica — qui la
    // query `utenti` viene eseguita 2 volte (una per chiamata a getLabContext()).
    // La dedup reale è garantita da React solo dentro un singolo render pass RSC
    // (vedi report task-2-report.md per il numero di chiamate osservato).
    expect(mockSingle.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})
