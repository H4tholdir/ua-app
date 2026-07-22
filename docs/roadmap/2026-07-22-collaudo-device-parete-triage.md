# Collaudo su device (22/07/2026, Francesco) — TRIAGE dei 13 punti
**Fonte:** prova in produzione su Android e iPhone dopo il deploy della Parete (`a6d9f50`).
**Stato:** triage tecnico completato (verifiche puntuali nel codice); in attesa di ratifica
priorità/decisioni di Francesco. Nessun fix ancora applicato.

## Classificazione

### 🐛 BUG confermati o quasi-certi (fix diretto, percorso da definire)

| # | Segnalazione | Diagnosi preliminare | Evidenza |
|---|---|---|---|
| 3 | Home pile: il tasto «+» nuovo lavoro copre le pile, la home non si vede tutta | Manca spazio riservato in fondo alla lista (padding-bottom + safe-area) sotto il tasto fisso | Da riprodurre a 390px; layout HomeV3 |
| 7 | La «×» per pulire la ricerca c'è su Android, manca su iOS | Clear button nativo dell'input: Chrome lo mostra, Safari no. Serve una «×» custom nostra, identica sui due OS | Comportamento noto WebKit |
| 9 | Tap su cassetta libera: su iOS apre lo sheet, su Android serve il long-press | Il comportamento PREVISTO è: tap su libera → sheet (`CassettaSheet.tsx:5`). iOS è corretto; **su Android il tap non scatta** → bug nel riconoscimento del gesto (`Cassetta.tsx`, catena pointerdown/up) | `PareteClient.tsx:281` |
| 10 | Scheda lavoro: nav/menu invisibili o mal formattati, scroll verticale e laterale rotti, back porta sempre alla home | Il back è **hardcoded**: `router.push('/dashboard')` in `SchedaLavoroV3.tsx:240`. I problemi di formattazione/scroll vanno riprodotti su device (viewport/overflow) | `SchedaLavoroV3.tsx:240` |
| 11 | Colore custom: su iOS non funziona; su Android il primo «Imposta» applica il bianco standard invece del colore scelto (al secondo giro funziona); il nero rompe la visualizzazione | Tre difetti distinti: (a) `<input type="color">` su Safari iOS; (b) stato pending del doppio-tap che al primo commit usa il valore sbagliato; (c) nessuna gestione contrasto su faccia scura (targa/testo illeggibili col nero) | `SwatchesColore.tsx`, `CassettaSheet.tsx` (pending ratificato Task 12) |

### 🍏 PIATTAFORMA iOS — indagine dedicata (probabile radice comune WebKit)

| # | Segnalazione | Note |
|---|---|---|
| 1 | Animazioni: fluide su Android, scattose/assenti su iOS | Stessa classe del punto 8. Cause tipiche: animazioni non GPU-accelerated, FLIP con layout thrash, spring degradate su Safari |
| 2 | Sheet su iOS: appaiono senza animazione fluida e non si chiudono con lo swipe verso il basso | Due cose: (a) transizione enter dello Sheet su WebKit; (b) **drag-to-dismiss = feature nuova** del componente ds Sheet (motion dai token v3) |
| 8 | Drag del riordino: bellissimo su Android, non fluido su iOS | Profiling su device necessario (Safari remote debugging); ottimizzazioni transform/will-change applicabili anche subito |

### 🎨 REDESIGN — richiedono mockup + varianti + ratifica (workflow §0B)

| # | Segnalazione | Note |
|---|---|---|
| 4 | La «notifica» sotto «Buon pomeriggio Francesco» (StrisciaStato) non è chiara | Riprogettazione della striscia: mockup con più varianti light+dark |
| 6 | Ricerca cassette: le non-pertinenti devono SPARIRE e le trovate risalire in alto | **Cambio di comportamento ratificato**: la spec attuale prescrive la ricerca «che accende» (le altre restano, attenuate). Se ratificato, sostituisce quella decisione; adattare anche la riga conteggio |
| 12 | Le etichette clippano sulle cassette; va ristudiata la visualizzazione targa + «libera»/n. lavoro + cliente | Il clamp anti-invasione (fix L2 `6a1103b`) protegge la miniatura ma il layout targa resta stretto. Mockup dedicato con casi limite (nomi lunghi, dentista lungo, 390px) |

### 💬 COMPORTAMENTI PREVISTI — decisione di prodotto, non bug

| # | Segnalazione | Come stanno le cose | Decisione da prendere |
|---|---|---|---|
| 5 | Lo swipe porta a un'«anteprima widget» della parete, non alla parete | By design (spec home «due stanze»): la seconda stanza È il muro vero ma **read-only** — la home non è un editor; tap su libera → `/cassette`, tap su occupata → lavoro (`StanzaParete.tsx:13-15`) | Tenere l'anteprima (più chiara come porta), renderla operativa, o far sì che lo swipe apra direttamente `/cassette` |
| 13 | Da una cassetta libera non si può assegnare un lavoro | Confermato: lo sheet della libera offre rinomina/colore/sposta/butta via, **niente «Metti un lavoro»**. Oggi l'assegnazione parte sempre dal lavoro (pila → conferma) o dallo sheet dell'occupata («Sposta il lavoro in…») | Aggiungere «Metti un lavoro» (chip dal parco) allo sheet della libera |

### 📎 Punto 14 (bonus) — shortcut «Le cassette» dal long-press sull'icona — ✅ CHIUSO (22/07 sera)

**Esito: NON è un bug.** Francesco ha disinstallato e reinstallato la PWA su Android: la shortcut
«Le cassette» ora c'è (conferma diretta). Era la WebAPK non ancora rigenerata. Su iOS resta il
limite di piattaforma (Safari non supporta le manifest shortcuts). Nessuna azione per l'ondata R1.

Il manifest live è CORRETTO (verificato: shortcut presente, `url: /cassette` in scope, icona
192×192 ≥ minimo 96 di Chrome). Spiegazione diversa per OS:
- **iOS: limite di piattaforma, NON un nostro bug.** Safari/iOS **non supporta** le `shortcuts`
  del Web App Manifest: il long-press sull'icona di una PWA mostra solo le azioni di sistema.
  Su iPhone questa shortcut non apparirà mai finché Apple non la implementa. (L'aspettativa era
  sbagliata nella guida al test — errore nostro di istruzione, non del prodotto.) Accesso rapido
  alla parete su iOS = swipe home → `/cassette` (ratifica punto 5) e voce in Tutto il resto.
- **Android: dovrebbe funzionare, ma la WebAPK si aggiorna con ritardo.** Le shortcut si
  incorporano nell'app installata; Chrome ri-genera la WebAPK ore/giorni dopo un cambio di
  manifest. Test corretto: **disinstallare la PWA → aprire uachelab.com in Chrome → reinstallare
  («Aggiungi a schermata Home») → long-press sull'icona.** Se dopo la reinstallazione la shortcut
  ancora manca → diventa bug dell'ondata R1.

## Direttiva nuova segnalata da Francesco (da ratificare come permanente)
> «il tasto back, in ogni parte della PWA, deve prevedere il ritorno alla pagina precedente»

Se ratificata: regola permanente → `router.back()` con fallback intelligente (history vuota →
dashboard) su TUTTI i back della PWA; censimento dei back hardcoded esistenti.

## ✅ RATIFICHE DI FRANCESCO (22/07 sera, in sessione)

1. **Punto 5 — «Swipe → parete vera»:** la stanza-anteprima nella home SPARISCE; lo swipe porta
   DIRETTAMENTE a `/cassette`. La home resta le pile. (Conseguenza da progettare nell'ondata
   redesign: la preferenza «La tua home» a 3 modi e lo StanzePager vanno ripensati di conseguenza.)
2. **Punto 6 — ricerca «filtra e risali»:** le cassette non pertinenti SPARISCONO, le trovate
   risalgono in alto. **Sostituisce** la decisione di spec «la ricerca accende»; adattare anche la
   riga conteggio.
3. **Punto 13 — SÌ a «Metti un lavoro»** nello sheet della cassetta libera (scelta dal parco).
4. **Punto 10 — DIRETTIVA PERMANENTE ratificata:** il back, ovunque nella PWA, torna alla pagina
   precedente (`router.back()` con fallback a `/dashboard` se non c'è storia). Incisa in
   `ua-app/CLAUDE.md` §9; include censimento e correzione dei back hardcoded esistenti.

## Piano di esecuzione ratificando (ordine proposto)
1. **Flake vitest — intervento di classe** (resta primo: task tecnico piccolo, test-only).
2. **Ondata «Collaudo R1 — bug fix»** (percorso Media): punti 3, 7, 9, 10 (back-directive +
   formattazione/scroll scheda), 11 — systematic-debugging, QA finale su device (Francesco).
3. **Ondata «iOS fluidità»** (indagine + fix): punti 1, 2, 8 — profiling WebKit, sheet
   enter-animation + drag-to-dismiss, ottimizzazione drag.
4. **Ondata «Redesign parete/home»** (design-first, §0B): punti 4, 6, 12 + conseguenze del punto 5
   + punto 13 — mockup multipli light+dark, ratifica, poi implementazione.

Le ondate «Miniature 38 + legenda» e D-11 scalano DOPO queste (il collaudo ha la precedenza —
indicazione di Francesco «iniziamo con queste indicazioni»).
