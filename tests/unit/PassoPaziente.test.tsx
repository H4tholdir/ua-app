import { useState } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PassoPaziente } from '@/components/features/wizard/PassoPaziente'
import type { StatoWizard } from '@/components/features/wizard/WizardNuovoLavoro'

// Mock minimo del Web Speech API — stesso approccio di PassoTipo.test.tsx /
// WizardNuovoLavoro.test.tsx. PillVoce non è più montata in questo passo
// (Task 2, D13): resta solo per la prova FORTE di assenza qui sotto (§5.15
// abrogata) — non serve più pilotare `onresult` a mano, quindi né
// `istanzeCostruite` né un lettore "ultima istanza" sono utili in questo file.
class MockSpeechRecognition {
  lang = ''
  start = vi.fn()
  stop = vi.fn()
  onresult: ((evento: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null
  onerror: (() => void) | null = null
  onend: (() => void) | null = null
}

beforeEach(() => {
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
    // variante B (D223): il sottotitolo chiuso porta framing + esempio
    // insieme, non più un "es. A2" isolato come le altre righe.
    expect(screen.getByText('come scritto sulla prescrizione · es. A2')).toBeInTheDocument()
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
    // D223: la riga aperta porta l'etichetta col framing intero, non più il
    // solo "Colore" — v. describe dedicato più sotto per gli altri stati.
    expect(screen.getByLabelText('Colore — come scritto sulla prescrizione')).toHaveValue('A2')
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

  // PillVoce RIMOSSA da questo passo (Task 2, D13 — §5.15 abrogata): i due
  // test che qui verificavano "PillVoce presente e di default compila…" /
  // "…compila il campo attivo diverso…" sono spariti con lei, non solo il
  // loro assert positivo — un test che verificasse ancora un mount rimosso
  // sarebbe un test falso. La prova di RIMOZIONE vive nel describe D223 qui
  // sotto ("PillVoce assente dal Passo 3").
})

describe('PassoPaziente — riga «Colore» variante B, framing D223 + sgancio (Task 2)', () => {
  it('chiusa, coloreOrigine ASSENTE (default trascrizione): nome «Colore» + sottotitolo con framing prescrizione', () => {
    render(<PassoPaziente {...props()} />)
    expect(screen.getByText('Colore')).toBeInTheDocument()
    expect(screen.getByText('come scritto sulla prescrizione · es. A2')).toBeInTheDocument()
  })

  it('chiusa, coloreOrigine="prescrizione" esplicito: stesso sottotitolo del default (D223: assente = trascrizione)', () => {
    render(<PassoPaziente {...props({ coloreOrigine: 'prescrizione' })} />)
    expect(screen.getByText('come scritto sulla prescrizione · es. A2')).toBeInTheDocument()
  })

  it('chiusa, coloreOrigine="lab": sottotitolo mostra la scelta di laboratorio, non più la prescrizione', () => {
    render(<PassoPaziente {...props({ coloreOrigine: 'lab' })} />)
    expect(screen.getByText('Colore')).toBeInTheDocument()
    expect(screen.getByText('lo scegliamo noi')).toBeInTheDocument()
    expect(screen.queryByText('come scritto sulla prescrizione · es. A2')).not.toBeInTheDocument()
  })

  it('aperta (valore presente), coloreOrigine assente: etichetta + aiuto con «trascrizione» in evidenza + sgancio', () => {
    render(<PassoPaziente {...props({ colore: 'A2' })} />)
    expect(screen.getByLabelText('Colore — come scritto sulla prescrizione')).toHaveValue('A2')
    expect(screen.getByText('trascrizione').tagName).toBe('B')
    expect(screen.getByText(/Quello che scrivi qui vale come/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Non è sulla prescrizione: lo scegliamo noi' })
    ).toBeInTheDocument()
  })

  it('sgancio: click sul LinkQuieto chiama onCambia({ coloreOrigine: "lab" })', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ colore: 'A2', onCambia })} />)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Non è sulla prescrizione: lo scegliamo noi' }))
    expect(onCambia).toHaveBeenCalledWith({ coloreOrigine: 'lab' })
  })

  it('aperta, coloreOrigine="lab": etichetta «lo scegliamo noi» + aiuto laboratorio con «fuori» in evidenza + ritorno', () => {
    render(<PassoPaziente {...props({ colore: 'A2', coloreOrigine: 'lab' })} />)
    expect(screen.getByLabelText('Colore — lo scegliamo noi')).toHaveValue('A2')
    expect(screen.getByText('fuori').tagName).toBe('B')
    expect(
      screen.getByRole('button', { name: 'In realtà è sulla prescrizione: torno a trascrivere' })
    ).toBeInTheDocument()
  })

  it('ritorno: click sul LinkQuieto chiama onCambia({ coloreOrigine: "prescrizione" })', async () => {
    const onCambia = vi.fn()
    render(<PassoPaziente {...props({ colore: 'A2', coloreOrigine: 'lab', onCambia })} />)
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'In realtà è sulla prescrizione: torno a trascrivere' }))
    expect(onCambia).toHaveBeenCalledWith({ coloreOrigine: 'prescrizione' })
  })

  it('giro di boa reale: chiusa → apri → sgancio → la riga resta APERTA col framing di laboratorio (componente controllato, non solo lo spy su onCambia)', async () => {
    // I due test "sgancio"/"ritorno" sopra provano solo la CHIAMATA a
    // onCambia — non che il round-trip funzioni davvero: se il patch si
    // perdesse per strada, o se `aperto` si richiudesse quando `origine`
    // cambia (bug plausibile: sono due stati diversi, uno locale uno prop),
    // quei due test resterebbero verdi lo stesso. Harness stateful (stesso
    // pattern delle prove sulla foto sopra) che SIMULA il giro di boa vero:
    // onCambia aggiorna la prop, PassoPaziente la rilegge, si verifica che la
    // riga sia ancora aperta col framing giusto — non solo che l'evento sia
    // partito.
    function Harness() {
      const [colore, setColore] = useState('')
      const [coloreOrigine, setColoreOrigine] = useState<StatoWizard['coloreOrigine']>('prescrizione')
      return (
        <PassoPaziente
          {...props({
            colore,
            coloreOrigine,
            onCambia: (patch) => {
              if ('colore' in patch) setColore(patch.colore ?? '')
              if ('coloreOrigine' in patch && patch.coloreOrigine) setColoreOrigine(patch.coloreOrigine)
            },
          })}
        />
      )
    }
    render(<Harness />)
    const user = userEvent.setup()
    // Chiusa → tap apre la riga (framing prescrizione, la riga era vuota).
    await user.click(screen.getByText('Colore'))
    await user.type(screen.getByLabelText('Colore — come scritto sulla prescrizione'), 'A2')
    // Sgancio: la riga NON si richiude — resta aperta, framing capovolto.
    await user.click(screen.getByRole('button', { name: 'Non è sulla prescrizione: lo scegliamo noi' }))
    expect(screen.getByLabelText('Colore — lo scegliamo noi')).toHaveValue('A2')
    expect(
      screen.getByRole('button', { name: 'In realtà è sulla prescrizione: torno a trascrivere' })
    ).toBeInTheDocument()
  })

  it('PillVoce assente dal Passo 3 (§5.15 abrogata, D13): nessun bottone «Dimmelo a voce» ANCHE con la Web Speech API disponibile', () => {
    // Prova forte, non quella debole "il browser di jsdom non ha l'API": si
    // inietta il mock (stesso di sopra) PRIMA del render, così se il mount di
    // PillVoce fosse ancora lì comparirebbe comunque il bottone — l'assenza
    // qui prova la rimozione del componente, non un caso limite del jsdom.
    ;(window as unknown as Record<string, unknown>).webkitSpeechRecognition = MockSpeechRecognition
    render(<PassoPaziente {...props()} />)
    expect(screen.queryByRole('button', { name: /dimmelo a voce/i })).not.toBeInTheDocument()
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
