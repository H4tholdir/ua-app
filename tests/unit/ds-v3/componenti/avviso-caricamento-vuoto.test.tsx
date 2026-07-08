import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

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

  it('errore: suona("errore") viene chiamato alla comparsa (unico suono di questo componente)', () => {
    render(
      <AvvisiProvider>
        <DemoAvviso />
      </AvvisiProvider>
    )
    fireEvent.click(screen.getByText('Errore'))
    expect(suonaMock).toHaveBeenCalledWith('errore')
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
    expect(screen.getByText(/Avviso · Skeleton · Vuoto/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostra un avviso' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mostra un errore' })).toBeInTheDocument()
    expect(screen.getByText('Nessun lavoro sul banco')).toBeInTheDocument()
    expect(screen.getByText(/Goditi il caffè/i)).toBeInTheDocument()
  })
})
