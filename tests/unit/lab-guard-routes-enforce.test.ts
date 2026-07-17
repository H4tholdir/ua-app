// tests/unit/lab-guard-routes-enforce.test.ts
// N13: verifica di WIRING della guard nelle route reali, in modalità enforce.
// (La matrice è coperta unit in lab-guard.test.ts; qui si prova che gli
// handler chiamano davvero assertLabOperativo prima di toccare i dati.)
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockGetLabContextWithTimings, mockGetFreshLabContext, mockFrom } = vi.hoisted(() => ({
  mockGetLabContextWithTimings: vi.fn(),
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { GET as getClienti } from '../../src/app/api/clienti/route'
import { POST as postCicli } from '../../src/app/api/cicli/route'

const TIMINGS = { authMs: 1, dbMs: 2 }
const base = {
  userId: 'user-1',
  email: 'a@b.it',
  ruolo: 'titolare',
  laboratorioId: 'lab-1',
  nome: 'Anna',
  cognome: 'Bianchi',
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.UA_LAB_GUARD_MODE = 'enforce'
  // qualsiasi accesso dati esplode: la guard DEVE fermare prima
  mockFrom.mockImplementation(() => {
    throw new Error('accesso dati non atteso: la guard doveva bloccare prima')
  })
})
afterEach(() => { delete process.env.UA_LAB_GUARD_MODE })

describe('wiring lab-guard nelle route (enforce)', () => {
  it('GET /api/clienti con lab blacklist → 403 UA_LAB_BLACKLIST senza query', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({
      context: { ...base, lab: { stato: 'blacklist', trial_ends_at: null, nome: 'Lab' } },
      timings: TIMINGS,
    })
    const res = await getClienti(new Request('http://localhost/api/clienti?q=Rossi'))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.code).toBe('UA_LAB_BLACKLIST')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  it('POST /api/cicli con lab sospeso → 403 UA_LAB_SOSPESO senza query', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...base,
      lab: { stato: 'sospeso', trial_ends_at: null, nome: 'Lab' },
    })
    const res = await postCicli(
      new Request('http://localhost/api/cicli', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost' },
        body: JSON.stringify({ nome: 'Ciclo X' }),
      })
    )
    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe('UA_LAB_SOSPESO')
  })

  it('POST /api/cicli con lab attivo → supera la guard (fallisce solo sui dati mockati)', async () => {
    mockGetFreshLabContext.mockResolvedValue({
      ...base,
      lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab' },
    })
    // La guard NON deve bloccare: l'esecuzione prosegue oltre (qui si ferma
    // alla validazione del body con 400 — l'importante è che non sia il 403 guard)
    const res = await postCicli(
      new Request('http://localhost/api/cicli', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://localhost', host: 'localhost' },
        body: JSON.stringify({ nome: 'Ciclo X' }),
      })
    )
    expect(res.status).not.toBe(403)
  })
})
