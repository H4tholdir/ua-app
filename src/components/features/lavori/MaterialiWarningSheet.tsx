'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticLight } from '@/lib/feedback/haptic'

interface MaterialeCarente {
  nome: string
  quantita_necessaria: number
  scorta_attuale: number
  unita_misura: string
  sufficiente: boolean
}

interface MaterialiWarningSheetProps {
  open: boolean
  materiali: MaterialeCarente[]
  onProcedi: () => void
  onAnnulla: () => void
}

export function MaterialiWarningSheet({
  open,
  materiali,
  onProcedi,
  onAnnulla,
}: MaterialiWarningSheetProps) {
  const reducedMotion = useReducedMotion()

  // Haptic all'apertura
  useEffect(() => {
    if (open) hapticLight()
  }, [open])

  // Blocca scroll body quando lo sheet è aperto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const sheetTransition = reducedMotion
    ? { duration: 0 }
    : motionTokens.spring.soft

  const overlayTransition = reducedMotion
    ? { duration: 0 }
    : { duration: motionTokens.duration.normal, ease: motionTokens.easing.standard }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="materiali-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            onClick={onAnnulla}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(28,25,22,.55)',
              zIndex: 200,
            }}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            key="materiali-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="materiali-sheet-title"
            initial={{ transform: 'translateY(100%)' }}
            animate={{ transform: 'translateY(0%)' }}
            exit={{ transform: 'translateY(100%)' }}
            transition={sheetTransition}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 201,
              background: 'var(--sfc, #E4DFD9)',
              borderRadius: '20px 20px 0 0',
              padding: '0 0 env(safe-area-inset-bottom, 16px)',
              maxHeight: '85dvh',
              overflowY: 'auto',
            }}
          >
            {/* Handle */}
            <div
              aria-hidden="true"
              style={{
                width: '40px',
                height: '4px',
                borderRadius: '2px',
                background: 'var(--t3, #B8B3AE)',
                margin: '12px auto 0',
              }}
            />

            {/* Header */}
            <div style={{ padding: '20px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(212,168,67,.16)',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  ⚠
                </span>
                <h2
                  id="materiali-sheet-title"
                  style={{
                    margin: 0,
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--t1, #1C1916)',
                  }}
                >
                  Giacenza insufficiente
                </h2>
              </div>
              <p
                style={{
                  margin: '0 0 16px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: 'var(--t2, #96918D)',
                  lineHeight: 1.5,
                }}
              >
                {materiali.length === 1
                  ? '1 materiale sotto scorta per questo lavoro'
                  : `${materiali.length} materiali sotto scorta per questo lavoro`}
              </p>
            </div>

            {/* Lista materiali carenti */}
            <ul
              style={{
                listStyle: 'none',
                margin: 0,
                padding: '0 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
              aria-label="Materiali con giacenza insufficiente"
            >
              {materiali.map((m, i) => {
                const isEsaurito = m.scorta_attuale <= 0
                return (
                  <li
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--elv, #EDEDEA)',
                      boxShadow: '-2px -2px 6px rgba(255,255,255,.72), 3px 4px 8px -1px rgba(148,128,118,.28)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--t1, #1C1916)',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {m.nome}
                      <br />
                      <span
                        style={{
                          fontSize: '12px',
                          color: 'var(--t2, #96918D)',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        Necessari: {m.quantita_necessaria.toFixed(2)} {m.unita_misura} &nbsp;·&nbsp; Disponibili: {m.scorta_attuale.toFixed(2)} {m.unita_misura}
                      </span>
                    </span>
                    <span
                      aria-label={isEsaurito ? 'Esaurito' : 'Insufficiente'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        height: '24px',
                        padding: '0 10px',
                        borderRadius: '100px',
                        background: isEsaurito
                          ? 'rgba(217,0,18,.12)'
                          : 'rgba(212,168,67,.16)',
                        color: isEsaurito
                          ? 'var(--primary, #D90012)'
                          : '#8A6B00',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {isEsaurito ? 'Esaurito' : 'Insufficiente'}
                    </span>
                  </li>
                )
              })}
            </ul>

            {/* Azioni */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                padding: '20px',
              }}
            >
              <button
                type="button"
                onClick={onAnnulla}
                style={{
                  minHeight: '48px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1.5px solid rgba(0,0,0,.10)',
                  background: 'var(--elv, #EDEDEA)',
                  color: 'var(--t1, #1C1916)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '-3px -3px 7px rgba(255,255,255,.72), 4px 5px 10px -2px rgba(148,128,118,.32)',
                }}
                aria-label="Annulla — non procedere con la consegna"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={onProcedi}
                style={{
                  minHeight: '48px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--gold, #D4A843)',
                  color: 'var(--t1, #1C1916)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '-3px -3px 7px rgba(255,255,255,.72), 4px 5px 10px -2px rgba(148,128,118,.32)',
                }}
                aria-label="Procedi comunque con la consegna nonostante la giacenza insufficiente"
              >
                Procedi comunque
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
