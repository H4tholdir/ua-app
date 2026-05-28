'use client'

// Colori semantici rainbow v2.3 — gerarchia visiva
// red=urgente/bloccante, amber=ritardo/warning, blue=in-corso, green=positivo, grey=neutro
type KpiColor = 'red' | 'amber' | 'gold' | 'green' | 'blue' | 'grey'

const COLOR_MAP: Record<KpiColor, string> = {
  red:   'var(--c-red, #EF4444)',
  amber: 'var(--c-amber, #F59E0B)',
  gold:  'var(--c-green, #22C55E)',   // da fatturare = entrate → verde
  green: 'var(--c-green, #22C55E)',
  blue:  'var(--c-blue, #3B82F6)',
  grey:  'var(--t2, #4A3D33)',
}

const DS = {
  sfc:  'var(--sfc, #E4DFD9)',
  prs:  'var(--prs, #D4CFC9)',
  t2:   'var(--t2, #4A3D33)',
  t3:   'var(--t3, #6B5C51)',
  shB: `inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)`,
  shI: `inset 4px 4px 9px rgba(148,128,118,.32), inset -3px -3px 7px rgba(255,255,255,.66)`,
} as const

export interface KpiCardProps {
  valore: number
  label: string
  hint: string        // "tocca per filtrare" / "filtro attivo — tocca per rimuovere"
  colore: KpiColor
  isActive?: boolean
  onToggle?: () => void
}

export function KpiCard({ valore, label, hint, colore, isActive = false, onToggle }: KpiCardProps) {
  const isZero = valore === 0
  const numColor = isZero ? DS.t3 : COLOR_MAP[colore]

  const cardStyle: React.CSSProperties = {
    background: isActive ? DS.prs : DS.sfc,
    borderRadius: '16px',
    padding: '12px 13px',
    boxShadow: isActive ? DS.shI : DS.shB,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    transition: 'transform .12s cubic-bezier(.2,0,0,1), box-shadow .12s cubic-bezier(.2,0,0,1), background .12s',
    cursor: isZero ? 'default' : 'pointer',
    textDecoration: 'none',
    border: 'none',
    textAlign: 'left',
    width: '100%',
    transform: isActive ? 'scale(.97) translateY(1px)' : 'none',
  }

  const inner = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <span
          data-testid="kpi-valore"
          aria-hidden="true"
          style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '38px',
            fontWeight: 300,
            lineHeight: 1,
            color: numColor,
          }}
        >
          {valore}
        </span>
        {/* Dot indicator quando filtro attivo */}
        {isActive && (
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--primary, #D90012)',
            marginTop: '6px', flexShrink: 0,
          }} />
        )}
      </div>
      <span style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: '11px',
        fontWeight: 600,
        color: DS.t2,
        marginTop: '2px',
        lineHeight: 1.3,
      }}>
        {label}
      </span>
      {!isZero && (
        <span style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '9px',
          color: isActive ? 'var(--primary, #D90012)' : DS.t3,
          marginTop: '2px',
          fontWeight: isActive ? 600 : 400,
        }}>
          {isActive ? 'filtro attivo — tocca per rimuovere' : hint}
        </span>
      )}
    </>
  )

  if (isZero) {
    return (
      <div style={cardStyle} aria-label={`${valore} ${label}`}>
        {inner}
      </div>
    )
  }

  return (
    <button
      style={cardStyle}
      aria-label={`${valore} ${label}${isActive ? ' — filtro attivo' : ''}`}
      aria-pressed={isActive}
      onClick={onToggle}
    >
      {inner}
    </button>
  )
}
