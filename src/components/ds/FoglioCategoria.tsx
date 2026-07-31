'use client'

// DS v3 §5.41 — FoglioCategoria: il foglio che chiede «che foto è», variante C1
// (D79): sei pastiglie su due colonne. È il terzo dei quattro strati sopra la
// pagina, e vive in DUE momenti — subito dopo lo scatto (D65: mai prima, non si
// blocca la fotocamera) e come CORREZIONE dal visore o dall'album (D70).
//
// ── D74, ed è la ragione per cui questo componente si comporta diversamente ─
// La foto deve NASCERE con una categoria. Quindi ogni uscita che non è una
// scelta — velo, swipe giù, `Escape`, «indietro» — chiama `onScegli('altro')` e
// POI `onChiudi()`, mai `onChiudi()` da solo. 🛑 E non è un errore: niente
// avviso, niente suono d'errore, nessuna vibrazione. L'utente che esce ha
// scelto «non adesso», non ha sbagliato.
//
// ── Allo scatto NESSUNA pastiglia è accesa, e il mockup dice il contrario ───
// Le colonne C1 e C3 mostrano «Impronta» già scelta. Copiarlo darebbe DUE
// default in contraddizione con D74: quello vero (`altro`, se l'utente esce) e
// quello affermato a schermo — che è pure il più sbagliato dei due, perché
// suggerisce una scelta che nessuno ha fatto. La pastiglia accesa del mockup
// illustra il SECONDO momento, la correzione, dove una categoria c'è già: è
// esattamente ciò che porta la prop `scelta`.
//
// ── «Riduci movimento»: nominare `coreografie.sheetSu` NON basta (§1.9, B-6) ─
// Quella coreografia porta la transizione DENTRO la variante, su entrambe le
// chiavi (`v3/motion.ts:85-86`): una `transition` passata come prop non ci
// arriva mai, e a preferenza accesa il foglio si muoverebbe lo stesso. Serve la
// variante ridotta ESPLICITA, che sostituisce la transizione dov'è.
// 🛑 E la via che si troverebbe guardando la casa è peggio: sotto reduced
// `Sheet` monta `SheetRidotto`, il cui pannello non ha `y` affatto
// (`Sheet.tsx:448-458`) — è il bersaglio-tolto che §1.9 esiste per vietare,
// scritto dentro il componente che fa da modello. Qui `y` RESTA nel bersaglio e
// ci arriva istantanea.
//
// ── La geometria si DICHIARA, non si eredita ───────────────────────────────
// Stessa forma di `Sheet` (`Sheet.tsx:491-492`) ma scritta qui: `width:'100%'`
// con tetto a 480. La misura di 148,5px che girava nei documenti era presa
// dentro la cornice di telefono del mockup (342px) e non vale a nessun
// viewport: la colonna vera è 171 a 390 e 216 da 768.
// 🛑 E per la stessa ragione NIENTE `whiteSpace:'nowrap'`: a text-zoom 200% —
// che è un requisito di rilascio (§13.3) — «Guida colore» si taglierebbe. Due
// righi ammessi, `min-height` 60 che li accoglie.
//
// ── Il focus va al PANNELLO, non alla prima pastiglia ──────────────────────
// Posarlo su «Impronta» suggerirebbe una scelta che l'utente non ha fatto: è la
// stessa ragione di D74, vista dalla tastiera. `trappolaFocus` senza
// `focusIniziale` fa esattamente questo (e il suo commento cita §5.41).
// L'àncora del ritorno è DICHIARATA dal chiamante (C-12): chi apre questo
// foglio può essere una voce di menù che sta smontando, e un nodo staccato non
// riceve il focus.

import { useEffect, useId, useRef, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, animate as animaValore, useMotionValue, useDragControls } from 'motion/react'
import { coreografie, istantaneo, molla, useReducedMotion } from '@/design-system/v3/motion'
import { materia, raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { vibra } from '@/design-system/v3/haptic'
import { entraOverlay, esciOverlay } from '@/components/ds/storia-overlay'
import { bloccaScorrimento } from '@/components/ds/blocca-scorrimento'
import { trappolaFocus } from '@/components/ds/trappola-focus'
import { useTapScrim } from '@/components/ds/useTapScrim'
// 🛑 `deveChiudere` si IMPORTA, non si riscrive: è pura e vive già in casa
// (`Sheet.tsx:40`), dove è stata isolata proprio perché jsdom non simula la
// fisica del gesto in modo affidabile.
import { deveChiudere } from '@/components/ds/Sheet'
import { CATEGORIE_FOTO, type CategoriaFoto } from '@/lib/domain/categorie-foto'

const MAX_ANTEPRIME = 3
const ANTEPRIMA = 56
const RAGGIO_ANTEPRIMA = raggio.riga - 6 // = 12, §5.41. Mai il 12 nudo: `raggio` non ce l'ha.
const PASTIGLIA = 60
const MANICO_L = 36
const MANICO_H = 4
const TESTO_PASTIGLIA = 15 // valore del mockup, ratificato da D79 (v. §5 S11 dell'allegato)
const EMOJI_PX = 18

/** 🚧 SEGNAPOSTO DICHIARATO (S2): le icone vere sono un passo suo, fuori da
 *  questa ondata. Non sono lo stato di niente (§4.4) — il senso lo porta il
 *  testo, e a schermo sono `aria-hidden`.
 *  🔑 È un `Record` sulle sei categorie, non un secondo elenco: se un giorno
 *  una categoria si aggiunge, questo file non compila finché non ha la sua —
 *  che è l'opposto di una copia locale che diverge in silenzio. */
const EMOJI: Record<CategoriaFoto, string> = {
  impronta: '🦷',
  pre_lavoro: '🔧',
  colore: '🎨',
  post_prova: '✨',
  rx: '🩻',
  altro: '📄',
}

type VariantiFoglio = {
  initial: { y: string }
  animate: { y: number; transition: Record<string, unknown> }
  exit: { y: string; transition: Record<string, unknown> }
}

/** La variante ridotta di §1.9 (B-6): la transizione si sostituisce DENTRO la
 *  variante, su entrambe le chiavi, e `y` resta nel bersaglio. */
const SHEET_SU_RIDOTTO: VariantiFoglio = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { ...molla.smooth, y: istantaneo } },
  exit: { y: '100%', transition: { ...molla.smooth, y: istantaneo } },
}

/**
 * Le tre chiavi del movimento del pannello, in funzione della preferenza.
 *
 * Esportata per la stessa ragione per cui `Sheet` esporta `deveChiudere`
 * (`Sheet.tsx:40`): è un dato puro, e in questo ambiente Motion non applica mai
 * l'`animate` (`MotionGlobalConfig.skipAnimations`) — quindi l'unico modo
 * onesto di provare «`y` finale = 0 e nessun tween su `y`» è guardare l'oggetto
 * vero, non il DOM.
 */
export function variantePannello(reduced: boolean): VariantiFoglio {
  return reduced ? SHEET_SU_RIDOTTO : coreografie.sheetSu
}

export function FoglioCategoria(props: {
  aperto: boolean
  /** Quante foto riceveranno questa categoria. Indipendente dalle anteprime:
   *  le anteprime si fermano a tre, il numero no. */
  quante: number
  /** Fino a tre indirizzi firmati. Entrano SOLO come `src` di un `<img>`
   *  (G5 · D75): mai in `title`, `aria-label`, `data-*` o testo. */
  anteprime: string[]
  /** La categoria che c'è GIÀ — solo nel secondo momento, la correzione (D70).
   *  🛑 Allo scatto resta `undefined`: nessuna pastiglia accesa. */
  scelta?: CategoriaFoto
  /** Dove torna il focus alla chiusura. Dichiarata dal chiamante (C-12), mai
   *  catturata qui: chi apre questo foglio può essere una voce che smonta. */
  ancoraFocus: RefObject<HTMLElement | null>
  onScegli: (c: CategoriaFoto) => void
  onChiudi: () => void
}) {
  const { aperto, quante, anteprime, scelta, ancoraFocus, onScegli, onChiudi } = props
  const reduced = useReducedMotion()
  const idBase = useId()
  const idTitolo = `${idBase}-titolo`
  const idDida = `${idBase}-dida`
  const pannelloRef = useRef<HTMLDivElement | null>(null)
  const dragControls = useDragControls()
  const yPannello = useMotionValue(0)

  const molte = quante > 1

  // ⚠️ `esci` è ricreata a ogni render (legge props fresche): gli effect devono
  // leggerla da un ref, o si ri-registrerebbero a ogni render invece che una
  // volta per apertura (modello `Sheet.tsx:183-201`).
  function esci() {
    // D74 — la foto deve nascere con una categoria. In quest'ordine: prima la
    // categoria, poi la chiusura.
    onScegli('altro')
    onChiudi()
  }
  const esciRef = useRef(esci)
  useEffect(() => {
    esciRef.current = esci
  })

  useEffect(() => {
    if (!aperto) return
    const token = entraOverlay('uaSheet', () => esciRef.current())
    return () => esciOverlay(token)
  }, [aperto])

  useEffect(() => {
    if (!aperto) return
    return bloccaScorrimento()
  }, [aperto])

  useEffect(() => {
    if (!aperto) return
    const pannello = pannelloRef.current
    if (!pannello) return
    if (!ancoraFocus.current && process.env.NODE_ENV !== 'production') {
      console.warn(
        '[FoglioCategoria] `ancoraFocus.current` è vuoto all\'apertura: alla chiusura il focus non tornerà a nessuno, e da lì l\'`Escape` è morto (§5.41, C-12).'
      )
    }
    // Nessun `focusIniziale`: il focus si posa sul PANNELLO. Sulla prima
    // pastiglia suggerirebbe una scelta non fatta (§5.41).
    return trappolaFocus(pannello, { ancora: ancoraFocus.current })
  }, [aperto, ancoraFocus])

  const tapVelo = useTapScrim(aperto, () => esciRef.current())

  if (typeof document === 'undefined') return null
  if (!aperto) return null

  function scegli(categoria: CategoriaFoto) {
    // §1.10: vibrazione sì, suono MAI — quattro precedenti in casa.
    vibra('selection')
    onScegli(categoria)
    onChiudi()
  }

  function alTasto(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'Escape') return
    // Si ferma qui: sotto vivono nove ascoltatori su `window`, e un `Escape`
    // risalito fin lì collasserebbe gli strati tutti insieme (§1.5).
    evento.stopPropagation()
    esci()
  }

  function fineTrascinamento(
    _evento: unknown,
    info: { offset: { y: number }; velocity: { y: number } },
  ) {
    const altezza = pannelloRef.current?.getBoundingClientRect().height ?? 0
    if (deveChiudere(info.offset.y, info.velocity.y, altezza)) {
      esci()
      return
    }
    // Senza questo il pannello resterebbe dove il dito l'ha lasciato:
    // `dragMomentum={false}` spegne la fisica automatica, e il ritorno lo fa
    // questa molla (stessa scelta di `Sheet.tsx:358`).
    animaValore(yPannello, 0, molla.smooth)
  }

  // Le tre chiavi arrivano come oggetti espliciti invece che come `variants`
  // nominate: è la forma di `Sheet` (`:409-411`) ed è equivalente — ciò che
  // conta, e che §1.9 B-6 prescrive, è che la transizione stia DENTRO la
  // chiave, non che passi da un nome.
  const movimento = variantePannello(reduced)

  const overlay = (
    <div
      data-ds="v3"
      className="ds-foglio-radice"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1030,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <style>{`
        .ds-foglio-pastiglia:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>

      <motion.div
        className="ds-foglio-velo"
        aria-hidden="true"
        onPointerDown={tapVelo.onPointerDown}
        onClick={tapVelo.onClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        // 🔑 La dissolvenza del velo RESTA anche a preferenza accesa, ed è una
        // scelta, non una dimenticanza: §1.9 legifera sulle chiavi di
        // SPOSTAMENTO («ogni chiave di spostamento… per chiave»), §8.4 dice che
        // le coreografie degradano **a dissolvenza**, e §5.41 chiede
        // espressamente che resti la sola dissolvenza. Un'opacità non sposta
        // niente: è ciò che rimane quando si toglie il movimento.
        // ⚠️ `VisoreFoto` spegne anche questa, e lì è giusto: §5.39 nomina
        // `opacity` fra le chiavi che devono arrivare istantanee. Le due righe
        // di spec sono diverse, quindi lo sono anche i due componenti.
        transition={molla.smooth}
        style={{
          position: 'absolute',
          inset: 0,
          background: materia.scrim,
          // Il gesto si ferma dove nasce: un trascinamento sul velo non scorre
          // la pagina sotto (§1.4).
          touchAction: 'none',
        }}
      />

      <motion.div
        ref={pannelloRef}
        className="ds-foglio-pannello"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        aria-describedby={idDida}
        tabIndex={-1}
        onKeyDown={alTasto}
        initial={movimento.initial}
        animate={movimento.animate}
        exit={movimento.exit}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragEnd={fineTrascinamento}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          // Il raggio solo in alto: il foglio è appoggiato al bordo del telefono.
          borderTopLeftRadius: raggio.sheet,
          borderTopRightRadius: raggio.sheet,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          background: 'var(--elv)',
          padding: `${spazio.sm}px ${spazio.ml}px ${spazio.ml}px`,
          maxHeight: '92vh',
          // 🛑 I due vanno INSIEME: `overscrollBehavior` è inerte se il pannello
          // non è un contenitore che scorre (§1.4, C-1).
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          outline: 'none',
          y: yPannello,
        }}
      >
        {/* Il manico: non è un comando, è l'innesco del trascinamento — come in
            `Sheet` (`:369-373`), dove è `aria-hidden` e non un bottone. */}
        <div
          className="ds-foglio-manico"
          aria-hidden="true"
          onPointerDown={(e) => dragControls.start(e)}
          style={{
            width: MANICO_L,
            height: MANICO_H,
            margin: `0 auto ${spazio.sm}px`,
            borderRadius: raggio.pill,
            background: 'var(--line)',
            touchAction: 'none',
          }}
        />

        {/* 🔑 Il contatore NON dipende dalle anteprime: sono due grandezze
            indipendenti (fino a tre miniature, il numero no), e un chiamante che
            ha cinque foto ma nessuna miniatura pronta — l'upload in volo —
            perderebbe il «5 foto» proprio quando serve di più. */}
        {(anteprime.length > 0 || molte) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spazio.s, marginBottom: spazio.sm }}>
            {anteprime.slice(0, MAX_ANTEPRIME).map((url, i) => (
              /* eslint-disable-next-line @next/next/no-img-element -- URL Storage firmata a dimensioni variabili (stessa scelta di CartaAlbum/VisoreFoto), next/image non applicabile */
              <img
                key={`${url}-${i}`}
                src={url}
                alt=""
                style={{
                  width: ANTEPRIMA,
                  height: ANTEPRIMA,
                  borderRadius: RAGGIO_ANTEPRIMA,
                  objectFit: 'cover',
                }}
              />
            ))}
            {molte && (
              <span style={{ fontSize: tipografia.size.callout, fontWeight: tipografia.weight.bold, color: 'var(--muted)' }}>
                {quante} foto
              </span>
            )}
          </div>
        )}

        <h2
          id={idTitolo}
          style={{
            margin: 0,
            fontSize: 19,
            fontWeight: tipografia.weight.extrabold,
            color: 'var(--ink)',
            letterSpacing: tipografia.tracking.titoli,
          }}
        >
          {molte ? 'Che foto sono?' : 'Che foto è?'}
        </h2>

        <p
          id={idDida}
          style={{ margin: `${spazio.xs}px 0 ${spazio.m}px`, fontSize: 13.5, color: 'var(--muted)' }}
        >
          {molte
            ? `La scelta vale per tutte e ${quante}. Le puoi cambiare una per una dopo.`
            : 'Serve per ritrovarla dopo. Se non lo dici adesso finisce in «Altro».'}
        </p>

        <div
          className="ds-foglio-griglia"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spazio.s }}
        >
          {CATEGORIE_FOTO.map((categoria) => {
            const accesa = scelta === categoria.valore
            return (
              <motion.button
                key={categoria.valore}
                type="button"
                className="ds-foglio-pastiglia"
                aria-pressed={accesa ? 'true' : undefined}
                onClick={() => scegli(categoria.valore)}
                whileTap={{ y: 2 }}
                transition={molla.press}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spazio.s,
                  minHeight: PASTIGLIA,
                  padding: `0 ${spazio.sm}px`,
                  border: 'none',
                  borderRadius: raggio.riga,
                  // Tre fonti per lo stesso stato, e nessuna è il solo colore
                  // (G4): luminanza piena, `aria-pressed`, e il testo che resta.
                  background: accesa ? 'var(--ink)' : 'var(--bg-deep)',
                  color: accesa ? 'var(--bg)' : 'var(--ink)',
                  fontFamily: tipografia.famiglia,
                  fontSize: TESTO_PASTIGLIA,
                  fontWeight: tipografia.weight.bold,
                  textAlign: 'left',
                  cursor: 'pointer',
                  // 🛑 Nessun `whiteSpace: 'nowrap'`: due righi sono ammessi, ed
                  // è ciò che tiene in piedi il text-zoom 200% (§13.3).
                }}
              >
                <span aria-hidden="true" style={{ fontSize: EMOJI_PX, lineHeight: 1 }}>
                  {EMOJI[categoria.valore]}
                </span>
                <span>{categoria.etichetta}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )

  return createPortal(overlay, document.body)
}
