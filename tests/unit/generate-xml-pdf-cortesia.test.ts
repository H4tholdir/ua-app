// tests/unit/generate-xml-pdf-cortesia.test.ts
// Ondata 2 + I-6: generaFatturaPA genera la copia di cortesia PDF insieme
// all'XML (stessi dati in memoria) e NON persiste più URL pubblici (xml_url).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, uploads, insertPayloads, updatePayloads, mockRender } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  uploads: [] as Array<{ bucket: string; path: string; contentType: string; bytes: unknown }>,
  insertPayloads: [] as Array<Record<string, unknown>>,
  updatePayloads: [] as Array<Record<string, unknown>>,
  mockRender: vi.fn(async () => Buffer.from('%PDF-fake')),
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
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: vi.fn(async () => 9) }))
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: mockRender }))

import { generaFatturaPA } from '@/lib/fattura/generate-xml'
import { oggiRomaISO } from '@/lib/utils/data-roma'

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
  uploads.length = 0
  insertPayloads.length = 0
  updatePayloads.length = 0
  mockRender.mockResolvedValue(Buffer.from('%PDF-fake'))
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
        select: () => ({ eq: () => ({ single: async () => ({ data: { numero: '2026-0007', progressivo: 7, data: '2026-07-01' }, error: null }) }) }),
        insert: (payload: Record<string, unknown>) => { insertPayloads.push(payload); return Promise.resolve({ error: null }) },
        update: (payload: Record<string, unknown>) => { updatePayloads.push(payload); return { eq: async () => ({ error: null }) } },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('generaFatturaPA — copia di cortesia PDF + I-6', () => {
  it('ramo INSERT: upload XML + PDF, pdf_storage_path persistito, xml_url MAI scritto', async () => {
    await generaFatturaPA(LAVORO, undefined)
    expect(uploads).toHaveLength(2)
    const pdfUpload = uploads.find((u) => u.contentType === 'application/pdf')
    expect(pdfUpload?.bucket).toBe('fatture-pdf')
    expect(pdfUpload?.path).toMatch(/^lab-1\/\d{4}\/cortesia\/Fattura-\d{4}-0009\.pdf$/)
    expect(insertPayloads[0].pdf_storage_path).toBe(pdfUpload?.path)
    expect(insertPayloads[0]).not.toHaveProperty('xml_url')
  })

  it('ramo UPDATE (draft): pdf_storage_path nel payload, data del PDF = data del draft', async () => {
    await generaFatturaPA(LAVORO, 'fatt-7')
    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].pdf_storage_path).toMatch(/^lab-1\/\d{4}\/cortesia\/Fattura-2026-0007\.pdf$/)
    expect(updatePayloads[0]).not.toHaveProperty('xml_url')
    // il template riceve la data del draft, non quella odierna
    const [propsPassate] = mockRender.mock.calls[0] as unknown as [{ props: { fattura: { data: string } } }]
    expect(propsPassate.props.fattura.data).toBe('2026-07-01')
  })

  it('ramo UPDATE (draft): la <Data> nell\'XML è quella del draft (2026-07-01), mai la data odierna', async () => {
    await generaFatturaPA(LAVORO, 'fatt-7')
    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    expect(xmlUpload).toBeDefined()
    const xmlContent = String(xmlUpload?.bytes)
    expect(xmlContent).toContain('<Data>2026-07-01</Data>')
    // Stessa semantica del codice (fix date fiscali 20/07): l'atteso segue il
    // giorno civile di Roma — mai più divergente di notte (riserva architect #4).
    const oggi = oggiRomaISO()
    if (oggi !== '2026-07-01') {
      expect(xmlContent).not.toContain(`<Data>${oggi}</Data>`)
    }
  })

  it('render PDF fallito → generaFatturaPA lancia, nessun UPDATE/INSERT fatture (draft resta draft)', async () => {
    mockRender.mockRejectedValueOnce(new Error('render boom'))
    await expect(generaFatturaPA(LAVORO, 'fatt-7')).rejects.toThrow()
    expect(updatePayloads).toHaveLength(0)
    expect(insertPayloads).toHaveLength(0)
  })
})
