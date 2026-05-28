'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[UÀ] App error:', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--bg, #DDD8D3)',
        gap: '20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(217,0,18,0.10)',
          border: '1px solid rgba(217,0,18,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
        }}
        aria-hidden="true"
      >
        ⚠
      </div>

      <div>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--t1, #1C1916)',
            margin: '0 0 8px',
          }}
        >
          Qualcosa è andato storto
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: 'var(--t2, #4A3D33)',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: '300px',
          }}
        >
          Ricarica la pagina o torna alla dashboard. Se il problema persiste, contatta il supporto.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
        <button
          type="button"
          onClick={reset}
          style={{
            height: '52px',
            borderRadius: '32px',
            border: 'none',
            background: 'var(--primary, #D90012)',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.20), 9px 13px 22px -4px rgba(148,128,118,.44)',
          }}
        >
          Riprova
        </button>
        <a
          href="/dashboard"
          style={{
            height: '52px',
            borderRadius: '32px',
            border: 'none',
            background: 'var(--elv, #EDEDEA)',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.88), 9px 12px 22px -4px rgba(148,128,118,.40)',
          }}
        >
          Torna alla dashboard
        </a>
      </div>
    </div>
  )
}
