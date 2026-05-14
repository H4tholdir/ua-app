'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { t } from '@/design-system/motion'

export type TabId =
  | 'dati'
  | 'lavorazioni'
  | 'clinica'
  | 'produzione'
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
                background: isActive ? '#D4A843' : '#243580',
                color: isActive ? '#0F1E52' : '#8899CC',
                flexShrink: 0,
                boxShadow: isActive
                  ? '0 0 12px hsl(43 65% 55% / 0.25)'
                  : '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
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
