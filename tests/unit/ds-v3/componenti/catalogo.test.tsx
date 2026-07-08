import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const initSuoniMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  initSuoni: () => initSuoniMock(),
}))

import CatalogoPage from '../../../../src/app/ds-v3-catalogo/page'
import { SezioneCatalogo } from '../../../../src/app/ds-v3-catalogo/CatalogoShell'

describe('catalogo DS v3 — skeleton (§14.2)', () => {
  beforeEach(() => {
    initSuoniMock.mockClear()
    document.documentElement.removeAttribute('data-theme')
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('monta data-ds="v3" — unico punto dell\'app che lo fa', () => {
    const { container } = render(<CatalogoPage />)
    expect(container.querySelector('[data-ds="v3"]')).not.toBeNull()
  })

  it('chiama initSuoni() post-mount (useEffect, mai in render)', () => {
    render(<CatalogoPage />)
    expect(initSuoniMock).toHaveBeenCalledTimes(1)
  })

  it('il toggle tema imposta data-theme="dark" su document.documentElement', () => {
    render(<CatalogoPage />)
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /tema/i }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('il toggle tema rimuove data-theme al secondo click', () => {
    render(<CatalogoPage />)
    const toggle = screen.getByRole('button', { name: /tema/i })
    fireEvent.click(toggle)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    fireEvent.click(toggle)
    expect(document.documentElement.getAttribute('data-theme')).toBeNull()
  })

  it('titolo + nota viewport presenti', () => {
    render(<CatalogoPage />)
    expect(screen.getByText(/Catalogo DS v3 — Una cosa alla volta/)).toBeInTheDocument()
  })

  it('SezioneCatalogo renderizza titolo, spec e children su sfondo var(--bg)', () => {
    render(
      <SezioneCatalogo titolo="Bottoni" spec="§5.1">
        <p>contenuto di prova</p>
      </SezioneCatalogo>
    )
    expect(screen.getByText('Bottoni')).toBeInTheDocument()
    expect(screen.getByText('§5.1')).toBeInTheDocument()
    expect(screen.getByText('contenuto di prova')).toBeInTheDocument()
  })

  it('tutti i testi statici del catalogo passano trovaParoleVietate', () => {
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})
