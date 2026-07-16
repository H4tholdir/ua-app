'use client'

// DS v3 §5.30 — RigaBloccante: riga tappabile dello sheet «Prima di
// consegnare» (mockup consegna.html `.bloccante` = legge). SOLO i bloccanti
// veri (MDR/materiali §8) — MAI un «Sei sicuro?» generico. Ambra = «manca
// qualcosa di verificabile»; il tap porta DOVE si risolve.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { raggio, tipografia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

// Triangolo line-icon stroke 3 — stessa fonte della StrisciaStato (home.html).
const TRIANGOLO = (
  <svg viewBox="0 0 24 24" width={19} height={19} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3 2.5 20.5h19L12 3Z" />
    <path d="M12 10v4" />
    <path d="M12 17.5v.01" />
  </svg>
)

export function RigaBloccante(props: { cosa: string; cosaFare: string; icona?: ReactNode; onTap: () => void }) {
  const { cosa, cosaFare, icona = TRIANGOLO, onTap } = props

  function handleClick() {
    suona('tap')
    vibra('medium')
    onTap()
  }

  return (
    <>
      <style>{`
        .ds-riga-bloccante:focus-visible { outline: 2px solid var(--blue); outline-offset: 2px; }
      `}</style>
      <motion.button
        type="button"
        className="ds-riga-bloccante"
        onClick={handleClick}
        whileTap={{ y: 2 }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          padding: '16px 18px',
          border: 'none',
          borderRadius: raggio.riga,
          background: 'var(--amber-tint)',
          color: 'var(--ink)',
          fontFamily: tipografia.famiglia,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden="true"
          style={{ flex: 'none', width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--amber-tint)', color: 'var(--amber)' }}
        >
          {icona}
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 16, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}>{cosa}</span>
          <span style={{ fontSize: 14, fontWeight: tipografia.weight.bold, color: 'var(--amber)', marginTop: 2 }}>{cosaFare}</span>
        </span>
        <span aria-hidden="true" style={{ flex: 'none', color: 'var(--amber)', fontSize: 20, fontWeight: tipografia.weight.extrabold }}>{'›'}</span>
      </motion.button>
    </>
  )
}
