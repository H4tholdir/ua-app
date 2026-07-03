'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess, hapticError } from '@/lib/feedback/haptic'
import { soundNotifica, soundError } from '@/lib/feedback/sounds'

const DS = {
  sfc: 'var(--sfc, #E4DFD9)',
  elv: 'var(--elv, #EDEDEA)',
  prs: 'var(--prs, #D4CFC9)',
  t1: 'var(--t1, #1C1916)',
  t2: 'var(--t2, #4A3D33)',
  t3: 'var(--t3, #6B5C51)',
  primary: 'var(--primary, #D90012)',
  shB: 'var(--sh-b)',
  shRed: 'var(--sh-red)',
} as const

const RUOLI: Array<{ value: 'tecnico' | 'front_desk' | 'titolare'; label: string }> = [
  { value: 'tecnico', label: 'Tecnico' },
  { value: 'front_desk', label: 'Front desk' },
  { value: 'titolare', label: 'Titolare (co-gestore)' },
]

interface InvitoPendenteView {
  id: string
  email: string
  ruolo: string
  expires_at: string
}

function giorniAllaScadenza(expiresAt: string): number {
  const diffMs = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)))
}

interface Props {
  variant: 'header' | 'cta'
}

export function InvitaCollaboratoreSheet({ variant }: Props) {
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [ruolo, setRuolo] = useState<'tecnico' | 'front_desk' | 'titolare'>('tecnico')
  const [loading, setLoading] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [inviti, setInviti] = useState<InvitoPendenteView[]>([])
  const [loadingInviti, setLoadingInviti] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const caricaInviti = useCallback(async () => {
    setLoadingInviti(true)
    try {
      const res = await fetch('/api/tecnici/invite')
      if (res.ok) {
        const json = await res.json()
        setInviti(json.inviti ?? [])
      }
    } finally {
      setLoadingInviti(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) caricaInviti()
  }, [open, caricaInviti])

  const handleClose = useCallback(() => {
    setOpen(false)
    setErrore(null)
    setSuccessMsg(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (loading) return
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrore('Inserisci un indirizzo email valido')
      return
    }
    setLoading(true)
    setErrore(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/tecnici/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, ruolo }),
      })
      const json = await res.json()
      if (!res.ok) {
        hapticError()
        soundError()
        setErrore(json.error ?? "Errore durante l'invio dell'invito")
        return
      }
      hapticSuccess()
      soundNotifica()
      setSuccessMsg(json.message ?? `Invito inviato a ${trimmedEmail}`)
      setEmail('')
      caricaInviti()
    } catch {
      setErrore('Errore di rete — riprova')
    } finally {
      setLoading(false)
    }
  }, [email, ruolo, loading, caricaInviti])

  const handleRevoca = useCallback(async (id: string) => {
    setRevokingId(id)
    try {
      const res = await fetch(`/api/tecnici/invite/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setInviti((prev) => prev.filter((i) => i.id !== id))
      }
    } finally {
      setRevokingId(null)
    }
  }, [])

  const trigger = variant === 'header' ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Invita collaboratore"
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        height: '40px', minHeight: '52px', padding: '0 16px', borderRadius: '12px',
        background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
        fontSize: '14px', border: 'none', boxShadow: DS.shB, flexShrink: 0, cursor: 'pointer',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M10.5 8.5A2.5 2.5 0 108 6a2.5 2.5 0 002.5 2.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 13.5a5 5 0 019 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 6v4M1 8h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      Invita collaboratore
    </button>
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '12px 22px',
        borderRadius: '32px', background: DS.primary, color: '#fff', fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700, fontSize: '14px', border: 'none', minHeight: '44px', boxShadow: DS.shRed,
        cursor: 'pointer',
      }}
    >
      Invita collaboratori →
    </button>
  )

  return (
    <>
      {trigger}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="invita-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
              onClick={handleClose}
              style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,.32)' }}
            />
            <motion.div
              key="invita-panel"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
              style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 81,
                background: DS.sfc, borderRadius: '28px 28px 0 0', maxWidth: 600, margin: '0 auto',
                maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              }}
              role="dialog"
              aria-modal="true"
              aria-label="Invita collaboratore"
            >
              <div style={{ width: 36, height: 4, background: DS.t3, borderRadius: 99, margin: '12px auto 16px' }} />

              <div style={{ padding: '0 20px 16px', flex: 1, overflowY: 'auto' }}>
                <h2 style={{ margin: '0 0 16px', fontFamily: 'DM Sans, sans-serif', fontSize: 18, fontWeight: 700, color: DS.t1 }}>
                  Invita collaboratore
                </h2>

                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                    Email
                  </span>
                  <input
                    type="email"
                    placeholder="nome@esempio.it"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                      background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                    }}
                  />
                </label>

                <label style={{ display: 'block', marginBottom: 14 }}>
                  <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 6 }}>
                    Ruolo
                  </span>
                  <select
                    value={ruolo}
                    onChange={(e) => setRuolo(e.target.value as typeof ruolo)}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${DS.prs}`,
                      background: DS.elv, fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: DS.t1,
                    }}
                  >
                    {RUOLI.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>

                {errore && (
                  <p role="alert" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.primary }}>
                    {errore}
                  </p>
                )}
                {successMsg && (
                  <p role="status" style={{ margin: '8px 0 0', fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: 'var(--success, #16A34A)' }}>
                    ✓ {successMsg}
                  </p>
                )}

                {(loadingInviti || inviti.length > 0) && (
                  <div style={{ marginTop: 24 }}>
                    <span style={{ display: 'block', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600, color: DS.t2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Inviti in attesa
                    </span>
                    {loadingInviti ? (
                      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t2 }}>Caricamento…</p>
                    ) : (
                      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {inviti.map((invito) => (
                          <li
                            key={invito.id}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                              background: DS.elv, borderRadius: 12, padding: '10px 12px',
                            }}
                          >
                            <div style={{ minWidth: 0 }}>
                              <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600, color: DS.t1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {invito.email}
                              </p>
                              <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2 }}>
                                {invito.ruolo} — scade tra {giorniAllaScadenza(invito.expires_at)} giorni
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRevoca(invito.id)}
                              disabled={revokingId === invito.id}
                              aria-label={`Revoca invito a ${invito.email}`}
                              style={{
                                border: 'none', background: 'transparent', cursor: 'pointer',
                                color: DS.primary, fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 600,
                                padding: '6px 8px', flexShrink: 0, opacity: revokingId === invito.id ? 0.5 : 1,
                              }}
                            >
                              Revoca
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div style={{ padding: '12px 20px 20px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{
                    width: '100%', minHeight: 52, borderRadius: 100, border: 'none',
                    background: DS.primary, color: '#fff', fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1,
                  }}
                >
                  {loading ? 'Invio…' : 'Invia invito'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
