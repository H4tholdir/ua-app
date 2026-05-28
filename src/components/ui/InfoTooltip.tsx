'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { t } from '@/design-system/motion'

interface InfoTooltipProps {
  text: string
  position?: 'top' | 'bottom'
}

export function InfoTooltip({ text, position = 'top' }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span
      style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle', marginLeft: 4 }}
    >
      <button
        type="button"
        aria-label="Informazione aggiuntiva"
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: 'var(--prs, #D4CFC9)',
          border: 'none', cursor: 'pointer',
          fontSize: 11, color: 'var(--t2, #4A3D33)',
          fontWeight: 700, lineHeight: '18px',
          textAlign: 'center', padding: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        ?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, y: position === 'top' ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: position === 'top' ? 4 : -4 }}
            transition={t('fast', 'enter')}
            style={{
              position: 'absolute',
              [position === 'top' ? 'bottom' : 'top']: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--t1, #1C1916)',
              color: 'var(--bg, #DDD8D3)',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.5,
              width: 240,
              zIndex: 200,
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              fontFamily: 'DM Sans, sans-serif',
              pointerEvents: 'none',
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
