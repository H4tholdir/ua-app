'use client'

// DS v3 §5.23 — NotaDentista: una nota "a voce" del dentista dentro un lavoro
// (un dubbio, una richiesta particolare…). È l'UNICO residuo visivo del
// mondo-chat dentro l'app — non introduce mai un thread di conversazione:
// solo una citazione breve, con un tap opzionale che la apre per intero (es.
// in uno sheet — responsabilità del chiamante, non di questo componente).

import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { spazio } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

const LARGHEZZA_BARRA = 3.5

/**
 * NotaDentista — citazione breve del dentista (§5.23).
 *
 * Barra verticale 3.5 `--blue` + testo 15/600 `--muted`: `"[citazione]" — Dr.
 * X`, massimo 2 righe (CSS line-clamp — mai troncato senza indizio visivo).
 * Tap → `onEspandi` (se passato): selezione silenziosa, `vibra('selection')`,
 * MAI `suona()` — apre/mostra per intero, non fa nulla di per sé.
 */
export function NotaDentista(props: { citazione: string; dottore: string; onEspandi?: () => void }) {
  const { citazione, dottore, onEspandi } = props

  function handleClick() {
    vibra('selection')
    onEspandi?.()
  }

  const barra = (
    <span
      aria-hidden="true"
      style={{
        flexShrink: 0,
        width: LARGHEZZA_BARRA,
        alignSelf: 'stretch',
        borderRadius: 2,
        background: 'var(--blue)',
      }}
    />
  )

  const testo = (
    <span
      style={{
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--muted)',
        textAlign: 'left',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      &quot;{citazione}&quot; — {dottore}
    </span>
  )

  if (!onEspandi) {
    return (
      <div style={{ display: 'flex', gap: spazio.s }}>
        {barra}
        {testo}
      </div>
    )
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-nota-dentista:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-nota-dentista"
        onClick={handleClick}
        whileTap={{ scale: 0.99 }}
        transition={molla.press}
        style={{
          display: 'flex',
          gap: spazio.s,
          width: '100%',
          minHeight: spazio.xxl, // 44 — hit area di legge (constraint 10)
          border: 'none',
          background: 'transparent',
          padding: 0,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {barra}
        {testo}
      </motion.button>
    </>
  )
}
