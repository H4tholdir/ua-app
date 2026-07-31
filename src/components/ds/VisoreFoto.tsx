'use client'

// DS v3 §5.39 — VisoreFoto: il visore a tutto schermo, variante V1 (D77): i
// controlli stanno SEMPRE in vista. È il primo dei tre strati sopra la pagina.
//
// ── D66, ed è la ragione per cui questa forma esiste ───────────────────────
// La foto si vede ALLA SORGENTE: `objectFit: 'contain'`, mai ritagliata, mai
// stirata, nessun ridimensionamento in vista. La fedeltà del colore è uno dei
// motivi per cui quelle foto esistono — una guida colore ritagliata non serve
// a niente. E sotto la fascia c'è il POSTO RISERVATO alla barra dell'editor:
// previsto e vuoto, tratteggiato. È l'ondata (c), ma il posto si tiene adesso.
//
// ── Il contrasto NON si appoggia alla sfumatura (B-4) ──────────────────────
// Le due sfumature restano come raccordo, ma OGNI controllo porta la propria
// faccia (`sopraFoto.faccia`) e il proprio confine (`sopraFoto.confine`). Su
// una foto chiara la sfumatura vale ~2,1:1 col testo bianco — sotto AA di tre
// volte — e su una radiografia sparisce del tutto, portandosi via il confine
// dei controlli. Faccia e anello chiudono i due casi insieme e rendono il
// contrasto INDIPENDENTE dalla fotografia sotto.
// 🛑 Per la stessa ragione etichetta e contatore stanno DENTRO UNA PASTIGLIA
// invece che nudi sul velo — e la pastiglia è un COMANDO (D70: la categoria si
// corregge anche da qui), quindi porta `min-height: 44` e un nome proprio.
//
// ── Escape: sul PANNELLO, mai su `window` (§1.5) ───────────────────────────
// Nove ascoltatori in `src/` stanno su `window`: con un Escape risalito fin lì
// un solo tasto collasserebbe tutti gli strati insieme, mentre il gesto
// «indietro» ne chiude correttamente uno. Qui l'ascolto è sul pannello, con
// `stopPropagation()`: React aggancia i propri ascoltatori al contenitore del
// portale (`document.body`), che nella risalita sta SOTTO `window`, quindi uno
// `Sheet` aperto per sbaglio non si chiude insieme.
// 🔑 Regge per costruzione solo perché il focus è DENTRO il pannello e ci
// resta (trappola, sotto): il pannello che contiene il focus è quello in cima.
// 🛑 CONTRATTO DEL CHIAMANTE: i quattro strati si montano FRATELLI, mai uno
// dentro i figli o le props dell'altro — gli eventi sintetici risalgono
// l'albero REACT, non il DOM. Per questo `azioni` accetta SOLO l'innesco.
//
// ── `ancoraFocus` è OBBLIGATORIA, e non è pignoleria (F-12) ────────────────
// `trappolaFocus` sa ripiegare su `document.activeElement` catturato
// all'apertura, ed è quel che fa `Sheet`. Quel ripiego esiste per una ragione
// di PERIMETRO — `Sheet` ha molti chiamanti e renderla obbligatoria li
// toccherebbe tutti — che qui non vale: il visore ne ha uno solo (T10). E
// F-12 rifiuta esattamente la cattura al montaggio. Quindi si dichiara.
// Se l'àncora è vuota all'apertura si avvisa in sviluppo: il focus che non
// torna è un difetto che non si vede in nessuno screenshot.
//
// ── Lo scorrimento: si rilascia nella pulizia, e la differenza è dichiarata ─
// `Sheet` differisce lo sblocco a `onExitComplete` perché il suo pannello è
// centrato e la barra che ricompare a metà uscita lo fa slittare di lato
// (difetto pagato in collaudo). Qui il pannello è `inset: 0`: la barra che
// ricompare non sposta niente di visibile. Quindi il rilascio sta nella
// pulizia dell'effect — un blocco, uno sblocco, e nessun bisogno della
// guardia «un solo posto per istanza» che a `Sheet` serve proprio perché
// differisce.
//
// ── Sicurezza (G5 · D75) ───────────────────────────────────────────────────
// Come §5.38: l'indirizzo firmato entra SOLO come `src` di un `<img>`, mai in
// `title`/`href`/`download`/`aria-label`/`data-*`/testo, e nessuna callback
// riceve la foto intera — chi deve dire «questa» dice l'INDICE.

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { istantaneo, molla, useReducedMotion } from '@/design-system/v3/motion'
import { raggio, sopraFoto, spazio, testoSuFaccia, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import { etichettaCategoria } from '@/lib/domain/categorie-foto'
import { entraOverlay, esciOverlay } from '@/components/ds/storia-overlay'
import { bloccaScorrimento } from '@/components/ds/blocca-scorrimento'
import { trappolaFocus } from '@/components/ds/trappola-focus'
import { useTapScrim } from '@/components/ds/useTapScrim'
// Il tipo vive in un posto solo: due copie dello stesso dato sono due copie che
// divergeranno. È un `import type`, quindi a runtime non lega i due componenti.
import type { FotoAlbum } from '@/components/ds/CartaAlbum'

const TONDO = 44
const MINIATURA = 44
const RAGGIO_MINIATURA = raggio.riga - 6 // = 12, §5.39. Mai il 12 nudo: `raggio` non ce l'ha.
const POSTO_EDITOR = 52

export function VisoreFoto(props: {
  aperto: boolean
  foto: FotoAlbum[]
  indice: number
  onIndice: (i: number) => void
  onChiudi: () => void
  onCorreggiCategoria: () => void
  /** Dove torna il focus alla chiusura. Dichiarata dal chiamante (F-12), mai
   *  catturata qui: `document.activeElement` al montaggio è il modello che
   *  §5.39 rifiuta. */
  ancoraFocus: RefObject<HTMLElement | null>
  /** SOLO l'innesco della tendina (il tondo ⋯), mai la tendina né un foglio:
   *  i quattro strati si montano fratelli (§1.5). Assente → il ⋯ è disabilitato. */
  azioni?: ReactNode
}) {
  const { aperto, foto, indice, onIndice, onChiudi, onCorreggiCategoria, ancoraFocus, azioni } = props
  const reduced = useReducedMotion()
  const idBase = useId()
  const idPastiglia = `${idBase}-pastiglia`
  const pannelloRef = useRef<HTMLDivElement | null>(null)

  const vivo = aperto && foto.length > 0
  const indiceMostrato = indice >= 0 && indice < foto.length ? indice : 0
  const corrente = foto[indiceMostrato]

  // `onChiudi` è quasi sempre una chiusura inline ricreata a ogni render del
  // chiamante: se l'effect della storia ne dipendesse, ri-spingerebbe l'entry
  // a ogni render invece che una volta per apertura (modello `Sheet.tsx:183-201`).
  const onChiudiRef = useRef(onChiudi)
  useEffect(() => {
    onChiudiRef.current = onChiudi
  }, [onChiudi])

  useEffect(() => {
    if (!vivo) return
    const token = entraOverlay('uaSheet', () => onChiudiRef.current())
    return () => esciOverlay(token)
  }, [vivo])

  useEffect(() => {
    if (!vivo) return
    return bloccaScorrimento()
  }, [vivo])

  useEffect(() => {
    if (!vivo) return
    const pannello = pannelloRef.current
    if (!pannello) return
    if (!ancoraFocus.current && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[VisoreFoto] `ancoraFocus.current` è vuoto all\'apertura: alla chiusura il focus non tornerà a nessuno, e da lì l\'`Escape` è morto (§5.39, F-12).'
      )
    }
    return trappolaFocus(pannello, { ancora: ancoraFocus.current })
  }, [vivo, ancoraFocus])

  // `chiudi` e non `onChiudi` nudo: il tocco fuori dalla foto è un gesto di
  // chiusura come il ✕ e l'`Escape`, e §5.39 gli dà lo stesso ritorno al tatto.
  // (`chiudi` è una dichiarazione di funzione: è già disponibile qui.)
  const tapVelo = useTapScrim(vivo, chiudi)

  if (typeof document === 'undefined') return null
  if (!vivo) return null

  const etichetta = etichettaCategoria(corrente.categoria)
  const totale = foto.length

  function chiudi() {
    vibra('light')
    onChiudi()
  }

  function sfoglia(nuovo: number) {
    if (nuovo < 0 || nuovo >= totale || nuovo === indiceMostrato) return
    vibra('selection')
    onIndice(nuovo)
  }

  function alTasto(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      // Si ferma qui: sotto potrebbero esserci ascoltatori su `window` che
      // chiuderebbero lo strato sbagliato (§1.5).
      evento.stopPropagation()
      chiudi()
      return
    }
    if (evento.key === 'ArrowRight') {
      evento.stopPropagation()
      sfoglia(indiceMostrato + 1)
      return
    }
    if (evento.key === 'ArrowLeft') {
      evento.stopPropagation()
      sfoglia(indiceMostrato - 1)
    }
  }

  // §1.9 — sotto «riduci movimento» si cambia la TRANSIZIONE, MAI il bersaglio:
  // `scale` e `opacity` restano dentro `animate` e ci arrivano istantaneamente.
  // Toglierle dal bersaglio non le riporterebbe a casa — Motion muove solo ciò
  // che sta nel bersaglio, quindi la chiave tolta resterebbe congelata dov'era,
  // che è esattamente il difetto D1/D2 del 26/07.
  // ⚠️ Qui `istantaneo` sostituisce l'INTERA transizione, e si può perché TUTTE
  // le chiavi animate di questo componente (`scale`, `opacity`) devono essere
  // istantanee. La forma per-chiave del commento di `v3/motion.ts`
  // (`{ ...molla.smooth, x: istantaneo }`) serve quando solo ALCUNE lo sono —
  // lì la dissolvenza resta una molla.
  const transizione = reduced ? istantaneo : molla.smooth

  const overlay = (
    <div
      data-ds="v3"
      style={{ position: 'fixed', inset: 0, zIndex: 1010, background: 'transparent' }}
    >
      <style>{`
        .ds-visore-tondo:focus-visible,
        .ds-visore-pastiglia:focus-visible,
        .ds-visore-mini:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>

      <motion.div
        className="ds-visore-velo"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={transizione}
        style={{
          position: 'absolute',
          inset: 0,
          background: sopraFoto.velo,
          // Il gesto si ferma dove nasce: un trascinamento sul velo non scorre
          // la pagina sotto (§1.4).
          touchAction: 'none',
        }}
      />

      <div
        ref={pannelloRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idPastiglia}
        tabIndex={-1}
        onKeyDown={alTasto}
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          // 🛑 `overscrollBehavior` è INERTE se il pannello non scorre (C-1):
          // i due vanno insieme o la riga sotto è decorativa.
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          outline: 'none',
        }}
      >
        {/* ── il capo ── */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: spazio.s,
            padding: `${spazio.s}px ${spazio.sm}px`,
            background: sopraFoto.sfumaturaAlto,
          }}
        >
          <motion.button
            type="button"
            className="ds-visore-tondo"
            onClick={chiudi}
            aria-label="Chiudi"
            whileTap={{ y: 2 }}
            transition={molla.press}
            style={tondoStile}
          >
            <span aria-hidden="true">✕</span>
          </motion.button>

          <motion.button
            type="button"
            id={idPastiglia}
            className="ds-visore-pastiglia"
            onClick={onCorreggiCategoria}
            aria-label={`Cambia la categoria: ${etichetta}`}
            whileTap={{ y: 2 }}
            transition={molla.press}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              minHeight: 44,
              padding: `0 ${spazio.sm}px`,
              border: 'none',
              borderRadius: raggio.pill,
              background: sopraFoto.faccia,
              boxShadow: sopraFoto.confine,
              color: testoSuFaccia,
              fontFamily: tipografia.famiglia,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: tipografia.size.callout, fontWeight: tipografia.weight.bold }}>
              {etichetta}
            </span>
            <span aria-hidden="true" style={{ opacity: 0.7 }}>·</span>
            <span
              aria-live="polite"
              style={{
                // 12,5 e senza opacità: §4.1 non ammette testo sotto questa
                // misura, e smorzarlo lo riporterebbe fuori soglia.
                fontSize: tipografia.size.caption,
                fontWeight: tipografia.weight.bold,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {indiceMostrato + 1} di {totale}
            </span>
          </motion.button>

          {azioni ?? (
            <button
              type="button"
              className="ds-visore-tondo"
              disabled
              aria-label="Altre cose da fare su questa foto"
              style={{ ...tondoStile, opacity: 0.4, cursor: 'default' }}
            >
              <span aria-hidden="true">⋯</span>
            </button>
          )}
        </div>

        {/* ── la foto, alla sorgente (D66) ── */}
        <motion.div
          className="ds-visore-scena"
          onPointerDown={tapVelo.onPointerDown}
          onClick={tapVelo.onClick}
          initial={{ scale: 0.98, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={transizione}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 0,
            padding: spazio.sm,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URL Storage firmata a dimensioni variabili (stessa scelta di CartaAlbum.tsx), next/image non applicabile */}
          <img
            src={corrente.url}
            alt={etichetta}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              // 🛑 D66: mai ritagliata, mai stirata — nemmeno su desktop.
              objectFit: 'contain',
            }}
          />
        </motion.div>

        {/* ── il piede ── */}
        <div
          style={{
            padding: `${spazio.sm}px ${spazio.sm}px ${spazio.m}px`,
            background: sopraFoto.sfumaturaBasso,
          }}
        >
          <div
            className="ds-visore-fascia"
            style={{
              display: 'flex',
              justifyContent: 'center',
              // 🛑 C-8: oltre le sei foto la fascia SCORRE. Le miniature non si
              // rimpiccioliscono mai: sotto i 44 si perde il bersaglio minimo.
              overflowX: 'auto',
              gap: spazio.s - 2,
              paddingBottom: 2,
            }}
          >
            {foto.map((f, i) => {
              const scelta = i === indiceMostrato
              const suaEtichetta = etichettaCategoria(f.categoria)
              return (
                <motion.button
                  key={f.id}
                  type="button"
                  className="ds-visore-mini"
                  onClick={() => sfoglia(i)}
                  aria-label={`${suaEtichetta}, ${i + 1} di ${totale}`}
                  aria-current={scelta ? 'true' : undefined}
                  whileTap={{ y: 2 }}
                  transition={molla.press}
                  style={{
                    flex: 'none',
                    width: MINIATURA,
                    height: MINIATURA,
                    padding: 0,
                    border: 'none',
                    overflow: 'hidden',
                    borderRadius: RAGGIO_MINIATURA,
                    background: 'transparent',
                    // Tre fonti per lo stesso stato, e nessuna è il colore
                    // (G4): opacità, anello e `aria-current`.
                    opacity: scelta ? 1 : sopraFoto.miniaturaSpenta,
                    boxShadow: scelta ? `0 0 0 2px ${testoSuFaccia}` : 'none',
                    cursor: 'pointer',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- come sopra: URL Storage firmata */}
                  <img
                    src={f.url}
                    alt={suaEtichetta}
                    style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </motion.button>
              )
            })}
          </div>

          {/* Il posto della barra dell'editor (D66): previsto e VUOTO. Non è un
              controllo e non ha niente da dire a un lettore di schermo — la
              §5.39 lo vuole vuoto, il mockup ci scriveva una nota per Francesco. */}
          <div
            className="ds-visore-posto-editor"
            aria-hidden="true"
            style={{
              marginTop: spazio.sm,
              height: POSTO_EDITOR,
              borderRadius: raggio.riga,
              border: `1.5px dashed ${sopraFoto.tratteggio}`,
            }}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(overlay, document.body)
}

const tondoStile = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 'none',
  width: TONDO,
  height: TONDO,
  padding: 0,
  border: 'none',
  borderRadius: raggio.pill,
  background: sopraFoto.faccia,
  boxShadow: sopraFoto.confine,
  color: testoSuFaccia,
  fontFamily: tipografia.famiglia,
  fontSize: tipografia.size.heading,
  fontWeight: tipografia.weight.bold,
  cursor: 'pointer',
} as const
