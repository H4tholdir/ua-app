import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavDesk } from '@/components/ds/NavDesk'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
const SEGNALE = { attenzione: false, forte: 'Tutto a posto:', testo: 'nessuna consegna oggi', azione: null }

describe('NavDesk (§5.35) — la nav sostituisce home+☰ su desktop', () => {
  it('voci pile con badge numerici + sezioni + Nuovo lavoro', () => {
    render(<NavDesk conteggi={{ rossa: 2, ambra: 4, viola: 1, blu: 2 }} pilaSelezionata="rossa" segnale={SEGNALE} />)
    // Niente flag `s` (dotAll): il target tsc del repo è ES2017 (TS1501 su `s`) —
    // il nome accessibile non contiene mai un vero newline fra nome e badge.
    expect(screen.getByRole('link', { name: /Oggi.*2/ })).toHaveAttribute('href', '/dashboard?pila=rossa')
    expect(screen.getByRole('link', { name: /Da rifare.*1/ })).toHaveAttribute('href', '/dashboard?pila=viola')
    expect(screen.getByRole('link', { name: 'Agenda' })).toHaveAttribute('href', '/agenda')
    expect(screen.getByRole('link', { name: 'Dentisti' })).toHaveAttribute('href', '/clienti')
    expect(screen.getByRole('button', { name: '+ Nuovo lavoro' })).toBeInTheDocument()
  })
})
