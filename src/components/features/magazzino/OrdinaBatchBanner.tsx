'use client'

import { useState, useRef } from 'react'
import { hapticSuccess, hapticError } from '@/lib/feedback/haptic'
import type { ArticoloRowConOrdine } from '@/app/(app)/magazzino/page'

interface OrdinaBatchBannerProps {
  articoliSottoScorta: ArticoloRowConOrdine[]
}

type BatchState =
  | { fase: 'idle' }
  | { fase: 'in_corso'; completati: number; totale: number }
  | { fase: 'completato'; creati: number; saltati: number }
  | { fase: 'errore'; messaggio: string }

export function OrdinaBatchBanner({ articoliSottoScorta }: OrdinaBatchBannerProps) {
  const [stato, setStato] = useState<BatchState>({ fase: 'idle' })
  const abortRef = useRef<AbortController | null>(null)

  // Solo gli articoli con fornitore possono essere ordinati
  const ordinabili = articoliSottoScorta.filter((a) => a.fornitore_id !== null)
  const nonOrdinabili = articoliSottoScorta.length - ordinabili.length
  const totale = articoliSottoScorta.length

  async function handleCreaOrdini() {
    if (ordinabili.length === 0) return

    const controller = new AbortController()
    abortRef.current = controller

    setStato({ fase: 'in_corso', completati: 0, totale: ordinabili.length })

    let creati = 0
    let saltati = 0

    for (let i = 0; i < ordinabili.length; i++) {
      if (controller.signal.aborted) break

      const articolo = ordinabili[i]
      const quantitaOrdinata = Math.max(
        articolo.scorta_minima * 2 - articolo.scorta_attuale,
        articolo.conf_da_ordinare ?? 1
      )

      try {
        const res = await fetch('/api/ordini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            magazzino_id: articolo.id,
            fornitore_id: articolo.fornitore_id,
            quantita_ordinata: quantitaOrdinata,
            unita_misura: articolo.um_acquisto,
          }),
          signal: controller.signal,
        })

        if (res.ok) {
          creati++
        } else {
          saltati++
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') break
        saltati++
      }

      setStato({ fase: 'in_corso', completati: i + 1, totale: ordinabili.length })
    }

    if (controller.signal.aborted) {
      setStato({ fase: 'idle' })
      return
    }

    if (creati > 0) {
      hapticSuccess()
      setStato({ fase: 'completato', creati, saltati })
    } else {
      hapticError()
      setStato({ fase: 'errore', messaggio: 'Nessun ordine creato. Riprova.' })
    }
  }

  function handleInterrompi() {
    abortRef.current?.abort()
  }

  function handleReset() {
    setStato({ fase: 'idle' })
  }

  return (
    <div
      role="region"
      aria-label="Ordini batch per articoli sotto scorta"
      style={{
        margin: '0 20px 16px',
        background: 'rgba(212,168,67,.08)',
        border: '1px solid rgba(212,168,67,.25)',
        borderRadius: 14,
        padding: '14px 16px',
      }}
    >
      {stato.fase === 'idle' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--t1, #1C1916)',
                margin: 0,
              }}
            >
              ⚠ {totale} {totale === 1 ? 'materiale sotto' : 'materiali sotto'} scorta minima
            </p>
            {nonOrdinabili > 0 && (
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12,
                  color: 'var(--t2, #4A3D33)',
                  margin: '2px 0 0',
                }}
              >
                {nonOrdinabili}{' '}
                {nonOrdinabili === 1 ? 'senza fornitore assegnato' : 'senza fornitore assegnati'} — verranno saltati
              </p>
            )}
          </div>

          {ordinabili.length > 0 ? (
            <button
              onClick={handleCreaOrdini}
              aria-label={`Crea ${ordinabili.length} ordini automatici in bozza`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 44,
                padding: '0 18px',
                borderRadius: 100,
                background: 'var(--gold, #D4A843)',
                color: 'var(--t1, #1C1916)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              📦 Crea ordini automatici
            </button>
          ) : (
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                color: 'var(--t2, #4A3D33)',
                margin: 0,
              }}
            >
              Nessun fornitore assegnato — assegna un fornitore agli articoli per ordinare automaticamente
            </p>
          )}
        </div>
      )}

      {stato.fase === 'in_corso' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--t1, #1C1916)',
                margin: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Creazione ordini... ({stato.completati}/{stato.totale})
            </p>
            <button
              onClick={handleInterrompi}
              aria-label="Interrompi creazione ordini"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 36,
                padding: '0 14px',
                borderRadius: 100,
                background: 'rgba(0,0,0,.08)',
                color: 'var(--t1, #1C1916)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Interrompi
            </button>
          </div>
          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={stato.completati}
            aria-valuemin={0}
            aria-valuemax={stato.totale}
            aria-label={`${stato.completati} di ${stato.totale} ordini creati`}
            style={{
              background: 'rgba(212,168,67,.20)',
              borderRadius: 4,
              height: 5,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: 5,
                borderRadius: 4,
                background: 'var(--gold, #D4A843)',
                width: `${Math.round((stato.completati / stato.totale) * 100)}%`,
                transition: 'width var(--tr)',
              }}
            />
          </div>
        </div>
      )}

      {stato.fase === 'completato' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p
              style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--success, #16A34A)',
                margin: 0,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              ✓ {stato.creati} {stato.creati === 1 ? 'ordine creato' : 'ordini creati'} in bozza
            </p>
            {stato.saltati > 0 && (
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12,
                  color: 'var(--t2, #4A3D33)',
                  margin: '2px 0 0',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stato.saltati} saltati per errore
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <a
              href="/ordini"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 44,
                padding: '0 16px',
                borderRadius: 100,
                background: 'var(--gold, #D4A843)',
                color: 'var(--t1, #1C1916)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                flexShrink: 0,
                whiteSpace: 'nowrap',
              }}
            >
              Vai agli ordini →
            </a>
            <button
              onClick={handleReset}
              aria-label="Chiudi notifica"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 36,
                padding: '0 12px',
                borderRadius: 100,
                background: 'rgba(0,0,0,.06)',
                color: 'var(--t2, #4A3D33)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {stato.fase === 'errore' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              color: 'var(--primary, #D90012)',
              margin: 0,
            }}
          >
            {stato.messaggio}
          </p>
          <button
            onClick={handleReset}
            aria-label="Riprova"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 44,
              padding: '0 16px',
              borderRadius: 100,
              background: 'var(--gold, #D4A843)',
              color: 'var(--t1, #1C1916)',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 14,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Riprova
          </button>
        </div>
      )}
    </div>
  )
}
