'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { t, useReducedMotion } from '@/design-system/motion'
import { KpiCard } from './KpiCard'
import { SpotlightCard } from './SpotlightCard'
import type {
  DashboardStatsExtended,
  FrontDeskConsegnaItem,
  StatoLavoro,
  PrioritaLavoro,
  TipoDispositivo,
} from '@/types/domain'

// ─── DS v2.2 tokens ──────────────────────────────────────────────────────────

const DS = {
  bg:     'var(--bg, #DDD8D3)',
  sfc:    'var(--sfc, #E4DFD9)',
  elv:    'var(--elv, #EDEDEA)',
  prs:    'var(--prs, #D4CFC9)',
  t1:     'var(--t1, #1C1916)',
  t2:     'var(--t2, #96918D)',
  t3:     'var(--t3, #B8B3AE)',
  primary:'var(--primary, #D90012)',
  gold:   'var(--gold, #D4A843)',
  success:'var(--success, #3DCB5C)',
  warning:'var(--warning, #B45309)',
  border: 'var(--border, rgba(0,0,0,.06))',
  shB: `inset 0 1px 0 rgba(255,255,255,.90),inset 0 -2px 3px rgba(0,0,0,.05),
        -5px -5px 11px rgba(255,255,255,.78),9px 13px 22px -4px rgba(148,128,118,.44)`,
  shC: `inset 0 1px 0 rgba(255,255,255,.88),inset 0 -1px 2px rgba(0,0,0,.04),
        -5px -5px 11px rgba(255,255,255,.72),9px 12px 22px -4px rgba(148,128,118,.40),
        3px 5px 10px -2px rgba(148,128,118,.22)`,
  shI: `inset 4px 4px 9px rgba(148,128,118,.32),inset -3px -3px 7px rgba(255,255,255,.66)`,
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

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
  telefono?: string | null
  giorni_ritardo?: number | null
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

export interface DashboardTitolareProps {
  stats: DashboardStatsExtended
  consegneOggi: FrontDeskConsegnaItem[]
  lavoriInRitardo: LavoroRitardoItem[]
  inProvaRientro: { id: string; numero_lavoro: string; descrizione: string; data_prima_prova: string | null; clienti: { nome: string; cognome: string; studio_nome: string | null } | null }[]
  materialiEsaurimento: MaterialeItem[]
  pagamentiTop: PagamentoTop[]
  nomeUtente: string
  labName?: string
  aggiornatoAt?: string | null
  onboardingPending?: boolean
  segnalazioni?: SegnalazioneAlert[]
  preferenzaDashboard?: 'ibrido' | 'gestione_solo'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(n)
}

function formatData(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  const oggi = new Date(); oggi.setHours(0,0,0,0)
  const diff = Math.round((d.getTime() - oggi.getTime()) / 86_400_000)
  if (diff === 0) return 'oggi'
  if (diff === 1) return 'domani'
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}

// ─── SVG Icons (no emoji per PINNED) ──────────────────────────────────────────

function IconGestione({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="1" y="1" width="5" height="5" rx="1"/>
      <rect x="8" y="1" width="5" height="5" rx="1"/>
      <rect x="1" y="8" width="5" height="5" rx="1"/>
      <rect x="8" y="8" width="5" height="5" rx="1"/>
    </svg>
  )
}

function IconProduzione({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M2 4h10M2 7h7M2 10h5"/>
    </svg>
  )
}

function IconWhatsApp({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  )
}

function IconPhone({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 01.01 2.22 2 2 0 012 .06h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  )
}

function IconUser({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '9px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: DS.t3,
      margin: '0 14px 7px',
      ...style,
    }}>
      {children}
    </div>
  )
}

function EmptyCard({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      margin: '0 14px 14px',
      background: DS.sfc,
      borderRadius: '16px',
      padding: '20px',
      boxShadow: DS.shB,
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '6px', opacity: .35 }}>{icon}</div>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: DS.t3, margin: 0 }}>
        {text}
      </p>
    </div>
  )
}

// ─── Contact Bottom Sheet ─────────────────────────────────────────────────────

interface ContactSheetProps {
  cliente: PagamentoTop
  onClose: () => void
}

const WHATSAPP_TEMPLATE = (nome: string, importo: string) =>
  `Gentile ${nome}, la contatto per ricordarle il saldo dei nostri lavori pari a ${importo}. Per ulteriori informazioni può accedere al suo portale dedicato. Grazie.`

function CreditoContactSheet({ cliente, onClose }: ContactSheetProps) {
  const [message, setMessage] = useState(
    WHATSAPP_TEMPLATE(cliente.cliente_display, formatEuro(cliente.residuo))
  )
  const encodedMsg = encodeURIComponent(message)
  const waUrl = cliente.telefono
    ? `https://wa.me/${cliente.telefono.replace(/\D/g, '')}?text=${encodedMsg}`
    : `https://wa.me/?text=${encodedMsg}`
  const telUrl = cliente.telefono ? `tel:${cliente.telefono}` : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Contatta ${cliente.cliente_display}`}
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.4)',
        display: 'flex', alignItems: 'flex-end',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <div style={{
        background: DS.sfc,
        borderRadius: '20px 20px 0 0',
        padding: '0 0 calc(24px + env(safe-area-inset-bottom, 0px))',
        width: '100%',
        maxWidth: '560px',
        margin: '0 auto',
        boxShadow: `0 -8px 32px rgba(0,0,0,.18)`,
      }}>
        {/* Handle */}
        <div style={{
          width: '36px', height: '4px', borderRadius: '2px',
          background: DS.prs, margin: '12px auto 16px',
        }} />

        {/* Header */}
        <div style={{ padding: '0 20px 16px', borderBottom: `1px solid ${DS.border}` }}>
          <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '18px', fontWeight: 400, color: DS.t1, margin: '0 0 2px' }}>
            {cliente.cliente_display}
          </p>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: DS.t2, margin: 0 }}>
            Credito: <strong style={{ color: DS.primary }}>{formatEuro(cliente.residuo)}</strong>
            {cliente.giorni_ritardo ? ` · scaduto ${cliente.giorni_ritardo}gg fa` : ''}
          </p>
        </div>

        {/* WhatsApp section */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${DS.border}` }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: DS.t3, marginBottom: '8px' }}>
            Messaggio WhatsApp
          </p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: DS.t1,
              background: DS.elv,
              border: 'none',
              borderRadius: '12px',
              padding: '10px 12px',
              resize: 'none',
              outline: 'none',
              boxShadow: DS.shI,
              marginBottom: '10px',
            }}
          />
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              width: '100%', padding: '12px',
              background: '#25D366', color: '#fff',
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <IconWhatsApp size={18} />
            Apri WhatsApp
          </a>
        </div>

        {/* Other actions */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 20px' }}>
          {telUrl && (
            <a
              href={telUrl}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '12px',
                background: DS.elv, color: DS.t1,
                borderRadius: '12px', boxShadow: DS.shB,
                fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <IconPhone size={16} />
              Chiama
            </a>
          )}
          <Link
            href={`/clienti/${cliente.cliente_id}`}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '12px',
              background: DS.elv, color: DS.t1,
              borderRadius: '12px', boxShadow: DS.shB,
              fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <IconUser size={16} />
            Profilo
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── Filtered list views ──────────────────────────────────────────────────────

function FilterBanner({
  label,
  count,
  onClear,
}: {
  label: string
  count: number
  onClear: () => void
}) {
  return (
    <div style={{
      margin: '0 14px 8px',
      background: DS.sfc,
      borderRadius: '10px',
      padding: '8px 12px',
      boxShadow: DS.shI,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderLeft: `3px solid ${DS.primary}`,
    }}>
      <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: DS.t1 }}>
        {count} {label}
      </span>
      <button
        onClick={onClear}
        style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: DS.t2,
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
        }}
      >
        Rimuovi ×
      </button>
    </div>
  )
}

function RitardoList({ items }: { items: LavoroRitardoItem[] }) {
  if (items.length === 0) {
    return <EmptyCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>} text="Nessun lavoro in ritardo" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 14px 14px' }}>
      {items.map((l, i) => (
        <Link
          key={l.id}
          href={`/lavori/${l.id}`}
          style={{
            display: 'flex', gap: '10px', alignItems: 'center',
            background: DS.sfc, borderRadius: '12px', padding: '10px 12px',
            boxShadow: DS.shB, textDecoration: 'none',
          }}
        >
          <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '12px', fontWeight: 300, color: DS.t3, width: '15px', textAlign: 'center', flexShrink: 0 }}>
            {i + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: DS.t1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.cliente_display}
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: DS.t2, margin: '2px 0 0' }}>
              {l.descrizione}
            </p>
          </div>
          <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: 'var(--warning, #B45309)', flexShrink: 0 }}>
            {formatData(l.data_consegna_prevista)}
          </span>
        </Link>
      ))}
    </div>
  )
}

function ConsegneList({ items }: { items: FrontDeskConsegnaItem[] }) {
  if (items.length === 0) {
    return <EmptyCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} text="Nessuna consegna programmata per oggi" />
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '0 14px 14px' }}>
      {items.map((l, i) => (
        <Link
          key={l.id}
          href={`/lavori/${l.id}`}
          style={{
            display: 'flex', gap: '10px', alignItems: 'center',
            background: DS.sfc, borderRadius: '12px', padding: '10px 12px',
            boxShadow: DS.shB, textDecoration: 'none',
          }}
        >
          <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '12px', fontWeight: 300, color: DS.t3, width: '15px', textAlign: 'center', flexShrink: 0 }}>
            {i + 1}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 700, color: DS.t1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {l.cliente_display}
            </p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: DS.t2, margin: '2px 0 0' }}>
              {l.descrizione}
            </p>
          </div>
          {l.ora_consegna && (
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 700, color: DS.primary, flexShrink: 0 }}>
              {l.ora_consegna}
            </span>
          )}
        </Link>
      ))}
    </div>
  )
}

function MaterialiList({ items }: { items: MaterialeItem[] }) {
  if (items.length === 0) {
    return <EmptyCard icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} text="Nessun materiale in esaurimento" />
  }
  return (
    <div style={{ margin: '0 14px 14px', background: DS.sfc, borderRadius: '16px', boxShadow: DS.shB, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px 8px' }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', fontWeight: 600, color: DS.t2 }}>
          {items.length} articoli in esaurimento
        </span>
        <Link href="/magazzino?filter=esaurimento" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 700, color: '#fff', background: DS.primary, borderRadius: '100px', padding: '4px 12px', textDecoration: 'none' }}>
          Ordina
        </Link>
      </div>
      {items.map((m, i) => {
        const perc = m.scorta_minima > 0 ? Math.min(100, Math.round((m.scorta_attuale / m.scorta_minima) * 100)) : 0
        const barColor = perc === 0 ? DS.primary : perc < 50 ? 'var(--warning, #B45309)' : DS.gold
        return (
          <div key={m.id} style={{ padding: '6px 14px 10px', borderTop: i > 0 ? `1px solid ${DS.border}` : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: DS.t1 }}>{m.nome}</span>
              <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: DS.t2 }}>
                {m.scorta_attuale}/{m.scorta_minima} {m.um_acquisto}
              </span>
            </div>
            <div style={{ height: '3px', background: DS.prs, borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${perc}%`, borderRadius: '2px', background: barColor }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sezioni standard ─────────────────────────────────────────────────────────

function CreditiSection({
  pagamentiTop,
  totale,
  count,
  onContact,
}: {
  pagamentiTop: PagamentoTop[]
  totale: number
  count: number
  onContact: (p: PagamentoTop) => void
}) {
  if (pagamentiTop.length === 0) return null
  return (
    <>
      <SectionLabel>Crediti da riscuotere</SectionLabel>
      <div style={{ margin: '0 14px 14px', background: DS.sfc, borderRadius: '16px', boxShadow: DS.shB, overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${DS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '22px', fontWeight: 300, color: DS.primary }}>
              {formatEuro(totale)}
            </span>
            <Link href="/fatture?filter=scadute" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: DS.t2, textDecoration: 'none' }}>
              Vedi tutti
            </Link>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '10px', color: DS.t3, margin: 0 }}>
            {count} {count === 1 ? 'cliente' : 'clienti'} con pagamenti scaduti
          </p>
        </div>
        {pagamentiTop.slice(0, 3).map((p, i) => (
          <div key={p.cliente_id} style={{
            display: 'flex', alignItems: 'center', padding: '10px 14px',
            borderTop: i > 0 ? `1px solid ${DS.border}` : 'none',
            gap: '10px',
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
              background: p.giorni_ritardo && p.giorni_ritardo > 30 ? 'var(--warning, #B45309)' : DS.primary,
            }} />
            <span style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 500, color: DS.t1 }}>
              {p.cliente_display}
            </span>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 700, color: DS.primary }}>
                {formatEuro(p.residuo)}
              </div>
              {p.giorni_ritardo && (
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', color: DS.t3 }}>
                  {p.giorni_ritardo}gg fa
                </div>
              )}
            </div>
            <button
              onClick={() => onContact(p)}
              style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: '10px', fontWeight: 600, color: DS.t2,
                background: DS.prs, border: 'none', borderRadius: '8px',
                padding: '5px 10px', cursor: 'pointer', flexShrink: 0,
                boxShadow: DS.shB,
              }}
            >
              Contatta
            </button>
          </div>
        ))}
      </div>
    </>
  )
}

function ColLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      fontFamily: 'DM Sans, sans-serif', fontSize: '8.5px', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.08em', color: DS.t3,
      padding: '10px 16px 8px',
      borderBottom: `1px solid ${DS.border}`,
    }}>
      {icon}{text}
    </div>
  )
}

function FatturatoSection({ stats }: { stats: DashboardStatsExtended }) {
  const delta = stats.fatturato_mese_precedente > 0
    ? Math.round(((stats.fatturato_mese - stats.fatturato_mese_precedente) / stats.fatturato_mese_precedente) * 100)
    : 0
  return (
    <>
      <SectionLabel>Fatturato mensile</SectionLabel>
      <div style={{ margin: '0 14px 14px', background: DS.sfc, borderRadius: '16px', padding: '14px', boxShadow: DS.shB }}>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: DS.t3, marginBottom: '4px' }}>
          {new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
        </p>
        <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '26px', fontWeight: 300, color: DS.t1, margin: '0 0 2px' }}>
          {formatEuro(stats.fatturato_mese)}
        </p>
        <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: DS.t2, margin: 0 }}>
          Mese scorso: {formatEuro(stats.fatturato_mese_precedente)}
          {delta !== 0 && (
            <span style={{ marginLeft: '6px', color: delta > 0 ? DS.success : DS.primary }}>
              {delta > 0 ? '+' : ''}{delta}%
            </span>
          )}
        </p>
        {stats.margine_netto !== undefined && (
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: DS.t2, margin: '2px 0 0' }}>
            Margine: {formatEuro(stats.margine_netto)}
            {stats.percentuale_margine > 0 && (
              <span style={{ marginLeft: '4px', color: DS.t3 }}>({Math.round(stats.percentuale_margine)}%)</span>
            )}
          </p>
        )}
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

type FilterKey = 'consegne' | 'ritardo' | 'fattura' | 'materiali'

export function DashboardTitolare({
  stats,
  consegneOggi,
  lavoriInRitardo,
  materialiEsaurimento,
  pagamentiTop,
  nomeUtente,
  onboardingPending,
  segnalazioni = [],
  preferenzaDashboard = 'ibrido',
}: DashboardTitolareProps) {
  const reduced = useReducedMotion()
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null)
  const [contactTarget, setContactTarget] = useState<PagamentoTop | null>(null)
  const [activeTab, setActiveTab] = useState<'gestione' | 'produzione'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ua-dashboard-view')
      if (stored === 'gestione' || stored === 'produzione') return stored
    }
    return 'produzione'
  })

  // Persist tab choice
  useEffect(() => {
    localStorage.setItem('ua-dashboard-view', activeTab)
  }, [activeTab])

  const showTabs = preferenzaDashboard !== 'gestione_solo'

  const handleFilterToggle = (f: FilterKey) => {
    setActiveFilter(prev => prev === f ? null : f)
  }

  // Spotlight: prima segnalazione aperta
  const firstSegnalazione = segnalazioni[0]
  const spotlightTipo: 'blocco' | 'urgente' | 'ritardo' | undefined = firstSegnalazione
    ? (firstSegnalazione.segnalazione_tipo === 'impronta_non_idonea' || firstSegnalazione.segnalazione_tipo === 'materiale_esaurito'
        ? 'blocco'
        : firstSegnalazione.segnalazione_tipo === 'colore_mancante' || firstSegnalazione.segnalazione_tipo === 'istruzione_poco_chiara'
          ? 'urgente'
          : 'ritardo')
    : undefined

  const filteredCount = activeFilter === 'ritardo' ? lavoriInRitardo.length
    : activeFilter === 'consegne' ? consegneOggi.length
    : activeFilter === 'materiali' ? materialiEsaurimento.length
    : activeFilter === 'fattura' ? stats.pronti_non_fatturati
    : 0

  const filteredLabel = activeFilter === 'ritardo' ? 'lavori in ritardo'
    : activeFilter === 'consegne' ? 'consegne oggi'
    : activeFilter === 'materiali' ? 'materiali in esaurimento'
    : 'lavori da fatturare'

  // ── Sezione Gestione (business KPI) ─────────────────────────────────────────
  const GestioneContent = (
    <>
      {/* KPI Grid 2×2 */}
      <div style={{ margin: '0 14px 12px' }}>
        <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', color: DS.t3, marginBottom: '8px' }}>
          Panoramica — tocca per filtrare
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <KpiCard
            valore={stats.consegne_oggi}
            label="Consegne oggi"
            hint="tocca per vedere"
            colore="red"
            isActive={activeFilter === 'consegne'}
            onToggle={() => handleFilterToggle('consegne')}
          />
          <KpiCard
            valore={stats.lavori_in_ritardo}
            label="In ritardo"
            hint="tocca per vedere"
            colore="amber"
            isActive={activeFilter === 'ritardo'}
            onToggle={() => handleFilterToggle('ritardo')}
          />
          <KpiCard
            valore={stats.pronti_non_fatturati}
            label="Da fatturare"
            hint="tocca per vedere"
            colore="gold"
            isActive={activeFilter === 'fattura'}
            onToggle={() => handleFilterToggle('fattura')}
          />
          <KpiCard
            valore={materialiEsaurimento.length}
            label="Materiali in esaurimento"
            hint="tocca per vedere"
            colore="grey"
            isActive={activeFilter === 'materiali'}
            onToggle={() => handleFilterToggle('materiali')}
          />
        </div>
      </div>

      {/* Filter banner + filtered content */}
      <AnimatePresence mode="wait">
        {activeFilter && (
          <motion.div
            key={activeFilter}
            initial={reduced ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={t('fast', 'enter')}
          >
            <FilterBanner
              label={filteredLabel}
              count={filteredCount}
              onClear={() => setActiveFilter(null)}
            />
            <SectionLabel style={{ marginTop: '4px' }}>
              {activeFilter === 'ritardo' ? 'Lavori in ritardo — per scadenza'
                : activeFilter === 'consegne' ? 'Da consegnare oggi'
                : activeFilter === 'materiali' ? 'Materiali in esaurimento'
                : 'Pronti da fatturare'}
            </SectionLabel>
            {activeFilter === 'ritardo' && <RitardoList items={lavoriInRitardo} />}
            {activeFilter === 'consegne' && <ConsegneList items={consegneOggi} />}
            {activeFilter === 'materiali' && <MaterialiList items={materialiEsaurimento} />}
            {activeFilter === 'fattura' && (
              <div style={{ margin: '0 14px 14px' }}>
                <Link
                  href="/fatture?filter=da_fatturare"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '14px', background: DS.sfc, borderRadius: '14px',
                    boxShadow: DS.shB, textDecoration: 'none',
                    fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 600, color: DS.gold,
                  }}
                >
                  {formatEuro(0)} da fatturare · Vai alla lista →
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Default sections — nascoste quando filtro attivo */}
      {!activeFilter && (
        <>
          <CreditiSection
            pagamentiTop={pagamentiTop}
            totale={stats.pagamenti_scaduti_totale ?? 0}
            count={stats.pagamenti_scaduti_clienti_count ?? 0}
            onContact={setContactTarget}
          />
          <SectionLabel>Da consegnare oggi</SectionLabel>
          <ConsegneList items={consegneOggi} />
          <MaterialiList items={materialiEsaurimento} />
          <FatturatoSection stats={stats} />
        </>
      )}
    </>
  )

  // ── Sezione Produzione (task operativo) ──────────────────────────────────────
  const ProduzioneContent = (
    <>
      {/* SpotlightCard — prima segnalazione */}
      {firstSegnalazione && spotlightTipo && (
        <SpotlightCard
          lavoro_id={firstSegnalazione.id}
          numero_lavoro={firstSegnalazione.numero_lavoro}
          cliente_display={
            firstSegnalazione.clienti?.studio_nome ??
            (firstSegnalazione.clienti ? `${firstSegnalazione.clienti.nome} ${firstSegnalazione.clienti.cognome}` : '—')
          }
          descrizione_problema={
            firstSegnalazione.segnalazione_nota ??
            (firstSegnalazione.segnalazione_tipo in TIPI_LABEL
              ? TIPI_LABEL[firstSegnalazione.segnalazione_tipo as keyof typeof TIPI_LABEL]
              : firstSegnalazione.segnalazione_tipo)
          }
          ora_consegna={null}
          tipo={spotlightTipo}
          timestamp_segnalazione={firstSegnalazione.segnalazione_at}
        />
      )}

      {/* Lavori in ritardo urgenti come task list */}
      {lavoriInRitardo.length > 0 && (
        <>
          <SectionLabel>Lavori in ritardo</SectionLabel>
          <RitardoList items={lavoriInRitardo.slice(0, 5)} />
        </>
      )}

      {/* Consegne oggi */}
      <SectionLabel>Da consegnare oggi</SectionLabel>
      <ConsegneList items={consegneOggi} />

      {/* Segnalazioni rimanenti */}
      {segnalazioni.length > 1 && (
        <>
          <SectionLabel>Segnalazioni aperte ({segnalazioni.length - 1})</SectionLabel>
          <div style={{ margin: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {segnalazioni.slice(1).map(s => (
              <Link
                key={s.id}
                href={`/lavori/${s.id}`}
                style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  background: DS.sfc, borderRadius: '12px', padding: '10px 12px',
                  boxShadow: DS.shB, textDecoration: 'none',
                }}
              >
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: DS.warning, marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600, color: DS.t1, margin: 0 }}>
                    #{s.numero_lavoro}
                  </p>
                  <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: DS.t2, margin: '2px 0 0' }}>
                    {s.segnalazione_nota ?? s.segnalazione_tipo}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )

  // ── Greeting ──────────────────────────────────────────────────────────────────
  const GreetingSection = (
    <div style={{ padding: '8px 16px 12px' }}>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: DS.t2, margin: '0 0 2px' }}>
        {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>
      <p style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '21px', fontWeight: 400, color: DS.t1, letterSpacing: '-.01em', lineHeight: 1.2, margin: 0 }}>
        {getGreeting()}, {nomeUtente}
      </p>
    </div>
  )

  // ── Role Tabs (no emoji, SVG icons) ─────────────────────────────────────────
  const RoleTabs = showTabs ? (
    <div style={{
      margin: '0 14px 12px',
      background: DS.prs,
      borderRadius: '14px',
      padding: '3px',
      display: 'flex',
      boxShadow: DS.shI,
    }}>
      {(['gestione', 'produzione'] as const).map(v => (
        <button
          key={v}
          role="tab"
          aria-selected={activeTab === v}
          onClick={() => setActiveTab(v)}
          style={{
            flex: 1,
            padding: '7px 5px',
            borderRadius: '11px',
            fontSize: '10.5px',
            fontWeight: 600,
            fontFamily: 'DM Sans, sans-serif',
            textAlign: 'center',
            color: activeTab === v ? DS.t1 : DS.t2,
            background: activeTab === v ? DS.elv : 'transparent',
            boxShadow: activeTab === v ? DS.shB : 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'all .15s cubic-bezier(.2,0,0,1)',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          {v === 'gestione' ? <IconGestione /> : <IconProduzione />}
          {v === 'gestione' ? 'Gestione' : 'Produzione'}
          <small style={{ display: 'block', fontSize: '8px', opacity: .5, fontWeight: 400 }}>
            {v === 'gestione' ? 'business' : 'i miei lavori'}
          </small>
        </button>
      ))}
    </div>
  ) : null

  return (
    <div style={{ background: DS.bg, minHeight: '100%' }}>
      {/* Onboarding banner */}
      {onboardingPending && (
        <Link href="/onboarding" style={{
          display: 'block', padding: '10px 16px',
          background: DS.gold, color: '#fff',
          fontFamily: 'DM Sans, sans-serif', fontSize: '12px', fontWeight: 600,
          textDecoration: 'none', textAlign: 'center',
        }}>
          Completa la configurazione del laboratorio →
        </Link>
      )}

      {GreetingSection}

      {/* LAYOUT: mobile = colonna singola, desktop = 2 colonne */}
      <div className="ua-dash-layout">

        {/* ── Colonna Produzione ── */}
        {showTabs && (
          <div className="ua-dash-col-prod">
            {/* Label visibile solo su desktop */}
            <div style={{ display: 'none' }} className="ua-desk-only">
              <ColLabel icon={<IconProduzione size={11} />} text="Produzione — cosa faccio" />
            </div>

            {/* SpotlightCard — visibile in Produzione (sia mobile tab sia desktop) */}
            {firstSegnalazione && spotlightTipo && (
              <SpotlightCard
                lavoro_id={firstSegnalazione.id}
                numero_lavoro={firstSegnalazione.numero_lavoro}
                cliente_display={
                  firstSegnalazione.clienti?.studio_nome ??
                  (firstSegnalazione.clienti ? `${firstSegnalazione.clienti.nome} ${firstSegnalazione.clienti.cognome}` : '—')
                }
                descrizione_problema={
                  firstSegnalazione.segnalazione_nota ??
                  (firstSegnalazione.segnalazione_tipo in TIPI_LABEL
                    ? TIPI_LABEL[firstSegnalazione.segnalazione_tipo as keyof typeof TIPI_LABEL]
                    : firstSegnalazione.segnalazione_tipo)
                }
                ora_consegna={null}
                tipo={spotlightTipo}
                timestamp_segnalazione={firstSegnalazione.segnalazione_at}
              />
            )}

            {lavoriInRitardo.length > 0 && (
              <>
                <SectionLabel>Lavori in ritardo</SectionLabel>
                <RitardoList items={lavoriInRitardo.slice(0, 5)} />
              </>
            )}
            <SectionLabel>Da consegnare oggi</SectionLabel>
            <ConsegneList items={consegneOggi} />
          </div>
        )}

        {/* ── Colonna Gestione ── */}
        <div className={showTabs ? 'ua-dash-col-gest' : ''}>
          {showTabs && (
            <div style={{ display: 'none' }} className="ua-desk-only">
              <ColLabel icon={<IconGestione size={11} />} text="Gestione — stato del business" />
            </div>
          )}

          {/* Mobile: role tabs sopra il contenuto */}
          {RoleTabs}

          {/* Mobile: tab switcher logic */}
          {showTabs ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={t('fast', 'enter')}
              >
                {activeTab === 'gestione' ? GestioneContent : ProduzioneContent}
              </motion.div>
            </AnimatePresence>
          ) : (
            // Titolare puro: tutto in un'unica colonna
            <>
              {firstSegnalazione && spotlightTipo && (
                <SpotlightCard
                  lavoro_id={firstSegnalazione.id}
                  numero_lavoro={firstSegnalazione.numero_lavoro}
                  cliente_display={
                    firstSegnalazione.clienti?.studio_nome ??
                    (firstSegnalazione.clienti ? `${firstSegnalazione.clienti.nome} ${firstSegnalazione.clienti.cognome}` : '—')
                  }
                  descrizione_problema={
                    firstSegnalazione.segnalazione_nota ??
                    (firstSegnalazione.segnalazione_tipo in TIPI_LABEL
                      ? TIPI_LABEL[firstSegnalazione.segnalazione_tipo as keyof typeof TIPI_LABEL]
                      : firstSegnalazione.segnalazione_tipo)
                  }
                  ora_consegna={null}
                  tipo={spotlightTipo}
                  timestamp_segnalazione={firstSegnalazione.segnalazione_at}
                />
              )}
              {GestioneContent}
            </>
          )}
        </div>
      </div>

      {/* Contact sheet */}
      {contactTarget && (
        <CreditoContactSheet
          cliente={contactTarget}
          onClose={() => setContactTarget(null)}
        />
      )}
    </div>
  )
}

const TIPI_LABEL = {
  impronta_non_idonea:    'Impronta non idonea',
  colore_mancante:        'Colore non specificato',
  istruzione_poco_chiara: 'Istruzione poco chiara',
  materiale_esaurito:     'Materiale esaurito',
  altro:                  'Altro',
} as const
