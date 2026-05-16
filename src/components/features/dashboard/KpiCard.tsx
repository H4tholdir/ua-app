'use client'

import { motion } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'

// Design tokens — warm haptimorphic (DS v2.2)
const DS = {
  elv:     '#EDEDEA',
  primary: '#D90012',
  t2:      '#96918D',
  shC: 'inset 0 1px 0 rgba(255,255,255,.88), inset 0 -1px 2px rgba(0,0,0,.04), -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40), 3px 5px 10px -2px rgba(148,128,118,.22)',
  shI: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
}

interface KpiCardProps {
  value: number
  label: string
  color: string
  active?: boolean
  onClick?: () => void
  animationDelay?: number
}

export function KpiCard({
  value,
  label,
  color,
  active,
  onClick,
  animationDelay = 0,
}: KpiCardProps) {
  const reducedMotion = useReducedMotion()

  const chipStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: active ? DS.primary : DS.elv,
    borderRadius: '16px',
    padding: '16px 14px',
    minWidth: '76px',
    minHeight: '64px',
    border: 'none',
    cursor: onClick ? 'pointer' : 'default',
    boxShadow: active ? DS.shI : DS.shC,
    transition: 'box-shadow 0.18s cubic-bezier(0.2,0,0,1), background 0.18s, transform 80ms ease',
    WebkitTapHighlightColor: 'transparent',
    flexShrink: 0,
  }

  const chipInner = (
    <>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          color: active ? '#fff' : color,
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: active ? 'rgba(255,255,255,.85)' : DS.t2,
          marginTop: '5px',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        {label}
      </span>
    </>
  )

  const chip = onClick ? (
    <button
      type="button"
      onClick={onClick}
      style={chipStyle}
      aria-label={`${label}: ${value}${active ? ' (filtro attivo)' : ''}`}
      aria-pressed={active}
    >
      {chipInner}
    </button>
  ) : (
    <div
      role="img"
      style={chipStyle}
      aria-label={`${label}: ${value}`}
    >
      {chipInner}
    </div>
  )

  if (reducedMotion) return chip

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...t('fast', 'enter'), delay: animationDelay }}
    >
      {chip}
    </motion.div>
  )
}
