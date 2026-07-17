import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc } = vi.hoisted(() => ({ mockFrom: vi.fn(), mockRpc: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { hashPin } from '@/lib/portale/pin'
import { POST } from '../../src/app/api/portale/[token]/pin/route'

const ctx = { params: Promise.resolve({ token: 'tok-1' }) }
function req(pin: string): Request {
  return new Request('http://localhost/api/portale/tok-1/pin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.2.3.4', 'user-agent': 'vitest' },
    body: JSON.stringify({ pin }),
  })
}

let cliente: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let rateLimitCount = 0
let updatePayload: Record<string, unknown> | null

beforeEach(() => {
  vi.stubEnv('PORTALE_PIN_PEPPER', 'pepper-test')
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  auditInserts = []
  rateLimitCount = 0
  updatePayload = null
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true, laboratori: { stato: 'attivo' },
    portale_pin_hash: hashPin('483951'), portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  mockRpc.mockReset()
  mockRpc.mockResolvedValue({ data: [{ tentativi: 1, bloccato_fino_a: null }], error: null })
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return {
        select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }),
        update: (p: Record<string, unknown>) => { updatePayload = p; return { eq: async () => ({ error: null }) } },
      }
    }
    // portale_accessi: insert audit + count rate-limit
    return {
      insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: null } },
      select: () => ({
        eq: () => ({ in: () => ({ gte: async () => ({ count: rateLimitCount, error: null }) }) }),
      }),
    }
  })
})

describe('POST /api/portale/[token]/pin', () => {
  it('successo: 200, cookie di sessione, contatori azzerati, audit pin_ok con IP e UA', async () => {
    const res = await POST(req('483951'), ctx)
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('ua_portale_sessione=')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Strict')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('Max-Age=1800')
    expect(updatePayload).toMatchObject({ portale_pin_tentativi: 0, portale_pin_bloccato_fino_a: null })
    expect(auditInserts.some((a) => a.azione === 'pin_ok' && a.ip_address === '1.2.3.4' && a.user_agent === 'vitest')).toBe(true)
  })

  it('PIN errato: 401 con tentativi_rimasti, delega alla RPC atomica (F4), audit pin_errato', async () => {
    const res = await POST(req('000001'), ctx)
    expect(res.status).toBe(401)
    expect(mockRpc).toHaveBeenCalledWith('portale_pin_tentativo_fallito', { p_cliente_id: 'cli-1' })
    const json = await res.json()
    expect(json.tentativi_rimasti).toBe(4)
    expect(auditInserts.some((a) => a.azione === 'pin_errato')).toBe(true)
  })

  it('5° errore: la RPC blocca → 429 pin_bloccato con riprova_alle', async () => {
    const fra15 = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    mockRpc.mockResolvedValue({ data: [{ tentativi: 5, bloccato_fino_a: fra15 }], error: null })
    const res = await POST(req('000001'), ctx)
    expect(res.status).toBe(429)
    expect((await res.json()).riprova_alle).toBe(fra15)
    expect(auditInserts.some((a) => a.azione === 'pin_bloccato')).toBe(true)
  })

  it('già bloccato: 429 senza nemmeno verificare il PIN', async () => {
    cliente!.portale_pin_bloccato_fino_a = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    const res = await POST(req('483951'), ctx)
    expect(res.status).toBe(429)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('interruttore OFF → 403; PIN non impostato → 403', async () => {
    cliente!.portale_fatturazione_attiva = false
    expect((await POST(req('483951'), ctx)).status).toBe(403)
    cliente!.portale_fatturazione_attiva = true
    cliente!.portale_pin_hash = null
    expect((await POST(req('483951'), ctx)).status).toBe(403)
  })

  it('token invalido/scaduto → 401 uniforme (F13)', async () => {
    cliente = null
    const res = await POST(req('483951'), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })

  it('rate limit per-IP: 20 eventi negli ultimi 15 min → 429 (F5)', async () => {
    rateLimitCount = 20
    expect((await POST(req('483951'), ctx)).status).toBe(429)
  })

  it('formato PIN non valido → 400 senza toccare contatori', async () => {
    expect((await POST(req('12ab56'), ctx)).status).toBe(400)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('audit pin_ok fallito → 500 (fail-loud, mai ingoiato)', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return {
          select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }),
          update: () => ({ eq: async () => ({ error: null }) }),
        }
      }
      return {
        insert: async () => ({ error: { message: 'insert ko' } }),
        select: () => ({ eq: () => ({ in: () => ({ gte: async () => ({ count: 0, error: null }) }) }) }),
      }
    })
    expect((await POST(req('483951'), ctx)).status).toBe(500)
  })

  it('nessuna risposta contiene mai l\'hash del PIN', async () => {
    for (const pin of ['483951', '000001']) {
      const res = await POST(req(pin), ctx)
      expect(JSON.stringify(await res.json())).not.toContain('scrypt$')
    }
  })
})
