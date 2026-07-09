'use client'

// DS v3 §5.21 — EroeTuttoAPosto: card centrata per lo stato di quiete totale
// (Fatture, Documenti…) quando non c'è nulla da fare. È la PRIMA cosa
// mostrata in quelle sezioni quando non serve alcuna azione (L5: il sollievo
// si mostra — non si nasconde una sezione senza cose da fare dietro il
// vuoto, la si celebra).

import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'

const DIAMETRO_CHECK = 54

/**
 * EroeTuttoAPosto — card centrata "tutto a posto" (§5.21).
 *
 * Check Ø 54 tint verde (decorativo: il significato è già nel testo, non
 * serve un'etichetta accessibile separata) + `titolo` 20/800 `--ink` (il
 * chiamante passa il testo completo, es. "Fatture: tutto a posto") + fino a
 * 2 `righe` 15/`--muted` coi numeri di supporto.
 */
export function EroeTuttoAPosto(props: { titolo: string; righe: [string, string] | [string] }) {
  const { titolo, righe } = props

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: spazio.m,
        padding: `${spazio.xl}px ${spazio.l}px`,
        borderRadius: raggio.card,
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: DIAMETRO_CHECK,
          height: DIAMETRO_CHECK,
          borderRadius: '50%',
          background: 'var(--green-tint)',
        }}
      >
        <svg width={26} height={26} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 12.5L9.5 18L20 6"
            stroke="var(--green)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      <h3
        style={{
          fontSize: 20,
          fontWeight: tipografia.weight.extrabold,
          color: 'var(--ink)',
          margin: 0,
        }}
      >
        {titolo}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.xs }}>
        {righe.map((riga, indice) => (
          <span key={indice} style={{ fontSize: 15, color: 'var(--muted)' }}>
            {riga}
          </span>
        ))}
      </div>
    </div>
  )
}
