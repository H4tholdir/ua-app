// tests/unit/lavori-patch-prezzo-guard.test.ts
// N4: quando il lavoro ha righe di lavorazione attive, il prezzo è gestito
// dalle righe → prezzo_unitario diventa read-only via PATCH, con l'eccezione
// dell'azzeramento a null (riconciliazione). Senza righe attive il campo
// resta editabile come oggi.
import { it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/route'

let updatePayload: Record<string, unknown> | null
let righeAttiveCount: number

beforeEach(() => {
  updatePayload = null
  righeAttiveCount = 0
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } }, error: null }) }) }) }) }
    }
    if (table === 'lavori_lavorazioni') {
      // .select('id', { count: 'exact', head: true }).eq('lavoro_id', id).is('deleted_at', null)
      return { select: () => ({ eq: () => ({ is: async () => ({ count: righeAttiveCount, error: null }) }) }) }
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

it('righe attive + PATCH prezzo_unitario numerico → 422 (prezzo gestito dalle righe)', async () => {
  righeAttiveCount = 2
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prezzo_unitario: 999 }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(422)
  expect(updatePayload).toBeNull()
})

it('righe attive + PATCH prezzo_unitario null → accettato (carve-out riconciliazione)', async () => {
  righeAttiveCount = 2
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prezzo_unitario: null }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(200)
  expect(updatePayload).toHaveProperty('prezzo_unitario', null)
})

it('nessuna riga attiva + PATCH prezzo_unitario numerico → accettato (comportamento odierno)', async () => {
  righeAttiveCount = 0
  const res = await PATCH(
    new Request('http://localhost/api/lavori/lav-1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prezzo_unitario: 999 }),
    }),
    { params: Promise.resolve({ id: 'lav-1' }) },
  )
  expect(res.status).toBe(200)
  expect(updatePayload).toHaveProperty('prezzo_unitario', 999)
})
