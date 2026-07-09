'use client'

// DS v3 §5.6 — TastoTondo (back/menu). Back sempre in alto a sinistra, menu
// (☰/⋯) in alto a destra. Nient'altro nell'header.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { tipografia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

/**
 * TastoTondo — back/menu (§5.6).
 *
 * Ø 50, faccia `--card` + `--sh-press`. `etichettaAria` è OBBLIGATORIA: il
 * glifo (‹, ⋯, ☰…) non porta significato da solo per uno screen reader.
 */
export function TastoTondo(props: {
  glifo: ReactNode
  etichettaAria: string
  onClick?: () => void
}) {
  const { glifo, etichettaAria, onClick } = props

  function handleClick() {
    suona('tap')
    vibra('light')
    onClick?.()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9). */}
      <style>{`
        .ds-tasto-tondo:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-tasto-tondo"
        onClick={handleClick}
        aria-label={etichettaAria}
        whileTap={{ y: 2 }}
        transition={molla.press}
        style={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--card)',
          boxShadow: 'var(--sh-press)',
          color: 'var(--ink)',
          fontSize: 20,
          fontWeight: tipografia.weight.extrabold,
          cursor: 'pointer',
        }}
      >
        {glifo}
      </motion.button>
    </>
  )
}
