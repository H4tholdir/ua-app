'use client'

// DS v3 §5.24 — StrisciaStato (home): riga di stato quieta, sotto le pile.
// Variante default = rassicurazione (check verde: "va tutto bene, guarda").
// Variante `attenzione` = chiede un'azione: icona famiglia rossa al posto
// del check. La riga stessa NON è più tappabile (il mockup approvato
// home.html `.striscia` non ha una riga-bottone): è una region viva e
// educata (`role="status"` `aria-live="polite"`) che annuncia cosa succede,
// mai un elemento interattivo di per sé. L'unica azione possibile è la CTA
// `azione`, un `<Link>` separato dal blocco di testo troncabile — se
// tappata è selezione/navigazione silenziosa: `vibra('selection')`, MAI
// `suona()` (il suono è riservato ai tasti fisici che fanno qualcosa).

import type { ReactNode } from 'react'
import Link from 'next/link'
import { spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

const DIAMETRO = 26

/**
 * StrisciaStato — riga di stato in home (§5.24, anatomia mockup).
 *
 * Contenitore `role="status" aria-live="polite"` flex `gap 12`, `minWidth: 0`
 * — icona Ø26 (check verde tint / triangolo `!` rosso tint in `attenzione`) +
 * testo `flex: 1 1 auto; minWidth: 0` 14.5/500 `--muted` su una riga con
 * ellissi (`whiteSpace: nowrap; overflow: hidden; textOverflow: ellipsis`):
 * `forte` (opzionale) apre il testo in grassetto `--ink` 700, poi `children`.
 * Se il chiamante passa `azione` compare una CTA `<Link>` `flex-none` 14.5/800
 * `--red`, MAI dentro il blocco troncabile — hit-area ≥44px via
 * `minHeight: 44` + `margin: '-13px 0'` (stesso schema di LinkQuieto: la
 * riga non cambia altezza visiva, cambia solo quanto è facile toccarla).
 */
export function StrisciaStato(props: {
  children: ReactNode
  forte?: string | null
  attenzione?: boolean
  azione?: { etichetta: string; href: string } | null
}) {
  const { children, forte, attenzione = false, azione } = props

  function handleClickAzione() {
    vibra('selection')
  }

  const icona = (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: DIAMETRO,
        height: DIAMETRO,
        borderRadius: '50%',
        background: attenzione ? 'var(--red-tint)' : 'var(--green-tint)',
        color: attenzione ? 'var(--red)' : 'var(--green)',
        fontSize: 13,
        fontWeight: tipografia.weight.extrabold,
      }}
    >
      {attenzione ? '!' : '✓'}
    </span>
  )

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): la CTA (unico elemento
          interattivo di questo componente) lo porta con sé. */}
      <style>{`
        .ds-striscia-stato-azione:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: spazio.sm, minWidth: 0 }}>
        {icona}
        <span
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: 14.5,
            fontWeight: 500,
            color: 'var(--muted)',
            textAlign: 'left',
          }}
        >
          {forte && (
            <>
              <b style={{ color: 'var(--ink)', fontWeight: 700 }}>{forte}</b>{' '}
            </>
          )}
          {children}
        </span>
        {azione && (
          <Link
            href={azione.href}
            className="ds-striscia-stato-azione"
            onClick={handleClickAzione}
            style={{
              flex: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 44,
              margin: '-13px 0',
              fontSize: 14.5,
              fontWeight: 800,
              color: 'var(--red)',
              textDecoration: 'none',
            }}
          >
            {azione.etichetta}
          </Link>
        )}
      </div>
    </>
  )
}
