'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LavoroFase } from '@/types/domain'
import { raisedShadow } from './styles'

interface TabProduzioneProps {
  fasi: LavoroFase[]
  onUpdateFase: (id: string, updates: Partial<LavoroFase>) => void
  hasCiclo: boolean
}

function formatTimestamp(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Colore pulsante per esito
const ESITO_CONFIG = {
  ok: {
    label: 'OK',
    bg: 'rgba(22,163,74,.10)',
    bgActive: 'var(--success, #16A34A)',
    color: 'var(--success, #16A34A)',
    colorActive: '#fff',
  },
  non_conforme: {
    label: 'Non conf.',
    bg: 'rgba(217,0,18,.10)',
    bgActive: 'var(--primary, #D90012)',
    color: 'var(--primary, #D90012)',
    colorActive: '#fff',
  },
  parziale: {
    label: 'Parziale',
    bg: 'rgba(249,115,22,.10)',
    bgActive: 'var(--urgente, #F97316)',
    color: 'var(--urgente, #F97316)',
    colorActive: '#fff',
  },
} as const

type EsitoKey = keyof typeof ESITO_CONFIG

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'DM Sans, sans-serif',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--t2, #4A3D33)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '4px',
}

export function TabProduzione({ fasi, onUpdateFase, hasCiclo }: TabProduzioneProps) {
  // Bozza locale per Azione correttiva: si scrive mentre l'utente digita,
  // si invia solo su blur (evita una PATCH per ogni carattere).
  const [azioneDraft, setAzioneDraft] = useState<Record<string, string>>({})

  if (fasi.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '14px',
          padding: '32px 20px',
          textAlign: 'center',
          boxShadow: raisedShadow,
        }}
        role="status"
        aria-label="Nessuna fase disponibile"
      >
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: 'var(--t2, #4A3D33)',
            margin: 0,
          }}
        >
          {hasCiclo
            ? 'Ciclo assegnato ma nessuna fase ancora definita per questo ciclo.'
            : 'Nessuna fase — assegna un ciclo nella tab Dati.'}
        </p>
        {hasCiclo && (
          <Link
            href="/cicli-produzione"
            style={{
              display: 'inline-block',
              marginTop: '10px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--primary, #D90012)',
              textDecoration: 'none',
            }}
          >
            Definisci le fasi di questo ciclo →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {fasi.map((fase) => {
        const esitoAttuale = fase.esito as EsitoKey | null
        const azioneValue = azioneDraft[fase.id] ?? fase.azione_correttiva ?? ''

        return (
          <div
            key={fase.id}
            style={{
              background: 'var(--surface, #E4DFD9)',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: raisedShadow,
            }}
          >
            {/* Intestazione fase */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginBottom: '10px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--t2, #4A3D33)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {fase.fase.codice_fase}
                </span>
                <p
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--t1, #1C1916)',
                    margin: '2px 0 0',
                  }}
                >
                  {fase.fase.descrizione}
                </p>
              </div>

              {/* Timestamp esecuzione */}
              {fase.eseguita_at && (
                <span
                  style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    color: 'var(--t2, #4A3D33)',
                    flexShrink: 0,
                  }}
                >
                  {formatTimestamp(fase.eseguita_at)}
                </span>
              )}
            </div>

            {/* Pulsanti esito */}
            <div
              role="group"
              aria-label={`Esito fase ${fase.fase.codice_fase}`}
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              {(Object.keys(ESITO_CONFIG) as EsitoKey[]).map((key) => {
                const config = ESITO_CONFIG[key]
                const isActive = esitoAttuale === key
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      const now = new Date().toISOString()
                      const nextEsito = isActive ? null : key
                      onUpdateFase(fase.id, {
                        esito: nextEsito,
                        eseguita_at: nextEsito ? now : null,
                        non_conforme: nextEsito === 'non_conforme',
                      })
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '36px',
                      minHeight: '44px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: isActive ? config.bgActive : config.bg,
                      color: isActive ? config.colorActive : config.color,
                      transition: 'background var(--tr), color var(--tr)',
                      boxShadow: isActive
                        ? 'var(--sh-i, inset 3px 3px 8px rgba(0,0,0,.13), inset -2px -2px 5px rgba(255,255,255,.70))'
                        : 'none',
                    }}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>

            {/* Azione correttiva — solo se la fase è segnata non conforme */}
            {esitoAttuale === 'non_conforme' && (
              <div style={{ marginTop: '10px' }}>
                <label htmlFor={`azione-correttiva-${fase.id}`} style={labelStyle}>
                  Azione correttiva
                </label>
                <textarea
                  id={`azione-correttiva-${fase.id}`}
                  rows={2}
                  placeholder="Cosa è stato fatto per correggere la non conformità..."
                  value={azioneValue}
                  onChange={(e) =>
                    setAzioneDraft((prev) => ({ ...prev, [fase.id]: e.target.value }))
                  }
                  onBlur={(e) => onUpdateFase(fase.id, { azione_correttiva: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'var(--bg, #DDD8D3)',
                    border: '1px solid var(--prs, #D4CFC9)',
                    color: 'var(--t1, #1C1916)',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    resize: 'vertical',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
