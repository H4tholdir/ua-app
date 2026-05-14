'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'

interface Tab {
  href: string
  label: string
  ariaLabel: string
  icon: React.ReactNode
  isCta?: boolean
}

const tabs: Tab[] = [
  {
    href: '/dashboard',
    label: 'Oggi',
    ariaLabel: 'Oggi — dashboard principale',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="3" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
        <rect x="12" y="12" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
  {
    href: '/lavori',
    label: 'Lavori',
    ariaLabel: 'Lavori — lista lavori',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path
          d="M4 6h14M4 11h10M4 16h7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/lavori/nuovo',
    label: 'Nuovo',
    ariaLabel: 'Crea nuovo lavoro',
    icon: (
      <span style={{ fontSize: '24px', lineHeight: 1, fontWeight: 700 }} aria-hidden="true">
        +
      </span>
    ),
    isCta: true,
  },
  {
    href: '/clienti',
    label: 'Clienti',
    ariaLabel: 'Clienti — lista dentisti',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M4 18c0-3.314 3.134-6 7-6s7 2.686 7 6"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/fatture',
    label: 'Fatture',
    ariaLabel: 'Fatture — gestione fatturazione',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="4" y="3" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8 8h6M8 12h4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path d="M11 15v2M11 13v.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
]

function isTabActive(tabHref: string, pathname: string): boolean {
  // CTA: exact match only
  if (tabHref === '/lavori/nuovo') return pathname === '/lavori/nuovo'
  // Lavori: starts with /lavori but NOT /lavori/nuovo
  if (tabHref === '/lavori') return pathname.startsWith('/lavori') && pathname !== '/lavori/nuovo'
  // All others: startsWith for nested routes
  return pathname.startsWith(tabHref)
}

const SCROLL_THRESHOLD = 4   // px — ignore micro jitter
const HIDE_AFTER_PX   = 60   // px — always visible near top

export function BottomTabBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current

      if (Math.abs(delta) < SCROLL_THRESHOLD) return

      if (currentY < HIDE_AFTER_PX) {
        setVisible(true)
      } else if (delta > 0) {
        // Scrolling down — hide
        setVisible(false)
      } else {
        // Scrolling up — show
        setVisible(true)
      }

      lastScrollY.current = currentY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const barStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: '#1B2D6B',
    borderRadius: '100px',
    padding: '8px 12px',
    boxShadow:
      '-3px -3px 7px hsl(220 80% 35% / 0.55), 5px 5px 14px hsl(230 100% 4% / 0.95)',
    zIndex: 50,
    // Prevent layout shift by keeping width stable
    whiteSpace: 'nowrap',
  }

  const barContent = (
    <nav style={barStyle} aria-label="Navigazione principale">
      {tabs.map((tab) => {
        const active = isTabActive(tab.href, pathname)

        if (tab.isCta) {
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.ariaLabel}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '52px',
                height: '52px',
                minWidth: '52px',
                minHeight: '52px',
                borderRadius: '50%',
                background: '#D4A843',
                color: '#0F1E52',
                textDecoration: 'none',
                flexShrink: 0,
                boxShadow: active
                  ? 'inset 3px 3px 8px hsl(230 100% 4% / 0.3), inset -2px -2px 6px hsl(43 65% 75% / 0.3)'
                  : '0 0 20px hsl(43 65% 55% / 0.4)',
              }}
            >
              {tab.icon}
            </Link>
          )
        }

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.ariaLabel}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              minWidth: '52px',
              minHeight: '52px',
              padding: '6px 10px',
              borderRadius: '88px',
              background: active ? '#243580' : 'transparent',
              color: active ? '#F0F4FF' : '#8899CC',
              textDecoration: 'none',
              transition: reducedMotion ? 'none' : undefined,
              boxShadow: active
                ? 'inset 3px 3px 8px hsl(230 100% 4% / 0.8), inset -2px -2px 6px hsl(220 80% 35% / 0.4)'
                : 'none',
            }}
          >
            {tab.icon}
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'DM Sans, sans-serif',
                fontWeight: active ? 600 : 400,
                lineHeight: 1,
                letterSpacing: '0.01em',
              }}
            >
              {tab.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )

  if (reducedMotion) {
    return visible ? barContent : null
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bottom-tab-bar"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={t('normal', 'enter')}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            pointerEvents: 'none',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            {barContent}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
