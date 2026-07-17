// tests/unit/decisione-fatturazione-riapertura.test.ts
// M-3 (spec §8): riaprire la decisione (→ in_attesa) azzera la proposta —
// mai rimostrare come attiva una proposta pre-conferma stantia.
import { it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({ mockGetUser: vi.fn(), mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-user', () => ({ getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }) }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/decisione-fatturazione/route'

const ctx = { params: Promise.resolve({ id: 'lav-1' }) }
function req(decisione: string): Request {
  return new Request('http://localhost/api/lavori/lav-1/decisione-fatturazione', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decisione }),
  })
}

let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  updatePayload = null
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare' }, error: null }) }) }) }) }
    }
    // lavori: select existing + update — chain reale della route
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      select: (_fields: string) => ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eq: (_col1: string, _val1: string) => ({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          eq: (_col2: string, _val2: string) => ({
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            is: (_col3: string, _val3: null) => ({
              single: async () => ({ data: { stato: 'consegnato', incluso_in_fattura: false }, error: null })
            })
          })
        })
      }),
      update: (p: Record<string, unknown>) => {
        updatePayload = p
        return {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          eq: (_col1: string, _val1: string) => ({
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            eq: (_col2: string, _val2: string) => ({
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              select: (_fields: string) => ({
                single: async () => ({ data: { id: 'lav-1', decisione_fatturazione: p.decisione_fatturazione }, error: null })
              })
            })
          })
        }
      },
    }
  })
})

it('riapertura (in_attesa): azzera proposta_dentista e proposta_at', async () => {
  const res = await PATCH(req('in_attesa'), ctx)
  expect(res.status).toBe(200)
  expect(updatePayload).toMatchObject({ decisione_fatturazione: 'in_attesa', proposta_dentista: null, proposta_at: null })
})

it('conferma (fatturare): NON tocca la proposta', async () => {
  const res = await PATCH(req('fatturare'), ctx)
  expect(res.status).toBe(200)
  expect(updatePayload).not.toHaveProperty('proposta_dentista')
  expect(updatePayload).not.toHaveProperty('proposta_at')
})

it('errore update: no leak del messaggio Postgres', async () => {
  // Mock che ritorna errore durante l'update
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare' }, error: null }) }) }) }) }
    }
    // lavori: select existing (success) + update (error)
    return {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      select: (_fields: string) => ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eq: (_col1: string, _val1: string) => ({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          eq: (_col2: string, _val2: string) => ({
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            is: (_col3: string, _val3: null) => ({
              single: async () => ({ data: { stato: 'consegnato', incluso_in_fattura: false }, error: null })
            })
          })
        })
      }),
      update: () => ({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        eq: (_col1: string, _val1: string) => ({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          eq: (_col2: string, _val2: string) => ({
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            select: (_fields: string) => ({
              single: async () => ({ data: null, error: { message: 'driver interno segreto' } })
            })
          })
        })
      }),
    }
  })

  const res = await PATCH(req('in_attesa'), ctx)
  const json = await res.json() as Record<string, unknown>

  expect(res.status).toBe(500)
  expect(JSON.stringify(json)).not.toContain('driver interno segreto')
  expect(json.error).toBe('Errore aggiornamento decisione')
})
