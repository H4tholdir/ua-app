'use client'

// Home v3 (§7.1 + rev. 3.1) — UNA composizione per tutti i ruoli, cambia solo il
// perimetro dati (deciso server-side). Eyebrow+saluto · StrisciaStato · 4 Pile ·
// TastoPiù. NIENT'ALTRO, per legge. No-scroll: il frame è 100dvh a <768 e la
// fascia pile assorbe lo slack; scala device-corti (≤700px) da §7.1 rev. 3.1.
//
// ── Le due stanze (Task 14, emendamento §3.3 regola 5 / §7.1 del 20/07) ──────
// L'unica eccezione ammessa al «niente altro nella home» non è un elemento in
// più: è un'ALTRA home affiancata (la Parete), raggiunta per swipe. Tre forme,
// decise server-side da `vistaHome` (preferenza «La tua home» + `?stanza=`):
//   pager  → StanzePager con dentro le due stanze — il pannello destro rende la pagina
//            /cassette VERA (QA device T15, addendum 24/07: supera Task 12/D2 sotto);
//   pile   → esattamente il layout storico, invariato;
//   parete → la sola stanza Parete — monta la `PareteClient` VERA di `/cassette`, chrome di
//            pagina completo (stesso componente del pannello del pager, v. sotto). Niente
//            redirect a `/cassette`: `HomeDesktop` (fratello di questo componente, montato
//            SEMPRE da `dashboard/page.tsx`) ignora questa preferenza — è mobile-only, spenta
//            da CSS a ≥1024px — e un redirect server-side la spegnerebbe anche lì.
// In ogni forma del pager il TastoPiù è UNO e sta nel piede, fuori dal pager. Nel pager, durante
// lo swipe verso la Parete, NON sparisce più di colpo (la lamentela d'origine del ri-collaudo
// #3): capitolo H4c (decisione 0c37f25, demo animata ebf4edb) — coreografia C2 «il tasto si
// ritira», v. i commenti su `piedeRef`/`progressoSwipe` più sotto. Resta invariato COSA decide
// quando il piede è interattivo (§3 dell'addendum: `stanzaAttiva === 'parete'`, sincronizzata da
// `onStanzaChange` — v. sotto) — cambia solo COME appare/scompare nel frattempo.
// Nella forma «solo parete» il piede non c'è MAI (mai c'era: la pagina /cassette che questo
// ramo rispecchia non ha un «nuovo lavoro» — v. `PareteClient.tsx`).
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { animate, useMotionValue } from 'motion/react'
import { Pila as PilaCard } from '@/components/ds/Pila'
import { TastoPiu } from '@/components/ds/TastoPiu'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { PareteClient } from '@/components/features/cassette/PareteClient'
import { initSuoni } from '@/design-system/v3/sound'
import { molla, useReducedMotion } from '@/design-system/v3/motion'
import { tipografia } from '@/design-system/v3/tokens'
import { StanzePager } from './StanzePager'
import { LinguettaCassette } from './LinguettaCassette'
import { bersaglioRilascio, bersaglioStanza, mappaPiedeSwipe, piedeSenzaIngombro } from './piede-swipe'
import { vistaHome } from '@/lib/preferenze/home'
import { segnaPareteIntroVista } from '@/lib/preferenze/segna-parete-intro'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'
import type { CassettaParete } from '@/lib/cassette/parco-shared'
import type { HomePref, StanzaHome } from '@/lib/preferenze/home'

const ORDINE: Array<{ pila: Pila; tipo: 'daConsegnare' | 'sulBanco' | 'daRifareInProva' | 'appenaArrivati' }> = [
  { pila: 'rossa', tipo: 'daConsegnare' },
  { pila: 'ambra', tipo: 'sulBanco' },
  { pila: 'viola', tipo: 'daRifareInProva' },
  { pila: 'blu', tipo: 'appenaArrivati' },
]

export function HomeV3(props: {
  nome: string
  eyebrow: string
  saluto: string
  pile: PileHome
  segnale: SegnaleStriscia
  parete: CassettaParete[]
  homePref: HomePref
  stanzaParam?: string
}) {
  const { nome, eyebrow, saluto, pile, segnale, parete, homePref, stanzaParam } = props
  const router = useRouter()

  // QA device #2 (verbale 2026-07-24 «Ri-collaudo device #2», fix-list G1) — CAUSA TROVATA:
  // prima di questo fix `initSuoni()` (sound.ts) veniva chiamato SOLO nell'effect di mount di
  // `PareteClient.tsx` (FIX-D1/T15.1). Su QUESTA superficie però `PareteClient` monta DIFFERITO
  // — dentro `StanzaParete` (`StanzePager.tsx`) se la home apre nella forma a due stanze
  // (idle callback, fino a 300ms dopo il primo paint, MAI prima), oppure non monta affatto
  // nella forma «solo pile» (`homePref === 'pile'`, v. sotto in questo file). Nel frattempo la
  // home stessa espone elementi che chiamano `suona()` al primo tap — Pila, TastoTondo (☰),
  // TastoPiù, tutti componenti `ds/` che importano `@/design-system/v3/sound` — quindi un tap
  // rapido su uno di questi PRIMA che `PareteClient` monti trovava il motore audio mai
  // inizializzato: nessun listener `pointerdown` registrato (v. `initSuoni` in sound.ts),
  // `sbloccato` mai `true`, `suona()` usciva subito. Fix: `initSuoni()` parte qui, al mount
  // della home stessa — la superficie più a monte, root della route `/dashboard` — così il
  // motore precede qualunque primo tap reale, indipendentemente da quale stanza/forma la home
  // apre. La chiamata in `PareteClient` resta (idempotente via `initFatto`, v. sound.ts):
  // ancora l'unica che copre la pagina standalone `/cassette`, che non passa mai da qui.
  useEffect(() => {
    initSuoni()
  }, [])

  const bancoLibero = ORDINE.every(({ pila }) => pile.liste[pila].length === 0)

  // La forma della home in QUESTA visita. La stessa funzione la calcola in
  // `dashboard/page.tsx` per decidere se leggere la parete: una regola sola, così la stanza
  // Parete non può mai essere resa con dati mai letti (v. `vistaHome`).
  const vista = vistaHome(homePref, stanzaParam)

  // QA device T15 (addendum 24/07, punto 3) — quale stanza del pager è visibile ORA: decide se
  // il piede (TastoPiù) si vede. Inizializzata dalla stanza di apertura; nelle forme non-pager
  // resta sul valore iniziale e non viene più letta (il piede lì segue `vista`, non questo
  // stato — v. sotto).
  const [stanzaAttiva, setStanzaAttiva] = useState<StanzaHome>(vista.tipo === 'pager' ? vista.iniziale : 'pile')

  // ── Capitolo H4c — piede C2 «il tasto si ritira» (decisione 0c37f25, demo animata ebf4edb,
  // docs/design/mockups/2026-07-25-piede-demo-c1-vs-c2.html ramo `c2` di `render()`) ──────────
  // `stanzaAttiva` sopra resta l'UNICA fonte per «il piede è interattivo o no» (COSA, invariato);
  // qui vive SOLO il COME appare/scompare: una motion value di progress (0 = Pile, 1 = Parete),
  // aggiornata 1:1 dallo scroll nativo del pager via `onProgressoSwipe` (StanzePager.tsx, che
  // legge `scrollLeft`/`clientWidth` — mai un secondo sistema di trascinamento). Niente
  // `useState`/re-render per tick di scroll (pattern `useDragRiordino.ts` §3.4, «niente
  // re-render per pixel di movimento»): le tre grandezze derivate (`mappaPiedeSwipe`, core puro
  // in `piede-swipe.ts`) si scrivono DIRETTAMENTE come custom property CSS su `.foot` via ref —
  // `stanzaPile`/`StanzePager` non ri-renderizzano mai per un frame del gesto.
  const ridotto = useReducedMotion()
  const piedeRef = useRef<HTMLDivElement | null>(null)
  const progressoSwipe = useMotionValue(0)
  // `true` SOLO fra `onRilascioSwipe` (parte l'assestamento con `molla.press`, o la
  // riconciliazione da `stanzaAttiva` più sotto) e il suo `onComplete` (o un nuovo
  // `onPresaSwipe`/tick di scroll, che la fermano prima). FIX ri-collaudo #4 (difetto b): NON
  // fa più ignorare i tick di scroll successivi — `onProgressoSwipe` la legge per FERMARE la
  // molla e riprendere 1:1 (v. lì), mai per scartare il tick. Un tick di scroll reale resta
  // sempre più autorevole di una qualunque molla in volo.
  const rilasciandoRef = useRef(false)
  const controlliRilascioRef = useRef<ReturnType<typeof animate> | null>(null)
  // FIX ri-collaudo #4 (review) — `true` mentre un gesto di scroll è IN CORSO, a prescindere da
  // come è mosso (dito, rotellina/trackpad): durante un gesto ancora in corso l'inseguimento 1:1
  // dello scroll nativo (`onProgressoSwipe`) è GIÀ l'autorità in tempo reale — non serve (e
  // farebbe rumore) far partire la molla di riconciliazione sotto se `stanzaAttiva` cambia
  // mentre lo scroll è ancora vivo (l'IO scatta a soglia 0.6, cioè PRIMA che il gesto finisca in
  // un drag/scroll lento): senza questa guardia la riconciliazione partirebbe comunque verso il
  // bersaglio giusto, ma in corsa col prossimo tick di scroll che arriva un istante dopo —
  // riprodotto DAL VIVO su `:3042` con uno scroll a rotellina reale (screenshot/log nel report):
  // un salto avanti (la molla) poi indietro (il tick vero che la scavalca) percepibile come
  // "hitch". Impostato `true` a ogni tick (`onProgressoSwipe`, copre QUALUNQUE input fin dal
  // primo movimento) e su `onPresaSwipe` (il touch, prima ancora che arrivi un tick); tolto SOLO
  // da un segnale nativo che lo scroll si è DAVVERO fermato — `onRilascioSwipe` (touchend/
  // touchcancel) o `onScrollAssestato` (`scrollend`, generalizza a rotellina/trackpad/
  // programmatico, v. StanzePager.tsx) — mai un timer: un segnale nativo, non una scommessa su
  // quanto ci mette una corsa a risolversi.
  const scorrendoRef = useRef(false)

  useEffect(() => {
    const applica = (p: number) => {
      const nodo = piedeRef.current
      if (!nodo) return
      const stile = mappaPiedeSwipe(p, ridotto)
      nodo.style.setProperty('--piede-etichetta-opacita', String(stile.etichettaOpacita))
      nodo.style.setProperty('--piede-tondo-scala', String(stile.tondoScala))
      nodo.style.setProperty('--piede-tondo-opacita', String(stile.tondoOpacita))
      // FIX ri-collaudo #4 (verbale 2026-07-24, APPEND 25/07 sera, difetto a — «blocco panna
      // che copre la pagina delle cassette»): le tre custom property sopra fanno sparire il
      // CONTENUTO (scala/opacità), ma da sole non restituiscono lo spazio di layout che `.foot`
      // riserva comunque (margini/padding fissi, v. la regola CSS `.is-vuoto` più sotto) — a
      // riposo su Parete quello spazio vuoto lasciava intravedere lo sfondo della PAGINA sotto
      // il piede, non un colore estraneo (`.foot` non ne dichiara uno). Il collasso scatta SOLO
      // a `p === 1` (mai a metà coreografia, v. `piedeSenzaIngombro`): a quel punto il tondo è
      // GIÀ a scala/opacità zero in entrambe le modalità, quindi togliere anche il box non
      // produce alcun pop percepibile — semplicemente restituisce alla pagina lo spazio che un
      // elemento già invisibile non doveva più trattenere.
      nodo.classList.toggle('is-vuoto', piedeSenzaIngombro(p))
    }
    applica(progressoSwipe.get())
    return progressoSwipe.on('change', applica)
  }, [progressoSwipe, ridotto])

  // FIX ri-collaudo #4 (verbale 2026-07-24, APPEND 25/07 sera, difetti a+b): `stanzaAttiva`
  // (sopra) è l'AUTORITÀ finale su dove si trova davvero il pager (IO a soglia 0.6 o
  // navigazione esplicita — mai la sola stima di `bersaglioRilascio` al rilascio, che legge
  // solo la POSIZIONE del gesto, non la sua velocità: un flick veloce può far agganciare lo
  // scroll-snap nativo nel verso OPPOSTO alla stima immediata). PRIMA di questo fix nessun
  // codice riconciliava `progressoSwipe` quando l'autorità cambiava idea dopo che la molla del
  // rilascio era già partita (o già finita) nel verso sbagliato — la motion value restava
  // bloccata lì per sempre (mai un altro tick di scroll a correggerla, se lo scroll nativo si
  // era già fermato): il piede restava visibile/opaco sulla Parete (difetto a, aggravato dal
  // mancato collasso dell'ingombro sopra) o scompariva sulle Pile (difetto b). Questo effect è
  // l'ultima parola, SEMPRE: quando `stanzaAttiva` cambia, ferma qualunque molla in volo e
  // riporta `progressoSwipe` al valore di riposo che quella stanza impone — rendendo IMPOSSIBILE
  // uno stato di riposo divergente, a prescindere da quanto la stima al rilascio abbia sbagliato.
  const montatoRef = useRef(false)
  useEffect(() => {
    if (!montatoRef.current) {
      // Primo render: un deep-link diretto sulla Parete (`?stanza=parete`) arriva già con
      // `stanzaAttiva === 'parete'` mentre `progressoSwipe` è ancora al suo default (0) — lo
      // `scrollTo` iniziale di StanzePager (v. commento lì) farà arrivare a breve un vero tick
      // di scroll che porta `progressoSwipe` a 1 da solo, senza bisogno di alcuna molla. Farla
      // partire QUI produrrebbe uno "sparire" spurio del piede subito dopo il primissimo
      // caricamento — un'animazione che nessun gesto ha chiesto.
      montatoRef.current = true
      return
    }
    if (scorrendoRef.current) {
      // Lo scroll è ancora in corso (v. commento su `scorrendoRef` sopra, QUALUNQUE input):
      // l'IO può scattare a soglia 0.6 mentre il gesto è ancora vivo, ben prima che si fermi —
      // l'inseguimento 1:1 di `onProgressoSwipe` è già l'autorità in tempo reale in questo
      // istante, nessuna molla da avviare qui (partirebbe comunque verso il bersaglio giusto, ma
      // in corsa non deterministica col prossimo tick di scroll che la scavalcherebbe un istante
      // dopo).
      return
    }
    const bersaglio = bersaglioStanza(stanzaAttiva)
    if (Math.abs(progressoSwipe.get() - bersaglio) < 0.001) return
    controlliRilascioRef.current?.stop()
    controlliRilascioRef.current = null
    if (ridotto) {
      rilasciandoRef.current = false
      progressoSwipe.set(bersaglio)
      return
    }
    rilasciandoRef.current = true
    controlliRilascioRef.current = animate(progressoSwipe, bersaglio, {
      ...molla.press,
      onComplete: () => {
        rilasciandoRef.current = false
      },
    })
  }, [stanzaAttiva, ridotto, progressoSwipe])

  function onProgressoSwipe(p: number) {
    if (rilasciandoRef.current) {
      // FIX ri-collaudo #4 (difetto b, «scattering/rimbalzo» sul flick veloce) — PRIMA di
      // questo fix un tick di scroll reale arrivato durante l'assestamento veniva IGNORATO
      // fino all'`onComplete` della molla: se lo scroll nativo/snap continuava a muoversi DOPO
      // il rilascio (fling veloce) più a lungo dei ~110ms della molla, quei tick andavano
      // persi — la molla si assestava sulla stima sbagliata e nessuno la correggeva più (fino
      // all'eventuale, tardivo, cambio di `stanzaAttiva` sopra). Un tick di scroll reale è
      // sempre più autorevole di una stima al rilascio: fermalo e riprendi a inseguire 1:1,
      // esattamente come farebbe un nuovo `onPresaSwipe`.
      controlliRilascioRef.current?.stop()
      controlliRilascioRef.current = null
      rilasciandoRef.current = false
    }
    scorrendoRef.current = true
    progressoSwipe.set(p)
  }
  function onPresaSwipe() {
    // Il dito riafferra: un eventuale assestamento in corso da un rilascio precedente non deve
    // più scrivere sopra i tick di scroll che stanno per arrivare.
    controlliRilascioRef.current?.stop()
    controlliRilascioRef.current = null
    rilasciandoRef.current = false
    scorrendoRef.current = true
  }
  function onRilascioSwipe() {
    scorrendoRef.current = false
    const bersaglio = bersaglioRilascio(progressoSwipe.get())
    if (ridotto) {
      // prefers-reduced-motion: set diretto, MAI `animate()` — stessa regola di
      // `useDragRiordino.ts` (`reduced() ? ghostScale.set(...) : animate(...)`).
      progressoSwipe.set(bersaglio)
      return
    }
    rilasciandoRef.current = true
    controlliRilascioRef.current = animate(progressoSwipe, bersaglio, {
      ...molla.press,
      onComplete: () => {
        rilasciandoRef.current = false
      },
    })
  }
  // FIX ri-collaudo #4 (review) — `scrollend` nativo (StanzePager.tsx): l'unico segnale, per
  // input NON touch (rotellina/trackpad/uno `scrollTo` programmatico), che lo scroll si è
  // DAVVERO fermato. `onRilascioSwipe` sopra copre già il touch (touchend/touchcancel); questo
  // chiude il gate anche per gli altri input — senza, `scorrendoRef` resterebbe `true` per
  // sempre dopo un qualunque scroll a rotellina, bloccando la riconciliazione anche a gesto
  // ormai fermo da tempo.
  function onScrollAssestato() {
    scorrendoRef.current = false
  }

  // La stanza Pile: esattamente la home di sempre (saluto · StrisciaStato · 4 pile). Vive in
  // una variabile perché il pager la riceve come figlio, ma il contenuto non cambia di una
  // virgola fra le tre forme.
  const stanzaPile = (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: tipografia.size.label, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.label, textTransform: 'uppercase', color: 'var(--faint)' }}>{eyebrow}</div>
          <h1 style={{ fontSize: tipografia.size.largeTitle, fontWeight: tipografia.weight.extrabold, letterSpacing: tipografia.tracking.titoli, lineHeight: 1.1, marginTop: 6, color: 'var(--ink)' }}>
            {saluto},<br />{nome}
          </h1>
        </div>
        <TastoTondo glifo="☰" etichettaAria="Tutto il resto" onClick={() => router.push('/tutto-il-resto')} />
      </div>

      <div className="striscia-slot" style={{ marginTop: 16 }}>
        <StrisciaStato attenzione={segnale.attenzione} forte={segnale.forte} tono={segnale.tono} azione={segnale.azione} onAzione={segnale.intro ? segnaPareteIntroVista : undefined}>
          {segnale.testo}
        </StrisciaStato>
      </div>

      {bancoLibero ? (
        <div className="pile" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
          {/* mockup stati-vuoti-errori.html riga ~218 — icona NEUTRA (mai tint di stato),
              vassoio/banco vuoto line-SVG, stroke 1.7 var(--faint), fill none. */}
          <span
            aria-hidden
            style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-deep)' }}
          >
            <svg viewBox="0 0 24 24" width={34} height={34} fill="none" stroke="var(--faint)" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 13h4l1.5 2.5h7L17 13h4" />
              <path d="M3 13V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" />
              <path d="M3 13v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
            </svg>
          </span>
          <div style={{ fontSize: tipografia.size.heading, fontWeight: tipografia.weight.extrabold, color: 'var(--ink)' }}>Il banco è libero</div>
          <div style={{ fontSize: 16, fontWeight: tipografia.weight.semibold, color: 'var(--muted)', maxWidth: 300, lineHeight: 1.4 }}>Quando arriva un lavoro, lo vedi qui.</div>
        </div>
      ) : (
        <div className="pile">
          {ORDINE.map(({ pila, tipo }) => (
            <PilaCard key={pila} tipo={tipo} numero={pile.liste[pila].length} sub={pile.sub[pila]} onClick={() => router.push(`/lavori?pila=${pila}`)} />
          ))}
        </div>
      )}
    </>
  )

  // Il piano fisso: UN solo TastoPiù, identico in ogni forma della home e in entrambe le
  // stanze (§3.3 regola 5). Sta FUORI dal pager, così non scorre e non si sdoppia a metà snap.
  // Capitolo H4c — `ref`/le tre custom property CSS (v. l'effect sopra) pilotano l'aspetto
  // durante lo swipe SOLO nella forma pager (lì le proprietà cambiano davvero, v. sotto); nelle
  // altre forme restano ai default dichiarati nel CSS (piede sempre pieno, invariato). `inert`/
  // `aria-hidden` restano legati a `stanzaAttiva` (COSA è interattivo, invariato §3
  // dell'addendum) — nella forma «solo pile» `stanzaAttiva` resta per costruzione `'pile'` (v.
  // l'inizializzazione sopra), quindi qui non cambia mai nulla per quella forma: nessun tocco
  // comportamentale fuori dal pager (§ vincoli del brief H4c).
  const piede = (
    <div
      ref={piedeRef}
      className="foot"
      aria-hidden={stanzaAttiva === 'parete'}
      inert={stanzaAttiva === 'parete'}
    >
      <TastoPiu compatto onClick={() => router.push('/lavori/nuovo')} />
    </div>
  )

  return (
    // "ua-home-mobile" (Task 9): HomeDesktop la nasconde da 1024 in su via CSS
    // (`.ua-home-mobile { display: none }` dentro il suo `@media (min-width:1024px)`).
    // `<section>`, non `<main>` (fix review finale item 5): `(app)/layout.tsx`
    // porta già il proprio `<main id="main-content">` (SkipToContent, §a11y) —
    // due `<main>` annidati sono HTML non valido (un solo landmark main per
    // documento). L'aria resta intatta: nessun ruolo/aria-* qui dipendeva dal
    // tag `main`.
    <section className={`ua-home ua-home-mobile${vista.tipo === 'pager' ? ' is-stanze' : ''}`}>
      <style>{`
        .ua-home { position: relative; z-index: 1; width: 100%; max-width: 480px; margin: 0 auto;
                   padding: clamp(12px, 2.6cqh, 24px) 24px; display: flex; flex-direction: column; min-height: 100dvh; }
        /* Task 14 (D8, §3.3) — wrapper fluido: la flex gli dà altezza definita → cqh risolve.
           ATTENZIONE (riserva FE R5): niente position:fixed DISCENDENTE — la linguetta è in
           portale su body apposta (v. LinguettaCassette.tsx), altrimenti questo container-type
           ne diventerebbe il containing block e la clipperebbe dentro il frame della home
           invece che nel viewport reale. */
        .ua-home .corpo { flex: 1; min-height: 0; display: flex; flex-direction: column; container-type: size; }
        /* pile centrate (D8): il blocco assorbe lo slack e si centra nello spazio residuo.
           QA device (verbale 25/07, fix-list D2) — CAUSA MISURATA a 390×640:
           '.ua-stanza-pile-scroll' box 377px vs scrollHeight 446px (69px di sforo); 'center'
           puro centra anche l'ECCESSO, spingendone metà sopra il bordo superiore visibile
           quanto sotto — la 4ª pila finiva interamente sotto la piega, tranciata dove
           cominciavano i dot (ora morti, E1 — la loro rimozione libera ~48px di budget
           verticale, v. calcolo documentato in tests/unit/home-fluida.test.tsx, che riduce ma
           non azzera lo sforo). Fix: 'safe center' — centra quando il contenuto ci sta,
           degrada ad ancoraggio in alto ('start') quando sfora, cadendo nel fondo scrollabile
           di '.ua-stanza-pile-scroll' (invariato) invece che sopra il bordo. Supporto
           verificato per i target del collaudo (Chrome Android, Safari iOS correnti — 'safe'
           su flexbox è supportato da entrambi da tempo — riverificare su device reale in FASE
           9 non fa male, la doppia dichiarazione sotto rende innocuo anche un mancato
           supporto): la doppia dichiarazione è
           progressive enhancement, non un salto secco — un motore che non riconoscesse 'safe
           center' scarta SOLO quella dichiarazione (valore non valido), la precedente
           'center' resta l'ultima valida e il comportamento di oggi non regredisce. */
        /* QA device (verbale 2026-07-24 «Ri-collaudo device #2», fix-list G2b, ratificata da
           Francesco — la taratura del clamp fluido era demandata, v. commento D2 sopra, ed È
           questa) — «diamo più aria e ingrandiamo le pile sfruttando lo spazio libero tra
           l'ultima pila ed il pulsante nuovo lavoro»: a schermo alto il floor/preferred cqh
           di ognuno di questi tre clamp restava INVARIATO (giusto: è la parte che degrada sui
           device corti, v. D2), ma il CEILING era fissato al valore della grafica classica
           pre-fluida (16px, 52px) — cioè le pile non potevano MAI superare la densità di
           sempre, nemmeno quando il container-query height ('.corpo', size-container da D8)
           avanzava decine di px liberi sopra il piede. Il ceiling sale di un solo gradino
           sulla scala chiusa 8px ('spazio' in v3/tokens.ts, §4.2: …12·16·20·24…) — 16→20
           ('spazio.ml') per gap/margin-top/padding verticale della card — non un numero
           nuovo, il gradino subito sopra quello di oggi. Il font-size del numero resta
           fermo a 52: è già 'tipografia.size.display', la cima della scala tipografica CHIUSA
           (§4.1) — non c'è un gradino sopra senza uscire dal vocabolario chiuso, quindi lì
           «più aria» viene dal padding della card che lo contiene, non dal glifo. La crescita
           resta comunque LIMITATA dall'invariante «tutto visibile senza scroll» (ratificata
           24/07): essendo espressa in cqh (proporzionale all'altezza REALE disponibile), un
           ceiling più alto si raggiunge solo quando quell'altezza c'è per davvero — il floor e
           la formula cqh che governano il degrado sui device corti (D2, safe center, scroll
           di sicurezza di '.ua-stanza-pile-scroll') non cambiano di un pixel. */
        .ua-home .pile { flex: 1; display: flex; flex-direction: column;
                         justify-content: center; justify-content: safe center;
                         gap: clamp(8px, 2.2cqh, 20px); margin-top: clamp(8px, 1.8cqh, 20px); }
        .ua-home .pile .ds-pila { padding: clamp(11px, 1.9cqh, 20px) 18px; }
        .ua-home .pile .ds-pila-num { font-size: clamp(38px, 6.5cqh, 52px); }
        .ua-home .striscia-slot { margin-top: clamp(8px, 1.8cqh, 16px); }
        /* QA device T15 (verbale 2026-07-24, fix 1a) — il piede («puntini + TastoPiù +
           etichetta») mangiava ~30% dello schermo a 390×660: la ghiera del TastoPiù (110px,
           tasto fisico ratificato, INVARIATA — v. TastoPiu.tsx) e i 44px di hit-area dei
           puntini (touch target di legge, §12, INVARIATI) restano un pavimento fisso; ciò
           che si comprime è SOLO lo spazio intorno — questo margin-top scende dal floor 8 al
           floor 4 (dimezzato), e la prop compatto su TastoPiu (v. sopra) stringe il gap
           ghiera-etichetta da 12 a 4. Misurato in browser reale (non jsdom): v.
           .superpowers/sdd/fixB-report.md per i numeri prima/dopo. */
        .ua-home .foot { margin-top: clamp(4px, 0.9cqh, 8px); display: flex; flex-direction: column; align-items: center; gap: 8px;
                         padding-bottom: env(safe-area-inset-bottom); }
        /* Capitolo H4c (decisione 0c37f25, demo ebf4edb) — coreografia C2 «il tasto si ritira».
           Le tre custom property sono scritte via ref DIRETTAMENTE sul nodo .foot (v. l'effect
           su piedeRef/progressoSwipe sopra, NON uno style React per pixel di gesto — stesso
           motivo per cui useDragRiordino.ts scrive le sue motion value senza passare da
           setState): il default qui sotto (1) è quanto vede ogni forma della home DIVERSA dal
           pager (lì le custom property non cambiano mai — nessun listener le scrive), quindi il
           piede vi resta sempre pieno, invariato (vincoli del brief H4c, «il gesto esiste solo
           dove esiste lo swipe»). TastoPiu.tsx NON viene toccato: le due classi target
           (.ds-tastopiu = il tondo vero, il suo motion.button; l'ultimo span figlio del suo
           wrapper = l'etichetta «Nuovo lavoro») sono già la superficie CSS pubblica del
           componente, la cascata delle custom property arriva a loro attraverso .foot senza
           che debbano saperlo. */
        .ua-home .foot .ds-tastopiu {
          transform: scale(var(--piede-tondo-scala, 1));
          opacity: var(--piede-tondo-opacita, 1);
          will-change: transform, opacity;
        }
        .ua-home .foot > div > span:last-child {
          opacity: var(--piede-etichetta-opacita, 1);
          will-change: opacity;
        }
        /* FIX ri-collaudo #4 (verbale 2026-07-24, APPEND 25/07 sera, difetto a — "blocco panna
           che copre la pagina delle cassette"): a riposo vero (progress 1, v. applica/
           piedeSenzaIngombro sopra) il contenitore stesso esce dal flusso — non solo il suo
           contenuto è invisibile, il box smette di esistere. display:none (non solo
           height:0/opacity:0): elimina insieme lo spazio riservato (la pagina /cassette
           riguadagna quei pixel, niente più striscia vuota color pagina in fondo allo schermo),
           qualunque background implicito e qualunque area residua che potrebbe intercettare un
           tocco — ridondante con inert (che già blocca l'interazione), ma una garanzia CSS
           esplicita non fa mai male su una superficie dove un dito reale tocca lo schermo. Il
           nodo React resta MONTATO (H4c, invariato): display:none è solo pittura, non
           smonta/rimonta nulla — la classe è un toggle imperativo via ref, mai in conflitto con
           className="foot" statico dichiarato nel JSX (React non lo tocca a ogni render). */
        .ua-home .foot.is-vuoto {
          display: none;
        }
        /* Collaudo R1 (P3): il no-scroll resta l'intento (§3.3), ma quando il contenuto
           sfora il viewport la home DEVE poter scorrere invece di tagliare le pile sotto il
           TastoPiù (collaudo device 22/07). Task 14 (D8) SPOSTA dove vive l'overflow-y:auto,
           da .ua-home a .corpo — non lo stesso posto di prima, un aggiustamento necessario
           scoperto in verifica browser (jsdom non fa layout, non l'avrebbe mai mostrato):
           container-type: size rende .corpo size-contained, cioè la SUA size è calcolata
           come se non avesse contenuto — quindi se .ua-home restasse height: auto (come
           prima del Task 14) il suo auto-height non «vedrebbe» più quanto cresce .pile dentro
           .corpo, e il contenuto in eccesso finirebbe SOVRAPPOSTO al .foot invece che
           spingerlo più in basso (verificato con una pagina di prova in browser: card in più
           renderizzate esattamente sopra la barra del piede, nessuno scroll utile a vederle).
           Soluzione: .ua-home resta un box a size definita (il suo min-height: 100dvh di
           base, invariato, senza più un override height: auto qui); è .corpo — che ha già
           una size definita dal flex (necessaria perché il container-type funzioni bene) — a
           scorrere INTERNAMENTE quando il contenuto anche al floor del clamp non ci sta. Il
           .foot resta sempre visibile in fondo, mai spinto fuori schermo. Riverificato in
           browser dopo la correzione: nessuna sovrapposizione, testo del piede sempre leggibile
           (v. task-14-report.md per screenshot/misure). La scala fluida RIDUCE i casi in cui
           questo degrado scatta, non lo abroga — resta la rete di sicurezza sotto la scala
           continua (guardia in tests/unit/home-fluida.test.tsx). */
        @media (max-width: 767px) { .ua-home .corpo { overflow-y: auto; } }
      `}</style>

      {vista.tipo === 'pager' ? (
        <>
          {/* Task 14 (D8) — `.corpo` avvolge il pager (le due stanze + linguetta — niente più
              dots dentro, rimossi da QA device D3): il
              `piede` NON si passa più come `footer` a `StanzePager` (che lo renderebbe dentro
              il proprio ritorno, quindi dentro `.corpo`) — resta un fratello fuori, fisso in
              fondo, così il TastoPiù non rimpicciolisce mai (v. commento sul blocco style).
              QA device T15 (addendum 24/07, punto 3) — quando la stanza attiva è la Parete il
              piede resta interattivamente assente (`inert`/`aria-hidden` su `stanzaAttiva`,
              invariato). Capitolo H4c (supera la nota «sparisce di colpo» qui sopra) — il piede
              ORA resta SEMPRE montato in questa forma (mai più smontato/rimontato a ogni cambio
              di stanza): è la coreografia C2 su `--piede-*` (v. l'effect su `piedeRef` sopra) a
              farlo apparire/scomparire con grazia durante il gesto, agganciata al progress che
              `StanzePager` espone dallo scroll nativo. Resta un fratello fuori da `.corpo`, il
              TastoPiù non rimpicciolisce mai per via del layout — solo per via del gesto. */}
          <div className="corpo">
            <StanzePager
              stanzaIniziale={vista.iniziale}
              pile={stanzaPile}
              parete={parete}
              onStanzaChange={setStanzaAttiva}
              onProgressoSwipe={onProgressoSwipe}
              onPresaSwipe={onPresaSwipe}
              onRilascioSwipe={onRilascioSwipe}
              onScrollAssestato={onScrollAssestato}
            />
          </div>
          {piede}
        </>
      ) : vista.stanza === 'parete' ? (
        <>
          {/* QA device T15 (addendum 24/07, punto 5, supera Task 12/D2) — forma «solo parete»:
              niente pager, quindi niente mount differito da fare (la stanza è l'unica cosa in
              pagina, si legge già server-side) — monta la `PareteClient` VERA, chrome di pagina
              completo (stesso componente montato nel pannello del pager). Niente `onIndietro`:
              qui NON c'è un pager a cui tornare — il back di default (`tornaIndietro`) è
              corretto, esattamente come su `/cassette` standalone. Niente `{piede}`: la pagina
              /cassette che questa forma rispecchia non ha un «nuovo lavoro» — un TastoPiù qui
              la farebbe divergere dalla superficie reale. Stesso contenitore scrollabile
              (`.ua-stanza-parete-scroll`, ds-v3.css) della stanza omonima dentro il pager: la
              legge «no-scroll» (§3.3) decade qui per dichiarazione esplicita di spec §3.1. */}
          <div className="corpo">
            <div className="ua-stanza-parete-scroll">
              <PareteClient parete={parete} attivo />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="corpo">{stanzaPile}</div>
          {piede}
          {/* Task 13 (D7) — forma «solo pile»: nessun pager, quindi nessuna via di ritorno
              dedicata alla parete (§7, preferenza 'pile'). La linguetta è l'unico invito
              rimasto e porta DIRETTAMENTE a `/cassette` — non a una stanza Parete che qui
              non esiste. Registra il proprio accesso da sé: qui non c'è alcun setter di
              stanza attiva che lo faccia al posto suo (a differenza del pager). */}
          <LinguettaCassette visibile onVai={() => router.push('/cassette')} />
        </>
      )}
    </section>
  )
}
