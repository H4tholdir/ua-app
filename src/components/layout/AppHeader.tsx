'use client'

// Direttiva permanente 22/07/2026 (CLAUDE.md §9): il back torna alla pagina PRECEDENTE
// (tornaIndietro), non più un Link statico verso `backHref` — che resta solo il fallback
// per quando non c'è storia di navigazione (deep-link, shortcut PWA, notifica push).
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { tornaIndietro } from '@/lib/nav/torna-indietro'
import { ThemeToggleButton } from './ThemeToggleButton'
import { SyncBadge } from './SyncBadge'

// Design tokens v2.2 — warm panna palette
const DS = {
  elv:     'var(--elv, #EDEDEA)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #4A3D33)',
  shB: 'var(--sh-b)',
} as const

interface AppHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  actions?: ReactNode
  showThemeToggle?: boolean
  lastUpdatedAt?: Date | null
}

export function AppHeader({ title, subtitle, backHref, actions, showThemeToggle = true, lastUpdatedAt }: AppHeaderProps) {
  const router = useRouter()
  // Always add 64px right padding to leave space for the fixed UserProfileSheet avatar (right:16 + width:40 = 56px → 64px safe)
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 64px 16px 20px',
        minHeight: '64px',
      }}
    >
      {backHref && (
        <button
          type="button"
          aria-label="Torna indietro"
          onClick={() => tornaIndietro(router, backHref)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            minWidth: '52px',
            minHeight: '52px',
            borderRadius: '50%',
            background: DS.elv,
            color: DS.t1,
            flexShrink: 0,
            boxShadow: DS.shB,
            textDecoration: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M11 14L6 9l5-5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 700,
            color: DS.t1,
            fontFamily: 'DM Sans, sans-serif',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: DS.t2,
              fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.5,
              marginTop: '4px',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {(showThemeToggle || actions || lastUpdatedAt !== undefined) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {lastUpdatedAt !== undefined && <SyncBadge lastUpdatedAt={lastUpdatedAt} />}
          {/* ThemeToggleButton è un Client Component island — safe anche da Server Components */}
          {showThemeToggle && <ThemeToggleButton />}
          {actions}
        </div>
      )}
    </header>
  )
}
