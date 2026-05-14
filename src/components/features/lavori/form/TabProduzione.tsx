'use client'

import type { LavoroFase } from '@/types/domain'
import { raisedShadow } from './styles'

interface TabProduzioneProps {
  fasi: LavoroFase[]
  onUpdateFase: (id: string, updates: Partial<LavoroFase>) => void
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
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
    bg: '#1A3A2A',
    bgActive: '#2ECC9A',
    color: '#2ECC9A',
    colorActive: '#0F1E52',
  },
  non_conforme: {
    label: 'Non conf.',
    bg: '#3A1A1A',
    bgActive: '#FA5252',
    color: '#FA5252',
    colorActive: '#0F1E52',
  },
  parziale: {
    label: 'Parziale',
    bg: '#2A1E10',
    bgActive: '#F08C00',
    color: '#F08C00',
    colorActive: '#0F1E52',
  },
} as const

type EsitoKey = keyof typeof ESITO_CONFIG

export function TabProduzione({ fasi, onUpdateFase }: TabProduzioneProps) {
  if (fasi.length === 0) {
    return (
      <div
        style={{
          background: '#1B2D6B',
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
            color: '#8899CC',
            margin: 0,
          }}
        >
          Nessuna fase — assegna un ciclo nella tab Dati.
        </p>
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

        return (
          <div
            key={fase.id}
            style={{
              background: '#1B2D6B',
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
                    color: '#8899CC',
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
                    color: '#F0F4FF',
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
                    color: '#8899CC',
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
                      onUpdateFase(fase.id, {
                        esito: isActive ? null : key,
                        eseguita_at: isActive ? null : now,
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
                      transition: 'background 0.08s, color 0.08s',
                      boxShadow: isActive
                        ? 'inset 2px 2px 5px hsl(230 100% 4% / 0.4)'
                        : 'none',
                    }}
                  >
                    {config.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
