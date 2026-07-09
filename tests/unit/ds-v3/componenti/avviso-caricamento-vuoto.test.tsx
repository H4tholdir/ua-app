import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Mock di matchMedia per attivare useReducedMotion — stesso precedente di
// sheet-dialog.test.tsx (fix di review T10). Restituisce la funzione di ripristino.
function attivaReducedMotion(): () => void {
  const originalMatchMedia = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: true,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
  return () => {
    window.matchMedia = originalMatchMedia
  }
}

// Flush del requestAnimationFrame di AvvisoRidotto (entrata: false → true).
async function flushFrame(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  })
}

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { AvvisiProvider, useAvvisi } from '@/components/ds/Avviso'
import { Skeleton } from '@/components/ds/Caricamento'
import { Vuoto } from '@/components/ds/Vuoto'

const TESTO_NORMALE = 'Ho aggiornato lo stato di n.147.'
const TESTO_ERRORE = 'Non sono riuscita a salvare. Controlla la connessione e riprova.'

function DemoAvviso() {
  const { avvisa, errore } = useAvvisi()
  return (
    <div>
      <button onClick={() => avvisa(TESTO_NORMALE)}>Avvisa</button>
      <button
        onClick={() =>
          errore(TESTO_ERRORE, {
            azione: { etichetta: 'Riprova', onClick: () => {} },
          })
        }
      >
        Errore
      </button>
    </div>
  )
}

function UsaAvvisiSenzaProvider() {
  useAvvisi()
  return null
}

describe('Avviso — toast (§5.18)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('avvisa: il testo compare nel DOM, nessun suono per l\'avviso normale', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    expect(screen.getByText(TESTO_NORMALE)).toBeInTheDocument()
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('avviso normale: aria-live="polite"', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    const toast = screen.getByText(TESTO_NORMALE).closest('.ds-avviso-card') as HTMLElement
    expect(toast).not.toBeNull()
    expect(toast).toHaveAttribute('aria-live', 'polite')
  })

  it('avviso normale: sparisce da solo dopo 4s (fake timers)', async () => {
    vi.useFakeTimers()
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    expect(screen.getByText(TESTO_NORMALE)).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    vi.useRealTimers()
    await waitFor(() => expect(screen.queryByText(TESTO_NORMALE)).toBeNull())
  })

  it('hover sospende il timer: non sparisce oltre i 4s mentre il mouse è sopra, riprende dopo', async () => {
    vi.useFakeTimers()
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    const toast = screen.getByText(TESTO_NORMALE).closest('.ds-avviso-card') as HTMLElement
    fireEvent.mouseEnter(toast)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByText(TESTO_NORMALE)).toBeInTheDocument()

    fireEvent.mouseLeave(toast)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    vi.useRealTimers()
    await waitFor(() => expect(screen.queryByText(TESTO_NORMALE)).toBeNull())
  })

  it('focus sospende il timer allo stesso modo dell\'hover', async () => {
    vi.useFakeTimers()
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    const toast = screen.getByText(TESTO_NORMALE).closest('.ds-avviso-card') as HTMLElement
    fireEvent.focus(toast)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByText(TESTO_NORMALE)).toBeInTheDocument()

    fireEvent.blur(toast)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    vi.useRealTimers()
    await waitFor(() => expect(screen.queryByText(TESTO_NORMALE)).toBeNull())
  })

  it('errore: NON scompare da solo anche molto oltre i 4s (fake timers)', () => {
    vi.useFakeTimers()
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Errore'))
    act(() => {
      vi.advanceTimersByTime(20000)
    })
    expect(screen.getByText(TESTO_ERRORE)).toBeInTheDocument()
  })

  it('errore: suona("errore") UNA volta sola alla comparsa — nessun refire ai re-render successivi', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Errore'))
    expect(suonaMock).toHaveBeenCalledWith('errore')
    expect(suonaMock).toHaveBeenCalledTimes(1)
    // Re-render del contenitore con l'errore ancora montato: aggiungere un
    // avviso normale (silenzioso) cambia lo stato del provider e rimonta la
    // lista — il suono errore NON deve rispararsi.
    fireEvent.click(screen.getByText('Avvisa'))
    expect(screen.getByText(TESTO_ERRORE)).toBeInTheDocument()
    expect(screen.getByText(TESTO_NORMALE)).toBeInTheDocument()
    expect(suonaMock).toHaveBeenCalledTimes(1)
  })

  it('errore: aria-live="assertive"', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Errore'))
    const toast = screen.getByText(TESTO_ERRORE).closest('.ds-avviso-card') as HTMLElement
    expect(toast).toHaveAttribute('aria-live', 'assertive')
  })

  it('errore: ha un bottone di chiusura esplicito che lo rimuove al click', async () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Errore'))
    expect(screen.getByText(TESTO_ERRORE)).toBeInTheDocument()
    fireEvent.click(screen.getByText('Chiudi'))
    await waitFor(() => expect(screen.queryByText(TESTO_ERRORE)).toBeNull())
  })

  it('azione inline (LinkQuieto) opzionale: renderizza l\'etichetta e chiama onClick', () => {
    const onClick = vi.fn()
    function DemoConAzione() {
      const { avvisa } = useAvvisi()
      return (
        <button
          onClick={() =>
            avvisa(TESTO_NORMALE, { azione: { etichetta: 'Annulla', onClick } })
          }
        >
          Avvisa
        </button>
      )
    }
    render(
      <AvvisiProvider>
        <DemoConAzione />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    fireEvent.click(screen.getByText('Annulla'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('errore con azione inline: sia l\'azione custom sia "Chiudi" sono presenti', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Errore'))
    expect(screen.getByText('Riprova')).toBeInTheDocument()
    expect(screen.getByText('Chiudi')).toBeInTheDocument()
  })

  it('useAvvisi fuori da AvvisiProvider lancia un errore esplicito', () => {
    const originalError = console.error
    console.error = () => {}
    expect(() => render(<UsaAvvisiSenzaProvider />)).toThrow()
    console.error = originalError
  })

  it('i testi (demo + etichette di legge) passano trovaParoleVietate', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    fireEvent.click(screen.getByText('Errore'))
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
  })

  it('QA live Francesco round 2 — il contenitore del portale (data-ds="v3") è esplicitamente trasparente: solo le card dipingono', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    const card = screen.getByText(TESTO_NORMALE).closest('.ds-avviso-card') as HTMLElement
    const contenitore = card.parentElement as HTMLElement
    expect(contenitore).toHaveAttribute('data-ds', 'v3')
    expect(contenitore.style.background).toBe('transparent')
    // Pass-through del tap tranne sulle card (già coperto dallo stile inline,
    // qui verifichiamo esplicitamente che il contratto non regredisca).
    expect(contenitore.style.pointerEvents).toBe('none')
    expect(card.style.pointerEvents).toBe('auto')
  })
})

describe('Avviso — reduced motion (§8.4, ramo AvvisoRidotto)', () => {
  let ripristinaMatchMedia: () => void

  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    ripristinaMatchMedia = attivaReducedMotion()
  })
  afterEach(() => {
    ripristinaMatchMedia()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('il toast passa dal ramo ridotto: dissolvenza CSS pura (transition opacity), raggiunge opacity 1', async () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    const toast = screen.getByText(TESTO_NORMALE).closest('.ds-avviso-card') as HTMLElement
    expect(toast).not.toBeNull()
    // Discriminatore del ramo ridotto (stessa tecnica del fix T10): la
    // transizione è la dissolvenza CSS inline (cssEase.generico), che il ramo
    // a molla (motion.div) non imposta mai come style inline.
    expect(toast.style.transition).toContain('opacity')
    await flushFrame()
    expect(toast.style.opacity).toBe('1')
    expect(toast).toHaveAttribute('aria-live', 'polite')
  })

  it('ramo ridotto: auto-dismiss dopo 4s e sospensione su hover funzionano anche qui (fake timers)', async () => {
    vi.useFakeTimers()
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Avvisa'))
    const toast = screen.getByText(TESTO_NORMALE).closest('.ds-avviso-card') as HTMLElement
    expect(toast.style.transition).toContain('opacity') // siamo davvero sul ramo ridotto

    // Hover sospende: ben oltre i 4s il toast è ancora lì
    fireEvent.mouseEnter(toast)
    act(() => {
      vi.advanceTimersByTime(6000)
    })
    expect(screen.getByText(TESTO_NORMALE)).toBeInTheDocument()

    // Il timer riprende dal residuo: altri 4s e sparisce — rimozione
    // ISTANTANEA nel ramo ridotto (niente AnimatePresence), nessun waitFor
    fireEvent.mouseLeave(toast)
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.queryByText(TESTO_NORMALE)).toBeNull()
  })

  it('ramo ridotto: l\'errore persiste oltre i 4s, suona una volta, e il bottone Chiudi lo rimuove', () => {
    vi.useFakeTimers()
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Errore'))
    const toast = screen.getByText(TESTO_ERRORE).closest('.ds-avviso-card') as HTMLElement
    expect(toast.style.transition).toContain('opacity') // siamo davvero sul ramo ridotto
    expect(toast).toHaveAttribute('aria-live', 'assertive')
    expect(suonaMock).toHaveBeenCalledWith('errore')
    expect(suonaMock).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(20000)
    })
    expect(screen.getByText(TESTO_ERRORE)).toBeInTheDocument()

    fireEvent.click(screen.getByText('Chiudi'))
    expect(screen.queryByText(TESTO_ERRORE)).toBeNull()
  })
})

describe('Skeleton — niente spinner (§5.25)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('non renderizza mai role="progressbar"', () => {
    render(<Skeleton righe={3} />)
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('con `altezze` esplicite renderizza un blocco per altezza (geometria del contenuto atteso)', () => {
    const { container } = render(<Skeleton altezze={[24, 20, 17]} />)
    const blocchi = container.querySelectorAll('.ds-skeleton-blocco')
    expect(blocchi.length).toBe(3)
    expect((blocchi[0] as HTMLElement).style.height).toBe('24px')
    expect((blocchi[1] as HTMLElement).style.height).toBe('20px')
    expect((blocchi[2] as HTMLElement).style.height).toBe('17px')
    blocchi.forEach((blocco) => {
      expect((blocco as HTMLElement).style.background).toBe('var(--bg-deep)')
    })
  })

  it('senza `altezze`, `righe` genera N blocchi di fallback', () => {
    const { container } = render(<Skeleton righe={4} />)
    expect(container.querySelectorAll('.ds-skeleton-blocco').length).toBe(4)
  })

  it('prima dei 3s non mostra «Un attimo…» (fake timers)', () => {
    vi.useFakeTimers()
    render(<Skeleton righe={2} />)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.queryByText('Un attimo…')).toBeNull()
  })

  it('oltre i 3s mostra «Un attimo…» (fake timers)', () => {
    vi.useFakeTimers()
    render(<Skeleton righe={2} />)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.getByText('Un attimo…')).toBeInTheDocument()
  })

  it('il testo passa trovaParoleVietate (mai «Caricamento in corso»)', () => {
    vi.useFakeTimers()
    render(<Skeleton righe={2} />)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
  })
})

describe('Vuoto — mai una pagina bianca (§5.26)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza glifo, titolo e guida', () => {
    render(
      <Vuoto glifo="☕" titolo="Nessun lavoro sul banco" guida="Goditi il caffè: qui non c'è niente da fare." />
    )
    expect(screen.getByText('☕')).toBeInTheDocument()
    expect(screen.getByText('Nessun lavoro sul banco')).toBeInTheDocument()
    expect(screen.getByText(/Goditi il caffè/)).toBeInTheDocument()
  })

  it('senza azione non renderizza alcun bottone', () => {
    render(<Vuoto glifo="☕" titolo="Nessun lavoro sul banco" guida="Goditi il caffè." />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('con azione renderizza il TastoSecondario e chiama onClick al click', () => {
    const onClick = vi.fn()
    render(
      <Vuoto
        glifo="👤"
        titolo="Nessun dentista"
        guida="Il primo dentista si aggiunge dal tasto +."
        azione={{ etichetta: 'Aggiungi dentista', onClick }}
      />
    )
    const bottone = screen.getByRole('button', { name: 'Aggiungi dentista' })
    fireEvent.click(bottone)
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('light')
  })

  it('i testi passano trovaParoleVietate', () => {
    const { container } = render(
      <Vuoto
        glifo="☕"
        titolo="Nessun lavoro sul banco"
        guida="Goditi il caffè: qui non c'è niente da fare."
      />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('dizionario sui testi del catalogo — sezione «Avviso · Skeleton · Vuoto»', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione «Avviso · Skeleton · Vuoto» con i bottoni demo e il Vuoto del caffè', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: /Avviso · Skeleton · Vuoto/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostra un avviso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostra un errore' })).toBeInTheDocument()
    expect(screen.getByText('Nessun lavoro sul banco')).toBeInTheDocument()
    expect(screen.getByText(/Goditi il caffè/i)).toBeInTheDocument()
  })
})
