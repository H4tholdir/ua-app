import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
  }),
}))

vi.mock('@/lib/utils/csrf', () => ({
  isSameOrigin: () => true,
}))

import { PATCH } from '../../src/app/api/qualita/rischi/[id]/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const RISCHIO_ID = 'rischio-1'

let updatedData: Record<string, unknown> | null = null

function mockRischioEsistente(opts: {
  existing: { id: string; versione: number } | null
  updateError?: { message: string } | null
}) {
  updatedData = null
  let rischiTableCallCount = 0

  mockFrom.mockImplementation((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { laboratorio_id: LAB_ID }, error: null }),
          }),
        }),
      }
    }
    if (table === 'rischi_tipo_dispositivo') {
      rischiTableCallCount++
      if (rischiTableCallCount === 1) {
        // Lookup tenant-scoped per verificare che la riga esista
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: opts.existing, error: null }),
              }),
            }),
          }),
        }
      }
      // Update
      return {
        update: (data: Record<string, unknown>) => {
          updatedData = data
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () =>
                    opts.updateError
                      ? { data: null, error: opts.updateError }
                      : {
                          data: {
                            id: RISCHIO_ID,
                            tipo_dispositivo: 'protesi_fissa',
                            versione: data.versione,
                            data_ultima_revisione: data.data_ultima_revisione,
                          },
                          error: null,
                        },
                }),
              }),
            }),
          }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

function patchRequest(body: unknown) {
  return new Request(`http://localhost/api/qualita/rischi/${RISCHIO_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function patchParams() {
  return { params: Promise.resolve({ id: RISCHIO_ID }) }
}

const RISCHIO_VALIDO = {
  id: 'RF01',
  rischio: 'Frattura del dispositivo in uso',
  causa: 'Spessore insufficiente',
  probabilita: 2,
  gravita: 2,
  rpn: 999, // deliberatamente sbagliato — deve essere ricalcolato server-side a 4
  misura: 'Controllo spessore minimo secondo normativa',
}

describe('PATCH /api/qualita/rischi/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
  })

  it('id inesistente o di un altro lab → 404, nessun update eseguito', async () => {
    mockRischioEsistente({ existing: null })

    const res = await PATCH(
      patchRequest({ rischi_json: [RISCHIO_VALIDO] }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Analisi rischi non trovata')
    expect(updatedData).toBeNull()
  })

  it('rischi_json vuoto → 422', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(patchRequest({ rischi_json: [] }), patchParams())
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('vuota')
    expect(updatedData).toBeNull()
  })

  it('probabilita fuori range [1,3] → 422', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({ rischi_json: [{ ...RISCHIO_VALIDO, probabilita: 5 }] }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('probabilita')
    expect(updatedData).toBeNull()
  })

  it('gravita fuori range [1,3] → 422', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({ rischi_json: [{ ...RISCHIO_VALIDO, gravita: 0 }] }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('gravita')
  })

  it('campo "rischio" mancante in un elemento → 422', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({ rischi_json: [{ ...RISCHIO_VALIDO, rischio: '' }] }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toContain('rischio')
  })

  it('payload valido → 200, RPN ricalcolato server-side (mai quello inviato dal client)', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(
      patchRequest({ rischi_json: [RISCHIO_VALIDO], rischi_residui: 'Rischi accettabili', misure_controllo: 'Controllo qualità visivo' }),
      patchParams()
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.rischio.id).toBe(RISCHIO_ID)
    const salvato = (updatedData?.rischi_json as Array<Record<string, unknown>>)[0]
    expect(salvato.rpn).toBe(4) // 2 * 2, non 999
    expect(updatedData?.rischi_residui).toBe('Rischi accettabili')
    expect(updatedData?.misure_controllo).toBe('Controllo qualità visivo')
  })

  it('payload valido → versione incrementata e data_ultima_revisione = oggi', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 3 } })

    const res = await PATCH(patchRequest({ rischi_json: [RISCHIO_VALIDO] }), patchParams())
    await res.json()

    const oggi = new Date().toISOString().slice(0, 10)
    expect(updatedData?.versione).toBe(4)
    expect(updatedData?.data_ultima_revisione).toBe(oggi)
  })

  it('rischi_residui/misure_controllo assenti → salvati come null', async () => {
    mockRischioEsistente({ existing: { id: RISCHIO_ID, versione: 1 } })

    const res = await PATCH(patchRequest({ rischi_json: [RISCHIO_VALIDO] }), patchParams())
    await res.json()

    expect(updatedData?.rischi_residui).toBeNull()
    expect(updatedData?.misure_controllo).toBeNull()
  })

  it('errore DB in update → 500', async () => {
    mockRischioEsistente({
      existing: { id: RISCHIO_ID, versione: 1 },
      updateError: { message: 'connection error' },
    })

    const res = await PATCH(patchRequest({ rischi_json: [RISCHIO_VALIDO] }), patchParams())

    expect(res.status).toBe(500)
  })

  it('non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await PATCH(patchRequest({ rischi_json: [RISCHIO_VALIDO] }), patchParams())

    expect(res.status).toBe(401)
  })
})
