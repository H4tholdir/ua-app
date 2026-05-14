'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase/browser-anon'
import { safeRedirectPath } from '@/lib/utils/safe-redirect'
import { useReducedMotion } from '@/design-system/motion'
import { startAuthentication } from '@simplewebauthn/browser'
import dynamic from 'next/dynamic'

const PasskeyRegistrationModal = dynamic(
  () => import('@/components/features/auth/PasskeyRegistrationModal'),
  { ssr: false }
)

const PASSKEY_EMAIL_KEY = 'ua_passkey_email'

// ─── Web Audio helpers ──────────────────────────────────────────────────────
// Lazy-init AudioContext on first interaction (browser autoplay policy)
let _ac: AudioContext | null = null
function getAC(): AudioContext | null {
  try {
    if (!_ac) {
      _ac = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    }
    return _ac
  } catch {
    return null
  }
}

function sndFocus() {
  try {
    const c = getAC(); if (!c) return
    const len = Math.floor(c.sampleRate * 0.018)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 7) * 0.6
    const src = c.createBufferSource(); src.buffer = buf
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300
    const g = c.createGain()
    g.gain.setValueAtTime(0.07, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.016)
    src.connect(lp); lp.connect(g); g.connect(c.destination); src.start()
  } catch { /* silent */ }
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

function sndSnap() {
  try {
    const c = getAC(); if (!c) return
    const len = Math.floor(c.sampleRate * 0.008)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 5)
    const src = c.createBufferSource(); src.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 3
    const g = c.createGain()
    g.gain.setValueAtTime(0.28, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.008)
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start()
  } catch { /* silent */ }
}

function sndSuccess() {
  try {
    const c = getAC(); if (!c) return
    const notes: [number, number, number][] = [[0, 420, 0.07], [0.1, 560, 0.08], [0.2, 700, 0.10]]
    notes.forEach(([delay, freq, dur]) => {
      const o = c.createOscillator(), g = c.createGain()
      o.type = 'sine'; o.frequency.setValueAtTime(freq, c.currentTime + delay)
      g.gain.setValueAtTime(0.06, c.currentTime + delay)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur)
      o.connect(g); g.connect(c.destination)
      o.start(c.currentTime + delay); o.stop(c.currentTime + delay + dur)
    })
  } catch { /* silent */ }
}

// ─── Eye icon SVGs ──────────────────────────────────────────────────────────
const EYE_OPEN = (
  <>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </>
)
const EYE_CLOSED = (
  <>
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </>
)

// ─── Face ID SVG ────────────────────────────────────────────────────────────
function FaceIdIcon({ color }: { color: string }) {
  return (
    <svg
      width="38" height="38"
      viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <path d="M9 9h.01" />
      <path d="M15 9h.01" />
    </svg>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [btnState, setBtnState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const searchParamError = searchParams.get('error') === 'auth_callback_failed'
    ? 'Accesso non riuscito. Riprova o usa email e password.'
    : null
  const [errorMsg, setErrorMsg] = useState<string | null>(searchParamError)
  const [isDark, setIsDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  )
  const [bioAvailable, setBioAvailable] = useState(false)
  const [hasSavedPasskey, setHasSavedPasskey] = useState(false)
  const [fpLabel, setFpLabel] = useState('Impronta')
  const [faceLabel, setFaceLabel] = useState('Face ID')
  const [logoAnimating, setLogoAnimating] = useState(false)
  const [bioLoading, setBioLoading] = useState(false)

  const reducedMotion = useReducedMotion()
  const logoRef = useRef<HTMLDivElement>(null)

  // Detect system dark mode, allow manual override
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Biometric detection + passkey locale
  useEffect(() => {
    if (!window.PublicKeyCredential) return
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then(available => {
        if (!available) return
        setBioAvailable(true)
        const ua = navigator.userAgent
        if (/iPhone|iPad/.test(ua)) { setFpLabel('Touch ID'); setFaceLabel('Face ID') }
        else if (/Macintosh/.test(ua)) { setFpLabel('Touch ID'); setFaceLabel('Face ID') }
        else if (/Android/.test(ua)) { setFpLabel('Impronta'); setFaceLabel('Volto') }
        else { setFpLabel('Impronta'); setFaceLabel('Windows Hello') }

        // Pre-compila email e abilita bio se questo device ha un passkey registrato
        const savedEmail = localStorage.getItem(PASSKEY_EMAIL_KEY)
        if (savedEmail) {
          setEmail(savedEmail)
          setHasSavedPasskey(true)
        }
      })
      .catch(() => { /* no biometric */ })
  }, [])

  const handleBioLogin = useCallback(async () => {
    if (!email || bioLoading) return
    sndClick()
    setBioLoading(true)
    setErrorMsg(null)
    setBtnState('loading')

    try {
      const optRes = await fetch('/api/auth/webauthn/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!optRes.ok) throw new Error('Nessuna credenziale biometrica per questa email')
      const { options, challengeId } = await optRes.json()

      const authResponse = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch('/api/auth/webauthn/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: authResponse, challengeId, email }),
      })
      if (!verifyRes.ok) {
        const err = await verifyRes.json()
        throw new Error(err.error ?? 'Verifica biometrica fallita')
      }
      const { otp } = await verifyRes.json()

      const supabase = getBrowserClient()
      const { error: otpErr } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
      if (otpErr) throw new Error(otpErr.message)

      sndSuccess()
      setBtnState('success')
      const safePath = safeRedirectPath(searchParams.get('next'), '/dashboard')
      setTimeout(() => { router.push(safePath); router.refresh() }, 600)

    } catch (e) {
      const msg = (e as Error).message
      const userCancelled = msg.includes('cancel') || msg.includes('abort') || msg.includes('NotAllowed')
      if (!userCancelled) setErrorMsg(msg)
      setBtnState('error')
      setBioLoading(false)
      setTimeout(() => setBtnState('idle'), 450)
    }
  }, [email, bioLoading, router, searchParams])

  const handleLogoClick = useCallback(() => {
    sndClick()
    if (reducedMotion) return
    setLogoAnimating(false)
    // Force reflow then re-enable to restart keyframe
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setLogoAnimating(true))
    })
  }, [reducedMotion])

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    sndClick()
    setLoading(true)
    setErrorMsg(null)
    setBtnState('loading')

    const supabase = getBrowserClient()
    let error
    try {
      const result = await supabase.auth.signInWithPassword({ email, password })
      error = result.error
    } catch {
      setErrorMsg('Connessione non disponibile. Riprova.')
      setBtnState('error')
      setLoading(false)
      setTimeout(() => setBtnState('idle'), 450)
      return
    }

    if (error) {
      setErrorMsg('Email o password non corretti')
      setBtnState('error')
      setLoading(false)
      // Reset error state after shake animation
      setTimeout(() => setBtnState('idle'), 450)
      return
    }

    sndSuccess()
    setBtnState('success')

    const safePath = safeRedirectPath(searchParams.get('next'), '/dashboard')

    // Mostra modal passkey se il device lo supporta e non è già registrato
    const canShowPasskey = bioAvailable && !hasSavedPasskey
    if (canShowPasskey) {
      setTimeout(() => setShowPasskeyModal(true), 400)
    } else {
      setTimeout(() => { router.push(safePath); router.refresh() }, 600)
    }

    setPendingRedirectPath(safePath)
  }, [loading, email, password, router, searchParams, bioAvailable, hasSavedPasskey])

  const [showPasskeyModal, setShowPasskeyModal] = useState(false)
  const [pendingRedirectPath, setPendingRedirectPath] = useState('/dashboard')

  const theme = isDark ? 'dark' : 'light'

  return (
    <>
    <div className="login-root" data-login-theme={theme}>
      {/* Theme toggle */}
      <button
        className="ua-thbtn"
        onClick={() => { setIsDark(d => !d); sndSnap() }}
        aria-label={isDark ? 'Passa alla modalità chiara' : 'Passa alla modalità scura'}
        aria-pressed={isDark}
      >
        {isDark ? '☀️' : '🌙'}
      </button>

      <div className="ua-wrap">
        {/* Brand copy — visible only on desktop */}
        <div className="ua-brand">
          <div className="ua-brand-h">
            Il laboratorio<br />
            più rapido,<br />
            più semplice,<br />
            più <span>UÀ.</span>
          </div>
          <p className="ua-brand-p">
            Dal banco alla consegna, tutto automatico.<br />
            DdC MDR, FatturaPA, WhatsApp — in un tap.
          </p>
        </div>

        {/* Login card */}
        <div className="ua-fside">
          <div className="ua-card">
            {/* Logo */}
            <div className="ua-la">
              <div
                ref={logoRef}
                className={`ua-lw${logoAnimating ? ' ua-bounce' : ''}`}
                onClick={handleLogoClick}
                role="button"
                tabIndex={0}
                aria-label="UÀ — clicca per sorpresa"
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLogoClick() } }}
                onAnimationEnd={() => setLogoAnimating(false)}
              >
                <img src="/ua-icon.png" alt="UÀ!" draggable={false} />
              </div>
              <p className="ua-tagline">
                Il laboratorio più rapido,<br />
                più semplice, più <em>UÀ.</em>
              </p>
            </div>

            {/* Error message — live region for screen readers */}
            {errorMsg && (
              <div className={`ua-emsg ua-emsg-v`} role="alert" aria-live="assertive">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} autoComplete="on" noValidate>
              {/* Email field */}
              <div className="ua-field">
                <label className="ua-flbl" htmlFor="ua-email">Email</label>
                <div className="ua-iw">
                  <div className="ua-ii" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <input
                    id="ua-email"
                    className="ua-inp"
                    type="email"
                    name="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={sndFocus}
                    placeholder="filippo@laboratorio.it"
                    autoComplete="username email"
                    inputMode="email"
                    required
                    aria-label="Indirizzo email"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="ua-field">
                <label className="ua-flbl" htmlFor="ua-password">Password</label>
                <div className="ua-iw">
                  <div className="ua-ii" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="ua-password"
                    className="ua-inp"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={sndFocus}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    className="ua-eye"
                    onClick={() => { setShowPassword(s => !s); sndSnap() }}
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    aria-pressed={showPassword}
                    tabIndex={0}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                      {showPassword ? EYE_CLOSED : EYE_OPEN}
                    </svg>
                  </button>
                </div>
              </div>

              {/* Remember me toggle */}
              <div className="ua-rem">
                <div className="toggle-wrapper" id="toggle-wrap">
                  <input
                    type="checkbox"
                    className="toggle-checkbox"
                    id="rem-check"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    onClick={() => sndSnap()}
                    aria-label="Ricorda su questo dispositivo"
                  />
                  <div className="toggle-container">
                    <div className="toggle-button">
                      <div className="toggle-button-circles-container">
                        {Array.from({ length: 12 }).map((_, i) => (
                          <div key={i} className="toggle-button-circle" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="ua-reml">Ricorda su questo dispositivo</span>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className={`ua-btn-main${btnState === 'loading' ? ' ua-btn-loading' : ''}${btnState === 'success' ? ' ua-btn-success' : ''}${btnState === 'error' ? ' ua-btn-err' : ''}`}
                disabled={loading}
                aria-busy={loading}
                aria-label={
                  btnState === 'loading' ? 'Accesso in corso...' :
                  btnState === 'success' ? 'Bentornato!' :
                  'Entra nel laboratorio'
                }
              >
                <span className="ua-bmt">
                  {btnState === 'loading' ? 'Accesso in corso...' :
                   btnState === 'success' ? 'Bentornato!' :
                   'Entra nel laboratorio'}
                </span>
              </button>

              {/* Biometric row: visibile solo se il device supporta biometrico
                  E l'utente ha già registrato un passkey su questo device */}
              {bioAvailable && hasSavedPasskey && (
                <div className="ua-bio-row" aria-label="Accesso biometrico">
                  <button
                    type="button"
                    className="ua-bio-btn"
                    aria-label={`Accedi con ${fpLabel}`}
                    onClick={handleBioLogin}
                    disabled={bioLoading || loading}
                  >
                    <div className={`ua-bio-circle${bioLoading ? ' ua-bio-scanning' : ''}`}>
                      <div className="ua-fp-img-wrap">
                        <img src="/finger.png" alt="" aria-hidden="true" className="ua-fp-img" draggable={false} />
                      </div>
                    </div>
                    <span className="ua-bio-lbl">{bioLoading ? '…' : fpLabel}</span>
                  </button>

                  <button
                    type="button"
                    className="ua-bio-btn"
                    aria-label={`Accedi con ${faceLabel}`}
                    onClick={handleBioLogin}
                    disabled={bioLoading || loading}
                  >
                    <div className={`ua-bio-circle${bioLoading ? ' ua-bio-scanning' : ''}`}>
                      <FaceIdIcon color="var(--ua-b)" />
                    </div>
                    <span className="ua-bio-lbl">{bioLoading ? '…' : faceLabel}</span>
                  </button>
                </div>
              )}
            </form>

            {/* Links */}
            <div className="ua-links">
              <a href="/forgot-password" className="ua-link">Password dimenticata?</a>
            </div>
          </div>

          {/* Security badge */}
          <div className="ua-sec">
            <div className="ua-sec-p">
              <div className="ua-sec-dot" aria-hidden="true" />
              <span className="ua-sec-t">Connessione cifrata &middot; GDPR</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {showPasskeyModal && (
      <PasskeyRegistrationModal
        email={email}
        onDone={() => {
          setShowPasskeyModal(false)
          router.push(pendingRedirectPath)
          router.refresh()
        }}
      />
    )}
    </>
  )
}
