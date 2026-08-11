// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

/**
 * Task C — L'ATTO UNICO visto dal chiamante: `correggiERiemettiDdC`.
 *
 * 🛑 P16-bis — `riga` NON SI PUÒ PASSARE COSÌ COM'È. `costruisciDichiarazione`
 * mette `numero_ddc` (`generate-ddc.ts:234`) e `stato` (`:323`), e da C-bis in
 * poi il contratto li RIFIUTA con `P0001`: senza toglierle, la prima chiamata
 * vera alza. ⚠️ `anno_ddc` e `progressivo_ddc` invece restano TUTTE E DUE — la
 * coppia è indivisibile (C-ter) e mandarne una sola è un altro `P0001`.
 *
 * 🔑 E il PDF si rende PRIMA della transazione: i dati corretti devono essere
 * già dentro il lavoro che arriva qui, o la carta nuova ristampa l'errore.
 */

const { mockFrom, mockRpc, mockInsert, mockUpload, mockGetPublicUrl, mockGeneraProgressivo } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockInsert: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockGeneraProgressivo: vi.fn(),
}))

vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
    storage: { from: () => ({ upload: mockUpload, getPublicUrl: mockGetPublicUrl }) },
  }),
}))
vi.mock('@/lib/db/progressivi', () => ({ generaProgressivo: mockGeneraProgressivo }))

import { correggiERiemettiDdC } from '../../src/lib/pdf/generate-ddc'

const EVENTO_ID = '44444444-4444-4444-4444-444444444444'
const GETTONE = '2026-08-08T10:54:08.314024+00:00'
const CORREZIONI = { descrizione: 'Corona in zirconia' }

function banco() {
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
    if (tabella === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
    if (tabella === 'dichiarazioni_conformita') {
      return { ...createChain({ data: null, error: null }), insert: mockInsert }
    }
    throw new Error(`tabella inattesa: ${tabella}`)
  })
}

function chiama() {
  return correggiERiemettiDdC(LAVORO_FIXTURE, EVENTO_ID, CORREZIONI, GETTONE)
}

describe('correggiERiemettiDdC — il consumatore del contratto fermo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    banco()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://nuovo.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(2)
    mockRpc.mockResolvedValue({
      data: {
        esito: 'ok', nuova_id: 'n1', vecchia_id: 'v1',
        numero: 'DDC-2026-0002', numero_superato: 'DDC-2026-0001',
        updated_at: '2026-08-08T11:00:00.000001+00:00',
      },
      error: null,
    })
  })

  it('chiama l\'ATTO UNICO, non la riemissione vecchia', () => {
    return chiama().then(() => {
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc.mock.calls[0][0]).toBe('correggi_e_riemetti_atomica')
    })
  })

  it('🛑 `stato` e `numero_ddc` NON arrivano al contratto: li rifiuta con P0001 (P16-bis)', async () => {
    await chiama()
    const p = (mockRpc.mock.calls[0][1] as { p_nuova: Record<string, unknown> }).p_nuova
    expect(p).not.toHaveProperty('stato')
    expect(p).not.toHaveProperty('numero_ddc')
  })

  it('⚠️ …ma `anno_ddc` e `progressivo_ddc` restano TUTTE E DUE: la coppia è indivisibile (C-ter)', async () => {
    await chiama()
    const p = (mockRpc.mock.calls[0][1] as { p_nuova: Record<string, unknown> }).p_nuova
    expect(p.anno_ddc).toEqual(expect.any(Number))
    expect(p.progressivo_ddc).toBe(2)
  })

  it('la riga nuova arriva per intero: il resto del documento non si tocca', async () => {
    await chiama()
    const p = (mockRpc.mock.calls[0][1] as { p_nuova: Record<string, unknown> }).p_nuova
    for (const chiave of [
      'pdf_url', 'storage_path_pdf', 'pdf_sha256', 'payload_sha256', 'template_version',
      'fabbricante_nome', 'luogo_fabbricazione', 'paziente_nome', 'descrizione_dispositivo',
    ]) {
      expect(p, chiave).toHaveProperty(chiave)
    }
    expect(p).not.toHaveProperty('norma_riferimento')
  })

  it('le correzioni viaggiano in `p_correzioni`, insieme alla dichiarazione nuova', async () => {
    await chiama()
    const arg = mockRpc.mock.calls[0][1] as Record<string, unknown>
    expect(arg.p_correzioni).toEqual(CORREZIONI)
    expect(arg.p_evento_id).toBe(EVENTO_ID)
    expect(arg.p_lavoro_id).toBe(LAVORO_FIXTURE.id)
    expect(arg.p_laboratorio_id).toBe(LAVORO_FIXTURE.laboratorio_id)
  })

  it('🛑 il gettone viaggia COSÌ COM\'È: un solo `new Date` tronca i microsecondi e dà 409 per sempre', async () => {
    await chiama()
    const arg = mockRpc.mock.calls[0][1] as Record<string, unknown>
    expect(arg.p_atteso_updated_at).toBe(GETTONE)
    expect(String(arg.p_atteso_updated_at)).toContain('.314024')
  })

  it('🛑 il numero si PRENDE dal contratto, non si ricalcola: il formato vive in due posti', async () => {
    mockRpc.mockResolvedValue({
      data: { esito: 'ok', nuova_id: 'n1', vecchia_id: 'v1', numero: 'DDC-2026-999999', numero_superato: 'DDC-2026-0001' },
      error: null,
    })
    const e = await chiama()
    if (e.stato !== 'ok') throw new Error(`atteso ok, ricevuto ${e.stato}`)
    expect(e.numero).toBe('DDC-2026-999999')
  })

  it('restituisce anche il gettone AGGIORNATO: chi corregge due volte di fila deve poterlo rifare', async () => {
    const e = await chiama()
    if (e.stato !== 'ok') throw new Error('atteso ok')
    expect(e.updatedAt).toBe('2026-08-08T11:00:00.000001+00:00')
  })

  describe('🔴 i sei esiti GENTILI arrivano come JSON, non come errore', () => {
    it.each([
      'non_trovato', 'conflitto', 'evento_non_valido',
      'paziente_non_valido', 'senza_prescrizione', 'nessuna_dichiarazione_viva',
    ])('«%s» NON si legge come un successo', async (esito) => {
      mockRpc.mockResolvedValue({ data: { esito, updated_at: GETTONE }, error: null })
      const e = await chiama()
      expect(e.stato).toBe(esito)
      expect(e).not.toHaveProperty('numero')
    })

    it('il `conflitto` porta con sé il gettone FRESCO, che è ciò che serve per riprovare', async () => {
      mockRpc.mockResolvedValue({ data: { esito: 'conflitto', updated_at: GETTONE }, error: null })
      const e = await chiama()
      if (e.stato !== 'conflitto') throw new Error('atteso conflitto')
      expect(e.updatedAt).toBe(GETTONE)
    })
  })

  describe('e ciò che invece è un errore', () => {
    it('un P0001 di colpa del chiamante torna come richiesta rifiutata, col testo del contratto', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'atto unico: chiavi che non sono voci correggibili del documento: {classe_rischio}' },
      })
      const e = await chiama()
      if (e.stato !== 'richiesta_rifiutata') throw new Error(`atteso richiesta_rifiutata, ricevuto ${e.stato}`)
      expect(e.messaggio).toContain('classe_rischio')
    })

    it('🛑 un P0001 POST-ANNULLO LANCIA: è un guasto, e un 400 direbbe la bugia peggiore', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'atto unico: la penna dei denti ha risposto {"esito":"conflitto"}' },
      })
      await expect(chiama()).rejects.toThrow()
    })

    it('un 23505 su un vincolo noto torna come esito, non come guasto', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'duplicate key value violates unique constraint "ddc_evento_annulla_unique"' },
      })
      const e = await chiama()
      expect(e.stato).toBe('evento_gia_consumato')
    })

    it('🛑 un esito che il contratto non dichiara NON si legge come successo (fail-closed)', async () => {
      // 🔴 `nuova_id` C'È, ED È IL PUNTO DELLA PROVA. Senza, questa passava
      //    dalla SECONDA metà della condizione — «un `ok` senza `nuova_id`» —
      //    che ha già la sua prova tre righe più giù: la prima metà non l'ha
      //    mai guardata nessuno. Misurato dalla revisione del Task C:
      //    indebolito il fail-closed a `typeof risposta.nuova_id !== 'string'`,
      //    **130 prove su 130 restavano verdi**, e la finta con `nuova_id`
      //    tornava `{ stato: 'ok' }` invece di alzare.
      // 🛑 Ciò che difende: un contratto che domani rispondesse
      //    `{esito: 'annullata_ma_non_riemessa', nuova_id: '…'}` verrebbe letto
      //    come «rifatta» — dichiarare rifatto un documento che non è stato
      //    rifatto è il difetto peggiore possibile su questa carta.
      mockRpc.mockResolvedValue({ data: { esito: 'qualcosa_di_nuovo', nuova_id: 'n1' }, error: null })
      await expect(chiama()).rejects.toThrow()
    })

    it('una risposta vuota non passa per riuscita', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await expect(chiama()).rejects.toThrow()
    })

    it('un `ok` senza `nuova_id` non è un successo: mancherebbe la prova che la riga è nata', async () => {
      mockRpc.mockResolvedValue({ data: { esito: 'ok', numero: 'DDC-2026-0002' }, error: null })
      await expect(chiama()).rejects.toThrow()
    })
  })
})
