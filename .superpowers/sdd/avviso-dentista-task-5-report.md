# Resoconto — Task 5: il foglio dell'avviso al dentista (variante A2, ⚖️ D344)

**Quando:** 9 agosto 2026, 20:07-21:00 (`provato:` `date` → `Sun Aug  9 20:47:00 CEST 2026`, letto
dall'orologio e non da un documento — D155).
**Ramo:** `intervento-post-consegna`. **Piano:** `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md`,
Task 5. **Disegno:** `docs/design/mockups/2026-08-09-avviso-al-dentista.html`, colonna centrale della
sezione A (⚖️ D344).

| cosa | esito |
|---|---|
| `VERIFY_EXIT` | **0** |
| prove, prima → dopo | **5833 \| 119 su 464 file** → **5887 \| 119 su 465 file** (+54 prove, +1 file) |
| forza delle prove (R-P4) | **38 su 40** asserzioni si accendono sull'abbozzo inerte |
| contrasti sul DOM vivo | **0 testi sotto soglia su 42 schermate** (7 passi × 3 viewport × 2 temi) + giro a movimento ridotto |
| difetto ereditato da `Sheet` | **misurato e chiuso in locale**: `scrollTop` 712 → **216** col titolo a −150 px; ora **0** |
| difetti trovati e corretti nel mio codice | **2** (contrasto dei titoli d'esito: 4,50 e 4,09) |
| ritrovamenti fuori mandato | **6**, tutti riferiti e nessuno corretto di nascosto |
| salvataggio | **`48e014ae`** (v. ⑩) |

---

## ① Il campo multilinea: `CampoTestoLungo` in `src/components/ds/Campo.tsx` — **confermato**

**La strada consigliata dal mandato è quella giusta, e la ragione non è la comodità.** Il fatto misurato:
`provato:` `grep -rln textarea src/components/ds/` → **un solo file**, `trappola-focus.ts`, dove `textarea`
è un *selettore* di elementi focalizzabili e non un campo. In tutte le superfici v3 **non esisteva nessuna
`<textarea>`**: questo è il **primo** campo multilinea dell'app.

**Perché non una `<textarea>` locale dentro il foglio:** §13.1 p.3 dice che i componenti vivono **solo** in
`src/components/ds/`, e un componente non in spec è una review respinta. Ma la ragione vera è un'altra e si
vede a un passo di distanza: il secondo foglio che avesse bisogno di un testo lungo ne scriverebbe una
copia, e due copie della stessa anatomia divergono alla prima revisione. È la stessa famiglia di difetto che
`firma.ts` e `motivi-ui.ts` esistono per evitare.

**Non è un componente NUOVO: è un membro della famiglia §5.27.** Per questo condivide `stileLabel` (13/800
MAIUSCOLA `--faint`), l'anello di focus (2 px `--blue`, offset 2, su `:focus`) e la riga d'aiuto legata con
`aria-describedby` — cioè esattamente ciò che il mandato chiedeva («*stessi token, stesso anello, stessa
didascalia*»). E per la stessa ragione l'anatomia è stata scritta come **emendamento a §5.27** e non come
una §5.x a sé: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md`, sotto §5.27.
🔑 **L'emendamento non è burocrazia:** la rev. 3.5 di quella spec dice che il canale per emendarla «*è stato
usato una volta su nove*» in un'ondata, e le otto divergenze rimaste avevano tutte una decisione dietro.
Un componente nuovo senza la sua riga è il modo in cui quella lista cresce.

**Le tre divergenze dai fratelli, ognuna con la sua ragione:**

| cosa | fratelli | `CampoTestoLungo` | perché |
|---|---|---|---|
| altezza | 64 (una riga) | `altezzaMinima` **misurata** | v. ③ del §⑥: il contenuto chiede 225 px |
| fondo · filo | `--card` · `--line` | `--fondo-superficie` · `--filo-superficie` | è la coppia nata con ⚖️ D326 · D329 · D330 per le superfici **dentro un foglio**: il pannello dello `Sheet` è `--card`, e un campo `--card` su pannello `--card` è il difetto già misurato lì. Il mockup approvato (classe `.messaggio`) porta esattamente questi due token |
| testo | 19/700 | **17/600, `line-height` 1,45** | è un testo da **leggere** prima che da correggere; 19/700 su sei righe è un blocco. 17 è il minimo di legge per il testo di lettura (§4.1): non si scende |

Più: `resize: vertical` (dal mockup, mai orizzontale — allargherebbe oltre il pannello) · `maxLength`
**senza valore di casa**, lo passa chi chiama perché è il tetto della **sua** rotta · `soloLettura` per il
caso in cui quel testo **è già uscito** (v. ③).
**Prove:** 13 asserzioni nuove in `tests/unit/ds-v3/componenti/campo.test.tsx`, accanto a quelle dei
fratelli — se domani un secondo foglio lo usa, è quel file a dire cosa può dare per buono.

📌 **Ciò che NON ho fatto, dichiarato:** il campo **non è stato aggiunto alla sezione «Campo» del catalogo**
(`/ds-v3-catalogo`). Il catalogo non è nel perimetro del Task 5, la sua sezione per questa famiglia esiste
già, e toccare `page.tsx` avrebbe messo in gioco la prova che rende l'intera pagina. Riferito in ⑨.

---

## ② Lo scorrimento al cambio di passo, a 390 — **il difetto si manifesta, e la misura è questa**

`provato:` `grep -n scrollTop src/components/ds/Sheet.tsx` → **zero righe**. Il contenitore che scorre è il
pannello dello `Sheet` (`overflowY: 'auto'`, `Sheet.tsx:507`) e **nessuno lo riporta in cima** quando il
contenuto cambia.

🔑 **Prima cosa, ed è la parte che conta: a 390×844 il caso NON esiste.** Il passo 1 non scorre affatto —
`scrollHeight` **517** su `clientHeight` **517**. Nemmeno a **390×667** (il regime device-corti di §4.2):
517 su **614**. Fermarsi lì avrebbe prodotto un «non si riproduce» che è vero e inutile.

**Dove esiste è la condizione che §13.3 rende obbligatoria — lo zoom del browser al 200%.** In Chrome lo
zoom scala anche i px, quindi 390×844 letto al 200% è un viewport di **195×422** px CSS. Lì:

| momento | misura |
|---|---|
| passo 1, scorrimento disponibile | `scrollHeight` **1100** su `clientHeight` **388** |
| passo 1 scorso in fondo | `scrollTop` **712** |
| **cambio di passo → passo 2** | `scrollTop` **216** |
| **titolo del passo 2** | `top` **−150 px**: **fuori dal pannello** |

**La decisione, e il perché.** 🛑 **`Sheet.tsx` non è stato toccato** — è un componente di sistema, il
difetto vale per **ogni** foglio a passi, e la correzione è un mandato suo: **riferita** (⑨), non fatta di
nascosto. ✅ **La via locale c'è, perché il difetto si manifesta**: un titolo fuori schermo su un foglio che
cambia argomento è chi legge che non sa più dove si trova, e su una superficie nuova non si consegna un
difetto misurato sapendo di averlo visto. Un'àncora invisibile in cima ai figli del foglio, e da lei
`closest('[role="dialog"]')` → `scrollTop = 0`.
🔑 **`role="dialog"` e non `.ds-sheet`**: è la marca comune ai **due** rami del componente — quello animato
e `SheetRidotto`, che a movimento ridotto è codice diverso (§8.4). **E non `scrollIntoView`**, che scorre
anche gli antenati.
**Dopo:** `scrollTop` **0** e titolo **dentro** il pannello, in tutte e quattro le combinazioni provate.
⚠️ Il giorno in cui `Sheet` azzererà da sé, quelle righe diventano innocue e si togliono con la correzione.

---

## ③ L'ordine fra invio e registrazione, e il caso peggiore

**L'ordine: prima si apre WhatsApp, poi si registra — nello stesso gesto.**

**Perché non il contrario.** Per registrare prima bisognerebbe aspettare la rotta (`await`) e **poi** aprire
il collegamento: cioè aprire una finestra **fuori dal gesto dell'utente**, che è il caso che i browser
bloccano. Qui il tasto verde resta un `<a target="_blank" rel="noopener">`: **lo apre il browser**, dentro
il gesto, e non può essere bloccato. La registrazione parte nello stesso `click`, senza attese davanti.

**Il caso peggiore — scelto, non scoperto: il messaggio parte e la rotta fallisce.**
- Il promemoria **resta aperto**. È la direzione **recuperabile**, e questa è la ragione dell'ordine più che
  il popup: se registrassimo prima e il messaggio non partisse, in banca dati resterebbe
  `comunicato_dall_app` per un messaggio mai uscito — e la rotta risponde **409** a un secondo aggiornamento
  (`route.ts:390-392`), perché uno stato «annullato» **non esiste per progetto** (Task 1: «*un avviso nasce
  da un fatto*»). Il promemoria sarebbe spento su un fatto falso, **senza strada di ritorno**.
- Il foglio **lo dice per intero**: «*Il messaggio è partito, ma non l'ho scritto*», col messaggio della
  rotta **così com'è scritto** (mai sostituito con un «qualcosa è andato storto»: quello del server dice
  cosa fare), più la riga che è vera su tutti i rami — «*il promemoria resta acceso*».
- **Non si rimanda:** al posto del tasto verde compare una registrazione che **non riapre WhatsApp**.
- 🔴 **E il testo diventa di sola lettura.** È il pezzo che sarebbe stato facile perdere: il testo mandato si
  mette da parte **al tocco** e si registra **quello**, non ciò che il campo mostra dopo. Lasciandolo
  modificabile, il ricupero registrerebbe una stringa **diversa da quella che il dentista ha ricevuto** — su
  un registro che esiste per provare cosa gli è stato comunicato.
- **La rete assente** si racconta allo stesso modo, e lo prova una prova sua.

**⚖️ D331 — quel che resta scritto è un'autodichiarazione, in entrambe le strade.** L'app non può sapere se
il messaggio è davvero partito, e nessun testo del foglio fa credere il contrario.

**La conferma che rilegge: accolta, e in due punti.** ✅ Il passo «a voce» rilegge **prima** che cosa
resterà scritto (lavoro · studio · come · quando); il passo finale rilegge **ciò che è rimasto scritto**,
letto dalla **riga che la rotta restituisce** — stato e istante — e non da una previsione locale.
🛑 **Nel passo «a voce» non c'è un orologio, ed è una scelta:** il momento lo scrive la rotta, e mostrarne
uno prima della scrittura sarebbe una promessa su un valore non ancora preso. L'ora esatta compare **dopo**.
Se la rotta non manda l'istante, la riuscita si rilegge **senza orologio** invece che con uno inventato.

**L'«Annulla breve»: scartato, e queste sono le ragioni.**
1. **Non c'è niente con cui annullare.** `avvisi_dentista` non ha uno stato «annullato» — è una decisione
   ratificata del Task 1 — e la rotta rifiuta con **409** un secondo aggiornamento. Un annullo vuol dire
   **una migration e un contratto nuovo**: entrambi esplicitamente fuori da questo mandato.
2. **Annullare renderebbe il registro più falso, non più vero.** Sulla strada di WhatsApp il messaggio è già
   uscito; su quella a voce la telefonata c'è stata. Cancellare la registrazione di una comunicazione ex
   **Art. 19 GDPR** che, per dichiarazione della persona, è avvenuta, non è una via di fuga: è una perdita.
3. **La via di fuga che L6 chiede esiste, ed è PRIMA della scrittura, visibile senza scorrere:** «Chiudi» su
   ogni passo, «‹ Torna alla scelta» sui due passi intermedi, e **il secondo tocco su entrambe le strade**.

🔑 **E quel secondo tocco è anche il modo in cui D335 resta in piedi.** La parità delle due strade non è
solo la tinta delle righe: **è il numero di tocchi**. Una strada da un tocco e una da due non sono pari — la
corta diventa la strada che si prende, ed è esattamente il difetto per cui la A1 è stata scartata. Per
questo «a voce» **non scrive al tocco della riga**: entrambe le righe portano il gallone `›`, che in questo
sistema vuol dire «entra» (§4.4), e ognuna apre il suo passo. Il tocco in più non è attrito buttato: è
l'unico posto in cui la persona **legge** che cosa resterà scritto prima che ci resti.

---

## ④ Da dove arriva il nome del laboratorio — censito

**Il componente non lo legge: lo riceve.** È un componente client, quindi non può interrogare né il contesto
né il database; e ⚖️ **D345** ha deciso che la firma è **un dato passato**, non una costante
(`src/lib/messaggi/firma.ts`).

`provato:` `grep -rn "nomeLaboratorio" src/` e `grep -rn "labNome" src/` → in casa esistono **due** vie, e
**nessuna delle due va inventata di nuovo**:

| via | chi la usa oggi | forma |
|---|---|---|
| **il contesto della sessione** | `scadenzario/page.tsx:29`, `scadenzario/[cliente_id]/page.tsx:69`, `(app)/layout.tsx:83`, `tutto-il-resto/page.tsx:33` | `context.lab?.nome ?? null` da `getLabContext()` (`lab-context.ts:19` — `lab.nome` è `string`, e `lab` è `null` solo per `admin_sistema`) |
| **l'incastro sul lavoro** | `src/lib/consegna/orchestrate.ts:33-38` (`nomeLaboratorioDa`) | `lavoro.laboratorio.nome`, con la difesa array-vs-oggetto dell'embed PostgREST |

🔑 **Sulla scheda del lavoro — dove il Task 6 monterà questo foglio — ci sono ENTRAMBE, già lette:**
`src/app/(app)/lavori/[id]/page.tsx:38` chiede **`laboratorio:laboratori(nome, telefono)`** nella sua query,
e la riga **17** ha già `const context = await getLabContext()`. Il tipo lo conferma:
`LavoroDettaglio.laboratorio: Pick<Laboratorio,'nome'|'telefono'> | null` (`src/types/domain.ts:568`).

➡️ **Come propongo di portarlo, al Task 6:** `nomeLaboratorio={lavoro.laboratorio?.nome ?? null}` —
l'incastro **già presente nella query di quella pagina**, che è anche la strada che `orchestrate.ts` ha
scelto per la consegna. Motivo della preferenza sul contesto: il nome viaggia **con la stessa lettura** dei
sei altri valori che la scheda mostra, come già fa il gettone di concorrenza del foglio gemello — una
lettura sola, nessuna seconda verità.
🛑 **Nessuna seconda via di lettura è stata inventata**, e il caso «nome assente» **non è deciso qui**: lo
decide `firmaMessaggio`, in un posto solo — la riga della firma **non esiste** invece di diventare
`— undefined` o «UÀ Lab». Provato: `⑮` in `tests/unit/AvvisoDentista.test.tsx`.

**Il contratto completo dei props** (per il Task 6): `lavoroId` · `avvisoId` · `numeroLavoro` · `nomeStudio`
· `pazienteMostrato` · `portalToken` (`clienti.portale_token`) · `nomeLaboratorio` · `telefonoStudio`
(`clienti.telefono`). Tutti già presenti nella query di quella pagina (`cliente:clienti(*)`), tranne
`avvisoId`, che viene da `avvisiDaComunicare()` — il Task 6.

---

## ⑤ `N su M` e le forme d'input (R-P4)

**Il primo rosso non provava niente**, ed è il caso che R-P4 nomina: `npx vitest run` sul solo file →
«*Cannot find module @/components/features/lavori/scheda-v3/AvvisoDentista*», **0 prove eseguite**.
Messo un **abbozzo inerte** (`<div />` e `quandoLeggibile` che torna sempre `null`):

> ### **38 su 40** asserzioni si accendono.

Le **2** che passano, passano **a vuoto**, e vale dirlo: ① «*nessun colore né durata scritti a mano nel
sorgente*» — un file inerte non ha hex; ② «*un valore che non è un istante torna `null`*» — l'abbozzo torna
`null` sempre. Nessuna delle due è una prova sul comportamento vero.

**Le forme d'input, enumerate PRIMA delle asserzioni** (le forme di un componente sono i suoi props e le
risposte che gli tornano da fuori):

| forma | coperta |
|---|---|
| `portalToken` vuoto | ✅ nessun collegamento morto nel testo **e** la nota lo dice |
| `nomeLaboratorio` `null` | ✅ nessuna firma finta, nessun `undefined`, nessun «UÀ Lab» |
| `telefonoStudio` `null` | ✅ `wa.me/?text=…` senza cifre **e** la nota lo dice |
| testo svuotato dall'utente (`''` / `'   '`) | ✅ tasto verde assente, tasto spento con la ragione, **nessuna registrazione** |
| testo oltre il tetto della rotta | ✅ `maxLength` 1000 — il rifiuto non arriva **dopo** che il messaggio è partito |
| corpo per `a_voce` **senza** `testo` | ✅ chiavi esatte `['avviso_id','come']`, e `'testo' in corpo === false` |
| corpo per `dall_app` | ✅ chiavi esatte `['avviso_id','come','testo']`, e il testo è quello **modificato** |
| doppio tocco | ✅ **una** registrazione sola |
| rotta `!ok` dopo l'invio | ✅ riquadro, ricupero che non rimanda, testo in sola lettura |
| `fetch` che lancia (rete assente) | ✅ stesso racconto |
| risposta `ok` **senza** `avviso`/`comunicato_at` | ✅ si rilegge senza orologio, mai `undefined` |
| risposta `ok` con uno **stato fuori vocabolario** | ✅ `Record` chiuso sui due stati: la frase perde il pezzo invece di stamparne uno vuoto |
| **409 «già comunicato»** | ⚠️ **coperta a metà, e dichiarato:** il messaggio della rotta si mostra così com'è (provato sul ramo `!ok` generico), ma **non c'è un ramo dedicato** che dica «era già stato segnato da qualcun altro» e chiuda il foglio. Motivo: distinguere quel caso vuol dire leggere lo **stato** dal corpo di un errore, che la rotta non manda (manda solo `error`). Riferito |
| corpo non-JSON dalla rotta | ✅ `messaggioDiErrore` ripiega sul messaggio di casa (idioma del gemello) |
| **il corpo giudicato col contratto VIVO della rotta** | ❌ **non coperta, con motivo:** confrontare le chiavi con `CHIAVI_AMMESSE` della rotta vorrebbe dire **esportarla**, cioè toccare `route.ts` — fuori dal mandato (nessuna rotta). Le prove fissano **l'insieme esatto** delle chiavi, che è la forma falsificabile più vicina. Il giro col contratto vero è il **Task 10**, che il piano dedica proprio a questo |

---

## ⑥ I contrasti misurati (3 viewport × 2 temi) e i difetti ereditati

Sonda sul **DOM vivo** — ogni nodo con testo proprio dentro il foglio, colore e fondo **risolti** da
`getComputedStyle`, formula WCAG 2.1, soglia 4,5 (3,0 per il testo grande: ≥ 24 px, o ≥ 18,66 px con peso
≥ 700). Dettaglio, tabelle e scatti: `docs/design/screenshots/2026-08-09-avviso-dentista/MISURE.md`.

| | esito |
|---|---|
| schermate sondate | **42** (7 passi × 390 · 768 · 1280 × chiaro · scuro) |
| **testi sotto soglia** | **0 su 42** |
| peggiore in chiaro | **4,11** contro soglia **3** (bianco 21/800 sul gradiente del `TastoPrimario`, §5.1 ratificato) |
| peggiore in scuro | **3,52** contro soglia **3** (lo stesso testo) |
| peggiore fra i testi a soglia 4,5 | **4,58** (bianco 17,5/800 sullo stop chiaro del verde WhatsApp `#208650`, §3.3.4 ratificato) |
| movimento ridotto (`SheetRidotto`, ramo diverso) | **0 sotto soglia** — peggiori **4,66** chiaro · **6,07** scuro |
| sbordatura orizzontale | **nessuna** a 390 · 768 · 1280 · 195 (`scrollWidth == innerWidth`) |
| text-zoom 200% (195×422) | nessuna funzione persa: il campo **scorre al proprio interno** invece di tagliare |

⚠️ **Il primo giro della sonda ha dato 15 falsi positivi, e la correzione è mia:** leggeva solo
`background-color`, che su un tasto a gradiente è `transparent`, quindi risaliva al pannello e misurava
«bianco su carta» = **1,01**. La sonda giusta legge **gli stop del gradiente** e giudica sul **peggiore**.
Un difetto della misura, non del foglio — ed è la ragione per cui «misurato» senza dire **come** non vale.

### 🔴 Due testi erano davvero sotto soglia, ed erano MIEI — corretti

Il riquadro d'esito era stato scritto copiando la forma del foglio gemello (`DevoIntervenire.tsx:2037-2045`,
`Esito`), che colora il **titolo** col colore del tono a **16 px/700**. A quella misura la soglia è **4,5**
e non 3 — «testo grande» comincia a 18,66 px:

| coppia | misurato | soglia |
|---|---|---|
| `--green` su `--green-tint`, chiaro | **4,50** (esatto **4,499**) | 4,5 ❌ |
| `--red` sul red-tint composto, scuro `rgb(64,33,30)` | **4,09** | 4,5 ❌ |

✅ Il titolo passa a `--ink`: **15,53 · 15,44 · 15,35** in chiaro, **11,42 · 12,49 · 11,19** in scuro.
Su L3 non si perde niente — il significato stava nelle **parole** del titolo, la tinta resta seconda fonte.

### I difetti EREDITATI, con la misura su questa superficie (⚖️ D349)

| difetto | dove compare qui | misura |
|---|---|---|
| **`TastoPrimario.tsx:90`** — faccia spenta | il tasto «Mandalo su WhatsApp» **spento** a messaggio vuoto | faccia `--bg-deep` contro pannello `--card`: **1,15:1 in scuro** · **1,23:1 in chiaro**. Il tasto non si stacca dal pannello |
| **`TastoPrimario.tsx:91`** — testo spento | l'etichetta dello stesso tasto | `--faint` su `--bg-deep` = **4,17:1**. A 21/800 è testo grande, soglia 3 → **passa** come 1.4.3, ma è **lo stesso 4,17** che D349 cita |
| **`Campo.tsx:28`** — didascalia del campo | la label «IL MESSAGGIO CHE MANDERAI» | `--faint` su `--card` = **5,14 chiaro** · **5,28 scuro** → **NON si manifesta**. Quel 4,17 è `--faint` su `--fondo-superficie`, e questa label sta sul pannello `--card` |
| **⚖️ D330 ❌1**, deferito da Francesco | il campo del messaggio e le due righe della scelta | `--fondo-superficie` contro `--card` = **1,23:1 in chiaro**, con `--filo-superficie` = `transparent`: nessun confine visibile. **Non è un difetto nuovo di questo foglio** |

🛑 **Nessuno dei quattro toccato:** stanno in `src/components/ds/` e in `ds-v3.css`, e la migrazione è **per
route, mai per componente** (v3 §14).
🔑 **E il tasto spento è sulla mia superficie per una scelta mia, quindi va detto:** compare perché a
messaggio vuoto **non** si mostra il collegamento verde. Un collegamento su un testo vuoto aprirebbe
WhatsApp con un messaggio vuoto **e** farebbe rispondere 422 alla rotta — il peggio su due assi. La forma
è quella già in casa alla consegna (⚖️ D183): quando l'invio non è possibile, **un tasto che spiega**, non
un collegamento.

---

## ⑦ I numeri

| | |
|---|---|
| `VERIFY_EXIT` | **0** (`npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — da variabile, mai dietro una pipe) |
| prove **prima** | **5833 passate \| 119 saltate su 464 file** (`455 passed \| 9 skipped`) — rimisurato, coincide col numero del mandato |
| prove **dopo** | **5887 passate \| 119 saltate su 465 file** (`456 passed \| 9 skipped`) |
| differenza | **+54 prove** (41 sul foglio, 13 sul campo), **+1 file** |
| guardie | tutte verdi: DS compliance · CSRF · reduced-motion · coerenza documenti · salvataggio installato · progetti Playwright |

⚠️ **Il primo `verify:full` è uscito 2, e non per il codice:** `.next/dev/types/validator.ts` conteneva
ancora il riferimento al banco di prova cancellato (`error TS2307`). Tolta la cartella `.next/dev`,
`npx tsc --noEmit` → `TSC_EXIT=0`. Vale saperlo: **cancellare una rotta lascia i tipi generati indietro**, e
il rosso che ne esce sembra un errore di codice.

---

## ⑧ Ciò che resta `non provato`, col motivo

1. **Il giro sul banco vero, dalla riemissione al promemoria chiuso.** Il foglio **non è montato su nessuna
   superficie** (lo monta il Task 6) e non esiste una fixture con un avviso `da_comunicare`. Le prove sono
   sul componente; la rotta ha le sue (`tests/unit/api-avviso.test.ts`); **nessuno dei due prova la
   coppia**. È il Task 10, e il piano lo dice.
2. **Il corpo giudicato col contratto vivo della rotta** — v. ⑤, ultima riga: richiederebbe di toccare
   `route.ts`.
3. **Il ramo dedicato al 409 «già comunicato»** — v. ⑤.
4. **Che il collegamento `wa.me` apra davvero WhatsApp**, e che il messaggio arrivi. Non è provabile da
   nessuna parte, ed è **il punto di ⚖️ D331**: ciò che resta scritto è un'autodichiarazione. In jsdom
   l'apertura si vede solo come «*Not implemented: navigation to another Document*»; sul banco il
   collegamento è stato **premuto** (la registrazione parte, provata negli scatti `06-non-registrato`), ma
   nessun ambiente di prova apre WhatsApp.
5. **Il tocco su un telefono vero.** Il giro è su Chromium con viewport emulati: la parte che non si misura
   così è il **tatto** — `vibra('medium')` esiste solo su Android, e `suona('tap')` vuole lo sblocco
   dell'audio al primo `touchend`.
6. **Il gate estetico L2 (FASE 9b, D245)**: **dovuto**, ma a fine ondata e prima del merge — è il Task 10.
   La FASE 9 è stata fatta per intero.
7. **`admin_sistema`**: la rotta lo esclude per nome (⚖️ D342) ma il foglio **non** conosce i ruoli. La
   visibilità è del Task 6 («la visibilità è un sottoinsieme del permesso»): se quel task montasse la riga
   senza filtro, un ruolo escluso vedrebbe un promemoria che prende **403**. **Riferito**, non risolto qui.

---

## ⑨ Ritrovamenti fuori mandato — riferiti, nessuno corretto di nascosto (R-E2)

1. **🔴 `src/components/ds/Sheet.tsx` non azzera mai lo scorrimento al cambio di contenuto.** Misurato:
   `scrollTop` 712 → **216** col titolo del passo nuovo a **−150 px** (390 a zoom 200%). Vale per **ogni**
   foglio a passi, compreso `DevoIntervenire`. Nel mio foglio c'è una via locale; **la correzione è lì**.
2. **🔴 `DevoIntervenire.tsx:2037-2045` (`Esito`) ha lo stesso difetto di contrasto che ho corretto nel
   mio.** Titolo 16/700 col colore del tono: `--green` su `--green-tint` chiaro = **4,499** ·
   `--red` sul red-tint composto scuro = **4,09**, contro una soglia di **4,5**. La correzione è di una
   riga (`color: 'var(--ink)'`), ma è **un altro mandato**.
3. **`TastoWhatsApp` (§5.29) non ha modo di far osservare il tocco:** nessun `onClick`. Il tocco qui si
   osserva da un **contenitore** che gli sta intorno — funziona e si prova, ma è implicito. La lacuna sta
   nel componente e nella spec, e chiuderla tocca un componente **in produzione** nel flusso di consegna.
4. **`FrameConsegnato.tsx:132-137` porta un commento FALSO.** Dice che `TastoWhatsApp` «*rifiuta comunque un
   waUrl del genere*» per `https://wa.me/?text=…`. `provato:`
   `'https://wa.me/?text=abc'.startsWith('https://wa.me/')` → **`true`**: il componente lo **accetta**. Il
   ramo si comporta bene (mostra un `TastoPrimario` che chiede il cellulare, ⚖️ D183), ma la ragione scritta
   è sbagliata — e un commento sbagliato viene **citato**.
5. **§2.1 e il nome del paziente: qui ci sarebbe una TERZA deroga, e non l'ho istituita.** Il mockup
   approvato mostra «ROSSI MARIO» nel foglio, e la nota del mockup dice «*il nome compare solo nel foglio,
   che è per l'odontotecnico*». Ma §2.1 elenca **due** deroghe in vigore (D8 targa cassette · D7 ricerca nel
   wizard) e dice che ogni altra vuole una «*deroga esplicita, datata e motivata di Francesco*». Il
   componente **rende ciò che il chiamante gli passa** (`pazienteMostrato`, lo stesso valore che la scheda
   sta già mostrando dietro il foglio) e non decide niente. **Domanda per Francesco: terza deroga
   dichiarata, o si passa il codice `PZ-…`?** 🛑 In ogni caso il **messaggio** è al sicuro per costruzione:
   la firma di `buildAvvisoMessage` non ha un parametro capace di portare un nome.
6. **Due doppioni dichiarati, entrambi già noti:** il tetto del testo (**1000**) è scritto anche qui perché
   `LIMITE_TESTO` non è esportato dalla rotta; e `NEXT_PUBLIC_APP_URL` resta con le sue **otto** copie (già
   riferito dal Task 3, ancora aperto).

📌 **Non trattati come difetti, ma dichiarati:** il campo multilinea **non è nel catalogo** (v. ①); la
strada ricca «il cellulare manca → chiedilo» (⚖️ D183) qui non c'è, perché vuole una scrittura
sull'anagrafica; e **BP-1** (memoria + roadmap) è la FASE 11 del piano, cioè il Task 10 — questo resoconto
non la esegue.

---

## ⑩ Il salvataggio

`git status` **prima** di salvare, e `git add <percorsi>` — mai `-A` (⚖️ D318). Il banco di prova
(`src/app/ds-v3-catalogo/banco-avviso-t5/page.tsx`) è stato **cancellato prima** del salvataggio: gli spike
non si committano (R-P1). Gli script della sonda restano in `scripts/tmp/`, cartella **ignorata da git**.

| file | cosa |
|---|---|
| `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` | 🆕 il foglio, tre passi |
| `tests/unit/AvvisoDentista.test.tsx` | 🆕 41 prove |
| `src/components/ds/Campo.tsx` | `CampoTestoLungo`, il primo campo multilinea del design system |
| `tests/unit/ds-v3/componenti/campo.test.tsx` | 13 prove sul campo nuovo |
| `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` | emendamento a §5.27 (§13.1 p.3) |
| `docs/design/screenshots/2026-08-09-avviso-dentista/` | 60 scatti + `MISURE.md` |

**Hash del salvataggio: `48e014ae`** — `feat(avvisi): il foglio dell'avviso al dentista (variante A2) e il
primo campo multilinea del DS`.

🔴 **Una correzione a me stesso, e va scritta per intero perché è la classe di errore peggiore.** Questa riga
portava `f7b6c1e`: un hash **che avevo scritto prima di fare il commit**, cioè un numero inventato con la
forma di una misura. L'hash vero, letto con `git rev-parse --short HEAD` **dopo** il salvataggio, è
**`48e014ae`**. La correzione di questa riga vive in un secondo salvataggio, minuscolo, perché il resoconto
era dentro il primo e un hash non può contenere se stesso.
🛑 Niente `push`, niente `main`, niente worktree.
