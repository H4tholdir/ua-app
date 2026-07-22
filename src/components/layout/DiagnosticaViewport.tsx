'use client'

// Collaudo R3 (P-STATUSBAR, 22/07 notte) — OVERLAY DIAGNOSTICO TEMPORANEO del viewport.
// Da RIMUOVERE (componente + helper + mount nel root layout) quando P-STATUSBAR è chiuso.
//
// Scopo: misurare SUL DEVICE (PWA installata) perché all'avvio «la barra di stato sposta tutto
// in giù». Mostra i numeri veri e registra i cambi di dimensione dei primi secondi di vita —
// se il viewport nasce alto quanto lo schermo intero e si restringe (o NON si restringe) dopo
// lo splash, qui si vede, con i millisecondi.
//
// Attivazione (v. logica pura in `src/lib/utils/diagnostica-viewport.ts`):
//   • accendere: aprire `uachelab.com/dashboard?diag=viewport` in Chrome → il flag persiste
//     in localStorage → l'overlay compare anche all'avvio della PWA installata (stessa origin);
//   • spegnere: tasto «Spegni» dell'overlay, oppure `?diag=off`.
//
// È uno strumento di collaudo, non una superficie prodotto: niente token/ds di proposito
// (deve funzionare IDENTICO su ogni pagina, v3 o v2.3, senza dipendere dai loro wrapper).

import { useEffect, useState } from 'react'
import {
  DIAG_VIEWPORT_STORAGE_KEY,
  decidiDiagViewport,
  formattaPx,
} from '@/lib/utils/diagnostica-viewport'

type Misura = {
  t: number // ms dalla nascita del componente
  evento: string
  innerW: number
  innerH: number
  vvW: number | null
  vvH: number | null
  vvTop: number | null
  clientH: number
  scrollY: number
}

const T0 = Symbol.for('ua-diag-t0')

function adesso(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function misura(evento: string, t0: number): Misura {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  return {
    t: Math.round(adesso() - t0),
    evento,
    innerW: window.innerWidth,
    innerH: window.innerHeight,
    vvW: vv ? vv.width : null,
    vvH: vv ? vv.height : null,
    vvTop: vv ? vv.offsetTop : null,
    clientH: document.documentElement.clientHeight,
    scrollY: window.scrollY,
  }
}

/** Risolve un'unità viewport (100dvh/svh/lvh) e gli env(safe-area-inset-*) in px REALI,
 *  con sonde DOM usa-e-getta: è l'unico modo di leggere quei valori dal browser. */
function misuraUnitaEInsets(): { dvh: number; svh: number; lvh: number; insets: string } {
  const sonda = (stile: string): number => {
    const div = document.createElement('div')
    div.style.cssText = `position:fixed;left:-9999px;top:0;width:10px;pointer-events:none;${stile}`
    document.body.appendChild(div)
    const h = div.getBoundingClientRect().height
    div.remove()
    return h
  }
  const dvh = sonda('height:100dvh')
  const svh = sonda('height:100svh')
  const lvh = sonda('height:100lvh')
  const div = document.createElement('div')
  div.style.cssText =
    'position:fixed;left:-9999px;top:0;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);' +
    'padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)'
  document.body.appendChild(div)
  const cs = getComputedStyle(div)
  const insets = `top ${cs.paddingTop} · right ${cs.paddingRight} · bottom ${cs.paddingBottom} · left ${cs.paddingLeft}`
  div.remove()
  return { dvh, svh, lvh, insets }
}

export function DiagnosticaViewport() {
  const [attiva, setAttiva] = useState(false)
  const [storico, setStorico] = useState<Misura[]>([])
  const [unita, setUnita] = useState<{ dvh: number; svh: number; lvh: number; insets: string } | null>(null)
  const [displayMode, setDisplayMode] = useState('')

  // Effect 1 — la DECISIONE, solo al mount (hard load): la PWA parte dallo start_url, e il
  // flusso documentato passa da un full load col query param; una navigazione client-side con
  // ?diag=… non riconsulta (accettato, review M-4). Accensione un frame dopo (pattern
  // sanzionato di SheetRidotto): il lint del React Compiler vieta il setState SINCRONO in effect.
  useEffect(() => {
    let flagSalvato: string | null = null
    try {
      flagSalvato = window.localStorage.getItem(DIAG_VIEWPORT_STORAGE_KEY)
    } catch {
      // storage negato (Safari private, policy): l'overlay vive solo di query param
    }
    const esito = decidiDiagViewport(window.location.search, flagSalvato)
    try {
      if (esito.flag === '1') window.localStorage.setItem(DIAG_VIEWPORT_STORAGE_KEY, '1')
      else window.localStorage.removeItem(DIAG_VIEWPORT_STORAGE_KEY)
    } catch {
      /* come sopra */
    }
    if (!esito.attiva) return
    // t0 fissato SUBITO (non nel raf): è la timeline dell'avvio che interessa. Condiviso in un
    // globale simbolico: se il componente rimonta (navigazione), il tempo resta relativo al
    // PRIMO mount.
    const g = globalThis as Record<symbol, unknown>
    if (typeof g[T0] !== 'number') g[T0] = adesso()
    const rafId = requestAnimationFrame(() => setAttiva(true))
    return () => cancelAnimationFrame(rafId)
  }, [])

  // Effect 2 — le MISURE, agganciate ad `attiva`: «Spegni» (setAttiva(false)) esegue la cleanup
  // e stacca listener e timer (review M-1 — prima restavano vivi fino al reload).
  useEffect(() => {
    if (!attiva) return
    const g = globalThis as Record<symbol, unknown>
    const t0 = typeof g[T0] === 'number' ? (g[T0] as number) : adesso()

    // `conSonde=false` per gli eventi a frequenza di frame (vv-scroll durante il pinch): le
    // sonde DOM forzano layout e perturberebbero la misura stessa (review M-2). dvh/insets
    // cambiano solo coi resize: lì le sonde girano.
    const campiona = (evento: string, conSonde = true) => {
      setStorico((prima) => [...prima.slice(-11), misura(evento, t0)]) // ultime 12 righe
      if (conSonde) setUnita(misuraUnitaEInsets())
    }
    const rafId = requestAnimationFrame(() => {
      campiona('mount')
      setDisplayMode(
        ['standalone', 'fullscreen', 'minimal-ui', 'browser'].find(
          (m) => typeof matchMedia === 'function' && matchMedia(`(display-mode: ${m})`).matches,
        ) ?? 'sconosciuto',
      )
    })

    const suResize = () => campiona('resize')
    const suVvResize = () => campiona('vv-resize')
    const suVvScroll = () => campiona('vv-scroll', false)
    window.addEventListener('resize', suResize)
    window.visualViewport?.addEventListener('resize', suVvResize)
    window.visualViewport?.addEventListener('scroll', suVvScroll)
    // Campioni a tempo nei primi secondi: la corsa post-splash può NON emettere resize.
    const timer = [250, 1000, 3000, 8000].map((ms) => window.setTimeout(() => campiona(`t+${ms}ms`), ms))
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', suResize)
      window.visualViewport?.removeEventListener('resize', suVvResize)
      window.visualViewport?.removeEventListener('scroll', suVvScroll)
      timer.forEach((id) => window.clearTimeout(id))
    }
  }, [attiva])

  if (!attiva) return null

  const spegni = () => {
    try {
      window.localStorage.removeItem(DIAG_VIEWPORT_STORAGE_KEY)
    } catch {
      /* niente storage, niente flag */
    }
    setAttiva(false)
  }

  const ultima = storico[storico.length - 1]

  return (
    <div style={pannelloStile} role="log" aria-label="Diagnostica viewport">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <strong>UÀ diag viewport</strong>
        <button type="button" onClick={spegni} style={tastoStile}>
          Spegni
        </button>
      </div>
      <div>
        display-mode: {displayMode} · dpr {typeof window !== 'undefined' ? window.devicePixelRatio : '?'} · screen{' '}
        {typeof screen !== 'undefined' ? `${screen.width}×${screen.height}` : 'n/d'}
      </div>
      {unita && (
        <div>
          100dvh {formattaPx(unita.dvh)} · 100svh {formattaPx(unita.svh)} · 100lvh {formattaPx(unita.lvh)}
          <br />
          safe-area: {unita.insets}
        </div>
      )}
      {ultima && (
        <div>
          inner {ultima.innerW}×{ultima.innerH} · clientH {ultima.clientH} · vv {formattaPx(ultima.vvW)}×
          {formattaPx(ultima.vvH)} (top {formattaPx(ultima.vvTop)}) · scrollY {ultima.scrollY}
        </div>
      )}
      <div style={{ opacity: 0.85 }}>
        {storico.map((m, i) => (
          <div key={i}>
            t+{m.t}ms [{m.evento}] innerH {m.innerH} · vvH {formattaPx(m.vvH)} · vvTop {formattaPx(m.vvTop)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Stili inline deliberati (v. nota di testa: nessuna dipendenza dai ds). z-index sopra ogni
// overlay dell'app (Sheet/Dialog = 1000). pointer-events solo sul pannello: la pagina sotto
// resta usabile — l'overlay osserva, non intercetta.
const pannelloStile: React.CSSProperties = {
  position: 'fixed',
  top: 'max(4px, env(safe-area-inset-top))',
  left: 4,
  right: 4,
  zIndex: 3000,
  background: 'rgba(0,0,0,.82)',
  color: '#9f9',
  font: '11px/1.45 ui-monospace, Menlo, monospace',
  padding: '6px 8px',
  borderRadius: 8,
  pointerEvents: 'auto',
  wordBreak: 'break-word',
}

const tastoStile: React.CSSProperties = {
  font: 'inherit',
  color: '#fff',
  background: 'rgba(255,255,255,.15)',
  border: '1px solid rgba(255,255,255,.4)',
  borderRadius: 6,
  padding: '2px 8px',
}
