# UÀ Design System v3.2 — «Una cosa alla volta»
**Data:** 7 luglio 2026 · **Stato:** v3.2 — IN VIGORE (emendata 12/07/2026) · **Sostituisce:** DS v2.3 Warm Panna (`2026-05-27-design-system-v2-3.md`)
**Approvazione visiva:** mockup `docs/design/mockups/2026-07-07-redesign-A-materico-full.html` + `2026-07-07-ds-v3-showcase.html` (approvati da Francesco il 07/07/2026)
**Ricerca fondativa:** Apple HIG (motion/suoni/haptics/tipografia) — report agente 07/07/2026, fonti primarie citate in Appendice C.

**Rev. 3.1 (12/07/2026):** emendamenti Ondata 0 ratificati da Francesco — v. decision record 2026-07-09-il-cuore-mockups.md
**Rev. 3.2 (12/07/2026):** emendamento §7.3 — wizard "Nuovo lavoro" a 3 tocchi, consegna suggerita risolta, tassonomia granulare (Ondata 2) — deviazione B7-2 ratificata, v. spec `2026-07-12-ds-v3-il-cuore-ondata-2-wizard-design.md`

> ⚠️ **QUESTO DOCUMENTO È LEGGE.** Ogni pagina, componente, animazione, suono o testo dell'app DEVE rispettare questa spec alla lettera. Ciò che non è qui definito NON si inventa: si propone un'estensione (§13). Alla data di approvazione, DS v2.3 e i suoi token sono DEPRECATI (piano di migrazione §14).

---

## 0. Perché esiste UÀ (il fondamento di ogni decisione)

Dal momento in cui un odontotecnico inizia a usare UÀ, **non deve preoccuparsi più di niente**. L'app si impara da sola, senza tutorial, come WhatsApp o la calcolatrice. L'utente tipo: over 50, vista affaticata, mani occupate o sporche, laboratorio rumoroso, solo smartphone personale (spesso datato), zero confidenza informatica.

**L'effetto UÀ è fatto di tre emozioni**, in quest'ordine di priorità:
1. **Sollievo** — "ci pensa lei": l'app anticipa, ricorda, fa da sola, e *racconta* cosa ha fatto.
2. **Immediatezza** — "già fatto?!": ogni azione è 1-2 tocchi con risposta fisica immediata.
3. **Familiarità** — "ma la conosco già": ogni schermata somiglia a qualcosa che l'utente già padroneggia.

### Le 7 Leggi (inderogabili — ogni review le verifica una per una)
| # | Legge | Test di verifica |
|---|-------|------------------|
| L1 | **Una cosa alla volta.** Ogni schermata ha UN solo scopo; i flussi di inserimento fanno UNA domanda per schermata | "Qual è lo scopo di questa vista?" deve avere una sola risposta |
| L2 | **Parole del banco, mai del software.** Vietato: form, record, stato, submit, dashboard, filtro, query, tab | Ogni testo passa dal Dizionario (§2.3) |
| L3 | **Lo stato si legge senza leggere.** Colore + parola + posizione, mai solo colore | Screenshot in bianco e nero: si capisce ancora tutto? |
| L4 | **I tasti importanti sono fisici.** Corsa, ombra, molla, suono | Il tasto primario ha corsa 5px e risposta < 100ms |
| L5 | **Tutto ciò che UÀ fa da sola viene raccontato.** Mai lavoro invisibile | Ogni automazione produce una riga "UÀ ha fatto…" |
| L6 | **Ogni azione irreversibile ha una via di fuga visibile** | "Annulla" leggibile senza scrollare, entro 10s dall'azione |
| L7 | **Il 90% dell'app non si anima.** Il movimento è riservato a navigazione spaziale e momenti | Nessuna animazione su dati che cambiano o scroll |

---

## 1. Identità

### 1.1 Ciò che resta del brand (immutabile)
- **Nome:** UÀ (esclamazione napoletana di stupore).
- **Logo/icona PWA (approvato, versione neuromorphic):** squircle rosso con lettere **UÀ!** bianche morbide in rilievo 3D e raggiera di schegge dell'esclamativo. È l'icona home screen, lo splash, il prompt d'installazione, l'avatar del laboratorio nel portale dentista e l'unico marchio nelle email. **Non compare MAI dentro il chrome dell'app** (header, home) — l'app È il brand; il logotipo testuale `UÀ.` è ammesso solo in login e nella nav desktop.
- **Tagline:** "Il laboratorio più rapido, più semplice, più UÀ."
- **Rosso UÀ nei token UI:** `#D90012` light / `#FF3B44` dark. È IL colore dell'azione e dell'urgenza — di nient'altro. ⚠️ Il rosso `#E30613` che appare nell'artwork del logo vive SOLO dentro gli asset raster del logo: resta VIETATO come valore nei token e nel codice UI (regola anti-slop invariata).
- La raggiera del "!" è l'unico elemento grafico del logo riusabile come decorazione — ESCLUSIVAMENTE nella schermata "Consegnato!" (dietro il check, statica, tint verde) e nello splash.

### 1.2 Carattere
**«Chiaro come una calcolatrice, vero come la carta».** L'app è materia calma: carta calda, inchiostro, tasti che si premono. Mai vetrina, mai gioco, mai ufficio. L'analogico è **materia (grana, profondità, peso), non scenografia** — vietati: timbri ruotati, corsivi a mano, righe da quaderno, scontrini, qualsiasi orpello skeuomorfico. (Decisione esplicita di Francesco, 07/07: linea "C bancone" abbandonata.)

### 1.3 Dove vive il concetto-chat (unica eccezione)
Il paradigma conversazione (WhatsApp) vive **SOLO nel Portale Dentista** (§7.19). Dentro l'app del laboratorio è vietato: niente bolle, niente thread, niente "UÀ ti scrive come un contatto".

---

## 2. Lingua

### 2.1 Regole di scrittura
- Frasi brevi, verbi all'imperativo o indicativo presente. Mai passivi, mai gerundi tecnici ("caricamento in corso…" → "Un attimo…").
- UÀ parla in prima persona SOLO quando racconta le proprie automazioni ("Ho preparato la fattura") — mai altrove.
- Numeri di lavoro sempre nel formato `n.147`. Date: "oggi", "domani", "lun 7 luglio" — mai `07/07/2026` nell'interfaccia operativa (ammesso nei documenti PDF).
- Pazienti SEMPRE pseudonimizzati: `PZ-0231`. Il nome paziente non compare MAI in UI, notifiche, WhatsApp (GDPR, invariante di progetto).

### 2.2 Il messaggio di sistema
La riga di stato in home (§7.1) usa lo schema: `[momento]: [cosa ho fatto] · tutto a posto ✓` oppure `[cosa serve da te]`. Massimo 1 riga, mai modale, mai popup.

### 2.3 Dizionario obbligatorio (estratto — file completo `src/design-system/dizionario.ts` da creare)
| ❌ Vietato | ✅ Si dice |
|---|---|
| Dashboard | Home / (nessun nome: è "l'app") |
| Nuovo record / Crea entità | Nuovo lavoro |
| Stato: in_lavorazione | Sul banco / In forno / In rifinitura |
| Salva / Submit | Fatto ✓ (o salvataggio automatico silenzioso) |
| Form / campo obbligatorio | (una domanda alla volta — il concetto sparisce) |
| Filtri | Cerca / le pile stesse sono i "filtri" |
| Errore 500 / richiesta fallita | Non ci sono riuscita. Riprovo? |
| Elimina definitivamente | Butta via (con via di fuga L6) |
| Fattura emessa verso SDI | Fattura inviata ✓ |
| Task / to-do | Cose da fare |
| Loading… | Un attimo… |

---

## 3. Token — Colore

**File di verità:** `src/design-system/tokens.ts` (v3, da riscrivere). CSS custom properties su `:root` (light) e `[data-theme="dark"]`. **VIETATO qualunque colore inline nel codice applicativo** — enforcement §13.4.

### 3.1 Light — «Carta»
| Token | Valore | Uso esclusivo |
|---|---|---|
| `--bg` | `#F4F0E7` | fondo app |
| `--bg-deep` | `#ECE6D9` | fondo sotto-sheet, pressed di superfici, barre vuote |
| `--card` | `#FFFEFA` | superfici carta (card, sheet, tile) |
| `--ink` | `#1D1913` | testo primario (contrasto su card 15.9:1) |
| `--muted` | `#6E6457` | testo secondario (4.9:1 ✓ AA) |
| `--faint` | `#7B6A59` | etichette MAIUSCOLE ≥12.5px/800 e decorazioni — MAI testo di lettura (rev. 3.1: era `#A69B8C`, WCAG fail 2.40 su `--bg`; ora 4.56 su `--bg`, 5.14 su `--card`) |
| `--line` | `#EBE4D6` | separatori 1.5px |
| `--red` | `#D90012` | SOLO: tasto primario, urgenza "oggi", pila rossa |
| `--red-dark` | `#A5000E` | bordo-corsa 3D del tasto rosso |
| `--amber` | `#9A5C00` | stato "in corso" (5.3:1 su card ✓ — corretto 08/07: il valore precedente #B36B00 falliva AA a 4.14:1, scoperto dal test di contrasto calcolato) |
| `--green` | `#1B7F3B` | fatto, conferme, tasto FATTA |
| `--blue` | `#1D5FBF` | nuovo, informazione, note dentista |
| `--purple` | `#7C3F9C` | famiglia di stato «Da rifare / In prova» (pila viola) (rev. 3.1) |
| `--purple-tint` | `#F3EAF7` | SOLO sfondi pill/badge viola (rev. 3.1) |
| `--red-tint / --amber-tint / --blue-tint / --green-tint` | `#FBEDEC / #F8F0E1 / #EBF1FA / #EAF4EC` | SOLO sfondi di pill-stato e glifi |

### 3.2 Dark — «Notte in laboratorio»
Regola Apple: **l'elevazione è una superficie più chiara, MAI un'ombra.** Nessuna shadow in dark.
| Token | Valore | Uso |
|---|---|---|
| `--bg` | `#171411` | fondo app |
| `--sfc` | `#211D18` | carta livello 1 (card) |
| `--elv` | `#2B2620` | carta livello 2 (sheet, elementi sollevati, tasti tondi) |
| `--ink` | `#F2EEE7` | testo primario |
| `--muted` | `#A69B8C` | testo secondario (4.6:1 su sfc ✓) |
| `--faint` | `#928778` | etichette (rev. 3.1: era `#6E6457`, fail; ora 5.21/4.75) |
| `--line` | `#342E26` | separatori |
| `--red` | `#FF3B44` | più vivo al buio (regola Apple: accent più saturi in dark) |
| `--red-dark` | `#8F0910` | corsa del tasto |
| `--amber` / `--green` / `--blue` | `#E8A13D / #34C468 / #5B9BFF` | stati |
| `--purple` | `#B98BE8` | famiglia di stato «Da rifare / In prova» (rev. 3.1) |
| `--purple-tint` | `rgba(185,139,232,.14)` | SOLO sfondi pill/badge viola (rev. 3.1) |
| tints dark | colore stato al 14% di opacità su `--sfc` | pill-stato |
- Le card dark hanno `border-top: 1px solid rgba(255,255,255,.04)` (luce radente) — unico "rilievo" ammesso.

### 3.3 Regole d'uso del colore (vincoli)
1. **Il rosso è scarso.** Massimo UN elemento rosso pieno per schermata (il tasto primario O la pila urgente — mai entrambi in vista contemporaneamente: in home il tasto + vince, la pila rossa usa testo/numero rossi su carta).
2. **5 famiglie di stato, chiuse:** rosso=urgente · ambra=in corso · blu=nuovo/informazione · verde=fatto · **viola=da rifare/in prova** (rev. 3.1, decisione Francesco 12/07). Vietato un sesto colore di stato.
3. WCAG AA (4.5:1) obbligatorio per ogni testo in entrambi i temi. `--gold`, `#E30613`, `#1B2D6B`, `--t2:#96918D`, `--t3:#B8B3AE` restano BANDITI come in v2.3.
4. WhatsApp verde `#208650→#17663A` (corsa `#0E4A28`) è riservato ESCLUSIVAMENTE ai bottoni che aprono WhatsApp (rev. 3.1: era `#1F9E52→#2FBE68`, il bianco falliva AA).
5. **Nota (emendamento 20/07/2026, ondata A):** con la home a due stanze (Pile ↔ Parete, annuncio §7.1) la regola 1 vale in ENTRAMBE le stanze — il TastoPiù resta l'unico rosso pieno, presente identico in ciascuna.

---

## 4. Token — Tipografia, spazio, materia

### 4.1 Tipografia
**Font unico: Plus Jakarta Sans** (pesi 400/600/700/800), self-hosted WOFF2, `font-display: swap`. DM Sans è deprecato; Inter resta bandito.
**Scala (fissa, nessun'altra dimensione ammessa):**
| Token | px | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display` | 52 | 800 | -0.03em | SOLO numeri delle pile, tabular-nums |
| `large-title` | 31 | 800 | -0.02em | titolo pagina ("Buongiorno, [nome utente]", "Agenda") |
| `question` | 35 | 800 | -0.02em | SOLO domande wizard e schermate-celebrazione ("Consegnato!" usa 40, unica eccezione) |
| `title` | 27 | 800 | -0.02em | titoli di sheet e dialog |
| `heading` | 21 | 800 | -0.01em | numeri lavoro nelle card, titoli card |
| `body` | 17 | 600–700 | 0 | testo base, valori delle righe-dato. **Il testo di lettura non scende MAI sotto 17px** |
| `callout` | 15.5 | 600 | 0 | testo secondario, sottotitoli |
| `label` | 13 | 800 | +0.16em | etichette MAIUSCOLE di stato/pila |
| `caption` | 12.5 | 700–800 | +0.14em | chiavi righe-dato MAIUSCOLE, timestamp |
- **Minimo assoluto 12.5px** (equivalente HIG 11pt+margine per utenti over-50). Tracking negativo solo sopra i 21px (regola SF Display/Text).
- **Zoom testo:** il layout DEVE reggere il text-zoom browser 200% senza perdita di funzioni (equivalente Dynamic Type). Test obbligatorio in QA (§13.3).
- Numeri sempre `font-variant-numeric: tabular-nums` dove incolonnati (pile, orari, importi).

### 4.2 Spazio, raggi, target
- **Griglia 8px** — spaziature ammesse: 4 (solo interni minimi), 8, 12, 16, 20, 24, 32, 44. Margini pagina: **24px** mobile, 28 tablet, 32 desktop.
- **Deroga device-corti (rev. 3.1):** nel solo regime viewport height ≤ 700px sono ammessi i passi intermedi **10** e **14** (scala compressa della home, v. §7.1).
- **Raggi:** card 24 · sheet 28 (solo top) · tile 22 · righe-lista 18 · pill/tasti-testo 999 · tasto primario 20. Nessun altro raggio.
- **Touch target: minimo 44×44px SEMPRE** (HIG); i target primari dell'app sono 50-92px. Hit-area può eccedere il visibile (es. tasto + Ø92 visibile, 110 attivo).

### 4.3 Materia (superfici e profondità) — light
| Token | Valore | Uso |
|---|---|---|
| `--sh-card` | `0 1px 0 rgba(255,255,255,.9) inset, 0 2px 3px rgba(50,40,25,.05), 0 16px 30px -18px rgba(50,40,25,.35)` | ogni superficie carta |
| `--sh-press` | `0 4px 0 rgba(50,40,25,.12), 0 14px 24px -14px rgba(50,40,25,.3), inset 0 1px 0 rgba(255,255,255,.9)` | tasti tondi neutri (back, menu) |
| grana | SVG feTurbulence baseFrequency .85, tile 180px | overlay a schermo intero, `opacity .05` light (multiply) / `.06` dark (screen), `pointer-events:none`, SEMPRE su elemento fixed (mai su container scrollanti — performance) |
- Il bianco nelle shadow non supera mai `rgba(255,255,255,.9)` inset 1px (niente gloss).
- **Vietate** ombre dure, bordi grigi 1px `#ccc`, blur/glassmorphism (il vetro non è materia di questo sistema; unica eccezione: scrim dei dialog §5.17).

### 4.4 Iconografia
- Icone: line SVG, stroke **1.7px**, round cap/join, griglia 24. I glifi dei tipi-lavoro (corona, ponte, protesi, scheletrato, riparazione) sono asset di sistema in `src/design-system/glifi/` — disegnati una volta, riusati ovunque.
- **Emoji ammesse SOLO** come icone di sezione in "Tutto il resto" e nei documenti chat del portale. MAI dentro testi, MAI come stato.
- Frecce: `›` per "entra", `‹` per "indietro", `→` solo su azioni esterne (WhatsApp).

---

## 5. Componenti — anatomia e vincoli

> Ogni componente vive in `src/components/ds/` (nuova cartella v3), uno per file, con il nome qui definito. Le misure sono in px, NON negoziabili. Stati obbligatori per tutti: default, pressed, disabled, focus-visible (anello 2px `--blue` offset 2).

### 5.1 `TastoPrimario` — il tasto fisico
- H **70** (60 desktop) · radius 20 · full-width (max 480) · testo 21/800/+0.04em MAIUSCOLO.
- Facce: `linear-gradient(180deg,#F2263A,--red 55%,#B00010)` · corsa: `0 6px 0 --red-dark` + ombra ambiente.
- **Pressed:** `translateY(5px)` + corsa a 1px + scala .995 — molla `press` (§8). Suono `tap-giu/tap-su` + haptic medium (Android).
- **Disabled: mai nascosto.** Faccia `--bg-deep`, testo `--faint`, e una riga `callout` accanto che spiega cosa manca ("Completa il controllo finale per consegnare").
- **UNO per schermata, massimo.** Etichetta = verbo del banco: CONSEGNA, FATTO, RIORDINA.

### 5.2 `TastoPiu` — «il punto rosso» *(rev. 2 — 09/07, variante B scelta da Francesco su mockup `docs/design/mockups/2026-07-09-tastopiu-v3-due-varianti.html` — che è la FONTE DI VERITÀ visiva: i valori CSS della classe `.tpB` sono legge, riportati qui in sintesi)*
- Ø **92** visibile (hit 110), pulsante fisico a membrana in tre corpi. La ghiera è **tono-su-tono con la carta** (il pulsante *affiora* dal fondo, non se ne stacca); la firma è il **glifo + rosso UÀ — l'unico rosso della home**.
  - **Ghiera**: Ø 92 · `linear-gradient(170deg, #F9F5EC, #EFE9DC 60%, #E2DACA)` · ombra ambiente `0 16px 28px rgba(52,42,26,.20), 0 5px 10px rgba(52,42,26,.12)` + smusso `inset 0 1.5px 1px rgba(255,255,255,.9), inset 0 -2px 3px rgba(52,42,26,.08)`.
  - **Solco**: anello a inset 11px · `linear-gradient(180deg, #DAD2C2, #ECE6DA)` · `inset 0 1.5px 2.5px rgba(52,42,26,.24), inset 0 -1px 1px rgba(255,255,255,.5)`.
  - **Cappello** (si preme): inset 14px, bombato · `radial-gradient(circle at 50% 28%, #FFFFFF, #FEFCF8 40%, #F5F0E6 75%, #EBE4D4)` · `0 3px 6px rgba(52,42,26,.18), inset 0 2px 2px #FFF, inset 0 -4px 8px rgba(52,42,26,.06)`.
- Glifo `+`: ~42px, peso 350, **`--red`**, `text-shadow 0 1px 0 rgba(255,255,255,.7)` (inciso nella carta). Etichetta sotto 17.5/800 `--ink`.
- **Pressed:** SOLO il cappello affonda — `translateY(2.5px)` + scala .972, ombra→`inset 0 3px 7px rgba(52,42,26,.15)`, glifo → `--red-dark`; la ghiera si assesta appena (ombra ambiente ridotta); molla `press`; suono `tap` + haptic medium.
- **Dark (flat, superfici che affiorano):** ghiera `linear-gradient(170deg, #2B261E, #241F17 60%, #1D1912)` + `inset 0 1px 0 rgba(255,255,255,.06)`, solco `linear-gradient(180deg, #131009, #1B1710)`, cappello `radial-gradient(circle at 50% 28%, #37312A, #2E2921 55%, #252017)`, glifo `--red` dark (#FF3B44), pressed → #E8323B. Unica ombra esterna ammessa: `0 10px 22px rgba(0,0,0,.4)` (alone, non rilievo).
- Posizione: **in basso al centro della home, sempre**. Non esiste in nessun'altra schermata (L1: il "nuovo" si fa dalla home).
- Al tocco: si preme (molla `press`), poi **morph continuo** nel wizard (§8.3.2).

### 5.3 `TastoSecondario` — H 58 · radius 18 · faccia `--card` + `--sh-press` · testo 17/700 `--ink`. Per azioni non primarie ("Apri il lavoro").
### 5.4 `PillFase` (FATTA ✓) — H 44 · pill · gradiente verde `linear-gradient(180deg, #1F8544, #166B39)` · corsa 3px `#14602C` (invariata) · testo 14.5/800 bianco. Suono `fatta` + notification-success (Android). **Nota (rev. 3.1):** stop PINNATI in hex, MAI `var(--green)` come faccia (in dark risolveva a #34C468: bianco 2.27 ✗); era `#269950→--green`.
### 5.5 `LinkQuieto` — solo testo 14.5/muted sottolineato (underline-offset 3). RISERVATO alle vie di fuga (L6): "Aspetta, annulla la consegna".
- **Nota (emendamento 20/07/2026, ondata A):** riserva estesa anche alle azioni rare e quiete, non solo alle vie di fuga — es. «Esci» in fondo a ☰ Tutto il resto (§7.16), seguito da `DialogConferma` pre-logout (§5.17).
### 5.6 `TastoTondo` (back/menu) — Ø 50 · `--card`+`--sh-press` · glifo 19-21/800. Back sempre in alto a sinistra, menu (☰/⋯) in alto a destra. Nient'altro nell'header.

### 5.7 `Pila` (home)
- Card 24 · padding 20/22 · flex: **numero display 52 tabulare** (min-width 60, centrato) + colonna testo.
- Colonna: `label` 13/800/+0.16em colore-famiglia + `sub` 16/600 muted **max 1 riga con ellissi** (il dato più utile: il prossimo lavoro, non un riassunto).
- «Le pile sono SEMPRE **quattro**, sempre queste, sempre in quest'ordine: 1 rossa (Da consegnare oggi) · 2 ambra (Sul banco) · **3 viola (Da rifare / In prova)** · 4 blu (Appena arrivati).» (rev. 3.1: era «sempre tre»). Pila vuota: numero `0` e sub "Tutte consegnate ✓" — mai nascosta.
- **Regola subline (rev. 3.1):** «una riga; il numero lavoro sempre per primo; ellissi ammessa SOLO sulla coda descrittiva — il dato essenziale non si tronca mai a metà (es. "alle 16", non "alle 16:0…")».
- Tap: tutta la card → espansione morph nella lista (§8.3.1).

### 5.8 `CardLavoro` (nelle liste)
- Card 24 · padding 20/22 · riga 1: `n.147` (heading 21/800, prefisso `LAVORO` caption faint) + `PillTempo` a destra · riga 2: dentista+PZ 17.5/700 · riga 3: tipo lavoro 15.5/600 muted · riga 4 (SOLO primo elemento della pila rossa): `TastoConsegnaInline` H 54.
- **Massimo 4 righe.** Niente progress bar, niente icone stato aggiuntive: la pila di provenienza È lo stato.
- **Nota (emendamento 20/07/2026, ondata A):** riga 1 ospita anche la targa-cassetta, in **co-identità** col blocco lavoro — «CASSETTA C12» 21/800 su `--bg-deep` con inset `--line`, gemella visiva del blocco lavoro. Se il lavoro non è assegnato a una cassetta, il blocco è **assente** (nessun placeholder). Troncamento ~6 caratteri + ellissi; screen reader legge «Cassetta C12». Catena dati da estendere: `getPileHome` → `LavoroPila` → `CardLavoro`.

### 5.9 `PillTempo` / `PillStato`
- Pill · padding 7/13 · 15/800 (PillTempo) o 13.5/800/+0.1em (PillStato) · sfondo tint + testo colore famiglia.
- Vocabolario stati (chiuso, §2.3): DA CONSEGNARE · OGGI·hh:mm · IN FORNO · IN RIFINITURA · APPENA ARRIVATO · PRONTA ✓ · CONSEGNATO ✓ · DA INCASSARE · INCASSATA ✓ · INVIATA ✓ · STA PER FINIRE · **IN PROVA** (famiglia viola) · **FERMO** · **DA IERI** · **−N GIORNI** (PillTempo negative, famiglia rossa) (rev. 3.1).
- **Nota (rev. 3.1):** per i lavori in lavorazione la PillStato mostra la fase corrente del ciclo del lab (MAIUSCOLA), `STA PER FINIRE` sull'ultima fase (rev. 3.1 — P6 piano Ondata 1).
- **Nota (emendamento 20/07/2026, ondata A):** nelle righe di «Persone» (§7.14) compare la pill «PRRC ✓» — famiglia verde di PillTempo — sul tecnico designato.

### 5.10 `RigaDato` (schede)
- Dentro `CardInfo` (card 22, padding 4/20): righe `padding 9px 0`, separatore 1.5 `--line`.
- Chiave: caption 12.5/800 MAIUSCOLA `--faint` a sinistra. Valore: 17/700 `--ink` allineato a destra (sub-valore 14/500 muted sotto).
- **Max 5 righe per card.** L'unico valore che può essere rosso è la consegna imminente (≤ domani).

### 5.11 `RigaFase`
- Riga: `CheckTondo` Ø 31 (fatto: `--green-tint` + check 3px; da fare: cerchio dashed 2.5 `#CBC1B0`) + nome 17/700 (fatto: 17/600 muted, MAI barrato) + sotto 13.5 faint "chi · quando" + `PillFase` a destra SOLO sulla prossima fase da fare.
- **Una sola fase alla volta mostra il tasto FATTA** (la prima non completata). Le altre future sono elencate senza azione.

### 5.12 `TileScelta` (wizard)
- Card 22 · padding 20/12/17 · centrato · avatar Ø 60 (iniziali 21/800 bianco su colore) o glifo 64 in quadrato 20 tint · nome 17.5/700 · sotto 13 faint (frequenza: "12 lavori a giugno").
- Griglia 2 colonne, gap 15. **Massimo 4 tile + 1 "Nuovo" dashed + 1 riga-cerca.** L'ordinamento è per frequenza d'uso (ultimi 30 giorni).
- `TileNuovo`: bordo dashed 2.5 `#CBC1B0`, niente ombra.

### 5.13 `RigaCerca` — H 58 · card 18 · `🔍 Cerca fra tutti i N …` 17/600 muted. Aprendola: tastiera subito su, risultati come `TileScelta` in lista. Ricerca sempre per contains, tollerante alle maiuscole/accenti.
### 5.14 Avatar — Ø 60 (tile) / 46 (liste, portale). Colore deterministico dal nome (palette: blue `#1D5FBF`, purple `#7A4DB8`, teal `#0E8A6B`, amber `#9A5C00`, rose `#C24E7A`, slate `#8A8580`) + iniziali. Nessuna foto. **Nota (rev. 3.1):** il divieto "viola solo avatar" decade: `--purple #7C3F9C` è famiglia di stato — i due viola restano valori distinti.
### 5.15 `PillVoce` — «la pill di carta» *(rev. 2 — 09/07, variante A scelta da Francesco su mockup `docs/design/mockups/2026-07-09-pillvoce-v2-due-varianti.html`, classe `.pvA` = FONTE DI VERITÀ visiva)*
- H 64 · pill · **carta che affiora**: `linear-gradient(180deg, #FFFEFA, #F5F0E6)` · testo `--ink` 17.5/700 (invariato — piace) · ombra `0 6px 14px rgba(52,42,26,.16), 0 2px 4px rgba(52,42,26,.10)` + `inset 0 1.5px 1px rgba(255,255,255,.95), inset 0 -2px 3px rgba(52,42,26,.07)`.
- **CerchioMic** Ø 46 a destra: gradiente rosso del TastoPrimario (`#F2263A, #D90012 55%, #B00010`) · glifo mic bianco · `0 2px 5px rgba(176,0,16,.35), inset 0 1.5px 1px rgba(255,255,255,.35)`. Il rosso = "qui si registra" (grammatica: il rosso è dove nascono le cose; la regola «unico rosso della home» resta intatta — la PillVoce vive nel wizard, non nella home).
- **Pressed:** `translateY(2px)` + ombre→inset; **MAI scale sul contenuto** (il glitch del testo veniva da lì — vietato per legge). Suono `tap` + `vibra('light')` all'avvio ascolto (invariati).
- **In ascolto:** testo «Ti ascolto…» + cerchio rosso che respira (`opacity 1→.35`, 1.6s ease-in-out infinite — opacity-only, ammessa §8.4).
- **Dark:** pill `linear-gradient(180deg, #2B2620, #211D18)` + `inset 0 1px 0 rgba(255,255,255,.07), 0 8px 18px rgba(0,0,0,.4)` · cerchio rosso dark `#FF4C55, #FF3B44 55%, #C41822`.
- Presente in OGNI passo del wizard, sempre in fondo. Attiva Web Speech API; il parlato compila i passi e mostra cosa ha capito, chiedendo conferma.
### 5.16 `Sheet` (bottom sheet)
- Sale dal basso, radius 28 top, grabber 36×4 `--line` centrato a 8px dal bordo. Copre max 92% viewport; la vista sotto scala a .96 e scurisce (scrim `rgba(29,25,19,.35)`).
- Molla `smooth` (§8) · dismiss: swipe giù o tap scrim o `LinkQuieto` "Chiudi". MAI una X sola come unica uscita.
- **Su mobile OGNI form/creazione/modifica è uno sheet o un wizard full-screen — mai modal centrato** (invariante progetto).
### 5.17 `DialogConferma` (solo azioni distruttive/irreversibili)
- Card centrata max 340 · scrim come sheet · titolo 21/800 · testo 15.5 con **l'oggetto esplicito** ("Butto via il lavoro n.148 di Studio Bianchi?") · 2 azioni: distruttiva (TastoPrimario rosso) + "No, tienilo" (TastoSecondario). Ordine: sicura sopra, distruttiva sotto.
- **Deroga (rev. 3.1):** per azioni NON distruttive (conferma di consegna) l'ordine si inverte — primario sopra, via di fuga sotto.
### 5.18 `Avviso` (toast)
- Card 18 in alto, entra con molla `snappy`, esce da sola dopo 4s (persiste su hover/focus). Icona famiglia + testo 15.5/700 max 2 righe + eventuale azione inline ("Annulla").
- **L'avviso di errore non scompare da solo.** Testo: cosa non è riuscito + cosa fare ("Non sono riuscita a salvare. Controlla la connessione e riprova").
### 5.19 `RigaAgenda` — orario 16.5/800 tabulare (min-width 56) + cosa 15.5/600 (+sub 13.5 muted) + `PillTipo` (CONSEGNA rossa / RITIRO blu). Giorno-card 20 con intestazione `OGGI` 16/800 (rossa se oggi, card bordata inset 2.5 `--red`).
### 5.20 `BarraMateriale` — nome 17.5/700 + quantità 15/800 colore-livello · barra H 10 pill `--bg-deep` + fill colore (verde >40% · ambra 15-40% · rosso <15%) · nota 13.5 sotto (rossa+`RIORDINA →` pill se rosso).
### 5.21 `EroeTuttoAPosto` — card centrata: check Ø 54 tint verde + titolo 20/800 "…: tutto a posto" + 2 righe 15/muted coi numeri. È la PRIMA cosa in Fatture/Documenti quando non serve nulla (L5: il sollievo si mostra).
### 5.22 `CardUAHaFatto` — card 22, titolo caption "UÀ HA GIÀ FATTO PER TE", righe: check Ø 30 tint + nome 16.5/700 + sub 14/500. Compare dopo ogni automazione multipla (consegna) e in "Tutto il resto" come descrizione delle sezioni.
### 5.23 `NotaDentista` — barra verticale 3.5 `--blue` + testo 15/600 muted `"[citazione]" — Dr. X`. Max 2 righe, tap espande in sheet. È l'UNICO residuo visivo del mondo-chat dentro l'app.
### 5.24 `StrisciaStato` (home) — check Ø 26 tint verde + 14.5/muted con grassetti `--ink`. Se serve attenzione: icona famiglia e testo che INIZIA col da farsi ("Firma il DdC di n.144 →" tap = azione).
- **Nota (emendamento 20/07/2026, ondata A):** terzo tono `ambra` — segnale trial, visibile SOLO a `titolare`/`admin_rete`: CTA «Attiva ›» sempre presente, diventa rossa a ≤3 giorni dalla scadenza. **Gerarchia di precedenza** fra i toni: allarmi operativi > trial > sereni. Scaduto/sospeso restano i redirect esistenti (invariato, rispetta B15).
### 5.25 Caricamento — **niente spinner.** Skeleton carta (blocchi `--bg-deep` che pulsano opacità 0.6→1, 1.2s) con la STESSA geometria del contenuto atteso. Oltre 3s: riga "Un attimo…". Ottimismo di default: le scritture mostrano subito il risultato e riconciliano dopo (con Avviso se fallisce, L6).
### 5.26 Vuoti — mai pagina bianca: glifo 64 + titolo 21/800 + UNA riga guida + eventuale azione ("Nessun lavoro sul banco. Goditi il caffè ☕" / "Il primo dentista si aggiunge dal tasto +").
### 5.27 Input testo/numero/data — usati SOLO dentro wizard e sheet: H 64 · card 18 · testo 19/700 · label sopra 13/800 MAIUSCOLA faint · focus: anello 2 `--blue`. Data: mai calendario a griglia come default — scelte rapide ("Oggi · Domani · Lun 14 · Scegli…"). Numero/importo: tastierino numerico nativo (`inputmode`).

### 5.28 `MorphPila` (rev. 3.1) — header di pila aperta (stato morphato di §8.3.1): numero display 52/800 tabulare colore-famiglia (min-width 56) + label 13/800/+0.16em colore-famiglia + sub 16/600 muted, max 1 riga con ellissi. Fonte di verità visiva: `pila-aperta.html` classe `.morph`.
### 5.29 `TastoWhatsApp` (rev. 3.1) — H 62 · full-width (max 480) · radius 18 · gradiente §3.3 regola 4 emendato (`linear-gradient(180deg, #208650, #17663A)`) · corsa `0 5px 0 #0E4A28` + ombra ambiente · pressed `translateY(4px)` + corsa a 1px. Riservato ESCLUSIVAMENTE alle azioni «apri WhatsApp». Fonte di verità visiva: `consegna.html` classe `.wa-btn` (l'implementazione React arriva in Ondata 4b).
### 5.30 `RigaBloccante` (rev. 3.1) — riga tappabile del sheet «Prima di consegnare»: SOLO i bloccanti, ciascuno tappabile · padding 16/18 · radius 18 · sfondo `--amber-tint` · icona Ø34 tondo tint+colore famiglia (`--amber-tint`/`--amber`) · testo "cosa" 16/700 `--ink` + "cosa fare" 14/700 colore-famiglia + chevron colore-famiglia. Fonte di verità visiva: `consegna.html` classe `.bloccante` (React in 4b).
### 5.31 `ChipScelta` (rev. 3.1) — chip di decisione rapida del wizard: min-height 48 · padding 0/20 · radius 999 · testo 16/700 · faccia `--card` + `--sh-press` · selezionata: sfondo `--green-tint` + testo `--green` (senza ombra) + check 3px. Fonte di verità visiva: `wizard.html` §7.3 (CampoData a scelte rapide); anatomia copiata verbatim in `scheda-lavoro.html` classe `.chip` (React in Ondata 2).
### 5.32 `ProgressDots` (rev. 3.1) — dots wizard: Ø 11 · gap 8 · upcoming `--line` · fatti verdi (`--green`) · attivo 30px largo `--red`. Fonte di verità visiva: `wizard.html` classe `.dots .dot` (React in Ondata 2).
### 5.33 `FotoStrip` (rev. 3.1) — strip thumbnail orizzontale: thumb 72×72 · radius 12 · cornice interna 1px inset · max 1 riga scrollabile. Fonte di verità visiva: `scheda-lavoro.html` classe `.foto-strip`/`.foto-thumb` (React in Ondata 3).
### 5.34 `MenuVoce` (rev. 3.1) — voce del menu ⋯ della scheda: min-height 56 · icona Ø38 radius 11 tint neutra (`--bg-deep`+`--muted`) · testo 17/700 `--ink` · separatore 1.5 `--line` fra le voci · chevron `--faint` · variante `.butta` (distruttiva): colore `--red`, icona `--red-tint`/`--red`, separata in alto da `--line` con margine extra. Fonte di verità visiva: `scheda-lavoro.html` classe `.menu-voce` (React in Ondata 3).
### 5.35 `NavDesk` (rev. 3.1) — nav desktop 240px `--bg-deep`: logo `UÀ.` 26/800 (punto rosso) · «+ Nuovo lavoro» TastoPrimario H 52 · voci H 48 radius 12 (16/600 muted; selezionata: bg `--bg` ink 700) · badge 24px pill (tint famiglia per le pile — rossa/ambra/viola/blu, neutro `--bg-deep`+inset line per le sezioni) · footer StrisciaStato. Fonte di verità visiva: `home.html` classe `.nav-desk`.
- **Nota (emendamento 20/07/2026, ondata A):** footer arricchito con una riga identità (Avatar Ø32, §5.14 + nome + lab, non tappabile) e «Esci» inline (`LinkQuieto`, §5.5, `DialogConferma` pre-logout), sopra la StrisciaStato.

> **Emendamento 16/07/2026 (D-4):** il tasto «+ Nuovo lavoro» è una variante fisica locale H52/testo 16 (stessa faccia/corsa/suono del TastoPrimario, taglia propria) — NON riusa TastoPrimario (H fissa 70/60; a 1280 coesisterebbe col CONSEGNA di SchedaAnteprima violando «UNO per schermata» §5.1). Decisione visiva su mockup docs/design/mockups/2026-07-16-navdesk-tasto-varianti.html, variante A.

Ogni sezione §5.28-5.35 cita il mockup sorgente come fonte di verità visiva, coerentemente con §5.2 e §5.15.

---

## 6. Architettura dell'informazione

### 6.1 La mappa (tutta l'app)
```
HOME (l'app)                          ☰ TUTTO IL RESTO
├── Pila: Da consegnare oggi          ├── Dentisti (rubrica → scheda dentista → suoi lavori, portale)
│    └── Scheda lavoro                ├── Fatture (tutto-a-posto → lista → dettaglio)
├── Pila: Sul banco                   ├── Magazzino (barre → dettaglio → riordino)
│    └── Scheda lavoro                ├── Agenda (settimana → giorno)
├── Pila: Da rifare / In prova        ├── Documenti e qualità (DdC, Schede fabbricazione,
│    └── Scheda lavoro                  │    PMS/PSUR, rischi, incidenti, registri MDR)
├── Pila: Appena arrivati             ├── Persone (tecnici, inviti, ruoli)
│    └── Conferma lavoro              ├── Listino
└── [+] Nuovo lavoro (wizard)         ├── La mia rete (se admin_rete)
                                      └── Il mio laboratorio (profilo, PEC, abbonamento,
CONSEGNA (flusso sacro)                    aspetto, suoni, tema)
lavoro → CONSEGNA → conferma
→ Consegnato! + UÀ-ha-fatto
→ WhatsApp esplicito
```
- **La home è sacra:** quattro pile (rossa · ambra · viola · blu, §5.7 — rev. 3.1) + tasto + striscia stato + ☰. Nessun KPI, nessun banner, nessuna novità potrà MAI essere aggiunta alla home (vincolo assoluto — le "novità" vivono nella striscia di stato, una alla volta).
- **Profondità massima: 3 livelli** (home → pila → scheda). Tutto il resto: ☰ → sezione → dettaglio.
- Route: le route Next.js esistenti restano (nessuna migrazione URL); cambia il contenuto.
- **Nota (emendamento 20/07/2026, ondata A):** il vincolo assoluto resta — nessun KPI/banner/novità DENTRO una stanza. L'unica eccezione ammessa è l'aggiunta di una seconda stanza intera (Parete, annuncio §7.1/§3.3 regola 5): non un elemento nella home esistente, ma un'altra home affiancata, raggiunta per swipe.
- **Nota (emendamento 20/07/2026, ondata A) — morte di «Le pile»:** la vista bare `/lavori` (senza `pila`) non esiste più — `if (!pila) redirect('/dashboard')`. I chiamanti legacy (BottomNavPill tab Lavori, SchedaNavRail, SchedaLavoroV3, fatture) ripuntano a `/dashboard`. Il match `'/lavori'` in `route-migrate-v3.ts` resta (non si tocca).
- **Nota (emendamento 20/07/2026, ondata A) — voce «Le cassette»:** con l'arrivo della Parete delle Cassette, ☰ Tutto il resto guadagna la voce «Le cassette» (route propria `/cassette`), raggiungibile anche da shortcut PWA e da NavDesk/rail desktop senza passare dalla home.

### 6.2 Navigazione
- Back `‹` sempre in alto a sinistra; il gesto browser-back DEVE sempre funzionare (PWA history coerente).
- **Niente tab bar.** La BottomNavPill v2 è eliminata: il pollice in basso appartiene al tasto + (home) o al TastoPrimario (schede).
- Il menu ☰ apre "Tutto il resto" come pagina (non drawer).
- **Nota (emendamento 20/07/2026, ondata A):** il back dalla pila aperta torna sempre a `/dashboard` — con «Le pile» eliminata (§6.1) la provenienza è unica (home), nessun contatore di provenienza da mantenere.

### 6.3 Errori, offline, permessi
- Offline: striscia persistente ambra sotto la status bar "Sei senza rete — salvo tutto appena torna" + coda di scritture locale. MAI bloccare la lettura.
- Errore di scrittura: Avviso persistente (§5.18) + retry manuale. MAI perdere l'input dell'utente.
- Permessi (mic, notifiche): chiesti SOLO nel momento d'uso, con una frase del banco prima del prompt di sistema ("Per dettare serve il microfono").

---

## 7. Le pagine (spec per schermata)

> Per OGNI pagina valgono i 3 progetti viewport (§12): 390 (progetto primario), 768 (split-view), 1280 (tre pannelli). Qui: contenuto, gerarchia e vincoli. Mockup di riferimento: `2026-07-07-redesign-A-materico-full.html` (§frame indicati).

### 7.1 Home (`/dashboard` → concettualmente "l'app") — frame 1
- Eyebrow data + `Buongiorno/Buonasera, [nome]` (large-title) + ☰ · StrisciaStato · 4 Pile · TastoPiù.
- Il saluto segue l'ora (5-12 Buongiorno, 12-18 Buon pomeriggio, 18+ Buonasera). NIENT'ALTRO. Vincolo: la home non scrolla mai (calibrata su 844×390; se il device è più corto, si riducono i gap, non si aggiunge scroll).
- **Scala device-corti (rev. 3.1, dal commento di `home.html`):** viewport height ≤ 700 → numero pila 52→**42** · padding pila 20/22→14/18 · gap pile 16→10 · gap blocchi 16→10 · padding pagina 24→14 · gap foot 8→6; larghezze, raggi, corpi ≥ heading e TastoPiù invariati.
- **Nota (emendamento 20/07/2026, ondata A) — home a due stanze:** annuncio, implementazione con la Parete delle Cassette (feature a sé, percorso formale completo). La home guadagna una seconda stanza (Parete) raggiungibile per swipe orizzontale dalle Pile, con dots di posizione e peek del bordo; TastoPiù presente identico in entrambe le stanze (§3.3 regola 5). Preferenza utente «La tua home» (§7.16): solo Pile / solo Parete / due stanze — default due stanze.

### 7.2 Pila aperta (liste lavori) — frame 2
- Titolo colore-famiglia + sub coi numeri utili ("2 lavori · il più vicino alle 16:00") · CardLavoro impilate, ordinate per urgenza · il PRIMO elemento della pila rossa porta il TastoConsegnaInline.
- "Appena arrivati": la card ha CTA "Conferma" che apre il wizard di conferma (data consegna proposta da UÀ, L5).
- **Nota (rev. 3.1):** i 4 raggruppamenti della home (rossa · ambra · viola · blu) valgono anche nella pila aperta / vista «Le pile».
- **Nota (emendamento 20/07/2026, ondata A):** «Le pile» come vista bare è **eliminata** — `/lavori` senza `pila` fa redirect a `/dashboard` (§6.1). Il back della pila aperta torna a `/dashboard` (§6.2).

### 7.3 Wizard "Nuovo lavoro" (dal TastoPiù) — frames 3-4
- Passi: **1 Dentista → 2 Tipo lavoro → 3 Paziente e dettagli (tutto opzionale) → Fatto.** Percorso minimo **3 tocchi**: tile dentista → tile tipo → TastoPrimario «Fotografa impronta e prescrizione» (rev. 3.2 — il piano Ondata 0 ne contava 4 col chip «Va bene ✓», rimosso su advisor UX, deviazione B7-2 ratificata 12/07). Ogni passo: back + ProgressDots (§5.32) + domanda (token `question` 35/800) + hint + griglia/`RigaCerca` + PillVoce.
- **Passo 2 = tassonomia granulare** (rev. 3.2, spec Ondata 2 §3): i tile mostrano i TIPI GRANULARI (`tipi-lavoro.ts`, 38 voci in 10 famiglie macro, ordinati per frequenza 30gg del lab); la macro resta il dominio di `lavori.tipo_dispositivo`; `descrizione` = label granulare; classe di rischio default per tipo.
- "Fatto!": check grande + riepilogo + **consegna suggerita RISOLTA** (rev. 3.2 — riga informativa + LinkQuieto «Cambia data» → sheet con ChipScelta §5.31 + CampoData §5.27) + TastoPrimario «Fotografa impronta e prescrizione» + LinkQuieto home. NIENTE chip di scelta sulla vista (L1: una decisione).
- Abbandono: stato in localStorage 24h; alla riapertura sheet «Riprendo da dove eri? / Ricomincia da capo» (frame 5 mockup).

### 7.4 Scheda lavoro (`/lavori/[id]`) — frame 2 del file A-materico-full
- Header: back, ⋯ (menu: modifica, foto, documenti, butta via) · `n.147` + PillStato · CardInfo (4-5 RigheDato: dentista, paziente, lavoro, consegna) · NotaDentista (se esiste) · CardFasi (RigheFase) · TastoPrimario CONSEGNA (visibile SOLO quando tutte le fasi sono fatte; altrimenti disabled con spiegazione §5.1).
- Le foto vivono dietro ⋯ o come strip orizzontale sotto la CardInfo SE presenti (thumbnail 72, radius 12, max 1 riga scrollabile).
- ⚠️ MDR: i dati clinici/di fase restano read-only qui — le modifiche passano dai flussi dedicati esistenti (nessun cambiamento alle API).

### 7.5 Flusso Consegna (sacro) — frames 6
- Tap CONSEGNA → DialogConferma leggera: "Corona n.147 al Dr. Esposito?" (+ CONSEGNA / "Non ancora") → orchestrazione con skeleton (max 3s percepiti) → **Consegnato!**: check che si disegna (§8.3.4) + suono UÀ + CardUAHaFatto (DdC, fattura, magazzino — SOLO cose realmente avvenute, L5) + bottone WhatsApp verde esplicito (invariante: mai auto-popup) + LinkQuieto "Aspetta, annulla la consegna" (attivo 10 minuti, poi sparisce — coerente con vincoli fiscali: dopo l'invio SDI l'annullo spiega il limite).

### 7.6 Agenda — frame 3 · settimana come giorni-card; oggi bordato rosso; RigheAgenda; giorni vuoti dichiarati ("giornata di banco"). Tap evento → scheda lavoro. Vista mese: VIETATA (una settimana alla volta, si scorre).
### 7.7 Dentisti — lista `TileScelta`-like a righe (avatar 46 + nome 18/700 + "ultimo lavoro: …" 14 muted) + cerca + "Nuovo dentista". Scheda dentista: RigheDato (telefono→tap chiama, studio) + TastoSecondario "Apri il suo portale" + "Scrivi su WhatsApp" verde + i suoi lavori come CardLavoro.
### 7.8 Pazienti — SOLO codici PZ + dentista di riferimento + lavori collegati. Nessun dato clinico in lista.
### 7.9 Fatture — frame 5 · EroeTuttoAPosto mensile + RigheFattura (doc 42 + chi + n./data + importo 17/800 + PillStato). Dettaglio: RigheDato + "Scarica PDF/XML" (TastoSecondario) + timeline SDI in parole del banco ("Inviata ✓ · Consegnata al dentista ✓").
### 7.10 Magazzino — frame 4 · BarreMateriale ordinate: prima i rossi, poi ambra, poi verdi · footer "Ieri UÀ ha scaricato da sola N materiali ✓". Dettaglio materiale: movimenti come righe semplici, "Riordina" precompila l'ordine WhatsApp/email al fornitore.
### 7.11 Ordini fornitori — lista ordini con PillStato (DA INVIARE / INVIATO / ARRIVATO) + creazione via sheet (fornitore → materiali → invia WhatsApp/email espliciti).
### 7.12 Listino — righe: lavorazione + prezzo 17/800 tabulare + modifica via sheet (tastierino). I tier restano funzioni esistenti presentate come "Listini per studio".
### 7.13 Documenti e qualità — hub a card-sezione (come "Tutto il resto"): Dichiarazioni di Conformità · Schede di fabbricazione · Sorveglianza post-vendita (PMS/PSUR — la distinzione per classe sarà definita da B20; questa spec impone SOLO la veste: EroeTuttoAPosto + righe-documento + scadenze come RigheAgenda) · Rischi per tipo dispositivo · Incidenti. Ogni documento: riga con PillStato (PRONTO ✓ / DA FIRMARE / SCADE …).
### 7.14 Persone — righe con avatar + ruolo in parole del banco (Titolare, Tecnico, Banco accettazione) + invito via sheet.
- **Nota (emendamento 20/07/2026, ondata A):** pagina migrata INTERA a v3 come «Persone» (era `/tecnici`) — card «I cedolini · [mese] [anno] · Scarica (CSV)» in testa (RBAC titolare/admin_rete, `TastoSecondario` H58; mese vuoto → avviso) · righe con `Avatar` (§5.14) e pill «PRRC ✓» (§5.9) · scheda persona = `Sheet` v3 (nessuna route nuova) · UI invito rifatta (`/api/tecnici/invite` non si tocca). Chrome v3 di pagina-lista nato qui: promozione a componente `ds` condiviso calendarizzata in **ondata B** (§14).
### 7.15 La mia rete — solo per `admin_rete`: lista lab + inviti (veste standard, nessun componente nuovo).
### 7.16 Il mio laboratorio — righe-sezione: Profilo e dati fiscali · PEC · Abbonamento (card piano + PillStato ATTIVO ✓; MAI banner contraddittori — regola B15) · **Aspetto** (tema Chiaro/Scuro/Automatico) · **Suoni e vibrazione** (interruttore + anteprima suoni) · Assistenza.
- **Nota (emendamento 20/07/2026, ondata A) — «I tuoi dati»:** riga «I tuoi dati — Scarica tutti i lavori (CSV)». Nasce con **ondata F1**; interim: API via URL. MAI `getFullYear()` client.
- **Nota (emendamento 20/07/2026, ondata A) — «La tua home»:** annuncio, arriva con la Parete delle Cassette. Preferenza utente: solo Pile / solo Parete / due stanze (default due stanze, §7.1).
- **Nota (emendamento 20/07/2026, ondata A) — «Esci»:** voce `LinkQuieto` (§5.5) in fondo a ☰ Tutto il resto, con identità (nome + lab) come riga non-tappabile sopra e `DialogConferma` (§5.17) pre-logout.
### 7.17 Onboarding — stesso wizard pattern del nuovo lavoro: una domanda a schermo (nome lab → P.IVA → logo → primo dentista → fatto). Alla fine: home vera con StrisciaStato "Benvenuto! Crea il tuo primo lavoro col tasto rosso".
### 7.18 Login/auth — pagina carta minima: logo UÀ. + email/passkey. Passkey (Touch ID) proposta come "Entra col dito" (TastoPrimario); magic link come secondario. Stessi token (le esclusioni v2.3 su `(auth)` decadono: TUTTO migra a v3 tranne `/admin`, che resta fuori scope).
### 7.19 **Portale Dentista** (`/portale/[token]`) — frame 7 — L'ECCEZIONE CHAT
- Header: avatar lab (Ø 46 rosso, iniziali) + nome lab + sotto "il tuo laboratorio odontotecnico".
- Corpo: conversazione. Messaggi del lab a sinistra (bolle `--card`), del dentista a destra (bolle `--green-tint`). Bolle: radius 18 (6 sull'angolo di provenienza), testo 15.5, ora 12 faint. Giorni come day-pill.
- Tipi di messaggio: testo · evento-lavoro generato da UÀ ("La corona per PZ-0231 è pronta ✓") · foto · **documento** (DocBub: icona 38 tint rossa + nome file + "Scarica ↓" blu — dietro: signed URL 5 min, API esistente B5) · richiesta nuovo lavoro (il dentista può chiedere: diventa "Appena arrivato" nel lab).
- Composer: input pill + mic. Il dentista non installa e non accede: link con token (funzionamento attuale immutato).
- Ogni messaggio lab è generato dagli eventi UÀ o scritto dal lab dalla scheda dentista. Notifica al dentista: canali esistenti (WhatsApp deep link).

---

## 8. Motion System v3 (stile Apple — valori di legge)

**File di verità:** `src/design-system/motion.ts` v3 (riscrive l'attuale). Implementazione: Motion 12 (`type:"spring"`, modello percettivo `visualDuration`+`bounce`, nativo di Motion — mapping esatto dalle molle iOS). **VIETATO qualsiasi `duration`/`ease` inline nel codice applicativo.**

### 8.1 Le molle (uniche 5 + instant)
| Token | Parametri Motion 12 | Equivalente iOS | Uso esclusivo |
|---|---|---|---|
| `snappy` | `{type:"spring", visualDuration:0.5, bounce:0.15}` | `.snappy` | default UI: toast, comparse, dots wizard |
| `smooth` | `{type:"spring", visualDuration:0.5, bounce:0}` | `.smooth` | sheet, morph pila→lista, layout |
| `bouncy` | `{type:"spring", visualDuration:0.5, bounce:0.3}` | `.bouncy` | SOLO check FATTA e Consegnato! |
| `press` | `{type:"spring", stiffness:1754, damping:72, mass:1}` | `.interactiveSpring` | pressione/rilascio tasti, drag |
| `wizard` | `{type:"spring", visualDuration:0.35, bounce:0.1}` | push nav (~0.35s) | scivolata fra passi wizard |
| `instant` | nessuna transizione | — | tutto il resto (L7) |
- **Fallback CSS** (dove Motion non c'è): sheet `transform 500ms cubic-bezier(0.32,0.72,0,1)`; generico `200ms cubic-bezier(0.25,0.1,0.25,1)`; snap `cubic-bezier(0.16,1,0.3,1)`. Nessun'altra curva. `linear` SOLO per opacità/colore.

### 8.2 Regole fisiche (dai 4 pilastri WWDC "Fluid Interfaces")
1. **Risposta istantanea:** lo stato pressed appare < 100ms dal touchstart. Mai attendere la fine di un'animazione per accettare input (**vietato `pointer-events:none` durante le transizioni**).
2. **Interrompibile e redirezionabile:** ogni transizione può essere invertita a metà (sheet richiudibile durante l'apertura).
3. **Il momentum si eredita:** un drag rilasciato con velocità la trasferisce alla molla.
4. **Si anima SOLO:** navigazione spaziale (da dove viene una vista) e feedback fisico (pressioni, spunte). MAI: dati che cambiano, contenuto in scroll, hover decorativi, testo.

### 8.3 Le coreografie canoniche (uniche ammesse)
1. **Pila → lista:** la card si espande e diventa l'header della lista (`smooth`, shared element: numero+label); il resto entra sotto. Ritorno: inverso. Reduced-motion: crossfade 150ms.
2. **TastoPiù → wizard:** il cerchio si preme (`press`), il wizard sale come sheet full (`smooth`). Il + resta visivamente "sotto" (il wizard è fisicamente sopra la home).
3. **Passo wizard → passo:** scivolata orizzontale `wizard`, il passo precedente resta al 30% dietro (profondità). Back = inverso.
4. **Consegnato!:** UNICA coreografia composta (totale < 1.4s): check path che si disegna 450ms + `bouncy` sulla scala del cerchio, POI righe CardUAHaFatto a cascata (stagger 80ms, `snappy`), sincronizzata al **picco del suono UÀ** (principio Apple Pay: suono+animazione+haptic condividono l'istante di picco).
5. **Spunta FATTA:** cerchio si riempie `bouncy` (overshoot leggero), la riga si assesta `snappy`.
6. **Sheet su/giù:** `smooth`; la vista sotto scala .96.
- **Ogni altra transizione è `instant`.**

### 8.4 Accessibilità e performance
- `prefers-reduced-motion: reduce` → TUTTE le coreografie diventano dissolvenze 150ms; le pressioni restano (sono feedback, non motion decorativo). Il pattern "mounted guard" esistente resta obbligatorio (hydration).
- Si animano SOLO `transform` e `opacity`. `will-change` solo durante l'animazione. Su device low-end (heuristica: `deviceMemory ≤ 2` o `hardwareConcurrency ≤ 4`): molle sostituite dai fallback CSS brevi.

---

## 9. Sound System (nuovo — `src/design-system/sound.ts`)

### 9.1 La palette (5 suoni, chiusa)
| Nome file | Quando | Carattere | Durata | Abbinamento |
|---|---|---|---|---|
| `tap.wav` | pressione TastoPrimario/PillFase (giù+su) | tocco reale smorzato | 150-270ms | haptic light |
| `fatta.wav` | fase completata | schiocco di dita | 220-360ms | notification-success |
| `ua.wav` | **Consegnato!** — la firma | due note ascendenti calde (terza maggiore), mai squillanti | 400-600ms | notification-success |
| `errore.wav` | errore di scrittura | diniego morbido | 180-350ms | notification-error |
| `arrivo.wav` | nuovo lavoro/messaggio dal portale | piccolo arpeggio caldo | 1100-1600ms | notification-warning |
**Vietato aggiungere suoni senza estendere questa tabella nella spec.** Sorgente: file WAV 48kHz, mono 16-bit PCM, picco normalizzato ~-13dBFS (disciplina di loudness ~-12/-14dBFS), in `public/sounds/`.

**Provenienza (QA live Francesco round 2, 09/07/2026):** `tap`/`fatta`/`arrivo`/`errore` sono campioni reali scelti da Francesco (sorgenti MP3 in `scripts/sounds-src/`), processati da `scripts/process-sounds.mjs` (trim al segmento utile, fade-out breve, resample 48kHz mono 16-bit, normalizzazione di picco). `ua`: sintetizzato da `scripts/generate-sounds.mjs` (unico suono ancora sintetico — "per il resto tutto ok", Francesco). La durata di `arrivo` è più lunga della stima iniziale (<900ms) perché il campione scelto ha un decadimento/riverbero naturale audibile ben oltre quella soglia — misurato, non tagliato in anticipo per rispettare una cifra tonda.

### 9.2 Regole di riproduzione
- Web Audio API (mai `<audio>`): `AudioContext` sbloccato al **primo `touchend`** post-load (regola iOS Safari), buffer precaricati e decodificati.
- **Default: attivi** (decisione Francesco 07/07) · toggle in "Il mio laboratorio → Suoni" (persistito per utente).
- L'interruttore silenzioso iOS NON è rilevabile via web → i suoni non veicolano MAI informazione esclusiva (L3: c'è sempre il visivo).
- Mai suoni in loop, mai più di 1 suono per gesto, `tap` mai su azioni di sola lettura.

### 9.3 Haptics (`src/design-system/haptic.ts` v3) — la verità sul web
- **iOS Safari NON supporta `navigator.vibrate`** (stato 2026, caniuse). Quindi: haptics = progressive enhancement Android; su iPhone il "tatto" si costruisce con molla `press` + suono (compensazione, da ricerca).
- Pattern Android: selection `vibrate(10)` · light `15` · medium `30` · success `[15,80,25]` · error `[40,60,40,60,40]`. Feature-detect obbligatorio; MAI raffiche.

---

## 10. Accessibilità (gate di release)
1. Contrasto AA 4.5:1 per ogni testo, entrambi i temi (validator nel pre-commit §13.4).
2. Touch target ≥ 44px; testo di lettura ≥ 17px; minimo assoluto 12.5px.
3. Colore mai unica fonte (L3): ogni stato ha parola; ogni pila ha etichetta.
4. Text-zoom 200% senza rottura; `prefers-reduced-motion` (§8.4); `prefers-color-scheme` rispettato con override manuale.
5. Screen reader: label in parole del banco ("Consegna la corona numero 147 al dottor Esposito"), `aria-live=polite` su StrisciaStato e Avvisi; focus-visible sempre (anello 2px `--blue`).
6. `htmlFor`/`id` corretti su ogni input (bug noto v2 da non ripetere).

---

## 11. PWA e percezione di velocità
- Launch: splash statico = home skeleton (regola Apple: mai splash animate).
- Prima risposta visiva a QUALSIASI tap < 100ms; navigazioni < 300ms percepiti (skeleton carta).
- Service worker esistente (cache build-id) resta; offline §6.3.
- Immagini: lazy, dimensioni fisse riservate (zero layout shift — CLS 0).

---

## 12. I tre viewport (tre progetti a pari dignità — decisione Francesco 07/07)

### 12.1 Mobile 390 (progetto primario)
Tutto quanto sopra. Colonna singola, pollice in basso, sheet per ogni inserimento.

### 12.2 Tablet 768 — split-view
- **Lista+Dettaglio:** pila/sezione a sinistra (360px fissi), scheda a destra. La home resta a colonna singola centrata (max 480) — le pile NON si affiancano.
- Il wizard resta full-screen (una domanda alla volta anche qui — L1 non si negozia col viewport).
- Sheet → pannello laterale destro (420px) per modifica/creazione dal dettaglio.

### 12.3 Desktop 1280 — tre pannelli (mockup `ds-v3-showcase.html` §05)
- **Navigazione (240px, `--bg-deep`)**: logo + voci con badge numerici (Oggi/Sul banco/Da rifare/Appena arrivati/Agenda/Dentisti/Fatture/Magazzino/Documenti — rev. 3.1: aggiunta «Da rifare», v. §5.35) + footer StrisciaStato. La nav sostituisce home+☰ su desktop.
- **Lista (400px)**: la pila selezionata, CardLavoro compatte, selezione con inset ring 2.5 `--red`.
- **Scheda (flessibile)**: CardInfo + CardFasi affiancate (grid 2col), TastoPrimario 340px in basso a sinistra + nota.
- Tastiera: frecce ↑↓ scorrono la lista, Invio apre, `N` = nuovo lavoro, `/` = cerca. Hover: SOLO su righe-lista (bg `--bg-deep`), mai effetti decorativi.
- Il tasto + su desktop diventa voce "+ Nuovo lavoro" in cima alla nav (TastoPrimario H 52).

---

## 13. Governance — vincoli per OGNI implementazione futura

### 13.1 Processo obbligatorio (nessuna eccezione, nemmeno "piccola")
1. Ogni nuova UI: mockup HTML in `docs/design/mockups/` → screenshot → **approvazione Francesco** → React (invariante 0B di progetto).
2. Ogni schermata nuova DEVE indicare nella PR: quale Legge L1-L7 rischia di violare e come la rispetta.
3. Componenti: si usa SOLO `src/components/ds/`. Se manca un componente → si propone QUI (nuova sezione §5.x con anatomia completa) PRIMA di scriverlo. Un componente non in spec = review respinta.

### 13.2 Divieti assoluti (estende gli anti-slop v2.3)
- ❌ colori/ombre/font/durate/curve inline · ❌ un 6° colore di stato (le 5 famiglie di §3.3 regola 2 sono chiuse — rev. 3.1) · ❌ 2 tasti primari per vista · ❌ modal centrato su mobile (salvo DialogConferma) · ❌ tabelle full-width su mobile · ❌ tab bar · ❌ KPI/banner in home · ❌ spinner · ❌ splash animate · ❌ suoni fuori palette · ❌ animazioni su scroll/dati · ❌ `pointer-events:none` in transizione · ❌ parole del software (§2.3) · ❌ nome paziente in chiaro · ❌ Inter/Roboto/Arial · ❌ gradienti viola-blu · ❌ blur su contenuti scrollanti · ❌ chat UI fuori dal portale.

### 13.3 Definition of Done UI (checklist PR)
`[ ]` token only (0 valori inline) · `[ ]` 3 viewport implementati e screenshot · `[ ]` entrambi i temi · `[ ]` testo ≥17px lettura, target ≥44 · `[ ]` AA verificato · `[ ]` reduced-motion · `[ ]` text-zoom 200% · `[ ]` stati: vuoto/caricamento/errore/offline · `[ ]` parole dal dizionario · `[ ]` L1-L7 dichiarate in PR · `[ ]` suono/haptic SOLO da palette.

### 13.4 Enforcement automatico
`scripts/check-ds-compliance.sh` v3 (da riscrivere): grep su hex/rgb/hsl inline in `src/` (esclusi tokens.ts), `duration:`/`ease` fuori da motion.ts, parole vietate del dizionario nei file UI, `--ua-*`/token v2.3 residui, font-family non-Jakarta, scan anche di `globals.css` (lezione B12). Pre-commit bloccante.

---

## 14. Piano di esecuzione (sotto-progetti, in ordine)
| # | Sotto-progetto | Contenuto | Gate |
|---|---|---|---|
| 1 | **Fondamenta in codice** | tokens.ts v3, motion.ts v3, sound.ts+asset, haptic.ts v3, dizionario.ts, check-ds v3, font swap | tsc/test/build verdi; nessuna pagina migrata |
| 2 | **Componenti core** | `src/components/ds/` completo (§5) + Storybook o pagina-catalogo interna | catalogo approvato da Francesco |
| 3 | **Il cuore** | Home, pile, wizard nuovo lavoro, scheda lavoro, flusso consegna | QA 3 viewport × 2 temi; collaudo Francesco *(rev. 09/07: i collaudi interni sono di Francesco; test sul campo con laboratori pilota rimandati a PWA stabile)* |
| 4 | **Le sezioni** | Agenda, Dentisti, Fatture, Magazzino, Ordini, Listino, Documenti, Persone, Impostazioni | idem, a ondate |
| 5 | **Portale dentista chat** | §7.19 (riusa API B5) | test con dentista reale |
| 6 | **Onboarding+auth** | §7.17-7.18 | idem |
| 7 | **Claude Design sync** | `/design-sync` della libreria `ds/` compilata → claude.ai/design (decisione: "prima i componenti, poi sync") | progetto Claude Design attivo |
- Ogni sotto-progetto: brainstorm→spec figlia→piano→worktree→TDD→review→QA→deploy (workflow standard BP-2). Durante la migrazione, v2.3 e v3 convivono per pagina (flag per route, mai per componente).
- **Nota (emendamento 20/07/2026, ondata A):** il chrome v3 di pagina-lista, nato in «Persone» (§7.14, ondata A), è promosso a componente `ds` condiviso in **ondata B** — nuova sezione §5.x da proporre in quella sede, seguendo il processo §13.1 punto 3.

---

## Appendice A — Decisioni registrate (07/07/2026, Francesco)
1. Esplorazione → fusione → **direzione A pura** («Una cosa alla volta»); B solo nel portale; C abbandonata (troppo caotica).
2. Analogico = materia, non scenografia. 3. Motion/suoni stile Apple. 4. Dark alla pari. 5. Suoni attivi di default. 6. **Tre viewport a pari dignità.** 7. Claude Design: prima componenti, poi sync. 8. Brand immutato (nome, logo, rosso).

## Appendice B — Mappa token v2.3 → v3 (per la migrazione automatica)
`--bg #DDD8D3→#F4F0E7` · `--sfc/--elv→--card #FFFEFA` · `--prs→--bg-deep` · `--t1→--ink` · `--t2→--muted` · `--t3→--faint` · `--primary→--red` (valore invariato light) · `--c-green #22C55E→--green #1B7F3B` · `--c-amber #F59E0B→--amber #9A5C00` · `--c-blue #3B82F6→--blue #1D5FBF` · `--c-red/--c-orange→--red famiglia` · `--c-purple→famiglia --purple (stato) + avatar` (rev. 3.1: era «SOLO avatar») · shadow `--sh-b/c/i/red→--sh-card/--sh-press` · motion `t()→molle §8.1`.

## Appendice C — Fonti Apple (ricerca 07/07/2026)
HIG Motion/Typography/Layout/Playing audio/Playing haptics/Accessibility/Feedback (developer.apple.com) · WWDC18 803 Fluid Interfaces · WWDC19 810 Audio-Haptic · WWDC17 803 Designing Sound · Apple docs spring(response:dampingFraction:)/spring(duration:bounce:)/interactiveSpring · motion.dev/docs/spring (visualDuration+bounce) · caniuse navigator.vibrate (iOS: NON supportato) · learnui.design (scala tipografica) · valori integrali nel report agente in sessione 07/07/2026.
