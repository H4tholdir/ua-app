// Task 2 (ondata «si deve sempre poter intervenire»): prima_immissione_at si
// scrive UNA VOLTA SOLA. Allegato XIII punto 4 + Art. 2(28): i 10 anni di
// conservazione della dichiarazione decorrono dalla PRIMA messa a
// disposizione — non dall'ultima. `data_consegna_effettiva` viene azzerata
// da ogni riapertura (riapri_lavoro_atomica) e riscritta a ogni consegna
// (orchestrate.ts Step 5): usarla come base dei 10 anni farebbe ripartire
// l'orologio a ogni riconsegna, e un laboratorio che si fidasse
// distruggerebbe la dichiarazione troppo presto.
//
// Questa prova consegna lo STESSO lavoro due volte (la seconda simula lo
// stato della riga dopo una riapertura + riconsegna: prima_immissione_at
// arriva già valorizzato dalla prima consegna, data_consegna_effettiva no —
// esattamente ciò che riapri_lavoro_atomica.sql azzera) e verifica che
// prima_immissione_at NON cambi, mentre data_consegna_effettiva sì.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ rpc: mockRpc, from: mockFrom }),
}))
vi.mock('@/lib/notifications/trigger', () => ({ triggerPushByRole: vi.fn() }))
vi.mock('@/lib/consegna/precheck', () => ({ precheckMDR: () => ({ ok: true, errori: [] }) }))
vi.mock('@/lib/consegna/traccia-materiali', () => ({
  tracciaMaterialiLavoro: async () => ({ tracciabilitaOk: true, dettaglio: [], materialiTracciati: [] }),
}))
vi.mock('@/lib/pdf/generate-ddc', () => ({ generateDdC: async () => ({ numero: 'DDC-1', url: 'u' }) }))
vi.mock('@/lib/pdf/generate-buono', () => ({ generateBuono: async () => ({ numero: 'BUO-1', url: 'u' }) }))

import { orchestraConsegna } from '@/lib/consegna/orchestrate'

function makeLavoro(prima_immissione_at: string | null) {
  return {
    id: 'lav-1', laboratorio_id: 'lab-1', stato: 'pronto', numero_lavoro: 'n.1',
    cliente: { id: 'cli-1', codice_sdi: null, pec: null, telefono: '333', portale_token: 't', cognome: 'Rossi' },
    paziente: null, lavorazioni: [], materiali: [],
    prima_immissione_at,
  }
}

// Chain reale dello Step 1 (select con .is('deleted_at', null)) + update di
// Step 5: cattura ogni payload passato a .update() per ispezionarlo dopo.
function mockLavoriTable(lavoro: unknown, capture: Array<Record<string, unknown>>) {
  return {
    select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: lavoro, error: null }) }) }) }) }),
    update: (payload: Record<string, unknown>) => {
      capture.push(payload)
      return { eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }
    },
  }
}

describe('orchestraConsegna — prima_immissione_at si scrive UNA VOLTA SOLA (Task 2, All. XIII p.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('prima consegna: prima_immissione_at nasce = data_consegna_effettiva; dopo riapertura+riconsegna: prima_immissione_at resta quella, data_consegna_effettiva si aggiorna', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
      if (fn === 'cassetta_libera_atomica') return { data: { esito: 'ok', nome: null }, error: null }
      throw new Error(`rpc inattesa: ${fn}`)
    })

    // --- Prima consegna: T1, la riga non ha ancora prima_immissione_at ---
    vi.setSystemTime(new Date('2026-01-10T09:00:00.000Z'))
    const payloads1: Array<Record<string, unknown>> = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return mockLavoriTable(makeLavoro(null), payloads1)
      throw new Error(`tabella inattesa: ${table}`)
    })

    const risultato1 = await orchestraConsegna('lav-1', 'lab-1')
    expect(risultato1.ok).toBe(true)

    const step5_1 = payloads1.find((p) => p.stato === 'consegnato')
    expect(step5_1).toBeDefined()
    expect(step5_1?.data_consegna_effettiva).toBe('2026-01-10T09:00:00.000Z')
    expect(step5_1?.prima_immissione_at).toBe('2026-01-10T09:00:00.000Z')

    // --- Riconsegna dopo riapertura: T2 (40 giorni dopo). La riga arriva con
    // prima_immissione_at GIÀ valorizzato dalla prima consegna — esattamente
    // ciò che riapri_lavoro_atomica.sql lascia intatto azzerando solo
    // data_consegna_effettiva. ---
    vi.setSystemTime(new Date('2026-02-20T15:30:00.000Z'))
    const payloads2: Array<Record<string, unknown>> = []
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return mockLavoriTable(makeLavoro('2026-01-10T09:00:00.000Z'), payloads2)
      throw new Error(`tabella inattesa: ${table}`)
    })

    const risultato2 = await orchestraConsegna('lav-1', 'lab-1')
    expect(risultato2.ok).toBe(true)

    const step5_2 = payloads2.find((p) => p.stato === 'consegnato')
    expect(step5_2).toBeDefined()
    expect(step5_2?.data_consegna_effettiva).toBe('2026-02-20T15:30:00.000Z')
    // Il cuore della prova: la PRIMA immissione non si sposta alla riconsegna.
    expect(step5_2?.prima_immissione_at).toBe('2026-01-10T09:00:00.000Z')
    expect(step5_2?.prima_immissione_at).not.toBe(step5_2?.data_consegna_effettiva)
  })
})
