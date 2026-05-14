'use client'

import type { Lavoro, TipoDispositivo, PrioritaLavoro } from '@/types/domain'

// ─── Stili condivisi ──────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  background: '#0F1E52',
  border: '1px solid #243580',
  color: '#F0F4FF',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow:
    'inset 3px 3px 8px hsl(230 100% 4% / 0.8), inset -2px -2px 6px hsl(220 80% 35% / 0.4)',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: '#8899CC',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em',
  marginBottom: '6px',
}

const fieldStyle: React.CSSProperties = {
  marginBottom: '18px',
}

// ─── Opzioni tipo dispositivo ─────────────────────────────────
const TIPO_OPTIONS: Array<{ value: TipoDispositivo; label: string }> = [
  { value: 'protesi_fissa',   label: 'Protesi fissa' },
  { value: 'protesi_mobile',  label: 'Protesi mobile' },
  { value: 'implantologia',   label: 'Implantologia' },
  { value: 'cad_cam',         label: 'CAD/CAM' },
  { value: 'scheletrato',     label: 'Scheletrato' },
  { value: 'ortodonzia',      label: 'Ortodonzia' },
  { value: 'provvisorio',     label: 'Provvisorio' },
  { value: 'riparazione',     label: 'Riparazione' },
  { value: 'altro',           label: 'Altro' },
]

const PRIORITA_OPTIONS: Array<{ value: PrioritaLavoro; label: string }> = [
  { value: 'normale',      label: 'Normale' },
  { value: 'urgente',      label: 'Urgente' },
  { value: 'extra_urgente', label: 'Extra urgente' },
]

interface TabDatiProps {
  data: Partial<Lavoro>
  onChange: (updates: Partial<Lavoro>) => void
}

export function TabDati({ data, onChange }: TabDatiProps) {
  return (
    <div>
      {/* 1. Tipo dispositivo */}
      <div style={fieldStyle}>
        <label htmlFor="tipo_dispositivo" style={labelStyle}>
          Tipo dispositivo <span aria-hidden="true" style={{ color: '#FA5252' }}>*</span>
        </label>
        <select
          id="tipo_dispositivo"
          name="tipo_dispositivo"
          required
          value={data.tipo_dispositivo ?? ''}
          onChange={(e) =>
            onChange({ tipo_dispositivo: e.target.value as TipoDispositivo })
          }
          style={{
            ...inputBase,
            appearance: 'none',
            cursor: 'pointer',
          }}
          aria-required="true"
        >
          <option value="" disabled>
            Seleziona tipo...
          </option>
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Descrizione */}
      <div style={fieldStyle}>
        <label htmlFor="descrizione" style={labelStyle}>
          Descrizione <span aria-hidden="true" style={{ color: '#FA5252' }}>*</span>
        </label>
        <textarea
          id="descrizione"
          name="descrizione"
          required
          rows={3}
          placeholder="Es. Corona ceramica 14, colore A2"
          value={data.descrizione ?? ''}
          onChange={(e) => onChange({ descrizione: e.target.value })}
          style={{
            ...inputBase,
            resize: 'vertical',
            minHeight: '80px',
          }}
          aria-required="true"
        />
      </div>

      {/* 3. Richiedente */}
      <div style={fieldStyle}>
        <label htmlFor="richiedente_nome" style={labelStyle}>
          Medico richiedente
        </label>
        <input
          id="richiedente_nome"
          name="richiedente_nome"
          type="text"
          placeholder="Dott. Cognome Nome"
          value={data.richiedente_nome ?? ''}
          onChange={(e) => onChange({ richiedente_nome: e.target.value || null })}
          style={inputBase}
        />
      </div>

      {/* 4. Data consegna + ora */}
      <div
        style={{
          ...fieldStyle,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
        }}
      >
        <div>
          <label htmlFor="data_consegna_prevista" style={labelStyle}>
            Data consegna <span aria-hidden="true" style={{ color: '#FA5252' }}>*</span>
          </label>
          <input
            id="data_consegna_prevista"
            name="data_consegna_prevista"
            type="date"
            required
            value={data.data_consegna_prevista ?? ''}
            onChange={(e) => onChange({ data_consegna_prevista: e.target.value })}
            style={{
              ...inputBase,
              colorScheme: 'dark',
            }}
            aria-required="true"
          />
        </div>
        <div>
          <label htmlFor="ora_consegna" style={labelStyle}>
            Ora consegna
          </label>
          <input
            id="ora_consegna"
            name="ora_consegna"
            type="time"
            value={data.ora_consegna ?? ''}
            onChange={(e) => onChange({ ora_consegna: e.target.value || null })}
            style={{
              ...inputBase,
              colorScheme: 'dark',
            }}
          />
        </div>
      </div>

      {/* 5. Priorità */}
      <div style={fieldStyle}>
        <label htmlFor="priorita" style={labelStyle}>
          Priorità
        </label>
        <select
          id="priorita"
          name="priorita"
          value={data.priorita ?? 'normale'}
          onChange={(e) => onChange({ priorita: e.target.value as PrioritaLavoro })}
          style={{
            ...inputBase,
            appearance: 'none',
            cursor: 'pointer',
          }}
        >
          {PRIORITA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* 6. Dispositivo semilavorato */}
      <div
        style={{
          ...fieldStyle,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <input
          id="dispositivo_semilavorato"
          name="dispositivo_semilavorato"
          type="checkbox"
          checked={data.dispositivo_semilavorato ?? false}
          onChange={(e) => onChange({ dispositivo_semilavorato: e.target.checked })}
          style={{
            width: '20px',
            height: '20px',
            minWidth: '20px',
            cursor: 'pointer',
            accentColor: '#D4A843',
          }}
        />
        <label
          htmlFor="dispositivo_semilavorato"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: '#F0F4FF',
            cursor: 'pointer',
          }}
        >
          Dispositivo semilavorato
        </label>
      </div>

      {/* 7. Note interne */}
      <div style={fieldStyle}>
        <label htmlFor="note_interne" style={labelStyle}>
          Note interne
        </label>
        <textarea
          id="note_interne"
          name="note_interne"
          rows={2}
          placeholder="Note visibili solo al laboratorio..."
          value={data.note_interne ?? ''}
          onChange={(e) => onChange({ note_interne: e.target.value || null })}
          style={{
            ...inputBase,
            resize: 'vertical',
          }}
        />
      </div>
    </div>
  )
}
