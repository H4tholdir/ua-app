# Spec — Ondata «Collaudo R1 — bug fix» (punti 3, 7, 9, 10, 11 del collaudo device)
**Data:** 22/07/2026 · **Stato:** design approvato da Francesco in sessione («poi procedi pure»)
**Fonte:** `docs/roadmap/2026-07-22-collaudo-device-parete-triage.md` (triage + 4 ratifiche) +
2 screenshot device (iOS + Android, scheda lavoro n.2026/0002, PWA standalone) + risposte dirette.

## 1. Perimetro

**Dentro:** i 5 bug ratificati del collaudo — P3 (home coperta dal «+»), P7 («×» ricerca
cross-platform su TUTTI i campi), P9 (tap Android su cassetta libera), P10 (back-directive globale
+ overflow/formattazione scheda lavoro), P11 (colore custom: picker iOS, primo Imposta, nero
piatto). **Percorso Media** (nessun dominio critico: niente RLS/migration/Stripe/FatturaPA/auth).

**Fuori (ondate successive):** iOS fluidità (P1, P2, P8) · redesign parete/home (P4, P6, P12 +
conseguenze P5 + P13) · Miniature 38 · D-11.

## 2. Root cause accertate (verifiche del 22/07 in sessione)

| P | Causa accertata / pista forte | Evidenza |
|---|---|---|
| 3 | `TastoPiu` flottante (`HomeV3.tsx:115`); `.ua-home` non riserva spazio in fondo | `HomeV3.tsx:130` (padding senza bottom dedicato) |
| 7 | I campi usano il clear NATIVO di `type="search"`: Chrome lo mostra, Safari no. 4 campi: `PareteClient.tsx:222` (v3), `ClientiSearchList.tsx:70`, `PazientiSearchList.tsx:66`, `MagazzinoSearchList.tsx:106` (v2.3) | grep `type="search"` |
| 9 | **[emendata in fase piano]** `pointercancel` È gestito (`Cassetta.tsx:221`). Root cause primaria: un tap Android porta jitter 8-15px — oltre la NOSTRA soglia (`SOGLIA_MOVIMENTO_PX=8` → `spostato=true`, niente onTap al pointerup) ma dentro lo slop di sistema di Chrome, che quindi EMETTE il click naturale… che `handleClick` ingoia (`if (spostato) return`). Su touch un click che arriva è per definizione un tap (dopo un vero scroll il browser non lo emette). L'onTap è cablato giusto (`PareteClient.tsx:281`: libera → sheet) — iOS è il comportamento corretto | lettura completa `Cassetta.tsx:107-260` |
| 10a | Back hardcoded `router.push('/dashboard')` (`SchedaLavoroV3.tsx:240`); direttiva permanente ratificata: back = pagina precedente OVUNQUE | CLAUDE.md §9 nuovo |
| 10b | **Screenshot device (iOS+Android identici):** «‹» tagliato a metà dal bordo sinistro, «⋯» mezzo/del tutto fuori dal bordo destro → la colonna `scheda-v3-centrata`/shell è PIÙ LARGA del viewport e sborda simmetricamente → scroll orizzontale dell'intera pagina, header che «scompare ai lati», scroll verticale disturbato | 2 screenshot 22/07 |
| 11a | Picker iOS non si apre MAI: input `ds-swatch-input` con `pointer-events:none` + 1×1px (`ds-v3.css:507-510`) aperto via `.click()` programmatico (`SwatchesColore.tsx:108`) — pattern bloccato da Safari | lettura diretta |
| 11b | Input color NON controllato → default `#000000`: scegliere nero al primo giro non emette `input` (valore invariato) → il pending resta il colore precedente → «Imposta» committa quello. Al secondo giro (valore ormai diverso) funziona. Combacia col report | `SwatchesColore.tsx:120-130` |
| 11c | La faccia custom applica l'hex PURO (`style={{background: valore}}`): zero gradienti/ombre → sul nero (e ogni colore saturo scuro) la cassetta è piatta e i testi illeggibili | `SwatchesColore.tsx:104` + report Francesco |

## 3. Design dei fix

### P3 — Spazio riservato in fondo alla home
`.ua-home` (e il contenitore delle pile) riserva in fondo:
`padding-bottom: calc(<ingombro TastoPiu> + <respiro> + env(safe-area-inset-bottom))`.
L'ultima pila deve essere interamente leggibile e tappabile sopra il tasto. Verifica anche in
modalità «due stanze» (finché esiste) e con tastiera chiusa/aperta. Nessun cambiamento al TastoPiu.

### P7 — «×» di pulizia ricerca, identica sui due OS (fix di classe, ratificato)
- Logica condivisa senza stile (`src/lib/ui/usaCampoRicerca.ts` o simile): mostra «×» quando
  `value.length > 0`; al tap: svuota, ri-focalizza il campo, annuncia SR («Ricerca svuotata»).
- Il clear NATIVO WebKit/Blink si nasconde ovunque (`::-webkit-search-cancel-button { display:none }`)
  così l'esperienza è identica per costruzione.
- Due vesti per la regola di convivenza DS (v3 §14): parete → stile v3 (dentro
  `.ds-parete-cerca`, token v3, touch target ≥44px); clienti/pazienti/magazzino → stile v2.3
  (token v2.3). MAI mischiare i sistemi nella stessa pagina.

### P9 — Tap Android sulla cassetta libera
1. Riproduzione con test: sequenze pointer sintetiche REALI di Chrome Android —
   `down→up` rapido, `down→move(jitter 3-12px)→up`, `down→pointercancel→click`,
   `down→up→click` — su `Cassetta` con `onSollevata` presente (com'è su /cassette).
2. Fix nella catena di `Cassetta.tsx` guidato dal test rosso. Interventi attesi (da confermare col
   RED): gestione `pointercancel` (oggi assente) e fallback sul `click` naturale quando il
   pointerup non ha servito il tap; eventuale ritaratura della soglia jitter SOLO se l'evidenza la
   indica. INVARIANTI da non rompere: il tap su occupata naviga · il long-press solleva (drag) ·
   il click sintetico post-tap resta ingoiato (no doppia azione) · a11y AT via `onClick` intatta.

### P10 — Scheda lavoro: back + larghezza shell
- **(a) Direttiva back (globale):** helper unico `tornaIndietro(router)` in `src/lib/nav/`:
  `router.back()` se c'è storia di navigazione interna, altrimenti fallback `/dashboard`.
  Censimento di TUTTI i back/chiudi hardcoded (grep `push('/dashboard')` e simili usati come
  «indietro») e sostituzione. La scheda lavoro (`SchedaLavoroV3.tsx:240`) è il primo caso.
- **(b) Larghezza shell:** riproduzione a 390px (browser) con la pista degli screenshot: la
  colonna centrata sborda simmetricamente. Fix in ds-v3.css/shell: su mobile la scheda occupa
  `100%` del viewport (`max-width:100vw`, `min-width:0` sulle colonne flex/grid), niente scroll
  orizzontale di pagina (`overflow-x: clip` sulla shell SOLO dopo aver eliminato la causa, mai
  come cerotto), rail/menu dentro il viewport. Il fix deve reggere 390/768/1280 light+dark.
- **(c) Scroll verticale:** una volta tolto l'overflow orizzontale si riverifica; se persistono
  anomalie si diagnosticano nella stessa riproduzione.

### P11 — Colore custom
- **(a) Apertura picker senza JS:** l'`<input type="color">` diventa l'elemento toccato
  DAVVERO — overlay trasparente esteso sopra lo swatch custom (dentro lo stesso contenitore,
  `opacity:0`, dimensione piena, `pointer-events:auto`), niente `.click()` programmatico. Il
  bottone visivo resta per l'estetica; l'a11y passa all'input (nome accessibile «Colore
  personalizzato»). Funziona per costruzione su Safari iOS, Chrome, Firefox.
- **(b) Valore controllato:** `value={hexCorrente}` — l'hex del colore attuale della cassetta
  (slug → hex mappato dai token; MAI letterali nei .tsx: i valori arrivano dai token/CSS var).
  Così scegliere il nero al primo giro EMETTE l'evento (≠ dal corrente) e il pending si aggiorna.
  Caso «scelgo lo stesso identico colore» → nessun evento → nessun pending → niente da
  impostare: corretto per definizione.
- **(c) Tridimensionalità e leggibilità su qualsiasi hex:** la faccia custom non applica più
  l'hex piatto ma derivati generati dall'hex: gradiente sopra/sotto e bordo/ombra interna con
  **clamp di luminanza** (sotto una soglia si SCHIARISCE invece di scurire — il nero resta
  tridimensionale), riusando la geometria/ombre di `.ds-cassetta`. Targa e testi: `targaScura()`
  esistente estesa/verificata sugli hex estremi (#000, saturi scuri) → testi chiari su facce
  scure. Vale per la cassetta in parete, in home, nello swatch e nelle miniature contigue.

## 4. Strategia d'ondata

Worktree unico `collaudo-r1` (branch da main). Un task atomico per difetto, TDD (test che
riproduce → fix → verde), review per task (prassi SDD). Vincoli d'ondata ereditati: test in
`tests/unit/` · albero mai rosso su tsc (hook) · motion/colori SOLO da token · un solo
implementer alla volta sul branch (lint-staged stash).

Chiusura: FASE 7 (tsc/vitest/build/DS) → review finale whole-branch → FASE 9 QA browser
390/768/1280 light+dark (lab E2E) → FASE 9b L2 micro-audit SOLO superfici toccate →
🛑 verifica finale di Francesco SU DEVICE (P9 e P11 si chiudono solo lì) → merge su sua
ratifica → BP-1.

## 5. Test (per punto)

- P3: QA visivo 390px (ultima pila interamente visibile e tappabile); nessun unit nuovo se solo CSS.
- P7: unit sulla logica condivisa (appare con testo, svuota+refocus+annuncio SR) + QA sui 4 campi.
- P9: unit con sequenze pointer sintetiche (le 4 sopra) — diventano il regression harness del gesto.
- P10a: unit su `tornaIndietro` (con storia → back; senza → fallback) + censimento a zero residui.
- P10b: QA 390/768/1280: nessuno scroll orizzontale di pagina, ‹ e ⋯ interamente visibili.
- P11: unit su valore controllato e pending (nero al primo giro), su derivati/clamp (hex estremi)
  e su `targaScura` per #000; QA visivo swatch e cassetta nera in light+dark.
