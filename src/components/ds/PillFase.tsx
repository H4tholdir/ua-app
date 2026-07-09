'use client'

// DS v3 §5.4 — PillFase: chiude una fase del lavoro ("FATTA ✓"). Non è il
// TastoPrimario (l'unica azione che conta nella vista): è la spunta di una
// fase intermedia, corsa fisica più corta, sulla stessa famiglia "verde fatto".

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, raggio, spazio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

// Corsa fisica (§5.4): 3px a riposo, 1px premuto — stessa proporzione della
// corsa del TastoPrimario (§5.1: 6px→1px), scalata alla pill più piccola.
const CORSA_RIPOSO = `0 3px 0 ${gradiente.corsaPillFase}`
const CORSA_PREMUTA = `0 1px 0 ${gradiente.corsaPillFase}`

/**
 * PillFase — chiude una fase del lavoro (§5.4), es. «FATTA ✓».
 *
 * È un componente cliccabile: corsa fisica 3px, molla di pressione, suono
 * "fatta" + haptic di successo. Sempre `gradiente.pillFase` (verde) — non
 * c'è variante di famiglia: "fatta" ha un solo colore.
 */
export function PillFase(props: { onClick: () => void; children?: ReactNode }) {
  const { onClick, children = 'FATTA ✓' } = props

  function handleClick() {
    suona('fatta')
    vibra('success')
    onClick()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-pill-fase:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-pill-fase"
        onClick={handleClick}
        whileTap={{ y: 2, boxShadow: CORSA_PREMUTA }}
        transition={molla.press}
        style={{
          height: 44,
          borderRadius: raggio.pill,
          border: 'none',
          padding: `0 ${spazio.l}px`,
          background: gradiente.pillFase,
          color: testoSuFaccia,
          fontSize: 14.5,
          fontWeight: tipografia.weight.extrabold,
          boxShadow: CORSA_RIPOSO,
          cursor: 'pointer',
        }}
      >
        {children}
      </motion.button>
    </>
  )
}
