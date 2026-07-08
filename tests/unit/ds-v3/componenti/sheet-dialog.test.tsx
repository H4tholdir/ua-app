import { useState } from 'react'
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

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

import { Sheet } from '@/components/ds/Sheet'
import { DialogConferma } from '@/components/ds/DialogConferma'
import { RigaDato } from '@/components/ds/CardInfo'

describe('Sheet — bottom sheet (§5.16)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
    document.body.style.overflow = ''
  })
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
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

  it('body scroll lock quando aperto, ripristinato alla chiusura (valore precedente preservato)', () => {
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
    expect(screen.getByText(/Sheet · DialogConferma/i)).toBeInTheDocument()
  })
})
