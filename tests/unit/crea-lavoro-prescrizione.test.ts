import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { creaLavoroDaWizard } from '@/lib/wizard/crea-lavoro'
import type { TipoScelto } from '@/components/features/wizard/WizardNuovoLavoro'

// Task 1 (Ondata B, sessione ③) — il wizard manda la trascrizione
// (`prescrizione`, gate D216 già in produzione lato server) e lo stato dello
// sgancio. QUESTO FILE è client-only, NIENTE UI (framing = Task 2): copre
// SOLO `creaLavoroDaWizard`, cioè il punto che compone il body del POST
// /api/lavori.
//
// Le SEI forme d'input di `coloreOrigine` × `colore` enumerate dal brief
// (R-P4): assente · 'prescrizione' · 'lab' · colore vuoto · colore solo
// spazi · colore fuori catalogo. Ognuna ha il suo caso qui sotto.
//
// 🔑 Perché il colore nella busta prescrizione è GREZZO (' a3 ', con gli
// spazi): fedeltà D210, verificata leggendo `componiSnapshot`
// (`src/lib/prescrizione/componi-snapshot.ts:8`) — il server non fa MAI
// trim/uppercase sul colore trascritto, lo confronta byte a byte con ciò che
// il medico ha scritto. `colore_codice` (il DATO DI CASO, normalizzato) è
// un'altra cosa: viaggia SEMPRE quando c'è un colore, in ENTRAMBI gli esiti
// dello sgancio (task-1-brief.md riga 7) — ogni caso qui sotto lo controlla
// insieme a `prescrizione`, per non confondere le due garanzie.

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const CLIENTE = { id: 'cli-1' }
const TIPO: TipoScelto = { kind: 'catalogo', tipoId: 'corona_zirconia' }
const DATA_CONSEGNA = new Date(2026, 6, 16)

function mockFetch() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}
function jsonOk(status: number, body: unknown) {
  return { ok: true, status, json: async () => body }
}

/** GET pazienti (vuoto) + POST pazienti + POST lavori: il percorso primario. */
function percorsoPrimarioOk(m: ReturnType<typeof mockFetch>) {
  m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
  m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-1' } }))
  m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-1', numero_lavoro: '2026/0042' } }))
}

/** Il corpo del POST /api/lavori (sempre la 3ª chiamata sul percorso primario). */
function corpoPostLavori(m: ReturnType<typeof mockFetch>): Record<string, unknown> {
  const chiamata = m.mock.calls.find((c) => c[0] === '/api/lavori' && c[1]?.method === 'POST')
  if (!chiamata) throw new Error('POST /api/lavori non è mai stato chiamato')
  return JSON.parse(chiamata[1].body)
}

async function crea(patch: { colore?: string; coloreOrigine?: 'prescrizione' | 'lab' }) {
  return creaLavoroDaWizard({
    cliente: CLIENTE,
    tipo: TIPO,
    pz: 'PZ-0001',
    alias: '',
    elemento: '',
    colore: '',
    foto: null,
    dataConsegna: DATA_CONSEGNA,
    ...patch,
  })
}

describe('creaLavoroDaWizard — prescrizione (Task 1, D216/D223/D210)', () => {
  // 1. ASSENTE — nessun `coloreOrigine` passato (il wizard di oggi, prima del
  // Task 2, non lo passa mai): semantica di riposo = 'prescrizione'.
  it('coloreOrigine ASSENTE + colore compilato → prescrizione trascritta GREZZA, colore_codice normalizzato', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: ' a3 ' })

    const corpo = corpoPostLavori(m)
    expect(corpo.prescrizione).toEqual({ colore: ' a3 ' })
    expect(corpo.colore_codice).toBe('A3')
  })

  // 2. 'prescrizione' ESPLICITO — stesso esito dell'assente (D223: scrivere È
  // trascrivere).
  it("coloreOrigine:'prescrizione' esplicito + colore compilato → stesso esito dell'assente", async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: 'A2', coloreOrigine: 'prescrizione' })

    const corpo = corpoPostLavori(m)
    expect(corpo.prescrizione).toEqual({ colore: 'A2' })
    expect(corpo.colore_codice).toBe('A2')
  })

  // 3. 'lab' — sganciato: NIENTE da trascrivere, anche se la casella «Colore»
  // è compilata. `colore_codice` (il caso) continua a viaggiare com'è
  // (task-1-brief.md riga 7, «in ENTRAMBI gli esiti dello sgancio»).
  it("coloreOrigine:'lab' + colore compilato → NESSUNA prescrizione, colore_codice normalizzato viaggia comunque", async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: 'A2', coloreOrigine: 'lab' })

    const corpo = corpoPostLavori(m)
    expect(corpo).not.toHaveProperty('prescrizione')
    expect(corpo.colore_codice).toBe('A2')
  })

  // 4. colore VUOTO ('') — stringa vuota = assente (M-T5-4): niente da
  // trascrivere, a prescindere da coloreOrigine.
  it("colore VUOTO ('') → nessuna prescrizione (M-T5-4), e nessun colore_codice", async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: '' })

    const corpo = corpoPostLavori(m)
    expect(corpo).not.toHaveProperty('prescrizione')
    expect(corpo).not.toHaveProperty('colore_codice')
  })

  // 5. colore SOLO SPAZI ('   ') — vuoto DOPO trim: stesso esito del caso 4.
  // 🔑 Deliberatamente diverso dalla regola del server (`componiSnapshot`
  // preserva «solo spazi» come trascrizione legittima): qui il gate è tutto
  // client-side, e il client giudica «solo spazi» = niente da trascrivere
  // PRIMA di mandare la chiave — il server non vede mai questo caso.
  it("colore SOLO SPAZI ('   ') → vuoto dopo trim, nessuna prescrizione", async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: '   ' })

    const corpo = corpoPostLavori(m)
    expect(corpo).not.toHaveProperty('prescrizione')
    expect(corpo).not.toHaveProperty('colore_codice')
  })

  // 6. colore FUORI CATALOGO — il client non decide cosa è in catalogo (quello
  // è mestiere del server, `lavori_colore_caso_fk`): un colore scartato dal
  // CASO resta comunque TRASCRITTO, grezzo, com'è digitato.
  it('colore FUORI CATALOGO → trascritto comunque (il client non giudica il catalogo), colore_codice normalizzato parte lo stesso', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: 'zz9' })

    const corpo = corpoPostLavori(m)
    expect(corpo.prescrizione).toEqual({ colore: 'zz9' })
    // Normalizzato per il CASO (trim+uppercase) — se il server lo scarta
    // (fuori catalogo) lo dice con `colore_scartato`, non affare di questo test.
    expect(corpo.colore_codice).toBe('ZZ9')
  })
})
