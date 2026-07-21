// Regressione B-1 (spec Portale Dentista v2 §3 punto 1): la consegna di un
// lavoro con cliente fatturabile (SDI/PEC) NON deve creare righe in fatture
// né consumare progressivi. La fatturazione nasce solo dal flusso concordato.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockFrom, tabelleUsate, rpcChiamate } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
  tabelleUsate: [] as string[],
  rpcChiamate: [] as string[],
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
vi.mock('@/lib/fattura/generate-xml', () => ({ generaFatturaPA: vi.fn(async () => ({ numero: 'X' })) }))

import { orchestraConsegna } from '@/lib/consegna/orchestrate'

const LAVORO = {
  id: 'lav-1', laboratorio_id: 'lab-1', stato: 'pronto', numero_lavoro: 'n.1',
  cliente: { id: 'cli-1', codice_sdi: 'ABC1234', pec: null, telefono: null, portale_token: 't' },
  paziente: null, lavorazioni: [], materiali: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  tabelleUsate.length = 0
  rpcChiamate.length = 0

  mockRpc.mockImplementation(async (fn: string) => {
    rpcChiamate.push(fn)
    if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
    if (fn === 'genera_progressivo') return { data: 5, error: null } // pre-fix: usato dall'IIFE Step 6
    // Task 7 (L5): liberazione cassetta chiamata dopo lo Step 5 riuscito —
    // senza questo ramo il test passerebbe comunque (fail-soft esterno la
    // ingoia), ma per la ragione SBAGLIATA (eccezione, non l'esito reale).
    if (fn === 'cassetta_libera_atomica') return { data: { esito: 'ok', nome: null }, error: null }
    throw new Error(`Unexpected rpc: ${fn}`)
  })
  mockFrom.mockImplementation((table: string) => {
    tabelleUsate.push(table)
    if (table === 'lavori') {
      return {
        select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: LAVORO, error: null }) }) }) }) }),
        update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }),
      }
    }
    if (table === 'fatture') {
      // pre-fix: lo Step 6 inserisce il draft qui — post-fix mai chiamato
      return { insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'fat-1' }, error: null }) }) }) }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('regressione B-1 — consegna senza emissione fiscale', () => {
  it('cliente fatturabile (SDI): zero accessi a fatture, zero progressivi, fattura null', async () => {
    const result = await orchestraConsegna('lav-1', 'lab-1')
    // Flush del fire-and-forget pre-fix (IIFE async): senza questo il test
    // passerebbe in modo spurio anche col codice vecchio.
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.fattura).toBeNull()
    expect(tabelleUsate).not.toContain('fatture')
    expect(rpcChiamate).not.toContain('genera_progressivo')
  })
})
