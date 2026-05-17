import type { StatoLavoro } from '@/types/domain'

interface ColoreConfig {
  bg: string
  fg: string
  label: string
}

const COLORI: Record<StatoLavoro, ColoreConfig> = {
  ricevuto:          { bg: 'var(--elv, #EDEDEA)', fg: 'var(--t2, #96918D)', label: 'Ricevuto' },
  in_lavorazione:    { bg: '#DBEAFE', fg: 'var(--info, #2563EB)', label: 'In lavorazione' },
  in_prova:          { bg: '#F3E8FF', fg: 'var(--purple, #7C3AED)', label: 'In prova' },
  in_prova_esterna:  { bg: '#FFF7ED', fg: 'var(--urgente, #F97316)', label: 'In prova esterna' },
  pronto:            { bg: '#DCFCE7', fg: 'var(--success, #16A34A)', label: 'Pronto' },
  consegnato:        { bg: '#F0FDF4', fg: '#15803D', label: 'Consegnato' },
  annullato:         { bg: 'var(--elv, #EDEDEA)', fg: 'var(--t2, #96918D)', label: 'Annullato' },
  sospeso:           { bg: 'var(--elv, #EDEDEA)', fg: 'var(--t2, #96918D)', label: 'Sospeso' },
  in_ritardo:        { bg: '#FEF2F2', fg: 'var(--primary, #D90012)', label: 'In ritardo' },
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
