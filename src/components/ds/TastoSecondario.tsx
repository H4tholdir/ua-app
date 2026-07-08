'use client'

// DS v3 §5.3 — TastoSecondario, per azioni non primarie ("Apri il lavoro").
// Stessa famiglia fisica del TastoPrimario ma corsa ridotta: è un'azione
// secondaria, non la cosa che conta in questa vista.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { tipografia, raggio } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

/**
 * TastoSecondario — azioni non primarie (§5.3).
 *
 * Per tutto ciò che non è l'unica azione che conta nella vista corrente
 * (quella è il TastoPrimario). Faccia `--card`, non nascosto quando disabled.
 */
export function TastoSecondario(props: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const { children, onClick, disabled = false, type = 'button' } = props

  function handleClick() {
    if (disabled) return
    suona('tap')
    vibra('light')
    onClick?.()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-tasto-secondario:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type={type}
        className="ds-tasto-secondario"
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
        // Corsa ridotta rispetto al TastoPrimario (§5.3): 2px, non 5px — è
        // un'azione secondaria, il feedback fisico resta più discreto.
        whileTap={disabled ? undefined : { y: 2 }}
        transition={molla.press}
        style={{
          height: 58,
          borderRadius: raggio.riga,
          border: 'none',
          background: disabled ? 'var(--bg-deep)' : 'var(--card)',
          boxShadow: disabled ? 'none' : 'var(--sh-press)',
          color: disabled ? 'var(--faint)' : 'var(--ink)',
          fontSize: tipografia.size.body,
          fontWeight: tipografia.weight.bold,
          padding: '0 24px',
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {children}
      </motion.button>
    </>
  )
}
