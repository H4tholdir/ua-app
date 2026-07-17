// tests/unit/pec-verify-route.test.ts
// N13 (appsec R7): confronto del x-internal-secret in tempo costante
// (timingSafeEqual su digest) + fail-closed su env assente.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { POST } from '../../src/app/api/internal/pec-verify/route'

const TOKEN = '4c1f7a2e-9b3d-4e5f-8a6b-1c2d3e4f5a6b'

function req(secret: string | null, token: string = TOKEN): Request {
  return new Request('http://localhost/api/internal/pec-verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret !== null ? { 'x-internal-secret': secret } : {}),
    },
    body: JSON.stringify({ token }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('INTERNAL_SECRET', 'segretissimo')
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') {
      return {
        update: () => ({
          eq: () => ({ select: async () => ({ data: [{ id: 'lab-1' }], error: null }) }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/internal/pec-verify — secret constant-time (N13)', () => {
  it('secret corretto → 200 ok', async () => {
    const res = await POST(req('segretissimo'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('secret sbagliato → 403', async () => {
    const res = await POST(req('sbagliato'))
    expect(res.status).toBe(403)
  })

  it('secret assente → 403', async () => {
    const res = await POST(req(null))
    expect(res.status).toBe(403)
  })

  it('env INTERNAL_SECRET assente → 403 fail-closed anche con header vuoto', async () => {
    vi.stubEnv('INTERNAL_SECRET', '')
    const res = await POST(req(''))
    expect(res.status).toBe(403)
  })
})
