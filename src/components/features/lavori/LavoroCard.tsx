'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/feedback/haptic'
import type { StatoLavoro, PrioritaLavoro } from '@/types/domain'

// ─── Design tokens v2.2 — warm palette ──────────────────────────────────────
const DS = {
  surface: 'var(--surface, #E4DFD9)',
  sfc:     'var(--sfc, #E4DFD9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
  prs:     'var(--prs, #D4CFC9)',
}

// ─── Stato → dot color + glifo ───────────────────────────────────────────────
const STATO_GLYPHS: Record<StatoLavoro, string> = {
  in_ritardo:       '!',
  in_prova:         '↺',
  in_prova_esterna: '↗',
  in_lavorazione:   '·',
  pronto:           '✓',
  consegnato:       '✓',
  ricevuto:         '·',
  annullato:        '×',
  sospeso:          '‖',
}

const STATO_COLORS: Record<StatoLavoro, string> = {
  in_ritardo:       '#D90012',
  in_prova:         '#B45309',
  in_prova_esterna: '#B45309',
  in_lavorazione:   '#2563EB',
  pronto:           '#16A34A',
  consegnato:       '#9CA3AF',
  ricevuto:         '#9CA3AF',
  annullato:        '#9CA3AF',
  sospeso:          '#9CA3AF',
}

// ─── Timeline ────────────────────────────────────────────────────────────────
const STEPS: StatoLavoro[] = ['ricevuto', 'in_lavorazione', 'pronto', 'consegnato']
const STEP_LABELS = ['Ricevuto', 'Lavorazione', 'Pronto', 'Consegna']

function getStepIndex(stato: StatoLavoro): number {
  if (stato === 'in_ritardo')       return 1 // bloccato in lavorazione
  if (stato === 'in_prova')         return 2 // pronto parziale
  if (stato === 'in_prova_esterna') return 2
  if (stato === 'sospeso')          return 1
  const idx = STEPS.indexOf(stato)
  return Math.max(0, idx)
}

// ─── Urgency line ────────────────────────────────────────────────────────────
function urgencyLine(
  stato: StatoLavoro,
  priorita: PrioritaLavoro,
  ora: string | null,
): string {
  if (stato === 'in_ritardo')        return 'IN RITARDO'
  if (priorita === 'extra_urgente')  return 'EXTRA URGENTE'
  if (priorita === 'urgente')        return 'URGENTE'
  if (stato === 'pronto')            return `PRONTO${ora ? ` · Consegna ore ${ora}` : ''}`
  if (stato === 'in_prova')          return 'IN PROVA'
  if (stato === 'in_prova_esterna')  return 'IN PROVA ESTERNA'
  if (stato === 'in_lavorazione')    return 'IN LAVORAZIONE'
  if (stato === 'consegnato')        return 'CONSEGNATO'
  if (stato === 'ricevuto')          return 'RICEVUTO'
  if (stato === 'sospeso')           return 'SOSPESO'
  return 'ANNULLATO'
}

// ─── Transizioni stato consentite (mirror di /api/lavori/[id]/stato) ─────────
const TRANSIZIONI: Partial<Record<StatoLavoro, StatoLavoro[]>> = {
  ricevuto:         ['in_lavorazione'],
  in_lavorazione:   ['pronto', 'in_prova_esterna', 'sospeso'],
  in_prova_esterna: ['in_lavorazione', 'pronto'],
  in_prova:         ['in_lavorazione', 'pronto'],
  sospeso:          ['in_lavorazione'],
  in_ritardo:       ['in_lavorazione'],
  pronto:           ['in_lavorazione'],
}

const STATO_LABELS: Partial<Record<StatoLavoro, string>> = {
  ricevuto:         'Ricevuto',
  in_lavorazione:   'In lavorazione',
  pronto:           'Pronto',
  in_prova_esterna: 'In prova esterna',
  in_prova:         'In prova',
  sospeso:          'Sospeso',
  in_ritardo:       'In ritardo',
  consegnato:       'Consegnato',
  annullato:        'Annullato',
}

const PRIORITA_LABELS: Record<string, string> = {
  normale:        'Normale',
  urgente:        'Urgente',
  extra_urgente:  'Extra urgente',
}

// ─── Costanti swipe ───────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 60
const ACTIONS_WIDTH   = 216  // 3 × 72px

// ─── Props ───────────────────────────────────────────────────────────────────
interface LavoroCardProps {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  tipo_dispositivo: string
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente_display: string
  animationDelay?: number
  fasi_completate?: number
  fasi_totali?: number
  tecnico_id?: string | null
  onUpdate?: () => void
  segnalazione_tipo?: string | null
}

// ─── ActionButton (striscia swipe) ───────────────────────────────────────────
function ActionButton({
  color,
  textColor,
  icon,
  label,
  onClick,
}: {
  color: string
  textColor?: string
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 72,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: color,
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        minHeight: 44,
        flexShrink: 0,
      }}
      aria-label={label}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 10,
          fontWeight: 700,
          color: textColor ?? '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </span>
    </button>
  )
}

// ─── SheetAction (bottom sheet) ───────────────────────────────────────────────
function SheetAction({
  icon,
  color,
  title,
  sub,
  onClick,
}: {
  icon: string
  color: string
  title: string
  sub?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        borderRadius: 14,
        background: 'var(--elv, #EDEDEA)',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        minHeight: 56,
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 600, color: 'var(--t1, #1C1916)', margin: 0 }}>
          {title}
        </p>
        {sub && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--t2, #96918D)', margin: '2px 0 0' }}>
            {sub}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export function LavoroCard({
  id,
  numero_lavoro,
  stato,
  priorita,
  descrizione,
  data_consegna_prevista,
  ora_consegna,
  paziente_nome_snapshot,
  cliente_display,
  animationDelay = 0,
  fasi_completate,
  fasi_totali,
  tecnico_id,
  onUpdate,
  segnalazione_tipo,
}: LavoroCardProps) {
  const reducedMotion = useReducedMotion()
  const statoColor    = STATO_COLORS[stato]
  const statoGliph    = STATO_GLYPHS[stato]
  const currentStep   = getStepIndex(stato)
  const urgency       = urgencyLine(stato, priorita, ora_consegna)

  // ─── Swipe + long press state ─────────────────────────────────────────────
  const [swipeX, setSwipeX]         = useState(0)
  const [isOpen, setIsOpen]         = useState(false)
  const [sheetOpen, setSheetOpen]   = useState(false)

  // Sub-sheet states
  const [subSheet, setSubSheet] = useState<'assegna' | 'stato' | 'priorita' | null>(null)
  const [tecnici, setTecnici]   = useState<{ id: string; nome: string; cognome: string; sigla: string | null }[]>([])

  const touchStartX    = useRef(0)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Formatted delivery date ──────────────────────────────────────────────
  const deliveryLabel = (() => {
    if (!data_consegna_prevista) return ''
    const d = new Date(data_consegna_prevista + 'T00:00:00')
    if (isNaN(d.getTime())) return data_consegna_prevista
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  })()

  // ─── Touch handlers ───────────────────────────────────────────────────────
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    const timer = setTimeout(() => {
      setSheetOpen(true)
      hapticMedium()
      longPressTimer.current = null
    }, 500)
    longPressTimer.current = timer
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    const dx = touchStartX.current - e.touches[0].clientX
    if (dx > 0) {
      setSwipeX(Math.min(dx, ACTIONS_WIDTH + 20))
    } else {
      setSwipeX(Math.max(0, isOpen ? ACTIONS_WIDTH + dx : 0))
    }
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    if (swipeX > SWIPE_THRESHOLD) {
      setIsOpen(true)
      setSwipeX(ACTIONS_WIDTH)
      hapticLight()
    } else {
      setIsOpen(false)
      setSwipeX(0)
    }
  }

  // ─── Close swipe ──────────────────────────────────────────────────────────
  function closeSwipe() {
    setIsOpen(false)
    setSwipeX(0)
  }

  // ─── PATCH helper ─────────────────────────────────────────────────────────
  async function patchLavoro(body: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/lavori/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[LavoroCard] PATCH error:', data)
        return false
      }
      return true
    } catch (err) {
      console.error('[LavoroCard] PATCH fetch error:', err)
      return false
    }
  }

  async function patchStato(nuovoStato: StatoLavoro) {
    try {
      const res = await fetch(`/api/lavori/${id}/stato`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stato: nuovoStato }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        console.error('[LavoroCard] PATCH stato error:', data)
        return false
      }
      return true
    } catch (err) {
      console.error('[LavoroCard] PATCH stato fetch error:', err)
      return false
    }
  }

  // ─── Azioni ───────────────────────────────────────────────────────────────
  const handleAssegna = useCallback(async () => {
    closeSwipe()
    // Fetch tecnici
    try {
      const res = await fetch('/api/tecnici')
      if (res.ok) {
        const json = await res.json()
        setTecnici(json.tecnici ?? [])
      }
    } catch {
      setTecnici([])
    }
    setSubSheet('assegna')
    setSheetOpen(true)
  }, [])

  const handleStato = useCallback(() => {
    closeSwipe()
    setSubSheet('stato')
    setSheetOpen(true)
  }, [])

  const handlePriorita = useCallback(() => {
    closeSwipe()
    setSubSheet('priorita')
    setSheetOpen(true)
  }, [])

  function closeSheet() {
    setSheetOpen(false)
    setSubSheet(null)
  }

  async function selectTecnico(tecnicoId: string) {
    const ok = await patchLavoro({ tecnico_id: tecnicoId })
    if (ok) {
      hapticSuccess()
      onUpdate?.()
    }
    closeSheet()
  }

  async function selectStato(nuovoStato: StatoLavoro) {
    const ok = await patchStato(nuovoStato)
    if (ok) {
      hapticSuccess()
      onUpdate?.()
    }
    closeSheet()
  }

  async function selectPriorita(nuovaPriorita: string) {
    const ok = await patchLavoro({ priorita: nuovaPriorita })
    if (ok) {
      hapticSuccess()
      onUpdate?.()
    }
    closeSheet()
  }

  // ─── Stati successivi disponibili ────────────────────────────────────────
  const statiSuccessivi = TRANSIZIONI[stato] ?? []

  // ─── Card style ──────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: DS.surface,
    borderRadius: 16,
    padding: '14px 16px',
    position: 'relative',
    overflow: 'hidden',
    textDecoration: 'none',
    display: 'block',
    color: 'inherit',
    boxShadow: `
      6px 6px 12px rgba(148,128,118,.22),
      -6px -6px 12px rgba(255,255,255,.55),
      inset 2px 2px 4px rgba(255,255,255,.50),
      inset -2px -2px 4px rgba(0,0,0,.05)
    `,
    WebkitTapHighlightColor: 'transparent',
    width: '100%',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }

  // ─── Inner card content (shared between swipe and non-swipe) ─────────────
  const innerContent = (
    <>
      {/* Badge circolare stato — absolute top-right */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: statoColor,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'DM Sans, sans-serif',
          lineHeight: 1,
        }}
      >
        {statoGliph}
      </div>

      {/* Badge priorità — visibile solo per urgente/extra_urgente */}
      {priorita === 'urgente' && (
        <motion.div
          initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={motionTokens.spring.snappy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '100px',
            background: 'rgba(212,168,67,.15)',
            border: '1px solid rgba(212,168,67,.35)',
            color: '#92400E',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            marginBottom: '4px',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          ↑ Urgente
        </motion.div>
      )}
      {priorita === 'extra_urgente' && (
        <motion.div
          initial={reducedMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={motionTokens.spring.snappy}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '100px',
            background: 'rgba(217,0,18,.10)',
            border: '1px solid rgba(217,0,18,.25)',
            color: 'var(--primary, #D90012)',
            fontSize: '10px',
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            marginBottom: '4px',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          ⚡ Extra urgente
        </motion.div>
      )}

      {/* Riga 1: cliente */}
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          fontFamily: 'DM Sans, sans-serif',
          color: DS.t1,
          lineHeight: 1.3,
          paddingRight: 40, // spazio per il badge
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {cliente_display}
      </div>

      {/* Riga 2: numero · dispositivo */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 400,
          fontFamily: 'DM Sans, sans-serif',
          color: DS.t2,
          marginTop: 2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          paddingRight: 40,
        }}
      >
        {numero_lavoro}
        {descrizione ? ` · ${descrizione}` : ''}
        {paziente_nome_snapshot ? ` — ${paziente_nome_snapshot}` : ''}
      </div>

      {/* Riga 3: urgency label + data consegna */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
            color: statoColor,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
          }}
        >
          {urgency}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            fontFamily: 'DM Sans, sans-serif',
            color: DS.t3,
            marginLeft: 'auto',
            paddingRight: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {deliveryLabel}
        </span>
      </div>

      {/* Riga 4: timeline 4-dot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginTop: 10,
          paddingRight: 28, // keep clear of chevron
        }}
        aria-hidden
      >
        {STEP_LABELS.map((label, i) => {
          const isFilled  = i <= currentStep
          const isCurrent = i === currentStep
          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: i <= currentStep ? statoColor : 'rgba(0,0,0,.10)',
                    minWidth: 0,
                  }}
                />
              )}
              <div
                style={{
                  width:        isCurrent ? 12 : 9,
                  height:       isCurrent ? 12 : 9,
                  borderRadius: '50%',
                  background:   isFilled ? statoColor : 'transparent',
                  border:       isFilled ? 'none' : '1.5px solid rgba(0,0,0,.18)',
                  flexShrink:   0,
                  transition:   'none',
                }}
              />
            </React.Fragment>
          )
        })}

        {/* Step label corrente */}
        <span
          style={{
            marginLeft: 8,
            fontSize: 11,
            fontWeight: 500,
            color: statoColor,
            fontFamily: 'DM Sans, sans-serif',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {STEP_LABELS[currentStep]}
        </span>
      </div>

      {/* Barra progresso fasi */}
      {fasi_totali != null && fasi_totali > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
          <div style={{
            flex: 1,
            height: '4px',
            borderRadius: '2px',
            background: 'var(--prs, #D4CFC9)',
            overflow: 'hidden',
          }}>
            <motion.div
              initial={reducedMotion ? false : { width: 0 }}
              animate={{ width: `${Math.round((fasi_completate ?? 0) / fasi_totali * 100)}%` }}
              transition={reducedMotion ? {} : t('normal', 'enter')}
              style={{
                height: '100%',
                borderRadius: '2px',
                background: (fasi_completate ?? 0) >= fasi_totali
                  ? 'var(--success, #16A34A)'
                  : 'var(--cobalt, #1B2D6B)',
              }}
            />
          </div>
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            color: (fasi_completate ?? 0) >= fasi_totali
              ? 'var(--success, #16A34A)'
              : 'var(--t2, #96918D)',
            whiteSpace: 'nowrap',
            fontFamily: 'DM Sans, sans-serif',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {fasi_completate ?? 0}/{fasi_totali}{(fasi_completate ?? 0) >= fasi_totali ? ' ✓' : ' fasi'}
          </span>
        </div>
      )}

      {/* Tag segnalazione problema */}
      {segnalazione_tipo && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          padding: '2px 8px', borderRadius: '6px',
          background: 'rgba(217,0,18,.08)', color: 'var(--primary, #D90012)',
          border: '1px solid rgba(217,0,18,.18)',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
          marginTop: '4px', fontFamily: 'DM Sans, sans-serif',
        }}>
          ⚠ Problema segnalato
        </div>
      )}

      {/* Chevron */}
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        style={{
          position: 'absolute',
          bottom: 14,
          right: 16,
          color: DS.t3,
        }}
      >
        <path
          d="M6 4l4 4-4 4"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </>
  )

  // ─── Main card with swipe wrapper ─────────────────────────────────────────
  const cardWithSwipe = (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 16 }}>
      {/* Striscia azioni — sempre presente ma nascosta a destra */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'stretch',
          width: ACTIONS_WIDTH,
        }}
      >
        <ActionButton
          color="#2563EB"
          icon="👤"
          label="Assegna"
          onClick={handleAssegna}
        />
        <ActionButton
          color="var(--gold, #D4A843)"
          textColor="#1C1916"
          icon="↻"
          label="Stato"
          onClick={handleStato}
        />
        <ActionButton
          color="var(--primary, #D90012)"
          icon="↑"
          label="Priorità"
          onClick={handlePriorita}
        />
      </div>

      {/* Card traslata */}
      <motion.div
        style={{ x: -swipeX }}
        animate={{ x: isOpen ? -ACTIONS_WIDTH : -swipeX }}
        transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Link
          href={`/lavori/${id}`}
          style={cardStyle}
          aria-label={`Lavoro ${numero_lavoro} — ${cliente_display} — ${urgency}`}
          onClick={(e) => {
            if (isOpen) {
              e.preventDefault()
              closeSwipe()
            }
          }}
        >
          {innerContent}
        </Link>
      </motion.div>
    </div>
  )

  // ─── Bottom sheet ─────────────────────────────────────────────────────────
  const bottomSheet = (
    <AnimatePresence>
      {sheetOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast', 'exit')}
            onClick={closeSheet}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,.32)',
              zIndex: 70,
            }}
          />
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              maxWidth: 480,
              margin: '0 auto',
              background: DS.sfc,
              borderRadius: '24px 24px 0 0',
              paddingBottom: 32,
              zIndex: 71,
              boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
            }}
          >
            {/* Drag handle */}
            <div
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                background: DS.t3,
                margin: '12px auto 16px',
              }}
            />

            {subSheet === null && (
              <>
                {/* Header */}
                <div
                  style={{
                    padding: '0 20px 14px',
                    borderBottom: `1px solid ${DS.prs}`,
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 17,
                      fontWeight: 800,
                      color: DS.t1,
                    }}
                  >
                    {numero_lavoro}
                  </p>
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      color: DS.t2,
                      marginTop: 2,
                    }}
                  >
                    {cliente_display} · {deliveryLabel}
                  </p>
                </div>

                {/* Azioni */}
                <div
                  style={{
                    padding: '12px 16px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <SheetAction
                    icon="👤"
                    color="#2563EB"
                    title="Assegna tecnico"
                    sub={tecnico_id ? 'Tecnico già assegnato' : 'Nessun tecnico assegnato'}
                    onClick={handleAssegna}
                  />
                  <SheetAction
                    icon="↻"
                    color="var(--gold, #D4A843)"
                    title="Cambia stato"
                    sub={
                      statiSuccessivi.length > 0
                        ? `${STATO_LABELS[stato] ?? stato} → ${statiSuccessivi.map((s) => STATO_LABELS[s] ?? s).join(' / ')}`
                        : 'Nessuna transizione disponibile'
                    }
                    onClick={handleStato}
                  />
                  <SheetAction
                    icon="↑"
                    color="var(--primary, #D90012)"
                    title="Imposta priorità"
                    sub="Normale · Urgente · Extra urgente"
                    onClick={handlePriorita}
                  />
                  <SheetAction
                    icon="✕"
                    color={DS.t3}
                    title="Annulla"
                    onClick={closeSheet}
                  />
                </div>
              </>
            )}

            {/* Sub-sheet: Assegna tecnico */}
            {subSheet === 'assegna' && (
              <>
                <div style={{ padding: '0 20px 14px', borderBottom: `1px solid ${DS.prs}` }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 17, fontWeight: 800, color: DS.t1 }}>
                    Assegna tecnico
                  </p>
                </div>
                <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {tecnici.length === 0 && (
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: DS.t2, padding: '8px 0' }}>
                      Nessun tecnico disponibile
                    </p>
                  )}
                  {tecnici.map((tec) => (
                    <SheetAction
                      key={tec.id}
                      icon="👤"
                      color={tec.id === tecnico_id ? '#16A34A' : '#2563EB'}
                      title={`${tec.nome} ${tec.cognome}`}
                      sub={tec.sigla ?? undefined}
                      onClick={() => selectTecnico(tec.id)}
                    />
                  ))}
                  <SheetAction icon="✕" color={DS.t3} title="Annulla" onClick={closeSheet} />
                </div>
              </>
            )}

            {/* Sub-sheet: Cambia stato */}
            {subSheet === 'stato' && (
              <>
                <div style={{ padding: '0 20px 14px', borderBottom: `1px solid ${DS.prs}` }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 17, fontWeight: 800, color: DS.t1 }}>
                    Cambia stato
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t2, marginTop: 2 }}>
                    Attuale: {STATO_LABELS[stato] ?? stato}
                  </p>
                </div>
                <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {statiSuccessivi.length === 0 && (
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: DS.t2, padding: '8px 0' }}>
                      Nessuna transizione disponibile dallo stato attuale.
                    </p>
                  )}
                  {statiSuccessivi.map((s) => (
                    <SheetAction
                      key={s}
                      icon="↻"
                      color={STATO_COLORS[s]}
                      title={STATO_LABELS[s] ?? s}
                      onClick={() => selectStato(s)}
                    />
                  ))}
                  <SheetAction icon="✕" color={DS.t3} title="Annulla" onClick={closeSheet} />
                </div>
              </>
            )}

            {/* Sub-sheet: Priorità */}
            {subSheet === 'priorita' && (
              <>
                <div style={{ padding: '0 20px 14px', borderBottom: `1px solid ${DS.prs}` }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 17, fontWeight: 800, color: DS.t1 }}>
                    Imposta priorità
                  </p>
                </div>
                <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(['normale', 'urgente', 'extra_urgente'] as const).map((p) => (
                    <SheetAction
                      key={p}
                      icon={p === 'normale' ? '○' : p === 'urgente' ? '↑' : '⚡'}
                      color={
                        p === 'normale'
                          ? DS.t3
                          : p === 'urgente'
                            ? 'var(--gold, #D4A843)'
                            : 'var(--primary, #D90012)'
                      }
                      title={PRIORITA_LABELS[p]}
                      sub={p === priorita ? 'Attuale' : undefined}
                      onClick={() => selectPriorita(p)}
                    />
                  ))}
                  <SheetAction icon="✕" color={DS.t3} title="Annulla" onClick={closeSheet} />
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  // ─── No motion: skip entrance animation ──────────────────────────────────
  if (reducedMotion) {
    return (
      <>
        {cardWithSwipe}
        {bottomSheet}
      </>
    )
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, transform: 'translateY(12px)' }}
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ ...t('normal', 'enter'), delay: animationDelay }}
        style={{ minWidth: 0, width: '100%' }}
      >
        {cardWithSwipe}
      </motion.div>
      {bottomSheet}
    </>
  )
}
