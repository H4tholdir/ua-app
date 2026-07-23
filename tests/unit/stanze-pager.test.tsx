// Task 14 — la home a due stanze (spec 2026-07-21-parete-cassette-design.md §6/§7).
// Test in tests/unit/ (decisione D-O1 dell'ondata): `vitest.config.ts` globba SOLO
// `tests/unit/**` e `tests/integration/**` — un file in `src/**/__tests__/` darebbe
// «No test files found», cioè un RED finto.
//
// Che cosa questi test presidiano DAVVERO, e che cosa no:
// - jsdom NON ha `IntersectionObserver` né `Element.prototype.scrollTo`, e non fa layout.
//   Lo stub di IO qui sotto NON è un "verifica che il mock sia stato chiamato": cattura la
//   callback del componente e la RIESEGUE con ratio realistici, così ad essere sotto esame è
//   la LOGICA di soglia del componente (0.6) e la scelta della stanza attiva — un componente
//   che ignorasse il ratio, o che leggesse la stanza sbagliata, fallirebbe.
// - `scrollTo` è stubato SULL'ISTANZA del viewport e le `offsetLeft` delle due stanze sono
//   distinte: l'asserzione su `left` discrimina davvero stanza 1 da stanza 2.
// - NON è verificato qui (e non è verificabile in jsdom): che lo scroll-snap CSS agganci
//   davvero, che il peek di 28px si veda, che l'IO reale scatti a fine snap.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StanzePager } from '@/components/features/home/StanzePager'
import { HomeV3 } from '@/components/features/home/HomeV3'
import { ProgressDotsStanze } from '@/components/ds/ProgressDots'
import { vistaHome, serveParete } from '@/lib/preferenze/home'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

const push = vi.fn()
// Task 12 — `parete` non è più un ReactNode arbitrario: la stanza parete monta la `PareteClient`
// VERA, che registra il proprio effect di freschezza (`router.refresh` su focus/visibilitychange,
// gated da `attivo` — riserva ARCH R2). `refresh`/`back` nel mock evitano un crash silenzioso se
// un test arriva a far scattare quell'effect (nessuno lo asserisce qui: quel comportamento è
// presidiato in `tests/unit/parete-client.test.tsx`).
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, back: vi.fn() }) }))

// ── Stub di IntersectionObserver che si può PILOTARE ────────────────────────────────────
type Osservatore = {
  callback: IntersectionObserverCallback
  opzioni: IntersectionObserverInit | undefined
  osservati: Element[]
}
let osservatori: Osservatore[] = []
// Traccia l'ORDINE reale delle chiamate (scroll iniziale vs observe): serve al test
// sull'ordine di montaggio, dove la sequenza è il comportamento sotto esame.
let eventi: string[] = []

class IOFinto {
  osservati: Element[] = []
  constructor(callback: IntersectionObserverCallback, opzioni?: IntersectionObserverInit) {
    osservatori.push({ callback, opzioni, osservati: this.osservati })
  }
  observe(elemento: Element) {
    eventi.push('observe')
    this.osservati.push(elemento)
  }
  unobserve() {}
  disconnect() {
    this.osservati.length = 0
  }
  takeRecords() {
    return []
  }
}

/** Simula quello che il browser fa a fine snap: la stanza `nome` occupa `ratio` del viewport. */
function simulaScroll(nome: 'pile' | 'parete', ratio: number) {
  const osservatore = osservatori.at(-1)
  if (!osservatore) throw new Error('nessun IntersectionObserver creato dal pager')
  const target = osservatore.osservati.find((e) => (e as HTMLElement).dataset.stanza === nome)
  if (!target) throw new Error(`stanza "${nome}" non osservata`)
  act(() => {
    osservatore.callback(
      [{ target, intersectionRatio: ratio, isIntersecting: ratio > 0 } as unknown as IntersectionObserverEntry],
      {} as IntersectionObserver
    )
  })
}

function preparaViewport(container: HTMLElement) {
  const viewport = container.querySelector('.ua-stanze-viewport') as HTMLElement
  expect(viewport).not.toBeNull()
  const scrollTo = vi.fn()
  Object.defineProperty(viewport, 'scrollTo', { value: scrollTo, configurable: true })
  // jsdom non fa layout: senza queste, ogni offsetLeft è 0 e l'asserzione su `left` non
  // discriminerebbe la stanza di destinazione.
  const stanze = Array.from(container.querySelectorAll('[data-stanza]')) as HTMLElement[]
  Object.defineProperty(stanze[0], 'offsetLeft', { value: 0, configurable: true })
  Object.defineProperty(stanze[1], 'offsetLeft', { value: 362, configurable: true })
  return { viewport, scrollTo }
}

function pannello(nome: 'pile' | 'parete'): HTMLElement {
  const el = document.querySelector(`[data-stanza="${nome}"]`)
  if (!el) throw new Error(`pannello "${nome}" assente`)
  return el as HTMLElement
}

const CONTENUTO_PILE = (
  <div>
    <h1>Buon pomeriggio, Francesco</h1>
    <button type="button">Tutto il resto</button>
  </div>
)
// Task 12 — `parete` è ora `CassettaParete[]`: la stanza parete monta la `PareteClient` vera
// (contesto='stanza'), non più un ReactNode generico. Una sola cassetta libera basta a questi
// test — l'accessible name reale di `Cassetta` («Cassetta {nome}, libera») sostituisce il vecchio
// stand-in testuale «Cassetta C12».
const PARETE_STANZA_TEST: CassettaParete[] = [
  { id: 'c1', nome: 'C12', colore: 'rossa', posizione: 1, lavoro: null },
]

beforeEach(() => {
  osservatori = []
  eventi = []
  push.mockClear()
  refresh.mockClear()
  vi.stubGlobal('IntersectionObserver', IOFinto)
  // Task 13 (D7) — dal Task 13 in poi il pager monta SEMPRE anche `LinguettaCassette`, che
  // legge/scrive `ua_linguetta_v3`: senza reset, gli accessi pile→parete di test precedenti
  // (swipe/dot, in questo stesso file) si accumulerebbero e farebbero apprendere la
  // linguetta prima del tempo per i test dedicati più sotto.
  localStorage.clear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const CHIAVE_LINGUETTA = 'ua_linguetta_v3'
const accessiRegistrati = () => Number(localStorage.getItem(CHIAVE_LINGUETTA) ?? '0')

describe('StanzePager — stanza attiva, inert e aria-hidden (§6)', () => {
  it("con stanzaIniziale='pile' la stanza pile è attiva e la parete è inert + aria-hidden", () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('aria-hidden', 'true')
    expect(pannello('parete')).toHaveAttribute('inert')
  })

  it("con stanzaIniziale='parete' è la stanza pile a essere inert + aria-hidden", () => {
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(pannello('parete')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('parete')).not.toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'true')
    expect(pannello('pile')).toHaveAttribute('inert')
  })

  it('la stanza fuori campo sparisce dall’albero a11y: un solo «Tutto il resto» raggiungibile', () => {
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    // `getByRole` esclude di default ciò che è nascosto agli screen reader: se aria-hidden
    // mancasse sulla stanza uscente, questo bottone sarebbe comunque interrogabile.
    expect(screen.queryByRole('button', { name: 'Tutto il resto' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cassetta C12, libera' })).toBeInTheDocument()
  })

  it('le due stanze sono tabpanel etichettati dai rispettivi tab', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(pannello('pile')).toHaveAttribute('role', 'tabpanel')
    expect(tabs[0].getAttribute('aria-controls')).toBe(pannello('pile').id)
    expect(tabs[1].getAttribute('aria-controls')).toBe(pannello('parete').id)
  })
})

describe('StanzePager — dove si apre il viewport al primo render', () => {
  // Questo caso NON si può presidiare con `preparaViewport` (che stuba DOPO il mount): lo
  // scroll iniziale avviene nell'effect di montaggio. Qui `scrollTo` e `offsetLeft` vivono
  // sul prototipo, quindi esistono già quando il pager si monta.
  function conProtoStubato(prova: (scrollTo: ReturnType<typeof vi.fn>) => void) {
    const scrollTo = vi.fn(() => {
      eventi.push('scroll')
    })
    const scrollToPrecedente = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTo')
    const offsetPrecedente = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetLeft')
    Object.defineProperty(Element.prototype, 'scrollTo', { value: scrollTo, configurable: true, writable: true })
    Object.defineProperty(HTMLElement.prototype, 'offsetLeft', {
      configurable: true,
      get(this: HTMLElement) {
        return this.dataset?.stanza === 'parete' ? 362 : 0
      },
    })
    try {
      prova(scrollTo)
    } finally {
      if (scrollToPrecedente) Object.defineProperty(Element.prototype, 'scrollTo', scrollToPrecedente)
      else Reflect.deleteProperty(Element.prototype, 'scrollTo')
      if (offsetPrecedente) Object.defineProperty(HTMLElement.prototype, 'offsetLeft', offsetPrecedente)
      else Reflect.deleteProperty(HTMLElement.prototype, 'offsetLeft')
    }
  }

  it("aprendo sulla parete il viewport ci si posiziona SUBITO e senza animazione — altrimenti si vedrebbe la stanza pile, che è inerte", () => {
    conProtoStubato((scrollTo) => {
      const { container } = render(
        <StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
      )
      expect(scrollTo).toHaveBeenCalledWith({ left: 362, behavior: 'auto' })
      expect(scrollTo.mock.contexts[0]).toBe(container.querySelector('.ua-stanze-viewport'))
    })
  })

  it('aprendo sulle pile il viewport è già al suo posto: left 0', () => {
    conProtoStubato((scrollTo) => {
      render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'auto' })
    })
  })

  it("il posizionamento iniziale avviene PRIMA di osservare: l'IO parte da una posizione già giusta", () => {
    conProtoStubato(() => {
      render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      // `eventi` registra l'ordine reale delle chiamate. Se si osservasse prima di scrollare,
      // la prima misura dell'IO cadrebbe sulla stanza sbagliata: nel browser vero i dots
      // sfarfallerebbero (e `attiva` potrebbe restare sulla stanza da cui si è appena usciti).
      expect(eventi).toEqual(['scroll', 'observe', 'observe'])
    })
  })
})

// Task 12 (D2, spec redesign §3.1) — la stanza parete monta la `PareteClient` VERA: col peek
// morto (Task 13) la stanza inattiva è del tutto fuori schermo, niente serve montarla subito.
// `[data-cassetta-id]` (non `getByRole`) è il marcatore usato qui per il contenuto NON ancora
// visibile/attivo: la stanza inattiva è `aria-hidden`, e `getByRole` la escluderebbe comunque
// dall'albero a11y — il punto da presidiare è se `PareteClient` è nel DOM, non se è raggiungibile.
describe('StanzePager — mount differito della stanza parete (Task 12, riserva ARCH R3)', () => {
  it('inattiva al montaggio: NON monta la PareteClient finché non arriva il fallback idle (jsdom non ha requestIdleCallback)', () => {
    vi.useFakeTimers()
    try {
      render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      expect(pannello('parete').querySelector('[data-cassetta-id]')).toBeNull()
      act(() => {
        vi.advanceTimersByTime(300)
      })
      expect(pannello('parete').querySelector('[data-cassetta-id]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('deep-link `stanzaIniziale="parete"`: monta la PareteClient SUBITO, senza attendere l\'idle', () => {
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(screen.getByRole('button', { name: 'Cassetta C12, libera' })).toBeInTheDocument()
  })

  it('tap sul dot verso la parete: monta la PareteClient SUBITO, nello stesso giro (niente attesa dell\'idle)', async () => {
    const user = userEvent.setup()
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(pannello('parete').querySelector('[data-cassetta-id]')).toBeNull()
    await user.click(screen.getAllByRole('tab')[1])
    expect(pannello('parete').querySelector('[data-cassetta-id]')).not.toBeNull()
  })

  it('una volta montata resta montata: tornando inattiva la PareteClient non si smonta (solo inert/aria-hidden)', async () => {
    const user = userEvent.setup()
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(pannello('parete').querySelector('[data-cassetta-id]')).not.toBeNull()
    await user.click(screen.getAllByRole('tab')[0])
    expect(pannello('parete')).toHaveAttribute('inert')
    expect(pannello('parete').querySelector('[data-cassetta-id]')).not.toBeNull()
  })
})

describe('StanzePager — dots tablist e tap-to-snap (§6)', () => {
  it('i dots sono un tablist vero con aria-selected sulla stanza attiva', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('tap sul secondo dot: scrollTo verso la stanza parete (smooth), inert invertito, focus nella stanza entrante', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    const { scrollTo } = preparaViewport(container)

    await user.click(screen.getAllByRole('tab')[1])

    expect(scrollTo).toHaveBeenCalledWith({ left: 362, behavior: 'smooth' })
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
    expect(pannello('parete')).not.toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'true')
    // Il focus entra nella stanza: il primo elemento focusabile della parete VERA (Task 12) è
    // la pillola di ricerca di `PareteClient`, non più la prima cassetta (il vecchio stand-in
    // testuale non aveva ricerca — con la parete vera l'ordine del DOM cambia davvero).
    expect(document.activeElement).toBe(within(pannello('parete')).getByPlaceholderText('Cerca una cassetta o un lavoro…'))
  })

  it('tornare al primo dot riporta lo scroll a sinistra (left = offsetLeft della stanza pile)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    const { scrollTo } = preparaViewport(container)
    await user.click(screen.getAllByRole('tab')[0])
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('con prefers-reduced-motion lo snap è un salto: behavior "auto"', async () => {
    const originale = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    try {
      const user = userEvent.setup()
      const { container } = render(
        <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
      )
      const { scrollTo } = preparaViewport(container)
      await user.click(screen.getAllByRole('tab')[1])
      expect(scrollTo).toHaveBeenCalledWith({ left: 362, behavior: 'auto' })
    } finally {
      window.matchMedia = originale
    }
  })
})

describe('StanzePager — tastiera (§6, frecce ←→)', () => {
  it('freccia → cambia stanza e LASCIA il focus sui dots (il ritorno resta a un tasto)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(tabs[1])
    await user.keyboard('{ArrowLeft}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(tabs[0])
  })

  it('freccia ← sulla prima stanza non fa nulla (non si esce dal muro)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    const { scrollTo } = preparaViewport(container)
    screen.getAllByRole('tab')[0].focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  // Review Task 14, Important B-1. La freccia rende attiva la stanza SUBITO lasciando il focus
  // sui dots; l'Invio che segue chiede quindi una stanza che è GIÀ quella attiva. Lì `setAttiva`
  // fa bail-out sullo stesso valore, il re-render non avviene e l'effect che porta il focus non
  // gira mai: senza la correzione l'Invio è morto e chi naviga da tastiera non entra mai nella
  // stanza che ha appena scelto.
  it("freccia poi Invio: il focus ENTRA nella stanza già selezionata (la freccia sceglie, l'Invio ci porta dentro)", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    const tabs = screen.getAllByRole('tab')
    tabs[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(document.activeElement).toBe(tabs[1])
    await user.keyboard('{Enter}')
    // Come sopra: il primo focusabile della parete VERA è la ricerca, non una cassetta.
    expect(document.activeElement).toBe(within(pannello('parete')).getByPlaceholderText('Cerca una cassetta o un lavoro…'))
  })

  it('roving tabindex: un solo dot è nel flusso di Tab', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('tabindex', '0')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
  })
})

describe('StanzePager — swipe: è l’IntersectionObserver a decidere la stanza attiva', () => {
  it('osserva le due stanze con soglia 0.6 e root il viewport', () => {
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    const osservatore = osservatori.at(-1)
    expect(osservatore?.osservati).toHaveLength(2)
    expect(osservatore?.opzioni?.threshold).toBe(0.6)
    expect(osservatore?.opzioni?.root).toBe(container.querySelector('.ua-stanze-viewport'))
  })

  it('la parete che copre il 90% del viewport diventa la stanza attiva — senza alcuno scrollTo', () => {
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    const { scrollTo } = preparaViewport(container)
    simulaScroll('parete', 0.9)
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
    expect(pannello('pile')).toHaveAttribute('inert')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('una parete a metà strada (40%) NON cambia la stanza attiva: la soglia è vera, non decorativa', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    simulaScroll('parete', 0.4)
    expect(screen.getAllByRole('tab')[0]).toHaveAttribute('aria-selected', 'true')
    expect(pannello('parete')).toHaveAttribute('inert')
  })

  it("lo swipe NON ruba il focus (a differenza del tap sul dot): resta dov'è", () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    const primoTab = screen.getAllByRole('tab')[0]
    primoTab.focus()
    simulaScroll('parete', 0.95)
    expect(document.activeElement).toBe(primoTab)
  })

  // Review Task 14, Important B-1 — la seconda faccia dello stesso difetto. Il test qui sopra
  // passa solo perché nessuno tocca un dot prima di scorrere: un tap sulla stanza GIÀ attiva
  // lasciava un'intenzione di focus appesa, che il primo swipe successivo riscuoteva rubando il
  // focus a chi stava soltanto guardando.
  it('un tap sul dot GIÀ attivo non lascia armata alcuna intenzione di focus: il primo swipe non la riscuote', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    // Il riferimento si prende PRIMA dello swipe: dopo, la stanza pile è aria-hidden e
    // `getByRole` non la vedrebbe più.
    const dentroPile = within(pannello('pile')).getByRole('button', { name: 'Tutto il resto' })
    await user.click(screen.getAllByRole('tab')[0])
    // Tap su una stanza già attiva: il suo sottoalbero non è inerte, quindi il focus ci entra
    // subito — non c'è nulla da rimandare a un re-render che non avverrà.
    expect(document.activeElement).toBe(dentroPile)
    simulaScroll('parete', 0.95)
    expect(document.activeElement).toBe(dentroPile)
  })
})

describe('ProgressDotsStanze — variante «stanze» di §5.32', () => {
  it('è un tablist con 2 tab, etichette parlanti e hit-area ≥44px', () => {
    render(
      <ProgressDotsStanze
        etichetta="Le stanze"
        etichette={['Le pile', 'La parete']}
        idPannelli={['p-pile', 'p-parete']}
        attiva={0}
        onSceglie={() => {}}
      />
    )
    expect(screen.getByRole('tablist', { name: 'Le stanze' })).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]).toHaveAccessibleName('Le pile')
    expect(tabs[1]).toHaveAccessibleName('La parete')
    for (const tab of tabs) {
      expect(tab.style.minWidth).toBe('44px')
      expect(tab.style.minHeight).toBe('44px')
    }
  })

  it('avvisa il chiamante distinguendo il tap dalla freccia (il focus si comporta diversamente)', async () => {
    const user = userEvent.setup()
    const onSceglie = vi.fn()
    render(
      <ProgressDotsStanze
        etichetta="Le stanze"
        etichette={['Le pile', 'La parete']}
        idPannelli={['p-pile', 'p-parete']}
        attiva={0}
        onSceglie={onSceglie}
      />
    )
    await user.click(screen.getAllByRole('tab')[1])
    expect(onSceglie).toHaveBeenCalledWith(1, 'tap')
    onSceglie.mockClear()
    screen.getAllByRole('tab')[0].focus()
    await user.keyboard('{ArrowRight}')
    expect(onSceglie).toHaveBeenCalledWith(1, 'freccia')
  })

  it('il pallino attivo è a pillola e in inchiostro, MAI rosso (§3.3 regola 1: il rosso è del TastoPiù)', () => {
    const { container } = render(
      <ProgressDotsStanze
        etichetta="Le stanze"
        etichette={['Le pile', 'La parete']}
        idPannelli={['p-pile', 'p-parete']}
        attiva={1}
        onSceglie={() => {}}
      />
    )
    const pallini = Array.from(container.querySelectorAll('[aria-hidden="true"]')) as HTMLElement[]
    expect(pallini).toHaveLength(2)
    expect(pallini[1].style.width).toBe('30px')
    expect(pallini[1].style.background).toBe('var(--ink)')
    expect(pallini[0].style.width).toBe('11px')
    expect(pallini[0].style.background).toBe('var(--line)')
  })
})

// ── La vista risolta: una sola regola per il fetch (page.tsx) e per il render (HomeV3) ────
describe('vistaHome / serveParete — la preferenza decide, il deep-link corregge', () => {
  it("preferenza 'due_stanze' → pager che apre sulle pile", () => {
    expect(vistaHome('due_stanze')).toEqual({ tipo: 'pager', iniziale: 'pile' })
  })

  it("preferenza 'due_stanze' + ?stanza=parete → pager che apre sulla parete", () => {
    expect(vistaHome('due_stanze', 'parete')).toEqual({ tipo: 'pager', iniziale: 'parete' })
  })

  it("preferenza 'pile' → una sola stanza quando nessuno chiede altro", () => {
    expect(vistaHome('pile')).toEqual({ tipo: 'sola', stanza: 'pile' })
    expect(serveParete(vistaHome('pile'))).toBe(false)
  })

  // Correzione della review Task 14 (§0): questo caso asseriva `{tipo:'sola', stanza:'pile'}`,
  // cioè il deep-link scartato in silenzio. Spec §7 dice che `?stanza=` «è la garanzia che
  // NESSUNA stanza è mai irraggiungibile»: l'asserzione vecchia fissava in verde proprio la
  // rottura di quella garanzia. È il PAGER e non la sola parete perché chi ha preferenza 'pile'
  // non ha, in home, alcuna via di ritorno dedicata — la voce «I lavori» esiste solo per chi ha
  // preferenza 'parete' (§7, Task 15). Col pager la via di casa è a uno swipe.
  it("preferenza 'pile' + ?stanza=parete → il PAGER aperto sulla parete, non la sola parete (via di ritorno garantita)", () => {
    expect(vistaHome('pile', 'parete')).toEqual({ tipo: 'pager', iniziale: 'parete' })
    expect(serveParete(vistaHome('pile', 'parete'))).toBe(true)
  })

  it("preferenza 'pile' + ?stanza=pile → resta la sola stanza pile (il deep-link conferma, non trasforma)", () => {
    expect(vistaHome('pile', 'pile')).toEqual({ tipo: 'sola', stanza: 'pile' })
  })

  it("preferenza 'parete' → solo la parete; ?stanza=pile riporta alle pile (la via alle pile resta aperta)", () => {
    expect(vistaHome('parete')).toEqual({ tipo: 'sola', stanza: 'parete' })
    expect(vistaHome('parete', 'pile')).toEqual({ tipo: 'sola', stanza: 'pile' })
    expect(serveParete(vistaHome('parete', 'pile'))).toBe(false)
  })

  it('la parete si legge SOLO quando una stanza parete viene davvero resa', () => {
    expect(serveParete(vistaHome('due_stanze'))).toBe(true)
    expect(serveParete(vistaHome('parete'))).toBe(true)
    expect(serveParete(vistaHome('pile'))).toBe(false)
  })

  it('un ?stanza= sconosciuto o assente non cambia nulla rispetto alla sola preferenza', () => {
    expect(vistaHome('due_stanze', 'cucina')).toEqual(vistaHome('due_stanze'))
    expect(vistaHome('parete', '')).toEqual(vistaHome('parete'))
  })
})

// ── HomeV3: quale layout esce da quale preferenza ────────────────────────────────────────
const lavoro = (numero: string): PileHome['liste']['rossa'][number] => ({
  id: `l${numero}`,
  numero,
  dentista: 'Dr. Esposito',
  paziente: 'PZ-0412',
  tipoLavoro: 'Corona zirconia',
  cassetta: null,
  pill: { testo: 'OGGI · 16:00', famiglia: 'red' },
  consegnabile: true,
  consegna: { data: '2026-07-09', ora: '16:00:00' },
  rientro: null,
  fasi: [],
  tecnico: null,
})
const PILE: PileHome = {
  liste: { rossa: [lavoro('147')], ambra: [], viola: [], blu: [] },
  sub: { rossa: 'n.147 alle 16', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: 'Nessun nuovo arrivo' },
  striscia: {
    ritardoPiuGrave: null,
    consegnaOggiNonPronta: null,
    provaRientroOggi: null,
    arrivoVecchio: null,
    fermo: null,
    consegneOggiTotali: 1,
    prossimaOra: '16:00',
  },
}
const SEGNALE = { attenzione: false, forte: 'Tutto a posto:', testo: '2 consegne oggi', azione: null }
const PARETE: CassettaParete[] = [
  { id: 'c1', nome: 'C12', colore: 'rossa', posizione: 1, lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'PZ-1', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: 'corona' } },
  { id: 'c2', nome: 'C7', colore: 'bianca', posizione: 2, lavoro: null },
]

function renderHome(homePref: 'due_stanze' | 'pile' | 'parete', stanzaParam?: string, parete = PARETE) {
  return render(
    <HomeV3
      nome="Francesco"
      eyebrow="Giovedì 9 luglio"
      saluto="Buon pomeriggio"
      pile={PILE}
      segnale={SEGNALE}
      parete={parete}
      homePref={homePref}
      stanzaParam={stanzaParam}
    />
  )
}

describe('HomeV3 — le tre forme della home (§7)', () => {
  it("preferenza 'pile': la home di sempre, senza pager né dots né seconda stanza", () => {
    renderHome('pile')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(document.querySelector('[data-stanza]')).toBeNull()
    expect(screen.getByText('DA CONSEGNARE OGGI')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutto il resto' })).toBeInTheDocument()
  })

  // Correzione della review Task 14 (§0): questo caso asseriva che il deep-link non producesse
  // NULLA — «resta la home delle pile». Era la rottura della garanzia di spec §7 («nessuna
  // stanza è mai irraggiungibile») fissata in verde. Il pager, e non la sola parete, perché chi
  // ha preferenza 'pile' non ha alcuna via di ritorno dedicata: la voce «I lavori» esiste solo
  // per chi ha preferenza 'parete'. Le pile restano montate, a uno swipe di distanza.
  it("preferenza 'pile' + ?stanza=parete: il deep-link apre il pager SULLA parete, con le pile a uno swipe", () => {
    renderHome('pile', 'parete')
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(document.querySelectorAll('[data-stanza]')).toHaveLength(2)
    expect(pannello('parete')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
  })

  it("preferenza 'due_stanze': due stanze, dots, e UN SOLO ☰ raggiungibile (l'altro è dietro aria-hidden)", () => {
    renderHome('due_stanze')
    expect(screen.getByRole('tablist')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: 'Tutto il resto' })).toHaveLength(1)
    // Un solo TastoPiù, fuori dal pager (§3.3 regola 5): mai un doppione a metà snap.
    expect(screen.getAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(1)
    expect(document.querySelectorAll('[data-stanza]')).toHaveLength(2)
  })

  it("preferenza 'due_stanze' + ?stanza=parete: si entra dalla stanza parete", () => {
    renderHome('due_stanze', 'parete')
    expect(pannello('parete')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('pile')).toHaveAttribute('inert')
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
  })

  // Task 12 (D2) — la stanza parete NON porta più un proprio titolo «La parete ›» (l'anteprima
  // cap-8 è morta): è la `PareteClient` VERA, in `contesto='stanza'` (niente chrome di pagina —
  // v. `PareteClient.test.tsx`). Il segno che siamo davvero sulla parete embeddata è il suo
  // chrome FUNZIONALE (ricerca) e le sue cassette, non un titolo.
  it("preferenza 'parete': solo la parete VERA (D2), nessun pager, e comunque il TastoPiù", () => {
    renderHome('parete')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText('DA CONSEGNARE OGGI')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cassetta C12/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(1)
  })
})

describe('Collaudo R2 — il focus del cambio stanza non deve scrollare (D-1, 22/07 sera)', () => {
  // Root cause accertata su Chromium reale: il focus() post-render SENZA preventScroll fa lo
  // scroll-into-view istantaneo, che CANCELLA lo scrollTo smooth del viewport; lo snap mandatory
  // ri-aggancia alla stanza di partenza → il tap sul dot sembra morto.
  it('tap sul dot: ogni focus() porta preventScroll:true', async () => {
    const chiamate: Array<FocusOptions | undefined> = []
    const spia = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (opts?: FocusOptions) {
      chiamate.push(opts)
    })
    try {
      render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      chiamate.length = 0
      const dots = screen.getAllByRole('tab')
      await act(async () => {
        dots[1].click()
      })
      expect(chiamate.length).toBeGreaterThan(0)
      for (const opts of chiamate) expect(opts).toMatchObject({ preventScroll: true })
    } finally {
      spia.mockRestore()
    }
  })

  it('tap sul dot della stanza GIÀ attiva: anche quel focus è preventScroll', async () => {
    const chiamate: Array<FocusOptions | undefined> = []
    const spia = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (opts?: FocusOptions) {
      chiamate.push(opts)
    })
    try {
      render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      chiamate.length = 0
      const dots = screen.getAllByRole('tab')
      await act(async () => {
        dots[0].click()
      })
      expect(chiamate.length).toBeGreaterThan(0)
      for (const opts of chiamate) expect(opts).toMatchObject({ preventScroll: true })
    } finally {
      spia.mockRestore()
    }
  })
})

// Task 13 (D7, §3.2) — chi arriva alla stanza Parete registra l'accesso (riserva UX 3b: dopo 3
// arrivi la linguetta «Le cassette» smette di comparire). Il punto di registrazione è il
// setter della stanza attiva (`impostaAttiva` in StanzePager), NON la linguetta da sola: uno
// swipe o un tap sul dot non passano mai dalla linguetta eppure devono contare.
describe('StanzePager — registrazione accesso alla Parete (Task 13, D7, riserva UX 3b)', () => {
  it('lo swipe (IO) che porta alla parete registra un accesso', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(accessiRegistrati()).toBe(0)
    simulaScroll('parete', 0.9)
    expect(accessiRegistrati()).toBe(1)
  })

  it('il tap sul dot della parete registra un accesso', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await user.click(screen.getAllByRole('tab')[1])
    expect(accessiRegistrati()).toBe(1)
  })

  it('tornare sulle pile e poi risvoltare alla parete registra un SECONDO accesso (solo le transizioni pile→parete contano)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await user.click(screen.getAllByRole('tab')[1])
    expect(accessiRegistrati()).toBe(1)
    await user.click(screen.getAllByRole('tab')[0])
    expect(accessiRegistrati()).toBe(1) // parete→pile non registra nulla
    await user.click(screen.getAllByRole('tab')[1])
    expect(accessiRegistrati()).toBe(2)
  })

  it('il tap sulla linguetta «Le cassette» conta UN solo accesso, non due (niente doppio conteggio fra la linguetta e il setter del pager)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    // Portale su `document.body`: `screen` (bound a `document.body`) la trova comunque, pur
    // essendo fuori da `container`.
    const linguetta = screen.getByRole('button', { name: /le cassette/i })
    await user.click(linguetta)
    expect(accessiRegistrati()).toBe(1)
    expect(screen.getAllByRole('tab')[1]).toHaveAttribute('aria-selected', 'true')
  })

  it('la stanza Pile non registra nulla al mount: zero accessi finché non si arriva davvero alla parete', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(accessiRegistrati()).toBe(0)
  })
})
