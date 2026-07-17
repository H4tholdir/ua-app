import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain, type MockChain } from './helpers/supabase-chain-mock'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))
vi.mock('@/lib/supabase/server-service', () => ({ getServiceClient: () => ({ from: mockFrom }) }))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

const { mockTriggerPushByRole } = vi.hoisted(() => ({ mockTriggerPushByRole: vi.fn() }))
vi.mock('@/lib/notifications/trigger', () => ({ triggerPushByRole: mockTriggerPushByRole }))

import { creaSessioneEconomica, SESSIONE_ECONOMICA_COOKIE } from '@/lib/portale/sessione'
import { POST } from '../../src/app/api/portale/[token]/fatturazione/[lavoro_id]/route'

const ctx = { params: Promise.resolve({ token: 'tok-1', lavoro_id: 'lav-1' }) }

function req(body: unknown, opts: { cookie?: string; rawBody?: string } = {}): Request {
  const cookie = 'cookie' in opts ? opts.cookie : cookieValido()
  return new Request('http://localhost/api/portale/tok-1/fatturazione/lav-1', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '1.2.3.4',
      'user-agent': 'vitest',
      ...(cookie ? { cookie } : {}),
    },
    body: opts.rawBody !== undefined ? opts.rawBody : JSON.stringify(body),
  })
}
function cookieValido(): string {
  return `${SESSIONE_ECONOMICA_COOKIE}=${creaSessioneEconomica('cli-1', 1)}`
}

let cliente: Record<string, unknown> | null
let fatturaRows: Array<Record<string, unknown>>
let fatturaErrore: { message: string } | null
let aggiornati: Array<Record<string, unknown>>
let updErrore: { message: string } | null
let esisteData: Record<string, unknown> | null
let updatePayload: Record<string, unknown> | null
let lastUpdateChain: MockChain | null
let auditInserts: Array<Record<string, unknown>>
let auditInsertError: { message: string } | null
let pushCount: number

beforeEach(() => {
  vi.stubEnv('PORTALE_SESSION_SECRET', 'secret-test')
  mockTriggerPushByRole.mockReset()
  cliente = {
    id: 'cli-1', laboratorio_id: 'lab-1', studio_nome: 'Studio Bianchi',
    portale_token_scade_at: null, portale_fatturazione_attiva: true, laboratori: { stato: 'attivo' },
    portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_tentativi: 0,
    portale_pin_bloccato_fino_a: null, portale_pin_generation: 1,
  }
  fatturaRows = []
  fatturaErrore = null
  aggiornati = [{ id: 'lav-1' }]
  updErrore = null
  esisteData = null
  updatePayload = null
  lastUpdateChain = null
  auditInserts = []
  auditInsertError = null
  pushCount = 1

  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ maybeSingle: async () => ({ data: cliente, error: null }) }) }) }) }
    }
    if (table === 'fatture') {
      return createChain(fatturaErrore ? { data: null, error: fatturaErrore } : { data: fatturaRows, error: null })
    }
    if (table === 'lavori') {
      const chainReread = createChain({ data: esisteData, error: null })
      return {
        update: (payload: Record<string, unknown>) => {
          updatePayload = payload
          lastUpdateChain = createChain(updErrore ? { data: null, error: updErrore } : { data: aggiornati, error: null })
          return lastUpdateChain
        },
        select: (...args: unknown[]) => (chainReread.select as (...a: unknown[]) => MockChain)(...args),
      }
    }
    // portale_accessi
    return {
      insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: auditInsertError } },
      select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: pushCount, error: null }) }) }) }),
    }
  })
})

describe('POST /api/portale/[token]/fatturazione/[lavoro_id]', () => {
  it('1. successo: 200, update SOLO proposta_dentista/proposta_at, audit con lavoro_id/dettaglio/IP/UA', async () => {
    const res = await POST(req({ proposta: 'fatturare' }), ctx)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ ok: true, proposta: 'fatturare' })
    expect(Object.keys(updatePayload!).sort()).toEqual(['proposta_at', 'proposta_dentista'])
    expect(updatePayload!.proposta_dentista).toBe('fatturare')

    const audit = auditInserts.find((a) => a.azione === 'proposta_fatturazione')
    expect(audit).toBeTruthy()
    expect(audit!.lavoro_id).toBe('lav-1')
    expect((audit!.dettaglio as { proposta: string }).proposta).toBe('fatturare')
    expect(audit!.ip_address).toBe('1.2.3.4')
    expect(audit!.user_agent).toBe('vitest')
  })

  it('1b. non deve mai spreadare il body anche con campi extra tipo prezzo_unitario', async () => {
    const res = await POST(req({ proposta: 'non_fatturare', prezzo_unitario: 1 }), ctx)
    expect(res.status).toBe(200)
    expect(Object.keys(updatePayload!).sort()).toEqual(['proposta_at', 'proposta_dentista'])
    expect(updatePayload).not.toHaveProperty('prezzo_unitario')
  })

  it('2. UPDATE condizionale I-5: la chain registra tutti i filtri di stato', async () => {
    await POST(req({ proposta: 'fatturare' }), ctx)
    expect(lastUpdateChain).not.toBeNull()
    const calls = lastUpdateChain!.calls
    expect(calls).toContainEqual({ method: 'eq', args: ['stato', 'consegnato'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['decisione_fatturazione', 'in_attesa'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['incluso_in_fattura', false] })
    expect(calls).toContainEqual({ method: 'eq', args: ['id', 'lav-1'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['cliente_id', 'cli-1'] })
    expect(calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-1'] })
  })

  it('3. 0 righe aggiornate + lavoro esistente → 409 non_modificabile', async () => {
    aggiornati = []
    esisteData = { id: 'lav-1' }
    const res = await POST(req({ proposta: 'fatturare' }), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).errore).toBe('non_modificabile')
  })

  it('4. 0 righe + lavoro inesistente/di altro cliente → 404 (mai 403 disambiguante)', async () => {
    aggiornati = []
    esisteData = null
    const res = await POST(req({ proposta: 'fatturare' }), ctx)
    expect(res.status).toBe(404)
    expect((await res.json()).errore).toBe('non_trovato')
  })

  it('5a. gate fattura attiva: fatture con 1 riga → 409 gia_fatturato, update MAI chiamato', async () => {
    fatturaRows = [{ id: 'fatt-1' }]
    const res = await POST(req({ proposta: 'fatturare' }), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).errore).toBe('gia_fatturato')
    expect(updatePayload).toBeNull()
  })

  it('5b. errore lettura fatture → 500 fail-closed', async () => {
    fatturaErrore = { message: 'boom' }
    const res = await POST(req({ proposta: 'fatturare' }), ctx)
    expect(res.status).toBe(500)
    expect(updatePayload).toBeNull()
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })

  it('6. body invalido: proposta sconosciuta → 400; body non JSON → 400', async () => {
    const res1 = await POST(req({ proposta: 'boh' }), ctx)
    expect(res1.status).toBe(400)
    const res2 = await POST(req(null, { rawBody: 'non-json{{{' }), ctx)
    expect(res2.status).toBe(400)
  })

  it('7a. push aggregata: conteggio recente = 1 → push a titolare E front_desk senza prezzi', async () => {
    pushCount = 1
    await POST(req({ proposta: 'fatturare' }), ctx)
    expect(mockTriggerPushByRole).toHaveBeenCalledTimes(2)
    const ruoli = mockTriggerPushByRole.mock.calls.map((c) => c[1])
    expect(ruoli).toContain('titolare')
    expect(ruoli).toContain('front_desk')
    for (const call of mockTriggerPushByRole.mock.calls) {
      expect(call[0]).toBe('lab-1')
      expect(JSON.stringify(call[2])).not.toMatch(/€|\d+[.,]\d{2}/)
    }
  })

  it('7b. push aggregata: conteggio recente = 3 → push NON chiamata', async () => {
    pushCount = 3
    await POST(req({ proposta: 'fatturare' }), ctx)
    expect(mockTriggerPushByRole).not.toHaveBeenCalled()
  })

  it('8. audit fallito → 500 (fail-loud)', async () => {
    auditInsertError = { message: 'insert ko' }
    const res = await POST(req({ proposta: 'fatturare' }), ctx)
    expect(res.status).toBe(500)
    expect(mockTriggerPushByRole).not.toHaveBeenCalled()
  })

  it('9. guardie: senza sessione → 401; interruttore OFF → 403; token invalido → 401 uniforme', async () => {
    expect((await POST(req({ proposta: 'fatturare' }, { cookie: undefined }), ctx)).status).toBe(401)

    cliente!.portale_fatturazione_attiva = false
    expect((await POST(req({ proposta: 'fatturare' }), ctx)).status).toBe(403)
    cliente!.portale_fatturazione_attiva = true

    cliente = null
    const res = await POST(req({ proposta: 'fatturare' }), ctx)
    expect(res.status).toBe(401)
    expect((await res.json()).errore).toBe('non_autorizzato')
  })
})
