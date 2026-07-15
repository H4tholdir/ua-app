// tests/unit/generate-xml-td04.test.ts
// Task 2 Nota di Credito TD04: generaFatturaPA legge SOLO dallo snapshot
// congelato sulla riga `fatture` quando tipo_documento === 'TD04' — MAI dal
// lavoro vivo. Verifica l'XML reale generato (DatiFattureCollegate, Causale,
// importi sempre positivi — il segno è implicito in <TipoDocumento>).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, uploads, updatePayloads } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  uploads: [] as Array<{ bucket: string; path: string; contentType: string; bytes: unknown }>,
  updatePayloads: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, bytes: unknown, opts: { contentType: string }) => {
          uploads.push({ bucket, path, contentType: opts.contentType, bytes })
          return { error: null }
        },
      }),
    },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: vi.fn(async () => 42) }))
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: vi.fn(async () => Buffer.from('%PDF-fake')) }))

import { generaFatturaPA } from '@/lib/fattura/generate-xml'

const LAB = {
  id: 'lab-1', nome: 'Lab', ragione_sociale: 'Lab SRL', partita_iva: '12345678901',
  codice_fiscale: null, indirizzo: 'Via X 1', cap: '80100', citta: 'Napoli', provincia: 'NA',
  regime_fiscale: 'RF01', pec: null, pec_host: null, pec_port: null, pec_user: null,
  pec_smtp_configurata: false, pec_vault_key_id: null,
}

// Draft TD04 — riga `fatture` con snapshot congelato (numero/data/cliente/imponibile).
const DRAFT_TD04 = {
  numero: '2026-0099',
  progressivo: 99,
  data: '2026-07-10',
  tipo_documento: 'TD04',
  imponibile: 100,
  collegata_numero: '2026-0012',
  collegata_data: '2026-07-01',
  causale_storno: 'Storno per errore di fatturazione',
  cliente_denominazione: 'Studio Rossi',
  cliente_piva: '01234567890',
  cliente_cf: null,
  cliente_indirizzo: 'Via Y 2, 80100 Napoli NA',
  cliente_codice_sdi: 'ABC1234',
  cliente_pec: null,
  laboratorio_id: 'lab-1',
}

function mockDraftTd04() {
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
        select: () => ({ eq: () => ({ single: async () => ({ data: DRAFT_TD04, error: null }) }) }),
        update: (payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return { eq: async () => ({ error: null }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  uploads.length = 0
  updatePayloads.length = 0
  mockDraftTd04()
})

describe('generaFatturaPA — ramo TD04 (nota di credito, snapshot congelato)', () => {
  it('produce un XML TD04 completo: DatiFattureCollegate, Causale, importi sempre positivi', async () => {
    await generaFatturaPA(null, 'fatt-99')

    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    expect(xmlUpload).toBeDefined()
    const xmlContent = String(xmlUpload?.bytes)

    // generaFatturaPA su un draft TD04 produce un XML nota di credito completo,
    // leggendo SOLO dallo snapshot congelato (mai dal lavoro vivo).
    expect(xmlContent).toContain('<TipoDocumento>TD04</TipoDocumento>')
    // DatiFattureCollegate DOPO DatiGeneraliDocumento, DENTRO DatiGenerali
    expect(xmlContent).toMatch(/<\/DatiGeneraliDocumento>\s*<DatiFattureCollegate>/)
    expect(xmlContent).toContain('<IdDocumento>2026-0012</IdDocumento>')
    expect(xmlContent).toContain('<Data>2026-07-01</Data>') // dentro DatiFattureCollegate
    expect(xmlContent).toContain('<Causale>Storno per errore di fatturazione</Causale>')
    expect(xmlContent).toContain('<ImportoTotaleDocumento>102.00</ImportoTotaleDocumento>') // imponibile+bollo (>77.47)
    expect(xmlContent).toContain('<ImponibileImporto>100.00</ImponibileImporto>')
    expect(xmlContent).toContain('<Natura>N4</Natura>')
    expect(xmlContent).toContain('Storno integrale fattura n. 2026-0012 del 2026-07-01')
    // nessun importo negativo
    expect(xmlContent).not.toMatch(/>-\d/)
  })

  it('non legge il lavoro vivo: lavorazioni diverse non alterano l\'imponibile (resta 100 dallo snapshot)', async () => {
    // Lavoro vivo deliberatamente diverso: se il ramo TD04 lo leggesse per errore,
    // l'imponibile diventerebbe 2500 (somma righe) invece di 100 (snapshot).
    const LAVORO_VIVO_DIVERSO = {
      id: 'lav-live', laboratorio_id: 'lab-1', numero_lavoro: 'n.live', descrizione: 'Altro lavoro',
      prezzo_unitario: 999999,
      lavorazioni: [
        { id: 'rx', descrizione: 'Riga viva', quantita: 5, unita_misura: 'PZ', prezzo_unitario: 500, importo: 2500 },
      ],
      cliente: {
        id: 'cli-live', cognome: 'Verdi', nome: 'Luigi', studio_nome: 'Studio Verdi',
        codice_sdi: 'XYZ9999', pec: null, partita_iva: '99999999999', codice_fiscale: null,
        indirizzo: 'Via Diversa', cap: '00100', citta: 'Roma', provincia: 'RM',
      },
    } as never

    await generaFatturaPA(LAVORO_VIVO_DIVERSO, 'fatt-99')

    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    const xmlContent = String(xmlUpload?.bytes)
    expect(xmlContent).toContain('<ImponibileImporto>100.00</ImponibileImporto>')
    expect(xmlContent).not.toContain('Riga viva')
    expect(updatePayloads[0].imponibile).toBe(100)
  })
})
