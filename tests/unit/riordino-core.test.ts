// Task 13 — core PURO del riordino (§6 della ricerca `.superpowers/sdd/ricerca-drag-touch.md`):
// le funzioni senza DOM, testate esaustivamente in vitest. Qui NON si prova nulla del guscio DOM
// (preventDefault reale, scroll, rect, ghost): quello è device/Playwright (§6.4). Qui vivono i bug
// della griglia che va a capo (hit-testing aritmetico closestCenter), l'arrayMove, la rampa
// dell'auto-scroll e la riconciliazione drag-vs-realtime.
import { describe, expect, it, vi } from 'vitest'
import {
  type Geometria,
  calcolaNuovoOrdine,
  creaScroller,
  indiceDaPunto,
  indiceRettangoloDaPunto,
  riconcilia,
  velocitaAutoScroll,
} from '@/components/features/cassette/riordino-core'

// Griglia uniforme di riferimento: 3 colonne, celle 100×100, gap 20, origine (0,0). `pitchY`
// coincide qui con `cellaH + gapY` (120): i test sotto NON toccano il difetto D10 (celle che
// riempiono la riga, track = cella + gap), servono a coprire il resto della semantica.
const geo: Geometria = {
  gridLeft: 0,
  gridTop: 0,
  cellaW: 100,
  cellaH: 100,
  gapX: 20,
  gapY: 20,
  colonne: 3,
  pitchY: 120,
  scrollDelta: 0,
}

describe('indiceDaPunto — hit-testing aritmetico O(1), semantica closestCenter (§1, §6)', () => {
  it('il centro della prima cella → indice 0', () => {
    expect(indiceDaPunto({ x: 50, y: 50 }, geo, 7)).toBe(0)
  })
  it('il centro della seconda colonna → indice 1 (pitch = cella + gap = 120)', () => {
    expect(indiceDaPunto({ x: 170, y: 50 }, geo, 7)).toBe(1)
  })
  it('scende di una riga: centro della cella sotto la prima → indice 3 (riga·colonne)', () => {
    expect(indiceDaPunto({ x: 50, y: 170 }, geo, 7)).toBe(3)
  })
  it('oltre l’ultima cella → clamp a n-1 (mai fuori dall’array)', () => {
    expect(indiceDaPunto({ x: 290, y: 290 }, geo, 7)).toBe(6)
  })
  it('sopra/a sinistra dell’origine → clamp a 0 (mai negativo)', () => {
    expect(indiceDaPunto({ x: -100, y: -100 }, geo, 7)).toBe(0)
  })
  // D10 (FIX-F, QA device #1, verbale 2026-07-24) — root cause: `.ds-parete-grid` (ds-v3.css
  // ~624/664) ha `grid-auto-rows: var(--track)` + `align-items:start`: le celle NON riempiono la
  // riga, il passo di riga VERO è il track, non `cellaH + gapY`. Qui `pitchY` (250) è
  // DELIBERATAMENTE diverso da `cellaH + gapY` (120) — celle più basse del track, come nella
  // parete reale — per dimostrare che `indiceDaPunto` usa `pitchY`, non l'altezza della cella.
  const geoTrack: Geometria = { ...geo, pitchY: 250 }

  it('D10: il passo di riga è pitchY (track), non cellaH+gapY — riga 2 col track più alto delle celle', () => {
    // Centro della cella di riga 2 (0-based riga 1) colonna 0 SECONDO IL TRACK VERO (250): relY =
    // 250·1 + cellaH/2 = 300. Con la formula sbagliata (cellaH+gapY=120) l'indice cadrebbe alla
    // riga 2 (0-based), cioè indice 6 invece di 3 — esattamente lo sfalsamento del difetto.
    expect(indiceDaPunto({ x: 50, y: 300 }, geoTrack, 7)).toBe(3)
  })

  it('D10: stesso punto, ma con pitchY = cellaH+gapY (griglia "vecchia" senza track) → riga più sotto', () => {
    // Controprova: con lo STESSO punto (50,300) ma pitchY=120 (comportamento pre-fix, celle che
    // riempiono la riga), il bersaglio è un'ALTRA cella (indice 6) — la differenza è
    // interamente dovuta a pitchY, non ad altro nella funzione.
    expect(indiceDaPunto({ x: 50, y: 300 }, geo, 7)).toBe(6)
  })

  it('compensa lo scroll: un punto viewport fermo con scrollDelta=120 cade una riga più giù', () => {
    // Stesso punto viewport (50,50) del primo caso, ma il documento è sceso di una riga intera:
    // il bersaglio deve seguire il muro, non il dito immobile.
    expect(indiceDaPunto({ x: 50, y: 50 }, { ...geo, scrollDelta: 120 }, 7)).toBe(3)
  })
})

// H3 v2 — Riordino «aggancio al dito» (opzione 1 RATIFICATA da Francesco, decisione 0c37f25,
// `docs/design/decisions/2026-07-25-wave-h-scelte.md` §H3). Root cause PROVATA nell'indagine
// `.superpowers/sdd/h3-indagine-report.md`: `indiceDaPunto` (sopra) è aritmeticamente CORRETTO
// (closestCenter sul TRACK), ma il TRIGGER attuale confronta il centro del ghost col punto medio
// fra due centri-track — punto che, con `align-items:start` e track >> cassetta (commit 21a0b17:
// cassetta fissa 132px per tutte), cade nella maglia VUOTA sotto la cassetta, non su una
// cassetta vera. La decisione ratificata cambia il GATE: si riordina SOLO quando il PUNTO DEL
// DITO entra nel RETTANGOLO REALE di un'ALTRA cassetta — `indiceDaPunto` resta la mappa
// punto→cella (invariata, vedi describe sopra), `indiceRettangoloDaPunto` è il nuovo cancello.
//
// Geometria di riferimento QUI = quella REALE del worktree, non quella sintetica di `geo` sopra:
// `.ds-parete-grid` ha `grid-auto-rows: var(--track)` (`--track = --passo-maglia · 5`), a mobile
// 390 `--passo-maglia` risolve a 40px ⇒ `pitchY = 200`; `row-gap: 0` (ds-v3.css:855/895); la
// cassetta (commit 21a0b17, «cassetta B») è FISSA a 132px per tutte ⇒ 68px di maglia vuota sotto
// ogni cassetta — esattamente la geometria che ha prodotto il riordino "fantasma".
const geoRete: Geometria = {
  gridLeft: 0,
  gridTop: 0,
  cellaW: 100,
  cellaH: 132,
  gapX: 20,
  gapY: 0,
  colonne: 3,
  pitchY: 200,
  scrollDelta: 0,
}

describe('indiceRettangoloDaPunto — hit-test GEOMETRICO: dentro il RETTANGOLO reale, mai nel vuoto (H3 v2, decisione 0c37f25)', () => {
  // Gruppo 1 (brief §Test 1) — caso Francesco: qualunque punto DENTRO la cassetta d'origine,
  // qualunque sia la presa (alta/bassa), risolve al SUO STESSO indice. Morto per costruzione:
  // qui non esiste un "centro del ghost" da inseguire, solo il rettangolo vero della cella —
  // niente offset presa↔centro che possa far scattare un bersaglio prima del tempo.
  it('presa in ALTO sulla cassetta (bordo superiore, y=2 dentro la cella) → indice della cella stessa (0)', () => {
    expect(indiceRettangoloDaPunto({ x: 50, y: 2 }, geoRete, 6)).toBe(0)
  })
  it('presa in BASSO sulla cassetta (y=130, appena sopra il bordo) → indice della cella stessa (0)', () => {
    expect(indiceRettangoloDaPunto({ x: 50, y: 130 }, geoRete, 6)).toBe(0)
  })

  // Gruppo 2 (brief §Test 2) — la maglia VUOTA sotto la cassetta (il VECCHIO punto di scatto,
  // che cadeva nel punto medio fra i due centri-track — v. guardia di regressione sotto) NON è
  // area di scatto: nessun indice, per costruzione del rettangolo (mai il track intero).
  it('nel vuoto di maglia sotto la propria cassetta (y=166, fra cellaH=132 e pitchY=200) → null (nessun bersaglio)', () => {
    expect(indiceRettangoloDaPunto({ x: 50, y: 166 }, geoRete, 6)).toBeNull()
  })
  it('appena sotto la cassetta (y=133, 1px dentro il vuoto) → null', () => {
    expect(indiceRettangoloDaPunto({ x: 50, y: 133 }, geoRete, 6)).toBeNull()
  })

  // Gruppo 3 (brief §Test 3) — dentro il rettangolo di un'ALTRA cassetta: il bersaglio è
  // l'indice di QUELLA cassetta. Stessa riga (colonna diversa) e riga diversa.
  it('dentro il rettangolo della cassetta della colonna accanto, stessa riga → suo indice (1)', () => {
    expect(indiceRettangoloDaPunto({ x: 170, y: 50 }, geoRete, 6)).toBe(1)
  })
  it('dentro il rettangolo della cassetta della riga sotto → suo indice (3 = riga1·colonne)', () => {
    expect(indiceRettangoloDaPunto({ x: 50, y: 250 }, geoRete, 6)).toBe(3)
  })

  // Gruppo 5 (brief §Test 5) — scroll durante il drag: stessa convenzione `scrollDelta` di
  // `indiceDaPunto` (compensazione additiva su `relY`). Un punto che senza scroll cade nel
  // vuoto, con lo scroll giusto cade dentro la cassetta sotto.
  it('compensa lo scroll: un punto nel vuoto (senza scroll) entra nella cassetta sotto quando il muro è sceso di scrollDelta', () => {
    // (50,166) è nel vuoto (§gruppo 2); con scrollDelta=68 → relY=234, dentro [200,332] (riga1).
    expect(indiceRettangoloDaPunto({ x: 50, y: 166 }, { ...geoRete, scrollDelta: 68 }, 6)).toBe(3)
  })

  // Gruppo 6 (brief §Test 6) — GUARDIA DI REGRESSIONE sul VECCHIO trigger (indagine v2 §2,
  // decisione 0c37f25): il flip cadeva al punto medio fra i due CENTRI CASSETTA — qui
  // (centro riga0 = cellaH/2 = 66, centro riga1 = pitchY + cellaH/2 = 266) → midpoint = 166,
  // che è la maglia VUOTA (§gruppo 2). `indiceDaPunto` (closestCenter sul track, MAI cambiato —
  // FIX-F resta corretto, v. describe sopra) risolve GIÀ quel punto alla riga sotto: è
  // esattamente il difetto provato nell'indagine, riprodotto qui in forma pura.
  // `indiceRettangoloDaPunto` sullo STESSO punto deve restare `null`: la prova che è cambiato
  // SOLO il gate d'ingresso, non l'aritmetica di riga/colonna sottostante (che resta condivisa).
  it('REGRESSIONE (vecchio trigger): il punto medio fra i centri (y=166) fa scattare indiceDaPunto (closestCenter) alla riga sotto, ma indiceRettangoloDaPunto lo rifiuta (vuoto, non è un\'altra cassetta)', () => {
    expect(indiceDaPunto({ x: 50, y: 166 }, geoRete, 6)).toBe(3) // vecchia mappa, invariata: non è più il gate
    expect(indiceRettangoloDaPunto({ x: 50, y: 166 }, geoRete, 6)).toBeNull() // nuovo gate: rifiuta
  })

  // Guardie aggiuntive (fuori dai 6 gruppi, ma necessarie per un hit-test onesto: mai un indice
  // "clampato" che finga un bersaglio inesistente — a differenza di `indiceDaPunto`, che clampa
  // sempre a `[0, n-1]`, qui fuori da ogni rettangolo è "nessun ingresso").
  it('fuori dalla griglia (colonna oltre l’ultima) → null, mai clampato', () => {
    expect(indiceRettangoloDaPunto({ x: 400, y: 50 }, geoRete, 6)).toBeNull()
  })
  it('punto sopra/a sinistra dell’origine → null, mai negativo/clampato', () => {
    expect(indiceRettangoloDaPunto({ x: -50, y: -50 }, geoRete, 6)).toBeNull()
  })
  it('dentro un rettangolo geometrico che non ha una cassetta vera (riga parziale, n=5) → null', () => {
    // Indice geometrico 5 (riga1, colonna2) non esiste con solo 5 cassette (0..4): non è un
    // bersaglio valido, anche se il rettangolo "ci sarebbe" nella griglia.
    expect(indiceRettangoloDaPunto({ x: 260, y: 250 }, geoRete, 5)).toBeNull()
  })
})

describe('calcolaNuovoOrdine — arrayMove per INSERIMENTO, mai scambio (§1)', () => {
  it('sposta un elemento in avanti facendo scalare gli altri (ordine relativo preservato)', () => {
    expect(calcolaNuovoOrdine(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })
  it('sposta un elemento all’indietro', () => {
    expect(calcolaNuovoOrdine(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c'])
  })
  it('da === a → nessun cambiamento', () => {
    expect(calcolaNuovoOrdine(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c'])
  })
  it('NON è uno scambio: spostare a→c non scambia a e c, li fa scorrere', () => {
    // Uno swap darebbe ['c','b','a','d']; l'inserimento dà ['b','c','a','d'].
    expect(calcolaNuovoOrdine(['a', 'b', 'c', 'd'], 0, 2)).not.toEqual(['c', 'b', 'a', 'd'])
  })
})

describe('velocitaAutoScroll — rampa spaziale+temporale lineare (§2.4.5)', () => {
  it('fuori dalla fascia → 0 (non ingaggia)', () => {
    expect(velocitaAutoScroll(16, 200, 180, 1000)).toBe(0)
  })
  it('al bordo, a regime → tetto di 15 px/frame (≈900 px/s a 60Hz)', () => {
    expect(velocitaAutoScroll(16, 0, 180, 1000)).toBe(15)
  })
  it('la rampa temporale dimezza a metà dei 400 ms (azzera il «botto» iniziale)', () => {
    expect(velocitaAutoScroll(16, 0, 180, 200)).toBeCloseTo(7.5, 5)
  })
  it('il tetto per frame è min(ceil(0.9·dt), 15): a dt grande resta 15', () => {
    expect(velocitaAutoScroll(100, 0, 180, 1000)).toBe(15)
  })
  it('appena dentro la fascia e appena ingaggiato → almeno 1 px (progresso garantito)', () => {
    expect(velocitaAutoScroll(16, 170, 180, 0)).toBe(1)
  })
})

describe('riconcilia — drag-vs-realtime al drop (§6, design derivato)', () => {
  it('inserisce l’id trascinato DOPO il suo predecessore locale sulla lista del server', () => {
    expect(riconcilia(['a', 'b', 'c', 'd'], 'd', 'a')).toEqual(['a', 'd', 'b', 'c'])
  })
  it('predecessore null → l’id trascinato va in testa', () => {
    expect(riconcilia(['a', 'b', 'c'], 'c', null)).toEqual(['c', 'a', 'b'])
  })
  it('un id nuovo comparso sul server nel frattempo resta dove lo mette il server', () => {
    // 'x' è arrivato dal realtime durante il drag: non lo conoscevamo, va rispettato.
    expect(riconcilia(['a', 'x', 'b', 'c'], 'c', 'a')).toEqual(['a', 'c', 'x', 'b'])
  })
  it('se l’id trascinato è sparito dal server (buttato via altrove) → lo si scarta, niente crash', () => {
    expect(riconcilia(['a', 'b'], 'c', 'a')).toEqual(['a', 'b'])
  })
  it('se il predecessore è sparito dal server → l’id trascinato va in testa (fallback onesto)', () => {
    expect(riconcilia(['a', 'b', 'c'], 'c', 'z')).toEqual(['c', 'a', 'b'])
  })
})

describe('creaScroller (spec redesign §3.1, riserva ARCH R1)', () => {
  it('con elemento: pos/max/vista leggono scrollTop/scrollHeight/clientHeight, by muta scrollTop, sogliaAlta è il top del rect', () => {
    const el = {
      scrollTop: 100, scrollHeight: 1000, clientHeight: 400,
      getBoundingClientRect: () => ({ top: 80 }),
    } as unknown as HTMLElement
    const s = creaScroller(el)
    expect(s.pos()).toBe(100)
    expect(s.max()).toBe(600)          // scrollHeight - clientHeight
    expect(s.altezzaVista()).toBe(400)
    expect(s.sogliaAlta()).toBe(80)
    s.by(50)
    expect(s.pos()).toBe(150)
  })

  it('senza elemento (null): delega a window — pos=scrollY, vista=innerHeight, sogliaAlta=0', () => {
    // jsdom: window.scrollY/innerHeight esistono; scrollBy va stubbato
    const spy = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    const s = creaScroller(null)
    expect(s.sogliaAlta()).toBe(0)
    expect(s.altezzaVista()).toBe(window.innerHeight)
    s.by(10)
    expect(spy).toHaveBeenCalledWith(0, 10)
    spy.mockRestore()
  })
})
