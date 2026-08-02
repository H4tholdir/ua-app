# Panel su D136 — le condizioni di UÀ col contratto sui dati dentro

**Data:** 04/08/2026 · **Chiesto da:** D136, ratificata lo stesso giorno · **Regola Advisor** (17/07/2026).
**Metodo:** tre advisor a mandato **disgiunto** — ① forma e validità del contratto · ② contenuto del DPA e ciò che UÀ può dimostrare · ③ aggancio al prodotto — ognuno con l'ordine esplicito di **provare a demolire** D136.

## 🔑 Verdetto — i tre concordano: **REGGE CON CONDIZIONI**, ma D136 sbaglia il MOMENTO

Il **meccanismo** è giusto: incorporare il contratto sui dati nelle condizioni di servizio e farlo accettare all'ingresso è **esattamente** come i fornitori di UÀ hanno risolto lo stesso problema verso UÀ, ed è ammesso dall'Art. 28(9). **Non è il meccanismo a non reggere.**

🛑 **Ma D136 dice «accettate al momento dell'abbonamento», e quello è sbagliato — non incompleto, sbagliato.**

---

## 0. 🔴 LA COSA PIÙ URGENTE NON RIGUARDA IL CONTRATTO

**`provato:` interrogando la Management API di Supabase, oggi:**

```
{"region":"eu-west-1","pitr_enabled":false,"walg_enabled":true,"backups":[],"physical_backup_data":{}}
```

**Nessuna copia di sicurezza elencata. Nessun ripristino a un istante preciso.**

Questo è un rischio **che esiste adesso**, indipendente da qualunque contratto: se il database si corrompe o qualcuno cancella qualcosa per sbaglio, **non c'è da dove tornare indietro**. Oggi ci sono solo dati di prova e il danno sarebbe zero — ma il momento in cui entra il primo laboratorio vero è anche il momento in cui questo diventa il rischio principale del prodotto.

⚠️ **È coerente col piano gratuito** su cui gira l'organizzazione (`plan: "free"`, letto il 04/08), **ma non l'ho provato**: la Management API non espone l'abbonamento. Va guardato nel pannello.

📌 **Perché sta qui e in testa:** l'Art. 32(1)(b) e (c) nominano espressamente *disponibilità*, *resilienza* e «*la capacità di ripristinare tempestivamente la disponibilità e l'accesso dei dati personali in caso di incidente*». **È l'unica condizione di questo panel che si compra, non si scrive.**

---

## 1. 🔴 Il momento è sbagliato — e la prova è in tre righe di codice

| passo | dove | che cosa dice |
|---|---|---|
| un laboratorio **nasce in prova** | `src/app/api/admin/labs/route.ts:86` | `stato: 'trial'` |
| **in prova, tutte le scritture passano** | `src/lib/supabase/lab-guard.ts:55-58` | se la prova non è scaduta → `return null`, cioè consentito |
| l'abbonamento arriva **dopo** | `src/app/(app)/layout.tsx:51-57` | a `/billing` ci si va **per rimando**, quando la prova è finita |

➡️ **Fra l'ingresso e il pagamento c'è una finestra intera in cui entrano dati veri di pazienti** — nomi, prescrizioni, immagini cliniche — **e UÀ li tratta senza nessun contratto**. Che è precisamente ciò che il contratto deve coprire.

✅ **Il momento giusto è il PRIMO ACCESSO**, e il posto ideale esiste già: quando il titolare apre l'invito e attiva l'account, una procedura fa **tutto in un'unica operazione indivisibile** (`supabase/migrations/20260525000002_invite_atomic.sql:20-57`). Attaccandoci l'accettazione si ottiene la forma più forte che questa architettura possa dare: **o nasce l'utente con l'accettazione, o non nasce niente.**

---

## 2. 🔴 Cassazione 20945/2026 — la spunta non basta, e il rischio va nella direzione opposta

**Cassazione civile, Sez. III, ordinanza n. 20945 del 20 giugno 2026.** Contratto **fra due imprese** concluso online spuntando caselle, con **doppio flag** sulla clausola del foro. Principio di diritto:

> «*…la clausola vessatoria deve essere specificamente approvata per iscritto dall'acquirente, ai sensi dell'art. 1341, comma secondo, c.c., mediante firma digitale – che nel caso di contratti non soggetti a forma ad substantiam ex art. 1350 c.c. può assumere la veste della firma elettronica (o c.d. digitale leggera), di cui all'art. 3, punto 10, del Regolamento UE n. 910 del 2014 (c.d. eIDAS) – **non essendo di per sé sufficiente la mera «spunta» (o «flaggatura») della casella corrispondente alla clausola stessa***»

⚠️ **Come è stata verificata, e il limite dichiarato.** La sentenza è del **20 giugno 2026**, cioè **posteriore alla conoscenza di Claude**: non poteva essere trovata a memoria, ed è la ragione per cui questo panel andava fatto. 🛑 **Il PDF della Corte non si è aperto** (errore di certificato su `italgiure.giustizia.it`): la citazione è **riscontrata verbatim** su una pubblicazione giuridica indipendente (Diritto Bancario) e **confermata da altre nove fonti**, fra cui *Il Sole 24 Ore*. **Non è una lettura alla fonte primaria fatta da me**, e va detto.

⚠️ Ed è **una** ordinanza di sezione semplice, non delle Sezioni Unite: è la pronuncia più recente e in termini, **non ancora orientamento consolidato**.

### 🔑 L'asimmetria — è il ragionamento che vale l'intero panel

L'art. 1341 co. 2 c.c. **non annulla il contratto**: dice che **singole condizioni** «*non hanno effetto*». E colpisce **solo** un elenco: limitazioni di responsabilità · facoltà di recedere o **sospendere** · decadenze · **rinnovo tacito** · deroghe alla competenza del giudice. Cioè **tutte e sole le clausole con cui UÀ protegge sé stessa**.

**Il contratto sui dati NON è in quell'elenco** — i suoi obblighi gravano su UÀ, non limitano niente — **quindi sopravvive**.

> **Lo scenario vero, e va nella direzione opposta a quella che ci si aspetta:** un laboratorio smette di pagare, UÀ sospende, il laboratorio fa causa **davanti al proprio tribunale**, chiede danni **oltre il tetto** ed eccepisce che quelle clausole non furono specificamente approvate. Con questa pronuncia **vince su tutte e tre**. Nel frattempo **tutti gli obblighi del contratto sui dati restano in piedi**.
> **Risultato: UÀ resta legata a ogni proprio dovere e priva di ogni propria difesa** — con dati sanitari di mezzo, quindi **senza tetto al risarcimento**.

➡️ **Struttura giusta:** condizioni + contratto sui dati **con un clic** (va bene); **le clausole che proteggono UÀ in un SECONDO passaggio separato**, con le clausole richiamate una per una e approvate con una **firma elettronica anche semplice** — la Corte fa l'esempio del **codice usa-e-getta per SMS o email**. Non serve SPID, non serve la firma digitale con dispositivo.

🛑 **E «lo fanno Supabase, Vercel e Resend» NON vale qui:** sono società non italiane, rette da legge non italiana, **dove l'art. 1341 non esiste**. Quel precedente vale per l'Art. 28(9) e per nient'altro.

---

## 3. 🔴 La macchina dell'ondata 1 NON si riusa — provato sul catalogo vivo

| prova | esito |
|---|---|
| `dpa_emissione_coerente` | il ramo «emissione completa» pretende `… AND dentista_id IS NOT NULL AND tipo_controparte = 'dentista'` → **una riga `sub_responsabile` non può portare numero, percorso e impronte** |
| `dpa_emissione_viva_unica` | `UNIQUE (laboratorio_id, dentista_id, payload_sha256, template_versione)` → **col dentista NULL i valori sono tutti distinti fra loro e la deduplicazione smette di funzionare, in silenzio** |

🔑 **Proprio la proprietà che si vorrebbe ereditare è quella che si rompe.** ➡️ **Tabella nuova, in sola aggiunta. Si copia il modo di fare — progressivo, conservazione, impronta del testo, versione — non il codice.**

✅ **Effetto collaterale buono:** resta libera la riga `tipo_controparte='sub_responsabile'` per ciò a cui la tabella la destina davvero — il registro dei sub-responsabili **del laboratorio**.

⚠️ **Una differenza di sostanza che il brief dava per scontata e non regge:** il contratto al dentista è **un testo diverso per ogni dentista** (stampa l'anagrafica dello studio). Le condizioni di UÀ sono **lo stesso identico testo per tutti**. Quindi il documento si conserva **una volta per versione**, non una per accettazione, e l'impronta che conta è **quella del testo** (già in casa, D133) — non quella dei dati, che qui non ha oggetto.

---

## 4. 🔴 Che cosa UÀ **non può promettere** — misurato, non stimato

| misura | esito | prova |
|---|---|---|
| cifratura **in transito** | ✅ **c'è** | `strict-transport-security: max-age=63072000` su `uachelab.com` |
| **dati in area UE** | ✅ **c'è** | `region: eu-west-1` (Irlanda) · `x-vercel-id: fra1` (Francoforte) |
| **isolamento fra laboratori, banca dati** | ✅ **c'è** | **69 tabelle su 70** con protezione di riga attiva (l'unica senza è una tabella di consultazione senza dati personali) |
| **archivio non pubblico** | ✅ **c'è** | i contenitori `documenti` e `fatture-pdf` sono privati; l'URL pubblico risponde **400** |
| **isolamento delle FOTO cliniche** | 🔴 **non come protezione di riga** | le foto stanno in `lavori/<id>/…`, mentre la regola vuole l'id del laboratorio al primo livello — **e comunque l'app usa la chiave di servizio, che salta ogni regola**. Lo dice il codice stesso: «*la RLS è aggirata, e questi tre confronti sono l'unico controllo di appartenenza che esiste*» |
| **copie di sicurezza e ripristino** | 🔴 **non dimostrabile** | v. §0 |
| **autenticazione a più fattori** | 🔴 **non c'è** | le colonne esistono e **nessuno le legge**; **0 utenti su 7** l'hanno attiva |
| **registro di TUTTI gli accessi** | 🔴 **non c'è** | si registrano le **modifiche**, e le **letture** del personale non si registrano affatto |
| **tracciamento degli accessi di UÀ** | 🔴 **non c'è, e c'è di peggio** | l'impersonificazione crea una sessione **come il titolare**: l'evento non è registrato, e ogni azione successiva finisce nel registro **con l'identità del cliente** |
| **verifica periodica dell'efficacia** (Art. 32(1)(d)) | 🔴 **non c'è** | nessun controllo di sicurezza nella CI; `npm audit` oggi dà **17 vulnerabilità, 11 alte**, con correzione disponibile |

🔄 **E una correzione a un nostro documento:** la roadmap dice che il registro delle modifiche copre «*due tabelle che non sono né `lavori` né `pazienti`*». `provato:` **il catalogo vivo ne mostra DIECI, e `lavori` è dentro**. La riga era pessimistica. (`pazienti` resta fuori: quello è vero.)

### 🔴 E la cancellazione fabbrica una copia di ciò che cancella

`provato:` la funzione che cancella un laboratorio **accende i trigger di sorveglianza**, che scrivono in `audit_log` la riga intera prima di perderla — e **non ripulisce mai quel registro**.

- **15 righe di `audit_log` appartengono a 5 laboratori che non esistono più.**
- Su `lavori`: **82 righe di cancellazione su 82** e **360 di modifica su 360** contengono `paziente_nome_snapshot`, cioè **il nome del paziente**.

🔑 L'Art. 28(3)(g) dice «*e cancelli **le copie esistenti**»*. **Il registro è una copia esistente.**

🔄 **Correzione alla voce P2, in senso favorevole:** «cancellare un laboratorio lascia i suoi PDF nell'archivio» è **vero come difetto di disegno** ma **oggi non si è materializzato**: contati i file, tutti hanno un lavoro o un laboratorio vivo. **Il difetto è certo e prospettico, non ancora un danno.**

---

## 5. Le condizioni, in ordine

### Di TESTO — ore di lavoro, si fanno subito e in un colpo solo

**T1** elencare le misure **vere** e togliere le false; la cifratura a riposo **per attribuzione all'infrastruttura**, mai come garanzia propria · **T2** dichiarare **TRE** sub-responsabili (Supabase, Vercel, Resend), e i destinatari per obbligo di legge in sezione **separata** · **T3** scrivere gli **obblighi del Titolare** — elemento che l'Art. 28(3) **nomina** e l'EDPB ribadisce al §102 · **T4** aggiungere fra gli interessati il **personale del laboratorio** e i **dentisti**, e fra i dati le **immagini di lavorazione** · **T5** una clausola di modifica **separata** da quella delle condizioni: preavviso, opposizione, recesso senza penale (Art. 28(2)) · **T6** mettere i **dati identificativi di UÀ**, che oggi nel prodotto non ci sono · **T7** sulla violazione scrivere «**senza ingiustificato ritardo**», la formula dell'Art. 33(2) — **mai «24 ore»**, come fa oggi il contratto ai dentisti, perché non esiste niente che rilevi una violazione · **T8** sulla cancellazione scrivere **ciò che si sa fare**, con l'elenco dichiarato di ciò che sopravvive e perché.

### Di FORMA — dalla Cassazione

**F1** 🔴 un **secondo passaggio separato** in cui le clausole vessatorie sono richiamate una per una e approvate con **firma elettronica anche semplice** (raccomandato: codice usa-e-getta per SMS/email) · **F2** 🔴 **censire** quali clausole delle condizioni ricadono nell'elenco dell'art. 1341 co. 2 — trattandolo come **minimo, non massimo** · **F3** tenere il contratto sui dati **fuori** dal secondo passaggio, ma **pulito**: nessuna limitazione di responsabilità o facoltà di sospensione infilata lì dentro · **F4** rendere il testo **stampabile e salvabile prima** dell'accettazione (requisito esplicito di CGUE C-322/14) · **F5** conservare il **fascicolo della prova**: versione, impronta del testo, momento, identità e **ruolo** di chi accetta, e la traccia del secondo passaggio.

### Di LAVORO — decidono i tempi, e vanno **PRIMA** della prima accettazione

**L1** 🔴 **copie di sicurezza e una prova di ripristino** — l'unica che si compra · **L2** 🔴 la **cancellazione deve toccare davvero** archivio, registro delle modifiche, le nove tabelle censite e gli account di autenticazione — **oppure il contratto lo dichiara per iscritto** · **L3** 🔴 **tracciare l'accesso di UÀ** ai dati del cliente, e **mai sotto l'identità del cliente** · **L4** 🟠 il **registro dell'Art. 30(2)**, che è l'oggetto materiale che si consegna al titolare per le lettere f) e h) · **L5** 🟠 un **controllo di sicurezza in CI** · **L6** 🟠 un'**esportazione che comprenda le immagini**, o «restituzione» non si può scrivere.

🛑 **D136 NON regge se si accetta prima di L1, L2 e L3.** In quel caso UÀ firma, verso ogni laboratorio che si abbona, tre affermazioni che oggi non può sostenere. **È la classe di difetto di D126 — con la differenza che quel contratto lo firmava il laboratorio di Francesco, e questo lo firma UÀ.**

---

## 6. Che cosa resta **NON VERIFICATO**

1. 🔴 **Il piano Supabase.** La Management API **non espone** l'abbonamento (`/billing/subscription` → «Cannot GET»). Il `plan: "free"` letto dall'endpoint dell'organizzazione e `backups: []` sono **coerenti fra loro**, ma non è una prova del piano. **Va guardato nel pannello.**
2. 🔴 **Il piano Vercel** — riserva aperta dal panel su D128, ancora aperta.
3. 🟠 **Cifratura a riposo** — nessuna prova nostra: è una proprietà dell'infrastruttura, va scritta **per attribuzione**.
4. 🟠 **Cassazione 20945/2026** — riscontrata verbatim su fonte indipendente, **non letta sul PDF della Corte** (§2). E non è ancora orientamento consolidato.
5. 🟠 **Tassatività dell'elenco dell'art. 1341 co. 2** — trattarlo come **minimo**.
6. 🟠 **Se un dipendente accetti validamente per il laboratorio** — la pronuncia non lo dice: la cautela di far accettare **solo al titolare** è nostra, non imposta.
7. 🟡 **Regione dati di Resend** — è un valore della **nostra** tabella, non un fatto verificato alla fonte. Idem la nota «Stripe: no dati sanitari».
8. 🟡 **Se sia mai stata fatta una verifica di sicurezza** (test di penetrazione): non risulta da nessun documento.

---

## 7. Che cosa deve decidere Francesco

1. **Si sposta il momento** dall'abbonamento al **primo accesso**? (Il panel dice che è l'unico punto in cui D136 non è incompleta ma **sbagliata**.)
2. **Si accetta il secondo passaggio** con codice usa-e-getta per le clausole che proteggono UÀ?
3. **L1-L2-L3 vanno prima della prima accettazione**, anche se allungano i tempi? 🔴 **E L1 — le copie di sicurezza — va fatta comunque e subito, contratto o non contratto.**
