import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HomeV3 } from '@/components/features/home/HomeV3'
import type { PileHome } from '@/lib/dashboard/pile-home'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const SEGNALE = { attenzione: false, forte: 'Tutto a posto:', testo: '2 consegne oggi, la prossima alle 16:00', azione: null }
const lavoro = (numero: string): PileHome['liste']['rossa'][number] => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: true, consegna: { data: '2026-07-09', ora: '16:00:00' },
})
const PILE: PileHome = {
  liste: { rossa: [lavoro('147')], ambra: [], viola: [], blu: [] },
  sub: { rossa: 'n.147 alle 16', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: 'Nessun nuovo arrivo' },
  striscia: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 1, prossimaOra: '16:00' },
}

describe('HomeV3 — la home di legge (§7.1 + rev. 3.1)', () => {
  it('saluto, eyebrow, ☰, 4 pile in ordine di legge, TastoPiù', () => {
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} />)
    expect(screen.getByRole('heading', { name: /Buon pomeriggio.*Francesco/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutto il resto' })).toBeInTheDocument()
    const labels = ['DA CONSEGNARE OGGI', 'SUL BANCO', 'DA RIFARE / IN PROVA', 'APPENA ARRIVATI']
    const testi = labels.map((l) => screen.getByText(l))
    expect(testi).toHaveLength(4)
    // ordine nel DOM: rossa, ambra, viola, blu
    expect(testi[0].compareDocumentPosition(testi[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: /nuovo lavoro/i })).toBeInTheDocument()
  })

  it('tap sulla pila → /lavori?pila=…', async () => {
    const user = userEvent.setup()
    render(<HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} />)
    await user.click(screen.getByText('DA RIFARE / IN PROVA'))
    expect(push).toHaveBeenCalledWith('/lavori?pila=viola')
  })

  it('banco libero: con tutte le pile a 0 lo stack lascia il posto al blocco sereno (mockup stati-vuoti)', () => {
    const vuote: PileHome = { ...PILE, liste: { rossa: [], ambra: [], viola: [], blu: [] } }
    render(<HomeV3 nome="Francesco" eyebrow="Martedì 15 luglio" saluto="Buongiorno" pile={vuote} segnale={SEGNALE} />)
    expect(screen.getByText('Il banco è libero')).toBeInTheDocument()
    expect(screen.queryByText('DA CONSEGNARE OGGI')).not.toBeInTheDocument()
  })
})
