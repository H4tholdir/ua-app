'use client'

import { useState } from 'react'

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

          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Cancella ricerca"
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--prs, #D4CFC9)',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--t2, #4A3D33)',
                padding: 0,
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
              'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
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
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: '0 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
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
                <div
                  style={{
                    background: 'var(--surface, #E4DFD9)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
                  }}
                >
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
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
