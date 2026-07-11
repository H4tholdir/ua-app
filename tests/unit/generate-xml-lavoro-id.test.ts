// tests/unit/generate-xml-lavoro-id.test.ts
// Ramo INSERT di generaFatturaPA (fatturaId assente — oggi raggiunto solo dal
// percorso multi-lavoro di /api/fatture/[id]/xml): la fattura nuova deve
// nascere con lavoro_id valorizzato come ogni fattura legata a un lavoro (B-2),
// altrimenti il gate fiscale dell'annullo non la vede.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, insertPayloads } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  insertPayloads: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
      }),
    },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: vi.fn(async () => 9) }))
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: vi.fn(async () => Buffer.from('%PDF-fake')) }))

import { generaFatturaPA } from '@/lib/fattura/generate-xml'

const LAB = {
  id: 'lab-1', nome: 'Lab', ragione_sociale: 'Lab SRL', partita_iva: '12345678901',
  codice_fiscale: null, indirizzo: 'Via X 1', cap: '80100', citta: 'Napoli', provincia: 'NA',
  regime_fiscale: 'RF01', pec: null, pec_host: null, pec_port: null, pec_user: null,
  pec_smtp_configurata: false, pec_vault_key_id: null,
}

const LAVORO = {
  id: 'lav-9', laboratorio_id: 'lab-1', numero_lavoro: 'n.9', descrizione: 'Corona di test',
  prezzo_unitario: 100, lavorazioni: [],
  cliente: {
    id: 'cli-1', cognome: 'Rossi', nome: 'Mario', studio_nome: 'Studio Rossi',
    codice_sdi: 'ABC1234', pec: null, partita_iva: '01234567890', codice_fiscale: null,
    indirizzo: 'Via Y 2', cap: '80100', citta: 'Napoli', provincia: 'NA',
  },
} as never

beforeEach(() => {
  vi.clearAllMocks()
  insertPayloads.length = 0
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') {
      const c: Record<string, unknown> = {}
      c.select = () => c
      c.eq = () => c
      c.single = async () => ({ data: LAB, error: null })
      return c
    }
    if (table === 'fatture') {
      return {
        insert: (payload: Record<string, unknown>) => {
          insertPayloads.push(payload)
          return Promise.resolve({ error: null })
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('generaFatturaPA — ramo INSERT (fatturaId assente)', () => {
  it('la fattura nuova nasce con lavoro_id valorizzato', async () => {
    const esito = await generaFatturaPA(LAVORO, undefined)
    expect(esito.stato_sdi).toBe('generata')
    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0].lavoro_id).toBe('lav-9')
  })
})
