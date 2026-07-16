'use client'

// DS v3 §5.33 — FotoStrip: strip thumbnail orizzontale read-only (mockup
// scheda-lavoro.html `.foto-strip` = legge). Thumb 72×72 · radius 12 · max 1
// riga scrollabile. CONTRATTO SICUREZZA (spec 16/07 §2.1): `url` è SEMPRE una
// signed URL generata server-side al render (pattern B5, lib/storage/
// signed-url.ts) — mai storage_path né il valore getPublicUrl persistito.

import { spazio } from '@/design-system/v3/tokens'

export function FotoStrip(props: { foto: Array<{ id: string; url: string; alt?: string }> }) {
  const { foto } = props
  if (foto.length === 0) return null

  return (
    <div style={{ display: 'flex', gap: spazio.s, overflowX: 'auto', paddingBottom: 2 }} aria-label="Foto del lavoro">
      {foto.map((f) => (
        // eslint-disable-next-line @next/next/no-img-element -- URL Storage firmata a dimensioni variabili (stessa scelta di TabImmagini.tsx), next/image non applicabile
        <img
          key={f.id}
          src={f.url}
          alt={f.alt ?? 'Foto del lavoro'}
          style={{ flexShrink: 0, width: 72, height: 72, borderRadius: 12, objectFit: 'cover', background: 'var(--bg-deep)' }}
        />
      ))}
    </div>
  )
}
