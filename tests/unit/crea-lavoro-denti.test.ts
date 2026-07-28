import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { creaLavoroDaWizard, mappaElementi } from '@/lib/wizard/crea-lavoro'
import type { TipoScelto } from '@/components/features/wizard/WizardNuovoLavoro'

// Task 11 — il wizard smette di perdere il dato in silenzio.
//
// Fino al Task 10 il wizard creava il lavoro e POI mandava una PATCH con
// `denti_coinvolti`/`colore_dente`. Dal Task 10 quei due nomi sono fuori da
// `PATCHABLE_FIELDS`, e la PATCH li scarta SENZA errore
// (`src/app/api/lavori/[id]/route.ts`): il server risponde 200, il client
// legge «Fatto!» e il dato non c'è. Qui i denti viaggiano DENTRO il POST, che
// li scrive nella stessa transazione del lavoro (`lavoro_crea_atomico`).
//
// 🔑 LA FORMA CHE IL WIZARD RACCOGLIE DAVVERO. `PassoPaziente.tsx:83-98` non
// ha né odontogramma né tendina dei colori: sono due caselle di testo libero,
// «Elemento» (segnaposto «es. 2.6») e «Colore» (segnaposto «es. A2»). Quindi:
//   · il colore è UNO SOLO e vale per tutto il caso → `colore_codice` sul
//     lavoro (default di caso, `lavori.colore_scala`/`colore_codice`), MAI
//     stampato su ogni dente: sarebbe una prescrizione per-dente che
//     l'odontotecnico non ha mai dato, e alla prima correzione dalla scheda
//     (Task 12) le righe farebbero ombra al caso via la precedenza
//     riga→caso di `src/lib/domain/colore-dente.ts`;
//   · la scala NON esiste nell'interfaccia: si manda il solo codice e la
//     deduce il server dal catalogo (i 48 codici sono distinti fra le tre
//     scale);
//   · `ruolo: 'elemento'` e `provenienza: 'prescritto'` sono COSTANTI, non
//     scelte: il wizard è l'accettazione di ciò che il dentista ha prescritto
//     (`PassoDentista` sceglie il dentista, `PassoPaziente` registra la
//     prescrizione), e mancante/impianto/eseguito non hanno alcun comando qui.
//     La selezione per-dente è ondata (b).

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const CLIENTE = { id: 'cli-1' }
const TIPO_CATALOGO: TipoScelto = { kind: 'catalogo', tipoId: 'corona_zirconia' }
const DATA_CONSEGNA = new Date(2026, 6, 16)

function mockFetch() {
  return fetch as unknown as ReturnType<typeof vi.fn>
}
function jsonOk(status: number, body: unknown) {
  return { ok: true, status, json: async () => body }
}
function jsonFail(status = 500) {
  return { ok: false, status, json: async () => ({ error: 'boom' }) }
}

/** GET pazienti (vuoto) + POST pazienti + POST lavori: il percorso primario. */
function percorsoPrimarioOk(m: ReturnType<typeof mockFetch>) {
  m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
  m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-1' } }))
  m.mockResolvedValueOnce(jsonOk(201, { lavoro: { id: 'lav-1', numero_lavoro: '2026/0042' } }))
}

async function crea(patch: { elemento?: string; colore?: string; foto?: File | null }) {
  return creaLavoroDaWizard({
    cliente: CLIENTE,
    tipo: TIPO_CATALOGO,
    pz: 'PZ-0001',
    alias: '',
    elemento: '',
    colore: '',
    foto: null,
    dataConsegna: DATA_CONSEGNA,
    ...patch,
  })
}

/** Il corpo del POST /api/lavori, qualunque sia la sua posizione nella sequenza. */
function corpoPostLavori(m: ReturnType<typeof mockFetch>): Record<string, unknown> {
  const chiamata = m.mock.calls.find((c) => c[0] === '/api/lavori' && c[1]?.method === 'POST')
  if (!chiamata) throw new Error('POST /api/lavori non è mai stato chiamato')
  return JSON.parse(chiamata[1].body)
}

// ═══════════════════════════════════════════════════════════════════════════
// mappaElementi — la casella di testo libero diventa una lista di denti FDI.
// ═══════════════════════════════════════════════════════════════════════════
describe('mappaElementi — dalla casella «Elemento» ai numeri FDI', () => {
  it('forma puntata del segnaposto («es. 2.6»): il punto è cosmetico, 2.6 → 26', () => {
    expect(mappaElementi('2.6')).toEqual({ denti: [26], scartati: [] })
  })

  it('forma nuda «26» → 26: si accettano entrambe, nessuna è più giusta', () => {
    expect(mappaElementi('26')).toEqual({ denti: [26], scartati: [] })
  })

  it('più elementi separati da virgole e spazi, ordine di digitazione conservato', () => {
    expect(mappaElementi('2.6, 2.7  3.1')).toEqual({ denti: [26, 27, 31], scartati: [] })
  })

  it('stesso dente scritto due volte in due forme → UNA riga, e NON è un dato perso', () => {
    // Senza questa deduplica il POST risponderebbe 422 «dente ripetuto» e
    // l\'odontotecnico perderebbe il LAVORO per un dente digitato due volte.
    expect(mappaElementi('2.6, 26')).toEqual({ denti: [26], scartati: [] })
  })

  it('numero che sembra un dente ma non esiste (19) → scartato, non inventato', () => {
    expect(mappaElementi('1.9')).toEqual({ denti: [], scartati: ['1.9'] })
  })

  it('testo che non è un dente → scartato, e resta visibile nell\'esito', () => {
    expect(mappaElementi('corona')).toEqual({ denti: [], scartati: ['corona'] })
  })

  it('tre cifre («2.66») → scartato: due cifre esatte, mai un troncamento', () => {
    expect(mappaElementi('2.66')).toEqual({ denti: [], scartati: ['2.66'] })
  })

  it('misto buono/cattivo: si salva ciò che si capisce e si dichiara il resto', () => {
    expect(mappaElementi('2.6 corona 3.1')).toEqual({ denti: [26, 31], scartati: ['corona'] })
  })

  it('casella vuota o di soli spazi → nessun dente e nessuno scarto', () => {
    expect(mappaElementi('')).toEqual({ denti: [], scartati: [] })
    expect(mappaElementi('   ')).toEqual({ denti: [], scartati: [] })
  })

  it('decidui (quadranti 5-8) accettati come i permanenti', () => {
    expect(mappaElementi('5.1 8.5')).toEqual({ denti: [51, 85], scartati: [] })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// I denti viaggiano col lavoro, non dopo.
// ═══════════════════════════════════════════════════════════════════════════
describe('creaLavoroDaWizard — i denti nascono dentro il POST (R1)', () => {
  it('elemento compilato → `denti` nel corpo del POST, e NESSUNA PATCH', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    const esito = await crea({ elemento: '2.6, 2.7  3.1' })

    expect(esito.lavoro).toEqual({ id: 'lav-1', numero_lavoro: '2026/0042' })
    expect(corpoPostLavori(m).denti).toEqual([
      { fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' },
      { fdi: 27, ruolo: 'elemento', provenienza: 'prescritto' },
      { fdi: 31, ruolo: 'elemento', provenienza: 'prescritto' },
    ])
    // 🔴 Il cuore del task: la PATCH fail-soft non esiste più. Dal Task 10 il
    // server scarterebbe quelle chiavi senza dirlo — 200 su un dato buttato.
    expect(m.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(false)
    expect(m).toHaveBeenCalledTimes(3)
  })

  it('i sette nomi sentinella NON compaiono più in nessun corpo spedito', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ elemento: '2.6', colore: 'A2' })

    const SENTINELLE = [
      'denti_coinvolti', 'denti_mancanti', 'denti_impianti',
      'colore_dente', 'colore_collo', 'colore_corpo', 'colore_incisale',
    ]
    for (const chiamata of m.mock.calls) {
      const corpo = chiamata[1]?.body
      if (typeof corpo !== 'string') continue
      for (const nome of SENTINELLE) expect(JSON.parse(corpo)).not.toHaveProperty(nome)
    }
  })

  it('elemento vuoto → la chiave `denti` non parte affatto (mai `null`, che il POST rifiuta)', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ elemento: '' })

    expect(corpoPostLavori(m)).not.toHaveProperty('denti')
  })

  it('solo colore, nessun elemento → il lavoro nasce col colore di caso e zero denti', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: 'A2' })

    const corpo = corpoPostLavori(m)
    expect(corpo).not.toHaveProperty('denti')
    expect(corpo.colore_codice).toBe('A2')
  })

  it('POST /api/lavori fallito → lavoro null: niente dato a metà, nessun accessorio', async () => {
    const m = mockFetch()
    m.mockResolvedValueOnce(jsonOk(200, { pazienti: [] }))
    m.mockResolvedValueOnce(jsonOk(201, { paziente: { id: 'pz-1' } }))
    m.mockResolvedValueOnce(jsonFail(500))

    const esito = await crea({ elemento: '2.6', colore: 'A2', foto: new File(['x'], 'p.jpg') })

    expect(esito).toEqual({ lavoro: null, accessoriFalliti: [] })
    expect(m).toHaveBeenCalledTimes(3)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Il colore: si normalizza, non fa mai fallire la creazione.
// ═══════════════════════════════════════════════════════════════════════════
describe('creaLavoroDaWizard — il colore parte come CASO, in maiuscolo', () => {
  it('«a3» digitato di fretta parte come «A3» (il catalogo distingue le maiuscole)', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: 'a3' })

    expect(corpoPostLavori(m).colore_codice).toBe('A3')
  })

  it('spazi attorno al codice: si tolgono', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: '  bl  ' })

    expect(corpoPostLavori(m).colore_codice).toBe('BL')
  })

  it('«A3.5» resta «A3.5»: il punto qui è parte del codice, non un separatore', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: 'a3.5' })

    expect(corpoPostLavori(m).colore_codice).toBe('A3.5')
  })

  it('la scala NON si inventa dal client: la chiave non parte', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: 'A2' })

    expect(corpoPostLavori(m)).not.toHaveProperty('colore_scala')
  })

  it('colore vuoto → nessuna chiave di colore nel corpo', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    await crea({ colore: '   ' })

    expect(corpoPostLavori(m)).not.toHaveProperty('colore_codice')
  })

  it('un colore fuori catalogo NON è affare del client: parte comunque, e il lavoro nasce', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    const esito = await crea({ colore: 'zz9' })

    // La garanzia sta nel server (il vincolo `lavori_colore_caso_fk` morde lì):
    // il client normalizza e spedisce, non decide.
    expect(corpoPostLavori(m).colore_codice).toBe('ZZ9')
    expect(esito.lavoro).not.toBeNull()
    expect(esito.accessoriFalliti).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Ciò che si perde, si dice.
// ═══════════════════════════════════════════════════════════════════════════
describe('creaLavoroDaWizard — quello che non si è capito si dichiara', () => {
  it('un elemento illeggibile → il lavoro nasce lo stesso, ma l\'esito lo dice', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    const esito = await crea({ elemento: '2.6 corona' })

    expect(esito.lavoro).not.toBeNull()
    expect(corpoPostLavori(m).denti).toEqual([{ fdi: 26, ruolo: 'elemento', provenienza: 'prescritto' }])
    expect(esito.accessoriFalliti).toEqual(['elementi'])
  })

  it('tutto illeggibile → nessun dente, nessuna chiave `denti`, avviso acceso', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    const esito = await crea({ elemento: 'boh' })

    expect(esito.lavoro).not.toBeNull()
    expect(corpoPostLavori(m)).not.toHaveProperty('denti')
    expect(esito.accessoriFalliti).toEqual(['elementi'])
  })

  it('elementi tutti buoni → nessun avviso', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)

    const esito = await crea({ elemento: '2.6 2.7' })

    expect(esito.accessoriFalliti).toEqual([])
  })

  it('la foto resta accessoria e il suo fallimento si vede', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)
    m.mockResolvedValueOnce(jsonFail(500))

    const esito = await crea({ foto: new File(['x'], 'p.jpg') })

    expect(esito.lavoro).not.toBeNull()
    expect(esito.accessoriFalliti).toEqual(['foto'])
  })

  it('elementi illeggibili E foto fallita → entrambi, nell\'ordine in cui accadono', async () => {
    const m = mockFetch()
    percorsoPrimarioOk(m)
    m.mockResolvedValueOnce(jsonFail(500))

    const esito = await crea({ elemento: 'boh', foto: new File(['x'], 'p.jpg') })

    expect(esito.accessoriFalliti).toEqual(['elementi', 'foto'])
  })
})
