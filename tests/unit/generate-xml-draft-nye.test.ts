// tests/unit/generate-xml-draft-nye.test.ts
// P2-d1: rinumerazione del draft a cavallo d'anno all'emissione — spec
// docs/superpowers/specs/2026-07-20-draft-nye-rinumerazione-design.md.
// Ramo draft (fatturaId presente): stesso anno → numero/anno/data restano
// congelati sul draft (regressione); anno PRECEDENTE quello di Roma alla
// data di emissione → il draft si rinumera nella serie dell'anno corrente e
// l'ex numero finisce in fatture.note. Harness di mock ricalcato su
// generate-xml-td04.test.ts.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { mockFrom, uploads, updatePayloads, progressivoCalls } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  uploads: [] as Array<{ bucket: string; path: string; contentType: string; bytes: unknown }>,
  updatePayloads: [] as Array<Record<string, unknown>>,
  progressivoCalls: [] as Array<{ tipo: string; anno: number }>,
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
// Spia su generaProgressivo: registra (serie, anno) e ritorna valori distinti
// per serie, cosi' gli assert possono distinguere sdi_invio (7) da fattura (3)
// senza ambiguita' sull'ordine di chiamata.
vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: vi.fn(async (_supabase: unknown, _laboratorioId: string, tipo: string, anno: number) => {
    progressivoCalls.push({ tipo, anno })
    return tipo === 'sdi_invio' ? 7 : 3
  }),
}))
vi.mock('@/lib/pdf/render-document', () => ({ renderPdfDocument: vi.fn(async () => Buffer.from('%PDF-fake')) }))

import { generaFatturaPA } from '@/lib/fattura/generate-xml'

const LAB = {
  id: 'lab-1', nome: 'Lab', ragione_sociale: 'Lab SRL', partita_iva: '12345678901',
  codice_fiscale: null, indirizzo: 'Via X 1', cap: '80100', citta: 'Napoli', provincia: 'NA',
  regime_fiscale: 'RF01', pec: null, pec_host: null, pec_port: null, pec_user: null,
  pec_smtp_configurata: false, pec_vault_key_id: null,
}

const CLIENTE = {
  id: 'cli-1', cognome: 'Rossi', nome: 'Mario', studio_nome: 'Studio Rossi',
  codice_sdi: 'ABC1234', pec: null, partita_iva: '01234567890', codice_fiscale: null,
  indirizzo: 'Via Y 2', cap: '80100', citta: 'Napoli', provincia: 'NA',
}

const LAVORO = {
  id: 'lav-45', laboratorio_id: 'lab-1', numero_lavoro: 'n.45', descrizione: 'Corona di test',
  prezzo_unitario: 100, lavorazioni: [],
  cliente: CLIENTE,
} as never

// Sede cliente dal registro — usata SOLO dal ramo TD04 (Amendment 2026-07-15).
const CLIENTE_SEDE = { indirizzo: 'Via Y 2', cap: '80100', citta: 'Napoli', provincia: 'NA' }

let currentDraft: Record<string, unknown>

function mockDraft(draft: Record<string, unknown>) {
  currentDraft = draft
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') {
      const c: Record<string, unknown> = {}
      c.select = () => c
      c.eq = () => c
      c.single = async () => ({ data: LAB, error: null })
      return c
    }
    if (table === 'clienti') {
      const c: Record<string, unknown> = {}
      c.select = () => c
      c.eq = () => c
      c.single = async () => ({ data: CLIENTE_SEDE, error: null })
      return c
    }
    if (table === 'fatture') {
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: currentDraft, error: null }) }) }),
        update: (payload: Record<string, unknown>) => {
          updatePayloads.push(payload)
          return { eq: async () => ({ error: null }) }
        },
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
}

// Fixture base draft TD01 — i singoli test sovrascrivono numero/anno/data/note.
function draftTd01(overrides: Record<string, unknown>) {
  return {
    numero: '0000-0000',
    progressivo: 0,
    anno: 0,
    data: '0000-01-01',
    note: null,
    tipo_documento: 'TD01',
    imponibile: 100,
    collegata_numero: null,
    collegata_data: null,
    causale_storno: null,
    cliente_id: 'cli-1',
    cliente_denominazione: 'Studio Rossi',
    cliente_piva: '01234567890',
    cliente_cf: null,
    cliente_indirizzo: 'Via Y 2, 80100 Napoli NA',
    cliente_codice_sdi: 'ABC1234',
    cliente_pec: null,
    laboratorio_id: 'lab-1',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  uploads.length = 0
  updatePayloads.length = 0
  progressivoCalls.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

const ANNO_CORRENTE = new Date().getFullYear()

describe("generaFatturaPA — rinumerazione draft a cavallo d'anno (d1)", () => {
  it('1. REGRESSIONE stesso anno: UPDATE senza numero/anno/data/note, generaProgressivo MAI chiamato con serie fattura', async () => {
    mockDraft(
      draftTd01({
        numero: `${ANNO_CORRENTE}-0045`,
        progressivo: 45,
        anno: ANNO_CORRENTE,
        data: `${ANNO_CORRENTE}-06-01`,
        note: null,
      })
    )

    await generaFatturaPA(LAVORO, 'fatt-45')

    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0]).not.toHaveProperty('numero')
    expect(updatePayloads[0]).not.toHaveProperty('anno')
    expect(updatePayloads[0]).not.toHaveProperty('data')
    expect(updatePayloads[0]).not.toHaveProperty('note')
    expect(progressivoCalls.some((c) => c.tipo === 'fattura')).toBe(false)

    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    expect(String(xmlUpload?.bytes)).toContain(`<Numero>${ANNO_CORRENTE}-0045</Numero>`)
  })

  it('2. RINUMERATO: draft anno 2026, clock 2027-01-02T10:00Z → generaProgressivo(fattura, 2027), UPDATE con numero/anno/progressivo/data/note nuovi, XML aggiornato', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-02T10:00:00Z'))
    mockDraft(
      draftTd01({
        numero: '2026-0045',
        progressivo: 45,
        anno: 2026,
        data: '2026-12-28',
        note: null,
      })
    )

    await generaFatturaPA(LAVORO, 'fatt-45')

    expect(progressivoCalls).toContainEqual({ tipo: 'fattura', anno: 2027 })
    expect(updatePayloads).toHaveLength(1)
    const upd = updatePayloads[0]
    expect(upd.numero).toBe('2027-0003')
    expect(upd.anno).toBe(2027)
    expect(upd.progressivo).toBe(3)
    expect(upd.data).toBe('2027-01-02')
    expect(upd.note).toContain('sostituisce la bozza 2026-0045 del 2026-12-28')

    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    const xmlContent = String(xmlUpload?.bytes)
    expect(xmlContent).toContain('<Numero>2027-0003</Numero>')
    expect(xmlContent).toContain('<Data>2027-01-02</Data>')
  })

  it("3. CAPODANNO ROMA: clock 2026-12-31T23:30:00Z (= 2027 a Roma), draft anno 2026 → RINUMERATO a 2027 (annoRoma decide, non l'UTC)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T23:30:00Z'))
    mockDraft(
      draftTd01({
        numero: '2026-0050',
        progressivo: 50,
        anno: 2026,
        data: '2026-12-30',
        note: null,
      })
    )

    await generaFatturaPA(LAVORO, 'fatt-50')

    expect(progressivoCalls).toContainEqual({ tipo: 'fattura', anno: 2027 })
    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].anno).toBe(2027)
    expect(updatePayloads[0].numero).toBe('2027-0003')
  })

  it('4. TD04 anno precedente: rinumerato E collegata_numero/collegata_data/causale_storno NON nel payload UPDATE (snapshot storno intatto)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-02T10:00:00Z'))
    mockDraft({
      numero: '2026-0099',
      progressivo: 99,
      anno: 2026,
      data: '2026-12-28',
      note: null,
      tipo_documento: 'TD04',
      imponibile: 100,
      collegata_numero: '2026-0012',
      collegata_data: '2026-07-01',
      causale_storno: 'Storno per errore di fatturazione',
      cliente_id: 'cli-1',
      cliente_denominazione: 'Studio Rossi',
      cliente_piva: '01234567890',
      cliente_cf: null,
      cliente_indirizzo: 'Via Y 2, 80100 Napoli NA',
      cliente_codice_sdi: 'ABC1234',
      cliente_pec: null,
      laboratorio_id: 'lab-1',
    })

    await generaFatturaPA(null, 'fatt-99')

    expect(updatePayloads).toHaveLength(1)
    const upd = updatePayloads[0]
    expect(upd.numero).toBe('2027-0003')
    expect(upd.anno).toBe(2027)
    expect(upd).not.toHaveProperty('collegata_numero')
    expect(upd).not.toHaveProperty('collegata_data')
    expect(upd).not.toHaveProperty('causale_storno')

    // Lo storno resta riferito alla fattura ORIGINALE stornata, non alla bozza rinumerata.
    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    const xmlContent = String(xmlUpload?.bytes)
    expect(xmlContent).toContain('<IdDocumento>2026-0012</IdDocumento>')
  })

  it("5. NOTA PREESISTENTE: nota esistente concatenata con \\n, mai sovrascritta", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-02T10:00:00Z'))
    mockDraft(
      draftTd01({
        numero: '2026-0045',
        progressivo: 45,
        anno: 2026,
        data: '2026-12-28',
        note: 'Nota esistente',
      })
    )

    await generaFatturaPA(LAVORO, 'fatt-45')

    expect(updatePayloads[0].note).toBe(
      "Nota esistente\nRinumerata all'emissione: sostituisce la bozza 2026-0045 del 2026-12-28 (serie anno precedente)."
    )
  })
})
