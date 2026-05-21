'use client'

import { useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { t, staggerDelay, useReducedMotion } from '@/design-system/motion'
import { LavoroUrgente } from './LavoroUrgente'
import type { FrontDeskDashboard, FrontDeskConsegnaItem } from '@/types/domain'

// Design tokens — warm haptimorphic (DS v2.2)
const DS = {
  bg:      'var(--bg, #DDD8D3)',
  surface: 'var(--surface, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  prs:     'var(--prs, #D4CFC9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
  primary: '#D90012',
  shC: 'inset 0 1px 0 rgba(255,255,255,.88), inset 0 -1px 2px rgba(0,0,0,.04), -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40), 3px 5px 10px -2px rgba(148,128,118,.22)',
  shI: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
}

interface DashboardFrontDeskProps {
  data: FrontDeskDashboard
  nomeUtente: string
  labId: string
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

function ConsegnaButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: DS.primary,
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        padding: '10px 16px',
        borderRadius: 8,
        border: 'none',
        boxShadow: '0 4px 0 #A80010, 0 5px 6px rgba(0,0,0,.18)',
        cursor: 'pointer',
        transition: 'transform 80ms ease, box-shadow 80ms ease',
        WebkitTapHighlightColor: 'transparent',
        minHeight: 52,
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(3px)'
        e.currentTarget.style.boxShadow = '0 1px 0 #A80010, 0 2px 3px rgba(0,0,0,.15)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = '0 4px 0 #A80010, 0 5px 6px rgba(0,0,0,.18)'
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'translateY(3px)'
        e.currentTarget.style.boxShadow = '0 1px 0 #A80010, 0 2px 3px rgba(0,0,0,.15)'
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = ''
        e.currentTarget.style.boxShadow = '0 4px 0 #A80010, 0 5px 6px rgba(0,0,0,.18)'
      }}
    >
      CONSEGNA
    </button>
  )
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
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

export function DashboardFrontDesk({
  data,
  nomeUtente,
}: DashboardFrontDeskProps) {
  const reducedMotion = useReducedMotion()
  const [search, setSearch] = useState('')
  const [consegneOggi, setConsegneOggi] = useState<FrontDeskConsegnaItem[]>(
    data.consegne_oggi
  )
  const [, setLoading] = useState<string | null>(null)

  const stagger = staggerDelay(5)

  const handleConsegna = useCallback(
    async (id: string) => {
      setLoading(id)
      try {
        const res = await fetch(`/api/lavori/${id}/consegna`, { method: 'POST' })
        if (res.ok) {
          setConsegneOggi((prev) => prev.filter((l) => l.id !== id))
        }
      } catch {
        // Silently ignore — user can retry
      } finally {
        setLoading(null)
      }
    },
    []
  )

  // Client-side search filter (no extra query needed)
  const searchLower = search.toLowerCase()
  const consegneFiltrate = search
    ? consegneOggi.filter(
        (l) =>
          l.cliente_display.toLowerCase().includes(searchLower) ||
          l.numero_lavoro.includes(searchLower) ||
          (l.paziente_nome_snapshot ?? '').toLowerCase().includes(searchLower)
      )
    : consegneOggi

  const prontiNonOggi = data.ritiri_attesi_oggi

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
          Accettazione
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
      </div>

      {/* Search bar */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="search"
            placeholder="Cerca paziente o n° lavoro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cerca paziente o numero lavoro"
            style={{
              width: '100%',
              padding: '12px 16px',
              background: DS.prs,
              borderRadius: 12,
              border: 'none',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              color: DS.t1,
              boxShadow: DS.shI,
              outline: 'none',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          padding: '0 20px',
        }}
      >
        {/* Da consegnare oggi */}
        <Section delay={0} reducedMotion={reducedMotion}>
          <SectionLabel>
            Da consegnare oggi ({consegneFiltrate.length})
          </SectionLabel>
          {consegneFiltrate.length === 0 ? (
            <EmptyState
              message={
                search
                  ? 'Nessun lavoro trovato per questa ricerca'
                  : 'Nessuna consegna programmata per oggi'
              }
            />
          ) : (
            <div style={CARD_STYLE}>
              {consegneFiltrate.map((lavoro) => (
                <div
                  key={lavoro.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(0,0,0,.06)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 15,
                        fontWeight: 600,
                        color: DS.t1,
                        margin: '0 0 2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lavoro.cliente_display}
                    </p>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 12,
                        color: DS.t2,
                        margin: 0,
                      }}
                    >
                      #{lavoro.numero_lavoro}
                      {lavoro.paziente_nome_snapshot
                        ? ` · ${lavoro.paziente_nome_snapshot}`
                        : ` · ${lavoro.descrizione}`}
                      {lavoro.ora_consegna ? ` · ore ${lavoro.ora_consegna}` : ''}
                    </p>
                  </div>
                  <ConsegnaButton
                    onClick={() => handleConsegna(lavoro.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Ritiri attesi oggi */}
        {prontiNonOggi.length > 0 && (
          <Section delay={stagger} reducedMotion={reducedMotion}>
            <SectionLabel>Ritiri attesi oggi</SectionLabel>
            <div style={CARD_STYLE}>
              {prontiNonOggi.map((lavoro) => (
                <div key={lavoro.id} style={{ position: 'relative' }}>
                  <LavoroUrgente
                    id={lavoro.id}
                    numero_lavoro={lavoro.numero_lavoro}
                    stato={lavoro.stato}
                    cliente_display={lavoro.cliente_display}
                    descrizione={lavoro.descrizione}
                    data_consegna_prevista={lavoro.data_consegna_prevista}
                    ora_consegna={lavoro.ora_consegna}
                    paziente_nome_snapshot={lavoro.paziente_nome_snapshot}
                    is_urgente={false}
                  />
                  {/* Badge mattina/pomeriggio */}
                  {lavoro.ora_consegna && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 14,
                        right: 32,
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#B45309',
                        background: '#B4530920',
                        borderRadius: 6,
                        padding: '2px 8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {parseInt(lavoro.ora_consegna.split(':')[0], 10) < 13
                        ? 'Mattina'
                        : 'Pomeriggio'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* In prova — rientrano oggi */}
        {data.in_prova_rientro_oggi.length > 0 && (
          <Section delay={stagger * 2} reducedMotion={reducedMotion}>
            <SectionLabel>In prova — rientrano oggi</SectionLabel>
            <div style={CARD_STYLE}>
              {data.in_prova_rientro_oggi.map((lavoro) => (
                <LavoroUrgente
                  key={lavoro.id}
                  id={lavoro.id}
                  numero_lavoro={lavoro.numero_lavoro}
                  stato={lavoro.stato}
                  cliente_display={lavoro.cliente_display}
                  descrizione={lavoro.descrizione}
                  data_consegna_prevista={lavoro.data_consegna_prevista}
                  ora_consegna={lavoro.ora_consegna}
                  paziente_nome_snapshot={lavoro.paziente_nome_snapshot}
                  is_urgente={false}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Clienti da ricontattare */}
        {data.da_contattare.length > 0 && (
          <Section delay={stagger * 3} reducedMotion={reducedMotion}>
            <SectionLabel>Clienti da ricontattare</SectionLabel>
            <div style={CARD_STYLE}>
              {data.da_contattare.map((pag, i) => (
                <div
                  key={pag.cliente_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom:
                      i < data.da_contattare.length - 1
                        ? '1px solid rgba(0,0,0,.06)'
                        : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 15,
                        fontWeight: 600,
                        color: DS.t1,
                        margin: '0 0 2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pag.cliente_display}
                    </p>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 12,
                        color: DS.t2,
                        margin: 0,
                      }}
                    >
                      {pag.lavori_count}{' '}
                      {pag.lavori_count === 1 ? 'lavoro' : 'lavori'} ·{' '}
                      {pag.giorni_scaduto} gg
                    </p>
                  </div>
                  <span
                    suppressHydrationWarning
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 15,
                      fontWeight: 700,
                      color: '#D90012',
                      flexShrink: 0,
                    }}
                  >
                    {formatEuro(pag.residuo_totale)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}
