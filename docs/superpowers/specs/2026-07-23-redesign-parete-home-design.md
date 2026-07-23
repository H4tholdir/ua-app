# Redesign parete/home — Spec di design (rev. 2, post-panel)
**Data:** 23 luglio 2026 · **Stato:** rev. 2 — panel advisor integrato, IN ATTESA DI RATIFICA
**Panel (Regola Advisor):** ux-designer + solution-architect + frontend-ui-builder —
**3× CONFERMATA CON RISERVE**, tutte le riserve integrate qui sotto (§8 = verbale).
**Ondata:** «Redesign parete/home» (design-first, percorso Grande) — punto 4 dell'handoff
`docs/roadmap/2026-07-23-post-punti-1-2-handoff.md`
**Brainstorming:** sessione 23/07 (domande una alla volta + 2 mockup approvati in sessione)
**Perimetro triage 22/07:** punti 4 (striscia), 6 (ricerca), 12 (targhe) + conseguenze punto 5
+ punto 13 + richieste 22-23/07 (rete metallica, suoni, invito swipe, pile centrate).

---

## 1. Decisioni prese in brainstorming (23/07, Francesco in sessione)

| # | Decisione | Dettaglio |
|---|---|---|
| D1 | **Realismo «rete vera + gancetto»** | Sfondo = rete metallica disegnata; ogni cassetta guadagna asola+gancetto. La forma/anatomia della cassetta attuale resta (targa, miniatura). NO ridisegno completo in prospettiva. |
| D2 | **«La tua home» resta a 3 modi** | solo pile / solo parete / due stanze. La stanza parete NON è più anteprima read-only: è **la pagina cassette vera e propria**, operativa. |
| D3 | **Striscia: «solo quando serve + cosa ha fatto UÀ»** | Precedenza: allarmi/scadenze con azione > segnale trial > racconti automatici (L5). Nessun contenuto → saluto pulito senza striscia. |
| D4 | **Targa: cassetta + dentista + paziente** | Sempre leggibili: nome cassetta, dentista, paziente (**alias vince sul codice**; codice PZ-#### solo in mancanza di alias). Il **numero lavoro esce dalla targa** → resta nello sheet e nella scheda. |
| D5 | **Due suoni** | Uno allo stacco (sollevamento dalla rete), uno al ri-aggancio (clack). Sede: `src/design-system/v3/sound.ts`. |
| D6 | **Approccio grafico: rete DISEGNATA** | Trama vettoriale, niente texture fotografiche. Riflessi e ombre disegnati (light); dark flat. |
| D7 | **Invito swipe: linguetta C2** | Mockup ratificato: `docs/design/mockups/2026-07-23-invito-swipe-linguetta-rifinita.html` (variante C2, basso-destra) + screenshot in `screenshots/2026-07-23-invito-swipe/`. Sostituisce «peek 28px nascosto + bounce dopo idle» della ROADMAP. |
| D8 | **Pile centrate** | Senza riserva del peek, pile centrate in orizzontale; blocco home centrato anche in verticale nella scala fluida. (Richiesta Francesco 23/07.) |

Riferimento visivo della rete: 2 foto di portacassette reali fornite da Francesco in sessione
(rete bianca a maglia quadrata ~2,5 cm, vaschette colorate con piastra asolata e gancetto
metallico). Le foto non sono in repo; questa descrizione è il verbale.

## 2. La parete (`/cassette`, `PareteClient` + `Cassetta.tsx`)

### 2.1 La rete disegnata
- Pattern a maglia quadrata sul **muro `.ds-parete`** (NON sulla shell: la shell contiene anche
  la pillola di ricerca e il padding pagina — panel FE). Il pattern attuale
  (`ds-v3.css:480-492`) evolve nella maglia realistica.
- **Tecnica di default: repeating-gradient** (risoluzione-indipendente, zero seam, paint
  irrisorio). Il rilievo del filo in light = coppia di stripe chiara/scura per asse. SVG
  data-URI a tile SOLO se il mockup ratificato esige l'intreccio dei fili — in quel caso
  bordi del tile trasparenti (anti-seam a DPR frazionari). Filo ≥2px CSS, stop morbidi
  (anti-moiré). La scelta finale si fa AL MOCKUP (gate §6.2).
- **Passo della maglia fluido**: custom property `--passo-maglia` con `clamp(...cqw...)`
  definita SOLO in regola scoped `.ds-parete-shell`, fallback fisso in px sulla regola base
  (coerenza con le guardie test, v. §5.4).
- **Dark:** flat per legge v3 — filo appena più chiaro del fondo, niente riflessi.
- La rete è decorativa: mai portatrice di informazione (`prefers-contrast` ok).

### 2.2 Il gancetto
- **SVG inline dentro il button** della cassetta, `aria-hidden`, posizionato in testa
  (ingloba/sostituisce l'attuale linguetta `::before`, `ds-v3.css:331-339`). MAI `<img>`
  (riattiverebbe il drag nativo neutralizzato in `Cassetta.tsx:395`), mai solo
  pseudo-elemento (panel FE).
- Stati: riposo (agganciato al filo) · **staccato** — reso sul GHOST del drag (clone in
  portale) via prop di stato nella firma di `Cassetta`, progettata da subito · ri-aggancio
  (rientro molla dai token `v3/motion.ts`).
- Vincoli di disegno da validare NEL mockup (gate §6.2): budget verticale ~10-12px nel gap
  12px della griglia home; l'illusione deve reggere anche col gancetto NON allineato al filo
  della maglia (posizioni griglia e passo maglia sono indipendenti).
- Il gancetto non altera hit-area né layout: nessuna regressione del clamp anti-invasione né
  dei test `parete-fluida`.

### 2.3 La targa nuova (punto 12)
- Contenuto e priorità (D4): riga 1 **nome cassetta**; contenuto: **dentista** e **paziente**
  (alias > codice). Numero lavoro RIMOSSO dalla targa (resta in sheet, scheda, ricerca).
  Anche l'etichetta SR si aggiorna: `Cassetta {nome}, occupata: {dentista}, paziente {alias|codice}`
  (`Cassetta.tsx:366-368`).
- **Disambiguazione in collisione (panel UX):** quando due lavori vivi condividono
  dentista+paziente (rifacimenti, doppie arcate), SOLO quelle targhe mostrano un
  disambiguatore locale (numero lavoro in piccolo, o tipo). Caso limite OBBLIGATORIO nel
  mockup.
- Nomi lunghi: regole di troncamento con ellissi per riga, misurate nei casi limite (390px,
  nomi ≥24 char, 3 colonne). Il mockup targa **rimisura il clamp anti-invasione** (padding-top
  44 + line-clamp tarati sul contenuto vecchio) e si misura INSIEME al budget verticale della
  home fluida a 390×660 (la targa a 3 righe alza la cassetta ~+16px — vincolo accoppiato,
  panel FE).
- **Dati (panel ARCH):** `parco.ts` estende la select a `pazienti(codice_paziente,
  nome_cognome)`. Trappola nota: per i pazienti creati dal wizard SENZA alias,
  `nome_cognome` CONTIENE il codice (trigger `upper(cognome)||' '||upper(nome)`, spazio
  finale incluso). `deriveParete` quindi: alias = `nome_cognome` normalizzato (trim), e
  **`null` se coincide col `codice_paziente`** (confronto normalizzato). Il mockup decide il
  casing (il dato arriva MAIUSCOLO). Il tipo `CassettaParete.lavoro` porta **sia codice sia
  alias**; il pagliaio ricerca (`filtra-cassette.ts`) include ENTRAMBI (l'alias si aggiunge,
  non sostituisce — «pagliaio invariato» lo esige). RLS: nessuna implicazione (service client
  + filtro tenant esplicito; embed su FK di lavori già filtrati).
- GDPR: alias opt-in, resta dentro l'app autenticata; WhatsApp invariato (mai nomi).

### 2.4 Ricerca «filtra e risali» (punto 6)
- Le cassette non pertinenti **spariscono**, le trovate **risalgono** mantenendo l'ordine
  relativo di parete. FLIP già esistente (`motion.div layout`, `molla.smooth`): il riordino
  dell'array con key stabili fa il resto.
- **Prescrizioni panel FE:** valore di filtro **debounced ~150-200ms** (input controllato
  istantaneo); `layout="position"` (le celle non cambiano misura); **uscita secca o fade
  ≤150ms** — niente exit coreografato/popLayout in griglia; reduced-motion = tutto secco.
- Riga conteggio: «{n} cassette trovate»; 0 → stato vuoto con invito a correggere.
  Pagliaio invariato (nome ∥ n. ∥ dentista ∥ paziente[codice+alias] ∥ descrizione ∥ tipo ∥
  colore).
- **Drag sospeso a ricerca attiva** (già `dragAbilitato` in `PareteClient.tsx:299`), MA mai
  in silenzio (panel UX): tentativo di long-press su griglia filtrata → micro-shake +
  haptic + hint «Svuota la ricerca per spostare le cassette».
- Lo stato visivo `spenta` perde il caso d'uso principale: **muore** con quest'ondata (non
  resta zombie); si conserva solo `accesa` per l'evidenziazione dei match risaliti.

### 2.5 «Metti un lavoro» (punto 13)
- Sheet della cassetta **libera**: azione primaria «Metti un lavoro» → lista dei lavori in
  laboratorio senza cassetta viva (stessa fonte del parco), ordinati per urgenza (semantica
  pile), ricerca locale se >8. Selezione → RPC di assegnazione esistente (riuso, nessuna RPC
  nuova) → racconto L5 («{numero} è in C12»). Stato vuoto: «Tutti i lavori hanno già una
  cassetta».

### 2.6 I due suoni (D5) + haptic
- **Pipeline: file WAV** brevi (<150 ms, ~13KB l'uno) nella infrastruttura esistente di
  `sound.ts` (fetch+decode+cache, unlock al primo gesto, preferenza utente) — NON sintesi
  procedurale: il gate d'ascolto (§6.4) confronta asset versionati.
- Aggancio (panel FE): `stacco` in `onSollevata` accanto a `vibra('light')`
  (`useDragRiordino.ts:315`); `riaggancio` nel momento del GESTO di drop — MAI dopo la
  risposta della POST.
- **Annullo-drag (riserve UX/FE divergenti — composizione motivata):** se lo stacco è
  suonato, il loop acustico si chiude SEMPRE: su annullo suona il **ri-aggancio attenuato**
  (stesso campione, gain ridotto) — la cassetta è fisicamente tornata al suo posto e
  l'utente poco tecnologico ha bisogno della conferma «non è cambiato niente» (tesi UX,
  adottata). La tesi FE (silenzio su pointercancel di sistema) è recepita così: l'attenuato
  suona SOLO se il lift era stato percepito (stacco effettivamente riprodotto). Il drop
  valido resta distinguibile per haptic di successo + stato del gancetto, non per il solo
  audio. Rilascio-fermo→sheet: nessun suono (il percorso non passa dal lift, quindi lo
  stacco non è mai suonato).
- **Haptic accoppiato** a stacco e ri-aggancio (`v3/haptic.ts`): il laboratorio è rumoroso,
  il suono da solo spesso non arriva (panel UX).
- **Deroga normativa:** `sound.ts` §9.2 dice «max 1 suono per gesto»; stacco+riaggancio sono
  due momenti dello stesso gesto continuo → deroga esplicita da incidere nella spec DS v3
  §9.2 con quest'ondata.

## 3. La home (`HomeV3`, `StanzePager`, `StrisciaStato`)

### 3.1 Le due stanze, senza copie (D2)
- `StanzaParete` (anteprima read-only) **muore** (col suo test, sostituito — v. §5.4). La
  seconda stanza monta la **parete operativa vera**: `PareteClient` estratto in componente
  condiviso con prop di contesto (`in-home`: chrome di pagina compresso, funzionalità piena).
- **Dati: nessun doppio fetch** — `dashboard/page.tsx` legge già `getParete` nello stesso
  `Promise.all`, gated da `serveParete(vistaHome(...))`; l'embed riusa quel canale (verificato
  dal panel ARCH). Le due istanze (route e home) NON condividono stato client: dichiarato e
  accettato.
- **Politica di refresh gated (panel ARCH):** in-home, il `router.refresh()` su
  focus/visibilitychange di `PareteClient` (`:82-92`) è sospeso quando la stanza parete non è
  attiva (o sostituito da refresh mirato) — mai rifare l'intera dashboard a ogni focus mentre
  l'utente sta sulle pile.
- **Montaggio differito (panel ARCH):** con il peek eliminato la stanza parete è del tutto
  fuori schermo → il contenuto pieno si monta al primo avvicinamento/attivazione, non al load
  della home. Requisito UX di collaudo: il primo swipe non deve stutterare (pre-mount in
  idle o skeleton, mai mount sincrono a metà gesto).
- **Scroller annidato — BLOCCANTE (panel ARCH R1):** tutto il riordino oggi assume
  `window` come scroller (auto-scroll `useDragRiordino.ts:209-238`, compensazione `:286`).
  In-home la parete vive in uno scroller proprio (`overflow-y:auto` +
  `overscroll-behavior-y: contain`; la legge «no-scroll» di `.ua-stanze` decade per la
  stanza parete piena — dichiarato). `useDragRiordino` e `riordino-core` si parametrizzano
  su uno `scrollRef` PRIMA dell'embed. È il lavoro tecnico più delicato dell'ondata.
- **Gesture a tre strati** (pager orizzontale × scroll verticale × drag): il meccanismo
  esistente regge per costruzione (drag solo dopo hold 300ms; a drag attivo il `touchmove`
  non-passivo fa `preventDefault` e blocca anche lo snap). Prescrizioni aggiuntive (panel
  UX): direction-locking angolare tra swipe di stanza e scroll verticale; con la tastiera
  della ricerca aperta i movimenti orizzontali accidentali non cambiano stanza; niente
  scroll-chaining che faccia rimbalzare la home. Mai impostare
  `interactive-widget=resizes-content`.
- **Colonne in-container (panel ARCH R7):** le media query VIEWPORT di `.ds-parete-grid`
  (4 col a 768, 6 a 1280) diventano **container query sulla shell** — altrimenti l'embed su
  tablet mostrerebbe 4 colonne in ~480px (tray sotto i 44px).
- Preferenza «La tua home» e deep-link `?stanza=` invariati; raggiungibilità globale di
  `/cassette` invariata.
- **QA su device Android economico come GATE di metà ondata** (tripletta scroll annidato /
  snap / drag), non solo collaudo finale (panel FE R8).

### 3.2 La linguetta «Le cassette» (D7 — mockup C2 ratificato)
- Posizione: bordo destro, basso, quota TastoPiù. Verticale, **~26px visivi ma hit-area
  estesa ≥44px** (panel UX). `card`+`line` del tema, mini-rete + freccia rossa + «LE
  CASSETTE».
- Comportamento: appare all'apertura della home, resta ~5 s, si ritira scivolando (molla dai
  token; reduced-motion → dissolvenza). «Nuova visita» = **nuovo mount** della home
  (`router.refresh()` NON la ripropone — semantica dichiarata, panel ARCH).
- **Regola di spegnimento (panel UX):** dopo **3 accessi riusciti** alla stanza parete
  (swipe o tap linguetta), la linguetta non ricompare più; i ProgressDots restano il segnale
  permanente. (Persistenza: stessa sede della preferenza «La tua home».)
- Tap: in «due stanze» scorre il pager; in «solo pile» naviga a `/cassette` — l'invito non
  mente mai. Mai visibile sulla stanza parete.
- **Cablaggio (panel ARCH R8):** componente dedicato `LinguettaCassette` con stato locale
  (timer+shown) — mai stato in `HomeV3` (ri-render globali). In «due stanze» la monta
  `StanzePager` (possiede `attiva` e `vaiA`); in «solo pile» la monta `HomeV3` con
  `router.push`.
- **A11y:** da ritirata esce dall'albero (`aria-hidden`/unmount); mai focus-steal
  all'apparizione.
- **Stacking (panel FE R5):** la linguetta e ogni overlay vivono FUORI dal wrapper
  `container-type: size` della home fluida (o in portale) — il containment ne farebbe il
  containing block e li clipperebbe (footgun già documentato sulla shell).

### 3.3 Pile centrate + scala verticale fluida (D8 + input R3b)
- Orizzontale: senza peek, stanza pile al 100% — pile simmetriche.
- Verticale: frame `100dvh` invariato + wrapper interno `flex:1; min-height:0;
  container-type: size`; blocchi in `clamp(min_px, X cqh, max_px)` con **floor px non
  negoziabili**: touch ≥44px, font mai sotto la scala chiusa `tipografia`, piede ≥
  safe-area. Il **degrado P3 resta** (overflow-y:auto quando non ci sta): la fluida riduce i
  casi di scroll, non abroga la rete di sicurezza.
- Casi dichiarati: tastiera virtuale (ricerca parete in-home: collaudo su device; mai
  `resizes-content`); browser non-standalone: il rimbalzo una-tantum del `dvh` al ritiro
  della barra è accettato (in PWA `dvh=svh` stabile, misura R3b) — se il collaudo lo
  smentisce si passa a `svh`.
- Guardie: v. §5.4 (riscrittura, non estensione).

### 3.4 La striscia sotto il saluto (D3 — punto 4)
- Gerarchia (una sola striscia per volta):
  1. **Allarmi/scadenze con azione**. Più allarmi simultanei → **aggregazione**: «3 scadenze
     oggi — Vedi ›» (mai un allarme nascosto dietro un altro, panel UX). Il **trial in
     ultima finestra (≤3gg) escala al livello 1** (B15 invariata).
  2. **Trial** (ambra, regole 20/07 invariate) — fuori ultima finestra.
  3. **Racconto UÀ** (quieto): ultima azione automatica rilevante, **TTL 24h e una sola
     esposizione per evento**; tappabile con deep-link all'oggetto («UÀ ha liberato C12» →
     stanza parete/C12).
  4. **Niente da dire → nessuna striscia.**
- Forma visiva: mockup multi-variante dedicato (gate §6.3), ≥2 forme × light/dark.
  `scegliSegnale` si estende a «racconto» + «silenzio» + aggregazione.

## 4. Fuori scope (esplicito)
- Fluidità/animazioni iOS (ondata 3, bloccata sul device).
- Miniature 38 tipi + legenda in-app (ondata dedicata).
- Redesign odontogramma; ricerca globale «Cerca» (sessione design dedicata già deliberata).
- Shell fluida delle max-width globali: NON si tocca qui (la formula parete è già pronta).

## 5. Vincoli trasversali
1. DS v3 (`[data-ds="v3"]`, token v3, componenti solo `src/components/ds/`). MAI valori inline.
2. 3 viewport (390/768/1280) × light+dark; touch ≥44px; `prefers-reduced-motion` (la
   linguetta via `useReducedMotion`/`MotionConfig` se animata con Motion); colore mai unica
   fonte di stato.
3. Back = pagina precedente ovunque (direttiva permanente). FASE 9b (gate L2) pre-merge.
4. **Guardie test (panel ARCH R6 + FE R2):** `tests/unit/ds-v3/parete-fluida.test.ts` assert
   4-5 vengono **abrogate e sostituite** (non «estese») con decision record — la home fluida
   le viola by design; `tests/unit/stanza-parete.test.tsx` muore col componente e viene
   sostituito dai test dell'embed. Nessun test «sistemato in silenzio».
5. Nessuna migration prevista. Se in piano emergesse → FASE 6b + conferma esplicita.

## 6. Gate di approvazione visiva residui (PRIMA del codice UI)
1. ✅ Linguetta C2 — ratificata in sessione (23/07).
2. ⬜ Rete disegnata + gancetto + targa nuova — mockup multi-variante; casi limite
   OBBLIGATORI: nomi lunghi, collisione dentista+paziente, budget gancetto nel gap 12px,
   disallineamento gancetto/filo, misura accoppiata col budget verticale home 390×660,
   casing del paziente.
3. ⬜ Striscia — mockup multi-variante (≥2 forme × 2 temi, incluse aggregazione e racconto).
4. ⬜ Suoni — 2 coppie candidate d'ascolto (file), poi scelta di Francesco.

## 7. Criteri di successo
- Al collaudo su device: nessuna targa clippata coi dati veri; ricerca che filtra e risale
  fluida (nessun peggioramento WebKit); «Metti un lavoro» funzionante; home intera senza
  tagli su iPhone 15 e Xiaomi 17; linguetta che appare/si ritira/si spegne dopo
  l'apprendimento; suoni+haptic allo stacco/ri-aggancio; pile centrate; primo swipe verso la
  parete senza stutter; drag con scroller annidato senza drop sbagliati (gate device di metà
  ondata).
- Suite verde; guardie riscritte con decision record; nessuna regressione RPC cassette.

## 8. Verbale panel (23/07/2026) — riserve e disposizioni
**ux-designer — CONFERMATA CON RISERVE (7):** 1 feedback attivo su drag sospeso → §2.4 ·
2 riaggancio attenuato su annullo → §2.6 (adottata) · 3 hit-area 44px + spegnimento dopo
apprendimento + a11y linguetta → §3.2 · 4 disambiguatore collisione targa → §2.3 ·
5 aggregazione allarmi + escalation trial + TTL racconto → §3.4 · 6 gesture disambiguation
prescritta → §3.1 · 7 haptic accoppiato ai suoni → §2.6.
**solution-architect — CONFERMATA CON RISERVE (8):** R1 scroller parametrizzato (bloccante)
→ §3.1 · R2 refresh gated → §3.1 · R3 mount differito → §3.1 · R4 derivazione alias
(codice travestito) → §2.3 · R5 pagliaio codice+alias → §2.3/§2.4 · R6 guardie
abrogate/sostituite → §5.4 · R7 colonne container query → §3.1 · R8 cablaggio linguetta →
§3.2.
**frontend-ui-builder — CONFERMATA CON RISERVE (8):** R1 bersaglio `.ds-parete` + passo
custom property → §2.1 · R2 guardie riscritte → §5.4 · R3 gancetto SVG inline + ghost →
§2.2 · R4 debounce + layout position + uscita secca + morte di `spenta` → §2.4 · R5
linguetta fuori dal containment → §3.2 · R6 pipeline file + aggancio al gesto + deroga
§9.2 → §2.6 (sul suono d'annullo prevale la riserva UX, motivazione in §2.6) · R7 mockup
targa accoppiato al budget home → §2.3/§6.2 · R8 QA device come gate di metà ondata → §3.1.
**Divergenza composta:** suono su annullo-drag (UX: sì attenuato / FE: no) — adottata la
tesi UX per il target utente, con la condizione FE recepita (suona solo se lo stacco era
stato percepito). Da confermare in ratifica.
