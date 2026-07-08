'use client'

// DS v3 §5.2 — TastoPiu, l'otturatore della home. Vive SOLO in basso al centro
// della home (L1): è il modo in cui si apre un nuovo lavoro. Il morph di
// questo tasto dentro il wizard (coreografia §8.3.2) è del sotto-progetto 3
// — qui c'è SOLO il comportamento fisico della pressione.

import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, materia, spazio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

/**
 * TastoPiu — l'otturatore della home (§5.2).
 *
 * Anatomia di legge: Ø 92 visibile dentro una hit area invisibile di Ø 110
 * (padding trasparente), anello guida a -9px dalla faccia (2px, tinta
 * neutra calda) che disegna il bordo reale del tocco, faccia con gradiente
 * radiale (luce a 35%/30%), glifo "+" bianco, etichetta sotto. Pressione
 * fisica (molla.press, scala .94) + suono "tap" + vibrazione media —
 * nient'altro: non anima da sola, non cambia forma qui.
 */
export function TastoPiu(props: { onClick: () => void; etichetta?: string }) {
  const { onClick, etichetta = 'Nuovo lavoro' } = props

  function handleClick() {
    suona('tap')
    vibra('medium')
    onClick()
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: spazio.s }}>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato, non dipende dal CSS del catalogo. */}
      <style>{`
        .ds-tasto-piu:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-tasto-piu"
        onClick={handleClick}
        aria-label={etichetta}
        whileTap={{ scale: 0.94 }}
        transition={molla.press}
        style={{
          position: 'relative',
          width: 110,
          height: 110,
          padding: 0,
          border: 'none',
          background: 'transparent',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        {/* Anello guida (§5.2): -9px dalla faccia (92 → 110 = hit area),
            2px, disegna il bordo reale del tocco senza portare significato. */}
        <span
          aria-hidden="true"
          data-parte="anello-guida"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid ${materia.anelloGuidaTastoPiu}`,
          }}
        />
        {/* Faccia visibile Ø 92 — gradiente radiale di legge. */}
        <span
          aria-hidden="true"
          data-parte="faccia"
          style={{
            position: 'relative',
            width: 92,
            height: 92,
            borderRadius: '50%',
            background: gradiente.tastoPiu,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 44,
            fontWeight: 300,
            lineHeight: 1,
            color: testoSuFaccia,
          }}
        >
          +
        </span>
      </motion.button>
      <span
        style={{
          fontSize: 17.5,
          fontWeight: tipografia.weight.extrabold,
          color: 'var(--ink)',
        }}
      >
        {etichetta}
      </span>
    </div>
  )
}
