'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { svuotaRicerca } from '@/lib/ui/svuota-ricerca'

type PazienteRow = {
  id: string
  nome: string | null
  cognome: string | null
  nome_cognome: string
  codice_paziente: string | null
  cliente: { id: string; nome: string; cognome: string; studio_nome: string | null } | null
}

interface PazientiSearchListProps {
  pazienti: PazienteRow[]
}

export function PazientiSearchList({ pazienti }: PazientiSearchListProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const q = query.trim().toLowerCase()
  const filtered = q
    ? pazienti.filter((p) =>
        (p.codice_paziente ?? '').toLowerCase().includes(q)
      )
    : pazienti

  return (
    <>
      {/* Search bar sticky */}
      <div
        style={{
          padding: '0 20px 12px',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--bg, #DDD8D3)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'var(--bg, #DDD8D3)',
            borderRadius: '14px',
            padding: '0 14px',
            boxShadow:
              'inset 4px 4px 9px rgba(148,128,118,.32), inset -3px -3px 7px rgba(255,255,255,.66)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            style={{ flexShrink: 0, color: 'var(--t3, #6B5C51)' }}
          >
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per codice paziente..."
            aria-label="Cerca pazienti"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              height: '48px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '16px',
              fontWeight: 400,
              color: 'var(--t1, #1C1916)',
            }}
          />

          {/* Pulsante clear — P7 (ratifica 22/07, adattamento in place, Opzione B): stessa
              icona/badge v2.3 di sempre, ma etichetta ed effetto unificati col resto delle
              superfici (`svuotaRicerca`: svuota + ri-focalizza) e target tattile ≥44px (margini
              negativi per non spostare il layout della pillola). */}
          {query && (
            <button
              type="button"
              onClick={() => svuotaRicerca(inputRef.current, () => setQuery(''))}
              aria-label="Svuota la ricerca"
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '44px',
                minHeight: '44px',
                marginLeft: '-8px',
                marginRight: '-8px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--prs, #D4CFC9)',
                  color: 'var(--t2, #4A3D33)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M2 2l8 8M10 2L2 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Lista risultati */}
      {filtered.length === 0 ? (
        <div
          style={{
            background: 'var(--surface, #E4DFD9)',
            borderRadius: '16px',
            padding: '36px 20px',
            margin: '0 20px',
            textAlign: 'center',
            boxShadow:
              'var(--sh-b)',
          }}
        >
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '15px',
              color: 'var(--t2, #4A3D33)',
              margin: 0,
            }}
          >
            {q
              ? `Nessun paziente trovato per "${query.trim()}"`
              : 'Nessun paziente trovato'}
          </p>
        </div>
      ) : (
        <section style={{ padding: '0 20px' }}>
          <ul className="ua-list-grid">
            {filtered.map((paziente) => {
              const clienteNome = paziente.cliente
                ? paziente.cliente.studio_nome ??
                  `${paziente.cliente.nome} ${paziente.cliente.cognome}`
                : '—'

              const nomePaziente =
                paziente.cognome && paziente.nome
                  ? `${paziente.cognome} ${paziente.nome}`
                  : paziente.nome_cognome

              return (
                <li key={paziente.id}>
                  <Link
                    href={`/pazienti/${paziente.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'var(--surface, #E4DFD9)',
                      borderRadius: '16px',
                      padding: '14px 16px',
                      textDecoration: 'none',
                      boxShadow:
                        'var(--sh-b)',
                      width: '100%',
                      maxWidth: '100%',
                      boxSizing: 'border-box',
                      minWidth: 0,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: 'var(--t1, #1C1916)',
                          margin: '0 0 4px',
                        }}
                      >
                        {nomePaziente}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '13px',
                            color: 'var(--t2, #4A3D33)',
                          }}
                        >
                          {clienteNome}
                        </span>
                        {paziente.codice_paziente && (
                          <span
                            style={{
                              fontFamily: 'DM Sans, sans-serif',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--t2, #4A3D33)',
                              background: 'var(--elv, #EDEDEA)',
                              borderRadius: '6px',
                              padding: '2px 8px',
                            }}
                          >
                            {paziente.codice_paziente}
                          </span>
                        )}
                      </div>
                    </div>

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                      style={{ flexShrink: 0, color: 'var(--t2, #4A3D33)' }}
                    >
                      <path
                        d="M6 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </>
  )
}
