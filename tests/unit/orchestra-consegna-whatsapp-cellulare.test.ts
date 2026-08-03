// P31 (compito 4) — sentinella a livello di CHIAMANTE: whatsapp-legge-il-
// cellulare.test.ts misura solo buildWhatsappUrl (già corretta dal compito
// 2, non tocca orchestrate.ts). Questo file misura invece orchestraConsegna
// stessa: se uno dei due rami tornasse a leggere `telefono` invece di
// `cellulare_whatsapp`, questo test — non quello — diventa rosso.
// Caso vero in banca dati: fisso nello studio, cellulare separato.
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

const CLIENTE = {
  id: 'cli-1',
  codice_sdi: null,
  pec: null,
  telefono: '0976 71439',
  cellulare_whatsapp: '333 1234567',
  cognome: 'Rossi',
  portale_token: 't',
}

const LAVORO = {
  id: 'lav-1', laboratorio_id: 'lab-1', stato: 'pronto', numero_lavoro: 'n.1',
  cliente: CLIENTE,
  paziente: null, lavorazioni: [], materiali: [],
}

function mockLavoriTable() {
  return {
    select: () => ({ eq: () => ({ eq: () => ({ is: () => ({ single: async () => ({ data: LAVORO, error: null }) }) }) }) }),
    update: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null, count: 1 }) }) }),
  }
}

function mockLavoriTableIdempotente() {
  return {
    select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: LAVORO, error: null }) }) }) }),
  }
}

describe('orchestraConsegna — link WhatsApp sul CELLULARE su entrambi i rami (P31 compito 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('ramo normale (Step 6): whatsapp_url e cliente_id letti dal cellulare, mai dal fisso', async () => {
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
    if (!result.ok) return
    expect(result.whatsapp_url).toContain('393331234567')
    expect(result.whatsapp_url).not.toContain('097671439')
    expect(result.cliente_id).toBe('cli-1')
  })

  it('ramo idempotente gia_consegnato: whatsapp_url e cliente_id letti dal cellulare, mai dal fisso', async () => {
    mockRpc.mockImplementation(async (fn: string) => {
      if (fn === 'consegna_lavoro_lock') return { data: { gia_consegnato: true }, error: null }
      if (fn === 'cassetta_libera_atomica') return { data: { esito: 'ok', nome: null }, error: null }
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
    if (!result.ok) return
    expect(result.whatsapp_url).toContain('393331234567')
    expect(result.whatsapp_url).not.toContain('097671439')
    expect(result.cliente_id).toBe('cli-1')
  })
})
