'use client'

// Task 13 — useDragRiordino: il GUSCIO DOM del riordino a trascinamento (§2 della ricerca
// `.superpowers/sdd/ricerca-drag-touch.md`). Sottile per costruzione: OGNI decisione (dove cade il
// dito, come si riordina l'array, quanto scrollare, come riconciliare) vive nel core PURO
// `riordino-core.ts`, testato in vitest. Qui c'è solo il collante che jsdom non sa reggere e che va
// collaudato su device (FASE 9): listener nativi su `window`, misura dei rect, loop rAF per
// l'auto-scroll, `window.scrollBy`, e le motion value del ghost.
//
// Architettura (panel Task 13 §3): `Cassetta` riconosce il gesto e spara `onSollevata`; da lì in poi
// il gesto è QUI. I listener stanno su `window` (l'elemento può smontare durante il riordino) e sono
// filtrati per `pointerId`. Hit-testing ARITMETICO O(1) dai rect misurati al lift (§1) — MAI
// `elementFromPoint`. Inserimento (arrayMove), MAI scambio. UNA sola POST al drop, con la lista
// completa; refresh SOLO dopo successo (mai `router.refresh()` pre-drag — §8.2).
//
// Il ghost (§3.2/3.3) è pilotato da MOTION VALUE separate — MAI da `style.transform` grezzo + WAAPI
// (un'animazione WAAPI `fill:forwards` su `transform` scavalca lo `style` inline: la scala vincerebbe
// sull'inseguimento e il ghost resterebbe fermo mentre il dito trascina). Con motion value distinte,
// Motion compone `x`/`y`/`scale` in un unico transform senza che i due scrittori collidano (§3.1):
//  • `x`/`y` = SET diretto a ogni pointermove → inseguimento 1:1 grezzo, nessuna molla (la fluidità
//    qui è l'assenza di filtro, §3.3);
//  • `scale` = `animate(…, molla.press)` al lift (la molla interattiva iOS);
//  • atterraggio/annullo = `animate(x/y/scale, …, molla.snappy)` verso la cella bersaglio / d'origine.
//
// Il conflitto drag-vs-scroll su touch (§2): un listener nativo `touchmove` NON passivo è montato su
// `window` AL MOUNT (non al lift: copre il root React passivo e il bug WebKit 185656) e fa
// `preventDefault` SOLO a drag attivo, con la guardia `e.cancelable`.
//
// Nota sullo stile (React Compiler lint): gli handler sono FUNZIONI SEMPLICI nel corpo del hook (lo
// stesso pattern di `Cassetta.tsx`), non `useCallback` — così l'accesso ai ref è quello lecito degli
// event handler. Le prop più fresche si sincronizzano in un `useEffect`.
//
// CAPITOLO H3 v2 — riordino «aggancio al dito» (opzione 1 RATIFICATA da Francesco, decisione
// 0c37f25, `docs/design/decisions/2026-07-25-wave-h-scelte.md` §H3). Indagine PROVATA:
// `.superpowers/sdd/h3-indagine-report.md`. Root cause: `frame()` confrontava il CENTRO DEL
// GHOST (`centroOrigineRef` + delta dal lift) col punto medio fra due centri-TRACK di
// `indiceDaPunto` — su `.ds-parete-grid` (`align-items:start`, track PIÙ ALTO della cassetta:
// 200px sul telefono, 179,52-200 dal tablet in su dopo la decisione «avvicino le righe» del
// 26/07/2026 — erano 200/250 prima; il track è comunque LETTO a runtime da `grid-auto-rows`, mai
// ricopiato qui, quindi la decisione non tocca questo codice — contro l'altezza fissa del commit
// 21a0b17 «cassetta B», oggi 138px dopo la ratifica A3 del 26/07/2026, anche lei letta a runtime
// da un rect vero) quel punto medio cade nella maglia VUOTA sotto la
// cassetta, non su una cassetta vera; e se la presa non è al centro (si afferra la targa in
// alto, il caso reale), il ghost-centro "precede" il dito — il riordino scattava mentre il dito
// era ancora sopra la cassetta d'origine. FIX-F/`pitchY` restano CORRETTI e INVARIATI (l'indagine
// li ha provati esatti): cambia solo il TRIGGER. Ora `frame()` passa il PUNTO DEL DITO
// (`puntoRef`, mai più un centro derivato) a `indiceRettangoloDaPunto` (riordino-core.ts): il
// ricalcolo scatta SOLO quando il dito è DENTRO il rettangolo reale di un'altra cassetta;
// `null` (vuoto di rete, cornice, propria cassetta) → nessun nuovo `setOrdineIds`, l'ultimo
// bersaglio valido resta (one-way per posizione). `centroOrigineRef` è sparito: non serve più
// nessun offset presa↔centro, la trappola è morta per costruzione.

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { animate, useMotionValue, type MotionValue } from 'motion/react'
import { molla, trascinamento } from '@/design-system/v3/motion'
import { vibra } from '@/design-system/v3/haptic'
import { suona } from '@/design-system/v3/sound'
import type { CassettaParete } from '@/lib/cassette/parco-shared'
import {
  type Geometria,
  type Scroller,
  calcolaNuovoOrdine,
  creaScroller,
  indiceRettangoloDaPunto,
  riconcilia,
  velocitaAutoScroll,
} from './riordino-core'

const SOGLIA_MOVIMENTO_PX = 8
// Auto-scroll (§2.4.5): costanti FUNZIONALI, non token motion (è velocità, non transizione).
const FASCIA_BORDO_MAX = 180 // px; fascia = min(0.25·viewport, questo)

/** Descrittore del ghost: dove nasce (rect d'origine, viewport) e con quali dati si ridisegna. */
export type GhostInfo = { id: string; left: number; top: number; width: number; height: number }

export type UsaDrag = {
  /** Da passare a OGNI Cassetta come `onSollevata`: è il momento del lift. */
  onSollevata: (id: string, evento: ReactPointerEvent<HTMLButtonElement>) => void
  /** L'id sollevato (per portare l'originale a `opacitaBuca` e sapere chi è il ghost). */
  idTrascinato: string | null
  /** Ordine ottimistico durante il drag (per il FLIP delle sorelle); `null` a riposo. */
  ordineIds: string[] | null
  /** Il ghost da montare in portale (o `null`). */
  ghost: GhostInfo | null
  /** Le motion value del ghost: `x`/`y` (inseguimento 1:1) e `scale` (lift + atterraggio). */
  ghostMotion: { x: MotionValue<number>; y: MotionValue<number>; scale: MotionValue<number> }
  /** Annuncio `aria-live` del flusso attivo (sollevamento/spostamento/drop/annullo). */
  annuncio: string
}

export function useDragRiordino(opts: {
  parete: CassettaParete[]
  disabilitato: boolean
  gridRef: RefObject<HTMLDivElement | null>
  onSheet: (id: string) => void
  inviaOrdine: (ordine: string[]) => Promise<boolean>
  onRefresh: () => void
  /** Scroller del gesto (riserva ARCH R1, pre-embed home): assente → window, comportamento
   *  IDENTICO a oggi. Nella stanza home passerà il contenitore scrollabile della stanza. */
  scrollerRef?: RefObject<HTMLElement | null>
}): UsaDrag {
  const { parete, disabilitato, gridRef, onSheet, inviaOrdine, onRefresh } = opts

  // Prop più fresche in ref: gli handler nativi vivono in closure e non devono catturare valori
  // stantii. Sync in effect (mai scrivere ref durante il render — React Compiler lint).
  const pareteRef = useRef(parete)
  const onSheetRef = useRef(onSheet)
  const inviaRef = useRef(inviaOrdine)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    pareteRef.current = parete
    onSheetRef.current = onSheet
    inviaRef.current = inviaOrdine
    onRefreshRef.current = onRefresh
  })

  const [idTrascinato, setIdTrascinato] = useState<string | null>(null)
  const [ordineIds, setOrdineIds] = useState<string[] | null>(null)
  const [ghost, setGhost] = useState<GhostInfo | null>(null)
  const [annuncio, setAnnuncio] = useState('')

  const ghostX = useMotionValue(0)
  const ghostY = useMotionValue(0)
  const ghostScale = useMotionValue(1)

  // L'ordine ottimistico è locale al drag: appena il server rimanda una parete NUOVA (dopo il
  // refresh post-drop) lo si lascia cadere, così la griglia torna alla verità del server senza
  // flicker. Reset in render-phase al cambio di riferimento di `parete` (pattern sanzionato, come
  // `CassettaSheet` — NON un `useEffect`, che qui la lint del React Compiler vieta). Durante il drag
  // `parete` NON cambia (nessun refresh a gesto in corso — §8.2), quindi l'ottimistico sopravvive.
  const [pareteRif, setPareteRif] = useState(parete)
  if (pareteRif !== parete) {
    setPareteRif(parete)
    setOrdineIds(null)
  }

  // Stato imperativo del gesto (niente re-render per pixel di movimento — §3.4).
  const dragAttivoRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)
  const puntoRef = useRef({ x: 0, y: 0 })
  const liftRef = useRef({ x: 0, y: 0 })
  const origineRectRef = useRef({ left: 0, top: 0 })
  const geoRef = useRef<Geometria | null>(null)
  const scrollerRef = useRef<Scroller | null>(null)
  const scrollLiftRef = useRef(0)
  const origineRef = useRef(0)
  const correnteRef = useRef(0)
  const snapshotRef = useRef<string[]>([])
  const mossoRef = useRef(false)
  const staccoSuonatoRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const ultimoTsRef = useRef(0)
  const ingaggioBordoRef = useRef(0)
  const teardownRef = useRef<(() => void) | null>(null)

  // ── Listener nativo touchmove NON passivo, montato AL MOUNT (§2.3) ────────────────────────────
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (dragAttivoRef.current && e.cancelable) e.preventDefault()
    }
    const onDragStart = (e: Event) => {
      if (dragAttivoRef.current) e.preventDefault()
    }
    const onContextMenu = (e: Event) => {
      if (dragAttivoRef.current) e.preventDefault()
    }
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('dragstart', onDragStart)
    window.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('dragstart', onDragStart)
      window.removeEventListener('contextmenu', onContextMenu)
    }
  }, [])

  // Smontaggio: mai lasciare un gesto appeso (cleanup inline, deps vuote → solo all'unmount).
  useEffect(
    () => () => {
      if (teardownRef.current) teardownRef.current()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    },
    [],
  )

  function fermaRaf() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  // Stacca i listener e ferma il loop: il gesto non insegue più. Il ghost può ancora ATTERRARE.
  function fermaGesto() {
    dragAttivoRef.current = false
    pointerIdRef.current = null
    fermaRaf()
    if (teardownRef.current) {
      teardownRef.current()
      teardownRef.current = null
    }
  }

  // Smonta il ghost e riporta l'originale a piena opacità (fine crossfade della «buca»).
  function smontaGhost() {
    setGhost(null)
    setIdTrascinato(null)
    setAnnuncio('')
  }

  function reduced(): boolean {
    return prefersReduced()
  }

  // Atterraggio del ghost verso un offset (dx,dy) dalla sua origine, con `molla.snappy` (§3.3); a
  // reduced-motion è istantaneo. Al termine smonta.
  function atterra(dx: number, dy: number) {
    if (reduced()) {
      smontaGhost()
      return
    }
    animate(ghostX, dx, molla.snappy)
    animate(ghostY, dy, molla.snappy)
    animate(ghostScale, 1, { ...molla.snappy, onComplete: smontaGhost })
  }

  // Loop rAF: auto-scroll ai bordi + ricalcolo del bersaglio (§2.4.4/2.4.5). Function declaration
  // (hoisted) → può richiamarsi per nome senza TDZ.
  function frame(ts: number) {
    if (!dragAttivoRef.current) return
    const geo = geoRef.current
    const dt = ultimoTsRef.current ? ts - ultimoTsRef.current : 16
    ultimoTsRef.current = ts

    const scroller = scrollerRef.current
    if (geo && scroller) {
      const base = scroller.sogliaAlta()
      const h = scroller.altezzaVista()
      const fascia = Math.min(0.25 * h, FASCIA_BORDO_MAX)
      const y = puntoRef.current.y - base // coordinate RELATIVE alla vista scrollabile
      let dir = 0
      let dist = fascia
      if (y < fascia) {
        dir = -1
        dist = y
      } else if (h - y < fascia) {
        dir = 1
        dist = h - y
      }
      if (dir !== 0 && fascia > 0) {
        if (!ingaggioBordoRef.current) ingaggioBordoRef.current = ts
        const v = velocitaAutoScroll(dt, dist, fascia, ts - ingaggioBordoRef.current)
        const aFine = (dir < 0 && scroller.pos() <= 0) || (dir > 0 && scroller.pos() >= scroller.max())
        if (!aFine && v > 0) scroller.by(dir * v)
      } else {
        ingaggioBordoRef.current = 0
      }

      // Bersaglio dal PUNTO DEL DITO (H3 v2, decisione 0c37f25 — v. capitolo in testa al file),
      // coordinate viewport, con compensazione scroll. `indiceRettangoloDaPunto` è il GATE: torna
      // `null` (vuoto di rete, cornice, propria cassetta) finché il dito non entra nel
      // rettangolo REALE di un'altra cassetta — in quel caso l'ultimo bersaglio valido resta
      // (one-way per posizione: passare di nuovo sul vuoto non annulla un riordino già mostrato).
      const scrollDelta = scroller.pos() - scrollLiftRef.current
      const n = snapshotRef.current.length
      const nuovo = indiceRettangoloDaPunto(puntoRef.current, { ...geo, scrollDelta }, n)
      if (nuovo !== null && nuovo !== correnteRef.current) {
        correnteRef.current = nuovo
        setOrdineIds(calcolaNuovoOrdine(snapshotRef.current, origineRef.current, nuovo))
        setAnnuncio(`Posto ${nuovo + 1} di ${n}`)
      }
    }
    rafRef.current = requestAnimationFrame(frame)
  }

  // Misura la geometria della griglia UNA volta, al lift (§2.4.3).
  function misuraGeometria(idLift: string): { geo: Geometria; origine: DOMRect } | null {
    const grid = gridRef.current
    if (!grid) return null
    const celle = Array.from(grid.querySelectorAll<HTMLElement>('[data-cassetta-id]'))
    const primo = celle[0]?.getBoundingClientRect()
    const origine = grid.querySelector<HTMLElement>(`[data-cassetta-id="${idLift}"]`)?.getBoundingClientRect()
    if (!primo || !origine) return null
    const cs = typeof getComputedStyle === 'function' ? getComputedStyle(grid) : null
    const num = (v: string | undefined) => {
      const n = parseFloat(v ?? '')
      return Number.isFinite(n) ? n : 0
    }
    const gapX = num(cs?.columnGap || cs?.gap)
    const gapY = num(cs?.rowGap || cs?.gap)
    const cellaW = primo.width
    const cellaH = primo.height
    // D10 (FIX-F): il passo di riga vero è il TRACK della griglia (`--track`, `grid-auto-rows`,
    // già risolto in px dal browser via getComputedStyle) — su `.ds-parete-grid` (ds-v3.css
    // ~624/664) le celle NON riempiono la riga (`align-items:start`), quindi `cellaH` da solo
    // sfalsa il bersaglio scendendo di riga. Fallback a `cellaH` se il valore letto non è un
    // numero finito >0 (griglia non-CSS-grid, o non ancora misurabile) — riproduce il
    // comportamento precedente (pitch = cellaH + gapY).
    const trackYraw = parseFloat(cs?.gridAutoRows ?? '')
    const trackY = Number.isFinite(trackYraw) && trackYraw > 0 ? trackYraw : cellaH
    const pitchY = trackY + gapY
    const gridRect = grid.getBoundingClientRect()
    let colonne = Math.round((gridRect.width + gapX) / (cellaW + gapX))
    if (!Number.isFinite(colonne) || colonne < 1) colonne = 1
    return {
      geo: { gridLeft: primo.left, gridTop: primo.top, cellaW, cellaH, gapX, gapY, colonne, pitchY, scrollDelta: 0 },
      origine,
    }
  }

  function onSollevata(id: string, evento: ReactPointerEvent<HTMLButtonElement>) {
    if (disabilitato) return // guardia: ricerca attiva o <2 cassette (decisa dal chiamante)
    const snapshot = pareteRef.current.map((c) => c.id)
    const origine = snapshot.indexOf(id)
    if (origine < 0 || snapshot.length < 2) return

    const scroller = creaScroller(opts.scrollerRef?.current ?? null)
    scrollerRef.current = scroller

    const misura = misuraGeometria(id)
    pointerIdRef.current = evento.pointerId
    puntoRef.current = { x: evento.clientX, y: evento.clientY }
    liftRef.current = { x: evento.clientX, y: evento.clientY }
    scrollLiftRef.current = scroller.pos()
    snapshotRef.current = snapshot
    origineRef.current = origine
    correnteRef.current = origine
    mossoRef.current = false
    ingaggioBordoRef.current = 0
    ultimoTsRef.current = 0
    dragAttivoRef.current = true

    // Reset delle motion value del ghost al lift (parte fermo, scala 1) prima di far salire la scala.
    ghostX.set(0)
    ghostY.set(0)
    ghostScale.set(1)

    if (misura) {
      geoRef.current = misura.geo
      // H3 v2 — niente più `centroOrigineRef`: il bersaglio segue il PUNTO DEL DITO (`puntoRef`,
      // v. `frame()`), non un centro-ghost derivato dalla presa. `origineRectRef` resta: serve
      // solo per l'offset di ATTERRAGGIO al drop (`atterra`), non per l'hit-test.
      origineRectRef.current = { left: misura.origine.left, top: misura.origine.top }
      setGhost({ id, left: misura.origine.left, top: misura.origine.top, width: misura.origine.width, height: misura.origine.height })
    } else {
      geoRef.current = null
    }

    setIdTrascinato(id)
    setOrdineIds(snapshot)
    setAnnuncio(
      `Cassetta ${pareteRef.current[origine]?.nome ?? ''} sollevata, posto ${origine + 1} di ${snapshot.length}. ` +
        'Frecce per spostare, Invio per confermare, Esc per annullare.',
    )
    vibra('light') // §2.4.3: haptic al lift, se previsto — no-op dove navigator.vibrate manca (iOS)
    suona('stacco')
    staccoSuonatoRef.current = true

    // Scala al lift: la molla interattiva iOS (§3.3). A reduced-motion è un set istantaneo.
    if (reduced()) ghostScale.set(trascinamento.scalaSollevamento)
    else animate(ghostScale, trascinamento.scalaSollevamento, molla.press)

    // Listener del gesto su window, filtrati per pointerId (l'elemento può smontare — §2.3).
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return
      puntoRef.current = { x: e.clientX, y: e.clientY }
      const dx = e.clientX - liftRef.current.x
      const dy = e.clientY - liftRef.current.y
      if (Math.hypot(dx, dy) > SOGLIA_MOVIMENTO_PX) mossoRef.current = true
      // Inseguimento 1:1 grezzo: SET diretto, nessuna molla (§3.3). Motion compone x/y con la scala.
      ghostX.set(dx)
      ghostY.set(dy)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return
      concludi(false)
    }
    const onCancel = (e: PointerEvent) => {
      if (e.pointerId !== pointerIdRef.current) return
      concludi(true)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onCancel)
    teardownRef.current = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onCancel)
    }
    rafRef.current = requestAnimationFrame(frame)

    // Chiusura del gesto (drop | sheet | annullo). UNA sola POST, refresh solo su successo.
    function concludi(annullato: boolean) {
      const idTrasc = id
      const mosso = mossoRef.current
      fermaGesto() // stop inseguimento: da qui il ghost può solo atterrare/annullare

      if (!mosso && !annullato) {
        // Rilascio fermo (non annullato) = apri lo sheet (§2.5, comportamento già spedito). Il ghost
        // sparisce mentre lo sheet sale (nessun atterraggio: non c'è stato spostamento). Nessun suono:
        // il lift qui non è percepito come uno spostamento.
        onSheetRef.current(idTrasc)
        smontaGhost()
        staccoSuonatoRef.current = false
        return
      }
      if (annullato) {
        // pointercancel (annullo di sistema): il ghost torna alla cella d'origine (§2.4.7). NESSUNA POST.
        // Ri-aggancio attenuato (D5, spec redesign §2.6): «non è cambiato niente» — SOLO se lo stacco
        // era stato suonato al lift (altrimenti niente lift percepito, niente suono di chiusura).
        if (staccoSuonatoRef.current) suona('riaggancio', { gain: 0.4 })
        setAnnuncio('Spostamento annullato.')
        setOrdineIds(null) // rollback ottico allo snapshot
        atterra(0, 0)
        staccoSuonatoRef.current = false
        return
      }
      // DROP: lista finale = ordine ottimistico, riconciliato con l'ultima verità del server.
      const finale = calcolaNuovoOrdine(snapshotRef.current, origineRef.current, correnteRef.current)
      const idx = finale.indexOf(idTrasc)
      const predecessore = idx > 0 ? finale[idx - 1] : null
      const daPostare = riconcilia(pareteRef.current.map((c) => c.id), idTrasc, predecessore)
      setAnnuncio(
        `Cassetta ${pareteRef.current[origineRef.current]?.nome ?? ''} rilasciata al posto ${correnteRef.current + 1} di ${snapshotRef.current.length}.`,
      )
      suona('riaggancio')
      vibra('medium') // haptic di successo (riserva UX 7): il laboratorio è rumoroso
      void inviaRef.current(daPostare).then((ok) => {
        if (ok) onRefreshRef.current()
        else setOrdineIds(null) // POST fallita → rollback ottico (niente refresh, riga quieta)
      })
      // Atterraggio sulla cella bersaglio (la «buca» ottimistica), misurata ora dalla griglia.
      const bersaglio = gridRef.current?.querySelector<HTMLElement>(`[data-cassetta-id="${idTrasc}"]`)?.getBoundingClientRect()
      if (bersaglio) atterra(bersaglio.left - origineRectRef.current.left, bersaglio.top - origineRectRef.current.top)
      else smontaGhost()
      staccoSuonatoRef.current = false
    }
  }

  return { onSollevata, idTrascinato, ordineIds, ghost, ghostMotion: { x: ghostX, y: ghostY, scale: ghostScale }, annuncio }
}

function prefersReduced(): boolean {
  try {
    return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
