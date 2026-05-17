'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--bg, #DDD8D3)',
        gap: '16px',
        textAlign: 'center',
      }}
    >
      {/* Numero 404 — Playfair per The Number Rule */}
      <p
        style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '96px',
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          color: 'var(--t1, #1C1916)',
          margin: 0,
          opacity: 0.12,
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        404
      </p>

      <div style={{ marginTop: '-56px' }}>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '20px',
            fontWeight: 700,
            color: 'var(--t1, #1C1916)',
            margin: '0 0 8px',
          }}
        >
          Pagina non trovata
        </p>
        <p
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: 'var(--t2, #96918D)',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: '280px',
          }}
        >
          L&apos;indirizzo che hai cercato non esiste o è stato spostato.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '280px',
          marginTop: '8px',
        }}
      >
        <Link
          href="/dashboard"
          style={{
            height: '52px',
            borderRadius: '32px',
            background: 'var(--primary, #D90012)',
            color: '#fff',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 700,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,.20), 9px 13px 22px -4px rgba(148,128,118,.44)',
          }}
        >
          Torna alla dashboard
        </Link>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); history.back() }}
          style={{
            height: '52px',
            borderRadius: '32px',
            background: 'var(--elv, #EDEDEA)',
            color: 'var(--t1, #1C1916)',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,.88), 9px 12px 22px -4px rgba(148,128,118,.40)',
            cursor: 'pointer',
          }}
        >
          Torna indietro
        </a>
      </div>
    </div>
  )
}
