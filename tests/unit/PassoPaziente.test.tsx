import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PassoPaziente } from '@/components/features/wizard/PassoPaziente'
import type { StatoWizard } from '@/components/features/wizard/WizardNuovoLavoro'

// Mock minimo del Web Speech API — stesso approccio di PassoTipo.test.tsx /
// WizardNuovoLavoro.test.tsx.
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

function props(overrides: Partial<Parameters<typeof PassoPaziente>[0]> = {}) {
  return {
    pz: 'PZ-0436',
    alias: '',
    elemento: '',
    colore: '',
    foto: null,
    onCambia: vi.fn(),
    onContinua: vi.fn(),
    inCreazione: false,
    ...overrides,
  }
}

describe('PassoPaziente — Passo 3 del wizard (Task 11)', () => {
  it('renderizza domanda + hint verbatim (wizard.html:356-357)', () => {
    render(<PassoPaziente {...props()} />)
    expect(screen.getByText('Chi è il paziente?')).toBeInTheDocument()
    expect(screen.getByText('Il codice è già pronto. Cambialo solo se serve.')).toBeInTheDocument()
  })

  it('CampoTesto "Codice paziente" precompilato con pz + nota GDPR verbatim', () => {
    render(<PassoPaziente {...props({ pz: 'PZ-0436' })} />)
    expect(screen.getByLabelText('Codice paziente')).toHaveValue('PZ-0436')
    expect(
      screen.getByText('UÀ propone il prossimo numero. Nessun nome, solo il codice (GDPR).')
    ).toBeInTheDocument()
  })

  it('digitare nel codice paziente chiama onCambia({ pz })', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ pz: '', onCambia })} />)
    await userEvent.setup().type(screen.getByLabelText('Codice paziente'), 'X')
    expect(onCambia).toHaveBeenCalledWith({ pz: 'X' })
  })

  it('blocco "Se vuoi, aggiungi" mostra le 3 righe opzionali con esempio e Salta', () => {
    render(<PassoPaziente {...props()} />)
    expect(screen.getByText('Se vuoi, aggiungi')).toBeInTheDocument()
    expect(screen.getByText('Elemento')).toBeInTheDocument()
    expect(screen.getByText('es. 2.6')).toBeInTheDocument()
    expect(screen.getByText('Colore')).toBeInTheDocument()
    expect(screen.getByText('es. A2')).toBeInTheDocument()
    expect(screen.getByText('Nome o alias')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Salta' })).toHaveLength(3)
  })

  it('tap sulla riga "Elemento" → si apre un CampoTesto inline con autoFocus', async () => {
    render(<PassoPaziente {...props()} />)
    await userEvent.setup().click(screen.getByText('Elemento'))
    const campo = screen.getByLabelText('Elemento')
    expect(campo).toBeInTheDocument()
    expect(campo).toHaveFocus()
  })

  it('riga aperta: digitare chiama onCambia({ elemento }) col valore digitato', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ onCambia })} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Elemento'))
    await user.type(screen.getByLabelText('Elemento'), '2')
    expect(onCambia).toHaveBeenCalledWith({ elemento: '2' })
  })

  it('riga aperta poi "Salta" → richiude la riga vuota e chiama onCambia({ elemento: "" })', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ onCambia })} />)
    const user = userEvent.setup()
    await user.click(screen.getByText('Elemento'))
    expect(screen.getByLabelText('Elemento')).toBeInTheDocument()
    const salta = screen.getAllByRole('button', { name: 'Salta' })[0]
    await user.click(salta)
    expect(onCambia).toHaveBeenCalledWith({ elemento: '' })
    // la riga richiusa torna a mostrare il nome/esempio, non più il CampoTesto.
    expect(screen.queryByLabelText('Elemento')).not.toBeInTheDocument()
    expect(screen.getByText('Elemento')).toBeInTheDocument()
  })

  it('riga già valorizzata (es. tornando indietro) è aperta di default', () => {
    render(<PassoPaziente {...props({ colore: 'A2' })} />)
    expect(screen.getByLabelText('Colore')).toHaveValue('A2')
  })

  it('riga foto: input file nascosto ma label-associato, accept image/*, capture environment', () => {
    render(<PassoPaziente {...props()} />)
    const input = screen.getByLabelText(/Aggiungi la foto dell.impronta/) as HTMLInputElement
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toHaveAttribute('accept', 'image/*')
    expect(input).toHaveAttribute('capture', 'environment')
  })

  it('selezione di una foto → mostra il nome del file e chiama onCambia({ foto })', async () => {
    // Componente controllato: `foto` arriva da chi lo monta. Il test simula il
    // giro di boa reale (onCambia → il chiamante aggiorna la prop) con un
    // piccolo harness stateful, invece di pretendere che il componente mostri
    // da solo un valore che non gli è stato ridato indietro.
    function Harness() {
      const [foto, setFoto] = useState<File | null>(null)
      return <PassoPaziente {...props({ foto, onCambia: (patch) => 'foto' in patch && setFoto(patch.foto ?? null) })} />
    }
    render(<Harness />)
    const input = screen.getByLabelText(/Aggiungi la foto dell.impronta/)
    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    await userEvent.setup().upload(input, file)
    expect(screen.getByText('impronta.jpg')).toBeInTheDocument()
  })

  it('selezione dello STESSO file una seconda volta → onCambia chiamata di nuovo (value resettato)', async () => {
    // Il browser non ripete l'evento `change` se il value dell'input non
    // cambia: senza il reset di `e.target.value` dopo la lettura, riselezio-
    // nare la stessa foto (es. per errore, poi di nuovo la stessa) non
    // scatterebbe nulla. Harness stateful (come sopra) + spy che conta le
    // chiamate reali a onCambia per il patch `foto`.
    const onCambiaSpy = vi.fn()
    function Harness() {
      const [foto, setFoto] = useState<File | null>(null)
      return (
        <PassoPaziente
          {...props({
            foto,
            onCambia: (patch) => {
              onCambiaSpy(patch)
              if ('foto' in patch) setFoto(patch.foto ?? null)
            },
          })}
        />
      )
    }
    render(<Harness />)
    const input = screen.getByLabelText(/Aggiungi la foto dell.impronta/)
    const file = new File(['x'], 'impronta.jpg', { type: 'image/jpeg' })
    const user = userEvent.setup()
    await user.upload(input, file)
    expect(screen.getByText('impronta.jpg')).toBeInTheDocument()
    expect(onCambiaSpy).toHaveBeenCalledTimes(1)
    // Riseleziona lo STESSO file: senza il reset del value questo secondo
    // upload dello stesso File non genererebbe un nuovo evento `change`.
    await user.upload(input, file)
    expect(onCambiaSpy).toHaveBeenCalledTimes(2)
    expect(onCambiaSpy).toHaveBeenNthCalledWith(2, { foto: file })
  })

  it('riga "Nome o alias" non mostra un esempio (nessun copy inventato/non sourced)', () => {
    render(<PassoPaziente {...props()} />)
    expect(screen.getByText('Nome o alias')).toBeInTheDocument()
    expect(screen.queryByText('es. Mario R.')).not.toBeInTheDocument()
  })

  it('"Continua" è un TastoSecondario (non disabled quando inCreazione=false) e chiama onContinua', async () => {
    const onContinua = vi.fn()
    render(<PassoPaziente {...props({ onContinua, inCreazione: false })} />)
    const tasto = screen.getByRole('button', { name: 'Continua' })
    expect(tasto).not.toBeDisabled()
    await userEvent.setup().click(tasto)
    expect(onContinua).toHaveBeenCalled()
  })

  it('"Continua" con inCreazione=true è disabled', () => {
    render(<PassoPaziente {...props({ inCreazione: true })} />)
    expect(screen.getByRole('button', { name: 'Continua' })).toBeDisabled()
  })

  it('PillVoce presente e di default compila il campo "Codice paziente"', async () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ pz: '', onCambia })} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
    const istanza = ultimaIstanza()
    expect(istanza).not.toBeNull()
    act(() => {
      istanza!.onresult?.({ results: [[{ transcript: 'PZ-0500' }]] })
    })
    expect(onCambia).toHaveBeenCalledWith({ pz: 'PZ-0500' })
  })

  it('PillVoce compila il campo attivo diverso da quello di default dopo un focus esplicito', async () => {
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ onCambia })} />)
    const user = userEvent.setup()
    // Apre la riga Colore e ci fa focus (tap apre + porta il focus per l'autoFocus).
    await user.click(screen.getByText('Colore'))
    expect(screen.getByLabelText('Colore')).toHaveFocus()

    await user.click(screen.getByRole('button', { name: /dimmelo a voce/i }))
    const istanza = ultimaIstanza()
    act(() => {
      istanza!.onresult?.({ results: [[{ transcript: 'A2' }]] })
    })
    expect(onCambia).toHaveBeenCalledWith({ colore: 'A2' })
    expect(onCambia).not.toHaveBeenCalledWith({ pz: 'A2' })
  })
})

// Type-check di contratto (compilazione, non a runtime): assicura che
// StatoWizard e le props di PassoPaziente restino allineate al piano.
type _Contratto = {
  pz: StatoWizard['pz']
  alias: StatoWizard['alias']
  elemento: StatoWizard['elemento']
  colore: StatoWizard['colore']
  foto: StatoWizard['foto']
  onCambia: (patch: Partial<StatoWizard>) => void
  onContinua: () => void
  inCreazione: boolean
}
void (0 as unknown as _Contratto)
