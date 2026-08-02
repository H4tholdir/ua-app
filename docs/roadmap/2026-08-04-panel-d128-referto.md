# Panel normativo su D128 — la firma a distanza del contratto ai dentisti

**Data:** 04/08/2026 · **Chiesto da:** l'handoff del 04/08, voce 🔴 2 — «*il panel normativo su D128 non è stato fatto, e adesso blocca*».
**Perché bloccava:** D128 poggia sull'Art. 28(9) GDPR **citato a memoria, mai letto alla fonte**. Finché l'ondata 1 non firmava niente non mordeva. L'ondata 2 firma.
**Metodo:** tre advisor con mandati **disgiunti** (forma giuridica · catena probatoria · contenuto dell'accordo), ognuno con l'ordine esplicito di **provare a demolire** D128. Regola Advisor, ratificata 17/07/2026.

## 🔑 Verdetto — i tre concordano: **REGGE, CON CONDIZIONI**

Il **meccanismo** scelto da D128 — accettazione tracciata, nessun fornitore esterno, nessun costo per firma — **non trova ostacoli nel testo di legge**. Ciò che non regge è il contorno: **l'identità di chi accetta**, **l'inviolabilità del registro** e **il contenuto stesso del contratto**.

🛑 **E la condizione più urgente non riguarda la firma: riguarda l'ORDINE.** Oggi correggere il testo del contratto costa **zero**, perché nessuno ha ancora accettato niente. Alla prima accettazione quella finestra si chiude: ogni correzione successiva costringe a **rifare il giro su tutta la clientela**, per un meccanismo che il progetto si è costruito da sé (D133 — la versione porta dentro l'impronta del testo, quindi ogni parola cambiata è una versione nuova, quindi un'emissione nuova per ogni dentista).

---

## 0. 🛑 Che cosa ho verificato IO, e una correzione a un advisor

Il panel è **materiale di lavoro**, non una fonte. Tutto ciò che segue in questo referto come fatto è stato **riverificato alla fonte da me**, dopo i referti. Elenco delle riverifiche e del loro esito:

| fatto | riverificato dove | esito |
|---|---|---|
| Art. 28(9) GDPR, testo esatto | EUR-Lex, consolidato IT, CELEX `02016R0679-20160504` | ✅ **confermato** — e **corregge la nostra citazione**: v. §1 |
| CAD art. 20 co. 1-bis, testo esatto | Normattiva, «*Testo in vigore dal: 27-1-2018*» | ✅ **confermato alla lettera** |
| EDPB Guidelines 07/2020 §101 e §103 | PDF ufficiale EDPB, «*Version 2.1 · Adopted on 07 July 2021*» | ✅ **confermati alla lettera**, ed è emerso **§102**, che nessun advisor aveva pesato: v. §3 ③ |
| protezione del registro DPA | catalogo vivo (`pg_class`, `pg_policy`) | ✅ confermato il difetto — 🔄 **ma lo STRATO era sbagliato: v. sotto** |
| il contratto laboratorio↔UÀ non esiste nel prodotto | `grep` su `src/` + catalogo vivo | ✅ confermato |
| il testo del contratto afferma che esiste | `DpaTemplate.tsx:210`, letto | ✅ confermato verbatim |
| il Codice privacy non pone requisiti di forma | Normattiva, interrogazione mia sulle tre espressioni | ⚠️ **concorde con l'advisor, ma NON esaustivo**: v. §2 |

### 🔄 La correzione — e vale come lezione, non come rimprovero

Un advisor ha dato per **bloccante** che «*i permessi sulla tabella permettono anche all'utente autenticato normale di inserire, modificare e cancellare*», citando `relacl = {anon=arwdDxtm, authenticated=arwdDxtm, …}`.

**Il fatto è vero e la conclusione è giusta, ma la prova indicata non prova quello.** `provato:` sul catalogo vivo, **quei permessi sono IDENTICI su tutte le tabelle del progetto** — compresi `audit_log` e `sdi_receipts`, che lo stesso advisor cita come esempi di tabelle **ben chiuse**:

| tabella | permessi di base | protezione di riga | regole | comando | dal browser si può… |
|---|---|---|---|---|---|
| `audit_log` | `anon`+`authenticated` = tutto | attiva | **nessuna** | — | **niente**: invisibile |
| `portale_accessi` | idem | attiva | 1 | **solo SELECT** | solo leggere |
| `sdi_receipts` | idem | attiva | 1 | **solo SELECT** | solo leggere |
| **`data_processing_agreements`** | idem | attiva | 1 (`dpa_laboratorio`) | **ALL** | **leggere E SCRIVERE** |

🔑 **I permessi di base non sono il cancello: sono il pavimento, ed è uguale dappertutto** (è l'architettura standard di Supabase, dove il cancello vero sono le regole di riga). **Il cancello è il COMANDO della regola**, e il registro del contratto è **l'unico dei quattro** la cui regola vale anche in scrittura.
🔑 **È esattamente la lezione della giornata di ieri** — *la fonte di un fatto è lo strato in cui il codice lo legge* — sbagliata una quinta volta, stavolta da un advisor. **La riporto perché la conclusione operativa non cambia, ma la MOTIVAZIONE sì**, e chi legge deve poter difendere il fatto giusto: se qualcuno «riparasse i permessi» invece delle regole, romperebbe l'app senza chiudere il buco.

---

## 1. La fonte, letta

**Regolamento (UE) 2016/679, versione consolidata italiana, EUR-Lex, CELEX `02016R0679-20160504`**
🔗 https://eur-lex.europa.eu/legal-content/IT/TXT/HTML/?uri=CELEX:02016R0679-20160504

> **Art. 28(9)** — «Il contratto o altro atto giuridico di cui ai paragrafi 3 e 4 è stipulato **in forma scritta, anche in formato elettronico**.»

🔄 **Prima correzione, e riguarda noi.** D128, l'handoff e la roadmap citano tutti «**per iscritto**, anche in formato elettronico». Il testo vero dice «**in forma scritta**». ⚠️ **Non è pignoleria:** «forma scritta» è l'espressione tecnica su cui il **CAD art. 20** costruisce la sua intera distinzione — quella che decide se un documento elettronico vale come scrittura privata o se il suo peso è «liberamente valutabile in giudizio». Citando l'altra formula si perde il gancio della norma italiana, cioè proprio il punto dove D128 rischia.

> **Art. 28(3), prima frase** — «I trattamenti da parte di un responsabile del trattamento sono disciplinati da un contratto o da altro atto giuridico … che vincoli il responsabile del trattamento al titolare del trattamento e che stipuli la materia disciplinata e la durata del trattamento, la natura e la finalità del trattamento, il tipo di dati personali e le categorie di interessati, **gli obblighi e i diritti del titolare del trattamento**.»

**CAD — D.Lgs. 82/2005, art. 20 comma 1-bis**, Normattiva, «*Testo in vigore dal: 27-1-2018*»
🔗 https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:2005-03-07;82~art20!vig=

> «Il documento informatico soddisfa il requisito della forma scritta e ha l'efficacia prevista dall'articolo 2702 del Codice civile quando vi è apposta una firma digitale, altro tipo di firma elettronica qualificata o una firma elettronica avanzata o, comunque, è formato, **previa identificazione informatica del suo autore**, attraverso un processo avente i requisiti fissati dall'AgID … e, **in maniera manifesta e inequivoca, la sua riconducibilità all'autore**. **In tutti gli altri casi, l'idoneità del documento informatico a soddisfare il requisito della forma scritta e il suo valore probatorio sono liberamente valutabili in giudizio, in relazione alle caratteristiche di sicurezza, integrità e immodificabilità.** La data e l'ora di formazione del documento informatico sono opponibili ai terzi se apposte in conformità alle Linee guida.»

**EDPB, Guidelines 07/2020 on the concepts of controller and processor**, «Version 2.1 · Adopted on 07 July 2021»
🔗 https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf

> **§101** — «Such legal act must be in writing, including in electronic form. Therefore, non-written agreements … cannot be considered sufficient … the EDPB **recommends** ensuring that the necessary signatures are included in the legal act, in line with applicable law.»
> **§102** — «… it must be binding on the processor with regard to the controller … **Also it must set out the obligations of the controller.**»
> **§103** — «Since the Regulation establishes a clear obligation to enter into a written contract, where no other relevant legal act is in force, **the absence thereof is an infringement of the GDPR**. **Both** the controller and processor are responsible …»

---

## 2. La risposta sulla forma, in due righe

**① Davanti al Garante, in ispezione: REGGE.** L'Art. 28(9) chiede un atto **scritto**, e l'unica cosa che l'EDPB esclude sono gli accordi **non scritti** (§101). Un PDF conservato più un'accettazione registrata **è** un atto scritto in forma elettronica. Le firme l'EDPB le **raccomanda**, non le impone.

Il **Codice privacy italiano non aggiunge nulla** — e questo è un fatto **negativo**, cioè il tipo che è più facile affermare che provare, quindi va detto come sta. **Due strade indipendenti, stessa risposta:** l'advisor ha esportato da Normattiva il testo vigente (~405.000 caratteri) e vi ha cercato «forma scritta» → **0**, «documento informatico» → **0**, «firma elettronica» → **0**; io ho interrogato Normattiva per conto mio, con le stesse tre espressioni, e ho avuto **nessuna occorrenza** più la conferma che l'**art. 28 del Codice è abrogato dal D.Lgs. 101/2018**. ⚠️ **Il limite, dichiarato:** non posso certificare che la pagina che ho letto contenesse il testo **integrale**. Due strade concordi non sono una prova esaustiva — sono due strade concordi.

**② In causa, se il dentista nega di aver accettato: NON regge da solo.** Il CAD art. 20 co. 1-bis apre una porta e ne chiude un'altra. La porta stretta — valore di scrittura privata — chiede una firma qualificata/avanzata **oppure** un processo con «**previa identificazione informatica del suo autore**». D128 non identifica nessuno: chi ha il link scrive il nome che vuole. Quindi si finisce nella porta larga: «**liberamente valutabili in giudizio, in relazione alle caratteristiche di sicurezza, integrità e immodificabilità**».

🔑 **E qui c'è la notizia buona, che va detta con la stessa forza della cattiva:** *sicurezza, integrità, immodificabilità* sono **esattamente** le tre cose che l'ondata 1 ha costruito — impronta del PDF, conservazione, numerazione. **Il disegno gioca sul terreno che la legge indica al giudice.** Ma sono anche le tre cose che i difetti del §3 distruggono.

---

## 3. I quattro ritrovamenti che contano

### ① 🔴 Il registro che deve contenere la prova è **riscrivibile dalla parte che la prova deve vincolare**

`provato:` sul catalogo vivo — `data_processing_agreements` ha protezione di riga attiva e **una sola regola**, `dpa_laboratorio`, dichiarata **senza `FOR`**, quindi valida per **tutti i comandi**, e **senza `WITH CHECK`** proprio. In quel caso PostgreSQL **riusa l'espressione di lettura come controllo di scrittura**: un utente del laboratorio — **anche un `tecnico`, non serve il titolare** — può scrivere e riscrivere le righe del proprio laboratorio, `firmato_da`, `firmato_at`, `stato` e `pdf_sha256` comprese. E la tabella **non è fra le dieci sorvegliate** dal registro delle modifiche: non resta traccia di chi ha scritto cosa.

⚠️ **Questa NON è una scoperta nuova: è la voce `P7`, già in roadmap, classificata 🟢.** Il panel non l'ha trovata — **ne ha ribaltato la gravità**. Oggi è innocua perché quelle colonne sono **vuote**: `provato:` 2 righe nel registro, **0 firmate**. Il giorno in cui l'ondata 2 ci scrive dentro l'accettazione del dentista, quella tabella diventa **il muro portante della prova** — e il muro lo può spostare la parte interessata.

> Una prova che la parte interessata può scrivere da sola non è una prova debole. È **il contrario di una prova** — ed è peggio del nulla, perché *sembra* una prova.

✅ **Il precedente giusto è in casa, a undici righe di distanza:** `sdi_receipts` è dichiarata **solo in lettura**, col commento «*mai UPDATE/DELETE su documenti fiscali*». Va applicato al registro **prima** della prima accettazione — dopo, significherebbe riscrivere una tabella che contiene prove.

### ② 🔴 L'impronta del PDF **non prova** che quel PDF sia quello mostrato al dentista

Tre ragioni indipendenti, ognuna sufficiente: **(a)** al momento della consegna nessuno **ricalcola** l'impronta e la confronta — la strada del riuso scarica il file e lo restituisce così com'è; **(b)** i byte in archivio sono **sostituibili** da un membro del laboratorio, che può cancellare il file e ricaricarne un altro allo stesso indirizzo; **(c)** la colonna che contiene l'impronta è **riscrivibile** (v. ①).

Conseguenza concreta: un dentista accetta davvero il `DPA-2026-0001`; sei mesi dopo il testo in archivio è un altro; l'accettazione autentica resta **attaccata a un testo che il dentista non ha mai visto** — e l'impronta, che dovrebbe impedirlo, «conferma».

### ③ 🔴 Il contratto **afferma un fatto giuridico che nel prodotto non esiste**

`DpaTemplate.tsx:210`, verbatim: «*Il Responsabile impone a ciascuno di essi, **per contratto**, obblighi di protezione dei dati equivalenti a quelli del presente accordo (Art. 28(4) GDPR)*».

`provato:` **quel contratto non risulta da nessuna parte.** `tipo_controparte` ha **un solo scrittore** in tutto il codice (`generate-dpa.ts:288`) e scrive sempre il letterale `'dentista'`; nessuno scrive mai `'sub_responsabile'`; la tabella `sub_processors`, disegnata apposta con le colonne `dpa_firmato_at` e `dpa_url`, ha **zero lettori e zero scrittori**; nel registro vero ci sono **2 righe, tutte `dentista`**; e nell'app **non esiste nessuna pagina di condizioni o privacy** (`find` su `src/app` → nessuna), né una colonna di accettazione su `laboratori` (catalogo vivo → nessuna).

🛑 **È esattamente la classe di difetto per cui D126 è esistita:** un documento che esce dal laboratorio verso un cliente e afferma cose che il prodotto non fa. Tre giorni fa ne abbiamo tolte tre; questa era rimasta.
⚠️ **Ma attenzione al confine:** il contratto laboratorio↔UÀ potrebbe esistere **fuori dal prodotto** — un accordo firmato, delle condizioni accettate altrove. Dal codice non è verificabile. **È una domanda per Francesco, non un difetto accertato.** Ciò che è accertato è che *il prodotto non ne conserva traccia*, e quindi non può dimostrarlo.

### ④ 🟠 Manca un elemento che l'Art. 28(3) **nomina**: gli obblighi del Titolare

L'Art. 28(3) impone che il contratto stipuli «**gli obblighi e i diritti del titolare del trattamento**», e l'EDPB lo ribadisce al **§102** («*Also it must set out the obligations of the controller*»). Nel nostro testo il Titolare compare **solo mentre esercita** qualcosa — affida, istruisce, autorizza, sceglie. **Non c'è nessuna clausola che gli imponga qualcosa**: né di avere una base giuridica, né di aver dato l'informativa ai pazienti, né di garantire l'esattezza dei dati che trasmette, né di impartire istruzioni lecite.

**Insieme a questo, altri tre buchi di contenuto**, tutti da correggere **nello stesso passaggio** perché ognuno sposta la versione: le **immagini di lavorazione** sono disciplinate due volte ma **non censite** fra i tipi di dati · le **categorie di interessati** nominano solo i pazienti mentre il documento tratta anche i dati del prescrittore · l'**Art. 1 e l'Art. 7 si contraddicono** su chi è titolare per gli obblighi che il MDR mette in capo al fabbricante (l'Art. 1 dice «per conto del Titolare», l'Art. 7 dice «titolare autonomo» — sulle **stesse tre attività**), e da quella contraddizione dipende la tenuta della difesa che il documento oppone alle richieste di cancellazione.

---

## 4. Le condizioni, in ordine di esecuzione

🛑 **L'ordine non è un'opinione: è imposto dal meccanismo delle versioni.** Ogni parola cambiata nel testo cambia l'impronta, quindi la versione, quindi obbliga a riemettere — e, dopo la prima accettazione, **a far riaccettare tutti**.

### Prima di far accettare qualunque cosa — sono correzioni di TESTO, si fanno in un colpo solo

| # | cosa | perché |
|---|---|---|
| **C1** 🔴 | Risolvere `DpaTemplate.tsx:210`: **o esiste** un contratto laboratorio↔UÀ e il prodotto ne conserva traccia, **o la frase si riscrive** in modo che non affermi un fatto non dimostrabile | è la stessa classe di difetto di D126, ed è rivolta a un terzo |
| **C2** 🔴 | Aggiungere gli **obblighi del Titolare** | elemento **nominato** dall'Art. 28(3), ribadito dall'EDPB §102 |
| **C3** 🔴 | Sciogliere la contraddizione **Art. 1 ↔ Art. 7** su titolare/responsabile | da lì dipende la difesa contro le richieste di cancellazione |
| **C4** 🟠 | Censire le **immagini di lavorazione** fra i tipi di dati e allineare le **categorie di interessati** | il documento le disciplina senza averle dichiarate |

### Prima di scrivere il codice dell'ondata 2

| # | cosa | perché |
|---|---|---|
| **C5** 🔴 | **Chiudere il registro in scrittura** dal browser (regola `FOR SELECT`, sul modello di `sdi_receipts`) **e** aggiungere la sorveglianza delle modifiche, come già ce l'ha la dichiarazione di conformità | senza, la prova la può scrivere chi deve subirla — e farlo **dopo** significa riscrivere una tabella che contiene prove |
| **C6** 🔴 | **Ricalcolare** l'impronta sui byte **effettivamente serviti** al momento dell'accettazione, confrontarla, **rifiutare** se non torna, e conservarla sulla riga dell'accettazione. Togliere ai membri del laboratorio la modifica e la cancellazione dei file DPA in archivio | senza, «il contratto accettato» è ciò che il laboratorio decide oggi. ⚠️ C6 senza C5 è decorativa |
| **C7** 🔴 | **Gettone dedicato all'accettazione**: monouso, a scadenza breve, conservato in forma di impronta, con una riga per ogni invio. **Mai** riusare il `portale_token` esistente | quel gettone **il laboratorio ce l'ha sotto gli occhi** nella scheda cliente e lo manda su WhatsApp: riusarlo significa che il laboratorio può accettare al posto del dentista **usando il prodotto così com'è**, senza toccare niente |
| **C8** 🔴 | **Ancoraggio di identità**: come minimo un codice usa-e-getta a un recapito che il laboratorio **non controlla** (email dello studio in anagrafica, o la PEC che è già in anagrafica) | è ciò che separa «qualcuno con un link» da «qualcuno che governa la casella dello studio». È anche il gancio testuale del CAD: «*riconducibilità all'autore*» |
| **C9** 🟠 | Decidere se l'accettazione viene **stampata dentro** il PDF | oggi il documento conservato mostra **due righe di firma vuote**: a vederlo è un contratto non firmato, qualunque cosa dica il registro. E cambia il template, quindi la versione: **è una decisione da prendere prima** |
| **C10** 🟠 | Progettare la **successione fra versioni** (quale riga è in vigore, che ne è di quella accettata sul testo vecchio) e la **revoca** come innesco della lettera g) dell'Art. 28(3) — cancellazione o restituzione a scelta del Titolare — **non** come semplice cambio di stato | 🔑 **L'Art. 28 non prevede una «revoca»:** riletti tutti i paragrafi, non esiste. Un DPA è un contratto, non un consenso: «ritirare l'accettazione» significa **sciogliere un contratto**. Un tasto che dicesse «revoca il consenso» direbbe una cosa sbagliata |
| **C11** 🟠 | Chiudere **P10** prima, non dopo | altrimenti si arriva a **due contratti accettati** per gli stessi dati, di cui uno invisibile al controllo di riuso |

### Raccomandata, a costo quasi nullo

**C12** 🟡 — Una **marca temporale qualificata giornaliera** sull'impronta del registro del giorno (non una per accettazione): sposta la data **fuori dalle mani del laboratorio**. ⚠️ **Prezzi non riverificati da me** — l'advisor riporta ~70-80 €/anno per l'intera piattaforma su un solo rivenditore: da controllare prima di metterlo a preventivo.
**C13** 🟡 — Una prova che verifichi che il predicato dell'indice, il filtro del guard e quello della rilettura **restino la stessa cosa**. Oggi quell'invariante — che D132 chiama «la parte che si sarebbe potuta sbagliare» — è affidata a **tre commenti** e a nessuna prova, ed è la prima che l'ondata 2 toccherà.

---

## 5. Che cosa resta **NON VERIFICATO**

1. 🔴 **Se il contratto laboratorio↔UÀ esista fuori dal prodotto.** Non verificabile dal codice: **domanda per Francesco**.
2. 🔴 **Se UÀ abbia sottoscritto gli accordi con Supabase, Vercel e Resend.** Tutti e tre li pubblicano in forma standard; se siano stati accettati è un fatto d'azienda, non di codice. **Domanda per Francesco.**
3. 🟠 **Se il DPA sia forma scritta «a pena di nullità» o solo «per la prova».** Nessuna fonte primaria lo dice. ⚠️ **Esiste un ramo sfavorevole non escludibile:** se un DPA rientrasse fra gli «altri atti specialmente indicati dalla legge» (art. 1350 n. 13 c.c.), il CAD art. 21 co. 2-bis imporrebbe **almeno la firma avanzata a pena di nullità**. Nessuna fonte letta lo afferma né lo esclude. **Si scrive «non verificato» e si va avanti** — ma la condizione **C8** chiude anche questo ramo, ed è una ragione in più per non saltarla.
4. 🟠 **Nessuna sentenza italiana** letta alla fonte sull'accettazione tracciata sotto il secondo periodo dell'art. 20 co. 1-bis. Nessun provvedimento del Garante che valuti la **forma** di un DPA accettato elettronicamente (quelli letti riguardano la sua **assenza**).
5. 🟠 **La scrittura falsificante sul registro non è stata ESEGUITA.** La conclusione del §3 ① è **derivata** da tre letture del catalogo vivo, non dimostrata: si legge in sola lettura e non si scrive su un ambiente vero senza una decisione di Francesco.
6. 🟡 **Se l'indirizzo di rete registrato sia falsificabile dal client** (`portale/audit.ts` prende il **primo** valore di `x-forwarded-for`, che nella forma standard è la posizione controllata dal chiamante). Da provare prima di considerarlo un anello.
7. 🟡 **La verità delle sei misure di sicurezza** ancora dichiarate nel contratto. Tre sono state misurate il 03/08 ed erano **false**; queste sei non risultano misurate da nessuna parte.
8. 🟡 **I prezzi delle marche temporali** (un solo rivenditore, una sola data).

---

## 6. Che cosa deve decidere Francesco — sarà la PROSSIMA decisione a verbale

Il panel **non ratifica**: propone. Le tre domande, in ordine:

1. **D128 resta com'è, con le condizioni C1-C11?** Oppure si guarda di nuovo l'opzione scartata — la firma avanzata con un fornitore certificato — alla luce del fatto che l'accettazione tracciata, **da sola**, in causa non regge?
2. **Esiste il contratto laboratorio↔UÀ?** Da questa risposta dipende se C1 è una riga di testo da riscrivere o un documento da produrre.
3. **Si accetta l'ORDINE?** Cioè: le correzioni di testo C1-C4 **prima** di qualunque accettazione, anche a costo di rimandare l'ondata 2 di qualche giorno. È l'unica condizione che, se saltata, **non si può più recuperare a costo zero**.
