// Task 11 — PareteClient: la parete viva di `/cassette` (§5, spec
// 2026-07-21-parete-cassette-design.md). Test in tests/unit/ (D-O1).
//
// NB: `Cassetta` non ha `onClick` — reagisce a pointerdown/pointerup (§5.35, gesto
// tap/long-press). Un `fireEvent.click` NON chiama `onTap`: qui si usa la stessa coppia di
// eventi di `tests/unit/Cassetta.test.tsx`.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PareteClient } from '@/components/features/cassette/PareteClient'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, back: vi.fn() }) }))
beforeEach(() => { push.mockClear(); refresh.mockClear() })

const occupata: CassettaParete = {
  id: 'c-a', nome: 'C12', colore: 'rossa', posizione: 0,
  lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42', tipoDispositivo: 'protesi_fissa', descrizione: 'Corona zirconia' },
}
const libera: CassettaParete = { id: 'c-b', nome: 'C4', colore: 'grigia', posizione: 1, lavoro: null }

const cassettaOccupata = () => screen.getByRole('button', { name: /^Cassetta C12/ })
const cassettaLibera = () => screen.getByRole('button', { name: 'Cassetta C4, libera' })

function tap(elemento: HTMLElement) {
  fireEvent.pointerDown(elemento, { clientX: 0, clientY: 0 })
  fireEvent.pointerUp(elemento, { clientX: 0, clientY: 0 })
}

describe('PareteClient — la parete e il suo chrome (§5)', () => {
  it('rende titolo, ricerca e le cassette nell\'ordine ricevuto (nessun riordino a valle di getParete)', () => {
    render(<PareteClient parete={[occupata, libera]} />)
    expect(screen.getByRole('heading', { name: 'Le cassette' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…')).toBeInTheDocument()
    const nomi = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))
    expect(nomi).toEqual(expect.arrayContaining(['Cassetta C4, libera']))
    expect(nomi.findIndex((n) => n?.startsWith('Cassetta C12'))).toBeLessThan(nomi.indexOf('Cassetta C4, libera'))
  })

  it('‹ torna alla home e ☰ apre «Tutto il resto» (provenienza multipla: push, mai back)', async () => {
    render(<PareteClient parete={[occupata]} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(push).toHaveBeenCalledWith('/dashboard')
    await user.click(screen.getByRole('button', { name: 'Tutto il resto' }))
    expect(push).toHaveBeenCalledWith('/tutto-il-resto')
  })
})

describe('PareteClient — la ricerca che accende (§5.1)', () => {
  it('la query accende chi matcha e spegne gli altri, e lo DICE (aria-live, mai solo colore)', async () => {
    render(<PareteClient parete={[occupata, libera]} />)
    await userEvent.setup().type(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), 'zirconia')

    expect(cassettaOccupata()).toHaveAttribute('aria-current', 'true')
    expect(cassettaOccupata().className).toContain('is-accesa')
    expect(cassettaLibera()).not.toHaveAttribute('aria-current')
    expect(cassettaLibera().className).toContain('is-spenta')
    expect(screen.getByRole('status')).toHaveTextContent('1 cassetta accesa')
  })

  it('senza query nessuna cassetta è accesa o spenta, e l\'annuncio tace', () => {
    render(<PareteClient parete={[occupata, libera]} />)
    expect(cassettaOccupata().className).not.toContain('is-accesa')
    expect(cassettaLibera().className).not.toContain('is-spenta')
    // `toHaveTextContent('')` passerebbe con QUALUNQUE testo (match per
    // sottostringa vuota): il silenzio si asserisce sull'elemento vuoto.
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('più match → plurale «2 cassette accese»', async () => {
    render(<PareteClient parete={[occupata, { ...libera, nome: 'C121' }]} />)
    await userEvent.setup().type(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), 'C12')
    expect(screen.getByRole('status')).toHaveTextContent('2 cassette accese')
  })

  it('zero match → riga quieta «Niente per “…”» e parete tutta spenta (L5: non si nasconde niente)', async () => {
    render(<PareteClient parete={[occupata, libera]} />)
    await userEvent.setup().type(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), 'xyz')
    expect(screen.getByRole('status')).toHaveTextContent('Niente per “xyz”')
    expect(cassettaOccupata().className).toContain('is-spenta')
    expect(cassettaLibera().className).toContain('is-spenta')
  })
})

describe('PareteClient — i tap (§5, semantica gesti §5.35)', () => {
  it('tap su cassetta occupata → scheda del lavoro', () => {
    render(<PareteClient parete={[occupata, libera]} />)
    tap(cassettaOccupata())
    expect(push).toHaveBeenCalledWith('/lavori/l1')
  })

  it('una cassetta SPENTA resta tappabile (mai pointer-events:none — §8.2)', async () => {
    render(<PareteClient parete={[occupata, libera]} />)
    await userEvent.setup().type(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), 'C4')
    const spenta = cassettaOccupata()
    expect(spenta.className).toContain('is-spenta')
    expect(spenta).not.toBeDisabled()
    tap(spenta)
    expect(push).toHaveBeenCalledWith('/lavori/l1')
  })

  it('tap su cassetta libera NON naviga: apre l\'intento sheet (il corpo arriva col Task 12)', () => {
    render(<PareteClient parete={[occupata, libera]} />)
    tap(cassettaLibera())
    expect(push).not.toHaveBeenCalled()
  })

  it('la tile «+ Nuova cassetta» dichiara il suo sheet e ne riflette lo stato', async () => {
    render(<PareteClient parete={[occupata]} />)
    const tile = screen.getByRole('button', { name: /Nuova cassetta/ })
    expect(tile).toHaveAttribute('aria-haspopup', 'dialog')
    expect(tile).toHaveAttribute('aria-expanded', 'false')
    await userEvent.setup().click(tile)
    expect(tile).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('PareteClient — parete vuota e freschezza', () => {
  it('zero cassette → Vuoto ds con la CTA che apre lo sheet «nuova» (mai una pagina bianca)', async () => {
    render(<PareteClient parete={[]} />)
    expect(screen.getByRole('heading', { name: 'La tua parete è vuota' })).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Cerca una cassetta o un lavoro…')).toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Crea la prima cassetta' }))
  })

  it('§5.5 freschezza — la parete si rilegge quando la pagina torna in primo piano', () => {
    render(<PareteClient parete={[occupata]} />)
    expect(refresh).not.toHaveBeenCalled()
    fireEvent(document, new Event('visibilitychange'))
    expect(refresh).toHaveBeenCalledTimes(1)
    fireEvent(window, new Event('focus'))
    expect(refresh).toHaveBeenCalledTimes(2)
  })
})
