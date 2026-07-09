import { render, screen, fireEvent } from '@testing-library/react'
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

import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { LinkQuieto } from '@/components/ds/LinkQuieto'

describe('TastoSecondario — azioni non primarie (§5.3)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza il testo passato come children', () => {
    render(<TastoSecondario onClick={() => {}}>Apri il lavoro</TastoSecondario>)
    expect(screen.getByText('Apri il lavoro')).toBeInTheDocument()
  })

  it('ha ruolo button', () => {
    render(<TastoSecondario onClick={() => {}}>Apri il lavoro</TastoSecondario>)
    expect(screen.getByRole('button', { name: 'Apri il lavoro' })).toBeInTheDocument()
  })

  it('click chiama onClick + suona("tap") + vibra("light")', () => {
    const onClick = vi.fn()
    render(<TastoSecondario onClick={onClick}>Apri il lavoro</TastoSecondario>)
    fireEvent.click(screen.getByRole('button', { name: 'Apri il lavoro' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('light')
  })

  it('type di default è "button"; supporta "submit"', () => {
    const { rerender } = render(<TastoSecondario onClick={() => {}}>Apri</TastoSecondario>)
    expect(screen.getByRole('button', { name: 'Apri' })).toHaveAttribute('type', 'button')
    rerender(
      <TastoSecondario type="submit" onClick={() => {}}>
        Apri
      </TastoSecondario>
    )
    expect(screen.getByRole('button', { name: 'Apri' })).toHaveAttribute('type', 'submit')
  })

  it('disabled: visibile ma inerte — non chiama onClick né suona/vibra', () => {
    const onClick = vi.fn()
    render(
      <TastoSecondario disabled onClick={onClick}>
        Apri il lavoro
      </TastoSecondario>
    )
    const bottone = screen.getByRole('button', { name: 'Apri il lavoro' })
    expect(bottone).toBeVisible()
    fireEvent.click(bottone)
    expect(onClick).not.toHaveBeenCalled()
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TastoSecondario onClick={() => {}}>Apri</TastoSecondario>)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il testo passa trovaParoleVietate', () => {
    const { container } = render(<TastoSecondario onClick={() => {}}>Apri il lavoro</TastoSecondario>)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('TastoTondo — back/menu (§5.6)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ha aria-label obbligatoria tramite etichettaAria', () => {
    render(<TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
  })

  it('renderizza il glifo passato', () => {
    render(<TastoTondo glifo="⋯" etichettaAria="Menu" onClick={() => {}} />)
    expect(screen.getByText('⋯')).toBeInTheDocument()
  })

  it('click chiama onClick + suona("tap") + vibra("light")', () => {
    const onClick = vi.fn()
    render(<TastoTondo glifo="‹" etichettaAria="Indietro" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('light')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it("l'etichettaAria passa trovaParoleVietate", () => {
    expect(trovaParoleVietate('Indietro')).toEqual([])
    expect(trovaParoleVietate('Menu')).toEqual([])
  })
})

describe('LinkQuieto — via di fuga, L6 (§5.5)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('senza href renderizza un <button>', () => {
    render(<LinkQuieto onClick={() => {}}>Annulla</LinkQuieto>)
    const el = screen.getByText('Annulla')
    expect(el.tagName).toBe('BUTTON')
  })

  it('con href renderizza un <a>', () => {
    render(<LinkQuieto href="/impostazioni">Vai alle impostazioni</LinkQuieto>)
    const el = screen.getByText('Vai alle impostazioni')
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/impostazioni')
  })

  it('click chiama onClick ma NON suona MAI, né vibra', () => {
    const onClick = vi.fn()
    render(<LinkQuieto onClick={onClick}>Aspetta, annulla la consegna</LinkQuieto>)
    fireEvent.click(screen.getByText('Aspetta, annulla la consegna'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('click su variante <a> chiama onClick ma NON suona MAI, né vibra', () => {
    const onClick = vi.fn()
    render(
      <LinkQuieto href="/impostazioni" onClick={onClick}>
        Vai alle impostazioni
      </LinkQuieto>
    )
    fireEvent.click(screen.getByText('Vai alle impostazioni'))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).not.toHaveBeenCalled()
    expect(vibraMock).not.toHaveBeenCalled()
  })

  it('il testo passa trovaParoleVietate', () => {
    const { container } = render(<LinkQuieto onClick={() => {}}>Aspetta, annulla la consegna</LinkQuieto>)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })

  it('hit area ≥ 44px (constraint 10) su <button>: min-height 44 + padding verticale compensato da margin negativo', () => {
    render(<LinkQuieto onClick={() => {}}>Annulla</LinkQuieto>)
    const el = screen.getByText('Annulla')
    expect(el.style.minHeight).toBe('44px')
    expect(el.style.padding).toBe('13px 0px')
    expect(el.style.margin).toBe('-13px 0px')
    expect(el.style.display).toBe('inline-flex')
    expect(el.style.alignItems).toBe('center')
  })

  it('hit area ≥ 44px (constraint 10) anche sulla variante <a>', () => {
    render(<LinkQuieto href="/impostazioni">Vai alle impostazioni</LinkQuieto>)
    const el = screen.getByText('Vai alle impostazioni')
    expect(el.tagName).toBe('A')
    expect(el.style.minHeight).toBe('44px')
    expect(el.style.padding).toBe('13px 0px')
    expect(el.style.margin).toBe('-13px 0px')
    expect(el.style.display).toBe('inline-flex')
    expect(el.style.alignItems).toBe('center')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) su entrambe le varianti <button> e <a>', () => {
    const { container: cButton } = render(<LinkQuieto onClick={() => {}}>Annulla</LinkQuieto>)
    const regolaButton = cButton.querySelector('style')?.textContent ?? ''
    expect(regolaButton).toContain('.ds-link-quieto:focus-visible')
    expect(regolaButton).toContain('outline: 2px solid var(--blue)')
    expect(regolaButton).toContain('outline-offset: 2px')
    expect(cButton.querySelector('button.ds-link-quieto')).not.toBeNull()

    const { container: cLink } = render(<LinkQuieto href="/impostazioni">Vai alle impostazioni</LinkQuieto>)
    const regolaLink = cLink.querySelector('style')?.textContent ?? ''
    expect(regolaLink).toContain('.ds-link-quieto:focus-visible')
    expect(regolaLink).toContain('outline: 2px solid var(--blue)')
    expect(regolaLink).toContain('outline-offset: 2px')
    expect(cLink.querySelector('a.ds-link-quieto')).not.toBeNull()
  })
})

describe('dizionario sui testi del catalogo — sezione «Tasti secondari e vie di fuga»', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione «Tasti secondari e vie di fuga» con TastoTondo back e menu', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: /Tasti secondari e vie di fuga/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })
})
