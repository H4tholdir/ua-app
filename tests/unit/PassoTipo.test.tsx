import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PassoTipo } from '@/components/features/wizard/PassoTipo'
import { TIPI_LAVORO } from '@/lib/domain/tipi-lavoro'
import type { TipoScelto } from '@/components/features/wizard/WizardNuovoLavoro'

// Stessa forma di CANONICI_DAY1 (dati-wizard.ts): è il default reale per un
// laboratorio nuovo (0 lavori) — protesi_fissa/implantologia/riparazione/
// provvisorio. Mix di count>0 e count=0 per esercitare ENTRAMBI i rami di
// `sotto` (brief Step 1).
const TOP_TIPI = ['corona_zirconia', 'corona_impianto', 'riparazione', 'provvisorio_resina']
const FREQUENZE = { corona_zirconia: 9, corona_impianto: 0, riparazione: 4, provvisorio_resina: 0 }

// Mock minimo del Web Speech API — stesso approccio di WizardNuovoLavoro.test.tsx.
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

beforeEach(() => {
  istanzeCostruite.length = 0
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
})
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
})

function renderPasso(onScegli: (t: TipoScelto) => void = vi.fn()) {
  render(<PassoTipo topTipi={TOP_TIPI} frequenze={FREQUENZE} onScegli={onScegli} />)
}

describe('PassoTipo — Passo 2 del wizard (Task 10)', () => {
  it('renderizza domanda + hint verbatim (wizard.html:304-305)', () => {
    renderPasso()
    expect(screen.getByText('Che lavoro è?')).toBeInTheDocument()
    expect(screen.getByText('Tocca il tipo. Poi ci pensa UÀ a stimare i tempi.')).toBeInTheDocument()
  })

  it('mostra 4 TileScelta dai topTipi: nome (labelTipo) + sotto count>0 → "N · 30gg"', () => {
    renderPasso()
    const tileCorona = screen.getByRole('button', { name: /Corona zirconia/ })
    expect(within(tileCorona).getByText('9 · 30gg')).toBeInTheDocument()
    const tileRiparazione = screen.getByRole('button', { name: /Riparazione/ })
    expect(within(tileRiparazione).getByText('4 · 30gg')).toBeInTheDocument()
  })

  it('sotto count=0 → LABEL_MACRO del tipo (mai "0 · 30gg")', () => {
    renderPasso()
    const tileImpianto = screen.getByRole('button', { name: /Corona su impianto/ })
    expect(within(tileImpianto).getByText('Implantologia')).toBeInTheDocument()
    expect(within(tileImpianto).queryByText(/0 · 30gg/)).not.toBeInTheDocument()

    const tileProvvisorio = screen.getByRole('button', { name: /Provvisorio resina/ })
    expect(within(tileProvvisorio).getByText('Provvisorio')).toBeInTheDocument()
  })

  it('ogni tile porta un glifo line-SVG aria-hidden, MAI un emoji', () => {
    renderPasso()
    const tile = screen.getByRole('button', { name: /Corona zirconia/ })
    const svg = tile.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    // Nessun carattere emoji nel testo del tile (§4.4: MAI emoji per i glifi).
    expect(tile.textContent).not.toMatch(/\p{Extended_Pictographic}/u)
  })

  it('tap su un tile → onScegli({kind:"catalogo", tipoId})', async () => {
    const onScegli = vi.fn()
    renderPasso(onScegli)
    await userEvent.setup().click(screen.getByRole('button', { name: /Corona zirconia/ }))
    expect(onScegli).toHaveBeenCalledWith({ kind: 'catalogo', tipoId: 'corona_zirconia' })
  })

  it('TileNuovo "＋ Un altro tipo" apre il catalogo (dialog "Tutti i tipi di lavoro")', async () => {
    renderPasso()
    expect(screen.queryByRole('dialog', { name: 'Tutti i tipi di lavoro' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '＋ Un altro tipo' }))
    expect(screen.getByRole('dialog', { name: 'Tutti i tipi di lavoro' })).toBeInTheDocument()
  })

  it('il catalogo mostra la lista COMPLETA raggruppata per famiglia (header = LABEL_MACRO)', async () => {
    renderPasso()
    await userEvent.setup().click(screen.getByRole('button', { name: '＋ Un altro tipo' }))
    const dialog = screen.getByRole('dialog', { name: 'Tutti i tipi di lavoro' })
    expect(within(dialog).getByText('Protesi fissa')).toBeInTheDocument()
    expect(within(dialog).getByText('Protesi mobile')).toBeInTheDocument()
    expect(within(dialog).getByText('Ortodonzia')).toBeInTheDocument()
    // Voce granulare presente nel gruppo giusto (non solo nei topTipi di fuori).
    expect(within(dialog).getByText('Faccetta')).toBeInTheDocument()
    expect(within(dialog).getByText('Allineatori')).toBeInTheDocument()
  })

  it('catalogo: ricerca "cappetta" (alias) filtra a "Corona zirconia" soltanto', async () => {
    renderPasso()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '＋ Un altro tipo' }))
    const dialog = screen.getByRole('dialog', { name: 'Tutti i tipi di lavoro' })
    await user.click(within(dialog).getByRole('button', { name: /Cerca fra tutti i \d+ tipi di lavoro/ }))
    await user.type(within(dialog).getByRole('textbox'), 'cappetta')
    expect(within(dialog).getByText('Corona zirconia')).toBeInTheDocument()
    expect(within(dialog).queryByText('Ponte zirconia')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Faccetta')).not.toBeInTheDocument()
  })

  it('catalogo: "Non lo trovi? Descrivilo" con testo VUOTO → onScegli NON chiamato', async () => {
    const onScegli = vi.fn()
    renderPasso(onScegli)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '＋ Un altro tipo' }))
    const dialog = screen.getByRole('dialog', { name: 'Tutti i tipi di lavoro' })
    await user.click(within(dialog).getByRole('button', { name: /Non lo trovi\? Descrivilo/ }))
    const conferma = within(dialog).getByRole('button', { name: /usa questa descrizione/i })
    expect(conferma).toBeDisabled()
    await user.click(conferma)
    expect(onScegli).not.toHaveBeenCalled()
  })

  it('catalogo: "Non lo trovi? Descrivilo" con testo → onScegli({kind:"libero", testo})', async () => {
    const onScegli = vi.fn()
    renderPasso(onScegli)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '＋ Un altro tipo' }))
    const dialog = screen.getByRole('dialog', { name: 'Tutti i tipi di lavoro' })
    await user.click(within(dialog).getByRole('button', { name: /Non lo trovi\? Descrivilo/ }))
    await user.type(within(dialog).getByLabelText('Descrizione'), 'Restauro diretto composito')
    await user.click(within(dialog).getByRole('button', { name: /usa questa descrizione/i }))
    expect(onScegli).toHaveBeenCalledWith({ kind: 'libero', testo: 'Restauro diretto composito' })
  })

  it(`RigaCerca del passo mostra il totale (${TIPI_LAVORO.length} tipi di lavoro) e apre la ricerca`, async () => {
    renderPasso()
    expect(screen.getByText(new RegExp(`Cerca fra tutti i ${TIPI_LAVORO.length} tipi di lavoro`))).toBeInTheDocument()
  })

  it('RigaCerca del passo: stessa cercaTipiLavoro (alias "cappetta" → Corona zirconia, esclude gli altri topTipi)', async () => {
    renderPasso()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: new RegExp(`Cerca fra tutti i ${TIPI_LAVORO.length} tipi di lavoro`) }))
    await user.type(screen.getByRole('textbox'), 'cappetta')
    expect(screen.getByRole('button', { name: /Corona zirconia/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Riparazione/ })).not.toBeInTheDocument()
  })

  it('PillVoce presente e onTesto compila la ricerca del passo (mock Web Speech)', async () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
    renderPasso()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
    const istanza = ultimaIstanza()
    expect(istanza).not.toBeNull()
    act(() => {
      istanza!.onresult?.({ results: [[{ transcript: 'cappetta' }]] })
    })
    expect(screen.getByRole('textbox')).toHaveValue('cappetta')
    expect(screen.getByRole('button', { name: /Corona zirconia/ })).toBeInTheDocument()
  })
})
