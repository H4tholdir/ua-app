'use client'

import { motion } from 'motion/react'
import { t, staggerDelay } from '@/design-system/motion'
import type { FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, urgencyColor, urgencyEmoji, urgencyLabel, urgencyPillBg, urgencyPillBorder } from './estratto-conto-shared'

interface FatturaCardProps {
  fattura: FatturaEstratto
  index: number
  onTap: (f: FatturaEstratto) => void
  reducedMotion: boolean
}

export function FatturaCard({ fattura, index, onTap, reducedMotion }: FatturaCardProps) {
  const color = urgencyColor(fattura)
  const delay = Math.min(index * staggerDelay(8), 0.25)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={reducedMotion ? { duration: 0 } : { ...t('normal', 'enter'), delay }}
    >
      <button
        type="button"
        onClick={() => onTap(fattura)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '14px 16px',
          background: DS.sfc,
          borderRadius: 16,
          boxShadow: DS.shB,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'DM Sans, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={`Fattura ${fattura.numero} — ${fmt.format(fattura.totale)} — ${urgencyLabel(fattura)}`}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 56,
          padding: '6px 8px',
          background: urgencyPillBg(fattura),
          border: urgencyPillBorder(fattura),
          borderRadius: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{urgencyEmoji(fattura)}</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 9,
            fontWeight: 700,
            color,
            marginTop: 3,
            textAlign: 'center',
            letterSpacing: '0.03em',
          }}>
            {urgencyLabel(fattura)}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: DS.t1,
            marginBottom: 2,
          }}>
            N. {fattura.numero}
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: DS.t2,
          }}>
            {formatData(fattura.data)}
            {!fattura.pagata && (
              <span style={{ marginLeft: 4, color }}>
                · {fattura.giorni_ritardo}gg
              </span>
            )}
          </div>
        </div>

        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {fmt.format(fattura.totale)}
        </div>
      </button>
    </motion.div>
  )
}
