'use client'

import { motion, AnimatePresence } from 'motion/react'
import { t, motionTokens, useReducedMotion } from '@/design-system/motion'
import type { Lavoro, StatoLavoro } from '@/types/domain'

// ─── Ordine lineare dei 5 step principali ───────────────────
// in_ritardo e annullato sono stati "trasversali" — non nel flusso lineare.
// in_ritardo: mostra la posizione attuale con glow rosso.
// annullato: mostra tutti i dot grigi/vuoti senza highlight.
const STEPS: Array<{ stato: StatoLavoro; label: string }> = [
  { stato: 'ricevuto',       label: 'Ricevuto' },
  { stato: 'in_lavorazione', label: 'In lavorazione' },
  { stato: 'in_prova',       label: 'In prova' },
  { stato: 'pronto',         label: 'Pronto' },
  { stato: 'consegnato',     label: 'Consegnato' },
]

const STEP_ORDER: Record<string, number> = {
  ricevuto: 0,
  in_lavorazione: 1,
  in_prova: 2,
  pronto: 3,
  consegnato: 4,
}

type LavoroTimelineProps = {
  lavoro: Pick<
    Lavoro,
    | 'stato'
    | 'data_ingresso'
    | 'data_consegna_prevista'
    | 'data_consegna_effettiva'
    | 'numero_lavoro'
  >
}

function formatDataBreve(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export function LavoroTimeline({ lavoro }: LavoroTimelineProps) {
  const reducedMotion = useReducedMotion()
  const { stato } = lavoro

  const isAnnullato = stato === 'annullato'
  const isInRitardo = stato === 'in_ritardo'

  // Per in_ritardo trattiamo la posizione come "in_lavorazione" (step 1)
  // ma con glow rosso — l'operatore sa che il lavoro è indietro
  const currentOrder = isAnnullato
    ? -1
    : isInRitardo
    ? STEP_ORDER['in_lavorazione'] ?? 1
    : (STEP_ORDER[stato] ?? 0)

  return (
    <div
      style={{ padding: '0 4px' }}
      aria-label={`Timeline lavoro ${lavoro.numero_lavoro}`}
    >
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
        aria-label="Fasi di lavorazione"
      >
        {STEPS.map((step, index) => {
          const stepOrder = STEP_ORDER[step.stato] ?? index
          const isCompleted = !isAnnullato && stepOrder < currentOrder
          const isCurrent =
            !isAnnullato &&
            (isInRitardo
              ? step.stato === 'in_lavorazione'
              : step.stato === stato)


          const isLast = index === STEPS.length - 1

          // Data da mostrare accanto allo step
          let dateLabel = ''
          if (step.stato === 'ricevuto' && lavoro.data_ingresso) {
            dateLabel = formatDataBreve(lavoro.data_ingresso)
          } else if (step.stato === 'consegnato' && lavoro.data_consegna_effettiva) {
            dateLabel = formatDataBreve(lavoro.data_consegna_effettiva)
          } else if (step.stato === 'pronto' && !lavoro.data_consegna_effettiva) {
            dateLabel = `prev. ${formatDataBreve(lavoro.data_consegna_prevista)}`
          }

          // Colori dot
          const dotColor = isAnnullato
            ? '#2A1A1A'
            : isCompleted
            ? '#2ECC9A'
            : isCurrent
            ? isInRitardo
              ? '#FA5252'
              : '#D4A843'
            : '#243580'

          const dotBorder = isCompleted ? '#2ECC9A' : isCurrent ? dotColor : '#243580'

          // Colore linea connettore
          const lineColor = isCompleted ? '#2ECC9A' : '#243580'

          return (
            <li
              key={step.stato}
              style={{
                display: 'flex',
                gap: '16px',
                position: 'relative',
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Colonna sinistra: dot + linea */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: '20px',
                  flexShrink: 0,
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isCurrent ? (
                    <motion.div
                      animate={reducedMotion ? {} : {
                        scale: [1, 1.18, 1],
                        boxShadow: [
                          `0 0 0 0 ${dotColor}44`,
                          `0 0 0 7px ${dotColor}00`,
                          `0 0 0 0 ${dotColor}00`,
                        ],
                      }}
                      transition={reducedMotion ? {} : {
                        duration: motionTokens.duration.expressive,
                        ease: motionTokens.easing.standard as [number, number, number, number],
                        repeat: Infinity,
                        repeatDelay: 1.2,
                      }}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: dotColor,
                        border: `2px solid ${dotBorder}`,
                      }}
                      aria-hidden="true"
                    />
                  ) : (
                    <div
                      style={{
                        width: isCompleted ? '16px' : '14px',
                        height: isCompleted ? '16px' : '14px',
                        borderRadius: '50%',
                        background: isCompleted ? dotColor : '#0F1E52',
                        border: `2px solid ${dotBorder}`,
                      }}
                      aria-hidden="true"
                    />
                  )}
                </div>

                {/* Linea connettore verticale (non sull'ultimo step) */}
                {!isLast && (
                  <div
                    style={{
                      width: '2px',
                      flex: 1,
                      minHeight: '28px',
                      background: lineColor,
                      marginTop: '4px',
                      marginBottom: '4px',
                    }}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Colonna destra: label + data */}
              <div
                style={{
                  paddingBottom: isLast ? '0' : '24px',
                  paddingTop: '0',
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: isCurrent ? 700 : isCompleted ? 500 : 400,
                    color: isAnnullato
                      ? '#868E96'
                      : isCurrent
                      ? isInRitardo
                        ? '#FA5252'
                        : '#F0F4FF'
                      : isCompleted
                      ? '#2ECC9A'
                      : '#8899CC',
                    lineHeight: '20px',
                  }}
                >
                  {step.label}
                  {isCurrent && isInRitardo && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#FA5252',
                        background: '#3A1A1A',
                        padding: '2px 7px',
                        borderRadius: 100,
                        letterSpacing: '0.04em',
                      }}
                    >
                      IN RITARDO
                    </span>
                  )}
                </span>

                <AnimatePresence>
                  {dateLabel && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={t('fast')}
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        color: '#8899CC',
                        flexShrink: 0,
                        marginLeft: '8px',
                        lineHeight: '20px',
                      }}
                    >
                      {dateLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </li>
          )
        })}
      </ol>

      {/* Stato annullato: banner in fondo */}
      {isAnnullato && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: '#2A1A1A',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#868E96',
          }}
          role="status"
        >
          Lavoro annullato
        </div>
      )}
    </div>
  )
}
