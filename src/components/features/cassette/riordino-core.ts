// Task 13 — core PURO del riordino della Parete (§6 della ricerca
// `.superpowers/sdd/ricerca-drag-touch.md`). Nessun DOM qui dentro: solo aritmetica su dati.
// È il confine testabile (§6): il guscio `useDragRiordino.ts` misura i rect, monta il ghost e fa
// scrollBy, ma OGNI decisione (dove cade il dito, come si riordina l'array, quanto scrollare, come
// riconciliare col server) vive qui, dove vitest la prova esaustivamente. Il collante DOM
// (preventDefault reale, scroll, rect, FLIP) è device/Playwright — MAI finto in jsdom.

/** Geometria della griglia, misurata UNA volta al sollevamento (§2.4.3): celle uniformi a colonne
 *  fisse. `scrollDelta = scrollY_ora − scrollY_lift` compensa l'auto-scroll a coordinate viewport. */
export type Geometria = {
  gridLeft: number
  gridTop: number
  cellaW: number
  cellaH: number
  gapX: number
  gapY: number
  colonne: number
  scrollDelta: number
}

export type Punto = { x: number; y: number }

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

/**
 * indiceDaPunto — hit-testing ARITMETICO O(1) (§1, §6), semantica `closestCenter` di dnd-kit:
 * l'indice è quello della cella il cui CENTRO è più vicino al punto (che il chiamante passa come
 * centro del ghost, in coordinate viewport). `pitch = cella + gap`; il centro della colonna c sta a
 * `c·pitch + cella/2`, quindi la colonna più vicina è `round((relX − cella/2) / pitch)`. Clamp
 * rigido a `[0, n−1]`: il bersaglio non esce mai dall'array, anche fuori dalla griglia (§2.4.7).
 */
export function indiceDaPunto(punto: Punto, geo: Geometria, n: number): number {
  if (n <= 0) return 0
  const pitchX = geo.cellaW + geo.gapX
  const pitchY = geo.cellaH + geo.gapY
  const relX = punto.x - geo.gridLeft
  const relY = punto.y - geo.gridTop + geo.scrollDelta
  const colonna = clamp(Math.round((relX - geo.cellaW / 2) / pitchX), 0, geo.colonne - 1)
  const righeMax = Math.ceil(n / geo.colonne) - 1
  const riga = clamp(Math.round((relY - geo.cellaH / 2) / pitchY), 0, righeMax)
  return clamp(riga * geo.colonne + colonna, 0, n - 1)
}

/**
 * calcolaNuovoOrdine — arrayMove per INSERIMENTO, MAI scambio (§1): togli l'elemento da `da` e
 * infilalo in `a`, gli altri scalano. È l'unica semantica che preserva l'ordine relativo delle
 * altre cassette — la mappa mentale del muro.
 */
export function calcolaNuovoOrdine<T>(ids: T[], da: number, a: number): T[] {
  const copia = ids.slice()
  const [elemento] = copia.splice(da, 1)
  copia.splice(a, 0, elemento)
  return copia
}

/**
 * velocitaAutoScroll — px da scrollare in questo frame (§2.4.5, modello pragmatic-drag-and-drop).
 * Fuori dalla fascia di bordo → 0 (non ingaggia). Dentro: tetto `min(ceil(0.9·dt), 15)` px/frame
 * (≈900 px/s quasi costante a ogni refresh rate); rampa SPAZIALE lineare 0→1 col massimo a metà
 * fascia (più vicino al bordo = più veloce); rampa TEMPORALE lineare 0→1 in 400 ms dal primo
 * ingresso (azzera il «botto» iniziale). Almeno 1 px quando ingaggiato: progresso garantito.
 */
export function velocitaAutoScroll(
  dt: number,
  distanzaDaBordo: number,
  fascia: number,
  msIngaggio: number,
): number {
  if (distanzaDaBordo >= fascia) return 0
  const maxFrame = Math.min(Math.ceil(0.9 * dt), 15)
  const penetrazione = fascia - distanzaDaBordo
  const pctDistanza = Math.min(penetrazione / (fascia / 2), 1)
  const pctTempo = Math.min(msIngaggio / 400, 1)
  return Math.max(maxFrame * pctDistanza * pctTempo, 1)
}

/**
 * riconcilia — al drop, ricostruisce la lista da POSTare partendo dall'ULTIMA lista nota del server
 * (buffer degli update realtime arrivati durante il drag, §6): togli l'id trascinato, reinseriscilo
 * dopo il suo predecessore LOCALE (o in testa se predecessore è null o è sparito dal server). Gli id
 * spariti dal server si scartano da soli (non li reinseriamo); gli id nuovi comparsi sul server
 * restano dove il server li mette. Funzione pura → l'ordine finale è deterministico e provato.
 */
export function riconcilia(
  ordineServer: string[],
  idTrascinato: string,
  idPredecessore: string | null,
): string[] {
  const senza = ordineServer.filter((id) => id !== idTrascinato)
  // L'id trascinato non esiste più sul server (buttato via altrove durante il drag): scartalo.
  if (!ordineServer.includes(idTrascinato)) return senza
  if (idPredecessore === null) return [idTrascinato, ...senza]
  const posPred = senza.indexOf(idPredecessore)
  if (posPred < 0) return [idTrascinato, ...senza]
  const risultato = senza.slice()
  risultato.splice(posPred + 1, 0, idTrascinato)
  return risultato
}
