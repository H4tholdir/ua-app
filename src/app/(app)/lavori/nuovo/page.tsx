'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppHeader } from '@/components/layout/AppHeader'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { LavoroFormShell, type TabId } from '@/components/features/lavori/form/LavoroFormShell'
import { TabDati } from '@/components/features/lavori/form/TabDati'
import { TabAccettazione } from '@/components/features/lavori/form/TabAccettazione'
import type { Lavoro } from '@/types/domain'

const DISABLED_TAB_MESSAGE = 'Salva prima i dati principali per abilitare questa tab.'

// Tab abilitabili solo dopo la creazione del lavoro
const DISABLED_TABS: TabId[] = [
  'lavorazioni',
  'clinica',
  'produzione',
  'date',
  'immagini',
  'documenti',
]

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
  const [clienteId, setClienteId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = useCallback((updates: Partial<Lavoro>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
    setError(null)
  }, [])

  const handleClienteChange = useCallback((id: string) => {
    setClienteId(id)
    setError(null)
  }, [])

  // Validazione client
  function validate(): string | null {
    if (!clienteId) return 'Seleziona un dentista.'
    if (!formData.tipo_dispositivo) return 'Seleziona il tipo di dispositivo.'
    if (!formData.descrizione?.trim()) return 'Inserisci una descrizione.'
    if (!formData.data_consegna_prevista) return 'Inserisci la data di consegna.'
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

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
        <LavoroFormShell defaultTab="dati">
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
                      color: 'var(--t2, #96918D)',
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
              transition: 'opacity 0.14s, box-shadow 0.14s',
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
