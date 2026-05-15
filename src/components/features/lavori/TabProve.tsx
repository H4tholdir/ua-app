'use client'

import { useState, useEffect, useCallback } from 'react'
import { t } from '@/design-system/motion'
import { inputBase, labelStyle, fieldStyle, raisedShadow, insetShadow } from './form/styles'

interface Prova {
  id: string
  numero_prova: number
  data_uscita: string
  data_rientro_prevista: string | null
  data_rientro_effettiva: string | null
  esito: 'ok' | 'modifiche' | 'rifare' | 'sospeso' | null
  note_dentista: string | null
}

interface Props {
  lavoroId: string
  statoLavoro: string
  onProvaInviata?: () => void
  onRientroRegistrato?: () => void
}

const ESITO_LABELS: Record<string, string> = {
  ok: '✅ Approvato',
  modifiche: '🔧 Modifiche richieste',
  rifare: '❌ Da rifare',
  sospeso: '⏸ Sospeso',
}

const ESITO_COLORS: Record<string, { bg: string; color: string }> = {
  ok:        { bg: '#1A3A2A', color: '#2ECC9A' },
  modifiche: { bg: '#2A1E10', color: '#F08C00' },
  rifare:    { bg: '#3A1A1A', color: '#FA5252' },
  sospeso:   { bg: '#1B2D6B', color: '#8899CC' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function ordinale(n: number): string {
  return `${n}ª prova`
}

export function TabProve({ lavoroId, onProvaInviata, onRientroRegistrato }: Props) {
  const [prove, setProve] = useState<Prova[]>([])
  // loading starts true; set to false only inside async callbacks — never synchronously in effect body
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Counter to retrigger the data-fetch effect after mutations
  const [fetchKey, setFetchKey] = useState(0)

  // Form: manda in prova
  const [showForm, setShowForm] = useState(false)
  const [dataRientro, setDataRientro] = useState('')
  const [istruzioni, setIstruzioni] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Rientro inline per ogni prova pendente
  const [rientroEsito, setRientroEsito] = useState<Record<string, 'ok' | 'modifiche' | 'rifare' | 'sospeso'>>({})
  const [rientroNote, setRientroNote] = useState<Record<string, string>>({})
  const [rientroSubmitting, setRientroSubmitting] = useState<Record<string, boolean>>({})

  const reloadProve = useCallback(() => {
    setLoading(true)
    setFetchKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function run() {
      try {
        const res = await fetch(`/api/lavori/${lavoroId}/prove`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Errore ${res.status}`)
        const json = await res.json() as { prove?: Prova[] }
        setProve(json.prove ?? [])
        setError(null)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setError(e instanceof Error ? e.message : 'Errore nel caricamento prove')
      } finally {
        setLoading(false)
      }
    }

    run()

    return () => { controller.abort() }
  }, [lavoroId, fetchKey])

  async function handleMandaInProva() {
    if (!dataRientro) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/prove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_rientro_prevista: dataRientro,
          istruzioni: istruzioni || null,
        }),
      })
      if (!res.ok) throw new Error(`Errore ${res.status}`)
      setShowForm(false)
      setDataRientro('')
      setIstruzioni('')
      reloadProve()
      onProvaInviata?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nell\'invio prova')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegistraRientro(provaId: string) {
    const esito = rientroEsito[provaId]
    if (!esito) return
    setRientroSubmitting((prev) => ({ ...prev, [provaId]: true }))
    try {
      const res = await fetch(`/api/lavori/${lavoroId}/prove/${provaId}/rientro`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data_rientro_effettiva: new Date().toISOString().split('T')[0],
          esito,
          note_dentista: rientroNote[provaId] || null,
        }),
      })
      if (!res.ok) throw new Error(`Errore ${res.status}`)
      reloadProve()
      onRientroRegistrato?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nella registrazione rientro')
    } finally {
      setRientroSubmitting((prev) => ({ ...prev, [provaId]: false }))
    }
  }

  const hasPendingProva = prove.some((p) => !p.data_rientro_effettiva && !p.esito)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        paddingBottom: '24px',
      }}
    >
      {/* Error banner */}
      {error && (
        <div
          role="alert"
          style={{
            background: '#3A1A1A',
            border: '1px solid #FA5252',
            borderRadius: '12px',
            padding: '12px 16px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: '#FA5252',
          }}
        >
          {error}
        </div>
      )}

      {/* Lista prove */}
      {loading ? (
        <div
          role="status"
          aria-label="Caricamento prove"
          style={{
            background: '#1B2D6B',
            borderRadius: '14px',
            padding: '32px 20px',
            textAlign: 'center',
            boxShadow: raisedShadow,
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              color: '#8899CC',
              margin: 0,
            }}
          >
            Caricamento...
          </p>
        </div>
      ) : prove.length === 0 ? (
        <div
          role="status"
          aria-label="Nessuna prova registrata"
          style={{
            background: '#1B2D6B',
            borderRadius: '14px',
            padding: '32px 20px',
            textAlign: 'center',
            boxShadow: raisedShadow,
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              color: '#8899CC',
              margin: 0,
            }}
          >
            Nessuna prova registrata
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {prove.map((prova) => {
            const isPending = !prova.data_rientro_effettiva && !prova.esito
            const esitoColors = prova.esito ? ESITO_COLORS[prova.esito] : null

            return (
              <div
                key={prova.id}
                style={{
                  background: '#1B2D6B',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  boxShadow: raisedShadow,
                }}
              >
                {/* Header prova */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: isPending ? '14px' : '0',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#8899CC',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {ordinale(prova.numero_prova)}
                    </span>
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        color: '#F0F4FF',
                        margin: '2px 0 0',
                      }}
                    >
                      Uscita: {formatDate(prova.data_uscita)}
                      {prova.data_rientro_prevista && (
                        <> · Rientro prev.: {formatDate(prova.data_rientro_prevista)}</>
                      )}
                    </p>
                  </div>

                  {/* Badge stato */}
                  {isPending ? (
                    <span
                      style={{
                        background: '#243580',
                        color: '#D4A843',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        flexShrink: 0,
                        border: '1px solid #D4A84333',
                      }}
                    >
                      Dal dentista
                    </span>
                  ) : prova.esito && esitoColors ? (
                    <span
                      style={{
                        background: esitoColors.bg,
                        color: esitoColors.color,
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        flexShrink: 0,
                      }}
                    >
                      {ESITO_LABELS[prova.esito]}
                    </span>
                  ) : null}
                </div>

                {/* Note dentista (solo se presenti) */}
                {prova.note_dentista && (
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '13px',
                      color: '#8899CC',
                      margin: '8px 0 0',
                      fontStyle: 'italic',
                    }}
                  >
                    &ldquo;{prova.note_dentista}&rdquo;
                  </p>
                )}

                {/* Registra rientro — form inline, solo se prova pendente */}
                {isPending && (
                  <div
                    style={{
                      borderTop: '1px solid #243580',
                      paddingTop: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#8899CC',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        margin: 0,
                      }}
                    >
                      Registra rientro
                    </p>

                    {/* Esito buttons */}
                    <div
                      role="group"
                      aria-label="Esito prova"
                      style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}
                    >
                      {(Object.keys(ESITO_LABELS) as Array<'ok' | 'modifiche' | 'rifare' | 'sospeso'>).map((key) => {
                        const isSelected = rientroEsito[prova.id] === key
                        const colors = ESITO_COLORS[key]
                        return (
                          <button
                            key={key}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() =>
                              setRientroEsito((prev) => ({ ...prev, [prova.id]: key }))
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '36px',
                              minHeight: '44px',
                              padding: '0 12px',
                              borderRadius: '10px',
                              border: 'none',
                              cursor: 'pointer',
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: isSelected ? colors.color : colors.bg,
                              color: isSelected ? '#0F1E52' : colors.color,
                              transition: `background ${t('fast').duration}s, color ${t('fast').duration}s`,
                              boxShadow: isSelected ? insetShadow : 'none',
                            }}
                          >
                            {ESITO_LABELS[key]}
                          </button>
                        )
                      })}
                    </div>

                    {/* Note dentista */}
                    <div style={fieldStyle}>
                      <label
                        htmlFor={`note-${prova.id}`}
                        style={labelStyle}
                      >
                        Note dentista (opz.)
                      </label>
                      <textarea
                        id={`note-${prova.id}`}
                        rows={2}
                        placeholder="Es. rinforza il colletto mesiale..."
                        value={rientroNote[prova.id] ?? ''}
                        onChange={(e) =>
                          setRientroNote((prev) => ({ ...prev, [prova.id]: e.target.value }))
                        }
                        style={{
                          ...inputBase,
                          resize: 'vertical',
                          minHeight: '72px',
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={!rientroEsito[prova.id] || rientroSubmitting[prova.id]}
                      onClick={() => handleRegistraRientro(prova.id)}
                      style={{
                        height: '48px',
                        borderRadius: '12px',
                        border: 'none',
                        background:
                          !rientroEsito[prova.id] || rientroSubmitting[prova.id]
                            ? '#243580'
                            : '#D4A843',
                        color:
                          !rientroEsito[prova.id] || rientroSubmitting[prova.id]
                            ? '#8899CC'
                            : '#0F1E52',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor:
                          !rientroEsito[prova.id] || rientroSubmitting[prova.id]
                            ? 'not-allowed'
                            : 'pointer',
                        transition: `background ${t('fast').duration}s, color ${t('fast').duration}s`,
                        boxShadow:
                          !rientroEsito[prova.id] || rientroSubmitting[prova.id]
                            ? 'none'
                            : '0 0 12px hsl(43 65% 55% / 0.3)',
                      }}
                      aria-busy={rientroSubmitting[prova.id]}
                    >
                      {rientroSubmitting[prova.id] ? 'Registrazione...' : 'Conferma rientro'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Form: manda in prova */}
      {!hasPendingProva && (
        <>
          {!showForm ? (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              style={{
                height: '52px',
                borderRadius: '14px',
                border: '1px dashed #243580',
                background: 'transparent',
                color: '#D4A843',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: `background ${t('fast').duration}s`,
              }}
              aria-label="Manda il lavoro in prova dal dentista"
            >
              + Manda in prova
            </button>
          ) : (
            <div
              style={{
                background: '#1B2D6B',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: raisedShadow,
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#8899CC',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  margin: 0,
                }}
              >
                Nuova prova
              </p>

              <div style={fieldStyle}>
                <label htmlFor="data-rientro-prevista" style={labelStyle}>
                  Data rientro prevista *
                </label>
                <input
                  id="data-rientro-prevista"
                  type="date"
                  required
                  value={dataRientro}
                  onChange={(e) => setDataRientro(e.target.value)}
                  style={inputBase}
                />
              </div>

              <div style={fieldStyle}>
                <label htmlFor="istruzioni-prova" style={labelStyle}>
                  Istruzioni per il dentista (opz.)
                </label>
                <textarea
                  id="istruzioni-prova"
                  rows={3}
                  placeholder="Es. Verificare il margine cervicale, contatto occlusale..."
                  value={istruzioni}
                  onChange={(e) => setIstruzioni(e.target.value)}
                  style={{
                    ...inputBase,
                    resize: 'vertical',
                    minHeight: '88px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setDataRientro('')
                    setIstruzioni('')
                  }}
                  style={{
                    flex: '0 0 auto',
                    height: '48px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#243580',
                    color: '#F0F4FF',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: raisedShadow,
                  }}
                >
                  Annulla
                </button>

                <button
                  type="button"
                  disabled={!dataRientro || submitting}
                  onClick={handleMandaInProva}
                  style={{
                    flex: 1,
                    height: '48px',
                    borderRadius: '12px',
                    border: 'none',
                    background: !dataRientro || submitting ? '#243580' : '#D4A843',
                    color: !dataRientro || submitting ? '#8899CC' : '#0F1E52',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: !dataRientro || submitting ? 'not-allowed' : 'pointer',
                    transition: `background ${t('fast').duration}s, color ${t('fast').duration}s`,
                    boxShadow:
                      !dataRientro || submitting
                        ? 'none'
                        : '0 0 12px hsl(43 65% 55% / 0.3)',
                  }}
                  aria-busy={submitting}
                >
                  {submitting ? 'Invio...' : 'Conferma — manda in prova'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
