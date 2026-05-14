'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'
import type { DashboardStats } from '@/types/domain'

interface KpiChip {
  value: number
  label: string
  color: string
  filter: string
  alwaysVisible: boolean
}

interface KpiStripProps {
  stats: DashboardStats
}

export function KpiStrip({ stats }: KpiStripProps) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()

  const chips: KpiChip[] = [
    {
      value: stats.consegne_oggi,
      label: 'Oggi',
      color: '#4C6EF5',
      filter: 'consegne_oggi',
      alwaysVisible: true,
    },
    {
      value: stats.lavori_in_ritardo,
      label: 'Ritardo',
      color: '#FA5252',
      filter: 'in_ritardo',
      alwaysVisible: true,
    },
    {
      value: stats.pronti_non_fatturati,
      label: 'Da fatt.',
      color: '#D4A843',
      filter: 'pronti',
      alwaysVisible: true,
    },
    {
      value: stats.tecnico_piu_saturo?.lavori_attivi ?? 0,
      label: 'Saturo',
      color: '#868E96',
      filter: '',
      alwaysVisible: false,
    },
    {
      value: stats.mdr_incompleti,
      label: 'MDR',
      color: '#FD7E14',
      filter: 'mdr',
      alwaysVisible: false,
    },
    {
      value: stats.spedizioni_in_ritardo,
      label: 'Sped.',
      color: '#FA5252',
      filter: 'sped',
      alwaysVisible: false,
    },
    {
      value: stats.is_rifacimento_count,
      label: 'Rifac.',
      color: '#868E96',
      filter: 'rifac',
      alwaysVisible: false,
    },
    {
      value: stats.stl_non_assegnati,
      label: 'STL',
      color: '#9775FA',
      filter: 'stl',
      alwaysVisible: false,
    },
  ]

  const visibleChips = chips.filter((c) => c.alwaysVisible || c.value > 0)

  function handleChipClick(filter: string) {
    if (!filter) return
    router.push(`/lavori?f=${filter}`)
  }

  return (
    <div
      role="list"
      aria-label="KPI operativi"
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        overflowX: 'auto',
        padding: '0 20px 8px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {visibleChips.map((chip, i) => {
        const isClickable = chip.filter !== ''
        const chipContent = (
          <>
            <span
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '22px',
                fontWeight: 700,
                lineHeight: 1,
                color: chip.color,
              }}
              aria-hidden="true"
            >
              {chip.value}
            </span>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px',
                fontWeight: 500,
                color: '#8899CC',
                lineHeight: 1,
                letterSpacing: '0.02em',
                marginTop: '4px',
              }}
            >
              {chip.label}
            </span>
          </>
        )

        const baseStyle: React.CSSProperties = {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1B2D6B',
          borderRadius: '16px',
          padding: '10px 12px',
          minWidth: '72px',
          flexShrink: 0,
          boxShadow:
            '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
          cursor: isClickable ? 'pointer' : 'default',
          border: 'none',
          WebkitTapHighlightColor: 'transparent',
        }

        const chipElement = isClickable ? (
          <button
            type="button"
            onClick={() => handleChipClick(chip.filter)}
            style={baseStyle}
            aria-label={`${chip.label}: ${chip.value} — vai ai lavori filtrati`}
          >
            {chipContent}
          </button>
        ) : (
          <div
            role="listitem"
            style={baseStyle}
            aria-label={`${chip.label}: ${chip.value}`}
          >
            {chipContent}
          </div>
        )

        if (reducedMotion) {
          return (
            <div key={chip.label} role="listitem">
              {chipElement}
            </div>
          )
        }

        return (
          <motion.div
            key={chip.label}
            role="listitem"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...t('fast', 'enter'), delay: i * 0.04 }}
          >
            {chipElement}
          </motion.div>
        )
      })}
    </div>
  )
}
