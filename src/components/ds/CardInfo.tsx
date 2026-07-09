'use client'

// DS v3 §5.10 — CardInfo/RigaDato: card di sola lettura per dati chiave→valore
// (es. scheda paziente, dettagli lavoro, dati di consegna). RigaDato non sa
// mai da sola se è urgente: `urgente` lo decide il chiamante SOLO per una
// consegna imminente (oggi o domani) — mai per altri significati generici di
// "importante". CardInfo inserisce il separatore tra le righe (mai dopo
// l'ultima) e avvisa in dev se il chiamante supera le 5 righe di legge: non
// le nasconde mai, la regola di prodotto non è applicabile a runtime (come
// TastoPrimario §5.1 — mostra sempre, avvisa solo chi sviluppa).

import { Children, Fragment, useEffect, type ReactNode } from 'react'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'

const MASSIMO_RIGHE = 5

/**
 * RigaDato — una riga chiave→valore dentro CardInfo (§5.10).
 *
 * Chiave caption 12.5/800 MAIUSCOLA `--faint` a sinistra · valore 17/700
 * `--ink` a destra (con `sub` 14/500 `--muted` opzionale sotto).
 *
 * `urgente` colora SOLO il valore in `--red` — riservato dal chiamante a una
 * consegna imminente (oggi o entro domani), MAI per altri significati di
 * "importante" (es. non usarlo per un valore economico alto).
 */
export function RigaDato(props: {
  chiave: string
  valore: ReactNode
  sub?: string
  urgente?: boolean
}) {
  const { chiave, valore, sub, urgente = false } = props
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spazio.m,
        padding: '9px 0',
      }}
    >
      <span
        style={{
          fontSize: tipografia.size.caption,
          fontWeight: tipografia.weight.extrabold,
          letterSpacing: tipografia.tracking.caption,
          textTransform: 'uppercase',
          color: 'var(--faint)',
        }}
      >
        {chiave}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span
          style={{
            fontSize: tipografia.size.body,
            fontWeight: tipografia.weight.bold,
            color: urgente ? 'var(--red)' : 'var(--ink)',
            textAlign: 'right',
          }}
        >
          {valore}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--muted)',
              textAlign: 'right',
            }}
          >
            {sub}
          </span>
        )}
      </span>
    </div>
  )
}

/**
 * CardInfo — card di dati di sola lettura (§5.10): card 22 (`raggio.tile`),
 * padding 4/20, raccoglie fino a 5 `RigaDato` con un separatore 1.5 `--line`
 * tra una riga e l'altra (mai dopo l'ultima). Oltre le 5 righe di legge non
 * le nasconde — avvisa solo in dev (§5.10 non è applicabile a runtime).
 */
export function CardInfo(props: { children: ReactNode }) {
  const { children } = props
  const righe = Children.toArray(children)

  useEffect(() => {
    if (righe.length > MASSIMO_RIGHE && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[CardInfo] ${righe.length} righe passate — massimo ${MASSIMO_RIGHE} RigheDato di legge (§5.10).`
      )
    }
  }, [righe.length])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: raggio.tile,
        padding: '4px 20px',
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
      }}
    >
      {righe.map((riga, indice) => (
        <Fragment key={indice}>
          {riga}
          {indice < righe.length - 1 && <div style={{ height: 1.5, background: 'var(--line)' }} />}
        </Fragment>
      ))}
    </div>
  )
}
