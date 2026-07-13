'use client'

// DS v3 §5.12 — TileScelta (wizard): scegliere fra le opzioni più frequenti
// (dentista, tipo lavoro…). È una SELEZIONE, non un'azione: vibra('selection'),
// MAI suona() — il suono è riservato ai tasti fisici che fanno qualcosa.
// TileNuovo vive nello stesso file (stessa griglia, stesso contratto §14.2).

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { gradiente, raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import { suona } from '@/design-system/v3/sound'
import { Avatar } from '@/components/ds/Avatar'

// Stile riga nome (§5.12): 17.5/700 `--ink`, troncamento ellissi — condiviso
// dal caso una-riga e da ciascuna delle due righe della variante nomeRiga2
// (ogni riga tronca per conto suo, l'anatomia del tile resta fissa).
const stileRigaNome = {
  maxWidth: '100%',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  fontSize: 17.5,
  fontWeight: tipografia.weight.bold,
  color: 'var(--ink)',
} as const

// Variante due-righe (Task 10b): stesso stile + line-height compatto, per
// impilare riga1/riga2 senza allargare il tile.
const stileRigaNomeDueRighe = { ...stileRigaNome, lineHeight: 1.05 } as const

/**
 * TileScelta — una opzione nella griglia del wizard (§5.12).
 *
 * Card 22 · padding 20/12/17 · centrato · avatar Ø 60 (`avatar` = nome per
 * `Avatar`) oppure `glifo` 64 in quadrato radius 20 tint · nome 17.5/700 ·
 * sotto 13 `--faint`. Pressione fisica leggera (`molla.press`) + `vibra('selection')`:
 * nessun suono, è una selezione fra opzioni esistenti, non un'azione.
 *
 * Nome: UNA riga con ellissi di default (`nome`, comportamento invariato —
 * PassoDentista e altri consumer). Variante DUE RIGHE opzionale (ratificata
 * da Francesco, Ondata 2 Task 10b): passando `nomeRiga2` il nome si impila su
 * due righe (riga1 = `nome`, riga2 = `nomeRiga2`), stesso stile tipografico
 * 17.5/700 per riga, ciascuna troncabile con ellissi — l'anatomia del tile
 * (altezza, centratura) resta fissa in entrambi i casi.
 */
export function TileScelta(props: {
  nome: string
  nomeRiga2?: string
  sotto?: string
  avatar?: string
  glifo?: ReactNode
  onClick: () => void
}) {
  const { nome, nomeRiga2, sotto, avatar, glifo, onClick } = props

  function handleClick() {
    vibra('selection')
    onClick()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): il componente lo porta
          con sé ovunque venga montato. */}
      <style>{`
        .ds-tile-scelta:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-tile-scelta"
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        transition={molla.press}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: spazio.s,
          padding: '20px 12px 17px',
          borderRadius: raggio.tile,
          border: 'none',
          background: 'var(--card)',
          boxShadow: 'var(--sh-press)',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        {avatar ? (
          <Avatar nome={avatar} diametro={60} />
        ) : (
          <span
            aria-hidden="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: raggio.tasto, // 20 — coincide col radius del tasto (§5.12)
              background: 'var(--blue-tint)',
            }}
          >
            {glifo}
          </span>
        )}
        {/* Nome su UNA riga, ellissi sui nomi lunghi (§5.12 — anatomia fissa
            del tile; fix round Task 10): comportamento di default, invariato
            per ogni consumer che non passa `nomeRiga2` — i nomi dentista
            lunghi al Passo 1 troncano invece di wrappare. Variante DUE RIGHE
            (Task 10b, ratificata da Francesco): quando `nomeRiga2` è presente
            (tipi granulari al Passo 2: riga1+riga2 dalla tassonomia, es.
            «Corona» / «su impianto»), il nome si impila su due righe, stesso
            stile tipografico per riga, ciascuna troncabile indipendentemente
            — l'anatomia fissa del tile non cambia. Lo spazio letterale fra le
            due righe (testo, non layout: il flex a colonna scarta i nodi di
            solo-spazio) mantiene il nome accessibile del bottone identico al
            caso una-riga ("riga1 riga2"), per i consumer che leggono il nome
            via ruolo ARIA. */}
        {nomeRiga2 ? (
          <span
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              maxWidth: '100%',
            }}
          >
            <span style={stileRigaNomeDueRighe}>{nome}</span>{' '}
            <span style={stileRigaNomeDueRighe}>{nomeRiga2}</span>
          </span>
        ) : (
          <span style={stileRigaNome}>{nome}</span>
        )}
        {sotto && (
          <span
            style={{
              fontSize: 13,
              color: 'var(--faint)',
            }}
          >
            {sotto}
          </span>
        )}
      </motion.button>
    </>
  )
}

/**
 * TileNuovo — apre la creazione di un nuovo elemento (§5.12), es. "Nuovo dentista".
 *
 * Stessa griglia di TileScelta ma bordo tratteggiato 2.5 `gradiente.dashedGuida`
 * e niente ombra: è visivamente un "posto vuoto", non un'opzione esistente.
 * È un'azione (crea qualcosa di nuovo, non seleziona fra opzioni esistenti):
 * suono "tap" + vibrazione media, come TastoPiu.
 */
export function TileNuovo(props: { etichetta: string; onClick: () => void }) {
  const { etichetta, onClick } = props

  function handleClick() {
    suona('tap')
    vibra('medium')
    onClick()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9). */}
      <style>{`
        .ds-tile-nuovo:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-tile-nuovo"
        onClick={handleClick}
        whileTap={{ scale: 0.97 }}
        transition={molla.press}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 12px 17px',
          borderRadius: raggio.tile,
          borderStyle: 'dashed',
          borderWidth: 2.5,
          borderColor: gradiente.dashedGuida,
          background: 'transparent',
          boxShadow: 'none',
          textAlign: 'center',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            fontSize: 17.5,
            fontWeight: tipografia.weight.bold,
            color: 'var(--muted)',
          }}
        >
          {etichetta}
        </span>
      </motion.button>
    </>
  )
}
