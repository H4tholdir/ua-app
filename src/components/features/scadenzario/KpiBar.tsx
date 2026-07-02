'use client'

import { motion } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { DS, fmt } from './estratto-conto-shared'

interface KpiBarProps {
  saldo_insoluto: number
  totale_fatture: number
  fatture_pagate_count: number
}

export function KpiBar({ saldo_insoluto, totale_fatture, fatture_pagate_count }: KpiBarProps) {
  const reducedMotion = useReducedMotion()
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      margin: '0 16px 20px',
    }}>
      <KpiCard
        label="Insoluto"
        value={fmt.format(saldo_insoluto)}
        color={saldo_insoluto > 0 ? DS.red : DS.green}
        sub={saldo_insoluto > 0 ? 'da incassare' : 'tutto pagato'}
        reducedMotion={reducedMotion}
      />
      <KpiCard
        label="Fatture"
        value={String(totale_fatture)}
        color={DS.t1}
        sub="totali"
        reducedMotion={reducedMotion}
      />
      <KpiCard
        label="Pagate"
        value={String(fatture_pagate_count)}
        color={DS.green}
        sub={`su ${totale_fatture}`}
        reducedMotion={reducedMotion}
      />
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
        padding: '12px 10px',
        boxShadow: DS.shB,
        textAlign: 'center',
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
        fontSize: 17,
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
