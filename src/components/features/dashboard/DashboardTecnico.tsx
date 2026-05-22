'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { t, staggerDelay, useReducedMotion } from '@/design-system/motion'
import { LavoroUrgente } from './LavoroUrgente'
import { TaskItem } from './TaskItem'
import type { TecnicoDashboard } from '@/types/domain'
import type { TaskItemData } from '@/lib/dashboard/queries'

// Design tokens — warm haptimorphic (DS v2.2)
const DS = {
  bg:      'var(--bg, #DDD8D3)',
  surface: 'var(--surface, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
  info:    'var(--info, #2563EB)',
  primary: 'var(--primary, #D90012)',
  shC: 'inset 0 1px 0 rgba(255,255,255,.88), inset 0 -1px 2px rgba(0,0,0,.04), -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40), 3px 5px 10px -2px rgba(148,128,118,.22)',
  shI: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
}

export interface DashboardTecnicoProps {
  data: TecnicoDashboard
  lavoriOggi: TaskItemData[]
  nomeUtente: string
  tecnicoId?: string | null
}

const CARD_STYLE: React.CSSProperties = {
  background: DS.surface,
  borderRadius: 20,
  overflow: 'hidden',
  boxShadow: DS.shC,
  position: 'relative',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11,
        fontWeight: 600,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        margin: '0 0 8px',
      }}
    >
      {children}
    </h2>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        background: DS.surface,
        borderRadius: 20,
        padding: '24px 20px',
        textAlign: 'center',
        boxShadow: DS.shC,
      }}
    >
      <span style={{ fontSize: 20 }} aria-hidden="true">
        ✓
      </span>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 14,
          color: DS.t3,
          margin: '8px 0 0',
        }}
      >
        {message}
      </p>
    </div>
  )
}

function getDataOggi(): string {
  return new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function Section({
  children,
  delay,
  reducedMotion,
}: {
  children: React.ReactNode
  delay: number
  reducedMotion: boolean
}) {
  if (reducedMotion) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(10px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ ...t('normal', 'enter'), delay }}
    >
      {children}
    </motion.div>
  )
}

// Formatter valuta italiana
const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

export function DashboardTecnico({ data, lavoriOggi, nomeUtente, tecnicoId }: DashboardTecnicoProps) {
  const reducedMotion = useReducedMotion()
  const { lavori_urgenti, lavori_oggi, in_prova_rientro_oggi, compenso_oggi } = data

  const stagger = staggerDelay(4)

  return (
    <div
      style={{
        background: DS.bg,
        minHeight: '100dvh',
        padding: '0 0 100px',
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 20px 16px' }}>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            color: DS.t3,
            margin: '0 0 2px',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          I tuoi lavori
        </p>
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 22,
            fontWeight: 800,
            color: DS.t1,
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          Ciao, {nomeUtente}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 13,
            color: DS.t2,
            margin: '4px 0 0',
          }}
        >
          {getDataOggi()}
        </p>

        {/* Link produttività del tecnico stesso */}
        {tecnicoId && (
          <Link
            href={`/tecnici/${tecnicoId}/produttivita`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '12px',
              padding: '8px 14px',
              minHeight: '44px',
              borderRadius: '12px',
              background: DS.elv,
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              color: DS.t2,
              textDecoration: 'none',
              boxShadow: DS.shC,
            }}
          >
            <span aria-hidden="true">📊</span>
            La mia produttività
          </Link>
        )}
      </div>

      {/* Hero compenso oggi */}
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : { ...t('normal', 'enter'), delay: 0 }}
        style={{
          margin: '0 20px 16px',
          background: DS.surface,
          borderRadius: 20,
          padding: '16px',
          boxShadow: DS.shC,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            flexShrink: 0,
            background: 'rgba(22,163,74,.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          💰
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: DS.t2,
              margin: '0 0 3px',
            }}
          >
            Compenso oggi
          </p>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 28,
              fontWeight: 800,
              color: '#16A34A',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
            suppressHydrationWarning
          >
            {compenso_oggi > 0 ? `+ ${fmt.format(compenso_oggi)}` : '€ 0,00'}
          </p>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 12,
              color: DS.t2,
              margin: '3px 0 0',
            }}
            suppressHydrationWarning
          >
            {data.lavorazioni_conteggiate_oggi ?? 0} lavorazioni completate ·{' '}
            {new Date().toLocaleDateString('it-IT', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </motion.div>

      {/* KPI inline */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '0 20px 20px',
        }}
      >
        {[
          { value: lavori_urgenti.length, label: 'Urgenti', color: 'var(--primary, #D90012)' },
          { value: lavori_oggi.length, label: 'Oggi', color: 'var(--info, #2563EB)' },
          { value: null, label: 'Puntualità %', color: 'var(--t3, #B8B3AE)' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: DS.elv,
              borderRadius: 16,
              padding: '14px 16px',
              flex: 1,
              boxShadow: DS.shC,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1,
                color: kpi.color,
              }}
              aria-label={`${kpi.label}: ${kpi.value ?? '—'}`}
            >
              {kpi.value ?? '—'}
            </span>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 10,
                fontWeight: 600,
                color: DS.t2,
                marginTop: 5,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textAlign: 'center',
              }}
            >
              {kpi.label}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          padding: '0 20px',
        }}
      >
        {/* Urgenti / in ritardo */}
        {lavori_urgenti.length > 0 && (
          <Section delay={0} reducedMotion={reducedMotion}>
            <SectionLabel>Urgenti / in ritardo</SectionLabel>
            <div style={CARD_STYLE}>
              {lavori_urgenti.map((lavoro) => (
                <LavoroUrgente
                  key={lavoro.id}
                  id={lavoro.id}
                  numero_lavoro={lavoro.numero_lavoro}
                  stato={lavoro.stato}
                  priorita={lavoro.priorita}
                  cliente_display={lavoro.cliente_display}
                  descrizione={lavoro.descrizione}
                  data_consegna_prevista={lavoro.data_consegna_prevista}
                  ora_consegna={lavoro.ora_consegna}
                  paziente_nome_snapshot={lavoro.paziente_nome_snapshot}
                  is_urgente={lavoro.is_urgente}
                />
              ))}
            </div>
          </Section>
        )}

        {/* I miei lavori — lista con TaskItem e progress reale */}
        <Section delay={stagger} reducedMotion={reducedMotion}>
          <SectionLabel>I miei lavori oggi</SectionLabel>
          <div style={{ padding: '0 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lavoriOggi.length === 0 ? (
              <EmptyState message="Nessun lavoro assegnato per oggi" />
            ) : (
              lavoriOggi.map((l, i) => (
                <TaskItem
                  key={l.id}
                  rank={i + 1}
                  id={l.id}
                  numero_lavoro={l.numero_lavoro}
                  cliente_display={l.cliente_display}
                  stato_fase_attuale={l.stato}
                  completamento_perc={l.completamento_perc}
                  data_consegna_prevista={l.data_consegna_prevista}
                  ora_consegna={l.ora_consegna}
                  colore_fase={
                    l.priorita === 'urgente' ? 'red' :
                    l.completamento_perc >= 80 ? 'green' :
                    l.completamento_perc >= 40 ? 'gold' :
                    'grey'
                  }
                />
              ))
            )}
          </div>
        </Section>

        {/* In prova — rientrano oggi */}
        {in_prova_rientro_oggi.length > 0 && (
          <Section delay={stagger * 2} reducedMotion={reducedMotion}>
            <SectionLabel>In prova — rientrano oggi</SectionLabel>
            <div style={CARD_STYLE}>
              {in_prova_rientro_oggi.map((lavoro) => (
                <LavoroUrgente
                  key={lavoro.id}
                  id={lavoro.id}
                  numero_lavoro={lavoro.numero_lavoro}
                  stato={lavoro.stato}
                  priorita={lavoro.priorita}
                  cliente_display={lavoro.cliente_display}
                  descrizione={lavoro.descrizione}
                  data_consegna_prevista={lavoro.data_consegna_prevista}
                  ora_consegna={lavoro.ora_consegna}
                  paziente_nome_snapshot={lavoro.paziente_nome_snapshot}
                  is_urgente={lavoro.is_urgente}
                />
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
