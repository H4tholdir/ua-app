'use client'

import { useState } from 'react'
import Link from 'next/link'

type ClienteRow = {
  id: string
  studio_nome: string | null
  nome: string
  cognome: string
  telefono: string | null
  citta: string | null
}

interface ClientiSearchListProps {
  clienti: ClienteRow[]
}

export function ClientiSearchList({ clienti }: ClientiSearchListProps) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? clienti.filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          c.cognome.toLowerCase().includes(q) ||
          (c.studio_nome ?? '').toLowerCase().includes(q)
      )
    : clienti

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
          {/* Icona ricerca */}
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
            placeholder="Cerca dentista o studio..."
            aria-label="Cerca clienti"
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

          {/* Pulsante clear */}
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
              ? `Nessun cliente trovato per “${query.trim()}”`
              : 'Nessun cliente trovato'}
          </p>
        </div>
      ) : (
        <ul className="ua-list-grid">
          {filtered.map((cliente) => (
            <li key={cliente.id}>
              <Link
                href={`/clienti/${cliente.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: 'var(--surface, #E4DFD9)',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  textDecoration: 'none',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  minWidth: 0,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Nome principale */}
                  <p
                    style={{
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--t1, #1C1916)',
                      margin: '0 0 2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {cliente.cognome} {cliente.nome}
                  </p>

                  {/* Studio e città */}
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
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {cliente.studio_nome ?? '—'}
                    </span>
                    {cliente.citta && (
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                          color: 'var(--t2, #4A3D33)',
                          flexShrink: 0,
                        }}
                      >
                        {cliente.citta}
                      </span>
                    )}
                  </div>

                  {/* Telefono */}
                  {cliente.telefono && (
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                        color: 'var(--gold, #D4A843)',
                        margin: '2px 0 0',
                      }}
                    >
                      {cliente.telefono}
                    </p>
                  )}
                </div>

                {/* Chevron */}
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
          ))}
        </ul>
      )}
    </>
  )
}
