// Task 13 — useDragRiordino: il GUSCIO DOM del drag. Qui si prova SOLO ciò che jsdom sa reggere
// (§6.3 della ricerca): la macchina a stati vista da fuori (sollevamento → sheet vs drop), il
// payload della POST e il rollback, le guardie. Ciò che jsdom NON sa (preventDefault reale,
// scroll, rect, FLIP, fluidità) è device/Playwright (§6.4, FASE 9) — nessun test qui finge di
// coprirlo. In jsdom i rect sono zeri: l'INDICE di caduta è degenere (clampato a 0), quindi non si
// asserisce MAI su quale ordine esatto venga POSTato — si asserisce sulla DECISIONE (sheet vs
// drop) e sul fatto che la POST parta e il refresh segua l'esito.
import React, { useRef } from 'react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { useDragRiordino } from '@/components/features/cassette/useDragRiordino'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

afterEach(cleanup)

const PARETE: CassettaParete[] = [
  { id: 'a', nome: 'C1', colore: 'rossa', posizione: 0, lavoro: null },
  { id: 'b', nome: 'C2', colore: 'blu', posizione: 1, lavoro: null },
  { id: 'c', nome: 'C3', colore: 'verde', posizione: 2, lavoro: null },
]

type HarnessProps = {
  disabilitato?: boolean
  onSheet: (id: string) => void
  inviaOrdine: (ordine: string[]) => Promise<boolean>
  onRefresh: () => void
  /** D10 (FIX-F): default PARETE (3, invariato per i test esistenti) — il test del pitchY usa
   *  una parete più grande (9, 3 colonne × 3 righe) per avere una riga ≥2 da colpire. */
  parete?: CassettaParete[]
}

// Espone la superficie testabile dell'hook. `onSollevata(id, evento)` è ciò che Cassetta chiama al
// lift; qui lo invochiamo a mano con un evento sintetico, poi guidiamo `window` come farebbe il dito.
function Harness(props: HarnessProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const parete = props.parete ?? PARETE
  const drag = useDragRiordino({
    parete,
    disabilitato: props.disabilitato ?? false,
    gridRef,
    onSheet: props.onSheet,
    inviaOrdine: props.inviaOrdine,
    onRefresh: props.onRefresh,
  })
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { ref: gridRef, className: 'ds-parete-grid' },
      parete.map((c) =>
        React.createElement('button', {
          key: c.id,
          'data-cassetta-id': c.id,
          onPointerDown: (e: React.PointerEvent) => drag.onSollevata(c.id, e as React.PointerEvent<HTMLButtonElement>),
        }, c.nome),
      ),
    ),
    React.createElement('span', { 'data-testid': 'trascinato' }, drag.idTrascinato ?? ''),
  )
}

function sollevaC(id: string, parete: CassettaParete[] = PARETE, coordinate = { clientX: 10, clientY: 10 }) {
  const bottone = screen.getByText(parete.find((c) => c.id === id)!.nome)
  act(() => {
    bottone.dispatchEvent(
      new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', bubbles: true, ...coordinate }),
    )
  })
}

function muoviWindow(clientX: number, clientY: number) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX, clientY }))
  })
}

function rilasciaWindow(clientX = 10, clientY = 10) {
  act(() => {
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, clientX, clientY }))
  })
}

// D10 (review Important, FIX-F) — harness deterministico per requestAnimationFrame: jsdom lo
// implementa con un setInterval REALE (1000/60 ≈ 16.7ms — jsdom `Window.js`), quindi un test che
// aspetta un tick vero (`setTimeout(60)`) dipende dal tempo di parete e sotto contesa multi-worker
// può saltare il tick (v. tests/setup.ts + `.superpowers/sdd/diagnosi-flake-vitest.md`). Qui si
// sostituisce `requestAnimationFrame`/`cancelAnimationFrame` con una coda pilotata a mano: il test
// decide quando un frame «gira» (`flush`), zero attesa reale, stesso comportamento del loop
// (`frame()` in useDragRiordino.ts si re-invoca chiamando di nuovo `requestAnimationFrame`, che va
// nella stessa coda mock — il rilascio poi lo cancella via `cancelAnimationFrame`).
function creaRafDeterministico() {
  let coda: Array<{ id: number; cb: FrameRequestCallback }> = []
  let prossimoId = 1
  const raf = (cb: FrameRequestCallback) => {
    const id = prossimoId++
    coda.push({ id, cb })
    return id
  }
  const cancel = (id: number) => {
    coda = coda.filter((voce) => voce.id !== id)
  }
  const flush = (ts: number) => {
    const pendenti = coda
    coda = []
    for (const voce of pendenti) voce.cb(ts)
  }
  return { raf, cancel, flush }
}

describe('useDragRiordino — guardia: niente drag quando disabilitato (ricerca attiva / <2 cassette)', () => {
  it('a drag disabilitato, il sollevamento è un no-op: nessuna cassetta trascinata, nessuna POST', () => {
    const inviaOrdine = vi.fn().mockResolvedValue(true)
    const onSheet = vi.fn()
    render(React.createElement(Harness, { disabilitato: true, onSheet, inviaOrdine, onRefresh: vi.fn() }))
    sollevaC('c')
    expect(screen.getByTestId('trascinato')).toHaveTextContent('')
    rilasciaWindow()
    expect(inviaOrdine).not.toHaveBeenCalled()
    expect(onSheet).not.toHaveBeenCalled()
  })
})

describe('useDragRiordino — sollevamento poi RILASCIO FERMO = sheet (mai drop, §2.5)', () => {
  it('senza movimento oltre soglia, il rilascio apre lo sheet e NON POSTa nulla', () => {
    const inviaOrdine = vi.fn().mockResolvedValue(true)
    const onSheet = vi.fn()
    render(React.createElement(Harness, { onSheet, inviaOrdine, onRefresh: vi.fn() }))
    sollevaC('c')
    expect(screen.getByTestId('trascinato')).toHaveTextContent('c')
    rilasciaWindow(10, 10) // fermo
    expect(onSheet).toHaveBeenCalledWith('c')
    expect(inviaOrdine).not.toHaveBeenCalled()
    expect(screen.getByTestId('trascinato')).toHaveTextContent('') // gesto concluso
  })
})

describe('useDragRiordino — sollevamento poi MOVIMENTO = drop: UNA POST della lista completa (§2.4.6)', () => {
  it('con movimento oltre soglia, il rilascio POSTa (drop) e NON apre lo sheet', async () => {
    const inviaOrdine = vi.fn().mockResolvedValue(true)
    const onSheet = vi.fn()
    const onRefresh = vi.fn()
    render(React.createElement(Harness, { onSheet, inviaOrdine, onRefresh }))
    sollevaC('c')
    muoviWindow(200, 200) // oltre gli 8px dal lift
    await act(async () => {
      rilasciaWindow(200, 200)
    })
    expect(onSheet).not.toHaveBeenCalled()
    expect(inviaOrdine).toHaveBeenCalledTimes(1)
    // Payload = lista COMPLETA degli id (una permutazione dei tre), mai un sottoinsieme.
    const ordine = inviaOrdine.mock.calls[0][0] as string[]
    expect([...ordine].sort()).toEqual(['a', 'b', 'c'])
    // refresh SOLO dopo una POST riuscita (mai `router.refresh()` pre-drag — §8.2).
    await act(async () => {})
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('drop fallito (POST → false) → nessun refresh (rollback quieto, §2.4.6)', async () => {
    const inviaOrdine = vi.fn().mockResolvedValue(false)
    const onRefresh = vi.fn()
    render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh }))
    sollevaC('c')
    muoviWindow(200, 200)
    await act(async () => {
      rilasciaWindow(200, 200)
    })
    expect(inviaOrdine).toHaveBeenCalledTimes(1)
    await act(async () => {})
    expect(onRefresh).not.toHaveBeenCalled()
  })
})

// D10 (FIX-F, QA device #1, verbale 2026-07-24) — root cause: `.ds-parete-grid` (ds-v3.css
// ~624/664) ha `grid-auto-rows: var(--track)` + `align-items:start`: le celle NON riempiono la
// riga, il passo di riga vero è il track, non `cellaH + gapY` (prova pura in
// `riordino-core.test.ts`). Qui si prova l'INTEGRAZIONE: `misuraGeometria` (useDragRiordino.ts)
// deve leggere il track da `getComputedStyle(grid).gridAutoRows` e usarlo per `pitchY`. jsdom non
// fa layout reale (i rect sono zeri di default — v. commento in testa al file): qui si mockano
// `getBoundingClientRect`/`getComputedStyle` per rendere l'aritmetica non degenere, l'UNICO modo
// di dimostrare il bersaglio corretto su una riga ≥2 (dove il difetto si manifesta).
describe('useDragRiordino — D10 (FIX-F): il passo di riga è il TRACK, non cellaH+gapY', () => {
  // Griglia 3×3 (9 cassette): cella 100×100, gap 20, track (--track risolto a runtime) 250px —
  // celle più basse del track, come nella parete reale con `align-items:start`.
  const PARETE_9: CassettaParete[] = Array.from({ length: 9 }, (_, i) => ({
    id: String.fromCharCode(97 + i), // a..i
    nome: `C${i + 1}`,
    colore: 'grigia',
    posizione: i,
    lavoro: null,
  }))

  it('sollevando la prima cassetta e trascinando al centro della riga 2 (secondo il track vero), il bersaglio è la 4ª cassetta — non la 7ª (bersaglio della formula sbagliata cellaH+gapY, una riga intera più giù)', async () => {
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const vuoto = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} }
      if (this.classList?.contains('ds-parete-grid')) {
        // width tale che (340+20)/(100+20) = 3 colonne.
        return { ...vuoto, width: 340, height: 460, right: 340, bottom: 460 } as DOMRect
      }
      if (this.getAttribute('data-cassetta-id') === 'a') {
        // La prima cassetta ('a', celle[0] nel DOM) è sia "primo" (misura cellaW/cellaH) sia
        // l'origine sollevata: stesso rect, un solo mock basta.
        return { ...vuoto, width: 100, height: 100, right: 100, bottom: 100 } as DOMRect
      }
      return vuoto as DOMRect
    })
    const origGetComputedStyle = window.getComputedStyle
    const computedSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      if ((el as HTMLElement).classList?.contains?.('ds-parete-grid')) {
        return { columnGap: '20px', rowGap: '20px', gridAutoRows: '250px' } as CSSStyleDeclaration
      }
      return origGetComputedStyle(el, pseudo)
    })

    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)

    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      const onRefresh = vi.fn()
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh, parete: PARETE_9 }))

      sollevaC('a', PARETE_9, { clientX: 50, clientY: 50 }) // centro della cella 'a' (0,0)-(100,100)
      muoviWindow(50, 300) // centro riga2/colonna0 SECONDO IL TRACK vero: pitchY = 250 + gapY(20) = 270 → 270·1+50 ≈ 300

      // Il ricalcolo di riga avviene nel loop rAF (`frame()`), non nei listener sincroni sopra: qui
      // lo si fa girare A COMANDO (un frame basta — il punto è già fermo a (50,300) da `muoviWindow`,
      // niente auto-scroll da inseguire: v. commento sopra `creaRafDeterministico`), invece di
      // aspettare un tick reale di jsdom.
      await act(async () => {
        rafMock.flush(16)
      })
      await act(async () => {
        rilasciaWindow(50, 300)
      })
      await act(async () => {})

      expect(inviaOrdine).toHaveBeenCalledTimes(1)
      const ordine = inviaOrdine.mock.calls[0][0] as string[]
      // Bersaglio CORRETTO (pitchY dal track, 270): 'a' si inserisce all'indice 3 →
      // ['b','c','d','a','e','f','g','h','i']. La formula sbagliata (cellaH+gapY=120) l'avrebbe
      // messa all'indice 6 → ['b','c','d','e','f','g','h','a','i'] — una riga intera più giù.
      expect(ordine).toEqual(['b', 'c', 'd', 'a', 'e', 'f', 'g', 'h', 'i'])
    } finally {
      rectSpy.mockRestore()
      computedSpy.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})
