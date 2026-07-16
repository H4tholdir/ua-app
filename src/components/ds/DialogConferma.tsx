'use client'

// DS v3 §5.17 — DialogConferma: l'UNICA card centrata ammessa dal design
// system, riservata alle conferme distruttive («Butto via il lavoro n.148 di
// Studio Bianchi?»). Eccezione di spec al divieto generale di modal centrati
// su mobile (§5.16): qui è intenzionale — un'interruzione netta prima di un
// gesto irreversibile, non un form. `testo` DEVE contenere l'oggetto
// esplicito della conferma: è un contratto del chiamante, non verificabile a
// runtime (come le altre regole "di legge" del design system — solo JSDoc).

import { useEffect, useId, type CSSProperties, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { molla, useReducedMotion } from '@/design-system/v3/motion'
import { tipografia, spazio, raggio, materia } from '@/design-system/v3/tokens'
import { TastoPrimario } from './TastoPrimario'
import { TastoSecondario } from './TastoSecondario'

/**
 * DialogConferma — conferma distruttiva centrata (§5.17).
 *
 * Card max 340, stesso scrim di `Sheet` (`materia.scrim`, tap → `onAnnulla`),
 * Esc → `onAnnulla`. Ordine azioni default: `etichettaSicura` SOPRA come
 * `TastoSecondario`, `etichettaDistruttiva` SOTTO come `TastoPrimario` — la
 * mano che scorre incontra prima la via sicura. Nessun suono all'apertura
 * (il suono appartiene all'esito dell'azione, non alla comparsa del dialog):
 * i due tasti suonano/vibrano già per conto proprio al click, questo
 * componente non chiama mai `suona()` direttamente.
 *
 * Variante consegna (deroga §5.17, decision record 16/07): `primarioSopra`
 * inverte l'ordine SOLO per il rito consegna. `occhiello`, `centraTesto` e
 * `nota` sono tutte opzionali e additive — il default resta invariato
 * (riserva arch #7: nessun consumatore esistente cambia comportamento).
 *
 * Portal su `document.body` come `Sheet` — stessa eccezione sanzionata alla
 * regola "solo il catalogo monta data-ds" (constraint 3): il DOM vive fuori
 * dallo scope del catalogo/pagina.
 */
export function DialogConferma(props: {
  aperto: boolean
  titolo: string
  testo: string
  etichettaDistruttiva: string
  etichettaSicura: string
  onConferma: () => void
  onAnnulla: () => void
  /** Riga 16.5/700 `--muted` centrata sopra il titolo. */
  occhiello?: string
  /** Centra titolo+testo (il titolo diventa l'«oggetto» del rito consegna). */
  centraTesto?: boolean
  /** Callout ambra compatta (D-6): informazione, mai tappabile. */
  nota?: string
  /** Deroga §5.17 consegna: `TastoPrimario` SOPRA, `TastoSecondario` sotto. */
  primarioSopra?: boolean
}) {
  const {
    aperto,
    titolo,
    testo,
    etichettaDistruttiva,
    etichettaSicura,
    onConferma,
    onAnnulla,
    occhiello,
    centraTesto = false,
    nota,
    primarioSopra = false,
  } = props
  const reduced = useReducedMotion()
  const titoloId = useId()
  const testoId = useId()

  useEffect(() => {
    if (!aperto) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onAnnulla()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aperto, onAnnulla])

  if (typeof document === 'undefined') return null

  function chiudiSeScrim(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onAnnulla()
  }

  const tasti = [
    <TastoSecondario key="sicura" onClick={onAnnulla}>{etichettaSicura}</TastoSecondario>,
    <TastoPrimario key="distruttiva" onClick={onConferma}>{etichettaDistruttiva}</TastoPrimario>,
  ]

  const contenutoCard = (
    <>
      {occhiello && <p style={occhielloStile}>{occhiello}</p>}
      <h2
        id={titoloId}
        style={{ ...titoloStile, ...(centraTesto ? { textAlign: 'center' as const, letterSpacing: '-0.01em' } : null) }}
      >
        {titolo}
      </h2>
      <p id={testoId} style={{ ...testoStile, ...(centraTesto ? { textAlign: 'center' as const } : null) }}>{testo}</p>
      {nota && <p style={notaStile}>{nota}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m, marginTop: spazio.l }}>
        {primarioSopra ? [tasti[1], tasti[0]] : tasti}
      </div>
    </>
  )

  const overlay = reduced ? (
    aperto ? (
      <div data-ds="v3" style={wrapperStile}>
        <div className="ds-dialog-scrim" onClick={chiudiSeScrim} style={scrimStile} />
        <div role="dialog" aria-modal="true" aria-labelledby={titoloId} aria-describedby={testoId} style={cardStile}>
          {contenutoCard}
        </div>
      </div>
    ) : null
  ) : (
    <AnimatePresence>
      {aperto && (
        <motion.div key="dialog-overlay" data-ds="v3" style={wrapperStile}>
          <motion.div
            className="ds-dialog-scrim"
            onClick={chiudiSeScrim}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={molla.smooth}
            style={scrimStile}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titoloId}
            aria-describedby={testoId}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={molla.smooth}
            style={cardStile}
          >
            {contenutoCard}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return createPortal(overlay, document.body)
}

const wrapperStile: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: spazio.l,
  // Esplicito, non solo "assenza di regola" (fix QA live Francesco round 2 —
  // difesa in profondità oltre alla rimozione di `background` dalla regola
  // scope `[data-ds="v3"]` in ds-v3.css): questo wrapper porta `data-ds="v3"`
  // per i token, non per dipingere — dietro allo `scrimStile` semi-trasparente
  // deve trasparire la pagina vera, mai un rettangolo opaco `var(--bg)`.
  background: 'transparent',
}

const scrimStile: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: materia.scrim,
}

const cardStile: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 340,
  background: 'var(--card)',
  borderRadius: raggio.card,
  padding: spazio.l,
  boxShadow: 'var(--sh-card)',
}

const titoloStile: CSSProperties = {
  fontSize: tipografia.size.heading,
  fontWeight: tipografia.weight.extrabold,
  color: 'var(--ink)',
  margin: 0,
}

const testoStile: CSSProperties = {
  fontSize: 15.5,
  fontWeight: tipografia.weight.regular,
  color: 'var(--muted)',
  margin: `${spazio.s}px 0 0`,
}

const occhielloStile: CSSProperties = {
  fontSize: 16.5,
  fontWeight: tipografia.weight.bold,
  color: 'var(--muted)',
  textAlign: 'center',
  margin: 0,
}

// Nota ambra compatta (D-6): informazione, non decisione — mai tappabile,
// mai più evidente dell'oggetto (L1/L3).
const notaStile: CSSProperties = {
  fontSize: 14,
  fontWeight: tipografia.weight.semibold,
  color: 'var(--amber)',
  background: 'var(--amber-tint)',
  borderRadius: raggio.riga - 6,
  padding: `${spazio.xs + 2}px ${spazio.sm}px`,
  margin: `${spazio.s}px 0 0`,
  textAlign: 'center',
}
