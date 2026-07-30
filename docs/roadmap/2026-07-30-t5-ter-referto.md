# Referto — T5-ter · la trappola del focus, e i due overlay di casa che diventano suoi utenti (D85)

**Ramo:** `ondata-b-schermate` · **Data:** 30/07/2026, notte · **Mandato:** `docs/roadmap/2026-07-30-t5-ter-brief.md`
**Esito:** ✅ **fatto, sei passi su sei.** FASE 7 verde con l'output vero incollato qui sotto.

---

## 1. Che cosa è cambiato

**Nasce `src/components/ds/trappola-focus.ts`** — un modulo solo, sulla forma di
`src/components/ds/blocca-scorrimento.ts`: si scrive una volta e chi lo usa lo chiama e basta.
Tiene il `Tab` e lo `Shift+Tab` dentro il pannello, porta il focus dentro all'apertura e lo
restituisce all'**àncora dichiarata dal chiamante** alla chiusura.

**`Sheet` e `DialogConferma` diventano suoi utenti.** Da oggi la promessa `aria-modal="true"` —
«quello che c'è dietro non esiste» — è mantenuta anche per la tastiera, in **tutta** l'app e non
solo nell'album.

| file | che cosa gli è successo |
|---|---|
| `src/components/ds/trappola-focus.ts` | 🆕 creato |
| `tests/unit/ds-v3/componenti/trappola-focus.test.tsx` | 🆕 creato — **19** prove |
| `src/components/ds/Sheet.tsx` | l'effect del focus **diventa** la chiamata al modulo (non gli si affianca) |
| `src/components/ds/DialogConferma.tsx` | riceve `ref` + `tabIndex={-1}` su **entrambe** le varianti, l'effect del focus (che **non aveva**) e il commento di D80 (passo 5) |
| `tests/unit/ds-v3/componenti/sheet-dialog.test.tsx` | **+4** prove: la trappola sui due componenti, e il caso dei due strati insieme |

---

## 2. Il riferimento, e i due numeri del Passo 4

**Riferimento misurato da me, ad albero pulito, prima di toccare** (non ereditato dal brief —
la sua stessa regola dice che il numero invecchia):

```
 Test Files  362 passed | 3 skipped (365)
      Tests  3936 passed | 19 skipped (3955)
```

**Dopo:**

```
 Test Files  363 passed | 3 skipped (366)
      Tests  3959 passed | 19 skipped (3978)
```

Il conto torna esatto: **+1 file** (quello nuovo), **+23 prove** = 19 del modulo + 4 dei due
componenti.

### I due numeri che il passo 4 chiede

| | quante |
|---|---|
| rossi che erano **difetti veri** | **0** |
| rossi che erano **prove del vecchio comportamento** | **0** |

🔑 **La previsione del brief («alcune prove diventeranno rosse per una ragione che non è un
difetto») NON si è avverata, e la ragione è misurata, non fortunata.** Sono i due lati della
stessa scelta:

1. **Il ripiego dell'àncora ha reso la migrazione di `Sheet` invariante su quell'asse.** La prova
   storica `tests/unit/ds-v3/componenti/sheet-dialog.test.tsx:550` asserisce esattamente tre cose
   — focus sull'apritore prima, sul pannello all'apertura, di nuovo sull'apritore alla chiusura —
   ed è rimasta verde **senza essere toccata**. Era il segnale più economico che il contratto
   fosse giusto: se avessi dovuto modificarla, il ripiego non sarebbe stato invariante e §3 del
   brief sarebbe stato rotto.
2. **Nessuna prova in casa tabulava fino al BORDO di uno sheet.** Il raggio previsto dal brief
   (cinque file che toccano `Tab`/focus) era corretto come perimetro, ma dentro quei file le
   asserzioni sul focus riguardano il focus **iniziale** e i campi di modulo, mai l'uscita dal
   pannello. Il comportamento che cambio non era descritto da nessuno.

⚠️ **Che nessuna prova sia diventata rossa NON vuol dire che il cambiamento sia inerte** — vuol
dire che nessuno lo stava guardando. È esattamente perché la rete non lo copriva che è servita la
**mutazione di controllo** qui sotto.

---

## 3. R-P4 — l'abbozzo inerte, e il conteggio

Il primo rosso è stato «modulo non trovato», che **non prova che le prove provino qualcosa**.
Messo un abbozzo inerte (una funzione che non fa niente e torna un rilascio vuoto):

- **primo conteggio: 13 su 19.**
- Le **6** verdi erano prove **deboli**: passavano perché l'abbozzo non spostava mai il focus, e
  loro asserivano che il focus fosse dove era già. Le ho rinforzate — quattro con l'asserzione che
  mancava («all'apertura il focus è sul pannello»), una spostando l'elemento nascosto **in fondo**
  perché diventasse il bordo, una aggiungendo la pressione di `Tab` **prima** del rilascio.
- **secondo conteggio: 18 su 19.**

L'unica che resta verde con l'abbozzo è la **controprova** — «lo stesso pannello, **senza**
trappola, lascia uscire il focus» — che è verde per costruzione e serve a provare che il resto del
file non stia misurando una proprietà che il DOM ha già da solo.

### Le forme d'input, enumerate PRIMA delle asserzioni

| forma | esito |
|---|---|
| pannello senza nessun elemento raggiungibile | coperta |
| un solo elemento raggiungibile | coperta |
| elementi che compaiono **dopo** l'apertura (fetch) | coperta — ed è la ragione per cui l'elenco si rilegge **ad ogni** `Tab`, mai una volta sola |
| elemento disabilitato in mezzo alla sequenza | coperta |
| `tabIndex` negativo su un elemento interno | coperta |
| il pannello stesso, con `tabIndex={-1}` | coperta |
| 🆕 **àncora staccata dall'albero al rilascio (C-12 visto dal lato del chiamante)** | coperta — aggiunta da me: il modulo non può riparare un'àncora morta, ma non deve **fingere** di aver restituito il focus, né lasciare la trappola armata |

**Non coperte, e il perché** (scritto anche nel file di prova e nel commento del modulo):
`display:none` che arriva da un foglio di stile — jsdom non fa layout, quindi una prova direbbe
solo che il selettore non guarda il CSS; `tabIndex` **positivi** — il modulo dichiara di ignorarli
e di seguire l'ordine del DOM, e provarli inciderebbe come giusto un ordine che il browser vero fa
diverso; iframe e shadow DOM — nessuna superficie del design system ne monta.

### Le due mutazioni di controllo

1. Tolta la trappola dai due componenti (lasciando solo il focus iniziale): **5 prove si
   accendono** — le 4 nuove più quella storica del focus.
2. Tolto il `tabIndex={-1}` dal ramo **ridotto** di `DialogConferma`: **1 prova si accende**, ed è
   quella scritta apposta per quel ramo (qui sotto). La rete morde in entrambi i rami.

### 🔴 Un buco trovato rileggendo, e chiuso: il ramo «riduci movimento»

`SheetRidotto` e la variante ridotta di `DialogConferma` montano un **pannello diverso** — un `div`
nudo invece del `motion.div`. La trappola ci arriva per codice condiviso, ma **nessuna prova la
toccava**: le quattro nuove e quella storica girano tutte sul ramo animato, e il blocco
`reduced motion (§8.4)` asseriva opacità e velo, mai il focus. ➡️ Togliere il `ref` o il
`tabIndex={-1}` da quel ramo avrebbe **spento la trappola proprio per chi ha «riduci movimento»
acceso** — cioè per chi più di tutti si aspetta che la tastiera si comporti — con la suite **tutta
verde**. Aggiunte **due prove**, una per componente.

### Due assunzioni del modulo che ora portano la loro prova (R-P1)

Il commento di testa dichiarava due lacune («non guardo la visibilità calcolata», «non seguo un
portale annidato») appoggiandosi a un'assunzione **non marcata** — e per la regola di casa un
blocco senza marchio è **non provato**. Le due prove, adesso nel file:
`grep` di `display:none`/`visibility:hidden` in `src/components/ds/` → **un solo riscontro, ed è
quella riga di commento**; nelle nove regole `.ds-sheet`/`.ds-dialog` di `src/app/ds-v3.css` →
**zero**. `grep` di `createPortal` in `src/components/ds/` → **tre file**, i due overlay più gli
avvisi; nessuna primitiva di `src/components/ui/` monta un `Portal`.
🔑 **Perché contava:** se l'**ultimo** elemento del giro fosse nascosto dal CSS, `focus()` non
attecchirebbe, il focus finirebbe sul `body` e la via dell'`Escape` di §1.5 si romperebbe — e
**jsdom non lo vedrebbe mai**, perché non fa layout.

---

## 4. Le tre scelte che ho dovuto fare, e la ragione di ognuna

**① L'ascoltatore sta sul PANNELLO, non su `document`.** È la stessa forma di §1.5 per l'`Escape`
(«mai su `window`»), e non è solo coerenza: una trappola globale terrebbe il `Tab` lontano **anche
dagli avvisi**, che vivono sopra il velo (z-index 1100) e portano i propri comandi
(`src/components/ds/Avviso.tsx:203-204`) — cioè lo stesso danno per cui `inert` è stato scartato in
D85, entrato dalla finestra. ✅ **E la scelta è provata, non asserita:** la prova dei **due
pannelli aperti insieme** (il caso vero di `CassettaSheet`) mostra che due trappole non si
contendono niente, perché il `keydown` arriva solo a quella che contiene il focus.

**② `DialogConferma`: il focus va sul PANNELLO.** §5.17 non dice dove va. §5.42 dice «alla PRIMA
azione, che è quella sicura» — ma quello è `FoglioConferma`, non questo. Ho preso il default che
**non promette niente di nuovo**: è ciò che fa `Sheet` ed è ciò che prescrivono §5.39 e §5.41.
🔑 **Un revisore che legge §5.42 chiederà perché le due conferme distruttive differiscono:** la
risposta è che la spec non lo dice per §5.17, e che il foglio dichiarerà il proprio bersaglio col
parametro `focusIniziale` in T9-bis. **Se Francesco preferisce che anche la card centrata parta dal
tasto sicuro, è una riga sola** — ma è un cambiamento di grammatica, e non me lo sono preso da solo.

**③ Nessuna prop `ancoraFocus` su `Sheet` e `DialogConferma`.** Il ripiego esiste proprio perché
quei due migrino invarianti; una prop che nessun chiamante passa è superficie morta che invita il
prossimo a **scegliere** il ripiego invece di subirlo. I tre strati nuovi la porteranno nella
propria firma, come già scritto nelle loro §5.x.

---

## 5. FASE 7 — i tre comandi, output vero

```
$ npx tsc --noEmit
TSC EXIT=0
```

```
$ npx vitest run
 Test Files  363 passed | 3 skipped (366)
      Tests  3959 passed | 19 skipped (3978)
   Duration  29.50s
EXIT=0
```

```
$ npx next build
EXIT=0   (build completa, tutte le route generate)
```

### 🔴 La riesecuzione dopo mezzanotte ha UN rosso, e non è mio — è del calendario

Rifatta la FASE 7 dopo le ultime rifiniture (alle **00:05 del 31/07**, mentre la prima era delle
23:52 del 30):

```
 Test Files  1 failed | 362 passed | 3 skipped (366)
      Tests  1 failed | 3960 passed | 19 skipped (3980)
```

Il rosso è `tests/unit/dashboard-kpi.test.ts > getTrendMensile > originale e TD04 in mesi diversi`
— **un file che non ho toccato**, e che con gli overlay non c'entra niente.
`provato:` messe da parte le mie modifiche (`git stash`) e rieseguito **quel solo file
sull'albero al commit precedente** → **rosso lo stesso**. Non è mio. È in §6 ⑥, col meccanismo.

---

## 6. R-E2 — fuori dal mandato: riferito, NON corretto

### ① 🔴 La firma di `VisoreFoto` nel piano non porta l'àncora — e T7 ci sbatterà contro
`docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md:1201` dichiara
`VisoreFoto(props: { aperto; foto; indice; onIndice; onChiudi; onCorreggiCategoria; azioni? })` —
**senza `ancoraFocus`**. Ma il **mandato corretto** dello stesso task (punto 6) e la §5.39 della
spec impongono «ritorno all'**àncora dichiarata dal chiamante**, non a `document.activeElement`
catturato al montaggio». `FoglioCategoria` la porta (`:1301`), il visore no.
➡️ **Chi esegue T7 deve aggiungerla alla firma**, o nascerà con il ripiego — cioè con il difetto
che il ripiego è stato scritto per **non** propagare.

### ② 🔑 Una trappola scritta a mano esiste GIÀ in casa, fuori da `ds/`
`src/components/features/fatture/InviaPecButton.tsx:80-114` gestisce il `Tab` per conto proprio,
con la stessa logica dei bordi e un selettore quasi identico. **Non contraddice D85** — la sua
frase è ristretta a `src/components/ds/`, e lì è vera — ma cambia il quadro: il bisogno era già
stato sentito, e la risposta è stata una **copia locale**. ⚠️ **E la sua copia ascolta su
`window`**: due dialoghi con trappola su `window` si contendono il focus. Oggi non succede perché
quel dialogo vive da solo. **È il candidato n.1 ad essere assorbito dal modulo**, quando la sua
ondata passerà di lì.

### ③ Gli altri overlay che dichiarano `aria-modal` senza mantenerlo — l'elenco, non la migrazione
`provato:` `grep -rln "aria-modal" src/ --include="*.tsx"` fuori da `ds/` → **quattordici** file, e
di questi **tredici** non hanno alcuna gestione del `Tab`:

`features/ordini/NuovoOrdineSheet.tsx` · `features/scadenzario/EstrattoContoView.tsx` ·
`features/scadenzario/CreditoSheet.tsx` · `features/scadenzario/RegistraPagamentoSheet.tsx` ·
`features/auth/PasskeyRegistrationModal.tsx` · `features/fatture/OverrideStatoSheet.tsx` ·
`features/fatture/NotaCreditoButton.tsx` · `features/fatture/RiconciliazioniClient.tsx` ·
`features/fatture/SbloccaClaimSheet.tsx` · `features/fatture/UploadRicevutaSheet.tsx` ·
`features/lavori/PacchettoConsegnaSheet.tsx` · `features/lavori/RifacimentoButton.tsx` ·
`features/magazzino/MagazzinoAddSheet.tsx` (+ `features/fatture/InviaPecButton.tsx`, che invece ce
l'ha — v. ②).

🛑 **Nessuno di questi è stato toccato.** Ora il modulo esiste: migrarli costa **tre righe
ciascuno**, ma è un'ondata che si aprirebbe da sola, e sei di loro sono anche fra i **nove**
ascoltatori di `Escape` su `window` che §1.5 censisce. **Vanno insieme, non uno per volta.**

### ④ BP-1 passo 2 — `docs/roadmap/ROADMAP-UFFICIALE.md`: verificato, **non** modificato, e c'è una riga stantia
Questo task non sposta nessuna feature fra le versioni, quindi la roadmap **non andava toccata** —
ma la verifica va scritta, o «non l'ho toccata» e «non l'ho guardata» si somigliano troppo.
🔴 **Guardandola, però, una riga è vecchia:** la **prima riga** della tabella — quella del wizard «Nuovo lavoro» — descrive ancora l'ondata **(b)** come
*«da pianificare»*, mentre l'ondata (b) ha un piano di **sedici** task e ne ha eseguiti otto.
🛑 **Non l'ho corretta, ed è una scelta:** quella voce descrive l'ondata (b) come *wizard adattivo*
(38 tipi, denti sulle illustrazioni, colore per dente), che è un perimetro **più largo** dell'album
di questo piano. Dire «pianificata» sarebbe vero per l'album e **falso** per il wizard. Il confine
lo traccia il coordinatore, non l'esecutore di un task.

### ⑤ Due citazioni di riga che questo task fa invecchiare (documenti ratificati, non li tocco)
- `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` §1.6 e §5.42 citano
  «`Sheet.tsx:314-322` cattura `document.activeElement` al montaggio». **Da oggi `Sheet` non
  cattura più niente da sé**: delega al modulo, che fa la stessa cosa col ripiego. La **sostanza**
  di quel passaggio regge (`Sheet` continua a non avere una prop per ricevere l'àncora, quindi
  `FoglioConferma` continua a non poter essere uno `Sheet` nudo); invecchia solo il riferimento.
- Le stesse §5.x dicono «`trappola-focus.ts` (🆕 **da creare**)». **Adesso esiste.**

---

### ⑥ 🔴 DIFETTO NUOVO, trovato dal calendario: il grafico del trend perde un mese nei giorni «31»

**Il fatto.** `src/lib/dashboard/queries.ts:366-369` calcola l'inizio della finestra così:

```ts
const startDate = new Date()
startDate.setMonth(startDate.getMonth() - months + 1)
startDate.setDate(1)
```

🛑 **`setMonth` viene PRIMA di `setDate(1)`, e questo è il difetto.** Se oggi è il **31** e il mese
di destinazione ne ha **30**, quel giorno non esiste: JavaScript non sbaglia — **trabocca al mese
dopo**, e il `setDate(1)` successivo fissa il primo del mese **sbagliato**. La finestra nasce corta
di un mese, in silenzio.

`provato:` sonda che riproduce le tre righe (transazione di sola lettura, nessun file toccato):

| oggi | `months=2` → inizio |
|---|---|
| 30 luglio | **1 giugno** ✅ |
| **31 luglio** | **1 luglio** ❌ — giugno è sparito |

**Perché si è acceso solo adesso:** la stessa suite era **tutta verde alle 23:52**, ed è rossa alle
**00:05**. Non è cambiato il codice: è cambiato il giorno.

**Che cosa costa davvero.** Un solo chiamante in produzione — `src/app/(app)/analytics/page.tsx:146`,
con `months=12`. Nei giorni in cui il giorno di oggi non esiste nel mese bersaglio (i «31» che
guardano un mese di 30, e il 29/30/31 che guardano febbraio) **il grafico mostra undici mesi invece
di dodici**, senza dirlo. Non sbaglia i numeri: **perde una colonna**.

🛑 **Non l'ho corretto: è fuori dal mio mandato** (R-E2 — la dashboard non è un overlay, e il
mandato era un compito solo). La riparazione è una riga — mettere `setDate(1)` **prima** di
`setMonth` — ma il test che la protegge va scritto **con la data pilotata**, o resterà una prova che
funziona 360 giorni l'anno e mente negli altri cinque. ⚠️ **E vale la pena notare la classe:** la
prova esisteva, era giusta, ed è stata **il calendario a renderla capace di vedere**. Una suite che
dipende da `new Date()` non è deterministica: **questa volta il caso ha lavorato per noi.**

---

## 7. Che cosa NON ho fatto, per mandato

- `TendinaMenu` **non** è utente della trappola (`role="menu"`, niente `aria-modal`): non l'ho
  toccata e non ho scritto niente che la presupponga.
- `src/components/ds/storia-overlay.ts` **non toccato** (D86: il ripiego dell'`Escape` lo decide il
  coordinatore).
- Nessun ritorno sonoro o vibrato inventato (FM-8 resta una domanda per Francesco).
- Nessun overlay di `features/**` migrato (v. §6 ③).

---

## 8. Il passo dopo

**T6 — `CartaAlbum`**, a un esecutore fresco (R-E1). 🛑 **T6 porta i NOVE token del gruppo
`sopraFoto`** in `src/design-system/v3/tokens.ts`, non T7.
