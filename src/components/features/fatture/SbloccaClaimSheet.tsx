'use client'

// Foglio «Sblocca e reinvia» (copy da banco per «Sblocca claim» — decisione
// 2026-07-16-riconciliazioni.md): sblocco titolare-only del lock anti-doppio-
// invio PEC (Task 12, POST /api/fatture/[id]/sblocca-claim). Richiede motivo
// + spunta esplicita «ho verificato la cartella inviata» — la route rifiuta
// senza `verificata_cartella_inviata: true` (fail-closed, spec R1).
//
// Lingua visiva ricalcata da NotaCreditoButton.tsx.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticError, hapticMedium, hapticSuccess } from '@/lib/feedback/haptic'
import { soundError } from '@/lib/feedback/sounds'

const FONT = 'var(--font-dm-sans, "DM Sans", system-ui, sans-serif)'
const BORDER = '1px solid var(--elv)'
const SCRIM = 'rgba(0,0,0,0.45)'

export interface SbloccaClaimSheetProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  fatturaId: string
  numero: string
}

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return desktop
}

export function SbloccaClaimSheet(props: SbloccaClaimSheetProps) {
  const { open, onClose, onSuccess, fatturaId, numero } = props
  const reducedMotion = useReducedMotion()
  const isDesktop = useIsDesktop()

  const [motivo, setMotivo] = useState('')
  const [verificata, setVerificata] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  // Nessun effect di reset-su-`open`: RiconciliazioniClient monta questo
  // foglio SOLO quando serve e lo smonta alla chiusura — ogni apertura è
  // già un mount fresco con gli useState iniziali sopra.

  const motivoTrim = motivo.trim()
  const canSubmit = motivoTrim.length > 0 && verificata && !isPending

  async function handleSubmit() {
    if (!canSubmit) return
    hapticMedium()
    setIsPending(true)
    setError(null)
    let res: Response
    try {
      res = await fetch(`/api/fatture/${fatturaId}/sblocca-claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoTrim, verificata_cartella_inviata: true }),
      })
    } catch {
      hapticError()
      soundError()
      setIsPending(false)
      setError('Connessione assente. Riprova.')
      return
    }
    if (res.ok) {
      hapticSuccess()
      setIsPending(false)
      onSuccess()
      return
    }
    hapticError()
    soundError()
    setIsPending(false)
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    setError(data?.error ?? 'Impossibile sbloccare — riprova.')
  }

  const ctaRed: React.CSSProperties = {
    flex: 2, minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, background: 'var(--primary)', border: 'none', color: '#fff',
    fontFamily: FONT, fontSize: 14, fontWeight: 700, outline: 'none',
    cursor: canSubmit ? 'pointer' : 'not-allowed', opacity: canSubmit ? 1 : 0.42, boxShadow: canSubmit ? 'var(--sh-red)' : 'none',
  }
  const ctaNeutral: React.CSSProperties = {
    flex: 1, minHeight: 48, borderRadius: 12, background: 'var(--elv)', border: BORDER, color: 'var(--t2)',
    fontFamily: FONT, fontSize: 14, fontWeight: 700, cursor: 'pointer', outline: 'none',
  }
  const label: React.CSSProperties = {
    fontFamily: FONT, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
    color: 'var(--t3)', margin: '0 0 8px',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sbl-scrim"
            onClick={() => !isPending && onClose()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast')}
            style={{ position: 'fixed', inset: 0, background: SCRIM, zIndex: 300 }}
            aria-hidden="true"
          />
          <motion.div
            key="sbl-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sbl-sheet-title"
            initial={reducedMotion ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
            animate={reducedMotion ? { opacity: 1 } : isDesktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : isDesktop ? { opacity: 0, scale: 0.97, y: 4 } : { y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : isDesktop ? t('normal') : { ...motionTokens.spring.soft }}
            style={
              isDesktop
                ? {
                    position: 'fixed', top: 76, right: 24, width: 440, maxHeight: 'calc(100vh - 100px)',
                    overflowY: 'auto', zIndex: 301, background: 'var(--bg)', border: BORDER, borderRadius: 20,
                    boxShadow: 'var(--sh-b)', padding: 20,
                  }
                : {
                    position: 'fixed', left: 0, right: 0, bottom: 0, maxHeight: '92vh', overflowY: 'auto',
                    zIndex: 301, background: 'var(--bg)', borderRadius: '22px 22px 0 0',
                    paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: 'var(--sh-b)',
                  }
            }
          >
            <div style={{ padding: isDesktop ? 0 : 18 }}>
              {!isDesktop && (
                <div aria-hidden="true" style={{ width: 34, height: 4, borderRadius: 2, background: 'var(--elv)', margin: '0 auto 14px' }} />
              )}

              <h2 id="sbl-sheet-title" style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: 'var(--t1)', margin: '0 0 3px' }}>
                Sblocca e reinvia
              </h2>
              <p style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t2)', margin: '0 0 14px' }}>
                Fattura {numero} · segnata come inviata, ma l&apos;invio non risulta
              </p>

              <div
                style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 12,
                  margin: '0 0 14px', background: 'color-mix(in srgb, var(--primary) 9%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                }}
              >
                <span aria-hidden="true" style={{ color: 'var(--primary)', fontSize: 15, lineHeight: 1.2 }}>⚠</span>
                <span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--t1)', lineHeight: 1.45 }}>
                  <b style={{ fontWeight: 700 }}>Solo tu (titolare) puoi farlo.</b> Controlla prima la cartella
                  «inviata» della casella PEC del laboratorio: se la mail NON è partita, sblocca in sicurezza.
                </span>
              </div>

              <label
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 12,
                  background: 'var(--sfc)', border: verificata ? '1.5px solid color-mix(in srgb, var(--primary) 45%, transparent)' : '1.5px solid var(--elv)',
                  margin: '0 0 14px', fontFamily: FONT, fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.4, cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={verificata}
                  onChange={(e) => setVerificata(e.target.checked)}
                  style={{ width: 22, height: 22, flexShrink: 0, marginTop: 1, accentColor: 'var(--primary)' }}
                />
                Ho controllato la cartella «inviata»: la mail non è partita.
              </label>

              <p style={label}>
                Motivo <span style={{ color: 'var(--primary)' }}>*</span>
              </p>
              <textarea
                aria-label="Motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Es. non presente nella cartella inviata della PEC…"
                style={{
                  width: '100%', minHeight: 74, background: 'var(--sfc)', border: BORDER, borderRadius: 12,
                  padding: '11px 12px', fontFamily: FONT, fontSize: 13, lineHeight: 1.45, color: 'var(--t1)',
                  resize: 'none', outline: 'none', boxSizing: 'border-box', display: 'block', margin: '0 0 14px',
                }}
              />

              {error && (
                <p role="alert" style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--primary)', margin: '0 0 10px' }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose} disabled={isPending} style={ctaNeutral}>
                  Annulla
                </button>
                <button type="button" onClick={handleSubmit} disabled={!canSubmit} style={ctaRed}>
                  {isPending ? 'Sblocco…' : 'Sblocca e reinvia'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
