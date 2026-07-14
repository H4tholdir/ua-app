'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticMedium, hapticSuccess } from '@/lib/feedback/haptic'
import { soundSegnalazione } from '@/lib/feedback/sounds'
import type { TipoSegnalazione } from '@/types/domain'

export interface SegnalaProblemaSheetProps {
  lavoroId: string
  numeroLavoro: string
  clienteDisplay: string
  isOpen: boolean
  onClose: () => void
  onSegnalato?: () => void
}

type TileConfig = {
  tipo: TipoSegnalazione
  emoji: string
  label: string
  fullWidth?: boolean
}

const TILES: TileConfig[] = [
  { tipo: 'impronta_non_idonea',    emoji: '🦷', label: 'Impronta non idonea' },
  { tipo: 'colore_mancante',        emoji: '🎨', label: 'Colore non specificato' },
  { tipo: 'istruzione_poco_chiara', emoji: '📋', label: 'Istruzione poco chiara' },
  { tipo: 'materiale_esaurito',     emoji: '📦', label: 'Materiale esaurito' },
  { tipo: 'altro',                  emoji: '💬', label: 'Altro (descrivi sotto)', fullWidth: true },
]

const SH_RAISED = '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)'

export function SegnalaProblemaSheet({
  lavoroId,
  numeroLavoro,
  clienteDisplay,
  isOpen,
  onClose,
  onSegnalato,
}: SegnalaProblemaSheetProps) {
  const reducedMotion = useReducedMotion()

  const [selectedTipo, setSelectedTipo] = useState<TipoSegnalazione | null>(null)
  const [nota, setNota] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleClose() {
    setSelectedTipo(null)
    setNota('')
    setErrorMsg(null)
    onClose()
  }

  async function handleInvia() {
    if (!selectedTipo) {
      setErrorMsg('Seleziona un tipo di problema')
      return
    }
    setErrorMsg(null)
    hapticMedium()
    setLoading(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/segnala`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: selectedTipo, nota: nota.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg((data as { error?: string }).error ?? 'Errore durante l\'invio')
        setLoading(false)
        return
      }
      hapticSuccess()
      soundSegnalazione()
      setSelectedTipo(null)
      setNota('')
      onSegnalato?.()
      handleClose()
    } catch {
      setErrorMsg('Errore di rete. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="segnala-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast', 'exit')}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,.38)',
              zIndex: 80,
            }}
          />

          {/* Sheet */}
          <motion.div
            key="segnala-sheet"
            initial={reducedMotion ? undefined : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reducedMotion ? undefined : { y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 480,
              margin: '0 auto',
              background: 'var(--sfc, #E4DFD9)',
              borderRadius: '24px 24px 0 0',
              paddingBottom: 32,
              zIndex: 81,
              boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
            }}
          >
            {/* Handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: 'var(--t3, #6B5C51)',
                margin: '12px auto 0',
              }}
            />

            {/* Header */}
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--prs, #D4CFC9)' }}>
              <p style={{
                fontFamily: 'var(--font-v3, sans-serif)',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--t1, #1C1916)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}>
                Segnala un problema
              </p>
              <p style={{
                fontFamily: 'var(--font-v3, sans-serif)',
                fontSize: 13,
                color: 'var(--t2, #4A3D33)',
                margin: '3px 0 0',
              }}>
                {numeroLavoro} · {clienteDisplay}
              </p>
            </div>

            {/* Griglia tile */}
            <div style={{
              padding: '14px 16px 0',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}>
              {TILES.map((tile) => {
                const isSelected = selectedTipo === tile.tipo
                return (
                  <motion.button
                    key={tile.tipo}
                    whileTap={reducedMotion ? undefined : {
                      scale: [1, 0.96, 1],
                      transition: motionTokens.spring.snappy,
                    }}
                    onClick={() => {
                      setSelectedTipo(tile.tipo)
                      setErrorMsg(null)
                    }}
                    style={{
                      gridColumn: tile.fullWidth ? '1 / -1' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '13px 14px',
                      borderRadius: '14px',
                      border: isSelected ? '1.5px solid rgba(217,0,18,.25)' : '1.5px solid transparent',
                      background: isSelected ? 'rgba(217,0,18,.08)' : 'var(--elv, #EDEDEA)',
                      color: isSelected ? 'var(--primary, #D90012)' : 'var(--t1, #1C1916)',
                      boxShadow: isSelected ? 'none' : SH_RAISED,
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '52px',
                      fontFamily: 'var(--font-v3, sans-serif)',
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 500,
                      transition: 'background var(--tr), border-color var(--tr), color var(--tr), box-shadow var(--tr)',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    aria-pressed={isSelected}
                    aria-label={tile.label}
                  >
                    <span style={{ fontSize: 20, flexShrink: 0 }}>{tile.emoji}</span>
                    <span style={{ lineHeight: 1.25 }}>{tile.label}</span>
                  </motion.button>
                )
              })}
            </div>

            {/* Nota */}
            <div style={{ padding: '12px 16px 0' }}>
              <label style={{
                display: 'block',
                fontFamily: 'var(--font-v3, sans-serif)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--t3, #6B5C51)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '6px',
              }}>
                Nota per il titolare (opzionale)
              </label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Descrivi il problema in dettaglio..."
                rows={2}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--prs, #D4CFC9)',
                  background: 'var(--elv, #EDEDEA)',
                  fontFamily: 'var(--font-v3, sans-serif)',
                  fontSize: '14px',
                  color: 'var(--t1, #1C1916)',
                  boxSizing: 'border-box',
                  outline: 'none',
                  minHeight: '68px',
                }}
              />
            </div>

            {/* Bottone invio */}
            <div style={{ padding: '12px 16px 0' }}>
              <button
                type="button"
                disabled={loading || !selectedTipo}
                onClick={handleInvia}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: 'none',
                  background: loading || !selectedTipo
                    ? 'rgba(217,0,18,.30)'
                    : 'var(--primary, #D90012)',
                  color: '#fff',
                  fontFamily: 'var(--font-v3, sans-serif)',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: loading || !selectedTipo ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  minHeight: '52px',
                  letterSpacing: '0.01em',
                  transition: 'background var(--tr)',
                }}
                aria-busy={loading}
              >
                <span aria-hidden="true">⚠</span>
                {loading ? 'Invio in corso...' : 'Invia segnalazione'}
              </button>

              {/* Errore — sotto il pulsante */}
              {errorMsg && (
                <p style={{
                  fontFamily: 'var(--font-v3, sans-serif)',
                  fontSize: '13px',
                  color: 'var(--primary, #D90012)',
                  margin: '8px 0 0',
                }} role="alert">
                  {errorMsg}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
