import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PilaAperta } from '@/components/features/pile/PilaAperta'
import type { LavoroPila } from '@/lib/dashboard/pile-home'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }))
beforeEach(() => push.mockClear())

// Review finding G1 (fix-list FIX-G) — `PilaAperta` è il root client SEMPRE montato di
// `/lavori` (l'altro root, `PilaSplit`, resta solo CSS-hidden sotto i 768px: v.
// `.ua-lavori-mobile`/`.ua-lavori-split` in `lavori/page.tsx`/`PilaSplit.tsx`), ma renderizza
// `CardLavoro`/`TastoTondo` — entrambi chiamano `suona('tap')` — senza che nulla a monte
// avesse mai chiamato `initSuoni()`: primo tap muto, stesso bug di G1 su `/dashboard`
// (HomeV3.tsx). Stesso fix, stesso posto: il mount della home client di questa route.
const { initSuoniSpy } = vi.hoisted(() => ({ initSuoniSpy: vi.fn() }))
vi.mock('@/design-system/v3/sound', async (importOriginal) => {
  const reale = await importOriginal<typeof import('@/design-system/v3/sound')>()
  return { ...reale, initSuoni: initSuoniSpy }
})

describe('PilaAperta — motore audio al mount (G1, review FIX-G)', () => {
  beforeEach(() => { initSuoniSpy.mockClear() })

  it('chiama initSuoni() al mount — root client sempre montato di /lavori', () => {
    render(<PilaAperta pila="rossa" sub="2 lavori" lista={[]} />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })
})

const lav = (numero: string, extra: Partial<LavoroPila> = {}): LavoroPila => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  cassetta: null,
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: false, consegna: { data: '2026-07-09', ora: '16:00:00' }, rientro: null,
  fasi: [], tecnico: null, ...extra,
})

describe('PilaAperta — la lista di legge (§4.1)', () => {
  it('morph header + card in ordine · tap card → scheda', async () => {
    render(<PilaAperta pila="rossa" sub="2 lavori · il più vicino alle 16:00" lista={[lav('144', { consegnabile: true, pill: { testo: 'DA IERI', famiglia: 'red' } }), lav('147')]} />)
    expect(screen.getByText('2 lavori · il più vicino alle 16:00')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apri lavoro n.147' }))
    expect(push).toHaveBeenCalledWith('/lavori/l147')
  })

  it('TastoConsegnaInline SOLO sul primo elemento consegnabile della rossa (P3)', () => {
    // Il flusso di tap (apre `FlussoConsegna` in-place, niente più navigazione
    // a /lavori/[id]/consegna) è coperto end-to-end da
    // `tests/unit/pile/pile-consegna-inline.test.tsx` (Task 14) con fetch
    // mockata — qui resta solo l'invariante «un solo tasto, sul primo
    // consegnabile».
    render(<PilaAperta pila="rossa" sub="x" lista={[lav('144', { consegnabile: true }), lav('147', { consegnabile: true })]} />)
    const tasti = screen.getAllByRole('button', { name: 'CONSEGNA' })
    expect(tasti).toHaveLength(1)
  })

  it('pila blu: CTA Conferma su OGNI card → scheda (P4)', () => {
    render(<PilaAperta pila="blu" sub="x" lista={[lav('151', { pill: { testo: 'APPENA ARRIVATO', famiglia: 'blue' } }), lav('152', { pill: { testo: 'APPENA ARRIVATO', famiglia: 'blue' } })]} />)
    expect(screen.getAllByRole('button', { name: 'Conferma' })).toHaveLength(2)
  })

  it('RigaCerca compare SOLO oltre 15 lavori e filtra per contains', async () => {
    const tanti = Array.from({ length: 16 }, (_, i) => lav(String(200 + i), { tipoLavoro: i === 3 ? 'Scheletrato' : 'Corona' }))
    render(<PilaAperta pila="ambra" sub="x" lista={tanti} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cerca/i }))
    await user.type(screen.getByRole('textbox'), 'schele')
    expect(screen.getByText(/n\.203/)).toBeInTheDocument()
    expect(screen.queryByText(/n\.204/)).not.toBeInTheDocument()
  })

  it('Task 10 (O1c) — con ricerca aperta, il bottone «Chiudi ricerca» richiude il campo e riporta RigaCerca', async () => {
    const tanti = Array.from({ length: 16 }, (_, i) => lav(String(200 + i)))
    render(<PilaAperta pila="ambra" sub="x" lista={tanti} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /cerca/i }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cerca fra tutti/i })).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Chiudi ricerca' }))
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByRole('button', { name: /cerca fra tutti/i })).toBeInTheDocument()
  })

  it('pila vuota: morph a 0 senza sub + messaggio quieto (mockup stati-vuoti)', () => {
    render(<PilaAperta pila="ambra" lista={[]} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Niente sul banco')).toBeInTheDocument()
  })
})
