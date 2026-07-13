'use client'

// Polish Livello 1 (2026-07-14) — DocumentiPannello: presentazione a mattonelle
// 2×2 dei documenti del lavoro per il pannello destro della scheda su DESKTOP
// (variante V3 «Bilanciata» approvata da Francesco). Su mobile/tablet i
// documenti restano nel bottom-sheet (`DocumentiSheet`, aperto dal menu ⋯):
// questo pannello è reso solo ≥1024 via CSS (`.scheda-documenti-desktop`).
// Riusa `costruisciVociDownload` + la condizione DdC di `DocumentiSheet`
// (stessa fonte, zero duplicazione di endpoint) e apre lo stesso
// `PacchettoConsegnaSheet`.

import { useState } from 'react'
import { PacchettoConsegnaSheet } from '@/components/features/lavori/PacchettoConsegnaSheet'
import { spazio, tipografia, raggio } from '@/design-system/v3/tokens'
import { costruisciVociDownload, type DocumentiSheetLavoro } from './DocumentiSheet'

const ICONA: Record<string, string> = {
  'scheda-fabbricazione': '🗂',
  ddc: '📄',
  ifu: '📘',
  etichetta: '🏷',
  'ricevuta-consegna': '🧾',
}

const titoloStile = {
  fontSize: tipografia.size.caption,
  fontWeight: tipografia.weight.extrabold,
  letterSpacing: tipografia.tracking.caption,
  textTransform: 'uppercase' as const,
  color: 'var(--faint)',
  padding: `0 ${spazio.xs}px ${spazio.s}px`,
}

const tileStile = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: spazio.s,
  minHeight: 76,
  padding: spazio.sm,
  borderRadius: raggio.riga,
  background: 'var(--bg-deep)',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left' as const,
  textDecoration: 'none',
  color: 'var(--ink)',
  fontFamily: tipografia.famiglia,
  fontSize: tipografia.size.label,
  fontWeight: tipografia.weight.bold,
}

const pacchettoStile = {
  marginTop: spazio.sm,
  width: '100%',
  minHeight: 44,
  borderRadius: raggio.riga,
  border: '1.5px dashed var(--line)',
  background: 'none',
  color: 'var(--ink)',
  fontFamily: tipografia.famiglia,
  fontSize: tipografia.size.label,
  fontWeight: tipografia.weight.bold,
  cursor: 'pointer',
}

export function DocumentiPannello(props: { lavoro: DocumentiSheetLavoro }) {
  const { lavoro } = props
  const [pacchettoAperto, setPacchettoAperto] = useState(false)

  const voci = costruisciVociDownload(lavoro)
  const mostraDdc = lavoro.haDdc && !!lavoro.ddcUrl

  return (
    <div
      className="scheda-documenti-desktop"
      style={{
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
        borderRadius: raggio.card,
        padding: `${spazio.m}px ${spazio.ml}px`,
      }}
    >
      <div style={titoloStile}>Documenti</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spazio.s }}>
        {mostraDdc && (
          <a
            href={lavoro.ddcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ds-tap-v3"
            style={tileStile}
          >
            <span aria-hidden="true" style={{ fontSize: 18 }}>{ICONA.ddc}</span>
            Scarica DdC
          </a>
        )}
        {voci.map((voce) => (
          <a key={voce.chiave} href={voce.href} download className="ds-tap-v3" style={tileStile}>
            <span aria-hidden="true" style={{ fontSize: 18 }}>{ICONA[voce.chiave] ?? '📄'}</span>
            {voce.etichetta}
          </a>
        ))}
      </div>

      <button type="button" className="ds-tap-v3" onClick={() => setPacchettoAperto(true)} style={pacchettoStile}>
        📦 Pacchetto Consegna MDR
      </button>

      <PacchettoConsegnaSheet lavoro={lavoro} isOpen={pacchettoAperto} onClose={() => setPacchettoAperto(false)} />
    </div>
  )
}
