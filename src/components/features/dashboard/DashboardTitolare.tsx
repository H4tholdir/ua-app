'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { t, staggerDelay, useReducedMotion } from '@/design-system/motion'
import { KpiCard } from './KpiCard'
import { LavoroUrgente } from './LavoroUrgente'
import { SpotlightCard } from './SpotlightCard'
import type {
  DashboardStatsExtended,
  FrontDeskConsegnaItem,
  StatoLavoro,
  PrioritaLavoro,
  TipoDispositivo,
} from '@/types/domain'

// Design tokens — warm haptimorphic (DS v2.2)
const DS = {
  bg:      'var(--bg, #DDD8D3)',
  surface: 'var(--surface, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  prs:     'var(--prs, #D4CFC9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #96918D)',
  t3:      'var(--t3, #B8B3AE)',
  primary: 'var(--primary, #D90012)',
  success: 'var(--success, #16A34A)',
  urgente: 'var(--urgente, #F97316)',
  warning: 'var(--warning, #B45309)',
  info:    'var(--info, #2563EB)',
  shC: 'inset 0 1px 0 rgba(255,255,255,.88), inset 0 -1px 2px rgba(0,0,0,.04), -5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40), 3px 5px 10px -2px rgba(148,128,118,.22)',
  shB: 'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
  shI: 'inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70)',
}

// ─── Types ──────────────────────────────────────────────────────────────────

type LavoroRitardoItem = {
  id: string
  numero_lavoro: string
  stato: StatoLavoro
  priorita: PrioritaLavoro
  tipo_dispositivo: TipoDispositivo
  descrizione: string
  data_consegna_prevista: string
  ora_consegna: string | null
  paziente_nome_snapshot: string | null
  cliente_display: string
}

type InProvaItem = {
  id: string
  numero_lavoro: string
  descrizione: string
  data_prima_prova: string | null
  clienti: { nome: string; cognome: string; studio_nome: string | null } | null
}

type MaterialeItem = {
  id: string
  nome: string
  scorta_attuale: number
  scorta_minima: number
  um_acquisto: string
}

type PagamentoTop = {
  cliente_id: string
  cliente_display: string
  residuo: number
}

export type SegnalazioneAlert = {
  id: string
  numero_lavoro: string
  segnalazione_tipo: string
  segnalazione_nota: string | null
  segnalazione_at: string
  segnalazione_by_utente: { nome: string | null; cognome: string | null } | null
  clienti: { studio_nome: string | null; nome: string; cognome: string } | null
}

const TIPI_LABEL = {
  impronta_non_idonea:    'Impronta non idonea',
  colore_mancante:        'Colore non specificato',
  istruzione_poco_chiara: 'Istruzione poco chiara',
  materiale_esaurito:     'Materiale esaurito',
  altro:                  'Altro',
} as const

export interface DashboardTitolareProps {
  stats: DashboardStatsExtended
  consegneOggi: FrontDeskConsegnaItem[]
  lavoriInRitardo: LavoroRitardoItem[]
  inProvaRientro: InProvaItem[]
  materialiEsaurimento: MaterialeItem[]
  pagamentiTop: PagamentoTop[]
  nomeUtente: string
  labName?: string
  aggiornatoAt?: string | null
  onboardingPending?: boolean
  segnalazioni?: SegnalazioneAlert[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const ora = new Date().getHours()
  if (ora >= 6 && ora < 12) return 'Buongiorno'
  if (ora >= 12 && ora < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n)
}

function deltaFatturato(
  corrente: number,
  precedente: number
): { perc: number; up: boolean } {
  if (precedente === 0) return { perc: 0, up: corrente >= 0 }
  const diff = corrente - precedente
  return { perc: Math.abs(Math.round((diff / precedente) * 100)), up: diff >= 0 }
}

function syncLabel(aggiornatoAt: string | null | undefined): string {
  if (!aggiornatoAt) return ''
  const diffMs = Date.now() - new Date(aggiornatoAt).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Aggiornato ora'
  if (diffMin === 1) return 'Aggiornato 1 min fa'
  return `Aggiornato ${diffMin} min fa`
}

function clienteDisplay(c: {
  nome: string
  cognome: string
  studio_nome: string | null
} | null): string {
  if (!c) return '—'
  return c.studio_nome ?? `${c.nome} ${c.cognome}`
}

function formatData(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

// ─── Sub-components ─────────────────────────────────────────────────────────

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

// ─── Main component ──────────────────────────────────────────────────────────

export function DashboardTitolare({
  stats,
  consegneOggi,
  lavoriInRitardo,
  inProvaRientro,
  materialiEsaurimento,
  pagamentiTop,
  nomeUtente,
  labName,
  aggiornatoAt,
  onboardingPending,
  segnalazioni = [],
}: DashboardTitolareProps) {
  const reducedMotion = useReducedMotion()
  const stagger = staggerDelay(7)
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    if (refreshing) return
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1200)
  }

  const { perc: deltaPerc, up: deltaUp } = deltaFatturato(
    stats.fatturato_mese,
    stats.fatturato_mese_precedente
  )

  return (
    <div
      style={{
        background: DS.bg,
        minHeight: '100dvh',
        padding: '0 0 100px',
      }}
    >
      {/* Banner onboarding */}
      {onboardingPending && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', margin: '0',
          background: 'rgba(217,0,18,.07)', gap: 12,
        }}>
          <span style={{ fontSize: '13px', color: 'var(--primary, #D90012)', fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
            ⚙️ Completa la configurazione del laboratorio
          </span>
          <a href="/onboarding" style={{
            fontSize: '12px', fontWeight: 700, color: 'var(--primary, #D90012)',
            textDecoration: 'none', padding: '4px 12px', borderRadius: '8px',
            background: 'rgba(217,0,18,.12)', fontFamily: 'DM Sans, sans-serif',
          }}>
            Inizia →
          </a>
        </div>
      )}

      {/* 1. Header */}
      <div style={{ padding: '24px 20px 12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <div>
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
              {labName ?? 'Il tuo laboratorio'}
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
              {getGreeting()}, {nomeUtente}
            </h1>
            <p
              suppressHydrationWarning
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12,
                color: DS.t2,
                margin: '4px 0 0',
              }}
            >
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 4 }}>
            {aggiornatoAt && (
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 10,
                  fontWeight: 600,
                  color: DS.t3,
                  background: DS.elv,
                  borderRadius: 99,
                  padding: '4px 10px',
                  boxShadow: DS.shB,
                  whiteSpace: 'nowrap',
                }}
              >
                {syncLabel(aggiornatoAt)}
              </span>
            )}
            <button
              onClick={handleRefresh}
              aria-label="Aggiorna dati dashboard"
              disabled={refreshing}
              style={{
                padding: '6px 10px',
                background: 'transparent',
                border: 'none',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                color: DS.t2,
                borderRadius: 8,
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              <motion.span
                style={{ display: 'inline-block' }}
                animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
                transition={refreshing
                  ? { duration: 0.8, repeat: Infinity, ease: 'linear' }
                  : { duration: 0.3 }
                }
              >
                ↻
              </motion.span>
            </button>
          </div>
        </div>
      </div>

      {/* SpotlightCard — prima segnalazione aperta */}
      {segnalazioni && segnalazioni.length > 0 && (() => {
        const s = segnalazioni[0]
        const tipo: 'blocco' | 'ritardo' | 'urgente' =
          s.segnalazione_tipo === 'impronta_non_idonea' || s.segnalazione_tipo === 'materiale_esaurito'
            ? 'blocco'
            : s.segnalazione_tipo === 'colore_mancante' || s.segnalazione_tipo === 'istruzione_poco_chiara'
            ? 'urgente'
            : 'ritardo'
        const cliente_display = s.clienti?.studio_nome ?? (s.clienti ? `${s.clienti.nome} ${s.clienti.cognome}` : '—')
        return (
          <SpotlightCard
            lavoro_id={s.id}
            numero_lavoro={s.numero_lavoro}
            cliente_display={cliente_display}
            descrizione_problema={s.segnalazione_nota ?? TIPI_LABEL[s.segnalazione_tipo as keyof typeof TIPI_LABEL] ?? s.segnalazione_tipo}
            ora_consegna={null}
            tipo={tipo}
            timestamp_segnalazione={s.segnalazione_at}
          />
        )
      })()}

      {/* 2. KPI Strip (scroll orizzontale) */}
      <Section delay={0} reducedMotion={reducedMotion}>
        <div
          role="list"
          aria-label="KPI operativi"
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            overflowX: 'auto',
            padding: '8px 20px 20px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {[
            ...(segnalazioni.length > 0 ? [{
              valore: segnalazioni.length,
              label: 'Problemi',
              azione: 'vedi →',
              colore: 'red' as const,
              href: '/lavori?filter=segnalazioni',
            }] : []),
            {
              valore: stats.lavori_in_ritardo,
              label: 'In ritardo',
              azione: 'vedi →',
              colore: 'red' as const,
              href: '/lavori?stato=in_ritardo',
            },
            {
              valore: stats.consegne_oggi,
              label: 'Oggi',
              azione: 'consegne →',
              colore: 'blue' as const,
              href: '/lavori?filter=consegne-oggi',
            },
            {
              valore: stats.in_prova_count,
              label: 'In prova',
              azione: 'vedi →',
              colore: 'gold' as const,
              href: '/lavori?stato=in_prova',
            },
            {
              valore: stats.pronti_non_fatturati,
              label: 'Da fatt.',
              azione: 'fattura →',
              colore: 'gold' as const,
              href: '/fatture?filter=da-fatturare',
            },
            {
              valore: stats.materiali_esaurimento_count,
              label: 'Materiali',
              azione: 'ordina →',
              colore: 'red' as const,
              href: '/ordini?filter=esaurimento',
            },
            {
              valore: stats.mdr_incompleti,
              label: 'DdC',
              azione: 'completa →',
              colore: 'grey' as const,
              href: '/lavori?filter=mdr-incompleti',
            },
            {
              valore: stats.stl_non_assegnati,
              label: 'Non ass.',
              azione: 'assegna →',
              colore: 'blue' as const,
              href: '/lavori?filter=stl-non-assegnati',
            },
          ].map((chip) => (
            <div key={chip.label} role="listitem">
              <KpiCard
                valore={chip.valore}
                label={chip.label}
                azione={chip.azione}
                colore={chip.colore}
                href={chip.href}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* KpiGrid 2×2 — vista Gestione */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        margin: '0 14px 12px',
      }}>
        <KpiCard
          valore={stats.consegne_oggi}
          label="Da consegnare"
          azione="oggi →"
          colore="blue"
          href="/lavori?filter=consegne-oggi"
        />
        <KpiCard
          valore={stats.lavori_in_ritardo}
          label="In ritardo"
          azione="vedi →"
          colore="red"
          href="/lavori?stato=in_ritardo"
        />
        <KpiCard
          valore={stats.pronti_non_fatturati}
          label="Da fatturare"
          azione="fattura →"
          colore="gold"
          href="/fatture?filter=da_fatturare"
        />
        <KpiCard
          valore={materialiEsaurimento.length}
          label="Materiali esauriti"
          azione="magazzino →"
          colore="grey"
          href="/magazzino?filter=esaurimento"
        />
      </div>

      {/* Urgenze lab — pagamenti scaduti top */}
      {pagamentiTop.length > 0 && (
        <div style={{ margin: '0 14px 12px' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--t3, #B8B3AE)', marginBottom: '8px', marginTop: 0 }}>
            Urgenze lab
          </p>
          <div style={{ background: 'var(--sfc, #E4DFD9)', borderRadius: '16px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)', overflow: 'hidden' }}>
            {pagamentiTop.slice(0, 3).map((p, i) => (
              <div key={p.cliente_id} style={{
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: i < Math.min(pagamentiTop.length, 3) - 1 ? '1px solid var(--border, rgba(0,0,0,.06))' : 'none',
              }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'var(--t1, #1C1916)', fontWeight: 500 }}>
                  {p.cliente_display}
                </span>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', color: 'var(--primary, #D90012)', fontWeight: 700 }}>
                  {formatEuro(p.residuo)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banner segnalazioni aperte — priorità massima, prima di tutto */}
      {segnalazioni.length > 0 && (
        <div style={{ margin: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {segnalazioni.slice(1).map((s) => {
            const tecnico = s.segnalazione_by_utente
            const tecnicoDisplay = tecnico
              ? `${tecnico.nome ?? ''} ${tecnico.cognome ?? ''}`.trim() || 'Un tecnico'
              : 'Un tecnico'
            const clienteDisp = s.clienti?.studio_nome ??
              (`${s.clienti?.nome ?? ''} ${s.clienti?.cognome ?? ''}`.trim() || '—')
            const tipoLabel = TIPI_LABEL[s.segnalazione_tipo as keyof typeof TIPI_LABEL] ?? s.segnalazione_tipo

            return (
              <Section key={s.id} delay={0} reducedMotion={reducedMotion}>
                <div style={{
                  background: 'rgba(217,0,18,.06)',
                  border: '1px solid rgba(217,0,18,.18)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{
                    width: 40, height: 40,
                    borderRadius: 12,
                    background: 'rgba(217,0,18,.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    ⚠
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: 'DM Sans', fontSize: 14, fontWeight: 700,
                      color: 'var(--primary, #D90012)', margin: 0,
                    }}>
                      {tecnicoDisplay} ha segnalato un problema
                    </p>
                    <p style={{
                      fontFamily: 'DM Sans', fontSize: 13,
                      color: 'var(--t1, #1C1916)', margin: '2px 0 0', lineHeight: 1.35,
                    }}>
                      {s.numero_lavoro} · {clienteDisp} · {tipoLabel}
                    </p>
                    {s.segnalazione_nota && (
                      <p style={{
                        fontFamily: 'DM Sans', fontSize: 12,
                        color: 'var(--t2, #96918D)', margin: '2px 0 0', fontStyle: 'italic',
                      }}>
                        &ldquo;{s.segnalazione_nota}&rdquo;
                      </p>
                    )}
                    <a
                      href={`/lavori/${s.id}`}
                      style={{
                        display: 'inline-block', marginTop: 8,
                        padding: '5px 10px', borderRadius: 8,
                        background: 'var(--primary, #D90012)',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        fontFamily: 'DM Sans', textDecoration: 'none',
                      }}
                    >
                      Vai al lavoro →
                    </a>
                  </div>
                </div>
              </Section>
            )
          })}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          padding: '0 20px',
        }}
      >
        {/* 3. Da consegnare oggi */}
        <Section delay={stagger} reducedMotion={reducedMotion}>
          <SectionLabel>
            Da consegnare oggi ({consegneOggi.length})
          </SectionLabel>
          {consegneOggi.length === 0 ? (
            <EmptyState message="Nessuna consegna programmata per oggi" />
          ) : (
            <>
              {/* Sub-header: contatori pronti / in lavorazione */}
              {(() => {
                const pronti = consegneOggi.filter((c) => c.stato === 'pronto').length
                const inLavorazione = consegneOggi.filter((c) => c.stato !== 'pronto').length
                return (
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: 'var(--t2, #96918D)', margin: '0 0 10px', padding: 0 }}>
                    {pronti > 0 && (
                      <span style={{ color: 'var(--success, #16A34A)', fontVariantNumeric: 'tabular-nums' }}>
                        ✓ {pronti} {pronti === 1 ? 'pronto' : 'pronti'}
                      </span>
                    )}
                    {pronti > 0 && inLavorazione > 0 && ' · '}
                    {inLavorazione > 0 && (
                      <span style={{ color: 'var(--info, #2563EB)', fontVariantNumeric: 'tabular-nums' }}>
                        ⚙ {inLavorazione} ancora in lavorazione
                      </span>
                    )}
                  </p>
                )
              })()}
              <div style={CARD_STYLE}>
                {consegneOggi.map((lavoro) => (
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
                    showStatoBadge
                  />
                ))}
              </div>
            </>
          )}
        </Section>

        {/* 4. In ritardo */}
        {lavoriInRitardo.length > 0 && (
          <Section delay={stagger * 2} reducedMotion={reducedMotion}>
            <SectionLabel>
              In ritardo ({lavoriInRitardo.length})
            </SectionLabel>
            <div style={CARD_STYLE}>
              {lavoriInRitardo.map((lavoro) => (
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
                  is_urgente
                />
              ))}
            </div>
          </Section>
        )}

        {/* 5. In prova — rientro atteso */}
        {inProvaRientro.length > 0 && (
          <Section delay={stagger * 3} reducedMotion={reducedMotion}>
            <SectionLabel>In prova — rientro atteso</SectionLabel>
            <div style={CARD_STYLE}>
              {inProvaRientro.map((item, i) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 16px',
                    borderBottom:
                      i < inProvaRientro.length - 1
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
                      {clienteDisplay(item.clienti)}
                    </p>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: 12,
                        color: DS.t2,
                        margin: 0,
                      }}
                    >
                      #{item.numero_lavoro} · {item.descrizione}
                    </p>
                  </div>
                  <time
                    dateTime={item.data_prima_prova ?? ''}
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12,
                      fontWeight: 500,
                      color: DS.warning,
                      flexShrink: 0,
                    }}
                  >
                    {formatData(item.data_prima_prova)}
                  </time>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 6. Pagamenti scaduti */}
        {(stats.pagamenti_scaduti_totale > 0 || pagamentiTop.length > 0) && (
          <Section delay={stagger * 4} reducedMotion={reducedMotion}>
            <SectionLabel>Pagamenti scaduti</SectionLabel>
            <div style={CARD_STYLE}>
              {/* Totale */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderBottom: '1px solid rgba(0,0,0,.06)',
                  background: `${DS.primary}08`,
                }}
              >
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    color: DS.t1,
                  }}
                >
                  Totale scaduto ({stats.pagamenti_scaduti_clienti_count} clienti)
                </span>
                <span
                  suppressHydrationWarning
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 17,
                    fontWeight: 800,
                    color: DS.primary,
                  }}
                >
                  {formatEuro(stats.pagamenti_scaduti_totale)}
                </span>
              </div>
              {/* Top 3 clienti */}
              {pagamentiTop.map((pag, i) => (
                <div
                  key={pag.cliente_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom:
                      i < pagamentiTop.length - 1
                        ? '1px solid rgba(0,0,0,.06)'
                        : 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      color: DS.t1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pag.cliente_display}
                  </span>
                  <span
                    suppressHydrationWarning
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      fontWeight: 700,
                      color: DS.primary,
                      flexShrink: 0,
                    }}
                  >
                    {formatEuro(pag.residuo)}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 7. Materiali in esaurimento */}
        {materialiEsaurimento.length > 0 && (
          <Section delay={stagger * 5} reducedMotion={reducedMotion}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  color: DS.t3,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}
              >
                Materiali in esaurimento
              </h2>
              <Link
                href="/ordini"
                aria-label="Vai agli ordini fornitori"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '28px',
                  padding: '0 12px',
                  borderRadius: '100px',
                  background: 'var(--primary, #D90012)',
                  color: '#fff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                Ordina →
              </Link>
            </div>
            <div style={CARD_STYLE}>
              {materialiEsaurimento.map((mat, i) => {
                const percRimasto =
                  mat.scorta_minima > 0
                    ? Math.min(100, Math.round((mat.scorta_attuale / mat.scorta_minima) * 100))
                    : 0
                return (
                  <div
                    key={mat.id}
                    style={{
                      padding: '14px 16px',
                      borderBottom:
                        i < materialiEsaurimento.length - 1
                          ? '1px solid rgba(0,0,0,.06)'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 14,
                          fontWeight: 600,
                          color: DS.t1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {mat.nome}
                      </span>
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 12,
                          fontWeight: 600,
                          color: DS.urgente,
                          flexShrink: 0,
                        }}
                      >
                        {mat.scorta_attuale}/{mat.scorta_minima} {mat.um_acquisto}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div
                      aria-label={`Scorta: ${percRimasto}% del minimo`}
                      role="progressbar"
                      aria-valuenow={percRimasto}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{
                        background: DS.prs,
                        borderRadius: 4,
                        height: 5,
                        boxShadow: DS.shI,
                      }}
                    >
                      <div
                        style={{
                          height: 5,
                          borderRadius: 4,
                          background:
                            percRimasto <= 50 ? DS.primary : DS.urgente,
                          width: '100%',
                          transform: `scaleX(${percRimasto / 100})`,
                          transformOrigin: 'left center',
                          transition: 'transform 0.4s cubic-bezier(0.2,0,0,1)',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}

        {/* 8. Fatturato */}
        <Section delay={stagger * 6} reducedMotion={reducedMotion}>
          <SectionLabel>Fatturato mensile</SectionLabel>
          <div style={CARD_STYLE}>
            <div style={{ padding: '20px 20px 16px' }}>
              {/* Fatturato mese corrente */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.t3,
                      margin: '0 0 4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Mese corrente
                  </p>
                  <p
                    suppressHydrationWarning
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 28,
                      fontWeight: 800,
                      color: DS.t1,
                      margin: 0,
                      letterSpacing: '-0.04em',
                      lineHeight: 1,
                    }}
                  >
                    {formatEuro(stats.fatturato_mese)}
                  </p>
                </div>
                {/* Delta % */}
                {stats.fatturato_mese_precedente > 0 && (
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 13,
                      fontWeight: 700,
                      color: deltaUp ? DS.success : DS.primary,
                      background: deltaUp ? `${DS.success}18` : `${DS.primary}18`,
                      borderRadius: 8,
                      padding: '4px 10px',
                      flexShrink: 0,
                    }}
                    aria-label={`${deltaUp ? '+' : '-'}${deltaPerc}% rispetto al mese scorso`}
                  >
                    {deltaUp ? '+' : '-'}
                    {deltaPerc}%
                  </span>
                )}
              </div>

              {/* Mese precedente */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0 0',
                  borderTop: '1px solid rgba(0,0,0,.06)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 12,
                    color: DS.t2,
                  }}
                >
                  Mese scorso
                </span>
                <span
                  suppressHydrationWarning
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14,
                    fontWeight: 600,
                    color: DS.t2,
                  }}
                >
                  {formatEuro(stats.fatturato_mese_precedente)}
                </span>
              </div>

              {/* Margine netto */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0 0',
                  borderTop: '1px solid rgba(0,0,0,.06)',
                }}
              >
                <div>
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12,
                      color: DS.t2,
                      display: 'block',
                    }}
                  >
                    Margine netto mese
                  </span>
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 11,
                      color: DS.t3,
                    }}
                  >
                    {stats.percentuale_margine}% del fatturato
                  </span>
                </div>
                <span
                  suppressHydrationWarning
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 16,
                    fontWeight: 700,
                    color: stats.percentuale_margine > 30
                      ? DS.success
                      : stats.percentuale_margine > 15
                        ? 'var(--gold, #D4A843)'
                        : DS.primary,
                  }}
                >
                  {formatEuro(stats.margine_netto)}
                </span>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
