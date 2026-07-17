// tests/unit/lavori-patch-nota-dentista-esclusa.test.ts
// Invariante: note_dentista, da_portale, paziente_codice_richiesta NON sono
// patchabili dal lab via PATCH lavori. Sono campi read-only, scritti solo
// dall'API portale-dentista.
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

it('scarta note_dentista/da_portale/paziente_codice_richiesta dal PATCH (read-only per il lab)', async () => {
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        note_dentista: 'hack',
        da_portale: true,
        paziente_codice_richiesta: 'X',
        priorita: 'urgente',
      }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(200)
  expect(updatePayload).not.toHaveProperty('note_dentista')
  expect(updatePayload).not.toHaveProperty('da_portale')
  expect(updatePayload).not.toHaveProperty('paziente_codice_richiesta')
  expect(updatePayload).toHaveProperty('priorita', 'urgente') // un campo lecito passa
})
