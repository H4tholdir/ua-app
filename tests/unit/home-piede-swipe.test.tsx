// Capitolo H4c — Piede C2 «il tasto si ritira» (decisione 0c37f25, demo animata ebf4edb). Il
// core puro (mappatura progress→stile, bersaglio del rilascio) è testato in isolamento in
// piede-swipe.test.ts (jsdom non serve lì); qui si presidia il guscio REACT che jsdom REGGE:
// che il piede resti montato (mai più smontato/rimontato) attraverso il cambio di stanza, che le
// custom property CSS su `.foot` seguano `onProgressoSwipe`, e che il rilascio a metà gesto
// invochi `animate(..., molla.press)` — MAI `.set()` diretto — salvo reduced-motion, dove vale
// l'opposto. Quello che jsdom NON può reggere (la curva reale della molla nel tempo, il feel a
// schermo) resta verifica visiva live (v. il report H4c).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { HomeV3 } from '@/components/features/home/HomeV3'
import { molla } from '@/design-system/v3/motion'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }) }))

// Spia SUL VERO `animate` (stesso pattern del mock parziale di `motion/react` già in uso in
// tests/unit/ds-v3/componenti/sheet-dialog.test.tsx per `useDragControls`): il comportamento
// reale resta intatto, si registrano solo gli argomenti delle chiamate — provare che
// HomeV3.tsx invochi `molla.press` (il token, non valori inline) è l'oggetto del test, non
// sostituire la molla con un finto.
const { animateSpy } = vi.hoisted(() => ({ animateSpy: vi.fn() }))
vi.mock('motion/react', async (importOriginal) => {
  const reale = await importOriginal<typeof import('motion/react')>()
  return {
    ...reale,
    // `animateSpy` registra anche i CONTROLLI restituiti (4° argomento): serve al test
    // "il dito riafferra" per prendere l'handle `.stop()` della molla in corso, che
    // `mock.results` non esporrebbe correttamente su una funzione che delega la chiamata reale
    // in modo indiretto.
    animate: ((...args: Parameters<typeof reale.animate>) => {
      const controlli = reale.animate(...(args as Parameters<typeof reale.animate>))
      animateSpy(...args, controlli)
      return controlli
    }) as typeof reale.animate,
  }
})

// jsdom non ha IntersectionObserver: stub INERTE (non pilotato — nessun test qui verifica
// `onStanzaChange`/soglia 0.6, solo il gesto continuo via scroll/touch, indipendente dall'IO
// per costruzione, v. StanzePager.tsx).
class IOFinto {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

const SEGNALE = { attenzione: false, forte: 'Tutto a posto:', testo: '2 consegne oggi', azione: null }
const PILE: PileHome = {
  liste: { rossa: [], ambra: [], viola: [], blu: [] },
  sub: { rossa: 'Nessuna consegna', ambra: 'Niente sul banco', viola: 'Nessuna prova in giro', blu: 'Nessun nuovo arrivo' },
  striscia: {
    ritardoPiuGrave: null,
    consegnaOggiNonPronta: null,
    provaRientroOggi: null,
    arrivoVecchio: null,
    fermo: null,
    consegneOggiTotali: 0,
    prossimaOra: null,
  },
}
const PARETE: CassettaParete[] = [{ id: 'c1', nome: 'C12', colore: 'rossa', posizione: 1, lavoro: null }]

function renderHome() {
  return render(
    <HomeV3
      nome="Francesco"
      eyebrow="Giovedì 9 luglio"
      saluto="Buon pomeriggio"
      pile={PILE}
      segnale={SEGNALE}
      parete={PARETE}
      homePref="due_stanze"
    />
  )
}

/** jsdom non fa layout: scrollTo/offsetLeft vanno stubati a mano, stesso pattern di
 *  `preparaViewport` in stanze-pager.test.tsx (duplicato qui apposta — ogni file di test di
 *  questo repo è autosufficiente, v. HomeV3.test.tsx che duplica le proprie fixture). */
function preparaViewport(container: HTMLElement): HTMLElement {
  const viewport = container.querySelector('.ua-stanze-viewport') as HTMLElement
  expect(viewport).not.toBeNull()
  Object.defineProperty(viewport, 'scrollTo', { value: vi.fn(), configurable: true })
  const stanze = Array.from(container.querySelectorAll('[data-stanza]')) as HTMLElement[]
  Object.defineProperty(stanze[0], 'offsetLeft', { value: 0, configurable: true })
  Object.defineProperty(stanze[1], 'offsetLeft', { value: 390, configurable: true })
  return viewport
}

function simulaScroll(viewport: HTMLElement, scrollLeft: number, larghezza = 390) {
  Object.defineProperty(viewport, 'scrollLeft', { value: scrollLeft, configurable: true })
  Object.defineProperty(viewport, 'clientWidth', { value: larghezza, configurable: true })
  act(() => {
    fireEvent.scroll(viewport)
  })
}

function piede(container: HTMLElement): HTMLElement {
  const nodo = container.querySelector('.foot')
  if (!nodo) throw new Error('.foot non trovato')
  return nodo as HTMLElement
}

function mockReducedMotion(matches: boolean) {
  const originale = window.matchMedia
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? matches : false,
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

// `pushStateSpy` mockato (stesso pattern di `stanze-pager.test.tsx`): i test di riconciliazione
// sotto cliccano la linguetta «Le cassette», che fa DAVVERO `window.history.pushState` in
// StanzePager.tsx (`sincronizzaUrlStanza`) — senza questo mock la mutazione reale di
// `window.location.pathname` sopravviverebbe al test (jsdom non resetta `window.location` fra
// gli `it()` di uno stesso file) e farebbe leakare `/cassette` sui test successivi
// (`stanzaEffettiva` la rilegge al mount).
let pushStateSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IOFinto)
  animateSpy.mockClear()
  pushStateSpy = vi.spyOn(window.history, 'pushState').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  pushStateSpy.mockRestore()
})

describe('HomeV3 — il piede resta montato durante lo swipe (H4c supera lo smonta/rimonta di colpo)', () => {
  it('lo stesso nodo .foot sopravvive al passaggio pile→parete (mai smontato/rimontato)', () => {
    const { container } = renderHome()
    preparaViewport(container)
    const primaDelTap = piede(container)

    act(() => {
      simulaScroll(preparaViewport(container), 390, 390)
    })
    // La stanza attiva si aggiorna solo via IO (inerte qui) o navigazione esplicita — lo swipe
    // grezzo da solo non chiama `impostaAttiva`; il punto di QUESTO test è che il nodo `.foot`
    // esista ancora ed è lo STESSO riferimento, non che la stanza sia cambiata (quello è già
    // presidiato in stanze-pager.test.tsx).
    expect(piede(container)).toBe(primaDelTap)
  })
})

describe('HomeV3 — onProgressoSwipe aggiorna le custom property CSS su .foot (coreografia C2)', () => {
  it('a metà gesto (progress 0.5): --piede-etichetta-opacita 0, --piede-tondo-scala 0.5, --piede-tondo-opacita 1', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    simulaScroll(viewport, 195, 390)

    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-etichetta-opacita')).toBe('0')
    expect(Number(nodo.style.getPropertyValue('--piede-tondo-scala'))).toBeCloseTo(0.5, 5)
    expect(nodo.style.getPropertyValue('--piede-tondo-opacita')).toBe('1')
  })

  it('a riposo (progress 0, prima di ogni scroll): il piede è pieno sui tre assi', () => {
    const { container } = renderHome()
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-etichetta-opacita')).toBe('1')
    expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('1')
    expect(nodo.style.getPropertyValue('--piede-tondo-opacita')).toBe('1')
  })
})

// Gruppo di test 2 del brief — rilascio a metà gesto: la molla.press (token, non valori
// inline) riporta il piede allo stato più vicino.
describe('HomeV3 — rilascio del gesto (touchend/touchcancel): molla.press, non valori inline', () => {
  it('rilascio SOTTO metà gesto (progress 0.3): animate(progresso, 0, molla.press)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 117, 390) // 117/390 = 0.3
    animateSpy.mockClear()
    act(() => {
      fireEvent.touchEnd(viewport)
    })

    expect(animateSpy).toHaveBeenCalledTimes(1)
    const [valoreMV, bersaglio, transizione] = animateSpy.mock.calls[0]
    expect(bersaglio).toBe(0)
    expect(valoreMV.get()).toBeCloseTo(0.3, 5)
    expect(transizione).toMatchObject(molla.press)
  })

  it('rilascio SOPRA metà gesto (progress 0.7): animate(progresso, 1, molla.press)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 273, 390) // 273/390 = 0.7
    animateSpy.mockClear()
    act(() => {
      fireEvent.touchEnd(viewport)
    })

    expect(animateSpy).toHaveBeenCalledTimes(1)
    const [, bersaglio, transizione] = animateSpy.mock.calls[0]
    expect(bersaglio).toBe(1)
    expect(transizione).toMatchObject(molla.press)
  })

  it('touchcancel (annullo di sistema) rilascia esattamente come touchend', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 273, 390)
    animateSpy.mockClear()
    act(() => {
      fireEvent.touchCancel(viewport)
    })

    expect(animateSpy).toHaveBeenCalledTimes(1)
  })

  it('un nuovo touchstart durante l\'assestamento ferma la molla precedente (il dito riafferra)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 273, 390)
    act(() => {
      fireEvent.touchEnd(viewport)
    })
    const controlli = animateSpy.mock.calls[0]?.[3] as { stop: () => void } | undefined
    expect(controlli).toBeDefined()
    const stopSpy = vi.spyOn(controlli!, 'stop')

    act(() => {
      fireEvent.touchStart(viewport)
    })
    expect(stopSpy).toHaveBeenCalledTimes(1)
  })
})

describe('HomeV3 — prefers-reduced-motion: set diretto al rilascio, MAI animate()', () => {
  it('rilascio con reduced-motion attivo: nessuna chiamata ad animate(), il valore salta subito al bersaglio', () => {
    const ripristina = mockReducedMotion(true)
    try {
      const { container } = renderHome()
      const viewport = preparaViewport(container)

      act(() => {
        fireEvent.touchStart(viewport)
      })
      simulaScroll(viewport, 273, 390) // 0.7 → bersaglio 1
      animateSpy.mockClear()
      act(() => {
        fireEvent.touchEnd(viewport)
      })

      expect(animateSpy).not.toHaveBeenCalled()
      const nodo = piede(container)
      expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('1') // reduced: scala SEMPRE 1
      expect(nodo.style.getPropertyValue('--piede-tondo-opacita')).toBe('0') // bersaglio 1 → dissolvenza a 0
      expect(nodo.style.getPropertyValue('--piede-etichetta-opacita')).toBe('0')
    } finally {
      ripristina()
    }
  })

  it('durante il gesto con reduced-motion: solo dissolvenza (opacità), mai scala diversa da 1', () => {
    const ripristina = mockReducedMotion(true)
    try {
      const { container } = renderHome()
      const viewport = preparaViewport(container)

      simulaScroll(viewport, 195, 390) // progress 0.5

      const nodo = piede(container)
      expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('1')
      expect(Number(nodo.style.getPropertyValue('--piede-tondo-opacita'))).toBeCloseTo(0.5, 5)
      expect(nodo.style.getPropertyValue('--piede-tondo-opacita')).toBe(nodo.style.getPropertyValue('--piede-etichetta-opacita'))
    } finally {
      ripristina()
    }
  })
})

// Gruppo di test 4 del brief — regressione: le forme non-pager (senza swipe) non toccano nulla
// di questo capitolo. Il piede resta quello di sempre, pieno, senza le custom property in gioco
// (nessun listener le scrive mai in quella forma).
describe('HomeV3 — forma "solo pile" (nessun pager, nessun gesto): il piede è invariato', () => {
  it('il piede è pieno di default e nessun animate() viene mai chiamato per lui', () => {
    const { container } = render(
      <HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} parete={[]} homePref="pile" />
    )
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-etichetta-opacita')).toBe('1')
    expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('1')
    expect(nodo.style.getPropertyValue('--piede-tondo-opacita')).toBe('1')
    expect(animateSpy).not.toHaveBeenCalled()
  })
})

// FIX ri-collaudo #4 (verbale 2026-07-24, APPEND 25/07 sera, difetto b — «scattering/rimbalzo»
// sul flick veloce): un tick di scroll reale arrivato DOPO il rilascio (il momentum/snap
// nativo può continuare a muovere lo scrollLeft più a lungo della molla, ~110ms) deve SEMPRE
// vincere sulla stima di `bersaglioRilascio` — mai restare ignorato fino all'`onComplete`.
describe('HomeV3 — un tick di scroll reale dopo il rilascio insegue lo scroll vero (difetto b, flick veloce)', () => {
  it('un tick di scroll durante l\'assestamento ferma la molla in volo e riprende 1:1', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 117, 390) // 0.3 -> bersaglioRilascio = 0 (guess "torna pieno")
    animateSpy.mockClear()
    act(() => {
      fireEvent.touchEnd(viewport) // la molla parte verso 0
    })
    const controlli = animateSpy.mock.calls[0]?.[3] as { stop: () => void } | undefined
    expect(controlli).toBeDefined()
    const stopSpy = vi.spyOn(controlli!, 'stop')

    // il fling nativo prosegue DOPO il rilascio (il pager non guida né rincorre lo scroll
    // nativo, lo osserva soltanto — v. StanzePager.tsx): un vero tick di scroll arriva mentre
    // la molla guessata (sbagliata, in questo scenario) è ancora in volo.
    simulaScroll(viewport, 370, 390) // 0.949 — lo scroll reale sta arrivando alla Parete

    expect(stopSpy).toHaveBeenCalledTimes(1)
    const nodo = piede(container)
    expect(Number(nodo.style.getPropertyValue('--piede-tondo-scala'))).toBeCloseTo(1 - 370 / 390, 5)
  })

  it('flick veloce end-to-end: la stima al rilascio sbaglia verso (guess 0) ma lo scroll reale prosegue fino in fondo — il piede converge SEMPRE allo stato vero, mai bloccato', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 40, 390) // progress ~0.10, ben sotto la soglia 0.5 -> guess 0
    act(() => {
      fireEvent.touchEnd(viewport) // molla verso 0 — SBAGLIATA in questo scenario
    })
    // pochi tick ravvicinati, come il momentum/snap nativo dopo un flick veloce
    simulaScroll(viewport, 200, 390)
    simulaScroll(viewport, 390, 390)

    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('0')
    expect(Number(nodo.style.getPropertyValue('--piede-tondo-opacita'))).toBeCloseTo(0, 5)
    expect(nodo.classList.contains('is-vuoto')).toBe(true)
  })
})

// FIX ri-collaudo #4, difetto (a) — «blocco panna che copre la pagina»: il contenitore .foot
// deve collassare (classe is-vuoto → display:none) SOLO a riposo vero, mai a metà coreografia.
describe('HomeV3 — collasso dell\'ingombro del .foot a riposo vero (difetto a, blocco panna)', () => {
  it('a riposo iniziale (progress 0) il contenitore NON è collassato', () => {
    const { container } = renderHome()
    const nodo = piede(container)
    expect(nodo.classList.contains('is-vuoto')).toBe(false)
  })

  it('a metà gesto (progress 0.5) il contenitore NON è ancora collassato', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 195, 390)
    const nodo = piede(container)
    expect(nodo.classList.contains('is-vuoto')).toBe(false)
  })

  it('appena sotto il traguardo (progress 0.99) il contenitore NON è ancora collassato (niente pop anticipato)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 386, 390) // 0.9897
    const nodo = piede(container)
    expect(nodo.classList.contains('is-vuoto')).toBe(false)
  })

  it('a riposo vero su Parete (progress 1) il contenitore collassa (classe is-vuoto)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 390, 390)
    const nodo = piede(container)
    expect(nodo.classList.contains('is-vuoto')).toBe(true)
  })

  it('un gesto lento all\'indietro dalla Parete fa riespandere subito il contenitore (reversibilità)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 390, 390)
    expect(piede(container).classList.contains('is-vuoto')).toBe(true)
    simulaScroll(viewport, 385, 390) // torna appena sotto 1
    expect(piede(container).classList.contains('is-vuoto')).toBe(false)
  })
})

// FIX verifica device di Francesco (round 4) — «non appena effettuo lo swipe, nella pagina
// delle cassette resta il quadrato panna che copre le cassette e POI scompare»: diagnosi provata
// dal vivo su :3042 (v. report) — il "quadrato" è l'ingombro di layout di `.foot` (margine-top +
// gap + safe-area), ancora a piena dimensione durante la finestra fra "il contenuto è già
// sfumato" e "lo scroll-snap si è DAVVERO fermato" (scrollend). Il collasso DISCRETO
// (`is-vuoto`/`display:none`, round 1) arriva troppo tardi da solo — questi test verificano il
// SECONDO canale, continuo (`--piede-ingombro`, `piedeIngombro` in piede-swipe.ts), che chiude
// l'ingombro DENTRO il gesto (progress ~0.9), ben prima del collasso discreto a progress===1.
describe('HomeV3 — il contenitore .foot partecipa alla coreografia (round 4): niente ingombro dipinto all\'arrivo', () => {
  it('a riposo su Pile (progress 0): --piede-ingombro pieno (1)', () => {
    const { container } = renderHome()
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('1')
  })

  it('a metà gesto (progress 0.5): --piede-ingombro ancora pieno (nessun restringimento anticipato)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 195, 390)
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('1')
  })

  it('«il frame arrivo su cassette con progress<1»: a 0.9 l\'ingombro è GIÀ a 0, ben prima del collasso discreto (is-vuoto ancora assente)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 351, 390) // 351/390 = 0.9 esatto
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('0')
    expect(nodo.classList.contains('is-vuoto')).toBe(false) // il collasso discreto non è ancora scattato
  })

  it('«il frame arrivo su cassette con progress<1» (0.95, 0.99): l\'ingombro resta a 0 per tutta la finestra pre-collasso — nessun pixel dipinto dal piede', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    const nodo = piede(container)

    simulaScroll(viewport, 370.5, 390) // 0.95
    expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('0')
    expect(nodo.classList.contains('is-vuoto')).toBe(false)

    simulaScroll(viewport, 386, 390) // 0.99
    expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('0')
    expect(nodo.classList.contains('is-vuoto')).toBe(false)
  })

  it('a riposo vero (progress 1): --piede-ingombro 0 E is-vuoto presente (i due canali convergono)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 390, 390)
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('0')
    expect(nodo.classList.contains('is-vuoto')).toBe(true)
  })

  it('un gesto lento all\'indietro (da 0.9 verso le Pile) riespande subito l\'ingombro (reversibilità)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)
    simulaScroll(viewport, 351, 390) // 0.9 -> ingombro 0
    expect(piede(container).style.getPropertyValue('--piede-ingombro')).toBe('0')
    simulaScroll(viewport, 273, 390) // torna a 0.7 -> ingombro pieno
    expect(piede(container).style.getPropertyValue('--piede-ingombro')).toBe('1')
  })

  it('reduced-motion: --piede-ingombro chiude comunque a progress 0.9 (indipendente dalla formula ridotta di tondo/etichetta)', () => {
    const ripristina = mockReducedMotion(true)
    try {
      const { container } = renderHome()
      const viewport = preparaViewport(container)
      simulaScroll(viewport, 351, 390) // 0.9
      const nodo = piede(container)
      expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('0')
      // la coreografia reduced (dissolvenza semplice) resta INVARIATA: v. gruppo di test dedicato
      // più sopra — qui si verifica SOLO che il nuovo canale ingombro non ne dipenda.
    } finally {
      ripristina()
    }
  })

  it('forma "solo pile" (nessun pager): --piede-ingombro resta al default (1), mai scritto', () => {
    const { container } = render(
      <HomeV3 nome="Francesco" eyebrow="Giovedì 9 luglio" saluto="Buon pomeriggio" pile={PILE} segnale={SEGNALE} parete={[]} homePref="pile" />
    )
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-ingombro')).toBe('1')
  })
})

// FIX ri-collaudo #4 (verbale 2026-07-24, APPEND 25/07 sera, difetti a+b) — riconciliazione:
// `stanzaAttiva` (autorità finale del pager, IO/navigazione esplicita) deve SEMPRE poter
// correggere `progressoSwipe`, anche se una molla guessata al rilascio sta già puntando (o ha
// già puntato) nel verso sbagliato.
describe('HomeV3 — riconciliazione da stanzaAttiva: nessuno stato di riposo può restare divergente', () => {
  it('la stima al rilascio sbaglia (guess 0), ma la navigazione esplicita conferma la Parete: la molla si corregge verso 1', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 117, 390) // 0.3 -> bersaglioRilascio = 0 (guess "torna pieno")
    act(() => {
      fireEvent.touchEnd(viewport) // molla verso 0 — la stima presume un ritorno alle Pile
    })
    const controlliSbagliati = animateSpy.mock.calls[0]?.[3] as { stop: () => void } | undefined
    expect(controlliSbagliati).toBeDefined()
    const stopSpy = vi.spyOn(controlliSbagliati!, 'stop')
    animateSpy.mockClear()

    // il pager, indipendentemente dalla stima, conferma che la stanza reale è la Parete —
    // stesso segnale che l'IntersectionObserver darebbe a soglia 0.6 in direzione opposta alla
    // stima, qui ottenuto via la via esplicita (linguetta) per non dipendere da un IO finto.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    })

    expect(stopSpy).toHaveBeenCalled()
    expect(animateSpy).toHaveBeenCalledTimes(1)
    const [, bersaglio, transizione] = animateSpy.mock.calls[0]
    expect(bersaglio).toBe(1)
    expect(transizione).toMatchObject(molla.press)
  })

  it('se la stima al rilascio era già corretta, la riconciliazione non avvia alcuna molla ridondante', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 390, 390) // 1 -> bersaglioRilascio = 1, già corretto
    act(() => {
      fireEvent.touchEnd(viewport)
    })
    animateSpy.mockClear()

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    })

    expect(animateSpy).not.toHaveBeenCalled()
  })

  it('simmetrico: la stima al rilascio sbaglia (guess 1), ma la navigazione esplicita conferma le Pile: la molla si corregge verso 0 ("il pulsante sparisce dalla home", difetto b)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    // porta la stanza attiva sulla Parete per davvero (navigazione esplicita): la molla
    // guessata al rilascio sotto può quindi sbagliare nella direzione OPPOSTA — verso le Pile.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    })
    animateSpy.mockClear()

    act(() => {
      fireEvent.touchStart(viewport)
    })
    simulaScroll(viewport, 273, 390) // 0.7 -> bersaglioRilascio = 1 (SBAGLIATA in questo scenario)
    act(() => {
      fireEvent.touchEnd(viewport) // molla verso 1
    })
    const controlliSbagliati = animateSpy.mock.calls[0]?.[3] as { stop: () => void } | undefined
    expect(controlliSbagliati).toBeDefined()
    const stopSpy = vi.spyOn(controlliSbagliati!, 'stop')
    animateSpy.mockClear()

    // il pager conferma indipendentemente che la stanza reale è tornata alle Pile (back
    // esplicito dell'header della parete).
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Indietro' }))
    })

    expect(stopSpy).toHaveBeenCalled()
    expect(animateSpy).toHaveBeenCalledTimes(1)
    const [, bersaglio, transizione] = animateSpy.mock.calls[0]
    expect(bersaglio).toBe(0)
    expect(transizione).toMatchObject(molla.press)
  })

  it('mentre il dito è ancora giù (fra onPresaSwipe e onRilascioSwipe) la riconciliazione NON parte, anche se stanzaAttiva cambia (niente hitch a metà drag)', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.touchStart(viewport) // dito giù
    })
    simulaScroll(viewport, 273, 390) // 0.7, ancora durante il drag
    animateSpy.mockClear()

    // mentre il dito è ancora giù, la stanza attiva cambia (nella realtà: l'IO a soglia 0.6
    // durante un drag ancora in corso, PRIMA del rilascio) — qui ottenuto via la via esplicita,
    // che aggiorna comunque `stanzaAttiva` indipendentemente dal touch sul viewport.
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    })

    expect(animateSpy).not.toHaveBeenCalled()

    act(() => {
      fireEvent.touchEnd(viewport) // il dito solleva: bersaglioRilascio(0.7) = 1, coerente
    })
    expect(animateSpy).toHaveBeenCalledTimes(1) // il rilascio, non la riconciliazione
    expect(animateSpy.mock.calls[0][1]).toBe(1)
  })

  // FIX ri-collaudo #4 (review, riprodotto dal vivo su :3042 con uno scroll a rotellina reale,
  // v. report §"root cause 1 bis"): il gate sopra si basava SOLO su touchstart/touchend — una
  // rotellina/trackpad non genera mai quegli eventi, quindi lo stesso "hitch" (molla di
  // riconciliazione che parte a metà scroll, poi scavalcata dal tick successivo) restava
  // riproducibile su un gesto non-touch. `scorrendoRef` ora si arma a OGNI tick di scroll (non
  // solo al touchstart) e si libera SOLO da un segnale nativo di scroll fermo: `onRilascioSwipe`
  // (touch) o `onScrollAssestato` (`scrollend`, StanzePager.tsx — copre rotellina/trackpad/
  // scrollTo programmatico).
  it('scroll non-touch (rotellina/trackpad, nessun touchstart): la riconciliazione resta bloccata finché non arriva scrollend, poi torna a valere', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    simulaScroll(viewport, 273, 390) // tick di scroll grezzo, SENZA alcun touchstart
    animateSpy.mockClear()

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i })) // stanzaAttiva -> parete
    })
    expect(animateSpy).not.toHaveBeenCalled() // bloccato: lo scroll è ancora "in corso" per il gate

    act(() => {
      fireEvent(viewport, new Event('scrollend')) // lo scroll si ferma DAVVERO
    })
    // FIX ri-collaudo #4 (review round 2): scrollend non si limita più a sbloccare il gate — ORA
    // riconcilia anche subito, agganciando `progressoSwipe` al riposo ESATTO (1) che
    // `stanzaAttiva` (già 'parete') impone, indipendentemente dal valore frazionario (0.7) che il
    // tick di scroll grezzo aveva lasciato.
    expect(animateSpy).toHaveBeenCalledTimes(1)
    expect(animateSpy.mock.calls[0][1]).toBe(1)
    animateSpy.mockClear()

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Indietro' })) // stanzaAttiva -> pile
    })
    expect(animateSpy).toHaveBeenCalledTimes(1) // il gate resta sbloccato: la riconciliazione riparte
    const [, bersaglio, transizione] = animateSpy.mock.calls[0]
    expect(bersaglio).toBe(0)
    expect(transizione).toMatchObject(molla.press)
  })

  // FIX ri-collaudo #4 (review round 2) — CASO SCOPERTO dal reviewer: lo scroll nativo si
  // assesta a un progress FRAZIONARIO (arrotondamento sub-pixel/HiDPI, es. 0.998) mentre
  // `stanzaAttiva` è GIÀ sul bersaglio corretto (il gate `scorrendoRef` aveva già bloccato la
  // riconciliazione al momento del cambio di stanza, com'è la norma su un gesto reale — l'IO
  // scatta a soglia 0.6, ben prima che lo scroll finisca di assestarsi). Prima di questo fix
  // `onScrollAssestato` si limitava a liberare il gate: `progressoSwipe` restava a 0.998 per
  // sempre — tondo invisibile ma box `.foot` ancora presente (`piedeSenzaIngombro` vuole `>= 1`
  // esatto), il «blocco panna» riaperto proprio dal gate che doveva chiuderlo.
  it('progress frazionario a scrollend con stanzaAttiva già sul bersaglio: riconciliato a 1 esatto, is-vuoto presente, box collassato', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    // lo scroll (nessun touch: rotellina/trackpad, o un residuo dopo che l'IO ha già deciso)
    // porta stanzaAttiva sulla Parete mentre il gate è ancora armato...
    simulaScroll(viewport, 273, 390) // un tick qualunque, il gate scatta al primo movimento
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i })) // stanzaAttiva -> parete, gate ancora armato -> nessuna molla
    })
    animateSpy.mockClear()
    // ...e SOLO ORA arriva l'ultimo tick, con l'arrotondamento sub-pixel/HiDPI: 0.998, non 1.
    simulaScroll(viewport, 389.22, 390) // 389.22/390 = 0.99795 circa, mai esattamente 1

    const nodo = piede(container)
    expect(nodo.classList.contains('is-vuoto')).toBe(false) // ancora NON collassato (progress < 1 esatto)

    act(() => {
      fireEvent(viewport, new Event('scrollend')) // lo scroll si è DAVVERO fermato
    })

    expect(animateSpy).toHaveBeenCalledTimes(1)
    const [valoreMV, bersaglio, transizione] = animateSpy.mock.calls[0]
    expect(bersaglio).toBe(1)
    expect(valoreMV.get()).toBeCloseTo(389.22 / 390, 5) // parte dal frazionario reale, non da 0
    expect(transizione).toMatchObject(molla.press)
    // reduced-motion: v. test simmetrico sotto per il ramo `.set()` diretto (nessuna molla).
  })

  it('simmetrico: progress frazionario a scrollend con stanzaAttiva tornata sulle Pile: riconciliato a 0 esatto', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    // porta la stanza sulla Parete per davvero, a riposo esatto (nessuna ambiguità qui).
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    })
    animateSpy.mockClear()

    // ritorno: un tick qualunque porta stanzaAttiva sulle Pile mentre il gate è ancora armato...
    simulaScroll(viewport, 117, 390)
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Indietro' })) // stanzaAttiva -> pile, gate ancora armato -> nessuna molla
    })
    animateSpy.mockClear()
    // ...e l'ultimo tick reale lascia un residuo frazionario vicino a 0, non esattamente 0.
    simulaScroll(viewport, 0.78, 390) // 0.002 circa

    act(() => {
      fireEvent(viewport, new Event('scrollend'))
    })

    expect(animateSpy).toHaveBeenCalledTimes(1)
    const [, bersaglio, transizione] = animateSpy.mock.calls[0]
    expect(bersaglio).toBe(0)
    expect(transizione).toMatchObject(molla.press)
  })

  it('reduced-motion: la riconciliazione a scrollend usa .set() diretto, MAI animate()', () => {
    const ripristina = mockReducedMotion(true)
    try {
      const { container } = renderHome()
      const viewport = preparaViewport(container)

      simulaScroll(viewport, 273, 390)
      act(() => {
        fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
      })
      animateSpy.mockClear()
      simulaScroll(viewport, 389.22, 390) // frazionario

      act(() => {
        fireEvent(viewport, new Event('scrollend'))
      })

      expect(animateSpy).not.toHaveBeenCalled()
      const nodo = piede(container)
      expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('1') // reduced: scala SEMPRE 1
      expect(Number(nodo.style.getPropertyValue('--piede-tondo-opacita'))).toBeCloseTo(0, 5)
      expect(nodo.classList.contains('is-vuoto')).toBe(true) // riconciliato a 1 esatto: collassato
    } finally {
      ripristina()
    }
  })

  // FIX ri-collaudo #4 (review round 3) — CASO SCOPERTO dal reviewer: la guardia epsilon di
  // `riconcilia` (`< 0.001 → return` nudo, PRIMA di questo fix) non era allineata alla soglia
  // ESATTA di `piedeSenzaIngombro` (`>= 1`). Per un residuo DENTRO la finestra epsilon (es.
  // 0.9995, diff 0.0005 < 0.001 — un assestamento a 0.39px dal bordo su DPR frazionario, uno
  // scenario ANCORA più stretto del 0.998 del round 2, che l'ancora non copriva) il `return`
  // nudo lasciava `progressoSwipe` frazionario per sempre: impercettibile per opacità/scala
  // (continue), ma `is-vuoto` non scatta MAI sotto l'1 esatto — stesso «blocco panna», ~1000×
  // più stretto, ma ancora vivo. Il test del round 2 (diff 0.00205) esercitava il punto in cui
  // FUNZIONAVA, non questo residuo.
  it('progress DENTRO la finestra epsilon (0.9995, diff < 0.001) con stanzaAttiva già sul bersaglio: dopo scrollend, progress === 1 esatto via .set() (mai animate), is-vuoto presente', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    simulaScroll(viewport, 273, 390) // gate armato
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i })) // stanzaAttiva -> parete, gate ancora armato -> nessuna molla
    })
    animateSpy.mockClear()
    // l'ultimo tick lascia un residuo ANCORA più stretto del round 2, dentro la finestra epsilon.
    simulaScroll(viewport, 389.8, 390) // 389.8/390 = 0.99948..., diff da 1 = 0.00052 < 0.001

    const nodo = piede(container)
    expect(nodo.classList.contains('is-vuoto')).toBe(false) // ancora NON collassato prima di scrollend

    act(() => {
      fireEvent(viewport, new Event('scrollend'))
    })

    expect(animateSpy).not.toHaveBeenCalled() // dentro la finestra epsilon: .set() diretto, MAI animate
    // `mappaPiedeSwipe(1, false).tondoScala` è ESATTAMENTE 0 (clamp01(1-1)) SOLO se `progressoSwipe`
    // è atterrato ESATTAMENTE a 1 — un residuo frazionario avrebbe dato uno scala > 0 e
    // `is-vuoto` assente: le due assert insieme provano l'atterraggio esatto.
    expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('0')
    expect(nodo.classList.contains('is-vuoto')).toBe(true)
  })

  it('simmetrico: progress DENTRO la finestra epsilon (0.0005) con stanzaAttiva tornata sulle Pile: dopo scrollend, progress === 0 esatto via .set(), is-vuoto assente', () => {
    const { container } = renderHome()
    const viewport = preparaViewport(container)

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /le cassette/i }))
    })
    animateSpy.mockClear()

    simulaScroll(viewport, 117, 390) // gate armato
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Indietro' })) // stanzaAttiva -> pile, gate ancora armato -> nessuna molla
    })
    animateSpy.mockClear()
    simulaScroll(viewport, 0.2, 390) // 0.2/390 = 0.000512..., dentro la finestra epsilon verso 0

    act(() => {
      fireEvent(viewport, new Event('scrollend'))
    })

    expect(animateSpy).not.toHaveBeenCalled() // dentro la finestra epsilon: .set() diretto, MAI animate
    // `mappaPiedeSwipe(0, false)` è pieno su tutti e tre gli assi SOLO se `progressoSwipe` è
    // atterrato ESATTAMENTE a 0 — un residuo frazionario avrebbe dato scala < 1 ed
    // etichetta non del tutto opaca.
    const nodo = piede(container)
    expect(nodo.style.getPropertyValue('--piede-tondo-scala')).toBe('1')
    expect(nodo.style.getPropertyValue('--piede-etichetta-opacita')).toBe('1')
    expect(nodo.classList.contains('is-vuoto')).toBe(false) // riposo su Pile: mai collassato
  })

  it('al mount (deep-link diretto sulla Parete) non parte alcuna molla spuria', () => {
    const { container } = render(
      <HomeV3
        nome="Francesco"
        eyebrow="Giovedì 9 luglio"
        saluto="Buon pomeriggio"
        pile={PILE}
        segnale={SEGNALE}
        parete={PARETE}
        homePref="due_stanze"
        stanzaParam="parete"
      />
    )
    preparaViewport(container)
    expect(animateSpy).not.toHaveBeenCalled()
  })
})

// Gruppo di test 5 del brief — guardia: nessun valore motion inline nei file toccati.
describe('Guardia — nessun duration:/ease: inline nei file del capitolo H4c', () => {
  it('HomeV3.tsx non introduce transizioni inline (tutto da molla.*/token)', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')
    expect(src).not.toMatch(/duration:\s*[\d.]/)
    expect(src).not.toMatch(/ease:\s*['"[]/)
  })

  it('StanzePager.tsx non introduce transizioni inline', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(process.cwd(), 'src/components/features/home/StanzePager.tsx'), 'utf8')
    expect(src).not.toMatch(/duration:\s*[\d.]/)
    expect(src).not.toMatch(/ease:\s*['"[]/)
  })

  it('piede-swipe.ts è puro: nessun import di motion/react né valori di transizione', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(process.cwd(), 'src/components/features/home/piede-swipe.ts'), 'utf8')
    expect(src).not.toMatch(/from ['"]motion\/react['"]/)
    expect(src).not.toMatch(/duration:\s*[\d.]/)
    expect(src).not.toMatch(/ease:\s*['"[]/)
  })
})
