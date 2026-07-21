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

describe('MiniaturaLavoro — le 4 nuove ricadono sul segnaposto (Task 18 non ancora ratificato)', () => {
  it.each(['allineatore', 'mascherina', 'riparazione', 'generica'] as const)(
    'id "%s" renderizza il segnaposto generico (data-miniatura-id="generica")',
    (id) => {
      const { container } = render(<MiniaturaLavoro id={id} />)
      const svg = container.querySelector('svg')
      expect(svg).toHaveAttribute('data-miniatura-id', 'generica')
    }
  )
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
