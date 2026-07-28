# Panel di validazione del piano ondata (b) — verbale dei rilievi

**Data:** 29 luglio 2026 · **Richiesto da:** Francesco («nella nuova sessione facciamo controllare da advisor
specializzati il piano da eseguire e tutti i passaggi successivi», 28/07, chiusura) · **Regola:** Regola
Advisor (`CLAUDE.md` §0C)
**Oggetto:** `docs/roadmap/2026-07-28-ondata-b-piano.md` (20 task, percorso GRANDE)
**Esito:** 🛑 **il piano NON si esegue nella forma attuale.** 29 rilievi, di cui **6 bloccanti**;
**15 affermazioni del piano verificate false**, 9 delle quali riverificate a mano dall'orchestratore.

> **Mandato dato ai revisori:** *cercare dove il piano sbaglia*, con divieto esplicito di riportare i sette
> buchi che il §9 del piano già dichiara. Ogni rilievo qui sotto è quindi **fuori** da ciò che il piano
> sapeva di non sapere.

**Composizione:** 4 revisori di lente (architettura · sicurezza · banca dati/API · esperienza d'uso) +
3 lettori sugli 11 file dichiarati `NON letto`. **File aperti: ~70**, con citazione `file:riga` obbligatoria.
**Database toccato in sola lettura**; baseline riverificata a fine sessione: **294 · 0 · 916 · 48**.

---

## 1. Il verdetto in una riga

Il piano sbagliava soprattutto **dove si sentiva sicuro**: le quattro cose che dichiarava provate o
acquisite — la sonda P1, il censimento dei token, il drift `bite_splint`, la citazione che fa da àncora a
tutto il §4 — **sono tutte e quattro difettose**. I sette buchi che il §9 dichiarava restano, ma non sono
il problema principale: un buco dichiarato si chiude, una certezza sbagliata no.

---

## 2. I bloccanti — non si parte senza aver deciso questi sei

### B-1 · L'indice unico crea un vicolo cieco al banco, e nessun task lo raccoglie
*(4 revisori su 7, indipendentemente)*

`api/pazienti/route.ts:155-160` traduce **qualunque** errore di inserimento in un `500` generico;
`crea-lavoro.ts:233` lo trasforma in `ESITO_BLOCCANTE`; `WizardNuovoLavoro.tsx:382-384` mostra
«Non sono riuscita a creare il lavoro. Riprova.». Ma `stato.pz` **conserva il codice che ha appena fatto
collisione** (`:258`, `pz: s.pz || dati.prossimoPz` non sovrascrive mai): **riprovare riproduce l'errore
all'infinito** finché l'addetta non ricarica la pagina.

🔑 E non serve nessuna simultaneità: il codice si calcola **una volta sola al caricamento della pagina**
(`(app)/lavori/nuovo/page.tsx:23` → `dati-wizard.ts:44-51`, `MAX()+1`), e resta fermo nella bozza per 24 h.
Due addette a mezz'ora di distanza ricevono lo stesso `PZ-####`. **Basta anche una persona sola:** tornando
al passo 1 e cambiando dentista, la ricerca del riuso è filtrata per `cliente_id` (`crea-lavoro.ts:209,214`)
e non trova il paziente → ricrea lo stesso codice sotto l'altro studio.

**Il modello esiste già in casa, in 9 route** che gestiscono `23505` esplicitamente (`api/ordini`,
`api/cicli`, `api/magazzino`, `api/admin/labs`, `api/qualita/psur`, `api/stripe/webhook`,
`api/fatture/batch`, `api/lavori/[id]/prove`, `api/auth/webauthn/register/verify`). `api/pazienti` è
**l'unica porta che scrive un codice unico e non ce l'ha**.

➡️ **Un task nuovo fra T4 e T5**: `23505` → `409` con codice di dominio (senza far uscire il nome del
vincolo — G9 regge già, verificato), il wizard distingue «codice occupato» da «guasto», e offre l'unica
azione che può funzionare (riusare il paziente, o rigenerare il codice). `B3` acquista il caso concorrente.
⚠️ **Precedente in casa da valutare per la generazione:** `genera_progressivo` (`schema.sql:93-119`) — che
nel proprio commento dichiara «`MAX()` richiede una SELECT separata → **finestra race condition anche con
lock**», cioè la diagnosi già ratificata qui per lavori/fatture/DdC. Ma la sua chiave è `(lab, tipo, anno)`
e un codice paziente non è annuale: **la semantica va decisa prima di riusarla**.

### B-2 · Il momento in cui il lavoro nasce non è deciso, e due task adiacenti dicono il contrario
*(2 revisori)*

T14 (`piano:213`): «**Le foto restano in memoria fino alla creazione**» → il lavoro nasce **dopo** il passo
foto. T15 (`piano:215`): «**il lavoro entra subito**» nella cassetta → al passo cassetta il lavoro **esiste
già**. I due passi sono consecutivi (spec §8:310). Oggi la creazione è **un punto solo**
(`WizardNuovoLavoro.tsx:362-364`, dichiarato «l'unico punto, nessuna scorciatoia lo bypassa`) e sta al
passo 3. Con sette passi va spostato — e **nessuna riga del piano lo dice**.

➡️ Il piano dichiara il momento della creazione **prima del Blocco 6**, con la conseguenza su T14 (memoria)
e T15 (D30), e T18 lo nomina come proprio invariante.

### B-3 · `cosaSiPerde` non può esprimere il secondo dei due casi che la spec ratifica

La firma proposta è `cosaSiPerde(tipoVecchio, tipoNuovo, stato)` (`piano:173`): **non vede il dentista**.
Ma D17 mette **due** perdite nella stessa riga di comportamento, e la seconda è il cambio di studio
(`pazienti.cliente_id` NOT NULL). Infatti T18 (`piano:220`) elenca «rilascio del paziente al cambio di
dentista» come **voce separata** dall'avviso: la seconda lista a mano che T3 diceva di voler evitare
**è già nel piano**, due pagine dopo.

Conseguenza: si cambia studio, il paziente ritrovato viene sganciato **senza avviso** — cioè la variante
(b) «svuotare in silenzio» che D17 ha scartato per nome. E `B12` resterebbe verde mentre `B13` fallisce.

➡️ Firma su **due stati**, non due tipi: `cosaSiPerde(precedente, successivo)`, più **una sola tabella
«passo → dato che porta»** dichiarata in T3 (dove si può provare), non riscritta in T18.

### B-4 · L'uscita con conferma naviga da dentro un overlay v3 — e l'attrezzo per farlo non esiste

T9 mette in un gesto solo `DialogConferma` + `azzeraStato()` + uscita. `CLAUDE.md` §9 vieta `router.push`
nudo «da un handler che chiude un overlay nello stesso gesto», perché «il back partiva per primo, il
popstate cancellava il push e **il tasto primario si comportava come un annulla**»
(`storia-overlay.ts:41-53`). Ma l'unico strumento sanzionato, `useNavigaDaOverlay.ts:36-49`, prende **un
href** e fa `router.replace` — mentre D18 + la direttiva del 22/07 vogliono `router.back()`.
**Per questa combinazione non c'è oggi un attrezzo in casa**, e il piano non se ne accorge.

Al banco: si preme ✕, si conferma, **lo stato viene azzerato e non si va da nessuna parte**. Il gesto
distrugge e non porta via.

➡️ T9 dichiara la sequenza di history, **o** si apre una variante `back` di `useNavigaDaOverlay`.
⚠️ E la guardia che lo controllerebbe (`scripts/guardia-navigazione-overlay.mjs`) **è manuale** e non
compare in nessun task: entra in T20.

### B-5 · Non esiste uno staging: la migration di T4 vale per la produzione, che non avrà la gestione dell'errore

🔍 **Verificato a mano, non dedotto.** `deploy.yml` fa **tre cose sole**: `npm ci`, deploy su Vercel,
controllo di salute — nessuno step di migration. `ci.yml` ha come unica riga Supabase un **URL segnaposto**.
`package.json` non ha nessun comando di migration (11 script, tutti build/test/seed). `vercel.json` porta
solo la regione. **Non esiste `supabase/config.toml`**, quindi nessun `supabase link`. ➡️ **Le migration si
applicano a mano**, contro l'unico progetto esistente (`iagibumwjstnveqpjbwq`) — lo stesso su cui P1/P2
hanno letto i 916 pazienti. **La branch non isola il database.**

Conseguenza: nel momento in cui T4 gira (Blocco 2), l'indice vale anche per il codice di `main` in
produzione, dove **nessuno dei Blocchi 3-6 esiste** — cioè la produzione eredita il vincolo senza la sua
gestione (B-1). E «rollback = revert del commit» **non annulla nulla**: l'indice resta finché qualcuno non
lancia il `DROP` a mano.

➡️ La gestione del `23505` si deploya su `main` **prima** che T4 giri. Il rollback si scrive come comando
col nome esatto dell'indice e chi lo lancia, non come categoria.

### B-6 · La cancellazione di un'immagine impugna la maniglia sbagliata, e non ha né soggetto né finestra

Il bucket `documenti` è **privato**: `lavori_immagini.url` è un `getPublicUrl` **morto**
(`lib/storage/upload.ts:31,107`), e le foto si vedono solo perché una pagina server le **rifirma** a ogni
render (`(app)/lavori/[id]/modifica/page.tsx:86-87`). Il contratto è scritto nel codice, verbatim
(`FotoStrip.tsx:4-7`): «`url` è SEMPRE una signed URL generata server-side al render — mai `storage_path`
né il valore `getPublicUrl` persistito». **`storage_path` è l'unica maniglia vera, e oggi nessuno la legge
fuori da quella pagina.**

Ne segue che **la sonda P5 come è formulata misura il bucket, non il codice**, e che T14 (galleria +
ingranditore) ha bisogno di una via di firma che il piano non nomina mai.
🛑 **Da vietare per iscritto prima che venga in mente a qualcuno:** rendere pubblico il bucket per far
funzionare le anteprime = fotografie cliniche di pazienti esposte senza autenticazione.

Sul `DELETE` stesso: la rotta usa `getServiceClient()` (`immagini/[imgId]/route.ts:32`), quindi **la RLS è
integralmente aggirata** e gli `.eq()` espliciti sono l'unico controllo. Il modello che il piano indica
(`:36-44`) è il **pre-controllo** a tre filtri; la mutazione fratella (`:68-74`) ne riporta **due**. Un
esecutore può in buona fede «ricalcare `:36-44`» e scrivere una cancellazione che attraversa i laboratori.

➡️ I **tre** `.eq()` sulla `delete()` stessa + `.select()` per contare le righe toccate.
➡️ **Domanda aperta nuova, ortogonale alla §9.4** (che chiede soft-o-hard): **chi** può cancellare, e
**fino a quando**? Oggi nessuna rotta immagini guarda né il ruolo né `lavori.stato`: `tecnico` e
`front_desk` cancellano le foto di un lavoro già consegnato e fatturato, con DdC emessa.

---

## 3. Gli importanti

| # | rilievo | prova |
|---|---|---|
| I-1 | **Il cognome dei pazienti del wizard È il codice.** `risolviNomePaziente:68` → `if (codice) return { cognome: codice }`. La ricerca per cognome **non li troverà mai**, e la riga di suggerimento mostrerebbe il codice due volte. La guardia esiste in casa in due copie (`cognomeEffettivo`, `derivaAlias`) e **né T5 né T12 la usano** | `domain/nome-paziente-scrittura.ts:55-91` · `parco-shared.ts:69-75` |
| I-2 | **Tre definizioni incompatibili di «paziente vivo»**: la rotta filtra `archiviato`, il generatore filtra `deleted_at`, l'indice di T4 **nessuno dei due**. Il precedente in casa dice che l'indice unico deve **rispecchiare il predicato del pre-check** | `api/pazienti/route.ts:33-34` · `dati-wizard.ts:128` · `migrations/20260707204322_…:1-16` |
| I-3 | **P1 ha provato il caso banalmente rifiutato.** R-P1 chiede un valore che **DEVE** essere rifiutato: `pz-0042` e ` PZ-0042` **non lo sono** (si scrive grezzo, si confronta con `===`). Il precedente in casa normalizza: `(laboratorio_id, lower(btrim(nome)))` | `api/pazienti/route.ts:110,139` · `crea-lavoro.ts:214` · `migrations/20260721090000_parete_cassette.sql:67-68` |
| I-4 | **T7 non compila da solo**: `persistenza.ts:17-18` tipa per derivazione da `StatoWizard`, e i campi nuovi non esistono ancora. Lo scrittore e il lettore veri stanno in `WizardNuovoLavoro.tsx:161-173` e `:178-192`, **file che T7 non nomina** | R-P2 violata dentro il piano |
| I-5 | **Salvare il NOME del passo, non l'indice.** L'indice si riferisce a una sequenza calcolata da flag in un file di **codice**; la finestra di ripresa è 24 h, più lunga di un ciclo di deploy. Un flag corretto nel frattempo e la bozza riapre sul passo sbagliato coi dati giusti — nessun errore, nessun test rosso | `persistenza.ts:69` guarda solo `parsed.v` |
| I-6 | **La cassetta creata sopravvive all'abbandono, e il testo di conferma dichiara il contrario**: «Il lavoro non è ancora stato creato: **nel gestionale non resta niente**». Ma `POST /api/cassette` è una scrittura vera. ⚠️ «Nessun tetto al numero di cassette» è **NON VERIFICATO oltre `…090300:175`**: il revisore ha letto fin lì e lo dichiara | mockup testata `:709-711` · `piano §2:37-38` |
| I-7 | **`cassettaId` non è nella bozza `v:2`**: il censimento lo aggiunge a `StatoWizard` (`piano:111`), la forma salvata (spec §7:293-295) non lo porta, e a differenza della `foto` **non c'è la ragione scritta**. È il principio del §4 violato dal §4 | |
| I-8 | **Le briciole troncano per costruzione.** `max-width:150px` + `ellipsis` **incondizionato**; ~15 etichette su 38 superano i 17 caratteri, fra cui `Duplicato protesi` — **uno dei tre casi di prova canonici**. La sonda esistente gira su 6 nomi corti (max 11 caratteri). ⚠️ **Il tetto CSS e le lunghezze delle etichette sono FATTI LETTI; la conversione caratteri→pixel è una STIMA, da misurare a schermo** — il taglio è quasi certo, il *quante* no. ⚠️ `labelTipo()` per `anti_russamento` restituisce **«Anti- russamento»** (fatto letto) | mockup testata `:116-122,1119` · `tipi-lavoro.ts:74-76` |
| I-9 | **`role="img"` rende le briciole invisibili alla voce sintetica.** Spec §3:78-80 impone «una sola informazione, non un elenco»; D17 le rende toccabili e D32 fa del contatore un bersaglio. **Le due decisioni ratificate si contraddicono.** E il contatore è **34 px**, sotto il minimo di 44 | mockup `:201-207` |
| I-10 | **Il contatore va in una direzione sola**: dopo N tocchi sparisce e non resta nessun bersaglio per tornare alle scelte recenti. `utenteHaScorso` non si riazzera mai, e nel wizard (a differenza del mockup) **l'elenco cresce a ogni passo**. `B17` prova solo il verso indietro | mockup `:1243,1293-1316` |
| I-11 | **Tre cose rimandate «al piano» dalle fonti ratificate, e mai raccolte:** ① il **gesto indietro di sistema** al passo 1 chiede la stessa conferma? (spec §3.2:136-138) ② i suggerimenti **non devono far ballare «Continua»** (D9) ③ il modo di **disfare** «paziente ritrovato» (spec §5:199-200) | |
| I-12 | **D7 non ha un task che riscriva la regola del DS** (§2.1:58 e la lista anti-pattern `:511`). T10 tocca solo §5.15 e §5.32. Una regola che nessuno può applicare smette di essere consultata — e riscritta senza perimetro può essere letta come licenza anche per i **canali in uscita**, dove il vincolo GDPR morde davvero | `lavori/[id]/route.ts:252-253` è il precedente che resta |
| I-13 | **Il finto navigatore dei test crea una spia nuova a ogni chiamata** su `back` — cioè **B15 nasce morta**. E il ramo `passo - 1` **non ha oggi nessuna copertura**: l'unico test sul back imbocca l'altro ramo | `WizardNuovoLavoro.test.tsx:10` · `WizardNuovoLavoro.tsx:226` |
| I-14 | **Il test sulla versione della bozza va CAPOVOLTO, non aggiornato**: usa `v: 2` come valore invalido — proprio quello che sta per diventare valido | `wizard-persistenza.test.ts:63-66` |
| I-15 | **Cancellare i due componenti tocca 17 file**, non «componenti + test»: fra cui un conteggio duro (`toHaveLength(22)` → 20) e **una guardia di regressione da salvare** (verifica che `ProgressDotsStanze`, rimosso mesi fa, non ritorni): cancellando il file muore anche lei | `catalogo.test.tsx:108-131` · `ProgressDots.test.tsx:112-118` |
| I-16 | **La proiezione grassa resta viva**: T5 la restringe solo quando `q` è presente, e **l'unico chiamante è il wizard, che chiama senza `q`**. Codice fiscale, data di nascita, sesso e note di fino a 500 pazienti continuano ad arrivare al browser a ogni creazione di lavoro | `api/pazienti/route.ts:30-37` · `crea-lavoro.ts:209` |
| I-17 | **L'avviso «codice già in uso» divulga nomi che la portata dichiarata nasconde**: l'unicità è **di laboratorio** (D15), la ricerca è **di studio** (D11). L'avviso nominerebbe una paziente di un altro studio | spec §6:271-272 |
| I-18 | **Manca `pgrestQuote`**, e `%`/`_` restano metacaratteri: `q=%` restituisce l'anagrafica intera. Il file non è nemmeno nell'elenco dei letti né dei non letti | precedente: `api/clienti/route.ts:39-40` · `lib/utils/escape-postgrest.ts:12` |
| I-19 | **P6 misura dove il costo non può discriminare**: a 916/294 righe ogni variante torna sotto il millisecondo. La domanda vera è la **forma**, e non c'è nessun precedente di aggregazione PostgREST in `src/` | l'unico conteggio è `count:'exact', head:true` |
| I-20 | **La FASE 6b citata da T4 è troncata**: ne ha **tre** righe, e quella che salta è la verifica che la migration non rompa le RLS | `CLAUDE.md` §0C |

---

## 4. Le quindici affermazioni verificate FALSE

Nove riverificate a mano dall'orchestratore (marcate 🔍).

| # | il piano/la spec dice | la verità |
|---|---|---|
| 1 | «proiezione a 7 campi» (`piano §3`) | 🔍 **12 colonne**, fra cui `laboratorio_id`, `cliente_id`, `archiviato` |
| 2 | il filtro `archiviato` è a `:33` | 🔍 è a **`:34`** (a `:33` c'è `laboratorio_id`) |
| 3 | «`laboratorio_id` e `cliente_id` non si toccano: **sono l'isolamento**» | 🔍 `cliente_id` è **condizionale** (`if (cliente_id)`): l'isolamento è il solo `laboratorio_id` |
| 4 | «una sola funzione per due domande» (T3) | smentita dal piano stesso a T18, due pagine dopo |
| 5 | «il `DELETE` è **l'unica** azione distruttiva nuova» (§2.4) | anche `POST /api/cassette` (T15), che il §2 elenca fra le scritture nuove |
| 6 | `api/lavori/[id]/route.ts:259-264` = lo scarto silenzioso delle chiavi | 🔍 a quelle righe c'è il **`catch` di `notificaAssegnazione`**. Il ciclo vero è a **`:373-378`**, l'allowlist a `:178-213`. ⚠️ Citazione **ripetuta in spec §3.1 e verbale D17**, e il file **non è né fra i letti né fra i non letti** |
| 7 | «`coreografie` in `motion.ts:56`» | 🔍 `coreografie` comincia a **`:68`**; a `:56` c'è il commento di `cssEase.pillVoce`. **Nessuna chiave di `coreografie` diventa orfana**: i due orfani veri sono `cssEase.pillVoce` (`:60`) e **`cssEase.dots` (`:64`), che il piano non nomina affatto** |
| 8 | «le regole `.ds-pillvoce`/`.ds-dots` in `ds-v3.css`» | 🔍 **non esistono, zero occorrenze.** Lo stile vero è inline dentro `PillVoce.tsx:151-192` e muore col file |
| 9 | «nessuna CHECK a DB contiene `bite_splint`» — drift noto, ereditato e promosso a fatto dal piano | 🔍 **IL DRIFT NON ESISTE.** Interrogato il catalogo vivo: `lavori_tipo_dispositivo_check` **contiene `bite_splint`**. La migration `20260712230000` **è stata applicata**; il commento di `tipi-lavoro.ts:12-15` è **falso** |
| 10 | «10 file `NON letto`» (handoff, memoria, preambolo del piano) | 🔍 sono **11** (12 percorsi meno `tipi-lavoro.ts`, già letto) |
| 11 | **P1 ✅ PROVATA** | prova il duplicato **byte-identico**, cioè il caso banale. `pz-0042` e ` PZ-0042` **non sono rifiutati** |
| 12 | «FASE 6b: `gen types` + `tsc --noEmit`» | ne ha **tre**: manca la verifica RLS |
| 13 | T8: «Regole non negoziabili, **tutte già provate nel mockup**» | metà delle regole vive del mockup mancano da T8 (verso avanti del contatore, riazzeramento, rimbalzo D32) |
| 14 | B16: «il mockup lo prova già» | la CSS ratificata **tronca per costruzione**; la prova non ha mai visto un nome lungo |
| 15 | spec §14.1: «`pazienti` è già protetta da RLS» | vero della **policy**, falso di **questa rotta**: usa `getServiceClient()`, che **aggira la RLS**. Vale identico per le tre rotte immagini e per `POST /api/cassette` |

---

## 5. Le domande aperte del §9 — due si chiudono qui

### ✅ Domanda 3 — la chiave di `localStorage` **NON si rinomina**. Chiusa, con la prova.
`CHIAVE_WIZARD = 'ua:wizard-lavoro:v1'` (`persistenza.ts:26`) porta «v1» nel nome, **ma tutti i test la
leggono dalla costante**. Rinominandola in `…:v2` **nessun test se ne accorgerebbe**: le bozze `v:1`
resterebbero orfane per sempre (nessuno le scade più, perché `leggiStato` esce prima di guardare la data),
e ogni `expect(getItem(CHIAVE_WIZARD)).toBeNull()` passerebbe **a vuoto**, controllando la casella
sbagliata. ➡️ **Il nome resta**, e T7 rimuove esplicitamente la chiave sul mismatch di versione (difetto P4).

### ✅ Domanda «gate T16/T17» — parzialmente sciolta: **le tre superfici senza mockup ne hanno uno**
La spec §15 marca 🛑 **manca** per passo foto, passo cassetta e avviso codice. **È superata dai fatti:**
i mockup esistono (`…-wizard-passo-foto-e-cassetta.html`, `…-wizard-avviso-codice-gia-in-uso.html`) e le
varianti sono state **ratificate la sera stessa** (D23, D24, D25). ➡️ **La spec §15 va aggiornata**, o un
esecutore si fermerà a un gate che non esiste più. Restano dietro gate **solo** denti e colore (D14).

### 🔴 Restano aperte, e vanno a panel
1. **`DELETE` soft o hard** (§9.4) — panel normativo, invariato.
2. **🆕 CHI può cancellare un'immagine, e FINO A QUANDO** — ortogonale alla precedente, v. B-6.
3. **🆕 Il predicato dell'indice**: riusare il codice di un paziente archiviato è una decisione **normativa**
   (`schema.sql:478-480`, Art. 10(8) MDR, dieci anni), non un dettaglio tecnico. Stesso panel della 1.
4. **🆕 La normalizzazione del codice**: `lower(btrim(...))` come fa la parete, o grezzo? (v. I-3)
5. **Tetto delle foto su device vero** (§9.5) — invariato, non blocca la partenza.

---

## 5-bis. 🆕 SONDA P1-bis — eseguita il 29/07, e chiude la domanda sulla normalizzazione

**Perché:** il panel ha rilevato che P1 provava il duplicato **byte-identico**, cioè il caso banalmente
rifiutato, mentre R-P1 chiede **un valore che DEVE essere rifiutato**. Le forme vere che un'addetta può
digitare a mano nella casella «Codice paziente» sono `pz-0042` e ` PZ-0042`.

`provato: node scripts/tmp/sonda-p1-bis-normalizzazione.mjs` — **una transazione con `ROLLBACK`, su tabelle
temporanee `ON COMMIT DROP`**. 🛑 **Lo script NON è nel repo** (`scripts/tmp/` è ignorato per convenzione, e
R-P1 dice che gli spike sono usa e getta): **la prova è l'output incollato qui sotto**, non il file.
Output reale:

| caso | **A** — indice come nel piano | **B** — indice normalizzato (`lower(btrim(...))`) |
|---|---|---|
| ① `PZ-0042` (primo) | PASSA | PASSA |
| ② `PZ-0042` duplicato identico — *ciò che P1 provava* | **RIFIUTATO** | **RIFIUTATO** |
| ③ 🔴 `pz-0042` minuscolo | **PASSA** ❌ | **RIFIUTATO** ✅ |
| ④ 🔴 ` PZ-0042` spazio davanti | **PASSA** ❌ | **RIFIUTATO** ✅ |
| ⑤ 🔴 `PZ-0042 ` spazio in coda | **PASSA** ❌ | **RIFIUTATO** ✅ |
| ⑥ controllo positivo — altro laboratorio, stesso codice | PASSA ✅ | PASSA ✅ |
| ⑦⑧ due `NULL` (l'indice è **parziale**) | PASSANO ✅ | PASSANO ✅ |

🔑 **Conclusione secca: l'indice come lo propone il piano NON impedisce il doppione**, perché la casella è
modificabile a mano (D12/D20 lo dichiarano a schermo: «puoi cambiarlo»). La forma **B** lo impedisce e
**non rompe il controllo positivo**: due laboratori diversi restano liberi.
⚠️ **La trappola da non sbagliare:** normalizzare **nell'indice** senza normalizzare **in scrittura** rende
il vincolo più forte della lettura che lo precede — il pre-controllo dice «libero» e l'inserimento fallisce.
Il precedente della parete cassette va letto proprio su questo punto. ➡️ **è nel mandato dell'advisor di
banca dati** (panel normativo in corso).

**Nessuna traccia lasciata:** `tabelle_sonda: 0`, baseline riverificata **294 · 0 · 916 · 48**.

### 🔴 E la sonda ha scoperto una cosa che nessuno aveva guardato: le forme dei codici veri

```
senza_codice: 1 · fuori dal formato PZ-####: 911 · con spazi: 0 · con minuscole: 0 · totale: 916
coppie che SOLO la normalizzazione rifiuterebbe: 0   (la migration non aborta in nessuna delle due forme)
```

**Solo 4 codici su 915 hanno la forma che UÀ genera.** Gli altri **911** sono `PAZ/2026/NNNN` — cioè
esattamente il formato che il commento di `schema.sql:461` descrive («Codice assegnato **dallo studio**,
es. "PAZ-001"»), quello che **D15 ha dichiarato non esistere**.

E la distribuzione dice che **le due forme non si mescolano dentro un laboratorio**:

| laboratorio | forma UÀ (`PZ-####`) | forma studio (`PAZ/…`) | totale |
|---|---|---|---|
| `314cd040…` | 0 | **911** | 911 |
| `971061a1…` (lab di prova storico) | **4** | 0 | 4 |
| `00000000-…-0001` | 0 | 0 | 1 (senza codice) |

**Come va letto — con onestà, perché è materiale di prova, non di produzione.** Questi sono **dati di
test** destinati alla pulizia (`CLAUDE.md` §8), e le 911 righe sono un **caricamento in blocco** in un
laboratorio che nessuno usa dal wizard. Quindi **D15 non è smentita**: dentro il laboratorio che usa il
wizard il formato è coerente, e **nessuna delle due forme di indice aborterebbe la migration** (0 coppie).

🔑 **Ciò che invece conta, e vale anche dopo la pulizia:** `calcolaProssimoPz` fa `MAX+1` **contando solo
i codici che combaciano con `^PZ-(\d+)$`** (`dati-wizard.ts:44-51`). In un laboratorio con 911 codici di
un altro formato **restituirebbe `PZ-0001`** — cioè aprirebbe una **seconda numerazione parallela** dentro
un archivio che ne ha già una, senza che niente lo segnali. Non è una collisione: è peggio, perché non fa
rumore. ➡️ Da nominare nel piano riscritto quando si tocca il generatore (bloccante B-1).

---

## 5-ter. 🆕 PANEL NORMATIVO — parere GDPR e autorizzazione (29/07)

**Domanda:** chi può cancellare una fotografia di un lavoro, e fino a quando?

### ✅ Raccomandazione, in tre righe
1. **CHI: gli stessi ruoli che possono caricarla. Nessun gate di ruolo nuovo.** Motivo che decide, e non è
   un'opinione: **la consegna — cioè l'atto che emette la Dichiarazione di Conformità — non ha gate di
   ruolo**, ed è una **decisione esplicita e ratificata** di Francesco (`docs/design/decisions/2026-07-16-ondata-fondamenta-4b-consegna.md:15`,
   D-3, ratificata su segnalazione appsec). Mettere `titolare`-only sulla cancellazione di uno scatto
   renderebbe **più difficile cancellare una foto che emettere una DdC**.
2. **FINO A QUANDO: finché `lavori.stato != 'consegnato'`.** Il confine **coincide** con la direttiva del
   27/07 («fino alla consegna»): **nessuna contraddizione da dichiarare**. E la via di ritorno **esiste
   già**: `annulla-consegna` riporta il lavoro a `pronto` e riapre la finestra da sé — niente secondo
   cancello a 10 minuti (quella è la finestra per *disfare la consegna*, un'altra cosa).
3. **FUORI FINESTRA: `409` con codice + bottone disabilitato CON la spiegazione visibile**, mai nascosto —
   nascondere fa sembrare modificabile un lavoro con DdC emessa. **Cancellazione = soft-delete su
   `deleted_at`**, mai rimozione da Storage.

### 🔴 LA CONDIZIONE BLOCCANTE — oggi il soft-delete sarebbe un colpo a vuoto
🔍 **Riverificato a mano.** `lavori_immagini.deleted_at` **esiste** (catalogo vivo). Ma **otto** punti di
lettura fanno `immagini:lavori_immagini(*)` **senza escludere le righe cancellate** — contati, sono
esattamente otto:
`(app)/lavori/[id]/page.tsx:30` · `(app)/lavori/[id]/modifica/page.tsx:51` · `api/lavori/[id]/route.ts:302` ·
`api/fatture/batch/route.ts:179` · `api/fatture/[id]/xml/route.ts:163` ·
`lib/pdf/generate-ricevuta-consegna.ts:21` · `lib/pdf/generate-etichetta.ts:37` · `lib/pdf/generate-ifu.ts:21`
⚠️ Il `.is('deleted_at', null)` di `page.tsx:38` filtra la **radice `lavori`**, non l'innesto.
➡️ **Senza toccare tutti e otto, il `DELETE` risponde 200 e la foto resta visibile ovunque.** Il task T6 non
è «una rotta»: è **una rotta più otto letture**, e la sintassi del filtro sugli innesti PostgREST **va
verificata sito per sito** (l'innesto normale e `!inner` non si comportano uguale).

### 🔴 Il «10 anni sulle foto» NON regge — e ribalta l'onere
L'**Allegato XIII p.2** MDR richiede documentazione che permetta di comprendere progetto, fabbricazione e
prestazioni, e **non enumera fotografie**; il termine di Art. 10(8) è agganciato **alla Dichiarazione e
alla documentazione tecnica**. E la prova in casa converge: **nessun template PDF renderizza
`lavori_immagini`** — `DdcTemplate.tsx` usa immagini solo per logo (`:301`) e firma (`:498`).
La riga di `ANALISI/17:818` («nessun dato del paziente può essere cancellato prima di 10 anni») **si
autoqualifica «regola pratica per UÀ»**: applicata alle fotografie è **NON VERIFICATA**.
🔑 **Conseguenza:** Art. 5(1)(e) e 5(1)(c) GDPR spingono nella direzione **opposta** — tenere dati Art. 9
per dieci anni **senza base giuridica dimostrata è esso stesso il rischio**. ➡️ Il confine post-consegna si
motiva come **integrità del documento** (un lavoro con DdC non cambia in silenzio, cambia per la via
documentata), **mai** come obbligo di conservazione.
Fonti: [Allegato XIII](https://www.medical-device-regulation.eu/2019/08/14/annex-xiii/) ·
[MDR EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32017R0745)

### Le foto SONO dati sanitari, e la richiesta del paziente NON arriva a noi
**Art. 4(15)** + **Considerando 35** («informazioni derivate dall'**esame di una parte del corpo**») →
impronta, foto intraorale e radiografia sono dati **Art. 9**.
Ma il laboratorio è **responsabile**, non titolare (`DpaTemplate.tsx:3,120,127`): **Art. 17 è indirizzato al
titolare**, e le **linee guida EDPB 07/2020 §132** dicono che la valutazione di ammissibilità **spetta al
titolare**. ➡️ **Per l'interfaccia:** il bottone si chiama **«Elimina foto»** — mai «diritto all'oblio», mai
«richiesta del paziente». UÀ **non deve** offrire al laboratorio una funzione «cancellazione GDPR»: lo
spingerebbe verso l'**Art. 28(10)**, cioè a **diventare titolare** per quel trattamento.
Fonti: [Art. 4](https://gdpr-info.eu/art-4-gdpr/) · [Cons. 35](https://gdpr-info.eu/recitals/no-35/) ·
[Art. 9](https://gdpr-info.eu/art-9-gdpr/) · [Art. 17](https://gdpr-info.eu/art-17-gdpr/) ·
[Art. 28](https://gdpr-info.eu/art-28-gdpr/) ·
[EDPB 07/2020](https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf)

### ⚠️ Non esiste un modello di autorizzazione in casa — chi scrive questa rotta STA DECIDENDO
Tre famiglie incompatibili, senza criterio dichiarato: `titolare|admin_rete` (archiviazione paziente,
listino, magazzino) · `titolare|front_desk` (annullo pagamento, rimborso credito) · **nessun gate**
(cassette, cicli, **consegna**, **annullo consegna**, **nota di credito TD04**).
E **`lavori/[id]` non ha nessun `DELETE`**: il precedente «chi cancella un lavoro» **non esiste**.

### 🆕 Ritrovamenti fuori mandato di questo parere
1. 🔴 **`lavori_immagini.tipo` è una colonna morta.** L'allowlist PATCH la include
   (`immagini/[imgId]/route.ts:10`) ma il POST la scrive **fissa** (`immagini/route.ts:110`, `tipo:'foto'`),
   e la categoria vera vive in **`descrizione`** (`TabImmagini.tsx:236,253`). 🔍 **Riverificato sul dato
   vivo: tutte le righe hanno `tipo='foto'`**, con `descrizione` che vale `altro`/`impronta`/`prescrizione`.
   ➡️ Una futura regola di conservazione **per categoria** costruita su `tipo` leggerebbe `'foto'` anche per
   una radiografia. E la retention differenziata è quindi **tecnicamente impossibile oggi**.
2. **Nessun audit delle cancellazioni.** `lib/portale/audit.ts` traccia solo gli accessi **del dentista** al
   portale. `ANALISI/17:920` afferma «i log di accesso ai dati paziente sono registrati immutabilmente»:
   per le immagini **non è vero**.
3. **Il canale per una richiesta Art. 17 inoltrata dal dentista non esiste nel prodotto**, mentre il DPA lo
   promette (`DpaTemplate.tsx:168`). Impegno contrattuale scoperto — non una violazione, ma un vuoto.
4. **Divergenza interna sugli impiantabili:** `ANALISI/17:174` dice «vita del dispositivo + 10 anni», la
   fonte primaria dice **almeno 15**; `ANALISI/17:149` cita correttamente i 15. Riferito.

---

## 5-quater. 🆕 PANEL NORMATIVO — parere tecnico sulla forma dell'indice (29/07)

### ✅ A — NORMALIZZARE: sì, con l'espressione già in casa
**Chiave: `(laboratorio_id, lower(btrim(codice_paziente)))`**, e il `btrim` applicato **anche in scrittura**,
come fa la parete cassette. Concorda con la sonda P1-bis (§5-bis): senza, `pz-0042` e ` PZ-0042` passano.

**Perché serve, in una riga:** il codice è **generato E digitato a mano**, e le strade a mano sono **due** —
la casella del wizard (`PassoPaziente.tsx:76` → `Campo.tsx:85`, che passa il valore **grezzo**, nessun
`trim`, nessun `toUpperCase`) e la scheda paziente (`PazienteEditSheet.tsx:182-184` → `PATCH`, dove
`codice_paziente` è il **primo** nome dell'allowlist). ⚠️ E la **dettatura** scrive sulla stessa casella
(`PassoPaziente.tsx:55-57`): la forma di ciò che il riconoscimento vocale restituisce **non è sotto
controllo**.

### 🔴 Il difetto che si morde la coda: il generatore è CASE-SENSITIVE
`dati-wizard.ts:128` filtra con `.like('codice_paziente', 'PZ-%')` — in Postgres **case-sensitive** — e
`:47` con `/^PZ-(\d+)$/`, anch'essa. **Concretamente:** qualcuno scrive `pz-0043`; quel codice **sfugge a
entrambi i filtri**; il massimo resta 42; **il wizard propone `PZ-0043`** — che in spazio normalizzato è
**già occupato**. ➡️ **L'indice rifiuterebbe la proposta che il wizard stesso ha appena fatto.**
Cura: `.ilike` + `/^PZ-(\d+)$/i`.

### 🔑 Il precedente giusto NON è la parete cassette — e questo cambia il task
**La parete non allinea il pre-check all'indice: lo ELIMINA.** Usa `ON CONFLICT (laboratorio_id,
lower(btrim(nome))) WHERE deleted_at IS NULL DO UPDATE` dentro una RPC (`…090000:270-271`), con
`EXCEPTION WHEN unique_violation` sulla rinomina (`:403-404`) → 409 di dominio (`cassette/route.ts:64-66`).
🛑 **`pazienti` non può copiarlo:** scrive via supabase-js (`route.ts:149-153`), e l'`onConflict` di
PostgREST accetta **solo nomi di colonna** — `lower(btrim(...))` non è esprimibile senza una RPC.
➡️ **Quindi `pazienti` ricade sotto l'ALTRO precedente**, quello della partita IVA
(`20260707204322_…:1-16`: «indice UNIQUE parziale che **rispecchia esattamente il predicato del pre-check
applicativo**»). E ne discendono **due requisiti duri, non preferenze**: (a) il predicato dell'indice
**deve** essere quello del pre-check, alla lettera; (b) il `23505` **deve** essere mappato su un 409 di
dominio, perché **senza `ON CONFLICT` la corsa fra due richieste concorrenti resta aperta** e il backstop
è l'unica difesa. ✅ Conferma indipendente del bloccante **B-1**.

### B — LE DUE FORME (la scelta è normativa, non tecnica)

**Forma 1 — «il codice resta impegnato per sempre»**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS pazienti_codice_lab_uidx
  ON pazienti (laboratorio_id, lower(btrim(codice_paziente)))
  WHERE codice_paziente IS NOT NULL AND btrim(codice_paziente) <> '';
```
*Costo:* un codice archiviato non torna più disponibile, mai. Il pre-check **non deve** filtrare
`archiviato` — e quello di oggi lo filtra (`api/pazienti/route.ts:34`), quindi la lettura nuova deve
espressamente **non** applicarlo. *Guadagno:* nessuna ambiguità nell'archivio decennale.

**Forma 2 — «il codice torna disponibile dopo l'archiviazione»**
```sql
CREATE UNIQUE INDEX IF NOT EXISTS pazienti_codice_lab_attivi_uidx
  ON pazienti (laboratorio_id, lower(btrim(codice_paziente)))
  WHERE archiviato = false
    AND codice_paziente IS NOT NULL AND btrim(codice_paziente) <> '';
```
*Costo:* **lo stesso codice punta a due persone diverse in due momenti diversi**, e tutto ciò che stampa il
solo codice diventa ambiguo a distanza di anni — `EtichettaTemplate.tsx:128`, `IFUTemplate.tsx:171`,
`RicevutaConsegnaTemplate.tsx:187`, e soprattutto `generate-ddc.ts:93`, che **congela** il nome nella
Dichiarazione. *Guadagno:* combacia già col pre-check esistente e con la semantica del soft-delete.

### 🔑 `deleted_at` NON entra in nessuna delle due forme — ed è una trappola
Censimento: **3 letture su `archiviato`** (`api/pazienti/route.ts:34`, `(app)/pazienti/page.tsx:38`,
`api/pazienti/[id]/route.ts:181`) contro **1 sola su `deleted_at`** (`dati-wizard.ts:128`). Su `pazienti`
**`deleted_at` è vestigiale: nessuno la scrive** — il soft delete scrive `archiviato` (`[id]/route.ts:191`)
e la purga fa un `DELETE` fisico.
⚠️ **Ma i tre indici già esistenti portano tutti `WHERE deleted_at IS NULL`.** Chi copiasse la convenzione
degli indici scriverebbe un predicato che **non rispecchia nessun pre-check esistente**.

### ✅ Un cambiamento che si può fare SUBITO, indipendente dalla decisione normativa
> **Si toglie `.is('deleted_at', null)` da `dati-wizard.ts:128` e NON lo si sostituisce con `archiviato`.**

Motivo: il generatore **non è un controllo di unicità** — propone un numero fresco. Essere *più*
conservativi dell'indice è sempre sicuro; esserlo *meno* rompe. E sotto la Forma 2, un generatore che
filtrasse `archiviato = false` **proporrebbe da solo** un codice ancora in mano a un archiviato: il costo
che dovrebbe pagarlo solo chi digita a mano una scelta deliberata si pagherebbe **automaticamente, a ogni
giro del wizard dopo la prima archiviazione**.

### 🔴 Quattro prerequisiti che scattano COMUNQUE, qualunque forma si scelga
1. **Il pre-check guarda un solo dentista, l'indice guarda tutto il laboratorio.** `crea-lavoro.ts:209`
   chiama con `cliente_id`. Digitare un codice che vive sotto un altro studio: il pre-check dice «libero»,
   l'inserimento fallisce. 🛑 **La cura è cambiare la LETTURA** (ricerca mirata su `laboratorio_id` + codice
   normalizzato, senza `cliente_id` e senza limite) — **non** aggiungere `cliente_id` alla chiave, che
   riaprirebbe D15.
2. **`.limit(500)` contro 911 righe** (`route.ts:37`): nel laboratorio `314cd040…` **un solo cliente ha 911
   pazienti**, quindi ~411 sono **già oggi invisibili al pre-check**.
3. **La stringa vuota.** `PazienteEditSheet.tsx:29` inizializza a `''`, `handleSave` spedisce l'intero form,
   e `VUOTO_VALE_NULL` (`[id]/route.ts:43`) contiene **solo** `data_nascita` e `sesso`. Due righe a `''`
   collidono sotto un predicato che guarda solo `IS NOT NULL` → **per questo entrambe le forme portano
   `AND btrim(codice_paziente) <> ''`**.
4. **Il `PATCH` è messo PEGGIO del `POST`:** il POST almeno ha un pre-check a monte, **il PATCH non ne ha
   nessuno** (`[id]/route.ts:58` scrive a occhi chiusi, `:138-142` schiaccia su 500). Ed è la strada del
   testo digitato a mano, cioè quella con **più** probabilità di collidere e **meno** difese.

### I numeri veri (sola lettura, concordi con la sonda P1-bis)
```
totale 916 · nulli 1 · non-PZ 911 (tutti PAZ/…) · spazi ai bordi 0 · minuscole 0 · stringhe vuote 0
soft_deleted (deleted_at): 0   ·   archiviati: 0
duplicati grezzi: 0   ·   duplicati normalizzati: 0   → entrambe le forme si creano SENZA bonifica
```
✅ **Origine delle 911 righe accertata: `scripts/seed-arturo-pepe.ts:211-213`** — dati **seminati**, stesso
`created_at` (19/05/2026). Conferma che sono **materiale di prova**, non carico reale.

### Cosa resta non verificato (dichiarato dall'advisor)
- **Quale famiglia di codice sia quella ufficiale** — `PZ-####` (generatore) o `PAZ/ANNO/####` (segnaposto
  della casella di modifica, `PazienteEditSheet.tsx:183`, **e** dati importati). Nessuna decisione di
  Francesco, nessun vincolo a database: **non verificato**.
- **`lower(btrim())` non unifica separatori né spazi interni:** `PAZ/2026/0072` e `PAZ-2026-0072` restano
  distinti, e così `PZ- 0042`. Collassarli sarebbe una decisione semantica **oltre** il precedente di casa.
- **Il rischio reale di corse concorrenti** su questa tabella: nessun dato di carico. L'argomento del
  backstop resta **strutturale, non misurato**.

---

## 6. Ciò che invece REGGE — verificato, perché la parte positiva sia credibile

- **G9 tiene su entrambi gli scrittori dei pazienti**: nessun nome di vincolo o di indice raggiunge il
  client. Il nuovo indice **non apre un canale di ricognizione** per via del messaggio d'errore.
- **I permessi delle RPC cassette sono corretti**: `REVOKE … FROM PUBLIC, anon, authenticated` + `GRANT` al
  solo `service_role`. Chiamare `POST /api/cassette` dal wizard **non cambia nulla** su ruoli e permessi.
- **Il service worker non mette in cache `/api/`** (`public/sw.js:26`): i cognomi che D7 fa comparire **non**
  finiscono nella cache di un dispositivo condiviso.
- **`CONCURRENTLY` non serve**: zero occorrenze in tutto `supabase/`, e a 916 righe la finestra di blocco è
  trascurabile. Il lock **non è** il problema di T4.
- **I campi nuovi del wizard non si perdono nell'allowlist PATCH**: `denti` e `colori` non sono colonne di
  `lavori`, `paziente_id` è già in allowlist, `numero_cassetta` ha uno scrittore vivo e dichiarato.
- **Nessun componente di `src/components/ds/` è orfano oggi.** Tre sono importati solo dalla vetrina
  (`BarraMateriale`, `EroeTuttoAPosto`, `RigaAgenda`) — **non è la stessa cosa**, e non è una lista da
  cancellare.
- **La baseline del database è intatta**: 294 · 0 · 916 · 48, riverificata dopo l'unica interrogazione
  (sola lettura) di questa sessione.

---

## 7. Ritrovamenti fuori mandato — riferiti, non corretti (R-E2)

1. 🐛 **Difetto vivo oggi, nel passo paziente.** Si apre «Nome o alias», si preme «Salta», poi si usa la
   dettatura: il testo finisce **nella riga chiusa**, invisibile a schermo, e diventa il **cognome del
   paziente in banca dati**. `salta()` (`PassoPaziente.tsx:149-152`) svuota il valore ma **non tocca
   `campoAttivo`**, e `RigaOpzionale.aperto` è inizializzato una volta sola (`:147`), quindi la riga non si
   riapre. ➡️ **Muore con D13** (la dettatura si cancella), ma finché non muore c'è.
2. **`supabase/schema.sql` non descrive più la tabella `pazienti`**: mancano `nome`, `cognome` e
   `archiviato` (aggiunte da `002_fase2_schema.sql:112-118` e lette dalla rotta). È uno snapshot fermo, e
   **è il file su cui T4 si ancora**. ➡️ Il territorio di lettura per T4 è `002_fase2_schema.sql` + il
   catalogo vivo, non `schema.sql`.
3. **`schema.sql:572-577`**: una seconda CHECK (`prestazioni.categoria`) priva sia di `provvisorio` sia di
   `bite_splint`. Drift diverso e indipendente, **non verificato sul catalogo vivo**.
4. **Sei screenshot vivono solo su questo disco** (98 sul disco, 92 salvati): le viste intere a 1280 di
   testata, foto-cassetta e avviso codice — le tre superfici nuove. `.gitignore` ignora `*.png`.
5. **Il verbale D22 porta ancora addosso le due stesure superate**: prescrive di ancorare lo scorrimento
   **a destra** e una **maschera sfumata**, entrambe decadute col modello a pagine (D31, D32) e contraddette
   dal piano T8 («si tiene `inizio`, non `fine`» · «niente frecce»). ⚠️ La regola scritta in testa a quel
   verbale dice che **vince il documento letto per primo**: un esecutore fresco costruirebbe la testata al
   contrario. ➡️ Va riscritta lasciando **solo** la terza stesura, con le prime due dichiarate come storia.
6. **Un difetto preesistente sulla ricerca del riuso**: con lo **stesso** dentista, la seconda addetta
   **trova** il paziente della prima e **ne riusa l'id in silenzio** — un lavoro attaccato a un'altra
   persona fisica, nessun errore. L'indice non c'entra.
7. **Otto controlli automatici il cui nome promette più di quanto l'asserzione provi** (elenco nei rapporti
   dei lettori), e **tre che passano per il motivo sbagliato** — fra cui uno che resta verde anche a
   `ProgressDots` cancellato dal repo.

---

## 8. Il conteggio dei controlli automatici che si rompono

**66 test** nei quattro file: **11 si rompono di sicuro · 23 a rischio · 32 indipendenti.** Quarto numero,
separato: **35** hanno un dato di prova che non compila più.
⚠️ Vitest transpila **senza** controllo dei tipi: quei 35 **girano lo stesso** e falliscono come asserzioni.
Se nessuno tocca i dati di prova, i 12 test del blocco persistenza muoiono tutti al primo dialogo.

| file | sicuri | a rischio | indip. | dati di prova |
|---|---|---|---|---|
| `WizardNuovoLavoro.test.tsx` | 4 | 11 | 11 | 12 |
| `PassoPaziente.test.tsx` | 5 | 9 | 2 | 16 |
| `PassoTipo.test.tsx` | 1 | 3 | 10 | 0 |
| `wizard-persistenza.test.ts` | 1 | 0 | 9 | 7 |

🆕 **Un quinto file di test che il piano non conosce**: `tests/unit/dati-wizard.test.ts` — toccato dalla
riscrittura del generatore del codice.

---

## 9. Cosa propongo

**Il piano non si esegue: si riscrive la parte che i rilievi hanno spostato.** Non da capo — l'ossatura e
le 33 decisioni reggono — ma sei bloccanti non si aggirano con una nota a margine.

**Ordine proposto:**
1. **Le correzioni documentali che costano minuti** (conteggio 10→11, spec §15, verbale D22, i sei
   screenshot da salvare, il falso drift `bite_splint` da cancellare da `tipi-lavoro.ts:12-15`).
2. **I due panel normativi**, che sono ora **quattro domande** in un colpo solo (v. §5).
3. **La riscrittura del piano** con: il task del `23505`, il momento della creazione dichiarato, la firma
   di `cosaSiPerde` su due stati, il nome del passo al posto dell'indice, T7 spostato o spezzato,
   `cognomeEffettivo` in T5, i tre `.eq()` in T6, `storage_path` nel censimento, e i 17 file di T10.
4. **Le sonde rifatte**: P1 col caso che **deve** essere rifiutato (`pz-0042`), P5 su `storage_path`,
   P6 prima sulla **forma** e poi sul costo, P2 rieseguita, e la nuova P7 (già fatta: il drift non c'è).
5. Solo allora **T1**.

---

**Documenti che questo verbale corregge:** `docs/roadmap/2026-07-28-ondata-b-piano.md` (§3 preambolo, §4,
§5, §6, §2.3, §2.4) · `docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md` (§14.1, §15) ·
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (D22) ·
`docs/roadmap/2026-07-29-ondata-b-esecuzione-handoff.md` (§3, conteggio) · `src/lib/domain/tipi-lavoro.ts`
(commento `:12-15`, falso).
