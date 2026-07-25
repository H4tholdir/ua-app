import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NavDesk } from '@/components/ds/NavDesk'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
// Task 16b (D3 §3.4) — il vecchio s9 «Tutto a posto» è morto (v. src/lib/dashboard/striscia.ts):
// fixture generica per i test che non presidiano il CONTENUTO della striscia, aggiornata a un
// segnale quieto REALE e tuttora raggiungibile (s8, il racconto del DdC del giorno).
const SEGNALE = { attenzione: false, forte: null, testo: 'Oggi ho preparato 2 DdC ✓', azione: null }

describe('NavDesk (§5.37) — la nav sostituisce home+☰ su desktop', () => {
  it('voci pile con badge numerici + sezioni + Nuovo lavoro', () => {
    render(<NavDesk conteggi={{ rossa: 2, ambra: 4, viola: 1, blu: 2 }} pilaSelezionata="rossa" segnale={SEGNALE} />)
    // Niente flag `s` (dotAll): il target tsc del repo è ES2017 (TS1501 su `s`) —
    // il nome accessibile non contiene mai un vero newline fra nome e badge.
    expect(screen.getByRole('link', { name: /Oggi.*2/ })).toHaveAttribute('href', '/dashboard?pila=rossa')
    expect(screen.getByRole('link', { name: /Da rifare.*1/ })).toHaveAttribute('href', '/dashboard?pila=viola')
    expect(screen.getByRole('link', { name: 'Agenda' })).toHaveAttribute('href', '/agenda')
    expect(screen.getByRole('link', { name: 'Dentisti' })).toHaveAttribute('href', '/clienti')
    expect(screen.getByRole('button', { name: '+ Nuovo lavoro' })).toBeInTheDocument()
  })

  it('«Le cassette» (Task 17): voce fissa → /cassette, PRIMA di Agenda', () => {
    render(<NavDesk conteggi={{ rossa: 2, ambra: 4, viola: 1, blu: 2 }} pilaSelezionata="rossa" segnale={SEGNALE} />)
    const cassette = screen.getByRole('link', { name: 'Le cassette' })
    const agenda = screen.getByRole('link', { name: 'Agenda' })
    expect(cassette).toHaveAttribute('href', '/cassette')
    // Ordine di legge: «Le cassette» precede «Agenda» nel DOM.
    expect(cassette.compareDocumentPosition(agenda) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// Task 16b, punto 5 — silenzio (D3 §3.4): stesso trattamento di HomeV3, applicato qui perché
// NavDesk è la seconda superficie che monta StrisciaStato (HomeDesktop, rail desktop).
describe('NavDesk — silenzio (punto 5): nessuna striscia quando segnale.silenzio è true', () => {
  it('la striscia non monta affatto, il resto della nav resta intatto', () => {
    const silenzio: SegnaleStriscia = { attenzione: false, forte: null, testo: '', azione: null, silenzio: true }
    render(<NavDesk conteggi={{ rossa: 2, ambra: 4, viola: 1, blu: 2 }} pilaSelezionata="rossa" segnale={silenzio} />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('button', { name: '+ Nuovo lavoro' })).toBeInTheDocument()
  })
})

// Task 16b, punto 6 — dedup racconto: NavDesk riceve lo STESSO `segnale` di HomeV3 (entrambi
// montano insieme, CSS decide chi si vede — v. dashboard/page.tsx), quindi deve wirare lo
// stesso hook, non solo HomeV3: un regressione qui lascerebbe il racconto già visto rivisibile
// sul rail desktop anche dopo che HomeV3 l'ha segnato come letto.
describe('NavDesk — dedup racconto (punto 6)', () => {
  it('eventoId già visto (localStorage): la striscia non monta', () => {
    localStorage.clear()
    localStorage.setItem('ua_racconti_visti', JSON.stringify(['lib-c1-x']))
    const racconto: SegnaleStriscia = {
      attenzione: false,
      forte: null,
      testo: 'UÀ ha liberato C12',
      azione: { etichetta: 'Guarda ›', href: '/dashboard?stanza=parete' },
      eventoId: 'lib-c1-x',
    }
    render(<NavDesk conteggi={{ rossa: 2, ambra: 4, viola: 1, blu: 2 }} pilaSelezionata="rossa" segnale={racconto} />)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
