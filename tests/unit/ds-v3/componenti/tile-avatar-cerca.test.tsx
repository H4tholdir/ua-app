import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import { avatarPalette } from '@/design-system/v3/tokens'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { Avatar, coloreAvatar } from '@/components/ds/Avatar'

/** jsdom normalizza gli hex a rgb() quando letti da `style.background` (CSSOM). */
function esadecimaleARgb(hex: string): string {
  const int = parseInt(hex.slice(1), 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgb(${r}, ${g}, ${b})`
}
import { TileScelta, TileNuovo } from '@/components/ds/TileScelta'
import { RigaCerca } from '@/components/ds/RigaCerca'

beforeEach(() => {
  suonaMock.mockClear()
  vibraMock.mockClear()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('coloreAvatar — colore deterministico (§5.14)', () => {
  it('stesso nome → sempre lo stesso colore', () => {
    const c1 = coloreAvatar('Studio Bianchi')
    const c2 = coloreAvatar('Studio Bianchi')
    expect(c1).toBe(c2)
  })

  it('il colore restituito appartiene sempre alla palette avatar', () => {
    const nomi = ['Studio Bianchi', 'Dr. Ferraro', 'Rossi', 'Ambulatorio Verdi', 'De Luca', 'Marchetti']
    for (const nome of nomi) {
      expect(avatarPalette).toContain(coloreAvatar(nome))
    }
  })

  it('la funzione copre l\'intera palette (nomi diversi → colori diversi in almeno alcuni casi)', () => {
    // Genera molti nomi sintetici: la distribuzione modulo deve coprire tutti e 6 i colori.
    const colori = new Set<string>()
    for (let i = 0; i < 200; i++) {
      colori.add(coloreAvatar(`Laboratorio numero ${i}`))
    }
    expect(colori.size).toBe(avatarPalette.length)
  })
})

describe('Avatar — iniziali e anatomia (§5.14)', () => {
  it('iniziali corrette: «Studio Bianchi» → «SB»', () => {
    render(<Avatar nome="Studio Bianchi" />)
    expect(screen.getByText('SB')).toBeInTheDocument()
  })

  it('nome singolo → solo la prima lettera', () => {
    render(<Avatar nome="Rossi" />)
    expect(screen.getByText('R')).toBeInTheDocument()
  })

  it('diametro default 60', () => {
    const { container } = render(<Avatar nome="Studio Bianchi" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('60px')
    expect(el.style.height).toBe('60px')
  })

  it('diametro 46 quando richiesto (liste/portale)', () => {
    const { container } = render(<Avatar nome="Studio Bianchi" diametro={46} />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.width).toBe('46px')
    expect(el.style.height).toBe('46px')
  })

  it('è decorativo (aria-hidden): il nome pieno è sempre mostrato altrove come testo', () => {
    const { container } = render(<Avatar nome="Studio Bianchi" />)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
  })

  it('colore di sfondo = coloreAvatar(nome)', () => {
    const { container } = render(<Avatar nome="Studio Bianchi" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.style.background).toBe(esadecimaleARgb(coloreAvatar('Studio Bianchi')))
  })
})

describe('TileScelta — selezione nel wizard (§5.12)', () => {
  it('renderizza nome e sotto', () => {
    render(<TileScelta nome="Studio Bianchi" sotto="12 lavori a giugno" onClick={() => {}} />)
    expect(screen.getByText('Studio Bianchi')).toBeInTheDocument()
    expect(screen.getByText('12 lavori a giugno')).toBeInTheDocument()
  })

  it('con prop avatar renderizza le iniziali dell\'Avatar', () => {
    render(<TileScelta nome="Studio Bianchi" avatar="Studio Bianchi" onClick={() => {}} />)
    expect(screen.getByText('SB')).toBeInTheDocument()
  })

  it('con prop glifo (senza avatar) renderizza il glifo passato', () => {
    render(<TileScelta nome="Corona" glifo={<span>👑</span>} onClick={() => {}} />)
    expect(screen.getByText('👑')).toBeInTheDocument()
  })

  it('è un elemento con ruolo button, nome accessibile = nome', () => {
    render(<TileScelta nome="Studio Bianchi" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: /Studio Bianchi/ })).toBeInTheDocument()
  })

  it('click → chiama onClick + vibra("selection") — MAI suona (è una selezione, non un\'azione)', () => {
    const onClick = vi.fn()
    render(<TileScelta nome="Studio Bianchi" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /Studio Bianchi/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
    expect(suonaMock).not.toHaveBeenCalled()
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TileScelta nome="Studio Bianchi" onClick={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il nome tronca su UNA riga con ellissi (§5.12 — anatomia fissa, fix round Task 10)', () => {
    render(<TileScelta nome="Corona metallo-ceramica lunghissima" onClick={() => {}} />)
    const nome = screen.getByText('Corona metallo-ceramica lunghissima') as HTMLElement
    expect(nome.style.whiteSpace).toBe('nowrap')
    expect(nome.style.overflow).toBe('hidden')
    expect(nome.style.textOverflow).toBe('ellipsis')
    expect(nome.style.maxWidth).toBe('100%')
  })

  it('nome e sotto passano trovaParoleVietate', () => {
    const { container } = render(
      <TileScelta nome="Studio Bianchi" sotto="12 lavori a giugno" onClick={() => {}} />
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('TileNuovo — apre la creazione di un nuovo elemento (§5.12)', () => {
  it('renderizza l\'etichetta passata, ruolo button', () => {
    render(<TileNuovo etichetta="Nuovo dentista" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: /Nuovo dentista/ })).toBeInTheDocument()
  })

  it('bordo tratteggiato 2.5px (§5.12)', () => {
    render(<TileNuovo etichetta="Nuovo dentista" onClick={() => {}} />)
    const bottone = screen.getByRole('button', { name: /Nuovo dentista/ })
    expect(bottone.style.borderStyle).toBe('dashed')
    expect(bottone.style.borderWidth).toBe('2.5px')
  })

  it('niente ombra', () => {
    render(<TileNuovo etichetta="Nuovo dentista" onClick={() => {}} />)
    const bottone = screen.getByRole('button', { name: /Nuovo dentista/ })
    expect(bottone.style.boxShadow).toBe('none')
  })

  it('click → chiama onClick + suona("tap") + vibra("medium") — è un\'azione (crea un nuovo elemento)', () => {
    const onClick = vi.fn()
    render(<TileNuovo etichetta="Nuovo dentista" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /Nuovo dentista/ }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TileNuovo etichetta="Nuovo dentista" onClick={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('l\'etichetta passa trovaParoleVietate', () => {
    const { container } = render(<TileNuovo etichetta="Nuovo dentista" onClick={() => {}} />)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('RigaCerca — apre la ricerca (§5.13)', () => {
  it('compone il testo con totale e cosa: «Cerca fra tutti i 14 dentisti»', () => {
    render(<RigaCerca totale={14} cosa="dentisti" onApri={() => {}} />)
    expect(screen.getByText(/Cerca fra tutti i 14 dentisti/)).toBeInTheDocument()
  })

  it('ricompone il testo per altri valori di totale e cosa', () => {
    render(<RigaCerca totale={7} cosa="pazienti" onApri={() => {}} />)
    expect(screen.getByText(/Cerca fra tutti i 7 pazienti/)).toBeInTheDocument()
  })

  it('ruolo button', () => {
    render(<RigaCerca totale={14} cosa="dentisti" onApri={() => {}} />)
    expect(screen.getByRole('button', { name: /Cerca fra tutti i 14 dentisti/ })).toBeInTheDocument()
  })

  it('H 58 (§5.13)', () => {
    render(<RigaCerca totale={14} cosa="dentisti" onApri={() => {}} />)
    const bottone = screen.getByRole('button', { name: /Cerca fra tutti i 14 dentisti/ })
    expect(bottone.style.height).toBe('58px')
  })

  it('al tap chiama onApri — MAI suono o vibrazione (navigazione di sola lettura, apre la ricerca)', () => {
    const onApri = vi.fn()
    render(<RigaCerca totale={14} cosa="dentisti" onApri={onApri} />)
    fireEvent.click(screen.getByRole('button', { name: /Cerca fra tutti i 14 dentisti/ }))
    expect(onApri).toHaveBeenCalledTimes(1)
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<RigaCerca totale={14} cosa="dentisti" onApri={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il testo composto passa trovaParoleVietate', () => {
    const { container } = render(<RigaCerca totale={14} cosa="dentisti" onApri={() => {}} />)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('catalogo DS v3 — sezione «Tile · Avatar · Cerca»', () => {
  it('mostra una griglia 2 colonne di TileScelta con nomi di dentisti realistici, avatar con colori deterministici, un TileNuovo e una RigaCerca', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByText('Studio Bianchi')).toBeInTheDocument()
    expect(screen.getByText('Dr. Ferraro')).toBeInTheDocument()
    expect(screen.getByText(/Cerca fra tutti i 14 dentisti/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Nuovo dentista/ }).length).toBeGreaterThan(0)
  })

  it('tutti i testi statici del catalogo (inclusa la nuova sezione) passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})
