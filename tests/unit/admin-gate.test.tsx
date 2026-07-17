import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactElement } from 'react'

// ── Mock hoisted: getFreshLabContext (Task 2), redirect, getServiceClient ──
// getServiceClient lancia se chiamato: prova che il gate admin (context null /
// ruolo ≠ admin_sistema) intercetta PRIMA di ogni query DB di dominio.
const { mockGetFreshLabContext, mockRedirect, mockGetServiceClient } = vi.hoisted(() => {
  const mockGetFreshLabContext = vi.fn()
  const mockRedirect = vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  })
  const mockGetServiceClient = vi.fn()
  return { mockGetFreshLabContext, mockRedirect, mockGetServiceClient }
})

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: mockGetServiceClient,
}))

import AdminLayout from '@/app/admin/layout'
import AdminLivePreviewPage from '@/app/admin/labs/[id]/live/page'
import AdminLabViewPage from '@/app/admin/labs/[id]/view/page'
import BillingPage from '@/app/billing/page'

type Ctx = {
  userId: string
  email: string | null
  ruolo: string
  laboratorioId: string | null
  nome: string | null
  cognome: string | null
  lab: { stato: string; trial_ends_at: string | null; nome: string } | null
}

const ADMIN_CONTEXT: Ctx = {
  userId: 'admin-1',
  email: 'admin@ua.it',
  ruolo: 'admin_sistema',
  laboratorioId: null,
  nome: 'Sys',
  cognome: 'Admin',
  lab: null,
}

const TITOLARE_CONTEXT: Ctx = {
  userId: 'u-1',
  email: 'titolare@lab.it',
  ruolo: 'titolare',
  laboratorioId: 'lab-1',
  nome: 'Anna',
  cognome: 'Bianchi',
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Uno' },
}

beforeEach(() => {
  vi.clearAllMocks()
  // Di default esplode se qualcuno tenta una query DB prima del gate: le
  // asserzioni negative sotto contano su questo per provare l'ordine dei check.
  mockGetServiceClient.mockImplementation(() => {
    throw new Error('getServiceClient NON deve essere chiamato prima del gate admin')
  })
})

describe('AdminLayout (src/app/admin/layout.tsx)', () => {
  async function callLayout(): Promise<ReactElement> {
    return AdminLayout({ children: 'children' }) as unknown as ReactElement
  }

  it('utente soft-deleted / sessione assente (context null) → redirect /login', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    await expect(callLayout()).rejects.toThrow('REDIRECT:/login')
    expect(mockGetServiceClient).not.toHaveBeenCalled()
  })

  it('ruolo ≠ admin_sistema → redirect /dashboard (comportamento odierno invariato)', async () => {
    mockGetFreshLabContext.mockResolvedValue(TITOLARE_CONTEXT)
    await expect(callLayout()).rejects.toThrow('REDIRECT:/dashboard')
  })

  it('ruolo admin_sistema → nessun redirect (render nav con displayName da nome+cognome)', async () => {
    mockGetFreshLabContext.mockResolvedValue(ADMIN_CONTEXT)
    const el = await callLayout()
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(el).toBeTruthy()
  })
})

describe('AdminLivePreviewPage (src/app/admin/labs/[id]/live/page.tsx)', () => {
  function callPage() {
    return AdminLivePreviewPage({ params: Promise.resolve({ id: 'lab-1' }) })
  }

  it('context null (utente soft-deleted / sessione assente) → redirect /login prima di ogni query DB', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    await expect(callPage()).rejects.toThrow('REDIRECT:/login')
    expect(mockGetServiceClient).not.toHaveBeenCalled()
  })

  it('ruolo ≠ admin_sistema → redirect /admin/labs (comportamento odierno invariato), nessuna query DB', async () => {
    mockGetFreshLabContext.mockResolvedValue(TITOLARE_CONTEXT)
    await expect(callPage()).rejects.toThrow('REDIRECT:/admin/labs')
    expect(mockGetServiceClient).not.toHaveBeenCalled()
  })
})

describe('AdminLabViewPage (src/app/admin/labs/[id]/view/page.tsx)', () => {
  function callPage() {
    return AdminLabViewPage({ params: Promise.resolve({ id: 'lab-1' }) })
  }

  it('context null (utente soft-deleted / sessione assente) → redirect /login prima di ogni query DB', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    await expect(callPage()).rejects.toThrow('REDIRECT:/login')
    expect(mockGetServiceClient).not.toHaveBeenCalled()
  })

  it('ruolo ≠ admin_sistema → redirect /login (comportamento odierno invariato: verifyAdmin collassa i due casi), nessuna query DB', async () => {
    mockGetFreshLabContext.mockResolvedValue(TITOLARE_CONTEXT)
    await expect(callPage()).rejects.toThrow('REDIRECT:/login')
    expect(mockGetServiceClient).not.toHaveBeenCalled()
  })
})

describe('BillingPage (src/app/billing/page.tsx)', () => {
  function callPage(searchParams: Record<string, string> = {}) {
    return BillingPage({ searchParams: Promise.resolve(searchParams) })
  }

  it('context null (utente soft-deleted / sessione assente) → redirect /login', async () => {
    mockGetFreshLabContext.mockResolvedValue(null)
    await expect(callPage()).rejects.toThrow('REDIRECT:/login')
  })

  it('laboratorioId null (es. admin_sistema) → redirect /login?error=no_lab (conservativo, fail-closed)', async () => {
    mockGetFreshLabContext.mockResolvedValue(ADMIN_CONTEXT)
    await expect(callPage()).rejects.toThrow('REDIRECT:/login?error=no_lab')
  })

  it('lab attivo → nessun redirect, BillingContent con labNome e reason di default (trial_expired)', async () => {
    mockGetFreshLabContext.mockResolvedValue(TITOLARE_CONTEXT)
    const el = (await callPage()) as ReactElement<{ labNome: string; reason: string }>
    expect(mockRedirect).not.toHaveBeenCalled()
    expect(el.props.labNome).toBe('Lab Uno')
    expect(el.props.reason).toBe('trial_expired')
  })

  it('lab sospeso senza query param → reason sospeso', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...TITOLARE_CONTEXT,
      lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab Due' },
    })
    const el = (await callPage()) as ReactElement<{ labNome: string; reason: string }>
    expect(el.props.reason).toBe('sospeso')
  })

  it('?expired=true → reason expired anche con lab sospeso', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...TITOLARE_CONTEXT,
      lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab Due' },
    })
    const el = (await callPage({ expired: 'true' })) as ReactElement<{ labNome: string; reason: string }>
    expect(el.props.reason).toBe('expired')
  })

  it('lab blacklist → redirect /blocked', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...TITOLARE_CONTEXT,
      lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab Tre' },
    })
    await expect(callPage()).rejects.toThrow('REDIRECT:/blocked')
  })
})
