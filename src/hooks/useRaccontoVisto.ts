'use client'

import { useState } from 'react'
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect'

// Task 16b, punto 6 (D3 §3.4, riserva UX 5c) — dedup client-side dei «racconti»: stesso evento
// (stesso `eventoId`, chiave stabile da src/lib/dashboard/striscia.ts, oggi solo
// `sRaccontoLiberazione`) non si ridipinge una seconda volta dopo il primo render. Chiave unica
// in localStorage, array cappato a CAP voci — si scarta la più vecchia (`slice(-CAP)` DOPO
// l'append tiene solo le ultime CAP, in ordine di primo-visto).
const CHIAVE = 'ua_racconti_visti'
const CAP = 20

function leggiVisti(): string[] {
  try {
    const grezzo = localStorage.getItem(CHIAVE)
    if (!grezzo) return []
    const array: unknown = JSON.parse(grezzo)
    return Array.isArray(array) ? array.filter((v): v is string => typeof v === 'string') : []
  } catch {
    // Storage disabilitato/privacy mode/JSON corrotto: degrada a "nessun racconto già visto" —
    // MAI un throw che rompe il render (guardia esplicita del punto 6).
    return []
  }
}

function scriviVisti(visti: string[]) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(visti))
  } catch {
    // Scrittura fallita (storage pieno/disabilitato): il racconto ricomparirà al giro
    // successivo — degrado accettabile, MAI un errore visibile all'utente.
  }
}

/**
 * useRaccontoVisto — true quando `eventoId` è già stato mostrato in questo browser (dedup,
 * punto 6). `useIsomorphicLayoutEffect` (stesso schema H2d già collaudato per `is-troncato` in
 * Cassetta.tsx): gira PRIMA del paint sul client, quindi un racconto già visto non viene MAI
 * dipinto e poi tolto — passa a "già visto" nello stesso commit iniziale, senza flash.
 *
 * Chiamare questo hook al CALLSITE che decide se montare lo slot della striscia (HomeV3,
 * NavDesk), non dentro `StrisciaStato`: è lì che si decide anche il resto del layout che deve
 * sparire insieme alla striscia (v. task-16b-report.md per il perché — un `return null` interno
 * al componente lascerebbe un contenitore vuoto col proprio margine, orfano).
 *
 * Review Important (task-16b-report.md, addendum 2): `HomeV3` e `NavDesk` (via `HomeDesktop`)
 * montano come FRATELLI dallo stesso `dashboard/page.tsx` — CSS decide chi si vede a 1024px,
 * ENTRAMBI sono nel DOM, ENTRAMBI chiamano questo hook con lo STESSO `eventoId`. La lettura
 * "sono già visto?" NON deve leggere `localStorage` dentro l'effect (lì il primo fratello a
 * girare scrive PRIMA che il secondo legga, e il secondo si vede "già visto" un racconto che
 * lui stesso non ha mai mostrato): legge invece una FOTOGRAFIA presa con l'inizializzatore
 * pigro di `useState`, che gira in FASE DI RENDER — React completa il render dell'INTERO albero
 * (compreso il fratello) prima di eseguire QUALSIASI effect, quindi ogni istanza di questo hook
 * fotografa lo stato di `localStorage` COM'ERA all'inizio di questo caricamento di pagina,
 * PRIMA che chiunque (questo hook incluso) possa averci scritto sopra — la semantica ratificata
 * è «racconto visto → non riappare in un caricamento SUCCESSIVO», non «il primo fratello a
 * montare zittisce gli altri nello stesso giro». La SCRITTURA (per i prossimi caricamenti)
 * rilegge invece lo stato FRESCO al momento dell'effect — mai la fotografia congelata — così
 * non perde la scrittura di un fratello il cui effect è già girato in questo stesso commit
 * (idempotente: se l'id c'è già, non riscrive).
 *
 * RESIDUO noto (stesso limite già dichiarato per is-troncato): l'HTML renderizzato dal SERVER,
 * prima dell'idratazione — un crawler, un client senza JS, o una navigazione hard qualunque
 * (refresh, riapertura della PWA da home screen) — non può conoscere localStorage e mostra
 * sempre il racconto per il tempo del primo paint, mai il "già visto" dedotto: non c'è modo di
 * saperlo prima che React giri lato client (v. task-16b-report.md addendum 1 per l'evidenza
 * completa su perché questo non si risolve wirando un'animazione di uscita).
 */
export function useRaccontoVisto(eventoId: string | undefined): boolean {
  const [visto, setVisto] = useState(false)
  const [primaDiQuestoCaricamento] = useState(leggiVisti)

  useIsomorphicLayoutEffect(() => {
    if (!eventoId) {
      setVisto(false)
      return
    }
    if (primaDiQuestoCaricamento.includes(eventoId)) {
      setVisto(true)
      return
    }
    setVisto(false)
    const fresco = leggiVisti()
    if (!fresco.includes(eventoId)) {
      scriviVisti([...fresco, eventoId].slice(-CAP))
    }
  }, [eventoId, primaDiQuestoCaricamento])

  return visto
}
