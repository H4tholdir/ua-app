// Stili condivisi per tutti i tab del form lavoro
// Estratti da TabDati.tsx per riuso coerente

import type { CSSProperties } from 'react'

export const inputBase: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#0F1E52',
  border: '1px solid #243580',
  color: '#F0F4FF',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow:
    'inset 3px 3px 8px hsl(230 100% 4% / 0.8), inset -2px -2px 6px hsl(220 80% 35% / 0.4)',
  outline: 'none',
  boxSizing: 'border-box',
}

export const labelStyle: CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: '#8899CC',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

export const fieldStyle: CSSProperties = {
  marginBottom: '18px',
}

export const sectionSeparator: CSSProperties = {
  height: '1px',
  background: '#243580',
  margin: '24px 0',
}

export const sectionTitle: CSSProperties = {
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 700,
  color: '#8899CC',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '16px',
}

export const raisedShadow =
  '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)'

export const insetShadow =
  'inset 3px 3px 8px hsl(230 100% 4% / 0.8), inset -2px -2px 6px hsl(220 80% 35% / 0.4)'
