// Task 10 — DS v3 §5.36 (spec 2026-07-21-parete-cassette-design.md). Test in
// tests/unit/ (risoluzione orchestratore 1), non in src/components/ds/__tests__/.
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MiniaturaLavoro } from '@/components/ds/MiniaturaLavoro'
import type { MiniaturaId } from '@/lib/domain/miniature-lavoro'

const RATIFICATE = ['corona', 'provvisorio', 'impianto', 'ponte', 'totale', 'scheletrato'] as const

describe('MiniaturaLavoro — le 6 ratificate 1:1 dal mockup (§5.36)', () => {
  it.each(RATIFICATE)('id "%s" renderizza il proprio simbolo, non il segnaposto generico', (id) => {
    const { container } = render(<MiniaturaLavoro id={id} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('data-miniatura-id', id)
  })

  it('due id ratificati diversi producono un markup diverso (i path non sono tutti uguali)', () => {
    const { container: a } = render(<MiniaturaLavoro id="corona" />)
    const { container: b } = render(<MiniaturaLavoro id="ponte" />)
    expect(a.querySelector('svg')?.innerHTML).not.toBe(b.querySelector('svg')?.innerHTML)
  })
})

describe('MiniaturaLavoro — le 4 nuove ratificate al gate Task 18 (scelte 22/07, due giri)', () => {
  // Gate SUPERATO: allineatore A (arco aperto tratteggiato), mascherina B (piena + cresta
  // occlusale), riparazione C (totale spezzata in due metà scostate/ruotate), generica D
  // (molare occlusale, solchi a Y). Non ricadono più sul segnaposto: ogni id rende il proprio
  // simbolo. Le asserzioni sono DISCRIMINANTI (un tratto geometrico presente solo in quel path,
  // preservato verbatim da React: `d`/`stroke-dasharray`, non attributi numerici normalizzati).
  it('allineatore → simbolo A (arco aperto tratteggiato), non il segnaposto', () => {
    const { container } = render(<MiniaturaLavoro id="allineatore" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('data-miniatura-id', 'allineatore')
    // arco aperto proprio della A + dasharray distinto (≠ provvisorio "3.2 2.4")
    expect(svg?.innerHTML).toContain('d="M6 23 C6 12.5')
    expect(svg?.innerHTML).toContain('stroke-dasharray="3.6 2.6"')
  })

  it('mascherina → simbolo B (ferro di cavallo pieno + cresta occlusale), non il segnaposto', () => {
    const { container } = render(<MiniaturaLavoro id="mascherina" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('data-miniatura-id', 'mascherina')
    // la cresta occlusale (piano di morso) è il tratto proprio della B, assente altrove
    expect(svg?.innerHTML).toContain('d="M7.2 23 C7.7 15')
  })

  it('riparazione → simbolo C (totale spezzata in due metà scostate/ruotate), non il segnaposto', () => {
    const { container } = render(<MiniaturaLavoro id="riparazione" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('data-miniatura-id', 'riparazione')
    // le due metà sono due <g> con transform — nessun altro simbolo usa <g>: discriminante strutturale
    expect(svg?.querySelectorAll('g')).toHaveLength(2)
  })

  it('generica → simbolo D (molare occlusale, solchi a Y) — non più il rettangolo segnaposto', () => {
    const { container } = render(<MiniaturaLavoro id="generica" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('data-miniatura-id', 'generica')
    // i solchi a Y della vista occlusale sono il tratto proprio della D…
    expect(svg?.innerHTML).toContain('d="M12 6.5 L12 11.6')
    // …e il segnaposto <rect> è sparito
    expect(svg?.querySelector('rect')).toBeNull()
  })

  it('i 4 nuovi simboli sono distinti l\'uno dall\'altro (markup diverso)', () => {
    const ids = ['allineatore', 'mascherina', 'riparazione', 'generica'] as const
    const markup = ids.map((id) => {
      const { container } = render(<MiniaturaLavoro id={id} />)
      return container.querySelector('svg')?.innerHTML
    })
    expect(new Set(markup).size).toBe(ids.length)
  })
})

describe('MiniaturaLavoro — difesa runtime su id sconosciuto (Lezione: mai un successo silenzioso)', () => {
  it('un id non nel catalogo (bypass di tipo, dato non validato a monte) ricade ESPLICITAMENTE sulla generica', () => {
    const idIgnoto = 'qualcosa-mai-visto' as unknown as MiniaturaId
    const { container } = render(<MiniaturaLavoro id={idIgnoto} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('data-miniatura-id', 'generica')
  })
})

describe('MiniaturaLavoro — dimensione e decoratività', () => {
  it('è aria-hidden: il significato lo porta l\'aria-label della Cassetta, non l\'icona', () => {
    const { container } = render(<MiniaturaLavoro id="corona" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('height di default 34 (mockup: .cavita svg { height: 34px })', () => {
    const { container } = render(<MiniaturaLavoro id="corona" />)
    expect(container.querySelector('svg')).toHaveStyle({ height: '34px' })
  })

  it('height è personalizzabile (es. 36 per la legenda del catalogo)', () => {
    const { container } = render(<MiniaturaLavoro id="corona" height={36} />)
    expect(container.querySelector('svg')).toHaveStyle({ height: '36px' })
  })
})
