'use client'

// DS v3 §5.42 — FoglioConferma: il foglio di conferma prima di cancellare una
// foto. È la SECONDA forma ammessa di conferma distruttiva (l'altra è
// `DialogConferma`, §5.17) — si usa quando sotto c'è già un overlay a tutto
// schermo (il visore dell'album, §5.39): una card centrata sopra una
// fotografia a tutto schermo si leggerebbe come un ritaglio sospeso.
//
// Nato da D80 (30/07): il piano aveva scelto la card senza chiederlo a
// Francesco, che ha confermato il mockup del foglio. Numerato 9-bis apposta:
// rinumerare avrebbe rotto i riferimenti in handoff, memoria e spec.
//
// ── Perché NON è uno `Sheet` nudo montato sopra il visore ───────────────────
// Due ragioni, non una: ① `Sheet` ha z-index 1000 CABLATO — sopra il visore
// (1010) si dipingerebbe SOTTO la fotografia; qui serve 1030. ② `Sheet`
// cattura l'àncora del focus al montaggio (`document.activeElement`), mentre
// chi apre QUESTA conferma è una voce di menù che sta smontando: catturare un
// nodo staccato lascia il focus sul `body`, e da lì `Escape` è morto proprio
// sulla superficie distruttiva. Serve `ancoraFocus` DICHIARATA nella firma
// (F-12), come fa già `VisoreFoto` (§5.39).
//
// ── Non blocca più lo scorrimento «per esclusione»: chiama e basta (D84) ────
// La ragione storica per cui un secondo foglio sopra il visore non poteva
// bloccare da sé («il valore precedente si cattura per istanza, il secondo
// leggerebbe "hidden" e lo ripristinerebbe per sempre») è stata riparata alla
// RADICE da `blocca-scorrimento.ts`: un contatore unico per tutta l'app, non
// più per istanza. Questo componente chiama `bloccaScorrimento()` come ogni
// altro strato — non c'è più niente da escludere.
//
// ── Il focus va alla PRIMA azione, che è quella SICURA — è una PROPRIETÀ ───
// «Annulla» riceve il focus perché è il tasto sicuro, non perché è il primo
// nel DOM: si cerca per IDENTITÀ (uguaglianza col testo di `etichettaSicura`),
// esattamente come già fa `DialogConferma.tsx:135-142` per la stessa ragione
// (D90) — un Invio dato a caso deve annullare, mai cancellare.
//
// ── «Riduci movimento»: nominare `coreografie.sheetSu` NON basta (§1.9, B-6) ─
// Quella coreografia porta la transizione DENTRO la variante, su entrambe le
// chiavi (`v3/motion.ts:85-86`): una `transition` passata come prop non ci
// arriva mai. Serve la variante ridotta ESPLICITA (locale a questo file: non
// si importa da `FoglioCategoria`, che è un pari, non una base comune).

import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, animate as animaValore, useMotionValue, useDragControls } from 'motion/react'
import { coreografie, istantaneo, molla, useReducedMotion } from '@/design-system/v3/motion'
import { materia, raggio, spazio, tipografia } from '@/design-system/v3/tokens'
import { TastoPrimario } from '@/components/ds/TastoPrimario'
import { TastoSecondario } from '@/components/ds/TastoSecondario'
import { entraOverlay, esciOverlay } from '@/components/ds/storia-overlay'
import { bloccaScorrimento } from '@/components/ds/blocca-scorrimento'
import { trappolaFocus } from '@/components/ds/trappola-focus'
import { useTapScrim } from '@/components/ds/useTapScrim'
// 🛑 `deveChiudere` si IMPORTA, non si riscrive: è pura e vive già in casa
// (`Sheet.tsx:41`), isolata apposta perché jsdom non simula la fisica del
// gesto in modo affidabile.
import { deveChiudere } from '@/components/ds/Sheet'
import { etichettaCategoria } from '@/lib/domain/categorie-foto'
// Il tipo vive in un posto solo (stessa scelta di VisoreFoto.tsx:73): il
// chiamante (T12) ha già in mano la `FotoAlbum` corrente, non se ne fabbrica
// una copia solo per l'anteprima di questo foglio.
import type { FotoAlbum } from '@/components/ds/CartaAlbum'

const MINIATURA = 60
const RAGGIO_MINIATURA = raggio.riga - 6 // = 12, §5.42. Mai il 12 nudo: `raggio` non ce l'ha.
const MANICO_L = 36
const MANICO_H = 4

const FMT_DATA_CARICAMENTO = new Intl.DateTimeFormat('it-IT', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Rome',
})

/** `null` se `iso` non è una data interpretabile: un caricamento di prova o un
 *  dato corrotto non deve rompere la conferma di cancellazione con un
 *  `RangeError` — la sotto-riga sparisce, la miniatura e l'etichetta restano. */
function formattaCaricamento(iso: string): string | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return FMT_DATA_CARICAMENTO.format(d)
}

type VariantiPannello = {
  initial: { y: string }
  animate: { y: number; transition: Record<string, unknown> }
  exit: { y: string; transition: Record<string, unknown> }
}

/** La variante ridotta di §1.9 (B-6): la transizione si sostituisce DENTRO la
 *  variante, su entrambe le chiavi, e `y` resta nel bersaglio. */
const SHEET_SU_RIDOTTO: VariantiPannello = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { ...molla.smooth, y: istantaneo } },
  exit: { y: '100%', transition: { ...molla.smooth, y: istantaneo } },
}

/**
 * Le tre chiavi del movimento del pannello, in funzione della preferenza.
 *
 * Esportata per la stessa ragione per cui `Sheet` esporta `deveChiudere` e
 * `FoglioCategoria` esporta la propria `variantePannello`: è un dato puro, e
 * in questo ambiente Motion non applica mai l'`animate`
 * (`MotionGlobalConfig.skipAnimations`, `tests/setup.ts:16`) — l'unico modo
 * onesto di provare «`y` finale = 0 e nessun tween su `y`» è guardare
 * l'oggetto vero, non il DOM.
 */
export function variantePannello(reduced: boolean): VariantiPannello {
  return reduced ? SHEET_SU_RIDOTTO : coreografie.sheetSu
}

export function FoglioConferma(props: {
  aperto: boolean
  /** L'oggetto esplicito della conferma («Elimini questa foto?»). Contratto
   *  del chiamante, non verificabile a runtime — come in `DialogConferma`. */
  titolo: string
  /** Che cosa succede davvero. Accetta markup: la parte che «pesa» (§5.42,
   *  callout `--muted` con la parte che pesa in `--ink`/700) si marca dal
   *  chiamante con `<strong>`/`<b>` — questo pannello la rende in `--ink`/700
   *  automaticamente (regola scoped nel `<style>` qui sotto), il resto resta
   *  `--muted`/regolare. Il chiamante conosce quale clausola pesa (per il
   *  testo ratificato di T12: «e dall'archivio», D61) — questo componente no. */
  testo: ReactNode
  etichettaDistruttiva: string
  etichettaSicura: string
  /** Il tasto distruttivo può essere disabilitato dal chiamante mentre la
   *  cancellazione è in volo (§5.42, stato *disabled*). «Annulla», Esc, il
   *  velo e lo swipe restano SEMPRE attivi: la via di fuga non si chiude mai,
   *  e la gestione della corsa (ignorare un annullo a richiesta già partita)
   *  resta del chiamante — questo componente non la conosce. */
  distruttivaDisabilitata?: boolean
  /** L'anteprima dell'oggetto (§5.42): miniatura, categoria e data di
   *  caricamento. La stessa `FotoAlbum` che `VisoreFoto` già riceve. */
  foto: FotoAlbum
  /** Dove torna il focus alla chiusura. Dichiarata dal chiamante (F-12): chi
   *  apre questa conferma può essere una voce di menù che sta smontando, e un
   *  nodo staccato non riceve mai il focus. */
  ancoraFocus: RefObject<HTMLElement | null>
  onConferma: () => void
  onAnnulla: () => void
}) {
  const {
    aperto,
    titolo,
    testo,
    etichettaDistruttiva,
    etichettaSicura,
    distruttivaDisabilitata = false,
    foto,
    ancoraFocus,
    onConferma,
    onAnnulla,
  } = props
  const reduced = useReducedMotion()
  const idBase = useId()
  const idTitolo = `${idBase}-titolo`
  const idTesto = `${idBase}-testo`
  const pannelloRef = useRef<HTMLDivElement | null>(null)
  const dragControls = useDragControls()
  const yPannello = useMotionValue(0)

  // ⚠️ `onAnnulla` è ricreata a ogni render del chiamante: gli effect leggono
  // da un ref, o si ri-registrerebbero (e ri-spingerebbero un'entry) a ogni
  // render invece che una volta per apertura (modello `Sheet.tsx:183-201`,
  // `FoglioCategoria.tsx:146-158`).
  const onAnnullaRef = useRef(onAnnulla)
  useEffect(() => {
    onAnnullaRef.current = onAnnulla
  })

  useEffect(() => {
    if (!aperto) return
    const token = entraOverlay('uaSheet', () => onAnnullaRef.current())
    return () => esciOverlay(token)
  }, [aperto])

  // D84 — un contatore unico per tutta l'app: si chiama e basta, come ogni
  // altro strato. Non c'è più «il secondo blocco leggerebbe hidden» da
  // evitare: quel difetto è stato riparato alla radice in `blocca-scorrimento.ts`.
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
        '[FoglioConferma] `ancoraFocus.current` è vuoto all\'apertura: alla chiusura il focus non tornerà a nessuno, e da lì l\'`Escape` è morto proprio sulla superficie distruttiva (§5.42, F-12).'
      )
    }
    // Focus alla PRIMA azione, che è quella SICURA (§5.42) — è una PROPRIETÀ,
    // non una posizione: si cerca il tasto per IDENTITÀ (il suo testo),
    // stessa via di `DialogConferma.tsx:139-141` per la stessa ragione (D90).
    const bottoni = Array.from(pannello.querySelectorAll('button'))
    const sicuro = bottoni.find((b) => b.textContent?.trim() === etichettaSicura.trim())
    return trappolaFocus(pannello, { ancora: ancoraFocus.current, focusIniziale: sicuro })
  }, [aperto, ancoraFocus, etichettaSicura])

  const tapVelo = useTapScrim(aperto, () => onAnnullaRef.current())

  if (typeof document === 'undefined') return null
  if (!aperto) return null

  function alTasto(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key !== 'Escape') return
    // Si ferma qui: sotto vivono nove ascoltatori su `window`, e un `Escape`
    // risalito fin lì collasserebbe gli strati tutti insieme (§1.5).
    evento.stopPropagation()
    onAnnulla()
  }

  function fineTrascinamento(
    _evento: unknown,
    info: { offset: { y: number }; velocity: { y: number } },
  ) {
    const altezza = pannelloRef.current?.getBoundingClientRect().height ?? 0
    if (deveChiudere(info.offset.y, info.velocity.y, altezza)) {
      onAnnulla()
      return
    }
    // Senza questo il pannello resterebbe dove il dito l'ha lasciato:
    // `dragMomentum={false}` spegne la fisica automatica, e il ritorno lo fa
    // questa molla (stessa scelta di `Sheet.tsx:358`, `FoglioCategoria.tsx:217`).
    animaValore(yPannello, 0, molla.smooth)
  }

  const movimento = variantePannello(reduced)
  const etichetta = etichettaCategoria(foto.categoria)
  const caricataIl = formattaCaricamento(foto.created_at)

  const overlay = (
    <div
      data-ds="v3"
      className="ds-foglioconferma-radice"
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
        .ds-foglioconferma-testo strong,
        .ds-foglioconferma-testo b {
          color: var(--ink);
          font-weight: 700;
        }
      `}</style>

      <motion.div
        className="ds-foglioconferma-velo"
        aria-hidden="true"
        onPointerDown={tapVelo.onPointerDown}
        onClick={tapVelo.onClick}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        // La dissolvenza RESTA anche a preferenza accesa (scelta, non
        // dimenticanza): §1.9 legifera sulle chiavi di SPOSTAMENTO, e
        // un'opacità non sposta niente — stessa ragione di `FoglioCategoria`.
        transition={molla.smooth}
        style={{
          position: 'absolute',
          inset: 0,
          background: materia.scrim,
          touchAction: 'none',
        }}
      />

      <motion.div
        ref={pannelloRef}
        className="ds-foglioconferma-pannello"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitolo}
        aria-describedby={idTesto}
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
          borderTopLeftRadius: raggio.sheet,
          borderTopRightRadius: raggio.sheet,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          // faccia `--card` (`--elv` in scuro), §5.42: in light `--elv` VALE
          // `--card` (ds-v3.css:13), quindi un solo token copre le due righe
          // della spec — stessa lettura di `FoglioCategoria.tsx:302`.
          background: 'var(--elv)',
          padding: `${spazio.sm}px ${spazio.ml}px ${spazio.ml}px`,
          maxHeight: '92vh',
          // 🛑 I due vanno INSIEME: `overscrollBehavior` è inerte se il
          // pannello non è un contenitore che scorre (§1.4, C-1).
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          outline: 'none',
          y: yPannello,
        }}
      >
        {/* Il manico: non è un comando, è l'innesco del trascinamento — come
            in `Sheet`/`FoglioCategoria`, `aria-hidden` e non un bottone. */}
        <div
          className="ds-foglioconferma-manico"
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

        {/* L'anteprima dell'oggetto (§5.42): miniatura + etichetta di
            categoria + quando è stata caricata. G5 · D75: l'indirizzo firmato
            entra SOLO come `src`; `nome_file` (dato del paziente quanto la
            foto) non entra da nessuna parte. */}
        <div
          className="ds-foglioconferma-anteprima"
          style={{ display: 'flex', alignItems: 'center', gap: spazio.s, marginBottom: spazio.sm }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- URL Storage firmata a dimensioni variabili (stessa scelta di CartaAlbum/VisoreFoto/FoglioCategoria) */}
          <img
            src={foto.url}
            alt={etichetta}
            style={{ width: MINIATURA, height: MINIATURA, borderRadius: RAGGIO_MINIATURA, objectFit: 'cover' }}
          />
          <div>
            <p style={{ margin: 0, fontSize: tipografia.size.callout, fontWeight: tipografia.weight.bold, color: 'var(--ink)' }}>
              {etichetta}
            </p>
            {caricataIl && (
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>Caricata il {caricataIl}</p>
            )}
          </div>
        </div>

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
          {titolo}
        </h2>

        <p
          id={idTesto}
          className="ds-foglioconferma-testo"
          style={{
            margin: `${spazio.xs}px 0 ${spazio.m}px`,
            fontSize: tipografia.size.callout,
            fontWeight: tipografia.weight.regular,
            color: 'var(--muted)',
          }}
        >
          {testo}
        </p>

        {/* Le due azioni in colonna: `TastoSecondario` «Annulla» SOPRA,
            `TastoPrimario` la distruttiva SOTTO — stesso ordine di §5.17
            (D82). Così come sono (§5.42): portano la loro fisica, il loro
            anello di focus e il loro suono/vibrazione — questo componente non
            chiama mai `suona()` né `vibra()` (§1.10). */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: spazio.m }}>
          <TastoSecondario onClick={onAnnulla}>{etichettaSicura}</TastoSecondario>
          <TastoPrimario
            onClick={onConferma}
            disabled={distruttivaDisabilitata}
            motivoDisabilitato={distruttivaDisabilitata ? 'Un attimo…' : undefined}
          >
            {etichettaDistruttiva}
          </TastoPrimario>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(overlay, document.body)
}
