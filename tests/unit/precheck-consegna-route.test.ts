import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom, mockMaterialiCarenti } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockMaterialiCarenti: vi.fn(),
}))

vi.mock('@/lib/supabase/server-user', () => ({
  getServerUserClient: async () => ({ auth: { getUser: mockGetUser } }),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/consegna/materiali-carenti', () => ({
  materialiCarenti: mockMaterialiCarenti,
}))

import { GET } from '../../src/app/api/lavori/[id]/precheck-consegna/route'

const AUTH_USER = { id: 'user-1' }
const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'

const params = Promise.resolve({ id: LAVORO_ID })

function req() {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/precheck-consegna`)
}

/** Lavoro minimo conforme ai requisiti MDR verificati da precheckMDR (elementi 3-7 + soft-block 16/07). */
function makeLavoroRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LAVORO_ID,
    richiedente_nome: 'Dott. Rossi',
    cliente: { nome: 'Mario', cognome: 'Bianchi' },
    paziente_nome_snapshot: 'Verdi Luigi',
    paziente: null,
    descrizione: 'Corona ceramica 14 colore A2',
    tipo_dispositivo: 'protesi_fissa',
    classe_rischio: 'classe_iia',
    data_consegna_prevista: '2026-08-01',
    tipo_impronte: 'digitale',
    disinfettante_usato: 'clorexidina',
    ...overrides,
  }
}

/**
 * Mock di `svc.from(table)` per le sole tabelle toccate dalla route:
 * - 'utenti' → risoluzione laboratorio_id dell'utente autenticato
 * - 'lavori' → SELECT completa (select/eq/eq/is/single), stesso pattern di
 *   orchestrate.ts Step 1
 * `materialiCarenti` è mockato a livello di modulo (vedi vi.mock sopra).
 */
function buildMockFrom(opts: { utente?: { laboratorio_id: string } | null; lavoro?: Record<string, unknown> | null }) {
  const { utente = { laboratorio_id: LAB_ID }, lavoro = makeLavoroRow() } = opts

  return vi.fn((table: string) => {
    if (table === 'utenti') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: utente, error: null }),
          }),
        }),
      }
    }

    if (table === 'lavori') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                single: async () => ({ data: lavoro, error: null }),
              }),
            }),
          }),
        }),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('GET /api/lavori/[id]/precheck-consegna', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: AUTH_USER } })
    mockMaterialiCarenti.mockResolvedValue([])
  })

  it('utente non autenticato → 401', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const res = await GET(req(), { params })
    expect(res.status).toBe(401)
  })

  it('lavoro di altro laboratorio (cross-tenant) → 404, mai 403', async () => {
    mockFrom.mockImplementation(buildMockFrom({ lavoro: null }))
    const res = await GET(req(), { params })
    expect(res.status).toBe(404)
  })

  it('lavoro completo e conforme → 200 blindato, nessuna chiave extra', async () => {
    mockFrom.mockImplementation(buildMockFrom({}))
    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Object.keys(json).sort()).toEqual(['bloccanti', 'consegnabile', 'warnings'])
    expect(json).toEqual({ consegnabile: true, bloccanti: [], warnings: [] })
  })

  it('lavoro senza classe_rischio e con tipo_impronte null → bloccante + warning MDR', async () => {
    mockFrom.mockImplementation(
      buildMockFrom({
        lavoro: makeLavoroRow({ classe_rischio: null, tipo_impronte: null }),
      })
    )
    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.consegnabile).toBe(false)
    expect(json.bloccanti).toContainEqual(expect.objectContaining({ campo: 'classe_rischio' }))
    expect(json.warnings.some((w: string) => w.includes('Tipo impronta'))).toBe(true)
  })

  it('materiale sotto scorta → warning con il nome del materiale', async () => {
    mockFrom.mockImplementation(buildMockFrom({}))
    mockMaterialiCarenti.mockResolvedValue([
      { nome: 'Zirconia disco 98mm', quantita_necessaria: 5, scorta_attuale: 2, unita_misura: 'pz', sufficiente: false },
    ])
    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.consegnabile).toBe(true)
    expect(json.warnings.some((w: string) => w.includes('Zirconia disco 98mm'))).toBe(true)
  })
})
