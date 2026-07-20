// PATCH /api/impostazioni — validazione VALORE dei campi URL (review Bundle T, A18):
// logo_url / logo_print_url / firma_ddc_url / sfondo_ddc_url vengono poi
// FETCHATI dal server (hash firma DdC, immagini react-pdf) — un valore
// arbitrario sarebbe SSRF. Ammesso solo lo storage pubblico Supabase del
// progetto (o null per azzerare).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))
vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
  getLabContextWithTimings: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/impostazioni/route'

const BASE = 'https://example-project.supabase.co'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: 'lab-1',
  nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}

function req(body: unknown): Request {
  return new Request('http://localhost/api/impostazioni', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

let updatePayloads: Record<string, unknown>[]

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', BASE)
  updatePayloads = []
  mockGetFreshLabContext.mockResolvedValue(CONTEXT)
  mockFrom.mockImplementation(() => ({
    update: (payload: Record<string, unknown>) => {
      updatePayloads.push(payload)
      return {
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'lab-1', nome: 'Lab Test', updated_at: 'now' }, error: null }),
          }),
        }),
      }
    },
  }))
})

describe('PATCH /api/impostazioni — campi URL solo da storage pubblico UÀ', () => {
  it('accetta un URL dello storage pubblico del progetto', async () => {
    const url = `${BASE}/storage/v1/object/public/documenti/lab-1/firma.png`
    const res = await PATCH(req({ firma_ddc_url: url }))
    expect(res.status).toBe(200)
    expect(updatePayloads[0]).toMatchObject({ firma_ddc_url: url })
  })

  it('accetta null (azzeramento del campo)', async () => {
    const res = await PATCH(req({ logo_url: null }))
    expect(res.status).toBe(200)
    expect(updatePayloads[0]).toMatchObject({ logo_url: null })
  })

  it('rifiuta 422 un URL esterno (SSRF) senza scrivere nulla', async () => {
    const res = await PATCH(req({ firma_ddc_url: 'http://169.254.169.254/latest/meta-data' }))
    expect(res.status).toBe(422)
    expect(updatePayloads).toHaveLength(0)
  })

  it('rifiuta 422 anche gli altri campi URL (logo_print_url, sfondo_ddc_url)', async () => {
    for (const campo of ['logo_url', 'logo_print_url', 'sfondo_ddc_url']) {
      const res = await PATCH(req({ [campo]: 'https://evil.example/x.png' }))
      expect(res.status).toBe(422)
    }
    expect(updatePayloads).toHaveLength(0)
  })

  it('rifiuta 422 un non-stringa non-null (numero)', async () => {
    const res = await PATCH(req({ firma_ddc_url: 42 }))
    expect(res.status).toBe(422)
    expect(updatePayloads).toHaveLength(0)
  })

  it('rifiuta 422 il path traversal dentro lo stesso host (../ e %2e)', async () => {
    for (const url of [
      `${BASE}/storage/v1/object/public/../../auth/v1/admin`,
      `${BASE}/storage/v1/object/public/%2e%2e/%2e%2e/rest/v1/laboratori`,
    ]) {
      const res = await PATCH(req({ firma_ddc_url: url }))
      expect(res.status).toBe(422)
    }
    expect(updatePayloads).toHaveLength(0)
  })
})
