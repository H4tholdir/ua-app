'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'

const TIPI_INCIDENTE = [
  { value: 'anomalia', label: 'Anomalia' },
  { value: 'incidente', label: 'Incidente' },
  { value: 'incidente_grave', label: 'Incidente grave' },
  { value: 'azione_correttiva_sicurezza', label: 'Azione correttiva per la sicurezza' },
] as const

const GRAVITA_INCIDENTE = [
  { value: 'lieve', label: 'Lieve', color: '#D4A843' },
  { value: 'moderata', label: 'Moderata', color: '#FD7E14' },
  { value: 'grave', label: 'Grave', color: 'var(--primary, #D90012)' },
  { value: 'critica', label: 'Critica', color: 'var(--primary, #D90012)' },
] as const

type TipoIncidente = typeof TIPI_INCIDENTE[number]['value']
type GravitaIncidente = typeof GRAVITA_INCIDENTE[number]['value']

const fontFamily = "'DM Sans', system-ui, sans-serif"

const fieldStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'var(--prs, #D4CFC9)',
  border: 'none',
  borderRadius: '10px',
  color: 'var(--t1, #1C1916)',
  fontFamily,
  fontSize: '15px',
  padding: '12px 14px',
  outline: 'none',
  boxShadow: 'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily,
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--t2, #96918D)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '6px',
}

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: '18px',
}

export default function NuovoIncidentePage() {
  const router = useRouter()

  const [tipo, setTipo] = useState<TipoIncidente | ''>('')
  const [gravita, setGravita] = useState<GravitaIncidente | ''>('')
  const [dataEvento, setDataEvento] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [causaProbabile, setCausaProbabile] = useState('')
  const [azioneImmediata, setAzioneImmediata] = useState('')
  const [azioneCorrettiva, setAzioneCorrettiva] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function validate(): string | null {
    if (!tipo) return 'Seleziona il tipo di evento.'
    if (!gravita) return 'Seleziona la gravita.'
    if (!dataEvento) return 'Inserisci la data dell\'evento.'
    if (!descrizione.trim()) return 'La descrizione e obbligatoria.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/qualita/incidenti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          gravita,
          data_evento: dataEvento,
          descrizione: descrizione.trim(),
          causa_probabile: causaProbabile.trim() || null,
          azione_immediata: azioneImmediata.trim() || null,
          azione_correttiva: azioneCorrettiva.trim() || null,
        }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Errore ${res.status}`)
      }

      router.push('/qualita')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSubmitting(false)
    }
  }

  const selectStyle: React.CSSProperties = {
    ...fieldStyle,
    appearance: 'none',
    cursor: 'pointer',
  }

  return (
    <PageWrapper>
      <AppHeader
        title="Nuovo incidente MDR"
        subtitle="Art. 87-88 MDR 2017/745"
        backHref="/qualita"
      />

      <form onSubmit={handleSubmit} noValidate style={{ padding: '0 20px 32px' }}>

        {/* Tipo */}
        <div style={fieldGroupStyle}>
          <label htmlFor="tipo" style={labelStyle}>
            Tipo evento <span style={{ color: 'var(--primary, #D90012)' }}>*</span>
          </label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => { setTipo(e.target.value as TipoIncidente); setError(null) }}
            required
            style={selectStyle}
          >
            <option value="" disabled style={{ background: 'var(--bg, #DDD8D3)' }}>
              Seleziona tipo...
            </option>
            {TIPI_INCIDENTE.map((t) => (
              <option key={t.value} value={t.value} style={{ background: 'var(--surface, #E4DFD9)' }}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Gravita */}
        <div style={fieldGroupStyle}>
          <label htmlFor="gravita" style={labelStyle}>
            Gravita <span style={{ color: 'var(--primary, #D90012)' }}>*</span>
          </label>
          <select
            id="gravita"
            value={gravita}
            onChange={(e) => { setGravita(e.target.value as GravitaIncidente); setError(null) }}
            required
            style={selectStyle}
          >
            <option value="" disabled style={{ background: 'var(--bg, #DDD8D3)' }}>
              Seleziona gravita...
            </option>
            {GRAVITA_INCIDENTE.map((g) => (
              <option key={g.value} value={g.value} style={{ background: 'var(--surface, #E4DFD9)' }}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {/* Data evento */}
        <div style={fieldGroupStyle}>
          <label htmlFor="data_evento" style={labelStyle}>
            Data evento <span style={{ color: 'var(--primary, #D90012)' }}>*</span>
          </label>
          <input
            id="data_evento"
            type="date"
            value={dataEvento}
            onChange={(e) => { setDataEvento(e.target.value); setError(null) }}
            required
            style={{
              ...fieldStyle,
              colorScheme: 'dark',
            }}
          />
        </div>

        {/* Descrizione */}
        <div style={fieldGroupStyle}>
          <label htmlFor="descrizione" style={labelStyle}>
            Descrizione <span style={{ color: 'var(--primary, #D90012)' }}>*</span>
          </label>
          <textarea
            id="descrizione"
            value={descrizione}
            onChange={(e) => { setDescrizione(e.target.value); setError(null) }}
            required
            rows={4}
            placeholder="Descrivi l'evento in modo preciso e oggettivo..."
            style={{
              ...fieldStyle,
              resize: 'vertical',
              minHeight: '100px',
              lineHeight: '1.5',
            }}
          />
        </div>

        {/* Causa probabile */}
        <div style={fieldGroupStyle}>
          <label htmlFor="causa_probabile" style={labelStyle}>
            Causa probabile
          </label>
          <textarea
            id="causa_probabile"
            value={causaProbabile}
            onChange={(e) => setCausaProbabile(e.target.value)}
            rows={3}
            placeholder="Identificazione delle cause radice..."
            style={{
              ...fieldStyle,
              resize: 'vertical',
              lineHeight: '1.5',
            }}
          />
        </div>

        {/* Azione immediata */}
        <div style={fieldGroupStyle}>
          <label htmlFor="azione_immediata" style={labelStyle}>
            Azione immediata
          </label>
          <textarea
            id="azione_immediata"
            value={azioneImmediata}
            onChange={(e) => setAzioneImmediata(e.target.value)}
            rows={3}
            placeholder="Azioni intraprese immediatamente per contenere l'evento..."
            style={{
              ...fieldStyle,
              resize: 'vertical',
              lineHeight: '1.5',
            }}
          />
        </div>

        {/* Azione correttiva */}
        <div style={fieldGroupStyle}>
          <label htmlFor="azione_correttiva" style={labelStyle}>
            Azione correttiva
          </label>
          <textarea
            id="azione_correttiva"
            value={azioneCorrettiva}
            onChange={(e) => setAzioneCorrettiva(e.target.value)}
            rows={3}
            placeholder="Azioni per prevenire il ripetersi dell'evento (CAPA)..."
            style={{
              ...fieldStyle,
              resize: 'vertical',
              lineHeight: '1.5',
            }}
          />
        </div>

        {/* Alert gravita critica */}
        {(gravita === 'grave' || gravita === 'critica') && (
          <div
            role="note"
            style={{
              background: '#3A1A1A',
              border: '1px solid rgba(217,0,18,0.20)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
            }}
          >
            <p style={{
              color: 'var(--primary, #D90012)',
              fontSize: '13px',
              fontFamily,
              margin: '0 0 2px',
              fontWeight: 700,
            }}>
              Incidente {gravita} — obbligo di segnalazione
            </p>
            <p style={{
              color: '#C87070',
              fontSize: '12px',
              fontFamily,
              margin: 0,
              lineHeight: '1.5',
            }}>
              MDR Art. 87(1): segnalare al Ministero della Salute entro 15 giorni dall&apos;accaduto.
            </p>
          </div>
        )}

        {/* Errore */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              background: '#3A1A1A',
              border: '1px solid rgba(217,0,18,0.20)',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '18px',
              color: 'var(--primary, #D90012)',
              fontSize: '14px',
              fontFamily,
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          style={{
            width: '100%',
            height: '52px',
            borderRadius: '14px',
            border: 'none',
            cursor: submitting ? 'not-allowed' : 'pointer',
            background: submitting ? '#9B7A30' : '#D4A843',
            color: 'var(--t1, #1C1916)',
            fontFamily,
            fontSize: '16px',
            fontWeight: 700,
            boxShadow: submitting ? 'none' : '0 0 20px hsl(43 65% 55% / 0.4)',
            opacity: submitting ? 0.75 : 1,
            transition: 'opacity 0.14s, box-shadow 0.14s',
          }}
        >
          {submitting ? 'Salvataggio...' : 'Registra incidente'}
        </button>

      </form>
    </PageWrapper>
  )
}
