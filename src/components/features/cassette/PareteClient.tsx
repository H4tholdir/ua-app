'use client'

// Task 11 — PareteClient: la prima superficie utente della Parete (§5 spec
// 2026-07-21-parete-cassette-design.md). Fonte visiva: mockup ratificato
// `docs/design/mockups/2026-07-20-parete-cassette-v2.html` (blocchi 1 e 2). Il CSS della
// pillola di ricerca, della parete e della tile «+ Nuova cassetta» vive in
// `src/app/ds-v3.css` (`.ds-parete*`, `.ds-tray-nuova`): porta rami dark e media query, che
// uno style-object non sa esprimere.
//
// La parete arriva GIÀ ordinata da `deriveParete` (`posizione, created_at, id`): qui non si
// riordina nulla — l'ordine è la mappa mentale del muro fisico.
//
// Ricerca «filtra e risali» (ratifica 22/07, spec redesign §2.4 — sostituisce la vecchia
// ricerca «che accende» del §5.1): con ricerca attiva le non-match si SMONTANO (secco, niente
// `AnimatePresence`) e le match risalgono in testa nell'ordine relativo della parete. Lo stato
// `'spenta'` è morto — muore dal tipo `Cassetta` e dal CSS, non resta zombie. L'input resta
// controllato ISTANTANEO (`query`); il filtro/riordino segue a `DEBOUNCE_FILTRO_MS` di debounce
// (riserva FE R4 — un FLIP per keystroke su 30 celle è il punto esatto dove peggiora WebKit).
// Il colore non è mai l'unica fonte di stato: la cassetta accesa porta `aria-current` (§5.35)
// e l'esito della ricerca è DETTO in parole nella riga quieta `role="status"` sopra la parete,
// che è insieme il testo visibile e l'annuncio per lo screen reader (una sola live region,
// montata sempre: una regione che nasce insieme al suo testo non viene annunciata). Durante la
// ricerca il drag non convive con essa: il long-press segnala il blocco con un hint invece di
// aprire lo sheet in silenzio (riserva UX 1).
//
// Intento sheet (risoluzione C1 dell'ondata): questo componente tiene lo stato dell'intento —
// cassetta libera (tap), long-press su QUALSIASI cassetta, tile «+», CTA del Vuoto. Il Task 12
// ci ha montato sopra i due corpi (`NuovaCassettaSheet`, `CassettaSheet`) e ha chiuso il cerchio:
// `setSheet(null)` parte da OGNI via d'uscita — chiusura dello sheet (scrim/swipe/Esc/«Chiudi»,
// che il `Sheet` ds instrada tutte su `onChiudi`) e successo dell'azione (`onCreata`/`onCambiata`,
// che chiudono e rileggono la parete). Di conseguenza `aria-expanded` della tile «+» — derivato
// da `sheet?.tipo === 'nuova'` — torna a `false` da sé alla chiusura.
//
// Dati che vivono QUI e non nei due sheet: `prossimoNome` (max della serie C sui nomi vivi),
// `libere`, e l'ORDINE COMPLETO del muro per il riordino ▲▼ — la parete arriva già ordinata da
// `deriveParete`, qui si ricalcola l'array spostando di una posizione e si POSTa la lista intera.
// Per questo `CassettaSheet` riceve un callback `onSposta(direzione)` invece dell'ordine: i ▲▼ si
// rendono là, la lista si compone qui (unico posto che possiede `parete`).
//
// Riflesso ottimistico (review FIX-E, Important — v. commento su `pareteVista` più sotto):
// `onCreata` (creazione) e `onCambiata` (rinomina/colore) NON sono più lo stesso `dopoCambio` —
// la creazione porta con sé la cassetta nuova (corpo 201 della RPC) e diventa `dopoCreata`, che
// alimenta `extra`; rinomina/colore portano il valore SOTTOMESSO (non una rilettura server) e
// alimentano `overrides`. Il ▲▼ (`riordina`) alimenta `ordineManuale`, con lo stesso contratto
// ottimistico del drop del drag (`useDragRiordino`): si applica SUBITO, resta se la POST riesce,
// si annulla se fallisce. Tutti e tre vivono SOLO qui, mai nei sheet: quelli restano stateless
// sul "cosa è successo", non sul "cosa mostrare ora".
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import { MotionConfig, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Cassetta } from '@/components/ds/Cassetta'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { tornaIndietro } from '@/lib/nav/torna-indietro'
import { Vuoto } from '@/components/ds/Vuoto'
import { spazio, tipografia } from '@/design-system/v3/tokens'
import { molla, trascinamento } from '@/design-system/v3/motion'
import { vibra } from '@/design-system/v3/haptic'
import { initSuoni } from '@/design-system/v3/sound'
import { filtraCassette } from './filtra-cassette'
import { NuovaCassettaSheet } from './NuovaCassettaSheet'
import { CassettaSheet } from './CassettaSheet'
import { useDragRiordino } from './useDragRiordino'
import { svuotaRicerca } from '@/lib/ui/svuota-ricerca'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

/** L'intento di apertura di uno sheet: il Task 12 ci monta sopra i due corpi. */
type IntentoSheet = { tipo: 'nuova' } | { tipo: 'cassetta'; id: string } | null

// Ratifica 22/07 (spec redesign §2.4) — «filtra e risali»: il filtro/riordino della parete segue
// la query con questo ritardo (l'input resta istantaneo, solo il FLIP delle celle è debounced).
// Esportata (FIX-F, D9b): `CassettaSheet` (la lista «Metti un lavoro») riusa la STESSA costante —
// stesso gemello, stesso ritardo, nessun numero magico duplicato.
export const DEBOUNCE_FILTRO_MS = 180
// Durata dell'hint «Svuota la ricerca…» quando il long-press cade durante una ricerca attiva
// (il drag non convive con la ricerca — riserva UX 1).
const HINT_DRAG_BLOCCATO_MS = 2500

/** Il prossimo nome della serie «C» sui nomi VIVI della parete (§5.2): `C1`, `C2`, … → il
 *  prossimo. I nomi fuori serie («Banco Ciro») non partecipano al calcolo. Case-insensitive
 *  (review finale): l'indice unico DB è su `lower(btrim(nome))`, quindi anche «c12» conta —
 *  ignorarla suggerirebbe un nome che sbatte su 409. */
function prossimoNomeSerieC(parete: CassettaParete[]): string {
  let massimo = 0
  for (const c of parete) {
    const trovato = /^C(\d+)$/i.exec(c.nome)
    if (trovato) massimo = Math.max(massimo, Number(trovato[1]))
  }
  return `C${massimo + 1}`
}

export function PareteClient(props: {
  parete: CassettaParete[]
  /** Scroller del gesto di riordino (riserva ARCH R1, pre-embed home): assente → window,
   *  comportamento IDENTICO a oggi su /cassette. Pass-through puro verso `useDragRiordino`. */
  scrollerRef?: RefObject<HTMLElement | null>
  /** QA device metà ondata (T15, addendum 24/07) — il chrome di pagina («‹ Indietro», titolo,
   *  «☰ Tutto il resto») ora rende SEMPRE: la D2 originale (`contesto='stanza'`, header
   *  spento quando la parete viveva embeddata nella home) è SUPERATA — Francesco: lo swipe non
   *  porta più a una stanza ridotta ma alla pagina /cassette VERA, assetto completo, anche
   *  quando vive dentro il pannello destro del pager (`StanzePager.tsx`). Il prop `contesto`
   *  è morto con questa decisione: non c'è più nessuna variante senza header da scegliere. */
  /** Override del back dell'header (default: `tornaIndietro`, la direttiva permanente
   *  «back = pagina precedente»). Chi monta questa parete DENTRO il pannello del pager
   *  (`StanzePager.tsx`) passa qui un callback che torna alla stanza Pile invece di fare
   *  `router.back()` — che lascerebbe la home per una pagina precedente arbitraria, non per le
   *  pile. Assente → comportamento invariato di `/cassette` standalone. */
  onIndietro?: () => void
  /** Se `false` la parete NON è quella che l'utente sta guardando — il refresh su
   *  focus/visibilitychange resta sospeso (riserva ARCH R2, v. `attivoRef` sotto). Default
   *  `true` (comportamento di `/cassette` invariato: sempre in primo piano). */
  attivo?: boolean
  /** QA device T15 (addendum 24/07, scoperto in verifica browser reale — v. report FIX-A) —
   *  mentre l'indirizzo è stato spinto a `/cassette` da dentro il pannello
   *  (`sincronizzaUrlStanza`, `StanzePager.tsx`), Next.js intercetta il `pushState` nudo e
   *  aggiorna il proprio `canonicalUrl` a `/cassette` (è il meccanismo shallow VOLUTO,
   *  verificato leggendo `app-router.js`), ma questo significa che QUALUNQUE `router.refresh()`
   *  chiamato mentre l'albero montato è ancora quello di `/dashboard` rifà il fetch della ROTTA
   *  VERA `/cassette` sul server e SOSTITUISCE il pager con la pagina standalone — uno scambio
   *  silenzioso, verificato in browser (`window.dispatchEvent(new Event('focus'))` dopo lo
   *  swipe → il DOM del pager spariva).
   *  QA device (verbale 25/07, fix-list D5b/D8) — CORREZIONE: prima questo gate copriva SOLO il
   *  refresh silenzioso su focus/visibilitychange; le altre chiamate a `router.refresh()` qui
   *  sotto (`dopoCambio`, `riordina`, il drop del drag) restavano fuori — era annotata come
   *  «limitazione nota», ma è proprio quello smontaggio silenzioso del pager (D5, «si sistema
   *  da solo») a distruggere i listener `popstate`/`urlPushataRef` del pager e a rendere il
   *  primo back successivo incoerente (D8). Il gate ora si estende a TUTTE e tre: in embedded si
   *  tiene lo stato ottimistico già in pagina — la rilettura vera arriva al prossimo
   *  caricamento reale della route (v. `rileggiParete` sotto). Sulla route standalone
   *  `sospendiRefresh` resta di default `false`: comportamento INVARIATO. */
  sospendiRefresh?: boolean
}) {
  const { parete, attivo = true, onIndietro, sospendiRefresh = false } = props
  const router = useRouter()
  // QA device T15.1 (verbale 2026-07-24, fix-list punto 1) — CAUSA TROVATA (v. report FIX-C):
  // `initSuoni()` (sound.ts) registra l'unlock dell'`AudioContext` una tantum al primo
  // touchend/click del documento (policy iOS §9), ma prima di questo fix l'unica chiamata a
  // `initSuoni()` in tutto il repo viveva in `ds-v3-catalogo/page.tsx` — un artefatto del
  // catalogo demo, MAI raggiunto navigando l'app vera. Risultato: su ogni superficie reale
  // `sbloccato` restava `false` per sempre, `ctx` non veniva mai creato e `suona()` usciva
  // subito (v. sound.ts) — stacco/riaggancio (e in realtà OGNI suono v3, tap incluso) restavano
  // muti fuori dal catalogo. Questa è la superficie con la parete VERA (drag incluso, via
  // `useDragRiordino`), montata in ogni percorso home/pannello (pager, «solo parete», /cassette
  // standalone): registrare qui copre tutti e tre. `initSuoni()` è di per sé idempotente
  // (`initFatto`) e non riproduce nulla da sola — solo REGISTRA i listener, il suono parte al
  // primo gesto reale dell'utente (mai autoplay).
  useEffect(() => {
    initSuoni()
  }, [])
  // Refresh gated (riserva ARCH R2): mai rifare l'intera dashboard mentre l'utente sta sulle
  // pile e la stanza Parete è solo un peek morto fuori schermo. `attivoRef` (non `attivo`
  // direttamente) per non ri-registrare i listener di focus/visibilitychange a ogni cambio di
  // stanza — l'effect sotto dipende solo da `router`, come prima del Task 12.
  const attivoRef = useRef(attivo)
  useEffect(() => {
    attivoRef.current = attivo
  })
  // QA device T15 — stesso pattern di `attivoRef` sopra: un ref, non `sospendiRefresh` diretto,
  // per non ri-registrare il listener a ogni cambio (v. commento sulla prop).
  const sospendiRefreshRef = useRef(sospendiRefresh)
  useEffect(() => {
    sospendiRefreshRef.current = sospendiRefresh
  })
  // Riflesso ottimistico in embedded (review FIX-E, Important) — `parete` è un prop SERVER, mai
  // mutato: E4 (D5b/D8) gated OGNI `router.refresh()` del percorso parete per non far sparire il
  // pager sotto un refresh silenzioso, ma questo lasciava TRE percorsi di mutazione senza alcun
  // riflesso finché non arrivava un vero caricamento della route — creazione, rinomina/colore, ▲▼
  // restavano stantii in embedded. Overlay MINIMO sopra il prop, non un secondo stato di verità:
  // `overrides` (patch nome/colore per id), `extra` (cassette create non ancora nel prop) e
  // `ordineManuale` (▲▼ ottimistico, stesso ruolo di `ordineIds` nel drag — v. `useDragRiordino`).
  // Reset in render-phase quando l'IDENTITÀ del prop cambia (pattern di `pareteRif` nell'hook del
  // drag): è il MOMENTO in cui arriva un dato vero dal server (standalone dopo il refresh, o
  // embedded al prossimo mount reale della route) — il server vince SEMPRE, l'overlay non deve mai
  // combattere un dato fresco.
  const [pareteBase, setPareteBase] = useState(parete)
  const [extra, setExtra] = useState<CassettaParete[]>([])
  const [overrides, setOverrides] = useState<Record<string, { nome?: string; colore?: string }>>({})
  const [ordineManuale, setOrdineManuale] = useState<string[] | null>(null)
  if (pareteBase !== parete) {
    setPareteBase(parete)
    setExtra([])
    setOverrides({})
    setOrdineManuale(null)
  }

  // La parete "vista": prop + overlay, nell'ordine giusto. `ordineManuale` (quando presente)
  // comanda l'ordine; le cassette non elencate in esso (una `extra` appena creata dopo un ▲▼, per
  // esempio) restano in coda — non spariscono mai dalla vista. Questo È l'unico posto che compone
  // l'overlay: ogni calcolo a valle (ricerca, riordino, sheet, drag) lavora su questo derivato, mai
  // sul prop nudo — così ▲▼ e ricerca restano coerenti fra loro (niente doppia fonte di ordine).
  const pareteVista = useMemo(() => {
    const conPatch = parete.map((c) => {
      const patch = overrides[c.id]
      return patch ? { ...c, ...patch } : c
    })
    const base = extra.length ? [...conPatch, ...extra] : conPatch
    if (!ordineManuale) return base
    const perIdBase = new Map(base.map((c) => [c.id, c]))
    const ordinata = ordineManuale.map((id) => perIdBase.get(id)).filter((c): c is CassettaParete => !!c)
    const idsOrdinati = new Set(ordineManuale)
    const fuoriOrdine = base.filter((c) => !idsOrdinati.has(c.id))
    return [...ordinata, ...fuoriOrdine]
  }, [parete, overrides, extra, ordineManuale])

  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<IntentoSheet>(null)
  const inputCerca = useRef<HTMLInputElement>(null)

  // Debounce del filtro (riserva FE R4): l'input resta controllato ISTANTANEO (`query`), il
  // riordino/smontaggio segue a `DEBOUNCE_FILTRO_MS` — un FLIP per keystroke su 30 celle è il
  // punto esatto dove si peggiora WebKit.
  const [queryFiltro, setQueryFiltro] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setQueryFiltro(query), DEBOUNCE_FILTRO_MS)
    return () => clearTimeout(t)
  }, [query])

  // La «×» di pulizia segue la query ISTANTANEA (affordance dell'input, non del filtro): deve
  // apparire subito mentre si digita, senza attendere il debounce.
  const digitando = query.trim().length > 0

  // «Filtro attivo» si decide dal `trim()` della query DEBOUNCED, MAI dalla dimensione del Set:
  // zero match e nessuna ricerca danno entrambi un Set vuoto, ma sono due pareti opposte (tutte
  // fuori dalla vista vs tutte normali).
  const cercato = queryFiltro.trim()
  const attiva = cercato.length > 0
  const accesi = useMemo(() => filtraCassette(pareteVista, queryFiltro), [pareteVista, queryFiltro])

  // «Filtra e risali» (ratifica 22/07): le match risalgono in testa nell'ordine relativo di
  // parete, le altre NON si rendono. A riposo (ricerca spenta) l'ordine è quello del muro.
  // `pareteVista` (non il prop nudo): l'overlay ottimistico (create/rinomina/colore/▲▼, v. sopra)
  // partecipa alla ricerca e all'ordine esattamente come farebbe un dato vero del server.
  const visibili = useMemo(
    () => (attiva ? pareteVista.filter((c) => accesi.has(c.id)) : pareteVista),
    [attiva, pareteVista, accesi],
  )

  // QA device (verbale 25/07, fix-list D5b/D8) — `rileggiParete()`: il punto che chiama
  // `router.refresh()` per le TRE azioni esplicite sotto (`dopoCambio`, `riordina`, il drop del
  // drag) — prima non erano gated, solo il refresh silenzioso qui sotto lo era (v. commento
  // sulla prop `sospendiRefresh`). Non usata nell'effect qui sotto: quello resta con la
  // guardia inline com'era (`sospendiRefreshRef.current` letto direttamente), per non aggiungere
  // `rileggiParete` — una funzione ricreata a ogni render, non uno `useCallback` — alle
  // dipendenze dell'effect (la ri-registrerebbe a ogni render, gate `react-hooks/exhaustive-deps`
  // di questo repo).
  function rileggiParete() {
    if (!sospendiRefreshRef.current) router.refresh()
  }

  // §5.5 Freschezza — senza realtime, la parete non deve mentire a chi la guarda da un'ora:
  // si rilegge quando la pagina torna in primo piano (ritorno da /lavori/[id], app riaperta).
  // `!sospendiRefreshRef.current` (QA device T15, v. commento sulla prop): questo refresh è
  // SILENZIOSO, senza alcun gesto dell'utente — il solo che va sospeso mentre l'indirizzo è
  // stato spinto a `/cassette` dal pannello, per non far sparire il pager sotto un focus/tab-switch.
  useEffect(() => {
    const rileggi = () => {
      if (document.visibilityState === 'visible' && attivoRef.current && !sospendiRefreshRef.current) router.refresh()
    }
    document.addEventListener('visibilitychange', rileggi)
    window.addEventListener('focus', rileggi)
    return () => {
      document.removeEventListener('visibilitychange', rileggi)
      window.removeEventListener('focus', rileggi)
    }
  }, [router])

  const prossimoNome = useMemo(() => prossimoNomeSerieC(pareteVista), [pareteVista])
  const libere = useMemo(() => pareteVista.filter((c) => !c.lavoro), [pareteVista])

  // La cassetta dello sheet si RISOLVE dalla parete corrente, non si copia nell'intento: dopo un
  // `router.refresh()` un id sparito (cassetta buttata via altrove) dà `null` e lo sheet non si
  // monta vuoto — `aperto` lo segue.
  const cassettaAperta = sheet?.tipo === 'cassetta' ? (pareteVista.find((c) => c.id === sheet.id) ?? null) : null
  const postoAperta = cassettaAperta ? pareteVista.findIndex((c) => c.id === cassettaAperta.id) + 1 : 0

  function chiudiSheet() {
    setSheet(null)
  }

  // Successo di un'azione = chiudi E rileggi: la parete è la fonte di verità, mai lo stato
  // locale — ECCETTO in embedded (`sospendiRefresh`, v. `rileggiParete` sopra), dove si tiene lo
  // stato ottimistico invece di far sparire il pager sotto una lettura server silenziosa.
  //
  // Review FIX-E, Important — `patch` è ciò che rinomina/colore hanno GIÀ in mano (il valore
  // SOTTOMESSO, non una rilettura dal server: `CassettaSheet` lo sa perché è lui che l'ha appena
  // spedito nella PATCH riuscita). Applicato SOLO qui, mai nei rami di errore di `CassettaSheet` —
  // un fallimento non chiama mai `onCambiata`, quindi l'overlay non si applica mai su un dato che
  // il server ha rifiutato. Il merge (non la sostituzione) sull'override esistente tiene un
  // rinomina e una ricolorazione fatte in sequenza sulla stessa cassetta senza perdersi a vicenda.
  function dopoCambio(patch?: { id: string; nome?: string; colore?: string }) {
    if (patch) {
      setOverrides((prev) => ({
        ...prev,
        [patch.id]: {
          ...prev[patch.id],
          ...(patch.nome !== undefined ? { nome: patch.nome } : {}),
          ...(patch.colore !== undefined ? { colore: patch.colore } : {}),
        },
      }))
    }
    setSheet(null)
    rileggiParete()
  }

  // Review FIX-E, Important — la creazione riuscita arriva da `NuovaCassettaSheet` col corpo 201
  // della RPC (`{id, nome, colore, posizione}`, v. `POST /api/cassette`). Guardia sui campi
  // (stringhe non vuote): un corpo malformato/inatteso non deve montare una `Cassetta` con prop
  // `undefined` — meglio nessun riflesso ottimistico che uno rotto; il refresh (standalone) o il
  // prossimo caricamento vero (embedded) restano la rete di sicurezza.
  function dopoCreata(cassetta?: { id?: string; nome?: string; colore?: string; posizione?: number }) {
    if (cassetta && typeof cassetta.id === 'string' && cassetta.id && typeof cassetta.nome === 'string' && typeof cassetta.colore === 'string') {
      const nuova: CassettaParete = {
        id: cassetta.id,
        nome: cassetta.nome,
        colore: cassetta.colore,
        posizione: cassetta.posizione ?? pareteVista.length,
        lavoro: null,
      }
      setExtra((prev) => [...prev, nuova])
    }
    setSheet(null)
    rileggiParete()
  }

  /** Persistenza condivisa dell'ordine (una sola verità sul muro): POSTa la lista COMPLETA degli id
   *  e torna `true` SOLO su 200. La usano SIA i ▲▼ dello sheet SIA il drop del drag — è la
   *  meccanica riusata (non il calcolo dello spostamento, che è diverso: swap adiacente per i ▲▼,
   *  arrayMove arbitrario per il drag). Nessun `router.refresh()` qui dentro: chi chiama decide
   *  quando rileggere (i ▲▼ subito, il drag SOLO dopo un drop riuscito — mai pre-drag, §8.2). */
  async function inviaOrdine(ordine: string[]): Promise<boolean> {
    try {
      const res = await fetch('/api/cassette/riordino', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordine }),
      })
      return res.status === 200
    } catch {
      return false
    }
  }

  /** Riordino ▲▼ (§5.4): swap di UNA posizione. Torna `true` SOLO se il muro si è mosso davvero:
   *  è l'esito su cui lo sheet decide se annunciare «spostata al posto n».
   *
   *  Review FIX-E, Important — `ordineManuale` si imposta OTTIMISTICAMENTE prima di attendere la
   *  POST (mirror del contratto del drag, `useDragRiordino`: lì `ordineIds` si imposta al lift,
   *  qui al click ▲▼): il muro si sposta subito, la conferma del server arriva dopo. Fallita la
   *  POST → rollback immediato (`setOrdineManuale(null)`, stessa mossa del drop fallito del drag).
   *  Riuscita → resta (non lo si azzera qui): sparisce da solo quando arriva un `parete` vero
   *  (standalone dopo il refresh; embedded al prossimo caricamento reale, v. `pareteBase` sopra).
   *  Il refresh gira comunque, anche quando la POST fallisce — in standalone la parete torna a
   *  dire la verità del server (ECCETTO in embedded, `rileggiParete` sopra, dove il rollback ottico
   *  è l'unica correzione finché non arriva un caricamento vero). */
  async function riordina(id: string, direzione: 'su' | 'giu'): Promise<boolean> {
    const indice = pareteVista.findIndex((c) => c.id === id)
    if (indice < 0) return false
    const destinazione = direzione === 'su' ? indice - 1 : indice + 1
    if (destinazione < 0 || destinazione >= pareteVista.length) return false
    const ordine = pareteVista.map((c) => c.id)
    ordine[indice] = pareteVista[destinazione].id
    ordine[destinazione] = pareteVista[indice].id
    setOrdineManuale(ordine)
    const ok = await inviaOrdine(ordine)
    if (!ok) setOrdineManuale(null)
    rileggiParete()
    return ok
  }

  // Riga conteggio (§2.4): conta le VISIBILI (= i match), non il Set — sono la stessa cosa a
  // ricerca attiva, ma `visibili` è la fonte di verità di cosa è davvero in pagina.
  const annuncio = !attiva
    ? ''
    : visibili.length === 0
      ? `Niente per “${cercato}” — prova con meno lettere`
      : visibili.length === 1
        ? '1 cassetta trovata'
        : `${visibili.length} cassette trovate`

  // Hint del drag bloccato (riserva UX 1): il drag non convive con la ricerca — invece di
  // lasciar sparire il long-press in silenzio (§5.35 lo esigerebbe come apertura sheet), si
  // segnala il perché con un hint che vince sulla riga conteggio (stessa riga, stesso ruolo).
  const [hintDrag, setHintDrag] = useState(false)
  const hintTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (hintTimeout.current) clearTimeout(hintTimeout.current)
  }, [])
  function segnalaDragBloccato() {
    vibra('light')
    setHintDrag(true)
    if (hintTimeout.current) clearTimeout(hintTimeout.current)
    hintTimeout.current = setTimeout(() => setHintDrag(false), HINT_DRAG_BLOCCATO_MS)
  }

  // Il drag NON parte durante una ricerca attiva (parete filtrata = ordine parziale) né con meno di
  // 2 cassette (§5). Fuori da queste condizioni le cassette NON ricevono `onSollevata`: il gesto
  // ricade sul long-press legacy (sheet) — e i ▲▼ dello sheet restano l'unica via di riordino.
  const dragAbilitato = !attiva && pareteVista.length >= 2
  const gridRef = useRef<HTMLDivElement>(null)
  // Destrutturato al volo (non `const drag = …`): usare un membro in `ref={}` farebbe inferire
  // all'intero oggetto natura di ref al React Compiler, che poi bollerebbe gli altri accessi come
  // «ref durante il render». Con i locali ognuno è quello che è (funzione, stato, descrittore).
  const {
    onSollevata: sollevaDrag,
    idTrascinato: idTrascinato,
    ordineIds: ordineDrag,
    ghost: ghostDrag,
    ghostMotion,
    annuncio: annuncioDrag,
  } = useDragRiordino({
    parete: pareteVista,
    disabilitato: !dragAbilitato,
    gridRef,
    onSheet: (id) => setSheet({ tipo: 'cassetta', id }),
    inviaOrdine,
    onRefresh: () => rileggiParete(),
    scrollerRef: props.scrollerRef,
  })

  // Ordine di render: durante il drag comanda l'ordine OTTIMISTICO (le sorelle FLIPpano); a riposo
  // è `visibili` — la parete intera (`pareteVista`, overlay incluso) quando la ricerca è spenta,
  // solo le match (risalite in testa nell'ordine relativo) quando è accesa. Il drag non convive
  // con la ricerca (§2.4): quando `ordineDrag` è valorizzato, la ricerca è per forza spenta e
  // `visibili === pareteVista`. Il ▲▼ (`ordineManuale`) NON compare qui: è già dentro `pareteVista`
  // (v. sopra) — un solo posto compone l'ordine, mai due fonti che potrebbero disaccordarsi. La
  // mappa id→cassetta risolve ogni id all'ultimo dato conosciuto.
  const perId = useMemo(() => new Map(pareteVista.map((c) => [c.id, c])), [pareteVista])
  const cassetteRender = (ordineDrag ?? visibili.map((c) => c.id))
    .map((id) => perId.get(id))
    .filter((c): c is CassettaParete => !!c)
  const cassettaGhost = ghostDrag ? perId.get(ghostDrag.id) : null

  return (
    <section className="ds-parete-shell">
      {/* QA device T15 (addendum 24/07) — il chrome di pagina rende SEMPRE (v. commento sulle
          prop sopra): niente più ramo condizionale su `contesto`. `onIndietro` (se passato dal
          pannello del pager) sostituisce `tornaIndietro` — v. commento sulla prop. */}
      <header style={{ display: 'flex', alignItems: 'center', gap: spazio.sm, marginBottom: spazio.m }}>
        {/* Direttiva permanente 22/07/2026: back = pagina precedente; fallback /dashboard solo senza storia. */}
        <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={onIndietro ?? (() => tornaIndietro(router))} />
        <h1
          style={{
            flex: 1,
            margin: 0,
            fontSize: tipografia.size.title,
            fontWeight: tipografia.weight.extrabold,
            letterSpacing: tipografia.tracking.titoli,
            color: 'var(--ink)',
          }}
        >
          Le cassette
        </h1>
        <TastoTondo glifo="☰" etichettaAria="Tutto il resto" onClick={() => router.push('/tutto-il-resto')} />
      </header>

      {pareteVista.length === 0 ? (
        <Vuoto
          glifo="🗄️"
          titolo="La tua parete è vuota"
          guida="Crea la prima cassetta: da lì in poi ogni lavoro sa dove sta, nell'ordine del tuo muro."
          azione={{ etichetta: 'Crea la prima cassetta', onClick: () => setSheet({ tipo: 'nuova' }) }}
        />
      ) : (
        <>
          {/* Pillola di ricerca (mockup righe 39-49) — qui con un input VERO. */}
          <div className="ds-parete-cerca">
            <svg className="lente" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M16.5 16.5 21 21" />
            </svg>
            <input
              ref={inputCerca}
              type="search"
              value={query}
              onChange={(evento) => setQuery(evento.target.value)}
              placeholder="Cerca una cassetta o un lavoro…"
              aria-label="Cerca una cassetta o un lavoro"
              enterKeyHint="search"
            />
            {digitando && (
              <button
                type="button"
                className="pulisci"
                aria-label="Svuota la ricerca"
                onClick={() => svuotaRicerca(inputCerca.current, () => setQuery(''))}
              >
                ×
              </button>
            )}
          </div>

          {/* Riga quieta + live region insieme: un solo testo, letto una volta sola.
              `minHeight` tiene ferma la parete mentre si digita. L'hint del drag bloccato VINCE
              sul conteggio (stessa riga, stesso ruolo — mai due status contemporaneamente). */}
          <p
            role="status"
            aria-live="polite"
            style={{
              margin: `0 0 ${spazio.s}px`,
              minHeight: 20,
              fontSize: tipografia.size.caption,
              fontWeight: tipografia.weight.semibold,
              color: 'var(--muted)',
            }}
          >
            {hintDrag ? 'Svuota la ricerca per spostare le cassette' : annuncio}
          </p>

          {/* Live region ASSERTIVA del flusso di trascinamento (§5.4): separata dalla `polite`
              della ricerca — due regioni, due scopi. Visually-hidden, mai `display:none` (che la
              escluderebbe dall'albero). NB: `aria-live="assertive"` SENZA `role="status"` — la
              ricerca §5.4 suggerisce `role="status"`, ma quel ruolo qui creerebbe un secondo
              elemento `status` in pagina (l'altro è la riga della ricerca): resta una live region
              assertiva a tutti gli effetti, senza l'ambiguità di ruolo. */}
          <p
            aria-live="assertive"
            aria-atomic="true"
            style={{ position: 'fixed', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(100%)', whiteSpace: 'nowrap' }}
          >
            {annuncioDrag}
          </p>

          {/* MotionConfig `reducedMotion="user"` (§3.5): framer-motion di default IGNORA la
              preferenza — qui il FLIP delle sorelle degrada a snap e le transform non si animano,
              mentre l'opacity (la buca) continua. Scoped alla parete: gli sheet restano intatti. */}
          <MotionConfig reducedMotion="user">
            <div className="ds-parete">
              <div className="ds-parete-grid" ref={gridRef}>
                {/* Niente `AnimatePresence`: lo smontaggio delle non-match è SECCO (riserva FE
                    R4 — mai popLayout in griglia). `layout="position"` (non il booleano `layout`)
                    anima solo la posizione delle sorelle, mai le loro dimensioni (riserva FE R4). */}
                {cassetteRender.map((c) => (
                  <motion.div
                    key={c.id}
                    layout="position"
                    transition={molla.smooth}
                    className="ds-cella-riordino"
                    animate={{ opacity: idTrascinato === c.id ? trascinamento.opacitaBuca : 1 }}
                  >
                    <Cassetta
                      id={c.id}
                      nome={c.nome}
                      colore={c.colore}
                      lavoro={c.lavoro}
                      stato={attiva ? 'accesa' : 'normale'}
                      onTap={() =>
                        c.lavoro ? router.push(`/lavori/${c.lavoro.id}`) : setSheet({ tipo: 'cassetta', id: c.id })
                      }
                      // Il gesto di drag: passato SOLO quando il drag è abilitato (fuori dalla
                      // ricerca, ≥2 cassette). Da lì il gesto è dell'hook.
                      onSollevata={dragAbilitato ? (evento) => sollevaDrag(c.id, evento) : undefined}
                      // Senza questa prop il timer di long-press non parte affatto e il gesto
                      // sparisce in silenzio (§5.35): va passato a OGNI cassetta, anche occupata.
                      // A ricerca attiva il drag non convive con essa (§2.4): il long-press
                      // segnala il blocco con un hint invece di aprire lo sheet in silenzio.
                      onLongPressSheet={attiva ? segnalaDragBloccato : () => setSheet({ tipo: 'cassetta', id: c.id })}
                    />
                  </motion.div>
                ))}
                {/* Durante la ricerca la tile sparisce (mockup, blocco 2): una cella tratteggiata
                    a piena luce competerebbe con l'unica cassetta accesa. */}
                {!attiva && (
                  <button
                    type="button"
                    className="ds-tray-nuova"
                    aria-haspopup="dialog"
                    aria-expanded={sheet?.tipo === 'nuova'}
                    onClick={() => setSheet({ tipo: 'nuova' })}
                  >
                    <span className="plus" aria-hidden="true">+</span>
                    <span className="t">Nuova cassetta</span>
                  </button>
                )}
              </div>
            </div>
          </MotionConfig>

          {/* Ghost in portale su `document.body` (§3.2): clone visivo che insegue il dito 1:1.
              Le motion value dell'hook (`x`/`y` inseguimento, `scale` lift+atterraggio) pilotano il
              transform: Motion le compone in un unico transform — niente re-render per pixel, niente
              collisione di scrittori (§3.1). Fuori da `MotionConfig` di proposito: l'atterraggio
              `molla.snappy` è imperativo (`animate`), il reduced-motion è gestito nell'hook.

              Wrapper `data-ds="v3"` (review Task 13, B-1): TUTTO il CSS del DS v3 vive sotto
              `[data-ds="v3"]` (`ds-v3.css:11`), incluso `.ds-ghost` (`position:fixed` + z-index +
              gradienti `.ds-cassetta.*`). Il portale finisce su `document.body`, FUORI dal
              `<div data-ds="v3">` di `cassette/page.tsx` — senza un proprio scope qui, `.ds-ghost`
              e `.ds-cassetta` non matchano NESSUNA regola. Stesso pattern degli altri portali del
              DS (`Sheet`, `DialogConferma`, `Avviso`): l'attributo va sul nodo portato, non
              sull'elemento con la classe funzionale — la regola CSS è un combinatore discendente
              (`[data-ds="v3"] .ds-ghost`), quindi serve un ANTENATO separato che porti l'attributo,
              non lo stesso nodo che porta già `.ds-ghost` (i due selettori non si "fondono" su un
              solo elemento). `display:'contents'` (stesso trucco di
              `NotaCreditoButton.tsx`): il wrapper esiste solo per lo scope, zero box nel layout —
              `.ds-ghost` resta l'unico elemento con `position:fixed`. Il tema eredita da
              `data-theme` su `<html>` (`ThemeInitializer`), ancestor comune a `<body>`: nessuna
              duplicazione necessaria qui. */}
          {ghostDrag && cassettaGhost && typeof document !== 'undefined' &&
            createPortal(
              <div data-ds="v3" style={{ display: 'contents' }}>
                <motion.div
                  className="ds-ghost"
                  aria-hidden="true"
                  style={{
                    left: ghostDrag.left,
                    top: ghostDrag.top,
                    width: ghostDrag.width,
                    height: ghostDrag.height,
                    willChange: 'transform',
                    x: ghostMotion.x,
                    y: ghostMotion.y,
                    scale: ghostMotion.scale,
                  }}
                >
                  <Cassetta
                    id={cassettaGhost.id}
                    nome={cassettaGhost.nome}
                    colore={cassettaGhost.colore}
                    lavoro={cassettaGhost.lavoro}
                    stato="normale"
                    // Task 9 (D1, riserva FE R3): lo stato «staccato dal filo» si rende SOLO qui,
                    // sul ghost che insegue il dito — l'originale in `.ds-cella-riordino` resta la
                    // «buca» (opacità ridotta, gancetto normale).
                    staccata
                    onTap={() => {}}
                  />
                </motion.div>
              </div>,
              document.body,
            )}
        </>
      )}

      {/* I due sheet stanno FUORI dal ramo «parete vuota»: anche la CTA del Vuoto apre
          «Nuova cassetta». Restano montati sempre — è `aperto` a comandarli, così il `Sheet` ds
          può giocare la propria uscita animata invece di sparire di colpo. */}
      <NuovaCassettaSheet
        aperto={sheet?.tipo === 'nuova'}
        onChiudi={chiudiSheet}
        prossimoNome={prossimoNome}
        onCreata={dopoCreata}
      />
      <CassettaSheet
        cassetta={cassettaAperta}
        libere={libere}
        posto={postoAperta}
        totale={pareteVista.length}
        aperto={sheet?.tipo === 'cassetta' && !!cassettaAperta}
        onChiudi={chiudiSheet}
        onCambiata={dopoCambio}
        onSposta={(direzione) => (cassettaAperta ? riordina(cassettaAperta.id, direzione) : Promise.resolve(false))}
      />
    </section>
  )
}
