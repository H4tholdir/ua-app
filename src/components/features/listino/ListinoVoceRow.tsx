'use client'

import { useRef, useCallback } from 'react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrezzo(prezzo: number | null): string {
  if (prezzo == null) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(prezzo)
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VoceListino {
  id: string
  codice: string
  nome: string
  descrizione: string | null
  categoria: string
  prezzo_1: number | null
  unita_misura: string
  compenso_tecnico?: number | null
  costo_materiali_estimated?: number | null
}

interface ListinoVoceRowProps {
  voce: VoceListino
  showBorderTop: boolean
  canEdit: boolean  // solo titolare / admin_rete
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ListinoVoceRow({ voce, showBorderTop, canEdit }: ListinoVoceRowProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceRefCosto = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCompensoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim()
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
        const value = raw === '' ? null : parseFloat(raw.replace(',', '.'))
        if (raw !== '' && (isNaN(value as number) || (value as number) < 0)) return

        try {
          await fetch(`/api/listino/${voce.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ compenso_tecnico: value }),
          })
        } catch {
          // Non bloccare l'UI su errore di rete — verrà risincronizzato al prossimo caricamento
        }
      }, 500)
    },
    [voce.id]
  )

  const handleCostoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.trim()
      if (debounceRefCosto.current) clearTimeout(debounceRefCosto.current)

      debounceRefCosto.current = setTimeout(async () => {
        const value = raw === '' ? null : parseFloat(raw.replace(',', '.'))
        if (raw !== '' && (isNaN(value as number) || (value as number) < 0)) return

        try {
          await fetch(`/api/listino/${voce.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ costo_materiali_estimated: value }),
          })
        } catch {
          // Non bloccare l'UI su errore di rete — verrà risincronizzato al prossimo caricamento
        }
      }, 500)
    },
    [voce.id]
  )

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderTop: showBorderTop ? '1px solid var(--elv, #EDEDEA)' : 'none',
      }}
    >
      {/* Info voce */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '8px',
            marginBottom: '2px',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '11px',
              fontWeight: 600,
              color: '#6677AA',
              flexShrink: 0,
            }}
          >
            {voce.codice}
          </span>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--t1, #1C1916)',
              margin: 0,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              whiteSpace: 'normal',
            }}
          >
            {voce.nome}
          </p>
        </div>

        {voce.descrizione && (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '12px',
              color: 'var(--t2, #96918D)',
              margin: '0 0 4px',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              whiteSpace: 'normal',
            }}
          >
            {voce.descrizione}
          </p>
        )}

        {/* Compenso tecnico — solo per titolare/admin_rete */}
        {canEdit && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: 'var(--t3, #B8B3AE)',
                flexShrink: 0,
              }}
            >
              Comp. tecnico:
            </span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '6px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: voce.compenso_tecnico != null
                    ? 'var(--success, #16A34A)'
                    : 'var(--t3, #B8B3AE)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                €
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                defaultValue={voce.compenso_tecnico ?? ''}
                placeholder="—"
                onChange={handleCompensoChange}
                aria-label={`Compenso tecnico per ${voce.nome}`}
                style={{
                  width: '80px',
                  height: '28px',
                  paddingLeft: '18px',
                  paddingRight: '4px',
                  borderRadius: '6px',
                  border: '1px solid var(--elv, #EDEDEA)',
                  background: 'var(--bg, #DDD8D3)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: voce.compenso_tecnico != null
                    ? 'var(--success, #16A34A)'
                    : 'var(--t3, #B8B3AE)',
                  outline: 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>
            {voce.compenso_tecnico == null && (
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: 'var(--t3, #B8B3AE)',
                }}
              >
                non impostato
              </span>
            )}
          </div>
        )}

        {/* costo_materiali_estimated — solo titolare/admin_rete, usato per calcolo margine */}
        {canEdit && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            <span
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: 'var(--t3, #B8B3AE)',
                flexShrink: 0,
              }}
            >
              Costo mat.:
            </span>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '6px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: voce.costo_materiali_estimated != null
                    ? 'var(--t2, #96918D)'
                    : 'var(--t3, #B8B3AE)',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                €
              </span>
              <input
                type="number"
                min={0}
                step={0.01}
                defaultValue={voce.costo_materiali_estimated ?? ''}
                placeholder="—"
                onChange={handleCostoChange}
                aria-label={`Costo materiali stimato per ${voce.nome}`}
                style={{
                  width: '80px',
                  height: '28px',
                  paddingLeft: '18px',
                  paddingRight: '4px',
                  borderRadius: '6px',
                  border: '1px solid var(--elv, #EDEDEA)',
                  background: 'var(--bg, #DDD8D3)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: voce.costo_materiali_estimated != null
                    ? 'var(--t2, #96918D)'
                    : 'var(--t3, #B8B3AE)',
                  outline: 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </div>
            {voce.costo_materiali_estimated == null && (
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  color: 'var(--t3, #B8B3AE)',
                }}
              >
                non impostato
              </span>
            )}
          </div>
        )}
      </div>

      {/* Prezzo */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <span
          style={{
            fontFamily: 'Playfair Display, serif',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--gold, #D4A843)',
            display: 'block',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatPrezzo(voce.prezzo_1)}
        </span>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: '#6677AA',
            margin: 0,
          }}
        >
          /{voce.unita_misura}
        </p>
      </div>
    </div>
  )
}
