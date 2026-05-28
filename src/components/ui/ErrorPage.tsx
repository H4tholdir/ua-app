'use client'
import { useEffect } from 'react'
import { motion } from 'motion/react'
import { motionTokens } from '@/design-system/motion'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[UÀ Error]', error)
  }, [error])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionTokens.duration.normal,
        ease: motionTokens.easing.enter,
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '32px 24px',
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
          marginBottom: 20,
        }}
        aria-hidden="true"
      >
        ⚠
      </div>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--t1, #1C1916)',
          marginBottom: 8,
          marginTop: 0,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Qualcosa è andato storto
      </h2>

      <p
        style={{
          fontSize: 14,
          color: 'var(--t2, #4A3D33)',
          marginBottom: 28,
          marginTop: 0,
          maxWidth: 280,
          lineHeight: 1.5,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Si è verificato un errore durante il caricamento. Riprova — di solito si risolve al secondo tentativo.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          width: '100%',
          maxWidth: 280,
        }}
      >
        <button
          type="button"
          onClick={reset}
          style={{
            height: 52,
            borderRadius: 32,
            border: 'none',
            background: 'var(--primary, #D90012)',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow:
              'var(--sh-b)',
          }}
        >
          Riprova
        </button>

        <a
          href="/dashboard"
          style={{
            height: 52,
            borderRadius: 32,
            border: 'none',
            background: 'var(--elv, #EDEDEA)',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              'var(--sh-c)',
          }}
        >
          Torna alla dashboard
        </a>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <pre
          style={{
            marginTop: 20,
            fontSize: 10,
            color: 'var(--t3, #6B5C51)',
            textAlign: 'left',
            maxWidth: '100%',
            overflow: 'auto',
            background: 'var(--sfc, #E4DFD9)',
            padding: 12,
            borderRadius: 8,
          }}
        >
          {error.message}
        </pre>
      )}
    </motion.div>
  )
}
