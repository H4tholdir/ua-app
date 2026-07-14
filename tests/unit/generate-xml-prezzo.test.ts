// tests/unit/generate-xml-prezzo.test.ts
// N4: generaFatturaPA deve derivare l'imponibile tramite l'helper unico
// prezzoEffettivoLavoro (righe se esistono, altrimenti prezzo_unitario del
// lavoro), NON più con una copia inline della regola. Verifica il valore che
// finisce davvero nell'XML (<ImponibileImporto>) e nella riga INSERT su
// `fatture` — non l'helper isolato.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, uploads, insertPayloads } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  uploads: [] as Array<{ bucket: string; path: string; contentType: string; bytes: unknown }>,
  insertPayloads: [] as Array<Record<string, unknown>>,
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

// Lavoro CON righe di lavorazione: imponibile deve essere la somma degli importi
// (righe vincono sempre, indipendentemente da prezzo_unitario).
const LAVORO_CON_RIGHE = {
  id: 'lav-9', laboratorio_id: 'lab-1', numero_lavoro: 'n.9', descrizione: 'Corona di test',
  prezzo_unitario: 999, // deliberatamente diverso dalla somma righe: le righe devono vincere
  lavorazioni: [
    { id: 'r1', descrizione: 'Corona ceramica', quantita: 1, unita_misura: 'PZ', prezzo_unitario: 100, importo: 100 },
    { id: 'r2', descrizione: 'Perno moncone', quantita: 1, unita_misura: 'PZ', prezzo_unitario: 12, importo: 12 },
  ],
  cliente: CLIENTE,
} as never

// Lavoro SENZA righe: imponibile deve ricadere su prezzo_unitario del lavoro.
const LAVORO_SENZA_RIGHE = {
  id: 'lav-10', laboratorio_id: 'lab-1', numero_lavoro: 'n.10', descrizione: 'Ponte di test',
  prezzo_unitario: 322,
  lavorazioni: [],
  cliente: CLIENTE,
} as never

// Lavoro con una riga a Natura IVA non-N4: l'emissione deve essere bloccata
// (assertion fiscale — righe custom-made devono sempre essere N4).
const LAVORO_NATURA_INVALIDA = {
  id: 'lav-11', laboratorio_id: 'lab-1', numero_lavoro: 'n.11', descrizione: 'Corona di test',
  prezzo_unitario: 100,
  lavorazioni: [
    { id: 'r1', descrizione: 'Corona ceramica', quantita: 1, unita_misura: 'PZ', prezzo_unitario: 100, importo: 100, natura_iva: 'N1' },
  ],
  cliente: CLIENTE,
} as never

beforeEach(() => {
  vi.clearAllMocks()
  uploads.length = 0
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

describe('generaFatturaPA — imponibile via prezzoEffettivoLavoro (N4)', () => {
  it('con righe di lavorazione: imponibile = somma importi righe (112), non prezzo_unitario', async () => {
    await generaFatturaPA(LAVORO_CON_RIGHE, undefined)

    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0].imponibile).toBe(112)
    expect(insertPayloads[0].totale).toBe(112 + 2.0) // bollo applicato (>77.47)

    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    const xmlContent = String(xmlUpload?.bytes)
    expect(xmlContent).toContain('<ImponibileImporto>112.00</ImponibileImporto>')
  })

  it('senza righe di lavorazione: imponibile = prezzo_unitario del lavoro (322)', async () => {
    await generaFatturaPA(LAVORO_SENZA_RIGHE, undefined)

    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0].imponibile).toBe(322)
    expect(insertPayloads[0].totale).toBe(322 + 2.0)

    const xmlUpload = uploads.find((u) => u.contentType === 'application/xml')
    const xmlContent = String(xmlUpload?.bytes)
    expect(xmlContent).toContain('<ImponibileImporto>322.00</ImponibileImporto>')
  })
})

describe('generaFatturaPA — assertion Natura N4', () => {
  it('rigetta emissione se una riga di lavorazione ha natura_iva diversa da N4', async () => {
    await expect(generaFatturaPA(LAVORO_NATURA_INVALIDA, undefined)).rejects.toThrow(
      'Natura IVA non N4 su riga di lavorazione: FatturaPA custom-made richiede N4'
    )
    // Nessuna scrittura deve essere avvenuta: l'assertion blocca PRIMA dell'INSERT/UPDATE.
    expect(insertPayloads).toHaveLength(0)
  })
})

describe('generaFatturaPA — log divergenza prezzo sul ramo automatico (senza fatturaId)', () => {
  it('logga [N4] con console.warn se righe e prezzo_unitario divergono, ma l\'emissione va comunque a buon fine', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    // LAVORO_CON_RIGHE: prezzo_unitario=999 vs somma righe=112 → divergente per costruzione.
    await generaFatturaPA(LAVORO_CON_RIGHE, undefined)

    expect(warnSpy).toHaveBeenCalledWith(
      '[N4] divergenza prezzo in emissione automatica',
      expect.objectContaining({ lavoroId: 'lav-9' })
    )
    expect(insertPayloads).toHaveLength(1)
    expect(insertPayloads[0].imponibile).toBe(112)

    warnSpy.mockRestore()
  })
})
