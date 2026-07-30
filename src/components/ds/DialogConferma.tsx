'use client'

// DS v3 §5.17 — DialogConferma: l'UNICA card centrata ammessa dal design
// system, riservata alle conferme distruttive («Butto via il lavoro n.148 di
// Studio Bianchi?»). Eccezione di spec al divieto generale di modal centrati
// su mobile (§5.16): qui è intenzionale — un'interruzione netta prima di un
// gesto irreversibile, non un form. `testo` DEVE contenere l'oggetto
// esplicito della conferma: è un contratto del chiamante, non verificabile a
// runtime (come le altre regole "di legge" del design system — solo JSDoc).
//
// Emendamento 30/07/2026 (D80): resta l'UNICA card centrata, ma non è più
// l'unica FORMA di conferma distruttiva — sopra un overlay a tutto schermo
// la forma è il foglio dal basso (§5.42, FoglioConferma). Stessi due tasti,
// stesso ordine, contenitore diverso.

import { useEffect, useId, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { molla, useReducedMotion } from '@/design-system/v3/motion'
import { tipografia, spazio, raggio, materia } from '@/design-system/v3/tokens'
import { TastoPrimario } from './TastoPrimario'
import { TastoSecondario } from './TastoSecondario'
import { useTapScrim } from './useTapScrim'
import { entraOverlay, esciOverlay } from './storia-overlay'
import { trappolaFocus } from './trappola-focus'

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
  const cardRef = useRef<HTMLDivElement>(null)
  // Collaudo R3 (P9): stesso contratto anti-ghost-click dello Sheet — lo scrim annulla solo se
  // il gesto è nato sullo scrim (v. useTapScrim). Cablato su ENTRAMBE le varianti.
  const tapScrim = useTapScrim(aperto, onAnnulla)

  useEffect(() => {
    if (!aperto) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onAnnulla()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [aperto, onAnnulla])

  // C2 (review finale whole-branch) — il back del telefono deve ANNULLARE questo dialog, mai
  // attraversarlo per navigare sotto (direttiva permanente «back = pagina precedente,
  // OVUNQUE»: la pagina precedente di un dialog aperto è la pagina SENZA il dialog). Mai
  // `onConferma`: un gesto di ritorno non conferma un'azione distruttiva.
  // La meccanica di history vive in `storia-overlay.ts` — UNA entry per l'intera pila di
  // overlay, a un back reagisce solo il più alto. È così che un dialog aperto SOPRA uno
  // `Sheet` (pattern `CassettaSheet`) si chiude da solo lasciando lo sheet aperto sotto,
  // invece di consumargli l'entry sotto il naso (v. il modulo, e il commento in `Sheet.tsx`).
  // `onAnnullaRef`: `onAnnulla` è quasi sempre una closure inline ricreata a ogni render del
  // chiamante — se l'effect ne dipendesse, ri-registrerebbe (e ri-spingerebbe) un'entry a ogni
  // render. L'effect dipende SOLO da `aperto`, il ref insegue il callback più recente.
  const onAnnullaRef = useRef(onAnnulla)
  useEffect(() => {
    onAnnullaRef.current = onAnnulla
  }, [onAnnulla])
  useEffect(() => {
    if (!aperto) return
    const token = entraOverlay('uaDialog', () => onAnnullaRef.current())
    return () => esciOverlay(token)
  }, [aperto])

  // T5-ter (D85) — il focus. 🔴 Fino a oggi questo componente non lo gestiva
  // AFFATTO: non lo tratteneva, non lo restituiva, e non lo portava nemmeno
  // dentro. Una conferma distruttiva aperta da tastiera lasciava il focus dov'era
  // — sull'elemento della pagina dietro — mentre il dialog dichiarava
  // `aria-modal="true"`, cioè «dietro non esiste niente». Da qui: il focus entra
  // sul pannello all'apertura, il `Tab` resta dentro finché è aperto, e alla
  // chiusura torna a chi aveva aperto.
  //
  // 🔑 D90 (Francesco, 31/07/2026) — il focus si posa sulla VIA SICURA, non sul
  // pannello. La ragione è una PROPRIETÀ, non una posizione: un Invio dato a
  // caso, o dato da chi non ha ancora finito di leggere, deve ANNULLARE e mai
  // cancellare. È la stessa riga che §5.42 prescrive per `FoglioConferma`: le due
  // forme della conferma distruttiva si comportano adesso allo stesso modo.
  //
  // 🛑 Il tasto sicuro si cerca per IDENTITÀ (la sua etichetta), non per
  // posizione: con `primarioSopra` — la deroga del rito consegna — l'ordine dei
  // due tasti si inverte, e «il primo bottone del pannello» sarebbe quello
  // DISTRUTTIVO. Un ripiego sul pannello copre il caso in cui il tasto non si
  // trovi: meglio il focus dentro un pannello che il focus sul `body`, dove
  // l'`Escape` non avrebbe più destinatario.
  useEffect(() => {
    if (!aperto) return
    const pannello = cardRef.current
    if (!pannello) return
    const bottoni = Array.from(pannello.querySelectorAll('button'))
    const sicuro = bottoni.find((b) => b.textContent?.trim() === etichettaSicura.trim())
    return trappolaFocus(pannello, { focusIniziale: sicuro })
  }, [aperto, etichettaSicura])

  if (typeof document === 'undefined') return null

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
      {/* role="alert" (fix review finale, finding IMPORTANTE): in
          FrameConsegnato `nota` è il feedback DINAMICO di un annullo fallito
          — senza semantica live uno screen reader non lo annuncia mai. */}
      {nota && <p role="alert" style={notaStile}>{nota}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m, marginTop: spazio.l }}>
        {primarioSopra ? [tasti[1], tasti[0]] : tasti}
      </div>
    </>
  )

  const overlay = reduced ? (
    aperto ? (
      <div data-ds="v3" style={wrapperStile}>
        <div className="ds-dialog-scrim" onPointerDown={tapScrim.onPointerDown} onClick={tapScrim.onClick} style={scrimStile} />
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titoloId}
          aria-describedby={testoId}
          tabIndex={-1}
          style={cardStile}
        >
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
            onPointerDown={tapScrim.onPointerDown}
            onClick={tapScrim.onClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={molla.smooth}
            style={scrimStile}
          />
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titoloId}
            aria-describedby={testoId}
            tabIndex={-1}
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
