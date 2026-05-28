'use client'

import { useTheme } from '@/hooks/useTheme'

const DS = {
  elv: 'var(--elv, #EDEDEA)',
  t1:  'var(--t1, #1C1916)',
  shB: 'var(--sh-b)',
} as const

export function ThemeToggleButton() {
  const { theme, toggle } = useTheme()

  return (
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
          <circle cx="9" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M9 1v2M9 15v2M1 9h2M15 9h2M3.05 3.05l1.41 1.41M13.54 13.54l1.41 1.41M3.05 14.95l1.41-1.41M13.54 4.46l1.41-1.41"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width={18} height={18} viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path
            d="M15.5 11.5A6.5 6.5 0 016.5 2.5a6.5 6.5 0 100 13 6.5 6.5 0 009-4z"
            stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
