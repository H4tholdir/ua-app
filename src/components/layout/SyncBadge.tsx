'use client'

import { useState, useEffect } from 'react'

export function SyncBadge({ lastUpdatedAt }: { lastUpdatedAt?: Date | null }) {
  const [label, setLabel] = useState('Aggiornato ora')
  const [isOnline, setIsOnline] = useState(true)
  const [now, setNow] = useState<number>(0)

  useEffect(() => {
    // Initialize from navigator on mount
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    // Use callbacks to avoid synchronous setState in effect body
    handleOnline()
    if (!navigator.onLine) { handleOffline() }
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const update = () => {
      const currentNow = Date.now()
      setNow(currentNow)
      if (!lastUpdatedAt) { setLabel('Aggiornato ora'); return }
      const diffSec = Math.floor((currentNow - lastUpdatedAt.getTime()) / 1000)
      if (diffSec < 60) setLabel('Aggiornato ora')
      else if (diffSec < 3600) setLabel(`${Math.floor(diffSec / 60)} min fa`)
      else setLabel(`${Math.floor(diffSec / 3600)}h fa`)
    }
    update()
    const interval = setInterval(update, 30_000)
    return () => clearInterval(interval)
  }, [lastUpdatedAt])

  const dotColor = !isOnline
    ? 'var(--primary, #D90012)'
    : lastUpdatedAt && now > 0 && now - lastUpdatedAt.getTime() > 5 * 60_000
    ? 'var(--warning, #B45309)'
    : 'var(--success, #3DCB5C)'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '9px',
      fontWeight: 500,
      color: 'var(--t2, #96918D)',
      background: 'var(--sfc, #E4DFD9)',
      padding: '3px 8px',
      borderRadius: '100px',
      fontFamily: 'DM Sans, sans-serif',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
                  -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
    }}>
      <span
        aria-hidden="true"
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          background: dotColor,
          transition: 'background .3s',
          ...(isOnline ? { animation: 'ua-pulse 2.5s infinite' } : {}),
        }}
      />
      {!isOnline ? 'Offline' : label}
    </div>
  )
}
