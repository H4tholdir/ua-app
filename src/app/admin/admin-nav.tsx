'use client'

import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase/browser-anon'

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

interface Props { userDisplay: string }

export default function AdminNav({ userDisplay }: Props) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('ua-admin-theme')
    return stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const toggle = useCallback(() => {
    sndClick()
    setIsDark(prev => {
      const next = !prev
      localStorage.setItem('ua-admin-theme', next ? 'dark' : 'light')
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light')
      return next
    })
  }, [])

  const logout = useCallback(async () => {
    sndClick()
    const supabase = getBrowserClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }, [])

  return (
    <nav className="adm-nav">
      <Link className="adm-nav-logo" href="/admin/labs">
        <Image src="/ua-icon.png" alt="UÀ" width={80} height={80} draggable={false} />
      </Link>
      <span className="adm-nav-badge">admin</span>
      <div className="adm-nav-sep" />
      <span className="adm-nav-user">{userDisplay}</span>

      {/* Toggle light/dark — pattern trk/tmb dal design system reference */}
      <button
        className={`adm-nav-trk${isDark ? '' : ' on'}`}
        onClick={toggle}
        title={isDark ? 'Passa a light' : 'Passa a dark'}
        aria-label="Cambia tema"
        aria-pressed={!isDark}
      >
        <span className="adm-nav-tmb" />
      </button>

      {/* Logout — rosso animato */}
      <button className="adm-nav-logout-btn" onClick={logout} title="Esci" aria-label="Logout">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 14H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M10.5 11L14 8l-3.5-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </nav>
  )
}
