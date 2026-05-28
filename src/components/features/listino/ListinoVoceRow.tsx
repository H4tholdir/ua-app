'use client'

import { useRef, useCallback, useState } from 'react'
import { ListinoEditSheet } from './ListinoEditSheet'

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
  prezzo_2?: number | null
  prezzo_3?: number | null
  prezzo_4?: number | null
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
  const [deleted, setDeleted] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = useCallback(async () => {
    if (!window.confirm(`Eliminare "${voce.nome}" dal listino?`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/listino/${voce.id}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleted(true)
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Errore durante l\'eliminazione')
      }
    } catch {
      alert('Errore di rete — riprova')
    } finally {
      setDeleting(false)
    }
  }, [voce.id, voce.nome])

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

  if (deleted) return null

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
              color: 'var(--t2, #4A3D33)',
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
              color: 'var(--t2, #4A3D33)',
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
                color: 'var(--t3, #6B5C51)',
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
                    : 'var(--t3, #6B5C51)',
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
                    : 'var(--t3, #6B5C51)',
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
                  color: 'var(--t3, #6B5C51)',
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
                color: 'var(--t3, #6B5C51)',
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
                    ? 'var(--t2, #4A3D33)'
                    : 'var(--t3, #6B5C51)',
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
                    ? 'var(--t2, #4A3D33)'
                    : 'var(--t3, #6B5C51)',
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
                  color: 'var(--t3, #6B5C51)',
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
            color: 'var(--c-amber, #F59E0B)',
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
            color: 'var(--t2, #4A3D33)',
            margin: 0,
          }}
        >
          /{voce.unita_misura}
        </p>
      </div>

      {/* Modifica + Elimina — solo titolare/admin_rete */}
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <ListinoEditSheet
            voce={{
              id: voce.id,
              nome: voce.nome,
              codice: voce.codice,
              categoria: voce.categoria,
              unita_misura: voce.unita_misura,
              descrizione: voce.descrizione,
              prezzo_1: voce.prezzo_1,
              prezzo_2: voce.prezzo_2 ?? null,
              prezzo_3: voce.prezzo_3 ?? null,
              prezzo_4: voce.prezzo_4 ?? null,
            }}
            onSaved={() => window.location.reload()}
          />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            aria-label={`Elimina ${voce.nome} dal listino`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              minHeight: '44px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: deleting ? 'wait' : 'pointer',
              color: 'var(--t3, #6B5C51)',
              flexShrink: 0,
              padding: 0,
              opacity: deleting ? 0.5 : 1,
              transition: 'color var(--tr)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#D90012' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3, #6B5C51)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
