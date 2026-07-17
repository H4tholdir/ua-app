// tests/unit/impostazioni-pec-patch.test.ts
// PATCH /api/impostazioni/pec — allowlist pec_sdi_address (D-6):
// stringa valida sdiNN@pec.fatturapa.it → salvata; vuota → null;
// malformata / non-stringa (null, numero) → 400 JSON, MAI TypeError/500.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockRpc } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/impostazioni/pec/route'

function req(body: unknown): Request {
  return new Request('http://localhost/api/impostazioni/pec', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Payload passati a .update() sulla tabella laboratori (il 2° è il flag pec_smtp_configurata). */
let updatePayloads: Record<string, unknown>[]

beforeEach(() => {
  updatePayloads = []
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              single: async () => ({
                data: { laboratorio_id: 'lab-1', ruolo: 'titolare', laboratori: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' } },
                error: null,
              }),
            }),
          }),
        }),
      }
    }
    // laboratori
    return {
      update: (payload: Record<string, unknown>) => {
        updatePayloads.push(payload)
        return { eq: async () => ({ error: null }) }
      },
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { pec_host: 'pec.example.com', pec_port: 465, pec_user: 'lab@pec.it', pec_vault_key_id: 'k1' },
            error: null,
          }),
        }),
      }),
    }
  })
})

describe('PATCH /api/impostazioni/pec — allowlist pec_sdi_address (D-6)', () => {
  it('accetta sdiNN@pec.fatturapa.it valido', async () => {
    const res = await PATCH(req({ pec_sdi_address: 'sdi43@pec.fatturapa.it' }))
    expect(res.status).toBe(200)
    expect(updatePayloads[0]).toMatchObject({ pec_sdi_address: 'sdi43@pec.fatturapa.it' })
  })

  it('stringa vuota → null (reset del campo)', async () => {
    const res = await PATCH(req({ pec_sdi_address: '' }))
    expect(res.status).toBe(200)
    expect(updatePayloads[0]).toMatchObject({ pec_sdi_address: null })
  })

  it('formato non valido → 400, nessuna scrittura', async () => {
    const res = await PATCH(req({ pec_sdi_address: 'attacker@evil.com' }))
    expect(res.status).toBe(400)
    expect(updatePayloads).toHaveLength(0)
  })

  it('null → 400 JSON (type guard, niente TypeError/500)', async () => {
    const res = await PATCH(req({ pec_sdi_address: null }))
    expect(res.status).toBe(400)
    const json = await res.json() as { error?: string }
    expect(json.error).toBeTruthy()
    expect(updatePayloads).toHaveLength(0)
  })

  it('numero → 400 JSON (type guard, niente TypeError/500)', async () => {
    const res = await PATCH(req({ pec_sdi_address: 42 }))
    expect(res.status).toBe(400)
    expect(updatePayloads).toHaveLength(0)
  })
})
