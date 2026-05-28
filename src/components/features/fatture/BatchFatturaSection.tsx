'use client'

import { useState } from 'react'
import type { BatchResult } from '@/app/api/fatture/batch/route'

export interface LavoroProntoFattura {
  id: string
  numero_lavoro: string
  cliente: {
    id: string
    nome: string
    cognome: string
    studio_nome: string | null
  } | null
  prezzo_unitario: number | null
  data_consegna_effettiva: string | null
}

interface BatchFatturaSectionProps {
  lavoriPronti: LavoroProntoFattura[]
}

function formatImporto(n: number | null): string {
  if (n == null) return ''
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDataIT(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export function BatchFatturaSection({ lavoriPronti: initialLavori }: BatchFatturaSectionProps) {
  const [lavoriPronti, setLavoriPronti] = useState(initialLavori)
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [risultato, setRisultato] = useState<{ generati: number; errori: number } | null>(null)
  const [erroriDettaglio, setErroriDettaglio] = useState<BatchResult[]>([])

  if (!lavoriPronti.length) return null

  const tuttiSelezionati = selected.length === lavoriPronti.length && lavoriPronti.length > 0

  const toggleAll = () => {
    setSelected(tuttiSelezionati ? [] : lavoriPronti.map((l) => l.id))
  }

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const handleBatch = async () => {
    if (!selected.length || loading) return

    setLoading(true)
    setRisultato(null)
    setErroriDettaglio([])

    try {
      const res = await fetch('/api/fatture/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lavoro_ids: selected }),
      })

      const data = await res.json()

      if (!res.ok) {
        setRisultato({ generati: 0, errori: selected.length })
        setErroriDettaglio([])
        return
      }

      const results: BatchResult[] = data.results ?? []
      const errori: BatchResult[] = results.filter((r) => !r.ok)
      const okIds = new Set(results.filter((r) => r.ok).map((r) => r.lavoro_id))

      // Rimuovi i lavori fatturati con successo dalla lista
      setLavoriPronti((prev) => prev.filter((l) => !okIds.has(l.id)))
      setSelected((prev) => prev.filter((id) => !okIds.has(id)))

      setRisultato({ generati: data.generati ?? 0, errori: data.errori ?? 0 })
      setErroriDettaglio(errori)
    } catch {
      setRisultato({ generati: 0, errori: selected.length })
    } finally {
      setLoading(false)
    }
  }

  const buttonActive = selected.length > 0 && !loading

  return (
    <div
      style={{
        margin: '0 20px 24px',
        background: 'var(--sfc, #E4DFD9)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow:
          '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px 10px',
          borderBottom: '1px solid var(--prs, #D4CFC9)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Icona lista */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ color: 'var(--primary, #D90012)', flexShrink: 0 }}
          >
            <rect x="2" y="3" width="12" height="1.4" rx=".7" fill="currentColor" />
            <rect x="2" y="7.3" width="8" height="1.4" rx=".7" fill="currentColor" />
            <rect x="2" y="11.6" width="10" height="1.4" rx=".7" fill="currentColor" />
          </svg>
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 700,
              color: 'var(--t1, #1C1916)',
            }}
          >
            {lavoriPronti.length}{' '}
            {lavoriPronti.length === 1 ? 'lavoro pronto' : 'lavori pronti'} da fatturare
          </span>
        </div>

        <button
          type="button"
          onClick={toggleAll}
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--primary, #D90012)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            lineHeight: 1,
          }}
        >
          {tuttiSelezionati ? 'Deseleziona tutti' : 'Seleziona tutti'}
        </button>
      </div>

      {/* Lista lavori */}
      <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0' }}>
        {lavoriPronti.map((l) => {
          const clienteNome = l.cliente
            ? l.cliente.studio_nome ?? `${l.cliente.nome} ${l.cliente.cognome}`
            : '—'
          const isChecked = selected.includes(l.id)

          return (
            <li key={l.id}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: isChecked ? 'rgba(217,0,18,.05)' : 'transparent',
                  transition: 'background 0.1s',
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => toggleOne(l.id, e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    accentColor: 'var(--primary, #D90012)',
                    flexShrink: 0,
                  }}
                  aria-label={`Seleziona lavoro ${l.numero_lavoro}`}
                />

                {/* Testo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 6,
                      marginBottom: 1,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--t1, #1C1916)',
                      }}
                    >
                      {l.numero_lavoro}
                    </span>
                    {l.data_consegna_effettiva && (
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '11px',
                          color: 'var(--t3, #6B5C51)',
                        }}
                      >
                        {formatDataIT(l.data_consegna_effettiva)}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '13px',
                      color: 'var(--t2, #4A3D33)',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {clienteNome}
                  </span>
                </div>

                {/* Importo */}
                {l.prezzo_unitario != null && l.prezzo_unitario > 0 && (
                  <span
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--c-amber, #F59E0B)',
                      flexShrink: 0,
                    }}
                  >
                    {formatImporto(l.prezzo_unitario)}
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>

      {/* Feedback risultato */}
      {risultato && (
        <div style={{ padding: '8px 16px 0' }}>
          {risultato.generati > 0 && (
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                color: 'var(--success, #16A34A)',
                margin: '0 0 4px',
              }}
            >
              {risultato.generati}{' '}
              {risultato.generati === 1 ? 'fattura generata' : 'fatture generate'} con successo
            </p>
          )}
          {erroriDettaglio.map((r) => (
            <p
              key={r.lavoro_id}
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: 'var(--primary, #D90012)',
                margin: '0 0 2px',
              }}
            >
              {r.numero_lavoro}: {r.error}
            </p>
          ))}
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: '12px 16px 14px' }}>
        <button
          type="button"
          onClick={handleBatch}
          disabled={!buttonActive}
          style={{
            width: '100%',
            padding: '13px',
            background: buttonActive ? 'var(--primary, #D90012)' : 'var(--prs, #D4CFC9)',
            color: buttonActive ? '#fff' : 'var(--t3, #6B5C51)',
            borderRadius: '12px',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 700,
            fontSize: '15px',
            border: 'none',
            cursor: buttonActive ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s, color 0.15s',
          }}
          aria-busy={loading}
        >
          {loading
            ? 'Generazione in corso...'
            : selected.length > 0
              ? `Fattura ${selected.length} ${selected.length === 1 ? 'selezionato' : 'selezionati'}`
              : 'Seleziona lavori da fatturare'}
        </button>
      </div>
    </div>
  )
}
