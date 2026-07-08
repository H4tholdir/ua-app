'use client'

// DS v3 §5.15 — PillVoce: input vocale, progressive enhancement puro sopra la
// Web Speech API. Presente in OGNI passo del wizard (sotto-progetto 3), sempre
// in fondo — qui vive solo il componente, isolato dal contesto del wizard.
// Se il browser non ha `window.SpeechRecognition` né il prefisso webkit, il
// componente NON esiste: `null`, senza Avviso — è un potenziamento, non un
// flusso critico. Idem per ogni errore di riconoscimento: torna quieto senza
// disturbare, il chiamante resta padrone della conferma (§5.15).

import { useRef, useState, useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { molla } from '@/design-system/v3/motion'
import { materia, raggio, spazio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'

// Shape minima del Web Speech API che ci serve — lib.dom.d.ts non porta
// l'interfaccia `SpeechRecognition` né i globali `Window.SpeechRecognition` /
// `webkitSpeechRecognition` (solo `SpeechRecognitionResult`/`Alternative`,
// usati per i sottotitoli video): li dichiariamo qui, scoped al file.
interface RiconoscimentoVoceEvento {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
interface RiconoscimentoVoce {
  lang: string
  start(): void
  stop(): void
  onresult: ((evento: RiconoscimentoVoceEvento) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}
interface CostruttoreRiconoscimentoVoce {
  new (): RiconoscimentoVoce
}
declare global {
  interface Window {
    SpeechRecognition?: CostruttoreRiconoscimentoVoce
    webkitSpeechRecognition?: CostruttoreRiconoscimentoVoce
  }
}

function costruttoreVoce(): CostruttoreRiconoscimentoVoce | undefined {
  if (typeof window === 'undefined') return undefined
  return window.SpeechRecognition ?? window.webkitSpeechRecognition
}

// Feature-detect SSR-safe: l'API non appare/scompare a runtime, quindi non
// serve una sottoscrizione reale — ma `useSyncExternalStore` resta il modo
// corretto di leggerla in render senza mai fare `setState` in un `useEffect`
// di mount (stesso pattern del tema letto in CatalogoPage, Task 1).
function sottoscriviSupporto(): () => void {
  return () => {}
}
function haSupportoClient(): boolean {
  return costruttoreVoce() !== undefined
}
function haSupportoServer(): boolean {
  return false
}

/**
 * PillVoce — l'input vocale (§5.15), progressive enhancement puro.
 *
 * `onTesto` riceve il trascritto quando il riconoscimento chiude da solo — la
 * conferma di cosa fare con quel testo resta del chiamante (wizard, SP3).
 */
export function PillVoce(props: { onTesto: (testo: string) => void; etichetta?: string }) {
  const { onTesto, etichetta = 'Dimmelo a voce' } = props
  const haSupporto = useSyncExternalStore(sottoscriviSupporto, haSupportoClient, haSupportoServer)
  const [ascolto, setAscolto] = useState(false)
  const riconoscimentoRef = useRef<RiconoscimentoVoce | null>(null)

  if (!haSupporto) return null

  function ottieniRiconoscimento(): RiconoscimentoVoce | null {
    if (riconoscimentoRef.current) return riconoscimentoRef.current
    const Costruttore = costruttoreVoce()
    if (!Costruttore) return null
    const istanza = new Costruttore()
    istanza.lang = 'it-IT'
    riconoscimentoRef.current = istanza
    return istanza
  }

  function handleTap() {
    const riconoscimento = ottieniRiconoscimento()
    if (!riconoscimento) return
    if (ascolto) {
      riconoscimento.stop()
      setAscolto(false)
      return
    }
    // Gli handler si riassegnano a ogni tap (non solo alla creazione): l'istanza
    // è cache in `riconoscimentoRef`, ma `onTesto` può cambiare da un passo
    // all'altro del wizard (SP3) — senza questo, il callback resterebbe quello
    // del primo montaggio e scriverebbe nel passo sbagliato.
    riconoscimento.onresult = (evento) => {
      setAscolto(false)
      const risultati = evento.results
      const transcript = risultati[risultati.length - 1]?.[0]?.transcript?.trim() ?? ''
      if (transcript) onTesto(transcript)
    }
    // Errori e fine riconoscimento: si torna quieti in silenzio (§5.15) — è
    // un potenziamento, non un flusso critico che merita un Avviso (§5.18).
    riconoscimento.onerror = () => setAscolto(false)
    riconoscimento.onend = () => setAscolto(false)
    suona('tap')
    vibra('light')
    setAscolto(true)
    riconoscimento.start()
  }

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9) + pulse del cerchio mic
          in ascolto: opacità via CSS lineare, ammessa fuori dalle molle di
          legge (§8.1) — stesso schema dello Skeleton (§5.25). */}
      <style>{`
        .ds-pill-voce { background: var(--ink); }
        [data-theme="dark"] [data-ds="v3"] .ds-pill-voce { background: var(--elv); }
        .ds-pill-voce:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
        @keyframes ds-pill-voce-pulsa {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .ds-pill-voce-mic--ascolto {
          animation: ds-pill-voce-pulsa 1.1s linear infinite;
        }
      `}</style>
      <motion.button
        type="button"
        className="ds-pill-voce"
        onClick={handleTap}
        aria-pressed={ascolto}
        whileTap={{ scale: 0.97 }}
        transition={molla.press}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: spazio.sm,
          height: 64,
          borderRadius: raggio.pill,
          border: 'none',
          padding: `0 ${spazio.ml}px`,
          color: testoSuFaccia,
          fontSize: 17.5,
          fontWeight: tipografia.weight.bold,
          cursor: 'pointer',
        }}
      >
        <span
          aria-hidden="true"
          className={ascolto ? 'ds-pill-voce-mic--ascolto' : undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: raggio.pill,
            background: materia.cerchioMicPillVoce,
            fontSize: 17,
            lineHeight: 1,
          }}
        >
          🎙️
        </span>
        {ascolto ? 'Ti ascolto…' : etichetta}
      </motion.button>
    </>
  )
}
