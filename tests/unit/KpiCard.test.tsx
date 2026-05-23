import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { KpiCard } from '../../src/components/features/dashboard/KpiCard'

describe('KpiCard', () => {
  it('mostra il numero con Playfair Display', () => {
    const { container } = render(
      <KpiCard valore={3} label="Da consegnare" azione="oggi →" colore="blue"
               href="/lavori?filter=consegne-oggi" />
    )
    expect(screen.getByText('3')).toBeTruthy()
    const numEl = container.querySelector('[data-testid="kpi-valore"]') as HTMLElement
    expect(numEl).toBeTruthy()
    expect(numEl.style.fontFamily).toContain('Playfair')
  })

  it('è un link con href corretto', () => {
    render(
      <KpiCard valore={5} label="Da fatturare" azione="fattura →" colore="gold"
               href="/fatture" />
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/fatture')
  })

  it('se valore=0 non è cliccabile e non mostra azione', () => {
    render(
      <KpiCard valore={0} label="In ritardo" azione="vedi →" colore="red"
               href="/lavori?stato=in_ritardo" />
    )
    const links = screen.queryAllByRole('link')
    expect(links.length).toBe(0)
    expect(screen.queryByText('vedi →')).toBeNull()
  })

  it('mostra il chevron quando cliccabile', () => {
    const { container } = render(
      <KpiCard valore={2} label="Blocchi" azione="risolvi →" colore="red"
               href="/lavori?filter=blocchi" />
    )
    expect(container.textContent).toContain('›')
  })
})
