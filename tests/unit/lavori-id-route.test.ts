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

import { PATCH } from '../../src/app/api/lavori/[id]/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'

function req(body: Record<string, unknown>) {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost', host: 'localhost' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

const params = Promise.resolve({ id: LAVORO_ID })

/**
 * Helper per costruire il mock di `svc.from(table)` usato dalla route.
 *
 * Tabelle coinvolte:
 * - 'utenti'  → risoluzione laboratorio_id dell'utente autenticato
 * - 'lavori'  → SELECT incluso_in_fattura (pre-check) + UPDATE finale
 * - FK tables ('clienti', 'pazienti', 'tecnici', 'cicli_produzione') → validazione cross-tenant
 */
function buildMockFrom(opts: {
  inclusoInFattura?: boolean
  updateSpy: (payload: Record<string, unknown>) => void
  fkOk?: boolean
}) {
  const { inclusoInFattura = false, updateSpy, fkOk = true } = opts

  return vi.fn((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }),
          }),
        }),
      }
    }

    if (table === 'lavori') {
      return {
        select: (cols: string) => {
          // Prima select: pre-check incluso_in_fattura
          if (cols === 'incluso_in_fattura') {
            return {
              eq: () => ({
                eq: () => ({
                  is: () => ({
                    single: async () => ({
                      data: { incluso_in_fattura: inclusoInFattura },
                      error: null,
                    }),
                  }),
                }),
              }),
            }
          }
          // Select finale dopo update
          return {
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: LAVORO_ID, numero_lavoro: 'L-001', stato: 'in_lavorazione', updated_at: '2026-07-05T00:00:00Z' },
                  error: null,
                }),
              }),
            }),
          }
        },
        update: (payload: Record<string, unknown>) => {
          updateSpy(payload)
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({
                    data: { id: LAVORO_ID, numero_lavoro: 'L-001', stato: 'in_lavorazione', updated_at: '2026-07-05T00:00:00Z' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        },
      }
    }

    // FK tables
    if (['clienti', 'pazienti', 'tecnici', 'cicli_produzione'].includes(table)) {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                single: async () => ({
                  data: fkOk ? { id: 'fk-ok-id' } : null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('PATCH /api/lavori/[id] — allowlist esplicita', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('campo allowlisted valido (descrizione) → 200, arriva nel payload di update', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy }))

    const res = await PATCH(req({ descrizione: 'Corona ceramica 14' }), { params })

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ descrizione: 'Corona ceramica 14' })
    )
  })

  it('campo relazionale spurio (appuntamenti) → scartato, nessun errore Postgres "column not found"', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy }))

    const res = await PATCH(
      req({ appuntamenti: [{ id: 'app-1', data: '2026-07-10' }] }),
      { params }
    )

    expect(res.status).toBe(200)
    expect(updateSpy).toHaveBeenCalled()
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).not.toHaveProperty('appuntamenti')
  })

  it('campo IMMUTABLE (stato) → scartato dal payload di update', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy }))

    const res = await PATCH(req({ stato: 'consegnato' }), { params })

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).not.toHaveProperty('stato')
  })

  it('altro campo relazionale spurio (fasi) → scartato dal payload di update', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy }))

    const res = await PATCH(req({ fasi: [{ id: 'fase-1' }] }), { params })

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).not.toHaveProperty('fasi')
  })

  it('riproduzione esatta del bug: descrizione + appuntamenti insieme → 200, appuntamenti scartato, descrizione applicato', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy }))

    const res = await PATCH(
      req({
        descrizione: 'Ponte 3 elementi',
        appuntamenti: [{ id: 'app-1', data_ora: '2026-07-10T09:00:00Z' }],
      }),
      { params }
    )

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).toMatchObject({ descrizione: 'Ponte 3 elementi' })
    expect(payload).not.toHaveProperty('appuntamenti')
  })

  it('LOCKED_PRICE_FIELDS: se incluso_in_fattura=true, prezzo_unitario viene comunque rimosso anche se allowlisted', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy, inclusoInFattura: true }))

    const res = await PATCH(
      req({ descrizione: 'Corona', prezzo_unitario: 999, listino_id: 'listino-x' }),
      { params }
    )

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).not.toHaveProperty('prezzo_unitario')
    expect(payload).not.toHaveProperty('listino_id')
    expect(payload).toMatchObject({ descrizione: 'Corona' })
  })

  it('LOCKED_PRICE_FIELDS: se incluso_in_fattura=false, prezzo_unitario passa (è allowlisted)', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy, inclusoInFattura: false }))

    const res = await PATCH(req({ prezzo_unitario: 150 }), { params })

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).toMatchObject({ prezzo_unitario: 150 })
  })

  it('validazione FK cross-tenant ancora attiva: cliente_id non del laboratorio → 403', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy, fkOk: false }))

    const res = await PATCH(req({ cliente_id: 'cliente-altro-lab' }), { params })

    expect(res.status).toBe(403)
    expect(updateSpy).not.toHaveBeenCalled()
  })

  it('validazione FK cross-tenant: cliente_id valido → passa e arriva nel payload', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy, fkOk: true }))

    const res = await PATCH(req({ cliente_id: 'cliente-ok' }), { params })

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).toMatchObject({ cliente_id: 'cliente-ok' })
  })

  it('tecnico_id (usato da LavoroCard per assegnazione) è allowlisted', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy, fkOk: true }))

    const res = await PATCH(req({ tecnico_id: 'tecnico-ok' }), { params })

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).toMatchObject({ tecnico_id: 'tecnico-ok' })
  })

  it('campo mai scritto da alcun form (es. classe_rischio, snapshot, segnalazione_*) viene scartato', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy }))

    const res = await PATCH(
      req({
        descrizione: 'Ok',
        classe_rischio: 'IIa',
        paziente_nome_snapshot: 'Mario Rossi',
        segnalazione_risolta: true,
        tracciabilita_materiali_ok: true,
        is_rifacimento: true,
      }),
      { params }
    )

    expect(res.status).toBe(200)
    const payload = updateSpy.mock.calls[0][0]
    expect(payload).not.toHaveProperty('classe_rischio')
    expect(payload).not.toHaveProperty('paziente_nome_snapshot')
    expect(payload).not.toHaveProperty('segnalazione_risolta')
    expect(payload).not.toHaveProperty('tracciabilita_materiali_ok')
    expect(payload).not.toHaveProperty('is_rifacimento')
    expect(payload).toMatchObject({ descrizione: 'Ok' })
  })

  it('body sempre include updated_at gestito server-side', async () => {
    const updateSpy = vi.fn()
    mockFrom.mockImplementation(buildMockFrom({ updateSpy }))

    await PATCH(req({ descrizione: 'Test', updated_at: '2020-01-01T00:00:00Z' }), { params })

    const payload = updateSpy.mock.calls[0][0]
    expect(payload.updated_at).not.toBe('2020-01-01T00:00:00Z')
    expect(typeof payload.updated_at).toBe('string')
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await PATCH(req({ descrizione: 'x' }), { params })
    expect(res.status).toBe(401)
  })

  it('utente senza laboratorio_id → 403', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: null, error: null }) }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    const res = await PATCH(req({ descrizione: 'x' }), { params })
    expect(res.status).toBe(403)
  })

  it('lavoro non trovato (soft-deleted o cross-tenant) → 404', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'utenti') {
        return {
          select: () => ({
            eq: () => ({ single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }) }),
          }),
        }
      }
      if (table === 'lavori') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({ single: async () => ({ data: null, error: null }) }),
              }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    const res = await PATCH(req({ descrizione: 'x' }), { params })
    expect(res.status).toBe(404)
  })
})
