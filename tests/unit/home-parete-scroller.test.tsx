// Review finale whole-branch, I4 — chi possiede lo scroll della parete deve dirlo al gesto di
// riordino. `useDragRiordino` chiede lo scroller a `creaScroller(scrollerRef?.current ?? null)`
// (riordino-core.ts): senza un contenitore riceve l'adattatore della FINESTRA — `window.scrollBy`
// per l'auto-scroll e `sogliaAlta()` fissa a 0. Sulla forma «solo parete» della home quello è
// l'adattatore sbagliato due volte: la finestra non scorre (`.ua-home` è inchiodata a
// `min-height: 100dvh`, chi scorre è `.ua-stanza-parete-scroll`), e la fascia di auto-scroll
// alta verrebbe calcolata a partire dal bordo del viewport invece che da quello del contenitore.
// Effetto: trascinando una cassetta verso il bordo basso di un muro più alto dello schermo, il
// muro non segue il dito — si può solo lasciarla cadere fra le righe già in vista.
//
// Qui si presidia il CABLAGGIO, che è ciò che mancava: che l'auto-scroll faccia il suo mestiere
// DATO uno scroller giusto è già provato in `tests/unit/use-drag-riordino.test.ts` (describe con
// lo scroller REALE passato come `scrollerRef`).
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { RefObject } from 'react'
import type { CassettaParete } from '@/lib/cassette/parco-shared'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }) }))

// La `PareteClient` vera non serve a questo test (e monterebbe drag, suoni e refresh gated):
// serve solo sapere COSA le arriva. Il finto registra le prop di ogni montaggio.
const propsViste: Array<{ scrollerRef?: RefObject<HTMLElement | null> }> = []
vi.mock('@/components/features/cassette/PareteClient', () => ({
  PareteClient: (props: { scrollerRef?: RefObject<HTMLElement | null> }) => {
    propsViste.push(props)
    return <div data-testid="parete-finta" />
  },
}))

const { HomeV3 } = await import('@/components/features/home/HomeV3')
const { StanzePager } = await import('@/components/features/home/StanzePager')

const PARETE: CassettaParete[] = [
  { id: 'c1', nome: 'C1', colore: 'rossa', posizione: 1, lavoro: null },
  { id: 'c2', nome: 'C2', colore: 'blu', posizione: 2, lavoro: null },
]
const PILE: PileHome = {
  liste: { rossa: [], ambra: [], viola: [], blu: [] },
  sub: { rossa: '', ambra: '', viola: '', blu: '' },
  striscia: { ritardoPiuGrave: null, consegnaOggiNonPronta: null, provaRientroOggi: null, arrivoVecchio: null, fermo: null, consegneOggiTotali: 0, prossimaOra: null },
}
// `silenzio: true` (la striscia non è oggetto di questo test): il tipo lo vuole letterale.
const SEGNALE: SegnaleStriscia = { attenzione: false, forte: null, testo: '', azione: null, silenzio: true }

describe('I4 — la parete riceve il proprio contenitore di scroll, non la finestra', () => {
  it('forma «solo parete» della home: `scrollerRef` punta a `.ua-stanza-parete-scroll`', () => {
    propsViste.length = 0
    const { container } = render(
      <HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} parete={PARETE} homePref="parete" />
    )
    const scroller = container.querySelector('.ua-stanza-parete-scroll')
    expect(scroller).not.toBeNull()
    expect(propsViste).toHaveLength(1)
    expect(propsViste[0].scrollerRef?.current).toBe(scroller)
  })

  it('forma pager (già corretta): stesso cablaggio nel pannello destro — le due forme non devono divergere', () => {
    propsViste.length = 0
    const { container } = render(
      <StanzePager stanzaIniziale="parete" pile={<div />} parete={PARETE} />
    )
    const scroller = container.querySelector('.ua-stanza-parete-scroll')
    expect(scroller).not.toBeNull()
    expect(propsViste).toHaveLength(1)
    expect(propsViste[0].scrollerRef?.current).toBe(scroller)
  })
})
