'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

interface InvitaLabSheetProps {
  reteId: string
}

export function InvitaLabSheet({ reteId }: InvitaLabSheetProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setEmail('')
  }

  const handleSave = async () => {
    setError(null)

    if (!email.trim()) {
      setError('Il campo "email" è obbligatorio')
      return
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch(`/api/rete/${reteId}/inviti`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? "Errore durante l'invio, riprova")
        setSaving(false)
        return
      }

      hapticMedium()
      window.location.reload()
    } catch {
      setError('Errore di rete — controlla la connessione')
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); hapticLight() }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          height: '36px',
          padding: '0 14px',
          borderRadius: '10px',
          background: 'var(--primary, #D90012)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        + Invita laboratorio
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={motionTokens.spring.gentle}
              onClick={handleClose}
              style={{ position: 'fixed', inset: 0, background: 'black', zIndex: 200 }}
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={motionTokens.spring.soft}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'var(--sfc, #E4DFD9)',
                borderRadius: '20px 20px 0 0',
                padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
                zIndex: 201,
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ width: 36, height: 4, background: 'var(--prs)', borderRadius: 2, margin: '0 auto 20px' }} />

              <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'var(--t1)', fontFamily: 'DM Sans, sans-serif' }}>
                Invita un laboratorio
              </h3>

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div>
                <label
                  htmlFor="invita-lab-email"
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--t2)',
                    textTransform: 'uppercase',
                    letterSpacing: '.05em',
                    fontFamily: 'DM Sans, sans-serif',
                    marginBottom: 3,
                    display: 'block',
                  }}
                >
                  Email del titolare *
                </label>
                <input
                  id="invita-lab-email"
                  type="email"
                  style={{
                    width: '100%',
                    padding: '9px 11px',
                    background: 'var(--elv, #EDEDEA)',
                    border: '1px solid var(--prs, #D4CFC9)',
                    borderRadius: 9,
                    fontSize: 13,
                    color: 'var(--t1)',
                    fontFamily: 'DM Sans, sans-serif',
                    boxSizing: 'border-box',
                  }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  marginTop: 18,
                  width: '100%',
                  padding: '13px',
                  background: saving ? 'var(--prs)' : 'var(--primary, #D90012)',
                  color: 'white',
                  borderRadius: 12,
                  fontWeight: 700,
                  fontSize: 15,
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  minHeight: 44,
                }}
              >
                {saving ? 'Invio...' : 'Invia invito'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
