'use client'

import type { Lavoro } from '@/types/domain'
import { inputBase, labelStyle, fieldStyle, sectionSeparator, sectionTitle, insetShadow, raisedShadow } from './styles'

// ─── Scala VITA completa ────────────────────────────────────
const VITA_SCALE = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'T', 'BL', 'OM',
] as const

// ─── Odontogramma FDI — layout adulto ────────────────────────
// Riga 1: superiore destra (destra → centro)
// Riga 2: superiore sinistra (centro → sinistra)
// Riga 3: inferiore destra (destra → centro)
// Riga 4: inferiore sinistra (centro → sinistra)
const DENTI_ROWS = [
  [18, 17, 16, 15, 14, 13, 12, 11],
  [21, 22, 23, 24, 25, 26, 27, 28],
  [48, 47, 46, 45, 44, 43, 42, 41],
  [31, 32, 33, 34, 35, 36, 37, 38],
] as const

interface TabClinicaProps {
  data: Partial<Lavoro>
  onChange: (u: Partial<Lavoro>) => void
}

export function TabClinica({ data, onChange }: TabClinicaProps) {
  const dentiCoinvolti = data.denti_coinvolti ?? []

  function toggleDente(num: number) {
    const key = String(num)
    const isSelected = dentiCoinvolti.includes(key)
    const updated = isSelected
      ? dentiCoinvolti.filter((d) => d !== key)
      : [...dentiCoinvolti, key]
    onChange({ denti_coinvolti: updated })
  }

  return (
    <div>
      {/* ═══ ODONTOGRAMMA ══════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionTitle}>Odontogramma FDI</p>

        {DENTI_ROWS.map((row, rowIdx) => {
          // Separatore tra le due arcate (dopo riga 1 e riga 2)
          const isAfterSuperioreFine = rowIdx === 2

          return (
            <div key={rowIdx}>
              {/* Separatore arcate */}
              {isAfterSuperioreFine && (
                <div
                  aria-hidden="true"
                  style={{
                    height: '1px',
                    background: '#243580',
                    margin: '10px 0',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#0F1E52',
                      padding: '0 8px',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#8899CC',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    — arcata inferiore —
                  </span>
                </div>
              )}

              {/* Etichetta arcata */}
              {rowIdx === 0 && (
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#8899CC',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    margin: '0 0 8px',
                  }}
                >
                  Arcata superiore
                </p>
              )}

              <div
                role="group"
                aria-label={
                  rowIdx < 2
                    ? `Superiore ${rowIdx === 0 ? 'destra' : 'sinistra'}`
                    : `Inferiore ${rowIdx === 2 ? 'destra' : 'sinistra'}`
                }
                style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: rowIdx === 1 ? '0' : '6px',
                  flexWrap: 'nowrap',
                }}
              >
                {row.map((num) => {
                  const key = String(num)
                  const selected = dentiCoinvolti.includes(key)
                  return (
                    <button
                      key={num}
                      type="button"
                      aria-label={`Dente ${num}`}
                      aria-pressed={selected}
                      onClick={() => toggleDente(num)}
                      style={{
                        width: '36px',
                        height: '36px',
                        minWidth: '36px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: selected ? '#D4A843' : '#243580',
                        color: selected ? '#0F1E52' : '#8899CC',
                        boxShadow: selected
                          ? insetShadow
                          : '-2px -2px 5px hsl(220 80% 35% / 0.4), 3px 3px 8px hsl(230 100% 4% / 0.8)',
                        flexShrink: 0,
                        transition: 'background 0.08s, color 0.08s',
                      }}
                    >
                      {num}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Sintesi denti selezionati */}
        {dentiCoinvolti.length > 0 && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: '#8899CC',
              marginTop: '10px',
              marginBottom: 0,
            }}
            aria-live="polite"
          >
            Selezionati:{' '}
            <strong style={{ color: '#F0F4FF' }}>
              {dentiCoinvolti
                .map(Number)
                .sort((a, b) => a - b)
                .join(', ')}
            </strong>
          </p>
        )}
      </div>

      <div style={sectionSeparator} />

      {/* ═══ COLORI ════════════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionTitle}>Colori</p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
          }}
        >
          {/* Colore dente */}
          <div style={fieldStyle}>
            <label htmlFor="colore_dente" style={labelStyle}>
              Colore dente
            </label>
            <select
              id="colore_dente"
              value={data.colore_dente ?? ''}
              onChange={(e) => onChange({ colore_dente: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Colore collo */}
          <div style={fieldStyle}>
            <label htmlFor="colore_collo" style={labelStyle}>
              Colore collo
            </label>
            <select
              id="colore_collo"
              value={data.colore_collo ?? ''}
              onChange={(e) => onChange({ colore_collo: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Colore corpo */}
          <div style={fieldStyle}>
            <label htmlFor="colore_corpo" style={labelStyle}>
              Colore corpo
            </label>
            <select
              id="colore_corpo"
              value={data.colore_corpo ?? ''}
              onChange={(e) => onChange({ colore_corpo: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Colore incisale */}
          <div style={fieldStyle}>
            <label htmlFor="colore_incisale" style={labelStyle}>
              Colore incisale
            </label>
            <select
              id="colore_incisale"
              value={data.colore_incisale ?? ''}
              onChange={(e) => onChange({ colore_incisale: e.target.value || null })}
              style={{ ...inputBase, appearance: 'none', cursor: 'pointer' }}
            >
              <option value="">—</option>
              {VITA_SCALE.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Effetti speciali */}
        <div style={fieldStyle}>
          <label htmlFor="effetti_speciali" style={labelStyle}>
            Effetti speciali
          </label>
          <input
            id="effetti_speciali"
            type="text"
            placeholder="Es. caratterizzazioni, crack, macchie..."
            value={data.effetti_speciali ?? ''}
            onChange={(e) => onChange({ effetti_speciali: e.target.value || null })}
            style={inputBase}
          />
        </div>

        {/* Tecnica colore */}
        <div style={fieldStyle}>
          <label htmlFor="tecnica_colore" style={labelStyle}>
            Tecnica colore
          </label>
          <input
            id="tecnica_colore"
            type="text"
            placeholder="Es. layering, cut-back, monolitico..."
            value={data.tecnica_colore ?? ''}
            onChange={(e) => onChange({ tecnica_colore: e.target.value || null })}
            style={inputBase}
          />
        </div>
      </div>

      <div style={sectionSeparator} />

      {/* ═══ ANAMNESI ══════════════════════════════════════════ */}
      <div>
        <p style={sectionTitle}>Anamnesi</p>

        {/* Bruxismo */}
        <div
          style={{
            ...fieldStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <input
            id="anamnesi_bruxismo"
            type="checkbox"
            checked={data.anamnesi_bruxismo ?? false}
            onChange={(e) => onChange({ anamnesi_bruxismo: e.target.checked })}
            style={{
              width: '20px',
              height: '20px',
              minWidth: '20px',
              cursor: 'pointer',
              accentColor: '#D4A843',
            }}
          />
          <label
            htmlFor="anamnesi_bruxismo"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              color: '#F0F4FF',
              cursor: 'pointer',
            }}
          >
            Paziente bruxista
          </label>
        </div>

        {/* Precauzioni */}
        <div style={fieldStyle}>
          <label htmlFor="anamnesi_precauzioni" style={labelStyle}>
            Precauzioni
          </label>
          <textarea
            id="anamnesi_precauzioni"
            rows={2}
            placeholder="Indicare eventuali precauzioni specifiche..."
            value={data.anamnesi_precauzioni ?? ''}
            onChange={(e) => onChange({ anamnesi_precauzioni: e.target.value || null })}
            style={{ ...inputBase, resize: 'vertical' }}
          />
        </div>

        {/* Altri dispositivi */}
        <div style={fieldStyle}>
          <label htmlFor="anamnesi_altri_dispositivi" style={labelStyle}>
            Altri dispositivi in bocca
          </label>
          <textarea
            id="anamnesi_altri_dispositivi"
            rows={2}
            placeholder="Es. impianti, protesi, apparecchi..."
            value={data.anamnesi_altri_dispositivi ?? ''}
            onChange={(e) =>
              onChange({ anamnesi_altri_dispositivi: e.target.value || null })
            }
            style={{ ...inputBase, resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  )
}
