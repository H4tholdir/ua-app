import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SpotlightCard } from '../../src/components/features/dashboard/SpotlightCard'

describe('SpotlightCard', () => {
  const props = {
    lavoro_id: 'abc123',
    numero_lavoro: '2026/0002',
    cliente_display: 'ESPOSITO MASSIMO',
    descrizione_problema: 'Impronta non idonea',
    data_consegna_prevista: '2026-05-22',
    ora_consegna: '17:00',
    tipo: 'blocco' as const,
    timestamp_segnalazione: '2026-05-22T14:00:00Z',
  }

  it('mostra il titolo del problema', () => {
    render(<SpotlightCard {...props} />)
    expect(screen.getByText('Impronta non idonea')).toBeTruthy()
  })

  it('mostra il cliente', () => {
    render(<SpotlightCard {...props} />)
    expect(screen.getByText(/ESPOSITO MASSIMO/)).toBeTruthy()
  })

  it('CTA è un link al lavoro', () => {
    render(<SpotlightCard {...props} />)
    const link = screen.getByRole('link', { name: /risolvi/i })
    expect(link.getAttribute('href')).toBe('/lavori/abc123')
  })

  it('non renderizza se tipo è assente', () => {
    const { container } = render(<SpotlightCard {...props} tipo={null as never} />)
    expect(container.firstChild).toBeNull()
  })
})
