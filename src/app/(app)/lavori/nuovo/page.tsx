'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { LavoroFormShell, type TabId } from '@/components/features/lavori/form/LavoroFormShell'
import { TabDati } from '@/components/features/lavori/form/TabDati'
import { TabAccettazione } from '@/components/features/lavori/form/TabAccettazione'
import type { Lavoro } from '@/types/domain'
import { soundNuovoLavoro } from '@/lib/feedback/sounds'

const DISABLED_TAB_MESSAGE = 'Salva prima i dati principali per abilitare questa tab.'

// Tab abilitabili solo dopo la creazione del lavoro
const DISABLED_TABS: TabId[] = [
  'lavorazioni',
  'clinica',
  'produzione',
  'prove',
  'date',
  'immagini',
  'documenti',
]

// Maps logical field names to their DOM element ids (for auto-focus on error)
const FIELD_TO_DOM_ID: Record<string, string> = {
  cliente_id: 'field-cliente_id',
  tipo_dispositivo: 'field-tipo_dispositivo',
  descrizione: 'field-descrizione',
  data_consegna_prevista: 'field-data_consegna_prevista',
}

const REQUIRED_FIELDS = ['cliente_id', 'tipo_dispositivo', 'descrizione', 'data_consegna_prevista'] as const
type RequiredField = typeof REQUIRED_FIELDS[number]

function validateField(field: RequiredField, value: unknown): string {
  switch (field) {
    case 'cliente_id': return !value ? 'Seleziona il dentista' : ''
    case 'tipo_dispositivo': return !value ? 'Seleziona il tipo di dispositivo' : ''
    case 'descrizione': return !String(value ?? '').trim() ? 'Inserisci una descrizione' : ''
    case 'data_consegna_prevista': return !value ? 'Inserisci la data di consegna' : ''
  }
}

function getLastClienteId(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('ua_last_cliente_id') ?? ''
}

export default function NuovoLavoroPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<Partial<Lavoro>>({
    tipo_dispositivo: undefined,
    descrizione: '',
    data_consegna_prevista: '',
    ora_consegna: null,
    richiedente_nome: null,
    priorita: 'normale',
    dispositivo_semilavorato: false,
    note_interne: null,
  })
  const [clienteId, setClienteId] = useState(getLastClienteId)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = useCallback((updates: Partial<Lavoro>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    setError(null)
    // Real-time: clear errors for fields being edited
    setFieldErrors((prev) => {
      const next = { ...prev }
      for (const k of Object.keys(updates)) delete next[k]
      return next
    })
  }, [])

  const handleClienteChange = useCallback((id: string) => {
    setClienteId(id)
    setError(null)
    if (id) {
      // Persist last used cliente for next form session
      localStorage.setItem('ua_last_cliente_id', id)
      // Real-time: clear cliente_id error when a dentista is selected
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next['cliente_id']
        return next
      })
    }
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Validate all required fields at once
    const fieldValues: Record<RequiredField, unknown> = {
      cliente_id: clienteId,
      tipo_dispositivo: formData.tipo_dispositivo,
      descrizione: formData.descrizione,
      data_consegna_prevista: formData.data_consegna_prevista,
    }
    const errors: Record<string, string> = {}
    for (const field of REQUIRED_FIELDS) {
      const err = validateField(field, fieldValues[field])
      if (err) errors[field] = err
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      // Auto-focus first error field
      const firstField = REQUIRED_FIELDS.find((f) => errors[f])
      if (firstField) {
        const domId = FIELD_TO_DOM_ID[firstField]
        const el = document.getElementById(domId)
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el?.focus()
      }
      return
    }
    setFieldErrors({})

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/lavori', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, cliente_id: clienteId }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? `Errore ${res.status}`)
      }

      const { lavoro } = await res.json()
      soundNuovoLavoro()
      router.push(`/lavori/${lavoro.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <AppHeader
        title="Nuovo lavoro"
        backHref="/lavori"
      />

      <form onSubmit={handleSubmit} noValidate>
        <LavoroFormShell defaultTab="dati" isCreating={true}>
          {(activeTab) => {
            // Tab abilitata anche prima della creazione: Accettazione MDR
            if (activeTab === 'accettazione') {
              return <TabAccettazione data={formData} onChange={handleChange} />
            }

            // Tab disabilitata prima della creazione
            if (DISABLED_TABS.includes(activeTab)) {
              return (
                <div
                  style={{
                    padding: '32px 0',
                    textAlign: 'center',
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '14px',
                      color: 'var(--t2, #4A3D33)',
                      margin: 0,
                    }}
                  >
                    {DISABLED_TAB_MESSAGE}
                  </p>
                </div>
              )
            }

            return (
              <TabDati
                data={formData}
                onChange={handleChange}
                clienteId={clienteId}
                onClienteChange={handleClienteChange}
                fieldErrors={fieldErrors}
              />
            )
          }}
        </LavoroFormShell>

        {/* Errore di validazione */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              margin: '0 20px 16px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(217,0,18,.08)',
              border: '1px solid rgba(217,0,18,.25)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              color: 'var(--primary, #D90012)',
            }}
          >
            {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ padding: '16px 20px 0' }}>
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '52px',
              borderRadius: '14px',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: submitting ? '#9B2A2A' : 'var(--primary, #D90012)',
              color: '#fff',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              boxShadow: submitting
                ? 'none'
                : '0 0 20px hsl(43 65% 55% / 0.4)',
              opacity: submitting ? 0.75 : 1,
              transition: 'opacity var(--tr), box-shadow var(--tr)',
            }}
          >
            {submitting ? (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,.4)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Creazione in corso...
              </>
            ) : (
              <>
                Crea lavoro{' '}
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Spinner keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageWrapper>
  )
}
