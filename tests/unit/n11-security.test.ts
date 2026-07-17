// tests/unit/n11-security.test.ts
// Security test N11 (spec R2 §6, Task 10 brief Step 3): un utente
// soft-deleted (riga `utenti` filtrata da `.is('deleted_at', null)` dentro
// lab-context.ts) NON deve MAI ottenere un 200 — su nessuna delle categorie
// di superficie coperte dallo sweep N11: GET categoria A, mutazione
// categoria B, GET fiscale categoria C, gli helper verify*, e l'enrollment
// WebAuthn. In tutti i casi il fail-closed di getLabContext/getFreshLabContext
// collassa "soft-deleted" su "context null" — stesso trattamento di un
// utente non autenticato.
import { describe, it, expect, vi, beforeEach } from 'vitest'

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
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { GET as clientiGET, POST as clientiPOST } from '../../src/app/api/clienti/route'
import { GET as fattureGET } from '../../src/app/api/fatture/route'
import { verifyTitolare } from '../../src/lib/invito/verify-titolare'
import { verifyAdminRete } from '../../src/lib/rete/verify-admin-rete'
import { POST as webauthnRegisterOptionsPOST } from '../../src/app/api/auth/webauthn/register/options/route'

function clientiPostRequest() {
  return new Request('http://localhost/api/clienti', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify({ nome: 'Mario', cognome: 'Rossi' }),
  })
}

function webauthnOptionsRequest() {
  return new Request('http://localhost/api/auth/webauthn/register/options', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost' },
  })
}

describe('N11 security — soft-deleted mai 200 (spec R2 §6)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Simula esattamente il fail-closed di lab-context.ts: riga `utenti`
    // filtrata da deleted_at → context null, qualunque sia la via d'identità.
    mockGetLabContextWithTimings.mockResolvedValue({
      context: null,
      timings: { authMs: 1, dbMs: 0 },
    })
    mockGetFreshLabContext.mockResolvedValue(null)
    mockFrom.mockImplementation((table: string) => {
      throw new Error(`Unexpected table access for soft-deleted user: ${table}`)
    })
  })

  it('GET /api/clienti (categoria A, GET allowlist) → 401, MAI 200', async () => {
    const res = await clientiGET(new Request('http://localhost/api/clienti?q=Rossi'))
    expect(res.status).toBe(401)
    expect(res.status).not.toBe(200)
  })

  it('POST /api/clienti (mutazione categoria B) → 401, MAI 200', async () => {
    const res = await clientiPOST(clientiPostRequest())
    expect(res.status).toBe(401)
    expect(res.status).not.toBe(200)
  })

  it('GET /api/fatture (categoria C, fiscale) → 401, MAI 200', async () => {
    const res = await fattureGET()
    expect(res.status).toBe(401)
    expect(res.status).not.toBe(200)
  })

  it('verifyTitolare() → null, mai un TitolareContext valido', async () => {
    const result = await verifyTitolare()
    expect(result).toBeNull()
  })

  it('verifyAdminRete() → null, mai un AdminReteContext valido', async () => {
    const result = await verifyAdminRete('rete-1')
    expect(result).toBeNull()
  })

  it('POST /api/auth/webauthn/register/options → 401, MAI 200 (chiude enrollment per soft-deleted)', async () => {
    const res = await webauthnRegisterOptionsPOST(webauthnOptionsRequest())
    expect(res.status).toBe(401)
    expect(res.status).not.toBe(200)
  })
})
