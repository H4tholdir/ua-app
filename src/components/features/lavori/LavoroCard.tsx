'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'
import type { StatoLavoro, PrioritaLavoro } from '@/types/domain'

// ─── Design tokens v2.2 — warm palette ──────────────────────────────────────
const DS = {
  surface: 'var(--surface, #E4DFD9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
}

// ─── Stato → dot color ───────────────────────────────────────────────────────
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
  if (stato === 'in_prova')          return 'IN PROVA ESTERNA'
  if (stato === 'in_prova_esterna')  return 'IN PROVA ESTERNA'
  if (stato === 'in_lavorazione')    return 'IN LAVORAZIONE'
  if (stato === 'consegnato')        return 'CONSEGNATO'
  if (stato === 'ricevuto')          return 'RICEVUTO'
  if (stato === 'sospeso')           return 'SOSPESO'
  return 'ANNULLATO'
}

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
}

// ─── Component ───────────────────────────────────────────────────────────────
export function LavoroCard({
  id,
  numero_lavoro,
  stato,
  priorita,
  tipo_dispositivo,
  descrizione,
  data_consegna_prevista,
  ora_consegna,
  paziente_nome_snapshot,
  cliente_display,
  animationDelay = 0,
}: LavoroCardProps) {
  const reducedMotion = useReducedMotion()
  const statoColor    = STATO_COLORS[stato]
  const currentStep   = getStepIndex(stato)
  const urgency       = urgencyLine(stato, priorita, ora_consegna)

  // Formatted delivery date: "15 mag" style
  const deliveryLabel = (() => {
    try {
      const d = new Date(data_consegna_prevista)
      return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    } catch {
      return data_consegna_prevista
    }
  })()

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
  }

  const cardContent = (
    <Link
      href={`/lavori/${id}`}
      style={cardStyle}
      aria-label={`Lavoro ${numero_lavoro} — ${cliente_display} — ${urgency}`}
    >
      {/* Shine overlay */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,.12) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
          animation: 'card-shine 4s ease-in-out infinite',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />

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
        }}
      />

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
                  transition:   'all 0.2s',
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
    </Link>
  )

  if (reducedMotion) {
    return cardContent
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...t('normal', 'enter'), delay: animationDelay }}
    >
      {cardContent}
    </motion.div>
  )
}
