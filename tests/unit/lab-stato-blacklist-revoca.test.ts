// tests/unit/lab-stato-blacklist-revoca.test.ts
// N13 (appsec R5): al passaggio a blacklist le sessioni degli utenti del lab
// vengono revocate (best-effort via GoTrue admin logout). La transizione non
// fallisce mai per errori di revoca.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom, mockTransition } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
  mockTransition: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/stripe/state-machine', () => ({
  transitionLabStato: mockTransition,
}))

import { PATCH } from '../../src/app/api/admin/labs/[id]/stato/route'

const ADMIN = {
  userId: 'admin-1', email: 'admin@ua.it', ruolo: 'admin_sistema',
  laboratorioId: null, nome: 'Ada', cognome: 'Admin', lab: null,
}

const UTENTI = [{ id: 'u-1' }, { id: 'u-2' }]

function req(stato: string): Request {
  return new Request('http://localhost/api/admin/labs/lab-1/stato', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify({ stato }),
  })
}
const params = { params: Promise.resolve({ id: 'lab-1' }) }

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key-test')
  mockGetFreshLabContext.mockResolvedValue(ADMIN)
  mockTransition.mockResolvedValue({ success: true })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({ is: async () => ({ data: UTENTI, error: null }) }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
  fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('PATCH /api/admin/labs/[id]/stato — revoca sessioni su blacklist (N13)', () => {
  it('transizione a blacklist → logout admin GoTrue per ogni utente del lab', async () => {
    const res = await PATCH(req('blacklist'), params)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const urls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(urls).toContain('https://example.supabase.co/auth/v1/admin/users/u-1/logout')
    expect(urls).toContain('https://example.supabase.co/auth/v1/admin/users/u-2/logout')
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).method).toBe('POST')
      expect((init as RequestInit).headers).toMatchObject({
        apikey: 'service-key-test',
        Authorization: 'Bearer service-key-test',
      })
    }
  })

  it('transizione a sospeso → nessuna revoca', async () => {
    const res = await PATCH(req('sospeso'), params)
    expect(res.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('errore di revoca → la transizione risponde comunque success', async () => {
    fetchMock.mockRejectedValue(new Error('rete giù'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await PATCH(req('blacklist'), params)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(errSpy).toHaveBeenCalled()
  })

  it('transizione fallita → nessuna revoca tentata', async () => {
    mockTransition.mockResolvedValue({ success: false, error: 'Transizione non consentita' })
    const res = await PATCH(req('blacklist'), params)
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
