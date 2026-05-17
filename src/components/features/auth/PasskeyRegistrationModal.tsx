'use client'

import { useState, useCallback } from 'react'
import { startRegistration } from '@simplewebauthn/browser'

const PASSKEY_KEY = 'ua_passkey_email'
const PASSKEY_SKIP_KEY = 'ua_passkey_skip_until'
const SKIP_DAYS = 30

interface Props {
  email: string
  onDone: () => void
}

export default function PasskeyRegistrationModal({ email, onDone }: Props) {
  const [state, setState] = useState<'idle' | 'registering' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleRegister = useCallback(async () => {
    setState('registering')
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/webauthn/register/options', { method: 'POST' })
      if (!res.ok) throw new Error(await res.text())
      const { options, challengeId } = await res.json()

      const regResponse = await startRegistration({ optionsJSON: options })

      // Inferisci nome dispositivo
      const ua = navigator.userAgent
      const deviceName = /iPhone/.test(ua) ? 'iPhone'
        : /iPad/.test(ua) ? 'iPad'
        : /Mac/.test(ua) ? 'Mac'
        : /Android/.test(ua) ? 'Android'
        : 'Dispositivo'

      const verifyRes = await fetch('/api/auth/webauthn/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: regResponse, challengeId, deviceName }),
      })

      if (!verifyRes.ok) {
        const err = await verifyRes.json()
        throw new Error(err.error ?? 'Registrazione fallita')
      }

      // Salva email per il login page
      localStorage.setItem(PASSKEY_KEY, email)
      setState('success')
      setTimeout(onDone, 1500)

    } catch (e) {
      const msg = (e as Error).message
      // L'utente ha cancellato il prompt — non è un errore da mostrare
      if (msg.includes('cancelled') || msg.includes('abort') || msg.includes('NotAllowed')) {
        onDone()
        return
      }
      setErrorMsg(msg)
      setState('error')
    }
  }, [email, onDone])

  const handleSkip = useCallback(() => {
    const until = new Date()
    until.setDate(until.getDate() + SKIP_DAYS)
    localStorage.setItem(PASSKEY_SKIP_KEY, until.toISOString())
    onDone()
  }, [onDone])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Attiva accesso biometrico"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom)',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 480,
        padding: '28px 24px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 8px', color: 'var(--t1, #1C1916)' }}>
          Accedi più veloce
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#6b7280', margin: '0 0 24px', lineHeight: 1.5 }}>
          Attiva Touch ID o Face ID su questo dispositivo.
          <br />La prossima volta entri in un tap, senza password.
        </p>

        {state === 'success' && (
          <p style={{ color: 'var(--success, #16A34A)', fontWeight: 600, marginBottom: 16 }}>
            ✓ Attivato! La prossima volta usa il tuo biometrico.
          </p>
        )}

        {state === 'error' && (
          <p style={{ color: '#e53e3e', fontSize: '0.85rem', marginBottom: 16 }}>{errorMsg}</p>
        )}

        {state !== 'success' && (
          <>
            <button
              onClick={handleRegister}
              disabled={state === 'registering'}
              style={{
                width: '100%', padding: '14px',
                borderRadius: 12, border: 'none',
                background: state === 'registering' ? 'rgba(217,0,18,.4)' : 'var(--primary, #D90012)',
                color: '#fff', fontSize: '1rem', fontWeight: 600,
                cursor: state === 'registering' ? 'default' : 'pointer',
                marginBottom: 12,
              }}
            >
              {state === 'registering' ? 'Attivazione…' : '🪪 Attiva biometrico'}
            </button>
            <button
              onClick={handleSkip}
              disabled={state === 'registering'}
              style={{
                background: 'transparent', border: 'none',
                color: '#9ca3af', fontSize: '0.85rem',
                cursor: 'pointer', padding: '8px',
              }}
            >
              Non adesso (chiedi tra {SKIP_DAYS} giorni)
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// Helper per sapere se mostrare il modal
export function shouldShowPasskeyModal(email: string): boolean {
  // Già registrato per questa email
  if (typeof window === 'undefined') return false
  if (localStorage.getItem(PASSKEY_KEY) === email) return false
  // Utente ha scelto "non adesso" e il periodo non è scaduto
  const skipUntil = localStorage.getItem(PASSKEY_SKIP_KEY)
  if (skipUntil && new Date(skipUntil) > new Date()) return false
  return true
}
