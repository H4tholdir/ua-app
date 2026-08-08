# RESOCONTO — Task D-ter: i quattro rilievi della revisione del Task D

**Ramo:** `intervento-post-consegna` · **Data:** 08/08/2026
**Brief:** `.superpowers/sdd/atto-unico-task-d-ter-brief.md`
**Nasce da:** `.superpowers/sdd/atto-unico-task-d-review.md` (APPROVATO CON RILIEVI, 0 critici, 4 importanti)

| cosa | esito |
|---|---|
| Le cinque mutazioni del revisore | **5 su 5 si accendono adesso** (prima: 5 su 5 verdi) |
| Mutazioni totali fatte da me | **11**, e **11 accendono** — nessuna prova nuova è decorazione |
| Prove | **5659 passate · 68 saltate · 454 file** (base: 5649 \| 68 su 454) → **+10** |
| FASE 7 | **VERIFY_EXIT=0** |
| Rilievi chiusi | **① ② ③ ④** — tutti e quattro |
| Difetti trovati nel brief | **2** (uno è la premessa su cui poggia il rilievo ③) |
| Ritrovamenti fuori mandato | **3**, riferiti e non corretti |
| FASE 9 · gate L2 · guardia overlay | **NON fatti** — sono il Task D-bis |

---

## 1. L'ENUMERAZIONE DELLE FORME D'INPUT (R-P4) — tutte e sei le voci

🔑 **L'elenco si fa PRIMA delle asserzioni, ed è il passaggio che il Task D ha
saltato:** il suo conteggio («21 su 21») misurava la **forza** delle prove
scritte, mai la loro **copertura**. Mettendo in fila le forme, il buco si vede
da solo — e ne ha aperta una in più di quelle che il brief nominava (l'ultima
riga di `richiedente_nome`).

### ① `richiedente_nome` — testo libero

| forma | esito |
|---|---|
| **quella giusta:** `string` non vuota, così com'è digitata | ✅ *«più voci corrette insieme viaggiano nella STESSA chiamata»* — asserisce `richiedente_nome: 'Dott.ssa Anna Neri'` nel corpo |
| svuotata, o soli spazi | ✅ **NUOVA** *«nemmeno la descrizione si può svuotare»* — è lo **stesso ramo** di `perche()`: i due `case` cadono insieme (`DevoIntervenire.tsx:1398-1400`) |
| rimessa al valore di prima | ✅ *«una riga rimessa al valore di prima NON è una correzione»* |
| **il nome MOSTRATO al posto della colonna** | ❌ **non coperta.** Quando `richiedente_nome` è `null` il documento ripiega sul nome del dentista (`generate-ddc.ts:266-274`) e la schermata mostra quello: chi confondesse i due manderebbe il dentista come se fosse una correzione. Oggi non può succedere — `componi()` manda `testo`, che parte da `voci.richiedenteNome ?? ''`, **mai** da `prescrittoreMostrato` — ma **nessuna asserzione lo tiene fermo**. 🔑 È la stessa famiglia di «valore mostrato contro valore da mandare» che ha già colpito due volte in quest'ondata (i denti, e `elementi`): **la dichiaro perché la prossima volta tocca a lei** |

### ② `paziente_id` — identificativo, non nome (⚖️ D320)

| forma | esito |
|---|---|
| **quella giusta:** UUID della persona scelta | ✅ **NUOVA** *«il paziente viaggia come UUID, mai come il nome che si legge a schermo»* — asserisce il valore, la **forma** di UUID, e che non sia l'alias |
| l'alias / il nome mostrato | ✅ stessa prova (`not.toBe('Maria Rossi')`) — ed è **la mutazione n° 1 del revisore** |
| il codice paziente (`PZ-0117`) | ✅ stessa prova: la forma di UUID lo esclude |
| la stessa persona di adesso | ❌ **non coperta.** `perche()` risponde «Scegli una persona diversa da quella di adesso» (`:1402`) e `componi()` rifiuta una seconda volta (`:1366`). La prova esistente sul paziente spegne il tasto perché **nessuno** è stato scelto, che è un caso diverso. Dichiarata |
| nessuno scelto | ✅ dentro *«la riga del paziente NON ha un campo di testo»* |
| studio assente (`clienteId === null`) | ❌ **non coperta** — la riga diventa preclusa con la ragione a schermo (`perchePrecluso`, `:268-270`). Stesso motivo dichiarato dal Task D per `perchePrecluso`: nessun chiamante oggi passa un lavoro senza studio |

### ③ `tipo_dispositivo` — vocabolario chiuso

| forma | esito |
|---|---|
| **quella giusta:** uno slug di `MACRO_SLUGS` | ✅ **NUOVA** *«il tipo di dispositivo viaggia come SLUG del vocabolario, mai come l'etichetta»* — e l'appartenenza si controlla **sull'elenco vero**, non su una stringa ricopiata |
| l'etichetta («Protesi mobile») | ✅ stessa prova (`not.toBe(LABEL_MACRO.protesi_mobile)`) — **mutazione n° 4 del revisore** |
| una stringa qualunque fuori vocabolario | ❌ **non coperta da qui, e non è un buco di questa schermata: è F2.** Il contratto la accetta (`correzioni.ts:75-79`, testo libero) e l'unico argine è la CHECK di banca dati, che scatta **dopo** il render del PDF. La schermata la chiude in pratica offrendo solo pastiglie; il contratto resta aperto ad altri chiamanti — **riferito, non corretto** |
| lo stesso tipo di adesso | ✅ per costruzione in `componi()` (`:1363`), coperto di riflesso dalla prova sul conteggio delle correzioni |

### ④ `descrizione` — testo libero

| forma | esito |
|---|---|
| **quella giusta:** `string` non vuota | ✅ *«il tocco finale sono DUE chiamate in fila»* — `correzioni` deep-equal `{descrizione: '…'}` |
| svuotata, o soli spazi | ✅ **NUOVA** *«nemmeno la descrizione si può svuotare, e il tasto lo dice prima»* |
| rimessa al valore di prima | ✅ *«una riga rimessa al valore di prima NON è una correzione»* |

### ⑤ `denti_coinvolti` — oggetti, non stringhe (difetto ③ del Task B)

| forma | esito |
|---|---|
| **quella giusta:** `DenteNormalizzato[]`, col colore di ogni dente conservato | ✅ *«i denti viaggiano come OGGETTI»* — asserisce anche `scala` e `codice` del dente che resta |
| la lista di stringhe della colonna denormalizzata (`["26"]`) | ✅ stessa prova |
| `{fdi, ruolo}` senza colore | ✅ stessa prova |
| elenco azzerato | ✅ *«nemmeno i denti si possono azzerare»* |
| l'embed non caricato (`denti === null`) | ❌ **non coperta** — riga preclusa con la ragione. Dichiarata dal Task D, confermata qui |

### ⑥ `prescrizione_caratteristiche` — 🔴 la trappola del compito

| forma | esito |
|---|---|
| **quella giusta:** `{elementi?: number[], colore?: string}` con **solo le sotto-chiavi cambiate** | ✅ **NUOVA** *«delle caratteristiche prescritte parte SOLO la sotto-chiave cambiata, e «elementi» sono NUMERI»* — `toEqual({elementi:[26,27]})` sull'**oggetto intero** |
| `elementi` come `string[]` | ✅ stessa prova — **mutazione n° 2 del revisore**, quella su cui il resoconto del Task D aveva speso trecento parole e zero asserzioni |
| l'oggetto **fuso** invece delle sole sotto-chiavi | ✅ stessa prova — **mutazione n° 3 del revisore**: la `toEqual` rifiuta la chiave `colore` in più |
| cambia il solo `colore` → `elementi` viaggia lo stesso | ✅ **NUOVA** *«e cambiando il solo colore, «elementi» NON viaggia affatto»* — è **l'altra direzione**, che il revisore non aveva sondato |
| sotto-chiave svuotata | ✅ *«una caratteristica prescritta non si può svuotare»* |
| `elementi` azzerati | ✅ `perche()` (`:1409`), stessa prova |
| prescrizione assente | ❌ **non coperta** — riga preclusa con la ragione. Dichiarata |

### ⑦ E il corpo dell'EVENTO del percorso nuovo — non è una voce, ed è la peggiore

| forma | esito |
|---|---|
| **quella giusta:** `stato_dispositivo` = la risposta della persona, `motivo` = `errore_dato_dichiarazione` | ✅ **NUOVA** *«sul percorso NUOVO lo stato del manufatto è quello DICHIARATO, mai cablato a «mai uscito»»* |
| `mai_uscito_dal_lab` cablato | ✅ stessa prova — **mutazione n° 5 del revisore**, cioè **il difetto del Task A che rinasce sulla strada nuova** |
| il tocco finale instradato dal percorso corto | ✅ stessa prova: `motivo` si asserisce **insieme**, apposta — senza, un domani si potrebbe far passare questo tocco di là e la prova resterebbe verde mentre la bugia torna |
| `potenziale_di_danno` non mandato | ✅ stessa prova (`toBe('da_valutare')`) |

---

## 2. LE CINQUE MUTAZIONI DEL REVISORE, RIPRODOTTE — prima e adesso

Banco usa-e-getta: `scripts/tmp/muta.mjs` (**non committato**, `scripts/tmp/` è
fuori da git). Sostituisce **una** occorrenza — rifiuta il frammento non unico —
lancia `vitest`, stampa le prove accese, rimette il file e **verifica il
ripristino confrontando col testo salvato** (non con `git`: qui l'albero è
sporco per costruzione).

### Prima — la misura del revisore riprodotta, sul codice di oggi

```
───────── MUTAZIONE: R1-paziente_id-manda-il-nome ─────────
Tests  45 passed (45)
— prove accese — (nessuna)
───────── MUTAZIONE: R2-elementi-come-stringhe ─────────
Tests  45 passed (45)
— prove accese — (nessuna)
───────── MUTAZIONE: R3-manda-l-oggetto-fuso ─────────
Tests  45 passed (45)
— prove accese — (nessuna)
───────── MUTAZIONE: R4-tipo-manda-l-etichetta ─────────
Tests  45 passed (45)
— prove accese — (nessuna)
───────── MUTAZIONE: R5-stato_dispositivo-ricablato ─────────
Tests  45 passed (45)
— prove accese — (nessuna)
```

**5 su 5, zero rossi.** La misura del revisore si riproduce esattamente.

### Adesso — le stesse cinque, sulla rete riparata

| # | mutazione | rossi | prova accesa |
|---|---|---|---|
| R1 | `valore: scelto.id` → `scelto.mostrato` | **1** | *il paziente viaggia come UUID* |
| R2 | `sotto.elementi = […].sort(…)` → `.map(String)` | **1** | *parte SOLO la sotto-chiave cambiata, e «elementi» sono NUMERI* |
| R3 | `valore: sotto` → `valore: fuso` | **2** | *…sotto-chiave cambiata…* · *cambiando il solo colore, «elementi» NON viaggia* |
| R4 | `valore: tipo` → `LABEL_MACRO[tipo]` | **1** | *il tipo viaggia come SLUG del vocabolario* |
| R5 | `depositaEvento(statoDisp)` → `depositaEvento('mai_uscito_dal_lab')` | **1** | *sul percorso NUOVO lo stato è quello DICHIARATO* |

**5 su 5 si accendono, e ognuna accende esattamente ciò che deve.** R3 ne accende
due perché la seconda prova guarda l'altra direzione dello stesso invariante.

---

## 3. LE ALTRE MUTAZIONI — le prove nuove viste diventare rosse

| # | mutazione | rossi | prova accesa |
|---|---|---|---|
| M6 | `ricomincia()` azzera anche `eventoDaRiusare` (= il comportamento di prima) | **1** | *riprendendo dopo il 409 la registrazione si RIUSA* |
| M7 | il riquadro del conflitto non si rende mai (= il vicolo cieco di prima) | **2** | *dopo un 409 c'è una via d'uscita* · *…la registrazione si RIUSA* |
| M8 | tolto `setEventoDaRiusare(null)` dopo la riuscita | **1** | *dopo una riemissione riuscita, un secondo intervento registra un evento NUOVO* |
| M9 | `onSalvato({…patch, …gettone})` → `onSalvato(patchLocale ?? patch)` (= F1) | **1** | *il gettone di concorrenza torna dal SERVER* |
| M10 | il gettone riparsato con `new Date(...).toISOString()` | **1** | *il gettone di concorrenza torna dal SERVER* |
| M11 | il ramo dei testi di `perche()` → sempre `null` | **1** | *nemmeno la descrizione si può svuotare* |

**Totale: 11 mutazioni, 11 accendono.** Nessuna prova nuova è decorazione.

🔑 **M10 merita una riga a parte:** M9 sola avrebbe potuto lasciar passare una
correzione «quasi giusta» — leggere il gettone dal server e poi riparsarlo. Il
valore di prova porta i **microsecondi** apposta (`.654321`), che `Date` di JS
tronca: è la stessa trappola già pagata da `ModificaColoreSheet` e dal Task D.

---

## 4. CHE COSA HO DECISO SUL 409, E PERCHÉ

### La decisione: **l'evento NON si butta** — e la schermata non racconta la causa

🔑 **Perché non si butta.** La riemissione è **una transazione sola**: un suo
fallimento non lascia nessuna dichiarazione annullata da quell'evento — è
proprio quello che la porta d'idempotenza della rotta va a cercare
(`…/riemetti:275-315`), e non lo trova. L'evento invece descrive un fatto
**davvero accaduto**: il motivo, dov'era il manufatto, quando lo si è saputo.
Ripeterlo sarebbe un doppione nel registro di qualità; buttarlo sarebbe
cancellare una registrazione dovuta. ➡️ Si tiene in `eventoDaRiusare`, che è
**l'unica cosa che `ricomincia()` non azzera** — e la riga assente porta il suo
commento, perché una riga che manca non si difende da sola.

**Il ciclo di vita, per intero:** si mette da parte **appena l'evento è scritto
in banca dati** (non solo sul 409: anche un 500, la rete assente o un corpo
illeggibile possono portare la persona a chiudere il foglio, ed è lì che
l'evento si perdeva) · si riusa al tentativo dopo, con `accogliEvento` che ne
rimette anche l'esito proposto nello stato vivo · **si azzera alla riuscita**,
perché da lì in poi un intervento nuovo è un fatto nuovo e vuole la sua riga.

### Che l'evento sopravviva alla chiusura del foglio non è una speranza: sono due fatti

① `errore_dato_dichiarazione` ha **`azione: null`** e `lavoro: 'resta_consegnato'`
(`effetti.ts:112-115`), e la rotta **non tocca `lavori.stato`** (suo cappello,
D299) → dopo il rinfresco il lavoro è ancora `consegnato` e il componente è
ancora montato (`SchedaLavoroV3.tsx:596` — è quella condizione a montarlo).
② Lo stato locale di un componente client **sopravvive** a `router.refresh()`:
è esattamente il motivo per cui `SchedaLavoroV3.tsx:174-190` deve
risincronizzare `lavoroLocale` a mano, «*senza questa sincronizzazione
`lavoroLocale` restava congelato al valore del mount*».

### 🔴 E la parte più delicata: **la schermata NON racconta la causa**

`provato:` la rotta manda **SEI 409 diversi** dallo stesso percorso —
`conflitto` (gettone stantìo, `:394`) · `nessuna_dichiarazione_viva` (`:412`) ·
`evento_gia_consumato` (`:423`) · `gia_superata` (`:427`) · `numero_gia_usato`
(`:432`) · registrazione già usata altrove (`:311`) — e li distingue **solo a
parole**: nel corpo c'è `error` e, a volte, `updated_at`. **Nessun codice
leggibile a macchina.**

➡️ Scrivere qui una causa propria («qualcun altro ha toccato il lavoro»,
«ricarica») vorrebbe dire dirla **falsa su cinque rami su sei** — cioè rifare,
un piano più in là, esattamente l'errore del commento sulle tinte che il
rilievo ② mi manda a correggere. **Il riquadro mostra il messaggio della rotta
com'è scritto** e aggiunge solo ciò che è vero su tutti e sei:

> **Questo tentativo non è riuscito**
> ‹il messaggio della rotta, verbatim›
> Quello che hai segnalato resta registrato: riprendendo da qui non se ne
> registra una seconda.
> [ Ricarica e riprendi ]

«**Questo tentativo**» è scelto apposta: sul ramo `evento_gia_consumato` una
richiesta in corsa *ha* rifatto il documento, e una frase come «il documento non
è stato rifatto» sarebbe falsa lì. La via d'uscita chiude il foglio e rinfresca
la pagina — cioè fa arrivare **valori nuovi e gettone nuovo**, che è ciò che la
rotta chiede.

### 🛑 Che cosa ho deliberatamente NON fatto: adottare il gettone che il 409 restituisce

La risposta 409 di `conflitto` **porta l'`updated_at` fresco** (`:396`).
Adottarlo e riprovare farebbe riuscire il tocco — e sarebbe **la cosa
sbagliata**: la correzione era stata composta su valori che nel frattempo
qualcun altro ha cambiato, e la si scriverebbe sopra **senza che nessuno li
abbia visti**. È esattamente ciò che il controllo di concorrenza esiste per
impedire. Il gettone si rinfresca solo passando dai valori veri, cioè
ricaricando.

### Il limite che dichiaro

Sul ramo «*registrazione già usata per un altro intervento: aprine una nuova*»
(`:311`) il riuso insisterebbe su un evento che la rotta rifiuta. **È
irraggiungibile da questa strada** — quell'evento andrebbe consumato da
`riapri_lavoro_atomica`/`riporta_a_pronto_atomica`, e `errore_dato_dichiarazione`
ha `azione: null`, quindi nessuna delle due parte. Lo scrivo perché il giorno in
cui quel motivo prendesse un'azione automatica, questa riga smette di valere.

---

## 5. F1 CHIUSO, E IL CENSIMENTO DEGLI ALTRI PUNTI DI RATTOPPO

**La correzione, una riga sola, nel punto giusto:** `ModificaRigaSheet.salva`
legge `risposta.lavoro.updated_at` — che la `PATCH` **restituisce già**
(`api/lavori/[id]/route.ts:809`) e che la rotta rileggeva solo per la tinta — e
lo passa nel patch locale. Sta lì e non nel padre perché quella funzione è
«*l'unica via verso il backend, condivisa da tutti i rami*»: una copia per ramo
divergerebbe alla prima revisione. `handleSalvato` fonde con `{...prev,
...patch}` e **non va toccato**. La lettura resta **difensiva** come quella di
D251 sopra: un corpo senza `lavoro` non toglie niente a una scrittura riuscita,
e le prove preesistenti (che fingono `{ok:true}` senza corpo) restano verdi.

**La prova:** *«il gettone di concorrenza torna dal SERVER: onSalvato porta
l'updated_at della risposta (F1)»*, `tests/unit/ModificaRigaSheet.test.tsx`.
Asserisce anche che il **corpo della richiesta non cambia** — il gettone si
legge, non si manda. Mutazioni M9 e M10: entrambe rosse.

### Il censimento (R-P2/R-P6) — gli altri punti che rattoppano lo specchio locale

Il revisore scrive che `lavoro` è «*uno specchio locale rattoppato in cinque
punti*». Li ho aperti tutti e cinque:

| punto | che cosa rattoppa | il gettone? |
|---|---|---|
| `SchedaLavoroV3.tsx:331` | foto eliminata | ✅ **non è un buco.** `provato:` la rotta delle immagini **legge** `lavori` (`.select('stato')`, `immagini/[imgId]/route.ts:198`) e non la aggiorna mai → `lavori.updated_at` non si muove. E chiama comunque `router.refresh()` |
| `:349` | categoria della foto corretta | ✅ idem |
| `:362` | rollback della categoria | ✅ idem |
| `:384` `handleSalvato` | **F1** | 🔧 **chiuso** — a monte, in `ModificaRigaSheet.salva` |
| `:508` `handleColoreSalvato` | colore/tinta | ✅ già giusto: `prossimo.updated_at = esito.updatedAt` — è la ricetta che ho riusato |

**E l'elenco non l'ho deciso io** (R-P2): ho censito **tutte** le rotte sotto
`src/app/api/lavori/` che aggiornano la tabella `lavori`, non i file che qualcuno
nominava. Sono otto: `[id]`, `eventi-qualita`, `segnala`, `segnala/risolvi`,
`lavorazioni`, `prove`, `decisione-fatturazione` e `immagini/[imgId]` — che
però la `lavori` la **legge soltanto** (verificato riga per riga). Delle altre
sette, la sola che alimenta lo specchio locale della scheda è `PATCH
/api/lavori/[id]`, cioè F1. `CardFasiV3` tiene un proprio elenco di fasi e non
tocca `lavoroLocale`.

⚠️ **Una cosa che F1 NON chiude, e la dichiaro:** che `handleSalvato` inoltri
davvero `updated_at` dentro `lavoroLocale` **non è sorvegliato da nessuna
prova**. Oggi lo fa per costruzione (`{...prev, ...patch}`), ma se un domani lì
comparisse un'allowlist il gettone tornerebbe stantìo **in silenzio**, e la
prova di `ModificaRigaSheet` resterebbe verde. Una prova a quel livello
richiederebbe di montare `SchedaLavoroV3` intero e non avrebbe niente di
osservabile da guardare (il gettone non compare nel DOM). **Non coperta, e
dichiarata.**

---

## 6. FASE 7

```
npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"
→ Test Files  448 passed | 6 skipped (454)
→ Tests       5659 passed | 68 skipped (5727)
→ ✓ Compiled successfully · TypeScript · eslint --max-warnings 0 · next build (82/82)
→ ✅ DS compliance · CSRF · reduced-motion · coerenza documenti · salvataggio · progetti Playwright
→ VERIFY_EXIT=0
```

**Base dichiarata: 5649 | 68 su 454 → adesso 5659 | 68 su 454. +10 prove**, i
file restano 454 (le prove nuove stanno nei due file che già esistevano).
📌 L'aspettativa del brief («il numero deve muoversi») è rispettata: il Task D
aveva chiuso a +21 con tre voci scoperte, qui il numero si muove di **dieci**
proprio perché il conteggio non era il problema — la copertura sì.

---

## 7. 🔴 DOVE QUESTO BRIEF SBAGLIA

**① IMPORTANTE — «dopo un fallimento non è stato scritto niente» (§③) è FALSO
come è scritto, ed è la premessa su cui il brief regge il riuso dell'evento.**
Il brief dice: «*dopo un fallimento non è stato scritto niente, quindi riusare
lo stesso evento è legittimo*». `provato:` il commento della rotta, righe
384-390: «*il PDF è già stato reso e caricato, quindi un conflitto lascia dietro
di sé **un file orfano e un numero bruciato***». Scritto qualcosa è stato: fuori
dalla transazione. ➡️ **La conclusione regge, la ragione no** — e la ragione
giusta è più stretta e più utile: non è stata scritta **nessuna dichiarazione
annullata da quell'evento**, ed è precisamente ciò che la porta d'idempotenza va
a cercare. 🔑 **Perché la differenza conta e non è pedanteria:** chi avesse
preso la frase del brief alla lettera avrebbe potuto scrivere a schermo «non è
successo niente» — che è falso, e proprio la cosa che il commento della rotta
mette in guardia dal dire («*chi legge deve sapere che deve rifare il giro con i
valori aggiornati, non che «non è successo niente»*»).

**② MINORE — il brief tratta il 409 come UNO, e sono SEI.** Il §③ parla del 409
al singolare («*qualcuno ha cambiato il lavoro nel frattempo*») e la casella
chiede un messaggio «onesto» che dica «*che i valori che vedeva non sono più
quelli*». Da quel percorso la rotta manda **sei** 409 diversi (§4), e su cinque
di essi quella frase sarebbe falsa. Il brief non lo dice, e seguendolo alla
lettera si scriveva un testo sbagliato in cinque casi su sei. Segnalato perché è
la stessa forma del rilievo ② che mi manda a correggere: **una frase che afferma
più di quanto sia stato verificato**.

**Cercati e NON trovati difetti.** Sul rilievo ① il brief è **esatto in ogni
voce**: le tre scoperte sono davvero quelle tre, `elementi` è davvero `number[]`
(`domain.ts:450`), il difetto del Task A può davvero rinascere sulla strada
nuova, e il conto «tre su sei» torna. Sul rilievo ② i numeri sono giusti e li ho
riverificati sul token (`ds-v3.css:52`). Sul rilievo ④ la ricetta è davvero già
in casa e davvero in `handleColoreSalvato`. Il perimetro dei contratti fermi è
corretto: nessuno di essi andava toccato per chiudere i quattro rilievi.

---

## 8. RITROVAMENTI FUORI MANDATO — riferiti, non corretti (R-E2)

**G1 — 🔴 Un secondo commento che dice il falso, e nello stesso file: la causa
per cui la schermata finale non compariva NON è quella scritta.**
`DevoIntervenire.tsx:457-465` afferma che `router.refresh()` «*fa rirendere il
Server Component: la scheda si ricostruisce e con lei questo componente, che
**perde lo stato locale***». `provato:` è il contrario —
`SchedaLavoroV3.tsx:174-190` esiste **proprio perché** lo stato locale
sopravvive: «*senza questa sincronizzazione `lavoroLocale` restava congelato al
valore del mount*». Un componente che perdesse lo stato non avrebbe bisogno di
quella risincronizzazione. ➡️ La causa vera del difetto misurato il 07/08 è
un'altra, ed è a portata di riga: sul percorso corto l'azione automatica
riporta il lavoro fra i **pronti**, e `SchedaLavoroV3.tsx:596` monta
`DevoIntervenire` **solo se `lavoro.stato === 'consegnato'`** — dopo il
rinfresco il componente **non esiste più**, foglio compreso. 🔑 **La regola
scritta lì resta giusta** (niente rinfresco a foglio aperto) e non l'ho toccata;
è il **meccanismo** a essere sbagliato, ed è un commento che verrà *citato* —
stessa famiglia del rilievo ②. Non l'ho corretto perché il mio mandato nomina
**un** commento, quello sulle tinte, e riscriverne un altro di nascosto è
esattamente ciò che R-E2 vieta. ⚠️ **Ma l'ho dovuto verificare**, perché il
rilievo ③ ci poggia sopra: se quel commento fosse vero, l'evento tenuto da parte
non sopravviverebbe alla chiusura del foglio.

**G2 — 🟠 La rotta `…/riemetti` manda sei 409 diversi e non li distingue in modo
leggibile a macchina.** `:311` · `:394` · `:412` · `:423` · `:427` · `:432`.
Il corpo porta `error` e a volte `updated_at`; nessun codice. ➡️ Il client non
può fare niente di diverso a seconda del caso: **non può riaccendere il tasto
sul `numero_gia_usato`, benché la rotta scriva «riprova, ne verrà preso un
altro»**, né può smettere di riusare l'evento quando la rotta dice «aprine una
nuova». La rotta è un **contratto fermo**: riferito, non toccato. 🔑 Il costo
oggi è contenuto (il messaggio giusto si legge sempre), ma è il genere di cosa
che si paga quando qualcuno vorrà distinguere.

**G3 — 🟡 `var(--bg-deep)` non è solo delle quattro superfici nuove.** Lo usano
anche parti **preesistenti** del file: le righe dei nove motivi (`:768`), i
riquadri della proposta (`:1009`) e il nastro del percorso (`:1155`). Il
revisore l'aveva già detto per due di questi; lo completo. Se il gate L2 del
Task D-bis decidesse per `--elv` sulle quattro nuove, quelle tre **resterebbero
indietro** e la stessa schermata avrebbe due elevazioni diverse per la stessa
cosa. **Non è mio** — è materia del gate, e la palette non è mia.

---

## 9. CHE COSA NON HO FATTO, PER INTERO

- 🛑 **FASE 9 (390/768/1280, chiaro e scuro) e il GATE ESTETICO L2**: sono il
  **Task D-bis**. **Non ho aperto nessuna schermata**, e ogni cosa che dico
  sull'aspetto viene dal codice e dai token, mai da un pixel guardato.
  🔴 **E ho aggiunto io una superficie nuova che quel gate deve vedere:** il
  riquadro del conflitto nel passo delle quattro caselle (`Esito` tono
  «attesa» + `TastoSecondario`, testo visibile nuovo). Sotto **D245 è ASPETTO**,
  quindi **il gate gli è dovuto** — lo scrivo qui perché non ci arrivi
  inosservato. È costruito **solo** con pezzi già in casa (`Esito` del file
  stesso, `TastoSecondario` da `src/components/ds/`), nessuna tinta inventata,
  nessuna animazione inline.
- 🛑 **Non ho lanciato `scripts/guardia-navigazione-overlay.mjs`**, e lo ripeto
  perché è la **terza volta** che compare in un documento senza che nessuno
  l'abbia fatta: né l'esecutore del Task D, né il revisore, né io. Vuole l'app
  accesa, le credenziali del banco e una fixture preparata. Il passo aggiunge
  **due navigazioni da dentro un overlay** (Impostazioni, Anagrafica): la
  guardia **è dovuta**, e appartiene al Task D-bis, che l'app accesa ce l'ha.
- 🛑 **Non ho cambiato le TINTE** delle quattro superfici nuove, benché il
  rilievo ② mi facesse misurare che `--bg-deep` in scuro va nel verso sbagliato.
  Ho corretto **la riga che mente**, non la palette: le tinte sono del gate L2.
  Il confine **non mi è sembrato artificioso** — un commento sbagliato spegne un
  controllo, una tinta sbagliata è ciò che quel controllo deve decidere.
- **Non ho corretto** i tre ritrovamenti del §8, in particolare **G1**, che è un
  commento falso nello stesso file su cui stavo lavorando: R-E2 vieta la
  correzione silenziosa, e il mio mandato nomina **un** commento.
- **Non ho toccato** nessuno dei contratti fermi: `correzioni.ts`, la rotta
  `…/riemetti`, la RPC, `generate-ddc.ts`, `precheck.ts`,
  `PATCH /api/pazienti/[id]`. Né il percorso di `errore_registrazione` (Task A),
  né gli altri otto motivi, né l'elenco delle voci correggibili.
- **Non ho adottato il gettone che il 409 restituisce** (§4): farebbe riuscire
  il tocco scrivendo sopra valori che nessuno ha visto.
- **Non ho aggiunto prove** per le sei forme dichiarate «non coperta» al §1:
  ognuna porta la sua ragione, e la più fastidiosa — il ripiego del prescrittore
  — la segnalo come **la prossima candidata**, non come una cosa chiusa.
- **Non ho aggiornato `memory/MEMORY.md` né la roadmap** (BP-1): è chiusura
  d'ondata, non di questo compito.
- **Non ho pubblicato niente**: nessun `git push`, nessun merge. E `scripts/tmp/`
  resta fuori dal salvataggio.
