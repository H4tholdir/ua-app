// tests/unit/clienti-patch-allowlist.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/clienti/[id]/route'

function req(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/clienti/cli-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: 'cli-1' }) }

/** Cattura il payload passato a .update() sulla tabella clienti. */
let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  updatePayload = null
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: { laboratorio_id: 'lab-1', ruolo: 'titolare' },
              error: null,
            }),
          }),
        }),
      }
    }
    // clienti
    return {
      update: (payload: Record<string, unknown>) => {
        updatePayload = payload
        return {
          eq: () => ({
            eq: () => ({
              is: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: 'cli-1', nome: 'Mario', cognome: 'Rossi', studio_nome: null, updated_at: 'x' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }
      },
    }
  })
})

describe('PATCH /api/clienti/[id] — allowlist I-2', () => {
  it('passa i campi anagrafici legittimi', async () => {
    const res = await PATCH(req({ nome: 'Mario', email: 'm@x.it', sconto_percentuale: 5 }), ctx)
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ nome: 'Mario', email: 'm@x.it', sconto_percentuale: 5 })
    expect(updatePayload).toHaveProperty('updated_at')
  })

  it('scarta i campi di sistema e quelli ignoti', async () => {
    const res = await PATCH(
      req({
        nome: 'Mario',
        portale_token: 'evil-token',
        portale_token_scade_at: '2099-01-01',
        laboratorio_id: 'lab-evil',
        id: 'cli-evil',
        created_at: '2020-01-01',
        deleted_at: null,
        campo_inesistente: 42,
      }),
      ctx,
    )
    expect(res.status).toBe(200)
    expect(updatePayload).not.toHaveProperty('portale_token')
    expect(updatePayload).not.toHaveProperty('portale_token_scade_at')
    expect(updatePayload).not.toHaveProperty('laboratorio_id')
    expect(updatePayload).not.toHaveProperty('id')
    expect(updatePayload).not.toHaveProperty('created_at')
    expect(updatePayload).not.toHaveProperty('deleted_at')
    expect(updatePayload).not.toHaveProperty('campo_inesistente')
  })

  it('400 se dopo il filtro non resta alcun campo', async () => {
    const res = await PATCH(req({ campo_inesistente: 1 }), ctx)
    expect(res.status).toBe(400)
  })

  it('403 se tecnico_default_id appartiene a un altro lab', async () => {
    // il mock tecnici risponde "non trovato" per il lab corrente
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare' }, error: null }) }) }) }
      }
      if (table === 'tecnici') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
              }),
            }),
          }),
        }
      }
      return { update: () => { throw new Error('update non deve essere chiamata') } }
    })
    const res = await PATCH(req({ tecnico_default_id: 'tec-altrui' }), ctx)
    expect(res.status).toBe(403)
  })
})
