import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.35), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { CardLavoro } from '@/components/ds/CardLavoro'

const PROPS_BASE = {
  numero: '147',
  dentista: 'Studio Bianchi',
  paziente: 'PZ-1042',
  tipoLavoro: 'Corona ceramica',
  tempo: { testo: 'OGGI · 15:00', famiglia: 'red' as const },
}

describe('CardLavoro — nelle liste (§5.8)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza numero con prefisso "n." e riga LAVORO', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} />)
    expect(screen.getByText('n.147')).toBeInTheDocument()
    expect(screen.getByText('LAVORO')).toBeInTheDocument()
  })

  it('renderizza dentista e paziente in riga 2 così come ricevuti (nessuna trasformazione)', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} />)
    expect(screen.getByText(/Studio Bianchi/)).toBeInTheDocument()
    expect(screen.getByText(/PZ-1042/)).toBeInTheDocument()
  })

  it('renderizza tipo lavoro in riga 3', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} />)
    expect(screen.getByText('Corona ceramica')).toBeInTheDocument()
  })

  it('renderizza PillTempo con testo e famiglia passati', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} />)
    expect(screen.getByText('OGGI · 15:00')).toBeInTheDocument()
  })

  it('GDPR — paziente è un valore opaco (pseudonimo PZ-xxxx): il componente lo mostra invariato, non lo interpreta né lo trasforma', () => {
    render(<CardLavoro {...PROPS_BASE} paziente="PZ-9999" onApri={() => {}} />)
    expect(screen.getByText(/PZ-9999/)).toBeInTheDocument()
  })

  it('senza onConsegna → 3 righe, niente TastoConsegnaInline', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} />)
    expect(screen.queryByRole('button', { name: 'CONSEGNA' })).toBeNull()
  })

  it('con onConsegna → 4a riga, TastoConsegnaInline presente', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} onConsegna={() => {}} />)
    expect(screen.getByRole('button', { name: 'CONSEGNA' })).toBeInTheDocument()
  })

  it('niente progress bar né icone di stato aggiuntive: la card non monta nulla oltre alle 4 righe di legge', () => {
    const { container } = render(
      <CardLavoro {...PROPS_BASE} onApri={() => {}} onConsegna={() => {}} />
    )
    expect(container.querySelector('progress')).toBeNull()
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
  })

  it('la card intera è tappabile (ruolo button) ed è un elemento distinto dal tasto CONSEGNA', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} onConsegna={() => {}} />)
    const bottoni = screen.getAllByRole('button')
    expect(bottoni.length).toBe(2)
  })

  it('click sulla card → onApri + vibra("selection"), MAI suona (è navigazione, non un\'azione)', () => {
    const onApri = vi.fn()
    render(<CardLavoro {...PROPS_BASE} onApri={onApri} onConsegna={() => {}} />)
    const card = screen.getByRole('button', { name: /147/ })
    fireEvent.click(card)
    expect(onApri).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('Invio/Spazio sulla card tappabile → onApri (accessibilità da tastiera)', () => {
    const onApri = vi.fn()
    render(<CardLavoro {...PROPS_BASE} onApri={onApri} onConsegna={() => {}} />)
    const card = screen.getByRole('button', { name: /147/ })
    fireEvent.keyDown(card, { key: 'Enter' })
    expect(onApri).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(card, { key: ' ' })
    expect(onApri).toHaveBeenCalledTimes(2)
  })

  it('click su CONSEGNA → onConsegna + suona("tap") + vibra("medium"), MAI onApri (stopPropagation)', () => {
    const onApri = vi.fn()
    const onConsegna = vi.fn()
    render(<CardLavoro {...PROPS_BASE} onApri={onApri} onConsegna={onConsegna} />)
    const tastoConsegna = screen.getByRole('button', { name: 'CONSEGNA' })
    fireEvent.click(tastoConsegna)
    expect(onConsegna).toHaveBeenCalledTimes(1)
    expect(onApri).not.toHaveBeenCalled()
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('Invio sul tasto CONSEGNA focalizzato → onConsegna, MAI onApri (il keydown bubble-a ma la card lo ignora)', () => {
    const onApri = vi.fn()
    const onConsegna = vi.fn()
    render(<CardLavoro {...PROPS_BASE} onApri={onApri} onConsegna={onConsegna} />)
    const tastoConsegna = screen.getByRole('button', { name: 'CONSEGNA' })
    fireEvent.keyDown(tastoConsegna, { key: 'Enter' })
    expect(onApri).not.toHaveBeenCalled()
  })

  it('la card usa var(--card), mai var(--sfc) (carry-over review SP1)', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} />)
    const card = screen.getByRole('button', { name: /147/ })
    expect(card.style.background).toBe('var(--card)')
  })

  // Fix review finale Ondata 1 (item 1): il ring di selezione (§3.4, mockup
  // `home.html` riga 205/219) vive SUL nodo che possiede lo sfondo, non su un
  // wrapper esterno — un inset box-shadow su un antenato di un discendente con
  // sfondo opaco non è mai visibile. Ogni valore è single-value (mai una lista
  // con `none`, anti-pattern §TastoPrimario): selezionata → SOLO il ring,
  // altrimenti → SOLO l'ombra ambiente (dark-safe, `var(--sh-card)` risolve a
  // `none` ma resta da solo, mai in lista).
  it('senza selezionato (default false) → SOLO ombra ambiente, come prima del fix', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} />)
    const card = screen.getByRole('button', { name: /147/ })
    expect(card.style.boxShadow).toBe('var(--sh-card)')
  })

  it('con selezionato=true → SOLO il ring 2.5px --red, sul nodo con lo sfondo (mai un wrapper)', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} selezionato />)
    const card = screen.getByRole('button', { name: /147/ })
    expect(card.style.boxShadow).toBe('inset 0 0 0 2.5px var(--red)')
    expect(card.style.background).toBe('var(--card)')
  })

  it('con selezionato=false esplicito → identico al default (nessuna regressione sui chiamanti che non selezionano)', () => {
    render(<CardLavoro {...PROPS_BASE} onApri={() => {}} selezionato={false} />)
    const card = screen.getByRole('button', { name: /147/ })
    expect(card.style.boxShadow).toBe('var(--sh-card)')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<CardLavoro {...PROPS_BASE} onApri={() => {}} onConsegna={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il tasto CONSEGNA (separatamente focalizzabile) porta il proprio anello focus-visible di legge', () => {
    const { container } = render(<CardLavoro {...PROPS_BASE} onApri={() => {}} onConsegna={() => {}} />)
    const tastoConsegna = screen.getByRole('button', { name: 'CONSEGNA' })
    expect(tastoConsegna.className).toContain('ds-tasto-consegna-inline')
    const regole = Array.from(container.querySelectorAll('style')).map(s => s.textContent ?? '')
    const regolaConsegna = regole.find(r => r.includes('.ds-tasto-consegna-inline:focus-visible')) ?? ''
    expect(regolaConsegna).toContain('outline: 2px solid var(--blue)')
    expect(regolaConsegna).toContain('outline-offset: 2px')
  })

  it('tutti i testi statici (LAVORO, CONSEGNA) e i dati realistici passano trovaParoleVietate', () => {
    const { container } = render(
      <CardLavoro {...PROPS_BASE} onApri={() => {}} onConsegna={() => {}} />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })

  it('conferma e onConsegna sono mutuamente esclusive a livello di TIPO (riga 4 unica, §5.8/P4)', () => {
    // Il vincolo vive nel tipo (never incrociati): passarle entrambe non
    // compila — è `tsc --noEmit` a validare il @ts-expect-error qui sotto
    // (fallirebbe se l'espressione tornasse a compilare).
    // @ts-expect-error — onConsegna e conferma insieme sono vietate
    const invalida = <CardLavoro {...PROPS_BASE} onApri={() => {}} onConsegna={() => {}} conferma={{ onClick: () => {} }} />
    expect(invalida).toBeTruthy() // l'elemento esiste a runtime; il blocco è compile-time
  })

  it('con conferma → riga 4 alternativa: TastoSecondario «Conferma», click → onClick senza onApri (stopPropagation)', () => {
    const onApri = vi.fn()
    const onClick = vi.fn()
    render(<CardLavoro {...PROPS_BASE} onApri={onApri} conferma={{ onClick }} />)
    const tasto = screen.getByRole('button', { name: 'Conferma' })
    fireEvent.click(tasto)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onApri).not.toHaveBeenCalled()
  })

  it('riga 1 — la PillTempo non trabocca mai dalla card (QA visivo T15, 390px): riga a capo consentito, pill mai compressa, sempre a destra', () => {
    // Bug trovato in QA visiva: a 390px «APPENA ARRIVATO» usciva dal bordo
    // destro della card (~8px) perché numero e pill hanno entrambi larghezza
    // minima incomprimibile (testo nowrap) e la riga non poteva andare a capo.
    render(<CardLavoro {...PROPS_BASE} tempo={{ testo: 'APPENA ARRIVATO', famiglia: 'blue' }} onApri={() => {}} />)
    const pill = screen.getByText('APPENA ARRIVATO')
    // La pill sta in un involucro suo: mai schiacciata sotto il suo min-content
    // (flexShrink 0 → testo sempre intero) e ancorata a destra anche quando va
    // a capo (marginLeft auto, non justify-content del contenitore).
    const involucro = pill.parentElement as HTMLElement
    expect(involucro.style.flexShrink).toBe('0')
    expect(involucro.style.marginLeft).toBe('auto')
    // La riga 1 può andare a capo quando numero + pill non ci stanno.
    const riga1 = involucro.parentElement as HTMLElement
    expect(riga1.style.flexWrap).toBe('wrap')
    // Il numero non si comprime mai: prefisso + n. restano interi.
    expect(screen.getByText('n.147').parentElement).toHaveStyle({ flexShrink: '0' })
  })
})

describe('catalogo DS v3 — sezione «CardLavoro»', () => {
  it('mostra 3 CardLavoro realistiche: una con TastoConsegnaInline (rossa), una ambra, una blu', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('button', { name: 'CONSEGNA' })).toBeInTheDocument()
    const pillOggi = screen.getAllByText(/OGGI/).length
    expect(pillOggi).toBeGreaterThan(0)
    expect(screen.getAllByText(/GIOVEDÌ/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/APPENA ARRIVATO/).length).toBeGreaterThan(0)
  })

  it('tutti i testi statici del catalogo (inclusa la sezione CardLavoro) passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})
