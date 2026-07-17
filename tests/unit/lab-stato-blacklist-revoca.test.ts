// tests/unit/lab-stato-blacklist-revoca.test.ts
// N13 (appsec R5): al passaggio a blacklist gli utenti del lab vengono bannati
// (updateUserById + ban_duration — GoTrue non ha un admin logout per-utente).
// Best-effort: la transizione non fallisce mai per errori di revoca.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom, mockTransition, mockUpdateUserById } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
  mockTransition: vi.fn(),
  mockUpdateUserById: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    auth: { admin: { updateUserById: mockUpdateUserById } },
  }),
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

beforeEach(() => {
  vi.clearAllMocks()
  mockGetFreshLabContext.mockResolvedValue(ADMIN)
  mockTransition.mockResolvedValue({ success: true })
  mockUpdateUserById.mockResolvedValue({ data: {}, error: null })
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
})

describe('PATCH /api/admin/labs/[id]/stato — revoca sessioni su blacklist (N13)', () => {
  it('transizione a blacklist → ban per ogni utente del lab', async () => {
    const res = await PATCH(req('blacklist'), params)
    expect(res.status).toBe(200)
    expect(mockUpdateUserById).toHaveBeenCalledTimes(2)
    const chiamate = mockUpdateUserById.mock.calls
    expect(chiamate.map((c) => c[0]).sort()).toEqual(['u-1', 'u-2'])
    for (const [, attrs] of chiamate) {
      expect(attrs).toEqual({ ban_duration: '87600h' })
    }
  })

  it('transizione a sospeso → nessuna revoca', async () => {
    const res = await PATCH(req('sospeso'), params)
    expect(res.status).toBe(200)
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })

  it('errore di revoca → la transizione risponde comunque success', async () => {
    mockUpdateUserById.mockResolvedValue({ data: null, error: { message: 'gotrue giù' } })
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await PATCH(req('blacklist'), params)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })

  it('transizione fallita → nessuna revoca tentata', async () => {
    mockTransition.mockResolvedValue({ success: false, error: 'Transizione non consentita' })
    const res = await PATCH(req('blacklist'), params)
    expect(res.status).toBe(400)
    expect(mockUpdateUserById).not.toHaveBeenCalled()
  })
})
