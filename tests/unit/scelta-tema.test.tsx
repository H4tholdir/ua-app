import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SceltaTema } from '@/components/features/impostazioni/SceltaTema'

function telefono(scuro: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: scuro && query.includes('dark'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('SceltaTema — l_unico punto in cui si blocca il tema', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.classList.remove('dark')
    telefono(false)
  })

  it('offre le tre scelte, con Automatico predefinita', () => {
    render(<SceltaTema />)

    expect(screen.getByRole('radio', { name: /automatico/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /sempre chiaro/i })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /sempre scuro/i })).not.toBeChecked()
  })

  it('scegliere scrive la preferenza e sposta la spunta', () => {
    render(<SceltaTema />)

    fireEvent.click(screen.getByRole('radio', { name: /sempre scuro/i }))

    expect(localStorage.getItem('ua-tema')).toBe('scuro')
    expect(screen.getByRole('radio', { name: /sempre scuro/i })).toBeChecked()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('con Automatico dice che cosa sta seguendo, e quale dei due e', () => {
    render(<SceltaTema />)

    expect(screen.getByText('Ora segue il telefono: chiaro.')).toBeInTheDocument()
  })

  it('con Automatico e telefono scuro lo dice giusto', () => {
    telefono(true)

    render(<SceltaTema />)

    expect(screen.getByText('Ora segue il telefono: scuro.')).toBeInTheDocument()
  })

  // La clausola «anche se il telefono è …» del mockup approvato: si dice SOLO
  // quando il blocco diverge davvero dal telefono. Dirla quando le due cose
  // coincidono sarebbe una frase falsa.
  it('quando il blocco diverge dal telefono, lo dichiara', () => {
    telefono(false)
    render(<SceltaTema />)

    fireEvent.click(screen.getByRole('radio', { name: /sempre scuro/i }))

    expect(screen.getByText('Bloccato sullo scuro, anche se il telefono è chiaro.')).toBeInTheDocument()
  })

  it('quando il blocco coincide col telefono, non aggiunge la clausola', () => {
    telefono(false)
    render(<SceltaTema />)

    fireEvent.click(screen.getByRole('radio', { name: /sempre chiaro/i }))

    expect(screen.getByText('Bloccato sul chiaro.')).toBeInTheDocument()
    expect(screen.queryByText(/anche se il telefono/i)).not.toBeInTheDocument()
  })

  it('scegliere Automatico rimette il telefono al comando', () => {
    telefono(true)
    render(<SceltaTema />)

    fireEvent.click(screen.getByRole('radio', { name: /sempre chiaro/i }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(screen.getByRole('radio', { name: /automatico/i }))

    expect(localStorage.getItem('ua-tema')).toBe('sistema')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(screen.getByText('Ora segue il telefono: scuro.')).toBeInTheDocument()
  })

  it('riapre sulla scelta gia fatta', () => {
    localStorage.setItem('ua-tema', 'scuro')

    render(<SceltaTema />)

    expect(screen.getByRole('radio', { name: /sempre scuro/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /automatico/i })).not.toBeChecked()
  })

  // DS v2.3, non v3 (regola di convivenza §14): /impostazioni non e' fra le
  // route migrate. Il colore del pallino deve venire dal token legacy.
  it('resta su DS v2.3: nessun token v3 addosso ai controlli', () => {
    const { container } = render(<SceltaTema />)

    const radio = container.querySelector('input[type="radio"]') as HTMLElement
    expect(radio.style.accentColor).toContain('--primary')
    expect(container.innerHTML).not.toContain('data-ds="v3"')
  })
})
