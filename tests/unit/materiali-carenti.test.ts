import { describe, it, expect, vi } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { materialiCarenti } from '../../src/lib/consegna/materiali-carenti'
import { getServiceClient } from '@/lib/supabase/server-service'

const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'

/**
 * Costruisce il mock di `svc.from(table)` usato dall'helper `materialiCarenti`.
 *
 * Tabelle coinvolte:
 * - 'lavori_lavorazioni'      → lavorazioni del lavoro (id, listino_id, quantita)
 * - 'listino_materiali_auto'  → BOM per listino_id (magazzino_id, quantita_per_unita, unita_misura)
 * - 'magazzino'                → scorta_attuale del materiale
 */
function buildMockFrom(opts: {
  lavorazioni: Array<{ id: string; listino_id: string | null; quantita: number }>
  bomByListino?: Record<string, Array<{ magazzino_id: string; quantita_per_unita: number; unita_misura: string }>>
  magazzinoById?: Record<string, { nome: string; scorta_attuale: number }>
}) {
  const { lavorazioni, bomByListino = {}, magazzinoById = {} } = opts

  return vi.fn((table: string) => {
    if (table === 'lavori_lavorazioni') {
      return {
        select: () => ({
          eq: () => ({
            eq: async () => ({ data: lavorazioni, error: null }),
          }),
        }),
      }
    }

    if (table === 'listino_materiali_auto') {
      return {
        select: () => ({
          eq: (_col: string, listinoId: string) => ({
            eq: async () => ({ data: bomByListino[listinoId] ?? [], error: null }),
          }),
        }),
      }
    }

    if (table === 'magazzino') {
      return {
        select: () => ({
          eq: (_col: string, magazzinoId: string) => ({
            eq: () => ({
              single: async () => ({ data: magazzinoById[magazzinoId] ?? null, error: null }),
            }),
          }),
        }),
      }
    }

    throw new Error(`Unexpected table: ${table}`)
  })
}

describe('materialiCarenti', () => {
  it('nessuna lavorazione → []', async () => {
    mockFrom.mockImplementation(buildMockFrom({ lavorazioni: [] }))

    const result = await materialiCarenti(getServiceClient(), LAVORO_ID, LAB_ID)

    expect(result).toEqual([])
  })

  it('BOM con scorta sufficiente → []', async () => {
    mockFrom.mockImplementation(
      buildMockFrom({
        lavorazioni: [{ id: 'lav-1', listino_id: 'listino-1', quantita: 2 }],
        bomByListino: {
          'listino-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }],
        },
        magazzinoById: {
          'mag-1': { nome: 'Resina X', scorta_attuale: 10 },
        },
      })
    )

    const result = await materialiCarenti(getServiceClient(), LAVORO_ID, LAB_ID)

    expect(result).toEqual([])
  })

  it('scorta 2 su necessarie 5 → un MaterialeCarente coi numeri giusti', async () => {
    mockFrom.mockImplementation(
      buildMockFrom({
        lavorazioni: [{ id: 'lav-1', listino_id: 'listino-1', quantita: 5 }],
        bomByListino: {
          'listino-1': [{ magazzino_id: 'mag-1', quantita_per_unita: 1, unita_misura: 'g' }],
        },
        magazzinoById: {
          'mag-1': { nome: 'Resina X', scorta_attuale: 2 },
        },
      })
    )

    const result = await materialiCarenti(getServiceClient(), LAVORO_ID, LAB_ID)

    expect(result).toEqual([
      {
        nome: 'Resina X',
        quantita_necessaria: 5,
        scorta_attuale: 2,
        unita_misura: 'g',
        sufficiente: false,
      },
    ])
  })
})
