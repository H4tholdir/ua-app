'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
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

// ─── Password strength ────────────────────────────────────────────────────────
type StrengthLevel = 0 | 1 | 2 | 3 | 4
function getStrength(pw: string): StrengthLevel {
  if (!pw) return 0
  if (pw.length < 8) return 1
  let score = 1
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(4, score) as StrengthLevel
}
const STRENGTH_LABELS = ['', 'Debole', 'Discreta', 'Buona', 'Ottima']
const STRENGTH_FILLS = ['', 'weak', 'fair', 'good', 'strong'] as const

// ─── Confetti engine ──────────────────────────────────────────────────────────
const RED_CONFETTI = [
  '#D90012','#F01828','#A80010','#FF3344','#B50014',
  '#E8001A','#FF6677','#C0001A','#FF0022','#8B0000',
  '#FF4455','#D4001B','#FF2233',
]

class ConfettiParticle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; rotation: number; rotSpeed: number
  shape: 'rect' | 'circle'; life: number; decay: number

  constructor(x: number, y: number) {
    this.x = x; this.y = y
    this.vx = (Math.random() - 0.5) * 15
    this.vy = (Math.random() - 1.3) * 13
    this.color = RED_CONFETTI[Math.floor(Math.random() * RED_CONFETTI.length)]
    this.size = Math.random() * 9 + 4
    this.rotation = Math.random() * Math.PI * 2
    this.rotSpeed = (Math.random() - 0.5) * 0.32
    this.shape = Math.random() < 0.55 ? 'rect' : 'circle'
    this.life = 1
    this.decay = Math.random() * 0.013 + 0.007
  }
  update() {
    this.vx *= 0.98; this.vy += 0.46
    this.x += this.vx; this.y += this.vy
    this.rotation += this.rotSpeed; this.life -= this.decay
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.globalAlpha = Math.max(0, this.life)
    ctx.fillStyle = this.color
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)
    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2)
    } else {
      ctx.beginPath(); ctx.arc(0, 0, this.size / 2.5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResetForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isDark, setIsDark] = useState(false)
  const [logoAnimating, setLogoAnimating] = useState(false)

  const reducedMotion = useReducedMotion()
  const logoRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<ConfettiParticle[]>([])
  const rafRef = useRef<number | null>(null)

  const strength = getStrength(password)
  const mismatch = confirm.length > 0 && confirm !== password

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mq.addEventListener('change', handler)
    return () => {
      mq.removeEventListener('change', handler)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const handleLogoClick = useCallback(() => {
    sndClick()
    if (reducedMotion) return
    setLogoAnimating(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setLogoAnimating(true)))
  }, [reducedMotion])

  const launchConfetti = useCallback((originX: number, originY: number) => {
    if (reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    for (let i = 0; i < 95; i++) particlesRef.current.push(new ConfettiParticle(originX, originY))

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particlesRef.current = particlesRef.current.filter(p => p.life > 0)
      particlesRef.current.forEach(p => { p.update(); p.draw(ctx) })
      if (particlesRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        rafRef.current = null
      }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [reducedMotion])

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading || mismatch) return

    if (strength < 2) {
      setErrorMsg('Scegli una password di almeno 8 caratteri')
      return
    }

    sndClick()
    setLoading(true)
    setErrorMsg(null)

    const supabase = getBrowserClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg('Errore durante il reset. Richiedi un nuovo link.')
      setLoading(false)
      return
    }

    // Confetti burst from button position
    const btn = (e.currentTarget as HTMLFormElement).querySelector<HTMLElement>('[data-save-btn]')
    if (btn) {
      const r = btn.getBoundingClientRect()
      launchConfetti(r.left + r.width / 2, r.top + r.height / 2)
    }

    sndSuccess()
    setLoading(false)
    setSuccess(true)
  }, [password, loading, mismatch, strength, launchConfetti])

  const theme = isDark ? 'dark' : 'light'

  return (
    <>
      {/* Confetti canvas — fixed overlay, pointer-events:none */}
      <canvas ref={canvasRef} className="ua-confetti-canvas" aria-hidden="true" />

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

              {success ? (
                /* ── Password saved state ── */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', textAlign: 'center' }}>
                  <div className="ua-success-icon">
                    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                      <circle cx="17" cy="17" r="13" stroke="var(--ua-g)" strokeWidth="1.8"/>
                      <path d="M10 17L14.5 21.5L24 12.5" stroke="var(--ua-g)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <h1 className="ua-page-title">Password aggiornata!</h1>
                    <p className="ua-page-sub" style={{ marginTop: '6px' }}>
                      La tua password è stata salvata.<br />
                      Accedi con le nuove credenziali.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="ua-btn-main"
                    style={{ marginTop: '4px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    onClick={() => sndClick()}
                  >
                    <span className="ua-bmt">Vai al login</span>
                  </Link>
                </div>
              ) : (
                /* ── Form state ── */
                <>
                  <div style={{ marginBottom: '2px' }}>
                    <h1 className="ua-page-title">Nuova password</h1>
                    <p className="ua-page-sub">
                      Scegli una password sicura di almeno 8 caratteri.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} autoComplete="off" noValidate>

                    {/* New password */}
                    <div className="ua-field">
                      <label className="ua-flbl" htmlFor="rp-password">Nuova password</label>
                      <div className="ua-iw">
                        <div className="ua-ii" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                        <input
                          id="rp-password"
                          className="ua-inp"
                          type="password"
                          value={password}
                          onChange={e => { setPassword(e.target.value); setErrorMsg(null) }}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          autoFocus
                          required
                          aria-label="Nuova password"
                          aria-describedby="rp-strength"
                        />
                      </div>
                      {/* Strength bars */}
                      {password.length > 0 && (
                        <div id="rp-strength">
                          <div
                            className="ua-strength-row"
                            role="progressbar"
                            aria-valuenow={strength}
                            aria-valuemin={0}
                            aria-valuemax={4}
                            aria-label={`Sicurezza password: ${STRENGTH_LABELS[strength]}`}
                          >
                            {([1, 2, 3, 4] as const).map(n => (
                              <div
                                key={n}
                                className="ua-str-bar"
                                data-fill={n <= strength ? STRENGTH_FILLS[strength] : ''}
                              />
                            ))}
                          </div>
                          <span className="ua-str-label">{STRENGTH_LABELS[strength]}</span>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div className="ua-field">
                      <label className="ua-flbl" htmlFor="rp-confirm">Conferma password</label>
                      <div
                        className="ua-iw"
                        style={mismatch ? { boxShadow: 'var(--ua-sh-i), 0 0 0 2px var(--ua-red)' } : undefined}
                      >
                        <div className="ua-ii" aria-hidden="true" style={mismatch ? { color: 'var(--ua-red)' } : undefined}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                        <input
                          id="rp-confirm"
                          className="ua-inp"
                          type="password"
                          value={confirm}
                          onChange={e => { setConfirm(e.target.value); setErrorMsg(null) }}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          required
                          aria-label="Conferma password"
                          aria-invalid={mismatch}
                          style={mismatch ? { color: 'var(--ua-red)' } : undefined}
                        />
                      </div>
                      {mismatch && (
                        <div className="ua-err-pill" role="alert">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <circle cx="8" cy="8" r="7" stroke="var(--ua-red)" strokeWidth="1.4"/>
                            <path d="M8 5V8.5" stroke="var(--ua-red)" strokeWidth="1.6" strokeLinecap="round"/>
                            <circle cx="8" cy="11" r=".8" fill="var(--ua-red)"/>
                          </svg>
                          <span>Le password non coincidono</span>
                        </div>
                      )}
                    </div>

                    {/* API error */}
                    {errorMsg && (
                      <div className="ua-err-pill" role="alert" style={{ marginBottom: '14px' }}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="7" stroke="var(--ua-red)" strokeWidth="1.4"/>
                          <path d="M8 5V8.5" stroke="var(--ua-red)" strokeWidth="1.6" strokeLinecap="round"/>
                          <circle cx="8" cy="11" r=".8" fill="var(--ua-red)"/>
                        </svg>
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      data-save-btn
                      className="ua-btn-main"
                      disabled={loading || mismatch}
                      aria-busy={loading}
                    >
                      <span className="ua-bmt">
                        {loading ? 'Salvataggio…' : 'Salva nuova password'}
                      </span>
                    </button>

                  </form>
                </>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
