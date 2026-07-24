'use client'

// H1b (verbale QA 2026-07-24, «Ri-collaudo device #1», punto D1) — OVERLAY DIAGNOSTICO
// TEMPORANEO del motore suoni. Da RIMUOVERE (componente + `sound-diag.ts` + le chiamate in
// `sound.ts` + il mount nel root layout) quando il fix definitivo (dopo H1b) è chiuso.
//
// Scopo: il primo tocco sul device Android di Francesco resta muto nonostante due fix corretti.
// Direttiva: STOP ai fix alla cieca — questo overlay mostra a schermo, SUL DEVICE, cosa succede
// davvero nel motore audio al primo tocco (init, prefetch, primo gesto, sblocco, ogni suona()),
// per raccogliere evidenza prima di qualsiasi altro fix.
//
// Attivazione: SOLO query param `?diag=suoni` (niente persistenza, a differenza dell'overlay
// viewport P-STATUSBAR — questo strumento non deve sopravvivere a una navigazione senza query).
//
// Mount: DOPO `{children}` nel root layout (v. layout.tsx) — di proposito. `initSuoni()` viene
// chiamato nell'effect della pagina dentro `{children}`, che monta PRIMA di questo overlay
// (bottom-up: gli effect dei figli girano prima di quelli dei fratelli successivi): cosi i
// listener di gesto QUI SOTTO vengono aggiunti sempre DOPO quelli del motore, senza `once` che
// consumi nulla — l'overlay osserva, non intercetta (v. anche `pointer-events: none` sotto).
//
// È SOLA lettura/notifica: non chiama mai resume(), non tocca `sbloccato`/`ctx`, non altera
// l'ordine o il timing di alcun handler esistente del motore (v. `sound.ts`, `sound-diag.ts`).

import { useEffect, useState } from 'react'
import {
  decidiDiagSuoni,
  suonoDiagEmetti,
  suonoDiagRegistra,
  type EventoDiagSuono,
} from '@/design-system/v3/sound-diag'

const MAX_RIGHE = 14

export function DiagnosticaSuoni() {
  const [attiva, setAttiva] = useState(false)
  const [storico, setStorico] = useState<EventoDiagSuono[]>([])

  // Effect 1 — la DECISIONE, solo al mount: `?diag=suoni` puro (niente localStorage, a
  // differenza di P-STATUSBAR — v. nota di testa). Accensione un frame dopo: il lint del
  // React Compiler vieta il setState SINCRONO in effect (stesso pattern di DiagnosticaViewport).
  useEffect(() => {
    if (!decidiDiagSuoni(window.location.search)) return
    const rafId = requestAnimationFrame(() => setAttiva(true))
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Effect 2 — la REGISTRAZIONE al canale + i listener di gesto PROPRI dell'overlay, agganciati
  // ad `attiva`: gira DOPO l'effect della pagina che ha già chiamato `initSuoni()` (v. nota di
  // testa), garantendo l'ordine dei listener richiesto.
  useEffect(() => {
    if (!attiva) return
    const cancella = suonoDiagRegistra(setStorico)

    let catturato = false
    const suGesto = (evento: 'pointerdown' | 'touchend' | 'click') => () => {
      if (catturato) return
      catturato = true
      const ua = typeof navigator !== 'undefined' ? navigator.userActivation : undefined
      suonoDiagEmetti('gesto', () => ({
        evento,
        isActive: ua?.isActive ?? null,
        hasBeenActive: ua?.hasBeenActive ?? null,
      }))
    }
    const suPointerdown = suGesto('pointerdown')
    const suTouchend = suGesto('touchend')
    const suClick = suGesto('click')
    // Passivi, senza `once` (coerenza col motore: non consumano nulla), aggiunti DOPO quelli
    // di `initSuoni()` per costruzione del mount chain (v. nota di testa).
    document.addEventListener('pointerdown', suPointerdown, { passive: true })
    document.addEventListener('touchend', suTouchend, { passive: true })
    document.addEventListener('click', suClick, { passive: true })

    return () => {
      cancella()
      document.removeEventListener('pointerdown', suPointerdown)
      document.removeEventListener('touchend', suTouchend)
      document.removeEventListener('click', suClick)
    }
  }, [attiva])

  if (!attiva) return null

  const primoInit = storico.find((e) => e.tipo === 'init')
  const primoPointerdown = storico.find((e) => e.tipo === 'gesto' && e.dettagli.evento === 'pointerdown')
  const ultimoStatechange = [...storico].reverse().find((e) => e.tipo === 'statechange')
  const stateAttuale = (ultimoStatechange?.dettagli.state ?? primoInit?.dettagli.state ?? 'n/d') as string
  const bufferOk = new Set(
    storico.filter((e) => e.tipo === 'prefetch' && e.dettagli.fase === 'decode-fine').map((e) => e.dettagli.nome),
  ).size
  const sbloccatoOk = storico.some((e) => e.tipo === 'sblocca' && e.dettagli.esito === 'resolve')
  const ultimaSuona = [...storico].reverse().find((e) => e.tipo === 'suona')

  const righe = storico.slice(-MAX_RIGHE)

  return (
    <div style={pannelloStile} role="log" aria-label="Diagnostica suoni">
      <strong>UÀ diag suoni</strong>
      <div>
        ctx {stateAttuale} · buffer {bufferOk}/7 · sbloccato {sbloccatoOk ? 'sì' : 'no'} · ultima suona{' '}
        {ultimaSuona ? `${ultimaSuona.dettagli.nome}: ${ultimaSuona.dettagli.esito}` : 'n/d'}
      </div>
      <div style={{ opacity: 0.85 }}>
        {righe.map((e, i) => (
          <div key={i}>
            {/* baseline: t0 = init() (ms da initSuoni, item 3 del brief); suona() aggiunge in
                più il delta dal primo pointerdown (item 6), non lo sostituisce */}
            t+{formattaDelta(e.t, primoInit?.t)}ms [{e.tipo}] {formattaDettagli(e.dettagli)}
            {e.tipo === 'suona' && primoPointerdown ? ` Δpd=${formattaDelta(e.t, primoPointerdown.t)}ms` : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

/** ms da un t0 di riferimento (`performance.now()`); se il t0 non esiste ancora, ms assoluti —
 *  comunque un numero leggibile, mai una riga rotta. */
function formattaDelta(t: number, t0: number | undefined): number {
  return Math.round(t - (t0 ?? 0))
}

function formattaDettagli(dettagli: Record<string, unknown>): string {
  return Object.entries(dettagli)
    .map(([k, v]) => `${k}=${v}`)
    .join(' ')
}

// Stili inline deliberati (stesso principio di DiagnosticaViewport: strumento usa-e-getta,
// niente dipendenza dai ds/motion — niente animazioni di proposito, v. brief H1b).
// `pointerEvents: 'none'` OBBLIGATORIO: l'overlay non deve MAI intercettare i tocchi — sennò
// altererebbe proprio il fenomeno che sta osservando. Per questo niente tasto «Spegni» (sarebbe
// morto sotto pointer-events:none) e niente scroll interattivo: le righe sono tagliate alla
// coda (`MAX_RIGHE`), non scrollabili.
const pannelloStile: React.CSSProperties = {
  position: 'fixed',
  top: 'max(4px, env(safe-area-inset-top))',
  left: 4,
  right: 4,
  zIndex: 3000,
  maxHeight: '60vh',
  overflow: 'hidden',
  background: 'rgba(0,0,0,.82)',
  color: '#9f9',
  font: '10px/1.4 ui-monospace, Menlo, monospace',
  padding: '6px 8px',
  borderRadius: 8,
  pointerEvents: 'none',
  wordBreak: 'break-word',
}
