'use client'

// Catalogo DS v3 — guscio condiviso dalle sezioni (spec §14.2).
// Contratto stabile per tutti i task successivi: ogni nuovo componente aggiunge
// una <SezioneCatalogo> in page.tsx, mai un layout ad-hoc.

import type { ReactNode } from 'react'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'

export function SezioneCatalogo(props: { titolo: string; spec: string; children: ReactNode }) {
  const { titolo, spec, children } = props
  return (
    <section
      style={{
        marginBottom: spazio.xl,
        padding: spazio.l,
        borderRadius: raggio.card,
        background: 'var(--card)',
        border: '1px solid var(--line)',
      }}
    >
      <header style={{ marginBottom: spazio.m }}>
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
            fontSize: tipografia.size.caption,
            letterSpacing: tipografia.tracking.caption,
            color: 'var(--muted)',
            margin: `${spazio.xs}px 0 0`,
          }}
        >
          {spec}
        </p>
      </header>
      <div style={{ background: 'var(--bg)', borderRadius: raggio.tile, padding: spazio.m }}>
        {children}
      </div>
    </section>
  )
}
