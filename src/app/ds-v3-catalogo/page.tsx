'use client'

// /ds-v3-catalogo — Catalogo DS v3 «Una cosa alla volta» (spec §14.2).
// UNICA pagina che monta data-ds="v3". Le sezioni dei componenti si aggiungono
// qui, task per task — il guscio (CatalogoShell) resta stabile.

import { useEffect, useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { initSuoni } from '@/design-system/v3/sound'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
import { molla } from '@/design-system/v3/motion'
import { SezioneCatalogo } from './CatalogoShell'
import { TastoPrimario } from '@/components/ds/TastoPrimario'

// Il tema è stato ESTERNO: data-theme su <html>, posseduto da ThemeInitializer
// (root layout) che lo imposta prima dell'hydration. Lo leggiamo con
// useSyncExternalStore — niente stato locale che possa desincronizzarsi.
// SSR-safe: sul server vale il default chiaro, il client legge il DOM reale.
function sottoscriviTema(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}
const temaScuro = () => document.documentElement.getAttribute('data-theme') === 'dark'
const temaScuroServer = () => false

export default function CatalogoPage() {
  const scuro = useSyncExternalStore(sottoscriviTema, temaScuro, temaScuroServer)

  useEffect(() => {
    initSuoni()
  }, [])

  function alternaTema() {
    // Stesso meccanismo dell'app (admin-nav/useTheme): si scrive sul DOM,
    // la UI segue via subscription — mai il contrario.
    if (temaScuro()) {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }

  return (
    <div
      data-ds="v3"
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--ink)',
        fontFamily: 'var(--font-v3)',
        padding: spazio.l,
      }}
    >
      {/* Anello focus di legge (constraint 9): 2px --blue, offset 2.
          Classe riusabile per tutto il chrome interattivo del catalogo. */}
      <style>{`
        [data-ds="v3"] .catalogo-interattivo:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spazio.m,
          marginBottom: spazio.xl,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: tipografia.size.title,
              fontWeight: tipografia.weight.extrabold,
              letterSpacing: tipografia.tracking.titoli,
              margin: 0,
            }}
          >
            Catalogo DS v3 — Una cosa alla volta
          </h1>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: `${spazio.xs}px 0 0`,
            }}
          >
            Verifica su 3 viewport: mobile 390px · tablet 768px · desktop 1280px
          </p>
        </div>
        <motion.button
          type="button"
          className="catalogo-interattivo"
          onClick={alternaTema}
          whileTap={{ scale: 0.96 }}
          transition={molla.press}
          aria-pressed={scuro}
          style={{
            minWidth: 44,
            minHeight: 44,
            padding: `0 ${spazio.m}px`,
            borderRadius: raggio.pill,
            border: '1px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--ink)',
            fontSize: tipografia.size.callout,
            fontWeight: tipografia.weight.semibold,
            cursor: 'pointer',
          }}
        >
          Tema: {scuro ? 'scuro' : 'chiaro'}
        </motion.button>
      </header>

      {/* Le sezioni dei componenti arrivano qui, una per task (contratto §14.2). */}
      <SezioneCatalogo titolo="TastoPrimario" spec="§5.1 — il tasto fisico">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <TastoPrimario onClick={() => {}}>Consegna</TastoPrimario>
          <TastoPrimario disabled motivoDisabilitato="Completa il controllo finale per consegnare">
            Consegna
          </TastoPrimario>
          <p
            style={{
              fontSize: tipografia.size.caption,
              color: 'var(--muted)',
              margin: 0,
            }}
          >
            Corsa, molla di pressione, suono e vibrazione sono comportamenti fisici: provali dal
            vivo con un tocco reale, non si vedono in uno screenshot statico.
          </p>
        </div>
      </SezioneCatalogo>
    </div>
  )
}
