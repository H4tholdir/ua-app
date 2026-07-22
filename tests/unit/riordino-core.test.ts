// Task 13 — core PURO del riordino (§6 della ricerca `.superpowers/sdd/ricerca-drag-touch.md`):
// le funzioni senza DOM, testate esaustivamente in vitest. Qui NON si prova nulla del guscio DOM
// (preventDefault reale, scroll, rect, ghost): quello è device/Playwright (§6.4). Qui vivono i bug
// della griglia che va a capo (hit-testing aritmetico closestCenter), l'arrayMove, la rampa
// dell'auto-scroll e la riconciliazione drag-vs-realtime.
import { describe, expect, it } from 'vitest'
import {
  type Geometria,
  calcolaNuovoOrdine,
  indiceDaPunto,
  riconcilia,
  velocitaAutoScroll,
} from '@/components/features/cassette/riordino-core'

// Griglia uniforme di riferimento: 3 colonne, celle 100×100, gap 20, origine (0,0).
const geo: Geometria = {
  gridLeft: 0,
  gridTop: 0,
  cellaW: 100,
  cellaH: 100,
  gapX: 20,
  gapY: 20,
  colonne: 3,
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
  it('compensa lo scroll: un punto viewport fermo con scrollDelta=120 cade una riga più giù', () => {
    // Stesso punto viewport (50,50) del primo caso, ma il documento è sceso di una riga intera:
    // il bersaglio deve seguire il muro, non il dito immobile.
    expect(indiceDaPunto({ x: 50, y: 50 }, { ...geo, scrollDelta: 120 }, 7)).toBe(3)
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
