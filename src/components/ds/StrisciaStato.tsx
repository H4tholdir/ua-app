'use client'

// DS v3 §5.24 — StrisciaStato (home): riga di stato quieta, sotto le pile.
// Variante default = rassicurazione (check verde: "va tutto bene, guarda").
// Variante `attenzione` = chiede un'azione: icona famiglia rossa al posto
// del check, e il testo passato dal chiamante DEVE iniziare col da farsi
// ("Firma il DdC di n.144 →"). Se tappabile è selezione silenziosa:
// vibra('selection'), MAI suona() — il suono è riservato ai tasti fisici
// che fanno qualcosa, non a un tocco che apre/naviga.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

const DIAMETRO = 26

/**
 * StrisciaStato — riga di stato in home (§5.24).
 *
 * Check Ø 26 tint verde + testo 14.5/`--muted` (i grassetti si passano via
 * `children`, es. `<strong>` colorato `--ink` dal chiamante — il componente
 * non li impone, li lascia passare). Variante `attenzione`: icona famiglia
 * rossa invece del check verde — niente rassicurazione, un da-farsi.
 * `onClick` opzionale: se presente la riga diventa tappabile (`role="button"`
 * via `<button>` nativo), altrimenti resta un `<div>` di sola lettura.
 */
export function StrisciaStato(props: { children: ReactNode; attenzione?: boolean; onClick?: () => void }) {
  const { children, attenzione = false, onClick } = props

  function handleClick() {
    vibra('selection')
    onClick?.()
  }

  const icona = (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: DIAMETRO,
        height: DIAMETRO,
        borderRadius: '50%',
        background: attenzione ? 'var(--red-tint)' : 'var(--green-tint)',
        color: attenzione ? 'var(--red)' : 'var(--green)',
        fontSize: 13,
        fontWeight: tipografia.weight.extrabold,
      }}
    >
      {attenzione ? '!' : '✓'}
    </span>
  )

  const testo = (
    <span
      style={{
        fontSize: 14.5,
        fontWeight: tipografia.weight.semibold,
        color: 'var(--muted)',
        textAlign: 'left',
      }}
    >
      {children}
    </span>
  )

  if (!onClick) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: spazio.s }}>
        {icona}
        {testo}
      </div>
    )
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-striscia-stato:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-striscia-stato"
        onClick={handleClick}
        whileTap={{ scale: 0.99 }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spazio.s,
          width: '100%',
          minHeight: spazio.xxl, // 44 — hit area di legge (constraint 10)
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        {icona}
        {testo}
      </motion.button>
    </>
  )
}
