'use client'

// DS v3 §5.1 — TastoPrimario, il tasto fisico. Componente di bandiera del
// design system: corsa fisica, molla di pressione, suono e haptic.
// UNO per schermata, massimo — regola di prodotto, non applicabile a runtime.

import { useEffect, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, tipografia, raggio, spazio } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

// Corsa fisica (§5.1): 6px a riposo, 1px premuto — ombra ambiente (--sh-card)
// sempre presente, la faccia è var(--red-dark) pinnato come corsa del tasto.
const CORSA_RIPOSO = '0 6px 0 var(--red-dark), var(--sh-card)'
const CORSA_PREMUTA = '0 1px 0 var(--red-dark), var(--sh-card)'

/**
 * TastoPrimario — il tasto fisico (§5.1).
 *
 * UNO per schermata, massimo: è l'unica azione che conta in quella vista
 * ("CONSEGNA", "FATTO", "RIORDINA" — sempre un verbo del banco).
 * Non è mai nascosto quando disabilitato: mostra sempre la faccia spenta
 * e la riga che spiega cosa manca.
 */
export function TastoPrimario(props: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  motivoDisabilitato?: string
  type?: 'button' | 'submit'
}) {
  const { children, onClick, disabled = false, motivoDisabilitato, type = 'button' } = props

  useEffect(() => {
    if (disabled && !motivoDisabilitato && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[TastoPrimario] disabled senza motivoDisabilitato — la riga che spiega cosa manca (§5.1) resterebbe vuota.'
      )
    }
  }, [disabled, motivoDisabilitato])

  function handleClick() {
    if (disabled) return
    suona('tap')
    vibra('medium')
    onClick?.()
  }

  return (
    <div style={{ width: '100%', maxWidth: 480 }}>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato, non dipende dal CSS del catalogo. */}
      <style>{`
        .ds-tasto-primario { height: 70px; }
        @media (min-width: 1024px) {
          .ds-tasto-primario { height: 60px; }
        }
        .ds-tasto-primario:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type={type}
        className="ds-tasto-primario"
        onClick={handleClick}
        disabled={disabled}
        aria-disabled={disabled}
        whileTap={disabled ? undefined : { y: 5, scale: 0.995, boxShadow: CORSA_PREMUTA }}
        transition={molla.press}
        style={{
          width: '100%',
          borderRadius: raggio.tasto,
          border: 'none',
          background: disabled ? 'var(--bg-deep)' : gradiente.tastoPrimario,
          color: disabled ? 'var(--faint)' : 'white',
          fontSize: tipografia.size.heading,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          boxShadow: disabled ? 'none' : CORSA_RIPOSO,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        {children}
      </motion.button>
      {disabled && motivoDisabilitato && (
        <p
          style={{
            fontSize: tipografia.size.callout,
            color: 'var(--muted)',
            margin: `${spazio.s}px 0 0`,
          }}
        >
          {motivoDisabilitato}
        </p>
      )}
    </div>
  )
}
