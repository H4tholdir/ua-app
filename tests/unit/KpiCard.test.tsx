import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { KpiCard } from '../../src/components/features/dashboard/KpiCard'

describe('KpiCard', () => {
  it('mostra il numero con Playfair Display', () => {
    const { container } = render(
      <KpiCard valore={3} label="Da consegnare" hint="tocca per filtrare" colore="red" />
    )
    expect(screen.getByText('3')).toBeTruthy()
    const numEl = container.querySelector('[data-testid="kpi-valore"]') as HTMLElement
    expect(numEl).toBeTruthy()
    expect(numEl.style.fontFamily).toContain('Playfair')
  })

  it('è un button quando valore > 0', () => {
    render(
      <KpiCard valore={5} label="Da fatturare" hint="tocca per filtrare" colore="gold" />
    )
    const btn = screen.getByRole('button')
    expect(btn).toBeTruthy()
  })

  it('chiama onToggle al click', () => {
    const onToggle = vi.fn()
    render(
      <KpiCard valore={5} label="Da fatturare" hint="tocca per filtrare" colore="gold" onToggle={onToggle} />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('se valore=0 non è interattivo e non mostra hint', () => {
    render(
      <KpiCard valore={0} label="In ritardo" hint="tocca per filtrare" colore="amber" />
    )
    expect(screen.queryAllByRole('button').length).toBe(0)
    expect(screen.queryByText('tocca per filtrare')).toBeNull()
  })

  it('stato attivo mostra pressed e hint speciale', () => {
    const { container } = render(
      <KpiCard valore={52} label="In ritardo" hint="tocca per filtrare" colore="amber" isActive={true} />
    )
    const btn = screen.getByRole('button')
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(container.textContent).toContain('filtro attivo')
  })
})
