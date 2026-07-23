// Task 11 — PareteClient: la parete viva di `/cassette` (§5, spec
// 2026-07-21-parete-cassette-design.md). Test in tests/unit/ (D-O1).
//
// NB: `Cassetta` non ha `onClick` — reagisce a pointerdown/pointerup (§5.35, gesto
// tap/long-press). Un `fireEvent.click` NON chiama `onTap`: qui si usa la stessa coppia di
// eventi di `tests/unit/Cassetta.test.tsx`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PareteClient } from '@/components/features/cassette/PareteClient'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

const push = vi.fn()
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh, back: vi.fn() }) }))
beforeEach(() => { push.mockClear(); refresh.mockClear() })

const occupata: CassettaParete = {
  id: 'c-a', nome: 'C12', colore: 'rossa', posizione: 0,
  lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: 'Corona zirconia' },
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

  it('sospendiRefresh NON gate le altre chiamate a router.refresh (azione esplicita dell\'utente, limitazione nota — v. commento sulla prop)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200, json: async () => ({ esito: 'ok' }) }))
    try {
      render(<PareteClient parete={[occupata, libera]} sospendiRefresh />)
      tap(cassettaLibera())
      fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Banco Ciro' } })
      fireEvent.click(screen.getByRole('button', { name: /salva il nome/i }))
      await waitFor(() => expect(refresh).toHaveBeenCalled())
    } finally {
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
    lavoro: { id: 'l2', numero: '200', dentista: 'Esposito', paziente: 'PAZ-1', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: null },
  }
  const c3ConMatch: CassettaParete = {
    id: 'c-3', nome: 'C3', colore: 'blu', posizione: 2,
    lavoro: { id: 'l3', numero: '201', dentista: 'Esposito', paziente: 'PAZ-2', pazienteAlias: null, tipoDispositivo: 'protesi_fissa', descrizione: null },
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

  it('long-press durante la ricerca: hint «Svuota la ricerca…» al posto del fallimento silenzioso', () => {
    render(<PareteClient parete={[c2ConMatch, c3ConMatch]} />)
    digita('esposito')
    act(() => { vi.advanceTimersByTime(250) })
    longPress(primaCassetta())
    expect(screen.getByRole('status')).toHaveTextContent('Svuota la ricerca per spostare le cassette')
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

  it('durante la ricerca il drag è SPENTO (parete filtrata = ordine parziale) e il long-press segnala il blocco (hint, ratifica 22/07 §2.4) invece di aprire lo sheet', () => {
    vi.useFakeTimers()
    try {
      render(<PareteClient parete={[occupata, libera]} />)
      fireEvent.change(screen.getByPlaceholderText('Cerca una cassetta o un lavoro…'), { target: { value: 'C12' } })
      act(() => { vi.advanceTimersByTime(250) }) // oltre il debounce di 180ms
      // Con la ricerca attiva `onSollevata` NON è passato: il gesto ricade sul long-press di
      // Cassetta — che ora chiama `segnalaDragBloccato` (hint), non più lo sheet.
      const bottone = cassettaOccupata() // occupata, unica trovata, resta montata
      fireEvent.pointerDown(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      act(() => { vi.advanceTimersByTime(300) })
      fireEvent.pointerUp(bottone, { clientX: 0, clientY: 0, pointerId: 1, pointerType: 'touch' })
      expect(screen.queryByRole('dialog', { name: 'C12' })).toBeNull()
      expect(screen.getByRole('status')).toHaveTextContent('Svuota la ricerca per spostare le cassette')
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
