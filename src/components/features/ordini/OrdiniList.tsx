'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { t, staggerDelay, useReducedMotion } from '@/design-system/motion'
import { NuovoOrdineSheet } from './NuovoOrdineSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import type { OrdineRow, ArticoloSottoScorta } from '@/app/(app)/ordini/page'

// ─── Colori dot per stato ──────────────────────────────────────
const STATO_COLOR: Record<string, string> = {
  bozza:          'var(--t3, #B8B3AE)',
  inviato:        'var(--gold, #D4A843)',
  evaso_parziale: '#2563EB',
  evaso:          'var(--success, #16A34A)',
  annullato:      'var(--primary, #D90012)',
  archiviato:     'var(--t3, #B8B3AE)',
}

const STATO_LABEL: Record<string, string> = {
  bozza:          'Bozza',
  inviato:        'Inviato',
  evaso_parziale: 'Parziale',
  evaso:          'Evaso',
  annullato:      'Annullato',
  archiviato:     'Archiviato',
}

function formatData(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

interface OrdiniListProps {
  ordini: OrdineRow[]
  articoliSottoScorta: ArticoloSottoScorta[]
}

export function OrdiniList({ ordini, articoliSottoScorta }: OrdiniListProps) {
  const [showNuovoSheet, setShowNuovoSheet] = useState(false)
  const [localOrdini, setLocalOrdini] = useState<OrdineRow[]>(ordini)
  const reducedMotion = useReducedMotion()

  const handleOrdineCreato = (nuovoOrdine: OrdineRow) => {
    setLocalOrdini((prev) => [nuovoOrdine, ...prev])
    setShowNuovoSheet(false)
  }

  return (
    <>
      <NuovoOrdineSheet
        open={showNuovoSheet}
        articoliSottoScorta={articoliSottoScorta}
        onClose={() => setShowNuovoSheet(false)}
        onOrdineCreato={handleOrdineCreato}
      />

      <div style={{ padding: '0 20px 120px' }}>
        {/* Banner alert scorta */}
        {articoliSottoScorta.length > 0 && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'rgba(212,168,67,.12)',
              border: '1.5px solid rgba(212,168,67,.30)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span aria-hidden="true" style={{ fontSize: '18px', flexShrink: 0 }}>⚠</span>
              <span
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#8A6B00',
                }}
              >
                {articoliSottoScorta.length === 1
                  ? '1 materiale sotto scorta minima'
                  : `${articoliSottoScorta.length} materiali sotto scorta minima`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNuovoSheet(true)}
              aria-label="Ordina materiali sotto scorta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                minHeight: '44px',
                padding: '0 12px',
                borderRadius: '100px',
                border: 'none',
                background: 'var(--gold, #D4A843)',
                color: 'var(--t1, #1C1916)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Ordina →
            </button>
          </div>
        )}

        {/* Lista ordini */}
        {localOrdini.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Nessun ordine aperto"
            description="Quando i materiali raggiungono la scorta minima, apri un ordine al fornitore."
            cta={{ label: '+ Nuovo ordine', onClick: () => setShowNuovoSheet(true) }}
          />
        ) : (
          <ul
            style={{
              listStyle: 'none',
              margin: 0,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
            aria-label="Lista ordini fornitori"
          >
            <AnimatePresence initial={false}>
              {localOrdini.map((ordine, i) => (
                <motion.li
                  key={ordine.id}
                  initial={reducedMotion ? false : { opacity: 0, transform: 'translateY(12px)' }}
                  animate={{ opacity: 1, transform: 'translateY(0px)' }}
                  exit={reducedMotion ? undefined : { opacity: 0, transform: 'translateY(-8px)' }}
                  transition={reducedMotion ? undefined : {
                    delay: i * staggerDelay(Math.min(localOrdini.length, 8)),
                    ...t('normal', 'enter'),
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '16px',
                      background: 'var(--sfc, #E4DFD9)',
                      boxShadow: '-5px -5px 11px rgba(255,255,255,.72), 9px 12px 22px -4px rgba(148,128,118,.40)',
                    }}
                  >
                    {/* Dot stato */}
                    <span
                      aria-hidden="true"
                      style={{
                        width: '10px',
                        height: '10px',
                        minWidth: '10px',
                        borderRadius: '50%',
                        background: STATO_COLOR[ordine.stato] ?? 'var(--t3)',
                        flexShrink: 0,
                      }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: '0 0 2px',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--t1, #1C1916)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {ordine.materiale_nome ?? ordine.numero_ordine}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                          color: 'var(--t2, #96918D)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {ordine.fornitore_nome ?? '—'}
                        {ordine.data_ordine ? ` · ${formatData(ordine.data_ordine)}` : ''}
                      </p>
                    </div>

                    {/* Quantità + badge stato */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '4px',
                        flexShrink: 0,
                      }}
                    >
                      {ordine.quantita_ordinata != null && (
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--t1, #1C1916)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {ordine.quantita_ordinata} {ordine.unita_misura ?? 'pz'}
                        </span>
                      )}
                      <span
                        aria-label={`Stato: ${STATO_LABEL[ordine.stato] ?? ordine.stato}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '22px',
                          padding: '0 8px',
                          borderRadius: '100px',
                          background: `color-mix(in srgb, ${STATO_COLOR[ordine.stato] ?? 'var(--t3)'} 15%, transparent)`,
                          color: STATO_COLOR[ordine.stato] ?? 'var(--t3)',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.03em',
                        }}
                      >
                        {STATO_LABEL[ordine.stato] ?? ordine.stato}
                      </span>
                    </div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* FAB Nuovo ordine */}
      <button
        type="button"
        onClick={() => setShowNuovoSheet(true)}
        aria-label="Crea nuovo ordine fornitore"
        style={{
          position: 'fixed',
          bottom: '90px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '52px',
          padding: '0 20px',
          borderRadius: '100px',
          border: 'none',
          background: 'var(--primary, #D90012)',
          color: '#fff',
          fontFamily: 'DM Sans, sans-serif',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 40,
          boxShadow: '-3px -3px 8px rgba(255,255,255,.20), 4px 6px 14px -2px rgba(217,0,18,.50)',
        }}
      >
        <span aria-hidden="true" style={{ fontSize: '20px', lineHeight: 1 }}>+</span>
        Nuovo ordine
      </button>
    </>
  )
}
