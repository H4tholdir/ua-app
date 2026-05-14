import type { ReactNode } from 'react'
import Link from 'next/link'

interface AppHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  actions?: ReactNode
}

export function AppHeader({ title, subtitle, backHref, actions }: AppHeaderProps) {
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
            background: '#1B2D6B',
            color: '#F0F4FF',
            flexShrink: 0,
            boxShadow:
              '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
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
        <h1 className="ua-page-title" style={{ margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p className="ua-page-sub" style={{ margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          {actions}
        </div>
      )}
    </header>
  )
}
