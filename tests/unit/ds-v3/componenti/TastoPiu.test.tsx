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

describe('TastoPiu — l\'otturatore della home (§5.2)', () => {
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

  it('hit area ≥ 92 (dimensioni base asserite via style inline): Ø 110', () => {
    render(<TastoPiu onClick={() => {}} />)
    const bottone = screen.getByRole('button', { name: 'Nuovo lavoro' })
    expect(bottone.style.width).toBe('110px')
    expect(bottone.style.height).toBe('110px')
  })

  it('la faccia visibile è Ø 92, distinta dalla hit area di 110', () => {
    const { container } = render(<TastoPiu onClick={() => {}} />)
    const faccia = container.querySelector('[data-parte="faccia"]') as HTMLElement | null
    expect(faccia).not.toBeNull()
    expect(faccia!.style.width).toBe('92px')
    expect(faccia!.style.height).toBe('92px')
  })

  it('glifo "+" bianco presente nella faccia', () => {
    render(<TastoPiu onClick={() => {}} />)
    expect(screen.getByText('+')).toBeInTheDocument()
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
