// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))

import { generateCedolinoTecnico } from '../../src/lib/pdf/generate-cedolino-tecnico'

const LAB_ROW = {
  nome: 'Lab Opromolla',
  ragione_sociale: 'Laboratorio Odontotecnico Opromolla S.r.l.',
  indirizzo: 'Via Roma 12',
  cap: '84028',
  citta: 'Serre',
  provincia: 'SA',
  codice_itca: 'ITCA01051686',
  prrc_nome: 'Filippo Opromolla',
}

const TECNICO_ROW = { nome: 'Luca', cognome: 'Bianchi' }

const RAW_ROWS = [
  {
    quantita: 2,
    lavori: {
      stato: 'consegnato',
      tecnico_id: 'tec-001',
      laboratorio_id: 'lab-test-001',
      data_consegna_effettiva: '2026-05-10',
    },
    listino: { nome: 'Corona ceramica', compenso_tecnico: 15 },
  },
]

describe('generateCedolinoTecnico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_ROW, error: null })
      if (table === 'tecnici') return createChain({ data: TECNICO_ROW, error: null })
      if (table === 'lavori_lavorazioni') return createChain({ data: RAW_ROWS, error: null })
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
  })

  it('genera un cedolino tecnico con lavorazioni del mese', async () => {
    const buffer = await generateCedolinoTecnico('tec-001', 'lab-test-001', '2026-05')
    expect(buffer.length).toBeGreaterThan(0)
  })
})
