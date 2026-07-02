// src/components/features/scadenzario/CreditoDisponibileSection.tsx
'use client'

import { useState } from 'react'
import type { DovutoEstratto } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt } from './estratto-conto-shared'
import { CreditoSheet } from './CreditoSheet'

interface Props {
  disponibile: number
  clienteId: string
  dovutiApplicabili: DovutoEstratto[]
}

export function CreditoDisponibileSection({ disponibile, clienteId, dovutiApplicabili }: Props) {
  const [mode, setMode] = useState<'applica' | 'rimborsa' | null>(null)

  if (disponibile <= 0) return null

  return (
    <section style={{ margin: '0 16px 24px' }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 700, color: DS.t3,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
      }}>
        Credito disponibile
      </div>
      <div style={{ background: DS.sfc, borderRadius: 16, padding: '16px', boxShadow: DS.shB }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif', fontSize: 24, fontWeight: 700, color: DS.green,
          fontVariantNumeric: 'tabular-nums', marginBottom: 12,
        }}>
          {fmt.format(disponibile)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            disabled={dovutiApplicabili.length === 0}
            onClick={() => setMode('applica')}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 100, border: `1px solid ${DS.prs}`,
              background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: dovutiApplicabili.length === 0 ? 'not-allowed' : 'pointer',
              opacity: dovutiApplicabili.length === 0 ? 0.5 : 1,
            }}
          >
            Applica a un dovuto
          </button>
          <button
            type="button"
            onClick={() => setMode('rimborsa')}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 100, border: 'none',
              background: DS.elv, color: DS.t1, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Rimborsa
          </button>
        </div>
      </div>

      <CreditoSheet
        mode={mode}
        clienteId={clienteId}
        disponibile={disponibile}
        dovutiApplicabili={dovutiApplicabili}
        onClose={() => setMode(null)}
      />
    </section>
  )
}
