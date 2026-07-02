'use client'

import type { EstrattoContoResponse } from '@/app/api/scadenzario/[cliente_id]/route'
import { DS, fmt } from './estratto-conto-shared'

export function ClienteInfoCard({ cliente, saldo_insoluto }: {
  cliente: EstrattoContoResponse['cliente']
  saldo_insoluto: number
}) {
  const hasAddress = cliente.indirizzo || cliente.citta

  return (
    <div style={{
      background: DS.sfc,
      borderRadius: 16,
      padding: '20px',
      boxShadow: DS.shB,
    }}>
      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 11,
        fontWeight: 700,
        color: DS.t3,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 14,
      }}>
        Info cliente
      </div>

      <div style={{
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 16,
        fontWeight: 700,
        color: DS.t1,
        marginBottom: 4,
      }}>
        {cliente.studio_nome ?? `${cliente.nome} ${cliente.cognome}`}
      </div>

      {hasAddress && (
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 13,
          color: DS.t2,
          marginBottom: 4,
        }}>
          {[cliente.indirizzo, cliente.citta, cliente.cap].filter(Boolean).join(', ')}
        </div>
      )}

      {cliente.telefono && (
        <a
          href={`tel:${cliente.telefono}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 8,
            fontFamily: 'DM Sans, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: DS.t1,
            textDecoration: 'none',
          }}
        >
          📞 {cliente.telefono}
        </a>
      )}

      <div style={{
        marginTop: 16,
        paddingTop: 14,
        borderTop: '1px solid rgba(0,0,0,.06)',
      }}>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 11,
          color: DS.t3,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 4,
        }}>
          Saldo insoluto
        </div>
        <div style={{
          fontFamily: 'DM Sans, sans-serif',
          fontSize: 22,
          fontWeight: 700,
          color: saldo_insoluto > 0 ? DS.red : DS.green,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {fmt.format(saldo_insoluto)}
        </div>
      </div>
    </div>
  )
}
