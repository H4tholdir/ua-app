// src/components/features/scadenzario/LavoriInAttesaSection.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { LavoroInAttesa } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData, formatDataOra } from './estratto-conto-shared'

interface Props {
  lavori: LavoroInAttesa[]
  studioNome: string | null
}

export function LavoriInAttesaSection({ lavori, studioNome }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const decidi = useCallback(async (id: string, decisione: 'fatturare' | 'non_fatturare') => {
    setLoadingId(id)
    try {
      const res = await fetch(`/api/lavori/${id}/decisione-fatturazione`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisione }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setLoadingId(null)
    }
  }, [router])

  if (lavori.length === 0) return null

  return (
    <section style={{ margin: '0 16px 24px' }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: DS.t3,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        Lavori in attesa di decisione ({lavori.length})
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lavori.map((l) => {
          const haProposta = Boolean(l.proposta_dentista)

          return (
            <div key={l.id} style={{
              background: DS.sfc, borderRadius: 16, padding: '14px 16px', boxShadow: DS.shB,
              display: 'flex',
              flexDirection: haProposta ? 'column' : 'row',
              alignItems: haProposta ? 'stretch' : 'center',
              justifyContent: haProposta ? 'flex-start' : 'space-between',
              gap: haProposta ? 10 : 12,
            }}>
              {/* Riga info: numero lavoro + (se con proposta) prezzo/data a destra */}
              <div style={{
                display: 'flex', alignItems: haProposta ? 'flex-start' : 'center',
                justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: DS.t1 }}>
                    N. {l.numero_lavoro}
                  </div>
                  {!haProposta && (
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2 }}>
                      {formatData(l.data_consegna_prevista)} · {fmt.format(l.prezzo_unitario)}
                    </div>
                  )}
                </div>
                {haProposta && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, fontWeight: 700, color: DS.t1 }}>
                      {fmt.format(l.prezzo_unitario)}
                    </div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11.5, color: DS.t3, marginTop: 2 }}>
                      {formatData(l.data_consegna_prevista)}
                    </div>
                  </div>
                )}
              </div>

              {l.proposta_dentista && (
                <div style={{
                  fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2,
                  background: DS.elv, borderRadius: 10, padding: '8px 10px',
                  display: 'flex', alignItems: 'flex-start', gap: 7,
                }}>
                  <span style={{ fontSize: 13, lineHeight: 1.4 }}>💬</span>
                  <span style={{ lineHeight: 1.4 }}>
                    {studioNome ?? 'Il dentista'} propone:{' '}
                    <strong style={{ color: DS.t1, fontWeight: 700 }}>
                      {l.proposta_dentista === 'fatturare' ? 'Fatturare' : 'Non fatturare'}
                    </strong>
                    {l.proposta_at ? ` · ${formatDataOra(l.proposta_at)}` : ''}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  disabled={loadingId === l.id}
                  onClick={() => decidi(l.id, 'fatturare')}
                  style={{
                    flex: haProposta ? 1 : undefined,
                    padding: haProposta ? '0 12px' : '8px 12px',
                    height: haProposta ? 44 : undefined,
                    borderRadius: 100,
                    border: !haProposta ? 'none'
                      : l.proposta_dentista === 'fatturare' ? '2px solid var(--primary, #D90012)' : '2px solid transparent',
                    background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif',
                    fontSize: haProposta ? 12.5 : 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Fatturare
                </button>
                <button
                  type="button"
                  disabled={loadingId === l.id}
                  onClick={() => decidi(l.id, 'non_fatturare')}
                  style={{
                    flex: haProposta ? 1 : undefined,
                    padding: haProposta ? '0 12px' : '8px 12px',
                    height: haProposta ? 44 : undefined,
                    borderRadius: 100,
                    border: !haProposta ? 'none'
                      : l.proposta_dentista === 'non_fatturare' ? '2px solid var(--primary, #D90012)' : '2px solid transparent',
                    background: DS.elv, color: DS.t2, fontFamily: 'DM Sans, sans-serif',
                    fontSize: haProposta ? 12.5 : 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Non fatturare
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
