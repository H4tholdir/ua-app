'use client'

// Task 14 — StanzePager: le due stanze della home (spec 2026-07-21-parete-cassette-design.md
// §6, emendamenti DS v3 §3.3 regola 5 / §7.1). Due stanze affiancate in un contenitore a
// scroll-snap orizzontale: lo swipe è scroll NATIVO, non un finto carosello.
//
// Il CSS (viewport, peek 28px, snap, no-scrollbar) vive in `src/app/ds-v3.css`
// (`.ua-stanze*`), come per `.ds-parete*` di PareteClient: porta media query e regole che
// uno style-object non sa esprimere, ed è la casa canonica dei valori del DS v3.
//
// ── Perché `inert` conta qui più che altrove ──────────────────────────────────────────────
// La stanza fuori campo è ancora nel DOM, a 28px di distanza. Senza `inert` + `aria-hidden`
// chi naviga da tastiera tabberebbe dentro una stanza che NON vede, e uno screen reader
// leggerebbe due volte «Tutto il resto», due titoli, due home. `inert` è un attributo HTML
// vero (React 19 lo passa attraverso, v. AdminHomePreview), non un trucco ARIA: toglie
// insieme focus, click e albero a11y.
//
// ── Chi decide la stanza attiva ───────────────────────────────────────────────────────────
// Due strade, per due gesti diversi:
// - SWIPE: la destinazione non si conosce finché lo scroll non si assesta → decide
//   l'IntersectionObserver a soglia .6 («la stanza che occupa la maggior parte del viewport»),
//   che è il «a fine snap» della spec. Il focus NON si sposta: l'utente sta guardando, non
//   ha chiesto nulla.
// - DOT / TASTIERA: la destinazione è nota nell'istante del tap → lo stato cambia SUBITO
//   (deviazione dichiarata dal «aggiornati a fine snap» della spec, che descrive lo swipe) e
//   il focus si sposta come prescritto. Aspettare l'IO qui vorrebbe dire lasciare
//   `aria-selected` a mentire per tutta la durata dello smooth scroll, e — su
//   reduced-motion, dove lo scroll è istantaneo — potenzialmente per sempre se l'IO non
//   scattasse. Le due strade sono idempotenti: l'IO che arriva dopo conferma e basta.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ProgressDotsStanze, idTabStanza } from '@/components/ds/ProgressDots'
import { useReducedMotion } from '@/design-system/v3/motion'
import type { StanzaHome } from '@/lib/preferenze/home'

const ORDINE: readonly StanzaHome[] = ['pile', 'parete']
const ID_PANNELLI = ['ua-stanza-pile', 'ua-stanza-parete'] as const
const ETICHETTE = ['Le pile', 'La parete'] as const

// La stanza «attiva» è quella che occupa la maggior parte del viewport: .6 è la soglia della
// spec §6 — abbastanza alta da non scattare a metà swipe (dove ENTRAMBE le stanze stanno
// sopra .4), abbastanza bassa da scattare prima che lo snap si sia fermato del tutto.
const SOGLIA_STANZA_ATTIVA = 0.6

const FOCUSABILI = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function StanzePager(props: {
  stanzaIniziale: StanzaHome
  pile: ReactNode
  parete: ReactNode
  /** Il piano fisso sotto le stanze: UN solo TastoPiù, identico e immobile in entrambe
   *  (§3.3 regola 5) — mai un doppione visibile a metà snap. Sta fuori dal viewport, così
   *  non scorre con le stanze. */
  footer?: ReactNode
}) {
  const { stanzaIniziale, pile, parete, footer } = props
  const [attiva, setAttiva] = useState<StanzaHome>(stanzaIniziale)
  const viewport = useRef<HTMLDivElement | null>(null)
  const stanze = useRef<Record<StanzaHome, HTMLDivElement | null>>({ pile: null, parete: null })
  // `true` solo fra una scelta esplicita (dot/tastiera) e il re-render che ne consegue: è lì
  // che il focus può entrare nella stanza, quando l'`inert` è già stato tolto.
  const focusDaPortare = useRef(false)
  const ridotto = useReducedMotion()

  const indice = ORDINE.indexOf(attiva) as 0 | 1

  // Swipe: l'IO è l'unica fonte per il gesto continuo. Nessuna dipendenza — le ref sono
  // stabili e la callback legge solo il DOM.
  useEffect(() => {
    const contenitore = viewport.current
    if (!contenitore) return

    // Posizionamento iniziale, PRIMA di osservare (review del proprio diff): il viewport
    // nasce a scrollLeft 0, cioè sulla stanza Pile. Entrando con `?stanza=parete` — o con la
    // preferenza che apre sulla Parete — senza questo scroll si vedrebbe la stanza Pile
    // mentre lo stato la dà per uscente: inerte, aria-hidden e con i dots che indicano
    // l'altra. Sempre `'auto'`: non è un movimento che l'utente ha chiesto, è il punto in cui
    // la pagina comincia — animarlo sarebbe un carosello che parte da solo.
    // L'ordine conta: farlo prima di `observe()` significa che l'IO comincia a misurare su
    // una posizione già giusta, senza dipendere da quando il browser consegna la prima
    // notifica.
    const iniziale = stanze.current[stanzaIniziale]
    if (iniziale && typeof contenitore.scrollTo === 'function') {
      contenitore.scrollTo({ left: iniziale.offsetLeft, behavior: 'auto' })
    }

    if (typeof IntersectionObserver === 'undefined') return
    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const voce of voci) {
          // La soglia si RILEGGE dal ratio, non ci si fida di `isIntersecting`: l'IO notifica
          // a ogni attraversamento, anche in USCITA dalla soglia (dove `isIntersecting` è
          // ancora true ma il ratio è sceso). Senza questo controllo, uno swipe verso la
          // parete rimetterebbe attiva la stanza che si sta lasciando.
          if (voce.intersectionRatio < SOGLIA_STANZA_ATTIVA) continue
          const nome = (voce.target as HTMLElement).dataset.stanza as StanzaHome | undefined
          if (nome) setAttiva(nome)
        }
      },
      { root: contenitore, threshold: SOGLIA_STANZA_ATTIVA }
    )
    for (const nome of ORDINE) {
      const elemento = stanze.current[nome]
      if (elemento) osservatore.observe(elemento)
    }
    return () => osservatore.disconnect()
    // `stanzaIniziale` cambia solo con una nuova navigazione server (`?stanza=` diverso): in
    // quel caso riposizionarsi sulla stanza chiesta è esattamente ciò che si vuole.
  }, [stanzaIniziale])

  // Il focus entra nella stanza SOLO dopo il re-render che le ha tolto `inert`: chiamarlo
  // prima sarebbe un `focus()` silenziosamente inefficace su un sottoalbero inerte.
  useEffect(() => {
    if (!focusDaPortare.current) return
    focusDaPortare.current = false
    const entrante = stanze.current[attiva]
    // Collaudo R2 (D-1, 22/07 sera): SEMPRE preventScroll — il focus nudo fa lo scroll-into-view
    // istantaneo che CANCELLA lo scrollTo smooth di `vaiA`, e lo snap mandatory ri-aggancia alla
    // stanza di partenza: il tap sul dot sembrava morto. Lo scroll è SOLO di `vaiA`.
    entrante?.querySelector<HTMLElement>(FOCUSABILI)?.focus({ preventScroll: true })
  }, [attiva])

  const vaiA = useCallback(
    (destinazione: StanzaHome, origine: 'tap' | 'freccia') => {
      // La stanza chiesta può essere quella GIÀ attiva: succede ogni volta che una freccia ha
      // spostato la selezione (che cambia `attiva` subito, lasciando il focus sui dots) e poi si
      // preme Invio. In quel caso `setAttiva` fa bail-out sullo stesso valore, il re-render non
      // avviene e l'effect su `[attiva]` NON gira mai: armare `focusDaPortare` qui lo lascerebbe
      // acceso a tempo indeterminato — il focus non entrerebbe nella stanza (Invio morto da
      // tastiera) e il flag verrebbe poi riscosso dal primo swipe, che ruberebbe il focus a chi
      // stava solo guardando. Quindi: se la stanza è già attiva il suo sottoalbero è già
      // non-inerte e il focus può entrare SUBITO, senza passare dall'effect.
      const giaAttiva = destinazione === attiva
      setAttiva(destinazione)
      if (origine === 'tap') {
        if (giaAttiva)
          stanze.current[destinazione]?.querySelector<HTMLElement>(FOCUSABILI)?.focus({ preventScroll: true })
        else focusDaPortare.current = true
      }
      const contenitore = viewport.current
      const bersaglio = stanze.current[destinazione]
      // `scrollTo` non esiste in jsdom (e non esisterebbe su un contenitore mai montato): la
      // guardia evita che un ambiente senza scroll faccia cadere il cambio di stanza, che è
      // già avvenuto sopra ed è ciò che conta davvero.
      if (!contenitore || !bersaglio || typeof contenitore.scrollTo !== 'function') return
      contenitore.scrollTo({ left: bersaglio.offsetLeft, behavior: ridotto ? 'auto' : 'smooth' })
    },
    [ridotto, attiva]
  )

  return (
    <div className="ua-stanze">
      <div className="ua-stanze-viewport" ref={viewport}>
        {ORDINE.map((nome, i) => {
          const eAttiva = nome === attiva
          return (
            <div
              key={nome}
              id={ID_PANNELLI[i]}
              className="ua-stanza"
              data-stanza={nome}
              role="tabpanel"
              aria-labelledby={idTabStanza(ID_PANNELLI[i])}
              aria-hidden={!eAttiva}
              inert={!eAttiva}
              ref={(nodo) => {
                stanze.current[nome] = nodo
              }}
            >
              {nome === 'pile' ? pile : parete}
            </div>
          )
        })}
      </div>

      {footer}

      <div className="ua-stanze-dots">
        <ProgressDotsStanze
          etichetta="Le stanze della home"
          etichette={ETICHETTE}
          idPannelli={ID_PANNELLI}
          attiva={indice}
          onSceglie={(scelta, origine) => vaiA(ORDINE[scelta], origine)}
        />
      </div>
    </div>
  )
}
