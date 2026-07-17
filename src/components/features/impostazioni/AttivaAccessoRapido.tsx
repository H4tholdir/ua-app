'use client'

// N14 (requisito 4 ratificato): ingresso manuale PERSISTENTE per attivare la
// passkey da Impostazioni→Sicurezza — indipendente dallo skip 30gg e dal cap
// delle proposte automatiche (qui l'intento è esplicito dell'utente).
// Pagina legacy v2.3: stile inline coerente con impostazioni/page.tsx.
import { useState, useSyncExternalStore, useCallback } from 'react'
import dynamic from 'next/dynamic'

const PasskeyRegistrationModal = dynamic(
  () => import('@/components/features/auth/PasskeyRegistrationModal'),
  { ssr: false }
)

const PASSKEY_KEY = 'ua_passkey_email'

function sottoscriviStorage(cb: () => void): () => void {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

export function AttivaAccessoRapido({ email }: { email: string }) {
  const [aperto, setAperto] = useState(false)

  // SSR-safe: sul server false; sul client lo snapshot viene rivalutato a ogni
  // render (inclusa la chiusura del modal dopo una registrazione riuscita).
  const attivoQui = useSyncExternalStore(
    sottoscriviStorage,
    useCallback(() => localStorage.getItem(PASSKEY_KEY) === email, [email]),
    () => false
  )

  return (
    <div style={{ padding: '10px 0 4px' }}>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          color: 'var(--t2, #4A3D33)',
          margin: '0 0 10px',
          lineHeight: 1.5,
        }}
      >
        Accedi con Touch ID / Face ID su questo dispositivo, senza password.
      </p>

      {attivoQui && (
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--success, #16A34A)',
            margin: '0 0 10px',
          }}
        >
          ✓ Attivo su questo dispositivo
        </p>
      )}

      <button
        type="button"
        onClick={() => setAperto(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '44px',
          padding: '0 18px',
          borderRadius: '10px',
          border: 'none',
          background: 'var(--primary, #D90012)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontWeight: 700,
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: 'var(--sh-red)',
        }}
      >
        🪪 Attiva accesso rapido
      </button>

      {aperto && <PasskeyRegistrationModal email={email} onDone={() => setAperto(false)} />}
    </div>
  )
}
