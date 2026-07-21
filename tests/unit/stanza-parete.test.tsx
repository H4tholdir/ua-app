// Task 14 — la stanza Parete della home (spec 2026-07-21-parete-cassette-design.md §6).
// Test in tests/unit/ (decisione D-O1 dell'ondata): `src/**/__tests__/` non è nemmeno
// globbato da vitest.config.ts — sarebbe un RED finto.
//
// D-8 «in home si naviga, non si manipola»: qui NON esiste sheet. Tap su cassetta occupata →
// scheda lavoro; tap su cassetta libera → /cassette. Il long-press, che su /cassette apre lo
// sheet, in home deve ricadere sul tap: il test lo prova con i timer finti (il gesto vero,
// non un'asserzione sull'assenza di una prop).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StanzaParete } from '@/components/features/home/StanzaParete'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

function cassetta(nome: string, posizione: number, occupata = false): CassettaParete {
  return {
    id: `id-${nome}`,
    nome,
    colore: 'rossa',
    posizione,
    lavoro: occupata
      ? { id: `lav-${nome}`, numero: `1${posizione}0`, dentista: 'Bianchi', paziente: 'PZ-1', tipoDispositivo: 'protesi_fissa', descrizione: 'corona zirconia' }
      : null,
  }
}

const PARETE: CassettaParete[] = [
  cassetta('C12', 1, true),
  cassetta('C15', 2, true),
  cassetta('C21', 3, false),
  cassetta('C3', 4, true),
  cassetta('C7', 5, false),
  cassetta('C4', 6, false),
  cassetta('C9', 7, true),
  cassetta('C11', 8, false),
]

beforeEach(() => {
  push.mockClear()
})

describe('StanzaParete — la testata (§6)', () => {
  it('eyebrow «Le cassette» e titolo «La parete ›» — la › è l’affordance, non parte del nome letto', () => {
    render(<StanzaParete parete={PARETE} capN={6} />)
    expect(screen.getByText('Le cassette')).toBeInTheDocument()
    const titolo = screen.getByRole('button', { name: 'La parete' })
    expect(titolo).toBeInTheDocument()
    expect(titolo.textContent).toContain('›')
  })

  it('«La parete ›» porta a /cassette', async () => {
    const user = userEvent.setup()
    render(<StanzaParete parete={PARETE} capN={6} />)
    await user.click(screen.getByRole('button', { name: 'La parete' }))
    expect(push).toHaveBeenCalledWith('/cassette')
  })

  it('il ☰ resta quello di sempre → /tutto-il-resto', async () => {
    const user = userEvent.setup()
    render(<StanzaParete parete={PARETE} capN={6} />)
    await user.click(screen.getByRole('button', { name: 'Tutto il resto' }))
    expect(push).toHaveBeenCalledWith('/tutto-il-resto')
  })
})

describe('StanzaParete — il cap anti-sfondamento (riserva ux B2)', () => {
  it('mostra le prime capN cassette e NON le altre: mai uno scroll interno nella home', () => {
    render(<StanzaParete parete={PARETE} capN={6} />)
    expect(screen.getByRole('button', { name: /Cassetta C12/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cassetta C4/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cassetta C9/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cassetta C11/ })).not.toBeInTheDocument()
  })

  it('con meno cassette del cap le mostra tutte', () => {
    render(<StanzaParete parete={PARETE.slice(0, 3)} capN={6} />)
    expect(screen.getAllByRole('button', { name: /^Cassetta / })).toHaveLength(3)
  })

  it("l'ordine è quello del muro: non si riordina nulla (arriva già ordinato da deriveParete)", () => {
    render(<StanzaParete parete={PARETE} capN={6} />)
    const nomi = screen.getAllByRole('button', { name: /^Cassetta / }).map((b) => b.getAttribute('aria-label'))
    expect(nomi[0]).toMatch(/^Cassetta C12/)
    expect(nomi[1]).toMatch(/^Cassetta C15/)
    expect(nomi[2]).toMatch(/^Cassetta C21/)
  })
})

describe('StanzaParete — in home si naviga, non si manipola (D-8)', () => {
  it('tap su cassetta occupata → scheda del lavoro', () => {
    render(<StanzaParete parete={PARETE} capN={6} />)
    const occupata = screen.getByRole('button', { name: /Cassetta C12/ })
    fireEvent.pointerDown(occupata, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(occupata, { clientX: 0, clientY: 0 })
    expect(push).toHaveBeenCalledWith('/lavori/lav-C12')
  })

  it('tap su cassetta libera → /cassette (la home non è un editor: nessuno sheet)', () => {
    render(<StanzaParete parete={PARETE} capN={6} />)
    const libera = screen.getByRole('button', { name: /Cassetta C21/ })
    fireEvent.pointerDown(libera, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(libera, { clientX: 0, clientY: 0 })
    expect(push).toHaveBeenCalledWith('/cassette')
  })

  it('un long-press NON apre alcuno sheet: ricade sul tap e naviga comunque', () => {
    vi.useFakeTimers()
    try {
      render(<StanzaParete parete={PARETE} capN={6} />)
      const occupata = screen.getByRole('button', { name: /Cassetta C12/ })
      fireEvent.pointerDown(occupata, { clientX: 0, clientY: 0 })
      vi.advanceTimersByTime(600)
      fireEvent.pointerUp(occupata, { clientX: 0, clientY: 0 })
      expect(push).toHaveBeenCalledWith('/lavori/lav-C12')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('nessuna cassetta è trascinabile in home: il riordino vive su /cassette', () => {
    render(<StanzaParete parete={PARETE} capN={6} />)
    for (const tray of screen.getAllByRole('button', { name: /^Cassetta / })) {
      expect(tray).toHaveAttribute('draggable', 'false')
    }
  })
})

describe('StanzaParete — parete vuota (§6)', () => {
  it('mai una stanza bianca: il Vuoto ds con la CTA verso /cassette', async () => {
    const user = userEvent.setup()
    render(<StanzaParete parete={[]} capN={6} />)
    expect(screen.getByText('La tua parete è vuota')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crea la prima cassetta' }))
    expect(push).toHaveBeenCalledWith('/cassette')
  })

  it("la guida parla «nell'ordine del tuo muro» — mai «identica al tuo muro» (dizionario d'ondata)", () => {
    render(<StanzaParete parete={[]} capN={6} />)
    const testo = document.body.textContent ?? ''
    expect(testo).toContain("nell'ordine del tuo muro")
    expect(testo).not.toContain('identica al tuo muro')
  })
})

describe('StanzaParete — dizionario §2.3', () => {
  it('nessuna parola del software nei testi della stanza', () => {
    const { unmount } = render(<StanzaParete parete={PARETE} capN={6} />)
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
    unmount()
    render(<StanzaParete parete={[]} capN={6} />)
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
  })
})
