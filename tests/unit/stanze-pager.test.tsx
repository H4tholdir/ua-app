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
import { render, screen, within, act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StanzePager } from '@/components/features/home/StanzePager'
import { HomeV3 } from '@/components/features/home/HomeV3'
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

/**
 * ⚠️ REGOLA (review finale whole-branch, D1) — `preparaViewport` installa la spia su
 * un'ISTANZA che esiste solo DOPO il mount: quando gira, l'effect di posizionamento iniziale
 * del pager è già passato. La `vi.fn()` che torna nasce quindi con ZERO chiamate registrate,
 * qualunque cosa il componente abbia fatto al montaggio.
 *
 * Conseguenza operativa, da rispettare sempre: da qui si possono asserire SOLO comportamenti
 * POST-mount (tap sulla linguetta, «‹ Indietro», swipe). Una negativa su questa spia
 * (`not.toHaveBeenCalled…`) riferita al montaggio è vera per costruzione — passerebbe anche
 * con il comportamento rotto, ed è esattamente il difetto che D1 ha trovato qui.
 * Per il montaggio esiste `conProtoStubato` (sotto): stuba `scrollTo`/`offsetLeft` sui
 * PROTOTIPI, quindi la spia esiste già quando il pager si monta.
 */
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

/**
 * L'altra metà della regola sopra: qui `scrollTo` e `offsetLeft` vivono sui PROTOTIPI, quindi
 * esistono già quando il pager si monta — è l'unico modo di osservare lo scroll iniziale
 * (che avviene dentro l'effect di montaggio). Ripristina i descriptor originali in `finally`,
 * così un fallimento dell'asserzione non lascia i prototipi stubati agli altri test.
 * Definita a livello di FILE (non dentro un describe) perché serve a due describe diversi:
 * «dove si apre il viewport al primo render» e il remount T15.8 con l'indirizzo già /cassette.
 */
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

function pannello(nome: 'pile' | 'parete'): HTMLElement {
  const el = document.querySelector(`[data-stanza="${nome}"]`)
  if (!el) throw new Error(`pannello "${nome}" assente`)
  return el as HTMLElement
}

// QA device (verbale 25/07, fix-list D3, decisione ratificata) — i dot sono STATI RIMOSSI (v.
// StanzePager.tsx): le due sole vie ESPLICITE rimaste per cambiare stanza (a differenza dello
// swipe, pilotato da `simulaScroll` sopra) sono la linguetta «Le cassette» (pile→parete) e il
// tasto «‹ Indietro» dell'header della parete (parete→pile) — entrambi bottoni VERI,
// raggiungibili e attivabili da tastiera senza alcun codice dedicato. Questi due helper
// sostituiscono ovunque i vecchi `user.click(screen.getAllByRole('tab')[…])`.
function viaLinguetta(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole('button', { name: /le cassette/i }))
}
function viaIndietroParete(user: ReturnType<typeof userEvent.setup>) {
  return user.click(within(pannello('parete')).getByRole('button', { name: 'Indietro' }))
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

// QA device T15 (addendum 24/07, punto 1/2) — URL sync: il pager ora chiama
// `window.history.pushState`/`back` DAVVERO (v. `StanzePager.tsx`, `sincronizzaUrlStanza`).
// Mockati QUI, a livello di file (non solo nel describe dedicato): senza questo, ogni test che
// cambia stanza pile↔parete muterebbe per davvero `window.location` in jsdom, facendo
// trapelare stato fra un test e l'altro nello stesso file (nessun altro punto lo resetta).
let pushStateSpy: ReturnType<typeof vi.spyOn>
let historyBackSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  osservatori = []
  eventi = []
  push.mockClear()
  refresh.mockClear()
  vi.stubGlobal('IntersectionObserver', IOFinto)
  // Task 13 (D7) — dal Task 13 in poi il pager monta SEMPRE anche `LinguettaCassette`, che
  // legge/scrive `ua_linguetta_v4` (D4, bump chiave — v. `CHIAVE_LINGUETTA` sotto): senza reset,
  // gli accessi pile→parete di test precedenti (swipe, in questo stesso file) si accumulerebbero
  // e farebbero apprendere la linguetta prima del tempo per i test dedicati più sotto. I dot sono
  // rimossi (D3): l'unico trigger esplicito rimasto è la linguetta stessa.
  localStorage.clear()
  pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
  historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  pushStateSpy.mockRestore()
  historyBackSpy.mockRestore()
})

// D4 (bump chiave, QA device verbale 25/07) — il contatore precedente `ua_linguetta_v3` era
// saturo sui device dei collaudi: bump a `ua_linguetta_v4` (v. LinguettaCassette.tsx).
const CHIAVE_LINGUETTA = 'ua_linguetta_v4'
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

  // QA device T15 (addendum 24/07, supera Task 12/D2) — prima la stanza Parete non portava
  // alcun «Tutto il resto» (header spento): l'unico raggiungibile era quello, inerte, della
  // stanza Pile — cioè NESSUNO. Ora il pannello Parete rende il proprio chrome di pagina VERO
  // (con il suo «☰ Tutto il resto»): resta UN solo raggiungibile, ma è quello reale della
  // parete, non più l'assenza totale — lo stand-in della stanza Pile resta inerte comunque.
  it('la stanza fuori campo sparisce dall’albero a11y: un solo «Tutto il resto» raggiungibile (quello vero della parete)', () => {
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    // `getByRole` esclude di default ciò che è nascosto agli screen reader: se aria-hidden
    // mancasse sulla stanza uscente, questo bottone sarebbe raggiungibile DUE volte.
    expect(screen.getAllByRole('button', { name: 'Tutto il resto' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Cassetta C12, libera' })).toBeInTheDocument()
  })

  // QA device (verbale 25/07, fix-list D3, decisione ratificata) — SOSTITUISCE «le due stanze
  // sono tabpanel etichettati dai rispettivi tab»: coi dot rimossi non esiste più alcun
  // `role="tablist"`/`role="tab"`, quindi nemmeno un `role="tabpanel"` da etichettare (un
  // `aria-labelledby` verso un tab inesistente sarebbe un riferimento a vuoto, un difetto di
  // per sé). Le due stanze restano identificabili via `data-stanza` (usato da questo stesso
  // file, da `HomeV3.tsx` e dal CSS scoped di E3) — questo è il contratto che resta.
  it('niente più tablist/tab/tabpanel: le stanze sono identificate SOLO da data-stanza', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(pannello('pile')).not.toHaveAttribute('role', 'tabpanel')
    expect(pannello('parete')).not.toHaveAttribute('role', 'tabpanel')
  })
})

// Lo scroll iniziale avviene nell'effect di montaggio: si osserva SOLO con `conProtoStubato`
// (v. la regola sui due helper in testa al file), mai con `preparaViewport`.
describe('StanzePager — dove si apre il viewport al primo render', () => {
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

  // QA device (verbale 25/07, fix-list D3) — trigger sostituito: prima era il tap sul dot,
  // ora è la linguetta (unica via ESPLICITA rimasta verso la parete) — stesso contratto sotto
  // esame (mount sincrono, niente attesa dell'idle).
  it('tap sulla linguetta verso la parete: monta la PareteClient SUBITO, nello stesso giro (niente attesa dell\'idle)', async () => {
    const user = userEvent.setup()
    const { container } = render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    preparaViewport(container)
    expect(pannello('parete').querySelector('[data-cassetta-id]')).toBeNull()
    await viaLinguetta(user)
    expect(pannello('parete').querySelector('[data-cassetta-id]')).not.toBeNull()
  })

  it('una volta montata resta montata: tornando inattiva la PareteClient non si smonta (solo inert/aria-hidden)', async () => {
    const user = userEvent.setup()
    const { container } = render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    preparaViewport(container)
    expect(pannello('parete').querySelector('[data-cassetta-id]')).not.toBeNull()
    await viaIndietroParete(user)
    expect(pannello('parete')).toHaveAttribute('inert')
    expect(pannello('parete').querySelector('[data-cassetta-id]')).not.toBeNull()
  })
})

// QA device T15 (addendum 24/07, punto 1) — la decisione più importante del collaudo: il
// pannello destro non è più una stanza a chrome ridotto, è la pagina /cassette VERA. Questi
// test presidiano ESATTAMENTE quel contratto: titolo + back + ☰ rendono nel pannello, e il back
// dell'header torna alle pile passando per il pager (mai `router.back`).
describe('StanzePager — il pannello destro rende l\'assetto pagina COMPLETO (QA device T15, supera Task 12/D2)', () => {
  it('titolo «Le cassette», «‹ Indietro» e «☰ Tutto il resto» rendono nel pannello parete', () => {
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    const pannelloParete = within(pannello('parete'))
    expect(pannelloParete.getByRole('heading', { name: 'Le cassette' })).toBeInTheDocument()
    expect(pannelloParete.getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
    expect(pannelloParete.getByRole('button', { name: 'Tutto il resto' })).toBeInTheDocument()
    expect(pannelloParete.getByPlaceholderText('Cerca una cassetta o un lavoro…')).toBeInTheDocument()
  })

  it('il back dell\'header nel pannello torna alle pile — MAI router.back/push (callback verso il pager)', async () => {
    const user = userEvent.setup()
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    await user.click(within(pannello('parete')).getByRole('button', { name: 'Indietro' }))
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
    expect(push).not.toHaveBeenCalled()
  })

  it('«☰ Tutto il resto» del pannello resta una vera navigazione (router.push, non intercettato dal pager)', async () => {
    const user = userEvent.setup()
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    await user.click(within(pannello('parete')).getByRole('button', { name: 'Tutto il resto' }))
    expect(push).toHaveBeenCalledWith('/tutto-il-resto')
  })
})

// QA device T15 (addendum 24/07, punto 2) — «il gesto segue il dito, zero loading»: l'indirizzo
// si aggiorna con l'History API nuda (mai `router.push`, che rifarebbe fetch/render della route
// reale). `urlPushataRef` (interno) distingue «questo pager ha spinto lui l'entry /cassette» da
// «la parete è attiva per un altro motivo» (deep-link, preferenza che apre lì di default): questi
// test presidiano quella distinzione dall'esterno, sugli effetti osservabili (pushState/back).
describe('StanzePager — URL sync con /cassette via History API (QA device T15, addendum punto 2)', () => {
  // QA device (verbale 25/07, fix-list D3) — trigger sostituito ovunque: i dot sono rimossi,
  // le due sole vie ESPLICITE rimaste sono la linguetta (pile→parete) e «‹ Indietro»
  // (parete→pile) — v. `viaLinguetta`/`viaIndietroParete` sopra.
  it('tap sulla linguetta verso la parete: pushState su /cassette, shallow (mai router.push)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await viaLinguetta(user)
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/cassette')
    expect(push).not.toHaveBeenCalledWith('/cassette')
  })

  it('lo swipe (IO) verso la parete pusha /cassette una sola volta, anche con più notifiche sopra soglia', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    simulaScroll('parete', 0.9)
    simulaScroll('parete', 0.95)
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
  })

  // QA device T15 — difetto trovato in verifica browser reale (v. report FIX-A): dopo il
  // pushState, Next aggiorna il proprio `canonicalUrl` a `/cassette` (shallow, VOLUTO), ma un
  // `router.refresh()` SILENZIOSO (focus/visibilitychange, nessun gesto dell'utente) chiamato
  // mentre l'albero montato è ancora quello di `/dashboard` rifà il fetch della rotta VERA
  // `/cassette` sul server e sostituisce il contenuto al pannello. Questo test presidia l'intera
  // catena end-to-end (pager → StanzaParete → PareteClient), non solo `PareteClient` isolato.
  it('dopo lo swipe verso la parete, un focus (refresh silenzioso) NON chiama router.refresh — il pager non deve sparire sotto un tab-switch', () => {
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    simulaScroll('parete', 0.9) // pile → parete, pushState armato
    refresh.mockClear()
    fireEvent(window, new Event('focus'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('un secondo giro pile→parete riarma la sospensione (non è un flag che si consuma una volta sola)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    simulaScroll('parete', 0.9) // pile → parete (1° giro)
    await viaIndietroParete(user) // parete → pile: urlDivergente torna false
    simulaScroll('parete', 0.9) // pile → parete (2° giro): urlDivergente torna true
    refresh.mockClear()
    fireEvent(window, new Event('focus'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('deep-link `?stanza=parete` (nessun pushState nostro): il focus rilegge normalmente, nessuna sospensione', () => {
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    refresh.mockClear()
    fireEvent(window, new Event('focus'))
    expect(refresh).toHaveBeenCalled()
  })

  it('tornare alle pile dopo essere arrivati via pager (back dell\'header) chiama history.back — non una pushState', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await viaLinguetta(user) // pile → parete
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    await viaIndietroParete(user) // parete → pile
    expect(historyBackSpy).toHaveBeenCalledTimes(1)
    expect(pushStateSpy).toHaveBeenCalledTimes(1) // niente seconda push per il ritorno
  })

  it('il back dell\'header nel pannello (arrivo via pager) chiama history.back', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await viaLinguetta(user) // pile → parete, pushState armato
    await viaIndietroParete(user)
    expect(historyBackSpy).toHaveBeenCalledTimes(1)
  })

  it('la parete già attiva al mount (deep-link `?stanza=parete`) NON pusha /cassette: non è un cambio generato dal pager', () => {
    render(<StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(pushStateSpy).not.toHaveBeenCalled()
  })

  it('tornare alle pile da una parete raggiunta via deep-link NON chiama history.back (nessuna entry nostra da disfare)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await viaIndietroParete(user)
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  it('popstate (back del telefono) mentre si guarda la parete riporta il pager sulle pile, senza reload e senza un secondo history.back', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await viaLinguetta(user) // pile → parete, pushState armato
    historyBackSpy.mockClear()
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
    // La traversal l'ha già fatta il browser (o, qui, l'evento sintetico): il listener del
    // pager non deve richiamare `history.back()` una seconda volta.
    expect(historyBackSpy).not.toHaveBeenCalled()
  })

  it('un popstate mentre si è sulle pile (nessuna entry nostra pendente) non fa nulla di osservabile', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'false')
    expect(historyBackSpy).not.toHaveBeenCalled()
  })
})

// QA device T15.8 (verbale 2026-07-24, fix-list punto 8) — CAUSA TROVATA (v. report FIX-C,
// verificata anche in browser reale con harness a livello di history): il FIX-A sincronizza
// l'URL, ma un `router.back()` da una navigazione VERA (es. tap cassetta → scheda del lavoro →
// «‹ Indietro») può far RIPRISTINARE da Next il proprio albero cachato di `/dashboard` — che
// riparte da `useState(stanzaIniziale)`, cioè lo stato del PRIMISSIMO caricamento (quasi sempre
// 'pile'), perdendo l'avanzamento a 'parete' fatto in memoria dal dot/swipe. Qui si simula
// esattamente quell'istante: un'istanza NUOVA del pager (mount) che nasce mentre
// `window.location.pathname` è GIÀ `/cassette` — indistinguibile, per `useState`, da un
// remount dal router-cache.
describe('StanzePager — remount con indirizzo già /cassette (QA device T15.8, punto 8 del verbale)', () => {
  const percorsoOriginale = () => window.location.pathname
  let percorsoDiPartenza: string

  beforeEach(() => {
    percorsoDiPartenza = percorsoOriginale()
  })
  afterEach(() => {
    window.history.replaceState({}, '', percorsoDiPartenza)
  })

  it("nasce con la parete attiva (non le pile) se l'indirizzo è già /cassette al mount, anche con stanzaIniziale='pile'", () => {
    window.history.replaceState({}, '', '/cassette')
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(pannello('parete')).not.toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('inert')
  })

  // Review finale whole-branch, D1 — questo test asseriva `not.toHaveBeenCalledWith({ left: 0,
  // … })` su una spia di `preparaViewport`, cioè su una `vi.fn()` nata DOPO il mount e quindi
  // con zero chiamate registrate: era vera per costruzione, e restava verde anche togliendo del
  // tutto il ramo «/cassette» dal posizionamento iniziale — proprio il desync stato/scroll che
  // il titolo promette di presidiare (il gemello sopra prende solo la metà `inert`).
  // Riscritto con `conProtoStubato`, che osserva davvero il montaggio: la POSITIVA su 362 (la
  // `offsetLeft` della stanza parete) è l'unica forma che discrimina le due stanze.
  it("il viewport si posiziona sulla parete (non le pile) nello stesso scenario — stato e scroll non vanno fuori sincrono", () => {
    window.history.replaceState({}, '', '/cassette')
    conProtoStubato((scrollTo) => {
      render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      expect(scrollTo).toHaveBeenCalledWith({ left: 362, behavior: 'auto' })
      expect(scrollTo).not.toHaveBeenCalledWith({ left: 0, behavior: 'auto' })
    })
  })

  it("indietro dalla parete ricostituita (già attiva al mount) fa comunque history.back, mai un'altra pushState", async () => {
    window.history.replaceState({}, '', '/cassette')
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    pushStateSpy.mockClear()
    await viaIndietroParete(user) // parete → pile
    expect(historyBackSpy).toHaveBeenCalledTimes(1)
    expect(pushStateSpy).not.toHaveBeenCalled()
  })

  it("con l'indirizzo NON /cassette il mount resta invariato: usa `stanzaIniziale` come sempre (nessuna regressione)", () => {
    window.history.replaceState({}, '', '/qualcosa-altro')
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
  })
})

// G5 (FIX-I, verbale ri-collaudo #2) — un `CassettaSheet` aperto sul pannello «embedded» pusha
// la SUA entry di history (v. `Sheet.tsx`) SOPRA quella già pushata dal pager per `/cassette`
// (v. describe URL sync sopra). Qui si presidia che le due catene NON si pestino i piedi: il
// PRIMO back deve chiudere SOLO lo sheet (restando sulla parete), il SECONDO deve seguire la
// catena esistente parete→pile. `window.location.pathname` è manipolato con `replaceState`
// VERO (mai mockato in questo describe, stesso precedente della describe «remount» sopra) —
// è la guardia che distingue "l'entry consumata è quella dello sheet" (pathname resta
// `/cassette`, lo sheet pusha senza url) da "l'entry consumata è quella del pager" (pathname
// torna alla pagina precedente).
describe('StanzePager — G5, sheet embedded non interferisce con la catena pushState del pager', () => {
  const percorsoOriginale = () => window.location.pathname
  let percorsoDiPartenza: string

  beforeEach(() => {
    percorsoDiPartenza = percorsoOriginale()
  })
  afterEach(() => {
    window.history.replaceState({}, '', percorsoDiPartenza)
  })

  it('1° back: chiude SOLO il CassettaSheet aperto, si resta sulla parete (il pager non reagisce) · 2° back: catena esistente, torna alle pile', async () => {
    // Remount con l'indirizzo già /cassette (stesso precedente T15.8 sopra): il pager nasce con
    // la parete attiva, `urlPushataRef`/`attivaRef` già coerenti — non serve passare dalla
    // linguetta (che qui pusherebbe attraverso lo spy no-op, senza muovere il pathname reale).
    window.history.replaceState({}, '', '/cassette')
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    expect(pannello('parete')).not.toHaveAttribute('inert')

    // Apre il CassettaSheet sulla cassetta libera «C12» (tap, v. PareteClient `onTap`): il
    // `Sheet` ds pusha la sua entry marcata (spy no-op, il pathname reale resta `/cassette`).
    fireEvent.click(within(pannello('parete')).getByRole('button', { name: 'Cassetta C12, libera' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()

    // 1° back — il browser consuma l'entry dello sheet (pathname invariato, `/cassette`): lo
    // sheet chiude, il pager NON deve richiamare la sua chiusura verso le pile.
    historyBackSpy.mockClear()
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(pannello('parete')).not.toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('inert')
    expect(historyBackSpy).not.toHaveBeenCalled()

    // 2° back — QUESTA volta l'entry consumata è davvero quella del pager: il browser lascia
    // `/cassette` per la pagina precedente (simulato col replaceState, stesso principio della
    // describe «remount» sopra — qui la traversal l'ha già fatta il browser).
    window.history.replaceState({}, '', '/dashboard')
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
  })

  // Review finale whole-branch, C2 — la scena a tre tap del verbale: sheet aperto, dialog
  // distruttivo SOPRA di esso, e il back fisico del telefono. Prima del fix esisteva UNA sola
  // entry per lo sheet e nessuna per il dialog: il 1° back la consumava, `Sheet.onChiudi`
  // partiva, la guardia `dialogAperto` di `CassettaSheet` lo bloccava — niente si chiudeva, ma
  // l'entry era sparita. Il 2° back consumava allora quella del PAGER: le pile tornavano in
  // vista mentre sheet E dialog distruttivo — due portali su `document.body`, fuori dalla
  // stanza che è appena diventata `inert` — restavano dipinti sopra, e interattivi.
  it('C2 — dialog distruttivo sopra lo sheet: 1° back chiude SOLO il dialog, 2° back SOLO lo sheet, 3° back torna alle pile', async () => {
    window.history.replaceState({}, '', '/cassette')
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)

    // Sheet della cassetta libera «C12» → «Butta via» apre il DialogConferma SOPRA lo sheet,
    // che resta aperto (pattern `CassettaSheet`: la guardia `dialogAperto` impedisce che la
    // chiusura dello sheet passi mentre il dialog è in scena).
    fireEvent.click(within(pannello('parete')).getByRole('button', { name: 'Cassetta C12, libera' }))
    expect(await screen.findByRole('dialog', { name: 'C12' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('Butta via'))
    expect(await screen.findByRole('dialog', { name: /Butto via la cassetta C12/ })).toBeInTheDocument()

    // 1° back — si chiude il PIÙ ALTO, e solo lui: il dialog. Lo sheet resta, e resta
    // protetto (l'entry viene ri-spinta per lui), la parete resta la stanza attiva.
    historyBackSpy.mockClear()
    pushStateSpy.mockClear()
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Butto via la cassetta C12/ })).toBeNull())
    expect(screen.getByRole('dialog', { name: 'C12' })).toBeInTheDocument()
    expect(pushStateSpy).toHaveBeenCalledTimes(1)
    expect(pannello('parete')).not.toHaveAttribute('inert')

    // 2° back — ora tocca allo sheet. La stanza non si muove ancora.
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'C12' })).toBeNull())
    expect(pannello('parete')).not.toHaveAttribute('inert')
    expect(historyBackSpy).not.toHaveBeenCalled()

    // 3° back — solo adesso l'entry consumata è quella del pager (il pathname lascia
    // `/cassette`, v. describe sopra): si torna alle pile, con nulla dipinto sopra.
    window.history.replaceState({}, '', '/dashboard')
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  // Review finale whole-branch (nomi stantii) — il titolo prometteva «con lo sheet aperto ma su
  // un percorso NON /cassette»: il corpo non apre alcuno sheet e non tocca il pathname, ed era
  // il commento stesso a chiamarlo «percorso di controllo». Rinominato per quello che fa
  // davvero: è il CONTROLLO NEGATIVO della guardia G5 qui sopra — senza overlay in scena, un
  // back sulla parete deve seguire la catena di sempre.
  it('controllo negativo della guardia G5: senza alcuno sheet aperto, un back sulla parete (raggiunta con lo swipe) torna alle pile come sempre', () => {
    // Nessuna regressione introdotta dalla guardia aggiunta per G5: la catena parete→pile
    // resta quella di prima quando non c'è nessun overlay a contendersi l'entry.
    const contesto = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(contesto.container)
    simulaScroll('parete', 0.9)
    expect(pannello('parete')).not.toHaveAttribute('inert')
    act(() => {
      window.dispatchEvent(new Event('popstate'))
    })
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
  })
})

// QA device T15 (addendum 24/07, punto 3) — «niente TastoPiù nel lato cassette»: il chiamante
// (HomeV3) decide la visibilità del piede da questo callback. Qui si presidia SOLO che il pager
// lo chiami coi valori giusti, ai momenti giusti — la sparizione vera e propria del piede è un
// test di `HomeV3.tsx` (v. `HomeV3 — le tre forme della home`).
describe('StanzePager — onStanzaChange (QA device T15, addendum punto 3)', () => {
  it('chiamato subito al mount con la stanza iniziale', () => {
    const onStanzaChange = vi.fn()
    render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} onStanzaChange={onStanzaChange} />
    )
    expect(onStanzaChange).toHaveBeenCalledWith('pile')
  })

  it('chiamato con "parete" dopo lo swipe/tap verso la parete', async () => {
    const onStanzaChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} onStanzaChange={onStanzaChange} />
    )
    preparaViewport(container)
    onStanzaChange.mockClear()
    await viaLinguetta(user)
    expect(onStanzaChange).toHaveBeenLastCalledWith('parete')
  })
})

// Piede statico (verbale 26/07, commit `5957b24`) — RIMOSSO il describe block
// «onProgressoSwipe/onPresaSwipe/onRilascioSwipe (capitolo H4c)» che viveva qui: presidiava i
// listener scroll/touchstart/touchend/touchcancel che StanzePager montava SOLO per calcolare e
// comunicare alla coreografia del piede (in HomeV3.tsx) il progress continuo del gesto —
// listener e callback abrogati insieme alla coreografia stessa (v. `piede-swipe.ts`, rimosso,
// e il commento in testa a questo file/a HomeV3.tsx). Codice morto testato è codice morto e
// basta: nessun comportamento superstite da questo blocco giustificava tenerlo. Il piede
// «esiste/tap/forme» resta presidiato più sotto (`HomeV3 — il piede sparisce sul lato
// cassette del pager`) e in `HomeV3.test.tsx`.

// QA device (verbale 25/07, fix-list D3, decisione RATIFICATA) — SOSTITUISCE «dots tablist e
// tap-to-snap» + «tastiera (frecce ←→)»: i dot sono morti, quindi anche il tap sul dot e le
// frecce ←→ come meccanismi di navigazione. Il tap-to-snap (scrollTo/inert/focus) resta
// presidiato, ma dalla linguetta (pile→parete) e dal tasto «‹ Indietro» (parete→pile) — le due
// vie ESPLICITE che restano.
describe('StanzePager — navigazione esplicita: linguetta e «‹ Indietro» (D3, sostituisce i dot)', () => {
  it('tap sulla linguetta verso la parete: scrollTo (smooth), inert invertito, focus nella stanza entrante', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    const { scrollTo } = preparaViewport(container)

    await viaLinguetta(user)

    expect(scrollTo).toHaveBeenCalledWith({ left: 362, behavior: 'smooth' })
    expect(pannello('parete')).not.toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'true')
    // Il focus entra nella stanza: il primo elemento focusabile della parete VERA è ora il tasto
    // «‹ Indietro» del suo header di pagina (QA device T15 — prima, senza header, era la pillola
    // di ricerca; con l'header il tasto la precede nel DOM).
    expect(document.activeElement).toBe(within(pannello('parete')).getByRole('button', { name: 'Indietro' }))
  })

  // Review finale whole-branch — il commento su `vaiA` dava per morto il caso «tap sulla stanza
  // GIÀ attiva» (nasceva dal dot della stanza corrente, rimosso con D3). Non è morto: la
  // linguetta è in portale FUORI dal sottoalbero che il pager rende `inert`, e resta montata e
  // cliccabile per tutta la sua uscita di `AnimatePresence`. Un secondo tap in quella finestra
  // (facilissimo col dito, il bersaglio è ancora lì sotto) chiedeva di nuovo la parete mentre la
  // parete era già attiva: `setAttiva` non cambia nulla, l'effect su `[attiva]` non gira, e il
  // flag del focus restava ARMATO fino al prossimo cambio di stanza — dove rubava il focus a chi
  // aveva solo swipato. E `registraAccessoParete` veniva chiamata due volte: la linguetta si
  // sarebbe spenta dopo un tap e mezzo invece che dopo tre, che è esattamente il doppio
  // conteggio per cui esiste `giaRegistrato`.
  // NB sul simulatore: i due tap sono `fireEvent.click`, non `userEvent.click`. Il secondo tap
  // cade su un elemento che `AnimatePresence` tiene in scena mentre lo smonta — nel DOM, visibile,
  // `pointer-events: auto` (verificato) — ma i controlli extra di `userEvent` lo scartano in
  // silenzio in jsdom, senza errore. Su un device quel tap ARRIVA: `fireEvent.click` è qui il
  // modello fedele (e infatti, senza il fix, fa contare due accessi).
  it('doppio tap sulla linguetta (resta cliccabile durante la propria uscita): un solo accesso contato e nessun focus armato per il cambio stanza successivo', () => {
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    // Catturato ORA, mentre le pile sono la stanza attiva: da inerte non sarebbe più
    // raggiungibile per ruolo (è il senso di `inert`), ma il nodo resta lo stesso.
    const primoFocusabileDellePile = within(pannello('pile')).getByRole('button', { name: 'Tutto il resto' })

    const linguetta = screen.getByRole('button', { name: /le cassette/i })
    fireEvent.click(linguetta)
    // Ancora lì: l'uscita è in corso, il bersaglio non è sparito da sotto il dito.
    expect(screen.getByRole('button', { name: /le cassette/i })).toBe(linguetta)
    fireEvent.click(linguetta)
    expect(accessiRegistrati()).toBe(1)

    // Il cambio stanza successivo è uno SWIPE (nessuna richiesta di focus da parte dell'utente):
    // il focus non deve entrare nella stanza che arriva.
    simulaScroll('pile', 0.9)
    expect(document.activeElement).not.toBe(primoFocusabileDellePile)
  })

  it('tap su «‹ Indietro» dalla parete: scrollTo a sinistra (left = offsetLeft della stanza pile)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    const { scrollTo } = preparaViewport(container)
    await viaIndietroParete(user)
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: 'smooth' })
  })

  it('con prefers-reduced-motion lo snap (via linguetta) è un salto: behavior "auto"', async () => {
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
      await viaLinguetta(user)
      expect(scrollTo).toHaveBeenCalledWith({ left: 362, behavior: 'auto' })
    } finally {
      window.matchMedia = originale
    }
  })
})

// Review finale whole-branch, C1 — il danno VERO della linguetta scappata su desktop non è
// estetico: `HomeV3` è spenta a ≥1024px da `.ua-home-mobile { display: none }` (HomeDesktop.tsx),
// ma la linguetta vive in PORTALE su `document.body`, fuori da quel sottoalbero, quindi quella
// regola non la raggiunge. Restava un bottone fisso e CLICCABILE sopra `HomeDesktop`: un tap
// spingeva l'indirizzo a `/cassette` (`vaiA` → `sincronizzaUrlStanza` → `pushState`) mentre la
// superficie visibile restava la home desktop — e da lì un reload apriva la parete standalone a
// un utente che non l'aveva mai chiesta. Questo test presidia la conseguenza, non solo la
// presenza: anche un fix che la nascondesse SOLO otticamente (senza toglierla dall'albero)
// lascerebbe il click possibile, e questo test lo prenderebbe.
describe('StanzePager — C1: a ≥1024px la linguetta non esiste e non può desincronizzare l\'indirizzo', () => {
  function attivaViewportDesktop(): () => void {
    const originale = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: /min-width:\s*1024px/.test(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    return () => {
      window.matchMedia = originale
    }
  }

  it('nessun bottone «Le cassette» in pagina, e nessuna pushState verso /cassette', async () => {
    const ripristina = attivaViewportDesktop()
    try {
      const user = userEvent.setup()
      render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      const linguetta = screen.queryByRole('button', { name: /le cassette/i })
      // Se il fix regredisse a una sola sparizione ottica, la linguetta sarebbe ancora qui e
      // ancora tappabile: il click sotto la userebbe, e l'asserzione sulla pushState cadrebbe.
      if (linguetta) await user.click(linguetta)
      expect(linguetta).toBeNull()
      expect(pushStateSpy).not.toHaveBeenCalledWith(expect.anything(), '', '/cassette')
    } finally {
      ripristina()
    }
  })

  it('e nemmeno il conteggio dei 3 accessi si muove (nessun tap possibile)', async () => {
    const ripristina = attivaViewportDesktop()
    try {
      render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      expect(screen.queryByRole('button', { name: /le cassette/i })).toBeNull()
      expect(accessiRegistrati()).toBe(0)
    } finally {
      ripristina()
    }
  })
})

// QA device (verbale 25/07, fix-list D3) — la garanzia esplicitamente richiesta dal brief: con
// i dot rimossi (e quindi niente più frecce ←→/roving tabindex), la stanza Parete deve restare
// raggiungibile da TASTIERA senza reintrodurre un indicatore visivo. La linguetta «Le cassette»
// è un `<button>` React vero — Tab la raggiunge nell'ordine naturale del documento, Invio/Spazio
// la attivano come qualunque bottone nativo, NESSUN codice dedicato in più serve per questo (a
// differenza dei dot, che avevano bisogno di roving tabindex + un handler `onKeyDown` scritto a
// mano). Il ritorno (parete→pile) passa dal tasto «‹ Indietro» dell'header, stesso discorso.
describe('StanzePager — percorso da tastiera dopo la rimozione dei dot (D3)', () => {
  it('Tab raggiunge la linguetta «Le cassette» e Invio la attiva: pushState + la parete diventa la stanza attiva', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    const linguetta = screen.getByRole('button', { name: /le cassette/i })
    linguetta.focus()
    expect(document.activeElement).toBe(linguetta)
    await user.keyboard('{Enter}')
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', '/cassette')
    expect(pannello('parete')).not.toHaveAttribute('inert')
  })

  it('dentro il pannello parete, Tab raggiunge «‹ Indietro» e Invio riporta alle pile', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="parete" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    const indietro = within(pannello('parete')).getByRole('button', { name: 'Indietro' })
    indietro.focus()
    expect(document.activeElement).toBe(indietro)
    await user.keyboard('{Enter}')
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
  })
})

// QA device T15.2 (verbale 2026-07-24, fix-list punto 2 — direttiva nuova): su un dito niente
// focus automatico nel pannello che si apre — la tastiera virtuale non deve salire da sola. Il
// test sopra («tap sulla linguetta… focus nella stanza entrante») copre già il ramo desktop
// (matchMedia di default in tests/setup.ts torna `matches: false` per qualunque query, quindi
// anche per `(pointer: coarse)`): qui si copre l'altro ramo, mockando `(pointer: coarse)` a
// `true`, stesso pattern del mock di `prefers-reduced-motion` sopra. Trigger sostituito (QA
// device D3): il dot non esiste più, la linguetta è l'unica via ESPLICITA rimasta su dito.
function mockPuntatoreCoarse() {
  const originale = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('pointer: coarse'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
  return () => { window.matchMedia = originale }
}

describe('StanzePager — niente focus automatico su dito (QA device T15.2, direttiva nuova)', () => {
  it('tap sulla linguetta su pointer coarse: la stanza entra (inert tolto) ma il focus NON si sposta', async () => {
    const ripristina = mockPuntatoreCoarse()
    try {
      const user = userEvent.setup()
      const { container } = render(
        <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
      )
      preparaViewport(container)
      const linguetta = screen.getByRole('button', { name: /le cassette/i })
      await viaLinguetta(user)
      expect(pannello('parete')).not.toHaveAttribute('inert')
      // Review finale whole-branch, D2 — qui c'era `expect(activeElement).not.toBe(primaDelTap
      // === document.body ? null : primaDelTap)`: a test appena montato niente è a fuoco, quindi
      // `primaDelTap` era `document.body`, il ternario dava `null` e la riga si riduceva a
      // «qualcosa è a fuoco» — l'OPPOSTO di quel che il titolo promette (e una regressione che
      // desse il focus alla pillola di ricerca del pannello la faceva passare serena: proprio la
      // tastiera virtuale che alzava T15.2). Ora sono due asserzioni POSITIVE.
      //
      // (1) Il focus è rimasto FUORI, dove il dito l'ha lasciato. Due esiti sono entrambi
      //     corretti e quale dei due capiti dipende da quanto è avanzata l'uscita della
      //     linguetta quando l'asserzione gira (`AnimatePresence` la tiene in scena mentre
      //     esce — v. il test del doppio tap più sopra): o è ancora lei ad avere il focus,
      //     cioè il nodo che ha ricevuto il tap, oppure è già uscita dall'albero e il focus di
      //     un nodo rimosso ricade sul body. Asserire UNO dei due sarebbe legare il test alla
      //     velocità della molla; asserirli come alternativa è la forma fedele. Misurato oggi:
      //     `document.body`.
      expect([document.body, linguetta]).toContain(document.activeElement)
      // (2) E in particolare il focus non è finito da NESSUNA parte dentro il pannello che
      //     entra — non solo «non su ‹ Indietro›»: la forma `contains` prende anche le
      //     regressioni che scelgono un altro focusabile della stanza (la pillola di ricerca,
      //     una cassetta), che è esattamente il difetto per cui T15.2 è stata aperta.
      expect(pannello('parete').contains(document.activeElement)).toBe(false)
    } finally {
      ripristina()
    }
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
    expect(pannello('parete')).not.toHaveAttribute('inert')
    expect(pannello('pile')).toHaveAttribute('inert')
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('una parete a metà strada (40%) NON cambia la stanza attiva: la soglia è vera, non decorativa', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    simulaScroll('parete', 0.4)
    expect(pannello('pile')).not.toHaveAttribute('inert')
    expect(pannello('parete')).toHaveAttribute('inert')
  })

  // QA device (verbale 25/07, fix-list D3) — trigger sostituito: prima si dava il focus a un dot
  // (ora morto), qui basta un focusabile qualunque fuori dalle stanze — la linguetta «Le
  // cassette», visibile mentre la pile è attiva.
  it("lo swipe NON ruba il focus: resta dov'è", () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    const linguetta = screen.getByRole('button', { name: /le cassette/i })
    linguetta.focus()
    simulaScroll('parete', 0.95)
    expect(document.activeElement).toBe(linguetta)
  })
})

// QA device (verbale 25/07, fix-list D3, decisione ratificata) — `ProgressDotsStanze` (il
// componente dei dot) è STATO RIMOSSO da `ProgressDots.tsx`: v. `tests/unit/ProgressDots.test.tsx`
// per la guardia dell'assenza dell'export. Non c'è più nulla da testare qui — questo describe
// esisteva solo per quel componente.

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
// Task 16b (D3 §3.4) — il vecchio s9 «Tutto a posto» è morto (v. src/lib/dashboard/striscia.ts):
// fixture generica per i test che non presidiano il CONTENUTO della striscia, aggiornata a un
// segnale quieto REALE e tuttora raggiungibile (s8, il racconto del DdC del giorno).
const SEGNALE = { attenzione: false, forte: null, testo: 'Oggi ho preparato 2 DdC ✓', azione: null }
const PARETE: CassettaParete[] = [
  { id: 'c1', nome: 'C12', colore: 'rossa', posizione: 1, lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'PZ-1', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: 'corona', noteInterne: null } },
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
  // QA device (verbale 25/07, fix-list D3) — niente più `tablist`/`tab`: le due stanze si
  // riconoscono solo da `data-stanza`/`aria-hidden` (v. commento sul pager).
  it("preferenza 'pile' + ?stanza=parete: il deep-link apre il pager SULLA parete, con le pile a uno swipe", () => {
    renderHome('pile', 'parete')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(document.querySelectorAll('[data-stanza]')).toHaveLength(2)
    expect(pannello('parete')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('pile')).toHaveAttribute('aria-hidden', 'true')
  })

  it("preferenza 'due_stanze': due stanze, niente dots, e UN SOLO ☰ raggiungibile (l'altro è dietro aria-hidden)", () => {
    renderHome('due_stanze')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Tutto il resto' })).toHaveLength(1)
    // Un solo TastoPiù, fuori dal pager (§3.3 regola 5): mai un doppione a metà snap.
    expect(screen.getAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(1)
    expect(document.querySelectorAll('[data-stanza]')).toHaveLength(2)
  })

  it("preferenza 'due_stanze' + ?stanza=parete: si entra dalla stanza parete", () => {
    renderHome('due_stanze', 'parete')
    expect(pannello('parete')).toHaveAttribute('aria-hidden', 'false')
    expect(pannello('pile')).toHaveAttribute('inert')
  })

  // QA device T15 (addendum 24/07, punto 5, supera Task 12/D2) — la stanza parete ora porta il
  // TITOLO VERO «Le cassette» (chrome di pagina completo, stesso componente di `/cassette`),
  // non più un titolo home-specifico né l'assenza totale di header della D2 originale. Niente
  // TastoPiù qui (a differenza di prima): la pagina /cassette che questa forma rispecchia non
  // ne ha uno — un doppione l'avrebbe fatta divergere dalla superficie reale (v. `HomeV3.tsx`).
  it("preferenza 'parete': la pagina /cassette VERA (chrome completo), nessun pager, niente TastoPiù", () => {
    renderHome('parete')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByText('DA CONSEGNARE OGGI')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Le cassette' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cassetta C12/ })).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(0)
  })

  it("preferenza 'parete': il back dell'header usa il default (nessun pager a cui tornare — comportamento di /cassette)", async () => {
    const user = userEvent.setup()
    renderHome('parete')
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(push).toHaveBeenCalledWith('/dashboard')
  })
})

// QA device T15 (addendum 24/07, punto 3) — «niente TastoPiù nel lato cassette»: verificato qui
// (non solo in `stanze-pager.test.tsx`) perché è `HomeV3` a possedere il piede e a decidere,
// dal callback `onStanzaChange` del pager, se renderlo.
describe('HomeV3 — il piede sparisce sul lato cassette del pager (QA device T15, addendum punto 3)', () => {
  it('preferenza \'due_stanze\': il TastoPiù c\'è mentre si guardano le pile (stanza iniziale)', () => {
    renderHome('due_stanze')
    expect(screen.getAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(1)
  })

  it('preferenza \'due_stanze\' + ?stanza=parete: il TastoPiù NON c\'è quando si apre già sulla parete', () => {
    renderHome('due_stanze', 'parete')
    expect(screen.queryAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(0)
  })

  it('navigazione esplicita verso la parete: il TastoPiù sparisce; tornando alle pile riappare', async () => {
    const user = userEvent.setup()
    const { container } = renderHome('due_stanze')
    preparaViewport(container)
    expect(screen.getAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(1)
    await viaLinguetta(user)
    expect(screen.queryAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(0)
    await viaIndietroParete(user)
    expect(screen.getAllByRole('button', { name: /nuovo lavoro/i })).toHaveLength(1)
  })
})

// Piede statico (verbale 26/07, commit `5957b24` — abroga il capitolo H4c): il piede vive
// DENTRO il pannello della stanza Pile del pager, fermo, senza alcuna coreografia legata allo
// swipe; sul pannello Parete non esiste per costruzione (né nodo né ingombro).
describe('HomeV3 — piede statico nel pager (verbale 26/07, abroga H4c)', () => {
  it('il piede è un discendente DOM di [data-stanza="pile"], mai di [data-stanza="parete"]', () => {
    const { container } = renderHome('due_stanze')
    const nelPannelloPile = within(pannello('pile')).getByRole('button', { name: /nuovo lavoro/i })
    expect(nelPannelloPile).toBeInTheDocument()
    expect(pannello('parete').querySelector('.foot')).toBeNull()
    // Nessun ingombro riservato-ma-vuoto: il nodo `.foot` semplicemente non esiste nel
    // sottoalbero della parete, non un elemento nascosto/collassato via classe o stile.
    expect(container.querySelectorAll('.foot')).toHaveLength(1)
  })

  it('il piede non porta alcuna custom property di coreografia (né inline né da un ref)', () => {
    const { container } = renderHome('due_stanze')
    const piede = container.querySelector('.foot') as HTMLElement
    expect(piede).not.toBeNull()
    // Capitolo H4c scriveva --piede-etichetta-opacita/--piede-tondo-scala/--piede-tondo-opacita/
    // --piede-ingombro via ref a ogni tick di scroll (v. HomeV3.tsx, ABROGATO): un piede
    // DAVVERO statico non ha alcuno stile inline scritto imperativamente.
    expect(piede.getAttribute('style')).toBeNull()
    expect(piede.classList.contains('is-vuoto')).toBe(false)
  })

  it('lo scroll nativo del pager non scrive più nulla sul piede (nessun listener di coreografia residuo)', () => {
    const { container } = renderHome('due_stanze')
    const { viewport } = preparaViewport(container)
    const piede = container.querySelector('.foot') as HTMLElement
    act(() => {
      Object.defineProperty(viewport, 'scrollLeft', { value: 195, configurable: true })
      Object.defineProperty(viewport, 'clientWidth', { value: 390, configurable: true })
      fireEvent.scroll(viewport)
    })
    expect(piede.getAttribute('style')).toBeNull()
  })

  it('il tap sul piede porta al wizard, invariato', async () => {
    const user = userEvent.setup()
    renderHome('due_stanze')
    await user.click(screen.getByRole('button', { name: /nuovo lavoro/i }))
    expect(push).toHaveBeenCalledWith('/lavori/nuovo')
  })

  it('forma "pile" (nessun pager): il piede resta fuori da qualunque stanza, invariato', () => {
    const { container } = renderHome('pile')
    expect(container.querySelector('[data-stanza]')).toBeNull()
    expect(container.querySelector('.foot')).not.toBeNull()
  })

  it('forma "parete" (nessun pager): il piede non esiste, invariato', () => {
    const { container } = renderHome('parete')
    expect(container.querySelector('.foot')).toBeNull()
  })
})

describe('Collaudo R2 — il focus del cambio stanza non deve scrollare (D-1, 22/07 sera)', () => {
  // Root cause accertata su Chromium reale: il focus() post-render SENZA preventScroll fa lo
  // scroll-into-view istantaneo, che CANCELLA lo scrollTo smooth del viewport; lo snap mandatory
  // ri-aggancia alla stanza di partenza → il tap sembra morto. Trigger sostituito (QA device
  // D3): il dot non esiste più, la linguetta è la via ESPLICITA rimasta.
  it('tap sulla linguetta: ogni focus() porta preventScroll:true', async () => {
    const chiamate: Array<FocusOptions | undefined> = []
    const spia = vi.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (opts?: FocusOptions) {
      chiamate.push(opts)
    })
    try {
      const { container } = render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
      preparaViewport(container)
      chiamate.length = 0
      const linguetta = screen.getByRole('button', { name: /le cassette/i })
      await act(async () => {
        linguetta.click()
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

  it('tornare sulle pile e poi risvoltare alla parete registra un SECONDO accesso (solo le transizioni pile→parete contano)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await viaLinguetta(user)
    expect(accessiRegistrati()).toBe(1)
    await viaIndietroParete(user)
    expect(accessiRegistrati()).toBe(1) // parete→pile non registra nulla
    await viaLinguetta(user)
    expect(accessiRegistrati()).toBe(2)
  })

  it('il tap sulla linguetta «Le cassette» conta UN solo accesso, non due (niente doppio conteggio fra la linguetta e il setter del pager)', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />
    )
    preparaViewport(container)
    await viaLinguetta(user)
    expect(accessiRegistrati()).toBe(1)
    expect(pannello('parete')).not.toHaveAttribute('inert')
  })

  it('la stanza Pile non registra nulla al mount: zero accessi finché non si arriva davvero alla parete', () => {
    render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={PARETE_STANZA_TEST} />)
    expect(accessiRegistrati()).toBe(0)
  })
})

// QA device (verbale 25/07, fix-list D5b/D8) — il criterio di accettazione ESATTO del brief:
// dallo stato «swipe → parete → azione che rifarebbe router.refresh() riuscita», il pager deve
// restare montato (non sostituito dalla pagina standalone, D5), e il back fisico deve tornare
// alle pile secondo la catena pushState del pager (D8), non a un back "a vuoto". Riusa il
// pattern di mock di history + popstate già in uso in questo file. L'azione scelta (▲▼ dello
// sheet cassetta) è la via più diretta per esercitare `riordina` — il drop del drag vero e
// proprio, con lo stesso gate, è presidiato a livello di componente in
// `tests/unit/parete-client.test.tsx` (harness pointerdown/move/up, stesso pattern di
// `use-drag-riordino.test.ts`).
describe('StanzePager — D8: il pager resta montato dopo un\'azione con refresh gated; il back fisico torna alle pile', () => {
  it('swipe → parete → riordino ▲▼ riuscito: nessun router.refresh, il pager resta montato; popstate riporta alle pile', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: async () => ({ esito: 'ok' }) }))
    try {
      const user = userEvent.setup()
      const dueCassette: CassettaParete[] = [
        { id: 'c1', nome: 'C1', colore: 'grigia', posizione: 1, lavoro: null },
        { id: 'c2', nome: 'C2', colore: 'blu', posizione: 2, lavoro: null },
      ]
      const { container } = render(<StanzePager stanzaIniziale="pile" pile={CONTENUTO_PILE} parete={dueCassette} />)
      preparaViewport(container)
      simulaScroll('parete', 0.9) // swipe → parete: pushState armato, sospendiRefresh true

      const cassettaC1 = within(pannello('parete')).getByRole('button', { name: /^Cassetta C1/ })
      fireEvent.pointerDown(cassettaC1, { clientX: 0, clientY: 0 })
      fireEvent.pointerUp(cassettaC1, { clientX: 0, clientY: 0 }) // fermo = sheet, non drop
      // Lo sheet è in portale su document.body (`Sheet.tsx`), FUORI da `pannello('parete')`.
      await user.click(screen.getByRole('button', { name: 'Sposta giù' }))
      await waitFor(() => expect(fetch).toHaveBeenCalled())

      // D5b — nessun router.refresh: il pager NON viene sostituito dalla pagina standalone.
      expect(refresh).not.toHaveBeenCalled()
      // Il pager è ancora quello vero: il pannello pile esiste ancora nel DOM (non un remount
      // da router-cache che avrebbe perso lo stato).
      expect(pannello('pile')).toBeInTheDocument()

      // D8 — back fisico: popstate riporta il pager sulle pile, senza un secondo history.back.
      historyBackSpy.mockClear()
      act(() => {
        window.dispatchEvent(new Event('popstate'))
      })
      expect(pannello('pile')).toHaveAttribute('aria-hidden', 'false')
      expect(pannello('pile')).not.toHaveAttribute('inert')
      expect(pannello('parete')).toHaveAttribute('inert')
      expect(historyBackSpy).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
