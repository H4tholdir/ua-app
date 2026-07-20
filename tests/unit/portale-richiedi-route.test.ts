import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockRpc, mockTriggerPushByRole } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockTriggerPushByRole: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))
vi.mock('@/lib/notifications/trigger', () => ({
  triggerPushByRole: mockTriggerPushByRole,
}))
import { POST } from '../../src/app/api/portale/richiedi/route'

let insertPayload: Record<string, unknown> | null

function req(body: unknown): Request {
  return new Request('http://localhost/api/portale/richiedi', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function clienteRow() {
  return {
    data: {
      id: 'cli-1', laboratorio_id: 'lab-1', portale_token_scade_at: null,
      laboratori: { stato: 'attivo' },
      studio_nome: 'Studio Rossi', nome: 'Mario', cognome: 'Rossi',
    },
    error: null,
  }
}

beforeEach(() => {
  insertPayload = null
  mockTriggerPushByRole.mockReset()
  mockTriggerPushByRole.mockResolvedValue(undefined)
  mockRpc.mockResolvedValue({ data: 7, error: null }) // genera_progressivo
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clienti') {
      return { select: () => ({ eq: () => ({ is: () => ({ single: async () => (clienteRow()) }) }) }) }
    }
    if (table === 'lavori') {
      return {
        // rate-limit: count
        select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }) }),
        // insert
        insert: (payload: Record<string, unknown>) => {
          insertPayload = payload
          return { select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: '2026/0007' }, error: null }) }) }
        },
      }
    }
    throw new Error(`tabella non mockata: ${table}`)
  })
})

describe('POST /api/portale/richiedi — campi puliti', () => {
  it('scrive note_dentista/da_portale/paziente_codice_richiesta e lascia note_interne vuota', async () => {
    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28', note: 'colore A2',
    }))
    expect(res.status).toBe(201)
    expect(insertPayload?.note_dentista).toBe('colore A2')
    expect(insertPayload?.da_portale).toBe(true)
    expect(insertPayload?.paziente_codice_richiesta).toBe('MR-2026')
    // note_interne NON deve contenere il vecchio marcatore
    expect(insertPayload?.note_interne ?? null).toBeNull()
  })

  it('rate-limit su da_portale: ≥10 richieste/24h → 429', async () => {
    // Ridefinisci il ramo 'lavori' per far tornare count 10 al conteggio.
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({
          data: { id: 'cli-1', laboratorio_id: 'lab-1', portale_token_scade_at: null, laboratori: { stato: 'attivo' } }, error: null,
        }) }) }) }) }
      }
      if (table === 'lavori') {
        return { select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: 10, error: null }) }) }) }) }
      }
      throw new Error(`tabella non mockata: ${table}`)
    })
    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28', note: 'x',
    }))
    expect(res.status).toBe(429)
  })
})

describe('POST /api/portale/richiedi — push A8', () => {
  it('insert riuscito → push a titolare E front_desk, senza dati paziente', async () => {
    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28', note: 'colore A2',
    }))
    expect(res.status).toBe(201)
    expect(mockTriggerPushByRole).toHaveBeenCalledTimes(2)

    const roles = mockTriggerPushByRole.mock.calls.map(c => c[1])
    expect(roles).toContain('titolare')
    expect(roles).toContain('front_desk')

    for (const call of mockTriggerPushByRole.mock.calls) {
      const [labId, , payload] = call
      expect(labId).toBe('lab-1')
      expect(payload).toEqual({
        title: 'Nuova richiesta dal portale',
        body: 'Studio Rossi ha richiesto: Protesi fissa (n.2026/0007)',
        url: '/lavori/lav-1',
      })
      const serialized = JSON.stringify(payload)
      expect(serialized).not.toMatch(/paziente/i)
      expect(serialized).not.toMatch(/MR-2026/)
    }
  })

  it('usa nome + cognome quando studio_nome è null', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({
          data: {
            id: 'cli-1', laboratorio_id: 'lab-1', portale_token_scade_at: null,
            laboratori: { stato: 'attivo' },
            studio_nome: null, nome: 'Mario', cognome: 'Rossi',
          },
          error: null,
        }) }) }) }) }
      }
      if (table === 'lavori') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }) }),
          insert: (payload: Record<string, unknown>) => {
            insertPayload = payload
            return { select: () => ({ single: async () => ({ data: { id: 'lav-1', numero_lavoro: '2026/0007' }, error: null }) }) }
          },
        }
      }
      throw new Error(`tabella non mockata: ${table}`)
    })

    await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28',
    }))

    const payload = mockTriggerPushByRole.mock.calls[0][2]
    expect(payload.body).toBe('Mario Rossi ha richiesto: Protesi fissa (n.2026/0007)')
  })

  it('insert fallito → triggerPushByRole mai chiamato', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => (clienteRow()) }) }) }) }
      }
      if (table === 'lavori') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: 0, error: null }) }) }) }),
          insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'boom' } }) }) }),
        }
      }
      throw new Error(`tabella non mockata: ${table}`)
    })

    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28',
    }))
    expect(res.status).toBe(500)
    expect(mockTriggerPushByRole).not.toHaveBeenCalled()
  })

  it('push reject → risposta resta comunque 201', async () => {
    mockTriggerPushByRole.mockRejectedValue(new Error('push down'))

    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28',
    }))
    expect(res.status).toBe(201)
  })

  it('oltre rate-limit (count ≥10) → 429 e triggerPushByRole mai chiamato', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'clienti') {
        return { select: () => ({ eq: () => ({ is: () => ({ single: async () => (clienteRow()) }) }) }) }
      }
      if (table === 'lavori') {
        return { select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ count: 10, error: null }) }) }) }) }
      }
      throw new Error(`tabella non mockata: ${table}`)
    })

    const res = await POST(req({
      token: 'tok-1', tipo_dispositivo: 'protesi_fissa', descrizione: 'Corona 14',
      paziente_codice: 'MR-2026', data_consegna_prevista: '2026-07-28',
    }))
    expect(res.status).toBe(429)
    expect(mockTriggerPushByRole).not.toHaveBeenCalled()
  })
})
