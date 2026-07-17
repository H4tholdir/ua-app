import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/utils/csrf', () => ({ isSameOrigin: () => true }))

import { PATCH } from '../../src/app/api/lavori/[id]/fasi/[fase_id]/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/lavori/lavoro-1/fasi/fase-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

const params = Promise.resolve({ id: 'lavoro-1', fase_id: 'fase-1' })

describe('PATCH /api/lavori/[id]/fasi/[fase_id] — tecnico_id server-side', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('esito valorizzato + utente con record tecnici → tecnico_id risolto dal server, non dal body', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'tecnici') return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: { id: 'tecnico-99' }, error: null }) }) }) }) }
      if (table === 'lavori_fasi') {
        return {
          update: (payload: Record<string, unknown>) => {
            updateSpy(payload)
            return { eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'fase-1', ...payload }, error: null }) }) }) }) }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    // Il client tenta di impostare un tecnico_id arbitrario: deve essere ignorato.
    await PATCH(req({ esito: 'ok', eseguita_at: '2026-07-04T10:00:00Z', tecnico_id: 'tecnico-fasullo' }), { params })

    expect(updateSpy).toHaveBeenCalledWith(expect.objectContaining({ tecnico_id: 'tecnico-99' }))
  })

  it('esito valorizzato + utente SENZA record tecnici (es. titolare) → tecnico_id non impostato, nessun errore bloccante', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'tecnici') return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }) }
      if (table === 'lavori_fasi') {
        return {
          update: (payload: Record<string, unknown>) => {
            updateSpy(payload)
            return { eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'fase-1', ...payload }, error: null }) }) }) }) }) }) }
          },
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await PATCH(req({ esito: 'ok', eseguita_at: '2026-07-04T10:00:00Z' }), { params })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(expect.not.objectContaining({ tecnico_id: expect.anything() }))
  })

  it('esito assente dal body (es. solo azione_correttiva) → non risolve tecnico_id, nessuna query su tecnici', async () => {
    const tecniciQuerySpy = vi.fn()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }) }) }) }
      if (table === 'tecnici') { tecniciQuerySpy(); throw new Error('non deve essere chiamato') }
      if (table === 'lavori_fasi') {
        return { update: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ select: () => ({ single: async () => ({ data: { id: 'fase-1' }, error: null }) }) }) }) }) }) }) }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await PATCH(req({ azione_correttiva: 'sostituito lotto materiale' }), { params })

    expect(res.status).toBe(200)
    expect(tecniciQuerySpy).not.toHaveBeenCalled()
  })

  it('errore sul lookup laboratorio → 401 (fail-closed getFreshLabContext, Task 10)', async () => {
    // DEVIAZIONE DICHIARATA (stesso pattern Task 9, concern #3): con
    // getFreshLabContext qualunque impossibilità di risolvere il contesto —
    // utente assente, soft-deleted, O errore DB imprevisto nel lookup — viene
    // loggata (console.error in lab-context.ts) ma collassa fail-closed su
    // context null → 401. Non più 500 "non mascherato": il 401 qui non
    // maschera un permesso negato, riflette l'impossibilità di stabilire un
    // contesto affidabile.
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') return { select: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: null, error: { message: 'db down' } }) }) }) }) }
      throw new Error(`Unexpected table: ${table}`)
    })

    const res = await PATCH(req({ esito: 'ok' }), { params })

    expect(res.status).toBe(401)
  })
})
