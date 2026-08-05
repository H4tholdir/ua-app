import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WizardNuovoLavoro } from '@/components/features/wizard/WizardNuovoLavoro'
import { CHIAVE_WIZARD, type StatoSalvato } from '@/lib/wizard/persistenza'
import type { DatiWizard } from '@/lib/wizard/dati-wizard'

// Stesso pattern di mock di next/navigation usato in PilaAperta.test.tsx (Task 8).
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }))

// Review finding G1 (fix-list FIX-G) — il wizard renderizza `TastoTondo` (`suona('tap')`)
// più `TileScelta`/`FrameFatto` nei propri passi (idem, `suona('tap')`/`suona('fatta')`)
// senza che nulla a monte chiamasse mai `initSuoni()`: primo tap muto, stesso bug chiuso
// su /dashboard con `HomeV3.tsx`.
const { initSuoniSpy } = vi.hoisted(() => ({ initSuoniSpy: vi.fn() }))
vi.mock('@/design-system/v3/sound', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/design-system/v3/sound')>()
  return { ...reale, initSuoni: initSuoniSpy }
})

// Mock minimo del Web Speech API (stesso approccio di PillVoce.test.tsx): cattura
// l'ultima istanza costruita così il test può pilotare `onresult` a mano.
type Evento = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
const istanzeCostruite: MockSpeechRecognition[] = []
class MockSpeechRecognition {
  lang = ''
  start = vi.fn()
  stop = vi.fn()
  onresult: ((evento: Evento) => void) | null = null
  onerror: (() => void) | null = null
  onend: (() => void) | null = null
  constructor() {
    istanzeCostruite.push(this)
  }
}
function ultimaIstanza(): MockSpeechRecognition | null {
  return istanzeCostruite[istanzeCostruite.length - 1] ?? null
}

const DENTISTI = [
  { id: '1', label: 'Dr. Esposito', count30: 12 },
  { id: '2', label: 'Dr.ssa Bianchi', count30: 8 },
  { id: '3', label: 'Dr. Russo', count30: 5 },
  { id: '4', label: 'Studio Verdi', count30: 3 },
  { id: '5', label: 'Dr. Conti', count30: 1 },
]

const DATI: DatiWizard = {
  dentisti: DENTISTI,
  frequenzeTipi: {},
  topTipi: [],
  prossimoPz: 'PZ-0001',
  giorniPerTipo: {},
}

const CONTESTO = { userId: 'u1', labId: 'lab1' }

beforeEach(() => {
  push.mockClear()
  initSuoniSpy.mockClear()
  istanzeCostruite.length = 0
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  window.localStorage.clear()
})
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  window.localStorage.clear()
})

describe('WizardNuovoLavoro — shell + Passo 1 dentisti (Task 8)', () => {
  it('renderizza il Passo 1: domanda, hint, ProgressDots "Passo 1 di 3"', () => {
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    expect(screen.getByText('Per quale dentista?')).toBeInTheDocument()
    expect(screen.getByText(/Tocca chi te l.ha portato/)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Passo 1 di 3' })).toBeInTheDocument()
  })

  it('mostra al massimo 4 TileScelta dentista (i primi) + TileNuovo + RigaCerca con il totale', () => {
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    expect(screen.getByText('Dr. Esposito')).toBeInTheDocument()
    expect(screen.getByText('Dr.ssa Bianchi')).toBeInTheDocument()
    expect(screen.getByText('Dr. Russo')).toBeInTheDocument()
    expect(screen.getByText('Studio Verdi')).toBeInTheDocument()
    expect(screen.queryByText('Dr. Conti')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '＋ Nuovo dentista' })).toBeInTheDocument()
    expect(screen.getByText(/Cerca fra tutti i 5 dentisti/)).toBeInTheDocument()
  })

  it('tap su un tile dentista → avanza al Passo 2 ("Che lavoro è?")', async () => {
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    expect(screen.getByText('Che lavoro è?')).toBeInTheDocument()
  })

  it('tap ‹ (Indietro) dal Passo 1 → router.push("/dashboard")', async () => {
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Indietro' }))
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('RigaCerca aperta: digitando "esp" la lista filtra (contains normalizzato)', async () => {
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Cerca fra tutti i 5 dentisti/ }))
    await user.type(screen.getByRole('textbox'), 'esp')
    expect(screen.getByRole('button', { name: /Dr\. Esposito/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dr\.ssa Bianchi/ })).not.toBeInTheDocument()
  })

  it('PillVoce presente e onTesto compila la ricerca (mock Web Speech)', async () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
    const istanza = ultimaIstanza()
    expect(istanza).not.toBeNull()
    act(() => {
      istanza!.onresult?.({ results: [[{ transcript: 'esposito' }]] })
    })
    expect(screen.getByRole('textbox')).toHaveValue('esposito')
    expect(screen.getByRole('button', { name: /Dr\. Esposito/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dr\.ssa Bianchi/ })).not.toBeInTheDocument()
  })

  it('PillVoce a ricerca GIÀ aperta con testo digitato: onTesto SOSTITUISCE la query e la lista si rifiltra', async () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    // Apre la ricerca e digita a mano: la lista filtra su Bianchi.
    await user.click(screen.getByRole('button', { name: /Cerca fra tutti i 5 dentisti/ }))
    await user.type(screen.getByRole('textbox'), 'bianchi')
    expect(screen.getByRole('button', { name: /Dr\.ssa Bianchi/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dr\. Esposito/ })).not.toBeInTheDocument()
    // Poi parla: il trascritto SOSTITUISCE il testo digitato (non lo accoda) e rifiltra.
    await user.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
    const istanza = ultimaIstanza()
    expect(istanza).not.toBeNull()
    act(() => {
      istanza!.onresult?.({ results: [[{ transcript: 'esposito' }]] })
    })
    expect(screen.getByRole('textbox')).toHaveValue('esposito')
    expect(screen.getByRole('button', { name: /Dr\. Esposito/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Dr\.ssa Bianchi/ })).not.toBeInTheDocument()
  })
})

describe('WizardNuovoLavoro — wiring PassoTipo (Task 10)', () => {
  const DATI_CON_TIPI: DatiWizard = {
    ...DATI,
    topTipi: ['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina'],
    frequenzeTipi: { corona_zirconia: 9, riparazione: 4 },
  }

  async function arrivaAlPasso2(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    expect(screen.getByText('Che lavoro è?')).toBeInTheDocument()
  }

  it('al Passo 2 mostra i tile dai topTipi (PassoTipo, non più il segnaposto)', async () => {
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await arrivaAlPasso2(user)
    expect(screen.getByRole('button', { name: /Corona zirconia/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '＋ Un altro tipo' })).toBeInTheDocument()
  })

  it('tap su un tile tipo → salva il tipo e avanza al Passo 3 ("Chi è il paziente?")', async () => {
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await arrivaAlPasso2(user)
    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument()
  })

  it('scelta "Descrivilo" dal catalogo → avanza al Passo 3', async () => {
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await arrivaAlPasso2(user)
    await user.click(screen.getByRole('button', { name: '＋ Un altro tipo' }))
    const dialog = screen.getByRole('dialog', { name: 'Tutti i tipi di lavoro' })
    await user.click(within(dialog).getByRole('button', { name: /Non lo trovi\? Descrivilo/ }))
    await user.type(within(dialog).getByLabelText('Descrizione'), 'Saldatura gancio')
    await user.click(within(dialog).getByRole('button', { name: /usa questa descrizione/i }))
    expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument()
  })
})

describe('WizardNuovoLavoro — wiring NuovoDentistaSheet (Task 9, A7)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('tap su «＋ Nuovo dentista» apre lo sheet (dialog "Nuovo dentista")', async () => {
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    expect(screen.queryByRole('dialog', { name: 'Nuovo dentista' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '＋ Nuovo dentista' }))
    expect(screen.getByRole('dialog', { name: 'Nuovo dentista' })).toBeInTheDocument()
  })

  it('creazione riuscita → sheet chiuso e wizard avanza al Passo 2 col dentista creato selezionato', async () => {
    ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ cliente: { id: 'cli-9', nome: 'Anna', cognome: 'Neri', studio_nome: null } }),
    })

    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '＋ Nuovo dentista' }))
    await user.type(screen.getByLabelText('Nome'), 'Anna')
    await user.type(screen.getByLabelText('Cognome'), 'Neri')
    await user.click(screen.getByRole('button', { name: /crea dentista/i }))

    // Il wizard seleziona il dentista appena creato e avanza al Passo 2
    // (direzione 'avanti' — contratto in WizardNuovoLavoro.tsx).
    await waitFor(() => expect(screen.getByText('Che lavoro è?')).toBeInTheDocument())
    // Lo sheet resta nel DOM per la durata dell'uscita animata (AnimatePresence,
    // §8.2.2): si attende lo smontaggio, non lo si pretende sincrono.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuovo dentista' })).not.toBeInTheDocument())
  })
})

// Task 10 (P37/D211, ondata B ②) — il mini-foglio «Chi ha prescritto?».
// Fixture SEPARATA da `DENTISTI`/`DATI` (usati da decine di altri test in
// questo file): niente `studioNome` sugli esistenti, per non introdurre una
// `GET /studio-members` in test che oggi non la stubbano (v. avviso R-E1 —
// la rete in più deve esistere SOLO dove il tile tappato è un'entità).
describe('WizardNuovoLavoro — mini-foglio «Chi ha prescritto?» (Task 10, P37/D211)', () => {
  // IMPORTANT 5 (fix-review) — questa fixture rispecchia la rotta VERA:
  // `GET /api/clienti/[id]/studio-members` ESCLUDE il cliente toccato
  // (`.neq('id', id)`, route.ts:50). Il tile "Studio Bianchi" del Passo 1
  // (id '2' sotto) È la riga clienti di Bianchi Marta (nome/cognome sotto):
  // la SUA risposta studio-members non può contenere se stessa. `MEDICI`
  // elenca solo i suoi COLLEGHI — Bianchi Marta arriva nel foglio ANTEPOSTA
  // dal client (CRITICAL 1), mai da questa lista. Prima del fix-review
  // questa fixture includeva erroneamente Bianchi Marta fra i "colleghi
  // trovati", un percorso che la rotta vera non può produrre — è il
  // meccanismo che ha lasciato passare il difetto CRITICAL 1 (il foglio non
  // poteva mai offrire il medico appena toccato).
  const MEDICI = [
    { id: 'm1', nome: 'Francesco', cognome: 'Colombo', studio_nome: 'Studio Bianchi' },
    { id: 'm3', nome: 'Anna', cognome: 'Ferri', studio_nome: 'Studio Bianchi' },
  ]

  const DENTISTI_STUDIO = [
    { id: '1', label: 'Dr. Esposito', count30: 12, studioNome: null, nome: 'Marco', cognome: 'Esposito' },
    { id: '2', label: 'Studio Bianchi', count30: 8, studioNome: 'Studio Bianchi', nome: 'Marta', cognome: 'Bianchi' },
    { id: '3', label: 'Dr. Russo', count30: 5, studioNome: null, nome: 'Luca', cognome: 'Russo' },
    { id: '4', label: 'Studio Solo', count30: 2, studioNome: 'Studio Solo', nome: 'Elena', cognome: 'Neri' },
  ]

  const DATI_STUDIO: DatiWizard = {
    ...DATI,
    dentisti: DENTISTI_STUDIO,
    topTipi: ['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina'],
    frequenzeTipi: { corona_zirconia: 9 },
    giorniPerTipo: { corona_zirconia: { giorni: 6, daStoria: true } },
  }

  /** Router URL→risposta: le nuove chiamate (studio-members, POST clienti
   *  del "È un altro") si distinguono dalla sequenza pazienti/lavori già
   *  nota (Task 12) per URL/metodo, non per ordine — più leggibile di una
   *  coda `mockResolvedValueOnce` quando i percorsi possono intrecciarsi. */
  function routerFetch(opts: { members?: unknown; nuovoCliente?: unknown } = {}) {
    const { members = [], nuovoCliente } = opts
    return vi.fn((url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET'
      if (url.includes('/studio-members')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => members })
      }
      if (url.includes('/api/clienti') && metodo === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => nuovoCliente ?? { cliente: { id: 'x', nome: 'X', cognome: 'Y', studio_nome: null } },
        })
      }
      if (url.includes('/api/pazienti') && metodo === 'GET') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ pazienti: [] }) })
      }
      if (url.includes('/api/pazienti') && metodo === 'POST') {
        return Promise.resolve({ ok: true, status: 201, json: async () => ({ paziente: { id: 'pz-1' } }) })
      }
      if (url.includes('/api/lavori') && metodo === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ lavoro: { id: 'lav-1', numero_lavoro: '2026/0001' } }),
        })
      }
      throw new Error(`fetch non gestito nel test: ${metodo} ${url}`)
    })
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function corpoPostLavori(m: ReturnType<typeof vi.fn>) {
    const chiamata = m.mock.calls.find(([url, init]) => url.includes('/api/lavori') && init?.method === 'POST')
    return JSON.parse((chiamata![1] as RequestInit).body as string)
  }

  it('dottore singolo: NESSUN foglio, NESSUNA GET studio-members, avanza subito (D196)', async () => {
    const m = routerFetch()
    vi.stubGlobal('fetch', m)
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    expect(screen.getByText('Che lavoro è?')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Chi ha prescritto?' })).not.toBeInTheDocument()
    expect(m).not.toHaveBeenCalled()
  })

  it('studio con più medici: il foglio sale, elenca i medici trovati', async () => {
    vi.stubGlobal('fetch', routerFetch({ members: MEDICI }))
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /^Studio Bianchi/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    expect(within(dialog).getByRole('button', { name: /Colombo Francesco/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Ferri Anna/ })).toBeInTheDocument()
    // Bianchi Marta è il cliente TOCCATO — non è nella risposta mock di
    // `studio-members` (v. commento sulla fixture MEDICI sopra), eppure
    // compare: è il client (CRITICAL 1) ad anteporla.
    expect(within(dialog).getByRole('button', { name: /Bianchi Marta/ })).toBeInTheDocument()
    // Il Passo 1 resta VISIBILE dietro il foglio (overlay, non un passo nuovo — vincolo di ondata).
    expect(screen.getByText('Per quale dentista?')).toBeInTheDocument()
  })

  // CRITICAL 1 + 1b (fix-review): il cliente toccato è la PRIMA riga (non una
  // qualunque), e il sottotitolo conta tutti e tre — prima del fix contava
  // solo i 2 "colleghi" restituiti da studio-members, sottostimando di uno.
  it('CRITICAL 1: il cliente toccato (Bianchi Marta) è la PRIMA riga del foglio, prima dei colleghi', async () => {
    vi.stubGlobal('fetch', routerFetch({ members: MEDICI }))
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /^Studio Bianchi/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    // `getAllByRole` ritorna in ordine DOM (ordine di apparizione nel
    // markup) — il `textContent` include anche le iniziali dell'Avatar
    // (`aria-hidden`, ma non tolte dal testo del bottone), quindi si
    // confronta con `toContain`, non un'uguaglianza esatta sul nome.
    const righe = within(dialog).getAllByRole('button', {
      name: /^(Bianchi Marta|Colombo Francesco|Ferri Anna)$/,
    })
    expect(righe).toHaveLength(3)
    expect(righe[0].textContent).toContain('Bianchi Marta')
    expect(righe[1].textContent).toContain('Colombo Francesco')
    expect(righe[2].textContent).toContain('Ferri Anna')
  })

  it('1b: il sottotitolo conta il TOTALE (toccato + colleghi), non solo i colleghi restituiti da studio-members', async () => {
    vi.stubGlobal('fetch', routerFetch({ members: MEDICI }))
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /^Studio Bianchi/ }))

    const dialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    // MEDICI (mock) ne ha 2 ("colleghi") + il toccato (Bianchi Marta) = 3 —
    // il conteggio SBAGLIATO pre-fix sarebbe stato "2 medici".
    expect(within(dialog).getByText(/Studio Bianchi risultano 3 medici/)).toBeInTheDocument()
  })

  it('studio "di uno solo" (studio_nome compilato, ZERO colleghi) → nessun foglio, si comporta come dottore singolo per il PRESCRITTORE', async () => {
    vi.stubGlobal('fetch', routerFetch({ members: [] }))
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /^Studio Solo/ }))

    await waitFor(() => expect(screen.getByText('Che lavoro è?')).toBeInTheDocument())
    expect(screen.queryByRole('dialog', { name: 'Chi ha prescritto?' })).not.toBeInTheDocument()
  })

  // IMPORTANT 2 (fix-review): l'istituzione è nota comunque — D206, "vera
  // anche senza una persona scelta". Prima del fix `cliente.studioNome`
  // veniva scartato prima di raggiungere questo ramo (il chiamante passava
  // solo `{id, label}` a `caricaStudioEApri`), e istituzione_sanitaria
  // restava sempre assente anche quando era un fatto già noto.
  it('IMPORTANT 2: studio "di uno solo" → istituzione_sanitaria parte comunque nel POST (D206), richiedente_nome resta assente', async () => {
    const m = routerFetch({ members: [] })
    vi.stubGlobal('fetch', m)
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Studio Solo/ }))
    await waitFor(() => expect(screen.getByText('Che lavoro è?')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())

    const corpo = await corpoPostLavori(m)
    expect(corpo).not.toHaveProperty('richiedente_nome')
    expect(corpo.istituzione_sanitaria).toBe('Studio Solo')
  })

  it('scelta di un medico → il POST /api/lavori porta richiedente_nome E istituzione_sanitaria, «Fatto!» mostra «Prescritto da»', async () => {
    const m = routerFetch({ members: MEDICI })
    vi.stubGlobal('fetch', m)
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Studio Bianchi/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    await user.click(within(dialog).getByRole('button', { name: /Bianchi Marta/ }))

    expect(screen.getByText('Che lavoro è?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())
    const corpo = await corpoPostLavori(m)
    expect(corpo.richiedente_nome).toBe('Bianchi Marta')
    expect(corpo.istituzione_sanitaria).toBe('Studio Bianchi')

    const cartaLavoro = within(screen.getByRole('region', { name: 'Il lavoro' }))
    expect(cartaLavoro.getByText('Prescritto da')).toBeInTheDocument()
    expect(cartaLavoro.getByText('Bianchi Marta')).toBeInTheDocument()
  })

  // Verifica advisor (pre-commit): `scelgoPrescrittore` chiude sia `setSheetPrescrittoreAperto(false)`
  // sia `setClientePendente(null)` nello STESSO handler — un `onChiudi` "in coda" (Esc/scrim/exit
  // animato dell'AnimatePresence) che catturasse una closure PRE-null di `clientePendente`
  // sovrascriverebbe il prescrittore appena scelto con `''`. `aperto` passa a `false` nello stesso
  // aggiornamento batched: l'effect Esc di Sheet.tsx dipende da `[aperto, ...]` e ritorna subito se
  // `!aperto`, quindi il listener è già rimosso — ma qui si prova il comportamento REALE, non la
  // lettura del codice.
  it('scelta di un medico, poi Esc: il prescrittore NON viene sovrascritto dalla chiusura in coda', async () => {
    const m = routerFetch({ members: MEDICI })
    vi.stubGlobal('fetch', m)
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Studio Bianchi/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    await user.click(within(dialog).getByRole('button', { name: /Bianchi Marta/ }))
    expect(screen.getByText('Che lavoro è?')).toBeInTheDocument()

    // Il foglio è chiuso (aperto=false) ma può restare nel DOM per l'uscita
    // animata (AnimatePresence, §8.2.2) — un Esc qui non deve avere alcun
    // effetto sul prescrittore già commesso.
    await user.keyboard('{Escape}')

    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())
    const corpo = await corpoPostLavori(m)
    expect(corpo.richiedente_nome).toBe('Bianchi Marta')
    expect(corpo.istituzione_sanitaria).toBe('Studio Bianchi')
  })

  // Verifica advisor (pre-commit): `key={chiavePrescrittore}` rimonta il foglio ad ogni apertura —
  // qui si esercita il SECONDO giro nella STESSA sessione montata (indietro, poi lo stesso tile di
  // nuovo), non uno smontaggio+render fresco come nel test di reset in ChiHaPrescrittoSheet.test.tsx.
  it('si può riaprire il foglio una seconda volta nella stessa sessione (indietro, poi lo stesso tile)', async () => {
    const m = routerFetch({ members: MEDICI })
    vi.stubGlobal('fetch', m)
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Studio Bianchi/ }))
    const primoDialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    await user.click(within(primoDialog).getByRole('button', { name: 'Chiudi' }))
    await waitFor(() => expect(screen.getByText('Che lavoro è?')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(screen.getByText('Per quale dentista?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Studio Bianchi/ }))
    const secondoDialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    expect(within(secondoDialog).getByRole('button', { name: /Colombo Francesco/ })).toBeInTheDocument()
    // Il cliente toccato (CRITICAL 1) è anteposto anche al SECONDO giro, non
    // solo al primo.
    expect(within(secondoDialog).getByRole('button', { name: /Bianchi Marta/ })).toBeInTheDocument()

    // Esc funziona ancora sul foglio rimontato (la registrazione overlay-stack
    // di Sheet.tsx non è rimasta "appesa" al giro precedente).
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.getByText('Che lavoro è?')).toBeInTheDocument())
  })

  // IMPORTANT 2 (fix-review): «Chiudi» senza scegliere lascia `richiedente_nome`
  // assente (nessuna persona indicata) MA `istituzione_sanitaria` parte
  // comunque — `mediciPendenti[0]` è SEMPRE il cliente toccato (CRITICAL 1),
  // la sua `studio_nome` è un fatto noto indipendentemente dalla scelta del
  // prescrittore (D206). Prima del fix ENTRAMBI i campi restavano assenti.
  it('«Chiudi» il foglio SENZA scegliere → avanza comunque (W22, MAI bloccante); richiedente assente MA istituzione nota parte nel POST', async () => {
    const m = routerFetch({ members: MEDICI })
    vi.stubGlobal('fetch', m)
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Studio Bianchi/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    await user.click(within(dialog).getByRole('button', { name: 'Chiudi' }))

    await waitFor(() => expect(screen.getByText('Che lavoro è?')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())
    const corpo = await corpoPostLavori(m)
    expect(corpo).not.toHaveProperty('richiedente_nome')
    expect(corpo.istituzione_sanitaria).toBe('Studio Bianchi')
    expect(screen.queryByText('Prescritto da')).not.toBeInTheDocument()
  })

  it('«È un altro»: crea un collega nello studio e lo usa come prescrittore', async () => {
    const m = routerFetch({
      members: MEDICI,
      nuovoCliente: { cliente: { id: 'nuovo-9', nome: 'Luca', cognome: 'Verdi', studio_nome: 'Studio Bianchi' } },
    })
    vi.stubGlobal('fetch', m)
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /^Studio Bianchi/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Chi ha prescritto?' })
    await user.click(within(dialog).getByRole('button', { name: /È un altro/ }))
    await user.type(within(dialog).getByLabelText('Nome'), 'Luca')
    await user.type(within(dialog).getByLabelText('Cognome'), 'Verdi')
    await user.click(within(dialog).getByRole('button', { name: /aggiungi allo studio/i }))

    await waitFor(() => expect(screen.getByText('Che lavoro è?')).toBeInTheDocument())
    expect(
      m.mock.calls.some(([url, init]) => url === '/api/clienti' && init?.method === 'POST')
    ).toBe(true)
    const corpoPost = JSON.parse(
      (m.mock.calls.find(([url, init]) => url === '/api/clienti' && init?.method === 'POST')![1] as RequestInit)
        .body as string
    )
    expect(corpoPost).toEqual({ nome: 'Luca', cognome: 'Verdi', studio_nome: 'Studio Bianchi' })

    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())
    const corpoLavoro = await corpoPostLavori(m)
    expect(corpoLavoro.richiedente_nome).toBe('Verdi Luca')
  })

  // Trappola nota (fatto 3 del censimento, stessa classe di `coloreOrigine`,
  // WizardNuovoLavoro.test.tsx:512): `salvaStato` (l'effect) e `riprendi`
  // ENUMERANO le chiavi a mano — un test a livello di `persistenza.ts` non lo
  // scoprirebbe (quelle funzioni sono un passthrough generico). Riprendi → un
  // vero avanzamento → localStorage copre ENTRAMBE le metà in un colpo solo.
  it('richiedenteNome/istituzioneSanitaria sopravvivono al giro Riprendi → un vero avanzamento → salvaStato', async () => {
    vi.stubGlobal('fetch', routerFetch())
    window.localStorage.setItem(
      CHIAVE_WIZARD,
      JSON.stringify({
        v: 1,
        salvatoA: Date.now() - 1000,
        userId: CONTESTO.userId,
        labId: CONTESTO.labId,
        passo: 3,
        cliente: { id: '2', label: 'Studio Bianchi' },
        tipo: { kind: 'catalogo', tipoId: 'corona_zirconia' },
        pz: 'PZ-9999',
        alias: '',
        elemento: '',
        colore: '',
        richiedenteNome: 'Bianchi Marta',
        istituzioneSanitaria: 'Studio Bianchi',
      } satisfies StatoSalvato)
    )
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Riprendi' }))
    await waitFor(() => expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Indietro' }))

    await waitFor(() => {
      const salvato = JSON.parse(window.localStorage.getItem(CHIAVE_WIZARD) ?? 'null') as StatoSalvato | null
      expect(salvato).not.toBeNull()
      expect(salvato!.richiedenteNome).toBe('Bianchi Marta')
      expect(salvato!.istituzioneSanitaria).toBe('Studio Bianchi')
    })
  })

  // Un salvataggio SCRITTO PRIMA di questo task non ha le due chiavi — additivo,
  // `v` resta 1 (v. persistenza.ts). `riprendi()` deve coalescerle a '' senza
  // esplodere: senza `?? ''` il primo `.trim()` a valle (crea-lavoro.ts) sarebbe
  // un TypeError su `undefined`.
  it('Riprendi da un salvataggio SENZA richiedenteNome/istituzioneSanitaria (formato pre-Task-10) non esplode', async () => {
    vi.stubGlobal('fetch', routerFetch())
    window.localStorage.setItem(
      CHIAVE_WIZARD,
      JSON.stringify({
        v: 1,
        salvatoA: Date.now() - 1000,
        userId: CONTESTO.userId,
        labId: CONTESTO.labId,
        passo: 3,
        cliente: { id: '1', label: 'Dr. Esposito' },
        tipo: { kind: 'catalogo', tipoId: 'corona_zirconia' },
        pz: 'PZ-9998',
        alias: '',
        elemento: '',
        colore: '',
        // richiedenteNome/istituzioneSanitaria ASSENTI apposta.
      })
    )
    render(<WizardNuovoLavoro dati={DATI_STUDIO} contesto={CONTESTO} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Riprendi' }))
    await waitFor(() => expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument())
  })
})

describe('WizardNuovoLavoro — seam completo Passo 3 «Continua» → creazione → Frame Fatto (Task 12)', () => {
  const DATI_TASK12: DatiWizard = {
    ...DATI,
    topTipi: ['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina'],
    frequenzeTipi: { corona_zirconia: 9 },
    giorniPerTipo: { corona_zirconia: { giorni: 6, daStoria: true } },
  }

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Dentista → Tipo → Continua (Passo 3, precompilato) → crea il lavoro e mostra "Fatto!"', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ pazienti: [] }) })
    m.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ paziente: { id: 'pz-1' } }) })
    m.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ lavoro: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'ricevuto' } }),
    })

    render(<WizardNuovoLavoro dati={DATI_TASK12} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    expect(screen.getByText('Che lavoro è?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument()
    // Passo 3 SEMPRE attraversato, precompilato (dati.prossimoPz) — nessuna
    // scorciatoia lo salta: il «Continua» qui sotto è lo stesso bottone del
    // percorso "non aggiungo nulla d'altro".
    expect(screen.getByDisplayValue('PZ-0001')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())
    expect(m).toHaveBeenCalledTimes(3)
    // Nessuna testata/ProgressDots nel Frame Fatto (mockup: "non ha testata-dots").
    expect(screen.queryByRole('img', { name: /Passo \d di 3/ })).not.toBeInTheDocument()
  })

  // ═══════════════════════════════════════════════════════════════════════
  // T3 (ondata B ③) — IL PASSAGGIO DI CONSEGNE Passo 3 → «Fatto!»
  //
  // 🔑 Questa prova attraversa un CONFINE che `tsc` non sorveglia:
  //    `coloreOrigine` è una prop FACOLTATIVA di `FrameFatto` (deve esserlo:
  //    assente ≡ 'prescrizione', D223). Se un giorno qualcuno togliesse
  //    `coloreOrigine={fatto.coloreOrigine}` dal punto di chiamata, la
  //    compilazione resterebbe muta e la carta «La prescrizione» affermerebbe
  //    «✓ dalla prescrizione» su un colore che il dentista non ha mai scritto
  //    — una provenienza FALSA sulla superficie su cui si appoggia la
  //    Dichiarazione di Conformità. Non è una riga che sparisce in silenzio: è
  //    una riga che mente. Perciò il confine si attraversa davvero, invece di
  //    fidarsi delle prove che montano `FrameFatto` da solo.
  // ═══════════════════════════════════════════════════════════════════════
  it('lo sgancio del colore arriva fino al «Fatto!»: la riga sta in «Il lavoro» e NON porta la pastiglia', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ pazienti: [] }) })
    m.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ paziente: { id: 'pz-1' } }) })
    m.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ lavoro: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'ricevuto' } }),
    })

    render(<WizardNuovoLavoro dati={DATI_TASK12} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))

    // Apre la riga «Colore», scrive, e SGANCIA (D210: «lo scegliamo noi»).
    await user.click(screen.getByRole('button', { name: /^Colore/ }))
    await user.type(screen.getByLabelText('Colore — come scritto sulla prescrizione'), 'A3')
    await user.click(screen.getByRole('button', { name: 'Non è sulla prescrizione: lo scegliamo noi' }))

    await user.click(screen.getByRole('button', { name: 'Continua' }))
    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())

    // Sganciato ⇒ carta «Il lavoro», senza pastiglia di provenienza…
    const lavoro = within(screen.getByRole('region', { name: 'Il lavoro' }))
    expect(lavoro.getByText('Colore')).toBeInTheDocument()
    expect(lavoro.getByText('A3')).toBeInTheDocument()
    // …e MAI l'affermazione «viene dal foglio del dentista».
    expect(screen.queryByText('✓ dalla prescrizione')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'La prescrizione' })).queryByText('Colore')).not.toBeInTheDocument()

    // E la trascrizione non è nemmeno partita verso il server (crea-lavoro.ts:343).
    const corpoLavoro = JSON.parse(m.mock.calls[2][1].body as string)
    expect(corpoLavoro.prescrizione).toBeUndefined()
  })

  // ───────────────────────────────────────────────────────────────────────
  // Z1 — il testo ratificato da Francesco (**D37**, 30/07/2026).
  //
  // Prima: qualunque fallimento diceva «Non sono riuscita a creare il lavoro.
  // Riprova.» — e «Riprova» era un anello chiuso, perché `pz` non si ricalcola
  // (`:258`, viene da `dati.prossimoPz`, fissato al render della pagina):
  // ripremere «Continua» rifà lo stesso errore all'infinito.
  //
  // 🔑 Il testo si asserisce PER INTERO, mai a frammenti: è ratificato alla
  // lettera.
  //
  // 🛑 PERCHÉ IL CODICE NON COMPARE NELLA FRASE — è una correzione a D36, e
  // l'ha imposta una MISURA, non un'opinione (FASE 9, 30/07). La stesura di
  // D36 nominava il codice tentato e finiva con «nel campo "Codice paziente"
  // qui sopra»: **102-108 caratteri, TRE righe**, mentre `Avviso.tsx:194` ne
  // mostra DUE (`-webkit-line-clamp: 2` + `overflow: hidden`). Spariva
  // l'ultima riga, cioè **l'istruzione**. E spariva a **tutte** le larghezze,
  // perché il contenitore satura a 480px (`Avviso.tsx:290`).
  // ⚠️ Una frase che contiene il codice ha lunghezza **variabile**: reggeva con
  // `PZ-0918` (102) e cedeva con `PAZ/2026/0918` (108), che è il formato degli
  // 911 pazienti in banca dati. Questa, a 60 caratteri fissi, **non può
  // cedere**. Misure e catture: `docs/design/screenshots/2026-07-30-consegna-zero/`.
  // 🔑 È la STESSA frase che rende `PazienteEditSheet` e che restituiscono le
  // due rotte: una sola stringa, un solo testo da riconoscere al banco.
  // ⚠️ La casella viene comunque riscritta con 'PZ-0918' invece del
  // precompilato 'PZ-0001': serve a provare che dopo il rifiuto si RESTA al
  // Passo 3 col valore tentato ancora lì, pronto da correggere.
  // ───────────────────────────────────────────────────────────────────────
  const TESTO_D37 = 'Questo codice è già di un altro paziente. Scrivine un altro.'

  async function vaiAlPassoTreConCodice(user: ReturnType<typeof userEvent.setup>, codice: string) {
    await user.click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    const casella = screen.getByDisplayValue('PZ-0001')
    await user.clear(casella)
    await user.type(casella, codice)
    await user.click(screen.getByRole('button', { name: 'Continua' }))
  }

  it('Z1: POST pazienti risponde 409 «codice già in uso» → il testo ratificato (D37), che sta in due righe', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ pazienti: [] }) })
    m.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Questo codice è già di un altro paziente. Scrivine un altro.',
        motivo: 'codice_gia_in_uso',
      }),
    })

    render(<WizardNuovoLavoro dati={DATI_TASK12} contesto={CONTESTO} />)
    await vaiAlPassoTreConCodice(userEvent.setup(), 'PZ-0918')

    expect(await screen.findByText(TESTO_D37)).toBeInTheDocument()
    // Il vecchio testo non compare più su questo ramo…
    expect(screen.queryByText('Non sono riuscita a creare il lavoro. Riprova.')).not.toBeInTheDocument()
    // …e la frase NON nomina il codice tentato: è ciò che la rende di lunghezza
    // fissa, quindi incapace di sforare le due righe che `Avviso.tsx:194`
    // concede. Un'asserzione negativa esplicita, perché la tentazione di
    // «personalizzare» il messaggio rimettendoci dentro `stato.pz` è
    // esattamente il modo in cui questo difetto tornerebbe, e tornerebbe muto:
    // il taglio non solleva nessun errore, si limita a nascondere il testo.
    expect(screen.queryByText(/PZ-0918 è già di un altro paziente/)).not.toBeInTheDocument()
    // Si resta al Passo 3, con la casella pronta da correggere: è il punto di
    // tutta la consegna — il messaggio dice cosa fare, e la cosa da fare è lì.
    expect(screen.getByDisplayValue('PZ-0918')).toBeInTheDocument()
    // Nessun lavoro creato: la sequenza si è fermata al paziente.
    expect(m).toHaveBeenCalledTimes(2)
  })

  it('🛑 NEGATIVA Z1: un guasto qualunque (500) continua a dire il testo di sempre', async () => {
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ pazienti: [] }) })
    m.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Non è stato possibile creare il paziente' }),
    })

    render(<WizardNuovoLavoro dati={DATI_TASK12} contesto={CONTESTO} />)
    await vaiAlPassoTreConCodice(userEvent.setup(), 'PZ-0918')

    expect(
      await screen.findByText('Non sono riuscita a creare il lavoro. Riprova.')
    ).toBeInTheDocument()
    expect(screen.queryByText(TESTO_D37)).not.toBeInTheDocument()
  })
})

describe('WizardNuovoLavoro — persistenza abbandono 24h + sheet «Riprendo da dove eri?» (Task 13, spec §9)', () => {
  const DATI_CON_TIPI: DatiWizard = {
    ...DATI,
    topTipi: ['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina'],
    frequenzeTipi: { corona_zirconia: 9 },
  }

  function seedStatoSalvato(overrides: Partial<StatoSalvato> = {}) {
    const base: StatoSalvato = {
      v: 1,
      salvatoA: Date.now() - 1000, // 1s fa, ben entro le 24h
      userId: CONTESTO.userId,
      labId: CONTESTO.labId,
      passo: 3,
      cliente: { id: '1', label: 'Dr. Esposito' },
      tipo: { kind: 'catalogo', tipoId: 'corona_zirconia' },
      pz: 'PZ-9999',
      alias: '',
      elemento: '',
      colore: '',
      ...overrides,
    }
    window.localStorage.setItem(CHIAVE_WIZARD, JSON.stringify(base))
  }

  it('mount con stato salvato al Passo 1 → sheet aperto, "avevi appena iniziato"', () => {
    seedStatoSalvato({ passo: 1, cliente: null, tipo: null, pz: '' })
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const dialog = screen.getByRole('dialog', { name: 'Riprendo da dove eri?' })
    expect(dialog).toHaveTextContent(/avevi appena iniziato/i)
  })

  it('mount con stato salvato al Passo 2 → sheet aperto, "ti mancava il tipo di lavoro" col dentista', () => {
    seedStatoSalvato({ passo: 2, cliente: { id: '1', label: 'Dr. Esposito' }, tipo: null })
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const dialog = screen.getByRole('dialog', { name: 'Riprendo da dove eri?' })
    expect(dialog).toHaveTextContent(/Dr\. Esposito.*ti mancava il tipo di lavoro/)
  })

  it('mount con stato salvato al Passo 3 → sheet aperto, "ti mancava il paziente" con tipo E dentista', () => {
    seedStatoSalvato({
      passo: 3,
      cliente: { id: '1', label: 'Dr. Esposito' },
      tipo: { kind: 'catalogo', tipoId: 'corona_zirconia' },
    })
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const dialog = screen.getByRole('dialog', { name: 'Riprendo da dove eri?' })
    expect(dialog).toHaveTextContent(/Corona zirconia.*per il.*Dr\. Esposito.*ti mancava il paziente/)
  })

  it('mount SENZA stato salvato → nessun sheet «Riprendo da dove eri?»', () => {
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    expect(screen.queryByRole('dialog', { name: 'Riprendo da dove eri?' })).not.toBeInTheDocument()
  })

  it('mount con stato scaduto (>24h) → nessun sheet, chiave rimossa', () => {
    seedStatoSalvato({ salvatoA: Date.now() - 25 * 60 * 60 * 1000 })
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    expect(screen.queryByRole('dialog', { name: 'Riprendo da dove eri?' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).toBeNull()
  })

  it('mount con stato di un ALTRO userId (dispositivo condiviso) → nessun sheet', () => {
    seedStatoSalvato({ userId: 'altro-utente' })
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    expect(screen.queryByRole('dialog', { name: 'Riprendo da dove eri?' })).not.toBeInTheDocument()
  })

  it('"Riprendi" ripristina lo stato al passo salvato (Passo 3, pz precompilato) e chiude lo sheet', async () => {
    seedStatoSalvato({
      passo: 3,
      cliente: { id: '1', label: 'Dr. Esposito' },
      tipo: { kind: 'catalogo', tipoId: 'corona_zirconia' },
      pz: 'PZ-9999',
    })
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Riprendi' }))

    expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument()
    expect(screen.getByDisplayValue('PZ-9999')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Riprendo da dove eri?' })).not.toBeInTheDocument()
    )
  })

  // Task 1 — guardia contro la trappola nota (fatto 3 del censimento):
  // `salvaStato` (l'effect qui sopra) e `riprendi` ENUMERANO le chiavi a
  // mano, e `coloreOrigine` è un campo in più da dimenticare in uno dei due
  // punti — un test a livello di `persistenza.ts` NON lo scoprirebbe (quelle
  // funzioni sono un passthrough generico, l'omissione avviene qui). Il giro
  // Riprendi → un vero avanzamento (Indietro, che già esiste, nessuna UI
  // nuova) → localStorage copre ENTRAMBE le metà della trappola in un colpo
  // solo: se `riprendi` dimenticasse la chiave, `stato.coloreOrigine` sarebbe
  // `undefined` da subito; se `salvaStato` la dimenticasse, la riscrittura
  // dopo «Indietro» la butterebbe comunque fuori.
  it("coloreOrigine sopravvive al giro Riprendi → un vero avanzamento → salvaStato (trappola nota, fatto 3)", async () => {
    seedStatoSalvato({
      passo: 3,
      cliente: { id: '1', label: 'Dr. Esposito' },
      tipo: { kind: 'catalogo', tipoId: 'corona_zirconia' },
      pz: 'PZ-9999',
      coloreOrigine: 'lab',
    })
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Riprendi' }))
    await waitFor(() => expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument())

    // «Indietro» è un vero avanzamento/cambiamento (imposta interazioneAvvenutaRef
    // e cambia `stato.passo`): fa scattare una riscrittura reale di salvaStato.
    await user.click(screen.getByRole('button', { name: 'Indietro' }))

    await waitFor(() => {
      const salvato = JSON.parse(window.localStorage.getItem(CHIAVE_WIZARD) ?? 'null') as StatoSalvato | null
      expect(salvato).not.toBeNull()
      expect(salvato!.passo).toBe(2)
      expect(salvato!.coloreOrigine).toBe('lab')
    })
  })

  it('chiusura accidentale (Esc) NON è distruttiva: conserva localStorage, wizard a Passo 1, e rimontando lo sheet ricompare', async () => {
    seedStatoSalvato()
    const { unmount } = render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()

    expect(screen.getByRole('dialog', { name: 'Riprendo da dove eri?' })).toBeInTheDocument()
    // Esc → onChiudi dello Sheet (via di fuga L6) — NON deve azzerare il salvataggio.
    await user.keyboard('{Escape}')

    // Overlay chiuso, wizard al Passo 1 pulito.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Riprendo da dove eri?' })).not.toBeInTheDocument()
    )
    expect(screen.getByText('Per quale dentista?')).toBeInTheDocument()
    // Lo stato salvato è CONSERVATO (chiusura non distruttiva).
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).not.toBeNull()

    // Rimontando (es. l'odontotecnico riapre "Nuovo lavoro"), lo sheet ricompare.
    unmount()
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    expect(screen.getByRole('dialog', { name: 'Riprendo da dove eri?' })).toBeInTheDocument()
  })

  it('dopo "Ricomincia da capo" un avanzamento reale rifà scattare salvaStato (ref riazzerato)', async () => {
    seedStatoSalvato()
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Ricomincia da capo' }))
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).toBeNull()

    // Un vero avanzamento dopo il reset deve tornare a persistere (il ref
    // interazione, riazzerato da "Ricomincia", si riaccende su sceltaDentista).
    await user.click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    await waitFor(() => {
      const salvato = JSON.parse(window.localStorage.getItem(CHIAVE_WIZARD) ?? 'null') as StatoSalvato | null
      expect(salvato).not.toBeNull()
      expect(salvato!.passo).toBe(2)
      expect(salvato!.cliente).toEqual({ id: '1', label: 'Dr. Esposito' })
    })
  })

  it('"Ricomincia da capo" azzera lo stato persistito e riparte da un Passo 1 pulito', async () => {
    seedStatoSalvato()
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Ricomincia da capo' }))

    expect(screen.getByText('Per quale dentista?')).toBeInTheDocument()
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).toBeNull()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Riprendo da dove eri?' })).not.toBeInTheDocument()
    )
  })

  it('ogni avanzamento aggiorna lo stato persistito in localStorage (spy su setItem)', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    render(<WizardNuovoLavoro dati={DATI_CON_TIPI} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    await waitFor(() => {
      const scritture = setItemSpy.mock.calls.filter(([chiave]) => chiave === CHIAVE_WIZARD)
      expect(scritture.length).toBeGreaterThan(0)
    })
    const dopoDentista = JSON.parse(window.localStorage.getItem(CHIAVE_WIZARD) ?? 'null') as StatoSalvato
    expect(dopoDentista.passo).toBe(2)
    expect(dopoDentista.cliente).toEqual({ id: '1', label: 'Dr. Esposito' })

    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    await waitFor(() => {
      const dopoTipo = JSON.parse(window.localStorage.getItem(CHIAVE_WIZARD) ?? 'null') as StatoSalvato
      expect(dopoTipo.passo).toBe(3)
      expect(dopoTipo.tipo).toEqual({ kind: 'catalogo', tipoId: 'corona_zirconia' })
    })

    setItemSpy.mockRestore()
  })

  it('creazione completata (Fatto!) azzera lo stato persistito', async () => {
    const DATI_TASK13: DatiWizard = {
      ...DATI_CON_TIPI,
      giorniPerTipo: { corona_zirconia: { giorni: 6, daStoria: true } },
    }
    vi.stubGlobal('fetch', vi.fn())
    const m = fetch as unknown as ReturnType<typeof vi.fn>
    m.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ pazienti: [] }) })
    m.mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ paziente: { id: 'pz-1' } }) })
    m.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ lavoro: { id: 'lav-1', numero_lavoro: '2026/0001', stato: 'ricevuto' } }),
    })

    render(<WizardNuovoLavoro dati={DATI_TASK13} contesto={CONTESTO} />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: /Dr\. Esposito/ }))
    await user.click(screen.getByRole('button', { name: /Corona zirconia/ }))
    // Il "Continua" ha appena scritto in localStorage (avanzamento al Passo 3) —
    // la creazione riuscita deve azzerarlo, non lasciare residui del lavoro appena creato.
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'Continua' }))

    await waitFor(() => expect(screen.getByText('Fatto!')).toBeInTheDocument())
    expect(window.localStorage.getItem(CHIAVE_WIZARD)).toBeNull()

    vi.unstubAllGlobals()
  })
})

describe('WizardNuovoLavoro — motore audio al mount (G1, review FIX-G)', () => {
  it('chiama initSuoni() al mount — root client di /lavori/nuovo', () => {
    render(<WizardNuovoLavoro dati={DATI} contesto={CONTESTO} />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })
})
