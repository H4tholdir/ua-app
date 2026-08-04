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
// 🔑 EMENDAMENTO T1 (review T3+T9, adjudicato dal controllore): la chiave
// `prescrizione` parte anche quando c'è SOLO l'elemento, senza colore — un
// lavoro con denti e senza colore mandava un body senza `prescrizione`, il
// gate del server (`route.ts:220-245`) non creava NESSUNA riga snapshot, e
// `contenuto.elementi` (l'artefatto W20) non atterrava mai. Le forme nuove
// qui sotto (blocco "EMENDAMENTO"): elemento senza colore · elemento +
// colore sganciato (denti sì, colore no nel body) · niente elemento e
// niente colore (chiave assente, come prima).
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

async function crea(patch: {
  colore?: string
  coloreOrigine?: 'prescrizione' | 'lab'
  elemento?: string
}) {
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

  // ── EMENDAMENTO T1 — la chiave parte anche coi soli elementi ────────────
  describe('emendamento T1: la chiave parte quando ci sono ELEMENTI, col colore o senza', () => {
    // 7. Elemento presente, colore ASSENTE — prima di questo emendamento
    // `prescrizione` non partiva affatto: il server non creava alcuna riga
    // e `contenuto.elementi` non atterrava mai. Il body ora porta `{}`: il
    // server compone `elementi` da `body.denti` (già mandato), non da qui.
    it('elemento presente + colore assente → prescrizione: {} (denti[] già nel body sopra)', async () => {
      const m = mockFetch()
      percorsoPrimarioOk(m)

      await crea({ elemento: '2.6', colore: '' })

      const corpo = corpoPostLavori(m)
      expect(corpo.prescrizione).toEqual({})
      expect(corpo.denti).toEqual([{ fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' }])
      expect(corpo).not.toHaveProperty('colore_codice')
    })

    // 8. Elemento presente + colore SGANCIATO ('lab', compilato) — i denti
    // fanno partire la chiave, ma il colore non è una trascrizione (è una
    // scelta di laboratorio): il body resta `{}`, non `{ colore }`.
    it("elemento presente + colore sganciato ('lab') → prescrizione: {} (i denti fanno partire la chiave, il colore NO)", async () => {
      const m = mockFetch()
      percorsoPrimarioOk(m)

      await crea({ elemento: '2.6', colore: 'A2', coloreOrigine: 'lab' })

      const corpo = corpoPostLavori(m)
      expect(corpo.prescrizione).toEqual({})
      expect(corpo.denti).toEqual([{ fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' }])
      // `colore_codice` (il DATO DI CASO) viaggia comunque, in ENTRAMBI gli
      // esiti dello sgancio — invariato dal caso 3 qui sopra.
      expect(corpo.colore_codice).toBe('A2')
    })

    // 9. Niente elemento (solo caratteri scartati, zero FDI validi) e niente
    // colore → la chiave resta ASSENTE, come nel caso 4: nessuna delle due
    // ragioni è vera, non c'è nulla da trascrivere.
    it('niente elemento (zero FDI validi) e niente colore → nessuna prescrizione', async () => {
      const m = mockFetch()
      percorsoPrimarioOk(m)

      await crea({ elemento: 'pippo', colore: '' })

      const corpo = corpoPostLavori(m)
      expect(corpo).not.toHaveProperty('prescrizione')
      expect(corpo).not.toHaveProperty('denti')
      expect(corpo).not.toHaveProperty('colore_codice')
    })

    // 10. Elemento presente + colore trascritto (coloreOrigine 'prescrizione')
    // — la forma "piena": la chiave parte per entrambe le ragioni, e il
    // corpo porta il colore grezzo, non `{}`. Non deve regredire scrivendo
    // sempre `{}` quando ci sono denti.
    it('elemento presente + colore trascritto → prescrizione: { colore } (non {}), entrambe le ragioni vere', async () => {
      const m = mockFetch()
      percorsoPrimarioOk(m)

      await crea({ elemento: '2.6', colore: ' a3 ', coloreOrigine: 'prescrizione' })

      const corpo = corpoPostLavori(m)
      expect(corpo.prescrizione).toEqual({ colore: ' a3 ' })
      expect(corpo.denti).toEqual([{ fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' }])
      expect(corpo.colore_codice).toBe('A3')
    })
  })
})
