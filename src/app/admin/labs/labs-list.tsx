'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'

type Lab = {
  id: string
  nome: string
  ragione_sociale: string | null
  partita_iva: string
  stato: string
  piano: string
  trial_ends_at: string | null
  stripe_subscription_status: string | null
  stripe_price_id: string | null
  created_at: string
}

type Counts = {
  trial: number
  attivo: number
  sospeso: number
  scaduto: number
  blacklist: number
}

let _ac: AudioContext | null = null
function sndClick() {
  try {
    if (!_ac) _ac = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const c = _ac
    const len = Math.floor(c.sampleRate * 0.022)
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8)
    const src = c.createBufferSource(); src.buffer = buf
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 600; bp.Q.value = 1.5
    const g = c.createGain()
    g.gain.setValueAtTime(0.45, c.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.022)
    src.connect(bp); bp.connect(g); g.connect(c.destination); src.start()
  } catch { /* silent */ }
}

function trialExpirySub(lab: Lab): string | null {
  if (!lab.trial_ends_at) return null
  const d = new Date(lab.trial_ends_at)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days <= 0) return 'scaduto'
  if (days === 1) return 'domani'
  if (days <= 7) return `${days}gg`
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })
}

type Filter = 'tutti' | 'trial' | 'attivo' | 'sospeso' | 'scaduto' | 'blacklist'

function matchesFilter(lab: Lab, f: Filter): boolean {
  if (f === 'tutti') return true
  return lab.stato === f
}

interface Props {
  labs: Lab[]
  counts: Counts
  nextTrialExpiry: string | null
  labAttiviRete: number
}

export default function LabsList({ labs, counts, nextTrialExpiry, labAttiviRete }: Props) {
  const [filter, setFilter] = useState<Filter>('tutti')

  const setF = useCallback((f: Filter) => {
    sndClick()
    setFilter(prev => prev === f ? 'tutti' : f)
  }, [])

  const visible = labs.filter(l => matchesFilter(l, filter))

  const statConfig: { key: Filter; label: string; count: number; cls: string; sub: string }[] = [
    {
      key: 'trial',
      label: 'In prova',
      count: counts.trial,
      cls: 'trial',
      sub: nextTrialExpiry
        ? `1 scade ${new Date(nextTrialExpiry).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}`
        : ' ',
    },
    {
      key: 'attivo',
      label: 'Attivi',
      count: counts.attivo,
      cls: 'attivo',
      sub: `${labs.filter(l => l.stato === 'attivo' && l.piano === 'lab').length} Lab · ${labAttiviRete} Rete`,
    },
    {
      key: 'sospeso',
      label: 'Sospesi',
      count: counts.sospeso,
      cls: 'sospeso',
      sub: counts.sospeso > 0 ? 'Intervento richiesto' : ' ',
    },
    {
      key: 'scaduto',
      label: 'Scaduti',
      count: counts.scaduto,
      cls: 'scaduto',
      sub: ' ',
    },
    {
      key: 'blacklist',
      label: 'Blacklist',
      count: counts.blacklist,
      cls: 'blacklist',
      sub: ' ',
    },
  ]

  return (
    <>
      {/* Stat tiles — click to filter, click again to reset */}
      <div className="adm-stats">
        {statConfig.map(s => (
          <button
            key={s.key}
            type="button"
            className={`adm-stat ${s.cls}${filter === s.key ? ' adm-stat--active' : ''}`}
            onClick={() => setF(s.key)}
            aria-pressed={filter === s.key}
            title={filter === s.key ? 'Clicca per rimuovere filtro' : `Filtra per ${s.label.toLowerCase()}`}
          >
            <span className="adm-stat-label">{s.label}</span>
            <span className="adm-stat-value">{s.count}</span>
            <span className="adm-stat-sub">{s.sub}</span>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="adm-header">
        <div className="adm-title">
          Laboratori
          {filter !== 'tutti' && (
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-t2)', marginLeft: 8 }}>
              · {statConfig.find(s => s.key === filter)?.label}
            </span>
          )}
        </div>
        <div className="adm-controls">
          <Link href="/admin/labs/new" className="adm-btn-cta" onClick={sndClick}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nuovo lab
          </Link>
        </div>
      </div>

      {/* Desktop table */}
      <div className="adm-table-card adm-animate" style={{ animationDelay: '.28s' }}>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Laboratorio</th>
                <th>P.IVA</th>
                <th>Stato</th>
                <th>Piano</th>
                <th>Freq.</th>
                <th>Trial scade</th>
                <th>Creato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(lab => {
                const expiry = trialExpirySub(lab)
                const isYearly = lab.stripe_price_id?.includes('yearly') ?? false
                return (
                  <tr key={lab.id}>
                    <td className="adm-lab-name">
                      <strong>{lab.nome}</strong>
                      {lab.ragione_sociale && lab.ragione_sociale !== lab.nome && (
                        <span>{lab.ragione_sociale}</span>
                      )}
                    </td>
                    <td className="mono">{lab.partita_iva}</td>
                    <td><span className={`adm-badge ${lab.stato}`}>{lab.stato}</span></td>
                    <td>
                      {lab.piano === 'rete'
                        ? <span className="adm-badge rete">Rete</span>
                        : <span className="dim">{lab.piano}</span>}
                    </td>
                    <td>
                      {lab.stato === 'attivo' ? (
                        <span className={`adm-badge ${isYearly ? 'annuale' : 'mensile'}`}>
                          {isYearly ? 'annuale' : 'mensile'}
                        </span>
                      ) : <span className="dim">—</span>}
                    </td>
                    <td
                      className={expiry && ['domani', 'scaduto'].includes(expiry) ? '' : 'dim'}
                      style={expiry === 'domani' || expiry === 'scaduto' ? { color: '#B45309', fontWeight: 700 } : undefined}
                    >
                      {lab.stato === 'trial' ? (expiry ?? '—') : '—'}
                    </td>
                    <td className="dim">
                      {new Date(lab.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td>
                      <Link href={`/admin/labs/${lab.id}`} className="adm-action-link" onClick={sndClick}>
                        Dettagli →
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--adm-t3)', padding: '32px' }}>
                    Nessun laboratorio in questa categoria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="adm-lab-cards">
          {visible.map(lab => {
            const expiry = trialExpirySub(lab)
            const isYearly = lab.stripe_price_id?.includes('yearly') ?? false
            return (
              <Link key={lab.id} href={`/admin/labs/${lab.id}`} className="adm-lab-card" onClick={sndClick}>
                <div className="adm-lab-card-info">
                  <div className="adm-lab-card-name">{lab.nome}</div>
                  <div className="adm-lab-card-sub">{lab.partita_iva}</div>
                </div>
                <div className="adm-lab-card-right">
                  <span className={`adm-badge ${lab.stato}`}>{lab.stato}</span>
                  {lab.piano === 'rete' && <span className="adm-badge rete">Rete</span>}
                  {lab.stato === 'attivo' && (
                    <span className={`adm-badge ${isYearly ? 'annuale' : 'mensile'}`}>
                      {isYearly ? 'annuale' : 'mensile'}
                    </span>
                  )}
                  {lab.stato === 'trial' && expiry && (
                    <span style={{ fontSize: '10px', color: '#B45309', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {expiry}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
