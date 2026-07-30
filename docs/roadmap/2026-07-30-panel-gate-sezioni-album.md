# Panel di validazione — il gate delle §5.x dell'album (30/07/2026)

**Oggetto:** `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` (773 righe), la proposta
delle cinque §5.x scritta **prima** dei componenti (spec v3 §13.1 p.3).
**Regola applicata:** Regola Advisor (17/07/2026) — ogni decisione significativa passa da un panel di 2-3
prospettive diverse **prima** della ratifica.
**Panel:** architettura degli strati · accessibilità e uso al banco · verificabilità delle affermazioni.
**Esito in una riga:** 🛑 **il gate NON si ratifica com'è.** Due voci su dieci non passano, e i rilievi di
sostanza sono **misure sbagliate**, non scelte sbagliate: l'impianto regge.

---

## 0. I tre verdetti, uno accanto all'altro

| voce di §0 | architettura | accessibilità | verificabilità |
|---|---|---|---|
| **G-1** numeri §5.38-§5.42 | ✅ | ✅ | ✅ verificato (l'ultima §5.x in vigore è §5.37) |
| **G-2** `raggio.riga - 6` | ✅ | ✅ verificato nel codice | ✅ verificato |
| **G-3** solo il visore blocca | 🛑 **no, per SEQUENZA** | ✅ con precondizione | ⚠️ sì, ma **la prova è cieca** |
| **G-4** `Escape` sul pannello | 🛑 **no** | ⚠️ sì, ma manca il `Tab` | 🛑 **no** |
| **G-5** z-index 400/500/600 | ⚠️ censimento incompleto | ✅ | ⚠️ soffitto incompleto |
| **G-6** `molla.smooth` | ✅ | 🛑 **no per i due fogli** | — |
| **G-7** i valori `sopraFoto` | ⚠️ conteggio + un valore | ⚠️ il **commento** va riscritto | ⚠️ conteggio + due frasi false |
| **G-8** ordine dei tasti (**D82**) | — | ✅ conclusione, ❌ **la ragione** | — |
| **G-9** i controlli non si appoggiano alla sfumatura | ✅ | ✅ **la decisione migliore del gate** | ✅ |
| **G-10** emendamento §5.17 · §13.2 | ✅ | ✅ | ⚠️ non cita verbatim |

🔑 **Convergenza a tre su un punto solo, ed è quello che blocca:** §1.6 promette che ogni §5.x dichiari il
proprio comportamento sul **focus**, e **nessuna delle cinque lo fa**.

---

## 1. I bloccanti — con la verifica del coordinatore

### B-1 · Il `Tab` esce dal pannello, e la soluzione di `Escape` ci poggia sopra
**Chi:** tutti e tre. **Stato:** ⛔ blocca **G-4**.
`Sheet` non fa trappola del focus, non usa `inert`, non usa `aria-hidden` sulla pagina dietro — è scritto in
§1.6 del documento stesso. I quattro strati nuovi **non ereditano niente** e §1.6 dice che ognuno dichiarerà
cosa fa: **nessuna delle cinque §5.x lo dichiara**. Ma il punto 2 di §1.5 («il pannello che contiene il
focus è quello in cima») **è la premessa dell'intera via**.
🔴 **Il difetto è concreto, non teorico:** `src/components/layout/SkipToContent.tsx:12` è focusabile,
globale e a **z-index 9999** — con `Tab` si esce dal pannello, si atterra lì, e da quel momento `Escape` non
trova più nessuno strato nuovo e **risale a `window`**, dove vivono **nove** ascoltatori (non due, come
diceva P18 del piano). Chiude quello sotto e lascia aperto quello sopra: **l'inverso esatto** del difetto
che G-4 esiste per chiudere.
➡️ **Si chiude in un modo o nell'altro, e va scritto:** contenimento vero (`inert` sulla radice mentre uno
strato è aperto — i portali sono fratelli, il contratto di §1.5 lo permette già), **oppure** il gate accetta
**per iscritto** che `Escape` è condizionato al focus e nomina il ripiego.

### B-2 · Il bivio di A-1 non ha un proprietario
**Chi:** verificabilità. **Stato:** ⛔ blocca **G-4**, ed è indipendente da B-1.
§6 dice: «se lo `Sheet` si chiude, la via di §1.5 è falsa e si passa a FM-2». Ma **FM-2 tocca
`src/components/ds/storia-overlay.ts`**, modulo condiviso, **fuori dal mandato di T7** per R-E2. L'esecutore
arriverebbe a un bivio che non ha l'autorità di prendere, e si fermerebbe.
➡️ **Il gate pre-autorizza il bivio**, o lo toglie di mezzo scegliendo ora.
✅ **E c'è una buona notizia che lo rende improbabile: A-1 è VERA**, provata alla fonte e **riverificata dal
coordinatore** — `node_modules/react-dom/cjs/react-dom-client.development.js:3394-3397`
(`stopPropagation()` del sintetico chiama quello **nativo**) e `:12907-12911` (`case 4`, cioè il portale,
chiama `listenToAllSupportedEvents(containerInfo)`: gli ascoltatori stanno sul **contenitore del portale**,
sotto `window` nella risalita). ⚠️ **Confine da incidere:** vale per la **fase di bolla**. Un ascoltatore in
**cattura** su `window` passerebbe attraverso. Oggi nessuno la usa; la regola deve dirlo.

### B-3 · La prova del blocco dello scorrimento è cieca due volte
**Chi:** verificabilità. **Stato:** ⛔ blocca **G-3** finché non è riscritta.
La prova prescritta mette il corpo a `overflow:'hidden'`, apre e chiude lo strato, e pretende che valga
**ancora `'hidden'`**. 🛑 **Ma `'hidden'` è esattamente il valore che un componente che blocca scriverebbe:
`Sheet` stesso supera questa prova** (`Sheet.tsx:248-252` cattura, `:255` scrive, `:227` ripristina). E
resta verde anche se il componente non viene **mai montato**.
➡️ Sentinella `'scroll'` (che nessuno scriverebbe), asserzione **mentre è aperto** e non solo dopo, e
`paddingRight` incluso (`Sheet.tsx:257` lo scrive insieme). Più il **caso che deve fallire**. E manca la
prova **speculare**: che il visore **blocchi davvero**.

### B-4 · Le misure di contrasto del visore sono calcolate sull'elemento sbagliato
**Chi:** accessibilità. **Stato:** ⛔ blocca le «Misure» di §5.39.
S1 dichiara che il contatore passa da ~4,2:1 a ~5,7:1 con l'opacità piena. Ma quei numeri valgono per un
testo **con la faccia scura sotto**, e `provato:` — verificato dal coordinatore sul mockup — **`.vis-capo
.mezzo` non ha nessun `background`** (`docs/design/mockups/2026-07-30-album-visore-categoria.html:118-120`):
etichetta e contatore stanno **direttamente sulla sfumatura**. Il valore vero è **~2,1:1**, ed è lo stesso
documento a scriverlo quattro righe dopo, in §5.39. **Le due righe non possono essere vere insieme.**
✅ **Non smentisce G-9: la completa.** La regola («il contrasto non dipende dalla sfumatura») è giusta e va
ratificata; **è l'applicazione a essere incompleta**, e mancava proprio sui due elementi che S1 voleva
difendere. ➡️ Etichetta + contatore diventano **una pastiglia con faccia** (`sopraFoto.faccia`,
`raggio.pill`, min-height **44**, `sopraFoto.confine`). Che risolve anche il punto sotto.

### B-5 · L'etichetta della categoria è un comando, e non ha né bersaglio né nome
**Chi:** accessibilità. **Stato:** ⛔ blocca §5.39.
Toccare l'etichetta apre `FoglioCategoria` per correggere (**D70**), ma le Misure non le danno **nessuna
altezza minima**: due righi da 15.5 e 12.5 fanno ~38-40 px, **sotto i 44** di §4.2 e §10. E gli `aria-label`
sono dichiarati **solo per i due tondi**: chi usa un lettore di schermo sente «Impronta» e non sa che si può
toccare. La pastiglia di B-4 porta con sé min-height 44 e il nome giusto.

### B-6 · A «Riduci movimento» i due fogli si muovono comunque
**Chi:** accessibilità. **Stato:** ⛔ blocca **G-6** per §5.41 e §5.42.
Le due sezioni dicono «`coreografie.sheetSu`» **e** «`y` resta nel bersaglio con `istantaneo`». Ma
`sheetSu` porta la transizione **dentro** il bersaglio, in **due** punti
(`src/design-system/v3/motion.ts:85` e `:86`): una `transition` passata come prop **non ci arriva**. E la
via che l'implementatore troverebbe guardando la casa è peggio — sotto reduced `Sheet` monta
`SheetRidotto` (`src/components/ds/Sheet.tsx:378-413`), il cui pannello **non ha `y` affatto**: è il
bersaglio-tolto che §1.9 esiste per vietare. ➡️ La §5.x deve dire **come**, su **entrambe** le chiavi, e la
prova diventa «`y` finale = 0 **e** nessun tween su `y`».

### B-7 · La misura che decide la griglia delle categorie non ha contenitore
**Chi:** accessibilità. **Stato:** ⛔ blocca §5.41.
I **148,5 px** di **D79** sono misurati dentro la **cornice di telefono disegnata nel mockup**. La larghezza
vera del foglio **non è mai dichiarata**: `src/components/ds/Sheet.tsx:443-444` dà `width:'100%'`,
`maxWidth: 480`. Con il padding ratificato la colonna vera è **~171 px a 390** e **~216 px** da 768 in su.
**148,5 non vale a nessun viewport.** ➡️ Dichiarare la larghezza, **poi** rifare la misura.
🔴 **E il `whiteSpace:'nowrap'` copiato dal mockup rompe un requisito di rilascio**, non un'estetica: la
spec impone **text-zoom 200% senza rottura** (§10 p.4). Con `nowrap` l'etichetta non va a capo: **esce e si
taglia**. Al banco, a 200%, si legge «Guida col…». ➡️ Via `nowrap`, due righi ammessi, `min-height 60`, e la
prova diventa **«a 200% nessun testo è tagliato»** — un vincolo stabile invece della fotografia di un
contenitore che non esiste.

---

## 2. I rilievi che non bloccano ma vanno corretti prima di costruire

| # | che cosa | chi |
|---|---|---|
| **C-1** | 🛑 **`overscrollBehavior:'contain'` è INERTE** se il pannello non è un contenitore che scorre. `Sheet` si salva perché dichiara `overflowY:'auto'` (`src/components/ds/Sheet.tsx:446`); le Misure dei due fogli **non dichiarano nulla**. Senza, il costo residuo passa da «a volte» a **«sempre, su entrambi i fogli»** | architettura + accessibilità |
| **C-2** | **Il conteggio dei token è NOVE, non sette** — `provato:` contate le chiavi nel blocco di §4. E due frasi sul meccanismo sono false: l'esclusione non è solo `v3/tokens.ts` (`scripts/check-ds-compliance.sh:57` esclude anche i test) e `miniaturaSpenta` è un **numero**, che nessun grep vede | architettura + verificabilità |
| **C-3** | 🔴 **Il gruppo di token serve a T6, non a T7:** `CartaAlbum` usa già `sopraFoto.faccia` per la pastiglia «⤢ Apri», e **T6 gira prima di T7**. Eseguito alla lettera, T6 scrive un colore inline e il pre-commit lo blocca | verificabilità |
| **C-4** | **Il censimento degli z-index è incompleto, e nasconde il precedente che risponde alla domanda:** `src/components/features/lavori/consegna-v3/FlussoConsegna.tsx:56` e `FrameConsegnato.tsx:90` sono **due overlay v3 a tutto schermo a z-index 1000**, montati **dalla stessa pagina** dell'album (`SchedaLavoroV3.tsx:376`). `provato:` riverificato dal coordinatore. La conclusione «302-999 è libero» **resta vera**; è la domanda a cambiare — v. §3 | architettura + verificabilità |
| **C-5** | 🔴 **La ragione scritta in §5.40 per la voce distruttiva è SBAGLIATA, e serviva ad argomentare D82:** una tendina ancorata sotto il ⋯ vive nel terzo **alto** dello schermo — il suo fondo è a ~220 px su 844, **non** la zona del pollice. Il mockup lo registra al contrario (`:449`). 🛑 **D78 e D82 restano** (le loro mitigazioni sono giuste), ma **la frase va tolta**: una ragione sbagliata incisa in spec viene ricitata | accessibilità |
| **C-6** | **Il ⋯ «acceso» è colore-soltanto** e su una radiografia è **1,02:1**, cioè invisibile — contro G4. Mancano anche `aria-haspopup="menu"` e `aria-expanded` sull'innesco: chi usa un lettore di schermo non sa che apre un menù | accessibilità |
| **C-7** | **Allo scatto il mockup mostra una pastiglia GIÀ SCELTA** (`:504`, `:576`), e §5.41 non dichiara mai che allo scatto non c'è scelta. Chi copia il mockup pre-seleziona «Impronta» → **due default in contraddizione con D74**, e quello sbagliato è pure affermato a schermo | accessibilità |
| **C-8** | **La fascia del visore non dichiara cosa fa oltre le sei foto:** a 390 ce ne stanno sei; con dodici — normale per un lavoro con più impronte — o si scorre o si scende **sotto 44 px**. §5.38 lo dichiara per la carta, §5.39 no | accessibilità |
| **C-9** | **`11 px` sull'etichetta di gruppo della carta** (`provato:` mockup `:96`), sotto il minimo assoluto **12.5** che S1 invoca quattro sezioni più in là per bocciare il contatore. Stesso difetto, accettato in silenzio — e su un testo più difficile (maiuscolo, spaziato, nel colore più debole) | accessibilità |
| **C-10** | **Un'azione irreversibile riuscita non produce NESSUN ritorno non visivo.** La regola («niente suono per la distruzione») è rispettata, ma la catena vera finisce in `src/components/ds/Avviso.tsx:85-91`, dove **solo l'errore** suona e vibra: l'avviso della riuscita è **muto**. Al banco, col guanto, l'unica conferma che la foto è sparita è un cartellino che compare e sparisce | accessibilità |
| **C-11** | **La citazione del modello per T7 manda a riprodurre un bug già pagato:** §5.39 dice «modello `Sheet.tsx:241-264`», intervallo che **non contiene** la sentinella `montatoRef` (`:232-239`) né lo sblocco differito. Chi copia alla lettera ottiene il layout shift documentato a `Sheet.tsx:200-206`. La citazione giusta è **`:217-264`** | architettura |
| **C-12** | **Il focus da restituire dev'essere un'ÀNCORA DICHIARATA**, non `document.activeElement` catturato al montaggio: l'apritore del foglio di conferma è **una voce di menù che sta smontando**, e catturare un nodo staccato lascia il focus sul `body` — da lì, per la regola di §1.5, **`Escape` è morto** | architettura |
| **C-13** | **Tre firme del piano non reggono l'anatomia prescritta:** `VisoreFoto` non ha nessuna prop per aprire il foglio categoria (che §5.39 prescrive, D70) · `CartaAlbum` nemmeno (§5.41 dice «dal visore **o dall'album**») · `FoglioConferma` non ha né l'anteprima dell'oggetto né l'etichetta sicura | verificabilità |
| **C-14** | **`ombraPannello` collide con una legge di §3** («l'elevazione è una superficie più chiara, **MAI un'ombra**; nessuna shadow in dark») **senza dichiararlo**, mentre lo stesso documento è scrupoloso a dichiarare F-2 e F-3. C'è un precedente ratificato da citare: `TastoPiu` in scuro, «unica ombra esterna ammessa» | architettura |
| **C-15** | 🔴 **Cinque regole si possono violare SENZA che niente diventi rosso.** La più grave è **G5 · D75** (l'indirizzo firmato della foto non si moltiplica): è l'unica del documento **senza nessuna prova prescritta**, ed è l'unica il cui danno sta **fuori dallo schermo**. Un `title={foto.url}` passa compilatore, suite e tutte le guardie | verificabilità |

---

## 3. Le due domande che il panel gira a Francesco

1. 🔑 **Chi copre chi.** L'app ha **già** due schermate v3 a tutto schermo a quota **1000** (il rito della
   consegna), montate **dalla stessa pagina** dove vivrà l'album. Il documento le aveva omesse. ➡️ **Il
   visore delle foto deve coprire un pannello già aperto, o farsi coprire?** Se copre, i tre valori salgono
   a **1010/1020/1030** e l'assunzione A-2 **smette di essere portante**; se no, 400/500/600 va bene ma la
   ragione va scritta.
2. **Riparare adesso il difetto del blocco dello scorrimento, o aggirarlo.** La via scelta («gli strati alti
   non toccano mai lo scorrimento») **funziona**, ma incide nel design system una regola che è la
   **scorciatoia attorno a un difetto** di `Sheet`. La riparazione vera è un contatore condiviso (~25 righe)
   di cui anche `Sheet` sia utente. ⚠️ **Gli attori sono DUE, non uno** — `src/components/ds/Sheet.tsx` e
   `src/components/features/ordini/NuovoOrdineSheet.tsx:91-95`, e il secondo scrive `overflow=''` a mano
   senza catturare niente: `provato:` grep su tutto `src/`.

---

## 4. Che cosa succede dopo la ratifica

1. Le correzioni di §1 e §2 entrano **nel documento del gate**, non nei mandati sparsi.
2. **Poi** partono T6 → T9-bis, un esecutore fresco per task (R-E1).
3. **Prima di T6**, i mandati di T7/T8/T9/T9-bis si correggono con **F-1** (il foglio categoria è anche
   terzo strato), **F-6**, **F-7**, **F-8** del documento e **C-11**, **C-12**, **C-13** di qui — o quattro
   esecutori su cinque leggeranno un mandato che sa meno del documento.
4. **T6 porta il gruppo `sopraFoto`** in `src/design-system/v3/tokens.ts` (C-3), non T7.
