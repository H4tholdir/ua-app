import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createChain } from './helpers/supabase-chain-mock'

const { mockGetLabContextWithTimings, mockFrom, mockMaterialiCarenti } = vi.hoisted(() => ({
  mockGetLabContextWithTimings: vi.fn(),
  mockFrom: vi.fn(),
  mockMaterialiCarenti: vi.fn(),
}))

vi.mock('@/lib/supabase/lab-context', () => ({
  getLabContextWithTimings: mockGetLabContextWithTimings,
}))
vi.mock('@/lib/supabase/server-service', () => ({
  getServiceClient: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/consegna/materiali-carenti', () => ({
  materialiCarenti: mockMaterialiCarenti,
}))

import { GET } from '../../src/app/api/lavori/[id]/precheck-consegna/route'

const LAB_ID = 'lab-1'
const LAVORO_ID = 'lavoro-1'
const CONTEXT = {
  userId: 'user-1', email: null, ruolo: 'titolare', laboratorioId: LAB_ID,
  nome: null, cognome: null,
  lab: { stato: 'attivo', trial_ends_at: null, nome: 'Lab Test' },
}
const TIMINGS = { authMs: 1, dbMs: 2 }

const params = Promise.resolve({ id: LAVORO_ID })

function req() {
  return new Request(`http://localhost/api/lavori/${LAVORO_ID}/precheck-consegna`)
}

/** Lavoro minimo conforme ai requisiti MDR verificati da precheckMDR (elementi 3-7 + soft-block 16/07). */
function makeLavoroRow(overrides: Record<string, unknown> = {}) {
  return {
    id: LAVORO_ID,
    richiedente_nome: 'Dott. Rossi',
    cliente: { nome: 'Mario', cognome: 'Bianchi' },
    paziente_nome_snapshot: 'Verdi Luigi',
    paziente: null,
    descrizione: 'Corona ceramica 14 colore A2',
    tipo_dispositivo: 'protesi_fissa',
    classe_rischio: 'classe_iia',
    data_consegna_prevista: '2026-08-01',
    tipo_impronte: 'digitale',
    disinfettante_usato: 'clorexidina',
    ...overrides,
  }
}

/**
 * Mock di `svc.from(table)` per le sole tabelle toccate dalla route:
 * - 'lavori' → SELECT completa (select/eq/eq/is/single), stesso pattern di
 *   orchestrate.ts Step 1
 * Il laboratorio_id ora arriva da getLabContextWithTimings (mockato sopra).
 * `materialiCarenti` è mockato a livello di modulo (vedi vi.mock sopra).
 *
 * 🔴 CORRETTO IL 07/08/2026 (giro di correzione D295). Qui c'era una catena
 *    scritta a mano che apriva con `select: () => (…)`, cioè **buttava via
 *    l'argomento**: nessuna prova di questo repo guardava mai la stringa
 *    passata al `.select()`, e togliere l'embed
 *    `prescrizione:lavori_prescrizioni(*)` dalla query restava verde. Ora la
 *    catena è `createChain` (lo stesso strumento di
 *    `lavori-id-route-get-prescrizione.test.ts:118-127`), che REGISTRA ogni
 *    chiamata con i suoi argomenti in `chain.calls`.
 */
function buildMockFrom(opts: { lavoro?: Record<string, unknown> | null }) {
  const { lavoro = makeLavoroRow() } = opts

  return vi.fn((table: string) => {
    if (table === 'lavori') {
      return createChain({ data: lavoro, error: null })
    }

    throw new Error(`Unexpected table: ${table}`)
  })
}

/** La stringa passata al `.select()` della prima `.from('lavori')`. */
function selectDellaRotta(from: ReturnType<typeof buildMockFrom>): string {
  const chain = from.mock.results[0].value as ReturnType<typeof createChain>
  const selectCall = chain.calls.find((c) => c.method === 'select')
  expect(selectCall).toBeDefined()
  return String(selectCall!.args[0])
}

/** L'avviso della voce 6 (Allegato XIII punto 1), per prefisso: il testo
 *  completo vive in `precheck.ts` e non si duplica qui parola per parola. */
const AVVISO_VOCE_6 = 'La prescrizione è allegata ma non riporta caratteristiche'

describe('GET /api/lavori/[id]/precheck-consegna', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLabContextWithTimings.mockResolvedValue({ context: CONTEXT, timings: TIMINGS })
    mockMaterialiCarenti.mockResolvedValue([])
  })

  it('context null (non autenticato) → 401', async () => {
    mockGetLabContextWithTimings.mockResolvedValue({ context: null, timings: { authMs: 1, dbMs: 0 } })
    const res = await GET(req(), { params })
    expect(res.status).toBe(401)
  })

  it('lavoro di altro laboratorio (cross-tenant) → 404, mai 403', async () => {
    mockFrom.mockImplementation(buildMockFrom({ lavoro: null }))
    const res = await GET(req(), { params })
    expect(res.status).toBe(404)
  })

  it('lavoro completo e conforme → 200 blindato, nessuna chiave extra', async () => {
    mockFrom.mockImplementation(buildMockFrom({}))
    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(Object.keys(json).sort()).toEqual(['bloccanti', 'consegnabile', 'warnings'])
    expect(json).toEqual({ consegnabile: true, bloccanti: [], warnings: [] })
  })

  it('lavoro senza classe_rischio e con tipo_impronte null → bloccante + warning MDR', async () => {
    mockFrom.mockImplementation(
      buildMockFrom({
        lavoro: makeLavoroRow({ classe_rischio: null, tipo_impronte: null }),
      })
    )
    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.consegnabile).toBe(false)
    expect(json.bloccanti).toContainEqual(expect.objectContaining({ campo: 'classe_rischio' }))
    expect(json.warnings.some((w: string) => w.includes('Tipo impronta'))).toBe(true)
  })

  it('materiale sotto scorta → warning con il nome del materiale', async () => {
    mockFrom.mockImplementation(buildMockFrom({}))
    mockMaterialiCarenti.mockResolvedValue([
      { nome: 'Zirconia disco 98mm', quantita_necessaria: 5, scorta_attuale: 2, unita_misura: 'pz', sufficiente: false },
    ])
    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.consegnabile).toBe(true)
    expect(json.warnings.some((w: string) => w.includes('Zirconia disco 98mm'))).toBe(true)
  })

  // ═══ LA GIUNTURA banca dati → risposta (giro di correzione D295) ══════════
  //
  // 🔑 Le tre prove qui sotto accendono TRE anelli diversi, e servono tutte e
  //    tre perché ognuna cade per una ragione sua:
  //    · la stringa del `.select()` è l'unica prova possibile dell'EMBED — il
  //      finto client non filtra davvero le colonne, quindi togliere l'embed
  //      dalla query non cambierebbe il dato che il finto restituisce;
  //    · la riga ad ARRAY **con** caratteristiche prova la NORMALIZZAZIONE:
  //      senza `normalizzaPrescrizione`, `lavoro.prescrizione` resta
  //      `[{…}]`, `.contenuto` è `undefined`, e l'avviso scatterebbe su un
  //      lavoro che le caratteristiche ce le ha — un falso allarme;
  //    · la riga ad ARRAY **senza** caratteristiche prova il TRAVASO degli
  //      avvisi nei `warnings` della risposta.
  //
  // 📌 La forma ad ARRAY è quella VERA di PostgREST (la FK dell'embed è
  //    composita → `isOneToOne: false`), verificata interrogando la banca dati.

  it('il select nomina esplicitamente l\'embed prescrizione:lavori_prescrizioni(*)', async () => {
    const from = buildMockFrom({})
    mockFrom.mockImplementation(from)

    await GET(req(), { params })

    expect(selectDellaRotta(from)).toContain('prescrizione:lavori_prescrizioni(*)')
  })

  it('prescrizione come ARRAY senza caratteristiche → l\'avviso della voce 6 arriva nei warnings', async () => {
    mockFrom.mockImplementation(
      buildMockFrom({
        lavoro: makeLavoroRow({ prescrizione: [{ id: 'presc-1', contenuto: {} }] }),
      })
    )

    const res = await GET(req(), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.consegnabile).toBe(true)
    expect(json.warnings.some((w: string) => w.includes(AVVISO_VOCE_6))).toBe(true)
    // 🛑 E NON prende la coda «non registrato all'accettazione»: quell'avviso è
    //    già una frase italiana compiuta, la coda lì direbbe una cosa falsa.
    expect(json.warnings.some((w: string) => w.includes(`${AVVISO_VOCE_6}`) && w.includes('non registrato all\'accettazione'))).toBe(false)
  })

  it('prescrizione come ARRAY CON caratteristiche → nessun avviso: la normalizzazione ha spacchettato l\'array', async () => {
    mockFrom.mockImplementation(
      buildMockFrom({
        lavoro: makeLavoroRow({
          prescrizione: [{ id: 'presc-1', contenuto: { elementi: [26, 27], colore: 'A3' } }],
        }),
      })
    )

    const res = await GET(req(), { params })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warnings.some((w: string) => w.includes(AVVISO_VOCE_6))).toBe(false)
    expect(json.warnings).toEqual([])
  })
})
