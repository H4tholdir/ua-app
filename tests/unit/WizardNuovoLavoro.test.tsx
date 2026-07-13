import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WizardNuovoLavoro } from '@/components/features/wizard/WizardNuovoLavoro'
import { CHIAVE_WIZARD, type StatoSalvato } from '@/lib/wizard/persistenza'
import type { DatiWizard } from '@/lib/wizard/dati-wizard'

// Stesso pattern di mock di next/navigation usato in PilaAperta.test.tsx (Task 8).
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }))

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
