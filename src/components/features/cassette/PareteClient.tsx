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
// Ricerca «che accende» (§5.1): nessuna cassetta sparisce mai, i non-match si SPENGONO
// (opacity + desaturazione) e restano tappabili — spento è opacità, non inattività.
// Il colore non è mai l'unica fonte di stato: la cassetta accesa porta `aria-current` (§5.35)
// e l'esito della ricerca è DETTO in parole nella riga quieta `role="status"` sopra la parete,
// che è insieme il testo visibile e l'annuncio per lo screen reader (una sola live region,
// montata sempre: una regione che nasce insieme al suo testo non viene annunciata).
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
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MotionConfig, motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import { Cassetta } from '@/components/ds/Cassetta'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { tornaIndietro } from '@/lib/nav/torna-indietro'
import { Vuoto } from '@/components/ds/Vuoto'
import { spazio, tipografia } from '@/design-system/v3/tokens'
import { molla, trascinamento } from '@/design-system/v3/motion'
import { filtraCassette } from './filtra-cassette'
import { NuovaCassettaSheet } from './NuovaCassettaSheet'
import { CassettaSheet } from './CassettaSheet'
import { useDragRiordino } from './useDragRiordino'
import type { CassettaParete } from '@/lib/cassette/parco-shared'

/** L'intento di apertura di uno sheet: il Task 12 ci monta sopra i due corpi. */
type IntentoSheet = { tipo: 'nuova' } | { tipo: 'cassetta'; id: string } | null

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

export function PareteClient(props: { parete: CassettaParete[] }) {
  const { parete } = props
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sheet, setSheet] = useState<IntentoSheet>(null)

  // «Filtro attivo» si decide dal `trim()` della query, MAI dalla dimensione del Set: zero
  // match e nessuna ricerca danno entrambi un Set vuoto, ma sono due pareti opposte (tutte
  // spente vs tutte normali).
  const cercato = query.trim()
  const attiva = cercato.length > 0
  const accesi = useMemo(() => filtraCassette(parete, query), [parete, query])

  // §5.5 Freschezza — senza realtime, la parete non deve mentire a chi la guarda da un'ora:
  // si rilegge quando la pagina torna in primo piano (ritorno da /lavori/[id], app riaperta).
  useEffect(() => {
    const rileggi = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    document.addEventListener('visibilitychange', rileggi)
    window.addEventListener('focus', rileggi)
    return () => {
      document.removeEventListener('visibilitychange', rileggi)
      window.removeEventListener('focus', rileggi)
    }
  }, [router])

  const prossimoNome = useMemo(() => prossimoNomeSerieC(parete), [parete])
  const libere = useMemo(() => parete.filter((c) => !c.lavoro), [parete])

  // La cassetta dello sheet si RISOLVE dalla parete corrente, non si copia nell'intento: dopo un
  // `router.refresh()` un id sparito (cassetta buttata via altrove) dà `null` e lo sheet non si
  // monta vuoto — `aperto` lo segue.
  const cassettaAperta = sheet?.tipo === 'cassetta' ? (parete.find((c) => c.id === sheet.id) ?? null) : null
  const postoAperta = cassettaAperta ? parete.findIndex((c) => c.id === cassettaAperta.id) + 1 : 0

  function chiudiSheet() {
    setSheet(null)
  }

  // Successo di un'azione = chiudi E rileggi: la parete è la fonte di verità, mai lo stato locale.
  function dopoCambio() {
    setSheet(null)
    router.refresh()
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
   *  è l'esito su cui lo sheet decide se annunciare «spostata al posto n». Il refresh gira comunque,
   *  anche quando la POST fallisce — la parete torna a dire la verità del server invece di restare
   *  sull'ordine che l'utente credeva di aver dato. */
  async function riordina(id: string, direzione: 'su' | 'giu'): Promise<boolean> {
    const indice = parete.findIndex((c) => c.id === id)
    if (indice < 0) return false
    const destinazione = direzione === 'su' ? indice - 1 : indice + 1
    if (destinazione < 0 || destinazione >= parete.length) return false
    const ordine = parete.map((c) => c.id)
    ordine[indice] = parete[destinazione].id
    ordine[destinazione] = parete[indice].id
    const ok = await inviaOrdine(ordine)
    router.refresh()
    return ok
  }

  const annuncio = !attiva
    ? ''
    : accesi.size === 0
      ? `Niente per “${cercato}”`
      : accesi.size === 1
        ? '1 cassetta accesa'
        : `${accesi.size} cassette accese`

  // Il drag NON parte durante una ricerca attiva (parete filtrata = ordine parziale) né con meno di
  // 2 cassette (§5). Fuori da queste condizioni le cassette NON ricevono `onSollevata`: il gesto
  // ricade sul long-press legacy (sheet) — e i ▲▼ dello sheet restano l'unica via di riordino.
  const dragAbilitato = !attiva && parete.length >= 2
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
    parete,
    disabilitato: !dragAbilitato,
    gridRef,
    onSheet: (id) => setSheet({ tipo: 'cassetta', id }),
    inviaOrdine,
    onRefresh: () => router.refresh(),
  })

  // Ordine di render: durante il drag comanda l'ordine OTTIMISTICO (le sorelle FLIPpano); a riposo
  // è quello del server. La mappa id→cassetta risolve ogni id all'ultimo dato conosciuto.
  const perId = useMemo(() => new Map(parete.map((c) => [c.id, c])), [parete])
  const cassetteRender = (ordineDrag ?? parete.map((c) => c.id))
    .map((id) => perId.get(id))
    .filter((c): c is CassettaParete => !!c)
  const cassettaGhost = ghostDrag ? perId.get(ghostDrag.id) : null

  return (
    <section className="ds-parete-shell">
      <header style={{ display: 'flex', alignItems: 'center', gap: spazio.sm, marginBottom: spazio.m }}>
        {/* Provenienza multipla (home, «Tutto il resto», scheda lavoro, shortcut PWA): la ‹
            porta SEMPRE alla home, mai `back()` — che rimanderebbe a un punto imprevedibile. */}
        <TastoTondo glifo="‹" etichettaAria="Indietro" onClick={() => tornaIndietro(router)} />
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

      {parete.length === 0 ? (
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
              type="search"
              value={query}
              onChange={(evento) => setQuery(evento.target.value)}
              placeholder="Cerca una cassetta o un lavoro…"
              aria-label="Cerca una cassetta o un lavoro"
              enterKeyHint="search"
            />
          </div>

          {/* Riga quieta + live region insieme: un solo testo, letto una volta sola.
              `minHeight` tiene ferma la parete mentre si digita. */}
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
            {annuncio}
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
                {cassetteRender.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    transition={molla.smooth}
                    className="ds-cella-riordino"
                    animate={{ opacity: idTrascinato === c.id ? trascinamento.opacitaBuca : 1 }}
                  >
                    <Cassetta
                      id={c.id}
                      nome={c.nome}
                      colore={c.colore}
                      lavoro={c.lavoro}
                      stato={attiva ? (accesi.has(c.id) ? 'accesa' : 'spenta') : 'normale'}
                      onTap={() =>
                        c.lavoro ? router.push(`/lavori/${c.lavoro.id}`) : setSheet({ tipo: 'cassetta', id: c.id })
                      }
                      // Il gesto di drag: passato SOLO quando il drag è abilitato (fuori dalla
                      // ricerca, ≥2 cassette). Da lì il gesto è dell'hook.
                      onSollevata={dragAbilitato ? (evento) => sollevaDrag(c.id, evento) : undefined}
                      // Senza questa prop il timer di long-press non parte affatto e il gesto
                      // sparisce in silenzio (§5.35): va passato a OGNI cassetta, anche occupata.
                      // Resta l'affordance sheet quando il drag è disabilitato (ricerca attiva).
                      onLongPressSheet={() => setSheet({ tipo: 'cassetta', id: c.id })}
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
        onCreata={dopoCambio}
      />
      <CassettaSheet
        cassetta={cassettaAperta}
        libere={libere}
        posto={postoAperta}
        totale={parete.length}
        aperto={sheet?.tipo === 'cassetta' && !!cassettaAperta}
        onChiudi={chiudiSheet}
        onCambiata={dopoCambio}
        onSposta={(direzione) => (cassettaAperta ? riordina(cassettaAperta.id, direzione) : Promise.resolve(false))}
      />
    </section>
  )
}
