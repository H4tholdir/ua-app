// tests/unit/n11bis-impersonate.test.ts
// Security test N11-bis: il lookup del titolare TARGET nella route di
// impersonation deve filtrare `deleted_at IS NULL`. Senza il filtro, un
// titolare soft-deleted resta impersonabile — la route genererebbe un
// magiclink di login FUNZIONANTE per un account che dovrebbe essere spento.
// N11 chiudeva il caso dell'utente CHIAMANTE soft-deleted (via lab-context);
// N11-bis chiude il caso dell'utente BERSAGLIO soft-deleted.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetFreshLabContext, mockFrom, mockGenerateLink } = vi.hoisted(() => ({
  mockGetFreshLabContext: vi.fn(),
  mockFrom: vi.fn(),
  mockGenerateLink: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    auth: { admin: { generateLink: mockGenerateLink } },
  }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST as impersonatePOST } from '../../src/app/api/admin/labs/[id]/impersonate/route'

// Query builder che registra se `.is('deleted_at', null)` è stato applicato.
// Il titolare esiste nel DB ma è soft-deleted: viene restituito SOLO se il
// codice NON applica il filtro deleted_at (cioè, solo se il bug è presente).
function makeUtentiBuilder(softDeletedTitolare: Record<string, unknown>) {
  const state = { deletedAtFiltered: false }
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    is: (col: string, val: unknown) => {
      if (col === 'deleted_at' && val === null) state.deletedAtFiltered = true
      return builder
    },
    maybeSingle: async () =>
      state.deletedAtFiltered
        ? { data: null, error: null }
        : { data: softDeletedTitolare, error: null },
  }
  return builder
}

function impersonateRequest() {
  return new Request('http://localhost/api/admin/labs/lab-1/impersonate', {
    method: 'POST',
    headers: { origin: 'http://localhost', host: 'localhost' },
  })
}

describe('N11-bis security — titolare soft-deleted non impersonabile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Chiamante = admin_sistema legittimo (passa verifyAdmin).
    mockGetFreshLabContext.mockResolvedValue({
      userId: 'admin-1',
      email: 'admin@ua.it',
      ruolo: 'admin_sistema',
      laboratorioId: null,
      nome: 'Admin',
      cognome: 'Sistema',
      lab: null,
    })
    // Il DB contiene un titolare soft-deleted per lab-1.
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return makeUtentiBuilder({
          id: 'titolare-deleted',
          nome: 'Filippo',
          cognome: 'Cancellato',
          email: 'filippo@lab.it',
        })
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    // Se il codice arrivasse a generare il link, restituirebbe un token valido.
    mockGenerateLink.mockResolvedValue({
      data: { properties: { hashed_token: 'HASHED_TOKEN' } },
      error: null,
    })
  })

  it('POST impersonate su titolare soft-deleted → 404, MAI un magiclink', async () => {
    const res = await impersonatePOST(impersonateRequest(), {
      params: Promise.resolve({ id: 'lab-1' }),
    })

    expect(res.status).toBe(404)
    // Il vettore critico: nessun link di login deve essere generato.
    expect(mockGenerateLink).not.toHaveBeenCalled()
  })
})
