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
 * (quella è il TastoPrimario). Non nascosto quando disabled.
 *
 * Emendamento §5.3 (ratifica Francesco 20/07/2026, mockup
 * `2026-07-20-tasto-secondario-dark-su-card.html` — light variante C, dark
 * variante A): la faccia `--card` era invisibile in dark quando il tasto è
 * montato DENTRO una card (stesso colore della superficie, `--sh-press: none`
 * — bug QA ondata A, pre-esistente da P4). Ora: faccia `--elv` (in light
 * `--elv ≡ --card`, nessun cambio) + bordo pieno 1.5 `--line` in light; in
 * dark il bordo pieno sparisce e resta la faccia elevata (§3.2 «elevazione =
 * superficie più chiara») con la hairline superiore delle facce premibili.
 * Il bordo light vive nel CSS di componente (non inline: l'override per tema
 * non batterebbe uno stile inline); l'override dark (hairline) vive in
 * `src/app/ds-v3.css` accanto alla regola gemella di `.ds-card` — il valore
 * raw della hairline è ammesso SOLO lì (guard check-ds, §3/§13.2).
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
        .ds-tasto-secondario:not(:disabled) {
          border: 1.5px solid var(--line);
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
          // Bordo di legge nel CSS di componente sopra (mai inline: il tema
          // dark lo toglie via selettore); disabled resta senza bordo.
          border: disabled ? 'none' : undefined,
          background: disabled ? 'var(--bg-deep)' : 'var(--elv)',
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
