# Proposta — le CINQUE sezioni §5.x dell'album, del visore, della tendina e dei due fogli

> 🚪 **QUESTO DOCUMENTO È UN GATE, non una descrizione.** È il **Task 5** del piano
> `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md`, e la spec v3 §13.1 punto 3 impone che
> una sezione §5.x si **proponga PRIMA** che il componente esista. **Nessuna riga di React è stata
> scritta**: T6, T7, T8, T9 e T9-bis non partono finché quello che c'è qui non è ratificato.

**Data:** 30 luglio 2026 · **Stato:** 🟡 **PROPOSTA — da ratificare**
🔧 **Revisione 2, 30/07 sera: le correzioni del panel sono ENTRATE.** Il panel di tre
(`docs/roadmap/2026-07-30-panel-gate-sezioni-album.md`) aveva fermato la revisione 1 con **sette bloccanti**
e **quindici rilievi**; sono applicati tutti, e i **quattro bivi** che il panel non poteva chiudere da sé
sono stati decisi da Francesco → **D85** (trappola del focus alla radice) · **D86** (il ripiego dell'`Escape`
lo decide il coordinatore) · **D87** (etichetta di gruppo a 12,5) · **D88** (l'ombra della tendina resta,
dichiarata). L'elenco da ratificare di §0 passa da **dieci a quindici** voci.
**Scrive:** esecutore del Task 5 (R-E1) · **corregge:** il coordinatore, dopo il panel · **Ratifica:**
Francesco Formicola
**Destinazione del testo:** `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`
(§5.38-§5.42 nuove · §5.17 e §13.2 emendate · §5.33 corretta di una parola)
**Fonte di verità visiva di tutte e cinque:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`
**Spec della superficie:** `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`
**Decisioni:** `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **D64-D88**, in particolare
**D76** (album A1) · **D77** (visore V1) · **D78** (tendina M2) · **D79** (categoria C1) · **D80** (foglio
di conferma) · **D83** (il visore copre tutto) · **D84** (il blocco dello scorrimento riparato alla radice) ·
**D85** (la trappola del focus, idem).

**I cinque componenti — tutti 🆕 da creare:** `src/components/ds/CartaAlbum.tsx` (🆕 da creare) ·
`src/components/ds/VisoreFoto.tsx` (🆕 da creare) · `src/components/ds/TendinaMenu.tsx` (🆕 da creare) ·
`src/components/ds/FoglioCategoria.tsx` (🆕 da creare) · `src/components/ds/FoglioConferma.tsx` (🆕 da creare).

**I due moduli condivisi su cui poggiano:** `src/components/ds/blocca-scorrimento.ts` — ✅ **già in casa**
(T5-bis, D84) · `src/components/ds/trappola-focus.ts` (🆕 **da creare** in T5-ter, D85).

---

## 0. Che cosa questo gate chiede di ratificare — l'elenco corto

| # | decisione | dove sta per esteso |
|---|---|---|
| **G-1** | I numeri di sezione sono **§5.38 → §5.42**. `provato:` `grep -rn "5\.38\|5\.39\|5\.40\|5\.41\|5\.42"` sulla spec v3 e su `src/components/ds/*.tsx` → **zero riscontri**: nessuno dei cinque numeri è già in uso | §2 |
| **G-2** | **Raggio delle miniature = `raggio.riga - 6` (cioè 12)**, non un 12 nudo e non un token nuovo | §1.7 |
| **G-3** 🔧 | ~~Solo `VisoreFoto` blocca lo scorrimento del corpo~~ 🛑 **SUPERATA il 30/07 da D84 — il difetto è stato RIPARATO ALLA RADICE, non aggirato.** La forma in vigore è: **ogni strato che copre la pagina chiama `bloccaScorrimento()`** (`src/components/ds/blocca-scorrimento.ts`, a contatore: cattura al **primo** blocco, ripristina all'**ultimo** sblocco, in qualunque ordine arrivino i rilasci, compensazione della barra inclusa). ✅ **Cade anche il costo residuo dichiarato in §1.4** — il foglio della categoria allo scatto **blocca** come gli altri. ✅ E cade l'invariante «esattamente un bloccante, e dev'essere il più basso», che nessuna guardia poteva verificare. ⚠️ `Sheet` e `NuovoOrdineSheet` sono **già migrati** (`c268b54b` · `47e77069` · `daeb0efc` · `636c10b4`): chi scrive uno strato nuovo **usa il modulo**, non scrive mai `document.body.style`. ✅ **§1.4 è riscritta**, e con essa **la prova, che era CIECA DUE VOLTE** (B-3): sentinella `'scroll'` invece di `'hidden'`, asserzione **mentre è aperto** e non solo dopo, `paddingRight` incluso, **il caso che deve fallire** e la prova **speculare** dei due strati chiusi nell'ordine sbagliato | §1.4 ✅ **riscritta** |
| **G-4** 🔧 | **`Escape` non si ascolta più su `window`:** si ascolta sul **pannello che ha il focus**, con `stopPropagation()`. Contratto: i quattro strati si montano **fratelli**. 🛑 **Il panel l'aveva bocciata a tre su tre (B-1), e la ragione era che il punto 2 NON ERA VERO:** col `Tab` si esce dal pannello e l'`Escape` risale a `window`, dove vivono **nove** ascoltatori. ✅ **Chiusa da G-11**, che rende il punto 2 vero per costruzione. ✅ **E il punto 3 non è più una previsione: è `provato:`** in `react-dom` (v. G-12 e §6, A-1) | §1.5 ✅ **riscritta** |
| **G-5** 🔧 | ~~z-index: visore 400 · tendina 500 · fogli 600~~ 🛑 **CORRETTA il 30/07 da D83: visore 1010 · tendina 1020 · fogli di terzo strato 1030** — sopra `Sheet` e `DialogConferma` (1000), sotto gli avvisi (1100). 🔑 **Il censimento di §1.3 era incompleto e nascondeva il precedente che rispondeva alla domanda:** `src/components/features/lavori/consegna-v3/FlussoConsegna.tsx:56` e `FrameConsegnato.tsx:90` sono **due overlay v3 a tutto schermo a 1000**, montati **dalla stessa pagina** dell'album. ✅ **E l'assunzione A-2 smette di essere portante** | §1.3 ✅ **riscritta** |
| **G-6** 🔧 | **`molla.smooth` per tutti e quattro gli strati** — **è una scelta, non un token già pronto** per visore e tendina; per i due fogli la coreografia esiste già (`coreografie.sheetSu`, §8.3 n.6). 🛑 **CORRETTA il 30/07 dal panel (B-6): per i due fogli NON BASTA nominarla.** `provato:` `src/design-system/v3/motion.ts:85-86` porta la transizione **dentro** la variante, in **entrambe** le chiavi: una `transition` passata come prop **non ci arriva mai**. A «Riduci movimento» i due fogli si muoverebbero comunque. ➡️ Serve una **variante ridotta esplicita**, e la prova diventa «`y` finale = 0 **e** nessun tween su `y`» | §1.8, §1.9 **riscritte** |
| **G-7** 🔧 | ~~Sette valori nuovi~~ 🛑 **CORRETTA (C-2): sono NOVE.** `provato:` contate le chiavi del blocco di §4 — `velo · sfumaturaAlto · sfumaturaBasso · faccia · facciaAttiva · confine · ombraPannello · tratteggio · miniaturaSpenta`. Gruppo `sopraFoto` in `src/design-system/v3/tokens.ts`: senza, i componenti non passano il controllo pre-commit. 🔴 **E li porta T6, non T7** (C-3): `CartaAlbum` usa già `sopraFoto.faccia` per la pastiglia «⤢ Apri», e **T6 gira prima** | §4 |
| **G-8** 🔧 | **L'ordine dei due tasti della conferma resta quello di §5.17** (sicura sopra, distruttiva sotto) — **il mockup mostra l'opposto**, ed è ormai **D82**, non più una deduzione. 🛑 **CORRETTA (C-5): la conclusione regge, la RAGIONE citata in §5.40 no.** «In fondo alla tendina c'è il pollice» è falso: una tendina ancorata sotto il ⋯ vive nel terzo **alto** dello schermo — il suo fondo sta a ~220 px su 844. La mitigazione di D78 resta (rosso + linea + parola esplicita); **la frase sulla zona del pollice si toglie**, e S3 si riscrive senza appoggiarcisi | §5, riga S3 |
| **G-9** 🔧 | **I controlli del visore non si appoggiano alla sfumatura per il contrasto**: ognuno porta la propria faccia e il proprio confine. 🔑 **Il panel l'ha chiamata «la decisione migliore del gate» — e ha trovato che l'APPLICAZIONE era incompleta proprio sui due elementi che voleva difendere** (B-4): `provato:` `docs/design/mockups/2026-07-30-album-visore-categoria.html:118-120` — `.vis-capo .mezzo` **non ha nessun `background`**, quindi etichetta e contatore stanno **direttamente sulla sfumatura** e valgono **~2,1:1**, non 4,2. ➡️ Diventano **una pastiglia con faccia** (`sopraFoto.faccia` + `sopraFoto.confine`, `raggio.pill`, min-height **44**) — che chiude anche B-5 | §5, righe S1·S2·S4·S5 |
| **G-10** | **L'emendamento a §5.17 e a §13.2** — testo pronto da incollare | §3 |
| **G-11** 🆕 | 🔒 **La trappola del focus si ripara ALLA RADICE — `src/components/ds/trappola-focus.ts` (🆕 da creare), e `Sheet` e `DialogConferma` diventano suoi utenti.** Nasce **T5-ter**, prima di T6. Chiude il bloccante **B-1**, l'unico su cui il panel ha convergiuto **a tre su tre**. ✅ **Ratificata: D85** | §1.6 **riscritta** |
| **G-12** 🆕 | 🚦 **La via dell'`Escape` di §1.5 si tiene, il confine è la fase di BOLLA, e il ripiego (FM-2) lo decide il COORDINATORE — non l'esecutore di T7.** Chiude il bloccante **B-2**. ✅ **A-1 non è più un'assunzione: è `provato:`** ✅ **Ratificata: D86** | §1.5, §6 riga A-1 |
| **G-13** 🆕 | 🔠 **L'etichetta di gruppo della carta sale da 11 a 12,5 px** — il minimo assoluto di §4.1, lo stesso che questo documento invoca quattro sezioni più in là per bocciare il contatore. Chiude **C-9**; nasce lo scostamento **S10**. ✅ **Ratificata: D87** | §2 (§5.38), §5 riga S10 |
| **G-14** 🆕 | 🌑 **`ombraPannello` resta, ed è la SECONDA eccezione ratificata alla legge di §3 «in scuro nessuna ombra»** — precedente: `TastoPiu`, `src/design-system/v3/tokens.ts:75`. Chiude **C-14**. ✅ **Ratificata: D88** | §4, §2 (§5.40) |
| **G-15** 🆕 | 📐 **La larghezza del foglio si DICHIARA, e la misura di D79 si rifà: la colonna vera è ~171 a 390 e ~216 da 768, non 148,5.** Cade con lei il `whiteSpace:'nowrap'`, che rompeva il **text-zoom 200%** — requisito di rilascio, non estetica. Chiude il bloccante **B-7**; nascono **S11** e **S12** | §2 (§5.41), §5 righe S11·S12 |

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
nello stesso posto della pila. Tutto ciò che vale per la conferma (marca `'uaSheet'`, portale, z-index del
terzo strato, `bloccaScorrimento()`, `Escape` mediato, trappola del focus) vale **identico** per il foglio
della categoria quando arriva da lì. V. §7 riga F-1.

`CartaAlbum` **non è uno strato**: è contenuto di pagina.

### 1.2 La marca della storia — `'uaSheet'`, e non si riapre
Tutti e quattro gli strati si registrano con `entraOverlay('uaSheet', …)` / `esciOverlay(token)`
(`src/components/ds/storia-overlay.ts`). `provato:` **P14 del piano** — il **valore** della marca non è mai
confrontato dentro il modulo (si scrive a `:88`, si rilegge a `:98`, si ri-spinge a `:116`, e il gate a
`:131` è `if (!marcaEntry)`, cioè sull'**esistenza**), e `type Marca` (`:67`) è un'unione **chiusa e non
esportata**: una terza marca **non compilerebbe**. Riusare `'uaSheet'` tiene anche verde
`scripts/guardia-navigazione-overlay.mjs:97`, che riconosce **solo** quelle due stringhe.

**L'aggancio si copia verbatim da `Sheet.tsx:195-199`**, dipendenza **solo `aperto`** (il callback si
rilegge da un `useRef`, o l'entry si ri-spingerebbe a ogni render del chiamante).

Navigare da dentro uno strato: **mai `router.push` nudo**, sempre `src/components/ds/useNavigaDaOverlay.ts`.

### 1.3 z-index — tre valori SOPRA gli overlay di casa (D83)
| strato | z-index |
|---|---|
| `VisoreFoto` | **1010** |
| `TendinaMenu` | **1020** |
| `FoglioCategoria` · `FoglioConferma` (terzo strato, mai insieme) | **1030** |

`provato:` `grep -rn "zIndex" src/` + `grep -n "z-index" src/app/*.css`, **rifatto dal coordinatore il
30/07 dopo che il panel ha trovato il censimento incompleto (C-4)**:

| chi | quota | dove |
|---|---|---|
| chrome v3 | ≤ **60** | `src/app/ds-v3.css:105,413` |
| legacy | ≤ **301** | `src/components/features/fatture/InviaPecButton.tsx:295,312` |
| `Sheet` · `DialogConferma` | **1000** | `src/components/ds/Sheet.tsx:466` · `src/components/ds/DialogConferma.tsx:182` |
| 🔴 **il rito della consegna — due overlay v3 a TUTTO SCHERMO** | **1000** | `src/components/features/lavori/consegna-v3/FlussoConsegna.tsx:56` · `FrameConsegnato.tsx:90` |
| avvisi | **1100** | `src/components/ds/Avviso.tsx:285` |
| `SkipToContent` (link «vai al contenuto») | **9999** | `src/components/layout/SkipToContent.tsx:12` |

🔴 **Le due righe in grassetto sono ciò che il primo censimento aveva omesso, e nascondevano il precedente
che rispondeva alla domanda:** quei due overlay si montano **dalla stessa pagina** dove vivrà l'album
(`src/components/features/lavori/consegna-v3/FlussoConsegna.tsx` e `FrameConsegnato.tsx`, dalla scheda del
lavoro). La casa aveva **già** risposto a «a che quota sta un overlay v3 a tutto schermo», e la risposta era
**1000** — non 400. La conclusione «302-999 è libero» **resta vera**; era la domanda a essere sbagliata.

🛑 **Perché valori ESPLICITI e non l'ordine di montaggio del portale:** oggi `DialogConferma` sta sopra
`Sheet` **solo** perché il suo portale si monta dopo (P17). Con tre strati che si aprono e si chiudono in
ordini diversi, quell'ordine non è più una garanzia: **si dichiara**.

✅ **Il guadagno di D83 non è estetico: l'assunzione A-2 SMETTE DI ESSERE PORTANTE.** A 400/500/600 la
correttezza dipendeva da «nessuno `Sheet` resta aperto sotto il visore» — vero oggi sui due chiamanti
misurati, ma è una regola che chi aggiungerà una voce di menù domani dovrebbe conoscere **senza che niente
glielo ricordi**. A 1010-1030 il visore copre per costruzione.

⚠️ **Il soffitto, dichiarato:** sopra restano solo gli **avvisi** (1100) — ed è giusto così, un cartellino
deve poter comparire sopra il visore — e il **link «vai al contenuto»** (9999), che è la ragione per cui
serve **anche** la trappola del focus di §1.6: la quota da sola non lo tiene fuori dal `Tab`.

### 1.4 Lo scorrimento del corpo — **lo blocca il contatore, e lo chiamano tutti** (D84)
🔧 **Sezione riscritta il 30/07: il difetto è stato RIPARATO ALLA RADICE, non aggirato.** La stesura
precedente prescriveva «solo il più basso blocca», che era la scorciatoia attorno a un difetto di `Sheet`;
D84 ha scelto la riparazione, e **T5-bis è in casa** (`c268b54b` · `47e77069` · `daeb0efc` · `636c10b4`).

**La regola, in una riga: ogni strato che copre la pagina chiama `bloccaScorrimento()`**
(`src/components/ds/blocca-scorrimento.ts`) e tiene la funzione che quella gli restituisce, per chiamarla
alla chiusura. Nessuno scrive **mai** `document.body.style`. Il modulo cattura il valore vero al **primo**
blocco e lo ripristina all'**ultimo** sblocco, in qualunque ordine arrivino i rilasci; la `sblocca()` è
**idempotente**, quindi chiamarla due volte vale come chiamarla una; la larghezza della barra di scorrimento
è compensata. Chi blocca chiama e basta: **non deve sapere se è il primo, l'ultimo o quello in mezzo.**

⚠️ **`Sheet` e `NuovoOrdineSheet` sono già migrati** (`src/components/ds/Sheet.tsx:304-306` prende il posto,
`:267-311` lo rilascia). Quindi il visore, la tendina e i due fogli si aggiungono a un contatore che
**esiste già ed è popolato**, non ne fondano uno nuovo.

**E il gesto si ferma anche dove nasce — ma con una precisazione che il panel ha dovuto aggiungere (C-1):**
- il **velo** porta `touchAction: 'none'` — il trascinamento che nasce sul velo non scorre la pagina sotto;
- il **pannello** porta `overscrollBehavior: 'contain'` — 🛑 **ma quella proprietà è INERTE se il pannello
  non è un contenitore che scorre.** `Sheet` si salva perché dichiara `overflowY: 'auto'`
  (`src/components/ds/Sheet.tsx:494`); le Misure dei quattro strati nuovi devono **dichiararlo anche loro**,
  o `contain` non ha niente da contenere e la riga è decorativa.

#### La prova che ogni strato deve portare — 🛑 riscritta, la precedente era CIECA DUE VOLTE
La stesura precedente metteva il corpo a `'hidden'` prima di aprire e pretendeva che alla chiusura valesse
**ancora `'hidden'`**. Due difetti in una riga: ① `'hidden'` è **esattamente il valore che un componente che
blocca scriverebbe** — `Sheet`, che blocca, **superava quella prova**; ② restava verde anche **senza montare
niente**. Una prova che non può diventare rossa non è una prova.

**La forma giusta, con una sentinella che nessuno scriverebbe mai:**

```ts
document.body.style.overflow = 'scroll'      // sentinella: nessun bloccante scrive 'scroll'
document.body.style.paddingRight = '7px'     // idem — il modulo tocca ANCHE questa (blocca-scorrimento.ts:66)

// 1. mentre è APERTO, non solo dopo:
//    overflow === 'hidden'                  ← ha bloccato davvero
// 2. dopo la chiusura:
//    overflow === 'scroll'  &&  paddingRight === '7px'   ← ha restituito il valore VERO, non ''
```

**Più i due casi che la rendono onesta:**
- **il caso che DEVE fallire (R-P1):** si esegue l'asserzione ① **senza montare lo strato** e si verifica
  che diventi **rossa**. Se resta verde, la prova non guarda il componente;
- **la prova speculare, che alla stesura precedente mancava del tutto:** due strati aperti insieme, chiusi
  **nell'ordine sbagliato** (prima quello sotto) → alla fine vale **ancora `'scroll'`**. È la sequenza che
  ha generato D84, e adesso deve passare per costruzione.

### 1.5 `Escape` con tre strati — il difetto misurato, e la via
🔴 **Il fatto (P18, ri-misurato):** `src/components/ds/Sheet.tsx:164` e
`src/components/ds/DialogConferma.tsx:83` ascoltano **entrambi su `window`**. Con due strati aperti **un solo
Escape li collassa tutti**, mentre il tasto «indietro» ne chiude correttamente **uno** (la pila LIFO di
`src/components/ds/storia-overlay.ts:102-118`). Con **tre** strati il difetto triplica.

🛑 **E sono NOVE, non due.** `provato:` `grep -rn "window.addEventListener('keydown'" src/` escludendo i
test → **9 riscontri**: i due di `ds/` più `features/home/HomeDesktop.tsx:155`,
`features/fatture/UploadRicevutaSheet.tsx:78`, `InviaPecButton.tsx:112`, `NotaCreditoButton.tsx:97`,
`OverrideStatoSheet.tsx:114`, `RiconciliazioniClient.tsx:744`, `SbloccaClaimSheet.tsx:61`. Il numero conta
perché è **la platea che un `Escape` risalito a `window` raggiunge** quando il focus è uscito dal pannello.

➡️ **La via: nessuno dei quattro strati nuovi ascolta `Escape` su `window`.**

1. Ogni strato **porta il focus dentro il proprio pannello** all'apertura, **ce lo TIENE** finché è aperto
   (trappola del focus, §1.6 — **D85**) e lo **restituisce all'apritore** alla chiusura.
2. `Escape` si ascolta con un **`onKeyDown` sul pannello**. Il pannello che contiene il focus è **quello in
   cima**: nessun altro riceve l'evento. 🔑 **Dal punto 1 questa non è più una speranza: è vera per
   costruzione** — era esattamente il buco del bloccante B-1.
3. L'handler chiama **`event.stopPropagation()`**. React 18/19 aggancia i propri ascoltatori al **contenitore
   del portale** (qui `document.body`, `Sheet.tsx:415`), che sta **sotto** `window` nella risalita: fermare
   lì significa che un `Sheet` o un `DialogConferma` aperto per sbaglio **non si chiude insieme**.
4. **Il velo non toglie il focus:** `preventDefault()` sul suo `pointerdown` — un tocco sul velo chiude, ma
   non manda il focus sul `body` lasciando l'`Escape` senza destinatario. 🛑 Si scrive **accanto** ai due
   handler di `src/components/ds/useTapScrim.ts`, **senza modificare quel file** (è condiviso: v. §8, FM-3).

🔑 **Contratto del chiamante, obbligatorio o il punto 2 non regge:** i quattro strati si montano **fratelli**
nell'albero React, **mai uno dentro le props o i figli dell'altro** — gli eventi sintetici di React risalgono
l'albero **React**, non il DOM, quindi una tendina montata *dentro* `azioni` del visore farebbe arrivare
l'`Escape` **anche al visore**. Per questo `azioni` di `VisoreFoto` accetta **solo l'innesco** (il tondo ⋯),
mai la tendina né un foglio (§2, §5.39).

#### ✅ Il punto 3 non è più una previsione: è `provato:` (D86)
`provato:` letto alla fonte e **riverificato dal coordinatore** in
`node_modules/react-dom/cjs/react-dom-client.development.js` — `:3394-3397`: lo `stopPropagation()`
dell'evento sintetico chiama quello **nativo**; `:12907-12911`: il `case 4` (il portale) chiama
`listenToAllSupportedEvents(containerInfo)`, cioè gli ascoltatori di React stanno sul **contenitore del
portale**, che nella risalita sta **sotto** `window`.

🛑 **Il confine, da incidere e non da sottintendere: vale per la fase di BOLLA.** Un ascoltatore registrato
in **cattura** su `window` riceverebbe l'evento **prima** che il pannello possa fermarlo, e passerebbe.
`provato:` oggi nessuno dei nove lo fa — sono tutti in bolla. La regola lo dice **perché il giorno che
qualcuno ne aggiunge uno in cattura, niente lo segnalerebbe.**

**Resta comunque la prova, come primo passo di T7** (una verifica alla fonte non sostituisce una prova di
comportamento):
> monta uno `Sheet` aperto (che ascolta su `window`) e sopra una `TendinaMenu`; porta il focus dentro la
> tendina; premi `Escape` → **la tendina si chiude, lo `Sheet` resta aperto**.

🚦 **E se quella prova fallisse, l'esecutore NON sceglie: si ferma e riferisce (D86).** Il ripiego (§8,
FM-2) tocca `src/components/ds/storia-overlay.ts`, modulo condiviso da due componenti in produzione — cioè
fuori mandato per R-E2. **La scelta è del coordinatore.** Era il bloccante B-2: un bivio scritto in un
documento e senza proprietario è un esecutore che si ferma comunque, solo più tardi.

**Alternativa nominata e scartata, perché non venga riproposta:** un **secondo** modulo LIFO in
`src/components/ds/` con un solo ascoltatore su `window`. Regge anche col focus perso, ma introduce **due
pile da tenere allineate** con quella di `storia-overlay.ts` — due sorgenti di verità per la stessa domanda
(«chi è in cima?»), che è esattamente il difetto che `storia-overlay.ts` è nato per togliere di mezzo.

### 1.6 Il portale, e il focus — **la trappola si ripara alla radice** (D85)
**Portale su `document.body`, obbligatorio** per tutti e quattro gli strati: `src/app/ds-v3.css:1005-1011`
dichiara che il contenimento della shell della parete crea uno stacking context che intrappolerebbe
qualunque overlay montato in linea.

🔴 **Il difetto, ed è il solo su cui il panel ha convergiuto a tre su tre.** `provato:` in tutto
`src/components/ds/` **non esiste una sola gestione del `Tab`**: nessuna trappola, nessun `inert`, nessun
`aria-hidden` sulla pagina dietro. Eppure **tutti** gli overlay di casa dichiarano `aria-modal="true"`, che
significa alla lettera «quello che c'è dietro non esiste». È una promessa che nessuno mantiene, e il conto
lo paga la via dell'`Escape`: col `Tab` si esce dal pannello, si atterra su
`src/components/layout/SkipToContent.tsx:12` (focusabile, globale, z-index **9999**), e da lì `Escape`
risale a `window` dove vivono **nove** ascoltatori e **chiude lo strato sbagliato** — l'inverso esatto del
difetto che §1.5 esiste per chiudere.

➡️ **La via ratificata (D85): un modulo solo, e lo usano tutti.**
`src/components/ds/trappola-focus.ts` (🆕 **da creare**, task **T5-ter**, prima di T6) — stessa forma e
stessa collocazione di `blocca-scorrimento.ts` ieri: si scrive una volta, e **`Sheet` e `DialogConferma`
diventano suoi utenti** insieme ai quattro strati nuovi. La promessa `aria-modal` smette di essere una bugia
in **tutta** l'app, non solo nell'album.

**Che cosa fa il modulo, e cosa NON fa:**
- tiene il `Tab` e `Shift+Tab` **dentro** il pannello, avvolgendo dal primo all'ultimo elemento raggiungibile;
- **porta il focus dentro** all'apertura e lo **restituisce all'apritore** alla chiusura;
- 🛑 **non spegne la pagina dietro.** La via `inert` è stata **valutata e scartata** in D85: per spegnere
  «tutto tranne me» uno strato dovrebbe scegliere quali figli del corpo risparmiare, e il contenitore degli
  avvisi è appeso lì anche lui (`src/components/ds/Avviso.tsx:99`, portale su `document.body`) — spegnere
  tutto spegne il cartellino che dice «Foto eliminata». I clic dietro li ferma già il **velo**; i lettori di
  schermo li ferma già **`aria-modal="true"`**. Mancava solo la tastiera, ed è quello che il modulo porta.

🔑 **L'àncora del ritorno è DICHIARATA, non catturata (C-12).** Il modello di oggi
(`src/components/ds/Sheet.tsx:314-322`) cattura `document.activeElement` al montaggio: per il foglio di
conferma **non funziona**, perché chi lo apre è **una voce di menù che sta smontando** — si catturerebbe un
nodo staccato dall'albero, il focus finirebbe sul `body`, e da lì (regola di §1.5) **`Escape` è morto**.
➡️ Chi apre uno strato **passa** l'elemento a cui tornare, o ne dichiara uno che sopravvive alla chiusura.

**Ogni §5.x dichiara il proprio comportamento sul `Tab`**, e con D85 la riga è la stessa per tutti e cinque
— il che è il punto: cinque righe diverse sarebbero cinque implementazioni da verificare a una a una.

**La prova che T5-ter deve portare:** con lo strato aperto, `Tab` premuto tante volte quanti sono gli
elementi raggiungibili **più uno** → il focus è **tornato al primo**, e `document.activeElement` **non è mai
uscito** dal pannello. Più il caso che deve fallire: la stessa prova **senza** la trappola diventa rossa.

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
  ancorato al fondo dello schermo e in basso ha **0** (`src/components/ds/Sheet.tsx:498-499`);
- `.palco { border-radius: 22px }` → **il visore a tutto schermo ha raggio 0**.

### 1.8 Il movimento — `molla.smooth`, **dichiarata come scelta**
🛑 **Non esiste una coreografia di casa per un overlay a tutto schermo né per lo sfogliare.** Le otto di §8.3
coprono altro. La casa usa `molla.smooth` per gli overlay (`src/components/ds/DialogConferma.tsx:155,166` ·
`src/components/ds/Sheet.tsx:386`): **si usa quella, e si dichiara che è una scelta, non un token già pronto.**

| strato | movimento | è un token già pronto? |
|---|---|---|
| `VisoreFoto` (entra/esce) | dissolvenza del velo + `scale` 0.98→1 della foto, `molla.smooth` | **no — scelta** |
| `VisoreFoto` (sfogliare) | `x` fra le foto, `molla.smooth` | **no — scelta** |
| `TendinaMenu` | `opacity` + `scale` 0.96→1 con `transformOrigin: '100% 0'` («esce dai tre puntini»), `molla.smooth` | **no — scelta** |
| `FoglioCategoria` · `FoglioConferma` | **`coreografie.sheetSu`** (§8.3 n.6), che è già `molla.smooth` | ✅ sì, esiste — ⚠️ **ma v. §1.9: nominarla NON basta a «Riduci movimento»** |
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
(`.husky/pre-commit`) — ⚠️ ma sa meno di quanto sembri: ha **due sole superfici cablate a mano** e non
scandaglia niente. Su queste cinque, la rete è la prova qui sotto, non la guardia.

#### 🛑 Per i DUE FOGLI la riga sopra non basta — e la stesura precedente ci cascava (B-6)
Le §5.41 e §5.42 dicevano «`coreografie.sheetSu`» **e** «`y` resta nel bersaglio con `istantaneo`», come se
le due cose stessero insieme. **Non stanno insieme.** `provato:` `src/design-system/v3/motion.ts:85-86` —
`sheetSu` porta `transition: molla.smooth` **dentro** la variante, in **entrambe** le chiavi (`animate` e
`exit`): una `transition` passata come **prop** al componente **non ci arriva mai**, perché la transizione
della variante vince. A «Riduci movimento» i due fogli **si muoverebbero comunque**.

🛑 **E la via che l'implementatore troverebbe guardando la casa è peggio:** sotto reduced, `Sheet` monta
`SheetRidotto` (`src/components/ds/Sheet.tsx:426-461`), il cui pannello **non ha `y` affatto**
(`:448-458`: solo `opacity`) — è
esattamente il bersaglio-tolto che questa sezione esiste per vietare, scritto dentro il componente che fa
da modello.

➡️ **Le due §5.x devono dire COME, e la via è una variante ridotta esplicita** — la transizione si sostituisce
dov'è, cioè dentro la variante, su **entrambe** le chiavi:

```tsx
const sheetSuRidotto = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { ...molla.smooth, y: istantaneo } },
  exit:    { y: '100%', transition: { ...molla.smooth, y: istantaneo } },
}
variants={reduced ? sheetSuRidotto : coreografie.sheetSu}
```

**La prova che ogni strato deve portare** (e per i due fogli è diversa da «niente resta fuori schermo», che
resta vera ma è troppo debole per accorgersi di questo caso):
> a «Riduci movimento» accesa: **`y` finale = 0** — cioè il pannello è arrivato — **e nessun tween su `y`**.

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

🔴 **La prova, che alla stesura precedente mancava — ed era l'unica regola del documento senza (C-15).**
Il panel l'ha chiamata la più grave delle cinque non provate, per una ragione precisa: **è l'unica il cui
danno sta FUORI dallo schermo.** Un `title={foto.url}` passa il compilatore, passa la suite, passa tutte le
guardie, non si vede in nessuno screenshot — e ha appena messo l'indirizzo firmato di una radiografia in un
attributo che il browser copia insieme al testo.

**Ogni componente che riceve una foto porta questa prova:**
> reso il componente con `url = 'https://esempio/FIRMA-SENTINELLA'`, si cerca quella stringa **in tutto
> l'HTML prodotto** e la si trova **una volta sola**: nell'attributo `src` di un `<img>`. Zero riscontri in
> `title`, `href`, `download`, `aria-label`, `data-*`, o nel testo dei nodi.

E la sua metà speculare, che è quella che la rende non aggirabile:
> **nessuna prop di tipo callback riceve mai la foto intera.** Chi deve dire «questa» dice l'**indice** o
> l'**id**, mai l'oggetto con dentro l'indirizzo.

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
`var(--muted)` tabulare · **miniature 60×60**, `raggio.riga - 6` (= 12), `gap spazio.s`, **etichetta di
gruppo 12,5/800** +0.1em MAIUSCOLA `var(--faint)`, `gap` fra i gruppi `spazio.sm + 2`.

🛑 **12,5 e non 11 — D87, e vale la pena dire perché.** Il mockup dice 11
(`docs/design/mockups/2026-07-30-album-visore-categoria.html:96`), ma **11 è sotto il minimo assoluto di
§4.1**, che è 12,5 — lo stesso minimo che questo documento invoca quattro sezioni più in là per bocciare il
contatore del visore. **Stesso difetto, accettato in silenzio in un punto e respinto nell'altro**, e per
giunta sul testo più difficile che ci sia: maiuscolo, spaziato di 0,1em, nel colore più debole. Scostamento
dichiarato: §5, riga **S10**.

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
grande (**selezione**, non navigazione) · *tap* sull'**etichetta della categoria** sotto la foto grande =
apre `FoglioCategoria` (§5.41) per correggerla · lo scorrimento orizzontale della fascia è nativo, nessun
gesto inventato.

🔴 **L'etichetta è un COMANDO anche qui, e la firma del piano non lo prevedeva (C-13).** §5.41 dice che la
categoria si corregge «dal visore **o dall'album**» (**D70**), ma la firma di `CartaAlbum` nel piano non ha
nessuna prop per aprire quel foglio. ➡️ Serve `onCorreggiCategoria(indice: number)` — e con essa l'etichetta
prende **min-height 44** e un nome accessibile proprio, come nel visore (v. §5.39, B-5). Il mandato di T6 va
corretto: v. §7, riga **F-10**.

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
spedisce senza questa mappa**. **`Tab`:** `CartaAlbum` **non è uno strato** — non fa e non deve fare nessuna
trappola del focus; è contenuto di pagina e il `Tab` la attraversa come qualunque altra carta. È l'unica
delle cinque sezioni in cui la risposta è «niente», ed è scritta apposta perché §1.6 impone che **ognuna**
dichiari la sua.

**Sicurezza (G5 · D75).** L'indirizzo firmato entra solo come `src`; nessun `title`, `href`, `download`,
appunti o callback. **Con la prova prescritta in §1.11 dell'allegato** (la sentinella cercata in tutto
l'HTML reso, più la metà speculare sulle callback): senza, è l'unica regola del documento che si può violare
restando verdi ovunque.

**Fonte di verità visiva:** `docs/design/mockups/2026-07-30-album-visore-categoria.html`, colonna **A1**
(classi `.carta`, `.capo-carta`, `.hero`, `.meta-foto`, `.gruppi`, `.gr-et`, `.th60`), + il tablet di §6 del
mockup. **Anatomia e vincoli per esteso:** `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md`.

---

### 5.39 `VisoreFoto` (🆕 emendamento 30/07/2026, ondata (b) — D64 · D66 · D69 · D77)
Il visore a tutto schermo, variante **V1** (**D77**): **i controlli stanno sempre in vista**. È il **primo**
dei tre strati sopra la pagina.

**Anatomia.** Velo pieno `sopraFoto.velo` · **la foto centrata, alla sorgente e senza degradarla**
(`objectFit: 'contain'`, nessun ridimensionamento né ricompressione in vista — **vincolo di D66**: la fedeltà
del colore è uno dei motivi per cui quelle foto esistono) · **capo** con il tondo ✕ a sinistra, al centro
**la pastiglia della categoria** (etichetta + contatore «1 di 6» **dentro una sola pastiglia con faccia** —
v. sotto), il tondo ⋯ a destra · **piede** con la fascia delle altre foto e, sotto, **il posto riservato alla
barra dell'editor** (D66: previsto e **vuoto**, tratteggiato — è la ragione per cui questa forma è stata
scelta invece della sola carta).

**Misure.** Tondi ✕ e ⋯ **44×44**, `raggio.pill` · **pastiglia della categoria: min-height 44**,
`raggio.pill`, faccia `sopraFoto.faccia`, confine `sopraFoto.confine`, padding orizzontale `spazio.sm`,
dentro l'etichetta `callout` 15.5/700 `testoSuFaccia` e il contatore **12.5/700** `testoSuFaccia` tabulare
(🛑 **12.5, non 12, e senza opacità**) · miniature della fascia **44×44**, `raggio.riga - 6` (= 12),
`gap spazio.s - 2`, spente a `sopraFoto.miniaturaSpenta` (0.48) · posto dell'editor H 52, `raggio.riga` (18),
bordo tratteggiato 1.5 `sopraFoto.tratteggio` · su **desktop la foto NON si stira**: resta al suo rapporto,
centrata sul velo (stirarla vorrebbe dire deformarla o ritagliarla, e **D66 lo vieta**).

**🔴 Il contrasto NON si appoggia alla sfumatura.** Le due sfumature restano (`sopraFoto.sfumaturaAlto`,
`sopraFoto.sfumaturaBasso`) come raccordo, ma **ogni elemento porta la propria faccia**
(`sopraFoto.faccia`) **e il proprio confine** (`sopraFoto.confine`, anello interno bianco al 22%). Ragione,
misurata: su una foto **chiara** la sfumatura al centro della fascia vale ~30% di nero, e il testo bianco ci
sta sopra a **~2,1:1** — sotto AA di tre volte; su una foto **scura** (una radiografia) la sfumatura sparisce
e con lei il **confine** dei controlli. Faccia e anello chiudono i due casi insieme e rendono il contrasto
**indipendente dalla fotografia**. ➡️ **La prova si fa su DUE casi, non su uno: una radiografia e una guida
colore sovraesposta.**

> 🛑 **La pastiglia nasce da un difetto di applicazione trovato dal panel (B-4), e vale la pena inciderlo.**
> La stesura precedente lasciava etichetta e contatore **nudi sulla sfumatura** e dichiarava che passando da
> opacità .78 a piena si saliva da ~4,2:1 a ~5,7:1. `provato:` sul mockup —
> `docs/design/mockups/2026-07-30-album-visore-categoria.html:118-120` — `.vis-capo .mezzo` **non ha nessun
> `background`**: quei numeri valgono per un testo con una faccia scura sotto, che lì non c'era. Il valore
> vero è **~2,1:1**, ed è **lo stesso documento** a scriverlo quattro righe più giù. Le due righe non
> potevano essere vere insieme. ✅ **La regola di G-9 era giusta: era l'applicazione a saltare proprio i due
> elementi che voleva difendere.** A opacità piena, senza faccia, **non arriva in soglia comunque.**
>
> 🔑 **E la pastiglia chiude un secondo bloccante insieme al primo (B-5): l'etichetta è un COMANDO** — toccarla
> apre `FoglioCategoria` per correggere la categoria (**D70**) — e nella stesura precedente non aveva **né
> altezza minima** (due righi da 15.5 e 12.5 fanno ~38-40 px, **sotto i 44** di §4.2 e §10) **né nome
> accessibile**: gli `aria-label` erano dichiarati **solo per i due tondi**, quindi chi usa un lettore di
> schermo sentiva «Impronta» e non sapeva che si può toccare. La pastiglia porta con sé i 44 e il nome.

**Stati.** *default* · *pressed*: i tondi e la pastiglia scendono di 2 px con `molla.press` · *disabled*: il
tondo ⋯ è disabilitato quando il chiamante non passa `azioni` · *focus-visible*: anello 2px `var(--blue)`
offset 2 · **miniatura scelta**: opacità piena **+ anello 2px `testoSuFaccia` + `aria-current="true"`** ·
**⋯ mentre la tendina è aperta**: faccia `sopraFoto.facciaAttiva` **+ `aria-expanded="true"`**.

🛑 **Il ⋯ «acceso» non può essere SOLO colore (C-6).** Su una radiografia la differenza fra
`sopraFoto.faccia` e `sopraFoto.facciaAttiva` vale **1,02:1**, cioè è invisibile — e §1.12 vieta il colore
come unica fonte di stato. La seconda fonte è **`aria-expanded`** sull'innesco, che è anche il modo giusto:
insieme a **`aria-haspopup="menu"`** dice a un lettore di schermo *che cosa* quel tondo apre, cosa che oggi
nessuna delle due stesure diceva.

**La fascia oltre le sei foto (C-8).** A 390 nella fascia ce ne stanno **sei**; con dodici — normale per un
lavoro con più impronte — **la fascia SCORRE in orizzontale** e le miniature **restano 44×44**. 🛑 Mai
rimpicciolirle per farcele stare: sotto i 44 si perde il bersaglio minimo di §4.2, ed è la scorciatoia che
un implementatore prende da solo se la sezione non dice niente. §5.38 lo dichiarava per la carta, questa no.

**Semantica dei gesti.** *swipe orizzontale* o *tap su una miniatura* = cambia foto (chiama `onIndice`) ·
*tap su ✕*, *tap sul velo fuori dalla foto*, *Escape*, *«indietro»* = chiude · *tap sull'etichetta della
categoria* = apre `FoglioCategoria` (§5.41) per correggerla (**D70**) · *tap su ⋯* = apre `TendinaMenu`
(§5.40).

**Strato.** z-index **1010** (D83) · portale su `document.body` · `entraOverlay('uaSheet', …)` /
`esciOverlay(token)` con dipendenza **solo `aperto`** · **blocca lo scorrimento con `bloccaScorrimento()`**
(`src/components/ds/blocca-scorrimento.ts`), come **tutti** gli altri strati — modello d'uso
`src/components/ds/Sheet.tsx:304-306` (prende il posto) e `:267-311` (lo rilascia). 🛑 **Il pannello dichiara
`overflowY: 'auto'`**, o l'`overscrollBehavior: 'contain'` è inerte (§1.4, C-1).

**🔑 `azioni` accetta SOLO l'innesco** (il tondo ⋯), **mai la tendina né un foglio**: i quattro strati si
montano **fratelli**, o l'`Escape` del più alto arriverebbe anche a questo (§1.5 dell'allegato).

**Movimento.** Entra e esce con `molla.smooth` (**scelta dichiarata**: nessuna delle otto coreografie di
§8.3 è per un overlay a tutto schermo) — velo in dissolvenza, foto `scale` 0.98→1. Lo sfogliare è una `x`
con la stessa molla.

**Suono e vibrazione.** **Nessun suono** (apertura, sfogliata e chiusura sono sola lettura, §9.2). Sfogliare
→ **`vibra('selection')`**; chiudere → `vibra('light')`.

**«Riduci movimento».** `x`, `scale` e `opacity` **restano nel bersaglio** e arrivano con `istantaneo`
(§1.9 dell'allegato). Niente resta fuori schermo.

**Accessibilità.** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sulla pastiglia della categoria ·
`tabIndex={-1}` sul pannello, **focus al pannello** all'apertura e **ritorno all'àncora dichiarata**
(§1.6, C-12) alla chiusura · **`Tab` TRATTENUTO dentro il pannello** con `trappola-focus.ts` (§1.6, **D85**):
senza, si esce e si atterra su `SkipToContent.tsx:12`, e da lì `Escape` chiude lo strato sbagliato ·
**`Escape` sul pannello con `stopPropagation()`**, mai su `window` · ← e → sfogliano · il contatore vive in
un `aria-live="polite"`, così il cambio di foto si sente · il ⋯ porta **`aria-haspopup="menu"`** e
**`aria-expanded`** · ogni tondo ha `aria-label` in parole del banco («Chiudi», «Altre cose da fare su
questa foto») · **la pastiglia della categoria è un `<button>`** con nome accessibile proprio («Cambia la
categoria: Impronta»), non un testo (B-5).

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
chiamante. **La voce distruttiva sta IN FONDO** — **rossa, staccata da una linea, con margine extra**,
esattamente come la variante `butta` di §5.34. Il ⋯ resta visibile e **acceso**
(`sopraFoto.facciaAttiva`, **più `aria-expanded="true"`** — §5.39, C-6) mentre la tendina è aperta: si vede
da dove è uscita.

> 🛑 **Una ragione sbagliata è stata TOLTA da qui, e va detto perché (C-5).** La stesura precedente scriveva
> che la voce distruttiva sta in fondo perché il fondo è «più vicino al pollice». **È falso per una tendina**:
> ancorata sotto il ⋯, questo pannello vive nel terzo **alto** dello schermo — il suo fondo sta a ~220 px su
> 844, cioè lontanissimo dal pollice. La posizione in fondo **resta** (è la mitigazione di **D78**: è il punto
> più lontano dal dito che ha appena toccato il ⋯, quindi il più difficile da centrare per sbaglio), e la
> sicurezza la portano **rosso + linea + parola esplicita**. Ma la frase sul pollice **si toglie**: una
> ragione sbagliata incisa in una spec viene ricitata, ed era già servita ad argomentare D82.

**Misure.** Larghezza **260**, `raggio.tasto` (20), faccia `var(--card)` (`var(--elv)` in scuro), ombra
`sopraFoto.ombraPannello` · padding `spazio.s` verticale / `spazio.m` orizzontale · **voci: anatomia di §5.34
verbatim** — min-height **56**, icona Ø38 `raggio.riga - 7` (= 11) tinta neutra, testo `body` 17/700,
separatore 1.5 `var(--line)`; la voce distruttiva ha colore `var(--red)`, icona `var(--red-tint)`/`var(--red)`,
linea sopra e margine extra · distanza dal ⋯: `spazio.m` sotto il capo.

🌑 **L'ombra è una DEROGA DICHIARATA a §3, ratificata come D88 (C-14).** La legge di §3 dice che
l'elevazione è «una superficie più chiara, **MAI un'ombra**; nessuna shadow in dark». 🔑 **Ma quella legge ha
una premessa che qui non c'è:** «più chiaro» funziona perché sotto c'è una superficie d'app di luminanza
nota. Sotto questa tendina c'è una **fotografia qualunque** — una radiografia bianca, una guida colore
sovraesposta — e non esiste nessun «più chiaro» che si stacchi da entrambe. `var(--sh-card)` non serve
comunque: **in scuro vale `none`**. ✅ **Il precedente esiste ed è ratificato con lo stesso argomento:**
`src/design-system/v3/tokens.ts:75` — `TastoPiu` in scuro, «unica ombra esterna: l'alone della ghiera».
Questa è la **seconda**, e il confine è stretto: vale per un pannello **sopra una fotografia**, non per le
carte dell'app.

**Stati.** *default* · *pressed*: la voce si scurisce di un tono, `molla.press` · *disabled*: voce al 60% e
senza chevron (come §5.34) · *focus-visible*: anello 2px `var(--blue)` offset 2 sulla voce.

**Semantica dei gesti.** *tap su una voce* = la sceglie e chiude · *tap fuori* = chiude · *Escape* = chiude e
**il focus torna al ⋯** · *«indietro»* = chiude **solo la tendina**, non il visore · **se un antenato che
scorre si muove, la tendina chiude** — una tendina ancorata non insegue il suo àncora.

⚠️ **Sull'ultimo gesto, la verità invece della formula.** Su **questa** superficie non può accadere: il ⋯
vive nel capo **fisso** del visore, e col blocco dello scorrimento attivo il corpo non si muove. Resta
dichiarato come **rete**, per il giorno in cui la tendina venisse ancorata a qualcosa che scorre davvero —
non come comportamento che qualcuno debba andare a verificare qui, dove non si accenderebbe mai.

**Strato.** z-index **1020** (D83) · portale su `document.body` · `entraOverlay('uaSheet', …)` — **o
«indietro» chiuderebbe il visore invece del menù** · **chiama `bloccaScorrimento()` come tutti gli altri**
(§1.4, **D84**).

🔑 **Perché blocca anche se sotto blocca già il visore, ed è il punto di D84:** il contatore regge due
bloccanti sovrapposti **per costruzione**, quindi la vecchia riga «NON blocca, lo blocca già il visore» non
serve più — ed era peggio di inutile: legava la correttezza di questo componente a **chi c'è sotto**. Un
componente che blocca *a volte* è un componente che **indovina**. Blocca sempre, e chi gli sta sotto non
sono affari suoi.

**Movimento.** `opacity` + `scale` 0.96→1 con `transformOrigin: '100% 0'`, `molla.smooth` (**scelta
dichiarata**).

**Suono e vibrazione.** **Nessun suono**: il ⋯ è un `TastoTondo`, che suona già per conto suo, e §9.2 vieta
più di un suono per gesto. Scelta di una voce → `vibra('light')`.

**«Riduci movimento».** `scale` resta nel bersaglio con `istantaneo`; resta la sola dissolvenza.

**Accessibilità — 🛑 va rifatto da zero ciò che un foglio ha già.** `role="menu"` sul pannello,
`role="menuitem"` su ogni voce · **focus alla prima voce** all'apertura, **ritorno al ⋯** alla chiusura ·
**`Tab` TRATTENUTO dentro il pannello** con `trappola-focus.ts` (§1.6, **D85**) · ↑ e ↓ scorrono le voci,
`Home`/`End` ai capi, **senza avvolgere** · **`Escape` sulla voce con `stopPropagation()`**, mai su `window` ·
il chiamante passa `etichettaAria` del pannello («Altre cose da fare su questa foto»).

⚠️ **Nota per chi collauda: la guardia degli overlay sarà CIECA a questa tendina.**
`scripts/guardia-navigazione-overlay.mjs` conta `.ds-sheet` e `[role="dialog"]`; questo pannello avrà
`role="menu"`. Non è un difetto della guardia — è il confine di ciò che sa, e va saputo **prima** di leggere
un suo verde come una conferma.

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

**Misure.** 🔑 **Il pannello: `width: '100%'`, `maxWidth: 480`** — la stessa geometria di `Sheet`
(`src/components/ds/Sheet.tsx:491-492`), **dichiarata** e non sottintesa · `overflowY: 'auto'` (o
l'`overscrollBehavior: 'contain'` è inerte — §1.4, C-1) · `raggio.sheet` (28) **solo in alto**, 0 in basso ·
faccia `var(--card)` (`var(--elv)` in scuro) · padding `spazio.sm` sopra / `spazio.ml` ai lati e sotto ·
manico 36×4 `raggio.pill` `var(--line)`, `spazio.sm` sotto · anteprima 56×56 `raggio.riga - 6` (= 12) ·
titolo **19/800** · dida **13.5** `var(--muted)` · **pastiglie: griglia a 2 colonne, `gap spazio.s`,
min-height 60, `raggio.riga` (18), faccia `var(--bg-deep)`, padding orizzontale `spazio.sm`, testo 15/700,
due righi ammessi, emoji 18 `aria-hidden`**.

#### 📏 La misura che decide la griglia — **rifatta, perché quella di prima non aveva contenitore** (B-7)
🛑 **I 148,5 px di D79 sono presi dentro la CORNICE DI TELEFONO disegnata nel mockup, non a 390.**
`provato:` mockup `docs/design/mockups/2026-07-30-album-visore-categoria.html` — `.schermo`/`.palco` sono
**342 px** (`:53`, `:109`), il foglio ha **18** di lato (`:138`) e la griglia **9** di spazio (`:158`):
**(342 − 36 − 9) / 2 = 148,5 esatti.** È la larghezza di un disegno, non di un telefono.

**La colonna vera, con la geometria dichiarata sopra e il padding ratificato (S8):**

| viewport | larghezza del pannello | colonna utile |
|---|---|---|
| **390** | 390 (sotto il tetto di 480) | **(390 − 2×20 − 8) / 2 = 171** |
| **768 e oltre** | 480 (il tetto) | **(480 − 2×20 − 8) / 2 = 216** |

➡️ **148,5 non vale a nessun viewport**, ed è **22,5 px più stretta** del vero anche nel caso peggiore.

🔴 **E il `whiteSpace: 'nowrap'` copiato dal mockup è stato TOLTO, perché rompeva un requisito di rilascio.**
La spec impone **text-zoom 200% senza rottura** (§10 p.4). Con `nowrap` l'etichetta non va a capo: **esce e
si taglia**. Al banco, a 200%, «Guida colore» si legge «Guida col…». ➡️ **Due righi ammessi**, `min-height`
60 che li accoglie, e **la prova cambia natura**: non più «misura che non va a capo» — che era la fotografia
di un contenitore inesistente e si sarebbe dovuta rifare a ogni cambio di nome — ma
> **a text-zoom 200%, a 390 e a 768, nessun testo è tagliato e la griglia non si sfalsa.**

È un vincolo **stabile**: regge anche se domani una categoria cambia nome. ⚠️ È una prova di **browser**, non
un'asserzione: la porta il collaudo di T9 (Playwright / `webapp-testing`), non un test unitario.

⚠️ **Il testo resta a 15 px** — è il valore del mockup e D79 l'ha ratificato — **ma la ragione scritta prima
non vale più**: «a 15,5 andava a capo in 148,5» era misurato nel contenitore sbagliato. Con 171 px di
colonna, 15,5 probabilmente ci starebbe. Si tiene 15 perché **il mockup è la fonte di verità visiva**, non
perché una misura lo imponga: v. §5, riga **S11**.

🚧 **Le emoji sono un SEGNAPOSTO dichiarato** (S2 del piano): le icone vere sono un passo suo, fuori da
questa ondata. Non sono lo stato di niente (§4.4: mai emoji come stato) — il senso lo porta il testo.

**Stati.** *default* · *pressed*: la pastiglia scende di 2 px, `molla.press` · *disabled*: non previsto (le
sei ci sono sempre: l'elenco è chiuso) · *focus-visible*: anello 2px `var(--blue)` offset 2 · **scelta**:
faccia invertita `var(--ink)`/`var(--bg)` **+ `aria-pressed="true"`** — non è una differenza di solo colore
ma di luminanza piena, e la semantica la porta l'attributo.

🛑 **ALLO SCATTO NESSUNA pastiglia è scelta, e va detto perché il mockup dice il contrario (C-7).**
`provato:` nelle colonne C1 e C3 il mockup mostra una pastiglia **già accesa** (`.pas.att`, `:504` e `:576`).
Chi lo copiasse pre-selezionerebbe «Impronta» — e si finirebbe con **due valori di default in
contraddizione con D74**: quello vero (`altro`, se l'utente esce senza scegliere) e quello **affermato a
schermo**, che è pure il più sbagliato dei due, perché suggerisce una scelta che nessuno ha fatto. ➡️ Allo
scatto: `scelta = undefined`, nessun `aria-pressed="true"`. La pastiglia accesa del mockup illustra il
**secondo** momento — la correzione dal visore o dall'album — dove una categoria **c'è già**.

**Semantica dei gesti.** *tap su una pastiglia* = sceglie e chiude. 🔑 **Ogni altra uscita — velo, manico,
swipe giù, `Escape`, «indietro» — chiama `onScegli('altro')` e POI `onChiudi()`, mai `onChiudi()` da solo**
(**D74**: la foto deve nascere con una categoria; non è un errore, quindi **niente avviso e niente suono
d'errore**). Lo swipe giù riusa `deveChiudere`, che `src/components/ds/Sheet.tsx:40` **esporta già**: si
importa, non si estrae e non si riscrive.

**Strato.** z-index **1030** (D83) · portale su `document.body` · `entraOverlay('uaSheet', …)` · **chiama
`bloccaScorrimento()`**, in **entrambi** i suoi momenti (§1.4, **D84**). 🔑 **La stesura precedente diceva il
contrario, e la ragione che dava era vera ma è decaduta:** «non blocca perché sopra il visore un secondo
blocco lascerebbe la pagina bloccata per sempre» descriveva un difetto **reale** di `Sheet`, che D84 ha
riparato alla radice. Col contatore, bloccare due volte è sicuro per costruzione — e **cade con essa anche
il costo residuo** che §1.4 dichiarava: allo scatto questo foglio **blocca come gli altri**, e la pagina non
scorre più sotto il velo. Restano comunque le due difese locali: `touchAction: 'none'` sul velo,
`overscrollBehavior: 'contain'` sul pannello **che dichiara `overflowY: 'auto'`**.

**Movimento.** `coreografie.sheetSu` (§8.3 n.6) — **questa esiste già**, non è una scelta nuova.

**Suono e vibrazione.** Scegliere → **`vibra('selection')` e MAI `suona()`** (quattro precedenti in casa,
§1.10 dell'allegato). Chiudere senza scegliere → **niente**: D74 dice che non è un errore.

**«Riduci movimento» — 🛑 e qui NON basta dire «`y` resta nel bersaglio».** `coreografie.sheetSu` porta la
transizione **dentro** la variante (`src/design-system/v3/motion.ts:85-86`), quindi una `transition` passata
come prop non ci arriva: serve la **variante ridotta esplicita** di §1.9. La prova è «**`y` finale = 0 e
nessun tween su `y`**», non «niente resta fuori schermo» (B-6).

**Accessibilità.** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sul titolo + `aria-describedby`
sulla dida · `tabIndex={-1}` sul pannello, **focus al PANNELLO** all'apertura — 🔑 **non alla prima
pastiglia: porterebbe il focus su «Impronta» e suggerirebbe una scelta che l'utente non ha fatto** — e
**ritorno all'àncora dichiarata** (§1.6, C-12) alla chiusura · **`Tab` TRATTENUTO dentro il pannello** con
`trappola-focus.ts` (§1.6, **D85**) · **`Escape` sul pannello con `stopPropagation()`**, mai su `window` ·
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
un'azione distruttiva. Lo swipe giù riusa `deveChiudere` esportata da `src/components/ds/Sheet.tsx:40`
(si importa: non è una modifica di quel file).

**Strato.** z-index **1030** (D83) · portale su `document.body` · `entraOverlay('uaSheet', …)` — o «indietro»
chiuderebbe il visore invece della conferma · **chiama `bloccaScorrimento()`** (§1.4, **D84**) · pannello con
`overflowY: 'auto'` (C-1).

🔧 **Perché NON è uno `Sheet` nudo — la ragione è cambiata, e la vecchia va tolta.** La stesura precedente
diceva: «perché `Sheet` non si difende da un secondo blocco dello scorrimento». **Era vera, e D84 l'ha
riparata**: quel motivo non esiste più. Ne restano **due, entrambi verificabili adesso**:
1. 🔑 **La quota.** `Sheet` ha z-index **1000 cablato** (`src/components/ds/Sheet.tsx:466`), non
   parametrico. Montato sopra il visore, che sta a **1010**, un `Sheet` nudo si dipingerebbe **sotto la
   fotografia**: la conferma sarebbe invisibile.
2. 🔑 **L'àncora del focus (C-12).** `Sheet` cattura `document.activeElement` al montaggio
   (`src/components/ds/Sheet.tsx:314-322`). Chi apre **questa** conferma è **una voce di menù che sta
   smontando**: si catturerebbe un nodo staccato, il focus finirebbe sul `body`, e da lì — per la regola di
   §1.5 — **`Escape` sarebbe morto proprio sulla superficie distruttiva**. Serve un'àncora **dichiarata dal
   chiamante**, e `Sheet` non ha la prop per riceverla.

**Movimento.** `coreografie.sheetSu` (§8.3 n.6).

**Suono e vibrazione.** **Nessuno, mai, chiamato da questo componente**: i due tasti suonano e vibrano per
conto proprio, e §9.2 vieta più di un suono per gesto. 🛑 **Non esiste un suono per la distruzione riuscita
e non se ne inventa uno**: l'esito lo dice l'`Avviso` (§5.18) che mostra il chiamante.

⚠️ **Un limite dichiarato, e non è di questo componente (C-10).** La regola sopra è rispettata, ma la catena
vera finisce in `src/components/ds/Avviso.tsx:81-91`, dove **solo l'errore** suona e vibra: l'avviso della
riuscita è **muto**. Al banco, col guanto, l'unica conferma che la foto è sparita è **un cartellino che
compare e sparisce**. Non si corregge qui — è un file condiviso, fuori mandato per R-E2: **riferito in §8,
riga FM-8**.

**«Riduci movimento» — come §5.41: la variante ridotta esplicita di §1.9**, non basta dire «`y` resta nel
bersaglio». La prova è «**`y` finale = 0 e nessun tween su `y`**» (B-6).

**Accessibilità.** `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sul titolo + `aria-describedby`
sul testo · `tabIndex={-1}` sul pannello · **focus alla PRIMA azione, che è quella SICURA** («Annulla») —
con l'ordine di §5.17 le due cose coincidono, e un Invio dato a caso **annulla**, non cancella · **`Tab`
TRATTENUTO dentro il pannello** con `trappola-focus.ts` (§1.6, **D85**) — e qui non è un dettaglio: senza,
il `Tab` porta fuori da una superficie **distruttiva** · **ritorno all'ÀNCORA DICHIARATA dal chiamante**
(§1.6, C-12), **non** a `document.activeElement` catturato al montaggio: chi apre questa conferma è una voce
di menù che sta smontando · **`Escape` sul pannello con `stopPropagation()`**, mai su `window`.

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

## 4. I NOVE valori nuovi in `src/design-system/v3/tokens.ts` — senza, i componenti non passano il pre-commit

🔧 **Erano dichiarati «sette» e sono NOVE (C-2).** `provato:` contate le chiavi del blocco qui sotto —
`velo · sfumaturaAlto · sfumaturaBasso · faccia · facciaAttiva · confine · ombraPannello · tratteggio ·
miniaturaSpenta`. Un conteggio sbagliato in testa a un elenco è il modo classico per lasciarne fuori uno.

🔴 **E li porta T6, non T7 (C-3).** `CartaAlbum` usa **già** `sopraFoto.faccia` per la pastiglia «⤢ Apri»
(§5.38), e **T6 gira prima di T7**: eseguito alla lettera, l'esecutore di T6 scriverebbe un colore inline e
il controllo pre-commit lo **blocca**. Il gruppo nasce in T6.

🛑 **Non è una comodità: è un obbligo del controllo.** `scripts/check-ds-compliance.sh` §4a greppa
`#[0-9A-Fa-f]{6}` e `rgba?(` su `src/components/ds` + `src/design-system/v3`. ⚠️ **Due frasi della stesura
precedente erano false, e vanno corrette perché descrivono la RETE:**
- «l'**unica** esclusione è `v3/tokens.ts`» → `provato:` `scripts/check-ds-compliance.sh:57` esclude anche
  `node_modules` **e i file `.test.`**. Un colore inline dentro un test **non viene visto**;
- il controllo greppa **testo**, quindi vede i colori — ma `miniaturaSpenta` è **un numero** (0.48):
  **nessun grep lo intercetterebbe mai.** Sta nel gruppo per coerenza di lettura, non perché una guardia lo
  imponga. ⚠️ Il controllo dei colori ha comunque **sei buchi misurati**, fra cui l'esadecimale a **otto**
  cifre e `color-mix()`: è una rete, non una prova.

Ogni `rgba` che serve al visore o alla tendina **deve** comunque nascere lì.

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
  /** Il ⋯ mentre la tendina è aperta: si vede da dove è uscita.
   *  🛑 NON è l'unica fonte di quello stato: su una radiografia la differenza
   *  con `faccia` vale 1,02:1, cioè è invisibile. La seconda fonte, che è
   *  anche quella giusta, è `aria-expanded` sull'innesco (§5.39, C-6). */
  facciaAttiva: 'rgba(9,7,5,.8)',
  /** Il CONFINE del controllo sulla foto scura, dove la faccia scura da sola
   *  non si stacca. Anello interno, non un bordo che sposta la geometria. */
  confine: 'inset 0 0 0 1px rgba(255,255,255,.22)',
  /** Ombra del pannello della tendina. NON `var(--sh-card)`: in scuro vale
   *  `none`, e un pannello che galleggia su una foto deve staccarsi in
   *  entrambi i temi.
   *  🌑 DEROGA DICHIARATA a §3 («in scuro nessuna ombra»), ratificata come D88:
   *  quella legge presuppone una superficie d'app di luminanza nota da cui
   *  affiorare, e sotto una fotografia qualunque quella superficie non c'è.
   *  Seconda eccezione del sistema; la prima e' l'alone della ghiera di
   *  `TastoPiu` (v. il commento a `tastoPiu`, sopra). Confine stretto: vale
   *  per un pannello SOPRA UNA FOTOGRAFIA, non per le carte dell'app. */
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
| **S1** 🔧 | etichetta e contatore del visore **nudi sulla sfumatura**, contatore **12 px opacità .78** (`.vis-capo .mezzo`, `.n`) | **una PASTIGLIA** con `sopraFoto.faccia` + `sopraFoto.confine`, `raggio.pill`, **min-height 44**, dentro etichetta 15.5/700 e contatore **12.5/700 a opacità piena** | 🛑 **Riga riscritta il 30/07 dopo il bloccante B-4: i numeri di prima erano calcolati sull'elemento sbagliato.** Diceva «da ~4,2:1 a ~5,7:1 con l'opacità piena», ma quei valori valgono per un testo **con una faccia scura sotto**. `provato:` mockup `:118-120` — `.vis-capo .mezzo` **non ha nessun `background`**: il valore vero è **~2,1:1**, e **a opacità piena non arriva in soglia comunque**. Restano veri i due difetti originali (12 px è sotto il minimo di §4.1; l'opacità .78 peggiora), ma **la cura non era l'opacità: è la faccia**. ✅ E con la pastiglia arrivano i **44 px** e il **nome accessibile** che B-5 chiedeva, perché quell'etichetta **è un comando** (D70) |
| **S2** | tondi ✕ e ⋯ con faccia **chiara** (`rgba(255,255,255,.14)`) | faccia **scura** `sopraFoto.faccia` + anello `sopraFoto.confine` | Su una foto **chiara** un disco bianco al 14% con un glifo bianco **sparisce**. La faccia scura regge su chiaro **e** su scuro; l'anello dà il confine dove la faccia scura si confonde con una radiografia. 🔑 **Il mockup usa già la faccia scura** per la pastiglia «⤢ Apri» della carta: qui si rende coerente con la sua metà migliore |
| **S3** 🔧 | conferma con **«Elimina foto» SOPRA e «Annulla» sotto** | **«Annulla» sopra, «Elimina foto» sotto** (ordine di §5.17) | ✅ **Non è più una deduzione: è D82.** 🛑 **Ma l'argomento con cui era stata scritta è stato TOLTO (C-5).** Diceva: «D78 mette la voce distruttiva in fondo perché il fondo è la zona del pollice, quindi due grammatiche opposte». **La premessa è falsa:** una tendina ancorata sotto il ⋯ vive nel terzo **alto** dello schermo, il suo fondo sta a ~220 px su 844 — **non** la zona del pollice. ✅ **La conclusione regge lo stesso, su una ragione più semplice e verificabile:** `DialogConferma` usa già sicura-sopra/distruttiva-sotto (`src/components/ds/DialogConferma.tsx:111-112`), quindi **le due forme della conferma si leggono uguali e cambia solo il contenitore**. E il focus va alla prima azione, **che così è quella sicura**: un Invio dato a caso annulla |
| **S4** | foglio con `border-radius: 28px 28px 18px 18px` · visore con `border-radius: 22px` | fogli **28 in alto, 0 in basso** · visore **0** | Sono artefatti della **cornice di telefono disegnata dentro il mockup**, non misure di prodotto: un foglio vero è ancorato al fondo (`src/components/ds/Sheet.tsx:498-499`) |
| **S5** | voci della tendina a **50 px**, icona 32, testo 15.5 | **56 px, icona 38, testo 17** (anatomia di §5.34 verbatim) | Una voce che **cancella davvero** (D61) non si rimpicciolisce per far stare la tendina. E una seconda serie di misure per la stessa cosa è il modo di avere due menù invece di uno |
| **S6** | miniature della fascia del visore a **9 px** di raggio | **12** (`raggio.riga - 6`), come tutte le altre miniature | Un nome per una cosa. 3 px su una tessera da 44 non cambiano la lettura, due raggi diversi per due miniature sì |
| **S7** | «La scelta vale **per tutte e tre**» | «La scelta vale **per tutte e {quante}**» | Un componente non sa scrivere in lettere un numero qualunque, e inventare una tabella di numeri-parola è lavoro fuori perimetro |
| **S8** | padding dei fogli **10/18/18**, manico **40×4** | **12/20/20**, manico **36×4** | La griglia di §4.2 ammette 8/12/16/20 (10 e 14 **solo** sotto i 700 px di altezza) e §5.16 fissa il manico a 36×4. Il bilancio verticale di **D79** cambia di **4 px** a 390: le sei pastiglie e l'anteprima restano dove D79 le ha ratificate |
| **S9** | dida della **conferma** a 13.5 | **15.5** (`callout`) | È il testo che dice che la foto **non torna più**. È lo stesso ruolo che in `DialogConferma` vale 15.5 (`src/components/ds/DialogConferma.tsx:219`): le due forme devono **leggersi uguali**. ⚠️ La dida del **foglio categoria** resta **13.5** come il mockup: lì il bilancio verticale è ratificato da D79 |
| **S10** 🆕 | etichetta di gruppo della carta a **11 px** (`.gr-et`, mockup `:96`) | **12,5** | **D87.** 11 è **sotto il minimo assoluto** di §4.1 — lo stesso minimo che S1, quattro righe più su, invoca per bocciare il contatore del visore. **Stesso difetto, accettato in silenzio in un punto e respinto nell'altro**, e per giunta su un testo maiuscolo, spaziato di 0,1em, nel colore più debole (`var(--faint)`): il più difficile che ci sia. Costo: la fascia dei gruppi cresce di 1,5 px, dentro i ~17 già messi a bilancio da D76 |
| **S11** 🆕 | testo delle pastiglie a **15 px** — che **resta** | **15 px**, ma la RAGIONE cambia | 🔧 **Lo scostamento qui non è nel valore, è nella sua giustificazione (B-7).** Prima si scriveva «15 perché a 15,5 «Guida colore» va a capo in 148,5 px». **Quella misura è nulla:** i 148,5 sono presi dentro la cornice di telefono del mockup (342 px), non a 390 — la colonna vera è **171** (v. §2, §5.41). Con 171, 15,5 probabilmente ci starebbe. ➡️ **Si tiene 15 perché il mockup è la fonte di verità visiva e D79 l'ha ratificato**, non perché una misura lo imponga. Un valore giusto con una ragione falsa è **peggio** di un valore discutibile con una ragione vera: la ragione falsa viene ricitata |
| **S12** 🆕 | pastiglie con `white-space: nowrap` (mockup `:160`) | **niente `nowrap`, due righi ammessi, `min-height` 60** | 🔴 **Rompeva un requisito di RILASCIO, non un'estetica** (B-7): §10 p.4 impone **text-zoom 200% senza rottura**, e con `nowrap` l'etichetta non va a capo — **esce e si taglia**. Al banco, a 200%, «Guida colore» si legge «Guida col…». ➡️ La prova diventa **«a 200%, a 390 e a 768, nessun testo è tagliato»**: un vincolo **stabile**, che regge anche se una categoria cambia nome — invece della fotografia di un contenitore che non esiste |

🔎 **Restano fedeli al mockup, e sono le misure che qualcuno sarebbe tentato di «sistemare»:** il testo delle
pastiglie a **15 px** (v. **S11** per la ragione vera — quella scritta prima era misurata nel contenitore
sbagliato) · i titoli dei fogli a **19/800** e la dida del foglio categoria a **13.5** (fuori dalla scala
«chiusa» di §4.1, ma con tre precedenti ratificati — §5.19, §5.22, §5.30) · la foto grande a **4/3** e le
pastiglie a **60**.

---

## 6. Che cosa ho dovuto ASSUMERE — dichiarato, non nascosto

🛑 **R-P1, fail-closed:** quello che segue **non porta il marchio `provato:`**. Ogni riga dice **con quale
comando o quale prova** si chiude, e **chi** la chiude.

| # | assunzione | come si chiude, e chi |
|---|---|---|
| **A-1** ✅ | 🔴 **Era la più importante — NON è più un'assunzione.** Che `event.stopPropagation()` dentro un `onKeyDown` di React impedisca all'evento nativo di arrivare a un ascoltatore su `window`. `provato:` letto alla fonte e **riverificato dal coordinatore** in `node_modules/react-dom/cjs/react-dom-client.development.js:3394-3397` (lo `stopPropagation()` del sintetico chiama quello **nativo**) e `:12907-12911` (`case 4`, il portale, chiama `listenToAllSupportedEvents(containerInfo)`: gli ascoltatori stanno sul **contenitore del portale**, sotto `window` nella risalita) | ⚠️ **Il confine, che la verifica NON copre: vale per la fase di BOLLA.** Un ascoltatore in **cattura** su `window` passerebbe. `provato:` oggi nessuno dei **nove** lo fa. 🚦 **E se la prova di comportamento di T7 fallisse lo stesso, l'esecutore si ferma e riferisce: il ripiego FM-2 lo decide il COORDINATORE** (**D86**) |
| **A-2** ⬇️ | ~~Che **nessuno `Sheet` o `DialogConferma` resti aperto SOTTO il visore**~~ ✅ **NON È PIÙ PORTANTE (D83).** Reggeva lo stare sotto z-index 1000; a **1010-1030** il visore copre per costruzione. 🔑 **E l'invariante vera era più larga di come questa riga la scriveva:** `FoglioCategoria` **allo scatto non passa mai dal visore**, quindi il caso più frequente della funzione non era nemmeno coperto dalla frase | **Chiusa.** Si tiene a verbale perché la sua caduta è il guadagno di D83, non un dettaglio |
| **A-3** | Che **`FoglioCategoria` sia anche il terzo strato**, aperto da «Cambia categoria» della tendina. Lo dicono la spec dell'album §4.1 e §5.4 (l'etichetta del visore è toccabile per correggerla) e la voce nel mockup, **non** il piano | **Ratifica di questo gate.** Se il gate dice che dalla tendina la categoria NON si corregge, §5.41 perde metà delle sue regole di strato |
| **A-4** ⚠️ | Che i numeri di contrasto di §5 (S1, S2) siano **calcolati a mano** dai valori dichiarati nel mockup, su una foto ipotetica **completamente bianca**. Non sono una misura su uno screenshot reso. 🛑 **E il panel ne ha già trovato uno sbagliato non per il calcolo ma per l'ELEMENTO** (B-4): i ~4,2 di S1 erano calcolati su un testo con una faccia sotto, che nel disegno non c'era. **Quando un numero a mano sbaglia, di solito sbaglia così** — non nell'aritmetica, nell'oggetto | **T7 e il gate estetico L2 (FASE 9b):** si misura sul reso, su **due** foto vere — una radiografia e una guida colore sovraesposta. 🔑 **Prima di rifare un conto, si verifica su QUALE elemento cade il testo.** I valori possono essere ritoccati; **la regola** («il contrasto non dipende dalla sfumatura») resta |
| **A-5** 🔧 | ~~Che «Guida colore» rientri a **15 px** in **148,5 px**~~ 🛑 **CADUTA (B-7): i 148,5 sono la larghezza di un DISEGNO, non di un telefono** — `provato:` mockup `:53` (schermo 342), `:138` (18 di lato), `:158` (9 di spazio) → (342−36−9)/2 = 148,5. La colonna vera è **171 a 390** e **216 da 768** | **Sostituita.** La prova di T9 non misura più «non va a capo» ma **«a text-zoom 200% nessun testo è tagliato»** — un vincolo stabile invece della fotografia di un contenitore inesistente. È una prova di **browser** (Playwright / `webapp-testing`), non un'asserzione |
| **A-6** | Che **260 px** bastino alla tendina con l'anatomia di §5.34 (voce 56, icona 38, testo 17). Il mockup ne usa 236 con misure più piccole | **T8**, a 390: se «Cambia categoria» va a capo, si allarga |
| **A-7** | Che l'anteprima dello scatto multiplo mostri **fino a tre** miniature e poi solo «{n} foto» (è quel che fa il mockup, C3) | **T9** |
| **A-8** | Che `sopraFoto.facciaAttiva` (il ⋯ acceso) sia la **stessa faccia più densa** e non una faccia chiara: il mockup usa `rgba(255,255,255,.34)`, che è coerente con la faccia chiara **scartata** in S2 | **T7/T8**, sulla foto chiara |
| **A-9** | Che il divieto di **D66** («la foto non si degrada») valga per **il visore**, dove la foto si guarda, e non per l'**anteprima** della carta, che ritaglia (`objectFit: 'cover'`) per tenere il rapporto 4/3 | **Ratifica di questo gate** |

---

## 7. Dove il piano o la spec sbagliano — R-E2, riferito e non corretto di nascosto

| # | dove | che cosa non torna |
|---|---|---|
| **F-1** | 🔴 **Piano, blocco C.** Il piano tratta come **terzo strato solo la conferma** (T9-bis). Ma «Cambia categoria» della tendina apre **`FoglioCategoria` nello stesso identico posto della pila**: T9 non dice **niente** su `storia-overlay`, sul portale, sullo z-index né sul blocco dello scorrimento — cioè, eseguito alla lettera, **T9 produce il difetto che T9-bis esiste per evitare** | §5.41 lo copre; **il mandato di T9 va aggiornato** |
| **F-2** | 🔴 **Spec v3 §4.2** — «Raggi: … **Nessun altro raggio**». **Il codice ratificato la contraddice già due volte**: `src/components/ds/DialogConferma.tsx:240` usa `raggio.riga - 6` (= **12**) e `src/components/ds/MenuVoce.tsx:59` usa `raggio.riga - 7` (= **11**, ed è il raggio che §5.34 **prescrive**) | O §4.2 accoglie il raggio piccolo, o due componenti in vigore sono fuori legge. **Non è roba di questo gate**: qui si è scelto l'idioma già in casa (§1.7) |
| **F-3** | 🔴 **Spec v3 §4.1** — «Scala (fissa, **nessun'altra dimensione ammessa**)». Contraddetta da §5.19 (13.5), §5.22 (14), §5.30 (14), §5.28 (16) e da `src/components/ds/DialogConferma.tsx:219,226,236` (15.5 · 16.5 · 14) | La scala è **di fatto aperta**. Va detto, o ogni sezione nuova rilitiga lo stesso punto |
| **F-4** | 🟡 **D77** dice «il contrasto dei controlli si prova **sulla foto più scura**, non su quella media». **Misurato, il caso peggiore per il TESTO è quello CHIARO** (§5, riga S1): sulla foto scura la sfumatura nera sopra il nero dà contrasto **massimo**. La foto scura è il caso peggiore per un'**altra** cosa — il **confine** dei controlli | Presa alla lettera, quell'istruzione **lascia passare il difetto vero**. Servono **due** casi, ed è quel che §5.39 prescrive |
| **F-5** | 🟡 **Spec v3 §5.33**, ultima riga: «le §5.x dei **quattro** componenti nuovi». Con **D80** sono **cinque** | Corretto dal testo di §3.3 |
| **F-6** | 🟡 **Piano, T8.** Pretende `getAllByRole('menuitem')`, ma `src/components/ds/MenuVoce.tsx` **non sa dire `role="menuitem"`** (rende un `<button>` nudo) e mostra sempre il chevron. Quindi la tendina **non può riusarlo** senza modificarlo — e `MenuVoce.tsx` **non è nell'elenco dei file** del piano | §5.40 fa rendere alla tendina le proprie voci, **copiando l'anatomia di §5.34 verbatim**. La via alternativa è in §8, riga FM-6 |
| **F-7** | 🟡 **Piano, T9-bis Passo 1:** «focus alla **prima azione**». Con l'ordine di §5.17 la prima azione **è** quella sicura, quindi oggi coincidono — ma la frase prescrive una **posizione**, non una **proprietà**: se un domani l'ordine si invertisse, quella riga manderebbe il focus sul tasto che cancella | §5.42 dice «alla prima azione, **che è quella sicura**». La riga del piano va detta così |
| **F-8** 🔧 | ~~🟡 **Piano, T7:** il visore deve difendersi dalla propria rientranza~~ 🛑 **DECADUTA con D84.** Il ripiego per istanza non serve più: il posto nel contatore lo prende `bloccaScorrimento()`, e `Sheet` mostra come si tiene **un solo posto per istanza** (`src/components/ds/Sheet.tsx:304-306`, `if (!sbloccaScorrimentoRef.current)`) | **La riga del mandato di T7 cambia contenuto, non sparisce:** «usa `bloccaScorrimento()` e tiene **un solo posto per istanza**», più il pannello con `overflowY: 'auto'` (C-1) |
| **F-9** | 🟡 **Mockup e spec dell'album §12** — la voce «**Salva** sul telefono». «salva» è **vietata** dal dizionario (`src/design-system/v3/dizionario.ts`, che propone «Fatto ✓»). Non blocca il commit (il controllo greppa solo `src/components/ds/`, e l'etichetta è una **prop del chiamante**), ma è contro la regola | Precedente in casa: l'**eccezione ratificata il 26/07** per «Salva il nome»/«Salva il colore». Serve la stessa decisione esplicita, e non è di questo gate: v. §8, riga FM-4 |
| **F-10** 🆕 | 🔴 **Piano — TRE firme non reggono l'anatomia prescritta (C-13).** ① `VisoreFoto` **non ha nessuna prop per aprire il foglio della categoria**, che §5.39 prescrive (**D70**) · ② `CartaAlbum` **nemmeno**, e §5.41 dice che la categoria si corregge «dal visore **o dall'album**» · ③ `FoglioConferma` non ha **né l'anteprima dell'oggetto né l'etichetta sicura**, che §5.42 impone | Servono `onCorreggiCategoria` su **entrambi** i primi due, e sul terzo l'anteprima + `etichettaSicura`. **I mandati di T6, T7 e T9-bis vanno aggiornati** |
| **F-11** 🆕 | 🔴 **Piano, T7 — la citazione del modello manda a riprodurre un bug già pagato (C-11).** Il piano dice «modello `Sheet.tsx:241-264`», un intervallo che **non contiene** né la sentinella `montatoRef` né lo sblocco differito | ⚠️ **E dopo T5-bis quei numeri non esistono più:** l'intervallo giusto oggi è **`src/components/ds/Sheet.tsx:267-311`** (rilascio + sentinella + presa del posto). Il mandato di T7 va riscritto con questo |
| **F-12** 🆕 | 🔴 **Piano, T9-bis — l'àncora del focus (C-12).** Il piano non dice **da dove** torna il focus. Copiando il modello di `Sheet` (`:314-322`, `document.activeElement` catturato al montaggio) si cattura **un nodo staccato**: chi apre la conferma è **una voce di menù che sta smontando** | Il focus finirebbe sul `body`, e da lì — regola di §1.5 — **`Escape` è morto sulla superficie distruttiva**. §5.42 e §1.6 prescrivono l'**àncora dichiarata dal chiamante**; il mandato di T9-bis lo dica |
| **F-13** 🆕 | 🟡 **Undici citazioni a `Sheet.tsx` nel piano e in questo documento erano SCADUTE.** Il panel è stato scritto **prima** di T5-bis, che ha riscritto il file (oggi **526** righe) | Corrette qui il 30/07. ⚠️ **Chi scrive un mandato ricontrolla i numeri di riga**: un intervallo citato è un puntatore, e un puntatore vecchio manda a leggere un'altra cosa **senza fare rumore** |

---

## 8. Fuori mandato — R-E2: riferito, non fatto

| # | che cosa | perché non l'ho fatto |
|---|---|---|
| **FM-1** ✅ | 🛑 **FATTA il 30/07 — non è più una proposta: è D84, ed è in casa.** `src/components/ds/blocca-scorrimento.ts` + `Sheet` e `NuovoOrdineSheet` migrati (`c268b54b` · `47e77069` · `daeb0efc`), più la riparazione del rilascio allo smontaggio (`636c10b4`). ⚠️ **Gli attori erano DUE, non uno**, e la riga qui sotto ne nominava uno solo. 🔑 **E una premessa è stata falsificata durante l'esecuzione, scritta perché non venga ri-scoperta:** il posto nel contatore **non restava occupato per sempre** — `framer-motion` risolve la promise dell'uscita **anche a componente smontato** e il rilascio arrivava a **+2 ms**. La riparazione vale lo stesso perché **ritira due invarianti che nessuna guardia può verificare** (l'ordine delle cleanup di React, e il comportamento della promise di `framer-motion`). ⬇️ *Testo originale della proposta, tenuto per storia:* |
| **FM-1** *(orig.)* | 🔴 **La riparazione VERA del blocco dello scorrimento:** un modulo a **contatore** (`blocca()`/`sblocca()` con un conteggio e un solo valore precedente salvato al primo blocco), di cui **anche `Sheet` sia un utente**. Chiuderebbe il difetto per **tutta** l'applicazione, e farebbe cadere il costo residuo dichiarato in §1.4 | **Tocca `src/components/ds/Sheet.tsx`**, che non è nel mandato di T5 né in quello di T6-T9-bis. **Proposta, non decisa** |
| **FM-2** 🚦 | 🔴 **La riparazione VERA di P18 (`Escape`):** mediarlo con la stessa pila LIFO che già media il tasto «indietro», dentro `src/components/ds/storia-overlay.ts`. Chiuderebbe il difetto anche per `Sheet` e `DialogConferma`, non solo per questa superficie — ed è **l'unica via** se **A-1** cade | ✅ **D86 ha dato al bivio un proprietario, che era ciò che mancava (B-2):** A-1 è **provata**, quindi con ogni probabilità non serve; **se la prova di comportamento di T7 fallisse, l'esecutore SI FERMA e riferisce — decide il coordinatore.** Resta fuori dal mandato degli esecutori (modulo condiviso, R-E2) |
| **FM-3** | Il `preventDefault()` sul `pointerdown` del velo (§1.5 punto 4) starebbe bene dentro `src/components/ds/useTapScrim.ts`, accanto agli altri due handler | **È un file condiviso.** Nei componenti nuovi si scrive **accanto** alla coppia dell'hook, non dentro l'hook. Se il gate preferisce l'altra via, è una modifica a `useTapScrim.ts` e va detta |
| **FM-4** | **«Salva sul telefono»** — due cose insieme: ① la parola è contro il dizionario (F-9) e serve un'eccezione ratificata come quella del 26/07; ② 🛑 **la sua implementazione è un punto in cui l'indirizzo firmato può uscire** (G5 · D75), e vive nel **chiamante** (T11/T12), non in `TendinaMenu` | Fuori dal mandato di un gate documentale. **Va nel mandato di chi scrive la voce** |
| **FM-5** | Il commento di testa di `src/components/ds/DialogConferma.tsx:3-9` («l'UNICA card centrata…») | **È codice.** Il testo pronto è in §3.4; applicarlo è di chi tocca quel file |
| **FM-6** | Dare a `src/components/ds/MenuVoce.tsx` una prop `ruolo?: 'menuitem'` e togliere il chevron alla variante `butta`, per farlo riusare dalla tendina (F-6) | `MenuVoce.tsx` **non è nell'elenco dei file** del piano ed è usato altrove (menù della scheda). **Proposta** |
| **FM-7** | **BP-1 (memoria).** Il controllo pre-commit avvisa che questo salvataggio tocca una spec **senza toccare la memoria** | Questo documento è una **proposta**: lo stato del progetto cambia **alla ratifica**, non adesso. `memory/MEMORY.md` e `docs/roadmap/ROADMAP-UFFICIALE.md` **non sono nel mandato di T5** — l'aggiornamento è del coordinatore, dopo il gate |
| **FM-8** 🆕 | 🔴 **Un'azione irreversibile riuscita non produce NESSUN ritorno non visivo (C-10).** La regola «niente suono per la distruzione» è rispettata, ma la catena vera finisce in `src/components/ds/Avviso.tsx:81-91`, dove **solo l'errore** suona e vibra: l'avviso della riuscita è **muto**. Al banco, col guanto, l'unica conferma che la foto è sparita è un cartellino che compare e sparisce | **Tocca `Avviso.tsx`**, componente condiviso e in produzione: fuori mandato per R-E2. ⚠️ **E non è un ritocco:** dare un ritorno alla riuscita distruttiva è una **decisione di grammatica** del design system (§9.2), non una riga di codice — va posta a Francesco, non decisa da un esecutore. **Riferita, non fatta** |
| **FM-9** 🆕 | 🔒 **La trappola del focus per `Sheet` e `DialogConferma`** — cioè la seconda metà di **D85** | ✅ **Non è più «fuori mandato»: è un TASK.** D85 l'ha ratificata, e nasce **T5-ter** (`src/components/ds/trappola-focus.ts` 🆕 **da creare**, più i due migrati), **prima di T6**. Si tiene questa riga perché fino al 30/07 era il difetto che nessuno aveva in carico |

---

## 9. Che cosa deve succedere adesso

> 🔧 **Sezione riscritta il 30/07, dopo il panel e dopo le quattro decisioni D85-D88.**

1. **Il gate si chiude con una ratifica**, riga per riga sull'elenco di §0 — **quindici voci**, non più
   dieci. Quelle che cambiano il **comportamento** e non solo la scrittura sono **G-3**, **G-4**, **G-9**,
   **G-11**, **G-12** e **G-15**.
2. **T5-ter PRIMA di T6** (**D85**, §1.6): `src/components/ds/trappola-focus.ts` 🆕 **da creare**, e `Sheet`
   e `DialogConferma` diventano suoi utenti. Senza, la via dell'`Escape` di §1.5 **poggia su un punto che
   non è vero** — è il bloccante B-1, l'unico su cui il panel ha convergiuto a tre su tre.
3. **T6 porta il gruppo `sopraFoto`** in `src/design-system/v3/tokens.ts` (§4) — 🛑 **non T7**, come diceva
   la stesura precedente: `CartaAlbum` usa già `sopraFoto.faccia` e **T6 gira prima** (C-3). Senza, il
   controllo pre-commit **blocca**.
4. **I mandati di T6, T7, T8, T9 e T9-bis vanno corretti PRIMA che partano**, con le righe **F-1**, **F-6**,
   **F-7**, **F-8**, **F-10**, **F-11**, **F-12** e **F-13** di §7 — o **quattro esecutori su cinque**
   leggeranno un testo che sa meno di questo documento.
5. **Poi**, e non prima, partono **T6 → T9-bis**, un esecutore fresco per task (R-E1), con questa proposta
   come fonte di verità: **se il gate ha scelto una via diversa, vale quella**.

⚠️ **Due cose che questo gate NON chiude, e che vanno a chi di dovere:** **FM-8** (l'azione distruttiva
riuscita non dà nessun ritorno non visivo — tocca `Avviso.tsx` ed è una decisione di grammatica, non una
riga di codice) e **F-2 / F-3** (le due leggi di §4.1 e §4.2 che il codice ratificato **già** contraddice —
o si aprono, o due componenti in vigore sono fuori legge, e ogni sezione nuova rilitiga lo stesso punto).
