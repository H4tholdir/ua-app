'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from '@/design-system/motion'

// ── Price IDs (client-safe — these are publishable references) ───────────────
const PRICES = {
  lab:  { monthly: 'price_1TWCfaRsMhN7mg7YVt0UfeNB', yearly: 'price_1TWCfbRsMhN7mg7Y7Ejl1k5w' },
  rete: { monthly: 'price_1TWCfbRsMhN7mg7YDXKFJkdN', yearly: 'price_1TWCfcRsMhN7mg7YBZSz1gId' },
}

// ── Audio helpers ─────────────────────────────────────────────────────────────
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

// ── Gold confetti engine ──────────────────────────────────────────────────────
const GOLD_PALETTE = [
  '#D4A843','#F0C060','#B8902E','#E8B84A','#FFD700',
  '#C8A000','#F5C842','#A87800','#FFCC44','#E8A000',
  '#FFC107','#D4900A','#FFE066','#B07800','#F0A800',
]

class GoldParticle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; rot: number; rotS: number
  shape: 'rect' | 'circle'; life: number; decay: number

  constructor(x: number, y: number) {
    this.x = x; this.y = y
    this.vx = (Math.random() - 0.5) * 16
    this.vy = (Math.random() - 1.4) * 14
    this.color = GOLD_PALETTE[Math.floor(Math.random() * GOLD_PALETTE.length)]
    this.size = Math.random() * 10 + 4
    this.rot = Math.random() * Math.PI * 2
    this.rotS = (Math.random() - 0.5) * 0.28
    this.shape = Math.random() < 0.5 ? 'rect' : 'circle'
    this.life = 1
    this.decay = Math.random() * 0.011 + 0.007
  }
  update() {
    this.vx *= 0.98; this.vy += 0.44
    this.x += this.vx; this.y += this.vy
    this.rot += this.rotS; this.life -= this.decay
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save(); ctx.globalAlpha = Math.max(0, this.life)
    ctx.fillStyle = this.color
    ctx.translate(this.x, this.y); ctx.rotate(this.rot)
    if (this.shape === 'rect') {
      ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2)
    } else {
      ctx.beginPath(); ctx.arc(0, 0, this.size / 2.5, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  labNome: string
  reason: 'trial_expired' | 'expired' | 'sospeso'
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function BillingContent({ labNome, reason }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<'lab' | 'rete'>('lab')
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [showReteInfo, setShowReteInfo] = useState(false)
  const [logoAnimating, setLogoAnimating] = useState(false)

  const reducedMotion = useReducedMotion()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const partRef = useRef<GoldParticle[]>([])
  const rafRef = useRef<number | null>(null)

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }, [])

  const handleLogoClick = useCallback(() => {
    sndClick()
    if (reducedMotion) return
    setLogoAnimating(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setLogoAnimating(true)))
  }, [reducedMotion])

  const launchConfetti = useCallback((btnEl: HTMLElement) => {
    if (reducedMotion) return
    const canvas = canvasRef.current; if (!canvas) return
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const r = btnEl.getBoundingClientRect()
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    for (let i = 0; i < 90; i++) partRef.current.push(new GoldParticle(cx, cy))
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      partRef.current = partRef.current.filter(p => p.life > 0)
      partRef.current.forEach(p => { p.update(); p.draw(ctx) })
      if (partRef.current.length > 0) { rafRef.current = requestAnimationFrame(tick) }
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); rafRef.current = null }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [reducedMotion])

  const handleCtaClick = useCallback((e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    sndClick()
    launchConfetti(e.currentTarget as HTMLElement)
  }, [launchConfetti])

  const selectPlan = useCallback((plan: 'lab' | 'rete') => {
    sndClick()
    setSelectedPlan(plan)
    setShowReteInfo(plan === 'rete')
  }, [])

  const toggleBilling = useCallback((mode: 'monthly' | 'yearly') => {
    sndClick()
    setBilling(mode)
  }, [])

  const selectedPriceId = PRICES[selectedPlan][billing]

  const chipConfig = {
    trial_expired: { label: 'Prova terminata', cls: 'warn' },
    expired:       { label: 'Abbonamento scaduto', cls: 'warn' },
    sospeso:       { label: 'Pagamento fallito', cls: 'error' },
  }[reason]

  return (
    <>
      <canvas ref={canvasRef} className="ua-billing-confetti" aria-hidden="true" />

      <div className="login-root" data-login-theme="light">
        <div className="ua-wrap" style={{ maxWidth: '400px' }}>
          <div className="ua-fside" style={{ flex: 'none', width: '100%' }}>
            <div className="ua-card">

              {/* Logo */}
              <div className="ua-la">
                <div
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

              {/* Status chip */}
              <div className={`ua-bill-chip ${chipConfig.cls}`} style={{ alignSelf: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1.5L12.5 11H1.5L7 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  <path d="M7 5.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="7" cy="10" r=".7" fill="currentColor"/>
                </svg>
                {chipConfig.label}
              </div>

              {/* Lab name */}
              <p className="ua-flbl" style={{ textAlign: 'center', marginTop: '-8px' }}>{labNome}</p>

              {/* ── Trial expired — plan selector ── */}
              {reason === 'trial_expired' && (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', fontStyle: 'italic', color: 'var(--ua-t2)', marginBottom: '4px' }}>
                      Come ti sei trovato con UÀ?
                    </p>
                    <h1 className="ua-page-title">Continua senza interruzioni</h1>
                    <p className="ua-page-sub" style={{ marginTop: '4px' }}>
                      Scegli il piano e attiva — tutto rimane esattamente com'era.
                    </p>
                  </div>

                  {/* Billing toggle */}
                  <div className="ua-bill-toggle" role="group" aria-label="Frequenza di pagamento">
                    <button
                      className={`ua-bill-toggle-btn${billing === 'monthly' ? ' active' : ''}`}
                      onClick={() => toggleBilling('monthly')}
                      aria-pressed={billing === 'monthly'}
                    >
                      Mensile
                    </button>
                    <button
                      className={`ua-bill-toggle-btn${billing === 'yearly' ? ' active' : ''}`}
                      onClick={() => toggleBilling('yearly')}
                      aria-pressed={billing === 'yearly'}
                    >
                      Annuale
                      <span className="ua-bill-save-badge">2 mesi gratis</span>
                    </button>
                  </div>

                  {/* Plan grid */}
                  <div className="ua-plan-grid" role="radiogroup" aria-label="Scelta piano">

                    {/* Lab */}
                    <div
                      className={`ua-plan-card${selectedPlan === 'lab' ? ' active' : ''}`}
                      onClick={() => selectPlan('lab')}
                      role="radio"
                      aria-checked={selectedPlan === 'lab'}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlan('lab') } }}
                    >
                      <div className="ua-plan-name">Laboratorio</div>
                      <div className="ua-plan-desc">Un laboratorio, utenti illimitati</div>
                      <div className="ua-plan-price">
                        {billing === 'yearly' ? '€41' : '€49'}<span>/mese</span>
                      </div>
                      <div className="ua-plan-savings" style={{ visibility: billing === 'yearly' ? 'visible' : 'hidden' }}>
                        €490/anno · risparmi €98
                      </div>
                    </div>

                    {/* Rete */}
                    <div
                      className={`ua-plan-card${selectedPlan === 'rete' ? ' active' : ''}`}
                      onClick={() => selectPlan('rete')}
                      role="radio"
                      aria-checked={selectedPlan === 'rete'}
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlan('rete') } }}
                    >
                      <span className="ua-plan-badge">PRO</span>
                      <div className="ua-plan-name">Rete</div>
                      <div className="ua-plan-desc">Più laboratori, gestione centralizzata</div>
                      <div className="ua-plan-price">
                        {billing === 'yearly' ? '€124' : '€149'}<span>/mese</span>
                      </div>
                      <div className="ua-plan-savings" style={{ visibility: billing === 'yearly' ? 'visible' : 'hidden' }}>
                        €1.490/anno · risparmi €298
                      </div>
                    </div>
                  </div>

                  {/* Rete info box */}
                  {showReteInfo && (
                    <div className="ua-rete-info" role="region" aria-label="Dettagli piano Rete">
                      <div className="ua-rete-info-title">Piano Rete — per più laboratori</div>
                      {[
                        'Gestisci più sedi da un unico admin panel',
                        'Report aggregati su tutti i laboratori',
                        'Fatturazione unica per tutta la rete',
                      ].map(item => (
                        <div key={item} className="ua-rete-check">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                            <circle cx="7" cy="7" r="5.5" stroke="#D4A843" strokeWidth="1.4"/>
                            <path d="M4.5 7L6.2 8.7L9.5 5.5" stroke="#D4A843" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {item}
                        </div>
                      ))}
                      <div className="ua-rete-check" style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(212,168,67,.18)' }}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <circle cx="7" cy="7" r="5.5" stroke="var(--ua-t3)" strokeWidth="1.4"/>
                          <path d="M7 4.5V7" stroke="var(--ua-t3)" strokeWidth="1.4" strokeLinecap="round"/>
                          <circle cx="7" cy="9.5" r=".6" fill="var(--ua-t3)"/>
                        </svg>
                        <span style={{ color: 'var(--ua-t3)', fontStyle: 'italic' }}>
                          Il piano Rete ha un contratto dedicato — ti contatteremo entro 24h per il setup.
                        </span>
                      </div>
                    </div>
                  )}

                  <a
                    href={`/api/stripe/checkout?price=${selectedPriceId}`}
                    className="ua-btn-gold"
                    onClick={handleCtaClick}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M2 9H16M10 3L16 9L10 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {billing === 'yearly'
                      ? `Attiva piano ${selectedPlan === 'lab' ? 'Lab' : 'Rete'} annuale`
                      : selectedPlan === 'rete' ? 'Continua con piano Rete' : 'Attiva abbonamento'}
                  </a>
                </>
              )}

              {/* ── Expired — renewal ── */}
              {reason === 'expired' && (
                <>
                  <div style={{ textAlign: 'center' }}>
                    <h1 className="ua-page-title">Il tuo abbonamento è scaduto</h1>
                    <p className="ua-page-sub" style={{ marginTop: '4px' }}>
                      Rinnova per riprendere esattamente da dove hai lasciato.
                    </p>
                  </div>

                  <div className="ua-safe-row">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                      <path d="M14 3L5 7V14C5 18.97 9.03 23.56 14 25C18.97 23.56 23 18.97 23 14V7L14 3Z"
                        stroke="#3DCB5C" strokeWidth="1.6" strokeLinejoin="round"/>
                      <path d="M10 14L12.5 16.5L18 11" stroke="#3DCB5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <div className="ua-safe-text">
                      <strong>I tuoi dati sono al sicuro.</strong><br />
                      Lavori, DdC, fatture — tutto conservato, nulla cancellato.
                    </div>
                  </div>

                  <a href="/api/stripe/portal" className="ua-btn-gold" onClick={handleCtaClick}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M3 9a6 6 0 1 1 1.5 4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                      <path d="M3 13V9H7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Rinnova abbonamento
                  </a>
                </>
              )}

              {/* ── Sospeso — payment failed ── */}
              {reason === 'sospeso' && (
                <>
                  <div className="ua-danger-box" role="alert">
                    <p>
                      <strong>Il pagamento non è andato a buon fine.</strong><br />
                      L&apos;accesso è sospeso fino al rinnovo del metodo di pagamento.
                      Agisci prima che i dati diventino inaccessibili.
                    </p>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <p className="ua-flbl" style={{ marginBottom: '4px' }}>{labNome}</p>
                    <p className="ua-page-sub">
                      Aggiorna la carta o il conto bancario nel portale Stripe — bastano 30 secondi.
                    </p>
                  </div>

                  <a href="/api/stripe/portal" className="ua-btn-gold" onClick={handleCtaClick}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <rect x="2" y="5" width="14" height="10" rx="2" stroke="white" strokeWidth="1.8"/>
                      <path d="M2 8H16" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                      <path d="M5 12H7" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
                    </svg>
                    Aggiorna pagamento
                  </a>
                </>
              )}

              {/* Support link */}
              <a href="mailto:supporto@ua.app" className="support" style={{ fontSize: '12px', color: 'var(--ua-t3)', textAlign: 'center', textDecoration: 'none' }}>
                Problemi? supporto@ua.app
              </a>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}
