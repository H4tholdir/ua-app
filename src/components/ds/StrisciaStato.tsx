'use client'

// DS v3 §5.24 — StrisciaStato (home): riga di stato con voce, sotto le pile.
// Task 16b (forma F2 «card con voce», ratifica 23-24/07/2026 —
// docs/design/decisions/2026-07-24-striscia-home.md §Ratifiche 1): non è più la riga F1 nuda di
// prima — vive dentro una card tinta di stato (rossa/ambra/verde), valori VERBATIM dal mockup
// ratificato docs/design/mockups/2026-07-24-striscia-home.html (.f2/.ico/.txt/.cta, righe
// 149-160). Variante default = rassicurazione (check verde: "va tutto bene, guarda").
// Variante `attenzione` = chiede un'azione: icona famiglia rossa al posto del check.
// Il RACCONTO (segnale con `eventoId`, v. src/lib/dashboard/striscia.ts — presente SOLO su
// sRaccontoLiberazione) è l'UNICA variante tappabile su tutta la card, deep-link diretto con un
// chevron come affordance (Task 16b punto 4, mockup `.taprow`/`.chev`); ogni altro stato resta
// come sempre: region viva e educata (`role="status"` `aria-live="polite"`), MAI un elemento
// interattivo di per sé, con la sola CTA `azione` — un `<Link>` separato dal blocco di testo
// troncabile. Al tap: `vibra('selection')`, MAI `suona()` (il suono è riservato ai tasti fisici
// che fanno qualcosa).
//
// Il dedup del racconto (Task 16b punto 6, `useRaccontoVisto`) vive nei CALLSITE (HomeV3,
// NavDesk), non qui: questo componente resta presentazionale (com'era già prima — "la logica la
// porta il chiamante, qui si invoca soltanto", v. `onAzione` sotto), e un eventuale `return null`
// qui dentro lascerebbe comunque montato il contenitore del chiamante (es. `.striscia-slot` con
// `marginTop` fisso in HomeV3) — un vuoto orfano, non l'assenza vera richiesta dal punto 5/6.

import type { ReactNode } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import { molla, coreografie, useReducedMotion } from '@/design-system/v3/motion'

const DIAMETRO = 26
const PADDING_CARD = `${spazio.sm}px 14px` // mockup .f2: padding 12/14 (12 = spazio.sm, 14 letterale)

// Task 16b punto 3 — coreografia V1 «carattere per livello» (ratifica 24/07/2026, decisione
// docs/design/decisions/2026-07-24-striscia-home.md §Ratifiche 2, valori VERBATIM dalla demo
// docs/design/mockups/2026-07-24-striscia-animazioni.html righe ~355-358, funzione `recipeFor`):
// l'ingresso della striscia cambia carattere secondo lo stato che rappresenta.
export type CarattereStriscia = 'urgenza' | 'trial' | 'racconto'

/** attenzione vince sempre (O1i — anche se il segnale fosse di origine trial); poi il tono
 *  ambra è il trial fuori dall'ultima finestra; tutto il resto (narrazione quieta, mai un
 *  allarme) è «racconto» per la coreografia — indipendentemente dal fatto che porti o no un
 *  `eventoId` (quella è una domanda diversa, v. `StrisciaStato` più sotto). */
export function carattereStriscia(attenzione: boolean, tono?: 'ambra'): CarattereStriscia {
  if (attenzione) return 'urgenza'
  if (tono === 'ambra') return 'trial'
  return 'racconto'
}

/**
 * ingressoStriscia — `initial`/`animate` per Motion, secondo il carattere. `reduced`
 * (prefers-reduced-motion, legge d'accessibilità) → SOLO dissolvenza: niente y, niente scale,
 * MAI un loop. La molla resta quella del carattere (mai una durata inventata): togliere y/scale
 * da un oggetto già dichiarato non è un valore nuovo, è lo stesso token con meno campi.
 */
export function ingressoStriscia(carattere: CarattereStriscia, reduced: boolean) {
  const ricetta = (() => {
    switch (carattere) {
      case 'urgenza':
        return { y: 12, scale: 0.96, spring: molla.bouncy }
      case 'trial':
        return { y: 12, scale: 0.98, spring: molla.smooth }
      case 'racconto':
        return { y: 6, scale: 1, spring: molla.smooth }
    }
  })()
  const { y, scale, spring } = ricetta
  return reduced
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: spring } }
    : { initial: { y, scale, opacity: 0 }, animate: { y: 0, scale: 1, opacity: 1, transition: spring } }
}

/**
 * uscitaStriscia — uscita UNICA per ogni carattere: `coreografie.avviso.exit`, già in motion.ts,
 * byte-identica alla demo. Sotto reduced-motion si toglie la sola `y` (stessa transizione già
 * dichiarata, nessuna durata nuova): resta una dissolvenza, mai una traslazione.
 */
export function uscitaStriscia(reduced: boolean) {
  return reduced ? { opacity: 0, transition: coreografie.avviso.exit.transition } : coreografie.avviso.exit
}

/**
 * StrisciaStato — riga di stato in home (§5.24, forma F2 «card con voce»).
 *
 * Contenitore `role="status" aria-live="polite"`, card tinta di stato (`background` tint,
 * `border-radius: raggio.riga`, `padding: 12px 14px`, `border: 1px solid var(--line)` — dark
 * resta FLAT, nessuna ombra). Dentro: icona Ø26 (check verde tint / triangolo `!` rosso tint in
 * `attenzione` / clessidra ambra nel trial — il disco è sempre la superficie `--elv`, mai più la
 * tinta) + testo `flex: 1 1 auto; minWidth: 0` 14.5/500 `--muted` su una riga con ellissi:
 * `forte` (opzionale) apre il testo in grassetto `--ink` 700, poi `children`. Se il chiamante
 * passa `altri` compare un nodo `flex: none` subito dopo (Task 16b punto 2 — mai dentro il testo
 * troncabile). Se il chiamante passa `azione` compare una CTA `<Link>` `flex-none` 14.5/800
 * `--red`, MAI dentro il blocco troncabile — hit-area ≥44px via `minHeight: 44` +
 * `margin: '-13px 0'`. Se il segnale porta anche `eventoId` (SOLO il racconto liberazione oggi),
 * l'intera card diventa il link (Task 16b punto 4): niente CTA testuale, un chevron come
 * affordance.
 */
export function StrisciaStato(props: {
  children: ReactNode
  forte?: string | null
  attenzione?: boolean
  tono?: 'ambra'
  azione?: { etichetta: string; href: string } | null
  /** Task 16b punto 2 — quanti ALTRI allarmi di livello 1 sono accesi insieme a questo
   *  (v. SegnaleStriscia.altri): assente con un solo allarme, MAI 0. Nodo che non si restringe,
   *  copy verbatim: `altri === 1` → «e un'altra» · `altri > 1` → «e altre N». */
  altri?: number
  /** Task 16b punto 4 — presente SOLO sui segnali «racconto» (oggi: sRaccontoLiberazione, v.
   *  striscia.ts): con `azione` insieme, attiva il tap sull'intera card. Allarmi (`attenzione`)
   *  e trial (`tono === 'ambra'`) restano CTA-only anche se per errore portassero un eventoId —
   *  difesa esplicita, mai un allarme che diventa whole-card. */
  eventoId?: string
  /** Task 15 — effetto collaterale opzionale al tap dell'azione (CTA o whole-card), OLTRE alla
   *  navigazione del `<Link>` (es. il racconto backfill scrive `parete_intro_vista`
   *  fire-and-forget). La riga resta presentazionale: la logica la porta il chiamante, qui si
   *  invoca soltanto. */
  onAzione?: () => void
}) {
  const { children, forte, attenzione = false, tono, azione, altri, eventoId, onAzione } = props
  const reduced = useReducedMotion()

  function handleClickAzione() {
    vibra('selection')
    onAzione?.()
  }

  // O1i — a `attenzione` vince sempre il rosso `!` (allarme, anche se il segnale è di origine
  // trial negli ultimi 3 giorni); altrimenti `tono` ambra è lo stato informativo del trial (⏳),
  // il verde `✓` resta il default sereno. `background` è la tinta della CARD F2 (era quella
  // dell'icona in F1).
  const background = attenzione ? 'var(--red-tint)' : tono === 'ambra' ? 'var(--amber-tint)' : 'var(--green-tint)'
  const colore = attenzione ? 'var(--red)' : tono === 'ambra' ? 'var(--amber)' : 'var(--green)'
  const glifo = attenzione ? '!' : tono === 'ambra' ? '⏳' : '✓'

  const icona = (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: DIAMETRO,
        height: DIAMETRO,
        borderRadius: '50%',
        background: 'var(--elv)', // F2 — il disco è la superficie elevata, non più la tinta (era `background` in F1)
        color: colore,
        fontSize: 13,
        fontWeight: tipografia.weight.extrabold,
      }}
    >
      {glifo}
    </span>
  )

  const testo = (
    <span
      style={{
        flex: '1 1 auto',
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: 14.5,
        fontWeight: 500,
        color: 'var(--muted)',
        textAlign: 'left',
      }}
    >
      {forte && (
        <>
          <b style={{ color: 'var(--ink)', fontWeight: 700 }}>{forte}</b>{' '}
        </>
      )}
      {children}
    </span>
  )

  // Task 16b punto 2 — «e un'altra» / «e altre N»: nodo che NON si restringe (flex: none), copy
  // verbatim (mai concatenato in `testo`, che tronca con ellissi CSS a 390px — sarebbe la prima
  // cosa a sparire, perdendo esattamente l'informazione che giustifica la sua esistenza).
  const altriNodo = altri !== undefined && (
    <span style={{ flex: 'none', marginLeft: 4, fontSize: 14.5, fontWeight: 500, color: 'var(--muted)' }}>
      {altri === 1 ? "e un'altra" : `e altre ${altri}`}
    </span>
  )

  // Task 16b punto 4 — SOLO il racconto (eventoId presente + una destinazione reale) è tappabile
  // su tutta la card: allarmi e trial restano com'erano, la CTA sola è l'unico interattivo.
  const tappabileIntera = !!eventoId && !!azione && !attenzione && tono !== 'ambra'

  const { initial, animate } = ingressoStriscia(carattereStriscia(attenzione, tono), reduced)
  const exit = uscitaStriscia(reduced)

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): la CTA (o, nel racconto, l'intera card)
          — unico elemento interattivo di questo componente — lo porta con sé. */}
      <style>{`
        .ds-striscia-stato-azione:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.div
        role="status"
        aria-live="polite"
        initial={initial}
        animate={animate}
        exit={exit}
        style={
          tappabileIntera
            ? { minWidth: 0, background, borderRadius: raggio.riga, border: '1px solid var(--line)' }
            : { display: 'flex', alignItems: 'center', gap: spazio.sm, minWidth: 0, background, borderRadius: raggio.riga, padding: PADDING_CARD, border: '1px solid var(--line)' }
        }
      >
        {tappabileIntera && azione ? (
          <Link
            href={azione.href}
            className="ds-striscia-stato-azione"
            onClick={handleClickAzione}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: spazio.sm,
              minWidth: 0,
              width: '100%',
              boxSizing: 'border-box',
              minHeight: 44,
              padding: PADDING_CARD,
              color: 'inherit',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {icona}
            {testo}
            {altriNodo}
            {/* Chevron — affordance del tap whole-card (mockup .chev), sostituisce il testo
                della CTA: `azione.etichetta` resta la destinazione (href), non compare più come
                testo separato. */}
            <span aria-hidden="true" style={{ flex: 'none', fontSize: 19, fontWeight: 800, color: colore, marginLeft: 2, lineHeight: 1 }}>
              ›
            </span>
          </Link>
        ) : (
          <>
            {icona}
            {testo}
            {altriNodo}
            {azione && (
              <Link
                href={azione.href}
                className="ds-striscia-stato-azione"
                onClick={handleClickAzione}
                style={{
                  flex: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 44,
                  margin: '-13px 0',
                  fontSize: 14.5,
                  fontWeight: 800,
                  color: 'var(--red)',
                  textDecoration: 'none',
                }}
              >
                {azione.etichetta}
              </Link>
            )}
          </>
        )}
      </motion.div>
    </>
  )
}
