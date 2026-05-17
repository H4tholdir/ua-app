'use client'

import { useState } from 'react'
import { detectPecProvider, PEC_PROVIDER_LIST } from '@/lib/pec/providers'

interface PecSetupCardProps {
  currentEmail?: string
  configurata?: boolean
  onSave: (
    email: string,
    password: string,
    smtpOverride?: { host: string; port: number; secure: boolean }
  ) => Promise<{ ok: boolean; error?: string }>
  onTest: () => Promise<{ ok: boolean; message: string }>
}

// Colori cobalto — identici al resto di impostazioni/page.tsx
const C = {
  card:    '#1B2D6B',
  elevated: '#243580',
  label:   '#8899CC',
  text:    '#F0F4FF',
  muted:   '#6677AA',
  gold:    '#D4A843',
  success: '#2ECC9A',
  error:   '#FA5252',
  shRaised: '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
  shInset:  'inset 2px 2px 6px hsl(230 100% 4% / 0.6), inset -1px -1px 4px hsl(220 80% 35% / 0.3)',
} as const

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'block',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        fontWeight: 700,
        color: C.label,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '6px',
      }}
    >
      {children}
    </span>
  )
}

export function PecSetupCard({
  currentEmail,
  configurata,
  onSave,
  onTest,
}: PecSetupCardProps) {
  const [email, setEmail]               = useState(currentEmail ?? '')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [smtpHost, setSmtpHost]         = useState('')
  const [smtpPort, setSmtpPort]         = useState('465')
  const [smtpSecure, setSmtpSecure]     = useState(true)
  const [saving, setSaving]             = useState(false)
  const [testing, setTesting]           = useState(false)
  const [result, setResult]             = useState<{ ok: boolean; message: string } | null>(null)

  const detected = email.includes('@') ? detectPecProvider(email) : null

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: C.elevated,
    border: 'none',
    borderRadius: '10px',
    padding: '12px 14px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '15px',
    color: C.text,
    boxShadow: C.shInset,
    outline: 'none',
    boxSizing: 'border-box',
  }

  async function handleSave() {
    if (!email || !password) {
      setResult({ ok: false, message: 'Email e password sono obbligatori.' })
      return
    }
    setSaving(true)
    setResult(null)
    try {
      const smtpOverride =
        showAdvanced && smtpHost
          ? { host: smtpHost, port: parseInt(smtpPort, 10), secure: smtpSecure }
          : undefined
      const res = await onSave(email, password, smtpOverride)
      setResult({
        ok: res.ok,
        message: res.ok
          ? 'Configurazione salvata con successo.'
          : (res.error ?? 'Errore sconosciuto.'),
      })
      if (res.ok) setPassword('')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setResult(null)
    try {
      const res = await onTest()
      setResult(res)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      style={{
        background: C.card,
        borderRadius: '16px',
        padding: '16px',
        boxShadow: C.shRaised,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            color: C.label,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 8px',
          }}
        >
          Configurazione SMTP
        </h3>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: C.muted,
            margin: 0,
            lineHeight: '1.5',
          }}
        >
          Inserisci le credenziali PEC del laboratorio. Il server SMTP viene
          configurato automaticamente in base al provider.
        </p>
      </div>

      {/* Status badge */}
      {configurata && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'hsl(159 63% 49% / 0.15)',
            borderRadius: '6px',
            padding: '3px 10px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: C.success,
            }}
          />
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              fontWeight: 700,
              color: C.success,
            }}
          >
            PEC configurata
          </span>
        </div>
      )}

      {/* Email input */}
      <div style={{ marginBottom: '14px' }}>
        <Label>Email PEC *</Label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tuonome@pec.it"
          aria-label="Indirizzo email PEC"
          style={inputStyle}
        />
        {detected && (
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: C.success,
              marginTop: '5px',
              display: 'block',
            }}
          >
            Provider rilevato: {detected.display_name} ({detected.host}:{detected.port}
            {detected.secure ? ' TLS' : ' STARTTLS'})
          </span>
        )}
        {email.includes('@') && !detected && (
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: C.muted,
              marginTop: '5px',
              display: 'block',
            }}
          >
            Provider non in lista — abilita la configurazione SMTP avanzata.
          </span>
        )}
      </div>

      {/* Password input */}
      <div style={{ marginBottom: '16px' }}>
        <Label>Password PEC *</Label>
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            aria-label="Password PEC"
            style={{ ...inputStyle, paddingRight: '48px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: C.label,
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              minWidth: '44px',
              minHeight: '44px',
              justifyContent: 'center',
            }}
          >
            {showPassword ? (
              // Eye-off icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              // Eye icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: C.muted,
            margin: '5px 0 0',
          }}
        >
          La password viene cifrata e non viene mai esposta nelle risposte API.
        </p>
      </div>

      {/* Advanced SMTP toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(p => !p)}
        style={{
          background: 'none',
          border: 'none',
          color: C.label,
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          padding: '0 0 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
          style={{
            transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Configurazione SMTP avanzata
      </button>

      {showAdvanced && (
        <div
          style={{
            background: C.elevated,
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            boxShadow: C.shInset,
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: C.muted,
              margin: '0 0 12px',
              lineHeight: '1.4',
            }}
          >
            Usa questi campi solo se il provider non viene rilevato automaticamente.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px', marginBottom: '10px' }}>
            <div>
              <Label>Host SMTP</Label>
              <input
                type="text"
                value={smtpHost}
                onChange={e => setSmtpHost(e.target.value)}
                placeholder="smtp.mioprovider.it"
                aria-label="Host SMTP"
                style={{
                  ...inputStyle,
                  background: C.card,
                  fontSize: '14px',
                  padding: '10px 12px',
                }}
              />
            </div>
            <div>
              <Label>Porta</Label>
              <input
                type="number"
                value={smtpPort}
                onChange={e => setSmtpPort(e.target.value)}
                placeholder="465"
                aria-label="Porta SMTP"
                style={{
                  ...inputStyle,
                  background: C.card,
                  fontSize: '14px',
                  padding: '10px 12px',
                  width: '100%',
                }}
              />
            </div>
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: C.text,
            }}
          >
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={e => setSmtpSecure(e.target.checked)}
              style={{ accentColor: C.gold, width: '16px', height: '16px' }}
            />
            SSL/TLS diretto (porta 465) — deseleziona per STARTTLS (porta 587/25)
          </label>
        </div>
      )}

      {/* Result message */}
      {result && (
        <div
          role="status"
          aria-live="polite"
          style={{
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '16px',
            background: result.ok
              ? 'hsl(159 63% 49% / 0.12)'
              : 'hsl(0 95% 64% / 0.12)',
            color: result.ok ? C.success : C.error,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            lineHeight: '1.45',
          }}
        >
          {result.message}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !email || !password}
          style={{
            flex: 1,
            background: C.gold,
            color: '#0F1E52',
            border: 'none',
            borderRadius: '10px',
            padding: '13px 20px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            cursor: saving || !email || !password ? 'not-allowed' : 'pointer',
            opacity: saving || !email || !password ? 0.5 : 1,
            minHeight: '52px',
            boxShadow: '0 4px 12px hsl(43 65% 55% / 0.3)',
          }}
        >
          {saving ? 'Salvataggio...' : 'Salva configurazione'}
        </button>
        {configurata && (
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            aria-label="Testa connessione PEC"
            style={{
              background: C.elevated,
              color: C.text,
              border: 'none',
              borderRadius: '10px',
              padding: '13px 16px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 500,
              cursor: testing ? 'not-allowed' : 'pointer',
              boxShadow: C.shRaised,
              opacity: testing ? 0.5 : 1,
              minHeight: '52px',
              whiteSpace: 'nowrap',
            }}
          >
            {testing ? 'Test...' : 'Test PEC'}
          </button>
        )}
      </div>

      {/* Provider list */}
      <details style={{ marginTop: '16px' }}>
        <summary
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: C.muted,
            cursor: 'pointer',
            userSelect: 'none',
          }}
        >
          Provider supportati automaticamente
        </summary>
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {PEC_PROVIDER_LIST.map(p => (
            <span
              key={p.domain}
              style={{
                background: C.elevated,
                borderRadius: '6px',
                padding: '4px 10px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: C.label,
              }}
            >
              @{p.domain}
            </span>
          ))}
          <span
            style={{
              background: C.elevated,
              borderRadius: '6px',
              padding: '4px 10px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              color: C.muted,
              fontStyle: 'italic',
            }}
          >
            + altri tramite SMTP manuale
          </span>
        </div>
      </details>
    </div>
  )
}
