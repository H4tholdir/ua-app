'use client'

// DS v3 §5.9 — PillTempo e PillStato: stato del lavoro sul banco, sola lettura.
// Mai un'azione (niente button, niente suono/haptic) — solo un fatto mostrato:
// colore + parola sono sempre insieme (L3), mai solo tinta.

import type { CSSProperties, ReactNode } from 'react'
import { raggio, tipografia } from '@/design-system/v3/tokens'

type Famiglia = 'red' | 'amber' | 'blue' | 'green'

const STILE_BASE: CSSProperties = {
  display: 'inline-block',
  borderRadius: raggio.pill,
  padding: '7px 13px',
  fontWeight: tipografia.weight.extrabold,
  whiteSpace: 'nowrap',
}

function coloriFamiglia(famiglia: Famiglia): CSSProperties {
  return {
    background: `var(--${famiglia}-tint)`,
    color: `var(--${famiglia})`,
  }
}

/**
 * PillTempo — indicatore di tempo/scadenza (§5.9), es. «OGGI · 15:00».
 *
 * Sola lettura (`<span>`, non `<button>`): la famiglia colore è decisa dal
 * chiamante in base al significato temporale nel contesto (una consegna
 * imminente è "red", una lontana "green"…), non da un vocabolario chiuso.
 */
export function PillTempo(props: { children: ReactNode; famiglia: Famiglia }) {
  const { children, famiglia } = props
  return (
    <span
      style={{
        ...STILE_BASE,
        ...coloriFamiglia(famiglia),
        fontSize: 15,
      }}
    >
      {children}
    </span>
  )
}

/** Vocabolario chiuso degli stati del banco (§5.9) — nessun altro valore ammesso. */
export type StatoBanco =
  | 'DA CONSEGNARE'
  | 'IN FORNO'
  | 'IN RIFINITURA'
  | 'APPENA ARRIVATO'
  | 'PRONTA ✓'
  | 'CONSEGNATO ✓'
  | 'DA INCASSARE'
  | 'INCASSATA ✓'
  | 'INVIATA ✓'
  | 'STA PER FINIRE'

// Mappa stato → famiglia colore, di legge (§5.9): un solo posto decide questo,
// il chiamante non la passa mai — è ciò che rende il vocabolario davvero chiuso.
const MAPPA_STATO_FAMIGLIA: Record<StatoBanco, Famiglia> = {
  'DA CONSEGNARE': 'red',
  'STA PER FINIRE': 'red',
  'IN FORNO': 'amber',
  'IN RIFINITURA': 'amber',
  'DA INCASSARE': 'amber',
  'APPENA ARRIVATO': 'blue',
  'PRONTA ✓': 'green',
  'CONSEGNATO ✓': 'green',
  'INCASSATA ✓': 'green',
  'INVIATA ✓': 'green',
}

/**
 * PillStato — stato del lavoro sul banco (§5.9), vocabolario chiuso.
 *
 * Sola lettura (`<span>`, non `<button>`). La famiglia colore è ricavata
 * internamente da `MAPPA_STATO_FAMIGLIA`: il tipo `StatoBanco` impedisce a
 * monte qualsiasi stato fuori vocabolario.
 */
export function PillStato(props: { stato: StatoBanco }) {
  const { stato } = props
  const famiglia = MAPPA_STATO_FAMIGLIA[stato]
  return (
    <span
      style={{
        ...STILE_BASE,
        ...coloriFamiglia(famiglia),
        fontSize: 13.5,
        letterSpacing: '0.1em',
      }}
    >
      {stato}
    </span>
  )
}
