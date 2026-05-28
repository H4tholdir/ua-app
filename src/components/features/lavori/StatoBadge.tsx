import type { StatoLavoro } from '@/types/domain'

interface ColoreConfig {
  bg: string
  fg: string
  label: string
}

const COLORI: Record<StatoLavoro, ColoreConfig> = {
  ricevuto:          { bg: 'var(--elv, #EDEDEA)', fg: 'var(--t3, #6B5C51)', label: 'Ricevuto' },
  in_lavorazione:    { bg: 'rgba(59,130,246,.12)', fg: 'var(--c-blue, #3B82F6)', label: 'In lavorazione' },
  in_prova:          { bg: 'rgba(245,158,11,.12)', fg: 'var(--c-amber, #F59E0B)', label: 'In prova' },
  in_prova_esterna:  { bg: 'rgba(249,115,22,.12)', fg: 'var(--c-orange, #F97316)', label: 'In prova esterna' },
  pronto:            { bg: 'rgba(34,197,94,.12)', fg: 'var(--c-green, #22C55E)', label: 'Pronto' },
  consegnato:        { bg: 'rgba(34,197,94,.12)', fg: 'var(--c-green, #22C55E)', label: 'Consegnato' },
  annullato:         { bg: 'rgba(107,92,81,.10)', fg: 'var(--t3, #6B5C51)', label: 'Annullato' },
  sospeso:           { bg: 'rgba(245,158,11,.12)', fg: 'var(--c-amber, #F59E0B)', label: 'Sospeso' },
  in_ritardo:        { bg: 'rgba(239,68,68,.12)', fg: 'var(--c-red, #EF4444)', label: 'In ritardo' },
}

interface StatoBadgeProps {
  stato: StatoLavoro
}

export function StatoBadge({ stato }: StatoBadgeProps) {
  const { bg, fg, label } = COLORI[stato]

  return (
    <span
      aria-label={`Stato: ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 100,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'DM Sans, sans-serif',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: bg,
        color: fg,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
