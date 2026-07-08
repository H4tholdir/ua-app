'use client'

// DS v3 §5.20 — BarraMateriale: livello di scorta di un materiale (zirconia,
// resina, dischi…) sul banco. Le soglie (verde >40% · ambra 15-40% · rosso
// <15%) sono INTERNE al componente e derivate da `percento` — il chiamante
// passa solo il dato grezzo, mai il livello già calcolato: un solo posto
// decide la soglia (stesso principio del vocabolario chiuso di PillStato,
// §5.9). RIORDINA è un'azione fisica (ordina altro materiale), non una
// selezione: `suona('tap')` + `vibra('medium')` — mai solo vibrazione, a
// differenza di un tap di navigazione/selezione.

import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

type Famiglia = 'green' | 'amber' | 'red'
type Livello = 'verde' | 'ambra' | 'rosso'

const MAPPA_LIVELLO_FAMIGLIA: Record<Livello, Famiglia> = {
  verde: 'green',
  ambra: 'amber',
  rosso: 'red',
}

/**
 * Soglie di legge (§5.20): verde >40% · ambra 15-40% (entrambi i confini
 * inclusi in ambra) · rosso <15%. I confini appartengono sempre al livello
 * "più cauto" adiacente: 40% è ambra (non verde), 15% è ambra (non rosso).
 */
function livelloDaPercento(percento: number): Livello {
  if (percento > 40) return 'verde'
  if (percento >= 15) return 'ambra'
  return 'rosso'
}

/**
 * BarraMateriale — livello di scorta di un materiale sul banco (§5.20).
 *
 * Riga 1: `nome` 17.5/700 `--ink` + `quantita` 15/800 colore-livello. Riga 2:
 * barra H 10 pill `--bg-deep` (traccia) con riempimento colore-livello largo
 * `percento`%. Riga 3 opzionale: `nota` 13.5 (`--red` se il livello è rosso,
 * altrimenti `--muted`) + pill «RIORDINA →» — quest'ultima SOLO se il livello
 * è rosso E il chiamante passa `onRiordina` (senza handler non ci sarebbe
 * un'azione da compiere, stesso principio del warning dev di RigaFase §5.11).
 */
export function BarraMateriale(props: {
  nome: string
  quantita: string
  percento: number
  nota?: string
  onRiordina?: () => void
}) {
  const { nome, quantita, percento, nota, onRiordina } = props
  const livello = livelloDaPercento(percento)
  const famiglia = MAPPA_LIVELLO_FAMIGLIA[livello]
  const mostraRiordina = livello === 'rosso' && !!onRiordina
  const riempimento = Math.min(100, Math.max(0, percento))

  function handleRiordina() {
    suona('tap')
    vibra('medium')
    onRiordina?.()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.xs }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: spazio.s,
        }}
      >
        <span style={{ fontSize: 17.5, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}>
          {nome}
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: tipografia.weight.extrabold,
            color: `var(--${famiglia})`,
          }}
        >
          {quantita}
        </span>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: raggio.pill,
          background: 'var(--bg-deep)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${riempimento}%`,
            borderRadius: raggio.pill,
            background: `var(--${famiglia})`,
          }}
        />
      </div>

      {(nota || mostraRiordina) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spazio.s,
          }}
        >
          {nota && (
            <span
              style={{
                fontSize: 13.5,
                fontWeight: tipografia.weight.semibold,
                color: livello === 'rosso' ? 'var(--red)' : 'var(--muted)',
              }}
            >
              {nota}
            </span>
          )}
          {mostraRiordina && (
            <>
              {/* Anello focus-visible di legge (constraint 9): il componente lo
                  porta con sé ovunque venga montato. */}
              <style>{`
                .ds-barra-materiale-riordina:focus-visible {
                  outline: 2px solid var(--blue);
                  outline-offset: 2px;
                }
              `}</style>
              <motion.button
                type="button"
                className="ds-barra-materiale-riordina"
                onClick={handleRiordina}
                whileTap={{ scale: 0.97 }}
                transition={molla.press}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  minHeight: spazio.xxl, // 44 — hit area di legge (constraint 10)
                  padding: `0 ${spazio.m}px`,
                  borderRadius: raggio.pill,
                  border: 'none',
                  background: 'var(--red)',
                  color: testoSuFaccia,
                  fontSize: 13.5,
                  fontWeight: tipografia.weight.extrabold,
                  cursor: 'pointer',
                }}
              >
                RIORDINA →
              </motion.button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
