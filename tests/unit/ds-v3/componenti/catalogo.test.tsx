import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.35), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const initSuoniMock = vi.fn()
const suonaMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  initSuoni: () => initSuoniMock(),
  suona: (nome: string) => suonaMock(nome),
}))

import CatalogoPage, { INDICE } from '../../../../src/app/ds-v3-catalogo/page'
import { SezioneCatalogo } from '../../../../src/app/ds-v3-catalogo/CatalogoShell'

describe('catalogo DS v3 — skeleton (§14.2)', () => {
  beforeEach(() => {
    initSuoniMock.mockClear()
    suonaMock.mockClear()
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

  it('il catalogo è completo: 21 sezioni, tutte quelle attese nell\'ordine di legge §14.2', () => {
    expect(INDICE).toHaveLength(21)
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
      'Suoni',
      'Campo',
      'Il racconto',
      'PillVoce',
      'ChipScelta',
      'ProgressDots',
      'FotoStrip',
      'MenuVoce',
      'TastoWhatsApp',
      'RigaBloccante',
      'NavDesk',
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

describe('catalogo DS v3 — sezione «Suoni» (§9.1)', () => {
  beforeEach(() => {
    initSuoniMock.mockClear()
    suonaMock.mockClear()
    document.documentElement.removeAttribute('data-theme')
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('la sezione «Suoni» esiste, posizionata dopo «Avviso · Skeleton · Vuoto» e prima di «Campo»', () => {
    const indiciTitoli = INDICE.map((voce) => voce.titolo)
    const indiceSuoni = indiciTitoli.indexOf('Suoni')
    expect(indiceSuoni).toBeGreaterThan(-1)
    expect(indiciTitoli[indiceSuoni - 1]).toBe('Avviso · Skeleton · Vuoto')
    expect(indiciTitoli[indiceSuoni + 1]).toBe('Campo')
  })

  it('mostra i 5 tasti dell\'intera palette di legge (§9.1): Tap, Fatta, UÀ — la firma, Errore, Arrivo', () => {
    render(<CatalogoPage />)
    expect(screen.getByRole('button', { name: 'Tap' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fatta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UÀ — la firma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Errore' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Arrivo' })).toBeInTheDocument()
  })

  it.each([
    ['Tap', 'tap'],
    ['Fatta', 'fatta'],
    ['UÀ — la firma', 'ua'],
    ['Errore', 'errore'],
    ['Arrivo', 'arrivo'],
  ])('il tasto «%s» chiama suona(\'%s\') e SOLO quello — un suono per gesto, audizione pulita', (etichetta, nomeSuono) => {
    render(<CatalogoPage />)
    fireEvent.click(screen.getByRole('button', { name: etichetta }))
    // Esattamente UNA chiamata col solo nome atteso: un TastoSecondario qui
    // aggiungerebbe suona('tap') built-in prima dell'onClick, sporcando
    // l'audizione (tap+fatta insieme, tap due volte…) e contraddicendo la
    // didascalia della sezione («mai più di uno per gesto»).
    expect(suonaMock.mock.calls).toEqual([[nomeSuono]])
  })

  it('i tasti della sezione Suoni NON sono TastoSecondario (che suonerebbe tap built-in): bottoni semplici col chrome del catalogo', () => {
    const { container } = render(<CatalogoPage />)
    const sezione = container.querySelector('#suoni')
    expect(sezione).not.toBeNull()
    const bottoni = sezione?.querySelectorAll('button') ?? []
    expect(bottoni.length).toBe(5)
    for (const bottone of Array.from(bottoni)) {
      expect(bottone.className).not.toContain('ds-tasto-secondario')
      // Anello focus di legge via chrome del catalogo (constraint 9).
      expect(bottone.className).toContain('catalogo-interattivo')
    }
  })

  it('ogni tasto ha una didascalia che spiega quando suona nell\'app reale (non solo il nome del file)', () => {
    const { container } = render(<CatalogoPage />)
    const sezione = container.querySelector('#suoni')
    expect(sezione).not.toBeNull()
    // 5 suoni → almeno 5 paragrafi di didascalia oltre a quello introduttivo/di chiusura.
    const paragrafi = sezione?.querySelectorAll('p') ?? []
    expect(paragrafi.length).toBeGreaterThanOrEqual(5)
  })
})
