# Proposta — le CINQUE sezioni §5.x dell'album, del visore, della tendina e dei due fogli

> 🚪 **QUESTO DOCUMENTO È UN GATE, non una descrizione.** È il **Task 5** del piano
> `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`, e la spec v3 §13.1 punto 3 impone che
> una sezione §5.x si **proponga PRIMA** che il componente esista. **Nessuna riga di React è stata
> scritta**: T6, T7, T8, T9 e T9-bis non partono finché quello che c'è qui non è ratificato.

**Data:** 30 luglio 2026 · **Stato:** 🟡 **PROPOSTA — da ratificare**
**Scrive:** esecutore del Task 5 (R-E1) · **Ratifica:** Francesco Formicola
**Destinazione del testo:** `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
(§5.38-§5.42 nuove · §5.17 e §13.2 emendate · §5.33 corretta di una parola)
**Fonte di verità visiva di tutte e cinque:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`
**Spec della superficie:** `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`
**Decisioni:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **D64-D81**, in particolare
**D76** (album A1) · **D77** (visore V1) · **D78** (tendina M2) · **D79** (categoria C1) · **D80** (foglio
di conferma).

**I cinque componenti — tutti 🆕 da creare:** `src/components/ds/CartaAlbum.tsx` (🆕 da creare) ·
`src/components/ds/VisoreFoto.tsx` (🆕 da creare) · `src/components/ds/TendinaMenu.tsx` (🆕 da creare) ·
`src/components/ds/FoglioCategoria.tsx` (🆕 da creare) · `src/components/ds/FoglioConferma.tsx` (🆕 da creare).

---

## 0. Che cosa questo gate chiede di ratificare — l'elenco corto

| # | decisione | dove sta per esteso |
|---|---|---|
| **G-1** | I numeri di sezione sono **§5.38 → §5.42**. `provato:` `grep -rn "5\.38\|5\.39\|5\.40\|5\.41\|5\.42"` sulla spec v3 e su `src/components/ds/*.tsx` → **zero riscontri**: nessuno dei cinque numeri è già in uso | §2 |
| **G-2** | **Raggio delle miniature = `raggio.riga - 6` (cioè 12)**, non un 12 nudo e non un token nuovo | §1.7 |
| **G-3** | **Solo `VisoreFoto` blocca lo scorrimento del corpo.** Tendina e fogli **non lo toccano mai**, e non hanno niente da ripristinare | §1.4 |
| **G-4** | **`Escape` non si ascolta più su `window`:** si ascolta sul **pannello che ha il focus**, con `stopPropagation()`. Contratto: i quattro strati si montano **fratelli** | §1.5 |
| **G-5** | **z-index: visore 400 · tendina 500 · fogli di terzo strato 600** (intervallo libero misurato 302-999, P17) | §1.3 |
| **G-6** | **`molla.smooth` per tutti e quattro gli strati** — **è una scelta, non un token già pronto** per visore e tendina; per i due fogli la coreografia esiste già (`coreografie.sheetSu`, §8.3 n.6) | §1.8 |
| **G-7** | **Sette valori nuovi in `src/design-system/v3/tokens.ts`** (gruppo `sopraFoto`): senza, i componenti non passano il controllo pre-commit | §4 |
| **G-8** | **L'ordine dei due tasti della conferma resta quello di §5.17** (sicura sopra, distruttiva sotto) — **il mockup mostra l'opposto** e lo scostamento è dichiarato, con la ragione | §5, riga S3 |
| **G-9** | **I controlli del visore non si appoggiano alla sfumatura per il contrasto**: ognuno porta la propria faccia e il proprio confine. Due valori del mockup **non passano AA** e cambiano | §5, righe S4 e S5 |
| **G-10** | **L'emendamento a §5.17 e a §13.2** — testo pronto da incollare | §3 |

---

## 1. Le regole comuni ai cinque — si scrivono qui una volta, non cinque

> Le §5.x di §2 le richiamano per nome. Questo paragrafo **non** va incollato nella spec: è la spiegazione
> che sta dietro le righe brevi delle sezioni.

### 1.1 I quattro strati, e chi sta sopra chi
```
pagina  →  VisoreFoto  →  TendinaMenu  →  FoglioCategoria  |  FoglioConferma
```
`FoglioCategoria` e `FoglioConferma` sono **il terzo strato in alternativa**, mai insieme: dalla tendina si
va **o** a «Cambia categoria» **o** a «Elimina foto». 🔴 **Questo il piano non lo dice:** tratta come terzo
strato **solo** la conferma (T9-bis), ma «Cambia categoria» apre il **foglio della categoria** esattamente
nello stesso posto della pila. Tutto ciò che vale per la conferma (niente blocco dello scorrimento, marca
`'uaSheet'`, portale, `Escape` mediato) vale **identico** per il foglio della categoria quando arriva da lì.
V. §7 riga F-1.

`CartaAlbum` **non è uno strato**: è contenuto di pagina.

### 1.2 La marca della storia — `'uaSheet'`, e non si riapre
Tutti e quattro gli strati si registrano con `entraOverlay('uaSheet', …)` / `esciOverlay(token)`
(`src/components/ds/storia-overlay.ts`). `provato:` **P14 del piano** — il **valore** della marca non è mai
confrontato dentro il modulo (si scrive a `:88`, si rilegge a `:98`, si ri-spinge a `:116`, e il gate a
`:131` è `if (!marcaEntry)`, cioè sull'**esistenza**), e `type Marca` (`:67`) è un'unione **chiusa e non
esportata**: una terza marca **non compilerebbe**. Riusare `'uaSheet'` tiene anche verde
`scripts/guardia-navigazione-overlay.mjs:97`, che riconosce **solo** quelle due stringhe.

**L'aggancio si copia verbatim da `Sheet.tsx:180-198`**, dipendenza **solo `aperto`** (il callback si
rilegge da un `useRef`, o l'entry si ri-spingerebbe a ogni render del chiamante).

Navigare da dentro uno strato: **mai `router.push` nudo**, sempre `src/components/ds/useNavigaDaOverlay.ts`.

### 1.3 z-index — tre valori, dentro l'intervallo libero
| strato | z-index |
|---|---|
| `VisoreFoto` | **400** |
| `TendinaMenu` | **500** |
| `FoglioCategoria` · `FoglioConferma` (terzo strato, mai insieme) | **600** |

`provato:` **P17 del piano** e ri-misurato qui — `grep -rn "zIndex" src/` + `grep -n "z-index" src/app/*.css`:
chrome v3 ≤ **60** (`src/app/ds-v3.css:105,413`), legacy ≤ **301** (`src/components/features/fatture/InviaPecButton.tsx:295,312`),
`Sheet` e `DialogConferma` a **1000** (`src/components/ds/Sheet.tsx:418`, `src/components/ds/DialogConferma.tsx:182`),
avvisi a **1100** (`src/components/ds/Avviso.tsx:285`). ➡️ **302-999 è libero** e ci stanno i tre valori con
spazio in mezzo per un quarto che oggi non serve.

🛑 **Perché valori ESPLICITI e non l'ordine di montaggio del portale:** oggi `DialogConferma` sta sopra
`Sheet` **solo** perché il suo portale si monta dopo (P17). Con tre strati che si aprono e si chiudono in
ordini diversi, quell'ordine non è più una garanzia: **si dichiara**.

⚠️ **Limite dichiarato:** stando **sotto 1000**, uno `Sheet` o un `DialogConferma` aperto **altrove** si
dipingerebbe sopra i tre strati. In questa ondata non succede (v. §6, assunzione A-2).

### 1.4 Lo scorrimento del corpo — **solo il più basso blocca**
🔴 **La misura, e la sequenza che morde.** `Sheet` blocca lo scorrimento tenendo il valore precedente in un
`useRef` **per istanza** (`src/components/ds/Sheet.tsx:222`) e lo cattura solo se il **proprio** ref è vuoto
(`:248-252`): **si difende dalla propria rientranza, non da un secondo blocco**.

Con due strati che bloccano, la sequenza che rompe **non è un caso di scuola, è il caso normale di questa
superficie** — l'eliminazione riuscita chiude **la conferma e il visore nello stesso commit**:

1. il visore apre → cattura `overflow: ''` → scrive `'hidden'`;
2. la conferma apre → cattura `overflow: 'hidden'` (il valore del visore!) → scrive `'hidden'`;
3. «Elimina foto» riesce → **entrambi** si smontano nello stesso commit;
4. React esegue le cleanup **in ordine di setup, non LIFO** — è scritto e misurato dentro `Sheet.tsx:217-221`
   («verificato empiricamente su React 19.2: *A setup, B setup, A cleanup, B cleanup*») → **prima** il visore,
   che ripristina `''`; **poi** la conferma, che ripristina `'hidden'`;
5. **la pagina resta bloccata sotto le dita, per sempre.**

➡️ **La via che si prende: gli strati alti NON scrivono MAI `document.body.style`.** Non «lo fanno con
attenzione»: **non lo fanno**. Un ripristino sbagliato è impossibile se non c'è niente da ripristinare.

**E il gesto si ferma dove nasce, senza stato globale:**
- il **velo** dei fogli porta `touchAction: 'none'` — il trascinamento che nasce sul velo non scorre la
  pagina sotto;
- il **pannello** porta `overscrollBehavior: 'contain'` — arrivato in fondo al proprio scorrimento non
  passa la spinta al corpo.

Sono due stili **sul proprio elemento**: nascono e muoiono con il componente, non c'è nessun valore di
prima da rimettere a posto.

**Costo residuo, dichiarato e non addolcito:** `FoglioCategoria` **allo scatto** è l'unico strato aperto, e
non bloccando lascia scorrere la pagina sotto il velo se il gesto nasce **sul pannello** e lo supera. È un
difetto **estetico**, visibile; l'alternativa era il difetto **funzionale** del punto 5, che non si ripara
senza chiudere l'app. La via giusta (un blocco a **contatore** condiviso, di cui anche `Sheet` sia un
utente) **tocca `Sheet.tsx` ed è fuori mandato: è riferita in §8, riga FM-1.**

**La prova che ogni strato alto deve portare** (T8, T9, T9-bis):
> con `document.body.style.overflow` già a `'hidden'` **prima** di aprire, aprire e chiudere lo strato →
> alla chiusura vale **ancora `'hidden'`**, non `''`. Cioè: non ha né bloccato né sbloccato niente.

### 1.5 `Escape` con tre strati — il difetto misurato, e la via
🔴 **Il fatto (P18):** `src/components/ds/Sheet.tsx:158-165` e `src/components/ds/DialogConferma.tsx:78-85`
ascoltano **entrambi su `window`**. Con due strati aperti **un solo Escape li collassa tutti**, mentre il
tasto «indietro» ne chiude correttamente **uno** (la pila LIFO di `storia-overlay.ts:110-117`). Con **tre**
strati il difetto triplica.

➡️ **La via: nessuno dei quattro strati nuovi ascolta `Escape` su `window`.**

1. Ogni strato **porta il focus dentro il proprio pannello** all'apertura e lo **restituisce all'apritore**
   alla chiusura (è già richiesto dall'accessibilità: `Sheet` lo fa a `:268-275`, `DialogConferma` **non lo
   fa affatto**).
2. `Escape` si ascolta con un **`onKeyDown` sul pannello**. Il pannello che contiene il focus è **quello in
   cima**: nessun altro riceve l'evento.
3. L'handler chiama **`event.stopPropagation()`**. React 18/19 aggancia i propri ascoltatori al **contenitore
   del portale** (qui `document.body`, `Sheet.tsx:367`), che sta **sotto** `window` nella risalita: fermare
   lì significa che un `Sheet` o un `DialogConferma` aperto per sbaglio **non si chiude insieme**.
4. **Il velo non toglie il focus:** `preventDefault()` sul suo `pointerdown` — un tocco sul velo chiude, ma
   non manda il focus sul `body` lasciando l'`Escape` senza destinatario. 🛑 Si scrive **accanto** ai due
   handler di `src/components/ds/useTapScrim.ts`, **senza modificare quel file** (è condiviso: v. §8, FM-3).

🔑 **Contratto del chiamante, obbligatorio o il punto 2 non regge:** i quattro strati si montano **fratelli**
nell'albero React, **mai uno dentro le props o i figli dell'altro** — gli eventi sintetici di React risalgono
l'albero **React**, non il DOM, quindi una tendina montata *dentro* `azioni` del visore farebbe arrivare
l'`Escape` **anche al visore**. Per questo `azioni` di `VisoreFoto` accetta **solo l'innesco** (il tondo ⋯),
mai la tendina né un foglio (§2, §5.39).

**Marchio, R-P1:** il punto 3 è **`non provato` — è una previsione, e porta il comando che la verifica.**
Prova che T7 deve scrivere per prima:
> monta uno `Sheet` aperto (che ascolta su `window`) e sopra una `TendinaMenu`; porta il focus dentro la
> tendina; premi `Escape` → **la tendina si chiude, lo `Sheet` resta aperto**. Se lo `Sheet` si chiude, il
> punto 3 è falso e la via va rifatta (l'alternativa è in §8, FM-2).

**Alternativa nominata e scartata, perché non venga riproposta:** un **secondo** modulo LIFO in
`src/components/ds/` con un solo ascoltatore su `window`. Regge anche col focus perso, ma introduce **due
pile da tenere allineate** con quella di `storia-overlay.ts` — due sorgenti di verità per la stessa domanda
(«chi è in cima?»), che è esattamente il difetto che `storia-overlay.ts` è nato per togliere di mezzo.

### 1.6 Il portale, e il focus
**Portale su `document.body`, obbligatorio** per tutti e quattro gli strati: `src/app/ds-v3.css:1005-1011`
dichiara che il contenimento della shell della parete crea uno stacking context che intrappolerebbe
qualunque overlay montato in linea.

**Focus:** al pannello (`tabIndex={-1}`) o alla prima voce, secondo il componente; **ritorno all'apritore**
alla chiusura (modello `Sheet.tsx:268-275`). 🛑 **`Sheet` NON fa la trappola del focus** (nessun handler
`Tab` in tutto il file), né `inert`, né `aria-hidden` sulla pagina dietro: i quattro strati nuovi
**non ereditano niente di tutto ciò** e ognuno dichiara nella sua §5.x cosa fa.

### 1.7 Il raggio — la scelta, e la sua ragione
⚠️ `raggio` (`src/design-system/v3/tokens.ts:32`) ha `card 24 · sheet 28 · tile 22 · riga 18 · tasto 20 ·
pill 999`. **Non ha il 12** che la striscia di oggi usa come numero nudo (`src/components/ds/FotoStrip.tsx:23`).

**Scelta: le miniature delle foto usano `raggio.riga - 6` (= 12), che è il valore del mockup.**
La ragione, in tre passi:
1. **Il mockup è la fonte di verità visiva e dice 12** (`.th { border-radius: 12px }`): `raggio.riga` (18) su
   una tessera da 60 px la fa leggere come una pastiglia — è un'altra forma, non un altro valore.
2. **`raggio.riga - N` è già l'idioma di casa**, due volte e in due componenti ratificati:
   `src/components/ds/DialogConferma.tsx:240` (`raggio.riga - 6`, cioè **esattamente 12**) e
   `src/components/ds/MenuVoce.tsx:59` (`raggio.riga - 7`, cioè 11, il raggio dell'icona di §5.34).
3. **Non è un token nuovo perché non è un valore nuovo:** è il 12 che esiste già in casa, scritto con un
   nome invece che come numero nudo. 🔑 **Il gate può decidere altrimenti**: se preferisce, la stessa cosa
   diventa `raggio.miniatura: 12` in `src/design-system/v3/tokens.ts` — ma allora **le due righe di sopra
   vanno convertite nella stessa passata**, o si finisce con tre modi di dire 12.

⚠️ **E una contraddizione da registrare, non da nascondere:** la spec §4.2 dice «Nessun altro raggio». **Il
codice ratificato la contraddice già due volte** (le due righe del punto 2). V. §7, riga F-4.

**Gli altri raggi cadono tutti su un token esatto:** carta album `raggio.card` (24) · foto grande
`raggio.riga` (18) · pastiglie della categoria `raggio.riga` (18) · pannello della tendina `raggio.tasto`
(20) · fogli `raggio.sheet` (28) **solo in alto**, 0 in basso · tondi e pastiglie `raggio.pill`.

🔎 **Due letture del mockup da non prendere alla lettera**, perché sono artefatti della cornice del telefono
disegnata dentro la pagina, non misure di prodotto:
- `.foglio { border-radius: 28px 28px 18px 18px }` → **il 18 in basso non esiste**: un foglio vero è
  ancorato al fondo dello schermo e in basso ha **0** (`src/components/ds/Sheet.tsx:450-451`);
- `.palco { border-radius: 22px }` → **il visore a tutto schermo ha raggio 0**.

### 1.8 Il movimento — `molla.smooth`, **dichiarata come scelta**
🛑 **Non esiste una coreografia di casa per un overlay a tutto schermo né per lo sfogliare.** Le otto di §8.3
coprono altro. La casa usa `molla.smooth` per gli overlay (`src/components/ds/DialogConferma.tsx:155,166` ·
`src/components/ds/Sheet.tsx:338`): **si usa quella, e si dichiara che è una scelta, non un token già pronto.**

| strato | movimento | è un token già pronto? |
|---|---|---|
| `VisoreFoto` (entra/esce) | dissolvenza del velo + `scale` 0.98→1 della foto, `molla.smooth` | **no — scelta** |
| `VisoreFoto` (sfogliare) | `x` fra le foto, `molla.smooth` | **no — scelta** |
| `TendinaMenu` | `opacity` + `scale` 0.96→1 con `transformOrigin: '100% 0'` («esce dai tre puntini»), `molla.smooth` | **no — scelta** |
| `FoglioCategoria` · `FoglioConferma` | **`coreografie.sheetSu`** (§8.3 n.6), che è già `molla.smooth` | ✅ **sì, esiste** |
| `CartaAlbum` | **nessuna animazione d'ingresso**; il cambio della foto grande è **istantaneo** | — |

🔑 **Perché il cambio della foto grande NON si anima:** §8.2 regola 4 — «si anima SOLO navigazione spaziale e
feedback fisico; MAI dati che cambiano». Cambiare la foto grande toccando una miniatura è un dato che
cambia. Si anima **solo** il pressed della miniatura, con `molla.press`.

🔑 **Perché non `molla.snappy` per la tendina**, che §8.1 destina alle «comparse»: i tre strati si vedono
**insieme**, e tre molle diverse in una pila sola si leggono come tre applicazioni diverse. Una sola molla,
dichiarata.

### 1.9 «Riduci movimento» — si cambia la transizione, **mai il bersaglio**
`src/design-system/v3/motion.ts:14-22` lo scrive con la sua storia (difetti D1/D2 del 26/07: una linguetta
rimasta fuori schermo perché il bersaglio era stato tolto invece della transizione). Regola per tutti e
cinque: **ogni chiave di spostamento resta in `animate`/`exit`** e ci arriva con `istantaneo`, per chiave:

```tsx
transition={reduced ? { ...molla.smooth, x: istantaneo, scale: istantaneo } : molla.smooth}
```

🛑 **Mai togliere `x`/`scale`/`y` dal bersaglio:** Motion muove solo ciò che sta nel bersaglio, quindi la
chiave tolta **resta congelata dov'era** — che è esattamente il difetto. La guardia gira a ogni commit
(`.husky/pre-commit`).

**La prova che ogni strato deve portare:** a «Riduci movimento» accesa, **niente resta fuori schermo**.

### 1.10 Suono e vibrazione — l'elenco chiuso, e le due regole incise
Ammessi: `vibra('selection' | 'light' | 'medium' | 'success' | 'error')`
(`src/design-system/v3/haptic.ts`) · `suona('tap' | 'fatta' | 'ua' | 'errore' | 'arrivo' | 'stacco' |
'riaggancio')` (`src/design-system/v3/sound.ts`).

🔑 **Regola 1 — un cambio di SELEZIONE fa `vibra('selection')` e MAI `suona()`.** Quattro precedenti in casa,
riverificati: `src/components/ds/StrisciaStato.tsx:154` · `src/components/ds/Pila.tsx:52` ·
`src/components/ds/Campo.tsx:251` · `src/components/ds/NotaDentista.tsx:28`.

🔑 **Regola 2 — `tap` mai su azioni di sola lettura** (§9.2). ➡️ **Aprire il visore, sfogliare, chiudere:
nessun suono.** Solo vibrazione.

🛑 **Non esiste un suono per la distruzione riuscita, e non se ne inventa uno.** La conferma la porta
`TastoPrimario` (`suona('tap')` + `vibra('medium')`, per conto proprio); l'esito lo dice l'`Avviso` (§5.18)
che mostra il chiamante. Per questo `FoglioConferma` **non chiama mai** né `suona()` né `vibra()` — è la
stessa scelta già scritta in `src/components/ds/DialogConferma.tsx:28-30`.

### 1.11 L'indirizzo firmato della foto — il vincolo G5 · D75
**In tutti e cinque i componenti l'indirizzo firmato entra SOLO come `src` di un `<img>`.** Mai come testo,
mai in `title`, mai in `href` o `download`, mai negli appunti, mai dentro un `aria-label`, e **nessun
componente lo rimanda a un callback**. È la contropartita del rinvio di **D75**: questa superficie non
peggiora l'esposizione **in modo evitabile**, e infatti il menù porta «Salva sul telefono» e **non** «Copia
link» (spec dell'album §12).

⚠️ **Il confine, dichiarato:** che cosa faccia «Salva sul telefono» è **del chiamante** (T11/T12), non di
`TendinaMenu`, che si limita a emettere la scelta. Quel punto **può** diventare un'esposizione nuova: v. §8,
riga FM-4.

### 1.12 Gli stati obbligatori, e il colore che non basta mai
La testa di §5 della spec v3 (riga 186) impone a **ogni** componente: **default · pressed · disabled ·
focus-visible** (anello **2px `--blue`, offset 2**). Le cinque sezioni li dichiarano tutti e quattro.

**G4:** ogni cosa toccabile è **≥ 44 px** (l'area attiva può eccedere il visibile, §4.2), e **il colore non è
mai l'unica fonte di stato** — la voce che cancella è rossa **e** staccata **e** si chiama «Elimina foto»; la
miniatura scelta ha un anello **e** l'opacità piena **e** `aria-current="true"`.

---

## 2. Le cinque sezioni — testo da incollare nella spec v3

> Da qui in avanti il testo è **pronto per `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`**,
> nella forma delle §5.x esistenti (modello: §5.35 `Cassetta`, che è la più recente e la più completa).

### 5.38 `CartaAlbum` (🆕 emendamento 30/07/2026, ondata (b) — D64 · D68 · D71 · D76)
La carta delle foto sulla scheda del lavoro e sulla modifica. **Sostituisce `FotoStrip` (§5.33)**, che era
l'unico blocco della pagina **senza titolo**.

**Anatomia.** Carta di pagina (non un overlay) con: **intestazione** «FOTO» + conteggio delle foto vive ·
**foto grande** (la prima dell'ordine) con la pastiglia «⤢ Apri» in basso a destra · sotto la foto grande
l'**etichetta della categoria** e il **contatore «1 di 6»** · **blocchi raggruppati per categoria** (variante
**A1**, D76), ognuno con la **sua etichetta sopra**, in una fascia che scorre in orizzontale. Al tocco sulla
foto grande si apre `VisoreFoto` (§5.39).

**Misure.** Carta `raggio.card` (24), faccia `var(--card)`, ombra `var(--sh-card)`, padding `spazio.m`
verticale / `spazio.ml` orizzontale · titolo `caption` 12.5/700 `tipografia.tracking.caption` MAIUSCOLO
`var(--faint)` · conteggio 13/600 `var(--muted)` tabulare · **foto grande** larghezza piena, rapporto **4/3**
a 390 e **16/9** da 768, `raggio.riga` (18), `objectFit: 'cover'`, fondo `var(--bg-deep)` · pastiglia «⤢
Apri» H 32, `raggio.pill`, faccia `sopraFoto.faccia`, testo `testoSuFaccia` 12.5/700, **`aria-hidden`** (sta
dentro il bersaglio, non è un controllo suo) · etichetta della categoria `body` 17/700 · contatore 13/600
`var(--muted)` tabulare · **miniature 60×60**, `raggio.riga - 6` (= 12), `gap spazio.s`, etichetta di gruppo
11/800 +0.1em MAIUSCOLA `var(--faint)`, `gap` fra i gruppi `spazio.sm + 2`.

**Ordine.** I gruppi stanno nell'ordine di **D71** — `impronta → pre_lavoro → colore → post_prova → rx →
altro` — e dentro il gruppo per `created_at` crescente, con `id` come spareggio. **La fonte è
`src/lib/domain/categorie-foto.ts`** (`raggruppaPerCategoria`, `etichettaCategoria`): mai una copia locale,
mai un `ORDER BY` alfabetico (metterebbe `altro` davanti a tutto). 🔑 **Il contatore «n di m» si conta dalla
POSIZIONE nell'elenco ordinato**, mai dalla colonna `ordine`, che è ambigua e questa spec **non usa**.

**Stati.** *default* · *pressed*: miniatura e foto grande scendono di 2 px con `molla.press` · *disabled*:
non previsto (una carta di sola consultazione non si disabilita) · *focus-visible*: anello 2px `var(--blue)`
offset 2 su ogni miniatura e sulla foto grande · **selezionata**: la miniatura mostrata come foto grande ha
**anello 2px `var(--ink)` + opacità piena + `aria-current="true"`** (mai il solo colore) · **vuoto**:
`foto.length === 0` → **`return null`**, prima riga di corpo.

**Semantica dei gesti.** *tap* sulla foto grande = apre il visore · *tap* su una miniatura = cambia la foto
grande (**selezione**, non navigazione) · lo scorrimento orizzontale della fascia è nativo, nessun gesto
inventato.

**Movimento.** Nessuna animazione d'ingresso. Il cambio della foto grande è **istantaneo** (§8.2 regola 4: i
dati che cambiano non si animano). Solo il pressed usa `molla.press`.

**Suono e vibrazione.** Miniatura → **`vibra('selection')`, MAI `suona()`**. Foto grande → **`vibra('light')`
e nessun suono**: aprire un visore è sola lettura (§9.2).

**«Riduci movimento».** Nulla da spegnere (non c'è ingresso animato); il pressed resta, è feedback.

**Accessibilità.** Titolo «Foto» come intestazione vera · la foto grande è un `<button>` con
`aria-label` «Apri la foto grande: {etichetta}, {n} di {m}» · ogni miniatura è un `<button>` **≥ 44 px**
(visibili 60) con `aria-label` «{etichetta}, {n} di {m}» e `aria-current` sulla scelta · il gruppo è legato
alla sua etichetta con `aria-labelledby` · **`alt` = l'ETICHETTA della categoria** («Impronta»), mai la
sigla interna né un generico — è la correzione di §5.5 della spec dell'album, e la colonna nuova **non si
spedisce senza questa mappa**.

**Sicurezza (G5 · D75).** L'indirizzo firmato entra solo come `src`; nessun `title`, `href`, `download`,
appunti o callback (§1.11 dell'allegato).

**Fonte di verità visiva:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`, colonna **A1**
(classi `.carta`, `.capo-carta`, `.hero`, `.meta-foto`, `.gruppi`, `.gr-et`, `.th60`), + il tablet di §6 del
mockup. **Anatomia e vincoli per esteso:** `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md`.

---

### 5.39 `VisoreFoto` (🆕 emendamento 30/07/2026, ondata (b) — D64 · D66 · D69 · D77)
Il visore a tutto schermo, variante **V1** (**D77**): **i controlli stanno sempre in vista**. È il **primo**
dei tre strati sopra la pagina, e **l'unico dei quattro che blocca lo scorrimento del corpo**.

**Anatomia.** Velo pieno `sopraFoto.velo` · **la foto centrata, alla sorgente e senza degradarla**
(`objectFit: 'contain'`, nessun ridimensionamento né ricompressione in vista — **vincolo di D66**: la fedeltà
del colore è uno dei motivi per cui quelle foto esistono) · **capo** con il tondo ✕ a sinistra, al centro
etichetta della categoria + contatore «1 di 6», il tondo ⋯ a destra · **piede** con la fascia delle altre
foto e, sotto, **il posto riservato alla barra dell'editor** (D66: previsto e **vuoto**, tratteggiato — è la
ragione per cui questa forma è stata scelta invece della sola carta).

**Misure.** Tondi ✕ e ⋯ **44×44**, `raggio.pill` · etichetta `callout` 15.5/700 `testoSuFaccia` · contatore
**12.5/700** `testoSuFaccia` tabulare (🛑 **12.5, non 12, e senza opacità** — v. sotto) · miniature della
fascia **44×44**, `raggio.riga - 6` (= 12), `gap spazio.s - 2`, spente a `sopraFoto.miniaturaSpenta` (0.48) ·
posto dell'editor H 52, `raggio.riga` (18), bordo tratteggiato 1.5 `sopraFoto.tratteggio` · su **desktop la
foto NON si stira**: resta al suo rapporto, centrata sul velo (stirarla vorrebbe dire deformarla o
ritagliarla, e **D66 lo vieta**).

**🔴 Il contrasto NON si appoggia alla sfumatura.** Le due sfumature restano (`sopraFoto.sfumaturaAlto`,
`sopraFoto.sfumaturaBasso`) come raccordo, ma **ogni elemento porta la propria faccia**
(`sopraFoto.faccia`) **e il proprio confine** (`sopraFoto.confine`, anello interno bianco al 22%). Ragione,
misurata: su una foto **chiara** la sfumatura al centro della fascia vale ~30% di nero, e il testo bianco ci
sta sopra a **~2,1:1** — sotto AA di tre volte; su una foto **scura** (una radiografia) la sfumatura sparisce
e con lei il **confine** dei controlli. Faccia e anello chiudono i due casi insieme e rendono il contrasto
**indipendente dalla fotografia**. ➡️ **La prova si fa su DUE casi, non su uno: una radiografia e una guida
colore sovraesposta.**

**Stati.** *default* · *pressed*: i tondi scendono di 2 px con `molla.press` · *disabled*: il tondo ⋯ è
disabilitato quando il chiamante non passa `azioni` · *focus-visible*: anello 2px `var(--blue)` offset 2 ·
**miniatura scelta**: opacità piena **+ anello 2px `testoSuFaccia` + `aria-current="true"`**.

**Semantica dei gesti.** *swipe orizzontale* o *tap su una miniatura* = cambia foto (chiama `onIndice`) ·
*tap su ✕*, *tap sul velo fuori dalla foto*, *Escape*, *«indietro»* = chiude · *tap sull'etichetta della
categoria* = apre `FoglioCategoria` (§5.41) per correggerla (**D70**) · *tap su ⋯* = apre `TendinaMenu`
(§5.40).

**Strato.** z-index **400** · portale su `document.body` · `entraOverlay('uaSheet', …)` /
`esciOverlay(token)` con dipendenza **solo `aperto`** · **blocca e SBLOCCA lo scorrimento del corpo** con
compensazione della barra, modello `Sheet.tsx:241-264`, **catturando il valore precedente solo se il proprio
ref è vuoto** — ed è **l'unico** dei quattro a farlo (§1.4 dell'allegato).

**🔑 `azioni` accetta SOLO l'innesco** (il tondo ⋯), **mai la tendina né un foglio**: i quattro strati si
montano **fratelli**, o l'`Escape` del più alto arriverebbe anche a questo (§1.5 dell'allegato).

**Movimento.** Entra e esce con `molla.smooth` (**scelta dichiarata**: nessuna delle otto coreografie di
§8.3 è per un overlay a tutto schermo) — velo in dissolvenza, foto `scale` 0.98→1. Lo sfogliare è una `x`
con la stessa molla.

**Suono e vibrazione.** **Nessun suono** (apertura, sfogliata e chiusura sono sola lettura, §9.2). Sfogliare
→ **`vibra('selection')`**; chiudere → `vibra('light')`.

**«Riduci movimento».** `x`, `scale` e `opacity` **restano nel bersaglio** e arrivano con `istantaneo`
(§1.9 dell'allegato). Niente resta fuori schermo.

**Accessibilità.** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sull'etichetta+contatore ·
`tabIndex={-1}` sul pannello, **focus al pannello** all'apertura e **ritorno all'apritore** alla chiusura ·
**`Escape` sul pannello con `stopPropagation()`**, mai su `window` · ← e → sfogliano · il contatore vive in
un `aria-live="polite"`, così il cambio di foto si sente · ogni tondo ha `aria-label` in parole del banco
(«Chiudi», «Altre cose da fare su questa foto»).

**Sicurezza (G5 · D75).** Come §5.38. Se le foto si caricano **su richiesta**, la **scadenza** del
collegamento va gestita: un'immagine chiesta dopo la scadenza **non resta rotta in silenzio**.

**Fonte di verità visiva:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`, colonne **V1** e
**V1-bis** (la radiografia — il caso peggiore, disegnato apposta) + il desktop di §6 del mockup.
**Scostamenti dichiarati e ragione:**
`docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §5.

---

### 5.40 `TendinaMenu` (🆕 emendamento 30/07/2026, ondata (b) — D69 · D78)
La tendina ancorata ai tre puntini del visore, variante **M2** (**D78**, scelta di Francesco contro la
raccomandazione, coi due costi dichiarati). 🛑 **In casa non esisteva: l'app usa fogli, non tendine.**

**Anatomia.** Pannello ancorato **sotto il ⋯**, allineato al bordo destro, con dentro le voci passate dal
chiamante. **La voce distruttiva sta IN FONDO** — il punto più lontano dai tre puntini e **più vicino al
pollice** — **rossa, staccata da una linea, con margine extra**, esattamente come la variante `butta` di
§5.34. Il ⋯ resta visibile e **acceso** (`sopraFoto.facciaAttiva`) mentre la tendina è aperta: si vede da
dove è uscita.

**Misure.** Larghezza **260**, `raggio.tasto` (20), faccia `var(--card)` (`var(--elv)` in scuro), ombra
`sopraFoto.ombraPannello` — 🛑 **non `var(--sh-card)`, che in scuro è `none`**: un pannello che galleggia
sopra una fotografia deve staccarsi in **entrambi** i temi · padding `spazio.s` verticale / `spazio.m`
orizzontale · **voci: anatomia di §5.34 verbatim** — min-height **56**, icona Ø38 `raggio.riga - 7` (= 11)
tinta neutra, testo `body` 17/700, separatore 1.5 `var(--line)`; la voce distruttiva ha colore `var(--red)`,
icona `var(--red-tint)`/`var(--red)`, linea sopra e margine extra · distanza dal ⋯: `spazio.m` sotto il capo.

**Stati.** *default* · *pressed*: la voce si scurisce di un tono, `molla.press` · *disabled*: voce al 60% e
senza chevron (come §5.34) · *focus-visible*: anello 2px `var(--blue)` offset 2 sulla voce.

**Semantica dei gesti.** *tap su una voce* = la sceglie e chiude · *tap fuori* = chiude · **scorrere la
pagina sotto = chiude** (una tendina ancorata non insegue il suo àncora) · *Escape* = chiude e **il focus
torna al ⋯** · *«indietro»* = chiude **solo la tendina**, non il visore.

**Strato.** z-index **500** · portale su `document.body` · `entraOverlay('uaSheet', …)` — **o «indietro»
chiuderebbe il visore invece del menù** · 🛑 **NON blocca lo scorrimento del corpo**: lo blocca già il
visore, e un secondo blocco lo lascerebbe bloccato per sempre (§1.4 dell'allegato).

**Movimento.** `opacity` + `scale` 0.96→1 con `transformOrigin: '100% 0'`, `molla.smooth` (**scelta
dichiarata**).

**Suono e vibrazione.** **Nessun suono**: il ⋯ è un `TastoTondo`, che suona già per conto suo, e §9.2 vieta
più di un suono per gesto. Scelta di una voce → `vibra('light')`.

**«Riduci movimento».** `scale` resta nel bersaglio con `istantaneo`; resta la sola dissolvenza.

**Accessibilità — 🛑 va rifatto da zero ciò che un foglio ha già.** `role="menu"` sul pannello,
`role="menuitem"` su ogni voce · **focus alla prima voce** all'apertura, **ritorno al ⋯** alla chiusura · ↑
e ↓ scorrono le voci, `Home`/`End` ai capi, **senza avvolgere** · **`Escape` sulla voce con
`stopPropagation()`**, mai su `window` · il chiamante passa `etichettaAria` del pannello («Altre cose da fare
su questa foto»).

**Contratto del chiamante.** Le etichette delle voci **le passa il chiamante**: questo componente non
contiene testo proprio. 🔑 **La voce distruttiva si dichiara** (`distruttiva: true`) e il componente la
**mette in fondo da sé**: la posizione non è lasciata all'ordine dell'array, o la mitigazione di D78
dipenderebbe da chi chiama.

**Fonte di verità visiva:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`, colonna **M2** +
§5.34 per l'anatomia delle voci.

---

### 5.41 `FoglioCategoria` (🆕 emendamento 30/07/2026, ondata (b) — D65 · D70 · D72 · D74 · D79)
Il foglio che chiede **che foto è**, variante **C1** (**D79**): **sei pastiglie su due colonne**. Vive in
**due momenti**: subito **dopo lo scatto** (D65 — mai prima: non si blocca la fotocamera) e come
**correzione** dal visore o dall'album (D70).

**Anatomia.** Foglio dal basso con: **manico** · **anteprima** della foto (o fino a tre, con «{n} foto», per
lo scatto multiplo) · **titolo** «Che foto è?» — «Che foto **sono**?» con `quante > 1` · **dida** «Serve per
ritrovarla dopo. Se non lo dici adesso finisce in «Altro».» — con `quante > 1`: «La scelta vale per tutte e
{quante}. Le puoi cambiare una per una dopo.» · **sei pastiglie**, una per categoria, **nell'ordine di D71**.

**Misure.** Foglio `raggio.sheet` (28) **solo in alto**, 0 in basso · faccia `var(--card)` (`var(--elv)` in
scuro) · padding `spazio.sm` sopra / `spazio.ml` ai lati e sotto · manico 36×4 `raggio.pill` `var(--line)`,
`spazio.sm` sotto · anteprima 56×56 `raggio.riga - 6` (= 12) · titolo **19/800** · dida **13.5**
`var(--muted)` · **pastiglie: griglia a 2 colonne, `gap spazio.s`, min-height 60, `raggio.riga` (18), faccia
`var(--bg-deep)`, padding orizzontale `spazio.sm`, testo 15/700, `whiteSpace: 'nowrap'`, emoji 18
`aria-hidden`**.

📏 **La misura da NON perdere, ed è un vincolo non un'estetica:** a **390** la pastiglia utile è **148,5 px**
e «**Guida colore**» — l'etichetta più lunga delle sei — **andava a capo** a 15,5/700, sfalsando la griglia.
**Rientra a 15 px.** ➡️ La prova di questo componente **misura che non va a capo**, e **se una voce cambierà
nome la misura va rifatta** (stessa trappola già pagata con le briciole del wizard, D39).

🚧 **Le emoji sono un SEGNAPOSTO dichiarato** (S2 del piano): le icone vere sono un passo suo, fuori da
questa ondata. Non sono lo stato di niente (§4.4: mai emoji come stato) — il senso lo porta il testo.

**Stati.** *default* · *pressed*: la pastiglia scende di 2 px, `molla.press` · *disabled*: non previsto (le
sei ci sono sempre: l'elenco è chiuso) · *focus-visible*: anello 2px `var(--blue)` offset 2 · **scelta**:
faccia invertita `var(--ink)`/`var(--bg)` **+ `aria-pressed="true"`** — non è una differenza di solo colore
ma di luminanza piena, e la semantica la porta l'attributo.

**Semantica dei gesti.** *tap su una pastiglia* = sceglie e chiude. 🔑 **Ogni altra uscita — velo, manico,
swipe giù, `Escape`, «indietro» — chiama `onScegli('altro')` e POI `onChiudi()`, mai `onChiudi()` da solo**
(**D74**: la foto deve nascere con una categoria; non è un errore, quindi **niente avviso e niente suono
d'errore**). Lo swipe giù riusa `deveChiudere`, che `src/components/ds/Sheet.tsx:39` **esporta già**: si
importa, non si estrae e non si riscrive.

**Strato.** z-index **600** · portale su `document.body` · `entraOverlay('uaSheet', …)` · 🛑 **NON blocca lo
scorrimento del corpo.** 🔴 **Vale anche quando è il PRIMO strato (allo scatto), ed è una scelta:** un
componente che blocca *a volte* è un componente che indovina, e quando arriva dal visore — che blocca già —
il secondo blocco lascerebbe la pagina bloccata per sempre. Il gesto si ferma dove nasce: `touchAction:
'none'` sul velo, `overscrollBehavior: 'contain'` sul pannello (§1.4 dell'allegato, col costo residuo
dichiarato).

**Movimento.** `coreografie.sheetSu` (§8.3 n.6) — **questa esiste già**, non è una scelta nuova.

**Suono e vibrazione.** Scegliere → **`vibra('selection')` e MAI `suona()`** (quattro precedenti in casa,
§1.10 dell'allegato). Chiudere senza scegliere → **niente**: D74 dice che non è un errore.

**«Riduci movimento».** `y` resta nel bersaglio e arriva con `istantaneo`.

**Accessibilità.** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sul titolo + `aria-describedby`
sulla dida · `tabIndex={-1}` sul pannello, **focus al PANNELLO** all'apertura — 🔑 **non alla prima
pastiglia: porterebbe il focus su «Impronta» e suggerirebbe una scelta che l'utente non ha fatto** — e
**ritorno all'apritore** alla chiusura · **`Escape` sul pannello con `stopPropagation()`**, mai su `window` ·
ogni pastiglia è un `<button>` **≥ 44 px** (visibili 60) col testo dell'etichetta come nome accessibile.

**Fonte di verità visiva:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`, colonne **C1** e
**C3** (lo scatto multiplo).

---

### 5.42 `FoglioConferma` (🆕 emendamento 30/07/2026, ondata (b) — D55 · D61 · D63 · D80)
La conferma distruttiva **a foglio dal basso**, scelta da Francesco il 30/07 contro la card centrata
(**D80**). 🔑 **È la seconda forma ammessa di conferma distruttiva** — v. l'emendamento a §5.17.
**`DialogConferma` (§5.17) resta la conferma di casa per tutto il resto**: qui si affianca, non si sostituisce.

**Quando si usa quale.** **Foglio** se sotto c'è già un overlay a tutto schermo (il visore dell'album):
una card centrata sopra una fotografia a tutto schermo si legge come un ritaglio sospeso, e §5.16 vuole che
su mobile una superficie del genere sia un foglio. **Card centrata** in ogni altro caso.

**Anatomia.** Manico · **anteprima dell'oggetto** (la miniatura della foto + la sua etichetta di categoria +
quando è stata caricata) · **titolo** con **l'oggetto esplicito** («Elimini questa foto?») · **testo** che
dice **che cosa succede davvero** · **due azioni in colonna**: `TastoSecondario` «Annulla» **sopra**,
`TastoPrimario` «Elimina foto» **sotto** — **stesso ordine di §5.17**.

**Misure.** Foglio `raggio.sheet` (28) solo in alto, 0 in basso · faccia `var(--card)` (`var(--elv)` in
scuro) · padding `spazio.sm` sopra / `spazio.ml` ai lati e sotto · manico 36×4 · miniatura dell'anteprima
60×60 `raggio.riga - 6` (= 12) · etichetta dell'anteprima `callout` 15.5/700, sotto-riga 13.5 `var(--muted)`
· titolo **19/800** · testo **`callout` 15.5** `var(--muted)`, con la parte che pesa in `var(--ink)`/700 ·
azioni: **`TastoPrimario` e `TastoSecondario` così come sono** (H 70 e H 58), `gap spazio.m`.

🔑 **Perché i due tasti sono i componenti di casa e non due bottoni disegnati qui:** portano la loro fisica,
il loro anello di focus e — soprattutto — **il loro suono e la loro vibrazione**. È da lì che arriva
`suona('tap')` + `vibra('medium')` della conferma. Sono **gli stessi due** che monta `DialogConferma`
(`src/components/ds/DialogConferma.tsx:111-112`): le due forme differiscono per contenitore, **non per
grammatica**.

**Il testo — ratificato, non riscrivibile a piacere.** «Sparisce dalla scheda **e dall'archivio**: non si
recupera. Resta annotato chi l'ha eliminata e quando.» 🛑 **La stesura del 29/07 diceva «il file resta
conservato»: con D61 è FALSA** — si cancella davvero, riga **e** file. ❌ **«elimina definitivamente» è
vietata** dal dizionario (`src/design-system/v3/dizionario.ts`, che propone «Butta via»); il testo qui sopra
non la contiene. Il **titolo deve portare l'oggetto esplicito** (contratto del chiamante, come §5.17).

**Stati.** *default* · *pressed*: dei due tasti, per conto loro · *disabled*: il tasto distruttivo può essere
disabilitato dal chiamante mentre la cancellazione è in volo (una sola pressione) · *focus-visible*: quello
dei due tasti, anello 2px `var(--blue)` offset 2.

**Semantica dei gesti.** *tap su «Elimina foto»* = `onConferma` · *tap su «Annulla»*, *tap sul velo*, *swipe
giù*, *`Escape`*, *«indietro»* = **`onAnnulla`, MAI `onConferma`** — un gesto di ritorno non conferma
un'azione distruttiva. Lo swipe giù riusa `deveChiudere` esportata da `src/components/ds/Sheet.tsx:39`
(si importa: non è una modifica di quel file).

**Strato.** z-index **600** · portale su `document.body` · `entraOverlay('uaSheet', …)` — o «indietro»
chiuderebbe il visore invece della conferma · 🛑 **NON blocca lo scorrimento del corpo**, e questa è **la
ragione per cui non può essere uno `Sheet` nudo**: `Sheet` tiene il valore precedente in un `useRef` **per
istanza** (`src/components/ds/Sheet.tsx:222`, cattura a `:248-252`) e non si difende da un secondo blocco.
Sopra il visore, che blocca già, **la pagina resterebbe bloccata per sempre** (§1.4 dell'allegato, con la
sequenza misurata).

**Movimento.** `coreografie.sheetSu` (§8.3 n.6).

**Suono e vibrazione.** **Nessuno, mai, chiamato da questo componente**: i due tasti suonano e vibrano per
conto proprio, e §9.2 vieta più di un suono per gesto. 🛑 **Non esiste un suono per la distruzione riuscita
e non se ne inventa uno**: l'esito lo dice l'`Avviso` (§5.18) che mostra il chiamante.

**«Riduci movimento».** `y` resta nel bersaglio e arriva con `istantaneo`.

**Accessibilità.** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sul titolo + `aria-describedby`
sul testo · `tabIndex={-1}` sul pannello · **focus alla PRIMA azione, che è quella SICURA** («Annulla») —
con l'ordine di §5.17 le due cose coincidono, e un Invio dato a caso **annulla**, non cancella · **ritorno
all'apritore** alla chiusura · **`Escape` sul pannello con `stopPropagation()`**, mai su `window`.

**Fonte di verità visiva:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`, terza colonna di
§3 («La conferma (D55) — uguale nei due casi»). ⚠️ **Con uno scostamento dichiarato sull'ordine dei due
tasti:** `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §5, riga **S3**.

---

## 3. L'emendamento — testo pronto da incollare

### 3.1 A §5.17 `DialogConferma` — si AGGIUNGE questo terzo punto elenco

> - **Emendamento 30/07/2026 (ondata (b), D80) — la card centrata è UNA delle DUE forme, non l'unica.** Per
>   una conferma distruttiva che si apre **sopra un altro overlay a tutto schermo** la forma è il **foglio dal
>   basso** `FoglioConferma` (§5.42 — 🆕 da creare). 🔑 **Non è una deroga a §5.16, è un allineamento:** §5.16
>   impone che su mobile una superficie del genere sia uno sheet e **mai** un modal centrato, quindi il foglio
>   si allinea all'invariante invece di violarlo. Quel che si emenda è **questa** sezione: `DialogConferma`
>   **resta la conferma di casa per tutto il resto** e resta l'**unica card centrata** ammessa dal sistema;
>   smette di essere l'**unica forma** di una conferma distruttiva. **Il contenuto non cambia:** stesso oggetto
>   esplicito nel titolo, stessi due componenti d'azione (`TastoPrimario` + `TastoSecondario`), **stesso ordine
>   — sicura sopra, distruttiva sotto**. Cambia il contenitore, non la grammatica. **Quando si usa quale:**
>   *foglio* se sotto c'è già un overlay a tutto schermo (il visore dell'album, §5.39 — 🆕 da creare); *card
>   centrata* in ogni altro caso.

### 3.2 A §13.2 (riga 521) — si SOSTITUISCE una voce dell'elenco dei divieti

**Oggi dice:**
> `❌ modal centrato su mobile (salvo DialogConferma)`

**Diventa:**
> `❌ modal centrato su mobile (salvo `DialogConferma` §5.17 — che dal 30/07/2026 è UNA delle due forme di conferma distruttiva: l'altra è il foglio `FoglioConferma` §5.42)`

### 3.3 A §5.33 `FotoStrip` (ultima riga) — una parola sbagliata

**Oggi dice:** «🚧 **Le §5.x dei quattro componenti nuovi** (carta album · visore · tendina del menù ·
foglio della categoria) **si propongono col processo §13.1 p.3 PRIMA di essere scritte**».

**Diventa:**
> ✅ **Le §5.x dei CINQUE componenti nuovi** (carta album §5.38 · visore §5.39 · tendina del menù §5.40 ·
> foglio della categoria §5.41 · **foglio della conferma §5.42**, nato da D80 il 30/07) **sono state proposte
> col processo §13.1 p.3 PRIMA di essere scritte**: `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md`.

🔑 **Perché è cinque e non quattro:** D80 ha aggiunto il foglio della conferma **dopo** che quella riga era
stata scritta. Un elenco che sembra completo e non lo è è il modo classico per dimenticare un caso.

### 3.4 Al commento di testa di `src/components/ds/DialogConferma.tsx:3-9` — 🛑 è CODICE, quindi è una PROPOSTA

Il file dichiara oggi «l'**UNICA** card centrata ammessa dal design system, riservata alle conferme
distruttive». **Resta vero per la card**, ma va detto che non è l'unica **forma**. Testo proposto da
aggiungere in coda a quel commento — **non applicato qui: modificare un componente è fuori dal mandato di un
gate documentale** (v. §8, riga FM-5):

> `// Emendamento 30/07/2026 (D80): resta l'UNICA card centrata, ma non è più`
> `// l'unica FORMA di conferma distruttiva — sopra un overlay a tutto schermo`
> `// la forma è il foglio dal basso (§5.42, FoglioConferma). Stessi due tasti,`
> `// stesso ordine, contenitore diverso.`

---

## 4. I sette valori nuovi in `src/design-system/v3/tokens.ts` — senza, i componenti non compilano il pre-commit

🛑 **Non è una comodità: è un obbligo del controllo.** `scripts/check-ds-compliance.sh` §4a greppa
`#[0-9A-Fa-f]{6}` e `rgba?(` su `src/components/ds` + `src/design-system/v3`, e l'**unica** esclusione è
`v3/tokens.ts`. Ogni `rgba` che serve al visore o alla tendina **deve** nascere lì.

Gruppo nuovo, nella forma dei gruppi già presenti (`gradiente`, `tastoPiu`, `pillVoce`):

```ts
// §5.38-§5.42 — la materia SOPRA una fotografia (ondata (b), 30/07/2026).
// Vive qui e non nei componenti perché `src/components/ds/` non ammette rgba
// letterali (check pre-commit 4a). Il bianco NON si duplica: si usa
// `testoSuFaccia`, che è già il bianco assoluto indipendente dal tema.
export const sopraFoto = {
  /** Il velo dietro la foto nel visore. `materia.scrim` (.35) è troppo
   *  trasparente per starci dietro una fotografia (spec album §4.2). */
  velo: 'rgba(9,7,5,.94)',
  /** Raccordo estetico sotto il capo e sopra il piede — NON è ciò che regge
   *  il contrasto: quello lo reggono `faccia` e `confine`. */
  sfumaturaAlto: 'linear-gradient(180deg, rgba(0,0,0,.6), rgba(0,0,0,0))',
  sfumaturaBasso: 'linear-gradient(0deg, rgba(0,0,0,.72), rgba(0,0,0,0))',
  /** Faccia di ogni controllo appoggiato su una foto (tondi ✕/⋯, pastiglia
   *  della categoria, pastiglia «⤢ Apri» della carta): rende il contrasto del
   *  glifo indipendente dalla fotografia sotto. */
  faccia: 'rgba(9,7,5,.62)',
  /** Il ⋯ mentre la tendina è aperta: si vede da dove è uscita. */
  facciaAttiva: 'rgba(9,7,5,.8)',
  /** Il CONFINE del controllo sulla foto scura, dove la faccia scura da sola
   *  non si stacca. Anello interno, non un bordo che sposta la geometria. */
  confine: 'inset 0 0 0 1px rgba(255,255,255,.22)',
  /** Ombra del pannello della tendina. NON `var(--sh-card)`: in scuro vale
   *  `none`, e un pannello che galleggia su una foto deve staccarsi in
   *  entrambi i temi. */
  ombraPannello: '0 14px 40px rgba(0,0,0,.4)',
  /** Bordo tratteggiato del posto riservato alla barra dell'editor (D66). */
  tratteggio: 'rgba(255,255,255,.3)',
  /** Miniatura non scelta nella fascia del visore. */
  miniaturaSpenta: 0.48,
} as const
```

⚠️ **`miniaturaSpenta` è un numero, non un colore, e sta qui apposta:** `materia` ospita già
`granaOpacityLight`/`granaOpacityDark` con lo stesso ruolo.

---

## 5. Scostamenti dal mockup approvato — dichiarati, mai silenziosi

🛑 Il mockup è **la fonte di verità visiva** (D76-D79). Dove queste §5.x se ne discostano, la ragione è di
**legge** (accessibilità, griglia, elenco chiuso dei token) o di **decisione ratificata**, mai di comodo.

| # | il mockup mostra | la §5.x prescrive | perché |
|---|---|---|---|
| **S1** | contatore del visore **12 px, opacità .78** (`.vis-capo .mezzo .n`) | **12.5 px, opacità piena** | **Due difetti in una riga.** 12 px è **sotto il minimo assoluto** del sistema (§4.1: 12.5). E il bianco al 78% sopra la sfumatura, **su una foto chiara**, sta intorno a **4,2:1** — sotto AA (4,5) per testo piccolo. A opacità piena sale a ~5,7:1 |
| **S2** | tondi ✕ e ⋯ con faccia **chiara** (`rgba(255,255,255,.14)`) | faccia **scura** `sopraFoto.faccia` + anello `sopraFoto.confine` | Su una foto **chiara** un disco bianco al 14% con un glifo bianco **sparisce**. La faccia scura regge su chiaro **e** su scuro; l'anello dà il confine dove la faccia scura si confonde con una radiografia. 🔑 **Il mockup usa già la faccia scura** per la pastiglia «⤢ Apri» della carta: qui si rende coerente con la sua metà migliore |
| **S3** | conferma con **«Elimina foto» SOPRA e «Annulla» sotto** | **«Annulla» sopra, «Elimina foto» sotto** (ordine di §5.17) | 🔑 **La via che sembrava giusta non regge alla decisione ratificata di questa stessa ondata.** L'argomento «in fondo a un foglio c'è il pollice, quindi lì va la voce sicura» è **l'opposto** di quello con cui **D78** ha ratificato la tendina: lì la voce distruttiva sta **in fondo proprio perché è la zona del pollice**, e la sicurezza la portano **rosso + linea + parola esplicita**. Due grammatiche opposte nella stessa ondata sarebbero peggio di entrambe. ➡️ **Vince §5.17**, e la conferma resta identica nelle due forme |
| **S4** | foglio con `border-radius: 28px 28px 18px 18px` · visore con `border-radius: 22px` | fogli **28 in alto, 0 in basso** · visore **0** | Sono artefatti della **cornice di telefono disegnata dentro il mockup**, non misure di prodotto: un foglio vero è ancorato al fondo (`src/components/ds/Sheet.tsx:450-451`) |
| **S5** | voci della tendina a **50 px**, icona 32, testo 15.5 | **56 px, icona 38, testo 17** (anatomia di §5.34 verbatim) | Una voce che **cancella davvero** (D61) non si rimpicciolisce per far stare la tendina. E una seconda serie di misure per la stessa cosa è il modo di avere due menù invece di uno |
| **S6** | miniature della fascia del visore a **9 px** di raggio | **12** (`raggio.riga - 6`), come tutte le altre miniature | Un nome per una cosa. 3 px su una tessera da 44 non cambiano la lettura, due raggi diversi per due miniature sì |
| **S7** | «La scelta vale **per tutte e tre**» | «La scelta vale **per tutte e {quante}**» | Un componente non sa scrivere in lettere un numero qualunque, e inventare una tabella di numeri-parola è lavoro fuori perimetro |
| **S8** | padding dei fogli **10/18/18**, manico **40×4** | **12/20/20**, manico **36×4** | La griglia di §4.2 ammette 8/12/16/20 (10 e 14 **solo** sotto i 700 px di altezza) e §5.16 fissa il manico a 36×4. Il bilancio verticale di **D79** cambia di **4 px** a 390: le sei pastiglie e l'anteprima restano dove D79 le ha ratificate |
| **S9** | dida della **conferma** a 13.5 | **15.5** (`callout`) | È il testo che dice che la foto **non torna più**. È lo stesso ruolo che in `DialogConferma` vale 15.5 (`src/components/ds/DialogConferma.tsx:219`): le due forme devono **leggersi uguali**. ⚠️ La dida del **foglio categoria** resta **13.5** come il mockup: lì il bilancio verticale è ratificato da D79 |

🔎 **Restano fedeli al mockup, e sono le misure che qualcuno sarebbe tentato di «sistemare»:** il testo delle
pastiglie a **15 px** (misurato: a 15,5 «Guida colore» va a capo) · i titoli dei fogli a **19/800** e la dida
del foglio categoria a **13.5** (fuori dalla scala «chiusa» di §4.1, ma con tre precedenti ratificati —
§5.19, §5.22, §5.30) · la foto grande a **4/3** e le pastiglie a **60**.

---

## 6. Che cosa ho dovuto ASSUMERE — dichiarato, non nascosto

🛑 **R-P1, fail-closed:** quello che segue **non porta il marchio `provato:`**. Ogni riga dice **con quale
comando o quale prova** si chiude, e **chi** la chiude.

| # | assunzione | come si chiude, e chi |
|---|---|---|
| **A-1** | 🔴 **La più importante.** Che `event.stopPropagation()` dentro un `onKeyDown` di React impedisca all'evento nativo di arrivare a un ascoltatore su `window`. Il ragionamento: React 18/19 aggancia i propri ascoltatori al **contenitore del portale** (`document.body`, `src/components/ds/Sheet.tsx:367`), che sta **sotto** `window` nella risalita, e `stopPropagation()` sul sintetico ferma anche il nativo | **T7, prima riga di prova:** uno `Sheet` aperto sotto (ascolta su `window`) + una tendina sopra, focus dentro la tendina, `Escape` → **si chiude solo la tendina**. 🛑 **Se lo `Sheet` si chiude, la via di §1.5 è falsa** e si passa all'alternativa di §8 FM-2 |
| **A-2** | Che **nessuno `Sheet` o `DialogConferma` resti aperto SOTTO il visore**. È l'assunzione che rende innocuo lo stare sotto z-index 1000 (§1.3). Le due superfici che montano l'album — la scheda del lavoro e la scheda in modifica — tengono le foto **nella pagina**, non dentro un foglio | **T10/T11**, che innestano davvero: se un foglio può restare aperto, i tre z-index salgono sopra 1000 e la riga si riscrive |
| **A-3** | Che **`FoglioCategoria` sia anche il terzo strato**, aperto da «Cambia categoria» della tendina. Lo dicono la spec dell'album §4.1 e §5.4 (l'etichetta del visore è toccabile per correggerla) e la voce nel mockup, **non** il piano | **Ratifica di questo gate.** Se il gate dice che dalla tendina la categoria NON si corregge, §5.41 perde metà delle sue regole di strato |
| **A-4** | Che i numeri di contrasto di §5 (S1, S2) siano **calcolati a mano** dai valori dichiarati nel mockup, su una foto ipotetica **completamente bianca**. Non sono una misura su uno screenshot reso | **T7 e il gate estetico L2 (FASE 9b):** si misura sul reso, su **due** foto vere — una radiografia e una guida colore sovraesposta. I valori possono essere ritoccati; **la regola** («il contrasto non dipende dalla sfumatura») resta |
| **A-5** | Che «Guida colore» rientri a **15 px** in **148,5 px**: è la misura di **D79**, presa sul mockup. **Non l'ho rifatta** | **T9**, con la prova che il testo non va a capo a 390 |
| **A-6** | Che **260 px** bastino alla tendina con l'anatomia di §5.34 (voce 56, icona 38, testo 17). Il mockup ne usa 236 con misure più piccole | **T8**, a 390: se «Cambia categoria» va a capo, si allarga |
| **A-7** | Che l'anteprima dello scatto multiplo mostri **fino a tre** miniature e poi solo «{n} foto» (è quel che fa il mockup, C3) | **T9** |
| **A-8** | Che `sopraFoto.facciaAttiva` (il ⋯ acceso) sia la **stessa faccia più densa** e non una faccia chiara: il mockup usa `rgba(255,255,255,.34)`, che è coerente con la faccia chiara **scartata** in S2 | **T7/T8**, sulla foto chiara |
| **A-9** | Che il divieto di **D66** («la foto non si degrada») valga per **il visore**, dove la foto si guarda, e non per l'**anteprima** della carta, che ritaglia (`objectFit: 'cover'`) per tenere il rapporto 4/3 | **Ratifica di questo gate** |

---

## 7. Dove il piano o la spec sbagliano — R-E2, riferito e non corretto di nascosto

| # | dove | che cosa non torna |
|---|---|---|
| **F-1** | 🔴 **Piano, blocco C.** Il piano tratta come **terzo strato solo la conferma** (T9-bis). Ma «Cambia categoria» della tendina apre **`FoglioCategoria` nello stesso identico posto della pila**: T9 non dice **niente** su `storia-overlay`, sul divieto di bloccare lo scorrimento, sul portale né sullo z-index — cioè, eseguito alla lettera, **T9 produce il difetto che T9-bis esiste per evitare** | §5.41 lo copre; **il mandato di T9 va aggiornato** |
| **F-2** | 🔴 **Spec v3 §4.2** — «Raggi: … **Nessun altro raggio**». **Il codice ratificato la contraddice già due volte**: `src/components/ds/DialogConferma.tsx:240` usa `raggio.riga - 6` (= **12**) e `src/components/ds/MenuVoce.tsx:59` usa `raggio.riga - 7` (= **11**, ed è il raggio che §5.34 **prescrive**) | O §4.2 accoglie il raggio piccolo, o due componenti in vigore sono fuori legge. **Non è roba di questo gate**: qui si è scelto l'idioma già in casa (§1.7) |
| **F-3** | 🔴 **Spec v3 §4.1** — «Scala (fissa, **nessun'altra dimensione ammessa**)». Contraddetta da §5.19 (13.5), §5.22 (14), §5.30 (14), §5.28 (16) e da `src/components/ds/DialogConferma.tsx:219,226,236` (15.5 · 16.5 · 14) | La scala è **di fatto aperta**. Va detto, o ogni sezione nuova rilitiga lo stesso punto |
| **F-4** | 🟡 **D77** dice «il contrasto dei controlli si prova **sulla foto più scura**, non su quella media». **Misurato, il caso peggiore per il TESTO è quello CHIARO** (§5, riga S1): sulla foto scura la sfumatura nera sopra il nero dà contrasto **massimo**. La foto scura è il caso peggiore per un'**altra** cosa — il **confine** dei controlli | Presa alla lettera, quell'istruzione **lascia passare il difetto vero**. Servono **due** casi, ed è quel che §5.39 prescrive |
| **F-5** | 🟡 **Spec v3 §5.33**, ultima riga: «le §5.x dei **quattro** componenti nuovi». Con **D80** sono **cinque** | Corretto dal testo di §3.3 |
| **F-6** | 🟡 **Piano, T8.** Pretende `getAllByRole('menuitem')`, ma `src/components/ds/MenuVoce.tsx` **non sa dire `role="menuitem"`** (rende un `<button>` nudo) e mostra sempre il chevron. Quindi la tendina **non può riusarlo** senza modificarlo — e `MenuVoce.tsx` **non è nell'elenco dei file** del piano | §5.40 fa rendere alla tendina le proprie voci, **copiando l'anatomia di §5.34 verbatim**. La via alternativa è in §8, riga FM-6 |
| **F-7** | 🟡 **Piano, T9-bis Passo 1:** «focus alla **prima azione**». Con l'ordine di §5.17 la prima azione **è** quella sicura, quindi oggi coincidono — ma la frase prescrive una **posizione**, non una **proprietà**: se un domani l'ordine si invertisse, quella riga manderebbe il focus sul tasto che cancella | §5.42 dice «alla prima azione, **che è quella sicura**». La riga del piano va detta così |
| **F-8** | 🟡 **Piano, T7.** Dice che il visore blocca lo scorrimento, ma **non** che deve difendersi dalla **propria** rientranza. Senza il `if (!ref.current)` di `src/components/ds/Sheet.tsx:248`, riaprire il visore mentre l'uscita precedente sta ancora giocando riproduce **dentro un solo componente** lo stesso difetto di §1.4 | §5.39 lo prescrive; il mandato di T7 lo dica |
| **F-9** | 🟡 **Mockup e spec dell'album §12** — la voce «**Salva** sul telefono». «salva» è **vietata** dal dizionario (`src/design-system/v3/dizionario.ts`, che propone «Fatto ✓»). Non blocca il commit (il controllo greppa solo `src/components/ds/`, e l'etichetta è una **prop del chiamante**), ma è contro la regola | Precedente in casa: l'**eccezione ratificata il 26/07** per «Salva il nome»/«Salva il colore». Serve la stessa decisione esplicita, e non è di questo gate: v. §8, riga FM-4 |

---

## 8. Fuori mandato — R-E2: riferito, non fatto

| # | che cosa | perché non l'ho fatto |
|---|---|---|
| **FM-1** | 🔴 **La riparazione VERA del blocco dello scorrimento:** un modulo a **contatore** (`blocca()`/`sblocca()` con un conteggio e un solo valore precedente salvato al primo blocco), di cui **anche `Sheet` sia un utente**. Chiuderebbe il difetto per **tutta** l'applicazione, e farebbe cadere il costo residuo dichiarato in §1.4 | **Tocca `src/components/ds/Sheet.tsx`**, che non è nel mandato di T5 né in quello di T6-T9-bis. **Proposta, non decisa** |
| **FM-2** | 🔴 **La riparazione VERA di P18 (`Escape`):** mediarlo con la stessa pila LIFO che già media il tasto «indietro», dentro `src/components/ds/storia-overlay.ts`. Chiuderebbe il difetto anche per `Sheet` e `DialogConferma`, non solo per questa superficie — ed è **l'unica via** se l'assunzione **A-1** cade | **Tocca `src/components/ds/storia-overlay.ts`**, modulo condiviso da due componenti in produzione. **Proposta, non decisa** |
| **FM-3** | Il `preventDefault()` sul `pointerdown` del velo (§1.5 punto 4) starebbe bene dentro `src/components/ds/useTapScrim.ts`, accanto agli altri due handler | **È un file condiviso.** Nei componenti nuovi si scrive **accanto** alla coppia dell'hook, non dentro l'hook. Se il gate preferisce l'altra via, è una modifica a `useTapScrim.ts` e va detta |
| **FM-4** | **«Salva sul telefono»** — due cose insieme: ① la parola è contro il dizionario (F-9) e serve un'eccezione ratificata come quella del 26/07; ② 🛑 **la sua implementazione è un punto in cui l'indirizzo firmato può uscire** (G5 · D75), e vive nel **chiamante** (T11/T12), non in `TendinaMenu` | Fuori dal mandato di un gate documentale. **Va nel mandato di chi scrive la voce** |
| **FM-5** | Il commento di testa di `src/components/ds/DialogConferma.tsx:3-9` («l'UNICA card centrata…») | **È codice.** Il testo pronto è in §3.4; applicarlo è di chi tocca quel file |
| **FM-6** | Dare a `src/components/ds/MenuVoce.tsx` una prop `ruolo?: 'menuitem'` e togliere il chevron alla variante `butta`, per farlo riusare dalla tendina (F-6) | `MenuVoce.tsx` **non è nell'elenco dei file** del piano ed è usato altrove (menù della scheda). **Proposta** |
| **FM-7** | **BP-1 (memoria).** Il controllo pre-commit avvisa che questo salvataggio tocca una spec **senza toccare la memoria** | Questo documento è una **proposta**: lo stato del progetto cambia **alla ratifica**, non adesso. `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` **non sono nel mandato di T5** — l'aggiornamento è del coordinatore, dopo il gate |

---

## 9. Che cosa deve succedere adesso

1. **Il gate si chiude con una ratifica**, riga per riga sull'elenco di §0 — in particolare **G-3**, **G-4**,
   **G-8** e **G-9**, che sono le quattro che cambiano il comportamento e non solo la scrittura.
2. **Poi**, e non prima, partono **T6 → T9-bis**, un esecutore fresco per task (R-E1), con questa proposta
   come fonte di verità: **se il gate ha scelto una via diversa, vale quella**.
3. **Il primo che tocca `src/design-system/v3/tokens.ts`** (T7) ci porta il gruppo `sopraFoto` di §4: senza,
   il controllo pre-commit **blocca**.
4. **I mandati di T7, T8 e T9 vanno corretti** con le righe **F-1**, **F-6**, **F-7** e **F-8** di §7, o tre
   esecutori su cinque ripartiranno da un testo che sa di meno di questo documento.
