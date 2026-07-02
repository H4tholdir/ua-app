// src/components/features/scadenzario/KpiBar.tsx
'use client'

import { motion } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { DS, fmt } from './estratto-conto-shared'

interface KpiBarProps {
  confermato: number
  potenziale: number
  disponibile: number
  totale: number
}

export function KpiBar({ confermato, potenziale, disponibile, totale }: KpiBarProps) {
  const reducedMotion = useReducedMotion()
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 8,
      margin: '0 16px 20px',
    }}>
      <KpiCard label="Totale dovuto" value={fmt.format(totale)} color={totale > 0 ? DS.red : DS.green} sub="confermato + potenziale" reducedMotion={reducedMotion} />
      <KpiCard label="Credito confermato" value={fmt.format(confermato)} color={DS.t1} sub="fatture + lavori decisi" reducedMotion={reducedMotion} />
      <KpiCard label="Credito potenziale" value={fmt.format(potenziale)} color={DS.gold} sub="lavori in attesa" reducedMotion={reducedMotion} />
      <KpiCard label="Credito disponibile" value={fmt.format(disponibile)} color={disponibile > 0 ? DS.green : DS.t3} sub="a favore del cliente" reducedMotion={reducedMotion} />
    </div>
  )
}

function KpiCard({ label, value, color, sub, reducedMotion }: { label: string; value: string; color: string; sub: string; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : motionTokens.spring.gentle}
      style={{
        background: DS.sfc,
        borderRadius: 16,
        padding: '14px 12px',
        boxShadow: DS.shB,
        textAlign: 'left',
      }}
    >
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        fontWeight: 700,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 18,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
        marginBottom: 2,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        color: DS.t2,
      }}>
        {sub}
      </div>
    </motion.div>
  )
}
