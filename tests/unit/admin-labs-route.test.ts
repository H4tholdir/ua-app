import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockStripeCreate } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockStripeCreate: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/stripe/server', () => ({
  stripe: { customers: { create: mockStripeCreate } },
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { POST } from '../../src/app/api/admin/labs/route'

function postRequest(body: unknown) {
  return new Request('http://localhost/api/admin/labs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const BODY_VALIDO = {
  nome: 'Lab Test',
  ragione_sociale: 'Lab Test SRL',
  partita_iva: '01234567890',
  email_titolare: 'titolare@test.local',
}

function mockTabelle(opts: {
  existing: { id: string } | null
  insertError?: { code: string; message: string } | null
  updateError?: { message: string } | null
}) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return { select: () => ({ eq: () => ({ single: async () => ({ data: { ruolo: 'admin_sistema' }, error: null }) }) }) }
    }
    if (table === 'laboratori') {
      return {
        select: () => ({
          eq: () => ({
            in: () => ({
              is: () => ({ maybeSingle: async () => ({ data: opts.existing, error: null }) }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () =>
              opts.insertError
                ? { data: null, error: opts.insertError }
                : { data: { id: 'lab-nuovo', nome: BODY_VALIDO.nome, partita_iva: BODY_VALIDO.partita_iva, stato: 'trial' }, error: null },
          }),
        }),
        update: () => ({
          eq: () => ({
            select: () => ({
              single: async () =>
                opts.updateError
                  ? { data: null, error: opts.updateError }
                  : {
                      data: { id: 'lab-nuovo', nome: BODY_VALIDO.nome, partita_iva: BODY_VALIDO.partita_iva, stato: 'trial', stripe_customer_id: 'cus_nuovo' },
                      error: null,
                    },
            }),
          }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('POST /api/admin/labs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
    mockStripeCreate.mockResolvedValue({ id: 'cus_nuovo' })
  })

  it('P.IVA già registrata con abbonamento attivo (precheck applicativo) → 409, Stripe mai invocato', async () => {
    mockTabelle({ existing: { id: 'lab-esistente' } })
    const res = await POST(postRequest(BODY_VALIDO))
    expect(res.status).toBe(409)
    expect(mockStripeCreate).not.toHaveBeenCalled()
  })

  it('nessun duplicato → 201, insert avviene PRIMA della creazione del cliente Stripe', async () => {
    mockTabelle({ existing: null })
    const res = await POST(postRequest(BODY_VALIDO))
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.stripe_customer_id).toBe('cus_nuovo')
    expect(mockStripeCreate).toHaveBeenCalledTimes(1)
  })

  it('race condition: due richieste concorrenti passano entrambe il precheck, la seconda viola il vincolo UNIQUE (23505) → 409 pulito, Stripe mai invocato per la richiesta perdente', async () => {
    // existing: null simula il precheck che vede ancora nessun duplicato (la
    // race dell'altra richiesta non è ancora committata) — la protezione
    // reale arriva dal vincolo UNIQUE del DB al momento dell'insert, PRIMA
    // che venga creato alcun cliente Stripe.
    mockTabelle({
      existing: null,
      insertError: { code: '23505', message: 'duplicate key value violates unique constraint "laboratori_partita_iva_attivi_key"' },
    })
    const res = await POST(postRequest(BODY_VALIDO))
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error).not.toMatch(/laboratori_partita_iva_attivi_key|duplicate key value/i)
    expect(mockStripeCreate).not.toHaveBeenCalled()
  })

  it('errore insert non da unique-violation → resta 500, non declassato a 409', async () => {
    mockTabelle({ existing: null, insertError: { code: '08006', message: 'connection failure' } })
    const res = await POST(postRequest(BODY_VALIDO))
    expect(res.status).toBe(500)
    expect(mockStripeCreate).not.toHaveBeenCalled()
  })

  it('insert riuscito ma update stripe_customer_id fallito → 500, lab già creato non viene perso (nessun customer Stripe orfano non collegato)', async () => {
    mockTabelle({ existing: null, updateError: { message: 'boom' } })
    const res = await POST(postRequest(BODY_VALIDO))
    expect(res.status).toBe(500)
    expect(mockStripeCreate).toHaveBeenCalledTimes(1)
  })
})
