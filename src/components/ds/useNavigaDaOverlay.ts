'use client'

// DS v3 — «sto navigando via da una pagina con un overlay aperto».
//
// È l'UNICO modo ammesso di cambiare rotta da dentro un `Sheet`/`DialogConferma` v3, o da un
// handler che ne chiude uno nello stesso gesto. Sostituisce `router.push` in quei punti: il
// motivo per cui non basta `router.push` (il back che si mangia la navigazione, e l'entry che
// resta sepolta) è raccontato per esteso in `storia-overlay.ts`, blocco «Chiudere in loco ≠
// chiudere navigando via».
//
// L'intenzione è DICHIARATA dal chiamante — si usa questo hook invece di `router.push`, punto:
// niente timer, niente confronti di pathname, niente «c'è una navigazione in volo?». L'unica
// cosa che il modulo legge è la marca della PROPRIA entry in cima alla history, una lettura
// sincrona ed esatta, nello stesso istante della navigazione.

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cediEntryAllaNavigazione } from './storia-overlay'

/**
 * Torna la funzione da chiamare AL POSTO di `router.push` quando si naviga con un overlay v3
 * aperto (o che si sta chiudendo nello stesso gesto).
 *
 * Contratto per il chiamante — l'ordine conta: **prima si naviga, poi si chiude**.
 *
 * ```tsx
 * onRisolvi={(tab) => { navigaDaOverlay(`/lavori/${id}/modifica?tab=${tab}`); setConsegnaId(null) }}
 * ```
 *
 * Invertire le due righe funzionerebbe comunque con React 19 (il flush di un evento discreto
 * arriva a fine handler, quindi la cleanup dell'overlay girerebbe DOPO), ma appoggerebbe la
 * correttezza su un dettaglio di scheduling: in quest'ordine la cessione dell'entry precede
 * qualunque `esciOverlay`, sempre, anche se il chiamante chiude dentro un `await` o un
 * `startTransition`.
 */
export function useNavigaDaOverlay(): (href: string) => void {
  const router = useRouter()
  return useCallback(
    (href: string) => {
      // `replace` NON è un ripiego: la nostra entry è un doppione della pagina corrente, quindi
      // metterle sopra la destinazione la lascerebbe sepolta (una pressione back morta), mentre
      // sostituirla dà `[…, pagina, destinazione]` — la stessa history che si avrebbe con un
      // `router.push` dalla pagina senza overlay.
      if (cediEntryAllaNavigazione()) router.replace(href)
      else router.push(href)
    },
    [router],
  )
}
