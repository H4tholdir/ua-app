'use client'

// DS v3 §5.18 — Avviso (toast): l'unica notifica non bloccante del sistema.
// Card radius 18 (`raggio.riga`) in alto, entra con `molla.snappy` (già
// impacchettata in `coreografie.avviso`), esce da sola dopo 4s — il timer si
// SOSPENDE su hover/focus (mai perdere un avviso che l'utente sta leggendo) e
// riprende dal tempo residuo alla fine dell'interazione. L'errore è
// l'eccezione di legge: MAI scompare da solo, ha sempre un bottone di
// chiusura esplicito (`LinkQuieto` "Chiudi", una via di fuga L6) e
// `suona('errore')` alla comparsa — l'UNICO suono di questo componente,
// l'avviso normale è silenzioso. Il testo dell'errore dice sempre cosa non è
// riuscito + cosa fare.
//
// Portal su `document.body` (stesso pattern sanzionato di Sheet — constraint
// 3): il toast deve stare sopra qualunque stacking context di pagina, quindi
// porta con sé `data-ds="v3"`. SSR-safety (constraint 12): qui NON basta la
// guardia sincrona `typeof document` di Sheet — lì il contenuto portalato è
// vuoto finché chiuso, qui il contenitore fixed esiste anche con zero toast,
// e comparire al primo render client (dove document c'è già) mentre il server
// non l'ha renderizzato è un hydration mismatch reale (QA visivo T15). Il
// contenitore monta quindi solo post-idratazione, via useSyncExternalStore
// (snapshot server false, client true — stesso pattern del catalogo/Task 1,
// niente setState in effect): server e primo render client coincidono
// entrambi su "niente", poi il portal appare e resta montato (le exit
// animation dei toast non vengono mai tagliate).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { coreografie, cssEase, useReducedMotion } from '@/design-system/v3/motion'
import { raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { suona } from '@/design-system/v3/sound'
import { vibra } from '@/design-system/v3/haptic'
import { LinkQuieto } from './LinkQuieto'

type Azione = { etichetta: string; onClick: () => void }
type Tipo = 'normale' | 'errore'
type VoceAvviso = { id: number; testo: string; tipo: Tipo; azione?: Azione }

const DURATA_AUTO_DISMISS_MS = 4000
const DIAMETRO_ICONA = 26

let prossimoId = 0

const AvvisiContext = createContext<{
  avvisa: (testo: string, opts?: { azione?: Azione }) => void
  errore: (testo: string, opts?: { azione?: Azione }) => void
} | null>(null)

// "Sono idratato?" via useSyncExternalStore: lo store non cambia mai (subscribe
// no-op), ma lo snapshot server è false e quello client è true — React usa il
// primo durante l'idratazione (render identico all'HTML server) e ri-renderizza
// col secondo subito dopo il mount. Niente setState in effect (regola ESLint
// react-hooks/set-state-in-effect), niente guardia sincrona su document.
const sottoscriviMai = () => () => {}
const snapshotClient = () => true
const snapshotServer = () => false

/**
 * AvvisiProvider — monta il contesto e il contenitore dei toast (§5.18).
 * Va avvolto attorno a qualunque albero che chiami `useAvvisi()`.
 */
export function AvvisiProvider(props: { children: ReactNode }) {
  const { children } = props
  const [voci, setVoci] = useState<VoceAvviso[]>([])
  const idratato = useSyncExternalStore(sottoscriviMai, snapshotClient, snapshotServer)

  const rimuovi = useCallback((id: number) => {
    setVoci((correnti) => correnti.filter((v) => v.id !== id))
  }, [])

  const avvisa = useCallback((testo: string, opts?: { azione?: Azione }) => {
    setVoci((correnti) => [...correnti, { id: prossimoId++, testo, tipo: 'normale', azione: opts?.azione }])
  }, [])

  const errore = useCallback((testo: string, opts?: { azione?: Azione }) => {
    setVoci((correnti) => [...correnti, { id: prossimoId++, testo, tipo: 'errore', azione: opts?.azione }])
    // L'unico suono di questo componente (§5.18): l'avviso normale resta muto.
    suona('errore')
    vibra('error')
  }, [])

  // SSR-safety + idratazione (constraint 12): il contenitore monta solo quando
  // `idratato` è true — mai sul server (niente document) e mai nel PRIMO render
  // client, che deve coincidere con l'HTML server. Vedi nota in testa al file.
  return (
    <AvvisiContext.Provider value={{ avvisa, errore }}>
      {children}
      {idratato &&
        createPortal(<AvvisiContenitore voci={voci} onRimuovi={rimuovi} />, document.body)}
    </AvvisiContext.Provider>
  )
}

/** useAvvisi — l'unico modo per mostrare un Avviso (§5.18). */
export function useAvvisi() {
  const ctx = useContext(AvvisiContext)
  if (!ctx) throw new Error('useAvvisi va chiamato dentro <AvvisiProvider>')
  return ctx
}

/**
 * Sospende/riprende un timer con tempo residuo — hover/focus mettono in
 * pausa, non azzerano: l'avviso errore non pianifica mai nulla (`tipo`).
 */
function useAutoDismiss(tipo: Tipo, onScadenza: () => void) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rimanenteRef = useRef(DURATA_AUTO_DISMISS_MS)
  const inizioRef = useRef(0)

  const cancella = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const pianifica = useCallback(
    (ms: number) => {
      cancella()
      inizioRef.current = Date.now()
      timeoutRef.current = setTimeout(onScadenza, ms)
    },
    [cancella, onScadenza]
  )

  useEffect(() => {
    if (tipo === 'errore') return
    pianifica(rimanenteRef.current)
    return cancella
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo])

  function sospendi() {
    if (tipo === 'errore') return
    rimanenteRef.current = Math.max(0, rimanenteRef.current - (Date.now() - inizioRef.current))
    cancella()
  }
  function riprendi() {
    if (tipo === 'errore') return
    pianifica(rimanenteRef.current)
  }

  return { sospendi, riprendi }
}

function IconaFamiglia(props: { tipo: Tipo }) {
  const { tipo } = props
  const attenzione = tipo === 'errore'
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: DIAMETRO_ICONA,
        height: DIAMETRO_ICONA,
        borderRadius: '50%',
        background: attenzione ? 'var(--red-tint)' : 'var(--green-tint)',
        color: attenzione ? 'var(--red)' : 'var(--green)',
        fontSize: 13,
        fontWeight: tipografia.weight.extrabold,
      }}
    >
      {attenzione ? '!' : '✓'}
    </span>
  )
}

function CorpoAvviso(props: { voce: VoceAvviso; onRimuovi: (id: number) => void }) {
  const { voce, onRimuovi } = props
  return (
    <>
      <IconaFamiglia tipo={voce.tipo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.xs, flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: tipografia.size.callout,
            fontWeight: tipografia.weight.bold,
            color: 'var(--ink)',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {voce.testo}
        </p>
        {(voce.azione || voce.tipo === 'errore') && (
          <div style={{ display: 'flex', gap: spazio.m }}>
            {voce.azione && <LinkQuieto onClick={voce.azione.onClick}>{voce.azione.etichetta}</LinkQuieto>}
            {voce.tipo === 'errore' && <LinkQuieto onClick={() => onRimuovi(voce.id)}>Chiudi</LinkQuieto>}
          </div>
        )}
      </div>
    </>
  )
}

const cardStile = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: spazio.s,
  padding: `${spazio.m}px`,
  borderRadius: raggio.riga,
  background: 'var(--card)',
  boxShadow: 'var(--sh-card)',
  pointerEvents: 'auto' as const,
}

/** AvvisoCard — variante animata (molla), usata quando reduced-motion è spento. */
function AvvisoCard(props: { voce: VoceAvviso; onRimuovi: (id: number) => void }) {
  const { voce, onRimuovi } = props
  const scadenza = useCallback(() => onRimuovi(voce.id), [onRimuovi, voce.id])
  const { sospendi, riprendi } = useAutoDismiss(voce.tipo, scadenza)

  return (
    <motion.div
      className="ds-avviso-card"
      role={voce.tipo === 'errore' ? 'alert' : 'status'}
      aria-live={voce.tipo === 'errore' ? 'assertive' : 'polite'}
      onMouseEnter={sospendi}
      onMouseLeave={riprendi}
      onFocus={sospendi}
      onBlur={riprendi}
      initial={coreografie.avviso.initial}
      animate={coreografie.avviso.animate}
      exit={coreografie.avviso.exit}
      style={cardStile}
    >
      <CorpoAvviso voce={voce} onRimuovi={onRimuovi} />
    </motion.div>
  )
}

/**
 * AvvisoRidotto — variante reduced-motion (§8.4): dissolvenza CSS pura al
 * posto della molla, stessa logica di sospensione. Monta fresca ad ogni
 * apertura (come SheetRidotto): l'`entrata` riparte sempre da `false`.
 */
function AvvisoRidotto(props: { voce: VoceAvviso; onRimuovi: (id: number) => void }) {
  const { voce, onRimuovi } = props
  const scadenza = useCallback(() => onRimuovi(voce.id), [onRimuovi, voce.id])
  const { sospendi, riprendi } = useAutoDismiss(voce.tipo, scadenza)
  const [entrata, setEntrata] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntrata(true))
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div
      className="ds-avviso-card"
      role={voce.tipo === 'errore' ? 'alert' : 'status'}
      aria-live={voce.tipo === 'errore' ? 'assertive' : 'polite'}
      onMouseEnter={sospendi}
      onMouseLeave={riprendi}
      onFocus={sospendi}
      onBlur={riprendi}
      style={{ ...cardStile, opacity: entrata ? 1 : 0, transition: `opacity ${cssEase.generico}` }}
    >
      <CorpoAvviso voce={voce} onRimuovi={onRimuovi} />
    </div>
  )
}

const contenitoreStile = {
  position: 'fixed' as const,
  top: spazio.l,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 1100,
  display: 'flex',
  flexDirection: 'column' as const,
  gap: spazio.s,
  width: '100%',
  maxWidth: 480,
  padding: `0 ${spazio.l}px`,
  pointerEvents: 'none' as const,
  // Esplicito e non solo "assenza di regola" (fix QA live Francesco round 2,
  // difesa in profondità oltre alla rimozione di `background` dalla regola
  // scope in ds-v3.css): il contenitore porta `data-ds="v3"` per i token, MA
  // non deve mai dipingere nulla — solo le card (`.ds-avviso-card`, sfondo
  // proprio `var(--card)`) sono visibili. Inline vince sempre sulla classe,
  // quindi resta trasparente anche se la regola CSS regredisse in futuro.
  background: 'transparent',
}

function AvvisiContenitore(props: { voci: VoceAvviso[]; onRimuovi: (id: number) => void }) {
  const { voci, onRimuovi } = props
  const reduced = useReducedMotion()

  return (
    <div data-ds="v3" style={contenitoreStile}>
      {reduced ? (
        voci.map((voce) => <AvvisoRidotto key={voce.id} voce={voce} onRimuovi={onRimuovi} />)
      ) : (
        <AnimatePresence>
          {voci.map((voce) => (
            <AvvisoCard key={voce.id} voce={voce} onRimuovi={onRimuovi} />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
