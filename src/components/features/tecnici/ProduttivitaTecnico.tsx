'use client'

import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { t, staggerDelay, useReducedMotion, motionTokens } from '@/design-system/motion'
import type { ProduttivitaResponse } from '@/app/api/tecnici/[id]/produttivita/route'

// ─── Formatters ──────────────────────────────────────────────────────────────

function formatEur(v: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(v)
}

function formatData(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function meseLabelLong(mese: string): string {
  const MESI = [
    'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
    'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
  ]
  const [year, month] = mese.split('-').map(Number)
  return `${MESI[month - 1] ?? mese} ${year}`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string
  color?: string
  delay: number
  reduced: boolean
}

function KpiCard({ label, value, color, delay, reduced }: KpiCardProps) {
  return (
    <motion.div
      initial={reduced ? false : { scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reduced ? undefined : { ...motionTokens.spring.snappy, delay }}
      style={{
        flex: 1,
        background: 'var(--surface, #E4DFD9)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        minWidth: 0,
      }}
    >
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          color: 'var(--t2, #4A3D33)',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '22px',
          fontWeight: 700,
          color: color ?? 'var(--t1, #1C1916)',
          margin: 0,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
    </motion.div>
  )
}

// ─── Barre SVG 4 mesi ─────────────────────────────────────────────────────────

interface StoricoBarre4Props {
  storico: ProduttivitaResponse['storico_4_mesi']
  meseCorrente: string
}

function StoricoBarre4({ storico, meseCorrente }: StoricoBarre4Props) {
  const maxComp = Math.max(...storico.map((s) => s.compenso), 1)
  const BAR_H = 80
  const BAR_W = 48

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
      }}
    >
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: '0 0 12px',
        }}
      >
        Ultimi 4 mesi
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '12px',
          justifyContent: 'space-around',
        }}
      >
        {storico.map((s) => {
          const isCorrente = s.mese === meseCorrente
          const barH = maxComp > 0 ? Math.max(8, Math.round((s.compenso / maxComp) * BAR_H)) : 8
          return (
            <div
              key={s.mese}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                flex: 1,
              }}
            >
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '10px',
                  color: isCorrente ? 'var(--primary, #D90012)' : 'var(--t2, #4A3D33)',
                  fontWeight: isCorrente ? 700 : 400,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatEur(s.compenso).replace('€ ', '€')}
              </span>
              <svg
                width={BAR_W}
                height={BAR_H}
                viewBox={`0 0 ${BAR_W} ${BAR_H}`}
                aria-label={`${s.label}: ${formatEur(s.compenso)}`}
                role="img"
              >
                <rect
                  x={6}
                  y={BAR_H - barH}
                  width={BAR_W - 12}
                  height={barH}
                  rx={6}
                  fill={isCorrente ? '#D90012' : 'var(--prs, #D4CFC9)'}
                />
              </svg>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  fontWeight: isCorrente ? 700 : 400,
                  color: isCorrente ? 'var(--primary, #D90012)' : 'var(--t2, #4A3D33)',
                }}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Streak settimanale Lun–Ven ───────────────────────────────────────────────
// Su weekend mostra la settimana appena conclusa (Lun–Ven precedente)
// giorniConLavori: Set di date ISO con almeno un lavoro consegnato questa settimana

interface StreakSettimanaleProps {
  giorniConLavori: Set<string>
}

function StreakSettimanale({ giorniConLavori }: StreakSettimanaleProps) {
  // Calcola lunedì della settimana corrente (o ultima se weekend)
  const oggi = new Date()
  const dayOfWeek = oggi.getDay() // 0=dom, 1=lun...6=sab

  // Offset al lunedì: se domenica (0) → -6, se sabato (6) → -5, altrimenti → 1-day
  const offsetToMonday =
    dayOfWeek === 0 ? -6 :
    dayOfWeek === 6 ? -5 :
    1 - dayOfWeek

  const lunedi = new Date(oggi)
  lunedi.setDate(oggi.getDate() + offsetToMonday)

  const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven']
  const italianDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' })
  const todayIso = italianDate.format(oggi)

  const days = GIORNI.map((g, i) => {
    const d = new Date(lunedi)
    d.setDate(lunedi.getDate() + i)
    const iso = italianDate.format(d)
    const isOggi = iso === todayIso
    const isPast = iso < todayIso
    const hasWork = giorniConLavori.has(iso)
    return { g, iso, isOggi, isPast, hasWork }
  })

  return (
    <div>
      <p
        style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--t2, #4A3D33)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          margin: '0 0 8px',
        }}
      >
        Questa settimana
      </p>
      <div
        style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {days.map(({ g, iso, isOggi, isPast, hasWork }) => (
          <div
            key={iso}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              flex: 1,
            }}
          >
            <div
              aria-label={isOggi ? `Oggi — ${g}${hasWork ? ' — lavori consegnati' : ''}` : `${g}${hasWork ? ' — lavori consegnati' : ''}`}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isOggi
                  ? 'var(--primary, #D90012)'
                  : (isPast && hasWork)
                    ? 'hsl(159 63% 49% / 0.20)'
                    : 'var(--elv, #EDEDEA)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isOggi ? (
                <span style={{ fontSize: '16px' }} aria-hidden="true">★</span>
              ) : (isPast && hasWork) ? (
                <span style={{ fontSize: '14px' }} aria-hidden="true">✓</span>
              ) : null}
            </div>
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px',
                color: isOggi
                  ? 'var(--primary, #D90012)'
                  : (isPast && hasWork)
                    ? 'var(--success, #16A34A)'
                    : 'var(--t3, #6B5C51)',
                fontWeight: isOggi ? 700 : 400,
              }}
            >
              {g}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProduttivitaTecnicoProps {
  data: ProduttivitaResponse
  meseCorrente: string
  compensoBase?: number | null  // target mensile da tecnici.compenso_base
  giorniConLavori: string[]    // date ISO della settimana con lavori consegnati
}

export function ProduttivitaTecnico({
  data,
  meseCorrente,
  compensoBase,
  giorniConLavori,
}: ProduttivitaTecnicoProps) {
  const giorniSet = new Set(giorniConLavori)
  const reduced = useReducedMotion()
  const sd = staggerDelay(8)
  const mesesLabel = meseLabelLong(data.mese)

  // Puntualità color
  const pctColor =
    data.puntualita_pct >= 90
      ? 'var(--success, #16A34A)'
      : data.puntualita_pct >= 70
        ? '#D4A843'
        : 'var(--primary, #D90012)'

  // Progress bar vs target
  const targetPct =
    compensoBase && compensoBase > 0
      ? Math.min(100, Math.round((data.compenso_maturato / compensoBase) * 100))
      : null

  return (
    <>
      {/* ── Responsive layout styles ── */}
      <style>{`
        .prod-layout { padding: 0 20px 80px; }
        .prod-col-left { }
        .prod-col-right { }

        /* Tablet 768px: 2 colonne — KPI+storico a sinistra, lista a destra */
        @media (min-width: 768px) {
          .prod-layout {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 0 24px;
            padding: 0 24px 80px;
            align-items: start;
          }
          .prod-greeting { grid-column: 1 / -1; }
          .prod-col-left { }
          .prod-col-right { }
        }

        /* Desktop 1280px: 2 colonne affiancate con più respiro */
        @media (min-width: 1280px) {
          .prod-layout {
            grid-template-columns: 1fr 1fr;
            max-width: 1100px;
            margin: 0 auto;
          }
          .prod-greeting { grid-column: 1 / -1; }
        }
      `}</style>

    <div className="prod-layout">

      {/* ── Greeting (full width) ── */}
      <motion.div
        className="prod-greeting"
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? undefined : t('normal', 'enter')}
        style={{ marginBottom: '24px' }}
      >
        <h1
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--t1, #1C1916)',
            margin: '0 0 4px',
          }}
        >
          Ciao, {data.tecnico.nome}
        </h1>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: 'var(--t2, #4A3D33)',
            margin: 0,
          }}
        >
          {mesesLabel}
        </p>
      </motion.div>

      {/* ── Colonna sinistra: KPI + Compenso + Streak + Storico ── */}
      <div className="prod-col-left">

      {/* ── KPI Hero row ── */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <KpiCard
          label="Lavori completati"
          value={String(data.lavori_completati)}
          delay={0}
          reduced={reduced}
        />
        <KpiCard
          label="Puntualità"
          value={`${data.puntualita_pct}%`}
          color={pctColor}
          delay={sd}
          reduced={reduced}
        />
      </div>

      {/* ── Compenso card ── */}
      <motion.div
        initial={reduced ? false : { scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? undefined : { ...motionTokens.spring.snappy, delay: sd * 2 }}
        style={{
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
          marginBottom: '16px',
        }}
      >
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--t2, #4A3D33)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 4px',
          }}
        >
          Compenso {mesesLabel}
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '28px',
            fontWeight: 700,
            color: 'var(--success, #16A34A)',
            margin: '0 0 8px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatEur(data.compenso_maturato)}
        </p>

        {/* Progress bar vs target */}
        {compensoBase && compensoBase > 0 ? (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: 'var(--t2, #4A3D33)',
                }}
              >
                Target mensile: {formatEur(compensoBase)} · {targetPct}%
              </span>
            </div>
            <div
              style={{
                height: '6px',
                borderRadius: '3px',
                background: 'var(--elv, #EDEDEA)',
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={reduced ? false : { width: '0%' }}
                animate={{ width: `${targetPct ?? 0}%` }}
                transition={reduced ? undefined : t('normal', 'enter')}
                style={{
                  height: '100%',
                  borderRadius: '3px',
                  background:
                    (targetPct ?? 0) >= 100
                      ? 'var(--success, #16A34A)'
                      : 'var(--gold, #D4A843)',
                }}
              />
            </div>
          </div>
        ) : (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              color: 'var(--t3, #6B5C51)',
              margin: 0,
            }}
          >
            Target mensile non impostato
          </p>
        )}
      </motion.div>

      {/* ── Streak settimanale ── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? undefined : { ...t('normal', 'enter'), delay: sd * 3 }}
        style={{
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
          marginBottom: '16px',
        }}
      >
        <StreakSettimanale giorniConLavori={giorniSet} />
      </motion.div>

      {/* ── Storico 4 mesi ── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? undefined : { ...t('normal', 'enter'), delay: sd * 4 }}
        style={{
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
          marginBottom: '16px',
        }}
      >
        <StoricoBarre4
          storico={data.storico_4_mesi}
          meseCorrente={meseCorrente}
        />
      </motion.div>

      </div>{/* end prod-col-left */}

      {/* ── Colonna destra: Ultime lavorazioni + CTA ── */}
      <div className="prod-col-right">

      {/* ── Ultime lavorazioni ── */}
      <div style={{ marginBottom: '16px' }}>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--t2, #4A3D33)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            margin: '0 0 8px',
          }}
        >
          Ultime lavorazioni
        </p>

        {data.lavorazioni_dettaglio.length === 0 ? (
          <div
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '16px',
              padding: '24px 16px',
              textAlign: 'center',
              boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: 'var(--t2, #4A3D33)',
                margin: 0,
              }}
            >
              Nessuna lavorazione con compenso questo mese
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '16px',
              boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
              overflow: 'hidden',
            }}
          >
            <AnimatePresence initial={!reduced}>
              {data.lavorazioni_dettaglio.map((lav, i) => (
                <motion.div
                  key={`${lav.lavoro_id}-${i}`}
                  initial={reduced ? false : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={
                    reduced
                      ? undefined
                      : { ...motionTokens.spring.soft, delay: Math.min(i * sd, 0.25) }
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    borderTop: i > 0 ? '1px solid var(--elv, #EDEDEA)' : 'none',
                  }}
                >
                  <span aria-hidden="true" style={{ fontSize: '20px', flexShrink: 0 }}>
                    🦷
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--t1, #1C1916)',
                        margin: '0 0 2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {lav.nome_lavorazione}
                    </p>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        color: 'var(--t2, #4A3D33)',
                        margin: 0,
                      }}
                    >
                      {lav.numero_lavoro} · {formatData(lav.data_consegna)}
                    </p>
                  </div>
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--success, #16A34A)',
                      flexShrink: 0,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    +{formatEur(lav.compenso_totale)}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── CTA Scarica Cedolino ── */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduced ? undefined : { ...t('slow', 'enter'), delay: sd * 6 }}
      >
        <Link
          href={`/api/tecnici/${data.tecnico.id}/cedolino?mese=${data.mese}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            minHeight: '52px',
            borderRadius: '16px',
            background: 'var(--surface, #E4DFD9)',
            boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--t1, #1C1916)',
            textDecoration: 'none',
          }}
        >
          <span aria-hidden="true">📄</span>
          Scarica riepilogo {mesesLabel}
        </Link>
      </motion.div>

      </div>{/* end prod-col-right */}
    </div>{/* end prod-layout */}
    </>
  )
}
