import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WizardNuovoLavoro } from '@/components/features/wizard/WizardNuovoLavoro'
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
})
afterEach(() => {
  delete (window as unknown as Record<string, unknown>).SpeechRecognition
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition
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
})
