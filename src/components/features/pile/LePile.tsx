// DS v3 §4.1 (Task 8) — LePile: la vista «Le pile» di `/lavori` senza `pila`
// in query — i 4 raggruppamenti-link, ognuno apre `/lavori?pila=…` (P1).
// Server-renderizzabile (nessun handler, solo `<Link>`): niente `'use client'`.
// Fonte visiva: mockup `pila-aperta.html`, sezione `.lista`/`.grp-tabs`.
//
// `pilaAperta`/`children` restano per la composizione (es. layout larghi che
// affiancano l'elenco dei raggruppamenti alla pila aperta, come nel mockup a
// 1280px): quando presenti, il raggruppamento aperto porta il ring di
// selezione e `children` (le sue card, già assemblate dal chiamante) compare
// sotto l'elenco.
import Link from 'next/link'
import { spazio, tipografia } from '@/design-system/v3/tokens'
import type { ReactNode } from 'react'
import type { Pila } from '@/lib/lavori/urgenza'

const ORDINE: Array<{ pila: Pila; label: string; colore: string; tint: string }> = [
  { pila: 'rossa', label: 'Da consegnare oggi', colore: 'var(--red)', tint: 'var(--red-tint)' },
  { pila: 'ambra', label: 'Sul banco', colore: 'var(--amber)', tint: 'var(--amber-tint)' },
  { pila: 'viola', label: 'Da rifare / In prova', colore: 'var(--purple)', tint: 'var(--purple-tint)' },
  { pila: 'blu', label: 'Appena arrivati', colore: 'var(--blue)', tint: 'var(--blue-tint)' },
]

export function LePile(props: { conteggi: Record<Pila, number>; pilaAperta?: Pila; children?: ReactNode }) {
  const { conteggi, pilaAperta, children } = props

  return (
    <section style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '44px 24px 40px' }}>
      <h1 style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.titoli, color: 'var(--ink)', margin: '0 0 4px' }}>
        Le pile
      </h1>
      <p style={{ fontSize: 14.5, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', margin: '0 0 20px' }}>
        Tocca un raggruppamento per aprirlo
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {ORDINE.map(({ pila, label, colore, tint }) => {
          const selezionato = pila === pilaAperta
          return (
            <Link
              key={pila}
              href={`/lavori?pila=${pila}`}
              aria-current={selezionato ? 'true' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                padding: '16px 20px',
                borderRadius: 18,
                background: 'var(--card)',
                boxShadow: selezionato ? 'var(--sh-card), inset 0 0 0 2.5px var(--red)' : 'var(--sh-card)',
                textDecoration: 'none',
                boxSizing: 'border-box',
              }}
            >
              <span style={{ flex: 1, fontSize: 15, fontWeight: tipografia.weight.extrabold, letterSpacing: '0.12em', textTransform: 'uppercase', color: colore }}>
                {label}
              </span>
              <span
                style={{
                  minWidth: 30,
                  height: 30,
                  padding: '0 9px',
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: tipografia.weight.extrabold,
                  fontVariantNumeric: 'tabular-nums',
                  background: tint,
                  color: colore,
                }}
              >
                {conteggi[pila]}
              </span>
            </Link>
          )
        })}
      </div>

      {children && <div style={{ marginTop: spazio.l }}>{children}</div>}
    </section>
  )
}
