import type { StatoLavoro } from '@/types/domain'

interface ColoreConfig {
  bg: string
  fg: string
  label: string
}

const COLORI: Record<StatoLavoro, ColoreConfig> = {
  ricevuto:       { bg: '#243580', fg: '#8899CC', label: 'Ricevuto' },
  in_lavorazione: { bg: '#1E3A5F', fg: '#74C0FC', label: 'In lavorazione' },
  in_prova:       { bg: '#2C2A4A', fg: '#CC5DE8', label: 'In prova' },
  pronto:         { bg: '#1A3A2A', fg: '#2ECC9A', label: 'Pronto' },
  consegnato:     { bg: '#1A2F1A', fg: '#51CF66', label: 'Consegnato' },
  annullato:      { bg: '#2A1A1A', fg: '#868E96', label: 'Annullato' },
  in_ritardo:     { bg: '#3A1A1A', fg: '#FA5252', label: 'In ritardo' },
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
