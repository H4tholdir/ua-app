'use client'

// Task 6 (A13) — RigaLavoroDenti: la riga «Lavoro» della scheda v3, con i
// denti FDI coinvolti (`lavoro.denti_coinvolti`, già presente sul fetch
// `select('*')` — nessuna query nuova) resi come chips sotto la descrizione.
// Con ≥1 dente la riga diventa un bottone (stesso guscio di `RigaEditabile`,
// SchedaLavoroV3.tsx:571-577) che apre l'odontogramma
// (`/lavori/{id}/modifica?tab=clinica`); con zero denti resta la `RigaDato`
// di sola lettura di sempre (nessuna regressione).
//
// ATTENZIONE: le chips non passano da `RigaDato.sub` (che è `string`, non
// `ReactNode` di chips) — questo componente replica l'anatomia di `RigaDato`
// (CardInfo.tsx:27-81) inline: chiave caption a sinistra, colonna valore a
// destra con `descrizione` sopra e la fila chips+chevron sotto, stesso
// `padding: '9px 0'`. È una variante locale dichiarata, non un fork del DS —
// l'anatomia base di RigaDato resta §5.10.

import { RigaDato } from '@/components/ds/CardInfo'
import { spazio, tipografia } from '@/design-system/v3/tokens'

const MAX_CHIP = 4

function labelDenti(denti: string[]): string {
  const testo =
    denti.length === 1
      ? `Dente ${denti[0]}`
      : `Denti ${denti.slice(0, -1).join(', ')} e ${denti[denti.length - 1]}`
  return `${testo} — apri l'odontogramma`
}

export function RigaLavoroDenti(props: { descrizione: string; denti: string[]; onApri: () => void }) {
  const { descrizione, denti, onApri } = props

  if (denti.length === 0) {
    return <RigaDato chiave="Lavoro" valore={descrizione} />
  }

  const visibili = denti.slice(0, MAX_CHIP)
  const extra = denti.length - visibili.length

  return (
    <button
      type="button"
      className="ds-tap-v3"
      onClick={onApri}
      aria-label={labelDenti(denti)}
      style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
    >
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
          Lavoro
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <span
            style={{
              fontSize: tipografia.size.body,
              fontWeight: tipografia.weight.bold,
              color: 'var(--ink)',
              textAlign: 'right',
            }}
          >
            {descrizione}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {visibili.map((dente, indice) => (
              <span
                key={`${dente}-${indice}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 28,
                  height: 28,
                  padding: '0 6px',
                  borderRadius: 8,
                  background: 'var(--blue-tint)',
                  color: 'var(--blue)',
                  fontSize: 14,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {dente}
              </span>
            ))}
            {extra > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 28,
                  height: 28,
                  padding: '0 6px',
                  borderRadius: 8,
                  background: 'var(--blue-tint)',
                  color: 'var(--blue)',
                  fontSize: 14,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {`+${extra}`}
              </span>
            )}
            <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--faint)', marginLeft: 4 }}>›</span>
          </span>
        </span>
      </div>
    </button>
  )
}
