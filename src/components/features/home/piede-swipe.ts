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

/** Al rilascio a metà gesto, il bersaglio PROVVISORIO dell'assestamento (`molla.press`, in
 *  HomeV3.tsx) è lo stato più vicino: sotto metà torna pieno (0), sopra metà prosegue verso
 *  l'assenza (1) — stessa soglia "midpoint" con cui uno scroll-snap mandatory a due pannelli di
 *  pari larghezza decide dove agganciare in assenza di velocità di rilascio significativa.
 *
 *  FIX ri-collaudo #4 (verbale 2026-07-24, APPEND 25/07 sera, difetti a+b): questa stima usa
 *  SOLO la posizione al momento del rilascio, mai la velocità del gesto — un flick veloce può
 *  far agganciare lo scroll-snap nativo nel verso OPPOSTO a questa stima (l'utente solleva il
 *  dito quando il progress è ancora, es., 0.1, ma il momentum nativo lo porta comunque fino a
 *  1). Per questo NON è più l'ultima parola: resta solo il punto di partenza dell'assestamento
 *  visivo, sempre sovrascrivibile da (1) un tick di scroll reale successivo (la molla si ferma,
 *  v. `onProgressoSwipe` in HomeV3.tsx — «insegue lo scroll reale anche dopo il rilascio») e
 *  sempre, in ultima istanza, da (2) `bersaglioStanza(stanzaAttiva)`, riconciliato ogni volta
 *  che il pager (IO/navigazione esplicita) cambia idea. Le due reti di sicurezza rendono
 *  IMPOSSIBILE uno stato di riposo divergente, a prescindere da quanto questa stima sbagli. */
export function bersaglioRilascio(progress: number): 0 | 1 {
  return progress > 0.5 ? 1 : 0
}

/** Il valore di riposo che la stanza ATTIVA impone a `progressoSwipe`: 0 su Pile (piede pieno),
 *  1 su Parete (piede assente). `stanzaAttiva` (HomeV3.tsx, sincronizzata da
 *  `StanzePager.onStanzaChange`) è l'AUTORITÀ finale su dove si trova davvero il pager — IO a
 *  soglia 0.6 o navigazione esplicita, mai la sola stima di `bersaglioRilascio` sopra. Usata
 *  dall'effect di riconciliazione in HomeV3.tsx per riportare SEMPRE `progressoSwipe` al valore
 *  giusto quando la stanza attiva cambia, fermando qualunque molla in volo che stesse (ancora)
 *  puntando altrove. */
export function bersaglioStanza(stanza: 'pile' | 'parete'): 0 | 1 {
  return stanza === 'parete' ? 1 : 0
}

/** A riposo (progress 1, cioè il tondo già a scala/opacità zero) il CONTENITORE del piede
 *  (`.foot`) non deve più occupare spazio di layout: FIX ri-collaudo #4, difetto (a) — «blocco
 *  panna che copre la pagina» delle cassette. `.foot` non dichiara alcuno sfondo proprio (v.
 *  HomeV3.tsx): il "blocco" che si vedeva non era un colore estraneo, ma lo sfondo della PAGINA
 *  che si intravedeva nello spazio che il box riservava comunque (margini/padding fissi),
 *  anche a contenuto già invisibile — H4c aveva reso il piede sempre MONTATO durante lo swipe,
 *  ma non aveva mai fatto collassare l'ingombro del box quando il gesto arriva davvero a riposo.
 *  Soglia `>= 1`, non un intorno: ogni valore-riposo che questo modulo produce (`bersaglioStanza`,
 *  lo scroll nativo clampato da `progressoDaScroll`) è ESATTAMENTE 0 o 1, mai un residuo
 *  intermedio — il collasso scatta quindi solo quando il tondo è GIÀ a scala/opacità zero in
 *  entrambe le modalità (normale: finestra 0.78-1; reduced: 1:1 su tutto il gesto, comunque 0
 *  esatto solo a p=1), mai a metà coreografia. */
export function piedeSenzaIngombro(progress: number): boolean {
  return clamp01(progress) >= 1
}

/** FIX ri-collaudo #4 (verifica device di Francesco, round 4) — «non appena effettuo lo swipe,
 *  nella pagina delle cassette resta il quadrato panna che copre le cassette e POI scompare».
 *  Diagnosi provata dal vivo (:3042, evidenza nel report): il "quadrato" non è un colore dipinto
 *  DA `.foot` (nessuno sfondo proprio, invariato) — è l'INGOMBRO DI LAYOUT che il box riserva
 *  comunque (margine-top + gap + safe-area) mentre `piedeSenzaIngombro` (sopra) resta `false`
 *  per costruzione fino al progress ESATTO 1: nello spazio riservato-ma-vuoto si intravede lo
 *  sfondo della PAGINA (`body`), che taglia l'ultima riga della griglia cassette — visibile per
 *  tutta la finestra fra "il tondo/l'etichetta sono già scomparsi" (progress ~0.8-0.9) e "il
 *  gesto/scroll-snap si è DAVVERO fermato" (scrollend, round 2-3): su un flick reale quella
 *  finestra dura quanto il momentum nativo (100-300ms), abbastanza per essere notata («resta...
 *  e POI scompare»). Il collasso discreto (`display:none` a progress===1 esatto, via
 *  `piedeSenzaIngombro`/`is-vuoto`) NON viene toccato — resta l'autorità sul riposo vero (anche
 *  per i casi senza un gesto continuo, es. deep-link). Questa funzione aggiunge un SECONDO
 *  canale, continuo, che chiude l'ingombro DENTRO la coreografia: una curva dedicata (non le
 *  formule ratificate di etichetta/tondo, invariate) che arriva a 0 per progress ~0.9 — un po'
 *  PRIMA che l'utente possa dirsi "arrivato" sulle cassette, in modo che quando la pagina è
 *  visivamente lì non ci sia più nulla da intravedere nello spazio riservato, indipendentemente
 *  da quando il progress numerico tocca esattamente 1. Finestra 0.7→0.9 (non 0.78→1, la
 *  finestra di `tondoOpacita`): chiude un po' PRIMA di quella del tondo apposta, così l'ingombro
 *  è già a zero quando il tondo stesso sta ancora finendo di sfumare — mai il contrario (un
 *  ingombro che sparisce DOPO il contenuto riprodurrebbe lo stesso ritardo percepito). */
export function piedeIngombro(progress: number): number {
  const p = clamp01(progress)
  return clamp01(1 - Math.max(0, p - 0.7) / 0.2)
}
