'use client'

// Collaudo R3 (P9, 22/07 notte) — difesa dal GHOST CLICK di Chrome Android sugli scrim.
//
// Root cause provata con touch CDP reali (repro `scripts/tmp/repro-ghost-click.mjs`): quando un
// overlay (Sheet/DialogConferma) viene aperto da un handler `pointerup` — il percorso tap della
// Cassetta della Parete — Chrome Android RI-HIT-TESTA il click sintetico post-touchend sul DOM
// aggiornato: il click atterra sullo scrim appena montato e lo chiude prima che l'enter-animation
// finisca («si alza di qualche pixel ma non si apre», collaudo device 22/07). iOS non re-hit-testa
// (il click resta sul target del touchstart): lì il bug non esiste e il tap-scrim reale è invariato.
//
// Contratto (panel advisor 2×, unanime — opzione A): lo scrim chiude SOLO se il gesto è NATO sullo
// scrim, cioè se un `pointerdown` con target lo scrim stesso ha armato il ref. Un click orfano —
// senza pointerdown corrispondente — è per definizione il ghost click e viene ignorato. È lo stesso
// pattern outside-press di Radix/<dialog> (la decisione si prende al pointerdown, mai al click):
// deterministico, senza finestre temporali inventate.
//
// Dettagli del contratto:
//  • il click CONSUMA sempre l'armatura (anche se il target non è lo scrim): niente stato stantio;
//  • `aperto=false` disarma: ogni apertura riparte vergine (riapertura durante l'exit inclusa);
//  • pointerdown nato sul PANNELLO e rilasciato sullo scrim NON chiude (comportamento standard dei
//    dialog moderni: il click in quel caso ha comunque come target l'antenato comune);
//  • Esc / «Chiudi» / swipe-giù non passano da qui e restano invariati (L6: mai una sola uscita).
//
// LIMITE DICHIARATO (fuori scope, advisor §3): questa difesa protegge lo SCRIM, non il pannello —
// un ghost click che atterrasse su un controllo DENTRO lo sheet resta teoricamente possibile
// (geometricamente raro: lo sheet sale dal basso, le cassette stanno sopra). Da affrontare solo se
// osservato al collaudo device.

import { useEffect, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

export function useTapScrim(aperto: boolean, onChiudi: () => void): {
  onPointerDown: (e: PointerEvent<HTMLDivElement>) => void
  onClick: (e: MouseEvent<HTMLDivElement>) => void
} {
  const armato = useRef(false)

  useEffect(() => {
    if (!aperto) armato.current = false
  }, [aperto])

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) armato.current = true
  }

  function onClick(e: MouseEvent<HTMLDivElement>) {
    const era = armato.current
    armato.current = false
    if (era && e.target === e.currentTarget) onChiudi()
  }

  return { onPointerDown, onClick }
}
