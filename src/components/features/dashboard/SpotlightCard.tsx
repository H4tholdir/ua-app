'use client'

import Link from 'next/link'
import { t, useReducedMotion } from '@/design-system/motion'
import { motion } from 'motion/react'

const DS = {
  sfc:     'var(--sfc, #E4DFD9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
  primary: 'var(--primary, #D90012)',
  shC: `inset 0 1px 0 rgba(255,255,255,.88), inset 0 -1px 2px rgba(0,0,0,.04),
        -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40),
        3px 5px 10px -2px rgba(148,128,118,.22)`,
  shRed: `inset 0 1px 0 rgba(255,255,255,.25), inset 0 -2px 3px rgba(0,0,0,.22),
          0 6px 18px -2px rgba(180,0,0,.40), 0 2px 6px rgba(180,0,0,.26)`,
} as const

export interface SpotlightCardProps {
  lavoro_id: string
  numero_lavoro: string
  cliente_display: string
  descrizione_problema: string
  data_consegna_prevista?: string | null
  ora_consegna?: string | null
  tipo: 'blocco' | 'ritardo' | 'urgente'
  timestamp_segnalazione: string | null
}

function formatRelativeTime(isoStr: string | null): string {
  if (!isoStr) return ''
  const diffMs = Date.now() - new Date(isoStr).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'adesso'
  if (diffMin < 60) return `${diffMin} min fa`
  return `${Math.floor(diffMin / 60)}h fa`
}

function formatOra(isoDate: string, ora: string | null): string {
  if (ora) return `oggi ore ${ora}`
  const d = new Date(isoDate + 'T00:00:00')
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - oggi.getTime()) / 86_400_000)
  if (diff === 0) return 'consegna oggi'
  if (diff === 1) return 'consegna domani'
  return `consegna ${d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })}`
}

export function SpotlightCard({
  lavoro_id,
  numero_lavoro,
  cliente_display,
  descrizione_problema,
  data_consegna_prevista,
  ora_consegna,
  tipo,
  timestamp_segnalazione,
}: SpotlightCardProps) {
  const reduced = useReducedMotion()
  if (!tipo) return null

  const eyebrowLabel =
    tipo === 'blocco' ? 'Blocco attivo' :
    tipo === 'ritardo' ? 'In ritardo' :
    'Urgente'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduced ? t('instant') : t('normal', 'enter')}
      style={{
        margin: '0 14px 12px',
        background: DS.sfc,
        borderRadius: '20px',
        padding: '16px 18px',
        boxShadow: DS.shC,
      }}
    >
      <div style={{
        fontSize: '9.5px',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        color: DS.primary,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '5px',
        fontFamily: 'DM Sans, sans-serif',
      }}>
        <span
          aria-hidden="true"
          style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: DS.primary,
            animation: reduced ? 'none' : 'ua-pulse 2.5s infinite',
          }}
        />
        {eyebrowLabel}
      </div>

      <p style={{
        fontFamily: 'Playfair Display, Georgia, serif',
        fontSize: '17px',
        fontWeight: 400,
        color: DS.t1,
        letterSpacing: '-0.01em',
        lineHeight: 1.25,
        margin: '0 0 3px',
      }}>
        {descrizione_problema}
      </p>

      <p style={{
        fontSize: '11px',
        color: DS.t2,
        lineHeight: 1.4,
        margin: 0,
        fontFamily: 'DM Sans, sans-serif',
      }}>
        {cliente_display} · #{numero_lavoro}
        {data_consegna_prevista && <><br /><strong style={{ color: DS.primary }}>{formatOra(data_consegna_prevista, ora_consegna ?? null)}</strong></>}
      </p>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '12px',
      }}>
        <Link
          href={`/lavori/${lavoro_id}`}
          aria-label={`Risolvi blocco su lavoro ${numero_lavoro}`}
          style={{
            background: DS.primary,
            color: '#fff',
            borderRadius: '100px',
            padding: '8px 18px',
            fontSize: '12px',
            fontWeight: 700,
            fontFamily: 'DM Sans, sans-serif',
            textDecoration: 'none',
            boxShadow: DS.shRed,
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          Risolvi subito →
        </Link>
        {timestamp_segnalazione && (
          <span style={{ fontSize: '9px', color: DS.t3, fontFamily: 'DM Sans, sans-serif' }}>
            {formatRelativeTime(timestamp_segnalazione)}
          </span>
        )}
      </div>
    </motion.div>
  )
}
