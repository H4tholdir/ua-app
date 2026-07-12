import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PilaAperta } from '@/components/features/pile/PilaAperta'
import type { LavoroPila } from '@/lib/dashboard/pile-home'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, back: vi.fn() }) }))
beforeEach(() => push.mockClear())

const lav = (numero: string, extra: Partial<LavoroPila> = {}): LavoroPila => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: false, consegna: { data: '2026-07-09', ora: '16:00:00' }, rientro: null, ...extra,
})

describe('PilaAperta — la lista di legge (§4.1)', () => {
  it('morph header + card in ordine · tap card → scheda', async () => {
    render(<PilaAperta pila="rossa" sub="2 lavori · il più vicino alle 16:00" lista={[lav('144', { consegnabile: true, pill: { testo: 'DA IERI', famiglia: 'red' } }), lav('147')]} />)
    expect(screen.getByText('2 lavori · il più vicino alle 16:00')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apri lavoro n.147' }))
    expect(push).toHaveBeenCalledWith('/lavori/l147')
  })

  it('TastoConsegnaInline SOLO sul primo elemento consegnabile della rossa → /lavori/[id]/consegna (P3)', async () => {
    render(<PilaAperta pila="rossa" sub="x" lista={[lav('144', { consegnabile: true }), lav('147', { consegnabile: true })]} />)
    const tasti = screen.getAllByRole('button', { name: 'CONSEGNA' })
    expect(tasti).toHaveLength(1)
    await userEvent.setup().click(tasti[0])
    expect(push).toHaveBeenCalledWith('/lavori/l144/consegna')
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

  it('pila vuota: morph a 0 senza sub + messaggio quieto (mockup stati-vuoti)', () => {
    render(<PilaAperta pila="ambra" lista={[]} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Niente sul banco')).toBeInTheDocument()
  })
})
