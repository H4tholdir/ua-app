# Ricerca — le due barre di sistema nella PWA installata su Android (26/07/2026)

**Perché esiste questo documento.** È il **passo 1** del metodo imposto da Francesco il 26/07/2026
per il punto 2 dell'handoff `2026-07-26-collaudo-pwa-installata-handoff.md`:

> «all'avvio delle operazioni, facciamo una ricerca approfondita su internet e poi ci confrontiamo
> con advisor specializzati prima di provare a risolvere»

Ordine vincolante: **(1) ricerca → (2) diagnosi MISURATA sul device → (3) panel advisor → (4) piano
→ (5) codice.** Questo documento chiude il passo 1 e apre il passo 2. **Nessuna riga di codice è
stata toccata.**

**Regola di lettura.** Ogni affermazione è etichettata:
- ✅ **ACCERTATO** — fonte primaria (documentazione ufficiale del browser, standard, o il tracker
  bug di Chromium con parole di un ingegnere del progetto), citata.
- 🟡 **CONCORDANTE** — più fonti secondarie concordi, nessuna primaria.
- ❓ **DA STABILIRE** — nessuna fonte, o fonte ambigua. **Non usare come premessa.**
- 🔬 **IPOTESI** — lettura del nostro codice o ragionamento. **Non è una misura.**

🛑 **Le due barre restano separate in tutto il documento**, come ordinato da Francesco («io parlavo
della barra sotto delle gestures… ma non ci confondiamo però»).

---

---

## 0-bis. 🛑 PRECISAZIONE DI FRANCESCO, 26/07/2026 — di COSA stiamo parlando

Francesco ha fermato la prima stesura per un equivoco di parole, e la precisazione è **vincolante**:

> «io sto parlando dello **spazio di sfondo che si trova alle spalle della barretta delle gesture**,
> non la barra delle gesture proprio: quella mi sta bene che esista, ed il suo colore. Ma il suo
> sfondo. Prima eravamo riusciti a inserire lo stesso colore dello sfondo della PWA (infatti se apro
> la PWA da browser è così, da installata no). **Mi sarebbe piaciuto avere quella parte trasparente**,
> così da adattarsi ad ogni situazione.»

**Non c'è nessuno scarto tecnico fra quello che dice lui e questa ricerca**, solo di vocabolario:
quello che Android chiama «**navigation bar**» **è quella fascia di sfondo**, non la barretta scura
che ci sta sopra (quella si chiama *gesture handle*). Ogni volta che questo documento dice «colore
della barra di navigazione», parla **della fascia dietro la barretta**. Il resto del documento è
valido così com'è.

**Quello che chiede in più — la fascia TRASPARENTE — ha una risposta secca: v. §2.6.**

---

## 0. Riepilogo in una pagina

**La barra dei gesti non è un difetto nostro: è un limite noto di Chrome, aperto dal 2021 e ancora
non risolto.** ✅ Un ingegnere di Chromium l'ha messo per iscritto: le PWA installate su Android
(«WebAPK») colorano correttamente la barra di stato in alto, ma **non colorano affatto la barra di
navigazione in basso**. Il manifest non ha nessun campo per farlo, e non esiste nessuna API web
equivalente. In quella condizione la barra in basso la dipinge **il sistema**, bianca o nera secondo
il tema del telefono — **ignorando il tema dell'app**.

**E qualcun altro ha descritto il difetto di Francesco parola per parola**, sullo stesso tracker:

> «in the browser, the navigation bar apply the theme color — once installed, the navigation bar is
> black or white depending on the color scheme, ignoring the theme color»

È esattamente la sua osservazione, **compresa la parte che sembrava un indizio nostro**: da browser
il fondo è corretto, da app installata no.

**La domanda del ponte ha una risposta, ed è NO.** ✅ Il `theme_color` **non tocca** la barra in
basso in una PWA installata. Quindi **sono due problemi, definitivamente**: sistemare il rosso della
barra di stato non muoverà di un pixel la barra dei gesti. Chi chiudesse il punto 2 dicendo «ho
sistemato il rosso» avrebbe sbagliato.

**Quello che resta davvero nostro è la striscia panna su `/cassette`** — l'unico dei tre pezzi che
il limite di Chrome non spiega, e l'unico che possiamo aver causato noi. Era già stata trovata e
corretta il 26/07 (difetto 1b della wave H) e **Francesco la vede ancora**.

**E la fascia trasparente che Francesco vorrebbe? Oggi non si può — ma siamo già configurati per
averla appena si potrà, senza cambiare niente.** ✅ Perché una fascia sia trasparente, la pagina
deve poterci disegnare sotto: è esattamente ciò che le PWA installate non possono ancora fare, ed è
la correzione in lavorazione. Le due condizioni per averla — `display: standalone` e
`viewport-fit=cover` — **le dichiariamo già entrambe**. Il colore giusto che vede da browser non
l'abbiamo messo noi: è Chrome che dal settembre 2024 copia il fondo della pagina nelle **schede**, e
non l'ha mai fatto per le app installate. Dettaglio in §2.6.

**Cosa resta da misurare** (poco, ma indispensabile): tre numeri del telefono di Francesco e una
prova del nove che costa zero — v. §7.

---

## 1. La cronologia della piattaforma

### 1.1 Chrome 135 — le schede di browser vanno a filo schermo ✅ ACCERTATO

Dalla guida ufficiale di migrazione di Chrome:

> «From Chrome 135, the viewport is allowed to extend into Android's gesture navigation bar.»

Sulla stessa fonte:
- Riguarda **i telefoni**: «Chrome on Android running on large-screen devices is currently
  excluded.» ⚠️ Questa riga conta per il §2.4.
- Chrome 135 introduce **«the chin»**, una barra in fondo che si toglie di mezzo allo scroll.
- Da Chrome 135 esistono le variabili `safe-area-max-inset-*`; la guida raccomanda
  `safe-area-max-inset-bottom` per far crescere in anticipo l'elemento ancorato in basso, combinata
  con `safe-area-inset-bottom` per tirarlo giù.
- ⚠️ **Avvertenza della guida, che ci riguarda:** «To prevent performance regressions, Chrome won't
  slide the chin away as you scroll when it detects this pattern» — riferito all'uso di
  `padding-bottom` con i safe-area inset. **Noi usiamo quel pattern in 28 punti** (§5.2).

### 1.2 Le PWA installate sono ESCLUSE dall'edge-to-edge, e la correzione è in corso ✅ ACCERTATO

**Bug Chromium 407420295 — «Edge-to-Edge not working for fullscreen PWAs»**, aperto il **31/03/2025
da un ingegnere di Chromium** (bramus@), non da un utente. Stato letto il 26/07/2026: **In Progress
(Accepted)**, 100 commenti, 39 stelle, **nessun milestone assegnato**.

| Quando | Cosa |
|---|---|
| 31/03/2025 | Aperto: una PWA installata con `viewport-fit=cover` **non** va a filo schermo |
| 10/04/2025 | Un segnalante lo lega alla barra in basso: «edge-to-edge doesn't work on installed PWAs, and now the bottom navigation bar **no longer respects the PWA's theme color, which is a regression**» |
| 21/03/2026 | Preso in carico da un contributore **volontario esterno** (non un dipendente Google) |
| 15/06–20/07/2026 | Le modifiche entrano, vengono **revertite due volte**, e rientrano |
| 10/07/2026 | L'autore della patch: «canary only has 2/3'rd of the change, so you right now won't see any effect… we are still in review» |
| 20/07/2026 | Ultimo movimento. **Cinque CL ancora pendenti** |

**Un ingegnere di Chromium, sulla tempistica** (commento #78, 24/05/2026):

> «this feature is pretty big to land, and it needs to land in steps… In order to ship this feature
> it will have need to go through the launching features process and make its way from a Canary
> release all the way up to a Stable release, possibly with a feature flag and/or origin trial.
> **When this issue is marked as Fixed, you can consider it released to the public.**»

🛑 **Traduzione operativa: oggi è dietro un flag in Canary, e non è nemmeno completo. Su Chrome
stabile non c'è, e non c'è una data.** Aspettarlo non è un piano.

---

## 2. Barra dei GESTI — in basso (punto 2a, il difetto di Francesco)

### 2.1 ✅ ACCERTATO — le PWA installate NON colorano la barra in basso

**Bug Chromium 40759522 — «Installed PWA doesn't respect theme color (as specified in manifest) for
status-bar and nav-bar»**, aperto il **06/04/2021**. Stato letto il 26/07/2026: **In Progress
(Accepted)** — riaccettato il **11/07/2026**, quindici giorni fa, con una CL pendente.

**Il quadro, scritto da un ingegnere di Chromium** (peconn@chromium.org, commento #16, 09/05/2022,
confermato dal segnalante al commento #17):

> - TWAs correctly set the status bar colour.
> - TWAs correctly set the navigation bar colour.
> - WebAPKs correctly set the status bar colour.
> - **WebAPKs do *not* set the navigation bar colour.**

«WebAPK» è esattamente ciò che diventa UÀ quando Francesco la installa da icona. **TWA** è invece
un'app impacchettata e pubblicata sul Play Store: fa entrambe le cose bene, ma è un'altra strada
(§8.1).

Perché non è mai stato sistemato — stesso ingegnere, commento #18:

> «making WebAPKs set the navigation bar to the theme colour would be quite a big change — the
> current experience for a lot of users would change.»

E commento #20:

> «I'm just a bit wary that we're making a change that will affect many websites and there's no way
> for web developers who don't like the change to turn it off.»

### 2.2 ✅ ACCERTATO — il sintomo di Francesco, descritto da terzi parola per parola

Stesso bug, commento #29 (13/10/2024, **Android 14, Chrome 129**):

> «in the browser, the navigation bar apply the theme color — once installed, the navigation bar is
> **black or white depending on the color scheme, ignoring the theme color**. The webdev is
> surprised and the end user feels betrayed because the promise of a better experience with an
> installed app is not fulfilled»

E commento #33 (01/07/2026, Honor Magic V6):

> «In closed mode, the bottom bar is dark. When I open the foldable, the bottom bar is white (the
> website is dark themed, so this is really jarring). **In Chrome (outside of PWA), the site has a
> dark bottom bar in both closed and open modes.**»

🛑 **Questo chiude l'indizio che l'handoff indicava come «il più concreto che c'è»**: che da browser
il fondo sotto la barra sia corretto e da app installata no **non è un sintomo del nostro codice**.
È la differenza documentata fra i due contenitori.

### 2.3 ✅ ACCERTATO — non esiste un modo web per rimediare

Stesso bug, commento #21 (dal segnalante, mai contraddetto dagli ingegneri):

> «the manifest doesn't have a setting to indicate nav bar color, it only has the single theme
> color. So for a site (and thus installed PWA), **there's no direct way to control the nav bar
> color**, let alone to set it differently from the theme color.»

Commento #31 (16/12/2025, Pixel 9 Pro): «It has now been 4 years since this was reported… Even by
enabling **transparent navigation in developer options**, it's still rendering solid background.»
Cioè: non lo aggira nemmeno una impostazione di sistema.

Coerente con la richiesta al WICG del 2019 («[Proposal] Transparent Bottom Navigation Bar»), rimasta
una richiesta e mai diventata una funzionalità.

### 2.4 🟡 Una segnalazione con lo stesso sintomo — da citare con cautela

**Kavita #4479** — «Navigation bar background is inverted (White in Dark mode, Black in Light
mode)», solo in standalone, **sia su Chrome 145 sia su Firefox 148**, Android 16.

Il fatto che accada **anche su Firefox** rafforza la lettura del §2.1: è il contenitore, non il
motore di rendering.

🛑 **Caveat:** il device è un **Lenovo Tab K11**, cioè un **tablet**, e l'edge-to-edge di Chrome 135
esclude esplicitamente i large-screen (§1.1). **Sintomo combaciante, meccanismo non provato
identico.** Segnalazione concordante, mai prova di causa.

### 2.5 La striscia panna su `/cassette` — 🔬 IL PEZZO CHE RESTA NOSTRO

**Nessuna delle fonti sopra spiega una striscia di colore *sopra* la barra.** Questo pezzo va
tenuto vivo e separato: è il più probabile difetto nostro dei tre.

**Fatto di codice, verificato:** la striscia panna sotto il muro **è già stata trovata e corretta il
26/07** — difetto 1b della wave H. Il commento in `src/app/ds-v3.css:994` lo racconta: i 40px di
respiro stavano *fuori* dal muro e si vedeva «il fondo pagina panna PIATTO, senza la trama della
rete, tra l'ultima riga del muro e il bordo inferiore dello schermo». Il rimedio ratificato da
Francesco («il muro arriva fino in fondo») ha spostato quei 40px **dentro** `.ds-parete`, dove il
respiro è fatto di rete invece che di panna.

**Ma Francesco la vede ancora, sulla PWA installata.** Le strade, tutte da misurare:
- è una **striscia diversa**: sotto il muro c'è il wrapper di pagina
  (`cassette/page.tsx:26`), che è `var(--bg)` = `#F4F0E7` — panna — con `minHeight: 100dvh`;
- il rimedio **non regge in standalone**, dove `100dvh` e `env(safe-area-inset-bottom)` valgono
  numeri diversi da quelli del banco di collaudo (v. §5.2);
- è la stessa classe di difetto della **striscia panna del piede**, chiusa il 25/07 abrogando la
  coreografia (`HomeV3.tsx:276-288`) — cioè un difetto **ricorrente**, che è un fatto in sé.

🛑 **Nessuna di queste è una causa.** È l'unico pezzo indagabile in locale senza il telefono.

### 2.6 ✅ La fascia TRASPARENTE: si può? Oggi no. Ma è in arrivo, e siamo già configurati giusti

**La domanda di Francesco (§0-bis): quella fascia può essere trasparente, così da adattarsi a
qualunque schermata ci sia sopra?**

**Risposta: oggi no, e non per una nostra dimenticanza.** Perché una fascia sia trasparente, sotto
ci deve disegnare qualcosa — cioè la pagina deve estendersi fin lì. È esattamente ciò che una PWA
installata **non** può fare oggi (§1.2), ed è il bug 407420295 che Chrome sta risolvendo ora.

**Perché da browser lo vede giusto e da installata no — la risposta esatta** ✅ ACCERTATO:
**Chrome 129** (settembre 2024) ha cominciato a colorare la fascia della barra di navigazione **con
il colore di sfondo della scheda attiva**. Fonte: 9to5google, 26/09/2024 — «the bar is themed based
on the *background color of the active tab*. **It's not transparent**, but does result in a slightly
more immersive experience». C'era pure una levetta, `chrome://flags/#enable-nav-bar-matches-tab-android`.

🛑 **Ma vale per le SCHEDE, non per le PWA installate.** La prova che non si è mai esteso ai WebAPK
è il commento #29 del bug 40759522, scritto **a ottobre 2024, cioè DOPO Chrome 129**: «in the
browser, the navigation bar apply the theme color — once installed, the navigation bar is black or
white depending on the color scheme».

**Quindi il ricordo di Francesco è esatto e la spiegazione è questa:** quel colore giusto che vede
da browser **non l'abbiamo messo noi** — lo calcola Chrome dal fondo della pagina, da settembre
2024. E non è trasparenza: è Chrome che copia il nostro colore. Da installata non lo fa, e non
esiste nessun campo del manifest per chiederglielo (§2.3).

**La cosa che conta di più, e che è una buona notizia** ✅ ACCERTATO — dalle parole di un ingegnere
di Chromium (bramus@, commento #33 del bug 407420295) e dell'autore della patch (#39):

> «By default, the viewport stays clear of the unsafe areas… **It is the `viewport-fit=cover` that
> opts in to also draw in those unsafe areas.** When set, it is then up to the author to make sure
> they are using the safe area insets.»
>
> «`viewport-fit=cover` does not change display-mode by itself; **it signals that the page can
> handle safe-area insets, so Chrome can do edge-to-edge within the current mode when appropriate**.»

E al commento #55–#57 è verificato sul campo che, con la patch, una PWA con **`display: standalone`
+ `viewport-fit=cover`** va edge-to-edge come previsto.

🎯 **Noi dichiariamo già `viewport-fit: cover`** (`src/app/layout.tsx:33`) **e `display: standalone`**
(`manifest.json`). **Sono esattamente le due condizioni della correzione in arrivo.** Quando quella
correzione arriverà su Chrome stabile, la fascia diventerà trasparente e ci disegneremo sotto noi —
**senza che dobbiamo cambiare una riga.**

⚠️ **Ma poi diventerà cura nostra:** «it is then up to the author to make sure they are using the
safe area insets». Il giorno che quella fascia si apre, `env(safe-area-inset-bottom)` smetterà di
valere 0 e i nostri 28 punti (§5.2) cominceranno a fare qualcosa. Vanno riguardati **prima** che
succeda, non dopo.

**Quando.** Nessuna data. Stato al 20/07/2026: parti della correzione sono in Canary **dietro un
flag** (`WebAppShortEdgesCutoutMode`), altre ancora in revisione, due revert già avvenuti, nessun
milestone assegnato, e la sta scrivendo **un volontario esterno**. Le parole dell'ingegnere di
Chromium: «When this issue is marked as Fixed, you can consider it released to the public» (§1.2).
**Oggi non è nemmeno provabile su un telefono normale**: serve una build modificata di Chrome e un
flag da riga di comando via `adb` (commento #52).

---

## 3. Barra di STATO — in alto (punto 2b, lavoro aggiuntivo, voce A5 riaperta)

### 3.1 Chi ne decide il colore ✅ ACCERTATO (MDN + §2.1)

- `theme_color` del manifest: «On mobile devices: applied to the status bar». E le PWA installate la
  barra di stato **la colorano correttamente** (§2.1) — quindi qui abbiamo voce in capitolo.
- `background_color` del manifest: è il colore della finestra **prima che i fogli di stile siano
  caricati**, cioè della schermata di avvio. **Non è la barra.**
- **Precedenza:** «If both are set, the `theme-color` meta element value **overrides** the
  `theme_color` manifest member.» Il manifest resta il valore statico dell'avvio, quando il meta
  della pagina non è ancora leggibile.

### 3.2 Un colore diverso per chiaro e scuro: col meta, non col manifest ✅ ACCERTATO

```html
<meta name="theme-color" content="#F4F0E7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171411" media="(prefers-color-scheme: dark)">
```

- L'attributo `media` sul meta `theme-color` **è supportato dai browser da ottobre 2022**.
- **Ordine obbligatorio** (intent Chromium): il primo `meta[name="theme-color"]` nell'ordine del
  documento dev'essere quello **senza** preferenza, e le varianti dopo — «the first one that matches
  will be picked», e i browser che non lo supportano prendono sempre il primo.
- Il **manifest non può farlo**: JSON statico, un solo `theme_color`. La proposta w3c/manifest
  **#975** per le varianti chiaro/scuro è **ancora aperta** (PR #1205 e #1207).
- ⚠️ MDN classifica `theme-color` come **«Limited availability — not Baseline»**.

### 3.3 🛑 Il buco nella fonte, da verificare prima di proporre il rimedio ❓ DA STABILIRE

L'intent Chromium che introduce l'attributo `media` dice, testualmente:

> «Chrome will use it for installed PWAs **on Desktop** and for all websites **on Android**.»

**Nomina le PWA installate su Desktop e i siti su Android. Non nomina le PWA installate su
Android** — l'unico posto dove Francesco vede il problema.

Un indizio indiretto **a favore** che funzioni: il bug 421933373 (§3.4) descrive una PWA installata
in cui il meta `theme-color` **vince** sul manifest e ne lascia scoperto 1px — se il meta non fosse
onorato nelle PWA installate su Android, quel bug non esisterebbe. **Indizio, non prova.** Va
verificato sul device prima di proporlo come rimedio della voce A5.

### 3.4 Un difetto vicino, già risolto — utile a non confonderlo col nostro ✅ ACCERTATO

**Bug Chromium 421933373 — «Manifest theme_color remains partially visible below meta theme-color»**:
in una PWA installata restava visibile **una riga sottile (1 pixel CSS)** del `theme_color` del
manifest sotto la barra di stato. Regressione entrata in Chrome 136, **risolta** in Canary 150
(maggio 2026, due CL).

🛑 **Non è la striscia di Francesco**: quella è in **alto**, spessa **1 pixel**, ed è **già
risolta**. La sua sta in **basso** ed è spessa abbastanza da vedersi. Va tenuta distinta.

---

## 4. Il ponte fra le due barre — ✅ RISPOSTA: NO, SONO DUE PROBLEMI

**La domanda era:** «se e quando `theme_color` tocca anche la barra di navigazione in basso. È la
domanda che decide se sono un problema solo o due» (handoff, §2, punto 1).

**La risposta è nel §2.1, per bocca di un ingegnere di Chromium: «WebAPKs do *not* set the
navigation bar colour».** Il `theme_color` colora la barra di **stato**, non quella di
**navigazione**, e il manifest non ha nessun altro campo che possa farlo (§2.3).

🛑 **Conseguenza vincolante per chi lavorerà qui: sono DUE lavori indipendenti.**
- Cambiare il rosso della barra di stato **non muoverà di un pixel** la barra dei gesti.
- **Chiudere il punto 2 perché «il rosso è a posto» sarebbe l'ennesima conclusione affrettata**, in
  una vicenda nata proprio da una conclusione affrettata.

---

## 5. Quello che abbiamo dichiarato noi (verificato nel codice, 26/07/2026)

| Dove | Cosa dice | Nota |
|---|---|---|
| `public/manifest.json` | `"theme_color": "#D90012"` · `"background_color": "#F4F0E7"` · `"display": "standalone"` · `"scope": "/"` · `"start_url": "/dashboard"` | il `background_color` è già il fondo unificato ✅ |
| `src/app/layout.tsx:28` | `themeColor: '#D90012'` — **un valore solo** | Next.js accetta anche un array con `media`: la variante chiaro/scuro è dichiarabile qui |
| `src/app/layout.tsx:33` | `viewportFit: 'cover'` | presente ✅ — ma per il §1.2 oggi in standalone **non ha effetto** |
| `public/offline.html:6` | `<meta name="theme-color" content="#D90012">` | **il terzo posto.** Correggendo solo i primi due, resterebbe rossa proprio quando manca la rete |

### 5.1 Il tema dell'app segue quello del telefono **solo finché nessuno lo forza** ✅ FATTO DI CODICE

`src/components/layout/ThemeInitializer.tsx`:

```js
var s = localStorage.getItem('ua-theme');
var d = s === 'dark' || (!s && window.matchMedia('(prefers-color-scheme: dark)').matches);
```

Cioè: se l'utente **non** ha mai scelto un tema nell'app, l'app segue il telefono. **Se l'ha
scelto, l'app lo tiene e il telefono viene ignorato.**

🔬 **Perché conta moltissimo, dato il §2.2:** la barra in basso segue **il telefono**. Se il tema
dell'app e quello del telefono divergono, il contrasto è **massimo** — è il caso «app scura, barra
bianca» del segnalante di Kavita. Se invece coincidono, resta solo la differenza fra il bianco di
sistema e il nostro panna `#F4F0E7`: fastidiosa, ma un'altra cosa. **Quale dei due casi sia quello
di Francesco è una misura, ed è la prima da fare** (§7.2).

### 5.2 `env(safe-area-inset-bottom)`: 28 punti nel codice ✅ FATTO DI CODICE

Usato in 28 punti (muro, piede della home, praticamente ogni bottom sheet). **Se in standalone vale
0** — che è quanto ci si aspetta finché la PWA non disegna dietro le barre (§1.2) — tutti collassano
al loro fallback: in molti casi un numero sensato (`20px`, `40px`), ma in **alcuni non c'è affatto**,
fra cui `src/components/features/home/HomeV3.tsx:292` → `padding-bottom: env(safe-area-inset-bottom);`.

⚠️ **E c'è l'avvertenza di Chrome del §1.1**: usare `padding-bottom` con i safe-area inset fa sì che
Chrome **non ritragga più «the chin»** allo scroll. È una conseguenza che abbiamo accettato 28 volte
senza saperlo. Da mettere sul tavolo del panel.

---

## 6. 🔬 Il modello che si è formato — coerente, ma da confermare con la misura

> In standalone la PWA **non** disegna dietro le barre di sistema (§1.2) e **non colora la barra in
> basso** (§2.1). Quella barra la dipinge il sistema, **bianca o nera secondo il tema del telefono**
> (§2.2), ignorando il tema dell'app. In scheda di browser su Chrome ≥135 succede il contrario
> (§1.1): la pagina disegna sotto la barra, e infatti lì il fondo **è corretto**.

**Adesso poggia su fonti primarie, non più su ragionamento** — ed è la differenza rispetto al
verbale sbagliato del 26/07. Ma **resta da confermare che sia il caso di Francesco e non un caso
simile**, perché:
- dipende dalla **versione di Android** e da quella di **Chrome** — non le sappiamo;
- dipende dal **tipo di navigazione**: con i tre tasti Android applica un velo semitrasparente che
  a gesti non c'è;
- **non spiega la striscia panna** su `/cassette`, che resta interamente aperta (§2.5).

🛑 Il motivo per cui questo paragrafo esiste è scritto nell'handoff: la volta scorsa si è ragionato
invece di misurare. **Fonti primarie + misura**, non fonti primarie da sole.

---

## 7. Passo 2 — le misure sul device di Francesco

Il telefono è suo: si concorda con lui, non si dà per scontato.

### 7.1 Le tre informazioni che sbloccano tutto (costo: zero)

1. **Versione di Android** — Impostazioni → Informazioni sul telefono
2. **Versione di Chrome** — Chrome → ⋮ → Impostazioni → Informazioni su Chrome
3. **Navigazione a gesti o a tre tasti** — Impostazioni → Sistema → Navigazione

### 7.2 🔬 La prova del nove, senza scrivere codice

**Domanda preliminare, la più importante di tutte (§5.1):** in questo momento, **il telefono è in
tema chiaro o scuro? E l'app?** Se divergono, quella divergenza da sola spiega il «colore diverso
dal resto dell'app».

**Poi la prova:** con l'app installata aperta, **cambiare il tema di SISTEMA di Android** (chiaro ↔
scuro) e guardare la barra dei gesti, tenendo il tema dell'app fermo.

| Cosa si vede | Cosa vuol dire |
|---|---|
| la barra segue il **tema del telefono** e ignora quello dell'app | modello §6 **confermato**: non è nostro, non esiste correzione CSS, il rimedio è di altra natura (§8) |
| la barra segue il **tema dell'app** | modello §6 **falso** per il suo device → qualcosa della pagina la influenza, e allora si può correggere |
| non segue **nessuno dei due** | caso non documentato → serve la pagina diagnostica del §7.3 |

### 7.3 Se serve, una pagina di diagnosi (da concordare, NON ancora fatta)

Un file statico `public/diagnostica-barre.html` che, aperto **dentro** l'app installata, mostri:
`display-mode` corrente, i quattro `safe-area-inset-*` e i `safe-area-max-inset-*`, `innerHeight`
contro `screen.height`, il tema di sistema, lo `user-agent`. Francesco lo apre e manda uno
screenshot.

Funziona perché sta **dentro lo `scope` della PWA** (`"scope": "/"`): su Android il WebAPK cattura
i link del proprio scope, quindi toccando quel link da un'altra app si apre **nell'app installata** —
l'unico posto dove il difetto esiste.

🛑 **Va concordato con Francesco prima di scriverlo**: è comunque un file che finisce in produzione.

### 7.3-bis ✅ PRIMA MISURA — 26/07/2026 14:53, **DAL BROWSER** (non dall'app)

Il link si è aperto in Chrome invece che nella PWA installata: `display-mode: browser`. **Come
misura del difetto non vale** — ma dice tre cose che valgono lo stesso, e una cambia il §2.6.

| | valore |
|---|---|
| `innerHeight` · `100dvh` · `100svh` · `visualViewport` | **699** (699.08) |
| `100lvh` · `100vh` | **755.08** |
| `screen.height × width` | **818 × 376** · dpr **3.25** · `innerWidth` 375 |
| **`safe-area-inset-bottom`** | **0 px** |
| `safe-area-max-inset-bottom` | **0 px** — cioè *supportata* e pari a zero, non assente |
| Chrome | **150** |
| Tema di sistema | CHIARO |

**Cosa se ne ricava:**

1. **755 − 699 = 56px**: è la barra di Chrome (quella dell'indirizzo), che sparisce allo scroll —
   da manuale, `lvh` la ignora e `dvh` la conta.
2. **818 − 755 = 63px**: lo spazio che la pagina **non ottiene mai**, nemmeno al massimo — barra di
   stato in alto più fascia dei gesti in basso.
3. 🛑 **`safe-area-inset-bottom` = 0 ANCHE DA BROWSER, su Chrome 150.** Se l'edge-to-edge di Chrome
   135 (§1.1) fosse attivo sul suo telefono, la pagina disegnerebbe *dentro* la fascia dei gesti e
   quell'inset sarebbe **maggiore di zero**. È zero. **Quindi sul device di Francesco l'edge-to-edge
   non è attivo nemmeno in una scheda di browser**, pur avendo Chrome 150.

   ⚠️ **Conseguenza sul §2.6, da portare al panel:** il colore azzeccato che vede da browser viene
   **solo** da Chrome 129 (la fascia copia il fondo della scheda), **non** dal disegnare sotto. E la
   fascia trasparente che vuole dipende dall'edge-to-edge — che sul suo telefono **oggi non si
   accende affatto**. Quindi «arriverà da sé quando Chrome rilascia la correzione» (§2.6) **vale
   solo se l'edge-to-edge si accenderà anche per lui**: va verificato, non dato per scontato.
4. **La versione di Android resta ignota.** La stringa diceva «Android 10; K»: è la UA **ridotta**
   che Chrome serve a tutti da Chrome 110 (versione congelata a 10, modello sempre «K»,
   anti-fingerprinting). **Leggere Android da lì dà un numero falso con l'aria di essere vero.** La
   pagina ora chiede il valore vero agli User-Agent Client Hints ad alta entropia.

**Correzioni applicate alla pagina dopo questa misura:** banda rossa in cima quando NON si è
nell'app installata, con le istruzioni per aprirla nel modo giusto; versione di sistema e modello
dai Client Hints invece che dalla UA; quattro righe ridondanti spostate nel solo testo copiato,
perché a 375pt di larghezza la pagina non entrava più in una schermata.

### 7.3-ter 🎯 MISURA BUONA — 26/07/2026 15:10, **DENTRO LA PWA INSTALLATA** (`display-mode: standalone`)

Device: **Android 16.0.0** (valore vero, dai Client Hints) · **Chrome 150** · modello `25113PN0EG` ·
dpr 3.25 · tema di sistema CHIARO.

| | **app installata** (15:10) | **browser** (14:53) |
|---|---|---|
| `display-mode` | **standalone** | browser |
| `window.innerHeight` | **755** | 699 |
| `100dvh` | **755.08** | 699.08 |
| `100svh` | **699.08** | 699.08 |
| `100lvh` · `100vh` | 755.08 | 755.08 |
| `visualViewport.height` | **755.08** | 699.08 |
| **`document clientHeight`** | **699** ⚠️ | 699 |
| `safe-area-inset-bottom` | **0 px** | 0 px |
| `safe-area-max-inset-bottom` | 0 px (supportata) | 0 px (supportata) |
| `screen.height × width` | 818 × 376 | 818 × 376 |

#### 🎯 IL NUMERO CHE NON TORNA: 755 contro 699

**Nell'app installata la finestra è alta 755, ma il documento ne riceve 699.** Sono **56 punti** che
stanno sullo schermo e che **l'impaginazione della pagina non può occupare**. Da browser i due
numeri **coincidono** (699 = 699) e infatti da browser il difetto non c'è.

Conferme incrociate dentro la stessa misura:
- `100svh` = **699.08** = esattamente `document clientHeight`. Cioè **Chrome tiene come viewport di
  impaginazione quello «piccolo»**, quello che varrebbe con la barra dell'indirizzo a schermo —
  **in una finestra dove quella barra non può esistere.**
- I 56 punti sono **gli stessi** che nel browser separano `lvh` (755.08) da `dvh` (699.08): sono lo
  spazio della barra di Chrome. **In standalone quello spazio resta riservato a una barra che non
  c'è.**
- `818 − 755 = 63`: lo spazio che la pagina non ottiene mai — barra di stato più fascia dei gesti.

#### 🎯 Perché questo spiega la striscia panna, e perché solo su `/cassette`

Il fondo del documento, anche scorrendo fino in fondo, si ferma a **699**. I 56 punti sotto restano
dipinti **solo dal fondo del `body`**, che è panna (`#F4F0E7`).

- **`/cassette`**: il muro è una texture diversa (rete) e finisce col documento, a 699. Sotto
  restano 56 punti di **panna liscia**. **La si vede.** ✅ combacia con lo screenshot a fondo scroll.
- **Home**: è panna anche lei, identica al fondo del `body`. Il confine c'è, ma **non si vede**,
  perché è panna su panna. ✅ combacia con lo screenshot della home.
- **Browser**: `clientHeight` = `innerHeight`, nessun residuo. ✅ combacia con «da browser è giusto».

🛑 **Questa è la spiegazione principale e MISURATA, non ancora una prova.** Lega tre osservazioni
diverse a un unico numero letto sul device, ma il passaggio «il documento si ferma a 699 → sotto
resta il fondo del body» **non è ancora stato visto accadere**. La prova sta nel §7.3-quater.

#### Le altre due conferme, che chiudono capitoli aperti

1. ✅ **`safe-area-inset-bottom` = 0 nell'app installata**: la PWA **non** disegna dietro le barre di
   sistema — il §1.2 è confermato **sul suo device**, non solo sulla carta.
2. ✅ **Android 16 + Chrome 150**, cioè lo stack più recente possibile, **e il limite del §2.1 c'è
   lo stesso**: il bug Chromium 40759522 è aperto e lo si tocca con mano qui.

⚠️ E resta in piedi l'avvertenza del §7.3-bis: `safe-area-inset-bottom` è 0 **anche da browser**,
quindi l'edge-to-edge di Chrome 135 **non è attivo su questo telefono** nemmeno in una scheda. La
frase «la trasparenza arriverà da sé» (§2.6) **non si può dare per scontata per lui**.

### 7.3-quater La prova che manca — riprodurre il difetto FUORI dal nostro codice

Il §7.3-ter spiega, non dimostra. La prova decisiva è far accadere la stessa cosa **in una pagina
che non contiene una riga del nostro CSS**: un blocco alto il doppio dello schermo, con una fascia
colorata netta in fondo. Scorrendo fino in fondo, **nell'app installata**:

- se fra la fascia colorata e il bordo dello schermo restano ~56 punti di fondo → **il meccanismo è
  di Chrome, dimostrato, e il nostro foglio di stile è estraneo**;
- se la fascia arriva al bordo → il §7.3-ter è **falso** e la causa è nostra, da cercare altrove.

Aggiunta alla pagina di diagnosi come «PROVA 2». Serve un secondo screenshot, a fondo scroll.

#### ⚠️ PRIMO GIRO (26/07, 15:26) — la prova sembra SMENTIRE il §7.3-ter, ma non la si può leggere a occhio

Screenshot di Francesco, app installata, a fondo della PROVA 2: **la fascia blu arriva al bordo
dello schermo, con la barretta dei gesti sopra. Nessuna striscia scoperta.** Se il dato è quello,
**il §7.3-ter è falso**: il documento in standalone *arriva* in fondo, i 56 punti non sono
irraggiungibili, e la striscia di `/cassette` ha un'altra causa — nostra, e ancora da trovare.

🛑 **Ma non si chiude una diagnosi leggendo un JPEG.** Su una foto compressa, un residuo di 56
punti e un residuo di zero si somigliano troppo, e tutta la ricostruzione del §7.3-ter dipende da
quale dei due sia. **È lo stesso errore di metodo che ha prodotto il verbale sbagliato del 26/07:
guardare invece di misurare.**

**Correzione: il verdetto ora lo CALCOLA la pagina e lo STAMPA.** Una fascia nera fissa in cima,
sempre dentro lo screenshot, che mentre si scorre mostra `finestra` · `documento` · `impagina`, dice
se si è davvero a fondo scroll (`scrollTop` contro il massimo — così non si scambia «quasi in
fondo» per «in fondo») e in fondo stampa **`RESIDUO SCOPERTO: N px`**, in verde se 0 e in rosso se
maggiore. Niente più occhio: un numero.

**Caso di controllo, banco, viewport 375×755** (dove `clientHeight` = `innerHeight`):
`finestra 755 · documento 1883 · impagina 755 → RESIDUO SCOPERTO: 0 px`. È il valore da confrontare.

| Verdetto sul device | Cosa vuol dire |
|---|---|
| **~56 px** | §7.3-ter **dimostrato**: la pagina non arriva in fondo, il meccanismo è di Chrome, il nostro CSS è estraneo |
| **0 px** | §7.3-ter **falso**: la pagina arriva in fondo, e la striscia di `/cassette` è **nostra** — si riparte dalla struttura di quella pagina, non da Chrome |

### 7.4 La striscia panna — cosa serve vedere

Uno screenshot di `/cassette` **a fondo scroll** e uno **in cima**, sulla PWA installata, più la
stessa coppia **da scheda di browser** sullo stesso telefono. Serve a distinguere «il muro non
arriva in fondo» da «c'è una fascia che il contenitore lascia scoperta».

---

## 8. Cosa deve decidere il panel advisor (passo 3, DOPO le misure)

### 8.1 Barra dei gesti: quali strade restano, quando la piattaforma non lascia voce in capitolo

⚠️ **Il traguardo dichiarato da Francesco è la fascia TRASPARENTE** (§0-bis), non un colore diverso.
Va tenuto presente valutando le strade: alcune danno un colore migliore ma **allontanano** dalla
trasparenza.

Da valutare con i costi di ognuna, **nessuna preselezionata**:
1. **Non fare niente e dirlo.** È un limite noto di Chrome che tocca ogni PWA installata; la
   correzione è in lavorazione (§1.2, §2.6) e **ci arriverebbe senza modifiche**, perché
   `display: standalone` + `viewport-fit=cover` sono già dichiarati. È l'unica strada che porta
   davvero alla trasparenza. Costo: aspettare, senza data.
1-bis. **Prepararsi a quel giorno**: rivedere i 28 `env(safe-area-inset-bottom)` (§5.2) ORA, perché
   quando la fascia si aprirà quel valore smetterà di essere 0 e il layout cambierà da solo, in
   produzione, senza che nessuno abbia toccato niente. È lavoro utile a prescindere.
2. **Far combaciare i temi:** legare il tema dell'app a quello del telefono, o almeno evitare che
   divergano (§5.1). Non elimina la differenza bianco↔panna, ma toglie il caso peggiore.
3. **Scegliere un fondo che regga in entrambi i temi di sistema** — sarebbe un cambio di design
   system, non un rimedio tecnico: passa da Francesco.
4. **TWA / Play Store:** una TWA colora entrambe le barre correttamente (§2.1). È un cambio di
   strategia di distribuzione, non un fix — costi e implicazioni tutti da pesare.
5. **`display: fullscreen`** invece di `standalone`: nasconde del tutto le barre. Cambia il modo in
   cui si usa l'app: decisione di prodotto, non tecnica.

### 8.2 Barra di stato (voce A5, riaperta)

Che colore deve avere ora che il fondo è unificato, e se la variante chiaro/scuro col `media` arriva
davvero alla PWA installata su Android (§3.3). **Decisione da rifare con Francesco:** il rosso fu
messo di proposito ed era giusto allora. I **tre posti** vanno mossi insieme, `offline.html`
compreso (§5).

### 8.3 Striscia panna

Se è la stessa classe di difetto già chiusa due volte, **cosa la rende ricorrente** e cosa la chiude
per costruzione invece che per rimedio (§2.5).

### 8.4 I 28 `padding-bottom` con safe-area

L'avvertenza di Chrome sul «chin» (§5.2): una scelta fatta 28 volte senza conoscerne la conseguenza.

---

## Fonti

**Primarie — tracker Chromium** (aperte col browser interno; **WebFetch restituisce solo la pagina
di accesso**, quindi vanno lette da browser):
- [40759522 — Installed PWA doesn't respect theme color for status-bar and nav-bar](https://issues.chromium.org/issues/40759522) — aperto 06/04/2021, **In Progress**, riaccettato 11/07/2026. **La fonte del §2.1, §2.2, §2.3 e §4.**
- [407420295 — Edge-to-Edge not working for fullscreen PWAs](https://issues.chromium.org/issues/407420295) — aperto 31/03/2025 da un ingegnere Chromium, **In Progress**, ultimo movimento 20/07/2026. La fonte del §1.2.
- [421933373 — Manifest theme_color remains partially visible below meta theme-color](https://issues.chromium.org/issues/421933373) — **Fixed** (Canary 150, maggio 2026). La fonte del §3.4.

**Primarie — documentazione:**
- [Chrome on Android edge-to-edge migration guide](https://developer.chrome.com/docs/css-ui/edge-to-edge)
- [Prepare for Chrome on Android going edge-to-edge](https://developer.chrome.com/blog/edge-to-edge)
- [`<meta name="theme-color">`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color) — MDN
- [Customize your app's theme and background colors](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Customize_your_app_colors) — MDN
- [`env()` CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) — MDN
- [Intent to prototype and ship: Honor media HTML attribute for meta name=theme-color](https://groups.google.com/a/chromium.org/g/blink-dev/c/6I-I3lZWy5k/m/kjqDF1ARBQAJ) — blink-dev

**Secondarie:**
- [Kavita #4479 — PWA Gesture Navigation Bar shows incorrect background color in Standalone mode](https://github.com/Kareadita/Kavita/issues/4479)
- [Chrome for Android is finally fixing installed Web Apps' edge-to-edge annoyance](https://tech-ish.com/2026/07/15/google-chrome-for-android-pwa-edge-to-edge/) — tech-ish, 15/07/2026
- [w3c/manifest #975 — theme color for light & dark modes](https://github.com/w3c/manifest/issues/975)
- [\[Proposal\] Transparent Bottom Navigation Bar](https://discourse.wicg.io/t/proposal-transparent-bottom-navigation-bar/4023/) — WICG
- [Fenix #15857 — nav/status bar colours should follow the browser theme](https://github.com/mozilla-mobile/fenix/issues/15857)
- [Complete guide to customizing the mobile status bar in a website or PWA](https://intercom.help/progressier/en/articles/10574799-complete-guide-to-customizing-the-mobile-status-bar-in-a-website-or-pwa) — Progressier
- [App design](https://web.dev/learn/pwa/app-design) — web.dev
