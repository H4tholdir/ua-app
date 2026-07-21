// Task 7 (spec §9.1 — L5): liberazione automatica della cassetta alla
// consegna. Aggancio DOPO lo Step 5 riuscito di orchestrate.ts (già dopo la
// generazione del Buono — BuonoTemplate.tsx:341 stampa numero_cassetta, mai
// da spostare prima). Fail-soft ASSOLUTO: qualunque esito diverso da
// {esito:'ok'} — errore RPC come OGGETTO (postgrest-js non lancia sugli
// errori DB) o eccezione di rete — degrada a `cassettaLiberata:null` e viene
// LOGGATO, mai propagato: la consegna non deve MAI fallire per la cassetta.
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

const LAVORO = {
  id: 'lav-1', laboratorio_id: 'lab-1', stato: 'pronto', numero_lavoro: 'n.1',
  cliente: { id: 'cli-1', codice_sdi: null, pec: null, telefono: '333', portale_token: 't', cognome: 'Rossi' },
  paziente: null, lavorazioni: [], materiali: [],
}

// Chain reale dello Step 1 (select con .is('deleted_at', null)) + Step 2.5/5
// (update con due .eq()): stesso mock riusato a ogni .from('lavori').
function mockLavoriTable() {
  return {
    select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: LAVORO, error: null }) }) }) }) }),
    update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }),
  }
}

// Chain del ramo idempotente gia_consegnato: select senza .is(), + query DdC.
function mockLavoriTableIdempotente() {
  return {
    select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: LAVORO, error: null }) }) }) }),
  }
}

describe('orchestraConsegna — liberazione cassetta alla consegna (Task 7, L5)', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let rpcArgsCassetta: unknown[]

  beforeEach(() => {
    vi.clearAllMocks()
    rpcArgsCassetta = []
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('(a) consegna ok con riga viva → rpc chiamata con p_motivo:"consegna" e cassettaLiberata valorizzata', async () => {
    mockRpc.mockImplementation(async (fn: string, args: unknown) => {
      if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
      if (fn === 'cassetta_libera_atomica') { rpcArgsCassetta.push(args); return { data: { esito: 'ok', nome: 'C12' }, error: null } }
      throw new Error(`rpc inattesa: ${fn}`)
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return mockLavoriTable()
      throw new Error(`tabella inattesa: ${table}`)
    })

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cassettaLiberata).toBe('C12')
    expect(rpcArgsCassetta).toEqual([{ p_lab: 'lab-1', p_lavoro: 'lav-1', p_motivo: 'consegna' }])
  })

  it('(b) rpc fallisce con OGGETTO errore (mai un throw) → consegna resta ok, cassettaLiberata:null, loggato', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
      if (fn === 'cassetta_libera_atomica') return { data: null, error: { message: 'boom', code: '55555' } }
      throw new Error(`rpc inattesa: ${fn}`)
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return mockLavoriTable()
      throw new Error(`tabella inattesa: ${table}`)
    })

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cassettaLiberata).toBeNull()
    // La consegna resta valida: DdC/buono generati, nessun rilascio lock forzato dal fallimento cassetta.
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('(c) lavoro senza cassetta → rpc ok con nome null (idempotente, legittimo) → cassettaLiberata:null', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
      if (fn === 'cassetta_libera_atomica') return { data: { esito: 'ok', nome: null }, error: null }
      throw new Error(`rpc inattesa: ${fn}`)
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return mockLavoriTable()
      throw new Error(`tabella inattesa: ${table}`)
    })

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cassettaLiberata).toBeNull()
    // idempotente e legittimo: NON è un errore, nessun log
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('(d) ramo idempotente gia_consegnato → rpc richiamata comunque (retry gratuito della riparazione)', async () => {
    let rpcCassettaCalls = 0
    mockRpc.mockImplementation(async (fn: string, args: unknown) => {
      if (fn === 'consegna_lavoro_lock') return { data: { gia_consegnato: true }, error: null }
      if (fn === 'cassetta_libera_atomica') { rpcCassettaCalls++; rpcArgsCassetta.push(args); return { data: { esito: 'ok', nome: null }, error: null } }
      throw new Error(`rpc inattesa: ${fn}`)
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dichiarazioni_conformita') {
        return { select: () => ({ eq: () => ({ neq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }
      }
      if (table === 'lavori') return mockLavoriTableIdempotente()
      throw new Error(`tabella inattesa: ${table}`)
    })

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    expect(rpcCassettaCalls).toBe(1)
    expect(rpcArgsCassetta).toEqual([{ p_lab: 'lab-1', p_lavoro: 'lav-1', p_motivo: 'consegna' }])
  })

  it('motivo_non_valido (irraggiungibile in pratica con p_motivo:"consegna" letterale, ma difensivo): logga e degrada a null', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
      if (fn === 'cassetta_libera_atomica') return { data: { esito: 'motivo_non_valido' }, error: null }
      throw new Error(`rpc inattesa: ${fn}`)
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return mockLavoriTable()
      throw new Error(`tabella inattesa: ${table}`)
    })

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cassettaLiberata).toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('eccezione di rete reale (throw, non oggetto errore) → catch esterno, cassettaLiberata:null, loggato', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'consegna_lavoro_lock') return { data: { lock_acquisito: true }, error: null }
      if (fn === 'cassetta_libera_atomica') throw new Error('rete giù')
      throw new Error(`rpc inattesa: ${fn}`)
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'lavori') return mockLavoriTable()
      throw new Error(`tabella inattesa: ${table}`)
    })

    const result = await orchestraConsegna('lav-1', 'lab-1')

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cassettaLiberata).toBeNull()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
