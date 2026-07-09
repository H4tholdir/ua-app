'use client'

// DS v3 §5.13 — RigaCerca: apre la ricerca fra tutte le opzioni (oltre le poche
// mostrate come TileScelta). Navigazione di sola lettura: apre la tastiera e
// una lista di risultati, non fa nulla da sola — nessun suono, nessuna vibrazione.

import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'

/**
 * RigaCerca — apre la ricerca fra tutte le opzioni (§5.13).
 *
 * H 58 · card 18 · `🔍 Cerca fra tutti i N …` 17/600 `--muted` (N = `totale`,
 * `cosa` = cosa si sta cercando, es. "dentisti"). Ruolo `button`: al tap apre
 * la ricerca (`onApri`) — è navigazione, non un'azione fisica: MAI `suona()`
 * né `vibra()`.
 */
export function RigaCerca(props: { totale: number; cosa: string; onApri: () => void }) {
  const { totale, cosa, onApri } = props

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9). */}
      <style>{`
        .ds-riga-cerca:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-riga-cerca"
        onClick={onApri}
        whileTap={{ y: 1 }}
        transition={molla.press}
        style={{
          width: '100%',
          height: 58,
          display: 'flex',
          alignItems: 'center',
          borderRadius: raggio.riga,
          border: 'none',
          padding: `0 ${spazio.ml}px`,
          background: 'var(--card)',
          boxShadow: 'var(--sh-press)',
          color: 'var(--muted)',
          fontSize: tipografia.size.body,
          fontWeight: tipografia.weight.semibold,
          cursor: 'pointer',
        }}
      >
        🔍 Cerca fra tutti i {totale} {cosa}
      </motion.button>
    </>
  )
}
