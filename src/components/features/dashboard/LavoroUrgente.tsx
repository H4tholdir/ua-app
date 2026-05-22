'use client'

import Link from 'next/link'
import type { StatoLavoro, PrioritaLavoro } from '@/types/domain'

// Complete map — all 9 StatoLavoro values covered
const STATO_COLORS: Record<StatoLavoro, string> = {
  ricevuto:          'var(--t3, #B8B3AE)',
  in_lavorazione:    'var(--info, #2563EB)',
  in_prova:          'var(--warning, #B45309)',
  in_prova_esterna:  'var(--urgente, #F97316)',
  pronto:            'var(--success, #16A34A)',
  consegnato:        'var(--t3, #B8B3AE)',
  annullato:         'var(--t3, #B8B3AE)',
  sospeso:           'var(--t2, #96918D)',
  in_ritardo:        'var(--primary, #D90012)',
}

interface LavoroUrgenteProps {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita?: PrioritaLavoro
  cliente_display: string
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  is_urgente?: boolean
  /** Mostra badge pronto/in lavorazione — usato nella sezione "Da consegnare oggi" */
  showStatoBadge?: boolean
}

function formatData(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function LavoroUrgente({
  id,
  numero_lavoro,
  stato,
  priorita,
  cliente_display,
  descrizione,
  data_consegna_prevista,
  ora_consegna,
  paziente_nome_snapshot,
  is_urgente,
  showStatoBadge,
}: LavoroUrgenteProps) {
  const statoColor = STATO_COLORS[stato] ?? 'var(--t3, #B8B3AE)'

  const urgencyLabel =
    stato === 'in_ritardo'
      ? 'In ritardo'
      : priorita === 'extra_urgente'
        ? 'Extra urgente'
        : priorita === 'urgente'
          ? 'Urgente'
          : null

  const showBadge = is_urgente && urgencyLabel !== null

  return (
    <Link
      href={`/lavori/${id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px',
        textDecoration: 'none',
        color: 'inherit',
        borderBottom: '1px solid rgba(0,0,0,.06)',
      }}
    >
      {/* Badge circolare stato */}
      <div
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: statoColor,
          flexShrink: 0,
        }}
      />

      {/* Contenuto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: 3,
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--t1, #1C1916)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {cliente_display}
          </span>
          {showBadge && (
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 10,
                fontWeight: 700,
                color: statoColor,
                background: `${statoColor}20`,
                borderRadius: 6,
                padding: '2px 8px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}
            >
              {urgencyLabel}
            </span>
          )}
          {showStatoBadge && !showBadge && (
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '100px',
                flexShrink: 0,
                background: stato === 'pronto'
                  ? 'rgba(22,163,74,.12)'
                  : 'rgba(37,99,235,.12)',
                color: stato === 'pronto'
                  ? 'var(--success, #16A34A)'
                  : 'var(--info, #2563EB)',
              }}
            >
              {stato === 'pronto' ? '✓ Pronto' : '⚙ In lavorazione'}
            </span>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--t2, #96918D)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            #{numero_lavoro}
            {paziente_nome_snapshot
              ? ` · ${paziente_nome_snapshot}`
              : ` · ${descrizione}`}
          </span>
          <time
            dateTime={data_consegna_prevista}
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: stato === 'in_ritardo' ? 'var(--primary, #D90012)' : 'var(--t2, #96918D)',
              flexShrink: 0,
            }}
          >
            {ora_consegna ? `ore ${ora_consegna}` : formatData(data_consegna_prevista)}
          </time>
        </div>
      </div>

      {/* Chevron */}
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        style={{ flexShrink: 0, color: 'var(--t3, #B8B3AE)' }}
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
}
