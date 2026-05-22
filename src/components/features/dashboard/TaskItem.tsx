'use client'

import Link from 'next/link'

type FaseColor = 'gold' | 'green' | 'blue' | 'red' | 'grey'

const COLOR_MAP: Record<FaseColor, string> = {
  gold:  'var(--gold, #D4A843)',
  green: 'var(--success, #3DCB5C)',
  blue:  'var(--info, #5A5FCC)',
  red:   'var(--primary, #D90012)',
  grey:  'var(--t2, #96918D)',
}

const DS = {
  sfc:  'var(--sfc, #E4DFD9)',
  prs:  'var(--prs, #D4CFC9)',
  t1:   'var(--t1, #1C1916)',
  t2:   'var(--t2, #96918D)',
  t3:   'var(--t3, #B8B3AE)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
} as const

export interface TaskItemProps {
  rank: number
  id: string
  numero_lavoro: string
  cliente_display: string
  stato_fase_attuale: string | null
  completamento_perc: number
  data_consegna_prevista: string
  ora_consegna: string | null
  colore_fase: FaseColor
}

export function TaskItem({
  rank,
  id,
  numero_lavoro,
  cliente_display,
  stato_fase_attuale,
  completamento_perc,
  data_consegna_prevista,
  ora_consegna,
  colore_fase,
}: TaskItemProps) {
  const displayTime = ora_consegna ?? (() => {
    const d = new Date(data_consegna_prevista + 'T00:00:00')
    const oggi = new Date(); oggi.setHours(0,0,0,0)
    const diff = Math.round((d.getTime() - oggi.getTime()) / 86_400_000)
    if (diff === 0) return 'oggi'
    if (diff === 1) return 'dom'
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  })()

  // numero_lavoro used in aria-label for accessibility
  void numero_lavoro

  return (
    <Link
      href={`/lavori/${id}`}
      aria-label={`Lavoro ${numero_lavoro} — ${cliente_display} — ${completamento_perc}% completato`}
      style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        background: DS.sfc,
        borderRadius: '13px',
        padding: '10px 12px',
        boxShadow: DS.shB,
        textDecoration: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform .12s cubic-bezier(.2,0,0,1)',
      }}
    >
      <span style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: '13px',
        fontWeight: 300,
        color: DS.t3,
        width: '16px',
        textAlign: 'center',
        flexShrink: 0,
      }}>
        {rank}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          color: DS.t1,
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}>
          {cliente_display}
        </p>
        {stato_fase_attuale && (
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px',
            color: DS.t2,
            margin: '2px 0 0',
          }}>
            {stato_fase_attuale}
          </p>
        )}
        <div
          style={{
            height: '3px',
            background: DS.prs,
            borderRadius: '2px',
            marginTop: '5px',
            overflow: 'hidden',
          }}
        >
          <div
            role="progressbar"
            aria-valuenow={completamento_perc}
            aria-valuemin={0}
            aria-valuemax={100}
            style={{
              height: '100%',
              width: `${completamento_perc}%`,
              borderRadius: '2px',
              background: COLOR_MAP[colore_fase],
              transition: 'width .4s cubic-bezier(.2,0,0,1)',
            }}
          />
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 700,
          color: DS.t1,
          margin: 0,
          lineHeight: 1.2,
        }}>
          {displayTime}
        </p>
      </div>
    </Link>
  )
}
