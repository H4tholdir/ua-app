# GATE ESTETICO L2 (FASE 9b) — P17, lo scarico del contratto che non va a buon fine

> ✅ **QUESTA VOLTA IL CANCELLO SCATTA PRIMA DEL MERGE.** Sulla stessa superficie il gate era già stato
> saltato una volta (ondata 1, unita e pubblicata senza), e il rimedio a valle è
> `LIVELLO-2-2026-08-04-dpa-scheda-cliente-ESITI.md`. Qui il ramo `p17-scarico-che-fallisce` **non è
> ancora unito**, e non lo sarà finché questo documento non è chiuso (**D166**).

| | |
|---|---|
| **Livello** | 2 — gate di fine ondata (`README.md` §Livello 2) |
| **Superficie** | blocco «Privacy — GDPR» in `src/app/(app)/clienti/[id]/page.tsx:367-435` + `ScaricaDpaButton.tsx` + `BloccoAvviso.tsx` + `BloccoAvvisoRicarica.tsx` |
| **Ondata** | **P17** — il tasto vivo, il codice d'errore, le tre righe del registro |
| **Checklist** | `CHECKLIST-DS-V3-UI-UX.md`, 12 sezioni |
| **Copertura** | **8 stati approvati** × **390 · 768 · 1280** × **chiaro · scuro** = **48 combinazioni**, più **3 cammini d'errore** × 2 temi = **54**, percorse **due volte** (prima → dopo) e i quattro stati col riquadro una **terza** volta dopo D167 |
| **Scatti** | `docs/design/screenshots/2026-08-02-p17/` — serie **`prima-`** (com'era) · **`dopo-`** (con le correzioni di contrasto e di annuncio) · **`finale-`** (con i tasti a 40 px, D167). Ognuno con lo scatto di **contesto** e, dove il fuoco arriva, quello con l'**anello** |
| **Misure** | `misure-prima.json` · `misure-dopo.json` · `misure-finale.json` nella stessa cartella |
| **Data** | **2 agosto 2026** · `provato:` `date` → `Sun Aug 2 22:10 CEST 2026` (regola §0F: l'orologio, mai il documento precedente) |

---

## 0. 🛑 Le tre cose da sapere prima di leggere la tabella

### ① Checklist v3 su una pagina v2.3 — i tre N/A, con la loro ragione

`clienti/[id]` è **legacy v2.3** e la migrazione è **per route, mai per componente** (DS v3 §14). Valgono
identici i tre N/A del gate precedente, e per lo stesso motivo: **§4** «Plus Jakarta Sans ovunque» → N/A,
qui è **DM Sans** (`misurato:` su tutti gli elementi) · **§5** «solo token v3» → N/A, la pagina non monta
`[data-ds="v3"]` · **§6** «motion da `v3/motion.ts`» → N/A. ⚠️ **Il divieto di valori inline resta pieno**,
ed è rispettato: `misurato:` nessuna `transition`, nessuna `animation`, nessun `cubic-bezier` sulla
superficie.

🔑 Un N/A senza la ragione accanto è un difetto travestito: il primo che legge «❌ font sbagliato» lo
«aggiusta» e rompe la regola di convivenza.

### ② Come sono stati raggiunti gli otto stati — e i due che hanno richiesto una modifica usa-e-getta

| stato | come è stato raggiunto | vero o forzato |
|---|---|---|
| ① tasto attivo | dentista con P.IVA (`DI SANTI CATERINA`) | **vero** |
| ② manca P.IVA/CF del dentista | dentista reale senza né P.IVA né C.F. (`DOTT. MARA OPROMOLLA`) | **vero** |
| ③ manca P.IVA/CF del laboratorio | 🧪 `?p17=lab` — modifica **usa-e-getta**, poi tolta | forzato |
| ④ «Preparo il documento…» | risposta della rotta ritardata di 30 s, scatto mentre lavora | **vero** (componente vero, esito ritardato) |
| ⑤ guasto del servizio | risposta della rotta forzata a **500** | **vero** (componente vero, esito forzato) |
| ⑥ non sei il titolare | **sessione reale** di `e2e-tecnico@ua-test.local`, ruolo `tecnico` | **vero** |
| ⑦a registro letto, emissione c'è | `Dental Center` → `DPA-2026-0001` | **vero** |
| ⑦b registro letto, niente | `DI SANTI CATERINA` | **vero** |
| ⑦c registro non leggibile | 🧪 `?p17=registro` — modifica **usa-e-getta**, poi tolta | forzato |

🛑 **La modifica usa-e-getta è stata tolta**, e il fatto è verificabile: `provato:`
`grep -c "p17\|USA-E-GETTA" src/app/(app)/clienti/[id]/page.tsx` → **0**, e `git status` mostra la pagina
**non modificata**. Serviva perché ③ chiede di **togliere la Partita IVA al laboratorio** (una scrittura
sul banco, che è una decisione di Francesco) e ⑦c chiede di **far fallire una lettura server**, che nessuna
intercettazione del browser può toccare.

### ③ Che cos'è il `role="alert"` che si conta in più

`provato:` su una scheda **senza nessun avviso**, Playwright conta **1** `[role="alert"]` e
`document.querySelectorAll` ne conta **0**. La differenza è che Playwright **perfora lo shadow DOM**:
l'elemento è **`next-route-announcer`**, l'annunciatore di rotta di Next, **vuoto**, presente su ogni
pagina dell'app **anche prima di qualunque clic**. **Non è di P17 e non è un difetto.**
🔑 Sta scritto qui perché è la classica misura che, presa per buona, diventa un difetto immaginario.

---

## 1. Il collaudo dal vivo — passo 1 del Task 5

**Accesso col link monouso** (D103, mai una password digitata): `h4t@live.it`, titolare.

| | esito |
|---|---|
| 🔑 **Il NOME del file che arriva** | **`DPA-2026-0001.pdf`** — `provato:` `download.suggestedFilename()`, file salvato su disco. 🛑 **Il ripiego `contratto-dpa.pdf` NON compare**: `nomeDaHeader` legge davvero `Content-Disposition`, e la riparazione del 01/08 (due emissioni con lo stesso nome) **non è stata disfatta** |
| **Nessun numero bruciato** | `provato:` registro letto in sola lettura **prima e dopo**: **tre righe prima, tre righe dopo**, `DPA-2026-0001 · 0002 · 0003`, stessi `emesso_at`. Il guard di riuso ha restituito il PDF esistente — impronta e versione del modello combaciano (`dpa-v2+8d98dbee`, e `dpa-modello.ts` non è più cambiato dal 01/08) |
| **Il tasto torna a riposo** | dopo lo scarico: etichetta «Scarica DPA PDF», `aria-disabled` assente, **nessun blocco d'avviso** |
| **② il tasto inerte è davvero inerte** | `aria-disabled="true"`, e **premendolo lo stesso NON parte nessuna richiesta** (`provato:` ascoltatore sulle richieste → `false`) |
| **② il blocco non ha tasti** | `provato:` **0** comandi dentro l'avviso — **D165 rispettata**: il tasto «Aggiungi il dato» del mockup, che sarebbe stato morto, non c'è |
| **⑦a** | «Ultima emissione: **DPA-2026-0001** — 2 agosto 2026» — data nel fuso di Roma, come deve |
| **⑦b** | «Non ancora emesso per questo studio.» |
| **⑥** | con la sessione **tecnico**: `provato:` **nessun tasto** nella card (`tastoPrincipale = null`, **0** comandi), e il riquadro con testo e riga del registro **resta** — D158 e D160 verificate sul vivo, non dedotte |
| **Errori di console** | **nessuno**, tranne i 500 **forzati apposta** negli stati ⑤ · 401 · 403 · 422 |

---

## 2. Esiti — 12 sezioni

**Legenda:** ✅ conforme · ⚠️ da migliorare (Minor) · ❌ difetto · N/A.

| § | sezione | esito | prova |
|---|---|---|---|
| **1** | Layout & allineamento | ✅ | `misurato:` card `x = 20` e testo interno allineato su tutte e 54 le combinazioni. Il blocco d'avviso condivide la colonna del tasto; titolo e corpo dell'avviso partono dalla **stessa** ascissa (l'icona sta in una colonna sua, `flex: none`) |
| **2** | Proporzioni & spazio | ⚠️ | Il blocco costa altezza **solo quando c'è qualcosa che non va** (D161), come previsto. 🔴 **A 1280 il blocco è largo `1240 px`** per un contenuto che ne occupa ~500: una **fascia colorata** attraversa tutto lo schermo. ⚠️ **È il difetto di pagina già misurato e deferito dal gate precedente** (nessuna card di `clienti/[id]` ha un `max-width`), ma il blocco lo rende **molto più visibile** di un testo → v. §4 |
| **3** | Sovrapposizioni & z-index | ✅ | `provato:` **0 collisioni** in tutte e 54; **nessuno scorrimento orizzontale** (`scrollWidth == clientWidth` ovunque). L'indicatore «1 Issue» visibile in qualche scatto è lo **strumento di sviluppo di Next**, non l'app |
| **4** | Tipografia & gerarchia | ✅ / ⚠️ | `misurato:` 13px/400 descrizione · 14px/700 tasto · 12,5px/700 titolo avviso · 12,5px/400 corpo avviso · 11px/400 le due righe finali. **Nessun troncamento in 54 combinazioni su 54.** ⚠️ **Gerarchia rovesciata in scuro:** la riga «Non ancora emesso per questo studio» (11px, su `--t1`, **13,93:1**) è **più leggibile** della descrizione da 13px sopra di lei (`--t2`, **4,45:1**). È l'effetto collaterale della scelta giusta — v. §4 |
| **5** | Colore, contrasto, tema | ❌ **corretto** | 🔴 **Trovato: il BORDO dei comandi falliva WCAG 1.4.11 in modo scuro, su QUATTRO comandi e non tre.** ✅ **Corretto in questo gate.** Tutti i testi **nuovi** di P17 stanno su `--t1` e passano largamente: **10,67 – 13,93** in scuro, **11,19 – 13,21** in chiaro. Dettaglio in §3 ① |
| **6** | Motion & micro-interazioni | ✅ / ⚠️ | `misurato:` **nessuna** animazione, transizione o easing inline — niente da rispettare per `prefers-reduced-motion` perché non c'è moto. ⚠️ Il segno dello stato «occupato» è un **arco di cerchio FERMO**: la forma è quella universale di una rotella, e da ferma può leggersi come un caricamento bloccato. Il significato però lo porta la **parola** («Preparo il documento…»), e l'icona è `aria-hidden` |
| **7** | Suono & haptic | ✅ | Il tasto principale chiama **`hapticLight()`** alla pressione. 🔑 **E il tasto «Ricarica» NON lo chiama, per scelta scritta:** `haptic.ts:3` dice «solo su azioni critiche/irreversibili», e rileggere un dato non è né l'una né l'altra. ⚠️ Nota: il gate precedente aveva deferito il feedback su questa superficie per **coerenza di pagina** (1 componente su 6 lo usa); P17 lo introduce sul comando che **emette un documento**, cioè esattamente il caso che la regola prevede |
| **8** | Touch target & interazione | ✅ **corretto** | ✅ Tasto principale **44 px** in tutti e tre i formati (173,63 × 44 a riposo · 215,92 × 44 mentre lavora). 🔴 **Trovato: i tre tasti dentro il blocco erano alti 34 px** — WCAG 2.5.8 AA (24 × 24) rispettato, ma **non** la regola di casa (§0B: ≥ 44). ✅ **Portato a Francesco e deciso: 40 px — D167.** `misurato dopo:` «Completa i dati del laboratorio» 205,89 × **40** · «Riprova» 72,55 × **40** · «Ricarica» 74,66 × **40**, invarianti ai tre formati. 🛑 **Resta una deroga con un numero, non un nuovo standard** — v. §4 |
| **9** | Stati (empty · loading · error · disabled) | ✅ | 🔑 **È la sezione che P17 esisteva per riparare, ed è l'unica che passa da ❌ a ✅.** Il gate precedente misurò: pressione = navigazione, `{"error":"Cliente non trovato"}` a schermo, **titolo vuoto, zero elementi premibili**. Oggi: **otto stati**, tutti visti, tutti con parole d'italiano e — dove ha senso — una via d'uscita. **Vuoto** (⑦b) e **guasto di lettura** (⑦c) **non si somigliano più**: erano identici, ora uno dice «Non ancora emesso» e l'altro «Non riesco a leggere il registro» **con un tasto per riprovare** |
| **10** | Responsive (3 viewport) | ✅ / ⚠️ | ✅ `provato:` **nessuno scorrimento orizzontale** in 54 combinazioni su 54; 390 card-first, 768 corretto. ⚠️ 1280: la fascia larga di §2 |
| **11** | Accessibilità | ❌ **corretto** | ✅ Nome accessibile = testo visibile, **nessun `aria-label` divergente** (WCAG 2.5.3) · icone `aria-hidden="true"` · **`aria-disabled` e non `disabled`**, quindi il tasto inerte resta raggiungibile col tabulatore e viene annunciato (`provato:` fuoco raggiunto alla 9ª tabulazione anche con `aria-disabled="true"`) · `:focus-visible` **presente in tutte le combinazioni misurate** · `lang="it"`. 🔴 **Trovato e corretto:** l'etichetta che cambia dentro un `role="alert"` faceva **rileggere l'intero riquadro** a ogni pressione — v. §3 ② |
| **12** | Copy & microcopy | ✅ | Italiano corretto, accenti compresi. Ogni messaggio dice **che cosa non va** e **che cosa si può fare**, senza gergo: «Manca un dato dello studio», «Non riesco a leggere il registro», «Non dipende dai tuoi dati». 🔑 **E il 401 non promette ciò che non può mantenere:** «Sessione scaduta — Rientra e riprova», **senza** il tasto «Riprova» che non potrebbe funzionare |

**Conteggio:** ✅ **6** · ⚠️ **4** (§2, §4, §6, §8) · ❌ **2 — entrambi CORRETTI in questo gate** (§5, §11) ·
N/A **3 criteri** (dentro §4, §5, §6) — v. §0 ①.

---

## 3. I due ❌ — trovati e corretti, con le misure prima e dopo

### ① §5 — Il bordo di un comando, in modo scuro, non si distingueva dal fondo

**Che cosa chiede la norma:** WCAG **1.4.11** (Non-text Contrast) chiede **3:1** al confine che identifica
un elemento premibile. 🔑 **E qui il bordo è l'unica cosa che delimita il tasto**, perché il fondo di tutti
e quattro è **trasparente**: tolto il bordo, resta una parola in mezzo al testo.

**Misurato sul fondo VERO** — non su `--bg`, ma componendo gli strati semitrasparenti fino al primo fondo
opaco (il blocco d'avviso è una tinta al 10-14% sopra la card):

| comando | tema | **prima** | **dopo** | |
|---|---|---|---|---|
| «Scarica DPA PDF» inerte (② e ③) | scuro | **2,24** ❌ | **4,61** ✅ | card `rgb(35,32,24)` |
| «Completa i dati del laboratorio» (③) | scuro | **1,71** ❌ | **3,53** ✅ | blocco ambra `rgb(64,50,22)` |
| «Riprova» (⑤) | scuro | **2,16** ❌ | **4,45** ✅ | blocco rosso `rgb(53,29,23)` |
| «Ricarica» (⑦c) | scuro | **1,71** ❌ | **3,53** ✅ | blocco ambra |
| tutti e quattro | chiaro | 4,10 – 4,84 ✅ | **4,10 – 4,84** ✅ | **invariati, pixel per pixel** |

⚠️ **Erano QUATTRO comandi, non tre**: l'handoff ne contava tre perché «Completa i dati del laboratorio»
non era mai stato aperto — lo stato ③ non si raggiunge senza forzarlo.

**La correzione:** un token nuovo, `--brd-cmd` (`globals.css`), che vale **esattamente `--t3` in chiaro** —
quindi **l'aspetto approvato sui mockup non cambia di un pixel** — e in scuro prende `#928778`, cioè il
valore che il design system **v3 ha già scelto per questo stesso difetto** (`v3/tokens.ts` → `faint`, col
motivo scritto accanto: «*rev. 3.1 — era `#6E6457` (WCAG fail)*»).

🔑 **Perché un token e non `--t2`** (che pure passava, 3,41 – 7,90): `--t2` avrebbe **scurito il bordo anche
in chiaro**, dove non c'era nessun difetto — cioè avrebbe cambiato un disegno approvato per riparare un
guasto che lì non esiste. La forma scelta ha già un precedente in casa: `--c-amber-ink`, `--c-orange-ink`,
`--red-ink` sono **esattamente questo** — valori nati per rimediare un contrasto, con la ragione scritta
sulla riga accanto.

🛑 **NON è P16 e non la riapre.** P16 è sui **testi** (`--t2` e `--t3` come colore di testo, deferita da
**D134**); questo è un **bordo**, e la soglia è un'altra (3:1 contro 4,5:1).

### ② §11 — Il tasto che cambia parola faceva rileggere tutto il riquadro

`role="alert"` porta con sé **`aria-atomic="true"` per difetto** (ARIA 1.2): «se cambia una parola dentro
la regione, rileggi la **regione intera**». Il tasto «Ricarica» diventa «Ricarico…» mentre lavora
(`BloccoAvvisoRicarica.tsx:76`), quindi ogni pressione faceva riascoltare **titolo e testo per intero** —
e succede a chi è **già fermo davanti a un guasto**, cioè nel momento peggiore.

**La correzione:** `aria-atomic="false"` sul blocco. Da lì si annuncia **solo ciò che è cambiato**.
✅ **Non indebolisce la comparsa:** quando il blocco viene *inserito* (è il caso di ogni errore dello
scarico), la cosa cambiata è il blocco intero e viene letto tutto lo stesso.
⚠️ **`non provato con un lettore di schermo vero`:** qui si è seguita la specifica, non una misura. Il
comportamento esatto varia fra i lettori, e questo resta un vuoto dichiarato.

---

## 4. I quattro ⚠️ — deferiti o portati a Francesco, col motivo

| ⚠️ | esito | motivo |
|---|---|---|
| **§8 — i tre tasti del blocco erano alti 34 px** | ✅ **DECISO E CORRETTO — D167: 40 px** | **Non era una violazione:** WCAG 2.5.8 AA chiede 24 × 24 e 34 passava. Era il **mockup approvato**, che li fa più piccoli **di proposito** per distinguerli dal tasto principale (44); la regola di casa (§0B) dice però ≥ 44, perché l'app si tocca **in piedi al banco**. Francesco ha scelto **40**: più comodo da premere, e ancora visibilmente più piccolo del principale. ⚠️ **40 non era su nessuno scatto approvato**, quindi è stato **fotografato prima di essere ratificato** — `finale-*` in `docs/design/screenshots/2026-08-02-p17/`, sulla pagina vera e non su un mockup (a codice già scritto è la fedeltà più alta disponibile) |
| **§2 / §10 — la fascia larga 1240 px a 1280** | 🟡 **deferito** | ⚠️ **È di PAGINA, non di P17:** `misurato:` **nessuna** card di `clienti/[id]` ha un `max-width`, e il gate precedente aveva già deferito lo stesso difetto con la stessa ragione — mettere un limite **solo** a questo blocco lo renderebbe l'unico elemento diverso della pagina. 🔑 **Ma va detto che P17 lo rende più visibile:** una fascia **colorata** che attraversa lo schermo pesa più di una riga di testo che finisce a metà. Sede: l'ondata di migrazione a v3 della route, che ridisegna il contenitore |
| **§4 — gerarchia rovesciata in modo scuro** | 🟡 **deferito, ed è il prezzo dichiarato di una scelta giusta** | «Non ancora emesso per questo studio» sta su `--t1` (**13,93:1**) mentre la descrizione sopra, più grande, sta su `--t2` (**4,45:1**): la riga meno importante è la più leggibile. 🔑 **Non si ripara abbassando il testo nuovo** — nascere col difetto che si è scelto di rimandare è proprio ciò che il codice evita apposta. Si ripara quando si chiude **P16** (D134), che alza `--t2` e `--t3` per tutta la parte legacy |
| **§6 — l'arco di caricamento è fermo** | 🟡 **deferito** | Il mockup approvato **non ha nessuna animazione** (`provato:` nessun `keyframes` nel file), e la regola di casa vieta di inventare un moto fuori dai token. Il significato lo porta la parola, non il segno. Sede: l'ondata di migrazione a v3, che porta `v3/motion.ts` |

---

## 5. 🔎 Fuori mandato — si riferisce, non si corregge (R-E2)

- **`role="alert"` su uno stato STATICO.** Gli stati ②, ③ e ⑦c sono resi **dal server**: il riquadro è già
  nel documento quando la pagina si apre, non compare in risposta a un gesto. `role="alert"` è pensato per
  ciò che **accade**, e un lettore di schermo può interrompere la lettura all'arrivo — oppure non annunciare
  niente, secondo il lettore. ➡️ **Non corretto qui**: la cura è dare a `BloccoAvviso` un modo di distinguere
  «comparso adesso» da «già qui», cioè una scelta di disegno del componente che D162 vuole **ereditabile**;
  appartiene all'ondata che rimetterà mano a questi stati, insieme a §4 di questo elenco.
- **Il gate precedente aveva riferito un disallineamento di idratazione** in
  `PortaleLinkButtons.tsx:134-137` (`window.location.origin` sul client, `uachelab.com` sul server). **È
  ancora lì**, non è di P17, e non è stato toccato.
- **La misura del fuoco sui tre cammini extra (401 · 403 · 422) non è affidabile**, e va detto: in quegli
  stati il blocco **non ha tasti**, e la sonda ha finito per fermarsi su un contenitore il cui testo
  contiene comunque «Scarica DPA PDF». Il fuoco sul tasto principale resta **misurato e verde negli otto
  stati principali**; per i tre extra la riga va letta come **non misurata**, non come verde.

---

## 6. Che cosa questo gate NON ha coperto

- **Non ha guardato `uachelab.com`** — e stavolta **non poteva**: il codice di P17 **non è in produzione**
  (ramo `p17-scarico-che-fallisce`, mai unito, **voluto**, D166). Ha guardato **lo stesso codice del ramo**
  servito in locale, sulla **stessa banca dati** (`iagibumwjstnveqpjbwq`). L'unica differenza è l'host.
- **Non ha misurato su un dispositivo vero**, solo su emulazione di viewport. I bersagli tappabili sono in
  pixel CSS, che è ciò che la regola chiede.
- **Non ha usato un lettore di schermo vero.** Le voci di §11 sono misurate sul DOM e sulla specifica ARIA:
  `aria-disabled`, nome accessibile, `aria-hidden`, `:focus-visible`, `aria-atomic`. Il **comportamento**
  di VoiceOver e NVDA su un `role="alert"` non è stato osservato.
- **Non ha percorso il 404 «Cliente non trovato» dal vivo**: richiede che il dentista sparisca **fra** il
  caricamento della pagina e la pressione. Il messaggio è coperto da prova unitaria; a schermo no.
- **Non ha provato una seconda emissione** con dati cambiati (che brucerebbe un progressivo): il collaudo ha
  usato di proposito il cammino di **riuso**, per non scrivere sul banco.

---

## 7. ✅ Ciò che è stato portato a Francesco — e la sua risposta

**Una sola cosa, e non era un difetto: era una scelta di disegno.**

I tre tasti dentro il riquadro d'avviso erano alti **34 px** contro i **44** del tasto principale — differenza
**voluta nel mockup approvato**, per dire «*questo è il comando principale, questi sono i rimedi*». La legge
era rispettata (WCAG 2.5.8 AA chiede 24 × 24), la **regola di casa** no (§0B: ≥ 44), e l'app **si tocca in
piedi al banco, col pollice**.

Tre strade presentate **con gli scatti veri della pagina**: restare a 34 · salire a 44 · un compromesso a 40.
➡️ **Risposta: «compromesso: 40 pixel» — D167.**

⚠️ **40 non era su nessuno scatto approvato**, e quindi **è stato fotografato prima di essere scritto come
definitivo**: la serie `finale-*`, tre formati × due temi. 📌 Sono scatti della **pagina vera** e non di un
mockup HTML — a codice già scritto è la fedeltà più alta disponibile, e §0B chiede l'**anteprima prima della
ratifica**, non un formato preciso di anteprima.

---

## 8. Stato del gate

**PERCORSO, E CHIUSO.** 12 sezioni × 8 stati × 3 viewport × 2 temi, con misure numeriche in tre giri —
`prima` (com'era), `dopo` (con le correzioni di contrasto e di annuncio), `finale` (con D167).

| | |
|---|---|
| **❌ trovati** | **3** — bordo dei comandi sotto contrasto in scuro (§3 ①) · etichetta che cambia dentro `role="alert"` (§3 ②) · altezza dei tasti di rimedio (§7) |
| **❌ risolti** | **3 su 3** — due corretti nel gate, uno deciso da Francesco (**D167**) |
| **⚠️ deferiti col motivo scritto** | **3** — la fascia larga a 1280 (di pagina, non di P17) · la gerarchia rovesciata in scuro (è **P16**, D134) · l'arco di caricamento fermo (il mockup non ha animazioni) |
| **🔎 fuori mandato, riferiti** | **3** (§5) |

🔑 **E le QUATTRO cose che l'handoff della sera aveva rimandato a questo gate sono state raccolte tutte e
quattro**, una per una — che era la condizione scritta perché non sparissero: **(a)** il bordo `--t3` →
**corretto**, e sono risultati **quattro** comandi e non tre · **(b)** l'altezza 34 → **D167, 40 px** ·
**(c)** il fondo scuro del blocco «guasto» → **misurato e deferito col numero** (`rgb(53,29,23)` contro
`rgb(63,28,24)` del mockup: uno scarto di **10 su 255** in un solo canale, sotto la soglia del percepibile,
e il blocco è già distinto da forma dell'icona, titolo e striscia a **3,44:1**) · **(d)** «Ricarico…» dentro
`role="alert"` → **corretto** con `aria-atomic="false"`.

**FASE 7 dopo tutte le correzioni, output reale:** `tsc` **0** · `vitest` **4439 passate | 19 saltate**
(379 file | 3 saltati) · `next build` **uscita 0** · **guardia di coerenza dei documenti verde**.

✅ **Il gate è chiuso. Il ramo può essere unito — quando Francesco lo autorizza.**
