'use client'

// DS v3 §5.15 — PillVoce: input vocale, progressive enhancement puro sopra la
// Web Speech API. Presente in OGNI passo del wizard (sotto-progetto 3), sempre
// in fondo — qui vive solo il componente, isolato dal contesto del wizard.
// Se il browser non ha `window.SpeechRecognition` né il prefisso webkit, il
// componente NON esiste: `null`, senza Avviso — è un potenziamento, non un
// flusso critico. Idem per ogni errore di riconoscimento: torna quieto senza
// disturbare, il chiamante resta padrone della conferma (§5.15).

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion } from 'motion/react'
import { molla, cssEase } from '@/design-system/v3/motion'
import { gradiente, pillVoce, raggio, tipografia, testoSuFaccia } from '@/design-system/v3/tokens'
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
  // Stato fisico della pressione (§5.15 rev 2, anti-glitch): SOLO per lo scambio
  // di classe delle ombre (faccia + cerchioMic) via CSS — il translateY(2px)
  // vero e proprio lo anima Motion con `whileTap` (v. sotto), mai due motori
  // sulla stessa proprietà.
  const [premuto, setPremuto] = useState(false)
  const riconoscimentoRef = useRef<RiconoscimentoVoce | null>(null)

  // `onTesto` letto via ref sempre aggiornata: l'istanza di riconoscimento è
  // cache tra i tap e i suoi handler sono assegnati una volta sola — senza la
  // ref, un `onTesto` che cambia da un passo all'altro del wizard (SP3)
  // resterebbe quello del render in cui è partito l'ascolto (chiusura stantia)
  // e scriverebbe nel passo sbagliato, anche a metà ascolto.
  const onTestoRef = useRef(onTesto)
  useEffect(() => {
    onTestoRef.current = onTesto
  }, [onTesto])

  // Igiene privacy (review T14): se il componente si smonta mentre ascolta,
  // il microfono NON deve restare acceso. Cleanup mount-scoped: ferma la
  // sessione e stacca gli handler, così eventi tardivi (onresult/onend in
  // volo) non chiamano più setState su un componente che non c'è.
  useEffect(() => {
    return () => {
      const riconoscimento = riconoscimentoRef.current
      if (!riconoscimento) return
      riconoscimento.onresult = null
      riconoscimento.onerror = null
      riconoscimento.onend = null
      riconoscimento.stop()
      riconoscimentoRef.current = null
    }
  }, [])

  if (!haSupporto) return null

  function ottieniRiconoscimento(): RiconoscimentoVoce | null {
    if (riconoscimentoRef.current) return riconoscimentoRef.current
    const Costruttore = costruttoreVoce()
    if (!Costruttore) return null
    const istanza = new Costruttore()
    istanza.lang = 'it-IT'
    istanza.onresult = (evento) => {
      setAscolto(false)
      const risultati = evento.results
      const transcript = risultati[risultati.length - 1]?.[0]?.transcript?.trim() ?? ''
      if (transcript) onTestoRef.current(transcript)
    }
    // Errori e fine riconoscimento: si torna quieti in silenzio (§5.15) — è
    // un potenziamento, non un flusso critico che merita un Avviso (§5.18).
    istanza.onerror = () => setAscolto(false)
    istanza.onend = () => setAscolto(false)
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
    suona('tap')
    vibra('light')
    setAscolto(true)
    riconoscimento.start()
  }

  return (
    <>
      {/* Materia «la pill di carta» (§5.15 rev 2, valori VERBATIM dal mockup
          .pvA): classi scoped, stesso schema del TastoPiu. Il cerchioMic usa
          il gradiente del TastoPrimario (riuso diretto in light — combacia
          esattamente) con un dark proprio (vedi tokens.ts). Le transizioni di
          box-shadow vivono in cssEase.pillVoce; il translateY del pressed è
          SOLO di Motion (whileTap più sotto) — mai due motori sulla stessa
          proprietà. Il respiro del cerchio in ascolto è opacity-only e si
          spegne sotto prefers-reduced-motion (§8.4). */}
      <style>{`
        .ds-pill-voce {
          background: ${pillVoce.faccia};
          box-shadow: ${pillVoce.facciaOmbra};
          transition: ${cssEase.pillVoce};
        }
        .ds-pill-voce:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
        .ds-pill-voce--premuto {
          box-shadow: ${pillVoce.facciaOmbraPressed};
        }
        .ds-pill-voce-cerchio-mic {
          background: ${gradiente.tastoPrimario};
          box-shadow: ${pillVoce.cerchioMicOmbra};
          transition: ${cssEase.pillVoce};
        }
        .ds-pill-voce--premuto .ds-pill-voce-cerchio-mic {
          box-shadow: ${pillVoce.cerchioMicOmbraPressed};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-pill-voce {
          background: ${pillVoce.facciaNotte};
          box-shadow: ${pillVoce.facciaOmbraNotte};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-pill-voce--premuto {
          box-shadow: ${pillVoce.facciaOmbraPressedNotte};
        }
        [data-theme="dark"] [data-ds="v3"] .ds-pill-voce-cerchio-mic {
          background: ${pillVoce.cerchioMicNotte};
          box-shadow: ${pillVoce.cerchioMicOmbraNotte};
        }
        @keyframes ds-pill-voce-pulsa {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .ds-pill-voce-mic--ascolto {
            animation: ds-pill-voce-pulsa 1.6s ease-in-out infinite;
          }
        }
      `}</style>
      <motion.button
        type="button"
        data-parte="pill"
        className={premuto ? 'ds-pill-voce ds-pill-voce--premuto' : 'ds-pill-voce'}
        onClick={handleTap}
        onTapStart={() => setPremuto(true)}
        onTap={() => setPremuto(false)}
        onTapCancel={() => setPremuto(false)}
        aria-pressed={ascolto}
        whileTap={{ y: 2 }}
        transition={molla.press}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          width: '100%',
          height: 64,
          borderRadius: raggio.pill,
          border: 'none',
          padding: '0 10px 0 24px',
          color: 'var(--ink)',
          fontSize: 17.5,
          fontWeight: tipografia.weight.bold,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <span data-parte="testo" style={{ flex: 1, textAlign: 'left' }}>
          {ascolto ? 'Ti ascolto…' : etichetta}
        </span>
        <span
          aria-hidden="true"
          data-parte="cerchio-mic"
          className={ascolto ? 'ds-pill-voce-cerchio-mic ds-pill-voce-mic--ascolto' : 'ds-pill-voce-cerchio-mic'}
          style={{
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            width: 46,
            height: 46,
            borderRadius: raggio.pill,
          }}
        >
          {/* Glifo mic pulito, non l'emoji del mockup (placeholder) — bianco
              via testoSuFaccia (constraint 4a: niente hex fuori da tokens.ts). */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" fill={testoSuFaccia} />
            <path
              d="M5 11a7 7 0 0 0 14 0"
              stroke={testoSuFaccia}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
            <line x1="12" y1="18" x2="12" y2="22" stroke={testoSuFaccia} strokeWidth="2" strokeLinecap="round" />
            <line x1="8" y1="22" x2="16" y2="22" stroke={testoSuFaccia} strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </motion.button>
    </>
  )
}
