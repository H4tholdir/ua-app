'use client'

// DS v3 §5.34 — MenuVoce: la voce del menu ⋯ (mockup scheda-lavoro.html
// `.menu-voce` = legge). Min-height 56 · icona Ø38 radius 11 tint neutra ·
// testo body/700 --ink · chevron --faint. Variante `butta` (distruttiva):
// rossa, icona --red-tint/--red. I SEPARATORI (bordi/margini posizionali)
// NON vivono qui: li possiede il contenitore, che conosce la posizione.
// `icona` riceve i <path> grezzi: il tag <svg> con stroke/linecap vive UNA
// volta qui (stesso schema di MenuSchedaSheet pre-estrazione).

import type { ReactNode } from 'react'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'

export function MenuVoce(props: {
  icona: ReactNode
  testo: string
  nota?: string
  butta?: boolean
  disabled?: boolean
  onTap?: () => void
}) {
  const { icona, testo, nota, butta = false, disabled = false, onTap } = props

  return (
    <button
      type="button"
      className="ds-tap-v3"
      disabled={disabled}
      onClick={onTap}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spazio.m,
        width: '100%',
        minHeight: 56,
        padding: `${spazio.xs + 4}px 0`,
        // borderStyle (non `border` shorthand): jsdom/cssstyle serializza
        // `border: 'none'` come `borderTop === 'medium'` (bug della libreria,
        // vedi test §5.34 "NESSUN bordo proprio" — verificato con probe
        // dedicato prima di questa scelta). `borderStyle: 'none'` produce lo
        // stesso risultato visivo (nessun bordo, spec CSS) senza il quirk.
        borderStyle: 'none',
        background: 'none',
        color: butta ? 'var(--red)' : 'var(--ink)',
        fontFamily: tipografia.famiglia,
        fontSize: tipografia.size.body,
        fontWeight: tipografia.weight.bold,
        textAlign: 'left',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 38,
          height: 38,
          borderRadius: raggio.riga - 7,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: butta ? 'var(--red-tint)' : 'var(--bg-deep)',
          color: butta ? 'var(--red)' : 'var(--muted)',
        }}
      >
        <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
          {icona}
        </svg>
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span>{testo}</span>
        {nota && (
          <span style={{ fontSize: 13.5, fontWeight: tipografia.weight.semibold, color: 'var(--red)' }}>{nota}</span>
        )}
      </span>
      {!disabled && (
        <span aria-hidden="true" style={{ color: 'var(--faint)', fontSize: 20, fontWeight: tipografia.weight.extrabold }}>{'›'}</span>
      )}
    </button>
  )
}
