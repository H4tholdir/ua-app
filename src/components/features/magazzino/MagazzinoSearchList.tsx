'use client'

import { useState } from 'react'

type ArticoloRow = {
  id: string
  codice_articolo: string
  nome: string
  produttore: string | null
  categoria: string | null
  um_scarico: string
  scorta_attuale: number
  scorta_minima: number
  dispositivo_medico: boolean
}

interface MagazzinoSearchListProps {
  articoli: ArticoloRow[]
}

export function MagazzinoSearchList({ articoli }: MagazzinoSearchListProps) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? articoli.filter(
        (a) =>
          a.nome.toLowerCase().includes(q) ||
          a.codice_articolo.toLowerCase().includes(q) ||
          (a.produttore ?? '').toLowerCase().includes(q) ||
          (a.categoria ?? '').toLowerCase().includes(q)
      )
    : articoli

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
            placeholder="Cerca articolo, codice o produttore..."
            aria-label="Cerca articoli in magazzino"
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
              ? `Nessun articolo trovato per "${query.trim()}"`
              : 'Nessun articolo in magazzino'}
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
          {filtered.map((articolo) => {
            const scorteAlert = articolo.scorta_attuale < articolo.scorta_minima

            return (
              <li key={articolo.id}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--surface, #E4DFD9)',
                    borderRadius: '16px',
                    padding: '14px 16px',
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,.90), inset 0 -2px 3px rgba(0,0,0,.05), -5px -5px 11px rgba(255,255,255,.78), 9px 13px 22px -4px rgba(148,128,118,.44)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Nome + badge */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '4px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '15px',
                          fontWeight: 600,
                          color: 'var(--t1, #1C1916)',
                          margin: 0,
                          flex: 1,
                          minWidth: 0,
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: 2,
                          overflow: 'hidden',
                          whiteSpace: 'normal',
                        }}
                      >
                        {articolo.nome}
                      </p>

                      {articolo.dispositivo_medico && (
                        <span
                          aria-label="Dispositivo medico"
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'var(--info, #2563EB)',
                            background: 'hsl(228 89% 63% / 0.15)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            flexShrink: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          DM
                        </span>
                      )}

                      {scorteAlert && (
                        <span
                          aria-label="Scorta sotto il minimo"
                          style={{
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: '10px',
                            fontWeight: 700,
                            color: 'var(--primary, #D90012)',
                            background: 'hsl(0 95% 64% / 0.15)',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            flexShrink: 0,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          Scorta bassa
                        </span>
                      )}
                    </div>

                    {/* Produttore */}
                    {articolo.produttore && (
                      <p
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                          color: 'var(--t2, #4A3D33)',
                          margin: '0 0 4px',
                        }}
                      >
                        {articolo.produttore}
                      </p>
                    )}

                    {/* Scorte */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: scorteAlert ? 'var(--primary, #D90012)' : 'var(--success, #16A34A)',
                        }}
                      >
                        {articolo.scorta_attuale}
                      </span>
                      <span
                        style={{
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                          color: 'var(--t2, #4A3D33)',
                        }}
                      >
                        / {articolo.scorta_minima} {articolo.um_scarico}
                      </span>
                    </div>
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
