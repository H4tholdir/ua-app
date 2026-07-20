'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { t, useReducedMotion, motionTokens } from '@/design-system/motion'
import { isV3MigratedRoute } from '@/lib/nav/route-migrate-v3'

// Design tokens v2.3 — warm panna palette
const DS = {
  elv:     'var(--elv, #EDEDEA)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #4A3D33)',
  primary: 'var(--primary, #D90012)',
  shB: 'var(--sh-b)',
  shI: 'var(--sh-i)',
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
  // Task 7 (ondata A mini-triage): la tab «Lavori» → `/lavori` è stata
  // rimossa. `/lavori` senza `?pila=` ora fa redirect a `/dashboard`
  // (morte di «Le pile»): un ripuntamento nudo della tab a `/dashboard`
  // avrebbe duplicato la voce «Oggi» già presente sopra — rimozione =
  // ripuntamento senza duplicato (decisions doc, caso «rimuovere/ripuntare»).
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
  // All others: startsWith for nested routes
  return pathname.startsWith(tabHref)
}

const SCROLL_THRESHOLD = 4   // px — ignore micro jitter
const HIDE_AFTER_PX   = 60   // px — always visible near top

// Ondata 1 (spec sp.3 §1): sulle pagine migrate a v3 la BottomNavPill muore —
// il pollice in basso appartiene al TastoPiù (home). Restano le pagine v2.3.
// Il predicato vive in `route-migrate-v3.ts` (review finale item 4, ratifica
// 12/07): `UserProfileSheet.tsx` lo consuma con lo stesso comportamento —
// niente più due copie della stessa lista/confronto. `hidden` resta condiviso
// dal render (letto dopo tutti gli hook — vedi sotto) e dai due effect del
// tooltip FAB (Task 11, review Ondata 1): su una route nascosta il componente
// renderizza `null`, quindi non ha senso far leggere/scrivere `localStorage`
// (`ua-tooltip-fab-shown`) e far scattare il `setTimeout` di 3s — lavoro
// sprecato ad ogni mount su `/dashboard`/`/tutto-il-resto`/`/lavori`.
const isRouteHidden = isV3MigratedRoute

export function BottomNavPill() {
  const pathname = usePathname()
  const hidden = isRouteHidden(pathname)
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)
  const reducedMotion = useReducedMotion()

  // Tooltip FAB: visibile solo alla prima apertura, poi sparisce dopo 3s.
  // Stato iniziale sempre `false`, identico al render server-side (che non
  // ha accesso a localStorage) — evita un hydration mismatch (il server non
  // renderizza mai il tooltip, il client lo mostrava subito se non ancora
  // visto). Il valore reale viene letto una sola volta dopo il mount.
  const [showFabTooltip, setShowFabTooltip] = useState(false)
  useEffect(() => {
    // Guard hidden-route (Task 11): niente lettura/scrittura localStorage su
    // una pagina dove il componente non renderizza nulla.
    if (hidden) return
    // Sync una tantum al mount da localStorage (mai disponibile server-side)
    // — non innesca cascata, unica scrittura di questo effect, dipendenze vuote.
    if (!localStorage.getItem('ua-tooltip-fab-shown')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowFabTooltip(true)
    }
  }, [hidden])
  useEffect(() => {
    if (hidden || !showFabTooltip) return
    const timer = setTimeout(() => {
      setShowFabTooltip(false)
      localStorage.setItem('ua-tooltip-fab-shown', '1')
    }, 3000)
    return () => clearTimeout(timer)
  }, [hidden, showFabTooltip])

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

  useEffect(() => {
    return () => { if (longPressTimer.current) clearTimeout(longPressTimer.current) }
  }, [])

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

  // Il guard vive DOPO tutti gli hook (non prima, come nello snippet originale
  // del brief): un early return prima degli hook violerebbe le Rules of Hooks
  // — 12 errori `react-hooks/rules-of-hooks` verificati con `npx eslint` su
  // questo file, che avrebbero bloccato il pre-commit hook (`lint-staged`,
  // `eslint --max-warnings=0`). Stesso `hidden` (stesso confronto ESATTO, non
  // prefix) calcolato in cima al componente e già usato dai due effect del
  // tooltip FAB sopra — vedi `isRouteHidden`.
  if (hidden) return null

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
              {/* Tooltip FAB: visibile solo alla prima apertura (3s) */}
              {showFabTooltip && (
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
                    animation: 'ua-in .2s ease forwards',
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
              )}
              <Link
                href={tab.href}
                aria-label={tab.ariaLabel}
                aria-current={active ? 'page' : undefined}
                className="ua-tasto-plus"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '56px',
                  height: '56px',
                  minWidth: '56px',
                  minHeight: '56px',
                  borderRadius: '50%',
                  color: DS.primary,
                  textDecoration: 'none',
                  flexShrink: 0,
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
              color: 'var(--t3, #6B5C51)',
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
                color: 'var(--t3, #6B5C51)',
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
