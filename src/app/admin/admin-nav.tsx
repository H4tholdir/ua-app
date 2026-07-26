'use client'

import Image from 'next/image'
import { useCallback } from 'react'
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
  // La memoria separata 'ua-admin-theme' non esiste piu' (D7): l'amministrazione
  // legge lo stesso tema di tutto il resto, gia' scritto su <html> dallo script
  // inline prima della prima pittura. Prima c'era una corsa reale fra le due
  // chiavi, e la barra di stato lampeggiava dopo l'idratazione.
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

      {/* Logout — Uiverse.io by vinodjangid07 */}
      <button className="adm-nav-logout-btn" onClick={logout} title="Esci" aria-label="Logout">
        <div className="adm-logout-sign">
          <svg viewBox="0 0 512 512" aria-hidden="true">
            <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z"/>
          </svg>
        </div>
        <div className="adm-logout-text">Logout</div>
      </button>
    </nav>
  )
}
