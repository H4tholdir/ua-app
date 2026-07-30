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
