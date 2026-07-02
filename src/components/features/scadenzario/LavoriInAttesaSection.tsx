// src/components/features/scadenzario/LavoriInAttesaSection.tsx
'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { LavoroInAttesa } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt, formatData } from './estratto-conto-shared'

interface Props {
  lavori: LavoroInAttesa[]
}

export function LavoriInAttesaSection({ lavori }: Props) {
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
        {lavori.map((l) => (
          <div key={l.id} style={{
            background: DS.sfc, borderRadius: 16, padding: '14px 16px', boxShadow: DS.shB,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: DS.t1 }}>
                N. {l.numero_lavoro}
              </div>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: DS.t2 }}>
                {formatData(l.data_consegna_prevista)} · {fmt.format(l.prezzo_unitario)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                disabled={loadingId === l.id}
                onClick={() => decidi(l.id, 'fatturare')}
                style={{
                  padding: '8px 12px', borderRadius: 100, border: 'none',
                  background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Fatturare
              </button>
              <button
                type="button"
                disabled={loadingId === l.id}
                onClick={() => decidi(l.id, 'non_fatturare')}
                style={{
                  padding: '8px 12px', borderRadius: 100, border: 'none',
                  background: DS.elv, color: DS.t2, fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Non fatturare
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
