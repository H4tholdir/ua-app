'use client'

import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

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

  return (
    <nav className="adm-nav">
      <Link className="adm-nav-logo" href="/admin/labs">
        <Image src="/ua-icon.png" alt="UÀ" width={80} height={80} draggable={false} />
      </Link>
      <span className="adm-nav-badge">admin</span>
      <div className="adm-nav-sep" />
      <span className="adm-nav-user">{userDisplay}</span>
      <button className="adm-nav-theme" onClick={toggle} title="Cambia tema" aria-label="Cambia tema">
        {isDark ? '☀️' : '🌙'}
      </button>
    </nav>
  )
}
