'use client'

import type { DichiarazioneConformita } from '@/types/domain'
import { raisedShadow } from './styles'

interface TabDocumentiProps {
  ddc: DichiarazioneConformita | null
  lavoro_id: string
}

export function TabDocumenti({ ddc }: TabDocumentiProps) {
  return (
    <div>
      {/* DdC Card */}
      <div
        style={{
          background: 'var(--surface, #E4DFD9)',
          borderRadius: '14px',
          padding: '18px 16px',
          boxShadow: raisedShadow,
          marginBottom: '16px',
        }}
      >
        {/* Intestazione */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--t2, #96918D)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Dichiarazione di Conformità
          </span>

          {/* Stato badge */}
          {ddc ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--success, #16A34A)',
              }}
              role="status"
              aria-label="DdC generata"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="6" stroke="var(--success, #16A34A)" strokeWidth="1.5" />
                <path
                  d="M4.5 7l2 2 3-3"
                  stroke="var(--success, #16A34A)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Generata
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--amber, #F08C00)',
              }}
              role="status"
              aria-label="DdC non generata"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle
                  cx="7"
                  cy="7"
                  r="6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                />
              </svg>
              Non generata
            </span>
          )}
        </div>

        {/* Dettagli DdC */}
        {ddc ? (
          <div>
            {ddc.numero_ddc && (
              <p
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '14px',
                  color: 'var(--t1, #1C1916)',
                  margin: '0 0 8px',
                }}
              >
                N. {ddc.numero_ddc} — {ddc.anno_ddc}
              </p>
            )}

            {ddc.pdf_url && (
              <a
                href={ddc.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--gold, #D4A843)',
                  textDecoration: 'none',
                }}
                aria-label="Apri PDF DdC"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="2" y="1" width="7" height="12" rx="1" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M7 1l3 3h-3V1z" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 6h4M5 8.5h4M5 11h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Apri PDF
              </a>
            )}
          </div>
        ) : (
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              color: 'var(--t2, #96918D)',
              margin: 0,
              lineHeight: '1.5',
            }}
          >
            Nessuna DdC generata per questo lavoro.
          </p>
        )}
      </div>

      {/* Info automatica */}
      <div
        style={{
          background: 'var(--elv, #EDEDEA)',
          border: '1px solid rgba(0,0,0,.06)',
          borderRadius: '12px',
          padding: '14px 16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}
        role="note"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: '1px' }}
        >
          <circle cx="8" cy="8" r="7" stroke="var(--t2, #96918D)" strokeWidth="1.4" />
          <path
            d="M8 7v4M8 5.5v.5"
            stroke="var(--t2, #96918D)"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: 'var(--t2, #96918D)',
            margin: 0,
            lineHeight: '1.5',
          }}
        >
          I documenti vengono generati automaticamente al tap{' '}
          <strong style={{ color: 'var(--t1, #1C1916)' }}>CONSEGNA</strong>.
        </p>
      </div>
    </div>
  )
}
