// tests/unit/clienti-patch-portale.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetLabContextWithTimings, mockGetFreshLabContext } = vi.hoisted(() => ({
  mockFrom: vi.fn(), mockGetLabContextWithTimings: vi.fn(), mockGetFreshLabContext: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
// GET usa getLabContextWithTimings (Task 9); PATCH (Task 10) usa getFreshLabContext.
vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
  getFreshLabContext: mockGetFreshLabContext,
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH, GET } from '../../src/app/api/clienti/[id]/route'

function req(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/clienti/cli-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
}
const ctx = { params: Promise.resolve({ id: 'cli-1' }) }

let updatePayload: Record<string, unknown> | null
let auditInserts: Array<Record<string, unknown>>
let ruolo = 'titolare'
let clienteAttuale: Record<string, unknown>

beforeEach(() => {
  vi.stubEnv('PORTALE_PIN_PEPPER', 'pepper-test')
  updatePayload = null
  auditInserts = []
  ruolo = 'titolare'
  clienteAttuale = {
    portale_pin_hash: null, portale_pin_generation: 0, portale_fatturazione_attiva: false,
  }
  mockGetLabContextWithTimings.mockResolvedValue({
    context: {
      userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: 'lab-1',
      nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
    },
    timings: { authMs: 1, dbMs: 2 },
  })
  mockGetFreshLabContext.mockImplementation(async () => ({
    userId: 'user-1', email: null, ruolo, laboratorioId: 'lab-1', nome: null, cognome: null, lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
  }))
  mockFrom.mockImplementation((table: string) => {
    if (table === 'portale_accessi') {
      return { insert: async (row: Record<string, unknown>) => { auditInserts.push(row); return { error: null } } }
    }
    // clienti: select (stato attuale) + update (cattura payload)
    return {
      select: () => ({
        eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: clienteAttuale, error: null }) }) }) }),
      }),
      update: (payload: Record<string, unknown>) => {
        updatePayload = payload
        return { eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'cli-1', nome: 'M', cognome: 'R', studio_nome: null, updated_at: 'x' }, error: null }) }) }) }) }) }
      },
    }
  })
})

describe('PATCH clienti — campi portale', () => {
  it('403 se un tecnico tocca i campi portale', async () => {
    ruolo = 'tecnico'
    const res = await PATCH(req({ portale_fatturazione_attiva: true }), ctx)
    expect(res.status).toBe(403)
  })

  it('400 su PIN banale', async () => {
    const res = await PATCH(req({ portale_pin: '123456' }), ctx)
    expect(res.status).toBe(400)
  })

  it('PIN valido: hash scrypt, generation+1, contatori azzerati, audit pin_impostato con autore', async () => {
    const res = await PATCH(req({ portale_pin: '483951' }), ctx)
    expect(res.status).toBe(200)
    expect(String(updatePayload!.portale_pin_hash)).toMatch(/^scrypt\$32768\$8\$1\$/)
    expect(updatePayload).toMatchObject({ portale_pin_generation: 1, portale_pin_tentativi: 0, portale_pin_bloccato_fino_a: null })
    expect(updatePayload).not.toHaveProperty('portale_pin')
    expect(auditInserts).toHaveLength(1)
    expect(auditInserts[0]).toMatchObject({ azione: 'pin_impostato', cliente_id: 'cli-1' })
    expect((auditInserts[0].dettaglio as Record<string, unknown>).autore).toBe('user-1')
  })

  it('cambio PIN con hash già presente → azione pin_reimpostato', async () => {
    clienteAttuale = { ...clienteAttuale, portale_pin_hash: 'scrypt$32768$8$1$a$b', portale_pin_generation: 2 }
    await PATCH(req({ portale_pin: '483951' }), ctx)
    expect(updatePayload).toMatchObject({ portale_pin_generation: 3 })
    expect(auditInserts[0]).toMatchObject({ azione: 'pin_reimpostato' })
  })

  it('interruttore: solo boolean, audit interruttore_on quando cambia', async () => {
    expect((await PATCH(req({ portale_fatturazione_attiva: 'si' }), ctx)).status).toBe(400)
    const res = await PATCH(req({ portale_fatturazione_attiva: true }), ctx)
    expect(res.status).toBe(200)
    expect(updatePayload).toMatchObject({ portale_fatturazione_attiva: true })
    expect(auditInserts.some((a) => a.azione === 'interruttore_on')).toBe(true)
  })

  it('la risposta non contiene mai l\'hash', async () => {
    const res = await PATCH(req({ portale_pin: '483951' }), ctx)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('scrypt$')
  })
})

describe('GET clienti — campi portale derivati', () => {
  function mockGetChain(clienteData: Record<string, unknown> | null, errore: { code?: string; message?: string } | null = null) {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { laboratorio_id: 'lab-1', ruolo: 'titolare' }, error: null }) }) }) }
      }
      if (table === 'lavori') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ gte: () => ({ is: async () => ({ count: 3, error: null }) }) }) }) }),
        }
      }
      // clienti
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: clienteData, error: errore }) }) }) }),
        }),
      }
    })
  }

  it('espone portale_pin_impostato boolean, mai l\'hash', async () => {
    mockGetChain({
      id: 'cli-1',
      portale_pin_hash: 'scrypt$32768$8$1$a$b',
      portale_fatturazione_attiva: true,
    })
    const res = await GET(new Request('http://localhost/api/clienti/cli-1'), ctx)
    const json = await res.json()
    expect(JSON.stringify(json)).not.toContain('scrypt$')
    expect(res.status).toBe(200)
    expect(json.cliente.portale_pin_impostato).toBe(true)
    expect(json.cliente).not.toHaveProperty('portale_pin_hash')
  })

  it('portale_pin_impostato false quando l\'hash è null', async () => {
    mockGetChain({
      id: 'cli-1',
      portale_pin_hash: null,
      portale_fatturazione_attiva: false,
    })
    const res = await GET(new Request('http://localhost/api/clienti/cli-1'), ctx)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.cliente.portale_pin_impostato).toBe(false)
  })
})
