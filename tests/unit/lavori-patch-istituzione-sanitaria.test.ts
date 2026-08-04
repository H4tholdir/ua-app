// Task 5 (ondata B ②) — `istituzione_sanitaria` entra nell'allowlist della
// PATCH (P37: si corregge fino alla consegna, direttiva §9), mentre
// `numero_prescrizione` resta FUORI con la sua ragione nuova: vive su
// `lavori_prescrizioni`, scrittura via RPC dedicate (ondata B, spec §3).
// La colonna omonima su `lavori` è legacy e non deve diventare una seconda
// penna dello stesso fatto — la classe di difetto già pagata con
// `numero_cassetta`.
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

it('istituzione_sanitaria si salva; numero_prescrizione resta scartato (penna sulle RPC di ondata B)', async () => {
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        istituzione_sanitaria: 'ASL Napoli 1 Centro',
        numero_prescrizione: 'RX-77',
      }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(200)
  expect(updatePayload).toHaveProperty('istituzione_sanitaria', 'ASL Napoli 1 Centro')
  expect(updatePayload).not.toHaveProperty('numero_prescrizione')
})

it('istituzione_sanitaria si azzera con null: la correzione include il ripensamento', async () => {
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ istituzione_sanitaria: null }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(200)
  expect(updatePayload).toHaveProperty('istituzione_sanitaria', null)
})
