'use client'

// DS v3 §5.35 (spec docs/superpowers/specs/2026-07-21-parete-cassette-design.md §5/§13) —
// Cassetta (tray): la cella della Parete, fedele 1:1 al mockup ratificato
// `docs/design/mockups/2026-07-20-parete-cassette-v2.html` (righe 66-105 CSS, 229-268 markup
// demo). Corpo gradiente + linguetta `::before` + cavità con `MiniaturaLavoro` (§5.36) + targa
// (troncamento CSS ~6ch, SR legge il nome completo via `aria-label` — il troncamento è visivo,
// non semantico).
//
// Task 10 (D4, punto 12) — «la targa nuova» (mockup `2026-07-24-rete-gancetto-targa.html` §4,
// verbale `docs/design/decisions/2026-07-24-rete-gancetto-targa.md` §6/§7/§8/§9): il contenuto
// occupata è dentista + paziente (alias vince sul codice, Task 1) su due righe — MAI il numero
// lavoro né il tipo (la terza riga è MORTA, anche in collisione: decisione O1, gemelle identiche
// by design, disambiguatore = ricerca per numero lavoro, non la targa). Tipografia: clinico
// SENZA grassetto, paziente IN grassetto, sempre (verbale §7). Nomi lunghi: T2, riduzione del
// font poi 2 righe (verbale §8). La prop `inCollisione`/`targheInCollisione` (Task 1) NON si
// consuma qui — resta esportata per chi la usa altrove (es. ricerca), O1 non la vuole in targa.
//
// FIX-L (G10, RATIFICA FINALE 25/07, mockup `2026-07-25-cassetta-g10-rev3-p3-reale.html`
// variante P3b, verbale `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` §G10):
// «fascia etichetta» — targa+cont non sono più due elementi affiancati liberi nel corpo del
// tile, ma vivono DENTRO un contenitore unico `.ds-cassetta-fascia`, identico per libere e
// occupate. La targa mantiene il segnale di stato (anello quando libera, piena bianca quando
// occupata — gate targa Task 10 pienamente in vigore, precisazione Francesco 25/07 vincolante):
// la sola STRUTTURA (fascia/finestra/bordino) è uniforme, non la targa.
//
// H2 (RATIFICA 25/07, decisione 0c37f25, mockup `2026-07-25-cassetta-h2-proposte.html` opzione
// B, verbale `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` §H2) — CHIUDE il
// doppio regime che FIX-L aveva lasciato aperto (`is-nome-lungo`/min-height 142 +
// `is-shrink`/`SOGLIA_NOME_LUNGO`): la fascia passa da "abbraccia il contenuto" a un'altezza
// VERA e FISSA (72px, v. `.ds-cassetta-fascia` in ds-v3.css) che riserva SEMPRE lo spazio del
// caso peggiore (clinico 2 righe + paziente 1 riga) — la finestra si restringe di conseguenza
// (66→40px) e la miniatura scala a `height={23}` sotto (§58% del mockup, `.fin svg{height:58%}`,
// 40×0.58≈23.2). Risultato: la sagoma è unica per COSTRUZIONE (mai più di 132px di contenuto di
// flusso), non serve più calcolare una soglia sul testo — `SOGLIA_NOME_LUNGO`/`nomeLungo`/
// `is-nome-lungo`/`is-shrink` sono RIMOSSI, non sostituiti. Il clinico va SEMPRE a capo (max 2
// righe), il paziente resta SEMPRE 1 riga con una sfumatura morbida sul bordo (mockup
// `.optB .paz` + base `.paz` — mai un'ellissi "…" a metà nome, vincolo (c) del verbale). Misure
// reali (real-render Playwright) in `.superpowers/sdd/h2-impl-report.md`.
//
// H2 — ADJUDICAZIONE (post-implementazione, dal controller): il mockup B usa
// `-webkit-line-clamp:2` per il clinico, ma quel meccanismo inietta SEMPRE un'ellissi "…"
// quando il testo eccede 2 righe (misurato: `text-overflow` non la sopprime) — su un nome
// clinico estremo riproduce esattamente la lamentela originale del verbale ("STUDI MEDICI DI
// SANTI…"). Dove la prosa ratificata ("sfumatura morbida, mai ellipsis netta") contraddice il
// CSS letterale del mockup, vince la prosa. Il clinico è quindi tagliato con un `max-height`
// dichiarato (2 righe esatte, MAI `-webkit-line-clamp`) + una sfumatura APPLICATA SOLO quando
// `dentRef`/`dentTroncato` (sotto) misurano un overflow REALE nel DOM — mai un mask permanente
// legato al confine di altezza, che rischierebbe di attenuare lettere legittime sui nomi che
// riempiono le 2 righe senza sforare. V. `.ds-cassetta-dent`/`.is-troncato` in ds-v3.css.
//
// Le 6 coppie di gradiente standard (righe 77-82 del mockup) sono FISSE e verbatim — vivono come
// classi CSS in `src/app/ds-v3.css` (`.ds-cassetta.<slug>`), non come token derivato: sono valori
// letterali già ratificati (brief Task 10, risoluzione 4 — "non normalizzarla, non derivarla da
// token"). Il colore custom (hex) è l'unico caso davvero per-istanza e resta inline qui, via la
// formula `color-mix` data dal brief.
//
// Stati: libera (cavità vuota, targa outline, «libera» al 60%) · accesa (ricerca: anello blu 3px
// + elevazione, `aria-current="true"` — mai solo colore, spec §12). Lo stato `spenta` è MORTO
// (ratifica 22/07, spec redesign §2.4 — «filtra e risali»): con ricerca attiva le non-match non
// si affievoliscono più, si SMONTANO — il chiamante (`PareteClient`) non le rende affatto.
//
// Gesti (spec §5.4/§5.35 + Task 13). INVARIANTE NORMATIVA (panel Task 13 §3, non negoziabile):
// Cassetta RICONOSCE il gesto fino al sollevamento; DAL SOLLEVAMENTO IN POI non insegue più NULLA —
// il gesto passa all'hook del contenitore (`useDragRiordino`, listener su `window`). Il flag
// `sollevata` rende `handlePointerMove`/`handlePointerUp` no-op dopo il lift: è presidiato da un
// test che VIETA (Cassetta.test.tsx «VIETA il tracking post-sollevamento»), non da uno che permette.
//
//  • tap = azione primaria. Vive su `onClick` (difetto a11y n.2, Task 13): il doppio-tap di
//    VoiceOver/TalkBack emette un `click`, non una coppia pointerdown/up — senza `onClick` chi usa
//    uno screen reader su touch non otterrebbe nulla. La macchina pointer resta solo per
//    discriminare tap/hold/sollevamento e per INGOIARE il click sintetico che segue un drag.
//  • hold 300ms fermo (<8px): se il chiamante offre il drag (`onSollevata`) → SOLLEVAMENTO
//    (`onSollevata`), e da lì lo sheet/drop li decide l'hook; altrimenti (solo `onLongPressSheet`,
//    percorso legacy) → apre lo sheet al rilascio, come prima di Task 13.
//  • spostamento oltre 8px: su mouse/pen arma SUBITO il sollevamento (§2.4.1 ricerca); su touch
//    ANNULLA l'hold (lo scroll vince, §2.2) — mai un sollevamento a metà di uno swipe.
//  • `draggable` HTML è inchiodato a `false` sul button (difesa dal DnD nativo iOS/desktop che, per
//    spec, emetterebbe `pointercancel` uccidendo il gesto — §2.2 ricerca). La prop `draggable`
//    resta SOLO l'affordance visiva (cursor grab via classe). Le miniature sono SVG inline, non
//    `<img>`: nessun bersaglio draggable nativo lì dentro.

import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import { cssEase } from '@/design-system/v3/motion'
import { miniaturaPerLavoro } from '@/lib/domain/miniature-lavoro'
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect'
import { MiniaturaLavoro } from './MiniaturaLavoro'

const SOGLIA_LONG_PRESS_MS = 300
// Collaudo R2 (P9-bis, 22/07 sera): «busta del tap» per il recupero su pointercancel. Sul device
// reale lo slop di Chrome Android è ~8px CSS, come la nostra soglia: un tap frettoloso con jitter
// diventa un micro-PAN — il browser emette pointercancel e MAI click/pointerup, un percorso in cui
// nessun handler poteva più servire il tap. Se al cancel il gesto è rimasto dentro la busta
// (poco spazio, poco tempo) e al touchend la pagina NON è davvero scrollata, quello era un tap.
const SOGLIA_RECUPERO_TAP_PX = 24
const SOGLIA_RECUPERO_TAP_MS = 300
const SOGLIA_RECUPERO_SCROLL_PX = 6
const SOGLIA_MOVIMENTO_PX = 8

// H2 (0c37f25) — `SOGLIA_NOME_LUNGO`/`.is-shrink` (Task 10, T2, verbale §8) RIMOSSA: era la
// soglia oltre cui la targa passava a font ridotto/2 righe SOLO per i nomi lunghi. L'opzione B
// rende quel trattamento (clinico a capo, max 2 righe) PERMANENTE per qualunque lunghezza — la
// fascia ha ora un'altezza fissa che riserva sempre lo spazio del caso peggiore (v.
// `.ds-cassetta-fascia` in ds-v3.css) — quindi non serve più decidere runtime "è lungo?": il
// CSS si comporta identico per «Bianchi» e per «Studio Di Santi Rossi».

/**
 * titleCase (verbale §6 «Casing del paziente») — `pazienteAlias` (Task 1, `derivaAlias`) arriva
 * già trimmato ma NON ricasato: il trigger DB `sync_paziente_nome_cognome` scrive il nome in
 * MAIUSCOLO. Qui, solo per la targa, lo normalizziamo in Iniziali Maiuscole («RUSSO MARIA» →
 * «Russo Maria», «DEL GROSSO MARIA» → «Del Grosso Maria» — nessuna gestione speciale delle
 * particelle, ogni parola prende la propria maiuscola iniziale, verbatim dalla tabella del
 * mockup §6). Il CODICE (fallback quando l'alias manca) non passa MAI da qui: resta letterale
 * (es. «PZ-0042»), come nella stessa tabella.
 */
function titleCase(testo: string): string {
  return testo
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((parola) => parola.charAt(0).toUpperCase() + parola.slice(1))
    .join(' ')
}

// Le 6 facce standard vivono come classi in ds-v3.css (v. nota di testa) — questo Set serve
// SOLO a decidere "applica la classe" vs "componi il gradiente custom inline" (il solo caso
// per-istanza: un hex arbitrario non può essere una classe statica).
const SLUG_STANDARD = new Set(['rossa', 'blu', 'azzurra', 'grigia', 'bianca', 'verde'])

function luminanzaRelativa(hex: string): number {
  const canale = (byte: number) => {
    const s = byte / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const r = canale(parseInt(hex.slice(1, 3), 16))
  const g = canale(parseInt(hex.slice(3, 5), 16))
  const b = canale(parseInt(hex.slice(5, 7), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * targaScura (§5.35) — quando la faccia della cassetta è chiara, targa/riga "cont" passano a
 * inchiostro scuro (altrimenti bianco su bianco/azzurro sarebbe illeggibile: pura leggibilità
 * del testo, il colore non è mai l'unica fonte di stato altrove nel componente).
 * - slug `bianca`/`azzurra` → sempre `true` (le uniche due facce standard chiare).
 * - hex custom → luminanza relativa WCAG > 0.55 → `true`.
 * - qualunque altro slug standard (rossa/blu/grigia/verde) → `false`.
 */
export function targaScura(colore: string): boolean {
  if (colore === 'bianca' || colore === 'azzurra') return true
  if (/^#[0-9A-Fa-f]{6}$/.test(colore)) return luminanzaRelativa(colore) > 0.55
  return false
}

/**
 * facciaScura (Collaudo R1, revisione P11c — ratifica Francesco 22/07 sera) — mirror strutturale
 * di `targaScura`: hex custom con luminanza relativa WCAG < 0.08 è una faccia "quasi-nera". Sotto
 * questa soglia il solo gradiente schiarito non basta più — l'intera anatomia scura (cavità,
 * ombra interna, linguetta) sparisce nero-su-nero: da qui la classe `is-nera` (v. componente sotto
 * e `ds-v3.css`), che passa alla strategia speculare.
 */
export function facciaScura(hex: string): boolean {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return false
  return luminanzaRelativa(hex) < 0.08
}

/** Collaudo R1 (P11c, rev. ratifica 22/07 sera — Variante A «nero fedele») — la faccia custom
 *  deriva luce/ombra dall'hex con un FLOOR sul gradiente: su una faccia quasi-nera (`facciaScura`)
 *  nessuno dei due stop può essere il colore piatto originale (nero-su-nero, collaudo device
 *  22/07) — entrambi passano da `color-mix(…, white)`, in modo che il colore letterale scelto
 *  dall'utente (nero puro incluso) non sopravviva mai come stop finale del gradiente. Il resto
 *  dell'anatomia (cavità/ombra/linguetta) la ribalta la classe `is-nera` in ds-v3.css con la
 *  strategia speculare. */
export function derivaFacciaCustom(hex: string): string {
  if (facciaScura(hex)) {
    return `linear-gradient(180deg, color-mix(in srgb, ${hex} 77%, white), color-mix(in srgb, ${hex} 94%, white))`
  }
  return `linear-gradient(180deg, ${hex}, color-mix(in srgb, ${hex} 72%, black))`
}

export type StatoCassetta = 'normale' | 'accesa'

// Shape allineata (duck-typing) a `CassettaParete['lavoro']` di `src/lib/cassette/parco-shared.ts`
// (Task 3) — il chiamante (Task 11) passa il dato così com'è, senza rimapping: qui prendiamo
// solo i campi che ci servono per il testo e per risolvere la miniatura. `paziente`/
// `pazienteAlias` (Task 1/10) sono OPZIONALI qui pur essendo sempre presenti in
// `CassettaParete['lavoro']` reale (`paziente` è '—' al minimo, mai assente): la catalog demo
// (`ds-v3-catalogo/page.tsx`, fuori dal perimetro di questo task) costruisce ancora `lavoro`
// senza quei campi — opzionali qui evita di doverla toccare, con un fallback a '—' nel render.
export type LavoroCassetta = {
  numero: string
  dentista: string
  paziente?: string
  pazienteAlias?: string | null
  descrizione: string | null
  tipoDispositivo: string | null
}

export function Cassetta(props: {
  id: string
  nome: string
  colore: string
  lavoro: LavoroCassetta | null
  stato: StatoCassetta
  onTap: () => void
  onLongPressSheet?: () => void
  /** Task 13 — sparata allo scattare del sollevamento (timer 300ms fermo su touch; superamento
   *  degli 8px su mouse/pen). Da qui in poi il gesto è dell'hook del chiamante: Cassetta non
   *  insegue più nulla (invariante del panel, presidiata dal test che VIETA). */
  onSollevata?: (evento: ReactPointerEvent<HTMLButtonElement>) => void
  draggable?: boolean
  /** Task 9 (D1) — SOLO `true` sul clone dentro `.ds-ghost` (`PareteClient.tsx`): lo stato
   *  «staccato dal filo» si rende sul GHOST, mai sull'originale (che resta la «buca» in flow,
   *  riserva FE R3). Pilota la classe `is-staccato` sul gancetto SVG — la rotazione/alzata la fa
   *  il CSS (`ds-v3.css`), nessun literal qui. */
  staccata?: boolean
}) {
  const {
    id, nome, colore, lavoro, stato, onTap, onLongPressSheet, onSollevata, draggable = false, staccata = false,
  } = props
  // Task 9 (D1) — id univoco per il gradiente metallico del gancetto: molte Cassette vivono sulla
  // stessa pagina (la parete), un `id` SVG letterale (come nel mockup statico, un solo esemplare)
  // colliderebbe in duplicati DOM (`url(#mMetal)` risolverebbe sempre sul primo). `useId()` è lo
  // stesso pattern già in uso altrove nel repo (Campo.tsx, Sheet.tsx…) per gli id di accessibilità.
  const idMetalloGancetto = useId()

  // Stato del gesto in ref (non state): niente re-render durante pointermove, il tap/long-press
  // si decide solo al rilascio.
  const inizio = useRef<{ x: number; y: number } | null>(null)
  const spostato = useRef(false)
  const pressioneLunga = useRef(false)
  // `sollevata`: il gesto ha lasciato Cassetta ed è passato all'hook — da qui move/up sono no-op.
  const sollevata = useRef(false)
  // `tapGestito`: un tap è già stato servito (pointerup o tastiera) in questo ciclo — il click
  // sintetico che segue va ingoiato, così `onClick` (per le AT) non raddoppia l'azione.
  const tapGestito = useRef(false)
  // `ultimoPointer` (P9, collaudo device 22/07): pointerType dell'ultimo gesto iniziato. Su Chrome
  // Android il jitter di un tap frettoloso (8-15px) supera la NOSTRA soglia (`spostato = true`)
  // ma resta dentro lo slop di sistema del browser, che quindi EMETTE comunque il click naturale.
  // Dopo un VERO scroll il browser non emette click sull'elemento: su touch, un click che arriva
  // è per definizione un tap — va lasciato passare, non ingoiato come su mouse/pen dopo un drag.
  const ultimoPointer = useRef<string | null>(null)
  // P9-bis: traccia della busta del tap (ultima posizione nota, istante e scroll di partenza) e
  // smontaggio del recupero armato al pointercancel (listener one-shot su window).
  const ultimaPosizione = useRef<{ x: number; y: number } | null>(null)
  const tsInizio = useRef(0)
  const scrollBase = useRef(0)
  const smontaRecupero = useRef<(() => void) | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // P9-bis: allo smontaggio nessun recupero resta armato su window.
  useEffect(() => () => smontaRecupero.current?.(), [])

  // H2 (0c37f25, adjudicazione post-implementazione — v. commento su `.ds-cassetta-dent` in
  // ds-v3.css) — il clinico è tagliato ad altezza fissa (2 righe, CSS `max-height`), MAI con
  // `-webkit-line-clamp` (quel meccanismo inietta sempre una "…" che il verbale vieta). La
  // sfumatura che segnala "il nome continua" va applicata SOLO quando il taglio è REALE — non
  // possiamo saperlo dalla sola lunghezza della stringa (dipende dal font reale E dalla
  // larghezza della colonna, che è fluida — v. brief §"larghezza fluida"), quindi si MISURA nel
  // DOM dopo il render: `scrollHeight > clientHeight` sul nodo del clinico. `ResizeObserver`
  // (non solo un effetto al mount) perché la stessa cassetta può ricevere più o meno spazio
  // quando la griglia cambia colonne (3/4/6) senza che il componente si smonti — la larghezza
  // disponibile per il testo cambia, quindi il bisogno del taglio può comparire o sparire.
  const dentRef = useRef<HTMLSpanElement | null>(null)
  const [dentTroncato, setDentTroncato] = useState(false)
  // H2b (RATIFICA 25/07 sera, decisione d5eeed5, mockup
  // `2026-07-25-fascia-leggibilita-varianti.html` SOLO variante C) — «budget righe condiviso»:
  // il paziente arriva fino a 2 righe SOLO quando il clinico ne occupa 1 (v. CSS, selettore
  // fratello `.ds-cassetta-dent.is-due-righe ~ .ds-cassetta-paz` in ds-v3.css). `dentDueRighe`
  // è il segnale "il clinico si sta rendendo su 2 righe" — DIVERSO da `dentTroncato` (che dice
  // "il clinico STA SFORANDO oltre le 2 righe consentite"): un nome che riempie ESATTAMENTE 2
  // righe senza sforare è già `is-due-righe` (il budget del paziente deve stringersi) ma NON è
  // `is-troncato` (nessuna sfumatura sul clinico). Misura verbatim dal mockup C (numero di
  // righe = altezza renderizzata / line-height, arrotondato): `dentTroncato` implica sempre
  // `dentDueRighe` (per sforare oltre 2 righe bisogna prima averle raggiunte), mai il contrario.
  const [dentDueRighe, setDentDueRighe] = useState(false)
  // H2d round 2 (review post-fix, .superpowers/sdd/h2d-discendenti-report.md) —
  // `useIsomorphicLayoutEffect` (NON `useEffect`): il fix H2d ha dato respiro incondizionato al
  // clip-path (regola BASE di `.ds-cassetta-dent`/`.ds-cassetta-paz` in ds-v3.css), azzerato
  // SOLO da `.is-troncato` — ma `useEffect` gira DOPO il paint del browser. Al PRIMISSIMO render
  // di una cassetta con un nome a 3+ righe, per un frame la classe `is-troncato` non c'è ancora
  // (`dentTroncato` parte `false`, v. `useState` sopra) mentre il clip-path esteso È già nel CSS
  // — esattamente lo stato per cui questa stessa indagine ha misurato che una clearance
  // incondizionata rivela un filo della riga successiva (già a +0.4px, v. report H7/H2d). Prima
  // del fix H2d, `overflow:hidden` (senza clip-path) copriva anche quel frame — un regressione
  // introdotta dal fix, non presente prima. `useIsomorphicLayoutEffect` gira PRIMA del paint
  // (sincrono, subito dopo il commit DOM): la misura/classe sono già corrette al primo frame,
  // il leak muore per costruzione — SOLO il timing cambia, l'aritmetica (righe intere, H2c)
  // resta verbatim identica. `document.fonts.ready`/`ResizeObserver` restano invariati: le
  // RI-misure possono restare post-paint, il caso critico era solo il primo frame.
  useIsomorphicLayoutEffect(() => {
    const nodo = dentRef.current
    if (!nodo) {
      setDentTroncato(false)
      setDentDueRighe(false)
      return
    }
    let vivo = true
    const misura = () => {
      if (!vivo) return
      // H2c (verbale `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`, APPEND
      // «verifica finale» punto 2b: «leggera sfumatura nella parte inferiore del nome di
      // alcuni medici» che stanno ESATTAMENTE in 2 righe, senza sforare) — root cause taratura
      // insufficiente: il confronto originale (`scrollHeight > clientHeight + 1`, un epsilon
      // fisso di 1px) confrontava due misure che il motore di rendering arrotonda in modo
      // INDIPENDENTE l'una dall'altra. `line-height: 1.16` (ds-v3.css, `.ds-cassetta-dent`) su
      // `font-size: 10px` risolve a 11.6px per riga — NON un intero — e `max-height:
      // calc(2 * 1.16em)` a 23.2px: nessuno dei due è un multiplo esatto del pixel fisico su
      // DPR frazionari (es. 2.75, comune su Android; anche 1.5/3 accumulano lo stesso effetto
      // in scala minore). Ogni riga di testo viene arrotondata al pixel-device più vicino
      // INDIPENDENTEMENTE dall'arrotondamento del box `max-height` che la contiene: su 2 righe
      // l'errore di quantizzazione può sommarsi oltre l'unico pixel CSS di tolleranza che
      // avevamo, pur senza NESSUN overflow reale di contenuto — il falso positivo del verbale.
      // Fix (taratura ancorata alla metrica reale, non un numero magico più grande): invece di
      // confrontare le due altezze in px, le confrontiamo in UNITÀ DI RIGA — `scrollHeight` e
      // `clientHeight` divisi per la stessa `lineHeight` del nodo e arrotondati a intero. Un
      // arrotondamento a riga intera assorbe QUALSIASI rumore sub-pixel di quantizzazione
      // (che sull'ordine dei centesimi/decimi di pixel non può mai spostare un rapporto di
      // riga dal proprio intero più vicino), mentre uno sforo REALE di contenuto sposta il
      // conteggio delle righe di un'unità intera — è la differenza tra "arrotondare 1.02 a 1"
      // e "arrotondare 1.9 a 2": la prima è rumore, la seconda è un fatto.
      // In produzione `getComputedStyle(nodo).lineHeight` risolve sempre a un valore in px (il
      // CSS reale di ds-v3.css è caricato) — verificato via cascata reale renderizzata (v.
      // report H2b/H2c). In ambienti senza foglio di stile applicato (jsdom nei test unitari,
      // senza stub esplicito) risolve a un valore non numerico ("normal"): qui il fallback
      // torna al confronto px puro (`scrollHeight > clientHeight + 1`, comportamento
      // pre-H2c) — nessun test esistente che stubba solo scrollHeight/clientHeight (senza
      // lineHeight) cambia risultato.
      const altezzaRiga = parseFloat(getComputedStyle(nodo).lineHeight)
      if (Number.isFinite(altezzaRiga) && altezzaRiga > 0) {
        const righeContenuto = Math.round(nodo.scrollHeight / altezzaRiga)
        const righeVisibili = Math.round(nodo.clientHeight / altezzaRiga)
        setDentTroncato(righeContenuto > righeVisibili)
        setDentDueRighe(righeVisibili >= 2)
      } else {
        setDentTroncato(nodo.scrollHeight > nodo.clientHeight + 1)
        setDentDueRighe(false)
      }
    }
    misura()
    // I font web (Plus Jakarta Sans) possono ancora caricare al primo render: una ri-misura a
    // caricamento completato evita un falso negativo/positivo transitorio sulla metrica del
    // fallback font.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(misura)
    }
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(misura)
      ro.observe(nodo)
    }
    return () => {
      vivo = false
      ro?.disconnect()
    }
  }, [lavoro?.dentista])

  // H2b — il paziente riusa 1:1 lo STESSO meccanismo del clinico (`is-troncato` misurato in JS
  // via scrollHeight/clientHeight, nessuna nuova soglia): quando il clinico occupa 2 righe il
  // CSS (selettore fratello) forza il paziente a 1 riga nowrap con una sfumatura ORIZZONTALE
  // INCONDIZIONATA (identica a quella che aveva SEMPRE prima di H2b) — in quel regime questa
  // misura verticale è innocua anche se non "giusta" per quel layout, perché la regola CSS del
  // fratello ha specificità più alta e vince comunque (v. commento ds-v3.css). Quando il
  // clinico occupa 1 riga, questa è la misura CORRETTA (overflow verticale sul wrap a 2 righe).
  const pazRef = useRef<HTMLSpanElement | null>(null)
  const [pazTroncato, setPazTroncato] = useState(false)
  // H2d round 2 — stesso `useIsomorphicLayoutEffect` del dent (v. commento esteso sopra) e
  // stessa ragione: il gemello paziente condivide 1:1 il fix H2d (clip-path condizionale) quindi
  // condivide lo stesso rischio di leak-al-primo-frame senza questo timing.
  useIsomorphicLayoutEffect(() => {
    const nodo = pazRef.current
    if (!nodo) {
      setPazTroncato(false)
      return
    }
    let vivo = true
    const misura = () => {
      if (!vivo) return
      // H2c — il rilevatore gemello del paziente condivide LA STESSA debolezza del clinico
      // (v. commento esteso sopra, sull'effetto `useEffect` di `dentRef`): stessa famiglia di
      // meccanismo (`scrollHeight`/`clientHeight` misurati in JS), stessa correzione. Il
      // paziente ha il proprio `line-height` (1.24, diverso da 1.16 del clinico — v.
      // `.ds-cassetta-paz` in ds-v3.css) quindi si legge `getComputedStyle` sul NODO del
      // paziente stesso, non si riusa la lineHeight del dent. Fallback identico: senza CSS
      // reale applicato (jsdom senza stub) si torna al confronto px puro pre-H2c.
      const altezzaRiga = parseFloat(getComputedStyle(nodo).lineHeight)
      if (Number.isFinite(altezzaRiga) && altezzaRiga > 0) {
        const righeContenuto = Math.round(nodo.scrollHeight / altezzaRiga)
        const righeVisibili = Math.round(nodo.clientHeight / altezzaRiga)
        setPazTroncato(righeContenuto > righeVisibili)
      } else {
        setPazTroncato(nodo.scrollHeight > nodo.clientHeight + 1)
      }
    }
    misura()
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(misura)
    }
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(misura)
      ro.observe(nodo)
    }
    return () => {
      vivo = false
      ro?.disconnect()
    }
  }, [lavoro?.paziente, lavoro?.pazienteAlias, dentDueRighe])

  function pulisciTimer() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  function handlePointerDown(evento: ReactPointerEvent<HTMLButtonElement>) {
    smontaRecupero.current?.()
    ultimoPointer.current = evento.pointerType
    inizio.current = { x: evento.clientX, y: evento.clientY }
    ultimaPosizione.current = { x: evento.clientX, y: evento.clientY }
    tsInizio.current = performance.now()
    scrollBase.current = typeof window !== 'undefined' ? window.scrollY : 0
    spostato.current = false
    pressioneLunga.current = false
    sollevata.current = false
    tapGestito.current = false
    // Il timer parte se il chiamante vuole il gesto — via drag (`onSollevata`) o via sheet
    // long-press legacy (`onLongPressSheet`). Senza nessuna delle due, ogni rilascio fermo ricade
    // sul tap, qualunque sia la durata della pressione (nessuna azione persa).
    if (onSollevata || onLongPressSheet) {
      timer.current = setTimeout(() => {
        if (!inizio.current || spostato.current || sollevata.current) return
        if (onSollevata) {
          // SOLLEVAMENTO (touch e mouse fermo): il gesto passa all'hook. Da qui Cassetta tace.
          sollevata.current = true
          onSollevata(evento)
        } else {
          // Percorso legacy (nessun drag offerto): l'hold apre lo sheet al rilascio, come prima.
          pressioneLunga.current = true
        }
      }, SOGLIA_LONG_PRESS_MS)
    }
  }

  function handlePointerMove(evento: ReactPointerEvent<HTMLButtonElement>) {
    // P9-bis: la posizione si aggiorna SEMPRE, anche dopo `spostato` — al pointercancel serve la
    // distanza totale reale, non quella congelata alla soglia degli 8px.
    ultimaPosizione.current = { x: evento.clientX, y: evento.clientY }
    // INVARIANTE (panel §3): dopo il sollevamento Cassetta non insegue più nulla — è l'hook, sui
    // suoi listener di `window`, a leggere ogni movimento. Questo `return` è ciò che il test che
    // VIETA presidia: senza, il ramo mouse rifarebbe `onSollevata` a ogni frame.
    if (sollevata.current || spostato.current) return
    if (!inizio.current) return
    const dx = evento.clientX - inizio.current.x
    const dy = evento.clientY - inizio.current.y
    if (Math.hypot(dx, dy) > SOGLIA_MOVIMENTO_PX) {
      const puntatore = evento.pointerType
      if (onSollevata && (puntatore === 'mouse' || puntatore === 'pen')) {
        // Mouse/pen: il drag si arma SUBITO al superamento della soglia, senza attendere i 300ms
        // (§2.4.1 ricerca — su questi puntatori non esiste il conflitto con lo scroll).
        sollevata.current = true
        pulisciTimer()
        onSollevata(evento)
        return
      }
      // Touch (o nessun drag offerto): lo spostamento oltre soglia ANNULLA l'hold — su touch è lo
      // scroll che ha vinto (§2.2), mai un sollevamento a metà swipe. Niente tap né sheet.
      spostato.current = true
      pulisciTimer()
    }
  }

  function handlePointerUp() {
    // Dopo il sollevamento il rilascio è dell'hook (sheet se fermo, drop se mosso): Cassetta non
    // fa nulla — ma NON azzera `sollevata`, che serve a `onClick` per ingoiare il click sintetico.
    if (sollevata.current) {
      inizio.current = null
      return
    }
    // Guardia (review Task 10, Important): senza un pointerdown corrispondente su QUESTO
    // elemento, `spostato`/`pressioneLunga` sono nel loro stato di riposo (azzerati solo al
    // pointerdown, mai al pointerup) — un pointerup "orfano" (down su un'altra cassetta o sullo
    // sfondo, rilascio qui: raggiungibile con mouse/penna, dove NON c'è pointer capture implicita
    // come su touch) troverebbe `spostato=false` e chiamerebbe `onTap()` per un gesto mai iniziato
    // su questo bottone. `inizio.current` è `null` finché non arriva un pointerdown genuino.
    if (!inizio.current) return
    pulisciTimer()
    if (!spostato.current) {
      if (pressioneLunga.current) {
        onLongPressSheet?.()
        tapGestito.current = true
      } else {
        // L'azione primaria si esegue qui (tap pointer genuino) E si marca gestita, così il click
        // sintetico che il browser emette subito dopo viene ingoiato da `handleClick`.
        onTap()
        tapGestito.current = true
      }
    }
    inizio.current = null
  }

  function handleClick() {
    // Difetto a11y n.2 (Task 13): il doppio-tap di VoiceOver/TalkBack emette un `click` puro,
    // senza sequenza pointer. Se la tastiera ha già servito l'azione (`tapGestito`), o se il
    // gesto è finito in sollevamento (`sollevata`), il click è solo la coda sintetica e va
    // ingoiato. Altrimenti è un'attivazione AT pura → onTap.
    if (sollevata.current) {
      spostato.current = false
      sollevata.current = false
      return
    }
    // P9 (collaudo device 22/07): il ramo `spostato` ingoia SOLO i puntatori che emettono click
    // dopo un trascinamento (mouse/pen). Su TOUCH il browser non emette click dopo uno scroll: se
    // il click arriva, il gesto era un tap dentro lo slop di sistema — è il tap Android che il
    // collaudo device ha trovato perso. `spostato` si azzera in ogni caso.
    if (spostato.current) {
      const eraTouch = ultimoPointer.current === 'touch'
      spostato.current = false
      if (!eraTouch) return
      onTap()
      return
    }
    if (tapGestito.current) {
      tapGestito.current = false
      return
    }
    onTap()
  }

  function handlePointerCancel() {
    // Anche un drag nativo (draggable=true) che prende il sopravvento cancella qui: nessuna
    // azione fantasma al termine di un gesto interrotto.
    const eraSollevata = sollevata.current
    const partenza = inizio.current
    const ultima = ultimaPosizione.current
    pulisciTimer()
    inizio.current = null
    spostato.current = false
    sollevata.current = false
    // P9-bis: recupero del tap ingoiato dal micro-pan. Solo touch, solo gesti NON passati al
    // drag, solo dentro la busta spaziale. La conferma arriva dal touchend: se al rilascio il
    // gesto è durato poco E la pagina non è scrollata davvero, il pan era jitter — è un tap.
    if (ultimoPointer.current !== 'touch' || eraSollevata || !partenza || !ultima) return
    if (Math.hypot(ultima.x - partenza.x, ultima.y - partenza.y) > SOGLIA_RECUPERO_TAP_PX) return
    const t0 = tsInizio.current
    const scroll0 = scrollBase.current
    const smonta = () => {
      window.removeEventListener('touchend', suRilascio)
      window.removeEventListener('touchmove', suMovimento)
      if (scadenza) clearTimeout(scadenza)
      smontaRecupero.current = null
    }
    const suMovimento = (te: TouchEvent) => {
      const dito = te.touches[0]
      if (!dito) return
      if (Math.hypot(dito.clientX - partenza.x, dito.clientY - partenza.y) > SOGLIA_RECUPERO_TAP_PX) smonta()
    }
    const suRilascio = (te: TouchEvent) => {
      smonta()
      if (te.touches.length > 0) return
      const durata = performance.now() - t0
      const scrollato = Math.abs(window.scrollY - scroll0)
      if (durata <= SOGLIA_RECUPERO_TAP_MS && scrollato <= SOGLIA_RECUPERO_SCROLL_PX) onTap()
    }
    window.addEventListener('touchend', suRilascio, { passive: true })
    window.addEventListener('touchmove', suMovimento, { passive: true })
    const scadenza = setTimeout(smonta, SOGLIA_RECUPERO_TAP_MS + 200)
    smontaRecupero.current = smonta
  }

  function handleKeyDown(evento: ReactKeyboardEvent<HTMLButtonElement>) {
    // Tastiera: Invio/Spazio = SEMPRE azione primaria. Il long-press non ha un equivalente da
    // tastiera (niente pointerdown/up da qui) — chi naviga a tastiera arriva sempre al tap.
    // `tapGestito` ingoia il click che il button nativo emette dopo Invio/Spazio (no doppione).
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault()
      tapGestito.current = true
      onTap()
    }
  }

  const occupata = !!lavoro
  const scura = targaScura(colore)
  const classeColoreStandard = SLUG_STANDARD.has(colore) ? colore : undefined
  const backgroundCustom = classeColoreStandard ? undefined : derivaFacciaCustom(colore)
  // Collaudo R1 (P11c rev, ratifica 22/07 sera): SOLO il custom (hex) può essere "nero" — gli slug
  // standard sono le 6 facce fisse del mockup, mai quasi-nere.
  const nera = !classeColoreStandard && facciaScura(colore)

  // Task 10 (D4) — «parlato» del paziente: l'alias (Task 1) vince sul codice, Title Case solo
  // sull'alias (mai sul codice, verbatim §6). MAI il numero lavoro né la descrizione/tipo: la
  // targa dice solo chi e per chi, il dettaglio si apre nella cassetta (verbale §6/§9).
  const pazienteReso = lavoro
    ? lavoro.pazienteAlias
      ? titleCase(lavoro.pazienteAlias)
      : (lavoro.paziente ?? '—')
    : ''

  // H2 (0c37f25) — la guardia FIX-L della cavità («oggi tarata su padding-top 66/cavità 18..64;
  // la nuova è 8..74 + fascia in flusso») è SOSTITUITA dalla fascia ad altezza fissa (72px, v.
  // `.ds-cassetta-fascia` in ds-v3.css): non c'è più un caso "a rischio" da coprire con una
  // seconda soglia (`is-nome-lungo`/142) — la fascia riserva SEMPRE lo spazio del caso peggiore,
  // piena o vuota, nomi corti o estremi. Misure reali (real-render Playwright, matrice
  // corto/medio/lungo/estremo × occupata/libera) in `.superpowers/sdd/h2-impl-report.md`.

  const classi = [
    'ds-cassetta',
    classeColoreStandard,
    occupata ? undefined : 'is-libera',
    scura ? 'is-chiara' : undefined,
    nera ? 'is-nera' : undefined,
    stato === 'accesa' ? 'is-accesa' : undefined,
    draggable ? 'is-draggable' : undefined,
  ]
    .filter(Boolean)
    .join(' ')

  const etichetta = lavoro
    ? `Cassetta ${nome}, occupata: ${lavoro.dentista}, paziente ${pazienteReso}`
    : `Cassetta ${nome}, libera`

  return (
    <>
      {/* Anello focus-visible di legge (constraint 9): questo componente lo porta con sé, come
          gli altri ds (v. CardLavoro/TastoTondo). */}
      <style>{`
        .ds-cassetta:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: 2px;
        }
      `}</style>
      <button
        type="button"
        data-cassetta-id={id}
        className={classi}
        style={{
          background: backgroundCustom,
          // Mockup riga 69: `transition: opacity 200ms` — SOLO opacity, non uno shorthand `all`
          // (che animerebbe anche l'anello di `accesa` e il background custom). `cssEase.generico`
          // resta la fonte del tempo/easing (v3/motion.ts §8.1) — NIENTE duration/ease inventati,
          // solo la proprietà è esplicita (review M2).
          transition: `opacity ${cssEase.generico}`,
        }}
        // HTML `draggable` inchiodato a false (§2.2 ricerca): neutralizza il DnD nativo che, avviato
        // dal long-press di sistema iOS o dal drag desktop, emetterebbe `pointercancel` sul nodo e
        // ucciderebbe il gesto. La prop `draggable` resta solo l'affordance visiva (classe cursor).
        draggable={false}
        aria-label={etichetta}
        aria-current={stato === 'accesa' ? 'true' : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* D1 — gancetto G2 (mockup 2026-07-24-rete-gancetto-targa.html rev.3, verbale
            docs/design/decisions/2026-07-24-rete-gancetto-targa.md §4): gancio metallico legato
            alla linguetta `::before` (INVARIATA, spec mockup — "interno = produzione"), che
            scavalca il filo del muro. SVG inline come le miniature (mai <img>: riattiverebbe il
            DnD nativo neutralizzato a `draggable={false}` sotto). Nessun filo proprio (rev.3: la
            meccanica «il gancetto porta il filo» è BOCCIATA — al drag il muro resta fermo, si
            stacca solo la cassetta). */}
        <svg
          className={`ds-gancetto${staccata ? ' is-staccato' : ''}`}
          aria-hidden="true"
          viewBox="0 0 28 22"
        >
          <defs>
            <linearGradient id={idMetalloGancetto} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--gan-metal-hi)" />
              <stop offset=".5" stopColor="var(--gan-metal-mid)" />
              <stop offset="1" stopColor="var(--gan-metal-lo)" />
            </linearGradient>
          </defs>
          <path
            d="M12 16 L12 6 C12 2 18 2 18 6.5 L18 9.5"
            fill="none"
            stroke={`url(#${idMetalloGancetto})`}
            strokeWidth={3.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="ds-cassetta-cavita">
          {/* H2 (0c37f25) — finestra 8..48 (era 8..74, opzione B: si restringe permanentemente
              per fare spazio alla fascia fissa): la miniatura scala a ~58% dell'altezza della
              cavità (40px × 0.58 ≈ 23px, verbatim mockup H2 `.fin svg{height:58%}`), invariata
              nel resto (SVG inline, mai <img>). */}
          {lavoro && <MiniaturaLavoro id={miniaturaPerLavoro(lavoro.descrizione, lavoro.tipoDispositivo)} height={23} />}
        </span>
        {/* FIX-L — «fascia etichetta»: targa+cont vivono dentro questo unico contenitore,
            identico per libere e occupate (struttura uniforme, ratifica G10). La targa dentro
            NON perde il segnale di stato (anello/piena — gate Task 10 invariato, v. CSS).
            H2 (0c37f25) — niente più calcolo `is-shrink`/`SOGLIA_NOME_LUNGO` qui: dent e paz
            portano SEMPRE lo stesso trattamento, qualunque sia la lunghezza del testo (il CSS
            in ds-v3.css fa tutto il lavoro — wrap+clamp per il dent, nowrap+sfumatura per il
            paz). */}
        <span className="ds-cassetta-fascia">
          <span className="ds-cassetta-targa">{nome}</span>
          <span className="ds-cassetta-cont">
            {lavoro ? (
              <>
                <span
                  ref={dentRef}
                  className={`ds-cassetta-dent${dentDueRighe ? ' is-due-righe' : ''}${dentTroncato ? ' is-troncato' : ''}`}
                >
                  {lavoro.dentista}
                </span>
                <span ref={pazRef} className={`ds-cassetta-paz${pazTroncato ? ' is-troncato' : ''}`}>
                  {pazienteReso}
                </span>
              </>
            ) : (
              'libera'
            )}
          </span>
        </span>
      </button>
    </>
  )
}
