import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TabAccettazione } from '@/components/features/lavori/form/TabAccettazione'
import type { Lavoro } from '@/types/domain'

// Task 16 / spec §10 (riserva R1): il campo «N° cassetta» editabile MUORE dal
// form. La posizione fisica si assegna SOLO dalla Parete. Qui resta al più una
// riga di sola lettura + un link «Cambia dalla parete» → /cassette.

describe('TabAccettazione — morte del campo cassetta (R1)', () => {
  it('numero_cassetta presente → riga read-only «Cassetta {nome}» + link «Cambia dalla parete» a /cassette; NESSUN campo editabile', () => {
    render(
      <TabAccettazione data={{ numero_cassetta: 'C12' } as Partial<Lavoro>} onChange={vi.fn()} />
    )
    // Riga di sola lettura con il nome della cassetta.
    expect(screen.getByText('Cassetta C12')).toBeInTheDocument()
    // Link alla parete.
    const link = screen.getByRole('link', { name: /Cambia dalla parete/i })
    expect(link).toHaveAttribute('href', '/cassette')
    // Il vecchio campo editabile non esiste più.
    expect(screen.queryByLabelText('Numero cassetta')).toBeNull()
    expect(screen.queryByPlaceholderText('Es. 42')).toBeNull()
  })

  it('numero_cassetta assente → nessuna riga cassetta, nessun link, nessun campo editabile', () => {
    render(
      <TabAccettazione data={{ numero_cassetta: null } as Partial<Lavoro>} onChange={vi.fn()} />
    )
    expect(screen.queryByText(/^Cassetta /)).toBeNull()
    expect(screen.queryByRole('link', { name: /Cambia dalla parete/i })).toBeNull()
    expect(screen.queryByLabelText('Numero cassetta')).toBeNull()
  })

  it('onChange non riceve MAI numero_cassetta: non c\'è più un input che lo scriva', () => {
    const onChange = vi.fn()
    render(
      <TabAccettazione data={{ numero_cassetta: 'C12' } as Partial<Lavoro>} onChange={onChange} />
    )
    // Nessun campo editabile per la cassetta → nessuna via per emettere
    // onChange({ numero_cassetta }) dal render iniziale.
    for (const call of onChange.mock.calls) {
      expect(Object.prototype.hasOwnProperty.call(call[0], 'numero_cassetta')).toBe(false)
    }
  })
})
