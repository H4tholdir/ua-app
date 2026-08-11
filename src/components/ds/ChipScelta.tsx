'use client'

// DS v3 §5.31 — ChipScelta: chip di decisione rapida del wizard. Un solo
// posto per questa anatomia (decisione W2): CampoData (§5.27) e lo sheet
// «Cambia data» del Frame «Fatto!» (§7.3) la consumano invece di ridisegnarla.
//
// Selezionata: sfondo `--green-tint` + testo `--green` + check ✓ (SVG inline,
// stroke 3, `aria-hidden`) — MAI solo il colore (L3: colore + segno insieme).
// Non selezionata: faccia `--card` + `--sh-press`, come i tasti gemelli.
// `vibra('selection')` a ogni tap: è una scelta silenziosa, mai un suono.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { tipografia, raggio } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

/**
 * ChipScelta — chip di decisione rapida (§5.31).
 *
 * `ariaExpanded` è opzionale (non nell'anatomia di legge §5.31): copre il
 * caso «Scegli…» di CampoData, che rivela un `<input type="date">` sotto —
 * senza, quella singola pill perderebbe l'unico segnale a11y del suo stato.
 */
export function ChipScelta(props: {
  children: ReactNode
  selezionata: boolean
  onClick: () => void
  ariaExpanded?: boolean
  /**
   * La voce esiste ma su QUESTO percorso non si può scegliere.
   *
   * 🔑 PERCHÉ SPENTA E NON TOLTA. Una risposta che sparisce lascia chi la
   * cercava senza sapere se esista: la si vede, non si preme, e la ragione la
   * scrive il chiamante accanto al gruppo (D262 — un rifiuto indica la strada).
   * ⚠️ È additiva: senza questa proprietà il componente si comporta esattamente
   * come prima, e nessuno dei consumatori esistenti cambia resa.
   * 🛑 Spenta non vibra: `vibra('selection')` è la conferma di una selezione
   * avvenuta, e qui non avviene niente.
   */
  disabilitata?: boolean
}) {
  const { children, selezionata, onClick, ariaExpanded, disabilitata = false } = props

  function handleClick() {
    if (disabilitata) return
    vibra('selection')
    onClick()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-chip-scelta:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-chip-scelta"
        aria-pressed={selezionata}
        aria-expanded={ariaExpanded}
        disabled={disabilitata}
        aria-disabled={disabilitata}
        onClick={handleClick}
        whileTap={disabilitata ? undefined : { scale: 0.97 }}
        transition={molla.press}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 48,
          padding: '0 20px',
          borderRadius: raggio.pill,
          border: 'none',
          // 🔴 SPENTA NON VUOL DIRE ASSENTE, e togliere l'ombra non basta —
          //    misurato allo scatto del gate L2 del Task 9, 390 chiaro. La
          //    pillola viva è `--card` + `--sh-press`, ma il pannello del foglio
          //    È anch'esso `--card`: senza ombra restava **solo il testo**,
          //    sospeso. È la QUARTA replica dello stesso difetto in questo
          //    progetto (v. `ds-v3.css`, la regola su `.ds-medico-riga` /
          //    `.ds-via-d212`), e stavolta arriva dal lato chiaro.
          // ➡️ Una pillola spenta resta una SUPERFICIE, e per giunta INCASSATA:
          //    `--fondo-superficie` è più scuro del pannello in tutti e due i
          //    temi, quindi il racconto fisico è coerente — viva = sollevata,
          //    spenta = affondata. E il fondo non si scrive qui: è il token che
          //    D329 ha già introdotto per le superfici dentro un foglio.
          background: disabilitata
            ? 'var(--fondo-superficie)'
            : selezionata ? 'var(--green-tint)' : 'var(--card)',
          boxShadow: disabilitata ? 'none' : selezionata ? 'none' : 'var(--sh-press)',
          color: disabilitata ? 'var(--faint)' : selezionata ? 'var(--green)' : 'var(--ink)',
          fontFamily: tipografia.famiglia,
          fontSize: 16,
          fontWeight: tipografia.weight.bold,
          cursor: disabilitata ? 'default' : 'pointer',
        }}
      >
        {selezionata && (
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7.5L5.5 10.5L11.5 3.5"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {children}
      </motion.button>
    </>
  )
}
