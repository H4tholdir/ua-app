// src/components/features/scadenzario/CreditoDisponibileSection.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
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

  if (disponibile === 0) return null

  if (disponibile < 0) {
    return (
      <section style={{ margin: '0 16px 24px' }} role="alert">
        <div style={{ background: DS.sfc, borderRadius: 16, padding: '16px', boxShadow: DS.shB }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span
              aria-hidden="true"
              style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, color: DS.red,
                background: `color-mix(in srgb, ${DS.red} 16%, transparent)`,
              }}
            >
              ⚠
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700, color: DS.t2,
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                Saldo negativo
              </div>
              <div style={{
                fontFamily: 'DM Sans, sans-serif', fontSize: 24, fontWeight: 700, color: DS.redInk,
                fontVariantNumeric: 'tabular-nums', marginTop: 2,
              }}>
                {fmt.format(disponibile)}
              </div>
            </div>
          </div>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: DS.t1, lineHeight: 1.5, margin: '12px 0 14px' }}>
            Saldo credito negativo: un TD04 è stato rifiutato da SdI dopo che il credito era già stato applicato.
          </p>
          <Link
            href="/fatture/riconciliazioni"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', minHeight: 48, borderRadius: 100,
              background: DS.red, color: '#fff', fontFamily: 'DM Sans, sans-serif',
              fontSize: 14, fontWeight: 700, boxShadow: 'var(--sh-red)', textDecoration: 'none',
            }}
          >
            Vai alla riconciliazione →
          </Link>
        </div>
      </section>
    )
  }

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
