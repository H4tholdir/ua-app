'use client'

// DS v3 — il blocco dello scorrimento per uno strato CHE ANIMA L'USCITA (D100).
//
// ── Perché il rilascio non può stare nella pulizia dell'effect ──────────────
// Uno strato che esce con la sua molla resta a schermo per tutta l'uscita. Se
// il corpo si sbloccasse nell'istante in cui si chiude, su desktop la barra di
// scorrimento ricomparirebbe **a metà uscita**: la compensazione di larghezza
// che `bloccaScorrimento()` applica al corpo viene tolta, la pagina DIETRO si
// allarga di colpo e slitta di lato — sotto un velo che si sta ancora
// dissolvendo, quindi ben visibile. È il difetto che `Sheet` ha pagato in
// collaudo (v. `Sheet.tsx:203-230`) e che ha portato al rilascio differito.
//
// 🔑 Questo hook è quella meccanica, in un posto solo invece che copiata in
// quattro. Chi lo usa passa il rilascio a `onExitComplete` di
// `AnimatePresence`: il corpo torna libero quando lo strato è davvero via.
//
// ⚠️ `Sheet` NON è stato migrato a questo hook: è condiviso, è in produzione, e
// non è nel mandato di D100 (R-E2 — si riferisce, non si corregge di nascosto).
// Resta un candidato all'unificazione, con la sua riga nell'handoff.
//
// ── Le due invarianti, e come sono rese vere ────────────────────────────────
//  1. **UN SOLO posto nel contatore per istanza**, non uno per esecuzione
//     dell'effect. Riaprire mentre l'uscita precedente sta ancora giocando è un
//     gesto vero (si sbaglia strato e si torna indietro subito): senza la
//     guardia sul ref si prenderebbe un secondo posto e il primo non tornerebbe
//     mai — la pagina resterebbe bloccata sotto le dita, per sempre.
//  2. **Il rilascio arriva SEMPRE allo smontaggio**, anche quando lo strato
//     viene tolto mentre è ancora aperto (il chiamante cambia rotta nello
//     stesso gesto che chiude). Vive nella pulizia di un effect a dipendenze
//     vuote, l'unica che gira in ogni caso.
//
// `bloccaScorrimento()` restituisce una funzione già idempotente per contratto:
// il rilascio differito e quello dello smontaggio possono arrivare entrambi
// per lo stesso ciclo di vita, e vale come uno solo.

import { useCallback, useEffect, useRef } from 'react'
import { bloccaScorrimento } from '@/components/ds/blocca-scorrimento'

/**
 * Blocca lo scorrimento del corpo finché `vivo` è vero e restituisce il
 * rilascio DIFFERITO, da passare a `onExitComplete` di `AnimatePresence`.
 */
export function useScorrimentoBloccato(vivo: boolean): () => void {
  const rilascioRef = useRef<(() => void) | null>(null)

  const rilascia = useCallback(() => {
    const sblocca = rilascioRef.current
    if (!sblocca) return
    // Si azzera PRIMA di chiamare: `onExitComplete` e la pulizia dello
    // smontaggio possono arrivare entrambi, e il secondo deve trovare vuoto.
    rilascioRef.current = null
    sblocca()
  }, [])

  // Sentinella dello smontaggio: è l'unica pulizia che gira SEMPRE, anche
  // quando l'effect qui sotto è uscito alla prima riga senza registrare nulla.
  useEffect(() => () => rilascia(), [rilascia])

  useEffect(() => {
    if (!vivo) return
    // Invariante 1: se il posto è già nostro (riapertura durante l'uscita), non
    // se ne prende un secondo.
    if (rilascioRef.current) return
    rilascioRef.current = bloccaScorrimento()
  }, [vivo])

  return rilascia
}
