'use client'

// DS v3 §5.11 — RigaFase/CheckTondo: la lista delle fasi di un lavoro
// (impronta, ceratura, colata…). CheckTondo è solo un fatto mostrato: fatto →
// cerchio pieno verde con check, da fare → cerchio dashed guida — lo stato
// non è mai solo colore (L3): porta con sé una parola accessibile ("Fatta" /
// "Da fare"). RigaFase non suona/vibra mai da sola: la spunta è sempre
// affidata a `PillFase` (§5.4), che già fa `suona('fatta')` + `vibra('success')`
// — qui è solo il wiring dell'`onClick`, mai un secondo suono. Il nome NON è
// mai barrato (`text-decoration: line-through`) quando fatto: diventa solo
// più leggero (600 invece di 700) e `--muted` invece di `--ink`.

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { molla, coreografie, cssEase, useReducedMotion } from '@/design-system/v3/motion'
import { gradiente, spazio, tipografia } from '@/design-system/v3/tokens'
import { PillFase } from './PillFase'

const DIAMETRO_DEFAULT = 31

/**
 * CheckTondo — cerchio di stato di una fase (§5.11). Ø 31 di default: fatto →
 * `--green-tint` con check 3px `--green` (entra con la coreografia
 * `spuntaFatta`: cerchio bouncy, `molla.bouncy`, scale overshoot) · da fare →
 * cerchio dashed 2.5px `gradiente.dashedGuida`. `useReducedMotion` → solo
 * dissolvenza, mai lo scale.
 */
export function CheckTondo(props: { fatto: boolean; diametro?: number }) {
  const { fatto, diametro = DIAMETRO_DEFAULT } = props
  const reduced = useReducedMotion()

  return (
    <div
      style={{
        position: 'relative',
        flexShrink: 0,
        width: diametro,
        height: diametro,
        borderRadius: '50%',
        boxSizing: 'border-box',
        border: fatto ? 'none' : `2.5px dashed ${gradiente.dashedGuida}`,
      }}
    >
      {reduced ? (
        // Reduced motion (§8.4): niente scale/bouncy — solo una dissolvenza
        // CSS pura (`cssEase.generico`), il layer resta sempre montato e
        // l'opacità segue `fatto` direttamente, senza Motion.
        <div
          role="img"
          aria-label={fatto ? 'Fatta' : 'Da fare'}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'var(--green-tint)',
            opacity: fatto ? 1 : 0,
            transition: `opacity ${cssEase.generico}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {fatto && (
            <svg width={diametro * 0.48} height={diametro * 0.48} viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12.5L9.5 18L20 6"
                stroke="var(--green)"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ) : (
        <>
          {/* `initial={false}`: non anima all'apparizione iniziale della lista
              (una fase già fatta al primo render non deve "sbocciare") — anima
              SOLO quando questo layer monta a seguito di una transizione
              false→true. */}
          <AnimatePresence initial={false}>
            {fatto && (
              <motion.div
                key="fatto"
                role="img"
                aria-label="Fatta"
                initial={coreografie.spuntaFatta.initial}
                animate={coreografie.spuntaFatta.animate}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'var(--green-tint)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width={diametro * 0.48} height={diametro * 0.48} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 12.5L9.5 18L20 6"
                    stroke="var(--green)"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
          {!fatto && <span role="img" aria-label="Da fare" style={{ position: 'absolute', inset: 0 }} />}
        </>
      )}
    </div>
  )
}

/**
 * RigaFase — una fase del lavoro (§5.11): `CheckTondo` + nome (+ `chiQuando`
 * opzionale sotto, 13.5 `--faint`). SOLO la fase `prossima` (non ancora
 * fatta, con `onFatta`) mostra `PillFase` — scegliere quale fase è la
 * prossima resta responsabilità del chiamante: se passa `prossima` senza
 * `onFatta`, la pill non avrebbe azione da compiere (warn in dev, mai un
 * crash). Al completamento la riga si assesta con `molla.snappy` (layout) —
 * `useReducedMotion` → nessuna animazione di layout.
 */
export function RigaFase(props: {
  nome: string
  fatto: boolean
  chiQuando?: string
  prossima?: boolean
  onFatta?: () => void
}) {
  const { nome, fatto, chiQuando, prossima = false, onFatta } = props
  const reduced = useReducedMotion()

  useEffect(() => {
    if (prossima && !onFatta && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[RigaFase] prossima senza onFatta — PillFase non avrebbe azione da compiere (§5.11).'
      )
    }
  }, [prossima, onFatta])

  return (
    <motion.div
      layout={!reduced}
      transition={molla.snappy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spazio.m,
        padding: `${spazio.s}px 0`,
      }}
    >
      <CheckTondo fatto={fatto} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span
          style={{
            fontSize: tipografia.size.body,
            fontWeight: fatto ? tipografia.weight.semibold : tipografia.weight.bold,
            color: fatto ? 'var(--muted)' : 'var(--ink)',
            textDecoration: 'none',
          }}
        >
          {nome}
        </span>
        {chiQuando && (
          <span
            style={{
              fontSize: 13.5,
              fontWeight: tipografia.weight.semibold,
              color: 'var(--faint)',
            }}
          >
            {chiQuando}
          </span>
        )}
      </div>
      {prossima && !fatto && onFatta && <PillFase onClick={onFatta} />}
    </motion.div>
  )
}
