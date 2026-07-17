// tests/unit/lavori-patch-invariante-d7.test.ts
// Invariante D7 (spec §7): la proposta del dentista NON è patchabile dal lab
// via PATCH lavori — se questa regressione scatta, qualcuno ha aggiunto
// proposta_dentista/proposta_at a PATCHABLE_FIELDS.
import { it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/route'

let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  updatePayload = null
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    // lavori: select existing (incluso_in_fattura) + update
    return {
      select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { incluso_in_fattura: false }, error: null }) }) }) }) }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return { eq: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: 'x', stato: 'pronto', updated_at: 'x' }, error: null }) }) }) }) }
      },
    }
  })
})

it('PATCH lavori con proposta_dentista/proposta_at nel body: i campi NON arrivano all\'update', async () => {
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descrizione: 'ok', proposta_dentista: 'fatturare', proposta_at: '2026-07-10T00:00:00Z' }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(200)
  expect(updatePayload).not.toHaveProperty('proposta_dentista')
  expect(updatePayload).not.toHaveProperty('proposta_at')
  expect(updatePayload).toHaveProperty('descrizione')
})
