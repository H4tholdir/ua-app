# Un tema solo, e la barra lo segue — design

**Data:** 26/07/2026 · **Stato:** approvato da Francesco, da pianificare
**Assorbe:** voce **A5** del backlog tecnico (`BACKLOG-TECNICO-2026-07-02.md:63` e `:523`)
**Ricerca a monte:** `docs/roadmap/2026-07-26-ricerca-barre-pwa-android.md` §3
**Panel advisor:** mobile-engineer · solution-architect · ux-designer (26/07/2026 — verbale in §9)

---

## 1. Le due invarianti

> **1. Il tema è uno solo: l'app segue il telefono, salvo che l'utente lo blocchi. Si blocca in un
> posto solo — Impostazioni. Nessun altro punto dell'app decide il tema per conto proprio.**
>
> **2. La barra di stato è il fondo della superficie corrente. Se il fondo cambia, la barra cambia
> con lui.**

La seconda esiste perché la prima è vera: quando c'è **una** cosa da seguire, seguirla è banale.

**Perché sono invarianti e non valori.** A5 si era già chiusa una volta (20/07/2026, Bundle Q
`04cf00b`) e **riaperta** il 26/07 — non perché il lavoro di luglio fosse sbagliato (`#D90012` era
corretto per il suo scopo di allora), ma perché il backlog aveva conservato **una conclusione** al
posto di **una relazione**. Quando l'ondata «redesign parete/home» ha unificato il fondo, la
conclusione è diventata falsa in silenzio. La guardia (§7) presidia le relazioni, **mai** i valori.

---

## 2. Le decisioni di Francesco (26/07/2026)

| # | Decisione |
|---|---|
| D1 | **La barra di stato si fonde con l'app** — `#F4F0E7` in chiaro, `#171411` in scuro |
| D2 | **La pagina offline si allinea al fondo unificato**, versione scura inclusa |
| D3 | **Rollout in due tempi** per la barra: prima il solo meccanismo, poi il resto (§6) |
| D4 | **Un tema solo:** predefinito «segue il telefono»; per bloccarlo, **un'unica opzione in Impostazioni** |
| D5 | **Tutti gli altri punti di accesso al tema si bonificano e spariscono** — login compreso |
| D6 | **Nessuna eccezione:** le due schermate a tema fisso passano sotto la regola unica |
| D7 | L'**area amministrazione** rientra nella bonifica (il suo interruttore e la sua memoria separata spariscono) |

**Decise dall'implementatore, con motivazione:**

- **`/ds-v3-catalogo` tiene il suo interruttore.** È lo strumento con cui si confrontano i componenti
  nei due temi; non è una superficie che l'utente incontra. Eccezione **dichiarata**, presidiata
  dalla guardia §7.3 come voce nominata, non come buco.
- **I toast passano sotto la regola unica.** `src/components/ui/sonner.tsx:3` importa `useTheme` da
  **`next-themes`**, libreria di cui non esiste alcun provider montato: `theme` è sempre `undefined`
  e ricade su `"system"`. Oggi i messaggi in basso seguono il **telefono** mentre l'app segue la
  preferenza. È la settima fonte di verità, ed è una riga.

---

## 3. Stato di fatto — sette posti decidono il tema, con quattro regole diverse

Accertato leggendo il codice, non dedotto.

### 3.1 Chi decide

| Superficie | Chi decide | Memoria | Scrive `data-theme` su `<html>` |
|---|---|---|---|
| App (v3 e legacy) | `src/hooks/useTheme.ts:9-15` + `src/components/layout/ThemeInitializer.tsx:5-10` | `ua-theme` | **sì** |
| Accesso / reset / recupero / invito | `login-form.tsx:148-152`, `reset-form.tsx:112`, `forgot-form.tsx:37` — **solo** `prefers-color-scheme` | **nessuna** | no — usa `data-login-theme` sul `.login-root` (`login-form.tsx:309`) |
| Amministrazione | `src/app/admin/admin-nav.tsx:29-47` | **`ua-admin-theme`** | sì (solo l'attributo, mai la classe) |
| Catalogo DS | `src/app/ds-v3-catalogo/page.tsx:172,174` | — | sì, ma con `removeAttribute` |
| `blocked` | tema **fisso** scuro (`blocked/page.tsx:37`) | — | no |
| `billing` | tema **fisso** chiaro (`billing-content.tsx:158`) | — | no |
| Toast | `sonner.tsx:8` — `next-themes` senza provider → sempre `"system"` | — | no |
| Portale pubblico | `portale/[token]/layout.tsx:15` — fondo `#F8F9FA` **cotto a mano**, insensibile al tema (il gemello `richiedi/[token]/layout.tsx:15` usa invece `var(--bg, …)` e segue) | — | no |

⚠️ **Due trappole emerse in code review, entrambe da portarsi in tappa 3.**

**(a) Metà del CSS è agganciata alla classe `dark`, metà a `data-theme`.** `globals.css:163` apre il
tema scuro con `.dark`; `ds-v3.css` con `[data-theme="dark"]`. **Solo** `useTheme.applyTheme`
(`useTheme.ts:71-80`) e lo script inline muovono **entrambi**; `admin-nav.tsx:36,44` e
`ds-v3-catalogo/page.tsx:172,174` muovono **solo l'attributo**. Misurato: `{"dt":"dark","dark":false}`
— barra scura, classe assente, fondo chiaro. Su `/admin` c'è in più una **corsa reale**: lo script
decide da `ua-theme`, poi `admin-nav` sovrascrive da `ua-admin-theme`, e con le due chiavi discordi
la barra di sistema **lampeggia** dopo l'idratazione. La regola unica (D4/D7) chiude anche questo.

**(b) Il portale pubblico era fuori dal censimento.** È la pagina che vede **il dentista**, non
l'odontotecnico. Con la barra che ora segue il tema, in scuro la barra diventa `#171411` mentre
quella pagina resta bianco freddo. Va deciso in tappa 3 se il portale segue il tema o dichiara di
non seguirlo.

### 3.2 Dove si cambia tema oggi (i punti di accesso da bonificare, D5)

| # | Punto | File:riga | Destino |
|---|---|---|---|
| 1 | Sole/luna in testata | `AppHeader.tsx:124` (prop `showThemeToggle`) | **rimosso**, prop compresa |
| 2 | Secondo sole/luna nella scheda lavoro | `SchedaNavRail.tsx:128` | **rimosso** |
| 3 | Pannello profilo utente | `UserProfileSheet.tsx:68` (`toggle`) | **rimosso** |
| 4 | Sole/luna sull'accesso — **effimero**: `login-form.tsx:313` muta solo stato React e si perde al reload | `login-form.tsx:312-317` | **rimosso** |
| 5 | Interruttore amministrazione, memoria separata | `admin-nav.tsx:29-47` | **rimosso**, `ua-admin-theme` compresa |
| 6 | Catalogo DS | `ds-v3-catalogo/page.tsx:172,174` | **resta** — eccezione dichiarata |
| 7 | *(non è un interruttore)* Toast | `sonner.tsx:8` | portato sotto la regola unica |

`src/components/layout/ThemeToggleButton.tsx` resta in vita **solo** se serve al catalogo;
altrimenti si elimina. Lo decide il piano, non questo documento.

### 3.3 Perché è bloccante per la barra

`manifest.json:5` dichiara `start_url: /dashboard`: a sessione scaduta la prima superficie dopo lo
splash è **l'accesso**. Se la barra seguisse il tema dell'app mentre l'accesso segue il telefono,
con preferenza divergente si otterrebbe **barra scura su pagina chiara** — la stessa classe di
difetto appena chiusa in fondo alla parete, ribaltata in cima.

**Conseguenza di progetto:** il denominatore comune utilizzabile è **`data-theme` su `<html>`**, non
la classe `dark`: `admin-nav.tsx:36,44` scrive solo l'attributo, e un osservatore sulla classe non lo
vedrebbe.

---

## 4. La regola unica

### 4.1 Tre stati, non due

`modo ∈ { 'sistema', 'chiaro', 'scuro' }`, **predefinito `sistema`**. Il tema *risolto* resta binario
(`light` / `dark`) ed è ciò che finisce su `<html>`.

### 4.2 Chiave nuova, vecchia ignorata e rimossa

La chiave diventa **`ua-tema`**; `ua-theme` viene ignorata e cancellata al primo avvio.

**Perché non riusarla.** `ua-theme` oggi contiene `light`/`dark` scritti da un interruttore a **due**
stati: chi lo ha toccato **non ha mai potuto scegliere «automatico»**, quindi quel valore non
esprime la volontà di bloccare il tema — la esprimerebbe solo per accidente. Chiave nuova = nessun
flag di migrazione, nessuna ambiguità, e tutti ripartono da `sistema`.

⚠️ **Conseguenza da dire a Francesco prima che la veda:** se aveva forzato un tema, dopo
l'aggiornamento si ritrova in «Automatico». È voluto.

### 4.3 Una fonte sola, letta prima della pittura

- `ThemeInitializer.tsx` — script inline sincrono in `<head>`, quindi **prima della prima pittura**:
  legge `ua-tema`, risolve (`sistema` → `matchMedia`), applica classe `dark` + `data-theme`, e chiama
  l'upsert del colore barra (§5.2). Resta dentro il `try/catch` esistente.
- `useTheme.ts` — espone `modo`, `temaRisolto`, `impostaModo(modo)`. Il listener su `matchMedia`
  (`useTheme.ts:47-57`) agisce **solo quando `modo === 'sistema'`**.
- Nessun altro modulo risolve un tema. Chi ha bisogno di sapere se è chiaro o scuro legge
  `temaRisolto` o si aggancia a `<html>` nel CSS.

### 4.4 Le schermate di autenticazione si agganciano a `<html>`, non a React

`.login-root[data-login-theme="light|dark"]` (`globals.css:267`/`:301`) è pilotato da stato React:
al primo render varrebbe `light`, con **lampo chiaro** in tema scuro. `data-theme` su `<html>` è
invece già scritto prima della pittura.

Quindi la tavolozza si aggancia a `<html>` e `data-login-theme` sparisce, insieme alla logica
`prefers-color-scheme` locale di `login-form.tsx`, `reset-form.tsx`, `forgot-form.tsx`,
`invite-form.tsx`.

### 4.5 Nessuna eccezione (D6)

`blocked/page.tsx:37` e `billing-content.tsx:158` smettono di imporre un tema fisso. **Da guardare in
QA in entrambi i temi**: la schermata di sospensione era scura per dare peso al messaggio, e in tema
chiaro va verificato che il messaggio regga comunque.

### 4.6 L'opzione in Impostazioni (D4)

Una voce in `src/app/(app)/impostazioni/` con tre scelte: **Automatico** (predefinita, con
sottotitolo che dichiara cosa sta seguendo ora) · **Sempre chiaro** · **Sempre scuro**.

⚠️ **UI nuova → workflow §0B obbligatorio:** mockup HTML in `docs/design/mockups/`, screenshot nei
tre viewport × light/dark, **approvazione di Francesco**, decisione in `docs/design/decisions/`,
e **solo dopo** il React. Non è aggirabile perché «è solo un selettore».

---

## 5. Il colore della barra

### 5.1 Un modulo tiene il colore, e non contiene colori

`src/design-system/colore-barra-sistema.ts`: **nessun hex**, deriva da `v3/tokens.ts` (`luce.bg` /
`notte.bg`); esporta **solo** `COLORE_BARRA = { light, dark }`.

🛑 **Niente funzione TypeScript gemella dell'upsert.** La prima stesura ne esportava una
(`impostaColoreBarra`): in review si è visto che **la usava solo il test**, perché la produzione
esegue `barra()` dentro la stringa dello script — che non può importare moduli. Due implementazioni
della stessa logica, di cui una mai eseguita, divergono in silenzio con la suite verde. Rimossa.

Il modulo **valida** i propri valori (`/^#[0-9A-Fa-f]{6}$/`) e lancia altrimenti: finiscono
interpolati dentro apici singoli in `dangerouslySetInnerHTML`, e un apice o un `</script`
produrrebbe un errore di sintassi che il `try/catch` dello script **non può catturare** (uccide lo
script che lo contiene). Così il guasto muto diventa un fallimento di build.

Verificato che **una sola coppia basta per tutte le superfici**: `globals.css:72`/`:165` (`--bg`),
`globals.css:271`/`:302` (`--ua-bg`, accesso), `admin/admin.css:10`/`:38` (`--adm-bg`) valgono già
tutte `#F4F0E7` / `#171411`.

### 5.2 L'upsert vive nello script, ed è **upsert** davvero

`barra()` aggiorna il `content` di **tutti** i `meta[name="theme-color"]` presenti e **ne crea uno**
se non ce n'è nessuno. L'ordine fra i tag emessi da Next e lo script inline **non è un contratto**
(React 19 solleva e riordina `<meta>` rispetto al JSX): un `querySelector` che trova `null` è un
no-op silenzioso che funziona in una build e non nell'altra.

⚠️ **Lo storage sta in un `try` separato.** Rilievo di review, misurato: con un `try` unico, un
`localStorage` che lancia (privacy del browser, cookie bloccati, WebView, policy aziendali) faceva
cadere **tutto** — niente `data-theme`, niente classe `dark`, niente meta — e da quando `layout.tsx`
non dichiara più `themeColor` non resta nemmeno un colore di riserva nell'HTML. Ora lo storage
degrada al tema di sistema invece di azzerare lo script.

⚠️ **Il ciclo scrive tutti i meta trovati.** Oggi ce n'è al massimo uno. Se un domani tornasse la
forma a coppia chiaro/scuro con l'attributo `media`, li porterebbe **entrambi allo stesso valore**,
annullando la distinzione in silenzio. Annotato nel codice.

### 5.3 Nessun meta statico: `themeColor` esce dall'export `viewport`

`layout.tsx:28` — si rimuove `themeColor`. È l'**unico** `export const viewport` dell'app, quindi
rimuoverlo lì lo rimuove ovunque. Si guadagna:

- React non possiede più alcun `theme-color`: il rimontaggio su navigazione è **impossibile per
  costruzione**;
- la questione «quale meta deve stare per primo» **non si pone**: ce n'è uno solo (§9.1);
- il colore è giusto **prima della prima pittura**, senza attendere l'idratazione;
- senza JS: nessun meta → Chrome usa il `theme_color` del manifest, che dopo la fase 2 è già giusto.

### 5.4 L'osservatore

`MutationObserver` su `document.documentElement`, `attributeFilter: ['data-theme']`. Copre ogni
scrittore presente e futuro senza patchare i chiamanti uno per uno.

⚠️ **Trappola verificata:** `ds-v3-catalogo/page.tsx:172` fa `removeAttribute('data-theme')`, quindi
l'attributo diventa **assente**, non `"light"`. La condizione dev'essere `attr === 'dark' ? scuro :
chiaro`. Scritta al contrario, quella pagina si prende una barra scura in tema chiaro.

I valori vanno **interpolati dalla costante** nella stringa dello script inline, mai ridigitati:
altrimenti nasce l'ennesimo posto che tiene il colore di fondo.

### 5.5 Il manifest

`manifest.json:8` → `#F4F0E7`. Un valore solo, non sensibile al tema (`w3c/manifest#975` ancora
aperta). Si sceglie il chiaro perché `manifest.json:7` dichiara già `background_color: #F4F0E7`:
i due si vedono **insieme**, sullo stesso fotogramma dello splash (§8.1).

### 5.6 La pagina offline (D2)

`offline.html`: il meta (`:6`) **e** il `background` del `body` (`:11`) si muovono **insieme** —
cambiarne uno solo ricrea esattamente il difetto che stiamo togliendo. Si aggiunge il blocco
`@media (prefers-color-scheme: dark)`, e se vi si mette uno script inline per onorare anche la
preferenza bloccata, va in `try/catch`: lì non c'è React a raccogliere un errore, ed è l'unica
schermata che si vede quando manca la rete.

🛑 **`offline.html:27` (`.retry`) resta `#D90012`.** È un colore d'azione, non un tema. Verificato
dal panel: bianco su `#D90012` = 5,30:1, passa AA anche in scuro; bianco sul rosso notte v3
`#FF3B44` (`ds-v3.css:51`) = **3,52:1** su testo 15px bold → violazione. Se si volesse variarlo:
`#E8001A` (`globals.css:173`) = 4,72:1, passa. **Mai `#FF3B44`.**

Da chiudere nello stesso passaggio, perché si sta comunque toccando il file: dichiara
`font-family: 'DM Sans'` (`:13`) senza caricare alcun font, mentre l'app monta Plus Jakarta Sans
(`layout.tsx:5-8`); e non ha icona (`:38-43`: solo `h1`, `p`, `button`) — togliendole il colore
diverso, resta solo il testo a dire «non c'è rete».

---

## 6. Ordine di lavoro — tre tappe, ognuna chiude qualcosa

### Tappa 1 — il meccanismo della barra (esperimento)

`colore-barra-sistema.ts` (nuovo) · `layout.tsx:28` · `ThemeInitializer.tsx` (upsert + observer).
**`manifest.json` e `offline.html` non si toccano.**

🛑 **La tappa 1 deve contenere lo scrittore dinamico.** Spedire il solo cambio di stringa renderebbe
la seconda osservazione **nulla per costruzione**: l'interruttore non muoverebbe nulla, Francesco
riferirebbe «non cambia», e si butterebbe via l'unica soluzione che funziona.

**Perché due tempi sono discriminanti.** Non perché «il WebAPK non fa in tempo a rigenerarsi» — vero
ma poggia su tempistiche indimostrabili. Perché **nella tappa 1 il manifest non cambia valore**: il
colore cotto nel WebAPK non ha nulla verso cui aggiornarsi, qualunque sia la frequenza dei controlli
di Chrome.

#### Protocollo di prova — sul suo device, in PRODUZIONE

L'app installata è agganciata a `uachelab.com`: dal banco non si riproduce, e installare da `:3020`
creerebbe una seconda app falsando tutto.

1. Deploy verde su `uachelab.com`.
2. **Chiudere UÀ dai recenti** (o forza arresto). Senza questo Android ripristina il task, il
   documento vecchio resta vivo e non arriva nessun HTML nuovo: falso negativo garantito.
3. Aprire e riferire il colore della barra.
4. **Toccare l'interruttore chiaro/scuro ad app aperta e dipinta**, e riferire se la barra cambia dal
   vivo. **È l'osservazione decisiva:** immune sia dallo splash (che usa il manifest, ancora rosso)
   sia dai tempi di aggiornamento del WebAPK.
   🛑 **L'interruttore va premuto DA DENTRO L'APP, con la sessione valida — mai dalla schermata di
   accesso.** In tappa 1 il login non è ancora unificato: il suo sole/luna (`login-form.tsx:313`)
   muta **solo stato React** e non scrive `data-theme`, quindi l'osservatore non scatta e la barra
   non si muove **per costruzione**. Premerlo lì produrrebbe la frase «non cambia» che questo intero
   rollout esiste per non farsi dire per sbaglio. È la stessa trappola di `DiagFondo`: uno strumento
   che funziona, montato sulla superficie sbagliata.
5. Navigare fra due pagine e riferire se la barra regge (verifica che nulla rimonti il meta).

🛑 **Non giudicare dallo splash:** in tappa 1 è ancora rosso per definizione.

**Se la barra non segue dal vivo:** la tappa 3 (che introduce «Automatico» come predefinito) rende
corretti i due meta con `media`, e si ripiega su quelli. ⚠️ I due meta `media` **senza** la tappa 3
resterebbero sbagliati: seguirebbero il telefono mentre l'app segue la preferenza.

### Tappa 2 — chiude A5

`manifest.json:8` · `offline.html` (§5.6) · guardia della barra (§7.1-7.2).

### Tappa 3 — la regola unica (ondata a sé, BP-2 pieno)

Tre stati + chiave `ua-tema` · bonifica dei punti 1-5 (§3.2) · autenticazione agganciata a `<html>`
· `blocked` e `billing` · toast · **UI in Impostazioni con mockup e approvazione (§4.6)** · guardia
del censimento (§7.3).

🛑 **Vincolo di sequenza interno alla tappa: l'opzione in Impostazioni arriva NELLO STESSO deploy
delle rimozioni, mai dopo.** Ordinare prima le rimozioni lascerebbe un intervallo di commit in cui
l'unico modo di cambiare tema è `localStorage`.

⚠️ **Non sono tre cancellazioni.** `AppHeader.tsx:124` è governato dalla prop `showThemeToggle`:
rimuoverla obbliga ad aggiornare **ogni** chiamante. Sono errori di compilazione, quindi il rischio è
zero, ma il conteggio dei file non è quello che §3.2 lascia intuire.

⚠️ **`blocked` e `billing` (D6) sono UI nuova, non pulizia.** Portarle sotto la regola unica significa
che due superfici prendono una resa **che non è mai esistita** (la sospensione in chiaro, l'abbonamento
in scuro). Il piano deve attaccare a **queste due specificamente** il workflow §0B — mockup,
approvazione, decisione scritta — e il GATE ESTETICO L2 (FASE 9b). Senza, D6 diventa in silenzio
«spedita una variante chiara mai rivista della schermata di laboratorio sospeso».

---

## 7. La guardia

`tests/unit/un-tema-solo-e-la-barra-lo-segue.test.ts` — il nome dichiara **le relazioni**, non gli
indirizzi (regola lasciata al progetto il 26/07). Stessa forma di
`tests/unit/home-parete-fino-in-fondo.test.ts`.

**Regola che governa tutte le asserzioni: nessun hex letterale, tranne il rosso della pillola.** Un
`expect(theme_color).toBe('#F4F0E7')` resterebbe verde con la barra sbagliata al prossimo cambio di
fondo — cioè il modo esatto in cui A5 si è riaperta.

### 7.1 «La barra è il fondo»

1. **Il fondo è uno solo e tutte le sue copie coincidono**: `ds-v3.css:13`/`:48`,
   `globals.css:72`/`:165`, `v3/tokens.ts:5`/`:14`, `design-system/tokens.ts:8`/`:26`. La decisione
   del 26/07 sul fondo unico oggi **non ha nessuna guardia**: questo blocco la protegge di sponda.
2. `colore-barra-sistema.ts` **non contiene hex**.
3. `manifest.json`: `theme_color === background_color === COLORE_BARRA.light`.
4. `layout.tsx`: l'export `viewport` **non dichiara** `themeColor` e non contiene hex.
5. `ThemeInitializer.tsx`: lo script inline non contiene hex, interpola la costante, usa l'upsert.

### 7.2 «Pagina offline»

6. Il `content` estratto **dal tag con `name="theme-color"`** (mai per numero di riga)
   `=== COLORE_BARRA.light`.
7. `background` del `body` `=== COLORE_BARRA.light`; dentro `@media (prefers-color-scheme: dark)`
   `=== COLORE_BARRA.dark`.
8. **Trappola in positivo:** `.retry` deve **ancora** dichiarare `#D90012`. Unico hex letterale
   ammesso nel test, ed è quello che fa fallire rumorosamente una sostituzione a tappeto del rosso.

### 7.3 «Un tema solo» — il censimento

9. **Insieme chiuso dei posti che dichiarano un colore di barra**: ricerca di `theme_color`,
   `themeColor`, `name="theme-color"` su `src/` e `public/` → dev'essere **esattamente**
   `{manifest.json, offline.html, colore-barra-sistema.ts, ThemeInitializer.tsx}`. Un quinto posto
   fa fallire il test **col nome del file**.
10. **Insieme chiuso di chi risolve un tema.** 🛑 **Non asserire su `prefers-color-scheme`:** dopo
    §4.3 sono proprio `useTheme.ts` e `ThemeInitializer.tsx` a doverlo interrogare, quindi la
    stringa è legittima lì e il controllo si riduce a «nessun file nuovo la nomina» — che **non
    coglie** il modo di regredire vero. Un sesto risolutore può nascere **senza mai nominarla**:
    `admin-nav.tsx:29-33` oggi è esattamente di quella forma (legge `ua-admin-theme`, e solo in
    ripiego guarda `matchMedia`). Si assert sulle **operazioni che un risolutore non può evitare**:
    - `localStorage.getItem`/`setItem` con una chiave di tema compare **solo** in `useTheme.ts`;
    - le scritture di `data-theme` e di `classList` su `document.documentElement` compaiono **solo**
      in `useTheme.ts`, `ThemeInitializer.tsx` e `ds-v3-catalogo/page.tsx` (l'eccezione **nominata**
      di §2).
11. **Nessun secondo interruttore**: `ua-admin-theme` e `data-login-theme` non esistono più;
    `next-themes` non è importato da `src/`.

### 7.4 «Comportamento» — l'unico blocco che verifica invece di descrivere

12. In jsdom (`tests/setup.ts:18-26` ha già uno stub di `matchMedia`, ed è `writable`): sistema
    chiaro + `ua-tema = 'scuro'` → **tutti** i `meta[name="theme-color"]` portano lo scuro. E
    viceversa.
13. `ua-tema = 'sistema'` → il meta segue `matchMedia`, e **cambia** quando cambia il sistema.
14. Documento senza alcun meta → dopo la chiamata ce n'è **uno**.

### 7.5 Niente livello Playwright

Il blocco 7.4 copre la stessa classe di difetto a costo molto minore: qui non c'è geometria, c'è una
stringa. (Se un giorno servisse: `playwright.config.ts:15-38` usa `testMatch` a **lista chiusa** e
una spec nuova non gira finché non la si aggiunge — trappola già annotata al §7.3-sexies della
ricerca.)

---

## 8. Conseguenze accettate, da dire prima che si vedano

1. **Splash chiaro per chi usa il tema scuro.** Il manifest porta un solo `theme_color`. Una barra
   scura sopra uno splash panna sarebbe una contraddizione visibile **a ogni avvio, a tutti**; una
   barra panna lo è **solo dopo il primo disegno, solo in tema scuro**, per una frazione di secondo.
   🛑 **Non barattare con un terzo tono intermedio:** sarebbe `#DDD8D3` da capo.
2. **La tappa 2 non è annullabile in giornata.** Il valore del manifest è cotto nel WebAPK: torna
   indietro solo dopo un controllo di aggiornamento di Chrome, con ritardo e senza garanzia. Stato
   intermedio possibile: WebAPK vecchio (rosso) + meta nuovo. È l'argomento più forte a favore dei
   due tempi. Meta e `offline.html` tornano invece indietro col deploy successivo.
3. **Splash e scheda nei recenti non cambiano subito** dopo la tappa 2: dipendono dal WebAPK
   rigenerato. Un ritardo lì **non è** un fallimento del deploy. Per giudicarli: disinstallare e
   reinstallare. ⚠️ Vale anche all'indietro: `background_color` è passato a `#F4F0E7` il 26/07, ma
   chi non ha reinstallato **vede ancora lo splash `#DDD8D3`**.
4. **Chi aveva forzato un tema si ritrova in «Automatico»** (§4.2). Voluto.
5. **Non è un lavoro di accessibilità.** Verificato: `#F4F0E7` → icone scure, 18,5:1; `#171411` →
   icone chiare, 18,3:1; il rosso attuale `#D90012` → icone bianche, 5,30:1, **già leggibile**. È
   coerenza visiva, e va motivata come tale.
6. **Si chiude per la PWA installata su Android.** Non chiude la barra dei gesti in basso (bug
   Chromium 40759522, non nostro) e non chiude iOS (§10).

---

## 9. Punti su cui il panel ha corretto le premesse

### 9.1 L'ordine dei meta: §3.2 della ricerca è **contestato**

La ricerca (`2026-07-26-ricerca-barre-pwa-android.md:307-309`) dichiara che il primo
`meta[name="theme-color"]` deve essere quello **senza** `media`. Il solution-architect osserva che
l'algoritmo HTML scorre i candidati in tree order e **ritorna il primo che corrisponde**: un meta
senza `media` corrisponde sempre, quindi se sta per primo **rende inerti** le varianti successive —
e l'esempio MDN non ha alcun meta incondizionato.

**Non risolto qui, e non serve risolverlo:** l'architettura §5.3 emette **un solo meta**, quindi la
questione non si pone. Va **riverificata sulla fonte primaria** se si dovesse ripiegare sui due meta
(§6, tappa 1), e la riga della ricerca va corretta o confermata: lasciata com'è, il prossimo lettore
la implementa alla lettera e ottiene la variante scura inerte.

### 9.2 Il service worker: due advisor su tre hanno letto il file sbagliato

`mobile-engineer` e `ux-designer` hanno segnalato che `public/sw.js:1` dichiara
`CACHE_NAME = 'ua-dev'` costante, concludendo che `offline.html` resterebbe congelato sui device e
che servisse un bump manuale della cache.

**Verificato di persona: è falso.** `public/sw.js` è **generato** da `scripts/sw-template.js`
(`CACHE_NAME = 'ua-__BUILD_ID__'`) tramite `scripts/generate-sw.mjs`, invocato in `prebuild`
(`package.json:8`); `resolveBuildId` risolve a `VERCEL_GIT_COMMIT_SHA` in produzione. Il `ua-dev`
visibile in `public/sw.js` è l'artefatto della generazione `--dev` (`predev`, `package.json:6`).
**In produzione il nome della cache cambia a ogni deploy**, `activate` cancella le vecchie e
`offline.html` viene ri-precacheato. **Nessun accorgimento necessario.**

### 9.3 Cosa NON fare

1. Non spedire la tappa 1 senza lo scrittore dinamico (§6).
2. Non risolvere con due meta `media` statici senza la tappa 3 (§6).
3. Non usare un `querySelector` che presuppone il meta già nel DOM: **upsert** (§5.2).
4. Non toccare `appleWebApp.statusBarStyle` (`layout.tsx:22`). Oltre a essere un'altra piattaforma,
   `safe-area-inset-top` **non compare da nessuna parte** in `src/`: passare a `black-translucent`
   farebbe scorrere il contenuto sotto la barra iOS senza alcun padding che lo regga.
5. Non toccare `offline.html:27` e non fare sostituzioni a tappeto del rosso.
6. Non generare `manifest.json` a build time. Il suo diff deve restare **leggibile in revisione**:
   è l'unica modifica di questo lavoro che raggiunge i device in modo non simmetrico.
7. Non aggiungere una transizione al colore di fondo per «far stare dietro» la barra: il `body`
   dipinge senza transizione (`globals.css:235-241`), lo scambio è già istantaneo, e la si
   fabbricherebbe lo sfasamento che si teme.
8. Non chiudere dicendo «il rosso è a posto»: la barra dei gesti resta un problema distinto.

---

## 10. Fuori perimetro — voci di backlog da aprire, non da infilare qui

| Voce | Perché conta |
|---|---|
| `color-scheme` **mai dichiarato** in tutto `src/` | È ciò che dice al motore quale tavolozza usare per tela di sfondo, overscroll, scrollbar e controlli di form. Con un tema forzato via classe, la sua assenza è la causa classica dei lampi bianchi al rimbalzo dello scroll in tema scuro — stessa famiglia di difetti. **Dopo la tappa 3 diventa quasi banale**: c'è un solo posto dove dichiararlo |
| `safe-area-inset-top` mai usato | Se Chrome accende l'edge-to-edge su quel device (manopola lato server, cambia senza nostri deploy), il contenuto scivola sotto l'orologio. Parente dei 28 `-bottom` già a verbale |
| iOS: `appleWebApp.statusBarStyle: 'default'` | Su iPhone installato governa **quello**, non `theme-color`; `default` = testo scuro, con sospetto di scuro-su-scuro in tema scuro. Non verificabile dal repo |
| `--bg-deep` sotto la barra | Il fondo v3 non è uno solo: `--bg-deep` (`ds-v3.css:13`/`:48`) dista 8-14 punti per canale da `--bg`. Se la prima riga di pixel sotto la barra su `/dashboard` o `/lavori` è `--bg-deep` o una card, la barra «fusa» resta comunque staccata da ciò che ha sotto. **Da misurare, non da assumere** |
| `next-themes` come dipendenza | Dopo la bonifica di `sonner.tsx` potrebbe non essere più importata da `src/`. Verificare prima di rimuoverla dal `package.json` |

---

## 11. Validazione architetturale — BP-2 FASE 3

| Domanda | Risposta |
|---|---|
| Tocca RLS o `current_lab_id()`? | **No.** Nessun file toccato parla di Supabase |
| Serve migration? `supabase gen types`? | **No.** La preferenza vive in `localStorage`, non in DB |
| Il payload rompe client esistenti? | Nessuna API cambia. **Ma `manifest.json` è un contratto verso il sistema operativo**: il «client» è il WebAPK già installato, e la rottura è differita in andata e in ritorno (§8.2). È l'unico contratto in gioco |
| Rollback | Meta e `offline.html`: revert, effettivo al deploy successivo. Manifest: **asimmetrico** (§8.2). Tappa 3: revert pieno, con la sola coda che chi ha già scritto `ua-tema` torna a `ua-theme` assente → «segue il sistema» |
| Dominio critico (RLS/Stripe/FatturaPA/auth)? | **No.** Tappe 1-2: percorso **Piccola**. Tappa 3: percorso **Media** — tocca 10+ file, ha UI nuova, e richiede il GATE ESTETICO L2 (FASE 9b) sulle superfici modificate |

---

## 12. Come mostrarglielo prima di spedire

Il workflow §0B impone mockup prima del React, ma **un mockup HTML non può renderizzare la barra di
sistema Android**. Tre pezzi, ognuno prova una cosa sola:

1. **Colore delle icone** — paginetta usa-e-getta con due bottoni che scambiano dal vivo il
   `theme-color`, aperta in Chrome sul suo telefono. Prova quali icone sceglie Android. **Non** prova
   il comportamento in standalone.
2. **Comportamento reale** — l'URL di anteprima del ramo, installato dal telefono come app a sé.
   Prova la barra in standalone, il vincolo della tappa 1, il lampo all'avvio, il passaggio
   chiaro↔scuro. **Non è mostrabile come immagine:** va guardato in mano.
3. **Mockup di pagina** in `docs/design/mockups/` — la voce di Impostazioni (§4.6) e la pagina
   offline chiara e scura, nei tre viewport × light/dark, con scritto sotto **che cosa non
   dimostrano**: non la barra di sistema, non il colore delle icone, non i tempi dello splash, non il
   ritardo del WebAPK. Da guardare **sul telefono a grandezza reale**: su desktop la scala della
   striscia mente, e la striscia è tutto l'oggetto della decisione.

🛑 Non ritoccare a mano le icone di sistema in uno screenshot: falsificherebbe esattamente la cosa in
discussione.
