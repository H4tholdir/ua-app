'use client'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { t, motionTokens } from '@/design-system/motion'

const MOTIVI = [
  { value: 'colore_sbagliato',    label: 'Colore sbagliato' },
  { value: 'misura_errata',       label: 'Misura errata' },
  { value: 'fusione_difettosa',   label: 'Fusione difettosa' },
  { value: 'rottura_produzione',  label: 'Rottura produzione' },
  { value: 'non_confortevole',    label: 'Non confortevole' },
  { value: 'errore_prescrizione', label: 'Errore prescrizione' },
  { value: 'altro',               label: 'Altro' },
] as const

type Motivo = (typeof MOTIVI)[number]['value']

interface Props {
  lavoroId: string
  numeroLavoro: string
}

export function RifacimentoButton({ lavoroId, numeroLavoro }: Props) {
  const router = useRouter()
  const [showSheet, setShowSheet] = useState(false)
  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function openSheet() {
    setShowSheet(true)
    setMotivo(null)
    setNote('')
    setError(null)
  }

  function closeSheet() {
    if (isPending) return
    setShowSheet(false)
  }

  async function handleCrea() {
    if (!motivo || isPending) return
    startTransition(async () => {
      const res = await fetch(`/api/lavori/${lavoroId}/rifacimento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo, note: note.trim() || undefined }),
      })
      if (!res.ok) {
        setError('Impossibile creare il rifacimento. Riprova.')
        return
      }
      const data: { lavoro_nuovo_id: string; numero_lavoro: string } = await res.json()
      setShowSheet(false)
      router.push(`/lavori/${data.lavoro_nuovo_id}`)
    })
  }

  return (
    <>
      {/* ── Trigger button ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={openSheet}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          height: 44,
          borderRadius: 12,
          background: 'var(--elv, #EDEDEA)',
          border: '1.5px solid var(--prs, #D4CFC9)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--t2, #96918D)',
          cursor: 'pointer',
          outline: 'none',
        }}
        aria-label="Crea rifacimento"
      >
        ↩ Crea rifacimento
      </button>

      {/* ── Overlay + Bottom Sheet ─────────────────────────────────────── */}
      <AnimatePresence>
        {showSheet && (
          <>
            {/* Overlay */}
            <motion.div
              key="rifacimento-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={t('fast')}
              onClick={closeSheet}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                zIndex: 300,
              }}
            />

            {/* Bottom sheet */}
            <motion.div
              key="rifacimento-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="rifacimento-sheet-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ ...motionTokens.spring.soft }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 301,
                background: 'var(--bg, #DDD8D3)',
                borderRadius: '20px 20px 0 0',
                paddingBottom: 'env(safe-area-inset-bottom)',
                boxShadow: '-5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
              }}
            >
              <div style={{ padding: 20 }}>
                {/* Handle bar */}
                <div style={{
                  width: 32,
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--prs, #D4CFC9)',
                  margin: '0 auto 16px',
                }} />

                {/* Title */}
                <p
                  id="rifacimento-sheet-title"
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    color: 'var(--t1, #1C1916)',
                    marginBottom: 4,
                    margin: '0 0 4px',
                  }}
                >
                  Crea rifacimento
                </p>

                {/* Subtitle */}
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12,
                  color: 'var(--t2, #96918D)',
                  marginBottom: 20,
                  margin: '0 0 20px',
                }}>
                  Seleziona il motivo per {numeroLavoro}
                </p>

                {/* Motivo label */}
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--t2, #96918D)',
                  letterSpacing: '0.08em',
                  marginBottom: 10,
                  margin: '0 0 10px',
                }}>
                  MOTIVO *
                </p>

                {/* Pill grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  marginBottom: 16,
                }}>
                  {MOTIVI.map((m, idx) => {
                    const isSelected = motivo === m.value
                    const isLastOdd = idx === MOTIVI.length - 1 && MOTIVI.length % 2 !== 0
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setMotivo(m.value)}
                        style={{
                          gridColumn: isLastOdd ? 'span 1' : undefined,
                          padding: '8px 12px',
                          borderRadius: 100,
                          border: `1.5px solid ${isSelected ? 'var(--primary, #D90012)' : 'var(--prs, #D4CFC9)'}`,
                          background: isSelected ? 'var(--primary, #D90012)' : 'var(--elv, #EDEDEA)',
                          color: isSelected ? '#fff' : 'var(--t2, #96918D)',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          outline: 'none',
                          transition: `background ${motionTokens.duration.fast}s, border-color ${motionTokens.duration.fast}s, color ${motionTokens.duration.fast}s`,
                          textAlign: 'center',
                        }}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>

                {/* Note label */}
                <p style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--t2, #96918D)',
                  letterSpacing: '0.08em',
                  marginBottom: 6,
                  margin: '0 0 6px',
                }}>
                  NOTE
                </p>

                {/* Textarea */}
                <textarea
                  rows={3}
                  placeholder="Es. tono A2 richiesto ma risultato troppo scuro…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--sfc, #E4DFD9)',
                    border: '1px solid var(--prs, #D4CFC9)',
                    borderRadius: 10,
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    color: 'var(--t1, #1C1916)',
                    padding: '10px 12px',
                    resize: 'none',
                    outline: 'none',
                    marginBottom: 12,
                    boxSizing: 'border-box',
                    display: 'block',
                  }}
                />

                {/* Nota informativa */}
                {motivo && (
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 11,
                    fontStyle: 'italic',
                    color: 'var(--t2, #96918D)',
                    marginBottom: 12,
                    margin: '0 0 12px',
                  }}>
                    Verrà creato un nuovo lavoro identico a {numeroLavoro}. Il lavoro originale resta archiviato.
                  </p>
                )}

                {/* Error message */}
                {error && (
                  <p style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 12,
                    color: 'var(--primary, #D90012)',
                    marginBottom: 8,
                    margin: '0 0 8px',
                  }}>
                    {error}
                  </p>
                )}

                {/* Footer CTA */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={closeSheet}
                    disabled={isPending}
                    style={{
                      flex: 1,
                      height: 48,
                      borderRadius: 12,
                      background: 'var(--elv, #EDEDEA)',
                      border: 'none',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--t2, #96918D)',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      opacity: isPending ? 0.5 : 1,
                      outline: 'none',
                    }}
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleCrea}
                    disabled={!motivo || isPending}
                    style={{
                      flex: 2,
                      height: 48,
                      borderRadius: 12,
                      background: 'var(--primary, #D90012)',
                      border: 'none',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: !motivo || isPending ? 'not-allowed' : 'pointer',
                      opacity: !motivo || isPending ? 0.5 : 1,
                      boxShadow: !motivo || isPending ? 'none' : '0 4px 14px -2px rgba(180,0,0,.38)',
                      outline: 'none',
                      transition: `opacity ${motionTokens.duration.fast}s, box-shadow ${motionTokens.duration.fast}s`,
                    }}
                  >
                    {isPending ? 'Creazione…' : 'Crea rifacimento'}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
