// Task 11 — PareteClient: la parete viva di `/cassette` (§5, spec
// 2026-07-21-parete-cassette-design.md). Test in tests/unit/ (D-O1).
//
// NB: `Cassetta` non ha `onClick` — reagisce a pointerdown/pointerup (§5.35, gesto
// tap/long-press). Un `fireEvent.click` NON chiama `onTap`: qui si usa la stessa coppia di
// eventi di `tests/unit/Cassetta.test.tsx`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PareteClient } from '@/components/features/cassette/PareteClient'
import { trovaParoleVietate } from '@/design-system/v3/dizionario'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, back: vi.fn() }) }))

// QA device T15.1 (verbale 2026-07-24, fix-list punto 1) — CAUSA TROVATA: `initSuoni()` (sound.ts)
// non veniva MAI chiamato in nessuna superficie reale (solo nel catalogo demo), quindi l'unlock
// dell'AudioContext non si armava mai e stacco/riaggancio del drag restavano muti — v. report
// FIX-C. Qui si presidia il CABLAGGIO: `initSuoni` deve essere chiamato al mount di `PareteClient`
// (la superficie con la parete vera, montata in ogni percorso home/pannello/standalone). `suona`
// resta un no-op tracciabile: altri test in questo file non lo asseriscono, ma un mock parziale
// che lo perdesse romperebbe TastoTondo/useDragRiordino silenziosamente.
const { initSuoniSpy, suonaSpy } = vi.hoisted(() => ({ initSuoniSpy: vi.fn(), suonaSpy: vi.fn() }))
vi.mock('@/design-system/v3/sound', () => ({ initSuoni: initSuoniSpy, suona: suonaSpy }))

beforeEach(() => { push.mockClear(); refresh.mockClear(); initSuoniSpy.mockClear(); suonaSpy.mockClear() })

const occupata: CassettaParete = {
  id: 'c-a', nome: 'C12', colore: 'rossa', posizione: 0,
  lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: 'Corona zirconia', noteInterne: null },
}
const libera: CassettaParete = { id: 'c-b', nome: 'C4', colore: 'grigia', posizione: 1, lavoro: null }

const cassettaOccupata = () => screen.getByRole('button', { name: /^Cassetta C12/ })
const cassettaLibera = () => screen.getByRole('button', { name: 'Cassetta C4, libera' })

function tap(elemento: HTMLElement) {
  fireEvent.pointerDown(elemento, { clientX: 0, clientY: 0 })
  fireEvent.pointerUp(elemento, { clientX: 0, clientY: 0 })
}

describe('PareteClient — sblocco audio (QA device T15.1, verbale 2026-07-24, fix-list punto 1)', () => {
  it('chiama initSuoni() al mount — senza questo, sbloccato resta false per sempre e ogni suono v3 (stacco/riaggancio incluso) esce subito da suona() (v. sound.ts)', () => {
    render(<PareteClient parete={[occupata, libera]} />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })

  it('chiama initSuoni() anche a parete vuota (nessuna cassetta) — il cablaggio non dipende dal contenuto', () => {
    render(<PareteClient parete={[]} />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })

  it('chiama initSuoni() anche montato dentro il pannello del pager (onIndietro presente, come in StanzePager.tsx)', () => {
    render(<PareteClient parete={[occupata]} onIndietro={vi.fn()} attivo />)
    expect(initSuoniSpy).toHaveBeenCalledTimes(1)
  })
})

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

// QA device T15 (addendum 24/07) — la D2 originale (Task 12, spec redesign §3.1: `contesto`
// 'pagina'/'stanza', header spento nella stanza embeddata) è SUPERATA: Francesco, al collaudo,
// ha deciso che lo swipe non porta più a una stanza a chrome ridotto ma alla pagina /cassette
// VERA — quindi il chrome di pagina rende SEMPRE, ovunque questa `PareteClient` sia montata
// (pannello del pager, forma «solo parete» della home, `/cassette` standalone). Il prop
// `contesto` è morto con questa decisione. Quel che resta configurabile: `onIndietro` (il
// pannello del pager sostituisce il back di default con un ritorno alle pile) e `attivo`
// (refresh gated, riserva ARCH R2 — invariato).
describe('PareteClient — chrome di pagina SEMPRE presente (QA device T15, supera Task 12/D2)', () => {
  it('l\'header rende sempre: titolo, «‹ Indietro» e «☰ Tutto il resto», con o senza `attivo`', () => {
    render(<PareteClient parete={[occupata]} attivo />)
    expect(screen.getByRole('heading', { name: 'Le cassette' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Indietro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tutto il resto' })).toBeInTheDocument()
  })

  it('senza `onIndietro` il back usa il default (`tornaIndietro` → push su /dashboard senza storia)', async () => {
    render(<PareteClient parete={[occupata]} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(push).toHaveBeenCalledWith('/dashboard')
  })

  it('con `onIndietro` il back del pannello chiama il callback del pager, MAI router.back/push', async () => {
    const onIndietro = vi.fn()
    render(<PareteClient parete={[occupata]} onIndietro={onIndietro} />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Indietro' }))
    expect(onIndietro).toHaveBeenCalledTimes(1)
    expect(push).not.toHaveBeenCalled()
  })

  it('refresh gated (riserva ARCH R2, invariato): con attivo=false il focus NON chiama router.refresh', () => {
    render(<PareteClient parete={[occupata]} attivo={false} />)
    fireEvent(window, new Event('focus'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('con attivo=true (default) il focus rilegge (comportamento di /cassette conservato)', () => {
    render(<PareteClient parete={[occupata]} />)
    fireEvent(window, new Event('focus'))
    expect(refresh).toHaveBeenCalled()
  })
})

// QA device T15 — scoperto in verifica browser reale (v. report FIX-A): dopo il pushState su
// /cassette da dentro il pannello del pager, Next.js aggiorna il proprio `canonicalUrl` a
// `/cassette` (shallow, VOLUTO), ma questo rende pericoloso un `router.refresh()` SILENZIOSO
// (nessun gesto dell'utente) mentre l'albero montato è ancora quello di `/dashboard`: rifà il
// fetch della rotta VERA `/cassette` sul server e ne sostituisce il contenuto al pannello.
// `sospendiRefresh` gate SOLO questo refresh — verificato riproducendo esattamente il trigger
// (evento `focus` sintetico) che in browser reale innescava lo scambio.
describe('PareteClient — sospendiRefresh (QA device T15, difetto trovato in verifica browser)', () => {
  it('con sospendiRefresh=true il focus NON chiama router.refresh, anche con attivo=true', () => {
    render(<PareteClient parete={[occupata]} attivo sospendiRefresh />)
    fireEvent(window, new Event('focus'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('con sospendiRefresh=true anche il visibilitychange NON chiama router.refresh', () => {
    render(<PareteClient parete={[occupata]} attivo sospendiRefresh />)
    fireEvent(document, new Event('visibilitychange'))
    expect(refresh).not.toHaveBeenCalled()
  })

  it('sospendiRefresh di default è false: il comportamento di /cassette standalone resta invariato', () => {
    render(<PareteClient parete={[occupata]} attivo />)
    fireEvent(window, new Event('focus'))
    expect(refresh).toHaveBeenCalled()
  })
})

// QA device (verbale 25/07, fix-list D5b/D8) — CAUSA ACCERTATA: con l'indirizzo già /cassette
// (pushState dello swipe), un `router.refresh()` qualunque — non solo quello silenzioso di
// focus/visibilitychange — rifà il fetch della route VERA e SOSTITUISCE il pager con la pagina
// standalone: è sia il «si sistema da solo» di D5 sia la radice del back incoerente di D8
// (listener popstate e urlPushataRef del pager distrutti nello smontaggio). Il gate
// `sospendiRefresh` (finora limitato al refresh silenzioso) si estende qui a TUTTI i
// `router.refresh()` del percorso parete: il drop del drag (`onRefresh` di `useDragRiordino`),
// `dopoCambio` (creazione/rinomina riuscita) e `riordina` (▲▼ dello sheet). In embedded si tiene
// lo stato ottimistico già in pagina — la rilettura vera avverrà al prossimo caricamento reale
// della route. Sulla route standalone (`sospendiRefresh` di default `false`) il comportamento
// resta l'INVARIATO di sempre — le guardie in
// `describe('PareteClient — un'azione RIUSCITA chiude lo sheet …')` sotto continuano a passare
// senza `sospendiRefresh` e restano la prova di non-regressione.
describe('PareteClient — sospendiRefresh estende il gate a TUTTI i refresh del percorso parete (QA device D5b/D8)', () => {
  it('con sospendiRefresh=true, una rinomina riuscita (dopoCambio) NON chiama router.refresh — resta lo stato ottimistico', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: async () => ({ esito: 'ok' }) }))
    try {
      render(<PareteClient parete={[occupata, libera]} sospendiRefresh />)
      tap(cassettaLibera())
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
      fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
      // Lo sheet si chiude comunque (setSheet(null) non è gated, solo il refresh lo è).
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'C4' })).toBeNull())
      expect(refresh).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('con sospendiRefresh=true, uno spostamento ▲▼ riuscito (riordina) NON chiama router.refresh', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: async () => ({ esito: 'ok' }) }))
    try {
      const c1: CassettaParete = { id: 'c-1', nome: 'C1', colore: 'grigia', posizione: 0, lavoro: null }
      const c2: CassettaParete = { id: 'c-2', nome: 'C2', colore: 'blu', posizione: 1, lavoro: null }
      render(<PareteClient parete={[c1, c2]} sospendiRefresh />)
      const user = userEvent.setup()
      // Long-press legacy: con ricerca spenta e ≥2 cassette il drag è abilitato, ma lo sheet
      // resta raggiungibile via long-press (§5.35) — qui basta aprirlo per arrivare ai ▲▼.
      fireEvent.pointerDown(screen.getByRole('button', { name: /^Cassetta C1/ }), { clientX: 0, clientY: 0 })
      fireEvent.pointerUp(screen.getByRole('button', { name: /^Cassetta C1/ }), { clientX: 0, clientY: 0 })
      await user.click(screen.getByRole('button', { name: 'Sposta giù' }))
      await waitFor(() => expect(fetch).toHaveBeenCalled())
      expect(refresh).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  // Stesso harness di `use-drag-riordino.test.ts` (pointerdown fermo 300ms → lift → pointermove
  // oltre soglia → pointerup su `window`): qui si monta `PareteClient` VERO (via `Cassetta`, che
  // riconosce il gesto da sé), non l'harness isolato dell'hook — il punto sotto esame è il
  // CALLBACK che PareteClient passa come `onRefresh`, non l'hook. Fake timers per il lift a
  // 300ms (stesso pattern del test «drag abilitato» sopra in questo file), poi `act(async …)`
  // per lasciar risolvere la POST prima di leggere `refresh` (stesso pattern del test del drop
  // in `use-drag-riordino.test.ts`).
  it('con sospendiRefresh=true, un drop di drag riuscito NON chiama router.refresh (D8: il pager resterebbe montato)', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: async () => ({ esito: 'ok' }) }))
    try {
      const c1: CassettaParete = { id: 'c-1', nome: 'C1', colore: 'grigia', posizione: 0, lavoro: null }
      const c2: CassettaParete = { id: 'c-2', nome: 'C2', colore: 'blu', posizione: 1, lavoro: null }
      const c3: CassettaParete = { id: 'c-3', nome: 'C3', colore: 'verde', posizione: 2, lavoro: null }
      render(<PareteClient parete={[c1, c2, c3]} sospendiRefresh />)
      const bottone = screen.getByRole('button', { name: /^Cassetta C1/ })
      fireEvent.pointerDown(bottone, { clientX: 10, clientY: 10, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) }) // Cassetta spara onSollevata → hook.avvia
      act(() => {
        window.dispatchEvent(new (window.PointerEvent)('pointermove', { pointerId: 1, clientX: 200, clientY: 200 }))
      })
      await act(async () => {
        window.dispatchEvent(new (window.PointerEvent)('pointerup', { pointerId: 1, clientX: 200, clientY: 200 }))
      })
      expect(fetch).toHaveBeenCalledTimes(1)
      await act(async () => {}) // lascia risolvere la POST prima di leggere il refresh che ne segue
      expect(refresh).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
      vi.unstubAllGlobals()
    }
  })
})

// Ratifica 22/07 (spec redesign §2.4) — la ricerca «che accende» muore: con ricerca attiva le
// non-match si SMONTANO (niente più `is-spenta`, il valore muore dal tipo `Cassetta`) e le match
// risalgono in testa nell'ordine relativo della parete. Il filtro/riordino è debounced a ~180ms
// (riserva FE R4 — un FLIP per keystroke su 30 celle è il punto dove peggiora WebKit); l'input
// resta controllato ISTANTANEO (la «×» segue `query`, non il valore debounced).
describe('PareteClient — ricerca «filtra e risali» (ratifica 22/07, spec redesign §2.4)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const c1SenzaMatch: CassettaParete = { id: 'c-1', nome: 'C1', colore: 'grigia', posizione: 0, lavoro: null }
  const c2ConMatch: CassettaParete = {
    id: 'c-2', nome: 'C2', colore: 'rossa', posizione: 1,
    lavoro: { id: 'l2', numero: '200', dentista: 'Esposito', paziente: 'PAZ-1', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: null, noteInterne: null },
  }
  const c3ConMatch: CassettaParete = {
    id: 'c-3', nome: 'C3', colore: 'blu', posizione: 2,
    lavoro: { id: 'l3', numero: '201', dentista: 'Esposito', paziente: 'PAZ-2', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: null, noteInterne: null },
  }

  // Helper del file: input controllato istantaneo via `fireEvent.change` (`userEvent.type` sotto
  // fake timers si impalla senza `advanceTimers` configurato — il test del drag a riga ~272 già
  // usa `fireEvent.change` sotto fake timers in questo stesso file).
  function digita(testo: string) {
    fireEvent.change(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), { target: { value: testo } })
  }

  // Ancorato a `/^Cassetta/i`: `/cassetta/i` da solo prenderebbe anche la tile «+ Nuova cassetta»
  // (nome accessibile "Nuova cassetta", contiene comunque "cassetta").
  function primaCassetta() {
    return screen.getAllByRole('button', { name: /^Cassetta/i })[0]
  }

  function longPress(elemento: HTMLElement) {
    fireEvent.pointerDown(elemento, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
    act(() => { vi.advanceTimersByTime(300) }) // SOGLIA_LONG_PRESS_MS (Cassetta.tsx)
    fireEvent.pointerUp(elemento, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
  }

  it('con ricerca attiva le non pertinenti SPARISCONO e le trovate risalgono in ordine relativo', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch, c3ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(250) }) // oltre il debounce di 180ms
    const nomi = screen.getAllByRole('button', { name: /^Cassetta/i }).map((b) => b.getAttribute('aria-label'))
    expect(nomi.join(' ')).not.toMatch(/C1,/)
    expect(nomi.findIndex((n) => /^Cassetta C2/.test(n ?? ''))).toBeLessThan(nomi.findIndex((n) => /^Cassetta C3/.test(n ?? '')))
  })

  // Review finale whole-branch — «accesa» è un residuo della ricerca «che accende» (spec §5.1),
  // superata dalla ratifica 22/07 «filtra e risali»: da allora le non-match si SMONTANO, quindi
  // ogni cassetta ancora in pagina È un match. Accenderle tutte non distingue nulla — né a
  // vista (un anello blu su ognuna) né all'ascolto, dove `aria-current="true"` su OGNI voce fa
  // dire «corrente» a tutta la lista. Lo stato del filtro lo porta già la riga conteggio, in
  // parole. Lo stato `accesa` del componente resta vivo (catalogo, test di `Cassetta`): è QUESTO
  // chiamante a non averne più bisogno.
  it('con ricerca attiva nessuna cassetta è «accesa»: niente aria-current su ogni voce (le non-match sono già smontate)', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch, c3ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(250) })
    const trovate = screen.getAllByRole('button', { name: /^Cassetta/i })
    expect(trovate.length).toBeGreaterThan(1)
    for (const b of trovate) {
      expect(b).not.toHaveAttribute('aria-current')
      expect(b.className).not.toContain('is-accesa')
    }
  })

  it('riga conteggio: «2 cassette trovate» / «1 cassetta trovata» / vuoto con invito', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch, c3ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByRole('status')).toHaveTextContent('2 cassette trovate')
  })

  it('un solo match → singolare «1 cassetta trovata»', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByRole('status')).toHaveTextContent('1 cassetta trovata')
  })

  it('zero match → riga quieta con invito, nessuna cassetta rimane montata', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch]} />)
    digita('xyz')
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByRole('status')).toHaveTextContent('Niente per “xyz” — prova con meno lettere')
    expect(screen.queryAllByRole('button', { name: /^Cassetta/i })).toHaveLength(0)
  })

  it('senza query nessuna cassetta è accesa, e l\'annuncio tace', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch]} />)
    expect(primaCassetta().className).not.toContain('is-accesa')
    // `toHaveTextContent('')` passerebbe con QUALUNQUE testo (match per sottostringa vuota): il
    // silenzio si asserisce sull'elemento vuoto.
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('il valore che filtra è debounced (~180ms): a 100ms la parete è ancora intera', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(100) })
    expect(screen.getAllByRole('button', { name: /^Cassetta/i })).toHaveLength(2)
  })

  it('una cassetta trovata resta tappabile durante la ricerca (naviga al lavoro)', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(250) })
    tap(screen.getByRole('button', { name: /^Cassetta C2/ }))
    expect(push).toHaveBeenCalledWith('/lavori/l2')
  })

  // I5 — lo sheet che ora si apre insieme all'hint porta con sé la PROPRIA `role="status"`
  // (l'annuncio dei ▲▼, vuoto finché non si sposta nulla): la riga del muro si cerca dentro
  // `container`, non su tutta la pagina — il pannello dello sheet vive in portale su
  // `document.body`, fuori di lì.
  it('long-press durante la ricerca: hint «Svuota la ricerca…» al posto del fallimento silenzioso', () => {
    const { container } = render(<PareteClient parete={[c2ConMatch, c3ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(250) })
    longPress(primaCassetta())
    expect(within(container).getByRole('status')).toHaveTextContent('Svuota la ricerca per spostare le cassette')
  })

  // P7 (collaudo device 22/07, ratifica Francesco) — la «×» di pulizia è NOSTRA (il clear
  // nativo di type="search" si nasconde in globals.css: esiste solo su Chrome, mai su Safari).
  // La «×» segue la query ISTANTANEA — appare subito, senza attendere il debounce del filtro.
  it('P7 — la «×» «Svuota la ricerca» appare mentre si digita (istantanea) e, cliccata, svuota la query e la parete torna piena', () => {
    render(<PareteClient parete={[c1SenzaMatch, c2ConMatch]} />)
    expect(screen.queryByRole('button', { name: 'Svuota la ricerca' })).toBeNull()

    const campo = screen.getByPlaceholderText('Cerca una cassetta o un lavoro…')
    digita('esposito')
    // Nessun avanzamento di timer: la «×» è già lì, prima che il debounce scada.
    const pulisci = screen.getByRole('button', { name: 'Svuota la ricerca' })
    expect(pulisci).toBeInTheDocument()

    fireEvent.click(pulisci)
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.queryByRole('button', { name: 'Svuota la ricerca' })).toBeNull()
    expect(campo).toHaveValue('')
    expect(screen.getAllByRole('button', { name: /^Cassetta/i })).toHaveLength(2)
  })
})

describe('PareteClient — i tap (§5, semantica gesti §5.35)', () => {
  it('tap su cassetta occupata → scheda del lavoro', () => {
    render(<PareteClient parete={[occupata, libera]} />)
    tap(cassettaOccupata())
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

  it('Task 12 — lo sheet «nuova» si CHIUDE e `aria-expanded` torna false (l\'intento aveva una sola porta: entrarci)', async () => {
    render(<PareteClient parete={[occupata]} />)
    const user = userEvent.setup()
    const tile = screen.getByRole('button', { name: /Nuova cassetta/ })
    await user.click(tile)
    // Il corpo dello sheet è montato davvero (non più un intento senza dialog).
    expect(screen.getByRole('dialog', { name: 'Nuova cassetta' })).toBeInTheDocument()
    expect(tile).toHaveAttribute('aria-expanded', 'true')

    // Via d'uscita del `Sheet` ds: il «Chiudi» in fondo instrada su `onChiudi` come scrim ed Esc.
    await user.click(screen.getByRole('button', { name: 'Chiudi' }))
    expect(tile).toHaveAttribute('aria-expanded', 'false')
  })

  it('Task 12 — Esc chiude lo sheet cassetta (il ramo {tipo:\'cassetta\'} ora si legge davvero)', async () => {
    render(<PareteClient parete={[occupata, libera]} />)
    tap(cassettaLibera())
    expect(screen.getByRole('dialog', { name: 'C4' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    // `waitFor` e non un assert secco: il `Sheet` ds esce con `AnimatePresence` (§8.2.2), quindi
    // il pannello resta nel DOM finché la discesa non è finita — la chiusura è vera lo stesso.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'C4' })).toBeNull())
  })

  it('Task 12 — il nome suggerito è il prossimo della serie C sui nomi vivi (fuori serie ignorati)', async () => {
    const fuoriSerie: CassettaParete = { ...libera, id: 'c-x', nome: 'Banco Ciro', posizione: 2 }
    render(<PareteClient parete={[{ ...occupata, nome: 'C12' }, fuoriSerie]} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Nuova cassetta/ }))
    expect(screen.getByLabelText('Nome')).toHaveValue('C13')
  })

  it('serie C case-insensitive (review finale): «c3» minuscola conta — l\'indice DB è su lower(nome), suggerire «C1» sbatterebbe su 409', async () => {
    render(<PareteClient parete={[{ ...libera, nome: 'c3' }]} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Nuova cassetta/ }))
    expect(screen.getByLabelText('Nome')).toHaveValue('C4')
  })

  it('hold 300ms fermo su una cassetta OCCUPATA non degrada in tap-che-naviga (review Task 11, Important 2): senza `onLongPressSheet` il gesto sparirebbe in silenzio dentro `Cassetta` (il timer lì parte solo se la prop è passata) e la pressione lunga ricadrebbe sul tap', () => {
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[occupata, libera]} />)
      const bottone = cassettaOccupata()
      // Fermo (<8px, mai superata): un pointermove qui eserciterebbe il ramo drag, non quello
      // long-press — la soglia di movimento è del componente Cassetta, non di questo test.
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
      vi.advanceTimersByTime(300) // SOGLIA_LONG_PRESS_MS (Cassetta.tsx)
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0 })
      expect(push).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

// Review Task 12, Finding 3 — il requisito centrale del Task 12 («`setSheet(null)` parte da OGNI
// via d'uscita») era difeso a metà: i test sopra esercitano solo `onChiudi` (il tasto «Chiudi»,
// Esc). Il ramo del SUCCESSO — `onCreata`/`onCambiata` → `dopoCambio` → `setSheet(null)` — non era
// coperto da nessuno: togliendo `setSheet(null)` da `dopoCambio` e lasciando solo `router.refresh()`
// l'intera suite restava verde. Questi due test sono la guardia che manca, uno per sheet.
//
// Perché la chiusura si asserisce QUI e non nei test dei due sheet: chiudere non è un fatto dello
// sheet (che si limita a chiamare la callback), è un fatto del `PareteClient`, l'unico che possiede
// lo stato `sheet`. Solo montando lui si vede l'anello completo azione → callback → stato → DOM.
describe('PareteClient — un\'azione RIUSCITA chiude lo sheet (review Task 12, Finding 3)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('creazione riuscita (201) → lo sheet «nuova» si chiude e `aria-expanded` torna false', async () => {
    fetchMock().mockResolvedValueOnce({ status: 201, json: async () => ({ cassetta: {} }) })
    render(<PareteClient parete={[occupata]} />)
    const user = userEvent.setup()
    const tile = screen.getByRole('button', { name: /Nuova cassetta/ })
    await user.click(tile)
    expect(tile).toHaveAttribute('aria-expanded', 'true')

    // Nome precompilato: C12 è viva, quindi il prossimo della serie è C13.
    await user.click(screen.getByRole('button', { name: 'Crea C13' }))

    // Il successo chiude E rilegge: sono due fatti distinti e si asseriscono distinti — con solo
    // il refresh (la mutazione della review) lo sheet resterebbe aperto sopra la parete nuova.
    await waitFor(() => expect(tile).toHaveAttribute('aria-expanded', 'false'))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuova cassetta' })).toBeNull())
    expect(refresh).toHaveBeenCalled()
  })

  it('rinomina riuscita (200) → lo sheet cassetta si chiude (non solo la sua «Chiudi»)', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    render(<PareteClient parete={[occupata, libera]} />)
    tap(cassettaLibera())
    expect(screen.getByRole('dialog', { name: 'C4' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))

    // `waitFor` come nel test dell'Esc: il `Sheet` ds esce con `AnimatePresence`, il pannello
    // resta montato per tutta la discesa.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'C4' })).toBeNull())
    expect(refresh).toHaveBeenCalled()
  })
})

// Task 13 — wiring del drag. Il gesto vero (ghost, FLIP, auto-scroll, preventDefault) è
// device/Playwright (§6.4): qui si prova solo che PareteClient CABLA l'hook — chi possiede il
// gesto quando, e che il rilascio fermo dopo il sollevamento apra lo sheet passando per l'hook.
describe('PareteClient — wiring del drag (Task 13, §2.5/§3)', () => {
  it('drag abilitato: hold 300ms + rilascio FERMO apre lo sheet passando per l\'hook (onSheet), non per il long-press legacy di Cassetta', () => {
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[occupata, libera]} />)
      const bottone = cassettaLibera()
      // pointerId esplicito: l'hook filtra i suoi listener di window su quello.
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) }) // Cassetta spara onSollevata → hook.avvia
      // Il pointerup arriva a window (l'hook), non serve che Cassetta lo gestisca: dopo il
      // sollevamento Cassetta tace (invariante del panel).
      act(() => { window.dispatchEvent(new (window.PointerEvent)('pointerup', { pointerId: 1, clientX: 0, clientY: 0 })) })
      expect(screen.getByRole('dialog', { name: 'C4' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  // Review finale whole-branch, I5 — questo test diceva «…invece di aprire lo sheet», ed era il
  // difetto messo per iscritto: il ragionamento della riserva UX 1 riguarda il DRAG (che con la
  // parete filtrata non può convivere), ma il rimedio aveva sostituito il long-press per intero.
  // Su una cassetta OCCUPATA il long-press è l'UNICA via allo sheet — il tap naviga al lavoro —
  // quindi durante una ricerca sparivano rinomina, colore, «Segna come libera», ▲▼ e posizione:
  // per rinominare la cassetta che la ricerca aveva appena trovato bisognava svuotare la ricerca
  // e ritrovarla a occhio sul muro intero. Spec §5.35: il long-press apre lo sheet su QUALSIASI
  // cassetta. L'hint resta — il drag È bloccato davvero, e dirlo è ancora giusto — ma accompagna
  // lo sheet invece di prenderne il posto.
  it('durante la ricerca il drag è SPENTO (parete filtrata = ordine parziale): il long-press apre COMUNQUE lo sheet, e l\'hint spiega perché il muro non si è sollevato', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(<PareteClient parete={[occupata, libera]} />)
      fireEvent.change(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), { target: { value: 'C12' } })
      act(() => { vi.advanceTimersByTime(250) }) // oltre il debounce di 180ms
      // Con la ricerca attiva `onSollevata` NON è passato: il gesto ricade sul long-press di
      // Cassetta — che apre lo sheet (§5.35) e segnala il blocco del solo drag.
      const bottone = cassettaOccupata() // occupata, unica trovata, resta montata
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) })
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      expect(screen.getByRole('dialog', { name: 'C12' })).toBeInTheDocument()
      // La riga del muro, non quella dei ▲▼ dentro lo sheet (v. nota nella describe ricerca).
      expect(within(container).getByRole('status')).toHaveTextContent('Svuota la ricerca per spostare le cassette')
    } finally {
      vi.useRealTimers()
    }
  })

  it('I5 — e lo sheet aperto durante la ricerca è quello VERO della cassetta trovata: rinomina, colore e «Segna come libera» a portata di mano', () => {
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[occupata, libera]} />)
      fireEvent.change(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), { target: { value: 'C12' } })
      act(() => { vi.advanceTimersByTime(250) })
      const bottone = cassettaOccupata()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) })
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      const sheet = screen.getByRole('dialog', { name: 'C12' })
      expect(within(sheet).getByLabelText('Nome')).toBeInTheDocument()
      expect(within(sheet).getByText('Segna come libera')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('con meno di 2 cassette il drag non si arma: hold + rilascio fermo apre lo sheet via long-press (una sola cassetta = niente da riordinare)', () => {
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[libera]} />)
      const bottone = cassettaLibera()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) })
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      expect(screen.getByRole('dialog', { name: 'C4' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  // Review Task 13, Critical B-1: il ghost è in portale su `document.body`, FUORI dal
  // `<div data-ds="v3">` di `cassette/page.tsx`. Tutto il CSS del DS v3 (compreso `.ds-ghost`,
  // che porta `position:fixed` — senza quella regola il ghost cade nel normal-flow, un
  // `<button>` grezzo in fondo al body) vive sotto quello scope. jsdom non applica le regole di
  // `ds-v3.css` (nessun cascade CSS reale in questo ambiente): il presidio è sulla STRUTTURA del
  // DOM che quella regola richiede — un antenato del ghost con `data-ds="v3"`, come per gli altri
  // portali del DS (`Sheet`, `DialogConferma`, `Avviso`).
  it('a drag attivo il ghost portato su document.body porta lo scope data-ds="v3" (review Task 13, B-1)', () => {
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[occupata, libera]} />)
      const bottone = cassettaLibera()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) }) // Cassetta spara onSollevata → il ghost monta in portale

      const nodoPortato = Array.from(document.body.children).find(
        (el) => el.getAttribute('data-ds') === 'v3',
      )
      expect(nodoPortato).toBeTruthy()

      const ghost = nodoPortato?.querySelector('.ds-ghost')
      expect(ghost).not.toBeNull()

      // La regola `[data-ds="v3"] .ds-ghost` di ds-v3.css è un combinatore DISCENDENTE: serve un
      // ANTENATO separato con l'attributo, non basta che il ghost porti la classe da solo — questa
      // è la verifica che discrimina davvero il difetto (senza l'attributo sul wrapper, `closest`
      // non troverebbe nulla e la regola non matcherebbe alcuna proprietà, `position:fixed`
      // compreso).
      expect(ghost?.closest('[data-ds="v3"]')).not.toBeNull()
    } finally {
      vi.useRealTimers()
    }
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

// Review FIX-E, Important — E4 gated OGNI `router.refresh()` del percorso parete dietro
// `sospendiRefresh` (D5b/D8, v. `rileggiParete`), ma tre percorsi di mutazione non avevano MAI
// avuto uno stato ottimistico locale: in embedded (pager) restavano silenziosamente stantii fino
// al prossimo caricamento reale della route. Questi test riproducono i tre percorsi (creazione,
// rinomina/ricolorazione, ▲▼) con `sospendiRefresh` attivo — SENZA di esso il refresh mockato
// avrebbe comunque "risolto" il sintomo nel test (anche se non nel pannello reale, dove
// `router.refresh()` è vietato): è per questo che il difetto viveva solo in embedded, mai in
// standalone. Le ultime due guardie coprono l'esito NEGATO: un fallimento della scrittura non
// deve corrompere ciò che la parete mostra (mirror del contratto già in vigore per il drag).
describe('PareteClient — riflesso ottimistico in embedded, review FIX-E Important (create/rinomina-colore/▲▼)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('creazione riuscita in embedded: la nuova cassetta appare SUBITO, senza un vero refresh', async () => {
    fetchMock().mockResolvedValueOnce({
      status: 201,
      json: async () => ({ cassetta: { id: 'c-new', nome: 'C13', colore: 'bianca', posizione: 1 } }),
    })
    render(<PareteClient parete={[occupata]} sospendiRefresh />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Nuova cassetta/ }))
    await user.click(screen.getByRole('button', { name: 'Crea C13' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cassetta C13, libera' })).toBeInTheDocument())
    expect(refresh).not.toHaveBeenCalled()
  })

  it('rinomina riuscita in embedded: il nome nuovo appare SUBITO sul muro, senza un vero refresh', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    render(<PareteClient parete={[occupata, libera]} sospendiRefresh />)
    tap(cassettaLibera())
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'C4' })).toBeNull())
    expect(screen.getByRole('button', { name: 'Cassetta Banco Ciro, libera' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cassetta C4, libera' })).toBeNull()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('▲▼ riuscito in embedded: il muro si sposta SUBITO, senza un vero refresh', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({}) })
    const c1: CassettaParete = { id: 'c-1', nome: 'C1', colore: 'grigia', posizione: 0, lavoro: null }
    const c2: CassettaParete = { id: 'c-2', nome: 'C2', colore: 'blu', posizione: 1, lavoro: null }
    render(<PareteClient parete={[c1, c2]} sospendiRefresh />)
    const user = userEvent.setup()
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Cassetta C1/ }), { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(screen.getByRole('button', { name: /^Cassetta C1/ }), { clientX: 0, clientY: 0 })
    await user.click(screen.getByRole('button', { name: 'Sposta giù' }))
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await waitFor(() => {
      const nomi = screen.getAllByRole('button', { name: /^Cassetta/i }).map((b) => b.getAttribute('aria-label'))
      expect(nomi.findIndex((n) => n?.startsWith('Cassetta C2'))).toBeLessThan(
        nomi.findIndex((n) => n?.startsWith('Cassetta C1')),
      )
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('creazione FALLITA in embedded: nessuna cassetta fantasma appare (l\'ottimistico non si applica su errore)', async () => {
    fetchMock().mockResolvedValueOnce({ status: 500, json: async () => ({ errore: 'creazione_fallita' }) })
    render(<PareteClient parete={[occupata]} sospendiRefresh />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Nuova cassetta/ }))
    await user.click(screen.getByRole('button', { name: /^Crea/ }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getAllByRole('button', { name: /^Cassetta/i })).toHaveLength(1)
  })

  it('rinomina FALLITA in embedded: il nome vecchio resta (l\'ottimistico non si applica su errore)', async () => {
    fetchMock().mockResolvedValueOnce({ status: 500, json: async () => ({}) })
    render(<PareteClient parete={[occupata, libera]} sospendiRefresh />)
    tap(cassettaLibera())
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
    fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Cassetta C4, libera' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Banco Ciro/ })).toBeNull()
  })

  it('▲▼ FALLITO in embedded: il muro NON si sposta (rollback ottico, mirror del contratto del drag)', async () => {
    fetchMock().mockResolvedValueOnce({ status: 500, json: async () => ({}) })
    const c1: CassettaParete = { id: 'c-1', nome: 'C1', colore: 'grigia', posizione: 0, lavoro: null }
    const c2: CassettaParete = { id: 'c-2', nome: 'C2', colore: 'blu', posizione: 1, lavoro: null }
    render(<PareteClient parete={[c1, c2]} sospendiRefresh />)
    const user = userEvent.setup()
    fireEvent.pointerDown(screen.getByRole('button', { name: /^Cassetta C1/ }), { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(screen.getByRole('button', { name: /^Cassetta C1/ }), { clientX: 0, clientY: 0 })
    await user.click(screen.getByRole('button', { name: 'Sposta giù' }))
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    await waitFor(() => {
      const nomi = screen.getAllByRole('button', { name: /^Cassetta/i }).map((b) => b.getAttribute('aria-label'))
      expect(nomi.findIndex((n) => n?.startsWith('Cassetta C1'))).toBeLessThan(
        nomi.findIndex((n) => n?.startsWith('Cassetta C2')),
      )
    })
  })
})

// Gap disclosure sul FIX-E precedente — `dopoCambio` gestiva SOLO rinomina/colore (`patch`).
// Le altre quattro azioni di `CassettaSheet` (assegna-lavoro, sposta-lavoro, segna-libera,
// butta-via) chiamavano `onCambiata()` SENZA alcun dato: in embedded (`sospendiRefresh`)
// restavano stantie sul muro fino al prossimo caricamento vero — stesso sintomo delle tre già
// corrette, mai chiuso per queste quattro. Qui si estende lo STESSO overlay (`pareteVista`,
// `overrides`/`rimosse`) — non un secondo meccanismo — a tutte e quattro. Le guardie di
// fallimento (409 «occupata» compreso) provano il contrario: un esito non-200 non deve mai
// muovere un lavoro sul muro che il server non ha spostato davvero.
describe('PareteClient — riflesso ottimistico esteso: assegna/sposta/segna-libera/butta-via (gap disclosure FIX-E)', () => {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  function fetchMock() {
    return fetch as unknown as ReturnType<typeof vi.fn>
  }

  it('assegna-lavoro riuscita in embedded: la cassetta libera mostra SUBITO il lavoro assegnato, senza un vero refresh', async () => {
    const unLibero = { id: 'l9', numero: '151', dentista: 'Studio Bruno', pazienteAlias: 'Rossi Mario', urgenza: 1 }
    fetchMock()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: [unLibero] }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    render(<PareteClient parete={[libera]} sospendiRefresh />)
    const user = userEvent.setup()
    tap(cassettaLibera())
    await user.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await user.click(await screen.findByRole('button', { name: /151/i }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^Cassetta C4, occupata: n\.151, Studio Bruno, paziente Rossi Mario/ }),
      ).toBeInTheDocument(),
    )
    expect(refresh).not.toHaveBeenCalled()
  })

  // G8 (FIX-I, bug confermato da Francesco) — CAUSA: il contratto di
  // `GET /api/cassette/lavori-liberi` non portava `tipoDispositivo`/`descrizione`, quindi
  // l'overlay ottimistico costruiva un `lavoro` parziale e `miniaturaPerLavoro` degradava alla
  // miniatura 'generica' finché non arrivava una riletta vera. Qui si prova il fix end-to-end:
  // il tipo VERO (non 'generica') appare SUBITO, senza refresh — `tipoDispositivo:
  // 'implantologia'` risolve deterministicamente su 'impianto' (v. `miniature-lavoro.ts`,
  // MACRO — nessuna dipendenza dal match fuzzy di `descrizione`).
  it('assegna-lavoro riuscita in embedded: la miniatura riflette SUBITO il tipo vero, non la generica (G8)', async () => {
    const unLibero = {
      id: 'l9', numero: '151', dentista: 'Studio Bruno', pazienteAlias: 'Rossi Mario', urgenza: 1,
      tipoDispositivo: 'implantologia', descrizione: null,
    }
    fetchMock()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: [unLibero] }) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    render(<PareteClient parete={[libera]} sospendiRefresh />)
    const user = userEvent.setup()
    tap(cassettaLibera())
    await user.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await user.click(await screen.findByRole('button', { name: /151/i }))
    const cassettaOra = await screen.findByRole('button', { name: /^Cassetta C4, occupata/ })
    expect(cassettaOra.querySelector('[data-miniatura-id]')).toHaveAttribute('data-miniatura-id', 'impianto')
    expect(refresh).not.toHaveBeenCalled()
  })

  it('assegna-lavoro FALLITA in embedded: la cassetta resta libera (l\'ottimistico non si applica su errore)', async () => {
    const unLibero = { id: 'l9', numero: '151', dentista: 'Studio Bruno', pazienteAlias: null, urgenza: 1 }
    fetchMock()
      .mockResolvedValueOnce({ status: 200, json: async () => ({ lavori: [unLibero] }) })
      .mockResolvedValueOnce({ status: 500, json: async () => ({}) })
    render(<PareteClient parete={[libera]} sospendiRefresh />)
    const user = userEvent.setup()
    tap(cassettaLibera())
    await user.click(screen.getByRole('button', { name: /metti un lavoro/i }))
    await user.click(await screen.findByRole('button', { name: /151/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Cassetta C4, libera' })).toBeInTheDocument()
  })

  it('sposta-lavoro riuscita in embedded: la sorgente torna libera e la destinazione mostra il lavoro, SUBITO, senza un vero refresh', async () => {
    vi.useFakeTimers()
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', nome: 'C4' }) })
    try {
      render(<PareteClient parete={[occupata, libera]} sospendiRefresh />)
      const bottone = cassettaOccupata()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) }) // Cassetta spara onSollevata → hook.avvia (drag abilitato, ≥2 cassette)
      act(() => {
        window.dispatchEvent(new (window.PointerEvent)('pointerup', { pointerId: 1, clientX: 0, clientY: 0 }))
      })
      expect(screen.getByRole('dialog', { name: 'C12' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'C4' }))
      await act(async () => {}) // lascia risolvere la POST

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: /^Cassetta C4, occupata: n\.144, Bianchi, paziente MAR-42/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cassetta C12, libera' })).toBeInTheDocument()
      expect(refresh).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('sposta-lavoro 409 (occupata) in embedded: NON applica il cambiamento — sorgente resta occupata, destinazione resta libera', async () => {
    vi.useFakeTimers()
    fetchMock().mockResolvedValueOnce({ status: 409, json: async () => ({ errore: 'occupata', nome: 'C4' }) })
    try {
      render(<PareteClient parete={[occupata, libera]} sospendiRefresh />)
      const bottone = cassettaOccupata()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) })
      act(() => {
        window.dispatchEvent(new (window.PointerEvent)('pointerup', { pointerId: 1, clientX: 0, clientY: 0 }))
      })
      fireEvent.click(screen.getByRole('button', { name: 'C4' }))
      await act(async () => {})

      expect(screen.getByRole('button', { name: /^Cassetta C12, occupata/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cassetta C4, libera' })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  // Review finale whole-branch, D4 — questi due erano gli unici del describe a NON avvolgere i
  // fake timer in `try/finally` (i gemelli `sposta-lavoro` qui sopra lo fanno). L'`afterEach`
  // del describe ripristina global e mock, MAI i timer: se una qualunque asserzione qui in
  // mezzo fosse fallita, i fake timer restavano accesi per tutto il resto del FILE e ogni test
  // successivo che si appoggia al tempo vero (`waitFor`, `findBy*`, `userEvent`) sarebbe caduto
  // per un motivo suo — una cascata il cui primo colpevole finisce sepolto. `useRealTimers` è
  // idempotente, quindi il ripristino a metà corpo (necessario: `findByRole` sotto conta su
  // timer veri) e quello del `finally` convivono senza attriti.
  it('segna-libera riuscita in embedded: la cassetta torna libera SUBITO sul muro, senza un vero refresh', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok', nome: 'C12' }) })
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[occupata]} sospendiRefresh />)
      const bottone = cassettaOccupata()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
      act(() => { vi.advanceTimersByTime(300) }) // SOGLIA_LONG_PRESS_MS (Cassetta.tsx, drag disabilitato con 1 sola cassetta)
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0 })
      vi.useRealTimers() // trovando 300ms scaduti (findByRole/waitFor sotto contano su timer VERI)
      expect(screen.getByRole('dialog', { name: 'C12' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /segna come libera/i }))
      const dialog = await screen.findByRole('dialog', { name: /il n\.144 esce dalla c12/i })
      fireEvent.click(within(dialog).getByRole('button', { name: /esce|libera/i }))
      await act(async () => {})

      expect(fetch).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('button', { name: 'Cassetta C12, libera' })).toBeInTheDocument()
      expect(refresh).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('segna-libera FALLITA in embedded: la cassetta resta occupata (l\'ottimistico non si applica su errore)', async () => {
    fetchMock().mockResolvedValueOnce({ status: 500, json: async () => ({}) })
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[occupata]} sospendiRefresh />)
      const bottone = cassettaOccupata()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0 })
      act(() => { vi.advanceTimersByTime(300) })
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0 })
      vi.useRealTimers()
      fireEvent.click(screen.getByRole('button', { name: /segna come libera/i }))
      const dialog = await screen.findByRole('dialog', { name: /il n\.144 esce dalla c12/i })
      fireEvent.click(within(dialog).getByRole('button', { name: /esce|libera/i }))
      await act(async () => {})

      expect(screen.getByRole('button', { name: /^Cassetta C12, occupata/ })).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('butta-via riuscita in embedded: la cassetta sparisce SUBITO dal muro, senza un vero refresh', async () => {
    fetchMock().mockResolvedValueOnce({ status: 200, json: async () => ({ esito: 'ok' }) })
    render(<PareteClient parete={[libera]} sospendiRefresh />)
    const user = userEvent.setup()
    tap(cassettaLibera())
    await user.click(screen.getByRole('button', { name: 'Butta via' }))
    const dialog = await screen.findByRole('dialog', { name: /butto via la cassetta c4/i })
    await user.click(within(dialog).getByRole('button', { name: 'Butta via' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'La tua parete è vuota' })).toBeInTheDocument())
    expect(refresh).not.toHaveBeenCalled()
  })

  it('butta-via FALLITA in embedded: la cassetta resta sul muro (l\'ottimistico non si applica su errore)', async () => {
    fetchMock().mockResolvedValueOnce({ status: 500, json: async () => ({}) })
    render(<PareteClient parete={[libera]} sospendiRefresh />)
    const user = userEvent.setup()
    tap(cassettaLibera())
    await user.click(screen.getByRole('button', { name: 'Butta via' }))
    const dialog = await screen.findByRole('dialog', { name: /butto via la cassetta c4/i })
    await user.click(within(dialog).getByRole('button', { name: 'Butta via' }))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Cassetta C4, libera' })).toBeInTheDocument()
  })
})

// ── Dizionario DS v3 §2.3 sulla parete (review finale whole-branch, D3) ────────────────────
// RIPRISTINO di una guardia PERSA. Il Task 12 ha cancellato `tests/unit/stanza-parete.test.tsx`
// insieme all'anteprima `StanzaParete` che presidiava; dentro c'era anche il describe
// «StanzaParete — dizionario §2.3», che passava `trovaParoleVietate` sul testo della stanza
// piena E vuota. Nessun altro file lo ha raccolto: dei 20 file che usano `trovaParoleVietate`,
// nessuno tocca questa superficie (gli altri sono demo di catalogo per singolo componente).
// Nel frattempo la superficie si è ALLARGATA — dopo T15 la stanza monta il chrome di pagina
// intero dentro la home — e tutta la copy nuova dell'ondata («N cassette trovate», «Niente
// per … — prova con meno lettere», «Svuota la ricerca per spostare le cassette», «La tua
// parete è vuota», la sotto-vista «Metti un lavoro») non passava alcun controllo di dizionario.
// È la superficie più visitata dell'ondata: qui una parola del software entrerebbe indisturbata.
//
// NON è ripristinata l'altra metà del file cancellato («in home si naviga, non si manipola»,
// `draggable="false"` su ogni tray): T15 ha cambiato quella regola di proposito — quali gesti
// la stanza embeddata consente è materia a parte, a ledger, non di questa guardia.
describe('PareteClient — dizionario §2.3 (ripristino della guardia persa col Task 12)', () => {
  /**
   * Il testo che l'utente LEGGE davvero. `document.body.textContent` da solo includerebbe anche
   * il contenuto dei blocchi `<style>{…}</style>` (i componenti ds ne montano diversi): lì una
   * proprietà CSS del tutto legittima come `filter:` farebbe scattare `/\bfiltr\w+/i` e la
   * guardia diventerebbe un allarme falso al primo che scrive una regola nuova. Si guarda solo
   * la copy.
   *
   * BUCO TROVATO E CHIUSO (copertura vista radice, v. describe più sotto) — `textContent`
   * incolla i nodi di testo di elementi fratelli SENZA alcun separatore: la chip «C4» seguita
   * dal paragrafo «Sposta nel muro» diventava la stringa unica «C4Sposta nel muro» — e se «Sposta»
   * fosse stato sostituito da una parola vietata, «C4Salva…» non avrebbe MAI acceso `/\bsalva\b/i`
   * perché fra la cifra «4» e la parola non c'è alcun confine di parola (`\b` richiede un
   * carattere non-word da un lato: due `\w` adiacenti — «4» e «S» — non lo sono). Misurato
   * iniettando esattamente questa mutazione nella vista radice della cassetta OCCUPATA (v. report
   * `.superpowers/sdd/dizionario-copertura-report.md`): il test restava VERDE con la parola
   * vietata visibile in pagina. Il `TreeWalker` sotto gira sui nodi TESTO (non elemento) e li
   * unisce con uno spazio: può solo AGGIUNGERE match rispetto a prima (uno spazio in più fra due
   * parole non ne fonde mai due in una), mai nasconderne — è un cambiamento sicuro per le 7
   * guardie già esistenti su questo helper.
   */
  function testoLeggibile(radice: HTMLElement = document.body): string {
    const copia = radice.cloneNode(true) as HTMLElement
    for (const nodo of Array.from(copia.querySelectorAll('style, script'))) nodo.remove()
    const pezzi: string[] = []
    const walker = document.createTreeWalker(copia, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) pezzi.push(walker.currentNode.textContent ?? '')
    return pezzi.join(' ')
  }

  it('muro pieno: nessuna parola del software nella copy della parete', () => {
    render(<PareteClient parete={[occupata, libera]} />)
    // Prova che lo stato è DAVVERO quello che dice il titolo: senza questo, una guardia su una
    // pagina bianca passerebbe sempre.
    expect(screen.getByRole('heading', { name: 'Le cassette' })).toBeInTheDocument()
    expect(trovaParoleVietate(testoLeggibile())).toEqual([])
  })

  it('muro vuoto: nemmeno il Vuoto e la sua guida parlano software', () => {
    render(<PareteClient parete={[]} />)
    expect(screen.getByRole('heading', { name: 'La tua parete è vuota' })).toBeInTheDocument()
    expect(trovaParoleVietate(testoLeggibile())).toEqual([])
  })

  describe('stati della ricerca (copy nuova dell’ondata)', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('ricerca CON esiti: la riga «N cassette trovate» resta parola di banco', () => {
      render(<PareteClient parete={[occupata, libera]} />)
      fireEvent.change(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), { target: { value: 'C' } })
      act(() => { vi.advanceTimersByTime(250) }) // oltre il debounce di 180ms
      expect(screen.getByRole('status')).toHaveTextContent('2 cassette trovate')
      expect(trovaParoleVietate(testoLeggibile())).toEqual([])
    })

    it('ricerca SENZA esiti: «Niente per … — prova con meno lettere»', () => {
      render(<PareteClient parete={[occupata, libera]} />)
      fireEvent.change(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), { target: { value: 'zzz' } })
      act(() => { vi.advanceTimersByTime(250) })
      expect(screen.getByRole('status')).toHaveTextContent('prova con meno lettere')
      expect(trovaParoleVietate(testoLeggibile())).toEqual([])
    })

    it('hint del drag bloccato: «Svuota la ricerca per spostare le cassette»', () => {
      const { container } = render(<PareteClient parete={[occupata, libera]} />)
      fireEvent.change(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), { target: { value: 'C' } })
      act(() => { vi.advanceTimersByTime(250) })
      const bottone = cassettaOccupata()
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) }) // SOGLIA_LONG_PRESS_MS (Cassetta.tsx)
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      expect(within(container).getByRole('status')).toHaveTextContent('Svuota la ricerca per spostare le cassette')
      // Solo il muro: il long-press apre ANCHE lo sheet (§5.35), che vive in portale su
      // `document.body` — la sua copy è materia del file `cassetta-sheet.test.tsx`, non di qui.
      expect(trovaParoleVietate(testoLeggibile(container))).toEqual([])
    })
  })

  describe('sotto-vista «Metti un lavoro» dello sheet (nuova con quest’ondata)', () => {
    beforeEach(() => vi.stubGlobal('fetch', vi.fn()))
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

    // La sotto-vista SOSTITUISCE la vista radice dello sheet: quando è in scena, in pagina non
    // c'è altra copy dello sheet. Perciò qui si può guardare tutto il documento.
    it('con lavori da mettere: la lista dei liberi non parla software', async () => {
      ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => ({ lavori: [{ id: 'l9', numero: '151', dentista: 'Studio Bruno', pazienteAlias: 'Rossi Mario', urgenza: 1 }] }),
      })
      render(<PareteClient parete={[libera]} />)
      const user = userEvent.setup()
      tap(cassettaLibera())
      await user.click(screen.getByRole('button', { name: /metti un lavoro/i }))
      await screen.findByRole('button', { name: /151/i })
      expect(trovaParoleVietate(testoLeggibile())).toEqual([])
    })

    it('senza lavori da mettere: «Tutti i lavori hanno già una cassetta»', async () => {
      ;(fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        status: 200,
        json: async () => ({ lavori: [] }),
      })
      render(<PareteClient parete={[libera]} />)
      const user = userEvent.setup()
      tap(cassettaLibera())
      await user.click(screen.getByRole('button', { name: /metti un lavoro/i }))
      await screen.findByText('Tutti i lavori hanno già una cassetta')
      expect(trovaParoleVietate(testoLeggibile())).toEqual([])
    })
  })

  // Gap di copertura chiuso — la vista RADICE dello sheet («azioni»: rinomina, colore,
  // «Sposta il lavoro in…», ▲▼, «Segna come libera», «Butta via») non era mai passata sotto
  // `trovaParoleVietate`: è l'unica vista che contiene le due etichette «Salva il nome» e
  // «Salva il colore», un'ECCEZIONE RATIFICATA (Francesco, 26/07/2026,
  // `docs/design/decisions/2026-07-26-salva-nome-colore.md` — v. anche il commento sulla voce
  // `/\bsalva\b/i` in `dizionario.ts`) e per questo era rimasta fuori dal ripristino sopra: una
  // nuova parola vietata introdotta qui sarebbe passata indisturbata.
  describe('vista radice («azioni») dello sheet — copertura con l’eccezione ratificata sulle due «Salva»', () => {
    // Si toglie SOLO la stringa ESATTA delle due etichette ratificate, non l'intera regola
    // `/\bsalva\b/i`: così una futura «Salva la posizione» (o qualsiasi altro «salva» nuovo,
    // diverso da queste due frasi) in questa stessa vista continua a far fallire il test invece
    // di sparire con l'eccezione.
    const ECCEZIONI_VISTA_AZIONI_RATIFICATE = ['Salva il nome', 'Salva il colore']
    function senzaEccezioniRatificate(testo: string): string {
      return ECCEZIONI_VISTA_AZIONI_RATIFICATE.reduce((acc, etichetta) => acc.split(etichetta).join(''), testo)
    }

    it('cassetta LIBERA: «Metti un lavoro», rinomina e colore non parlano software, a parte «Salva il nome»', () => {
      render(<PareteClient parete={[occupata, libera]} />)
      tap(cassettaLibera())
      const dialog = screen.getByRole('dialog', { name: 'C4' })
      // Prova che siamo davvero nella vista radice (non già scivolati su «Metti un lavoro»,
      // dove la guardia sopra guarda tutto il documento perché quella vista non contiene le
      // due eccezioni): il tasto c'è, ma non ci si è cliccato sopra.
      expect(within(dialog).getByRole('button', { name: /metti un lavoro/i })).toBeInTheDocument()
      expect(within(dialog).getByRole('button', { name: 'Salva il nome' })).toBeInTheDocument()
      expect(trovaParoleVietate(senzaEccezioniRatificate(testoLeggibile(dialog)))).toEqual([])
    })

    it('cassetta OCCUPATA: «Sposta il lavoro in…», ▲▼, «Segna come libera» e «Butta via» disabilitato non parlano software', () => {
      // Su una cassetta OCCUPATA il tap naviga al lavoro (§5.35): l'unica via allo sheet è il
      // long-press. Con 2 cassette e ricerca spenta `dragAbilitato` è vero anche qui (non solo
      // sulle libere — v. `PareteClient.tsx`, `onSollevata` passato a ogni cassetta), quindi il
      // rilascio fermo dopo 300ms apre lo sheet passando per l'hook del drag: stesso harness del
      // test «drag abilitato…» più su in questo file (pointerId/pointerType tracciati, pointerup
      // su `window`, non sul bottone).
      vi.useFakeTimers()
      try {
        render(<PareteClient parete={[occupata, libera]} />)
        const bottone = cassettaOccupata()
        fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
        act(() => { vi.advanceTimersByTime(300) })
        act(() => {
          window.dispatchEvent(new (window.PointerEvent)('pointerup', { pointerId: 1, clientX: 0, clientY: 0 }))
        })
        const dialog = screen.getByRole('dialog', { name: 'C12' })
        // Prova che lo stato è davvero quello atteso: sezioni esclusive dell'occupata. La chip
        // «C4» esiste SOLO dentro «Sposta il lavoro in…» (le cassette libere elencate) — è la
        // riprova che quella sezione è montata, senza dover ripetere il testo dell'intestazione.
        expect(within(dialog).getByRole('button', { name: 'C4' })).toBeInTheDocument()
        expect(within(dialog).getByText('Segna come libera')).toBeInTheDocument()
        expect(trovaParoleVietate(senzaEccezioniRatificate(testoLeggibile(dialog)))).toEqual([])
      } finally {
        vi.useRealTimers()
      }
    })

    it('colore CUSTOM in sospeso: «Salva il colore» compare e resta coperto dall’eccezione, non da un ammorbidimento della regola', () => {
      render(<PareteClient parete={[occupata, libera]} />)
      tap(cassettaLibera())
      const dialog = screen.getByRole('dialog', { name: 'C4' })
      // Stesso gesto di `cassetta-sheet.test.tsx` («colore CUSTOM…»): il picker nativo emette
      // `input`/`onChange` con l'hex, il colore resta IN SOSPESO finché non si preme il tasto.
      fireEvent.change(within(dialog).getByLabelText('Colore personalizzato'), { target: { value: '#aabbcc' } })
      expect(within(dialog).getByRole('button', { name: 'Salva il colore' })).toBeInTheDocument()
      expect(trovaParoleVietate(senzaEccezioniRatificate(testoLeggibile(dialog)))).toEqual([])
    })
  })
})
