import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
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

import { ProgressDots } from '@/components/ds/ProgressDots'

function getDots(container: HTMLElement): HTMLElement[] {
  const gruppo = container.querySelector('[role="img"]')
  expect(gruppo).not.toBeNull()
  return Array.from(gruppo?.children ?? []) as HTMLElement[]
}

describe('ProgressDots — dots wizard (§5.32)', () => {
  it('ha role="img" e aria-label "Passo N di 3"', () => {
    const { container } = render(<ProgressDots passo={1} />)
    const gruppo = container.querySelector('[role="img"]')
    expect(gruppo).not.toBeNull()
    expect(gruppo).toHaveAttribute('aria-label', 'Passo 1 di 3')
  })

  it('aria-label cambia col passo', () => {
    const { container, rerender } = render(<ProgressDots passo={2} />)
    expect(container.querySelector('[role="img"]')).toHaveAttribute('aria-label', 'Passo 2 di 3')
    rerender(<ProgressDots passo={3} />)
    expect(container.querySelector('[role="img"]')).toHaveAttribute('aria-label', 'Passo 3 di 3')
  })

  it('renderizza esattamente 3 dot Ø 11 (radius 999), gap 8', () => {
    const { container } = render(<ProgressDots passo={1} />)
    const gruppo = container.querySelector('[role="img"]') as HTMLElement
    expect(gruppo.style.gap).toBe('8px')
    const dots = getDots(container)
    expect(dots).toHaveLength(3)
    const dotNonAttivo = dots[1]
    expect(dotNonAttivo.style.width).toBe('11px')
    expect(dotNonAttivo.style.height).toBe('11px')
    expect(dotNonAttivo.style.borderRadius).toBe('999px')
  })

  it('passo 1: nessun dot fatto, il primo è attivo (width 30, --red), gli altri due upcoming (--line)', () => {
    const { container } = render(<ProgressDots passo={1} />)
    const dots = getDots(container)
    expect(dots[0].style.width).toBe('30px')
    expect(dots[0].style.background).toBe('var(--red)')
    expect(dots[1].style.width).toBe('11px')
    expect(dots[1].style.background).toBe('var(--line)')
    expect(dots[2].style.width).toBe('11px')
    expect(dots[2].style.background).toBe('var(--line)')
  })

  it('passo 2: il primo dot è fatto (--green), il secondo attivo (width 30, --red), il terzo upcoming', () => {
    const { container } = render(<ProgressDots passo={2} />)
    const dots = getDots(container)
    expect(dots[0].style.width).toBe('11px')
    expect(dots[0].style.background).toBe('var(--green)')
    expect(dots[1].style.width).toBe('30px')
    expect(dots[1].style.background).toBe('var(--red)')
    expect(dots[2].style.width).toBe('11px')
    expect(dots[2].style.background).toBe('var(--line)')
  })

  it('passo 3: due dot fatti (--green), il terzo attivo (width 30, --red)', () => {
    const { container } = render(<ProgressDots passo={3} />)
    const dots = getDots(container)
    expect(dots[0].style.background).toBe('var(--green)')
    expect(dots[1].style.background).toBe('var(--green)')
    expect(dots[2].style.width).toBe('30px')
    expect(dots[2].style.background).toBe('var(--red)')
  })

  it('la transizione di width è 120ms (cssEase, curva di legge)', () => {
    const { container } = render(<ProgressDots passo={1} />)
    const dots = getDots(container)
    for (const dot of dots) {
      expect(dot.style.transition).toContain('width')
      expect(dot.style.transition).toContain('120ms')
    }
  })

  it('i dot sono decorativi (aria-hidden) — il significato è tutto nel role="img"/aria-label del contenitore', () => {
    const { container } = render(<ProgressDots passo={1} />)
    const dots = getDots(container)
    for (const dot of dots) {
      expect(dot).toHaveAttribute('aria-hidden', 'true')
    }
  })
})

describe('dizionario sui testi del catalogo — sezione ProgressDots (§5.32)', () => {
  it('i testi dimostrativi passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })

  it('il catalogo mostra la sezione «ProgressDots» coi 3 tasti demo per passo', async () => {
    const CatalogoPage = (await import('../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: 'ProgressDots' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Passo 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Passo 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Passo 3' })).toBeInTheDocument()
  })
})
