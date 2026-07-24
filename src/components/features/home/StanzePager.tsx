'use client'

// Task 14 — StanzePager: le due stanze della home (spec 2026-07-21-parete-cassette-design.md
// §6, emendamenti DS v3 §3.3 regola 5 / §7.1). Due stanze affiancate in un contenitore a
// scroll-snap orizzontale: lo swipe è scroll NATIVO, non un finto carosello.
//
// Il CSS (viewport, snap, no-scrollbar; il peek 28px è morto col Task 13/D7 — ogni stanza è
// ora larga il 100% del viewport) vive in `src/app/ds-v3.css` (`.ua-stanze*`), come per
// `.ds-parete*` di PareteClient: porta media query e regole che uno style-object non sa
// esprimere, ed è la casa canonica dei valori del DS v3.
//
// ── Perché `inert` conta qui più che altrove ──────────────────────────────────────────────
// La stanza fuori campo è ancora nel DOM, a 28px di distanza. Senza `inert` + `aria-hidden`
// chi naviga da tastiera tabberebbe dentro una stanza che NON vede, e uno screen reader
// leggerebbe due volte «Tutto il resto», due titoli, due home. `inert` è un attributo HTML
// vero (React 19 lo passa attraverso, v. AdminHomePreview), non un trucco ARIA: toglie
// insieme focus, click e albero a11y.
//
// ── Chi decide la stanza attiva ───────────────────────────────────────────────────────────
// Due strade, per due gesti diversi:
// - SWIPE: la destinazione non si conosce finché lo scroll non si assesta → decide
//   l'IntersectionObserver a soglia .6 («la stanza che occupa la maggior parte del viewport»),
//   che è il «a fine snap» della spec. Il focus NON si sposta: l'utente sta guardando, non
//   ha chiesto nulla.
// - NAVIGAZIONE ESPLICITA (linguetta pile→parete, «‹ Indietro» dell'header parete→pile): la
//   destinazione è nota nell'istante del tap → lo stato cambia SUBITO (deviazione dichiarata
//   dal «aggiornati a fine snap» della spec, che descrive lo swipe) e il focus si sposta come
//   prescritto (salvo QA device T15.2 sotto). Aspettare l'IO qui vorrebbe dire lasciare
//   l'indirizzo/URL sync a mentire per tutta la durata dello smooth scroll, e — su
//   reduced-motion, dove lo scroll è istantaneo — potenzialmente per sempre se l'IO non
//   scattasse. Le due strade sono idempotenti: l'IO che arriva dopo conferma e basta.
//
// ── QA device (verbale 25/07, fix-list D3, decisione RATIFICATA) — morte dei dot ─────────
// I due dot indicatore/selettore di stanza (`ProgressDotsStanze`, ex `role="tablist"` con
// frecce ←→) sono STATI RIMOSSI: componente, markup, stili (`.ua-stanze-dots`/`.ds-dot-stanza`
// in ds-v3.css) e l'handler dedicato alla navigazione da freccia. I dot erano anche l'unico
// percorso da TASTIERA per raggiungere la stanza Parete senza swipe — la garanzia che
// sostituisce quel percorso, SENZA reintrodurre un indicatore visivo: la linguetta «Le
// cassette» (`LinguettaCassette.tsx`) è un `<button>` vero — focusabile e attivabile da
// tastiera (Invio/Spazio) come qualunque altro bottone, nessun codice dedicato in più le serve
// per esserlo — e il tasto «‹ Indietro» dell'header della parete (già un `<button>` reale nel
// chrome di pagina, v. `PareteClient.tsx`) chiude il percorso in senso inverso. `vaiA` sotto,
// coi due soli chiamanti rimasti (linguetta e back button), tratta ogni chiamata come un
// gesto esplicito — non serve più distinguere un'origine «freccia» che non esiste più.
// LIMITE NOTO (fuori scope qui — la policy della linguetta, soglia/durata, attende una
// decisione di Francesco): la linguetta è TRANSITORIA (~5s per apparizione, mai più dopo 3
// accessi riusciti — `LinguettaCassette.tsx`), quindi il percorso da tastiera che garantisce è
// disponibile SOLO mentre lei è in vista — non un accesso permanente. Se in futuro serve una
// via da tastiera SEMPRE presente, la soluzione pulita è un controllo dedicato (es. un bottone
// visivamente nascosto, sempre nel DOM, SENZA indicatore visivo) — una decisione nuova, non
// implementata da questo fix.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { PareteClient } from '@/components/features/cassette/PareteClient'
import { LinguettaCassette, registraAccessoParete } from './LinguettaCassette'
import { useReducedMotion } from '@/design-system/v3/motion'
import type { StanzaHome } from '@/lib/preferenze/home'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

const ORDINE: readonly StanzaHome[] = ['pile', 'parete']

// La stanza «attiva» è quella che occupa la maggior parte del viewport: .6 è la soglia della
// spec §6 — abbastanza alta da non scattare a metà swipe (dove ENTRAMBE le stanze stanno
// sopra .4), abbastanza bassa da scattare prima che lo snap si sia fermato del tutto.
const SOGLIA_STANZA_ATTIVA = 0.6

const FOCUSABILI = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// QA device T15.2 (verbale 2026-07-24, fix-list punto 2 — direttiva NUOVA, non un difetto
// osservato in QUESTO codice: il focus automatico che segue oggi esiste porta al primo
// focusabile del pannello («‹ Indietro», MAI la ricerca — verificato, v. report FIX-C), ma la
// direttiva vale per QUALUNQUE elemento, presente o futuro). Su un dito (mobile/tablet touch)
// portare il focus dentro il pannello che si apre farebbe salire la tastiera se quel primo
// focusabile fosse mai un campo testo — un utente col dito non ha chiesto di scrivere, ha
// chiesto di guardare. Su desktop il focus resta: chi naviga da tastiera (Tab sulla linguetta
// + Invio/Spazio) deve poter entrare nel pannello. `(pointer: coarse)` è il segnale — un mouse
// ha sempre un puntatore fine, un dito è sempre grossolano, indipendentemente dalla larghezza
// dello schermo (a differenza di `min-width`, usato altrove per desktop vs mobile: qui il
// segnale giusto è l'INPUT, non la LARGHEZZA — un tablet touch largo non deve prendere la
// tastiera lo stesso).
function puntatoreTattile(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

/** QA device T15.8 (verbale 2026-07-24, fix-list punto 8) — CAUSA TROVATA (v. report FIX-C,
 *  verificata in browser reale con harness a livello di history, non jsdom): il FIX-A (URL sync
 *  shallow verso `/cassette`) risolve solo METÀ della catena. Sequenza dove si rompe: utente
 *  arriva sulla parete (swipe/dot → `pushState('/cassette')`, invariato) → tap su una cassetta
 *  con lavoro → `router.push('/lavori/[id]')`, una navigazione VERA, non shallow → il router di
 *  Next tiene l'albero di `/dashboard` (con questo pager) nella sua cache client per un ritorno
 *  rapido → l'utente preme «‹» nella scheda del lavoro (`tornaIndietro`, `router.back()`) →
 *  Next RIPRISTINA l'albero cachato invece di rifare il fetch — e quell'albero porta lo stato
 *  DEL PRIMO MONTAGGIO: `useState(stanzaIniziale)` riparte dal prop server-side calcolato al
 *  primo caricamento di `/dashboard` (quasi sempre `'pile'`), perché l'avanzamento a `'parete'`
 *  fatto dal dot/swipe era stato solo `setAttiva` in memoria — MAI arrivato al server, MAI
 *  scritto da nessuna parte che il router-cache legga. Risultato osservato: l'indirizzo torna
 *  correttamente a mostrare `/cassette` (il FIX-A quello lo fa), ma il contenuto mostrato è la
 *  home con le PILE — il difetto esatto del verbale, sopravvissuto al FIX-A perché quel fix
 *  sincronizza l'URL ma non sa che un remount dal router-cache può ignorarlo.
 *
 *  Rimedio: NON fidarsi solo del prop `stanzaIniziale` per l'attiva iniziale — se il browser
 *  mostra GIÀ `/cassette` nell'istante in cui QUESTA istanza nasce (mount vero O remount da
 *  router-cache: per `useState`/l'effect di scroll qui sotto sono indistinguibili, ed è
 *  esattamente il punto — leggere l'indirizzo CORRENTE, che la storia del browser porta con sé
 *  attraverso qualunque tipo di remount, batte un prop che può essere stantio), la parete è la
 *  stanza giusta, a prescindere da cosa dica il prop. Il pager non monta MAI sulla vera pagina
 *  standalone `/cassette` (quella non usa `StanzePager` — v. `HomeV3.tsx`), quindi questo
 *  controllo non rischia mai di intercettare un caso che non è suo. */
function stanzaEffettiva(stanzaIniziale: StanzaHome): StanzaHome {
  if (typeof window !== 'undefined' && window.location.pathname === '/cassette') return 'parete'
  return stanzaIniziale
}

/** QA device T15 (addendum 24/07, supera Task 12/D2) — la stanza parete della home: componente
 *  LOCALE (vive qui, non un file a parte — l'anteprima cap-8 che occupava `StanzaParete.tsx` è
 *  morta col suo test) che avvolge la `PareteClient` VERA con un mount differito (riserva ARCH
 *  R3). Il pannello destro NON è più una stanza a chrome ridotto: è la pagina /cassette intera
 *  (header titolo+back+☰, ricerca, griglia) — `onIndietro` porta il back dell'header alle pile
 *  invece di lasciare la home (v. commento su `PareteClient`). Il pager resta l'unico a
 *  possedere `attiva`: qui pilota insieme `inert`/`aria-hidden` (dal genitore), il refresh
 *  gated di `PareteClient` (riserva ARCH R2, `attivo`) e il momento del mount.
 *
 *  Mount: se la stanza è già attiva al render (deep-link `?stanza=parete`) o lo diventa mentre
 *  l'utente la sceglie (linguetta/back button/swipe — QA device D3: erano anche dot/freccia,
 *  morti insieme ai dot), monta SUBITO — l'aggiustamento di stato avviene nel render stesso
 *  (`if (props.attiva && !montata) setMontata(true)`), non in un effect passivo: un effect qui
 *  arriverebbe DOPO l'effect del pager che sposta il focus nella stanza entrante (v. `[attiva]`
 *  sotto), trovandola ancora vuota — la stanza fisicamente esiste ma il primo focusable interno
 *  non c'è ancora. Se invece resta inattiva, il mount pieno aspetta il primo idle (fallback
 *  `setTimeout` 300ms — jsdom e alcuni browser non hanno `requestIdleCallback`): col peek morto
 *  (Task 13) la stanza è del tutto fuori schermo, niente serve montarla subito. Requisito UX di
 *  collaudo: il primo swipe non deve stutterare — mai un mount sincrono e pesante a metà gesto,
 *  da cui il ramo idle. Una volta montata RESTA montata (mai `setMontata(false)`): un ritorno
 *  alle pile non deve smontare/rimontare il muro. */
function StanzaParete(props: {
  parete: CassettaParete[]
  attiva: boolean
  onIndietro: () => void
  /** QA device T15 — pass-through verso `PareteClient` (v. il commento sulla prop lì): `true`
   *  mentre l'indirizzo è stato spinto a `/cassette` da questo pannello. */
  sospendiRefresh: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [montata, setMontata] = useState(props.attiva)
  if (props.attiva && !montata) setMontata(true)
  useEffect(() => {
    if (montata) return
    // `typeof window.requestIdleCallback === 'function'` (non `'requestIdleCallback' in
    // window`): lib.dom.d.ts dichiara il metodo NON opzionale su `Window`, quindi l'operatore
    // `in` farebbe restringere il ramo «assente» a `never` (falso per TypeScript, vero in jsdom
    // e in browser che non lo implementano) — `tsc --noEmit` cadrebbe su un tipo fantasma.
    const idle =
      typeof window.requestIdleCallback === 'function'
        ? window.requestIdleCallback(() => setMontata(true))
        : window.setTimeout(() => setMontata(true), 300)
    return () => {
      if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle as number)
      else clearTimeout(idle as number)
    }
  }, [montata])
  return (
    <div ref={scrollRef} className="ua-stanza-parete-scroll">
      {montata ? (
        <PareteClient
          parete={props.parete}
          attivo={props.attiva}
          scrollerRef={scrollRef}
          onIndietro={props.onIndietro}
          sospendiRefresh={props.sospendiRefresh}
        />
      ) : null}
    </div>
  )
}

export function StanzePager(props: {
  stanzaIniziale: StanzaHome
  pile: ReactNode
  /** Task 12 (D2): non più un `ReactNode` composto dal chiamante — il pager possiede l'unico
   *  dato che gli serve davvero (`attiva`) per pilotare il mount differito, quindi possiede
   *  anche il rendering della stanza (v. `StanzaParete` locale sopra). */
  parete: CassettaParete[]
  /** Il piano fisso sotto le stanze: UN solo TastoPiù, identico e immobile in entrambe
   *  (§3.3 regola 5) — mai un doppione visibile a metà snap. Sta fuori dal viewport, così
   *  non scorre con le stanze. */
  footer?: ReactNode
  /** QA device T15 (addendum 24/07, punto 3) — il piede vive FUORI dal pager (in `HomeV3.tsx`,
   *  non passato come `footer` qui: v. commento lì) ma deve sparire quando la stanza attiva è
   *  la parete («niente TastoPiù nel lato cassette»). Il pager è l'unico a sapere quale stanza
   *  è attiva in ogni istante — questo callback lo comunica al chiamante a ogni cambio. */
  onStanzaChange?: (stanza: StanzaHome) => void
}) {
  const { stanzaIniziale, pile, parete, footer, onStanzaChange } = props
  // QA device T15.8 — `stanzaEffettiva` (v. commento sopra), non il prop nudo: un remount dal
  // router-cache di Next (back da una navigazione vera, es. dalla scheda di un lavoro) deve
  // ripartire dalla stanza che l'indirizzo dice ORA, non da quella del primissimo caricamento.
  const [attiva, setAttiva] = useState<StanzaHome>(() => stanzaEffettiva(stanzaIniziale))
  const viewport = useRef<HTMLDivElement | null>(null)
  const stanze = useRef<Record<StanzaHome, HTMLDivElement | null>>({ pile: null, parete: null })
  // `true` solo fra una scelta esplicita (linguetta/back button) e il re-render che ne
  // consegue: è lì che il focus può entrare nella stanza, quando l'`inert` è già stato tolto.
  const focusDaPortare = useRef(false)
  const ridotto = useReducedMotion()

  // Task 13 (D7) — chi arriva alla stanza Parete (swipe O navigazione esplicita) registra
  // l'accesso (riserva UX 3b, spegne la linguetta dopo 3 arrivi): punto unico, nel setter della
  // stanza attiva, quando la transizione è DAVVERO pile→parete. La stanza corrente si legge da un
  // ref, non dalla chiusura dell'effect IO (che monta una volta sola, senza dipendenza da
  // `attiva` — leggerlo lì darebbe sempre la stanza del PRIMO render); il ref si aggiorna in
  // un effect dedicato (mai scrivere un ref DURANTE il render — gate di lint di questo repo,
  // `react-hooks/refs`), che gira dopo ogni commit e quindi è sempre fresco prima della
  // prossima interazione utente/IO che possa chiamare `impostaAttiva`. `registraAccessoParete`
  // NON può vivere dentro l'updater di `setAttiva`: React StrictMode (attivo di default in
  // `next dev`) invoca due volte gli updater funzionali in sviluppo, quindi un effetto
  // collaterale lì dentro scriverebbe due accessi per ogni transizione reale — la stessa
  // doppia registrazione che questo task esiste per evitare, resuscitata in dev.
  const attivaRef = useRef(attiva)
  useEffect(() => {
    attivaRef.current = attiva
  }, [attiva])

  // QA device T15 (addendum 24/07, punto 3) — il chiamante (HomeV3) decide da questo callback
  // se mostrare il piede: separato da `registraAccessoParete` sopra apposta, gira ad OGNI
  // cambio di stanza (non solo pile→parete) e non deve mai essere gated dal flag
  // `giaRegistrato` che la linguetta usa per evitare il doppio conteggio (§ altrove) — qui non
  // si conta nulla, si comunica solo «la stanza visibile ORA è questa».
  useEffect(() => {
    onStanzaChange?.(attiva)
  }, [attiva, onStanzaChange])

  // QA device T15 (addendum 24/07, punto 1/2) — URL sync SENZA router: il pannello destro del
  // pager rende la pagina /cassette vera (v. `StanzaParete`/`PareteClient`), quindi l'indirizzo
  // deve dirlo, ma senza passare da `router.push` (che farebbe fetch/rendering della route reale
  // — esattamente il "loading" che il gesto non deve avere). Next 16 intercetta
  // `history.pushState`/`replaceState` chiamate fuori dal proprio router (v.
  // `node_modules/next/dist/client/components/app-router.js`, `applyUrlFromHistoryPushReplace`)
  // e aggiorna `usePathname()`/`useSearchParams()` SENZA rifare fetch — è il meccanismo "shallow"
  // che il verbale cita. `urlPushataRef` distingue «questo pager ha spinto lui l'entry /cassette»
  // da «la parete è attiva per un altro motivo» (deep-link `?stanza=parete`, preferenza
  // `due_stanze` che apre lì di default): SOLO nel primo caso il ritorno alle pile deve muovere
  // la history (altrimenti un `history.back()` a vuoto manderebbe l'utente a una pagina precedente
  // arbitraria, fuori dalla home). Letta/scritta SOLO da `sincronizzaUrlStanza` e dal listener
  // `popstate` sotto — mai durante il render (niente scritture di ref lì, gate di lint del repo).
  // QA device T15.8 — inizializzato a `true` quando l'indirizzo è GIÀ `/cassette` alla nascita di
  // questa istanza (remount da router-cache, v. `stanzaEffettiva`): l'entry è comunque quella che
  // QUESTO pager aveva spinto prima di uscire — il ritorno alle pile deve ancora fare
  // `history.back()`, non una `pushState` in più (che impilerebbe un'entry fantasma).
  const urlPushataRef = useRef(typeof window !== 'undefined' && window.location.pathname === '/cassette')
  // QA device T15 — verificato in browser reale (v. report FIX-A): dopo `pushState('/cassette')`
  // Next.js aggiorna il proprio `canonicalUrl` a `/cassette` (intercetta il pushState nudo, è il
  // meccanismo shallow VOLUTO), ma questo rende PERICOLOSO ogni `router.refresh()` chiamato
  // mentre l'albero montato è ancora quello di `/dashboard`: rifà il fetch della rotta VERA
  // `/cassette` sul server e ne sostituisce il contenuto al pannello, silenziosamente. Stato
  // REATTIVO (non solo `urlPushataRef`, che è un ref e non farebbe ri-renderizzare
  // `PareteClient` col nuovo valore): `PareteClient` lo riceve come `sospendiRefresh` e sospende
  // SOLO il proprio refresh silenzioso su focus/visibilitychange (v. commento lì — gli altri
  // `router.refresh()` di `PareteClient`, dopo un'azione ESPLICITA dell'utente, restano invariati
  // e sono annotati come limitazione nota, non risolta qui).
  // QA device T15.8 — stesso motivo di `urlPushataRef`: se rinasciamo con l'indirizzo già su
  // `/cassette`, `PareteClient` deve nascere con `sospendiRefresh` già attivo (altrimenti il primo
  // focus/visibilitychange dopo il remount rifarebbe un `router.refresh()` silenzioso mentre
  // l'albero mostrato non è ancora quello vero di `/cassette` — v. commento su `sospendiRefresh`).
  const [urlDivergente, setUrlDivergente] = useState(() => typeof window !== 'undefined' && window.location.pathname === '/cassette')
  const sincronizzaUrlStanza = useCallback((nuova: StanzaHome) => {
    if (typeof window === 'undefined') return
    if (attivaRef.current === 'pile' && nuova === 'parete' && !urlPushataRef.current) {
      window.history.pushState({}, '', '/cassette')
      urlPushataRef.current = true
      setUrlDivergente(true)
    } else if (attivaRef.current === 'parete' && nuova === 'pile' && urlPushataRef.current) {
      urlPushataRef.current = false
      setUrlDivergente(false)
      // `history.back()`, non `pushState`/`replaceState`: è la stessa entry che abbiamo spinto
      // sopra, tornarci indietro (invece di impilarne una nuova su /dashboard) tiene la history
      // pulita — un secondo back dell'utente da qui in poi lascia la home per davvero, come ci
      // si aspetta da uno swipe che ha solo "aperto" le cassette.
      window.history.back()
    }
  }, [])

  // Back hardware/gesto del telefono mentre si guarda il pannello cassette: il browser fa DA SÉ
  // la traversal della history (Next la intercetta a sua volta per `usePathname` — v. sopra),
  // ma il pager resta un componente client con un proprio stato `attiva`: nessuno lo riporta
  // sulle pile da solo. Questo listener chiude il cerchio, SENZA reload (`popstate` è un evento
  // same-document) e senza richiamare `history.back()` di nuovo (la traversal è già avvenuta).
  //
  // G5 (FIX-I) — guardia `window.location.pathname !== '/cassette'`: da quando il `Sheet` ds
  // (v. `Sheet.tsx`) pusha una SUA entry «leggera» quando un `CassettaSheet`/`NuovaCassettaSheet`
  // è aperto sul pannello, un back può consumare QUELLA entry (chiudendo solo lo sheet) invece
  // di quella di questo pager — senza guardia, questo listener reagirebbe comunque (le due
  // condizioni sopra restano vere) e riporterebbe erroneamente alle pile mentre l'utente ha
  // solo chiuso uno sheet restando sulla parete. L'entry dello sheet non cambia l'indirizzo
  // (`Sheet.tsx` pusha senza url, stessa pagina): il pathname resta `/cassette` finché
  // l'entry consumata è la SUA, non quella di questo pager — quando invece è DAVVERO la entry
  // del pager a essere consumata, il pathname torna alla pagina precedente (mai `/cassette`),
  // e la guardia lascia passare la reazione. Verificato con `dedicated tests`
  // (`stanze-pager.test.tsx`, describe «G5 — sheet embedded non interferisce…»).
  useEffect(() => {
    function alPopState() {
      if (urlPushataRef.current && attivaRef.current === 'parete' && window.location.pathname !== '/cassette') {
        urlPushataRef.current = false
        setUrlDivergente(false)
        setAttiva('pile')
        const contenitore = viewport.current
        const bersaglio = stanze.current.pile
        if (contenitore && bersaglio && typeof contenitore.scrollTo === 'function') {
          contenitore.scrollTo({ left: bersaglio.offsetLeft, behavior: 'auto' })
        }
      }
    }
    window.addEventListener('popstate', alPopState)
    return () => window.removeEventListener('popstate', alPopState)
  }, [])

  const impostaAttiva = useCallback((nuova: StanzaHome) => {
    if (attivaRef.current === 'pile' && nuova === 'parete') registraAccessoParete()
    sincronizzaUrlStanza(nuova)
    setAttiva(nuova)
  }, [sincronizzaUrlStanza])

  // Swipe: l'IO è l'unica fonte per il gesto continuo. Nessuna dipendenza — le ref sono
  // stabili e la callback legge solo il DOM.
  useEffect(() => {
    const contenitore = viewport.current
    if (!contenitore) return

    // Posizionamento iniziale, PRIMA di osservare (review del proprio diff): il viewport
    // nasce a scrollLeft 0, cioè sulla stanza Pile. Entrando con `?stanza=parete` — o con la
    // preferenza che apre sulla Parete — senza questo scroll si vedrebbe la stanza Pile mentre
    // lo stato la dà per uscente: inerte, aria-hidden, mentre l'attiva vera è l'altra. Sempre
    // `'auto'`: non è un movimento che l'utente ha chiesto, è il punto in cui la pagina
    // comincia — animarlo sarebbe un carosello che parte da solo.
    // L'ordine conta: farlo prima di `observe()` significa che l'IO comincia a misurare su
    // una posizione già giusta, senza dipendere da quando il browser consegna la prima
    // notifica.
    // QA device T15.8 — `stanzaEffettiva`, non il prop nudo: stesso motivo dell'inizializzazione
    // di `attiva` sopra, altrimenti un remount da router-cache con l'indirizzo già su `/cassette`
    // posizionerebbe il viewport sulle pile mentre lo stato (corretto) dice parete — i due
    // andrebbero fuori sincrono, con l'IO che poi "corregge" lo stato di nuovo verso le pile al
    // primo scatto sopra soglia sulla stanza che il viewport mostra per davvero.
    const iniziale = stanze.current[stanzaEffettiva(stanzaIniziale)]
    if (iniziale && typeof contenitore.scrollTo === 'function') {
      contenitore.scrollTo({ left: iniziale.offsetLeft, behavior: 'auto' })
    }

    if (typeof IntersectionObserver === 'undefined') return
    const osservatore = new IntersectionObserver(
      (voci) => {
        for (const voce of voci) {
          // La soglia si RILEGGE dal ratio, non ci si fida di `isIntersecting`: l'IO notifica
          // a ogni attraversamento, anche in USCITA dalla soglia (dove `isIntersecting` è
          // ancora true ma il ratio è sceso). Senza questo controllo, uno swipe verso la
          // parete rimetterebbe attiva la stanza che si sta lasciando.
          if (voce.intersectionRatio < SOGLIA_STANZA_ATTIVA) continue
          const nome = (voce.target as HTMLElement).dataset.stanza as StanzaHome | undefined
          if (nome) impostaAttiva(nome)
        }
      },
      { root: contenitore, threshold: SOGLIA_STANZA_ATTIVA }
    )
    for (const nome of ORDINE) {
      const elemento = stanze.current[nome]
      if (elemento) osservatore.observe(elemento)
    }
    return () => osservatore.disconnect()
    // `stanzaIniziale` cambia solo con una nuova navigazione server (`?stanza=` diverso): in
    // quel caso riposizionarsi sulla stanza chiesta è esattamente ciò che si vuole.
    // `impostaAttiva` è stabile (`useCallback` a deps `[]`): elencarla non fa girare l'effect
    // più spesso, soddisfa solo `react-hooks/exhaustive-deps`.
  }, [stanzaIniziale, impostaAttiva])

  // Il focus entra nella stanza SOLO dopo il re-render che le ha tolto `inert`: chiamarlo
  // prima sarebbe un `focus()` silenziosamente inefficace su un sottoalbero inerte.
  useEffect(() => {
    if (!focusDaPortare.current) return
    focusDaPortare.current = false
    // QA device T15.2 — su dito NIENTE focus automatico nel pannello che si apre (v. commento
    // su `puntatoreTattile` sopra): resta solo per chi è arrivato da tastiera.
    if (puntatoreTattile()) return
    const entrante = stanze.current[attiva]
    // Collaudo R2 (D-1, 22/07 sera): SEMPRE preventScroll — il focus nudo fa lo scroll-into-view
    // istantaneo che CANCELLA lo scrollTo smooth di `vaiA`, e lo snap mandatory ri-aggancia alla
    // stanza di partenza: il tap sembrava morto. Lo scroll è SOLO di `vaiA`.
    entrante?.querySelector<HTMLElement>(FOCUSABILI)?.focus({ preventScroll: true })
  }, [attiva])

  // QA device (verbale 25/07, fix-list D3) — coi dot morti, `vaiA` ha oggi SOLO due chiamanti:
  // la linguetta (pile→parete) e il tasto «‹ Indietro» dell'header della parete (parete→pile,
  // v. il render sotto). Entrambi sono gesti ESPLICITI verso la stanza OPPOSTA a quella attiva
  // — non esiste più un caso «tap sulla stanza già attiva» (quello nasceva SOLO dal dot della
  // stanza corrente): niente più da distinguere per origine, il focus entra sempre nella
  // stanza entrante via l'effect su `[attiva]` sopra (che già applica il guard T15.2 su dito).
  const vaiA = useCallback(
    // `opts.giaRegistrato` (Task 13, D7): la linguetta «Le cassette» registra il proprio
    // accesso DA SÉ (serve anche fuori dal pager, nella forma «solo pile» di HomeV3, dove
    // non esiste alcun `impostaAttiva`). Dentro il pager il suo `onVai` finisce comunque qui:
    // senza questo flag la STESSA visita alla parete verrebbe contata due volte (una dalla
    // linguetta, una da `impostaAttiva` sotto) — non un doppio conteggio innocuo, ma una
    // stanza che si spegnerebbe dopo ~1.5 tap reali invece che dopo 3.
    (destinazione: StanzaHome, opts?: { giaRegistrato?: boolean }) => {
      if (opts?.giaRegistrato) {
        // La linguetta ha già registrato l'accesso da sé (v. commento sopra): qui manca SOLO
        // `registraAccessoParete`, non la URL sync — anche questa via deve spingere/tornare
        // dall'entry /cassette.
        sincronizzaUrlStanza(destinazione)
        setAttiva(destinazione)
      } else impostaAttiva(destinazione)
      focusDaPortare.current = true
      const contenitore = viewport.current
      const bersaglio = stanze.current[destinazione]
      // `scrollTo` non esiste in jsdom (e non esisterebbe su un contenitore mai montato): la
      // guardia evita che un ambiente senza scroll faccia cadere il cambio di stanza, che è
      // già avvenuto sopra ed è ciò che conta davvero.
      if (!contenitore || !bersaglio || typeof contenitore.scrollTo !== 'function') return
      contenitore.scrollTo({ left: bersaglio.offsetLeft, behavior: ridotto ? 'auto' : 'smooth' })
    },
    [ridotto, impostaAttiva, sincronizzaUrlStanza]
  )

  return (
    <div className="ua-stanze">
      <div className="ua-stanze-viewport" ref={viewport}>
        {ORDINE.map((nome) => {
          const eAttiva = nome === attiva
          return (
            <div
              key={nome}
              className="ua-stanza"
              data-stanza={nome}
              aria-hidden={!eAttiva}
              inert={!eAttiva}
              ref={(nodo) => {
                stanze.current[nome] = nodo
              }}
            >
              {nome === 'pile' ? (
                // Fix round 2 (review Task 14, Critical P3) — `.ua-stanza-pile-scroll`
                // (ds-v3.css, accanto a `.ua-stanza-parete-scroll`): stessa ricetta della
                // stanza Parete, DENTRO `.ua-stanza` e quindi PRIMA del clip verticale di
                // `.ua-stanze-viewport` (overflow-y:hidden, due livelli più in fuori). Senza
                // questo wrapper il degrado scroll P3 di `.corpo` (HomeV3.tsx) non riceve mai
                // l'overflow della stanza Pile nella forma pager — v. commento CSS per la
                // riproduzione e il perché.
                <div className="ua-stanza-pile-scroll">{pile}</div>
              ) : (
                // QA device T15 (addendum 24/07, punto 1) — il back dell'header DENTRO il
                // pannello torna alla stanza Pile (stesso gesto di uno swipe inverso), MAI
                // `router.back()`: quello lascerebbe la home per una pagina precedente
                // arbitraria. `vaiA` porta con sé focus/scroll/URL sync — un solo posto per
                // tutte le vie di ritorno alle pile.
                <StanzaParete
                  parete={parete}
                  attiva={eAttiva}
                  onIndietro={() => vaiA('pile')}
                  sospendiRefresh={urlDivergente}
                />
              )}
            </div>
          )
        })}
      </div>

      {footer}

      {/* Task 13 (D7) — visibile SOLO dalla stanza Pile (dalla Parete non c'è nulla da
          invitare). `giaRegistrato: true`: la linguetta ha già registrato il proprio accesso
          da sé (v. commento su `vaiA` sopra) — qui si chiede solo lo scroll/focus.
          QA device (verbale 25/07, fix-list D3) — coi dot rimossi, la linguetta è anche IL
          percorso da tastiera verso la parete (v. commento in testa al file): resta un
          `<button>` vero, nessun trucco di focus dedicato le serve. */}
      <LinguettaCassette visibile={attiva === 'pile'} onVai={() => vaiA('parete', { giaRegistrato: true })} />
    </div>
  )
}
