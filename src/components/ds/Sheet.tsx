'use client'

// DS v3 §5.16 — Sheet: il bottom sheet, la base di ogni futuro form/dettaglio.
// Sale dal basso con `molla.smooth` (coreografia `sheetSu`), radius 28 SOLO in
// alto, grabber 36×4, scrim dietro. MAI una X come unica uscita (L6): la via
// di fuga è sempre il `LinkQuieto` «Chiudi» in fondo, oltre a tap-scrim ed
// Esc. Lo scale a .96 della vista sotto è responsabilità della PAGINA
// (sotto-progetto 3): questo componente non lo implementa.

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { molla, coreografie, cssEase, useReducedMotion } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia, materia } from '@/design-system/v3/tokens'
import { LinkQuieto } from './LinkQuieto'

/**
 * Sheet — il bottom sheet di legge (§5.16).
 *
 * Anatomia: scrim `materia.scrim` (tap → `onChiudi`) · card radius 28 solo in
 * alto (`raggio.sheet`) · grabber 36×4 `--line` a 8px dal bordo superiore ·
 * max 92% viewport, scroll interno oltre · `LinkQuieto` «Chiudi» SEMPRE in
 * fondo (mai una X come unica uscita) · Esc → `onChiudi` · dismiss
 * interrompibile via `AnimatePresence` (§8.2.2) · `useReducedMotion` →
 * dissolvenza (`cssEase.generico`) al posto della risalita a molla · body
 * scroll lock mentre è aperto (esteso a tutta l'uscita animata, non solo
 * mentre `aperto` è true — evita il layout shift scoperto in QA live: la
 * scrollbar che ricompare a metà animazione sposta lateralmente il pannello
 * centrato) · focus semplice: al primo elemento (il contenitore)
 * all'apertura, torna all'elemento precedente alla chiusura.
 *
 * Portal su `document.body`: essendo l'unico overlay che deve scappare dallo
 * scope del catalogo (e in futuro da qualunque pagina scalata a .96 dal
 * sotto-progetto 3), porta con sé `data-ds="v3"` — eccezione sanzionata alla
 * regola "solo il catalogo lo monta" (constraint 3), perché qui il DOM vive
 * fuori dal subtree del catalogo/pagina.
 */
export function Sheet(props: { aperto: boolean; onChiudi: () => void; titolo?: string; children: ReactNode }) {
  const { aperto, onChiudi, titolo, children } = props
  const reduced = useReducedMotion()
  const dialogRef = useRef<HTMLDivElement>(null)
  const titoloId = useId()
  // aria-labelledby SOLO quando il titolo esiste (a11y): senza titolo il
  // nome accessibile resta ai contenuti — il chiamante può sempre passarne uno.
  const ariaLabelledby = titolo ? titoloId : undefined

  // Esc → onChiudi, SOLO mentre aperto.
  useEffect(() => {
    if (!aperto) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onChiudi()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aperto, onChiudi])

  // Blocco scroll "esteso" (bug QA live Francesco): il body deve restare
  // bloccato per TUTTA la discesa del pannello, non solo mentre `aperto` è
  // true. Sbloccarlo subito su `aperto=false` fa ricomparire la scrollbar
  // nativa a metà dell'animazione di uscita (~500ms, molla.smooth): il
  // wrapper centrato (`justifyContent:'center'`) si ricentra sul nuovo
  // viewport più stretto e il pannello slitta visibilmente di lato.
  //
  // Lo sblocco è DEFERITO: il valore precedente (overflow + paddingRight, la
  // compensazione della larghezza scrollbar — l'altra metà del fix, evita che
  // il viewport cambi larghezza mentre è bloccato) è salvato in un ref, non
  // ripristinato nella cleanup di questo effect. Reduced motion (nessuna
  // uscita animata) e lo smontaggio "vero" del componente (il chiamante ha
  // rimosso `<Sheet>` mentre era aperto, bypassando `onChiudi` — uso
  // scorretto, ma il body non deve restare bloccato per sempre) sbloccano
  // subito nella cleanup; il ramo animato normale sblocca da
  // `onExitComplete` di AnimatePresence, quando il pannello è già fuori
  // schermo. `montatoRef` (sotto) traccia lo smontaggio reale: la sua
  // cleanup — dichiarata DOPO, quindi eseguita PRIMA per via dell'ordine
  // LIFO delle cleanup di React — marca `montatoRef.current = false` in
  // tempo per essere letto qui.
  const scrollLockPrecedenteRef = useRef<{ overflow: string; padding: string } | null>(null)
  const montatoRef = useRef(true)
  function sbloccaScroll() {
    const precedente = scrollLockPrecedenteRef.current
    if (!precedente) return
    document.body.style.overflow = precedente.overflow
    document.body.style.paddingRight = precedente.padding
    scrollLockPrecedenteRef.current = null
  }

  useEffect(() => {
    if (!aperto) return
    // Cattura il valore precedente SOLO se non è già bloccato: riaprire
    // mentre l'uscita precedente sta ancora giocando (sblocco deferito, ref
    // già valorizzato) NON deve sovrascrivere il valore originale con
    // 'hidden' — altrimenti alla chiusura successiva `sbloccaScroll` lo
    // "ripristinerebbe" a 'hidden' per sempre (bug trovato in review).
    if (!scrollLockPrecedenteRef.current) {
      scrollLockPrecedenteRef.current = {
        overflow: document.body.style.overflow,
        padding: document.body.style.paddingRight,
      }
    }
    const larghezzaScrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (larghezzaScrollbar > 0) {
      document.body.style.paddingRight = `${larghezzaScrollbar}px`
    }
    return () => {
      if (reduced || !montatoRef.current) {
        sbloccaScroll()
      }
    }
  }, [aperto, reduced])

  // Dichiarato DOPO l'effect dello scroll lock: le cleanup di React girano in
  // ordine LIFO (l'ultimo `useEffect` dichiarato si pulisce per primo), quindi
  // allo smontaggio reale `montatoRef.current` è già `false` nel momento in
  // cui la cleanup dello scroll lock (sopra) lo legge.
  useEffect(() => {
    return () => {
      montatoRef.current = false
    }
  }, [])

  // Focus semplice: al contenitore all'apertura, torna all'elemento
  // precedente alla chiusura (o allo smontaggio mentre era aperto).
  useEffect(() => {
    if (!aperto) return
    const precedenteFocus = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    return () => {
      precedenteFocus?.focus()
    }
  }, [aperto])

  // SSR-safety (constraint 12): niente document/createPortal durante il
  // render server — sul client document esiste sempre già al primo render.
  if (typeof document === 'undefined') return null

  function chiudiSeScrim(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onChiudi()
  }

  const contenutoDialog = (
    <>
      <div className="ds-sheet-grabber" aria-hidden="true" style={grabberStile} />
      {titolo && <h2 id={titoloId} style={titoloStile}>{titolo}</h2>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>{children}</div>
      <div style={{ marginTop: spazio.l, display: 'flex', justifyContent: 'center' }}>
        <LinkQuieto onClick={onChiudi}>Chiudi</LinkQuieto>
      </div>
    </>
  )

  const overlay = reduced ? (
    aperto ? (
      <SheetRidotto dialogRef={dialogRef} chiudiSeScrim={chiudiSeScrim} ariaLabelledby={ariaLabelledby}>
        {contenutoDialog}
      </SheetRidotto>
    ) : null
  ) : (
    <AnimatePresence onExitComplete={sbloccaScroll}>
      {aperto && (
        <motion.div key="sheet-overlay" data-ds="v3" style={wrapperStile}>
          <motion.div
            className="ds-sheet-scrim"
            onClick={chiudiSeScrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={molla.smooth}
            style={scrimStile}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledby}
            tabIndex={-1}
            initial={coreografie.sheetSu.initial}
            animate={coreografie.sheetSu.animate}
            exit={coreografie.sheetSu.exit}
            style={sheetStile}
          >
            {contenutoDialog}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(overlay, document.body)
}

/**
 * SheetRidotto — variante reduced-motion (§8.4): monta fresca ad ogni
 * apertura (il genitore la conta/smonta insieme ad `aperto`), quindi il suo
 * stato locale `entrata` riparte sempre da `false` senza bisogno di un reset
 * esplicito nell'effect (che triggererebbe un setState sincrono in effect,
 * pattern da evitare) — sale a `true` un frame dopo il mount, giocando la
 * dissolvenza CSS pura (`cssEase.generico`) al posto della molla.
 */
function SheetRidotto(props: {
  dialogRef: RefObject<HTMLDivElement | null>
  chiudiSeScrim: (e: MouseEvent<HTMLDivElement>) => void
  ariaLabelledby?: string
  children: ReactNode
}) {
  const { dialogRef, chiudiSeScrim, ariaLabelledby, children } = props
  const [entrata, setEntrata] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntrata(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div data-ds="v3" style={wrapperStile}>
      <div
        className="ds-sheet-scrim"
        onClick={chiudiSeScrim}
        style={{ ...scrimStile, opacity: entrata ? 1 : 0, transition: `opacity ${cssEase.generico}` }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledby}
        tabIndex={-1}
        style={{ ...sheetStile, opacity: entrata ? 1 : 0, transition: `opacity ${cssEase.generico}` }}
      >
        {children}
      </div>
    </div>
  )
}

const wrapperStile: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
}

const scrimStile: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: materia.scrim,
}

const sheetStile: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 480,
  maxHeight: '92vh',
  overflowY: 'auto',
  background: 'var(--card)',
  borderTopLeftRadius: raggio.sheet,
  borderTopRightRadius: raggio.sheet,
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 0,
  padding: `${spazio.xl}px ${spazio.l}px ${spazio.l}px`,
  boxShadow: 'var(--sh-card)',
}

const grabberStile: CSSProperties = {
  position: 'absolute',
  top: 8,
  left: '50%',
  transform: 'translateX(-50%)',
  width: 36,
  height: 4,
  borderRadius: raggio.pill,
  background: 'var(--line)',
}

const titoloStile: CSSProperties = {
  fontSize: tipografia.size.heading,
  fontWeight: tipografia.weight.extrabold,
  color: 'var(--ink)',
  margin: `0 0 ${spazio.m}px`,
}
