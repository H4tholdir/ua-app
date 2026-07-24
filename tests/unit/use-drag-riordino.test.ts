// Task 13 — useDragRiordino: il GUSCIO DOM del drag. Qui si prova SOLO ciò che jsdom sa reggere
// (§6.3 della ricerca): la macchina a stati vista da fuori (sollevamento → sheet vs drop), il
// payload della POST e il rollback, le guardie. Ciò che jsdom NON sa (preventDefault reale,
// scroll, rect, FLIP, fluidità) è device/Playwright (§6.4, FASE 9) — nessun test qui finge di
// coprirlo. In jsdom i rect sono zeri: l'INDICE di caduta è degenere (clampato a 0), quindi non si
// asserisce MAI su quale ordine esatto venga POSTato — si asserisce sulla DECISIONE (sheet vs
// drop) e sul fatto che la POST parta e il refresh segua l'esito.
import React, { useRef } from 'react'
import type { RefObject } from 'react'
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
  /** H3 v2 (§Test 5, scroll durante il drag) — un contenitore scrollabile REALE (non `window`,
   *  che jsdom non lascia scrollare programmaticamente in modo pulito): il test muta
   *  `scrollerRef.current.scrollTop` a mano per simulare lo scroll a metà gesto. Assente →
   *  comportamento invariato di tutti i test esistenti (scroller = window). */
  scrollerRef?: RefObject<HTMLDivElement | null>
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
    scrollerRef: props.scrollerRef,
  })
  return React.createElement(
    'div',
    { ref: props.scrollerRef },
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
    // H3 v2 — l'ordine ottimistico VISTO da fuori (jsdom non anima nulla, ma la sequenza di
    // `setOrdineIds` è esattamente ciò che i 6 gruppi di test devono provare senza aspettare il
    // drop): join stabile, mai `undefined` a riposo (fallback allo snapshot iniziale).
    React.createElement('span', { 'data-testid': 'ordine' }, (drag.ordineIds ?? parete.map((c) => c.id)).join(',')),
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

// H3 v2 — Riordino «aggancio al dito» (opzione 1 RATIFICATA, decisione 0c37f25,
// `docs/design/decisions/2026-07-25-wave-h-scelte.md` §H3; indagine PROVATA
// `.superpowers/sdd/h3-indagine-report.md`). Qui si prova l'INTEGRAZIONE (wiring reale di
// `frame()` in `useDragRiordino.ts`): il bersaglio è il PUNTO DEL DITO (`puntoRef`), MAI più il
// centro del ghost, e il gate d'ingresso è `indiceRettangoloDaPunto` (riordino-core.ts) — dentro
// il rettangolo REALE di un'altra cassetta scatta, nel vuoto/sulla propria cassetta no. La
// matematica pura del gate è già provata esaustivamente in `riordino-core.test.ts`
// (`indiceRettangoloDaPunto`, incluso il gruppo 6 — guardia di regressione sul vecchio trigger
// centro-ghost, dimostrata lì confrontando `indiceDaPunto` vs `indiceRettangoloDaPunto` sullo
// STESSO punto). Qui si prova che l'hook USA quel gate col punto giusto (il dito, non il ghost).
//
// Geometria = quella REALE del worktree (v. `geoRete` in riordino-core.test.ts): 6 cassette, 3
// colonne × 2 righe, cella 100×132 (commit 21a0b17, cassetta B: altezza fissa per tutte), gap
// colonna 20, `grid-auto-rows` (track) 200, `row-gap:0` — 68px di maglia vuota sotto ogni
// cassetta, esattamente la geometria dell'indagine.
describe('useDragRiordino — H3 v2: il riordino aggancia al DITO, mai al centro del ghost (decisione 0c37f25)', () => {
  const PARETE_6: CassettaParete[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({
    id,
    nome: `C${i + 1}`,
    colore: 'grigia',
    posizione: i,
    lavoro: null,
  }))

  // Rettangoli reali (viewport), coerenti con `geoRete` di riordino-core.test.ts: 3 colonne
  // (pitchX = cellaW+gapX = 120), 2 righe (pitchY = track = 200), cassetta 100×132.
  const RETT: Record<string, { left: number; top: number; width: number; height: number }> = {
    a: { left: 0, top: 0, width: 100, height: 132 },
    b: { left: 120, top: 0, width: 100, height: 132 },
    c: { left: 240, top: 0, width: 100, height: 132 },
    d: { left: 0, top: 200, width: 100, height: 132 },
    e: { left: 120, top: 200, width: 100, height: 132 },
    f: { left: 240, top: 200, width: 100, height: 132 },
  }

  function mockGeometriaRete() {
    const vuoto = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} }
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList?.contains?.('ds-parete-grid')) {
        // (340+20)/(100+20) = 3 colonne, come nel fixture reale (6 cassette, 3×2).
        return { ...vuoto, width: 340, height: 400, right: 340, bottom: 400 } as DOMRect
      }
      const id = this.getAttribute?.('data-cassetta-id')
      const r = id ? RETT[id] : undefined
      if (r) {
        return { ...vuoto, left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height } as DOMRect
      }
      return vuoto as DOMRect
    })
    const origGetComputedStyle = window.getComputedStyle
    const computedSpy = vi.spyOn(window, 'getComputedStyle').mockImplementation((el: Element, pseudo?: string | null) => {
      if ((el as HTMLElement).classList?.contains?.('ds-parete-grid')) {
        return { columnGap: '20px', rowGap: '0px', gridAutoRows: '200px' } as CSSStyleDeclaration
      }
      return origGetComputedStyle(el, pseudo)
    })
    return {
      restore() {
        rectSpy.mockRestore()
        computedSpy.mockRestore()
      },
    }
  }

  function ordineVisto(): string {
    return screen.getByTestId('ordine').textContent ?? ''
  }

  // §Test 1 (brief) — caso Francesco: presa NON centrata (bordo alto della targa), dito fermo
  // dopo il lift → nessun riordino, qualunque sia la presa. Morto per costruzione: il bersaglio
  // è il rettangolo sotto il dito VERO, non un ghost-centro che "precede" la presa.
  it('Test 1 — presa in ALTO (bordo, y=6 nella cella), dito fermo dopo il lift → nessun riordino, per qualunque punto di presa', async () => {
    const { restore } = mockGeometriaRete()
    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)
    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      const onRefresh = vi.fn()
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh, parete: PARETE_6 }))

      // Presa in alto sulla targa (6px sotto il top della cassetta 'a', ben lontana dal centro
      // a y=66): col vecchio bug il ghost-centro sarebbe nato 60px sotto il dito.
      sollevaC('a', PARETE_6, { clientX: 50, clientY: 6 })
      expect(ordineVisto()).toBe('a,b,c,d,e,f')
      await act(async () => {
        rafMock.flush(16)
      })
      expect(ordineVisto()).toBe('a,b,c,d,e,f') // dito fermo: nessun ricalcolo

      // Piccolo movimento, ma il dito resta DENTRO il rettangolo della cassetta 'a' (0..132).
      muoviWindow(50, 90)
      await act(async () => {
        rafMock.flush(32)
      })
      expect(ordineVisto()).toBe('a,b,c,d,e,f')

      await act(async () => {
        rilasciaWindow(50, 90)
      })
      await act(async () => {})
      expect(inviaOrdine).toHaveBeenCalledTimes(1)
      // Drop con l'ordine INVARIATO: la presa alta non ha mai fatto scattare nulla.
      expect(inviaOrdine.mock.calls[0][0]).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })

  // Test 1b — DISCRIMINANTE del caso Francesco (review pre-report): il Test 1 sopra (y=6→90) NON
  // distingue vecchio/nuovo codice, perché col vecchio ghost-centro (`centroOrigineRef` +
  // delta dal lift) quel movimento resta comunque in riga0 — serve un punto che superi la soglia
  // di riga SOLO nel calcolo del vecchio ghost-centro, mentre il dito è ancora fisicamente dentro
  // il rettangolo di origine. Con presa a y=6 (centro-cassetta a y=66, offset presa↔centro = 60px)
  // e movimento a y=125 (ANCORA dentro [0,132], il rettangolo di 'a'):
  //   VECCHIO calcolo (morto, qui solo in commento): centro.y = centroOrigine(66) + (125−6) = 185
  //     → `indiceDaPunto` (closestCenter sul track, pitchY=200): riga = round((185−66)/200) =
  //     round(0.595) = 1 → indice 3 → RIORDINO mentre il dito è ancora sopra la cassetta
  //     d'origine — esattamente «si auto-ordinano altre cassette… prima che io decida la
  //     posizione» (indagine v2 §4, caso B, RIPRODOTTO). Verificato con un `git stash` mirato
  //     sulla sola modifica di `frame()` in `useDragRiordino.ts`: con `centro`/`indiceDaPunto`
  //     ripristinati questo stesso assert falliva (RED), confermando che è la funzione da provare.
  //   NUOVO calcolo (qui, GREEN): il gate legge il PUNTO DEL DITO (125), non un centro derivato —
  //     `yInCella = 125 ≤ cellaH(132)` → dentro il rettangolo di 'a' stessa → indice invariato (0).
  it('Test 1b — discriminante: a y=125 (dentro il rettangolo di origine) il VECCHIO ghost-centro avrebbe già riordinato, il dito no', async () => {
    const { restore } = mockGeometriaRete()
    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)
    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh: vi.fn(), parete: PARETE_6 }))

      sollevaC('a', PARETE_6, { clientX: 50, clientY: 6 }) // presa in alto, offset presa↔centro = 60px
      muoviWindow(50, 125) // ANCORA dentro il rettangolo di 'a' (bottom=132)
      await act(async () => {
        rafMock.flush(16)
      })
      expect(ordineVisto()).toBe('a,b,c,d,e,f') // il dito è ancora su 'a': nessun riordino
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })

  // §Test 2 (brief) — la REGRESSIONE chiave: il dito nel vuoto di maglia sotto la propria
  // cassetta (il VECCHIO punto di scatto, closestCenter sul track) non riordina più.
  it('Test 2 — dito nel vuoto di maglia (y=166, il vecchio punto di scatto) → NESSUN riordino', async () => {
    const { restore } = mockGeometriaRete()
    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)
    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh: vi.fn(), parete: PARETE_6 }))

      sollevaC('a', PARETE_6, { clientX: 50, clientY: 66 }) // centro di 'a'
      muoviWindow(50, 166) // maglia vuota (fra cellaH=132 e pitchY=200) — il vecchio flip cadeva qui
      await act(async () => {
        rafMock.flush(16)
      })
      expect(ordineVisto()).toBe('a,b,c,d,e,f')
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })

  // §Test 3 (brief) — il dito ENTRA nel rettangolo di un'altra cassetta: riordino con l'indice
  // di quella cassetta. Stessa riga (colonna diversa) e riga diversa.
  it('Test 3a — dito entra nel rettangolo della cassetta della colonna accanto (stessa riga) → riordino su quell’indice', async () => {
    const { restore } = mockGeometriaRete()
    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)
    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh: vi.fn(), parete: PARETE_6 }))

      sollevaC('a', PARETE_6, { clientX: 50, clientY: 66 })
      muoviWindow(170, 66) // dentro il rettangolo di 'b' (riga0, colonna1)
      await act(async () => {
        rafMock.flush(16)
      })
      expect(ordineVisto()).toBe('b,a,c,d,e,f')
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })

  it('Test 3b — dito entra nel rettangolo della cassetta della riga sotto → riordino su quell’indice', async () => {
    const { restore } = mockGeometriaRete()
    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)
    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh: vi.fn(), parete: PARETE_6 }))

      sollevaC('a', PARETE_6, { clientX: 50, clientY: 66 })
      muoviWindow(50, 250) // dentro il rettangolo di 'd' (riga1, colonna0)
      await act(async () => {
        rafMock.flush(16)
      })
      expect(ordineVisto()).toBe('b,c,d,a,e,f')
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })

  // §Test 4 (brief) — percorso propria → vuoto → cassetta B → vuoto: il riordino mostrato resta
  // quello di B (one-way per posizione: non si ricalcola/annulla passando di nuovo sul vuoto).
  it('Test 4 — percorso propria→vuoto→B→vuoto: l’ordine resta quello di B, non si annulla nel vuoto', async () => {
    const { restore } = mockGeometriaRete()
    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)
    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh: vi.fn(), parete: PARETE_6 }))

      sollevaC('a', PARETE_6, { clientX: 50, clientY: 66 })

      muoviWindow(50, 166) // vuoto
      await act(async () => {
        rafMock.flush(16)
      })
      expect(ordineVisto()).toBe('a,b,c,d,e,f')

      muoviWindow(50, 250) // entra in 'd' (riga1, colonna0)
      await act(async () => {
        rafMock.flush(32)
      })
      expect(ordineVisto()).toBe('b,c,d,a,e,f')

      muoviWindow(50, 166) // torna nel vuoto: NON annulla il riordino su 'd'
      await act(async () => {
        rafMock.flush(48)
      })
      expect(ordineVisto()).toBe('b,c,d,a,e,f')

      await act(async () => {
        rilasciaWindow(50, 166)
      })
      await act(async () => {})
      expect(inviaOrdine.mock.calls[0][0]).toEqual(['b', 'c', 'd', 'a', 'e', 'f'])
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })

  // §Test 5 (brief) — scroll durante il drag: i rettangoli misurati al lift si correggono con lo
  // stesso `scrollDelta` già in uso (`scroller.pos() - scrollLiftRef`). Contenitore scrollabile
  // REALE passato come `scrollerRef` (non `window`, che jsdom non scrolla in modo pulito):
  // mutare `scrollTop` a metà gesto è la simulazione più fedele del muro che scorre sotto un
  // dito fermo in viewport.
  it('Test 5 — scroll ≠ 0 durante il drag: hit-test corretto dal `scrollDelta`', async () => {
    const { restore } = mockGeometriaRete()
    const rafMock = creaRafDeterministico()
    vi.stubGlobal('requestAnimationFrame', rafMock.raf)
    vi.stubGlobal('cancelAnimationFrame', rafMock.cancel)
    const scrollerRef = React.createRef<HTMLDivElement>()
    try {
      const inviaOrdine = vi.fn().mockResolvedValue(true)
      render(React.createElement(Harness, { onSheet: vi.fn(), inviaOrdine, onRefresh: vi.fn(), parete: PARETE_6, scrollerRef }))

      sollevaC('a', PARETE_6, { clientX: 50, clientY: 66 })
      muoviWindow(50, 166) // vuoto SENZA scroll (§Test 2)
      await act(async () => {
        rafMock.flush(16)
      })
      expect(ordineVisto()).toBe('a,b,c,d,e,f')

      // Il muro scrolla di 68px (il dito resta fermo in viewport a y=166): lo stesso punto ora
      // cade DENTRO il rettangolo di 'd' (riga1: relY = 166+68 = 234, dentro [200,332]).
      if (scrollerRef.current) scrollerRef.current.scrollTop = 68
      await act(async () => {
        rafMock.flush(32)
      })
      expect(ordineVisto()).toBe('b,c,d,a,e,f')
    } finally {
      restore()
      vi.unstubAllGlobals()
    }
  })
})
