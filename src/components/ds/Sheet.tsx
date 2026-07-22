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
import { motion, AnimatePresence, animate as animaValore, useMotionValue } from 'motion/react'
import { molla, coreografie, cssEase, useReducedMotion } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia, materia } from '@/design-system/v3/tokens'
import { LinkQuieto } from './LinkQuieto'

/**
 * deveChiudere — soglia dismiss dello swipe giù (§5.16, §8.2.3): pura, senza
 * side-effect, così è testabile in isolamento dal gesto Motion reale
 * (jsdom non simula pan/velocity fisici in modo affidabile).
 *
 * Chiude se lo spostamento verticale supera il 25% dell'altezza del
 * pannello OPPURE la velocità di rilascio supera 500px/s (un colpo secco
 * basta anche con offset minimo) — soglie strette (`>`, non `>=`): il
 * confine esatto NON chiude, per non scattare su un rilascio "a un pelo"
 * dal limite. Altezza 0 è un caso difensivo (pannello non ancora misurato):
 * qualunque offset positivo la supera.
 */
export function deveChiudere(offsetY: number, velocitaY: number, altezzaPannello: number): boolean {
  const sogliaDistanza = altezzaPannello * 0.25
  return offsetY > sogliaDistanza || velocitaY > 500
}

/**
 * Sheet — il bottom sheet di legge (§5.16).
 *
 * Anatomia: scrim `materia.scrim` (tap → `onChiudi`) · card radius 28 solo in
 * alto (`raggio.sheet`) · grabber 36×4 `--line` a 8px dal bordo superiore ·
 * max 92% viewport, scroll interno oltre · `LinkQuieto` «Chiudi» SEMPRE in
 * fondo (mai una X come unica uscita) · Esc → `onChiudi` · swipe giù →
 * `onChiudi` (§5.16, `drag="y"` + `deveChiudere`, SOLO ramo animato — vedi
 * sotto) · dismiss interrompibile via `AnimatePresence` (§8.2.2) ·
 * `useReducedMotion` → dissolvenza (`cssEase.generico`) al posto della
 * risalita a molla · body scroll lock mentre è aperto (esteso a tutta
 * l'uscita animata, non solo mentre `aperto` è true — evita il layout shift
 * scoperto in QA live: la scrollbar che ricompare a metà animazione sposta
 * lateralmente il pannello centrato) · focus semplice: al primo elemento (il
 * contenitore) all'apertura, torna all'elemento precedente alla chiusura.
 *
 * Swipe giù (§5.16, §8.2.3): `drag="y"` + `dragConstraints={{top:0}}` (solo
 * verso il basso — verso l'alto il pannello non si stacca dalla posizione di
 * riposo) + `dragElastic` piccolo. Al rilascio, `deveChiudere` (soglia pura,
 * esportata e testata a parte) decide: oltre soglia → `onChiudi()` (stesso
 * percorso di uscita di scrim/Esc/Chiudi, niente duplicazione); sotto soglia
 * → il pannello torna a `y:0` con `molla.smooth` via `animate(yPannello, 0,
 * molla.smooth)`, dove `yPannello` è la STESSA `MotionValue` condivisa via
 * `style={{y: yPannello}}` con drag e con la coreografia `sheetSu`
 * (initial/animate/exit) — non lo snap-back elastico automatico di
 * `dragConstraints` (che userebbe una molla non tokenizzata, fuori dalla
 * regola "SOLO molla.*"). `dragMomentum={false}` è necessario: senza, la
 * fisica di rilascio automatica di Motion continuerebbe a muovere il
 * pannello dopo `onDragEnd`, in conflitto con lo snap-back esplicito (bug
 * verificato live: uno swipe corto finiva comunque quasi fuori schermo).
 * SOLO sul ramo animato: `SheetRidotto` (reduced motion, sotto) non ha drag —
 * è feedback fisico, non essenziale con le animazioni già ridotte a
 * dissolvenza (§8.4); restano comunque scrim/Esc/Chiudi. CAVEAT (documentato
 * per il sotto-progetto 3): l'intero pannello è draggable, contenuto
 * compreso — se in futuro il contenuto avrà scroll interno lungo, drag e
 * scroll verticale "litigheranno" sullo stesso gesto; qui il contenuto demo è
 * corto e non scrolla, quindi non si manifesta. Da risolvere quando servirà
 * (es. `dragListener` solo sul grabber, o soglia di attivazione sul target).
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
  // Fonte di verità condivisa per la posizione verticale del pannello: drag,
  // coreografia sheetSu (initial/animate/exit) e lo snap-back esplicito dello
  // swipe (sotto) leggono/scrivono TUTTI questa stessa MotionValue — evita il
  // conflitto fra due sistemi di animazione paralleli sullo stesso `y`.
  const yPannello = useMotionValue(0)

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
  // schermo. `montatoRef` (effect-sentinella qui sotto) traccia lo smontaggio
  // reale: React esegue le cleanup in ORDINE DI SETUP (verificato
  // empiricamente su React 19.2: «A setup, B setup, A cleanup, B cleanup» —
  // NON LIFO come da credenza comune), quindi la sentinella è dichiarata
  // PRIMA dell'effect dello scroll lock, così `montatoRef.current = false`
  // gira in tempo per essere letto dalla cleanup del lock.
  const scrollLockPrecedenteRef = useRef<{ overflow: string; padding: string } | null>(null)
  const montatoRef = useRef(true)
  function sbloccaScroll() {
    const precedente = scrollLockPrecedenteRef.current
    if (!precedente) return
    document.body.style.overflow = precedente.overflow
    document.body.style.paddingRight = precedente.padding
    scrollLockPrecedenteRef.current = null
  }

  // Effect-sentinella dello smontaggio reale — PRIMA dello scroll lock
  // (ordine di setup = ordine delle cleanup, vedi sopra).
  useEffect(() => {
    montatoRef.current = true
    return () => {
      montatoRef.current = false
    }
  }, [])

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

  // Swipe giù per chiudere (§5.16 — gap di spec, mai implementato prima
  // d'ora). `deveChiudere` decide; se non supera la soglia il pannello torna
  // su con `molla.smooth`. `dragMomentum={false}` sul pannello (sotto) è
  // OBBLIGATORIO: senza, la fisica di rilascio automatica di Motion
  // continuerebbe a muovere il pannello DOPO `onDragEnd`, in conflitto con lo
  // `animaValore(yPannello, 0, molla.smooth)` esplicito qui sotto — le due
  // animazioni si accavallavano (verificato live: uno swipe piccolo finiva
  // comunque quasi fuori schermo invece di tornare su). `yPannello` è
  // condivisa con `style={{ y: yPannello }}` sul pannello, così drag,
  // `initial`/`animate`/`exit` (coreografia sheetSu) e questo snap-back
  // esplicito leggono e scrivono la STESSA fonte di verità.
  function gestisciFineDrag(_evento: unknown, info: { offset: { y: number }; velocity: { y: number } }) {
    const altezzaPannello = dialogRef.current?.getBoundingClientRect().height ?? 0
    if (deveChiudere(info.offset.y, info.velocity.y, altezzaPannello)) {
      onChiudi()
    } else {
      animaValore(yPannello, 0, molla.smooth)
    }
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
            className="ds-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={ariaLabelledby}
            tabIndex={-1}
            initial={coreografie.sheetSu.initial}
            animate={coreografie.sheetSu.animate}
            exit={coreografie.sheetSu.exit}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            dragMomentum={false}
            onDragEnd={gestisciFineDrag}
            style={{ ...sheetStile, y: yPannello }}
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
        className="ds-sheet"
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
  // Esplicito, non solo "assenza di regola" (fix QA live Francesco round 2 —
  // difesa in profondità oltre alla rimozione di `background` dalla regola
  // scope `[data-ds="v3"]` in ds-v3.css): questo wrapper porta `data-ds="v3"`
  // per i token, non per dipingere — dietro allo `scrimStile` semi-trasparente
  // deve trasparire la pagina vera, mai un rettangolo opaco `var(--bg)`.
  background: 'transparent',
}

const scrimStile: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: materia.scrim,
}

// Il pannello porta la classe `ds-sheet` (entrambe le varianti, motion e
// ridotta): NON ha stili propri qui — è l'aggancio contestuale per ds-v3.css
// (gate L2 22/07/2026: in dark le facce `--card`/`--sh-press` dei componenti
// premibili DENTRO lo sheet — ChipScelta, TastoTondo — si rimappano su --elv
// + hairline, altrimenti sparirebbero sul pannello che è anch'esso --card).
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
