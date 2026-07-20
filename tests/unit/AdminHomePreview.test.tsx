import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AdminHomePreview } from '@/components/features/admin/AdminHomePreview'
import type { PileHome } from '@/lib/dashboard/pile-home'

const lavoro = (numero: string): PileHome['liste']['rossa'][number] => ({
  id: `l${numero}`, numero, dentista: 'Dr. Esposito', paziente: 'PZ-0412', tipoLavoro: 'Corona zirconia',
  cassetta: null,
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' }, consegnabile: true, consegna: { data: '2026-07-12', ora: '16:00:00' }, rientro: null,
  fasi: [], tecnico: null,
})
const PILE: PileHome = {
  liste: { rossa: [lavoro('147')], ambra: [], viola: [], blu: [lavoro('148'), lavoro('149')] },
  sub: { rossa: 'n.147 alle 16', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: '2 nuovi arrivi' },
  striscia: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 1, prossimaOra: '16:00' },
}
const SEGNALE_CON_AZIONE = {
  attenzione: true,
  forte: 'Fattura n.QAT/1',
  testo: 'scartata',
  azione: { etichetta: 'Sistemala ›', href: '/fatture/abc123' },
}

describe('AdminHomePreview — anteprima admin sola lettura di Home v3', () => {
  it('mostra saluto, le quattro pile (stesse card di Home v3) coi conteggi reali', () => {
    render(<AdminHomePreview nome="Studio Bianchi" eyebrow="Domenica 12 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE_CON_AZIONE} />)
    expect(screen.getByRole('heading', { name: /Buon pomeriggio.*Studio Bianchi/ })).toBeInTheDocument()
    expect(screen.getByText('DA CONSEGNARE OGGI')).toBeInTheDocument()
    expect(screen.getByText('SUL BANCO')).toBeInTheDocument()
    expect(screen.getByText('DA RIFARE / IN PROVA')).toBeInTheDocument()
    expect(screen.getByText('APPENA ARRIVATI')).toBeInTheDocument()
    // conteggi reali dalle liste (rossa=1, ambra=0, viola=0, blu=2)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(2)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('le pile sono card reali ma inert: non focalizzabili, escluse dall\'albero interattivo', () => {
    render(<AdminHomePreview nome="Studio Bianchi" eyebrow="Domenica 12 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE_CON_AZIONE} />)
    // `hidden: true` bypassa il filtro di accessibilità di testing-library (che
    // NON conosce `inert`, solo `hidden`/`aria-hidden`/`display:none`) — qui
    // vogliamo trovarle per verificare esplicitamente che il contenitore che
    // le racchiude sia `inert`, il vero meccanismo che le rende non
    // raggiungibili da tastiera/puntatore in un browser reale.
    const bottoniPila = screen.getAllByRole('button', { hidden: true })
    expect(bottoniPila).toHaveLength(4)
    bottoniPila.forEach((b) => {
      expect(b.closest('[inert]')).not.toBeNull()
    })
  })

  it('nessun link di navigazione tenant: la striscia non monta mai la sua CTA qui', () => {
    render(<AdminHomePreview nome="Studio Bianchi" eyebrow="Domenica 12 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE_CON_AZIONE} />)
    expect(screen.queryAllByRole('link', { hidden: true })).toHaveLength(0)
  })

  it('striscia di stato visibile ma senza CTA, anche se il segnale ne porta una', () => {
    render(<AdminHomePreview nome="Studio Bianchi" eyebrow="Domenica 12 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE_CON_AZIONE} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('scartata')).toBeInTheDocument()
    // l'etichetta della CTA del segnale non deve comparire: niente azione qui
    expect(screen.queryByText('Sistemala ›')).not.toBeInTheDocument()
  })

  it('segnale senza azione (caso comune) resta invariato — nessuna CTA neanche qui', () => {
    const segnaleNeutro = { attenzione: false, forte: 'Tutto a posto:', testo: 'nessun segnale', azione: null }
    render(<AdminHomePreview nome="Studio Bianchi" eyebrow="Domenica 12 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={segnaleNeutro} />)
    expect(screen.getByText('nessun segnale')).toBeInTheDocument()
    expect(screen.queryAllByRole('link', { hidden: true })).toHaveLength(0)
  })
})
