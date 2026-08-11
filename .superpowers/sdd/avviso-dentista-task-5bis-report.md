# Resoconto — Task 5-bis: «a voce» con UN tocco, e la via di fuga (⚖️ D350 · D351)

**Quando:** 9 agosto 2026, 21:14-22:05 (`provato:` `date` → `Sun Aug  9 21:52:26 CEST 2026`, letto
dall'orologio e non da un documento — D155).
**Ramo:** `intervento-post-consegna`. **Verbale:** centocinquantesima tornata di
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`.
**Il lavoro su cui sono intervenuto:** `AvvisoDentista.tsx` (Task 5) e la sua prova.

| cosa | esito |
|---|---|
| `VERIFY_EXIT` | **0** |
| prove, prima → dopo | **5891 | 119 su 465 file** → **5902 | 119 su 465 file** (+11 prove, **nessun file nuovo**) |
| via di fuga scelta | **differire la scrittura di 10 s** (strada 1) — e **non** è un ripiego: è la metà del precedente di casa che si applica a questa tabella |
| tocchi, dalla scheda | WhatsApp **3** (invariato) · «a voce» **3 → 2**. **La parità nei tocchi di ⚖️ D335 non c'è più**, ed è una conseguenza dichiarata |
| prove che sorvegliavano la conferma | **3 su 45** — ed è **questo** il numero che risponde alla domanda del mandato. 🔑 E **2 sono restate verdi per il motivo sbagliato**: riferite in ③ |
| prove rotte dal disegno nuovo | **5 su 45** — misura **diversa** (contabilità: tre di quelle cinque cadono solo perché la scrittura è finita dietro un orologio), non una seconda risposta alla stessa domanda |
| forza delle prove nuove (R-P4) | **8 su 56** con la finestra tolta · **1 su 56** con l'«Annulla» reso inerte |
| contrasti sul DOM vivo | **0 sotto soglia** su **162** nodi (3 viewport × 2 temi × 3 schermate + movimento ridotto) |
| difetto trovato misurando, mio | **1**: a 390 la striscia è **25 px più alta** della riga che sostituisce — misurato, dichiarato, non nascosto |
| ritrovamenti fuori mandato | **4**, fra cui **una correzione al mandato stesso** (il ritorno chiede TRE campi a `NULL`, non due) |
| rotta toccata | **nessuna**, e nessuna migration |

---

## ① La via di fuga: **differire**, e il censimento del precedente è ciò che decide

**Il fatto che ha deciso, e non era nel mandato.** Il mandato descrive la consegna come *il* precedente
dell'annullo — «`FINESTRA_ANNULLO_MS` = 10 minuti». Aprendola, la consegna **non ha un meccanismo: ne ha
due**, e li divide **per reversibilità**.

`letto:` `supabase/migrations/20260710091500_rpc_consegna_annullo_atomiche.sql`, righe 1-120 ·
`src/components/features/lavori/AnnullaConsegnaBanner.tsx` 1-170 ·
`src/app/api/lavori/[id]/annulla-consegna/route.ts:6,120` · `src/lib/consegna/costanti.ts:7`.

| metà del precedente | come funziona | dove |
|---|---|---|
| **① ciò che ha uno stato di ritorno si scrive SUBITO e si rovescia** | `annulla_consegna_atomica` riporta `lavori.stato` a `pronto` e mette la dichiarazione in **`stato = 'annullata'`** | righe **96-108** |
| **② ciò che NON si disfa si DIFFERISCE per la durata esatta della finestra** | la fattura **non viene emessa al tocco**: entra in coda con `emetti_dopo = now() + p_finestra_ms`, e l'annullo si limita a segnare la voce in coda `annullata` prima che il cron la prenda | righe **30-37** e **88-93** |

E la finestra è **sorvegliata dal server** (`finestra_scaduta`), col rifiuto esplicito quando la parte
irreversibile è già avvenuta (`fattura_gia_emessa` · `fattura_in_emissione`).

🔑 **Da qui la scelta cade da sé: `avvisi_dentista` sta sulla SECONDA metà, e non per comodità.** La
consegna può rovesciare perché la dichiarazione **ha** uno stato «annullata»; `avvisi_dentista`
deliberatamente **non ce l'ha** — `provato:` sul catalogo vivo, `avviso_stato_vocabolario` ammette
**tre** valori e basta (`da_comunicare`, `comunicato_dall_app`, `comunicato_a_voce`). La prima metà
**non è disponibile per costruzione**, per una decisione del Task 1 («*un promemoria cancellabile è una
casella da spuntare*»).
➡️ Quindi la risposta al timore giusto del mandato — «*due modi diversi di annullare divergeranno*» — è
che **non ci sono due modi**: c'è **un modello di casa con due metà**, e questa tabella ricade sulla metà
del differimento. Il differimento non è una novità di questo foglio: è già in produzione nella consegna.

### 🔴 E c'è una seconda ragione, che vale più della prima — con una correzione al mandato

Il mandato dice che il ritorno a `da_comunicare` sarebbe scrivibile «*azzerando autore e data*».
**`misurato:` sono TRE campi, non due.** Sonda su **schema usa-e-getta** che copia i tre vincoli **letti dal
catalogo vivo** (`pg_get_constraintdef`), in **transazione annullata**:

```
❌ 23514 new row for relation "sonda_avvisi" violates check constraint "c_testo_solo_dall_app"
   dettaglio: Failing row contains (a, da_comunicare, il messaggio mandato, null, null).
```

Cioè: `avviso_testo_solo_se_dall_app` **pretende `testo_inviato IS NULL`** su ogni stato diverso da
`comunicato_dall_app`. Con tutti e tre a `NULL` l'aggiornamento passa (`da_comunicare` · testo nullo · data
nulla · autore nullo, provato su entrambe le righe di partenza).

🔑 **Perché è la ragione più forte:** un ritorno da `comunicato_dall_app` **cancella il testo comunicato** —
la prova ex **Art. 5(2) GDPR** che questa tabella esiste per tenere — e lo fa **senza lasciare traccia**,
perché non c'è nessuno stato che dica «qui c'era qualcosa». Differire vuol dire invece che **un tocco per
sbaglio non finisce nel registro affatto**: un fatto che non è avvenuto non ci deve entrare, e poi essere
sbiancato.
📌 **Il perimetro del rilievo, dichiarato:** su «a voce» `testo_inviato` è **già** `NULL`, quindi là la
perdita non morde. Ma un ramo di ritorno nella rotta sarebbe raggiungibile **da entrambe le strade** a meno
di restringerlo per scelta — e quella scelta è di chi possiede la rotta, non mia. Riferito in ⑧.

### Come è fatta, in pratica

| pezzo | scelta | perché |
|---|---|---|
| **il tocco** | la riga **programma**, non scrive | per 10 s in banca dati non cambia niente: non c'è nulla da disfare |
| **quanto dura** | `FINESTRA_ANNULLO_AVVISO_MS` = **10 s** | **derivato dalla Legge 6**, non scelto per gusto: §1 promette «*"Annulla" leggibile senza scrollare, **entro 10s** dall'azione*». Una finestra da 5 s violerebbe la legge **col suo stesso numero** — chi reagisce all'ottavo secondo non troverebbe più niente |
| **dove sta l'«Annulla»** | nel **foglio** e, a foglio chiuso, **al posto della riga sulla scheda** | è la forma di `AnnullaConsegnaBanner`: la fuga vive **sulla pagina**, non dentro un overlay, quindi **sopravvive alla chiusura del foglio** |
| **con quale componente** | `LinkQuieto` (§5.5) | la spec lo **riserva** alle vie di fuga («*Aspetta, annulla la consegna*»). 🔑 E risolve un problema di ⚖️ D335: un tasto primario qui darebbe a «a voce» l'unico tasto fisico delle due strade, cioè la renderebbe la strada suggerita — il difetto per cui la variante A1 fu scartata |
| **chiudere il foglio** | **non** annulla, **non** anticipa: gli orologi continuano | chiudere non è annullare, e l'annullo ha un suo comando. Se la chiusura fermasse la scrittura, il «tocco solo» non chiuderebbe niente per chi tocca e va via — cioè nel caso normale |
| **la scrittura arriva a foglio chiuso** | il foglio **non si apre da solo**; la pagina si rinfresca **subito** | un overlay che compare dieci secondi dopo senza che nessuno l'abbia toccato è un'imboscata. E il rinfresco non può aspettare una chiusura che non verrà più, o la riga resterebbe a schermo su un promemoria spento |
| **la scrittura fallisce** | si torna **alla domanda** | niente è uscito e niente è stato scritto: la finestra scaduta e vuota sarebbe un vicolo. Il messaggio della rotta lo porta l'Avviso, che sugli errori **non se ne va da solo** (§5.18), e da lì il tocco solo si rifà |
| **due orologi** | un `setTimeout` che **scrive**, un `setInterval` che **conta** | mettere la scrittura nell'aggiornatore di `setRestanoSec` la farebbe partire **due volte** in `StrictMode`. Se i due derivano, sbaglia il numero a schermo, non il momento della scrittura |

⚠️ **IL PREZZO, DICHIARATO E NON SCOPERTO:** per la durata della finestra la scrittura **non è avvenuta**, e
**nessuna parola del foglio dice il contrario** — il titolo è «*Lo segno fra un attimo*», mai «Fatto», e la
riga «Quando» resta «oggi» senza orologio (l'ora esatta la scrive la rotta). Se la pagina muore nel
frattempo, la scrittura non parte e **il promemoria resta aperto**: è la direzione **recuperabile**, la
stessa già scelta dal Task 5 per «il messaggio è partito e la rotta è fallita».

🛑 **La rotta non è stata toccata**, e non è stato necessario: la strada 2 (scrivere e permettere il ritorno)
avrebbe chiesto un ramo nuovo dove oggi c'è un **409** — fuori dal mio perimetro, quindi riferita in ⑧.

---

## ② Il conto dei tocchi, prima e dopo — e ⚖️ D335 si sposta

**Contati dalla scheda**, che è da dove parte chi lavora:

| strada | prima | dopo |
|---|---|---|
| **WhatsApp** | 3 — apri il foglio · scegli la riga · «Mandalo su WhatsApp» | **3, invariato** |
| **«a voce»** | 3 — apri il foglio · scegli la riga · «Sì, l'ho avvisato io» | **2** — apri il foglio · scegli la riga |

*(dal foglio già aperto: 2 e 2 prima, 2 e 1 dopo.)*

🔴 **Dunque sì: la parità nei tocchi di ⚖️ D335 non c'è più.** Lo scrivo senza attenuanti, perché era
l'argomento con cui il Task 5 aveva istituito il passo che D351 ha tolto. **Non ho riequilibrato togliendo
il passo del messaggio:** quello è ⚖️ D334 e non si tocca.

**Ciò che resta pari, e non è poco — sono fatti, non intenzioni:**
- le due righe sono **lo stesso componente** con gli stessi token, stessa altezza, stesso fondo, stesso filo
  (provato: quattro asserzioni che confrontano gli stili dei due nodi);
- **nessuna delle due porta un tasto fisico**, né al passo della scelta né nella finestra — la fuga è un
  `LinkQuieto`, che per spec **non è un'azione che conta**;
- **entrambe portano ancora il gallone `›`**, e questo è il punto meno ovvio: `›` vuol dire «entra» (§4.4).
  Se «a voce» avesse scritto **senza aprire niente**, quel gallone sarebbe diventato **falso** e la parità si
  sarebbe rotta anche a vedersi. Aprendo la finestra, la riga mantiene la sua promessa.

📌 **Un'osservazione, e la lascio come osservazione:** la finestra introduce un'**attesa** dove prima c'era un
tocco. Non la presento come un riequilibrio — l'attesa è la **conseguenza della via di fuga**, non una
penalità progettata, e chiamarla riequilibrio vorrebbe dire rimettere di nascosto l'attrito che Francesco ha
tolto. 🔶 **Se Francesco ritiene che la disparità 3-vs-2 vada chiusa, la decisione è sua**: la si chiude
sulla strada di WhatsApp, che è D334.

---

## ③ Quali prove sono arrossite — e le due che sono restate verdi per il motivo sbagliato

**Misurato in due giri, non previsto.**

### Giro 1 — togliendo SOLO la conferma (la riga scrive subito), prove **non toccate**: **3 rosse su 45**

| prova | perché conta |
|---|---|
| **`🛑 e lo stesso NUMERO DI TOCCHI: nessuna delle due scrive al primo tocco`** | 🔑 **era davvero la guardia di quella decisione.** La tesi del Task 5 («la parità di D335 è anche parità di tocchi») aveva una prova che la sorvegliava, e D351 l'ha fatta arrossire. È il caso migliore: una decisione ribaltata **rompe** qualcosa |
| `prima di registrare, il passo rilegge che cosa resterà scritto` | il passo non esisteva più |
| `e si torna alla scelta senza scrivere niente` (a voce) | «‹ Torna alla scelta» non esiste più su quella strada |

### Giro 2 — col disegno finale, prove **ancora non toccate**: **5 rosse su 45**

🛑 **E i due numeri NON sono la stessa misura, quindi non si sommano e non si sostituiscono.** Il giro 1
risponde alla domanda del mandato — *che cosa sorvegliava la conferma* — e la risposta è **3**. Il giro 2 è
**contabilità del cambiamento**: dice quante prove si rompono quando la scrittura finisce dietro un orologio,
e **tre delle cinque cadono solo per questo** (avevano bisogno dell'orologio finto), non perché sorvegliassero
il passo. Presentare 5 come «le prove della conferma» gonfierebbe il numero.

Le tre di sopra **meno una**, più due che chiedono l'orologio finto (`il corpo per «a_voce» NON porta testo`,
`«a voce» si rilegge come «a voce»`, `se la rotta non manda l'ora`).

🔑 **La prova che è TORNATA VERDE è il fatto più interessante del giro:** `prima di registrare, il passo
rilegge che cosa resterà scritto` **passa senza modifiche** col disegno nuovo. Cioè, misurato e non
argomentato: **D351 ha tolto il tocco, non la lettura.** Ciò per cui il passo valeva è rimasto, e ora non si
paga — si legge mentre la finestra scorre.

### 🔴 E due prove sono restate verdi per il motivo sbagliato — questo va riferito

Nel giro 1, `🛑 il corpo per «a_voce» NON porta testo` e `«a voce» si rilegge come «a voce»` (più
`se la rotta non manda l'ora`) **sono restate verdi**, e non perché sorvegliassero qualcosa.
**Il motivo, misurato:** cliccavano `getByRole('button', { name: /l'ho avvisato io/i })`, e quel filtro
**combacia anche con la RIGA della scelta** — il cui nome accessibile è «*📞 L'ho avvisato io, a voce · Resta
scritto che l'hai fatto tu, oggi ›*». Togliendo il tasto di conferma, quelle prove **hanno seguito il tasto
che si era spostato** e hanno cliccato la riga, ottenendo comunque una scrittura.

🔑 **Che cosa significa, e vale oltre stasera.** Quelle tre prove **non erano prive di valore** — il loro
soggetto vero (le chiavi esatte del corpo, la parola letta dallo stato salvato) è giusto e l'hanno provato
anche dopo. Ma **non sorvegliavano il passo**, benché lo attraversassero: un filtro di ricerca **largo** ha
fatto sì che un cambiamento strutturale non producesse nessun rosso. ➡️ **Un selettore per espressione
regolare su un pezzo di frase è un selettore che segue il bersaglio quando il bersaglio si muove.** Le prove
nuove usano nomi **esatti** (`{ name: 'Annulla' }`, `/^Sì, l'ho avvisato io$/`) e `within(foglio)` dove ci
sono omonimi.

### R-P4 — la forza delle prove NUOVE, con due abbozzi inerti

| abbozzo | quante asserzioni si accendono |
|---|---|
| **(A) nessuna finestra**: la riga scrive subito | **8 su 55** prove del file (7 delle 15 del blocco D351 + il conto dei tocchi) |
| **(B) la finestra c'è, ma «Annulla» non ferma niente** | **1 su 55** — ed è `🔴 «Annulla» ferma la scrittura: non parte MAI` |

📌 I due numeri sono presi quando il file ne aveva **55**; la prova della chiusura all'ultimo istante (v. ⑦.2)
è arrivata **dopo**, dalla revisione, e porta il totale a **56**. Il numero resta quello dell'istante in cui è
stato preso — è l'unico modo in cui una misura significa qualcosa.

🔑 **Il secondo numero è piccolo apposta, e la sua piccolezza è l'informazione:** una via di fuga **inerte**
è sorvegliata da **una** prova sola, quella che verifica che la richiesta **non parta mai** — non dal fatto
che l'«Annulla» sia a schermo, che resta vero anche quando è finto. Le altre quattordici provano che la fuga
**c'è, è raggiungibile e dura**; una sola prova che **funziona**. Lo scrivo invece di far contare quindici
prove come quindici guardie.
📌 Il blocco D351 porta **15 prove** e **39 asserzioni**; il file passa da **45** a **55** prove.

---

## ④ `N su M`

> ### **8 su 55** con la finestra tolta · **1 su 55** con la via di fuga resa inerte
> (e, sul lavoro del Task 5: **3 su 45** togliendo la conferma, **5 su 45** col disegno finale)

**Le forme d'input nuove, enumerate prima delle asserzioni** — per una finestra le «forme» sono i modi in cui
può finire:

| forma | coperta |
|---|---|
| la finestra scade col foglio **aperto** | ✅ passo «Fatto», riga salvata riletta, rinfresco **rimandato** alla chiusura |
| la finestra scade col foglio **chiuso** | ✅ nessun foglio comparso da solo, rinfresco **immediato** |
| «Annulla» **durante** la finestra | ✅ nessuna richiesta, mai, nemmeno dopo tre finestre; si torna alla domanda |
| **chiusura** durante la finestra | ✅ la scrittura parte comunque, e la striscia porta la fuga sulla scheda |
| **doppio tocco** sulla riga | ✅ una finestra sola, una scrittura sola |
| la scrittura **fallisce** (rotta `!ok`) | ✅ si torna alla domanda, nessun rinfresco, il promemoria resta aperto |
| **rete assente** | ✅ stesso racconto |
| risposta `ok` **senza** `comunicato_at` | ✅ si rilegge senza orologio, mai `undefined` |
| il **corpo** per `a_voce` | ✅ chiavi esatte `['avviso_id','come']`, `'testo' in corpo === false` |
| il **limite** della finestra | ✅ nessuna richiesta a 9,9 s; e l'asserzione che il numero sia ≥ 10 000 ms, cioè ≥ il numero che L6 promette |
| **smontaggio** con una scrittura in attesa | ⚠️ **non coperta da una prova, ma il codice c'è** (l'effetto di pulizia ferma gli orologi). In jsdom lo smontaggio avviene al termine di ogni prova e un orologio non fermato si vedrebbe come un avvertimento su un albero smontato: **nessuno è comparso in 55 prove**. È una prova per assenza di rumore, non un'asserzione — e la dichiaro come tale |
| la finestra che scade **mentre la pagina si sta chiudendo** | ❌ **non coperta, con motivo:** è la morte del processo, non uno stato del componente. È **il prezzo dichiarato** del differimento (v. ①), non un ramo da provare |

---

## ⑤ I contrasti rimisurati sui passi cambiati

Sonda sul **DOM vivo**, quella **corretta** del Task 5 — legge gli **stop dei gradienti**, perché un tasto a
gradiente risponde `transparent` su `background-color` e la prima sonda produsse **15 falsi positivi**.
Dettaglio e scatti: `docs/design/screenshots/2026-08-09-avviso-dentista/MISURE.md`, sezione «FASE 9 — Task
5-bis».

| | esito |
|---|---|
| nodi con testo proprio sondati | **162** (3 viewport × 2 temi × 3 schermate, più il ramo a movimento ridotto) |
| **testi sotto soglia** | **0** |
| peggiore sulla **finestra** (soglia 4,5) | **5,74** chiaro · **6,07** scuro |
| peggiore sulla **striscia** (soglia 4,5) | **5,74** chiaro · **6,13** scuro |
| peggiore sul passo «Fatto» | **4,11** chiaro · **3,52** scuro contro soglia **3** — il bianco 21/800 sul gradiente del `TastoPrimario` (§5.1, **ratificato**), identico al giro del Task 5 |
| movimento ridotto (`SheetRidotto`, ramo di codice diverso §8.4) | **0 sotto soglia** |
| bersaglio della via di fuga | **47,8 px** in **6 su 6** le combinazioni, e **dentro lo schermo senza scorrere** in 6 su 6 — che è letteralmente ciò che L6 chiede |
| sbordatura orizzontale | **nessuna** a 390 · 768 · 1280 |
| il foglio si apre da solo? | **no** in 6 su 6 |

**Il colore non è l'unica fonte di stato (L3):** la striscia non porta nessuna tinta d'allarme — dice a
parole «*L'hai avvisato tu, a voce*» e «*puoi ancora fermarmi*», e il numero che scende è `aria-hidden`
perché la frase accanto dice il limite **a parole**, una volta (un contatore in una regione viva si
riannuncerebbe dieci volte).

### 🔴 Un difetto trovato misurando, ed è mio: a 390 la striscia è più alta della riga

| viewport | riga | striscia | scostamento |
|---|---|---|---|
| **390** | **101 px** | **126 px** | **+25 px** |
| 768 · 1280 | 81 px | 81 px | **0** |

**Perché:** a 390 la via di fuga occupa 84 px in larghezza e comprime la colonna del testo a 177, che va a
capo due volte in più (anatomia letta sul DOM vivo).
**Perché resta così, e sono due fatti misurati:** ① lo scambio riga → striscia avviene **nello stesso commit
in cui il foglio si apre**, quindi lo spostamento accade **mentre il foglio gli sale sopra** — ⚠️ e questo è
ciò che ho misurato, non «*nessuno lo vede*»: lo scrim è **semitrasparente** (si vede nei miei stessi scatti),
quindi lo spostamento è attenuato, non invisibile; ② l'alternativa — smontare la striscia — costerebbe
**101 px** invece di 25, e alla chiusura del foglio lascerebbe la via di fuga **da nessuna parte**.
⚠️ **Il numero è preso su un banco con la spaziatura di pagina scelta da me:** quella vera è della scheda, e
la decide il **Task 6**. Vale l'ordine di grandezza, non la cifra.

📌 **Un secondo fatto misurato che sembrava un difetto e non lo è:** alla chiusura, per la durata
dell'**animazione di uscita**, nel documento ci sono **due** «Annulla». A 300 ms e a 700 ms il pannello è
ancora presente e sta scendendo (`top` 1144 → 1221 su un viewport da 844); a **1500 ms**
`[role="dialog"]` è **zero**. Non è una doppia via di fuga: è l'uscita — e per questo gli scatti della
striscia sono presi a 1500 ms e non a 700, dove avrebbero fotografato l'animazione.

---

## ⑥ I numeri

| | |
|---|---|
| `VERIFY_EXIT` | **0** (`npm run verify:full; ESITO=$?; echo "VERIFY_EXIT=$ESITO"` — da variabile, mai dietro una pipe) |
| prove **prima** | **5891 passate \| 119 saltate su 465 file** (`456 passed \| 9 skipped`) — **rimisurato** sull'albero pulito a `84be689f`, coincide col numero del mandato |
| prove **dopo** | **5902 passate \| 119 saltate su 465 file** (`456 passed \| 9 skipped`) |
| differenza | **+11 prove** (il file del foglio passa da 45 a **56**), **nessun file nuovo** |
| guardie | tutte verdi: DS compliance · CSRF · reduced-motion · coerenza documenti · salvataggio installato · progetti Playwright |
| `tsc` · `eslint` | **0** errori, **0** avvertimenti (`eslint src --max-warnings 0`) |

📌 **La cartella `.next/dev` è stata cancellata prima del giro**, come il Task 5 aveva imparato a sue spese:
un banco di prova cancellato lascia i tipi generati indietro e ne esce un `TS2307` che sembra un errore di
codice.

---

## ⑦ Ciò che resta `non provato`, col motivo

1. **⚖️ D350 — la terza deroga sul nome del paziente: non ho toccato niente**, come il mandato chiede. Il
   componente riceve `pazienteMostrato` e lo rende; **chi decide cosa passargli è il Task 6**. 📌 Resta da
   fare, e **non è mio**: **§2.1 della spec v3 va aggiornata con la terza voce** — oggi elenca due deroghe
   (D8 · D7) e dice che ogni altra vuole una deroga esplicita, datata e motivata. La deroga ora **esiste** ed
   è a verbale; la spec non lo sa ancora. Riferito in ⑧.
2. **🔴 IL RITARDO DI UN COMMIT NON È RIPRODUCIBILE IN PROVA, e la difesa è STRUTTURALE.** In revisione è
   emerso che leggere «il foglio è aperto?» da **due** posti (l'aggiornatore del setter e un `ref`
   aggiornato da un effetto) può dare **risposte diverse** se la persona chiude il foglio nello stesso
   istante in cui la richiesta si risolve — e la coppia sbagliata rimanderebbe il rinfresco a una chiusura
   che non arriva più. ✅ **Chiuso togliendo il secondo posto:** ogni transizione passa da `vaiA`, che
   aggiorna il `ref` **e** lo stato nello stesso gesto, e la decisione legge **una volta sola**.
   🛑 **Ma la prova non lo dimostra:** in jsdom gli effetti si svuotano dentro `act`, quindi la prova nuova
   («*chiusura all'ultimo istante e finestra che scade insieme*») **passerebbe anche col disegno vecchio**.
   Fissa il comportamento atteso; la garanzia è l'invariante nel codice — `applicaPasso` compare **in un
   posto solo**, dentro `vaiA` (grep-abile, e il setter si chiama così proprio per renderlo visibile).
3. **Che `role="status"` sulla striscia venga davvero annunciato una volta sola.** Il ragionamento è scritto
   (frase statica annunciata all'apparire, numero in `aria-hidden` per non riannunciare dieci volte), ma
   **né jsdom né Playwright leggono con una voce sintetica**: nessuno dei due strumenti misura un
   annuncio. È una scelta motivata, non una misura — e il precedente di casa fa **peggio** (v. ⑧.4).
4. **La finestra su un telefono vero.** Il giro è su Chromium con viewport emulati: dieci secondi di attesa
   con lo schermo che si spegne, l'app in secondo piano o una scheda sospesa sono comportamenti del
   **sistema**, non del componente. 🔑 Su iOS un `setTimeout` in una scheda in background **può essere
   rimandato o non eseguito**: in quel caso la scrittura non parte e **il promemoria resta aperto** — la
   direzione recuperabile — ma **non l'ho misurato**, e chi lo misurerà deve saperlo.
5. **Il giro sul banco vero, dalla riemissione al promemoria chiuso.** Invariato dal Task 5: il foglio non è
   montato su nessuna superficie (Task 6) e non esiste una fixture con un avviso `da_comunicare`. È il
   **Task 10**.
6. **Il ramo dedicato al 409 «già comunicato»** — invariato dal Task 5, e oggi **più interessante**: con la
   finestra, la corsa fra due persone che chiudono lo stesso avviso ha dieci secondi in più per accadere. Il
   messaggio della rotta si mostra così com'è, ma non c'è un ramo che dica «l'ha già segnato qualcun altro».
   Riferito.
7. **Il gate estetico L2 (FASE 9b, D245)**: **dovuto**, a fine ondata e prima del merge — è il Task 10. La
   FASE 9 è stata fatta per intero sulle superfici cambiate.
8. **`admin_sistema`**: invariato dal Task 5 — la visibilità della riga è del Task 6.

---

## ⑧ Ritrovamenti fuori mandato — riferiti, nessuno corretto di nascosto (R-E2)

1. **🔴 IL MANDATO STESSO ANDAVA CORRETTO, e la correzione è misurata.** Dice che il ritorno a
   `da_comunicare` si scrive «*azzerando autore e data*». Sono **tre** campi: senza `testo_inviato = NULL` il
   vincolo `avviso_testo_solo_se_dall_app` risponde **23514** (output incollato in ①). ➡️ **Chi progetterà il
   ramo di ritorno nella rotta deve saperlo**, perché il terzo campo non è un dettaglio di sintassi: è **la
   prova ex Art. 5(2) GDPR di cosa è stato comunicato**, e azzerarla è una perdita, non un annullo.
2. **📮 LA STRADA 2 RESTA APERTA E VA VALUTATA DA CHI POSSIEDE LA ROTTA, non da me.** Oggi
   `src/app/api/lavori/[id]/avviso/route.ts` risponde **409** a un avviso già chiuso e **non esiste** nessuna
   strada verso `da_comunicare`. Se un giorno servisse (per esempio per correggere un avviso chiuso **ieri**,
   che la mia finestra da dieci secondi non copre), le tre cose da decidere sono: **quali stati** possono
   tornare (e se il ritorno da `comunicato_dall_app` si vieta, per non perdere il testo), **entro quanto**, e
   **chi**. 🛑 Non l'ho fatto: è fuori dal mio perimetro, e il mandato lo dice.
3. **📌 §2.1 della spec v3 non conosce la terza deroga di ⚖️ D350.** Elenca due deroghe in vigore (D8 targa
   della parete · D7 ricerca nel wizard) e dice che ogni altra vuole una «*deroga esplicita, datata e
   motivata di Francesco*». Ora esiste, è datata (09/08/2026) e motivata, ma vive **solo** nel verbale. Il
   Task 5 aveva posto la domanda; la risposta è arrivata e **la spec va aggiornata** — è un cambio di
   documento, non di codice, e non era nel mio mandato.
4. **⚠️ `AnnullaConsegnaBanner.tsx:102` porta `role="alert"` su un contenitore il cui contenuto CAMBIA ogni
   secondo** (il conto alla rovescia `mm:ss`). Una regione `alert` è assertiva: chi legge con la voce
   sintetica può sentirsela riannunciare **una volta al secondo per dieci minuti**. Nel mio caso ho evitato
   il problema mettendo il numero in `aria-hidden` e la frase in `role="status"` statico, ma **il precedente
   in produzione ce l'ha** — ed è nel flusso della consegna, quindi un altro mandato. **Non l'ho toccato.**

📌 **Non trattati come difetti, ma dichiarati:** il banco di prova
(`src/app/ds-v3-catalogo/banco-t5bis/page.tsx`) è stato **cancellato prima del salvataggio** (R-P1, gli spike
non si committano) e le sonde vivono in `scripts/tmp/`, cartella ignorata da git · i quattro difetti
ereditati dai componenti condivisi (⚖️ D349 · D330 ❌1) **non si manifestano** sulle due superfici nuove,
perché la finestra non porta nessun tasto spento e la striscia usa `--card`/`--line` come la riga · **BP-1**
(memoria + roadmap) è la FASE 11 del piano, cioè il Task 10: questo resoconto non la esegue.

---

## ⑨ Il salvataggio

`git status` **prima** di salvare, e `git add <percorsi>` — mai `-A` (⚖️ **D318**).

| file | cosa |
|---|---|
| `src/components/features/lavori/scheda-v3/AvvisoDentista.tsx` | ⚖️ D351: il tocco solo, la finestra da 10 s, la striscia sulla scheda. **Due blocchi di intestazione RISCRITTI**, non annotati in fondo (v. sotto) |
| `tests/unit/AvvisoDentista.test.tsx` | il blocco nuovo di ⚖️ D351 (**16** prove); il file passa da 45 a **56** prove |
| `docs/design/screenshots/2026-08-09-avviso-dentista/MISURE.md` | la sezione «FASE 9 — Task 5-bis» |
| `docs/design/screenshots/2026-08-09-avviso-dentista/t5b-*.png` | 28 scatti nuovi |

🔑 **Due blocchi dell'intestazione dicevano il contrario di D351, e li ho RISCRITTI IN CIMA invece di
aggiungere una nota in fondo.** Erano «*la parità delle due strade è il numero di tocchi*» e «*nessun
«Annulla» dopo il tocco… la via di fuga vive prima della scrittura*». È la lezione di `CLAUDE.md` §9 pagata
due volte sul push: **in un documento lungo vince ciò che si legge per primo e in grassetto, non ciò che è
vero** — una correzione messa dopo l'affermazione che smentisce non la sostituisce, la lascia in piedi.

**Hash del salvataggio: `d94afe13`** — `feat(avvisi): «a voce» chiude con un tocco, e la via di fuga vive
dopo la scrittura (D351)`. `provato:` `git rev-parse --short HEAD` **dopo** il commit → `d94afe13`.

**La catena, per intero:**

| hash | cosa |
|---|---|
| **`d94afe13`** | il lavoro: il tocco solo, la finestra da 10 s, la striscia, le prove nuove, la FASE 9 |
| `9254b547` | l'hash vero in questa riga (v. sotto) |
| **`8bfd63e8`** | 🔴 **la correzione trovata in revisione**: il passo si legge da **un posto solo**, sincrono — due letture della stessa domanda potevano rispondere diverso e lasciare la riga a schermo su un promemoria spento (v. ⑦.2) |

🔴 **Il ramo NON è stato pubblicato, e va detto.** `git push -u origin intervento-post-consegna` è stato
**rifiutato dal classificatore** in questa sessione, benché `"Bash(git push*)"` sia presente in
`ua-app/.claude/settings.json` (`permissions.allow`, riletto: c'è). **Non l'ho aggirato** — la regola di casa
è «si chiede, non si aggira». ⚠️ Ma la conseguenza è quella che ⚖️ **D296** nomina per prima: **questi tre
salvataggi vivono in un posto solo**, e la copia fuori dal computer non c'è. **Il push va lanciato a mano.**

🔴 **Questa riga NON porta un numero inventato, e la ragione è un errore del Task 5** che vale la pena non
ripetere: là l'hash era stato **scritto prima di fare il commit**, cioè un numero con la forma di una misura.
Un salvataggio **non può nominare se stesso**: l'hash vero arriva con un secondo salvataggio, minuscolo, che
porta solo questa riga.
🛑 Niente `push` di `main`, niente worktree.
