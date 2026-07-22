// Task 14/15 — la stanza Parete della home (spec 2026-07-21-parete-cassette-design.md §6).
// Test in tests/unit/ (decisione D-O1 dell'ondata): `src/**/__tests__/` non è nemmeno
// globbato da vitest.config.ts — sarebbe un RED finto.
//
// Task 15 — il cap NON è più un ingresso runtime (niente `capN`, niente misure): la stanza rende
// il superset tablet (`CAP_PARETE.tablet`) e il CSS nasconde sotto 768px le celle oltre
// `CAP_PARETE.mobile` (stessa meccanica CSS-driven della scala device-corti §7.1). jsdom NON valuta
// le @media: qui si presidia la STRUTTURA (quali celle portano la classe di taglio, il tile col
// suo badge), non la visibilità calcolata dal browser — quella è materia del gate L2.
//
// D-8 «in home si naviga, non si manipola»: qui NON esiste sheet. Tap su cassetta occupata →
// scheda lavoro; tap su cassetta libera → /cassette. Il long-press, che su /cassette apre lo
// sheet, in home deve ricadere sul tap: il test lo prova con i timer finti (il gesto vero,
// non un'asserzione sull'assenza di una prop).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StanzaParete, CAP_PARETE, pianoParete } from '@/components/features/home/StanzaParete'
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

// Una parete più lunga del cap tablet, per il caso «overflow su entrambi i viewport».
const PARETE_LUNGA: CassettaParete[] = [
  ...PARETE,
  cassetta('C30', 9, true),
  cassetta('C31', 10, false),
]

beforeEach(() => {
  push.mockClear()
})

// ── La logica pura del cap (house pattern: scegliSegnale/componiSezioni/deriveParete) ────────
describe('pianoParete — quante celle, quanto overflow, se serve il tile (puro)', () => {
  it('il cap è una costante, mobile 5 / tablet 8 — mai una misura runtime', () => {
    expect(CAP_PARETE).toEqual({ mobile: 5, tablet: 8 })
  })

  it('8 cassette: rende 8 celle (superset tablet), tile con +3 su mobile e nessun overflow tablet', () => {
    expect(pianoParete(8)).toEqual({ mostrate: 8, oltreMobile: 3, oltreTablet: 0, tile: true })
  })

  it('10 cassette: overflow su entrambi i viewport (+5 mobile, +2 tablet), sempre 8 celle', () => {
    expect(pianoParete(10)).toEqual({ mostrate: 10 > 8 ? 8 : 10, oltreMobile: 5, oltreTablet: 2, tile: true })
  })

  it('5 cassette esatte: nessun overflow, nessun tile', () => {
    expect(pianoParete(5)).toEqual({ mostrate: 5, oltreMobile: 0, oltreTablet: 0, tile: false })
  })

  it('6 cassette: overflow SOLO su mobile (il tile su tablet lo nasconde il CSS)', () => {
    expect(pianoParete(6)).toEqual({ mostrate: 6, oltreMobile: 1, oltreTablet: 0, tile: true })
  })
})

describe('StanzaParete — la testata (§6)', () => {
  it('eyebrow «Le cassette» e titolo «La parete ›» — la › è l’affordance, non parte del nome letto', () => {
    render(<StanzaParete parete={PARETE} />)
    expect(screen.getByText('Le cassette')).toBeInTheDocument()
    const titolo = screen.getByRole('button', { name: 'La parete' })
    expect(titolo).toBeInTheDocument()
    expect(titolo.textContent).toContain('›')
  })

  it('«La parete ›» porta a /cassette', async () => {
    const user = userEvent.setup()
    render(<StanzaParete parete={PARETE} />)
    await user.click(screen.getByRole('button', { name: 'La parete' }))
    expect(push).toHaveBeenCalledWith('/cassette')
  })

  it('il ☰ resta quello di sempre → /tutto-il-resto', async () => {
    const user = userEvent.setup()
    render(<StanzaParete parete={PARETE} />)
    await user.click(screen.getByRole('button', { name: 'Tutto il resto' }))
    expect(push).toHaveBeenCalledWith('/tutto-il-resto')
  })
})

describe('StanzaParete — cap anti-sfondamento + tile «Tutte le cassette ›» (Task 15)', () => {
  it('8 cassette: rende il superset (8 celle) — il taglio a mobile è del CSS, non del DOM', () => {
    render(<StanzaParete parete={PARETE} />)
    expect(screen.getAllByRole('button', { name: /^Cassetta / })).toHaveLength(8)
  })

  it('le celle oltre il cap mobile (dalla 6ª in poi) portano la classe di taglio; le prime 5 no', () => {
    render(<StanzaParete parete={PARETE} />)
    const cella = (nome: string) => screen.getByRole('button', { name: new RegExp(`Cassetta ${nome}`) }).closest('.ds-cella-parete-home')
    // prime 5 (indici 0..4): C12 C15 C21 C3 C7 — nessun taglio
    for (const n of ['C12', 'C15', 'C21', 'C3', 'C7']) expect(cella(n)).not.toHaveClass('is-oltre-mobile')
    // dalla 6ª (indici 5..7): C4 C9 C11 — tagliate su mobile
    for (const n of ['C4', 'C9', 'C11']) expect(cella(n)).toHaveClass('is-oltre-mobile')
  })

  it('con overflow: tile «Tutte le cassette ›» → /cassette, badge mobile «+3», nessun badge tablet', () => {
    render(<StanzaParete parete={PARETE} />)
    const tile = screen.getByRole('button', { name: 'Tutte le cassette' })
    expect(tile).toBeInTheDocument()
    expect(within(tile).getByText('+3')).toBeInTheDocument() // oltreMobile
    expect(within(tile).queryByText('+0')).not.toBeInTheDocument() // oltreTablet===0 → non renderizzato
    fireEvent.click(tile)
    expect(push).toHaveBeenCalledWith('/cassette')
  })

  it('overflow su entrambi i viewport: il tile porta ENTRAMBI i badge (+5 mobile, +2 tablet)', () => {
    render(<StanzaParete parete={PARETE_LUNGA} />)
    const tile = screen.getByRole('button', { name: 'Tutte le cassette' })
    expect(within(tile).getByText('+5')).toBeInTheDocument()
    expect(within(tile).getByText('+2')).toBeInTheDocument()
    // Il superset resta 8 celle-cassetta anche con 10 in parete.
    expect(screen.getAllByRole('button', { name: /^Cassetta / })).toHaveLength(8)
  })

  it('con cassette entro il cap mobile NESSUN tile, e nessuna cella tagliata', () => {
    render(<StanzaParete parete={PARETE.slice(0, 4)} />)
    expect(screen.queryByRole('button', { name: 'Tutte le cassette' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Cassetta / })).toHaveLength(4)
    for (const b of screen.getAllByRole('button', { name: /^Cassetta / })) {
      expect(b.closest('.ds-cella-parete-home')).not.toHaveClass('is-oltre-mobile')
    }
  })

  it("l'ordine è quello del muro: non si riordina nulla (arriva già ordinato da deriveParete)", () => {
    render(<StanzaParete parete={PARETE} />)
    const nomi = screen.getAllByRole('button', { name: /^Cassetta / }).map((b) => b.getAttribute('aria-label'))
    expect(nomi[0]).toMatch(/^Cassetta C12/)
    expect(nomi[1]).toMatch(/^Cassetta C15/)
    expect(nomi[2]).toMatch(/^Cassetta C21/)
  })
})

describe('StanzaParete — in home si naviga, non si manipola (D-8)', () => {
  it('tap su cassetta occupata → scheda del lavoro', () => {
    render(<StanzaParete parete={PARETE} />)
    const occupata = screen.getByRole('button', { name: /Cassetta C12/ })
    fireEvent.pointerDown(occupata, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(occupata, { clientX: 0, clientY: 0 })
    expect(push).toHaveBeenCalledWith('/lavori/lav-C12')
  })

  it('tap su cassetta libera → /cassette (la home non è un editor: nessuno sheet)', () => {
    render(<StanzaParete parete={PARETE} />)
    const libera = screen.getByRole('button', { name: /Cassetta C21/ })
    fireEvent.pointerDown(libera, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(libera, { clientX: 0, clientY: 0 })
    expect(push).toHaveBeenCalledWith('/cassette')
  })

  it('un long-press NON apre alcuno sheet: ricade sul tap e naviga comunque', () => {
    vi.useFakeTimers()
    try {
      render(<StanzaParete parete={PARETE} />)
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
    render(<StanzaParete parete={PARETE} />)
    for (const tray of screen.getAllByRole('button', { name: /^Cassetta / })) {
      expect(tray).toHaveAttribute('draggable', 'false')
    }
  })
})

describe('StanzaParete — parete vuota (§6)', () => {
  it('mai una stanza bianca: il Vuoto ds con la CTA verso /cassette', async () => {
    const user = userEvent.setup()
    render(<StanzaParete parete={[]} />)
    expect(screen.getByText('La tua parete è vuota')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Crea la prima cassetta' }))
    expect(push).toHaveBeenCalledWith('/cassette')
  })

  it("la guida parla «nell'ordine del tuo muro» — mai «identica al tuo muro» (dizionario d'ondata)", () => {
    render(<StanzaParete parete={[]} />)
    const testo = document.body.textContent ?? ''
    expect(testo).toContain("nell'ordine del tuo muro")
    expect(testo).not.toContain('identica al tuo muro')
  })
})

describe('StanzaParete — dizionario §2.3', () => {
  it('nessuna parola del software nei testi della stanza', () => {
    const { unmount } = render(<StanzaParete parete={PARETE} />)
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
    unmount()
    render(<StanzaParete parete={[]} />)
    expect(trovaParoleVietate(document.body.textContent ?? '')).toEqual([])
  })
})
