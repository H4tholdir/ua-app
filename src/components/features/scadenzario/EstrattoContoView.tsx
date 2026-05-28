'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { t, motionTokens, staggerDelay, useReducedMotion } from '@/design-system/motion'
import { hapticSuccess } from '@/lib/feedback/haptic'
import { soundPaymentSuccess } from '@/lib/feedback/sounds'
import { buildWhatsappSollecito, buildWhatsappUrl } from '@/lib/consegna/whatsapp-template'
import type { EstrattoContoResponse, FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'

// ─── Design tokens ────────────────────────────────────────────────────────────

const DS = {
  bg:      'var(--bg, #DDD8D3)',
  sfc:     'var(--sfc, #E4DFD9)',
  elv:     'var(--elv, #EDEDEA)',
  prs:     'var(--prs, #D4CFC9)',
  t1:      'var(--t1, #1C1916)',
  t2:      'var(--t2, #4A3D33)',
  t3:      'var(--t3, #6B5C51)',
  red:     'var(--primary, #D90012)',
  gold:    'var(--c-amber, #F59E0B)',
  green:   'var(--success, #16A34A)',
  shB:     'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
  shI:     'inset 3px 3px 8px rgba(0,0,0,.10), inset -2px -2px 5px rgba(255,255,255,.70)',
} as const

// ─── Formatter ────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })

function formatData(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Urgency helpers ─────────────────────────────────────────────────────────
// Coerente con ScadenzarioList.tsx: rosso per > 60, oro per >= 30, t2 per < 30 non pagate

function urgencyColor(f: FatturaEstratto): string {
  if (f.pagata) return DS.green
  if (f.giorni_ritardo > 60) return DS.red
  if (f.giorni_ritardo >= 30) return DS.gold
  return DS.t2
}

function urgencyEmoji(f: FatturaEstratto): string {
  if (f.pagata) return '✅'
  if (f.giorni_ritardo > 60) return '⏰'
  if (f.giorni_ritardo >= 30) return '⏳'
  return '🧾'
}

function urgencyLabel(f: FatturaEstratto): string {
  if (f.pagata) return 'Pagata'
  if (f.giorni_ritardo > 60) return 'Urgente'
  if (f.giorni_ritardo >= 30) return 'In ritardo'
  return 'In sospeso'
}

function urgencyPillBg(f: FatturaEstratto): string {
  const c = urgencyColor(f)
  return `${c}22`
}

function urgencyPillBorder(f: FatturaEstratto): string {
  const c = urgencyColor(f)
  return `1px solid ${c}44`
}

// ─── Stato SDI label ─────────────────────────────────────────────────────────

const STATO_SDI_LABEL: Record<string, string> = {
  draft:          'Bozza',
  generata:       'XML Pronto',
  smtp_inviata:   'Inviata',
  pec_consegnata: 'Consegnata',
  ricevuta_sdi:   'Ricevuta SDI',
  accettata:      'Accettata',
  rifiutata:      'Rifiutata',
  scaduta:        'Scaduta',
}

function labelStatoSDI(stato: string): string {
  return STATO_SDI_LABEL[stato] ?? stato
}

// ─── FatturaBottomSheet ───────────────────────────────────────────────────────

interface BottomSheetProps {
  fattura: FatturaEstratto | null
  telefono: string | null
  studioNome: string
  onClose: () => void
  onPagata: (id: string) => void
}

function FatturaBottomSheet({ fattura, telefono, studioNome, onClose, onPagata }: BottomSheetProps) {
  const reducedMotion = useReducedMotion()
  const [loading, setLoading] = useState(false)

  const handleSegnaComePagata = useCallback(async () => {
    if (!fattura || fattura.pagata || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/fatture/${fattura.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagata: true }),
      })
      if (res.ok) {
        hapticSuccess()
        soundPaymentSuccess()
        onPagata(fattura.id)
        onClose()
      }
    } catch {
      // silent — utente può riprovare
    } finally {
      setLoading(false)
    }
  }, [fattura, loading, onPagata, onClose])

  const color = fattura ? urgencyColor(fattura) : DS.t2

  const whatsappMsg = fattura
    ? buildWhatsappSollecito({
        studioNome,
        totaleInsoluto: fattura.totale,
      })
    : ''
  const whatsappUrl = (fattura && telefono)
    ? buildWhatsappUrl(whatsappMsg, telefono)
    : ''

  return (
    <AnimatePresence>
      {fattura && (
        <>
          {/* Overlay */}
          <motion.div
            key="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : t('fast', 'exit')}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 70,
              background: 'rgba(0,0,0,.32)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />

          {/* Sheet */}
          <motion.div
            key="sheet-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={reducedMotion ? { duration: 0 } : motionTokens.spring.soft}
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 71,
              background: DS.sfc,
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,.18)',
              paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
              maxHeight: '80dvh',
              overflowY: 'auto',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`Dettaglio fattura ${fattura.numero}`}
          >
            {/* Handle */}
            <div style={{
              width: 36, height: 4,
              background: DS.t3,
              borderRadius: 99,
              margin: '12px auto 20px',
            }} />

            {/* Header: numero + badge urgenza */}
            <div style={{ padding: '0 20px 16px', borderBottom: `1px solid rgba(0,0,0,.06)` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <h2 style={{
                  margin: 0,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: DS.t1,
                  letterSpacing: '-0.02em',
                }}>
                  Fattura {fattura.numero}
                </h2>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 700,
                  color: color,
                  background: urgencyPillBg(fattura),
                  border: urgencyPillBorder(fattura),
                  borderRadius: 8,
                  padding: '3px 8px',
                  flexShrink: 0,
                }}>
                  {urgencyEmoji(fattura)} {urgencyLabel(fattura)}
                </span>
              </div>
            </div>

            {/* KPI mini — 3 in riga */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
              padding: '16px 20px',
            }}>
              <KpiMini
                label="Importo"
                value={fmt.format(fattura.totale)}
                color={color}
              />
              <KpiMini
                label="Data emissione"
                value={formatData(fattura.data)}
                color={DS.t1}
              />
              <KpiMini
                label="Stato SDI"
                value={labelStatoSDI(fattura.stato_sdi)}
                color={DS.t2}
              />
            </div>

            {/* Azioni */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* WhatsApp sollecito */}
              {telefono && !fattura.pagata && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 52,
                    padding: '12px 20px',
                    background: '#25D366',
                    color: '#fff',
                    borderRadius: 100,
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: 15,
                    textDecoration: 'none',
                    boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                  }}
                >
                  <WhatsAppIcon />
                  Invia sollecito WhatsApp
                </a>
              )}

              {/* Segna come pagata */}
              {!fattura.pagata && (
                <button
                  type="button"
                  onClick={handleSegnaComePagata}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    minHeight: 52,
                    padding: '12px 20px',
                    background: 'transparent',
                    color: DS.green,
                    border: `2px solid ${DS.green}`,
                    borderRadius: 100,
                    fontFamily: 'DM Sans, sans-serif',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: loading ? 'wait' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  ✓ {loading ? 'Aggiornamento…' : 'Segna come pagata'}
                </button>
              )}

              {/* Apri fattura */}
              <Link
                href={`/fatture/${fattura.id}`}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 52,
                  padding: '12px 20px',
                  background: DS.elv,
                  color: DS.t1,
                  borderRadius: 100,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: DS.shB,
                }}
              >
                📄 Apri fattura
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function KpiMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      background: DS.elv,
      borderRadius: 14,
      padding: '10px 12px',
      boxShadow: DS.shB,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        fontWeight: 600,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 13,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        wordBreak: 'break-word',
      }}>
        {value}
      </div>
    </div>
  )
}

// ─── FatturaCard ──────────────────────────────────────────────────────────────

interface FatturaCardProps {
  fattura: FatturaEstratto
  index: number
  onTap: (f: FatturaEstratto) => void
  reducedMotion: boolean
}

function FatturaCard({ fattura, index, onTap, reducedMotion }: FatturaCardProps) {
  const color = urgencyColor(fattura)
  const delay = Math.min(index * staggerDelay(8), 0.25)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={reducedMotion ? { duration: 0 } : { ...t('normal', 'enter'), delay }}
    >
      <button
        type="button"
        onClick={() => onTap(fattura)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '14px 16px',
          background: DS.sfc,
          borderRadius: 16,
          boxShadow: DS.shB,
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'DM Sans, sans-serif',
          WebkitTapHighlightColor: 'transparent',
        }}
        aria-label={`Fattura ${fattura.numero} — ${fmt.format(fattura.totale)} — ${urgencyLabel(fattura)}`}
      >
        {/* Status pill */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 56,
          padding: '6px 8px',
          background: urgencyPillBg(fattura),
          border: urgencyPillBorder(fattura),
          borderRadius: 12,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{urgencyEmoji(fattura)}</span>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 9,
            fontWeight: 700,
            color,
            marginTop: 3,
            textAlign: 'center',
            letterSpacing: '0.03em',
          }}>
            {urgencyLabel(fattura)}
          </span>
        </div>

        {/* Info principale */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 15,
            fontWeight: 600,
            color: DS.t1,
            marginBottom: 2,
          }}>
            N. {fattura.numero}
          </div>
          <div style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 12,
            color: DS.t2,
          }}>
            {formatData(fattura.data)}
            {!fattura.pagata && (
              <span style={{ marginLeft: 4, color }}>
                · {fattura.giorni_ritardo}gg
              </span>
            )}
          </div>
        </div>

        {/* Importo */}
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 15,
          fontWeight: 700,
          color,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}>
          {fmt.format(fattura.totale)}
        </div>
      </button>
    </motion.div>
  )
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────

interface KpiBarProps {
  saldo_insoluto: number
  totale_fatture: number
  fatture_pagate_count: number
}

function KpiBar({ saldo_insoluto, totale_fatture, fatture_pagate_count }: KpiBarProps) {
  const reducedMotion = useReducedMotion()
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 8,
      margin: '0 16px 20px',
    }}>
      <KpiCard
        label="Insoluto"
        value={fmt.format(saldo_insoluto)}
        color={saldo_insoluto > 0 ? DS.red : DS.green}
        sub={saldo_insoluto > 0 ? 'da incassare' : 'tutto pagato'}
        reducedMotion={reducedMotion}
      />
      <KpiCard
        label="Fatture"
        value={String(totale_fatture)}
        color={DS.t1}
        sub="totali"
        reducedMotion={reducedMotion}
      />
      <KpiCard
        label="Pagate"
        value={String(fatture_pagate_count)}
        color={DS.green}
        sub={`su ${totale_fatture}`}
        reducedMotion={reducedMotion}
      />
    </div>
  )
}

function KpiCard({ label, value, color, sub, reducedMotion }: { label: string; value: string; color: string; sub: string; reducedMotion: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : motionTokens.spring.gentle}
      style={{
        background: DS.sfc,
        borderRadius: 16,
        padding: '12px 10px',
        boxShadow: DS.shB,
        textAlign: 'center',
      }}
    >
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        fontWeight: 700,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 17,
        fontWeight: 700,
        color,
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
        marginBottom: 2,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 10,
        color: DS.t2,
      }}>
        {sub}
      </div>
    </motion.div>
  )
}

// ─── Sezione header ───────────────────────────────────────────────────────────

function SezioneHeader({ label }: { label: string }) {
  return (
    <div style={{
      padding: '0 16px 8px',
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 11,
      fontWeight: 700,
      color: DS.t3,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    }}>
      {label}
    </div>
  )
}

// ─── Tabella desktop ──────────────────────────────────────────────────────────

type SortKey = 'data' | 'totale' | 'stato_sdi' | 'giorni_ritardo'
type SortDir = 'asc' | 'desc'

function TabellaFatture({
  fatture,
  onTap,
}: {
  fatture: FatturaEstratto[]
  onTap: (f: FatturaEstratto) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('giorni_ritardo')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...fatture].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'data') cmp = new Date(a.data).getTime() - new Date(b.data).getTime()
    else if (sortKey === 'totale') cmp = a.totale - b.totale
    else if (sortKey === 'stato_sdi') cmp = a.stato_sdi.localeCompare(b.stato_sdi)
    else if (sortKey === 'giorni_ritardo') cmp = a.giorni_ritardo - b.giorni_ritardo
    return sortDir === 'asc' ? cmp : -cmp
  })

  const thStyle = (key: SortKey): React.CSSProperties => ({
    padding: '10px 12px',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 11,
    fontWeight: 700,
    color: sortKey === key ? DS.t1 : DS.t3,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: `1px solid rgba(0,0,0,.06)`,
    background: DS.elv,
    whiteSpace: 'nowrap',
  })

  return (
    <div style={{ margin: '0 16px', overflowX: 'auto', borderRadius: 16, boxShadow: DS.shB }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: DS.sfc }}>
        <thead>
          <tr>
            <th style={thStyle('data')} onClick={() => handleSort('data')}>
              Data {sortKey === 'data' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={{ ...thStyle('totale'), textAlign: 'right' }} onClick={() => handleSort('totale')}>
              Importo {sortKey === 'totale' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={thStyle('stato_sdi')} onClick={() => handleSort('stato_sdi')}>
              Stato SDI {sortKey === 'stato_sdi' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={thStyle('giorni_ritardo')} onClick={() => handleSort('giorni_ritardo')}>
              Giorni {sortKey === 'giorni_ritardo' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,.06)', background: DS.elv, borderRadius: '0 16px 0 0' }}>
              <span style={{ display: 'none' }}>Azioni</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f, i) => {
            const color = urgencyColor(f)
            return (
              <tr
                key={f.id}
                style={{
                  borderBottom: i < sorted.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onTap(f)}
              >
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: DS.t1,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>N. {f.numero}</div>
                  <div style={{ fontSize: 11, color: DS.t2, marginTop: 2 }}>{formatData(f.data)}</div>
                </td>
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  color,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {fmt.format(f.totale)}
                </td>
                <td style={{ padding: '12px 12px' }}>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 11,
                    fontWeight: 700,
                    color,
                    background: urgencyPillBg(f),
                    border: urgencyPillBorder(f),
                    borderRadius: 8,
                    padding: '3px 8px',
                  }}>
                    {urgencyEmoji(f)} {labelStatoSDI(f.stato_sdi)}
                  </span>
                </td>
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: f.pagata ? DS.t3 : color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {f.pagata ? '—' : `${f.giorni_ritardo}gg`}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTap(f) }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      background: DS.elv,
                      color: DS.t2,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '-2px -2px 6px rgba(255,255,255,.72), 3px 4px 10px -2px rgba(148,128,118,.40)',
                    }}
                  >
                    Dettagli →
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Card info cliente tablet ─────────────────────────────────────────────────

function ClienteInfoCard({ cliente, saldo_insoluto }: {
  cliente: EstrattoContoResponse['cliente']
  saldo_insoluto: number
}) {
  const hasAddress = cliente.indirizzo || cliente.citta

  return (
    <div style={{
      background: DS.sfc,
      borderRadius: 16,
      padding: '20px',
      boxShadow: DS.shB,
    }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 14,
      }}>
        Info cliente
      </div>

      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 16,
        fontWeight: 700,
        color: DS.t1,
        marginBottom: 4,
      }}>
        {cliente.studio_nome ?? `${cliente.nome} ${cliente.cognome}`}
      </div>

      {hasAddress && (
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: DS.t2,
          marginBottom: 4,
        }}>
          {[cliente.indirizzo, cliente.citta, cliente.cap].filter(Boolean).join(', ')}
        </div>
      )}

      {cliente.telefono && (
        <a
          href={`tel:${cliente.telefono}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: DS.t1,
            textDecoration: 'none',
          }}
        >
          📞 {cliente.telefono}
        </a>
      )}

      <div style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid rgba(0,0,0,.06)',
      }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 11,
          color: DS.t3,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 4,
        }}>
          Saldo insoluto
        </div>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          color: saldo_insoluto > 0 ? DS.red : DS.green,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt.format(saldo_insoluto)}
        </div>
      </div>
    </div>
  )
}

// ─── EstrattoContoView — componente principale ────────────────────────────────

interface Props {
  dati: EstrattoContoResponse
}

export function EstrattoContoView({ dati }: Props) {
  const reducedMotion = useReducedMotion()
  const [fatture, setFatture] = useState<FatturaEstratto[]>(dati.fatture)
  const [selectedFattura, setSelectedFattura] = useState<FatturaEstratto | null>(null)

  // Calcoli derivati
  const nonPagate = fatture.filter((f) => !f.pagata)
  const pagate = fatture.filter((f) => f.pagata)
  const saldo_insoluto = nonPagate.reduce((s, f) => s + f.totale, 0)

  // Optimistic update: sposta fattura da nonPagate a pagate
  const handlePagata = useCallback((id: string) => {
    setFatture((prev) =>
      prev.map((f) => (f.id === id ? { ...f, pagata: true } : f))
    )
  }, [])

  const openSheet = useCallback((f: FatturaEstratto) => setSelectedFattura(f), [])
  const closeSheet = useCallback(() => setSelectedFattura(null), [])

  // WhatsApp sollecito globale cliente (solo se insoluto > 0 e telefono disponibile)
  const whatsappMsgGlobale = buildWhatsappSollecito({
    studioNome: dati.cliente.studio_nome ?? `${dati.cliente.nome} ${dati.cliente.cognome}`,
    totaleInsoluto: saldo_insoluto,
  })
  const whatsappUrlGlobale = dati.cliente.telefono
    ? buildWhatsappUrl(whatsappMsgGlobale, dati.cliente.telefono)
    : null

  // Aggiorna selectedFattura se è stata modificata
  const selectedFatturaAggiornata = selectedFattura
    ? (fatture.find((f) => f.id === selectedFattura.id) ?? selectedFattura)
    : null

  return (
    <>
      {/* ── Layout desktop (1280px) — colonna unica, tabella ── */}
      <style>{`
        .estratto-col-sidebar { display: none; }
        @media (min-width: 768px) {
          .estratto-layout {
            display: grid !important;
            grid-template-columns: 1fr 340px;
            gap: 24px;
            padding: 0 24px;
            align-items: start;
          }
          .estratto-col-main { min-width: 0; }
          .estratto-col-sidebar { display: block; position: sticky; top: 80px; }
        }
        @media (min-width: 1280px) {
          .estratto-card-list { display: none !important; }
          .estratto-table-view { display: block !important; }
        }
        @media (max-width: 1279px) {
          .estratto-table-view { display: none !important; }
        }
      `}</style>

      {/* KPI Bar — sempre visibile */}
      <KpiBar
        saldo_insoluto={saldo_insoluto}
        totale_fatture={fatture.length}
        fatture_pagate_count={pagate.length}
      />

      <div className="estratto-layout">
        {/* Colonna principale */}
        <div className="estratto-col-main">

          {/* ── Sezione non pagate (card list — mobile e tablet) ── */}
          <div className="estratto-card-list">
            {nonPagate.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Da incassare (${nonPagate.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {nonPagate.map((f, i) => (
                      <FatturaCard
                        key={f.id}
                        fattura={f}
                        index={i}
                        onTap={openSheet}
                        reducedMotion={reducedMotion}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {pagate.length > 0 && (
              <section style={{ marginBottom: 24 }}>
                <SezioneHeader label={`Storico pagamenti (${pagate.length})`} />
                <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {pagate.map((f, i) => (
                      <FatturaCard
                        key={f.id}
                        fattura={f}
                        index={i}
                        onTap={openSheet}
                        reducedMotion={reducedMotion}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}

            {fatture.length === 0 && (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 15,
                color: DS.t2,
              }}>
                Nessuna fattura per questo cliente.
              </div>
            )}
          </div>

          {/* ── Tabella desktop (1280px+) ── */}
          <div className="estratto-table-view">
            {fatture.length > 0 ? (
              <TabellaFatture fatture={fatture} onTap={openSheet} />
            ) : (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 15,
                color: DS.t2,
              }}>
                Nessuna fattura per questo cliente.
              </div>
            )}
          </div>

          {/* WhatsApp CTA globale — solo su mobile/tablet, solo se insoluto > 0 */}
          {saldo_insoluto > 0 && whatsappUrlGlobale && (
            <div style={{ padding: '0 16px 24px' }} className="estratto-card-list">
              <a
                href={whatsappUrlGlobale}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 52,
                  padding: '12px 20px',
                  background: '#25D366',
                  color: '#fff',
                  borderRadius: 100,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                }}
              >
                <WhatsAppIcon />
                Sollecito totale — {fmt.format(saldo_insoluto)}
              </a>
            </div>
          )}
        </div>

        {/* ── Sidebar tablet/desktop ── */}
        <div className="estratto-col-sidebar">
          <ClienteInfoCard cliente={dati.cliente} saldo_insoluto={saldo_insoluto} />

          {/* WhatsApp CTA sidebar — solo se insoluto > 0 */}
          {saldo_insoluto > 0 && whatsappUrlGlobale && (
            <div style={{ marginTop: 12 }}>
              <a
                href={whatsappUrlGlobale}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  minHeight: 52,
                  padding: '12px 20px',
                  background: '#25D366',
                  color: '#fff',
                  borderRadius: 100,
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none',
                  boxShadow: '0 0 16px hsl(141 67% 49% / 0.35)',
                }}
              >
                <WhatsAppIcon />
                Invia sollecito WhatsApp
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheet fattura */}
      <FatturaBottomSheet
        fattura={selectedFatturaAggiornata}
        telefono={dati.cliente.telefono}
        studioNome={dati.cliente.studio_nome ?? `${dati.cliente.nome} ${dati.cliente.cognome}`}
        onClose={closeSheet}
        onPagata={handlePagata}
      />
    </>
  )
}

// ─── WhatsApp icon SVG ────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
