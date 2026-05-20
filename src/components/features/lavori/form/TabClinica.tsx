'use client'

import type { Lavoro } from '@/types/domain'
import { inputBase, labelStyle, fieldStyle, sectionSeparator, sectionTitle } from './styles'
import { OdontogrammaFDI } from '../../odontogramma/OdontogrammaFDI'

// ─── Scala VITA completa ────────────────────────────────────
const VITA_SCALE = [
  'A1', 'A2', 'A3', 'A3.5', 'A4',
  'B1', 'B2', 'B3', 'B4',
  'C1', 'C2', 'C3', 'C4',
  'D2', 'D3', 'D4',
  'T', 'BL', 'OM',
] as const

interface TabClinicaProps {
  data: Partial<Lavoro>
  onChange: (u: Partial<Lavoro>) => void
}

export function TabClinica({ data, onChange }: TabClinicaProps) {
  return (
    <div>
      {/* ═══ ODONTOGRAMMA ══════════════════════════════════════ */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionTitle}>Odontogramma FDI</p>
        <OdontogrammaFDI
          selezionati={(data.denti_coinvolti ?? []).map(Number).filter(Boolean)}
          mancanti={data.denti_mancanti ?? []}
          impianti={data.denti_impianti ?? []}
          onSelezionati={(v: number[]) => onChange({ denti_coinvolti: v.map(String) })}
          onMancanti={(v: number[]) => onChange({ denti_mancanti: v })}
          onImpianti={(v: number[]) => onChange({ denti_impianti: v })}
        />
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
              accentColor: 'var(--gold, #D4A843)',
            }}
          />
          <label
            htmlFor="anamnesi_bruxismo"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              color: 'var(--t1, #1C1916)',
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
