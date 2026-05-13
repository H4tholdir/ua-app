'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { useReducedMotion } from '@/design-system/motion'

// ─── Audio helpers (same pattern as login) ──────────────────────────────────
let _ac: AudioContext | null = null
function getAC(): AudioContext | null {
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    return _ac
  } catch { return null }
}
function sndClick() {
  try {
    const c = getAC(); if (!c) return
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

export default function ForgotForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [logoAnimating, setLogoAnimating] = useState(false)

  const reducedMotion = useReducedMotion()
  const logoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleLogoClick = useCallback(() => {
    sndClick()
    if (reducedMotion) return
    setLogoAnimating(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setLogoAnimating(true)))
  }, [reducedMotion])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    sndClick()
    setLoading(true)

    try {
      const supabase = getBrowserClient()
      // Always show success regardless of result — privacy-preserving
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
    } catch {
      // Network error: still show success to avoid leaking email existence
    } finally {
      setLoading(false)
      setSent(true)
    }
  }, [email, loading])

  const theme = isDark ? 'dark' : 'light'

  return (
    <div className="login-root" data-login-theme={theme}>
      <div className="ua-wrap" style={{ maxWidth: '400px' }}>
        <div className="ua-fside" style={{ flex: 'none', width: '100%' }}>
          <div className="ua-card">

            {/* Logo — tap to bounce */}
            <div className="ua-la">
              <div
                ref={logoRef}
                className={`ua-lw${logoAnimating ? ' ua-bounce' : ''}`}
                onClick={handleLogoClick}
                onAnimationEnd={() => setLogoAnimating(false)}
                role="button"
                tabIndex={0}
                aria-label="UÀ — clicca per sorpresa"
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLogoClick() } }}
              >
                <img src="/ua-icon.png" alt="UÀ!" draggable={false} />
              </div>
            </div>

            {sent ? (
              /* ── Success state ── */
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                <div className="ua-success-icon">
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                    <rect x="3" y="7" width="28" height="20" rx="3" stroke="var(--ua-red)" strokeWidth="1.8"/>
                    <path d="M3 11L17 20L31 11" stroke="var(--ua-red)" strokeWidth="1.8" strokeLinecap="round"/>
                    <circle cx="24" cy="24" r="7" fill="var(--ua-sfc)" stroke="var(--ua-g)" strokeWidth="1.8"/>
                    <path d="M21 24L23 26L27 22" stroke="var(--ua-g)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <div>
                  <h1 className="ua-page-title">Controlla la tua email</h1>
                  <p className="ua-page-sub" style={{ marginTop: '6px' }}>
                    Se l&apos;indirizzo è registrato riceverai il link entro qualche secondo.
                    <br />
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>Controlla anche spam e posta indesiderata.</span>
                  </p>
                </div>

                <Link
                  href="/login"
                  className="ua-btn-secondary"
                  onClick={() => sndClick()}
                >
                  ← Torna al login
                </Link>
              </div>
            ) : (
              /* ── Form state ── */
              <>
                <Link href="/login" className="ua-back-link" aria-label="Torna al login">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Torna al login
                </Link>

                <div style={{ marginBottom: '2px' }}>
                  <h1 className="ua-page-title">Password dimenticata?</h1>
                  <p className="ua-page-sub">
                    Inserisci la tua email — ti inviamo un link per reimpostarla.
                  </p>
                </div>

                <form onSubmit={handleSubmit} autoComplete="on" noValidate>
                  <div className="ua-field">
                    <label className="ua-flbl" htmlFor="fp-email">Email</label>
                    <div className="ua-iw">
                      <div className="ua-ii" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="4" width="20" height="16" rx="2"/>
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                        </svg>
                      </div>
                      <input
                        id="fp-email"
                        className="ua-inp"
                        type="email"
                        name="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="filippo@laboratorio.it"
                        autoComplete="email"
                        inputMode="email"
                        autoFocus
                        required
                        aria-label="Indirizzo email"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="ua-btn-main"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    <span className="ua-bmt">
                      {loading ? 'Invio in corso…' : 'Invia link di reset'}
                    </span>
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
