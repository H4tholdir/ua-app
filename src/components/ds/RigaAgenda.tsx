'use client'

// DS v3 §5.19 — GiornoAgenda/RigaAgenda: l'agenda dei ritiri e delle consegne
// raggruppata per giorno. PillTipo (CONSEGNA/RITIRO) è una mini-pill INTERNA
// a questo file — riusa lo stile di PillStato (§5.9) ma non ne estende il
// vocabolario chiuso: è un tipo diverso di informazione (che cosa succede
// oggi, non lo stato del lavoro sul banco), quindi vive qui, non in Pill.tsx.
// RigaAgenda è di sola lettura per default: se il chiamante passa `onClick`
// (apre il lavoro collegato) diventa tappabile — selezione silenziosa,
// `vibra('selection')`, MAI `suona()` (stesso branching di StrisciaStato §5.24).

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'

type TipoAgenda = 'CONSEGNA' | 'RITIRO'

/**
 * PillTipo — mini-pill interna di RigaAgenda: CONSEGNA (`--red`) / RITIRO
 * (`--blue`). Sola lettura, non esportata: non è un vocabolario riusabile
 * altrove come `PillStato`, resta un dettaglio di RigaAgenda.
 */
function PillTipo(props: { tipo: TipoAgenda }) {
  const { tipo } = props
  const famiglia = tipo === 'CONSEGNA' ? 'red' : 'blue'
  return (
    <span
      style={{
        display: 'inline-block',
        flexShrink: 0,
        // marginLeft auto (non justify-content del contenitore): la pill resta
        // a destra sia in linea sia quando scende su una riga sua (QA T15 r2).
        marginLeft: 'auto',
        borderRadius: raggio.pill,
        padding: '7px 13px',
        fontSize: 13.5,
        fontWeight: tipografia.weight.extrabold,
        letterSpacing: '0.1em',
        whiteSpace: 'nowrap',
        background: `var(--${famiglia}-tint)`,
        color: `var(--${famiglia})`,
      }}
    >
      {tipo}
    </span>
  )
}

/**
 * GiornoAgenda — card di un giorno dell'agenda (§5.19).
 *
 * Card 20 (coincide con `raggio.tasto`) · intestazione `etichetta` 16/800
 * (`--red` se `oggi`, altrimenti `--ink`) · bordo inset 2.5 `--red` SOLO se
 * `oggi` (colore non è l'unico segnale: il testo dell'etichetta lo accompagna
 * sempre, es. "OGGI" — L3). Contiene una colonna di `RigaAgenda` via `children`.
 */
export function GiornoAgenda(props: { etichetta: string; oggi?: boolean; children: ReactNode }) {
  const { etichetta, oggi = false, children } = props

  return (
    // Ombra ambiente SEPARATA dal ring (pattern TastoPrimario §5.1, LePile):
    // in dark `--sh-card` risolve a `none`, e `none` dentro una lista
    // box-shadow invalida l'INTERA dichiarazione — il ring «OGGI» spariva
    // silenziosamente. Ambiente da solo sul wrapper (valida da sola in
    // entrambi i temi), ring single-value sulla card.
    <div style={{ borderRadius: raggio.tasto, boxShadow: 'var(--sh-card)' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spazio.s,
          padding: `${spazio.m}px ${spazio.ml}px`,
          borderRadius: raggio.tasto, // 20 — coincide col radius del tasto (§5.12/§5.19)
          background: 'var(--card)',
          boxShadow: oggi ? 'inset 0 0 0 2.5px var(--red)' : undefined,
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: tipografia.weight.extrabold,
            color: oggi ? 'var(--red)' : 'var(--ink)',
          }}
        >
          {etichetta}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>{children}</div>
      </div>
    </div>
  )
}

/**
 * RigaAgenda — una voce dell'agenda (§5.19), es. «09:00 · Consegna corona».
 *
 * `orario` 16.5/800 tabulare (`min-width` 56, così ore corte e lunghe
 * allineano la colonna) · `cosa` 15.5/600 `--ink` (+ `sub` 13.5/500 `--muted`
 * opzionale) · `PillTipo` a destra. Senza `onClick` è un `<div>` di sola
 * lettura; con `onClick` diventa un `<button>` tappabile (hit area 44,
 * `vibra('selection')`, MAI `suona()` — è navigazione verso il lavoro
 * collegato, non un'azione).
 */
export function RigaAgenda(props: {
  orario: string
  cosa: string
  sub?: string
  tipo: TipoAgenda
  onClick?: () => void
}) {
  const { orario, cosa, sub, tipo, onClick } = props

  function handleClick() {
    vibra('selection')
    onClick?.()
  }

  const contenuto = (
    <>
      <span
        style={{
          fontSize: 16.5,
          fontWeight: tipografia.weight.extrabold,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 56,
          flexShrink: 0,
          color: 'var(--ink)',
        }}
      >
        {orario}
      </span>
      {/* Colonna testo: pavimento min-content — mai schiacciata sotto la
          parola più lunga, il testo resta nel proprio box e non finisce mai
          sotto la pill (QA T15 r2: con minWidth 0 la colonna scendeva a 15px
          e le parole traboccavano sotto CONSEGNA). Se orario + colonna + pill
          non ci stanno, è la pill a scendere a capo (flexWrap della riga). */}
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          flex: 1,
          minWidth: 'min-content',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 15.5, fontWeight: tipografia.weight.semibold, color: 'var(--ink)' }}>
          {cosa}
        </span>
        {sub && (
          <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--muted)' }}>{sub}</span>
        )}
      </span>
      <PillTipo tipo={tipo} />
    </>
  )

  if (!onClick) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: `${spazio.xs}px ${spazio.m}px`,
          padding: `${spazio.s}px 0`,
        }}
      >
        {contenuto}
      </div>
    )
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-riga-agenda:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-riga-agenda"
        onClick={handleClick}
        whileTap={{ scale: 0.99 }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: `${spazio.xs}px ${spazio.m}px`,
          width: '100%',
          minHeight: spazio.xxl, // 44 — hit area di legge (constraint 10)
          border: 'none',
          background: 'transparent',
          padding: `${spazio.s}px 0`,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        {contenuto}
      </motion.button>
    </>
  )
}
