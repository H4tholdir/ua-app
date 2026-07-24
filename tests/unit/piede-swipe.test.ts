// Capitolo H4c — Piede C2 «il tasto si ritira» (decisione 0c37f25, demo animata ebf4edb). Core
// PURO (nessun DOM/React) testato in isolamento, stesso pattern di riordino-core.test.ts: qui
// vive la logica di mappatura progress→stile che i test di StanzePager.tsx/HomeV3.tsx (guscio
// DOM, jsdom-limited) NON devono ri-verificare — vedi H4c-piede-brief.md, gruppo di test 1/2/3.
import { describe, expect, it } from 'vitest'
import {
  bersaglioRilascio,
  bersaglioStanza,
  clamp01,
  mappaPiedeSwipe,
  piedeIngombro,
  piedeSenzaIngombro,
  progressoDaScroll,
} from '@/components/features/home/piede-swipe'

describe('clamp01', () => {
  it('clampa sotto zero e sopra uno', () => {
    expect(clamp01(-0.4)).toBe(0)
    expect(clamp01(1.7)).toBe(1)
    expect(clamp01(0.42)).toBe(0.42)
  })
})

describe('progressoDaScroll — dalla posizione di scroll nativa del pager', () => {
  it('scrollLeft 0 → progress 0 (stanza Pile)', () => {
    expect(progressoDaScroll(0, 390)).toBe(0)
  })
  it('scrollLeft = larghezza → progress 1 (stanza Parete)', () => {
    expect(progressoDaScroll(390, 390)).toBe(1)
  })
  it('a metà gesto → 0.5', () => {
    expect(progressoDaScroll(195, 390)).toBe(0.5)
  })
  it('clampa oltre 1 (overscroll/rimbalzo nativo)', () => {
    expect(progressoDaScroll(420, 390)).toBe(1)
  })
  it('larghezza 0 (mai misurata) → 0, mai NaN/Infinity', () => {
    expect(progressoDaScroll(50, 0)).toBe(0)
  })
})

// Gruppo di test 1 del brief — «progress del gesto → fasi C2 nell'ordine (etichetta prima, il
// tondo poi)»: verbatim dal ramo c2 di render() nella demo (righe 339-347).
describe('mappaPiedeSwipe — coreografia C2, ordine delle fasi', () => {
  it('a riposo (progress 0): piede pieno su tutti e tre gli assi', () => {
    expect(mappaPiedeSwipe(0, false)).toEqual({ etichettaOpacita: 1, tondoScala: 1, tondoOpacita: 1 })
  })

  it('l\'etichetta è già sparita del tutto a 0.30 (soglia demo), il tondo NO', () => {
    const stile = mappaPiedeSwipe(0.3, false)
    expect(stile.etichettaOpacita).toBe(0)
    expect(stile.tondoScala).toBeCloseTo(0.7, 5)
    expect(stile.tondoOpacita).toBe(1) // il tondo resta pieno finché non si supera 0.78
  })

  it('a metà gesto (0.5): l\'etichetta è già invisibile, il tondo è a metà scala e ancora opaco', () => {
    const stile = mappaPiedeSwipe(0.5, false)
    expect(stile.etichettaOpacita).toBe(0)
    expect(stile.tondoScala).toBeCloseTo(0.5, 5)
    expect(stile.tondoOpacita).toBe(1)
  })

  it('il tondo comincia a sfumare SOLO dopo 0.78 (fase 2b, cross-dissolve verso il muro)', () => {
    expect(mappaPiedeSwipe(0.78, false).tondoOpacita).toBe(1)
    expect(mappaPiedeSwipe(0.89, false).tondoOpacita).toBeCloseTo(0.5, 5)
  })

  it('a fine gesto (progress 1): il tondo è scomparso (scala 0, opacità ~0)', () => {
    const stile = mappaPiedeSwipe(1, false)
    expect(stile.etichettaOpacita).toBe(0)
    expect(stile.tondoScala).toBe(0)
    // toBeCloseTo, non toBe: 1 - Math.max(0, 1-0.78)/0.22 non tocca esattamente zero per
    // arrotondamento IEEE 754 (0.21999999999999997/0.22 ≠ 1 esatto) — stessa formula
    // verbatim della demo (righe 339-347), lo scarto (~1e-16) è ben sotto qualunque soglia
    // percepibile e non giustifica deviare dalla formula di riferimento per "arrotondarla".
    expect(stile.tondoOpacita).toBeCloseTo(0, 10)
  })

  it('l\'ordine delle fasi è rispettato per costruzione: l\'etichetta è sempre sparita PRIMA che il tondo abbia perso metà scala', () => {
    for (let p = 0.31; p <= 1; p += 0.05) {
      const stile = mappaPiedeSwipe(p, false)
      expect(stile.etichettaOpacita).toBe(0)
    }
  })

  it('clampa un progress fuori range [0,1] (difesa, mai un valore spurio da un scroll anomalo)', () => {
    expect(mappaPiedeSwipe(-0.2, false)).toEqual(mappaPiedeSwipe(0, false))
    expect(mappaPiedeSwipe(1.3, false)).toEqual(mappaPiedeSwipe(1, false))
  })
})

// Gruppo di test 3 del brief — reduced-motion: nessuna scala, solo opacità (dissolvenza
// semplice, come dichiara il fallback della demo per il proprio toggle «Movimento ridotto»).
describe('mappaPiedeSwipe — prefers-reduced-motion: dissolvenza semplice, mai scala', () => {
  it('la scala resta SEMPRE 1, a qualunque progress', () => {
    for (const p of [0, 0.1, 0.3, 0.5, 0.78, 0.9, 1]) {
      expect(mappaPiedeSwipe(p, true).tondoScala).toBe(1)
    }
  })

  it('tondo ed etichetta condividono la STESSA opacità (un solo crossfade, non due fasi)', () => {
    for (const p of [0, 0.2, 0.5, 0.8, 1]) {
      const stile = mappaPiedeSwipe(p, true)
      expect(stile.tondoOpacita).toBe(stile.etichettaOpacita)
    }
  })

  it('l\'opacità è 1:1 col progress (nessuna soglia 0.30/0.78 — quelle sono SOLO del ramo non-reduced)', () => {
    expect(mappaPiedeSwipe(0.3, true).etichettaOpacita).toBeCloseTo(0.7, 5)
    expect(mappaPiedeSwipe(0.78, true).etichettaOpacita).toBeCloseTo(0.22, 5)
  })
})

// Gruppo di test 2 del brief — il bersaglio dell'assestamento al rilascio a metà gesto.
describe('bersaglioRilascio — dove si assesta la molla.press al rilascio', () => {
  it('sotto metà gesto → torna pieno (0)', () => {
    expect(bersaglioRilascio(0.1)).toBe(0)
    expect(bersaglioRilascio(0.49)).toBe(0)
  })
  it('sopra metà gesto → prosegue verso l\'assenza (1)', () => {
    expect(bersaglioRilascio(0.51)).toBe(1)
    expect(bersaglioRilascio(0.9)).toBe(1)
  })
  it('esattamente a metà (0.5): non oltre la soglia → torna pieno (0), per costruzione ">"', () => {
    expect(bersaglioRilascio(0.5)).toBe(0)
  })
})

// FIX ri-collaudo #4 (verbale 2026-07-24, APPEND 25/07 sera, difetti a+b) — riconciliazione:
// il valore di riposo che la stanza ATTIVA (autorità finale, mai la sola stima al rilascio)
// impone a `progressoSwipe`.
describe('bersaglioStanza — il valore di riposo che la stanza attiva impone (autorità finale)', () => {
  it("stanza 'pile' → 0 (piede pieno)", () => {
    expect(bersaglioStanza('pile')).toBe(0)
  })
  it("stanza 'parete' → 1 (piede assente)", () => {
    expect(bersaglioStanza('parete')).toBe(1)
  })
})

// FIX ri-collaudo #4, difetto (a) — «blocco panna che copre la pagina»: il contenitore .foot
// deve collassare (niente ingombro di layout) SOLO a riposo vero (progress 1), mai a metà
// coreografia (altrimenti riprodurrebbe un pop, lo stesso difetto (b)).
describe('piedeSenzaIngombro — collasso del contenitore SOLO a riposo vero (progress 1)', () => {
  it('a riposo su Pile (progress 0): NON collassato', () => {
    expect(piedeSenzaIngombro(0)).toBe(false)
  })
  it('a metà gesto (0.5): NON collassato', () => {
    expect(piedeSenzaIngombro(0.5)).toBe(false)
  })
  it('appena sotto il traguardo (0.999): ANCORA NON collassato (niente pop anticipato)', () => {
    expect(piedeSenzaIngombro(0.999)).toBe(false)
  })
  it('esattamente a riposo su Parete (progress 1): collassato', () => {
    expect(piedeSenzaIngombro(1)).toBe(true)
  })
  it('oltre 1 (overscroll/rimbalzo nativo, clampato): collassato', () => {
    expect(piedeSenzaIngombro(1.4)).toBe(true)
  })
  it('sotto 0 (difesa): non collassato', () => {
    expect(piedeSenzaIngombro(-0.3)).toBe(false)
  })
})

// FIX ri-collaudo #4 (verifica device di Francesco, round 4) — «il quadrato panna che copre le
// cassette e POI scompare»: `piedeIngombro` è la curva CONTINUA (distinta dal collasso discreto
// di `piedeSenzaIngombro`, invariato) che chiude l'ingombro di layout DENTRO la coreografia,
// prima che il gesto finisca — il collasso discreto a progress===1 esatto resta come
// backstop/autorità sul riposo vero.
describe('piedeIngombro — curva continua che chiude l\'ingombro DENTRO la coreografia (round 4)', () => {
  it('a riposo su Pile (progress 0): ingombro pieno (1)', () => {
    expect(piedeIngombro(0)).toBe(1)
  })
  it('l\'ingombro resta pieno fino a 0.7 (nessun restringimento anticipato)', () => {
    expect(piedeIngombro(0.7)).toBe(1)
    expect(piedeIngombro(0.5)).toBe(1)
  })
  it('a metà della finestra di chiusura (0.8): ingombro a metà', () => {
    expect(piedeIngombro(0.8)).toBeCloseTo(0.5, 5)
  })
  it('chiude interamente per progress 0.9 (richiesta esplicita: "chiude a progress ~0.9")', () => {
    expect(piedeIngombro(0.9)).toBe(0)
  })
  it('resta a 0 per tutto il resto del gesto (0.9→1), non solo esattamente a 0.9', () => {
    expect(piedeIngombro(0.95)).toBe(0)
    expect(piedeIngombro(1)).toBe(0)
  })
  it('chiude PIÙ IN FRETTA della finestra di tondoOpacita (0.78-1): a 0.8 l\'ingombro è già a metà mentre il tondo ha appena cominciato a sfumare', () => {
    // Requisito del round 4: l'ingombro deve essere a ZERO ben prima che il contenuto (tondo)
    // abbia finito di sfumare — mai il contrario (un ingombro che sparisce DOPO il contenuto
    // riprodurrebbe lo stesso ritardo percepito, "il quadrato che poi scompare").
    const tondoOpacita = mappaPiedeSwipe(0.8, false).tondoOpacita
    expect(tondoOpacita).toBeCloseTo(0.909, 2) // il tondo ha appena iniziato la propria finestra (0.78-1)
    expect(piedeIngombro(0.8)).toBeCloseTo(0.5, 5) // l'ingombro è già a metà chiusura
    expect(piedeIngombro(0.8)).toBeLessThan(tondoOpacita)
  })
  it('clampa un progress fuori range [0,1] (difesa)', () => {
    expect(piedeIngombro(-0.3)).toBe(1)
    expect(piedeIngombro(1.4)).toBe(0)
  })
})
