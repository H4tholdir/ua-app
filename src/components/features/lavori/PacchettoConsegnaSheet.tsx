'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, t, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess, hapticLight } from '@/lib/feedback/haptic'

// ─── Tipi ──────────────────────────────────────────────────────────────────

type DocKey = 'ifu' | 'etichetta' | 'ricevuta-consegna'
type StatoDoc = 'idle' | 'loading' | 'ready' | 'error'

interface DocState {
  selected: boolean
  stato: StatoDoc
  progress: number // 0-100
  url: string | null
  error: string | null
}

type DocsState = Record<DocKey, DocState>

const DOC_META: Record<DocKey, { label: string; icon: string; apiSegment: string }> = {
  ifu: {
    label: 'Istruzioni per l\'Uso (IFU)',
    icon: '📄',
    apiSegment: 'ifu',
  },
  etichetta: {
    label: 'Etichetta Dispositivo',
    icon: '🏷️',
    apiSegment: 'etichetta',
  },
  'ricevuta-consegna': {
    label: 'Ricevuta di Consegna',
    icon: '✍️',
    apiSegment: 'ricevuta-consegna',
  },
}

const INITIAL_STATE: DocsState = {
  ifu: { selected: true, stato: 'idle', progress: 0, url: null, error: null },
  etichetta: { selected: true, stato: 'idle', progress: 0, url: null, error: null },
  'ricevuta-consegna': { selected: true, stato: 'idle', progress: 0, url: null, error: null },
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface PacchettoConsegnaSheetProps {
  lavoro: { id: string; numero_lavoro: string; cliente_display: string }
  isOpen: boolean
  onClose: () => void
}

// ─── Progress ring SVG (r=8, 20×20) ───────────────────────────────────────

function ProgressRing({ progress }: { progress: number }) {
  const r = 8
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg
      width="20"
      height="20"
      aria-hidden="true"
      style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
    >
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        style={{ stroke: 'var(--gold, #D4A843)', opacity: 0.3 }}
        strokeWidth="2"
      />
      <circle
        cx="10"
        cy="10"
        r={r}
        fill="none"
        style={{ stroke: 'var(--gold, #D4A843)', transition: 'stroke-dashoffset 0.15s linear' }}
        strokeWidth="2"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Stato badge ────────────────────────────────────────────────────────────

function StatoBadge({ stato, progress }: { stato: StatoDoc; progress: number }) {
  if (stato === 'loading') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: 'var(--t2, #4A3D33)',
        }}
      >
        <ProgressRing progress={progress} />
        {progress}%
      </span>
    )
  }
  if (stato === 'ready') {
    return (
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--success, #16A34A)',
        }}
        role="status"
        aria-label="Documento pronto"
      >
        ✓ Pronto
      </span>
    )
  }
  if (stato === 'error') {
    return (
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '12px',
          color: 'var(--primary, #D90012)',
        }}
        role="alert"
      >
        Errore
      </span>
    )
  }
  return (
    <span
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '12px',
        color: 'var(--t3, #6B5C51)',
      }}
    >
      —
    </span>
  )
}

// ─── Component principale ──────────────────────────────────────────────────

export function PacchettoConsegnaSheet({
  lavoro,
  isOpen,
  onClose,
}: PacchettoConsegnaSheetProps) {
  const [docs, setDocs] = useState<DocsState>(INITIAL_STATE)
  const [generating, setGenerating] = useState(false)
  const reducedMotion = useReducedMotion()
  const intervalRefs = useRef<Partial<Record<DocKey, ReturnType<typeof setInterval>>>>({})

  // ─── Toggle selezione doc ──────────────────────────────────────────────

  function toggleDoc(key: DocKey) {
    hapticLight()
    setDocs((prev) => ({
      ...prev,
      [key]: { ...prev[key], selected: !prev[key].selected },
    }))
  }

  // ─── Genera un singolo documento ──────────────────────────────────────

  const generateDoc = useCallback(
    async (key: DocKey): Promise<boolean> => {
      const meta = DOC_META[key]

      // Avvia progress simulato
      setDocs((prev) => ({
        ...prev,
        [key]: { ...prev[key], stato: 'loading', progress: 0, error: null },
      }))

      // Simula avanzamento lento fino a ~88% durante il fetch
      let simProgress = 0
      intervalRefs.current[key] = setInterval(() => {
        simProgress = Math.min(simProgress + Math.random() * 8 + 3, 88)
        setDocs((prev) => ({
          ...prev,
          [key]: { ...prev[key], progress: Math.round(simProgress) },
        }))
      }, 100)

      try {
        const res = await fetch(`/api/lavori/${lavoro.id}/${meta.apiSegment}`)
        if (!res.ok) throw new Error(`Errore ${res.status}`)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)

        clearInterval(intervalRefs.current[key])
        delete intervalRefs.current[key]

        setDocs((prev) => ({
          ...prev,
          [key]: { ...prev[key], stato: 'ready', progress: 100, url, error: null },
        }))
        return true
      } catch (err) {
        clearInterval(intervalRefs.current[key])
        delete intervalRefs.current[key]

        const errorMsg = err instanceof Error ? err.message : 'Errore sconosciuto'
        setDocs((prev) => ({
          ...prev,
          [key]: { ...prev[key], stato: 'error', progress: 0, url: null, error: errorMsg },
        }))
        return false
      }
    },
    [lavoro.id]
  )

  // ─── Genera tutti i selezionati in sequenza ────────────────────────────

  const handleGenera = useCallback(async () => {
    setGenerating(true)
    hapticLight()

    const toGenerate = (Object.keys(docs) as DocKey[]).filter(
      (k) => docs[k].selected && docs[k].stato !== 'ready'
    )

    let successCount = 0
    for (const key of toGenerate) {
      const ok = await generateDoc(key)
      if (ok) successCount++
    }

    setGenerating(false)

    if (successCount === toGenerate.length && toGenerate.length > 0) hapticSuccess()
  }, [docs, generateDoc])

  // ─── Condividi ────────────────────────────────────────────────────────

  const handleCondividi = useCallback(async () => {
    hapticLight()
    const readyDocs = (Object.keys(docs) as DocKey[]).filter(
      (k) => docs[k].stato === 'ready' && docs[k].url
    )
    if (!readyDocs.length) return

    // Costruisce file blob per la Share API
    try {
      const files: File[] = await Promise.all(
        readyDocs.map(async (k) => {
          const res = await fetch(docs[k].url!)
          const blob = await res.blob()
          const filename = `${DOC_META[k].label.replace(/\s/g, '_')}_${lavoro.numero_lavoro}.pdf`
          return new File([blob], filename, { type: 'application/pdf' })
        })
      )

      if (navigator.canShare?.({ files })) {
        await navigator.share({
          files,
          title: `Pacchetto MDR — Lavoro ${lavoro.numero_lavoro}`,
          text: `Documenti MDR per il lavoro ${lavoro.numero_lavoro} — ${lavoro.cliente_display}`,
        })
        return
      }
    } catch {
      // Fallback sotto
    }

    // Fallback: apri link separati
    for (const k of readyDocs) {
      if (docs[k].url) window.open(docs[k].url!, '_blank', 'noopener')
    }
  }, [docs, lavoro])

  // ─── Conteggi ─────────────────────────────────────────────────────────

  const selectedCount = (Object.keys(docs) as DocKey[]).filter((k) => docs[k].selected).length
  const readyCount = (Object.keys(docs) as DocKey[]).filter(
    (k) => docs[k].stato === 'ready'
  ).length
  const toGenerateCount = (Object.keys(docs) as DocKey[]).filter(
    (k) => docs[k].selected && docs[k].stato !== 'ready'
  ).length

  // ─── Animazioni ───────────────────────────────────────────────────────

  const sheetTransition = reducedMotion ? { duration: 0 } : motionTokens.spring.soft
  const overlayTransition = reducedMotion ? { duration: 0 } : t('fast', 'exit')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 40,
            }}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Pacchetto Consegna MDR"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetTransition}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 50,
              background: 'var(--sfc, #E4DFD9)',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              paddingBottom: 'env(safe-area-inset-bottom, 20px)',
              boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 0 -8px 32px rgba(148,128,118,.35)',
              maxHeight: '90dvh',
              overflowY: 'auto',
            }}
          >
            {/* Handle bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                paddingTop: '12px',
                paddingBottom: '8px',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'var(--t3, #6B5C51)',
                }}
                aria-hidden="true"
              />
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              {/* Titolo */}
              <h2
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'var(--t1, #1C1916)',
                  margin: '0 0 2px',
                }}
              >
                Pacchetto Consegna MDR
              </h2>
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  color: 'var(--t2, #4A3D33)',
                  margin: '0 0 16px',
                }}
              >
                Seleziona i documenti da generare
              </p>

              {/* Lista documenti */}
              <div
                style={{
                  background: 'var(--elv, #EDEDEA)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  marginBottom: '16px',
                }}
                role="list"
              >
                {(Object.keys(docs) as DocKey[]).map((key, idx) => {
                  const doc = docs[key]
                  const meta = DOC_META[key]
                  const isLast = idx === Object.keys(docs).length - 1

                  return (
                    <div
                      key={key}
                      role="listitem"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '13px 16px',
                        borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,.06)',
                        minHeight: '52px',
                      }}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleDoc(key)}
                        disabled={generating || doc.stato === 'loading'}
                        aria-pressed={doc.selected}
                        aria-label={`${doc.selected ? 'Deseleziona' : 'Seleziona'} ${meta.label}`}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: doc.selected
                            ? '2px solid var(--primary, #D90012)'
                            : '2px solid var(--t3, #6B5C51)',
                          background: doc.selected ? 'var(--primary, #D90012)' : 'transparent',
                          cursor: generating || doc.stato === 'loading' ? 'not-allowed' : 'pointer',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        {doc.selected && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path
                              d="M2.5 6l2.5 2.5 4.5-5"
                              stroke="white"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>

                      {/* Icona */}
                      <span
                        style={{ fontSize: '18px', flexShrink: 0 }}
                        aria-hidden="true"
                      >
                        {meta.icon}
                      </span>

                      {/* Nome documento */}
                      <span
                        style={{
                          flex: 1,
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '13px',
                          fontWeight: doc.selected ? 600 : 400,
                          color: doc.selected
                            ? 'var(--t1, #1C1916)'
                            : 'var(--t2, #4A3D33)',
                          lineHeight: 1.3,
                        }}
                      >
                        {meta.label}
                      </span>

                      {/* Stato / progress */}
                      <div style={{ flexShrink: 0 }}>
                        {doc.stato === 'ready' && doc.url ? (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Apri ${meta.label}`}
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--success, #16A34A)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✓ Pronto
                          </a>
                        ) : (
                          <StatoBadge stato={doc.stato} progress={doc.progress} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pulsanti azione */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Genera */}
                {toGenerateCount > 0 && (
                  <button
                    type="button"
                    onClick={handleGenera}
                    disabled={generating || selectedCount === 0}
                    aria-busy={generating}
                    aria-label={
                      generating
                        ? 'Generazione in corso...'
                        : `Genera ${toGenerateCount} document${toGenerateCount === 1 ? 'o' : 'i'}`
                    }
                    style={{
                      flex: 1,
                      height: '52px',
                      borderRadius: '14px',
                      border: 'none',
                      background:
                        generating || selectedCount === 0
                          ? 'var(--elv, #EDEDEA)'
                          : 'var(--primary, #D90012)',
                      color:
                        generating || selectedCount === 0
                          ? 'var(--t2, #4A3D33)'
                          : '#ffffff',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '15px',
                      fontWeight: 800,
                      cursor:
                        generating || selectedCount === 0 ? 'not-allowed' : 'pointer',
                      boxShadow:
                        generating || selectedCount === 0
                          ? 'none'
                          : '0 0 20px rgba(217,0,18,0.35)',
                      letterSpacing: '0.02em',
                      transition: 'background 0.08s',
                    }}
                  >
                    {generating
                      ? 'Generazione...'
                      : `Genera ${toGenerateCount}`}
                  </button>
                )}

                {/* Condividi — visibile se almeno 1 pronto */}
                {readyCount > 0 && (
                  <button
                    type="button"
                    onClick={handleCondividi}
                    aria-label={`Condividi ${readyCount} document${readyCount === 1 ? 'o' : 'i'}`}
                    style={{
                      flex: toGenerateCount > 0 ? '0 0 auto' : 1,
                      height: '52px',
                      padding: '0 20px',
                      borderRadius: '14px',
                      border: '1.5px solid var(--gold, #D4A843)',
                      background: 'transparent',
                      color: 'var(--t1, #1C1916)',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '15px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 2v8M5 4.5L8 2l3 2.5"
                        stroke="var(--gold, #D4A843)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 10v3a1 1 0 001 1h8a1 1 0 001-1v-3"
                        stroke="var(--t2, #4A3D33)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Condividi
                  </button>
                )}
              </div>

              {/* Chiudi */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Chiudi pannello documenti"
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '10px',
                  height: '44px',
                  background: 'transparent',
                  border: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: 'var(--t2, #4A3D33)',
                  cursor: 'pointer',
                }}
              >
                Chiudi
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
