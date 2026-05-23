'use client'

import Link from 'next/link'

type KpiColor = 'red' | 'blue' | 'gold' | 'green' | 'grey'

const COLOR_MAP: Record<KpiColor, string> = {
  red:   'var(--primary, #D90012)',
  blue:  'var(--info, #5A5FCC)',
  gold:  'var(--gold, #D4A843)',
  green: 'var(--success, #3DCB5C)',
  grey:  'var(--t2, #96918D)',
}

const DS = {
  sfc:  'var(--sfc, #E4DFD9)',
  t2:   'var(--t2, #96918D)',
  t3:   'var(--t3, #B8B3AE)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
} as const

export interface KpiCardProps {
  valore: number
  label: string
  azione: string
  colore: KpiColor
  href: string
}

export function KpiCard({ valore, label, azione, colore, href }: KpiCardProps) {
  const isZero = valore === 0
  const numColor = isZero ? DS.t2 : COLOR_MAP[colore]

  const cardStyle: React.CSSProperties = {
    background: DS.sfc,
    borderRadius: '16px',
    padding: '12px 13px',
    boxShadow: DS.shB,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'transform .12s cubic-bezier(.2,0,0,1), box-shadow .12s cubic-bezier(.2,0,0,1)',
    cursor: isZero ? 'default' : 'pointer',
    pointerEvents: isZero ? 'none' : 'auto',
    textDecoration: 'none',
  }

  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span
          data-testid="kpi-valore"
          aria-hidden="true"
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '38px',
            fontWeight: 300,
            lineHeight: 1,
            color: numColor,
          }}
        >
          {valore}
        </span>
        {!isZero && (
          <span style={{ fontSize: '12px', color: DS.t3, marginTop: '4px' }}>›</span>
        )}
      </div>
      <span style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        fontWeight: 600,
        color: DS.t2,
        marginTop: '2px',
        lineHeight: 1.3,
      }}>
        {label}
      </span>
      {!isZero && (
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '9.5px',
          color: DS.t3,
          marginTop: '3px',
        }}>
          {azione}
        </span>
      )}
    </>
  )

  if (isZero) {
    return (
      <div style={cardStyle} aria-label={`${valore} ${label}`}>
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={href}
      style={cardStyle}
      aria-label={`${valore} ${label} — ${azione}`}
    >
      {inner}
    </Link>
  )
}
