// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'
import { LAB_FIXTURE, LAVORO_FIXTURE } from './helpers/pdf-fixtures'

/**
 * Task 5 — LA RIEMISSIONE. Spec §8.1 e §8.2.
 *
 * 🛑 «È IL PUNTO IN CUI L'ONDATA PUÒ FALLIRE DICHIARANDO SUCCESSO», e il modo
 * preciso in cui può farlo è questo: `generateDdC:194-203` restituisce la
 * dichiarazione ESISTENTE, con `{numero, url}`, **come se l'avesse generata**
 * (verificato leggendo il file, non dedotto). Se la riemissione passasse di lì
 * senza annullare prima, l'utente leggerebbe «riemessa» **con in mano il
 * documento vecchio**: nessun errore, nessun avviso.
 *
 * ⚖️ D299 — la riemissione **non tocca `lavori.stato`**: il manufatto è a posto e
 * resta dal dentista, si rifà solo la carta. Le prove qui sotto lo sorvegliano.
 *
 * 📌 Il piano proponeva di provare l'ordine con un interruttore
 * `riemetti(lavoro, { annullaPrima: false })`. **Non l'ho fatto:** sarebbe un
 * ramo di codice, VIVO in produzione, in cui l'ordine è quello sbagliato — cioè
 * si costruisce il difetto per poterlo provare. L'ordine è invece garantito
 * dalla transazione della RPC, e provato dalla mutazione (v. il resoconto).
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

import { riemettiDdC } from '../../src/lib/pdf/generate-ddc'

const EVENTO_ID = '44444444-4444-4444-4444-444444444444'
const NUOVA_ID = '55555555-5555-5555-5555-555555555555'
const VECCHIA_ID = '66666666-6666-6666-6666-666666666666'

/** Il banco: c'è già una dichiarazione VIVA, come sempre quando si riemette. */
function banco(ddcEsistente: { numero_ddc: string; pdf_url: string } | null = { numero_ddc: 'DDC-2026-0001', pdf_url: 'https://vecchio.test/ddc.pdf' }) {
  mockFrom.mockImplementation((tabella: string) => {
    if (tabella === 'laboratori') return createChain({ data: LAB_FIXTURE, error: null })
    if (tabella === 'rischi_tipo_dispositivo') return createChain({ data: null, error: null })
    if (tabella === 'dichiarazioni_conformita') {
      return { ...createChain({ data: ddcEsistente, error: null }), insert: mockInsert }
    }
    throw new Error(`tabella inattesa: ${tabella}`)
  })
}

describe('riemettiDdC — annulla e riemetti in un atto solo (spec §8.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert.mockResolvedValue({ error: null })
    mockUpload.mockResolvedValue({ error: null })
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://nuovo.test/ddc.pdf' } })
    mockGeneraProgressivo.mockResolvedValue(2)
    mockRpc.mockResolvedValue({
      data: { esito: 'ok', nuova_id: NUOVA_ID, vecchia_id: VECCHIA_ID, numero: 'DDC-2026-0002', numero_superato: 'DDC-2026-0001' },
      error: null,
    })
  })

  it('🛑 NON restituisce il documento VECCHIO: il numero è NUOVO', async () => {
    // È la §8.1 in una riga. Il banco ha una dichiarazione viva `DDC-2026-0001`:
    // se la riemissione passasse dalla porta dell'idempotenza tornerebbe quella.
    banco()
    const esito = await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
    // 🔑 L'unione discriminata è essa stessa una guardia: senza restringere su
    // `stato === 'ok'` il compilatore non concede `numero`. Chi chiama non può
    // leggere un numero senza aver prima verificato che la riemissione sia
    // avvenuta — che è esattamente ciò che la §8.1 chiede.
    if (esito.stato !== 'ok') throw new Error(`atteso ok, ricevuto ${esito.stato}`)
    expect(esito.numero).toBe('DDC-2026-0002')
    expect(esito.numero).not.toBe('DDC-2026-0001')
    expect(esito.url).toBe('https://nuovo.test/ddc.pdf')
    expect(esito.numeroSuperato).toBe('DDC-2026-0001')
  })

  it('🛑 NON usa l\'inserimento diretto: le due scritture passano dalla RPC atomica', async () => {
    // Un `insert` da qui vorrebbe dire due scritture separate, e fra le due una
    // finestra in cui il lavoro non ha nessuna dichiarazione viva.
    banco()
    await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
    expect(mockInsert).not.toHaveBeenCalled()
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc.mock.calls[0][0]).toBe('riemetti_ddc_atomica')
  })

  it('la RPC riceve lavoro, laboratorio, evento e la dichiarazione NUOVA per intero', async () => {
    banco()
    await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
    const arg = mockRpc.mock.calls[0][1] as { p_lavoro_id: string; p_laboratorio_id: string; p_evento_id: string; p_nuova: Record<string, unknown> }
    expect(arg.p_lavoro_id).toBe(LAVORO_FIXTURE.id)
    expect(arg.p_laboratorio_id).toBe(LAVORO_FIXTURE.laboratorio_id)
    expect(arg.p_evento_id).toBe(EVENTO_ID)
    // La dichiarazione nuova porta il documento nuovo, non il vecchio.
    expect(arg.p_nuova.numero_ddc).toMatch(/^DDC-\d{4}-0002$/)
    expect(arg.p_nuova.pdf_url).toBe('https://nuovo.test/ddc.pdf')
    expect(arg.p_nuova.stato).toBe('generata')
    // …e le impronte: sono ricalcolate sul documento nuovo, mai copiate.
    expect(arg.p_nuova.pdf_sha256).toEqual(expect.any(String))
    expect(arg.p_nuova.payload_sha256).toEqual(expect.any(String))
  })

  it('🛑 D299 — non manda NIENTE alla tabella `lavori`: la carta si rifà, il lavoro non si muove', async () => {
    banco()
    await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
    const tabelleToccate = mockFrom.mock.calls.map((c) => c[0])
    expect(tabelleToccate).not.toContain('lavori')
    // …e in particolare non passa dalla riapertura, che riporterebbe a `pronto`.
    expect(mockRpc.mock.calls.map((c) => c[0])).not.toContain('riapri_lavoro_atomica')
  })

  it('🛑 il `sostituisce_id` NON lo decide il codice: lo mette il database, che sa qual era la viva', async () => {
    // Se lo calcolasse qui, servirebbe una lettura in più — e fra la lettura e
    // la scrittura la dichiarazione viva potrebbe essere un'altra.
    banco()
    await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
    const arg = mockRpc.mock.calls[0][1] as { p_nuova: Record<string, unknown> }
    expect(arg.p_nuova).not.toHaveProperty('sostituisce_id')
    expect(arg.p_nuova).not.toHaveProperty('id')
  })

  describe('gli esiti che NON sono un successo, e nessuno di essi finge', () => {
    it('nessuna dichiarazione viva → non è una riemissione, e lo dice', async () => {
      banco(null)
      mockRpc.mockResolvedValue({ data: { esito: 'nessuna_dichiarazione_viva' }, error: null })
      const esito = await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
      expect(esito.stato).toBe('nessuna_dichiarazione_viva')
      expect(esito).not.toHaveProperty('numero')
    })

    it('evento non valido → rifiutata (D263: mai senza motivo)', async () => {
      banco()
      mockRpc.mockResolvedValue({ data: { esito: 'evento_non_valido' }, error: null })
      const esito = await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
      expect(esito.stato).toBe('evento_non_valido')
    })

    it('🛑 la RPC fallisce → LANCIA, e non torna un numero: un successo qui sarebbe il documento vecchio', async () => {
      banco()
      mockRpc.mockResolvedValue({ data: null, error: { message: 'riemissione: annullo della dichiarazione … fallito' } })
      await expect(riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)).rejects.toThrow()
    })

    it('un esito che la RPC non dichiara di poter restituire NON si legge come successo', async () => {
      banco()
      mockRpc.mockResolvedValue({ data: { esito: 'qualcosa_di_nuovo' }, error: null })
      await expect(riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)).rejects.toThrow()
    })

    it('una risposta vuota della RPC non passa per riuscita', async () => {
      banco()
      mockRpc.mockResolvedValue({ data: null, error: null })
      await expect(riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)).rejects.toThrow()
    })
  })

  it('🔑 la prima emissione e la riemissione nascono dallo STESSO costruttore', async () => {
    // Due costruttori sarebbero due documenti che divergono in silenzio: è la
    // lezione delle «due metà giuste» del 07/08. La prova che lo sorveglia è che
    // la dichiarazione mandata alla RPC porta le stesse chiavi obbligatorie che
    // la prima emissione scrive.
    banco()
    await riemettiDdC(LAVORO_FIXTURE, EVENTO_ID)
    const nuova = (mockRpc.mock.calls[0][1] as { p_nuova: Record<string, unknown> }).p_nuova
    for (const chiave of [
      'numero_ddc', 'anno_ddc', 'progressivo_ddc', 'fabbricante_nome', 'luogo_fabbricazione',
      'prescrittore_nome', 'paziente_nome', 'tipo_dispositivo', 'descrizione_dispositivo',
      'uso_esclusivo_paziente', 'prescrizione_caratteristiche', 'contiene_sostanze_o_tessuti',
      'testo_conformita', 'data_emissione', 'stato', 'pdf_url', 'storage_path_pdf',
      'pdf_sha256', 'payload_sha256', 'template_version',
    ]) {
      expect(nuova, chiave).toHaveProperty(chiave)
    }
    // 🛑 E NON porta `norma_riferimento`, che non è una colonna: la RPC la
    // rifiuterebbe come chiave ignota (ed è giusto così, R-P6).
    expect(nuova).not.toHaveProperty('norma_riferimento')
  })
})
