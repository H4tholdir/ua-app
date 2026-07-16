'use client'

// DS v3 §5.22 — CardUAHaFatto: elenco delle azioni automatiche che UÀ ha già
// fatto per il laboratorio (es. dopo una consegna multipla, o come
// descrizione delle sezioni in "Tutto il resto"). Sola lettura: nessuna riga
// interattiva, nessun suono/vibrazione — è un resoconto, non un'azione da
// compiere. Riusa `CheckTondo` (§5.11): un'azione automatica è per
// definizione già chiusa, quindi ogni voce è `fatto` per default. La card
// può però elencare anche UNA voce «pronta ma non ancora avvenuta» (es.
// «Messaggio WhatsApp — pronto da inviare» nel riquadro Consegnato): passando
// `fatto: false` quella riga mostra il `CheckTondo` non spuntato — L5: mai
// un ✓ verde su qualcosa che non è ancora successo.

import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { CheckTondo } from './RigaFase'

const TITOLO_DI_LEGGE = 'UÀ HA GIÀ FATTO PER TE'
const DIAMETRO_CHECK = 30

/**
 * CardUAHaFatto — resoconto delle automazioni (§5.22).
 *
 * Card 22 (`raggio.tile`) · titolo caption fisso `TITOLO_DI_LEGGE` (12.5/800
 * `--faint`, maiuscolo) · righe: `CheckTondo` Ø 30 (`fatto` default `true`,
 * `fatto: false` → cerchio non spuntato per una voce ancora da compiere) +
 * `nome` 16.5/700 `--ink` + `sub` 14/500 `--muted` opzionale.
 */
export function CardUAHaFatto(props: {
  voci: Array<{ nome: string; sub?: string; fatto?: boolean }>
}) {
  const { voci } = props

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spazio.m,
        padding: spazio.ml,
        borderRadius: raggio.tile,
        background: 'var(--card)',
        boxShadow: 'var(--sh-card)',
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
        {TITOLO_DI_LEGGE}
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.sm }}>
        {voci.map((voce, indice) => (
          <div key={indice} style={{ display: 'flex', alignItems: 'center', gap: spazio.m }}>
            <CheckTondo fatto={voce.fatto ?? true} diametro={DIAMETRO_CHECK} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span
                style={{ fontSize: 16.5, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}
              >
                {voce.nome}
              </span>
              {voce.sub && (
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--muted)' }}>
                  {voce.sub}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
