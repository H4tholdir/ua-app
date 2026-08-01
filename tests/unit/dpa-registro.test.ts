// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain, type MockChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, CLIENTE_FIXTURE } from './helpers/pdf-fixtures'

const { mockFrom, mockInsert, mockUpload, mockDownload, mockProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(), mockInsert: vi.fn(), mockUpload: vi.fn(), mockDownload: vi.fn(), mockProgressivo: vi.fn(),
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    storage: { from: () => ({ upload: mockUpload, download: mockDownload }) },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: mockProgressivo }))

import { generateDpa } from '@/lib/pdf/generate-dpa'
import { VERSIONE_MODELLO_DPA } from '@/lib/pdf/dpa-modello'

/** L'anno civile di Roma calcolato QUI, senza passare da `annoRoma()`.
 *  🔑 Se lo calcolassi con la stessa funzione che usa l'implementazione, la prova
 *  confronterebbe l'implementazione con sé stessa e resterebbe verde anche se
 *  qualcuno passasse all'anno UTC — cioè proprio il guasto di capodanno che
 *  `src/lib/db/progressivi.ts:12-15` documenta come già pagato una volta. */
const ANNO_ROMA = Number(
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome', year: 'numeric' }).format(new Date())
)

/** Le catene consegnate da `from()`, indicizzate per TABELLA.
 *  🔑 NON si selezionano per posizione in `mockFrom.mock.results`: l'ordine delle
 *  chiamate è un dettaglio dell'implementazione (`Promise.all` valuta l'array da
 *  sinistra), e una prova che ci si appoggia guarda la catena sbagliata appena
 *  qualcuno riordina due righe — restando verde o rossa per la ragione sbagliata. */
const catene: Record<string, MockChain> = {}

function montaTabelle(emissioneEsistente: unknown) {
  for (const k of Object.keys(catene)) delete catene[k]
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'laboratori') {
      return (catene.laboratori = createChain({ data: LAB_FIXTURE, error: null }))
    }
    if (tabella === 'clienti') {
      return (catene.clienti = createChain({ data: CLIENTE_FIXTURE, error: null }))
    }
    if (tabella === 'data_processing_agreements') {
      const c = createChain({ data: emissioneEsistente, error: null })
      c.insert = mockInsert
      return (catene.data_processing_agreements = c)
    }
    throw new Error(`Tabella inattesa nel mock: ${tabella}`)
  })
}

describe('emissione nuova', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpload.mockResolvedValue({ error: null })
    mockProgressivo.mockResolvedValue(7)
    mockInsert.mockReturnValue(createChain({ data: { id: 'em-1' }, error: null }))
  })

  it('quando non esiste nulla: carica il file, prende un progressivo, scrive la riga', async () => {
    montaTabelle(null)
    const r = await generateDpa('lab-test-001', 'cli-001')

    expect(r.riemessa).toBe(true)
    expect(r.numero_dpa).toBe(`DPA-${ANNO_ROMA}-0007`)
    expect(r.emissione_id).toBe('em-1')
    expect(r.buffer.length).toBeGreaterThan(0)

    // il FILE prima della RIGA
    expect(mockUpload).toHaveBeenCalledBefore(mockInsert as never)

    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.tipo_controparte).toBe('dentista')
    expect(riga.dentista_id).toBe('cli-001')
    expect(riga.laboratorio_id).toBe('lab-test-001')
    expect(riga.stato).toBe('da_firmare')
    expect(riga.template_versione).toBe(VERSIONE_MODELLO_DPA)   // 🛑 D133: MAI il letterale
    expect(riga.progressivo_dpa).toBe(7)
    expect(riga.anno_dpa).toBe(ANNO_ROMA)
    expect(riga.numero_dpa).toBe(`DPA-${ANNO_ROMA}-0007`)
    expect(String(riga.storage_path_pdf)).toMatch(/^lab-test-001\/dpa\/\d{4}\/DPA-\d{4}-0007\.pdf$/)
    // 🔑 Non `toHaveLength(64)`: il vincolo vero in banca dati è
    // `dpa_impronte_esadecimali` (`^[0-9a-f]{64}$`), e una prova più debole del
    // vincolo lascia passare proprio la forma che il vincolo esiste per fermare.
    expect(String(riga.pdf_sha256)).toMatch(/^[0-9a-f]{64}$/)
    expect(String(riga.payload_sha256)).toMatch(/^[0-9a-f]{64}$/)
    expect(riga.emesso_at).toBeTruthy()
  })

  it("il progressivo è chiesto col tipo «dpa» e con l'anno di Roma", async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    expect(mockProgressivo).toHaveBeenCalledWith(expect.anything(), 'lab-test-001', 'dpa', ANNO_ROMA)
  })

  it("la lettura del cliente porta SEMPRE il filtro laboratorio_id (il client di servizio aggira la RLS)", async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    expect(catene.clienti.calls).toContainEqual({ method: 'eq', args: ['laboratorio_id', 'lab-test-001'] })
  })

  it('la riga di registro nasce dentro il proprio laboratorio, e il percorso del file pure', async () => {
    montaTabelle(null)
    await generateDpa('lab-test-001', 'cli-001')
    const riga = mockInsert.mock.calls[0][0] as Record<string, unknown>
    expect(riga.laboratorio_id).toBe('lab-test-001')
    // Stesso invariante del CHECK `dpa_percorso_nel_proprio_laboratorio`:
    // il percorso sta SOTTO la cartella del laboratorio che lo possiede.
    expect(String(riga.storage_path_pdf).startsWith('lab-test-001/')).toBe(true)
    expect(mockUpload.mock.calls[0][0]).toBe(riga.storage_path_pdf)
  })
})
