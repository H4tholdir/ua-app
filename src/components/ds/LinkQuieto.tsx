'use client'

// DS v3 §5.5 — LinkQuieto: solo testo, sottolineato. RISERVATO alle vie di
// fuga (L6) — "Aspetta, annulla la consegna", "Chiudi". Non è mai un'azione
// fisica: nessun suono, nessuna vibrazione, la sua discrezione È il messaggio.

import type { CSSProperties, ReactNode } from 'react'

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
    fontWeight: 600,
    color: 'var(--muted)',
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
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
