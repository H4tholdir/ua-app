// src/components/features/scadenzario/TabellaFatture.tsx
'use client'

import { useState } from 'react'
import type { DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, urgencyColor, labelStatoSDI, labelOrigine } from './estratto-conto-shared'

type SortKey = 'data' | 'totale' | 'origine' | 'giorni_ritardo'
type SortDir = 'asc' | 'desc'

export function TabellaFatture({
  dovuti,
  onTap,
}: {
  dovuti: DovutoEstratto[]
  onTap: (d: DovutoEstratto) => void
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

  const sorted = [...dovuti].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'data') cmp = new Date(a.data).getTime() - new Date(b.data).getTime()
    else if (sortKey === 'totale') cmp = (a.pagata ? a.totale : a.residuo) - (b.pagata ? b.totale : b.residuo)
    else if (sortKey === 'origine') cmp = a.origine.localeCompare(b.origine)
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
            <th style={thStyle('origine')} onClick={() => handleSort('origine')}>
              Origine {sortKey === 'origine' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
            </th>
            <th style={{ ...thStyle('totale'), textAlign: 'right' }} onClick={() => handleSort('totale')}>
              Residuo {sortKey === 'totale' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
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
          {sorted.map((d, i) => {
            const color = urgencyColor(d)
            return (
              <tr
                key={d.id}
                style={{
                  borderBottom: i < sorted.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none',
                  cursor: 'pointer',
                }}
                onClick={() => onTap(d)}
              >
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: DS.t1,
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>N. {d.numero}</div>
                  <div style={{ fontSize: 11, color: DS.t2, marginTop: 2 }}>{formatData(d.data)}</div>
                </td>
                <td style={{ padding: '12px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2 }}>
                  {labelOrigine(d.origine)}
                  {d.origine === 'fattura' && (
                    <div style={{ fontSize: 11, marginTop: 2 }}>{labelStatoSDI(d.stato_sdi ?? 'draft')}</div>
                  )}
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
                  {fmt.format(d.pagata ? d.totale : d.residuo)}
                </td>
                <td style={{
                  padding: '12px 12px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 13,
                  color: d.pagata ? DS.t3 : color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {d.pagata ? '—' : `${d.giorni_ritardo}gg`}
                </td>
                <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onTap(d) }}
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
