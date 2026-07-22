import { useState } from 'react'
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.37), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Mock di matchMedia per attivare useReducedMotion — stesso precedente di
// righe.test.tsx (CheckTondo §8.4). Restituisce la funzione di ripristino.
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

// Flush del requestAnimationFrame di SheetRidotto (entrata: false → true).
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

import { Sheet, deveChiudere } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { RigaDato } from '@/components/ds/CardInfo'

describe('Sheet — bottom sheet (§5.16)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  it('aperto=false → nulla nel DOM', () => {
    render(
      <Sheet aperto={false} onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Contenuto')).toBeNull()
    expect(screen.queryByText('Chiudi')).toBeNull()
  })

  it('aperto=true → dialog nel DOM, con titolo e children', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli lavoro">
        <p>Contenuto dello sheet</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Dettagli lavoro')).toBeInTheDocument()
    expect(within(dialog).getByText('Contenuto dello sheet')).toBeInTheDocument()
  })

  it('titolo è opzionale: senza titolo lo sheet resta valido', () => {
    render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Solo contenuto</p>
      </Sheet>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Solo contenuto')).toBeInTheDocument()
  })

  it('grabber 36×4 presente', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const grabber = document.querySelector('.ds-sheet-grabber') as HTMLElement
    expect(grabber).not.toBeNull()
    expect(grabber.style.width).toBe('36px')
    expect(grabber.style.height).toBe('4px')
    expect(grabber.style.background).toBe('var(--line)')
  })

  it('radius 28 solo in alto (raggio.sheet)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog.style.borderTopLeftRadius).toBe('28px')
    expect(dialog.style.borderTopRightRadius).toBe('28px')
    expect(dialog.style.borderBottomLeftRadius).toBe('0px')
    expect(dialog.style.borderBottomRightRadius).toBe('0px')
  })

  it('max 92% viewport (maxHeight)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    expect(screen.getByRole('dialog').style.maxHeight).toBe('92vh')
  })

  it('tap sullo scrim → onChiudi', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim)
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('tap DENTRO il contenuto NON chiude (il click non deve propagarsi come tap-scrim)', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto cliccabile</p>
      </Sheet>
    )
    fireEvent.click(screen.getByText('Contenuto cliccabile'))
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('QA live Francesco round 2 — il wrapper del portale (data-ds="v3") è esplicitamente trasparente: solo lo scrim dipinge', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const scrim = document.querySelector('.ds-sheet-scrim') as HTMLElement
    const wrapper = scrim.parentElement as HTMLElement
    expect(wrapper).toHaveAttribute('data-ds', 'v3')
    expect(wrapper.style.background).toBe('transparent')
  })

  it('Esc → onChiudi', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })

  it('Esc quando aperto=false → nessun listener attivo, onChiudi mai chiamato', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto={false} onChiudi={onChiudi}>
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onChiudi).not.toHaveBeenCalled()
  })

  it('LinkQuieto «Chiudi» sempre presente in fondo, click → onChiudi', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const chiudi = screen.getByText('Chiudi')
    expect(chiudi.tagName).toBe('BUTTON')
    fireEvent.click(chiudi)
    expect(onChiudi).toHaveBeenCalledTimes(1)
    // LinkQuieto non suona mai (§5.5) — nessun secondo suono attribuibile a Sheet
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('MAI una X come unica uscita: nessun bottone con aria-label "Chiudi"/"×" a parte il LinkQuieto testuale', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    const bottoni = within(dialog).getAllByRole('button')
    expect(bottoni.length).toBe(1)
    expect(bottoni[0]).toHaveTextContent('Chiudi')
  })

  it('body scroll lock quando aperto, ripristinato SOLO dopo la fine dell\'animazione di uscita (bug QA live Francesco: sbloccare a metà animazione fa slittare lateralmente il pannello centrato quando riappare la scrollbar)', async () => {
    document.body.style.overflow = 'scroll'
    const { rerender } = render(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('scroll')
    rerender(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    // Subito dopo aperto=false il pannello sta ancora scendendo (molla.smooth,
    // ~500ms): il body DEVE restare bloccato, altrimenti la scrollbar
    // ricompare a metà animazione e il wrapper centrato si ricentra spostando
    // il pannello lateralmente di qualche px.
    expect(document.body.style.overflow).toBe('hidden')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('compensa la larghezza della scrollbar con paddingRight mentre il body è bloccato (evita il layout shift alla ricomparsa)', async () => {
    const precedentePaddingRight = document.body.style.paddingRight
    // Simula un browser con scrollbar "classica" che riserva 17px di layout:
    // innerWidth include la scrollbar, clientWidth no.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1280 })
    Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, value: 1263 })
    try {
      const { rerender } = render(
        <Sheet aperto={false} onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      expect(document.body.style.paddingRight).toBe('')
      rerender(
        <Sheet aperto onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      expect(document.body.style.paddingRight).toBe('17px')
      rerender(
        <Sheet aperto={false} onChiudi={() => {}}>
          <p>Contenuto</p>
        </Sheet>
      )
      // Ancora compensato mentre il pannello scende — coerente col lock.
      expect(document.body.style.paddingRight).toBe('17px')
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(document.body.style.paddingRight).toBe(precedentePaddingRight)
    } finally {
      delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
      document.body.style.paddingRight = precedentePaddingRight
    }
  })

  it('riapertura mentre l\'uscita precedente sta ancora giocando NON blocca lo scroll per sempre (il valore originale non va sovrascritto con "hidden")', async () => {
    document.body.style.overflow = 'scroll'
    const { rerender } = render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    // Uscita avviata, ancora bloccato (comportamento atteso, testato sopra).
    expect(document.body.style.overflow).toBe('hidden')
    // Riapre PRIMA che l'uscita precedente completi: senza la guardia,
    // questo effect ri-catturerebbe 'hidden' come "valore precedente",
    // perdendo per sempre il vero valore originale ('scroll').
    rerender(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    // Richiude e questa volta lascia completare l'uscita.
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('unmount REALE mentre aperto (es. navigazione client-side con lo sheet aperto) → scroll ripristinato subito, mai bloccato per sempre', () => {
    // Nessun rerender con aperto=false: qui il componente sparisce dal tree
    // mentre è ancora aperto. React esegue le cleanup in ORDINE DI SETUP
    // (verificato empiricamente su React 19.2: A setup, B setup, A cleanup,
    // B cleanup — NON LIFO): l'effect-sentinella che marca lo smontaggio deve
    // quindi essere dichiarato PRIMA dell'effect dello scroll lock, altrimenti
    // la cleanup del lock legge montatoRef ancora true e non sblocca mai.
    document.body.style.overflow = 'scroll'
    const { unmount } = render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('inversa: la chiusura normale (aperto=false, uscita animata) continua a sbloccare a fine animazione anche dopo il riordino degli effect', async () => {
    document.body.style.overflow = 'scroll'
    const { rerender } = render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(document.body.style.overflow).toBe('hidden')
    rerender(
      <Sheet aperto={false} onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    // Ancora bloccato durante l'uscita (il componente resta montato).
    expect(document.body.style.overflow).toBe('hidden')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('focus management: al momento dell\'apertura il dialog riceve il focus; alla chiusura torna all\'elemento precedente', async () => {
    function Wrapper() {
      const [aperto, setAperto] = useState(false)
      return (
        <div>
          <button onClick={() => setAperto(true)}>Apri</button>
          <Sheet aperto={aperto} onChiudi={() => setAperto(false)}>
            <p>Contenuto</p>
          </Sheet>
        </div>
      )
    }
    render(<Wrapper />)
    const apriBtn = screen.getByRole('button', { name: 'Apri' })
    apriBtn.focus()
    expect(document.activeElement).toBe(apriBtn)
    fireEvent.click(apriBtn)
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(dialog)
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(apriBtn)
  })

  it('accoglie RigheDato come children (uso realistico nel catalogo)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli lavoro">
        <RigaDato chiave="Dentista" valore="Studio Bianchi" />
        <RigaDato chiave="Paziente" valore="PZ-1042" />
      </Sheet>
    )
    expect(screen.getByText('Studio Bianchi')).toBeInTheDocument()
    expect(screen.getByText('PZ-1042')).toBeInTheDocument()
  })

  it('i testi (titolo + Chiudi) passano trovaParoleVietate', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli del lavoro">
        <p>Contenuto</p>
      </Sheet>
    )
    const testo = screen.getByRole('dialog').textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})

describe('deveChiudere — soglia dismiss swipe giù (§5.16, §8.2.3)', () => {
  const ALTEZZA = 400 // px, pannello demo

  it('sotto soglia distanza e velocità → NON chiude (torna su con molla.smooth)', () => {
    expect(deveChiudere(50, 0, ALTEZZA)).toBe(false)
  })

  it('offsetY oltre il 25% dell\'altezza → chiude', () => {
    expect(deveChiudere(ALTEZZA * 0.25 + 1, 0, ALTEZZA)).toBe(true)
  })

  it('offsetY esattamente al 25% (confine) → NON chiude (soglia stretta, > non >=)', () => {
    expect(deveChiudere(ALTEZZA * 0.25, 0, ALTEZZA)).toBe(false)
  })

  it('offsetY appena sotto il 25% → NON chiude', () => {
    expect(deveChiudere(ALTEZZA * 0.25 - 1, 0, ALTEZZA)).toBe(false)
  })

  it('velocità oltre 500px/s (anche con offset minimo) → chiude — un colpo secco basta', () => {
    expect(deveChiudere(5, 501, ALTEZZA)).toBe(true)
  })

  it('velocità esattamente 500 (confine) → NON chiude', () => {
    expect(deveChiudere(5, 500, ALTEZZA)).toBe(false)
  })

  it('entrambe le soglie superate → chiude', () => {
    expect(deveChiudere(ALTEZZA * 0.5, 800, ALTEZZA)).toBe(true)
  })

  it('offsetY negativo (trascinato verso l\'alto, contro il vincolo dragConstraints top:0) → mai chiude', () => {
    expect(deveChiudere(-50, 0, ALTEZZA)).toBe(false)
  })

  it('velocità negativa (rilasciato mentre risaliva) → non chiude anche con offset residuo alto', () => {
    expect(deveChiudere(ALTEZZA * 0.5, -800, ALTEZZA)).toBe(true) // offset da solo basta
    expect(deveChiudere(10, -800, ALTEZZA)).toBe(false) // né offset né velocità (negativa) bastano
  })

  it('altezza 0 (difensivo): qualunque offsetY positivo supera la soglia 0 → chiude', () => {
    expect(deveChiudere(1, 0, 0)).toBe(true)
    expect(deveChiudere(0, 0, 0)).toBe(false)
  })

  it('offset e velocità entrambi zero → non chiude', () => {
    expect(deveChiudere(0, 0, ALTEZZA)).toBe(false)
  })
})

describe('Sheet — swipe giù per chiudere, wiring drag (§5.16, §8.2.3)', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  it('ramo animato: il pannello è draggable in verticale (Motion imposta touch-action per liberare l\'asse trascinato)', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    // Motion applica `touch-action` sull'elemento draggable per lasciare al
    // browser il controllo dell'asse NON trascinato (drag="y" → pan-x libero,
    // y catturato dal gesto) — è la prova jsdom-verificabile che `drag="y"`
    // è effettivamente wired sul pannello (drag stesso non è un attributo DOM).
    expect(dialog.style.touchAction).toBeTruthy()
    expect(dialog.style.touchAction).not.toBe('auto')
  })

  it('ramo reduced-motion: il pannello NON è draggable (drag solo sul ramo animato, §8.4 — documentato in JSDoc)', () => {
    const ripristina = attivaReducedMotion()
    try {
      render(
        <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
          <p>Contenuto</p>
        </Sheet>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog.style.touchAction).toBeFalsy()
    } finally {
      ripristina()
    }
  })

  it('scrim, Esc e LinkQuieto «Chiudi» restano wired invariati accanto al drag', () => {
    const onChiudi = vi.fn()
    render(
      <Sheet aperto onChiudi={onChiudi} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    fireEvent.click(screen.getByText('Chiudi'))
    expect(onChiudi).toHaveBeenCalledTimes(1)
  })
})

describe('DialogConferma — conferma distruttiva centrata (§5.17)', () => {
  const OGGETTO = 'Butto via il lavoro n.148 di Studio Bianchi?'

  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aperto=false → nulla nel DOM', () => {
    render(
      <DialogConferma
        aperto={false}
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText(OGGETTO)).toBeNull()
  })

  it('aperto=true → titolo e testo (con oggetto esplicito) resi', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Sei sicuro?')).toBeInTheDocument()
    expect(within(dialog).getByText(OGGETTO)).toBeInTheDocument()
  })

  it('ordine nel DOM: azione sicura (TastoSecondario) SOPRA, distruttiva (TastoPrimario) SOTTO', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog')
    const bottoni = within(dialog).getAllByRole('button')
    expect(bottoni.length).toBe(2)
    expect(bottoni[0]).toHaveTextContent('No, tienilo')
    expect(bottoni[1]).toHaveTextContent('Sì, buttalo via')
  })

  it('entrambe le etichette sono rese e cliccabili: onConferma/onAnnulla wired correttamente', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    fireEvent.click(screen.getByText('No, tienilo'))
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Sì, buttalo via'))
    expect(onConferma).toHaveBeenCalledTimes(1)
  })

  it('tap sullo scrim → onAnnulla (via di fuga sicura, mai la distruttiva)', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim)
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()
  })

  it('Esc → onAnnulla', () => {
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={onAnnulla}
      />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onAnnulla).toHaveBeenCalledTimes(1)
  })

  it('card centrata max 340', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    expect(screen.getByRole('dialog').style.maxWidth).toBe('340px')
  })

  it('nessun suono all\'apertura (il suono appartiene all\'esito, non a DialogConferma)', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('i testi passano trovaParoleVietate', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const testo = screen.getByRole('dialog').textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('QA live Francesco round 2 — il wrapper del portale (data-ds="v3") è esplicitamente trasparente: solo lo scrim dipinge', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo={OGGETTO}
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
    const wrapper = scrim.parentElement as HTMLElement
    expect(wrapper).toHaveAttribute('data-ds', 'v3')
    expect(wrapper.style.background).toBe('transparent')
  })
})

describe('Sheet · DialogConferma — reduced motion (§8.4)', () => {
  let ripristinaMatchMedia: () => void

  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    ripristinaMatchMedia = attivaReducedMotion()
  })
  afterEach(() => {
    ripristinaMatchMedia()
    vi.restoreAllMocks()
    document.body.style.overflow = ''
  })

  it('Sheet: si apre in dissolvenza e raggiunge opacity 1 (SheetRidotto, rAF)', async () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // La transizione è la dissolvenza CSS pura (cssEase.generico), non la molla
    expect(dialog.style.transition).toContain('opacity')
    await flushFrame()
    expect(dialog.style.opacity).toBe('1')
    // Il contenuto e la via di fuga restano al loro posto
    expect(within(dialog).getByText('Contenuto')).toBeInTheDocument()
    expect(within(dialog).getByText('Chiudi')).toBeInTheDocument()
  })

  it('Sheet: la chiusura è ISTANTANEA — nulla nel DOM subito dopo aperto=false', async () => {
    const { rerender } = render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    await flushFrame()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    rerender(
      <Sheet aperto={false} onChiudi={() => {}} titolo="Dettagli">
        <p>Contenuto</p>
      </Sheet>
    )
    // Senza AnimatePresence nel ramo ridotto la rimozione è immediata: nessun waitFor
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByText('Contenuto')).toBeNull()
  })

  it('DialogConferma: il ramo ridotto renderizza e il tap sullo scrim chiama comunque onAnnulla', () => {
    const onConferma = vi.fn()
    const onAnnulla = vi.fn()
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo="Butto via il lavoro n.148 di Studio Bianchi?"
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={onConferma}
        onAnnulla={onAnnulla}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Sei sicuro?')).toBeInTheDocument()
    expect(within(dialog).getByText('Butto via il lavoro n.148 di Studio Bianchi?')).toBeInTheDocument()
    const scrim = document.querySelector('.ds-dialog-scrim') as HTMLElement
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim)
    expect(onAnnulla).toHaveBeenCalledTimes(1)
    expect(onConferma).not.toHaveBeenCalled()
  })
})

describe('Sheet · DialogConferma — aria labelledby/describedby', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
  })

  it('Sheet con titolo: aria-labelledby punta all\'id del titolo', () => {
    render(
      <Sheet aperto onChiudi={() => {}} titolo="Dettagli lavoro">
        <p>Contenuto</p>
      </Sheet>
    )
    const dialog = screen.getByRole('dialog')
    const labelledby = dialog.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    const titolo = document.getElementById(labelledby as string)
    expect(titolo).not.toBeNull()
    expect(titolo).toHaveTextContent('Dettagli lavoro')
    // Il nome accessibile del dialog È il titolo
    expect(screen.getByRole('dialog', { name: 'Dettagli lavoro' })).toBe(dialog)
  })

  it('Sheet senza titolo: nessun aria-labelledby appeso a un id inesistente', () => {
    render(
      <Sheet aperto onChiudi={() => {}}>
        <p>Contenuto</p>
      </Sheet>
    )
    expect(screen.getByRole('dialog').getAttribute('aria-labelledby')).toBeNull()
  })

  it('DialogConferma: aria-labelledby → titolo, aria-describedby → testo (l\'oggetto esplicito)', () => {
    render(
      <DialogConferma
        aperto
        titolo="Sei sicuro?"
        testo="Butto via il lavoro n.148 di Studio Bianchi?"
        etichettaDistruttiva="Sì, buttalo via"
        etichettaSicura="No, tienilo"
        onConferma={() => {}}
        onAnnulla={() => {}}
      />
    )
    const dialog = screen.getByRole('dialog')
    const labelledby = dialog.getAttribute('aria-labelledby')
    const describedby = dialog.getAttribute('aria-describedby')
    expect(labelledby).toBeTruthy()
    expect(describedby).toBeTruthy()
    expect(document.getElementById(labelledby as string)).toHaveTextContent('Sei sicuro?')
    expect(document.getElementById(describedby as string)).toHaveTextContent(
      'Butto via il lavoro n.148 di Studio Bianchi?'
    )
    expect(screen.getByRole('dialog', { name: 'Sei sicuro?' })).toBe(dialog)
  })
})

describe('dizionario sui testi del catalogo — sezione «Sheet · DialogConferma»', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione «Sheet · DialogConferma» con due bottoni demo', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: /Sheet · DialogConferma/i })).toBeInTheDocument()
  })
})
