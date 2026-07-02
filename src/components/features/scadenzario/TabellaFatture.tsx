'use client'

import { useState } from 'react'
import type { FatturaEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, urgencyColor, urgencyPillBg, urgencyPillBorder, urgencyEmoji, labelStatoSDI } from './estratto-conto-shared'

type SortKey = 'data' | 'totale' | 'stato_sdi' | 'giorni_ritardo'
type SortDir = 'asc' | 'desc'

export function TabellaFatture({
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
