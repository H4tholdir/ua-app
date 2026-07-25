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
// In ogni forma del pager il TastoPiù è UNO e sta nel piede. Capitolo H4c (decisione 0c37f25,
// demo animata ebf4edb) aveva costruito una coreografia C2 «il tasto si ritira» — scala/opacità
// pilotate 1:1 dal progress dello swipe, riconciliazione a scrollend, collasso discreto
// dell'ingombro (4 round, v. `piede-swipe.ts` e `.superpowers/sdd/h4c-fix-report.md` per la
// storia intera, NON riscritta qui). ABROGATA dalla prova device (verbale
// `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`, APPEND 26/07, commit `5957b24`):
// parole di Francesco, «il blocco resta tutto fermo nella home, quando swippo si entra
// direttamente nella zona delle cassette, punto» — niente più animazione legata al gesto. Il
// piede ORA appartiene VISIVAMENTE alla stanza Pile (vive DENTRO il suo pannello nel pager,
// passato come `piedePile` a `StanzePager` — v. sotto): scorre via col resto della home per
// natura dello scroll orizzontale nativo, si ferma con essa, niente dissolvenza/scala/curva.
// Sulla stanza Parete non esiste per costruzione (non è nel suo pannello) — né dipinto né come
// ingombro di layout, risolvendo anche l'altro difetto del verbale («resta anche una piccola
// fascia del blocco panna in basso»). COSA decide se il piede è interattivo resta invariato: è
// la stanza ospite (`.ua-stanza[data-stanza="pile"]`, `inert`/`aria-hidden` dalla sua propria
// `attiva` interna — StanzePager, invariata) a portare quella semantica per l'intero
// sottoalbero — HomeV3 non tiene più un proprio stato «stanza attiva» per il piede (era SOLO
// per questo, v. sotto), il piede stesso non dichiara più un proprio `inert`/`aria-hidden`
// (semplificazione: un solo posto che lo decide, non due). Nella forma «solo pile» (nessun
// pager) il piede resta un fratello fuori da `.corpo`,
// come sempre. Nella forma «solo parete» il piede non c'è MAI (mai c'era: la pagina /cassette
// che questo ramo rispecchia non ha un «nuovo lavoro» — v. `PareteClient.tsx`).
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pila as PilaCard } from '@/components/ds/Pila'
import { TastoPiu } from '@/components/ds/TastoPiu'
import { TastoTondo } from '@/components/ds/TastoTondo'
import { StrisciaStato } from '@/components/ds/StrisciaStato'
import { PareteClient } from '@/components/features/cassette/PareteClient'
import { initSuoni } from '@/design-system/v3/sound'
import { tipografia } from '@/design-system/v3/tokens'
import { StanzePager } from './StanzePager'
import { LinguettaCassette } from './LinguettaCassette'
import { vistaHome } from '@/lib/preferenze/home'
import { segnaPareteIntroVista } from '@/lib/preferenze/segna-parete-intro'
import type { PileHome } from '@/lib/dashboard/pile-home'
import type { SegnaleStriscia } from '@/lib/dashboard/striscia'
import type { Pila } from '@/lib/lavori/urgenza'
import type { CassettaParete } from '@/lib/cassette/parco-shared'
import type { HomePref } from '@/lib/preferenze/home'

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

  // Piede statico (verbale 26/07, commit `5957b24`) — HomeV3 non tiene più uno stato
  // `stanzaAttiva`: prima serviva SOLO a decidere `inert`/`aria-hidden` del piede (QA device
  // T15, addendum punto 3), e ora quella semantica arriva per eredità dalla stanza ospite
  // (`.ua-stanza[data-stanza="pile"]` in StanzePager, che già la porta da sé — v. il commento su
  // `piede` più sotto). Un pezzo di stato in meno da tenere sincrono, non un comportamento in
  // meno: StanzePager continua a gestire la propria `attiva` internamente, invariato.

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

  // Il piano fisso: UN solo TastoPiù, identico in ogni forma della home. Piede STATICO (verbale
  // 26/07, commit `5957b24` — abroga la coreografia C2 del capitolo H4c, v. il commento in testa
  // al file): niente ref, niente custom property, niente stato — un `<div>` con dentro il
  // bottone, punto. Nella forma pager questo stesso nodo va DENTRO il pannello della stanza Pile
  // (passato come `piedePile` a `StanzePager`, v. il render sotto): l'`inert`/`aria-hidden` che
  // decide se è interattivo (COSA, invariato §3 dell'addendum QA T15) arriva per EREDITÀ dalla
  // stanza ospite (`.ua-stanza[data-stanza="pile"]`, già la porta StanzePager) — un solo posto a
  // dichiararlo, non più due. Nelle forme non-pager («solo pile») non c'è alcuna stanza che lo
  // ospiti: resta un fratello fuori da `.corpo`, sempre interattivo, come sempre.
  const piede = (
    <div className="foot">
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
        /* Piede STATICO (verbale 26/07, commit 5957b24 — abroga la coreografia C2 del
           capitolo H4c: 4 round di custom property --piede-* e --piede-ingombro, collasso
           discreto .is-vuoto, curve dedicate in piede-swipe.ts (rimosso) — storia intera in
           .superpowers/sdd/h4c-fix-report.md, non riscritta qui). Nessuna delle vecchie regole
           sopravvive: .foot è oggi un box a dimensione fissa, niente calc(*var(--piede-*)),
           niente stile pilotato da ref. Nella forma pager questo stesso .foot vive DENTRO
           .ua-stanza[data-stanza=pile] (v. piedePile in StanzePager.tsx): scorre via con
           tutto il resto della stanza quando il pager scorre in orizzontale — non serve alcuna
           regola CSS dedicata per farlo, è la conseguenza diretta di essere un discendente del
           pannello che si muove. Sulla stanza Parete il selettore non trova nulla: il piede non
           è nel suo sottoalbero, quindi né dipinto né un pixel di ingombro — risolve anche
           l'altro difetto del verbale («resta anche una piccola fascia del blocco panna in
           basso»), per costruzione, non per un collasso calcolato. */
        .ua-home .foot {
          margin-top: clamp(4px, 0.9cqh, 8px);
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          padding-bottom: env(safe-area-inset-bottom);
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
          {/* Piede statico (verbale 26/07, commit `5957b24`, abroga H4c) — `piede` va DENTRO il
              pager come `piedePile`, non più come fratello fuori da `.corpo`: StanzePager lo
              rende dentro `.ua-stanza[data-stanza="pile"]`, fuori da `.ua-stanza-pile-scroll`
              (v. il commento lì per l'ancoraggio verticale) — così scorre via in orizzontale
              CON la stanza Pile quando il pager scorre, si ferma con essa, e non esiste affatto
              nel sottoalbero della stanza Parete (né dipinto né ingombro, per costruzione).
              `inert`/`aria-hidden` (COSA è interattivo, invariato §3 dell'addendum QA T15)
              arrivano per eredità dalla stanza ospite — StanzePager già li porta su `.ua-stanza`,
              nessun codice in più qui. */}
          <div className="corpo">
            <StanzePager
              stanzaIniziale={vista.iniziale}
              pile={stanzaPile}
              piedePile={piede}
              parete={parete}
            />
          </div>
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
