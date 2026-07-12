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
}) {
  const { children, selezionata, onClick, ariaExpanded } = props

  function handleClick() {
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
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        transition={molla.press}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minHeight: 48,
          padding: '0 20px',
          borderRadius: raggio.pill,
          border: 'none',
          background: selezionata ? 'var(--green-tint)' : 'var(--card)',
          boxShadow: selezionata ? 'none' : 'var(--sh-press)',
          color: selezionata ? 'var(--green)' : 'var(--ink)',
          fontFamily: tipografia.famiglia,
          fontSize: 16,
          fontWeight: tipografia.weight.bold,
          cursor: 'pointer',
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
