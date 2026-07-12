import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const vibraMock = vi.fn()
const suonaMock = vi.fn()
const initSuoniMock = vi.fn()
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => initSuoniMock(),
}))

import { ChipScelta } from '@/components/ds/ChipScelta'

describe('ChipScelta — chip di decisione rapida del wizard (§5.31)', () => {
  beforeEach(() => {
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza il testo passato come children', () => {
    render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    expect(screen.getByText('Oggi')).toBeInTheDocument()
  })

  it('ha ruolo button', () => {
    render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    expect(screen.getByRole('button', { name: 'Oggi' })).toBeInTheDocument()
  })

  it('aria-pressed riflette la prop selezionata', () => {
    const { rerender } = render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    expect(screen.getByRole('button', { name: 'Oggi' })).toHaveAttribute('aria-pressed', 'false')
    rerender(
      <ChipScelta selezionata={true} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    expect(screen.getByRole('button', { name: /Oggi/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('il check ✓ (SVG) NON è visibile quando non selezionata', () => {
    const { container } = render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    expect(container.querySelector('svg')).toBeNull()
  })

  it('il check ✓ (SVG) È visibile quando selezionata, stroke 3 e aria-hidden', () => {
    const { container } = render(
      <ChipScelta selezionata={true} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    const path = svg?.querySelector('path')
    expect(path).toHaveAttribute('stroke-width', '3')
  })

  it('click chiama onClick + vibra("selection")', () => {
    const onClick = vi.fn()
    render(
      <ChipScelta selezionata={false} onClick={onClick}>
        Oggi
      </ChipScelta>
    )
    fireEvent.click(screen.getByRole('button', { name: 'Oggi' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(vibraMock).toHaveBeenCalledWith('selection')
  })

  it('anatomia di legge: min-height 48, padding 0/20, radius 999, testo 16/700', () => {
    render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    const el = screen.getByRole('button', { name: 'Oggi' })
    expect(el.style.minHeight).toBe('48px')
    expect(el.style.padding).toBe('0px 20px')
    expect(el.style.borderRadius).toBe('999px')
    expect(el.style.fontSize).toBe('16px')
    expect(el.style.fontWeight).toBe('700')
  })

  it('non selezionata: faccia var(--card) + ombra var(--sh-press)', () => {
    render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    const el = screen.getByRole('button', { name: 'Oggi' })
    expect(el.style.background).toBe('var(--card)')
    expect(el.style.boxShadow).toBe('var(--sh-press)')
  })

  it('selezionata: sfondo var(--green-tint) + testo var(--green), SENZA ombra', () => {
    render(
      <ChipScelta selezionata={true} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    const el = screen.getByRole('button', { name: /Oggi/ })
    expect(el.style.background).toBe('var(--green-tint)')
    expect(el.style.color).toBe('var(--green)')
    expect(el.style.boxShadow).toBe('none')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il testo passa trovaParoleVietate', () => {
    const { container } = render(
      <ChipScelta selezionata={false} onClick={() => {}}>
        Oggi
      </ChipScelta>
    )
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('dizionario sui testi del catalogo — sezione ChipScelta (§5.31)', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione «ChipScelta» con due chip, una selezionata', async () => {
    const CatalogoPage = (await import('../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: 'ChipScelta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Corona/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Ponte' })).toHaveAttribute('aria-pressed', 'false')
  })
})
