// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/ddc.pdf' } }),
      }),
    },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: async () => 1,
}))

import { generateDdC } from '../../src/lib/pdf/generate-ddc'

function mockTables(lab: typeof LAB_FIXTURE) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
    if (table === 'dichiarazioni_conformita') return { insert: mockInsert }
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDdC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
  })

  it('genera una DdC con dati completi', async () => {
    mockTables(LAB_FIXTURE)
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(result.numero).toMatch(/^DDC-\d{4}-0001$/)
    expect(result.url).toBe('https://example.test/ddc.pdf')
  })

  it('non invia norma_riferimento all\'insert (colonna inesistente su dichiarazioni_conformita) e valorizza testo_conformita (NOT NULL senza default)', async () => {
    // Regressione: prima del fix, norma_riferimento veniva spedito nell'insert
    // (PostgREST l'avrebbe rifiutato, colonna inesistente) e testo_conformita
    // non veniva mai valorizzato (NOT NULL senza default) — l'insert falliva
    // sempre. Il cast a Laboratorio non protegge da questo: TS non fa
    // excess-property-check su un oggetto passato per variabile, solo sui
    // literal — quindi solo un'asserzione a runtime blocca una regressione.
    mockTables(LAB_FIXTURE)
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ norma_riferimento: expect.anything() })
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        testo_conformita: expect.stringContaining('Allegato XIII'),
      })
    )
  })

  it('usa lab.testo_rischi_default come fallback quando manca rischi_tipo_dispositivo', async () => {
    mockTables({ ...LAB_FIXTURE, testo_rischi_default: 'Rischio generico test' })
    await generateDdC(LAVORO_FIXTURE)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ rischi_residui_snapshot: 'Rischio generico test' })
    )
  })

  it('usa paziente.nome_cognome quando manca paziente_nome_snapshot', async () => {
    mockTables(LAB_FIXTURE)
    const PAZIENTE_FIXTURE = {
      id: 'paz-1',
      laboratorio_id: 'lab-test-001',
      cliente_id: 'cli-001',
      codice_paziente: 'PAZ-001',
      nome: 'Anna',
      cognome: 'Verdi',
      nome_cognome: 'Anna Verdi',
      data_nascita: null,
      codice_fiscale: null,
      sesso: null,
      comune_nascita: null,
      partita_iva: null,
      asl: null,
      note: null,
      anamnesi: null,
      archiviato: false,
    }
    const lavoroSenzaSnapshot = {
      ...LAVORO_FIXTURE,
      paziente_nome_snapshot: null,
      paziente: PAZIENTE_FIXTURE,
    }
    await generateDdC(lavoroSenzaSnapshot)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ paziente_nome: 'Anna Verdi' })
    )
  })

  it('propaga norme_json da rischi_tipo_dispositivo all\'insert', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'rischi_tipo_dispositivo') return createChain({
        data: { rischi_residui: null, norme_json: [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }] },
        error: null,
      })
      if (table === 'dichiarazioni_conformita') return { insert: mockInsert }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })

    await generateDdC(LAVORO_FIXTURE)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        norme_json: [{ codice: 'EN ISO 6872:2015', titolo: 'Dental ceramic materials', anno: 2015 }],
      })
    )
  })

  it('nessuna riga in rischi_tipo_dispositivo → norme_json vuoto nell\'insert', async () => {
    mockTables(LAB_FIXTURE)
    await generateDdC(LAVORO_FIXTURE)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ norme_json: [] })
    )
  })
})
