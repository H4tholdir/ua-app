'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { t, useReducedMotion, motionTokens } from '@/design-system/motion'

// Design tokens v2.2 — warm panna palette
const DS = {
  elv:     'var(--elv, #EDEDEA)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  primary: 'var(--primary, #D90012)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
  shI: `inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)`,
} as const

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
      <span
        style={{ fontSize: '24px', lineHeight: 1, fontWeight: 700, color: 'var(--primary, #D90012)' }}
        aria-hidden="true"
      >
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
  {
    href: '/scadenzario',
    label: 'Sospesi',
    ariaLabel: 'Scadenzario — pagamenti in sospeso',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M11 7v4l2.5 2.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7.5 3.5L4.5 2M14.5 3.5l3-1.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
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

export function BottomNavPill() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const reducedMotion = useReducedMotion()

  const [editMode, setEditMode] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleNavPressStart() {
    longPressTimer.current = setTimeout(() => setEditMode(true), 500)
  }

  function handleNavPressEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
  }

  useEffect(() => {
    if (!editMode) return
    const close = () => setEditMode(false)
    document.addEventListener('click', close, { once: true })
    return () => document.removeEventListener('click', close)
  }, [editMode])

  const STORAGE_KEY = 'ua-nav-preferences'

  function loadNavPrefs(): { pinned: string[] } {
    if (typeof window === 'undefined') return { pinned: [] }
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return { pinned: [] }
      const parsed = JSON.parse(stored) as { pinned?: string[] }
      return { pinned: parsed.pinned ?? [] }
    } catch { return { pinned: [] } }
  }

  const [navPrefs, setNavPrefs] = useState(loadNavPrefs)

  function togglePin(href: string) {
    setNavPrefs(prev => {
      const pinned = prev.pinned.includes(href)
        ? prev.pinned.filter(h => h !== href)
        : [...prev.pinned, href]
      const next = { ...prev, pinned }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }

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

  const pillStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: DS.elv,
    borderRadius: '100px',
    padding: '6px 10px',
    boxShadow: DS.shB,
    maxWidth: 'calc(100vw - 32px)',
    overflowX: 'auto',
    scrollbarWidth: 'none' as React.CSSProperties['scrollbarWidth'],
  }

  const navStyle: React.CSSProperties = {
    ...pillStyle,
    outline: editMode ? '2px dashed rgba(217,0,18,.30)' : 'none',
    outlineOffset: editMode ? '3px' : '0',
  }

  const barContent = (
    <nav
      style={navStyle}
      aria-label="Navigazione principale"
      onMouseDown={handleNavPressStart}
      onMouseUp={handleNavPressEnd}
      onTouchStart={handleNavPressStart}
      onTouchEnd={handleNavPressEnd}
    >
      {tabs.map((tab) => {
        const active = isTabActive(tab.href, pathname)

        if (tab.isCta) {
          return (
            <motion.div
              key={tab.href}
              initial={reducedMotion ? false : { scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reducedMotion ? { duration: 0 } : { delay: 0.2, ...motionTokens.spring.pop }}
              style={{ flexShrink: 0, position: 'relative' }}
            >
              {/* Tooltip "Nuovo lavoro" */}
              <span
                role="tooltip"
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  marginBottom: '8px',
                  background: 'var(--t1, #1C1916)',
                  color: 'var(--elv, #EDEDEA)',
                  fontSize: '9.5px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '7px',
                  whiteSpace: 'nowrap',
                  fontFamily: 'DM Sans, sans-serif',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
              >
                Nuovo lavoro
                <span style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderTop: '4px solid var(--t1, #1C1916)',
                }} />
              </span>
              <Link
                href={tab.href}
                aria-label={tab.ariaLabel}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  minWidth: '56px',
                  minHeight: '56px',
                  borderRadius: '50%',
                  background: 'var(--elv, #EDEDEA)',
                  color: DS.primary,
                  textDecoration: 'none',
                  flexShrink: 0,
                  boxShadow: active ? DS.shI : DS.shB,
                }}
              >
                {tab.icon}
              </Link>
            </motion.div>
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
              background: active ? DS.elv : 'transparent',
              color: active ? DS.primary : DS.t2,
              textDecoration: 'none',
              transition: reducedMotion ? 'none' : undefined,
              boxShadow: active ? DS.shI : 'none',
              position: 'relative',
            }}
          >
            {tab.icon}
            {editMode && (
              <span
                aria-label={navPrefs.pinned.includes(tab.href) ? 'Rimuovi pin' : 'Aggiungi pin'}
                onClick={(e) => { e.preventDefault(); togglePin(tab.href) }}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '4px',
                  fontSize: '7px',
                  cursor: 'pointer',
                }}
              >
                📌
              </span>
            )}
            {!editMode && navPrefs.pinned.includes(tab.href) && (
              <span
                aria-hidden="true"
                style={{ position: 'absolute', top: '2px', right: '4px', fontSize: '7px' }}
              >
                📌
              </span>
            )}
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
    return visible ? (
      <div
        className="ua-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          {barContent}
          {editMode && (
            <div style={{
              textAlign: 'center',
              fontSize: '9px',
              color: 'var(--t3, #B8B3AE)',
              fontFamily: 'DM Sans, sans-serif',
              marginTop: '4px',
              paddingBottom: '4px',
            }}>
              Tieni premuto · Tocca tab per pin
            </div>
          )}
        </div>
      </div>
    ) : null
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="bottom-nav-pill"
          className="ua-bottom-nav"
          initial={{ transform: 'translateY(100px)', opacity: 0 }}
          animate={{ transform: 'translateY(0px)', opacity: 1 }}
          exit={{ transform: 'translateY(100px)', opacity: 0 }}
          transition={t('normal', 'enter')}
          style={{
            position: 'fixed',
            bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            {barContent}
            {editMode && (
              <div style={{
                textAlign: 'center',
                fontSize: '9px',
                color: 'var(--t3, #B8B3AE)',
                fontFamily: 'DM Sans, sans-serif',
                marginTop: '4px',
                paddingBottom: '4px',
              }}>
                Tieni premuto · Tocca tab per pin
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
