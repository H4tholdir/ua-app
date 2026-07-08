'use client'

// DS v3 §5.26 — Vuoto: mai una pagina bianca. Ogni stato-zero ha un glifo, un
// titolo e UNA riga guida in parole del banco — l'eventuale azione (mai più
// di una) apre la prima cosa da fare, non un form vuoto.

import { spazio, tipografia } from '@/design-system/v3/tokens'
import { TastoSecondario } from './TastoSecondario'

/**
 * Vuoto — mai una pagina bianca (§5.26).
 *
 * Glifo 64 (decorativo — il senso lo porta il titolo) + titolo 21/800 + UNA
 * riga guida + eventuale azione (`TastoSecondario`) che apre la prima cosa
 * da fare.
 */
export function Vuoto(props: {
  glifo: string
  titolo: string
  guida: string
  azione?: { etichetta: string; onClick: () => void }
}) {
  const { glifo, titolo, guida, azione } = props

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: spazio.s,
        padding: `${spazio.xl}px ${spazio.l}px`,
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 64, lineHeight: 1 }}>
        {glifo}
      </span>
      <h2
        style={{
          fontSize: tipografia.size.heading,
          fontWeight: tipografia.weight.extrabold,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {titolo}
      </h2>
      <p
        style={{
          fontSize: tipografia.size.body,
          color: 'var(--muted)',
          margin: 0,
          maxWidth: 320,
        }}
      >
        {guida}
      </p>
      {azione && (
        <div style={{ marginTop: spazio.s }}>
          <TastoSecondario onClick={azione.onClick}>{azione.etichetta}</TastoSecondario>
        </div>
      )}
    </div>
  )
}
