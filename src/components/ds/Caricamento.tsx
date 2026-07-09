'use client'

// DS v3 §5.25 — Caricamento: il default di prodotto è l'ottimismo (le
// scritture mostrano subito il risultato e riconciliano dopo, con Avviso se
// falliscono — §5.18). Per le LETTURE, lo `Skeleton` è la SOLA forma di
// attesa ammessa: **niente spinner, niente `role="progressbar"`** — blocchi
// `--bg-deep` che pulsano opacità 0.6→1 in 1.2s con la STESSA geometria del
// contenuto atteso (il chiamante passa `altezze`). Oltre 3s compare
// «Un attimo…»: se un caricamento arriva fin lì, l'utente merita di saperlo —
// mai «Caricamento in corso», bandita dal dizionario (§2.3).

import { useEffect, useState } from 'react'
import { spazio, tipografia } from '@/design-system/v3/tokens'

const SOGLIA_UN_ATTIMO_MS = 3000
const ALTEZZA_DEFAULT = 16
const RADIUS_BLOCCO = 8

/**
 * Skeleton — l'unica forma di attesa per le letture (§5.25).
 *
 * `altezze` (px, una per blocco) riproduce la geometria esatta del contenuto
 * reale in arrivo (es. le righe di una CardLavoro); senza, `righe` genera N
 * blocchi di altezza uniforme come fallback generico.
 */
export function Skeleton(props: { righe?: number; altezze?: number[] }) {
  const { righe = 3, altezze } = props
  const [unAttimo, setUnAttimo] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setUnAttimo(true), SOGLIA_UN_ATTIMO_MS)
    return () => clearTimeout(id)
  }, [])

  const blocchi = altezze ?? Array.from({ length: righe }, () => ALTEZZA_DEFAULT)

  return (
    <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: spazio.s }}>
      {/* Pulse opacità (§5.25): CSS animation lineare ammessa qui — è
          opacity-only (§8.1), non una molla/coreografia di legge. */}
      <style>{`
        @keyframes ds-skeleton-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .ds-skeleton-blocco {
          animation: ds-skeleton-pulse 1.2s linear infinite;
        }
      `}</style>
      {blocchi.map((altezza, indice) => (
        <div
          key={indice}
          className="ds-skeleton-blocco"
          aria-hidden="true"
          style={{
            height: altezza,
            borderRadius: RADIUS_BLOCCO,
            background: 'var(--bg-deep)',
          }}
        />
      ))}
      {unAttimo && (
        <p
          style={{
            fontSize: tipografia.size.caption,
            color: 'var(--muted)',
            margin: `${spazio.xs}px 0 0`,
          }}
        >
          Un attimo…
        </p>
      )}
    </div>
  )
}
