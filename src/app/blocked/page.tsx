'use client'

import Image from 'next/image'
import { useState, useCallback } from 'react'
import { useReducedMotion } from '@/design-system/motion'

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

export default function BlockedPage() {
  const [logoAnimating, setLogoAnimating] = useState(false)
  const reducedMotion = useReducedMotion()

  const handleLogoClick = useCallback(() => {
    sndClick()
    if (reducedMotion) return
    setLogoAnimating(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setLogoAnimating(true)))
  }, [reducedMotion])

  return (
    <div className="login-root" data-login-theme="dark">
      <div className="ua-wrap" style={{ maxWidth: '400px' }}>
        <div className="ua-fside" style={{ flex: 'none', width: '100%' }}>
          <div className="ua-card" style={{ gap: '32px', padding: '44px 28px 40px' }}>

            {/* Logo — desaturated with X overlay */}
            <div className="ua-la">
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  className={`ua-lw${logoAnimating ? ' ua-bounce' : ''}`}
                  onClick={handleLogoClick}
                  onAnimationEnd={() => setLogoAnimating(false)}
                  role="button"
                  tabIndex={0}
                  aria-label="UÀ"
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleLogoClick() } }}
                  style={{ opacity: 0.5, filter: 'grayscale(1)' }}
                >
                  <Image src="/ua-icon.png" alt="UÀ!" width={80} height={80} draggable={false} />
                </div>
                <div
                  style={{
                    position: 'absolute', inset: '-5px', borderRadius: '26px',
                    border: '2.5px solid var(--ua-red)',
                    background: 'rgba(232,0,26,.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                  aria-hidden="true"
                >
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path d="M9 9L19 19M19 9L9 19" stroke="var(--ua-red)" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Status chip */}
            <div className="ua-bill-chip error" style={{ alignSelf: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 1.5L12.5 11H1.5L7 1.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M7 5.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="7" cy="10" r=".7" fill="currentColor"/>
              </svg>
              Accesso revocato
            </div>

            {/* Message */}
            <div style={{ textAlign: 'center' }}>
              <h1 className="ua-page-title">Questo account è stato sospeso</h1>
              <p className="ua-page-sub" style={{ marginTop: '4px' }}>
                L&apos;accesso a UÀ è stato revocato dall&apos;amministratore di sistema.
              </p>
            </div>

            {/* Revoke info box */}
            <div className="ua-revoke-box" role="region" aria-label="Istruzioni per l'assistenza" style={{ marginTop: '8px' }}>
              <div className="ua-revoke-title">Come procedere</div>
              <p>
                Scrivi a <strong>supporto@ua.app</strong> indicando il nome del laboratorio
                e il motivo del contatto.
                <span className="ua-revoke-note">
                  Rispondiamo entro 24 ore lavorative. Nessuna azione è disponibile su questa schermata.
                </span>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
