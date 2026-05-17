'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motionTokens } from '@/design-system/motion'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

interface Props {
  lavoroId: string
  numeroLavoro: string
  onClose: () => void
}

const MOTIVI = [
  { value: 'colore_sbagliato',     label: 'Colore sbagliato' },
  { value: 'misura_errata',        label: 'Misura errata' },
  { value: 'fusione_difettosa',    label: 'Fusione difettosa' },
  { value: 'rottura_produzione',   label: 'Rottura durante produzione' },
  { value: 'non_confortevole',     label: 'Non confortevole per il paziente' },
  { value: 'errore_prescrizione',  label: 'Errore nella prescrizione del dentista' },
  { value: 'altro',                label: 'Altro (specifica nelle note)' },
] as const

const RILEVATO_IN = [
  { value: 'produzione',     label: 'Durante la produzione' },
  { value: 'prova_1',        label: 'Alla 1ª prova' },
  { value: 'prova_2',        label: 'Alla 2ª prova' },
  { value: 'prova_3',        label: 'Alla 3ª prova' },
  { value: 'post_consegna',  label: 'Dopo la consegna' },
] as const

// ─── Stili Haptimorphism ─────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
  },
  card: {
    background: 'var(--bg, #DDD8D3)',
    borderRadius: 20,
    padding: '28px 24px 24px',
    width: '100%',
    maxWidth: 480,
    boxShadow: 'var(--sh-b, inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44))',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  label: {
    display: 'block',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--t2, #96918D)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  select: {
    width: '100%',
    background: 'var(--prs, #D4CFC9)',
    color: 'var(--t1, #1C1916)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 14px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 15,
    outline: 'none',
    appearance: 'none' as const,
    boxShadow: 'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))',
    cursor: 'pointer',
    minHeight: 48,
  },
  input: {
    width: '100%',
    background: 'var(--prs, #D4CFC9)',
    color: 'var(--t1, #1C1916)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 14px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 15,
    outline: 'none',
    boxShadow: 'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))',
    minHeight: 48,
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    background: 'var(--prs, #D4CFC9)',
    color: 'var(--t1, #1C1916)',
    border: 'none',
    borderRadius: 10,
    padding: '12px 14px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 15,
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: 88,
    boxShadow: 'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))',
    boxSizing: 'border-box' as const,
  },
  warning: {
    background: 'rgba(217, 0, 18, 0.12)',
    border: '1px solid rgba(217, 0, 18, 0.35)',
    borderRadius: 10,
    padding: '12px 14px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    color: '#FF6B6B',
    lineHeight: 1.5,
    marginBottom: 24,
  },
  dangerBtn: {
    width: '100%',
    height: 52,
    background: '#D90012',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    boxShadow: '-2px -2px 6px hsl(355 100% 35% / 0.4), 3px 3px 10px rgba(0,0,0,.35)',
    transition: `box-shadow ${motionTokens.duration.fast}s`,
  },
  ghostBtn: {
    width: '100%',
    height: 52,
    background: 'transparent',
    color: 'var(--t2, #96918D)',
    border: '1px solid rgba(0,0,0,.06)',
    borderRadius: 12,
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `border-color ${motionTokens.duration.fast}s`,
  },
  fieldset: {
    marginBottom: 18,
  },
  errorMsg: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    color: '#FF6B6B',
    marginTop: 16,
    padding: '10px 14px',
    background: 'rgba(217, 0, 18, 0.10)',
    borderRadius: 8,
  },
  title: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--t1, #1C1916)',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 13,
    color: 'var(--t2, #96918D)',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    background: 'rgba(0,0,0,.06)',
    marginBottom: 20,
  },
}

export function RifacimentoModal({ lavoroId, numeroLavoro, onClose }: Props) {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const firstFocusRef = useRef<HTMLSelectElement>(null)
  const [motivo, setMotivo] = useState('')
  const [rilevatoIn, setRilevatoIn] = useState('')
  const [costoInterno, setCostoInterno] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    firstFocusRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!motivo) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/lavori/${lavoroId}/rifacimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motivo,
          rilevato_in: rilevatoIn || undefined,
          costo_interno: costoInterno ? parseFloat(costoInterno) : undefined,
          note: note || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Errore imprevisto')
        return
      }

      router.push('/lavori/' + data.lavoro_nuovo_id)
    } catch {
      setError('Errore di rete — riprova')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        key="rifacimento-overlay"
        style={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.standard }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        aria-hidden="false"
      >
        <motion.div
          key="rifacimento-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rifacimento-title"
          style={styles.card}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
          transition={{ ...motionTokens.spring.soft }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="rifacimento-title" style={styles.title}>
            Crea rifacimento
          </h2>
          <p style={styles.subtitle}>
            Lavoro #{numeroLavoro}
          </p>

          <div style={styles.divider} />

          {/* Warning MDR */}
          <div style={styles.warning} role="alert">
            <strong>Azione irreversibile — tracciata MDR.</strong> Verrà creato un nuovo lavoro
            collegato a quello originale. La non-conformità sarà registrata nel registro di
            qualità come richiesto dall&apos;Art. 52(8) + Allegato XIII MDR 2017/745.
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Motivo — obbligatorio */}
            <div style={styles.fieldset}>
              <label htmlFor="motivo" style={styles.label}>
                Motivo del rifacimento *
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  id="motivo"
                  required
                  ref={firstFocusRef}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  style={styles.select}
                  aria-required="true"
                >
                  <option value="" disabled>Seleziona il motivo…</option>
                  {MOTIVI.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rilevato in — opzionale */}
            <div style={styles.fieldset}>
              <label htmlFor="rilevato_in" style={styles.label}>
                Dove è stato rilevato il problema
              </label>
              <select
                id="rilevato_in"
                value={rilevatoIn}
                onChange={(e) => setRilevatoIn(e.target.value)}
                style={styles.select}
              >
                <option value="">Non specificato</option>
                {RILEVATO_IN.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Costo interno — opzionale */}
            <div style={styles.fieldset}>
              <label htmlFor="costo_interno" style={styles.label}>
                Costo interno stimato (€)
              </label>
              <input
                id="costo_interno"
                type="number"
                min="0"
                step="0.01"
                placeholder="es. 15.00"
                value={costoInterno}
                onChange={(e) => setCostoInterno(e.target.value)}
                style={styles.input}
                aria-describedby="costo-hint"
              />
              <span
                id="costo-hint"
                style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: 'var(--t2, #96918D)', marginTop: 4, display: 'block' }}
              >
                Non addebitato al cliente — uso interno per analisi qualità
              </span>
            </div>

            {/* Note — opzionale */}
            <div style={{ ...styles.fieldset, marginBottom: 24 }}>
              <label htmlFor="note" style={styles.label}>
                Note aggiuntive
              </label>
              <textarea
                id="note"
                placeholder="Descrizione dettagliata del problema…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={styles.textarea}
                maxLength={1000}
              />
            </div>

            {/* Error message */}
            {error && (
              <div style={styles.errorMsg} role="alert">
                {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                disabled={!motivo || loading}
                style={{
                  ...styles.dangerBtn,
                  opacity: !motivo || loading ? 0.5 : 1,
                  cursor: !motivo || loading ? 'not-allowed' : 'pointer',
                }}
                aria-disabled={!motivo || loading}
              >
                {loading ? 'Creazione in corso…' : 'Crea rifacimento'}
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  ...styles.ghostBtn,
                  opacity: loading ? 0.5 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Annulla
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
