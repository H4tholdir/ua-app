// Stili condivisi per tutti i tab del form lavoro
// Estratti da TabDati.tsx per riuso coerente

import type { CSSProperties } from 'react'

export const inputBase: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'var(--bg, #DDD8D3)',
  border: '1px solid rgba(0,0,0,.06)',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow:
    'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))',
  outline: 'none',
  boxSizing: 'border-box',
}

export const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

export const fieldStyle: CSSProperties = {
  marginBottom: '18px',
}

export const sectionSeparator: CSSProperties = {
  height: '1px',
  background: 'rgba(0,0,0,.06)',
  margin: '24px 0',
}

export const sectionTitle: CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '16px',
}

export const raisedShadow =
  'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))'

export const insetShadow =
  'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))'
