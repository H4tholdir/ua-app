'use client'

// /ds-v3-catalogo — Catalogo DS v3 «Una cosa alla volta» (spec §14.2).
// UNICA pagina che monta data-ds="v3". Le sezioni dei componenti si aggiungono
// qui, task per task — il guscio (CatalogoShell) resta stabile.

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { initSuoni } from '@/design-system/v3/sound'
import { tipografia, spazio, raggio } from '@/design-system/v3/tokens'
import { molla } from '@/design-system/v3/motion'

export default function CatalogoPage() {
  const [scuro, setScuro] = useState(false)

  useEffect(() => {
    initSuoni()
  }, [])

  function alternaTema() {
    const prossimo = !scuro
    setScuro(prossimo)
    if (prossimo) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
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
    </div>
  )
}
