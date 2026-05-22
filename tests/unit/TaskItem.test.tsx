import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { TaskItem } from '../../src/components/features/dashboard/TaskItem'

const baseProps = {
  rank: 1,
  id: 'lavoro-abc',
  numero_lavoro: '2026/001',
  cliente_display: 'Studio Rossi',
  stato_fase_attuale: 'Finitura',
  completamento_perc: 78,
  data_consegna_prevista: '2026-05-22',
  ora_consegna: '18:30',
  colore_fase: 'gold' as const,
}

describe('TaskItem', () => {
  it('mostra cliente e numero lavoro', () => {
    render(<TaskItem {...baseProps} />)
    expect(screen.getByText('Studio Rossi')).toBeTruthy()
  })

  it('è un link al dettaglio lavoro', () => {
    render(<TaskItem {...baseProps} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/lavori/lavoro-abc')
  })

  it("mostra l'ora di consegna", () => {
    render(<TaskItem {...baseProps} />)
    expect(screen.getByText('18:30')).toBeTruthy()
  })

  it('progress bar ha larghezza proporzionale al completamento', () => {
    const { container } = render(<TaskItem {...baseProps} />)
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar?.getAttribute('aria-valuenow')).toBe('78')
    const fill = bar?.firstElementChild as HTMLElement
    expect(fill?.style.width).toBe('78%')
  })
})
