'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minuti

interface Props {
  lavoroId: string
  dataConsegnaEffettiva: string
}

export function AnnullaConsegnaBanner({ lavoroId, dataConsegnaEffettiva }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const elapsed = Date.now() - new Date(dataConsegnaEffettiva).getTime()
    return Math.max(0, Math.floor((GRACE_PERIOD_MS - elapsed) / 1000))
  })
  const [errore, setErrore] = useState<string | null>(null)
  const [annullato, setAnnullato] = useState(false)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) { clearInterval(interval); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [secondsLeft])

  if (secondsLeft <= 0 || annullato) return null

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  const handleAnnulla = async () => {
    setErrore(null)
    startTransition(async () => {
      try {
        const res = await fetch(`/api/lavori/${lavoroId}/annulla-consegna`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (res.ok) {
          setAnnullato(true)
          router.refresh()
        } else {
          const json = await res.json().catch(() => ({}))
          setErrore(json.error ?? 'Errore durante l\'annullamento')
        }
      } catch {
        setErrore('Errore di rete — controlla la connessione')
      }
    })
  }

  return (
    <div
      role="alert"
      style={{
        margin: '0 20px 16px',
        borderRadius: '14px',
        padding: '14px 16px',
        background: 'rgba(212, 168, 67, 0.10)',
        border: '1px solid rgba(212, 168, 67, 0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--t1, #1C1916)',
          margin: '0 0 2px',
        }}>
          Consegna completata — puoi annullarla
        </p>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: 'var(--t2, #96918D)',
          margin: 0,
        }}>
          Finestra disponibile ancora {mm}:{ss}
        </p>
        {errore && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--primary, #D90012)',
            margin: '4px 0 0',
          }}>
            {errore}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={handleAnnulla}
        disabled={isPending}
        style={{
          flexShrink: 0,
          padding: '10px 16px',
          borderRadius: '10px',
          border: 'none',
          background: 'var(--elv, #EDEDEA)',
          color: 'var(--t1, #1C1916)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          cursor: isPending ? 'not-allowed' : 'pointer',
          opacity: isPending ? 0.7 : 1,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.88), 9px 12px 22px -4px rgba(148,128,118,.40)',
          minHeight: '44px',
          transition: 'opacity 0.1s',
        }}
        aria-busy={isPending}
      >
        {isPending ? '...' : 'Annulla'}
      </button>
    </div>
  )
}
