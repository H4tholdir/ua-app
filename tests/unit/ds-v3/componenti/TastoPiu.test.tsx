import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { TastoPiu } from '@/components/ds/TastoPiu'

describe('TastoPiu — il pulsante fisico (§5.2 rev — ghiera + cappello)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('etichetta di default "Nuovo lavoro" quando la prop non è passata', () => {
    render(<TastoPiu onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Nuovo lavoro' })).toBeInTheDocument()
  })

  it('aria-label = etichetta passata', () => {
    render(<TastoPiu onClick={() => {}} etichetta="Nuova scheda" />)
    expect(screen.getByRole('button', { name: 'Nuova scheda' })).toBeInTheDocument()
  })

  it('click chiama onClick + suona("tap") + vibra("medium")', () => {
    const onClick = vi.fn()
    render(<TastoPiu onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Nuovo lavoro' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('tap')
    expect(vibraMock).toHaveBeenCalledWith('medium')
  })

  it('hit area del bottone è Ø 110 (style inline)', () => {
    render(<TastoPiu onClick={() => {}} />)
    const bottone = screen.getByRole('button', { name: 'Nuovo lavoro' })
    expect(bottone.style.width).toBe('110px')
    expect(bottone.style.height).toBe('110px')
  })

  it('la ghiera (base) è Ø 92, distinta dalla hit area di 110', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const ghiera = container.querySelector('[data-parte="ghiera"]') as HTMLElement | null
    expect(ghiera).not.toBeNull()
    expect(ghiera!.style.width).toBe('92px')
    expect(ghiera!.style.height).toBe('92px')
  })

  it('il solco (anello fra ghiera e cappello) è Ø ~76', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const solco = container.querySelector('[data-parte="solco"]') as HTMLElement | null
    expect(solco).not.toBeNull()
    expect(solco!.style.width).toBe('76px')
    expect(solco!.style.height).toBe('76px')
  })

  it('il cappello (parte che si preme) è Ø 68', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const cappello = container.querySelector('[data-parte="cappello"]') as HTMLElement | null
    expect(cappello).not.toBeNull()
    expect(cappello!.style.width).toBe('68px')
    expect(cappello!.style.height).toBe('68px')
  })

  it('glifo "+" sottile e quieto nel cappello: ~40px, peso 300, colore var(--muted)', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const cappello = container.querySelector('[data-parte="cappello"]') as HTMLElement | null
    expect(cappello).not.toBeNull()
    expect(cappello!.textContent).toBe('+')
    expect(cappello!.style.fontSize).toBe('40px')
    expect(cappello!.style.fontWeight).toBe('300')
    expect(cappello!.style.color).toBe('var(--muted)')
  })

  it('etichetta visibile sotto al tasto (oltre all\'aria-label sul button)', () => {
    render(<TastoPiu onClick={() => {}} etichetta="Nuova scheda" />)
    // aria-label non è un nodo testo: getAllByText trova solo lo <span> visibile sotto.
    expect(screen.getAllByText('Nuova scheda').length).toBeGreaterThanOrEqual(1)
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('etichetta di default e personalizzata passano trovaParoleVietate', () => {
    const { container: c1 } = render(<TastoPiu onClick={() => {}} />)
    expect(trovaParoleVietate(c1.textContent ?? '')).toEqual([])

    const { container: c2 } = render(<TastoPiu onClick={() => {}} etichetta="Nuova scheda" />)
    expect(trovaParoleVietate(c2.textContent ?? '')).toEqual([])
  })
})
