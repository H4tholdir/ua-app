'use client'

// DS v3 §5.7 — Pila (home): le QUATTRO pile di legge (rev. 3.1). Componente
// più sacro dell'app: è il modo in cui il tecnico legge il banco in un colpo
// d'occhio. Tap su tutta la card = selezione/navigazione verso la lista
// filtrata, MAI un'azione → vibra('selection'), mai suona(). L'ordinamento e
// la presenza costante delle quattro pile (L1) sono responsabilità del
// chiamante (home), che monta le quattro istanze sempre nello stesso ordine
// — questo componente renderizza UNA pila. Il morph pila→lista (§8.3.1) è
// del sotto-progetto 3: qui c'è solo la card e il tap.

import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

export type TipoPila = 'daConsegnare' | 'sulBanco' | 'daRifareInProva' | 'appenaArrivati'

type Famiglia = 'red' | 'amber' | 'blue' | 'purple'

// Label e famiglia colore sono INTERNE e chiuse (§5.7): il chiamante passa
// solo `tipo`, mai una label libera — questo è l'unico posto che decide.
const MAPPA_PILA: Record<TipoPila, { label: string; famiglia: Famiglia }> = {
  daConsegnare: { label: 'DA CONSEGNARE OGGI', famiglia: 'red' },
  sulBanco: { label: 'SUL BANCO', famiglia: 'amber' },
  // REVISIONE DI LEGGE (decisione Francesco 12/07, bucket B) — §5.7/§7.1:
  // 4ª pila «DA RIFARE / IN PROVA», famiglia viola. Ordine di montaggio
  // (rossa · ambra · viola · blu) è responsabilità del chiamante (home).
  daRifareInProva: { label: 'DA RIFARE / IN PROVA', famiglia: 'purple' },
  appenaArrivati: { label: 'APPENA ARRIVATI', famiglia: 'blue' },
}

/**
 * Pila — una delle QUATTRO pile di legge in home (§5.7, rev. 3.1).
 *
 * Card 24 · padding 20/22 · numero display 52/800 tabulare (min-width 60,
 * centrato, colore famiglia) + colonna: label 13/800/+0.16em colore
 * famiglia, sub 16/600 `--muted` max 1 riga con ellissi (il dato più utile:
 * il prossimo lavoro, non un riassunto). Tap su tutta la card (`role="button"`
 * via `<button>` nativo) → `onClick` + `vibra('selection')`: è selezione/
 * navigazione, non un'azione fisica — MAI `suona()`.
 *
 * `numero` a 0 è renderizzato normalmente: le pile sono SEMPRE quattro, sempre
 * in quest'ordine, e non si nascondono mai (L5: il sollievo si mostra). In
 * quel caso il chiamante passa un `sub` di sollievo (es. «Tutte consegnate ✓»).
 */
export function Pila(props: { tipo: TipoPila; numero: number; sub: string; onClick: () => void }) {
  const { tipo, numero, sub, onClick } = props
  const { label, famiglia } = MAPPA_PILA[tipo]

  function handleClick() {
    vibra('selection')
    onClick()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-pila:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-pila"
        onClick={handleClick}
        whileTap={{ scale: 0.98 }}
        transition={molla.press}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: spazio.ml,
          padding: '20px 22px',
          borderRadius: raggio.card,
          border: 'none',
          background: 'var(--card)',
          boxShadow: 'var(--sh-card)',
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span
          className="ds-pila-num"
          style={{
            minWidth: 60,
            textAlign: 'center',
            fontSize: tipografia.size.display,
            fontWeight: tipografia.weight.extrabold,
            fontVariantNumeric: 'tabular-nums',
            color: `var(--${famiglia})`,
          }}
        >
          {numero}
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, gap: spazio.xs }}>
          <span
            style={{
              fontSize: tipografia.size.label,
              fontWeight: tipografia.weight.extrabold,
              letterSpacing: tipografia.tracking.label,
              color: `var(--${famiglia})`,
            }}
          >
            {label}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: tipografia.weight.semibold,
              color: 'var(--muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {sub}
          </span>
        </span>
      </motion.button>
    </>
  )
}
