'use client'

import { useId } from 'react'
import type { LavoroLavorazione } from '@/types/domain'
import { inputBase, raisedShadow } from './styles'

interface TabLavorazioniProps {
  lavorazioni: LavoroLavorazione[]
  lavoro_id: string
  onChange: (rows: LavoroLavorazione[]) => void
}

function computeImporto(row: LavoroLavorazione): number {
  return (
    row.quantita *
    row.prezzo_unitario *
    (1 + row.maggiorazione / 100) *
    (1 - row.sconto_percentuale / 100)
  )
}

function formatEur(n: number): string {
  return n.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// ─── Stili cella tabella ─────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding: '8px 6px',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid rgba(0,0,0,.06)',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 4px',
  verticalAlign: 'middle',
}

const cellInput: React.CSSProperties = {
  ...inputBase,
  padding: '7px 8px',
  fontSize: '13px',
  borderRadius: '8px',
  minWidth: 0,
}

const numberInput: React.CSSProperties = {
  ...cellInput,
  textAlign: 'right',
  width: '100%',
}

export function TabLavorazioni({ lavorazioni, lavoro_id, onChange }: TabLavorazioniProps) {
  const baseId = useId()

  function updateRow(index: number, updates: Partial<LavoroLavorazione>) {
    const rows = lavorazioni.map((r, i) => {
      if (i !== index) return r
      const updated = { ...r, ...updates }
      updated.importo = computeImporto(updated)
      return updated
    })
    onChange(rows)
  }

  function removeRow(index: number) {
    onChange(lavorazioni.filter((_, i) => i !== index))
  }

  function addRow() {
    const newRow: LavoroLavorazione = {
      id: `new-${Date.now()}`,
      laboratorio_id: '',
      lavoro_id,
      listino_id: null,
      codice: '',
      descrizione: '',
      quantita: 1,
      unita_misura: 'pz',
      prezzo_unitario: 0,
      sconto_percentuale: 0,
      maggiorazione: 0,
      importo: 0,
      calo: null,
      codice_iva: 'N4',
      natura_iva: 'N4',
      esterna: false,
      lab_esterno: null,
      ordine: lavorazioni.length,
    }
    onChange([...lavorazioni, newRow])
  }

  // Footer totali
  const totaleGenerale = lavorazioni.reduce((s, r) => s + r.importo, 0)
  const totaleMateriali = lavorazioni
    .filter((r) => r.codice.startsWith('M'))
    .reduce((s, r) => s + r.importo, 0)
  const totaleLavori = totaleGenerale - totaleMateriali

  return (
    <div>
      {/* Griglia scrollabile su mobile */}
      <div style={{ overflowX: 'auto', marginBottom: '16px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '680px',
          }}
          aria-label="Righe lavorazioni"
        >
          <thead>
            <tr>
              <th style={{ ...thStyle, minWidth: '90px' }}>Codice</th>
              <th style={{ ...thStyle, minWidth: '56px' }}>Q.tà</th>
              <th style={{ ...thStyle, minWidth: '52px' }}>U.M.</th>
              <th style={{ ...thStyle, minWidth: '80px' }}>Prezzo €</th>
              <th style={{ ...thStyle, minWidth: '64px' }}>Magg.%</th>
              <th style={{ ...thStyle, minWidth: '60px' }}>Sc.%</th>
              <th style={{ ...thStyle, minWidth: '60px' }}>Calo g</th>
              <th style={{ ...thStyle, minWidth: '80px', textAlign: 'right' }}>Importo €</th>
              <th style={{ ...thStyle, width: '36px', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {lavorazioni.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: '24px 0',
                    textAlign: 'center',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    color: 'var(--t2, #4A3D33)',
                  }}
                >
                  Nessuna lavorazione — usa il pulsante sotto per aggiungere
                </td>
              </tr>
            )}
            {lavorazioni.map((row, i) => (
              <tr key={row.id} style={{ borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                {/* Codice */}
                <td style={tdStyle}>
                  <input
                    id={`${baseId}-codice-${i}`}
                    aria-label={`Codice riga ${i + 1}`}
                    type="text"
                    value={row.codice}
                    onChange={(e) => updateRow(i, { codice: e.target.value })}
                    placeholder="COD"
                    style={cellInput}
                  />
                </td>
                {/* Quantità */}
                <td style={tdStyle}>
                  <input
                    aria-label={`Quantità riga ${i + 1}`}
                    type="number"
                    min={0}
                    step={0.5}
                    value={row.quantita}
                    onChange={(e) =>
                      updateRow(i, { quantita: parseFloat(e.target.value) || 0 })
                    }
                    style={numberInput}
                  />
                </td>
                {/* Unità misura */}
                <td style={tdStyle}>
                  <input
                    aria-label={`Unità misura riga ${i + 1}`}
                    type="text"
                    value={row.unita_misura}
                    onChange={(e) => updateRow(i, { unita_misura: e.target.value })}
                    placeholder="pz"
                    style={cellInput}
                  />
                </td>
                {/* Prezzo */}
                <td style={tdStyle}>
                  <input
                    aria-label={`Prezzo unitario riga ${i + 1}`}
                    type="number"
                    min={0}
                    step={0.01}
                    value={row.prezzo_unitario}
                    onChange={(e) =>
                      updateRow(i, { prezzo_unitario: parseFloat(e.target.value) || 0 })
                    }
                    style={numberInput}
                  />
                </td>
                {/* Maggiorazione */}
                <td style={tdStyle}>
                  <input
                    aria-label={`Maggiorazione % riga ${i + 1}`}
                    type="number"
                    min={0}
                    step={0.5}
                    value={row.maggiorazione}
                    onChange={(e) =>
                      updateRow(i, { maggiorazione: parseFloat(e.target.value) || 0 })
                    }
                    style={numberInput}
                  />
                </td>
                {/* Sconto */}
                <td style={tdStyle}>
                  <input
                    aria-label={`Sconto % riga ${i + 1}`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={row.sconto_percentuale}
                    onChange={(e) =>
                      updateRow(i, { sconto_percentuale: parseFloat(e.target.value) || 0 })
                    }
                    style={numberInput}
                  />
                </td>
                {/* Calo */}
                <td style={tdStyle}>
                  <input
                    aria-label={`Calo grammi riga ${i + 1}`}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="g"
                    value={row.calo ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      updateRow(i, { calo: v === '' ? null : parseFloat(v) || null })
                    }}
                    style={numberInput}
                  />
                </td>
                {/* Importo */}
                <td
                  style={{
                    ...tdStyle,
                    textAlign: 'right',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--t1, #1C1916)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatEur(row.importo)}
                </td>
                {/* Rimuovi */}
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <button
                    type="button"
                    aria-label={`Rimuovi riga ${i + 1}`}
                    onClick={() => removeRow(i)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'rgba(217,0,18,.10)',
                      border: 'none',
                      color: 'var(--primary, #D90012)',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 2l8 8M10 2l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pulsante aggiungi */}
      <button
        type="button"
        onClick={addRow}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          border: '1.5px dashed rgba(0,0,0,.06)',
          background: 'transparent',
          color: 'var(--t2, #4A3D33)',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '24px',
          minHeight: '52px',
        }}
        aria-label="Aggiungi lavorazione"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Aggiungi lavorazione
      </button>

      {/* Footer totali */}
      <div
        style={{
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '14px',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 24px',
          boxShadow: raisedShadow,
        }}
        aria-label="Totali lavorazioni"
      >
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--t2, #4A3D33)',
          }}
        >
          Lavori:{' '}
          <strong style={{ color: 'var(--t1, #1C1916)' }}>€{formatEur(totaleLavori)}</strong>
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--t2, #4A3D33)',
          }}
        >
          Materiali:{' '}
          <strong style={{ color: 'var(--t1, #1C1916)' }}>€{formatEur(totaleMateriali)}</strong>
        </span>
        <span
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            fontWeight: 700,
            color: 'var(--c-amber, #F59E0B)',
            marginLeft: 'auto',
          }}
        >
          Totale: €{formatEur(totaleGenerale)}
        </span>
      </div>
    </div>
  )
}
