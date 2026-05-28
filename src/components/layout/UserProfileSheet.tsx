'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { motionTokens, useReducedMotion } from '@/design-system/motion'

// Audio — tap feedback identico al pattern del progetto
let _ac: AudioContext | null = null
function sndClick() {
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const c = _ac
    const len = Math.floor(c.sampleRate * 0.022)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
    const src = c.createBufferSource(); src.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.5
    const g = c.createGain()
    g.gain.setValueAtTime(0.45, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.022)
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start()
  } catch { /* silent */ }
}

const DS = {
  elv:  'var(--elv, #EDEDEA)',
  sfc:  'var(--sfc, #E4DFD9)',
  prs:  'var(--prs, #D4CFC9)',
  t1:   'var(--t1, #1C1916)',
  t2:   'var(--t2, #4A3D33)',
  t3:   'var(--t3, #6B5C51)',
  red:  'var(--primary, #D90012)',
  green:'#16A34A',
  shB:  `inset 0 1px 0 rgba(255,255,255,.90), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
  shI:  `inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)`,
} as const

interface Props {
  nome: string
  cognome?: string | null
  email: string
  ruolo: string
  labNome: string
  trialEndsAt?: string | null
  labStato?: string
  isTrialExpiring?: boolean
}

function initials(nome: string, cognome?: string | null) {
  const n = nome?.[0]?.toUpperCase() ?? '?'
  const c = cognome?.[0]?.toUpperCase() ?? ''
  return n + c
}

function fmtTrialDate(d: string | null | undefined) {
  if (!d) return null
  return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

export function UserProfileSheet({ nome, cognome, email, ruolo, labNome, trialEndsAt, labStato, isTrialExpiring = false }: Props) {
  const [open, setOpen] = useState(false)
  const { theme, toggle, isDark } = useTheme()
  const reducedMotion = useReducedMotion()
  const router = useRouter()

  const openSheet  = useCallback(() => { sndClick(); setOpen(true) }, [])
  const closeSheet = useCallback(() => { setOpen(false) }, [])

  const logout = useCallback(async () => {
    sndClick()
    const sb = getBrowserClient()
    await sb.auth.signOut()
    router.push('/login')
  }, [router])

  const initStr = initials(nome, cognome)
  const trialDate = fmtTrialDate(trialEndsAt)
  const isExpiring = isTrialExpiring

  return (
    <>
      {/* Avatar button — fisso top-right su tutte le schermate */}
      <button
        type="button"
        onClick={openSheet}
        aria-label="Apri profilo"
        aria-expanded={open}
        style={{
          position: 'fixed',
          top: 14,
          right: 16,
          zIndex: 60,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          background: DS.red,
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: DS.shB,
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform .12s, box-shadow .12s',
          flexShrink: 0,
        }}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(.93)')}
        onMouseUp={e => (e.currentTarget.style.transform = '')}
        onMouseLeave={e => (e.currentTarget.style.transform = '')}
        onTouchStart={e => (e.currentTarget.style.transform = 'scale(.93)')}
        onTouchEnd={e => (e.currentTarget.style.transform = '')}
      >
        {initStr}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="profile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
              onClick={closeSheet}
              style={{
                position: 'fixed', inset: 0, zIndex: 70,
                background: 'rgba(0,0,0,.32)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }}
            />

            {/* Bottom sheet — responsive: full width mobile, centrato tablet/desktop */}
            <motion.div
              key="profile-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
              style={{
                position: 'fixed',
                bottom: 0,
                /* Mobile: full width; Tablet/Desktop: max 480px centrato */
                left: 0, right: 0,
                marginLeft: 'auto', marginRight: 'auto',
                maxWidth: '100%',
                zIndex: 71,
                background: DS.sfc,
                borderRadius: '28px 28px 0 0',
                boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
                paddingBottom: 'calc(40px + env(safe-area-inset-bottom, 0px))',
                maxHeight: '90dvh',
                overflowY: 'auto',
              }}
            >
              {/* Handle */}
              <div style={{
                width: 36, height: 4, background: DS.t3, borderRadius: 99,
                margin: '12px auto 8px',
              }} />

              {/* User header */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 20px 16px',
                borderBottom: '1px solid var(--border, rgba(0,0,0,.06))',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: DS.red, color: '#fff', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
                  boxShadow: DS.shB,
                }}>
                  {initStr}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: DS.t1, lineHeight: 1.2 }}>
                    {nome} {cognome ?? ''}
                  </div>
                  <div style={{ fontSize: 12, color: DS.t2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {email}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(37,99,235,.10)', color: 'var(--info, #2563EB)', letterSpacing: '.04em' }}>
                      {ruolo}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'rgba(148,145,141,.10)', color: DS.t2 }}>
                      {labNome}
                    </span>
                  </div>
                </div>
              </div>

              {/* Preferenze */}
              <Section label="Preferenze">
                {/* Tema toggle */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 14,
                  background: DS.elv, boxShadow: DS.shB, marginBottom: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <RowIcon>
                      {isDark ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <path d="M13.5 10A5.5 5.5 0 015 1.5a5.5 5.5 0 100 11 5.5 5.5 0 008.5-2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
                          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      )}
                    </RowIcon>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: DS.t1 }}>Tema</div>
                      <div style={{ fontSize: 11, color: DS.t2, marginTop: 1 }}>
                        {theme === 'dark' ? 'Modalità scura' : 'Modalità chiara'}
                      </div>
                    </div>
                  </div>
                  <GalahhādToggle isDark={isDark} onToggle={toggle} />
                </div>
              </Section>

              {/* Gestione */}
              <Section label="Gestione" style={{ marginTop: 4 }}>
                <SheetRow
                  href="/impostazioni/profilo"
                  label="Profilo"
                  sub="Modifica dati personali e password"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  }
                  onClick={closeSheet}
                />
                <SheetRow
                  href="/impostazioni"
                  label="Impostazioni laboratorio"
                  sub="PEC, fatturazione, PRRC, MDR"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2a6 6 0 1 0 0 12A6 6 0 0 0 8 2z" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  }
                  onClick={closeSheet}
                />
                <SheetRow
                  href="/impostazioni/abbonamento"
                  label="Abbonamento"
                  sub={
                    labStato === 'trial' && trialDate
                      ? <span style={{ color: isExpiring ? 'var(--warning, #B45309)' : DS.green, fontWeight: 600 }}>
                          {isExpiring ? '⚠ ' : '● '}Trial attivo — scade {trialDate}
                        </span>
                      : labStato === 'attivo'
                        ? <span style={{ color: DS.green, fontWeight: 600 }}>● Attivo</span>
                        : 'Gestisci piano'
                  }
                  icon={
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                      <path d="M2 7.5h12M5 5V3.5a3 3 0 0 1 6 0V5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  }
                  onClick={closeSheet}
                />
              </Section>

              {/* Logout */}
              <div style={{ padding: '16px 20px 0' }}>
                <LogoutButton onLogout={logout} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/* ── Sub-components ── */

function Section({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ padding: '16px 20px 0', ...style }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: DS.t3, marginBottom: 10 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function RowIcon({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
      background: DS.prs, boxShadow: DS.shI,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: DS.t2,
    }}>
      {children}
    </div>
  )
}

function SheetRow({ href, label, sub, icon, onClick }: {
  href: string; label: string; sub: React.ReactNode; icon: React.ReactNode; onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 14, marginBottom: 8,
        background: DS.elv, boxShadow: DS.shB,
        textDecoration: 'none', color: 'inherit',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <RowIcon>{icon}</RowIcon>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: DS.t1 }}>{label}</div>
        <div style={{ fontSize: 11, color: DS.t2, marginTop: 1 }}>{sub}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: DS.t3, flexShrink: 0 }} aria-hidden="true">
        <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    </Link>
  )
}

/* Toggle Galahhad miniaturizzato — usa le variabili CSS per le icone sole/luna */
function GalahhādToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  const toggleSize = 14
  return (
    <label
      style={{ '--toggle-size': `${toggleSize}px`, flexShrink: 0 } as React.CSSProperties}
      className="ua-profile-theme-switch"
      aria-label="Cambia tema"
    >
      <input type="checkbox" checked={isDark} onChange={onToggle} style={{ display: 'none' }} />
      <div className="ua-pts__container">
        <div className="ua-pts__clouds" />
        <div className="ua-pts__stars">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55" fill="none">
            <path fillRule="evenodd" clipRule="evenodd" d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z" fill="currentColor"/>
          </svg>
        </div>
        <div className="ua-pts__circle">
          <div className="ua-pts__sun-moon">
            <div className="ua-pts__moon">
              <div className="ua-pts__spot" />
              <div className="ua-pts__spot" />
              <div className="ua-pts__spot" />
            </div>
          </div>
        </div>
      </div>
    </label>
  )
}

/* Logout button — Uiverse.io by vinodjangid07 */
function LogoutButton({ onLogout }: { onLogout: () => void }) {
  return (
    <button
      type="button"
      onClick={onLogout}
      className="ua-profile-logout-btn"
      aria-label="Esci dall'applicazione"
    >
      <div className="ua-plb__sign">
        <svg viewBox="0 0 512 512" aria-hidden="true">
          <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"/>
        </svg>
      </div>
      <div className="ua-plb__text">Logout</div>
    </button>
  )
}
