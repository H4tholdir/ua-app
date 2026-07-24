// Capitolo H4c — Piede C2 «il tasto si ritira» (decisione 0c37f25, demo animata ebf4edb). Il
// core puro (mappatura progress→stile, bersaglio del rilascio) è testato in isolamento in
// piede-swipe.test.ts (jsdom non serve lì); qui si presidia il guscio REACT che jsdom REGGE:
// che il piede resti montato (mai più smontato/rimontato) attraverso il cambio di stanza, che le
// custom property CSS su `.foot` seguano `onProgressoSwipe`, e che il rilascio a metà gesto
// invochi `animate(..., molla.press)` — MAI `.set()` diretto — salvo reduced-motion, dove vale
// l'opposto. Quello che jsdom NON può reggere (la curva reale della molla nel tempo, il feel a
// schermo) resta verifica visiva live (v. il report H4c).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
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

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', IOFinto)
  animateSpy.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
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
