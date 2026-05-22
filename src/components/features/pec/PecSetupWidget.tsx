'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { detectProvider, type PecProvider } from '@/lib/pec/providers'
import { mapSmtpError } from '@/lib/pec/errors'

type Phase = 'idle' | 'provider_found' | 'provider_unknown' | 'verifying' | 'success' | 'error'

interface Props {
  onSuccess?: () => void
  onSkip?: () => void
}

const inp: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '12px', border: 'none',
  background: 'var(--prs, #D4CFC9)', fontFamily: 'DM Sans, sans-serif',
  fontSize: '14px', color: 'var(--t1, #1C1916)', outline: 'none', boxSizing: 'border-box',
  boxShadow: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
}
const lbl: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, color: 'var(--t2, #96918D)',
  textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px', display: 'block',
  fontFamily: 'DM Sans, sans-serif',
}
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '12px' }
const btnPrimary: React.CSSProperties = {
  width: '100%', padding: '13px', borderRadius: '14px', border: 'none',
  background: 'var(--primary, #D90012)', color: '#fff',
  fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.25), 0 6px 18px -2px rgba(180,0,0,.40)',
}

export function PecSetupWidget({ onSuccess, onSkip }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [provider, setProvider] = useState<PecProvider | null>(null)
  const [host, setHost] = useState('')
  const [port, setPort] = useState('465')
  const [smtpUser, setSmtpUser] = useState('')
  const [verifyStepLabel, setVerifyStepLabel] = useState('Connessione al server…')
  const [errorMsg, setErrorMsg] = useState('')
  const [token, setToken] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const t1Ref = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const t2Ref = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const handleEmailBlur = useCallback(() => {
    if (!email) return
    const p = detectProvider(email)
    if (p) {
      setProvider(p); setPhase('provider_found')
    } else {
      setProvider(null); setSmtpUser(email); setPhase('provider_unknown')
    }
  }, [email])

  const canSubmit = !!(email && password && (phase === 'provider_found' || (phase === 'provider_unknown' && host && smtpUser)))

  const startVerify = useCallback(async () => {
    setPhase('verifying')
    setVerifyStepLabel('Connessione al server…')

    t1Ref.current = setTimeout(() => setVerifyStepLabel('Autenticazione in corso…'), 800)
    t2Ref.current = setTimeout(() => setVerifyStepLabel('Invio email di verifica a UÀ…'), 2000)

    try {
      const res = await fetch('/api/impostazioni/pec/start-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pec_host:     provider ? provider.host : host,
          pec_port:     provider ? provider.port : parseInt(port),
          pec_user:     provider ? email : smtpUser,
          pec_password: password,
        }),
      })

      clearTimeout(t1Ref.current); clearTimeout(t2Ref.current)

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Errore sconosciuto')
      }

      const { token: newToken } = await res.json() as { token: string }
      setToken(newToken)
      setVerifyStepLabel('Attendo conferma da UÀ…')

      let elapsed = 0
      pollRef.current = setInterval(async () => {
        elapsed += 2
        if (elapsed > 60) {
          clearInterval(pollRef.current)
          setPhase('error')
          setErrorMsg('Verifica scaduta (60s). La tua email potrebbe essere bloccata da un filtro antispam. Contatta il supporto.')
          return
        }
        try {
          const sr = await fetch(`/api/impostazioni/pec/verify-status?token=${newToken}`)
          if (!sr.ok) return
          const { verified } = await sr.json() as { verified: boolean }
          if (verified) {
            clearInterval(pollRef.current)
            setPhase('success')
            setTimeout(() => onSuccess?.(), 2000)
          }
        } catch { /* ignora errori di rete nel polling */ }
      }, 2000)

    } catch (err) {
      clearTimeout(t1Ref.current); clearTimeout(t2Ref.current)
      setPhase('error')
      setErrorMsg(mapSmtpError(err instanceof Error ? err.message : ''))
    }
  }, [email, password, provider, host, port, smtpUser, onSuccess])

  useEffect(() => () => {
    clearInterval(pollRef.current)
    clearTimeout(t1Ref.current)
    clearTimeout(t2Ref.current)
  }, [])

  // Normalizza il numero: rimuove + iniziale → wa.me vuole solo cifre (es. 393381235473)
  const waPhone = (process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? '').replace(/^\+/, '')
  const waText = encodeURIComponent(`Ciao Francesco, ho bisogno di aiuto per configurare la PEC su UÀ. Il mio provider è: ${provider?.name ?? 'sconosciuto'}`)
  const waUrl = `https://wa.me/${waPhone}?text=${waText}`

  // ── SUCCESS ──
  if (phase === 'success') return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(22,163,74,.12)', border: '2px solid rgba(22,163,74,.3)', display: 'grid', placeItems: 'center', fontSize: '28px' }}>✅</div>
      <div style={{ fontSize: '18px', fontWeight: 900, color: '#16A34A', fontFamily: 'DM Sans, sans-serif' }}>PEC confermata!</div>
      <div style={{ fontSize: '13px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
        UÀ ha ricevuto la tua email PEC e verificato l&apos;intera catena.
      </div>
      <div style={{ background: 'rgba(22,163,74,.08)', borderRadius: '12px', padding: '12px 16px', width: '100%', textAlign: 'left' }}>
        {['Connessione SMTP', 'Autenticazione', 'Invio email', 'Ricezione confermata da UÀ'].map(s => (
          <div key={s} style={{ fontSize: '12px', color: '#16A34A', fontFamily: 'DM Sans, sans-serif', padding: '2px 0' }}>✓ {s}</div>
        ))}
      </div>
      <div style={{ fontSize: '11px', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>Avanzamento automatico…</div>
      <div style={{ width: '100%', height: 4, background: 'var(--prs)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', background: '#16A34A', borderRadius: 99, animation: 'pec-fill 2s linear forwards', width: 0 }} />
      </div>
      <style>{`@keyframes pec-fill { to { width: 100%; } }`}</style>
    </div>
  )

  // ── VERIFYING ──
  const stepsDone = {
    connecting: verifyStepLabel !== 'Connessione al server…',
    authenticating: verifyStepLabel === 'Invio email di verifica a UÀ…' || verifyStepLabel === 'Attendo conferma da UÀ…',
    sending: verifyStepLabel === 'Attendo conferma da UÀ…',
  }
  if (phase === 'verifying') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontSize: '13px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>Stiamo verificando la connessione…</div>
      <div style={{ background: 'var(--elv, #EDEDEA)', borderRadius: '12px', padding: '14px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '10px', fontFamily: 'DM Sans, sans-serif' }}>Verifica in corso</div>
        {[
          { label: 'Connessione al server', done: stepsDone.connecting, active: !stepsDone.connecting },
          { label: 'Autenticazione', done: stepsDone.authenticating, active: stepsDone.connecting && !stepsDone.authenticating },
          { label: 'Email inviata a UÀ', done: stepsDone.sending, active: stepsDone.authenticating && !stepsDone.sending },
          { label: 'Attendo conferma da UÀ', done: false, active: stepsDone.sending },
        ].map(({ label, done, active }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontFamily: 'DM Sans, sans-serif', padding: '3px 0',
            color: done ? '#16A34A' : active ? '#B45309' : 'var(--t2)' }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: done ? 'rgba(22,163,74,.15)' : active ? 'rgba(180,83,9,.15)' : 'rgba(150,145,141,.1)', display: 'grid', placeItems: 'center', fontSize: 9, flexShrink: 0 }}>
              {done ? '✓' : active ? '⟳' : '○'}
            </span>
            {label}
          </div>
        ))}
      </div>
      {token && (
        <div style={{ background: 'var(--elv)', borderRadius: '10px', padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--t2)' }}>
          <div style={{ fontSize: '9px', color: 'var(--t3)', marginBottom: 3, fontFamily: 'DM Sans, sans-serif' }}>Email inviata a:</div>
          verify+{token.slice(0, 8)}…@uachelab.com
        </div>
      )}
      <div style={{ fontSize: '11px', color: 'var(--t3)', textAlign: 'center', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
        UÀ riceve l&apos;email e conferma che tutto funziona.<br />Attendi fino a 60 secondi.
      </div>
      <button style={{ ...btnPrimary, opacity: .5, cursor: 'not-allowed' }} disabled>Verifica in corso…</button>
    </div>
  )

  // ── FORM (idle, provider_found, provider_unknown, error) ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
        UÀ invierà le fatture al SDI via PEC in automatico. Servono solo 2 dati.
      </div>

      <div style={field}>
        <label style={lbl}>Indirizzo PEC</label>
        <div style={{ position: 'relative' }}>
          <input style={{ ...inp, paddingRight: (phase === 'provider_found' || phase === 'provider_unknown') ? '130px' : undefined }}
            type="email" value={email} placeholder="lab@pec.aruba.it"
            onChange={e => { setEmail(e.target.value); if (phase !== 'idle') setPhase('idle') }}
            onBlur={handleEmailBlur} />
          {phase === 'provider_found' && provider && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: '#fff', background: '#16A34A', padding: '2px 8px', borderRadius: '5px', fontFamily: 'DM Sans, sans-serif', whiteSpace: 'nowrap' }}>
              ✓ {provider.name}
            </span>
          )}
          {phase === 'provider_unknown' && (
            <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '10px', fontWeight: 700, color: 'var(--t1, #1C1916)', background: 'var(--prs, #D4CFC9)', padding: '2px 8px', borderRadius: '5px', fontFamily: 'DM Sans, sans-serif' }}>
              ? Non riconosciuto
            </span>
          )}
        </div>
      </div>

      {phase === 'provider_found' && (
        <div style={{ background: 'rgba(22,163,74,.09)', borderRadius: '10px', padding: '8px 12px', fontSize: '11px', color: '#16A34A', fontFamily: 'DM Sans, sans-serif', display: 'flex', gap: '6px' }}>
          <span>✅</span><span>Impostazioni SMTP precompilate in automatico</span>
        </div>
      )}

      {phase === 'provider_unknown' && (
        <div style={{ background: 'var(--elv, #EDEDEA)', borderRadius: '12px', padding: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px' }}>⚙️ Inserisci le impostazioni SMTP manualmente</div>
          <div style={field}>
            <label style={lbl}>Host SMTP</label>
            <input style={inp} value={host} onChange={e => setHost(e.target.value)} placeholder="smtp.tuoprovider.it" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px' }}>
            <div style={field}>
              <label style={lbl}>Porta</label>
              <input style={inp} type="number" value={port} onChange={e => setPort(e.target.value)} />
            </div>
            <div style={field}>
              <label style={lbl}>Utente SMTP</label>
              <input style={inp} type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="lab@pec.it" />
            </div>
          </div>
        </div>
      )}

      <div style={field}>
        <label style={lbl}>Password PEC</label>
        <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
      </div>

      {phase === 'idle' && (
        <div style={{ background: 'var(--elv)', borderRadius: '10px', padding: '10px 12px', fontSize: '11px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--t1)' }}>Supportiamo:</strong>{' '}
          Aruba PEC · Legalmail · Namirial · Tim PEC · Poste Italiane e altri
        </div>
      )}

      {phase === 'error' && (
        <div style={{ background: 'rgba(217,0,18,.07)', borderRadius: '12px', padding: '14px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#D90012', fontFamily: 'DM Sans, sans-serif', marginBottom: '6px' }}>❌ Verifica non riuscita</div>
          <div style={{ fontSize: '12px', color: '#4A4845', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6, marginBottom: '12px' }}>{errorMsg}</div>
          <div style={{ fontSize: '11px', color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif', marginBottom: '10px' }}>Francesco ti aiuta a risolvere in pochi minuti.</div>
          <a href={waUrl} target="_blank" rel="noreferrer" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            padding: '10px', borderRadius: '10px', background: '#25D366', color: '#fff',
            textDecoration: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700,
          }}>💬 Contatta il supporto</a>
        </div>
      )}

      <button
        style={{ ...btnPrimary, opacity: canSubmit ? 1 : .5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
        disabled={!canSubmit}
        onClick={canSubmit ? startVerify : undefined}
      >
        Connetti e verifica →
      </button>

      {onSkip && (
        <button onClick={onSkip} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif', fontSize: '12px', cursor: 'pointer', textAlign: 'center' }}>
          Configura dopo
        </button>
      )}
    </div>
  )
}
