'use client'

import { useEffect, useState } from 'react'
import type { Lavoro, TipoDispositivo, PrioritaLavoro } from '@/types/domain'
import { ClienteComboBox } from '@/components/features/clienti/ClienteComboBox'

interface StudioMember {
  id: string
  nome: string
  cognome: string
  studio_nome: string | null
}

// ─── Stili condivisi ──────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '12px',
  background: 'var(--bg, #DDD8D3)',
  border: '1px solid rgba(0,0,0,.06)',
  color: 'var(--t1, #1C1916)',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '15px',
  boxShadow:
    'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--t2, #4A3D33)',
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
  clienteId?: string
  onClienteChange?: (id: string, label: string) => void
  fieldErrors?: Record<string, string>
}

const errorStyle: React.CSSProperties = {
  color: 'var(--primary, #D90012)',
  fontSize: 12,
  marginTop: 4,
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
}

export function TabDati({ data, onChange, clienteId, onClienteChange, fieldErrors }: TabDatiProps) {
  const [studioMembers, setStudioMembers] = useState<StudioMember[]>([])

  // Carica i medici dello stesso studio quando cambia il cliente
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!clienteId) {
        if (!cancelled) setStudioMembers([])
        return
      }
      try {
        const r = await fetch(`/api/clienti/${clienteId}/studio-members`)
        const members: StudioMember[] = r.ok ? await r.json() : []
        if (!cancelled) setStudioMembers(Array.isArray(members) ? members : [])
      } catch {
        if (!cancelled) setStudioMembers([])
      }
    }
    void load()
    return () => { cancelled = true }
  }, [clienteId])

  // Mostra chips solo se ci sono almeno 2 medici nello studio
  const showChips = studioMembers.length >= 1

  return (
    <div>
      {/* 0. Dentista / Studio (solo se il callback è fornito) */}
      {onClienteChange && (
        <div style={fieldStyle}>
          <label htmlFor="field-cliente_id" style={labelStyle}>
            Dentista / Studio{' '}
            <span aria-hidden="true" style={{ color: 'var(--primary, #D90012)' }}>*</span>
          </label>
          <ClienteComboBox
            id="field-cliente_id"
            value={clienteId ?? ''}
            onChange={onClienteChange}
            placeholder="Cerca dentista o studio..."
            hasError={!!fieldErrors?.['cliente_id']}
          />
          {fieldErrors?.['cliente_id'] && (
            <span
              id="error-cliente_id"
              role="alert"
              style={errorStyle}
            >
              {fieldErrors['cliente_id']}
            </span>
          )}
        </div>
      )}

      {/* 1. Tipo dispositivo */}
      <div style={fieldStyle}>
        <label htmlFor="tipo_dispositivo" style={labelStyle}>
          Tipo dispositivo <span aria-hidden="true" style={{ color: 'var(--primary, #D90012)' }}>*</span>
        </label>
        <select
          id="field-tipo_dispositivo"
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
            borderColor: fieldErrors?.['tipo_dispositivo'] ? 'var(--primary, #D90012)' : undefined,
          }}
          aria-required="true"
          aria-describedby={fieldErrors?.['tipo_dispositivo'] ? 'error-tipo_dispositivo' : undefined}
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
        {fieldErrors?.['tipo_dispositivo'] && (
          <span
            id="error-tipo_dispositivo"
            role="alert"
            style={errorStyle}
          >
            {fieldErrors['tipo_dispositivo']}
          </span>
        )}
      </div>

      {/* 2. Descrizione */}
      <div style={fieldStyle}>
        <label htmlFor="descrizione" style={labelStyle}>
          Descrizione <span aria-hidden="true" style={{ color: 'var(--primary, #D90012)' }}>*</span>
        </label>
        <textarea
          id="field-descrizione"
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
            borderColor: fieldErrors?.['descrizione'] ? 'var(--primary, #D90012)' : undefined,
          }}
          aria-required="true"
          aria-describedby={fieldErrors?.['descrizione'] ? 'error-descrizione' : undefined}
        />
        {fieldErrors?.['descrizione'] && (
          <span
            id="error-descrizione"
            role="alert"
            style={errorStyle}
          >
            {fieldErrors['descrizione']}
          </span>
        )}
      </div>

      {/* 3. Richiedente */}
      <div style={fieldStyle}>
        <label htmlFor="richiedente_nome" style={labelStyle}>
          Medico richiedente
        </label>

        {/* Chip row shortcut — visibile solo se lo studio ha più medici */}
        {showChips && (
          <div
            role="group"
            aria-label="Seleziona medico richiedente dallo studio"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            {studioMembers.map((m) => {
              const chipLabel = `${m.cognome} ${m.nome.charAt(0)}.`
              const isActive = data.richiedente_nome === chipLabel
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChange({ richiedente_nome: chipLabel })}
                  aria-pressed={isActive}
                  aria-label={`Seleziona ${chipLabel}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    minHeight: '44px',
                    padding: '0 14px',
                    borderRadius: '100px',
                    border: isActive
                      ? '1.5px solid var(--primary, #D90012)'
                      : '1.5px solid rgba(0,0,0,.10)',
                    background: isActive
                      ? 'rgba(217,0,18,.08)'
                      : 'var(--elv, #EDEDEA)',
                    color: isActive
                      ? 'var(--primary, #D90012)'
                      : 'var(--t1, #1C1916)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    minWidth: '44px',
                    boxShadow: isActive
                      ? 'none'
                      : '-2px -2px 5px rgba(255,255,255,.72), 3px 4px 8px -1px rgba(148,128,118,.28)',
                    transition: 'background 0.14s, border-color 0.14s, color 0.14s',
                  }}
                >
                  {chipLabel}
                </button>
              )
            })}
            {/* Chip "+ Nuovo": deseleziona richiedente e lascia spazio per digitare */}
            <button
              type="button"
              onClick={() => onChange({ richiedente_nome: '' })}
              aria-label="Inserisci un nuovo medico richiedente"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: '44px',
                padding: '0 12px',
                borderRadius: '100px',
                border: '1.5px dashed rgba(0,0,0,.15)',
                background: 'transparent',
                color: 'var(--t3, #6B5C51)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Nuovo
            </button>
          </div>
        )}

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
            Data consegna <span aria-hidden="true" style={{ color: 'var(--primary, #D90012)' }}>*</span>
          </label>
          <input
            id="field-data_consegna_prevista"
            name="data_consegna_prevista"
            type="date"
            required
            lang="it"
            value={data.data_consegna_prevista ?? ''}
            onChange={(e) => onChange({ data_consegna_prevista: e.target.value })}
            style={{
              ...inputBase,
              colorScheme: 'light',
              borderColor: fieldErrors?.['data_consegna_prevista'] ? 'var(--primary, #D90012)' : undefined,
            }}
            aria-required="true"
            aria-describedby={fieldErrors?.['data_consegna_prevista'] ? 'error-data_consegna_prevista' : undefined}
          />
          {fieldErrors?.['data_consegna_prevista'] && (
            <span
              id="error-data_consegna_prevista"
              role="alert"
              style={errorStyle}
            >
              {fieldErrors['data_consegna_prevista']}
            </span>
          )}
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
              colorScheme: 'light',
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
            accentColor: 'var(--gold, #D4A843)',
          }}
        />
        <label
          htmlFor="dispositivo_semilavorato"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: 'var(--t1, #1C1916)',
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
