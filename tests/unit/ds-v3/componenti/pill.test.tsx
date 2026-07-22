import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'

// Timeout 15s (flake di classe — diagnosi .superpowers/sdd/diagnosi-flake-vitest.md):
// il PRIMO render della pagina catalogo in questo file costa ~0.5s da solo; sotto
// contesa multi-worker del pool (suite parallele sui core) il tempo di parete sfora
// i 5s di default. È lavoro CPU sincrono legittimo, non un'animazione da rendere
// deterministica (quelle sono già spente suite-wide in tests/setup.ts): si calibra
// il budget — stesso pattern di avviso-caricamento-vuoto.test.tsx.
vi.setConfig({ testTimeout: 15_000 })

// Il catalogo (page.tsx) monta ora anche NavDesk (§5.37), che chiama
// useRouter() per «+ Nuovo lavoro»: senza mock, il render fuori da un vero
// App Router lancia "invariant expected app router to be mounted" e fa
// cadere l'intero albero. Stesso pattern di NavDesk.test.tsx.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const suonaMock = vi.fn()
const vibraMock = vi.fn()
vi.mock('@/design-system/v3/sound', () => ({
  suona: (nome: string) => suonaMock(nome),
  initSuoni: () => {},
}))
vi.mock('@/design-system/v3/haptic', () => ({
  vibra: (tipo: string) => vibraMock(tipo),
}))

import { PillTempo, PillStato, type StatoBanco } from '@/components/ds/Pill'
import { PillFase } from '@/components/ds/PillFase'

const TUTTI_GLI_STATI: StatoBanco[] = [
  'DA CONSEGNARE',
  'IN FORNO',
  'IN RIFINITURA',
  'APPENA ARRIVATO',
  'PRONTA ✓',
  'CONSEGNATO ✓',
  'DA INCASSARE',
  'INCASSATA ✓',
  'INVIATA ✓',
  'STA PER FINIRE',
]

describe('PillTempo — indicatore di tempo (§5.9)', () => {
  it('renderizza il testo passato come children', () => {
    render(<PillTempo famiglia="red">OGGI · 15:00</PillTempo>)
    expect(screen.getByText('OGGI · 15:00')).toBeInTheDocument()
  })

  it('non è un elemento interattivo: nessun ruolo button', () => {
    render(<PillTempo famiglia="green">TRA 3 GIORNI</PillTempo>)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('applica tinta di sfondo e colore testo della famiglia passata, per tutte e 4 le famiglie', () => {
    const famiglie = ['red', 'amber', 'blue', 'green'] as const
    for (const famiglia of famiglie) {
      const { container, unmount } = render(<PillTempo famiglia={famiglia}>X</PillTempo>)
      const el = container.querySelector('span')!
      expect(el.style.background).toBe(`var(--${famiglia}-tint)`)
      expect(el.style.color).toBe(`var(--${famiglia})`)
      unmount()
    }
  })
})

describe('PillStato — vocabolario chiuso (§5.9)', () => {
  it('mappa la famiglia colore corretta per almeno 4 stati (uno per famiglia)', () => {
    const casi: Array<[StatoBanco, 'red' | 'amber' | 'blue' | 'green']> = [
      ['DA CONSEGNARE', 'red'],
      ['IN FORNO', 'amber'],
      ['APPENA ARRIVATO', 'blue'],
      ['PRONTA ✓', 'green'],
    ]
    for (const [stato, famiglia] of casi) {
      const { container, unmount } = render(<PillStato stato={stato} />)
      const el = container.querySelector('span')!
      expect(el.style.background).toBe(`var(--${famiglia}-tint)`)
      expect(el.style.color).toBe(`var(--${famiglia})`)
      unmount()
    }
  })

  it('la mappa stato→famiglia è quella di legge per l\'intero vocabolario', () => {
    const attese: Record<StatoBanco, 'red' | 'amber' | 'blue' | 'green' | 'purple'> = {
      'DA CONSEGNARE': 'red',
      'STA PER FINIRE': 'red',
      'IN FORNO': 'amber',
      'IN RIFINITURA': 'amber',
      'DA INCASSARE': 'amber',
      'APPENA ARRIVATO': 'blue',
      'PRONTA ✓': 'green',
      'CONSEGNATO ✓': 'green',
      'INCASSATA ✓': 'green',
      'INVIATA ✓': 'green',
      'IN PROVA': 'purple',
      'FERMO': 'amber',
    }
    for (const stato of TUTTI_GLI_STATI) {
      const { container, unmount } = render(<PillStato stato={stato} />)
      const el = container.querySelector('span')!
      const famiglia = attese[stato]
      expect(el.style.background, stato).toBe(`var(--${famiglia}-tint)`)
      expect(el.style.color, stato).toBe(`var(--${famiglia})`)
      unmount()
    }
  })

  it('non è un elemento interattivo: nessun ruolo button', () => {
    render(<PillStato stato="IN FORNO" />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('gli stati sono leggibili come testo (L3): il nome dello stato è nel DOM, non solo colore', () => {
    for (const stato of TUTTI_GLI_STATI) {
      const { unmount } = render(<PillStato stato={stato} />)
      expect(screen.getByText(stato)).toBeInTheDocument()
      unmount()
    }
  })

  it('il vocabolario chiuso degli stati passa trovaParoleVietate', () => {
    for (const stato of TUTTI_GLI_STATI) {
      expect(trovaParoleVietate(stato)).toEqual([])
    }
  })
})

describe('PillFase — chiude una fase (§5.4)', () => {
  beforeEach(() => {
    suonaMock.mockClear()
    vibraMock.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renderizza il default "FATTA ✓"', () => {
    render(<PillFase onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'FATTA ✓' })).toBeInTheDocument()
  })

  it('supporta children custom al posto del default', () => {
    render(<PillFase onClick={() => {}}>PROVA FATTA ✓</PillFase>)
    expect(screen.getByRole('button', { name: 'PROVA FATTA ✓' })).toBeInTheDocument()
  })

  it('click chiama onClick + suona("fatta") + vibra("success")', () => {
    const onClick = vi.fn()
    render(<PillFase onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'FATTA ✓' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(suonaMock).toHaveBeenCalledWith('fatta')
    expect(vibraMock).toHaveBeenCalledWith('success')
  })

  it('anello focus-visible di legge (2px --blue, offset 2) è di proprietà del componente stesso', () => {
    const { container } = render(<PillFase onClick={() => {}} />)
    const regola = container.querySelector('style')?.textContent ?? ''
    expect(regola).toContain('outline: 2px solid var(--blue)')
    expect(regola).toContain('outline-offset: 2px')
  })

  it('il testo di default passa trovaParoleVietate', () => {
    const { container } = render(<PillFase onClick={() => {}} />)
    expect(trovaParoleVietate(container.textContent ?? '')).toEqual([])
  })
})

describe('catalogo DS v3 — sezione «Pill»', () => {
  it('il catalogo mostra la sezione «Pill» con PillTempo, PillStato (vocabolario intero) e PillFase', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    expect(screen.getByRole('heading', { name: /^Pill$/ })).toBeInTheDocument()
    for (const stato of TUTTI_GLI_STATI) {
      expect(screen.getAllByText(stato).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByRole('button', { name: 'FATTA ✓' }).length).toBeGreaterThan(0)
  })

  it('tutti i testi statici del catalogo (inclusa la sezione Pill) passano trovaParoleVietate', async () => {
    const CatalogoPage = (await import('../../../../src/app/ds-v3-catalogo/page')).default
    render(<CatalogoPage />)
    const testo = document.body.textContent ?? ''
    expect(trovaParoleVietate(testo)).toEqual([])
  })
})
