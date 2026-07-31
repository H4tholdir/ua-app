'use client'

// DS v3 — la RADICE comune dei quattro strati sopra la pagina (D100).
//
// ── Che cosa fa, e perché non è un `<div>` copiato quattro volte ────────────
// Uno strato che si sta chiudendo resta a schermo per tutta la durata della
// sua uscita: è ciò che rende l'uscita un'uscita e non un taglio. Ma finché è
// lì **copre l'intero schermo**, e senza questa riga un tocco diretto alla
// scheda dietro finirebbe nello strato che sta sparendo — una finestra morta
// lunga quanto l'animazione. Chi chiude e tocca subito qualcos'altro perde
// quel tocco, e non capisce perché.
//
// 🔑 È il modo in cui lo risolve Apple, ed è la ragione per cui l'uscita di UÀ
// può restare SIMMETRICA (D100): su iOS una vista che si sta rimuovendo esce
// dal giro dei tocchi **subito**, non a fine animazione — la calma dell'uscita
// non si paga in reattività. L'alternativa era accorciare l'uscita (la regola
// «l'uscita dura meno dell'entrata» è di Material Design, non di Apple:
// 225 ms contro 195 ms, m1.material.io/motion/duration-easing.html), e avrebbe
// curato il sintomo lasciando la finestra morta, solo più breve.
//
// ── `useIsPresent()` e non `aperto`, e questo è il punto tecnico ────────────
// 🛑 Guidare `pointerEvents` dalla prop `aperto` NON funziona, e il modo in cui
// fallisce è silenzioso: mentre un figlio esce, `AnimatePresence` continua a
// rendere gli elementi React **dell'ultimo render**, quelli in cui `aperto` era
// ancora `true`. Le props non si aggiornano più. Quello che invece arriva
// all'albero uscente è il CONTESTO di presenza — ed è esattamente ciò che
// `useIsPresent()` legge. Per questo la radice è un componente e non un `div`
// inline: un hook va chiamato dentro il sottoalbero che sta uscendo.
//
// ── Il contratto ───────────────────────────────────────────────────────────
// Figlio DIRETTO di `AnimatePresence`, con la sua `key`. `pointerEvents` è
// applicato per ULTIMO e non è sovrascrivibile da `stile`: è l'invariante che
// questo componente esiste per garantire.

import { motion, useIsPresent } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'

export function StratoRadice(props: {
  /** Lo strato nella pila degli overlay: visore 1010 · tendina 1020 · fogli 1030. */
  zIndex: number
  className?: string
  /** Allineamento e simili (i due fogli si appoggiano in basso). Non può
   *  toccare `pointerEvents`. */
  stile?: CSSProperties
  children: ReactNode
}) {
  const { zIndex, className, stile, children } = props
  const presente = useIsPresent()

  return (
    <motion.div
      data-ds="v3"
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        background: 'transparent',
        ...stile,
        // 🛑 Ultimo, e volutamente non sovrascrivibile: v. il commento di testa.
        pointerEvents: presente ? 'auto' : 'none',
      }}
    >
      {children}
    </motion.div>
  )
}
