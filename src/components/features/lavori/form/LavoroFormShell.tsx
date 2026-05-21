'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { t } from '@/design-system/motion'

export type TabId =
  | 'dati'
  | 'accettazione'
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
  { id: 'dati',         label: 'Dati' },
  { id: 'accettazione', label: 'Accett.' },
  { id: 'lavorazioni',  label: 'Prezzi' },
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
  isCreating?: boolean
}

export function LavoroFormShell({
  children,
  defaultTab = 'dati',
  isCreating = false,
}: LavoroFormShellProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  const visibleTabs = isCreating
    ? TABS.filter((tab) => tab.id === 'dati' || tab.id === 'accettazione')
    : TABS

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* Step indicator — visible only in creating mode */}
      {isCreating && (
        <div
          aria-label="Avanzamento creazione lavoro"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px 4px',
            marginBottom: 4,
          }}
        >
          {/* Step 1 — Dati */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              aria-current={activeTab === 'dati' ? 'step' : undefined}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background:
                  activeTab === 'dati'
                    ? 'var(--primary, #D90012)'
                    : 'var(--gold, #D4A843)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              1
            </div>
            <span
              style={{
                fontSize: 13,
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--t2, #96918D)',
                fontWeight: activeTab === 'dati' ? 700 : 400,
              }}
            >
              Dati
            </span>
          </div>

          {/* Connector */}
          <div
            aria-hidden="true"
            style={{
              flex: 1,
              height: 2,
              background: 'var(--prs, #D4CFC9)',
              minWidth: 16,
            }}
          />

          {/* Step 2 — Accettazione */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              aria-current={activeTab === 'accettazione' ? 'step' : undefined}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background:
                  activeTab === 'accettazione'
                    ? 'var(--primary, #D90012)'
                    : 'var(--prs, #D4CFC9)',
                color:
                  activeTab === 'accettazione'
                    ? 'white'
                    : 'var(--t3, #B8B3AE)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              2
            </div>
            <span
              style={{
                fontSize: 13,
                fontFamily: 'DM Sans, sans-serif',
                color: 'var(--t2, #96918D)',
                fontWeight: activeTab === 'accettazione' ? 700 : 400,
              }}
            >
              Accettazione MDR
            </span>
          </div>
        </div>
      )}

      {/* Tab bar with scroll indicator */}
      <div style={{ position: 'relative' }}>
        <div
          role="tablist"
          aria-label="Sezioni lavoro"
          style={{
            display: 'flex',
            gap: '6px',
            padding: '0 20px 12px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {visibleTabs.map((tab) => {
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
                  background: isActive ? 'var(--gold, #D4A843)' : 'var(--elv, #EDEDEA)',
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

        {/* Right-edge gradient scroll indicator — pointer-events:none so tabs stay tappable */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: '12px',
            width: '48px',
            background: 'linear-gradient(to left, var(--bg, #DDD8D3) 0%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Tab content */}
      <div style={{ padding: '0 20px', flex: 1 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`tabpanel-${activeTab}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTab}`}
            initial={{ opacity: 0, transform: 'translateY(6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0, transform: 'translateY(-4px)' }}
            transition={t('fast', 'enter')}
          >
            {children(activeTab)}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
