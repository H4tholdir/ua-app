'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { useReducedMotion } from '@/design-system/motion'

// ─── Audio helpers ────────────────────────────────────────────────────────────
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

interface Props {
  inviteId: string
  email: string
  labNome: string
  token: string
}

export default function InviteForm({ email, labNome, token }: Props) {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  )
  const [logoAnimating, setLogoAnimating] = useState(false)

  const reducedMotion = useReducedMotion()
  const logoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
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
    if (password.length < 8) {
      setErrorMsg('La password deve essere di almeno 8 caratteri')
      return
    }

    sndClick()
    setLoading(true)
    setErrorMsg(null)

    const supabase = getBrowserClient()

    // Sign up — if already registered, sign in
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome, cognome } },
    })

    if (signUpErr) {
      if (signUpErr.message.includes('already registered')) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) {
          setErrorMsg('Account esistente — controlla la password')
          setLoading(false)
          return
        }
      } else {
        setErrorMsg(signUpErr.message)
        setLoading(false)
        return
      }
    }

    // Atomically accept the invite + create utenti record
    const res = await fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, nome, cognome }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErrorMsg(data.error ?? 'Errore durante l\'attivazione')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }, [email, password, nome, cognome, token, loading, router])

  const theme = isDark ? 'dark' : 'light'

  return (
    <div className="login-root" data-login-theme={theme}>
      <div className="ua-wrap" style={{ maxWidth: '400px' }}>
        <div className="ua-fside" style={{ flex: 'none', width: '100%' }}>
          <div className="ua-card">

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

            <div style={{ marginBottom: '2px' }}>
              <h1 className="ua-page-title">Benvenuto in UÀ!</h1>
              <p className="ua-page-sub">
                Sei stato invitato in <strong style={{ color: 'var(--ua-t1)' }}>{labNome}</strong>.
                <br />Crea il tuo account per iniziare.
              </p>
            </div>

            {errorMsg && (
              <div className="ua-err-pill" role="alert">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="7" stroke="var(--ua-red)" strokeWidth="1.4"/>
                  <path d="M8 5V8.5" stroke="var(--ua-red)" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="8" cy="11" r=".8" fill="var(--ua-red)"/>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="on" noValidate>

              {/* Nome + Cognome */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '0' }}>
                <div className="ua-field">
                  <label className="ua-flbl" htmlFor="iv-nome">Nome</label>
                  <div className="ua-iw">
                    <input
                      id="iv-nome"
                      className="ua-inp"
                      type="text"
                      value={nome}
                      onChange={e => setNome(e.target.value)}
                      placeholder="Mario"
                      autoComplete="given-name"
                      autoFocus
                      required
                      aria-label="Nome"
                    />
                  </div>
                </div>
                <div className="ua-field">
                  <label className="ua-flbl" htmlFor="iv-cognome">Cognome</label>
                  <div className="ua-iw">
                    <input
                      id="iv-cognome"
                      className="ua-inp"
                      type="text"
                      value={cognome}
                      onChange={e => setCognome(e.target.value)}
                      placeholder="Rossi"
                      autoComplete="family-name"
                      required
                      aria-label="Cognome"
                    />
                  </div>
                </div>
              </div>

              {/* Email (read-only) */}
              <div className="ua-field">
                <label className="ua-flbl" htmlFor="iv-email">Email</label>
                <div className="ua-iw" style={{ opacity: 0.7 }}>
                  <div className="ua-ii" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </div>
                  <input
                    id="iv-email"
                    className="ua-inp"
                    type="email"
                    value={email}
                    readOnly
                    aria-label="Email (predefinita dall'invito)"
                    aria-readonly="true"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="ua-field">
                <label className="ua-flbl" htmlFor="iv-password">Scegli una password</label>
                <div className="ua-iw">
                  <div className="ua-ii" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    id="iv-password"
                    className="ua-inp"
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrorMsg(null) }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    aria-label="Password"
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
                  {loading ? 'Attivazione…' : 'Attiva account'}
                </span>
              </button>

            </form>

          </div>
        </div>
      </div>
    </div>
  )
}
