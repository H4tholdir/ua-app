'use client'

import { useState, useEffect } from 'react'
import { t, useReducedMotion } from '@/design-system/motion'
import { motion, AnimatePresence } from 'motion/react'

const DS = {
  prs:  'var(--prs, #D4CFC9)',
  elv:  'var(--elv, #EDEDEA)',
  t1:   'var(--t1, #1C1916)',
  t2:   'var(--t2, #4A3D33)',
  shB: 'var(--sh-b)',
  shI: 'var(--sh-i)',
} as const

type DashView = 'gestione' | 'produzione'

interface DashboardShellProps {
  defaultView?: DashView
  renderGestione: React.ReactNode
  renderProduzione: React.ReactNode
  showTabs?: boolean
}

export function DashboardShell({
  defaultView = 'produzione',
  renderGestione,
  renderProduzione,
  showTabs = true,
}: DashboardShellProps) {
  const reduced = useReducedMotion()
  const [view, setView] = useState<DashView>(() => {
    if (typeof window === 'undefined') return defaultView
    const stored = localStorage.getItem('ua-dashboard-view')
    return (stored === 'gestione' || stored === 'produzione') ? stored : defaultView
  })

  useEffect(() => {
    localStorage.setItem('ua-dashboard-view', view)
  }, [view])

  if (!showTabs) {
    return <>{renderGestione}</>
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Vista dashboard"
        style={{
          margin: '0 14px 12px',
          background: DS.prs,
          borderRadius: '15px',
          padding: '3px',
          display: 'flex',
          boxShadow: DS.shI,
        }}
      >
        {(['gestione', 'produzione'] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={view === v}
            aria-controls={`panel-${v}`}
            onClick={() => setView(v)}
            style={{
              flex: 1,
              padding: '7px 5px',
              borderRadius: '12px',
              fontSize: '10.5px',
              fontWeight: 600,
              fontFamily: 'DM Sans, sans-serif',
              textAlign: 'center',
              color: view === v ? DS.t1 : DS.t2,
              background: view === v ? DS.elv : 'transparent',
              boxShadow: view === v ? DS.shB : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all .15s cubic-bezier(.2,0,0,1)',
              WebkitTapHighlightColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {v === 'gestione' ? (
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="1" y="1" width="5" height="5" rx="1"/><rect x="8" y="1" width="5" height="5" rx="1"/><rect x="1" y="8" width="5" height="5" rx="1"/><rect x="8" y="8" width="5" height="5" rx="1"/></svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 4h10M2 7h7M2 10h5"/></svg>
              )}
              {v === 'gestione' ? 'Gestione' : 'Produzione'}
            </span>
            <small style={{ display: 'block', fontSize: '8px', opacity: .5, fontWeight: 400, marginTop: '1px' }}>
              {v === 'gestione' ? 'business' : 'i miei lavori'}
            </small>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          id={`panel-${view}`}
          role="tabpanel"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? {} : { opacity: 0 }}
          transition={reduced ? { duration: 0 } : t('fast', 'enter')}
        >
          {view === 'gestione' ? renderGestione : renderProduzione}
        </motion.div>
      </AnimatePresence>
    </>
  )
}
