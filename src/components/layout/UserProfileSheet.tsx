'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { isV3MigratedRoute } from '@/lib/nav/route-migrate-v3'

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
  shB: 'var(--sh-b)',
  shI: 'var(--sh-i)',
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
  const reducedMotion = useReducedMotion()
  const router = useRouter()
  const pathname = usePathname()

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

  // Il guard vive DOPO tutti gli hook (Rules of Hooks — stesso schema di
  // `BottomNavPill.tsx`, v. nota lì): sulle route migrate a v3 il ☰ TastoTondo
  // della home è già l'accesso a «Tutto il resto», l'avatar top-right fisso è
  // ridondante e il mockup `home.html` non lo prevede (review finale item 4,
  // ratifica Francesco 12/07).
  if (isV3MigratedRoute(pathname)) return null

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
              transition={reducedMotion ? { duration: 0 } : t('fast', 'enter')}
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

              {/* La sezione «Preferenze» conteneva SOLO l'interruttore del tema, che da
                  qui è sparito: il tema si sceglie in un posto solo (Impostazioni →
                  Aspetto → Tema), e questo pannello ci porta già con «Impostazioni
                  laboratorio» qui sotto. V. decisione D5. */}

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
