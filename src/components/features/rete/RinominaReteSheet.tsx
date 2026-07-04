'use client'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens } from '@/design-system/motion'
import { hapticLight, hapticMedium } from '@/lib/feedback/haptic'

interface RinominaReteSheetProps {
  reteId: string
  nomeIniziale: string
}

export function RinominaReteSheet({ reteId, nomeIniziale }: RinominaReteSheetProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nome, setNome] = useState(nomeIniziale)

  const handleClose = () => {
    setOpen(false)
    setError(null)
    setNome(nomeIniziale)
  }

  const handleSave = async () => {
    setError(null)

    if (!nome.trim()) {
      setError('Il campo "nome" è obbligatorio')
      return
    }

    setSaving(true)
    hapticLight()

    try {
      const res = await fetch(`/api/rete/${reteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nome.trim() }),
      })

      if (!res.ok) {
        const d = (await res.json()) as { error?: string }
        setError(d.error ?? 'Errore durante il salvataggio, riprova')
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
        aria-label="Rinomina rete"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          minWidth: '44px',
          minHeight: '44px',
          borderRadius: '50%',
          background: 'var(--elv, #EDEDEA)',
          color: 'var(--t1, #1C1916)',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M11.5 2.5a1.5 1.5 0 0 1 2 2L5 13l-3 1 1-3 8.5-8.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
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
                Rinomina rete
              </h3>

              {error && (
                <p role="alert" style={{ margin: '0 0 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--primary, #D90012)' }}>
                  {error}
                </p>
              )}

              <div>
                <label
                  htmlFor="rinomina-rete-nome"
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
                  Nome rete *
                </label>
                <input
                  id="rinomina-rete-nome"
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
                  value={nome}
                  onChange={e => setNome(e.target.value)}
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
                {saving ? 'Salvataggio...' : 'Salva nome'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
