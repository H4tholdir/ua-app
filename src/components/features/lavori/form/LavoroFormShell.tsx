'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { t } from '@/design-system/motion'

export type TabId =
  | 'dati'
  | 'lavorazioni'
  | 'clinica'
  | 'produzione'
  | 'prove'
  | 'date'
  | 'immagini'
  | 'documenti'

interface Tab {
  id: TabId
  label: string
}

const TABS: Tab[] = [
  { id: 'dati',       label: 'Dati' },
  { id: 'lavorazioni', label: 'Prezzi' },
  { id: 'clinica',    label: 'Clinica' },
  { id: 'produzione', label: 'Prod.' },
  { id: 'prove',      label: 'Prove' },
  { id: 'date',       label: 'Date' },
  { id: 'immagini',   label: 'Foto' },
  { id: 'documenti',  label: 'Docs' },
]

interface LavoroFormShellProps {
  children: (activeTab: TabId) => React.ReactNode
  defaultTab?: TabId
}

export function LavoroFormShell({
  children,
  defaultTab = 'dati',
}: LavoroFormShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Sezioni lavoro"
        style={{
          display: 'flex',
          gap: '6px',
          padding: '0 20px 12px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '36px',
                minHeight: '52px',
                padding: '0 16px',
                borderRadius: '10px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? '#D4A843' : 'var(--elv, #EDEDEA)',
                color: isActive ? 'var(--t1, #1C1916)' : 'var(--t2, #96918D)',
                flexShrink: 0,
                boxShadow: isActive
                  ? '0 0 12px hsl(43 65% 55% / 0.25)'
                  : 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
                transition: `background ${t('fast').duration}s, color ${t('fast').duration}s`,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 20px', flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={t('fast', 'enter')}
          >
            {children(activeTab)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
