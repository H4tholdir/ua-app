// Capitolo H4c — Piede C2 «il tasto si ritira» (decisione ratificata 0c37f25,
// docs/design/decisions/2026-07-25-wave-h-scelte.md §H4; coreografia dalla demo animata
// ebf4edb, docs/design/mockups/2026-07-25-piede-demo-c1-vs-c2.html, ramo `c2` di `render()`).
//
// Funzioni PURE (nessun DOM, nessun React) che traducono il progress dello swipe home↔parete
// (0 = stanza Pile, piede pieno; 1 = stanza Parete, piede assente) nello stato visivo del
// piede. Stesso pattern di `riordino-core.ts` accanto a `useDragRiordino.ts`: il guscio DOM
// (listener di scroll/touch su `.ua-stanze-viewport` in StanzePager.tsx, le motion value e la
// molla di assestamento in HomeV3.tsx) resta fuori da qui — sottile per costruzione, testato
// coi soli casi che jsdom non regge (v. i rispettivi file `.tsx`); qui la logica pura, testata
// in isolamento.
//
// Perché queste formule e non altre: sono la TRADUZIONE VERBATIM del ramo `c2` di `render(ph,
// p)` nella demo (righe 339-347) — quella demo È la coreografia approvata da Francesco, non
// un riferimento generico:
//   ph.eti.style.opacity   = String(clamp01(1 - p / 0.30))
//   ph.tasto.style.transform = `scale(${clamp01(1 - p)})`
//   ph.tasto.style.opacity   = String(clamp01(1 - Math.max(0, p - 0.78) / 0.22))
// cioè: l'etichetta sfuma nei primi 30 punti di progress (0→0.30, sparisce ben prima che il
// tondo abbia iniziato a rimpicciolirsi molto); il tondo si ritrae in scala 1:1 col progress
// per l'INTERO gesto (0→1, «restando al suo posto» — nessuna traslazione, solo scala); la sua
// OPACITÀ invece resta piena finché il tondo non è quasi scomparso, sfumando solo nell'ultimo
// tratto (0.78→1) — un cross-dissolve verso il muro delle cassette, non uno scatto secco a
// scala quasi-zero (che apparirebbe come uno "sparire di taglio" indesiderato).

/** Clampa in [0, 1] — usata sia per il progress in ingresso sia per ogni output derivato. */
export function clamp01(valore: number): number {
  return Math.min(1, Math.max(0, valore))
}

/** Il progress dello swipe (0 = Pile, 1 = Parete) dalla posizione di scroll nativa del pager
 *  (`.ua-stanze-viewport`, `scroll-snap-type: x mandatory` — lo swipe è scroll NATIVO, mai un
 *  carosello simulato, v. commento in testa a StanzePager.tsx). `larghezzaViewport` a 0 (mai
 *  misurato, es. primissimo layout) → 0 anziché NaN/Infinity: il piede resta pieno per
 *  difetto, mai un valore spurio che lo facesse sparire senza un gesto reale. */
export function progressoDaScroll(scrollLeft: number, larghezzaViewport: number): number {
  if (!larghezzaViewport) return 0
  return clamp01(scrollLeft / larghezzaViewport)
}

export type StilePiedeSwipe = {
  /** Opacità dell'etichetta «Nuovo lavoro» sotto il tondo. */
  etichettaOpacita: number
  /** Scala del tondo (TastoPiù) — 1 = intatto, 0 = scomparso. Mai una traslazione: il tondo
   *  «resta al suo posto» (decisione ratificata), si ritira su sé stesso. */
  tondoScala: number
  /** Opacità del tondo — resta 1 quasi fino alla fine (v. sopra), poi il cross-dissolve. */
  tondoOpacita: number
}

/** Mappa il progress del gesto allo stile del piede (C2, «il tasto si ritira»).
 *
 *  `reduced` (prefers-reduced-motion, richiesta esplicita del brief H4c): niente scala e
 *  niente fasi separate — «dissolvenza semplice», un solo fattore di opacità condiviso da
 *  tondo ed etichetta, 1:1 col progress (stesso principio del fallback dichiarato dalla demo
 *  per il proprio toggle «Movimento ridotto»: nessun viaggio, solo un crossfade). */
export function mappaPiedeSwipe(progress: number, reduced: boolean): StilePiedeSwipe {
  const p = clamp01(progress)
  if (reduced) {
    const opacita = clamp01(1 - p)
    return { etichettaOpacita: opacita, tondoScala: 1, tondoOpacita: opacita }
  }
  return {
    etichettaOpacita: clamp01(1 - p / 0.3),
    tondoScala: clamp01(1 - p),
    tondoOpacita: clamp01(1 - Math.max(0, p - 0.78) / 0.22),
  }
}

/** Al rilascio a metà gesto, il bersaglio dell'assestamento (`molla.press`, in HomeV3.tsx) è lo
 *  stato più vicino: sotto metà torna pieno (0), sopra metà prosegue verso l'assenza (1) —
 *  stessa soglia "midpoint" con cui uno scroll-snap mandatory a due pannelli di pari larghezza
 *  decide dove agganciare in assenza di velocità di rilascio significativa (v. nota nel report
 *  H4c sulla discriminante da verificare in QA browser: un flick veloce può far agganciare lo
 *  scroll-snap nativo nella direzione opposta a questa stima — il pager resta comunque
 *  l'autorità finale via `onStanzaChange`/`stanzaAttiva`, questa è solo la stima immediata al
 *  sollevamento del dito, prima che l'IO/lo snap abbiano deciso). */
export function bersaglioRilascio(progress: number): 0 | 1 {
  return progress > 0.5 ? 1 : 0
}
