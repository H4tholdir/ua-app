import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BloccoAvviso } from '../../src/components/feedback/BloccoAvviso'

describe('BloccoAvviso — il blocco che dice cosa non va e cosa fare', () => {
  it('annuncia il contenuto alle tecnologie assistive', () => {
    render(<BloccoAvviso tipo="attesa" titolo="Manca un dato" testo="Serve la Partita IVA." />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('rende titolo e testo', () => {
    render(<BloccoAvviso tipo="attesa" titolo="Manca un dato" testo="Serve la Partita IVA." />)
    expect(screen.getByText('Manca un dato')).toBeInTheDocument()
    expect(screen.getByText('Serve la Partita IVA.')).toBeInTheDocument()
  })

  it('senza azione non rende nessun elemento premibile', () => {
    render(<BloccoAvviso tipo="guasto" titolo="Rotto" testo="Riprova più tardi." />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('con azione a collegamento rende un link col suo indirizzo', () => {
    render(
      <BloccoAvviso tipo="attesa" titolo="T" testo="X"
        azione={{ etichetta: 'Completa i dati', href: '/impostazioni' }} />,
    )
    expect(screen.getByRole('link', { name: 'Completa i dati' })).toHaveAttribute('href', '/impostazioni')
  })

  it('con azione a pressione chiama la funzione', () => {
    const premuto = vi.fn()
    render(<BloccoAvviso tipo="guasto" titolo="T" testo="X" azione={{ etichetta: 'Riprova', onClick: premuto }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Riprova' }))
    expect(premuto).toHaveBeenCalledTimes(1)
  })

  // 🛑 Il colore non è mai l'unica fonte di stato: ogni tipo porta la sua icona.
  it('ogni tipo porta un\'icona propria, non solo un colore', () => {
    const { container: attesa } = render(<BloccoAvviso tipo="attesa" titolo="T" testo="X" />)
    const { container: guasto } = render(<BloccoAvviso tipo="guasto" titolo="T" testo="X" />)
    expect(attesa.querySelector('svg')).not.toBeNull()
    expect(guasto.querySelector('svg')).not.toBeNull()
    expect(attesa.querySelector('svg')?.innerHTML).not.toBe(guasto.querySelector('svg')?.innerHTML)
  })

  // 🛑 Nessun testo nuovo su --t2/--t3: fallirebbero WCAG in modo scuro (P16).
  it('non usa --t2 né --t3 per il testo', () => {
    const { container } = render(<BloccoAvviso tipo="attesa" titolo="T" testo="X" />)
    expect(container.innerHTML).not.toContain('var(--t2')
    expect(container.innerHTML).not.toContain('var(--t3')
  })
})
