'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'

// Design tokens v2.2 — warm panna palette
const DS = {
  elv:     'var(--elv, #EDEDEA)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
} as const

interface AppHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  actions?: ReactNode
  showThemeToggle?: boolean
}

export function AppHeader({ title, subtitle, backHref, actions, showThemeToggle = false }: AppHeaderProps) {
  const { theme, toggle } = useTheme()

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '16px 20px',
        minHeight: '64px',
      }}
    >
      {backHref && (
        <Link
          href={backHref}
          aria-label="Torna indietro"
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
        </Link>
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

      {(showThemeToggle || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {showThemeToggle && (
            <button
              type="button"
              onClick={toggle}
              aria-label={`Passa al tema ${theme === 'light' ? 'scuro' : 'chiaro'}`}
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: 'none',
                background: DS.elv,
                boxShadow: DS.shB,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                WebkitTapHighlightColor: 'transparent',
                transition: 'box-shadow var(--tr, 0.18s cubic-bezier(0.2,0,0,1))',
                flexShrink: 0,
                color: DS.t1,
              }}
            >
              {theme === 'light' ? (
                <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path
                    d="M9 1v2M9 15v2M1 9h2M15 9h2M3.05 3.05l1.41 1.41M13.54 13.54l1.41 1.41M3.05 14.95l1.41-1.41M13.54 4.46l1.41-1.41"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path
                    d="M15.5 11.5A6.5 6.5 0 016.5 2.5a6.5 6.5 0 100 13 6.5 6.5 0 009-4z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}
          {actions}
        </div>
      )}
    </header>
  )
}
