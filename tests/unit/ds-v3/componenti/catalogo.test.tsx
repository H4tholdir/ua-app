import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

const initSuoniMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  initSuoni: () => initSuoniMock(),
}))

import CatalogoPage, { INDICE } from '../../../../src/app/ds-v3-catalogo/page'
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

  it('stato iniziale sincronizzato col tema reale: data-theme="dark" pre-esistente → toggle su scuro', () => {
    // ThemeInitializer (root layout) imposta data-theme prima dell'hydration:
    // il toggle deve leggere il DOM post-mount, non assumere chiaro.
    document.documentElement.setAttribute('data-theme', 'dark')
    render(<CatalogoPage />)
    const toggle = screen.getByRole('button', { name: /tema/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle.textContent).toMatch(/scuro/i)
  })

  it('stato iniziale con data-theme="light" esplicito (ThemeInitializer) → toggle su chiaro', () => {
    document.documentElement.setAttribute('data-theme', 'light')
    render(<CatalogoPage />)
    const toggle = screen.getByRole('button', { name: /tema/i })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(toggle.textContent).toMatch(/chiaro/i)
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

  it('il toggle ha l\'anello focus-visible di legge (2px --blue, offset 2)', () => {
    const { container } = render(<CatalogoPage />)
    const toggle = screen.getByRole('button', { name: /tema/i })
    expect(toggle.className).toContain('catalogo-interattivo')
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('.catalogo-interattivo:focus-visible')
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
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

  it('il catalogo è completo: 13 sezioni, tutte quelle attese nell\'ordine di legge §14.2', () => {
    expect(INDICE).toHaveLength(13)
    expect(INDICE.map((voce) => voce.titolo)).toEqual([
      'TastoPrimario',
      'Tasti secondari e vie di fuga',
      'TastoPiu',
      'Pill',
      'Tile · Avatar · Cerca',
      'Pila · StrisciaStato',
      'CardLavoro',
      'CardInfo · RigaFase',
      'Sheet · DialogConferma',
      'Avviso · Skeleton · Vuoto',
      'Campo',
      'Il racconto',
      'PillVoce',
    ])
  })

  it('ogni voce dell\'indice ha un\'ancora <nav> e una sezione con lo stesso id nel DOM', () => {
    const { container } = render(<CatalogoPage />)
    const nav = container.querySelector('nav[aria-label="Indice del catalogo"]')
    expect(nav).not.toBeNull()
    for (const { id, titolo } of INDICE) {
      expect(nav?.querySelector(`a[href="#${id}"]`)).not.toBeNull()
      const sezione = container.querySelector(`#${id}`)
      expect(sezione, `sezione mancante per id="${id}" (${titolo})`).not.toBeNull()
      expect(sezione?.tagName).toBe('SECTION')
    }
  })

  it('il footer riporta versione DS e data', () => {
    render(<CatalogoPage />)
    expect(
      screen.getByText('DS v3 «Una cosa alla volta» — catalogo componenti · luglio 2026')
    ).toBeInTheDocument()
  })
})
