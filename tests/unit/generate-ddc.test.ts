// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpload, mockGetPublicUrl, mockGeneraProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockGeneraProgressivo: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}))

vi.mock('@/lib/db/progressivi', () => ({
  generaProgressivo: mockGeneraProgressivo,
}))

import { generateDdC } from '../../src/lib/pdf/generate-ddc'

function mockTables(lab: typeof LAB_FIXTURE, ddcEsistente: { numero_ddc: string; pdf_url: string } | null = null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'laboratori') return createChain({ data: lab, error: null })
    if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
    if (table === 'dichiarazioni_conformita') {
      const readChain = createChain({ data: ddcEsistente, error: null })
      return { ...readChain, insert: mockInsert }
    }
    throw new Error(`Tabella inattesa nel mock: ${table}`)
  })
}

describe('generateDdC', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(1)
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
      if (table === 'dichiarazioni_conformita') {
        const readChain = createChain({ data: null, error: null })
        return { ...readChain, insert: mockInsert }
      }
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

  it('seconda chiamata a generateDdC per lo stesso lavoro non rigenera (idempotenza retry)', async () => {
    mockTables(LAB_FIXTURE, { numero_ddc: 'DDC-2020-0042', pdf_url: 'https://example.test/ddc-esistente.pdf' })

    const result = await generateDdC(LAVORO_FIXTURE)

    expect(result).toEqual({ numero: 'DDC-2020-0042', url: 'https://example.test/ddc-esistente.pdf' })
    expect(mockGeneraProgressivo).not.toHaveBeenCalled()
    expect(mockUpload).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('regressione: race condition — guard non trova nulla, insert fallisce 23505, recupera la riga vincitrice', async () => {
    let selectCallCount = 0
    const winningRow = { numero_ddc: 'DDC-2026-0007', pdf_url: 'https://example.test/ddc-vincitrice.pdf' }
    mockFrom.mockImplementation((table: string) => {
      if (table === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
      if (table === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
      if (table === 'dichiarazioni_conformita') {
        return {
          select: () => {
            selectCallCount += 1
            // 1a chiamata = guard iniziale (nessuna riga), 2a = recupero post-23505 (riga vincitrice)
            return createChain(selectCallCount === 1 ? { data: null, error: null } : { data: winningRow, error: null })
          },
          insert: mockInsert,
        }
      }
      throw new Error(`Tabella inattesa nel mock: ${table}`)
    })
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } })

    const result = await generateDdC(LAVORO_FIXTURE)

    expect(result).toEqual({ numero: 'DDC-2026-0007', url: 'https://example.test/ddc-vincitrice.pdf' })
  })
})

describe('firma_ddc_sha256 (A18 — cut-off 20/07/2026, nessun backfill)', () => {
  const STORAGE_BASE = 'https://example-project.supabase.co'
  const FIRMA_URL = `${STORAGE_BASE}/storage/v1/object/public/documenti/lab-test-001/firma.png`
  beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', STORAGE_BASE) })
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

  it('con firma configurata scarica il file e inserisce lo SHA-256 esadecimale', async () => {
    const bytes = new TextEncoder().encode('firma-png-finta')
    const attesa = (await import('node:crypto')).createHash('sha256').update(bytes).digest('hex')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes.buffer }))
    mockTables({ ...LAB_FIXTURE, firma_ddc_url: FIRMA_URL })
    await generateDdC(LAVORO_FIXTURE)
    expect(fetch).toHaveBeenCalledWith(FIRMA_URL)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: attesa }))
  })

  it('senza firma configurata: hash null e NESSUN download', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    mockTables(LAB_FIXTURE) // firma_ddc_url: null
    await generateDdC(LAVORO_FIXTURE)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: null }))
  })

  it('URL fuori dallo storage pubblico del progetto: hashFirmaDdc NON fetcha (anti-SSRF), hash null', async () => {
    // NB: react-pdf fetcha comunque l'immagine nel render del template
    // (superficie PRE-esistente, chiusa a monte dalla validazione a scrittura
    // in PATCH /api/impostazioni) — qui si asserisce che il fetch di
    // hashFirmaDdc (chiamata a singolo argomento) non parta.
    const fetchMock = vi.fn().mockRejectedValue(new Error('bloccato'))
    vi.stubGlobal('fetch', fetchMock)
    mockTables({ ...LAB_FIXTURE, firma_ddc_url: 'http://169.254.169.254/latest/meta-data' })
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(fetchMock).not.toHaveBeenCalledWith('http://169.254.169.254/latest/meta-data')
    expect(result.numero).toMatch(/^DDC-\d{4}-0001$/)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: null }))
  })

  it('download fallito (rete o non-ok): fail-open — hash null ma la DdC si genera', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('storage giù')))
    mockTables({ ...LAB_FIXTURE, firma_ddc_url: FIRMA_URL })
    const result = await generateDdC(LAVORO_FIXTURE)
    expect(result.numero).toMatch(/^DDC-\d{4}-0001$/)
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ firma_ddc_sha256: null }))
  })
})
