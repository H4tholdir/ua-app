'use client'

// DS v3 §5.5 — LinkQuieto: solo testo, sottolineato. RISERVATO alle vie di
// fuga (L6) — "Aspetta, annulla la consegna", "Chiudi". Non è mai un'azione
// fisica: nessun suono, nessuna vibrazione, la sua discrezione È il messaggio.

import type { CSSProperties, ReactNode } from 'react'
import { tipografia } from '@/design-system/v3/tokens'

/**
 * LinkQuieto — la via di fuga (§5.5, L6).
 *
 * RISERVATO alle vie di fuga: "annulla", "chiudi", "torna indietro senza
 * salvare". MAI per azioni che contano — quella è TastoPrimario/TastoSecondario.
 * Con `href` renderizza un `<a>`, altrimenti un `<button>`. Nessun `suona()`
 * né `vibra()`: a differenza dei tasti fisici, la via di fuga non ha un
 * feedback tattile — è deliberatamente silenziosa.
 */
export function LinkQuieto(props: {
  children: ReactNode
  onClick?: () => void
  href?: string
}) {
  const { children, onClick, href } = props

  const stile: CSSProperties = {
    fontSize: 14.5,
    fontWeight: tipografia.weight.semibold,
    color: 'var(--muted)',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    // Hit area di legge (constraint 10): gli usi reali del LinkQuieto sono
    // standalone ("Aspetta, annulla la consegna", "Chiudi" nello Sheet), non
    // inline in una frase — quindi il target deve essere ≥ 44px. Il padding
    // verticale allarga l'area toccabile, il margin negativo uguale e
    // contrario la annulla nel layout: il testo 14.5 sottolineato resta
    // visivamente identico, cambia solo quanto è facile centrarlo col dito.
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    padding: '13px 0',
    margin: '-13px 0',
  }

  // Anello focus-visible di legge (constraint 9): il componente lo porta
  // con sé ovunque venga montato, sia come <a> che come <button>.
  const anelloFocus = (
    <style>{`
      .ds-link-quieto:focus-visible {
        outline: 2px solid var(--blue);
        outline-offset: 2px;
      }
    `}</style>
  )

  if (href) {
    return (
      <>
        {anelloFocus}
        <a className="ds-link-quieto" href={href} onClick={onClick} style={stile}>
          {children}
        </a>
      </>
    )
  }

  return (
    <>
      {anelloFocus}
      <button type="button" className="ds-link-quieto" onClick={onClick} style={stile}>
        {children}
      </button>
    </>
  )
}
