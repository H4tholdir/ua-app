import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { POST } from '../../src/app/api/magazzino/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/magazzino', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/magazzino — gestione errore duplicato', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetFreshLabContext.mockResolvedValue({
      userId: AUTH_USER.id, email: null, ruolo: 'titolare', laboratorioId: LAB_ID, nome: null, cognome: null,
      lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'magazzino') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({
                data: null,
                error: { code: '23505', message: 'duplicate key value violates unique constraint' },
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
  })

  it('codice_articolo duplicato per lab → 409 con messaggio leggibile', async () => {
    const req = postRequest({ nome: 'Gesso extra-duro', codice_articolo: 'GES01' })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toBe('Esiste già un articolo con questo codice in magazzino')
  })
})
