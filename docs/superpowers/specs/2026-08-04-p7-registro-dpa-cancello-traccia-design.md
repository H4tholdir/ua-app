# Spec — P7: il registro DPA smette di essere riscrivibile da chi dovrebbe vincolare, e comincia a lasciare traccia

**Stato: NON ESEGUITA** — scritta il 04/08/2026, approvata da Francesco in sessione, **nessuna riga di codice ancora scritta**.
**Decisioni che la fondano:** **D146** (la FASE 1 parte da P7) · **D147** (cancello + traccia, la guardia sulla firma va a P19-b) · **D148** (la traccia deve saper dire anche *chi*).
**Voce di roadmap:** **P7** · **Fase:** 1 (finire la PWA, D144-D145).

> ⚠️ **Sulla data.** L'orologio della macchina dice **2 agosto**; i documenti di questo progetto seguono la serie del **4 agosto**, e questa spec la tiene. `provato:` `find docs -name "2026-08-04-*"` → è il **settimo** documento della serie (5 in `roadmap/`, 2 in `specs/`).

---

## 0. 🛑 Che cosa questa spec NON è

**Non è la protezione vera della prova.** La protezione vera è la guardia «*una firma, una volta messa, non si riscrive*», e **non si costruisce qui**: la cosa da proteggere — l'accettazione del dentista — **non esiste ancora**, arriva con **P19-b**, che non ha spec. Costruire il vincolo prima della sua forma significa dargli quasi certamente la forma sbagliata (D147).

**Non è la riparazione del «chi» per tutta l'app.** Il buco vale per tutte e dieci le tabelle sorvegliate. Qui si ripara **una** tabella, quella che dovrà reggere una prova. Il resto si **riferisce** (D148, R-E2).

**Non tocca nessuna schermata.** Nessun mockup, nessuna approvazione visiva, nessun gate estetico L2: la superficie utente non cambia di un pixel.

---

## 1. Il problema, in una riga

**La tabella che dovrà contenere la prova dell'accettazione è oggi scrivibile dalla parte che quella prova dovrebbe vincolare, e nessuno se ne accorgerebbe.**

Due difetti distinti, che si sommano:

| | il difetto | perché è un difetto |
|---|---|---|
| **①** | La regola di riga `dpa_laboratorio` vale per **tutti i comandi** e non ha un controllo separato per la scrittura | PostgreSQL riusa allora la condizione di **lettura** come controllo di **scrittura**: un utente del laboratorio — **anche un `tecnico`** — potrebbe riscrivere `firmato_da`, `firmato_at`, `stato`, `pdf_sha256` delle righe del proprio laboratorio |
| **②** | La tabella **non è fra le sorvegliate** dal registro delle modifiche | non resta **nessuna traccia** di chi ha cambiato cosa |

🔑 **Una prova che la parte interessata può scrivere da sola non è una prova debole: è il contrario di una prova** — ed è peggio del nulla, perché *sembra* una prova.

---

## 2. Le misure — tutte riverificate OGGI, nessuna ripresa dai documenti

🛑 La roadmap dichiarava «2 righe, 0 firmate» fra i numeri **non riverificati** del 03-04/08, e l'ultima lettura del database dal terminale era stata **bloccata dal filtro dell'ambiente**. Stavolta è passata. Ogni riga qui sotto viene da una lettura in **sola lettura** (`read_only: true`) fatta prima di scrivere questa spec.

| # | domanda | risposta misurata |
|---|---|---|
| **M1** | la finestra è ancora gratuita? | **`{"righe":2,"con_firmato_at":0,"con_firmato_da":0,"con_impronta":2}`** · stati: **`{"stato":"da_firmare","n":2}`** → **2 righe, 0 firmate**, il numero del 04/08 **regge** |
| **M2** | com'è fatta la regola, davvero? | **`dpa_laboratorio`**, `cmd = ALL`, `qual = ((laboratorio_id = current_lab_id()) AND (deleted_at IS NULL))`, **`with_check = null`**, `rls_attiva = true`, `rls_forzata = false` |
| **M3** | com'è fatto il precedente in casa? | **`sdi_receipts_laboratorio`**, `cmd = SELECT`, `qual = (laboratorio_id = current_lab_id())`, col commento nello schema «*Solo INSERT/SELECT — mai UPDATE/DELETE su documenti fiscali*» (`supabase/schema.sql:2963-2966`) |
| **M4** | quante tabelle sorveglia il registro? | **dieci**: `cicli_produzione` · `clienti` · `dichiarazioni_conformita` · `fasi_produzione` · `fatture` · `laboratori` · `lavori` · `listino` · `magazzino` · `utenti`. **`data_processing_agreements` NON c'è** |
| **M5** | il registro sa dire **chi**? | **`{"righe":1588,"con_attore":1,"senza_attore":1587}`** → **una riga su 1.588**. La macchina legge `auth.uid()`, ma ogni scrittura dell'app passa dal client di **servizio**, che non ha identità |
| **M6** | il precedente del «chi» è riempito? | 🔴 **NO — ed è la trappola.** `dichiarazioni_conformita.generated_by` esiste (`schema.sql:1261`, commento «*chi ha premuto "Consegna"*») ma **nessuno lo scrive**: nel codice compare **solo** in `database.types.ts` (generato). In banca dati: **`{"righe":5,"con_chi":0}`** |
| **M7** | passare a sola lettura rompe la cancellazione di un laboratorio? | **NO.** `admin_delete_laboratorio` è l'**unica** funzione che cancella da quella tabella ed è **`security_definer = true`, proprietario `postgres`**; `postgres` è anche **proprietario della tabella** e `relforcerowsecurity = false` → **la RLS la scavalca** |
| **M8** | agganciare il registro rompe la cancellazione di un laboratorio? | **NO.** `audit_log` non ha **nessuna chiave esterna** (solo `audit_log_pkey` e `audit_log_operation_check`), quindi nessuna cascata. E il meccanismo **funziona già** su tabelle cancellate dalla stessa RPC: `lavori` **82** cancellazioni registrate, `clienti` **6**, `laboratori` **4** |
| **M9** | `emesso_da` esiste già? | **No.** Le 22 colonne della tabella sono state elencate una per una. ⚠️ **`firmato_da` è `text`, non un utente:** è il **nome della controparte** che firma allo studio, non chi opera in UÀ |
| **M10** | chi scrive nella tabella, oggi? | **Solo il client di servizio.** `src/lib/pdf/generate-dpa.ts:89` (`getTypedServiceClient()`) e `src/app/(app)/clienti/[id]/page.tsx:166` (lettura). **Nessun percorso dal client dell'utente** |

---

## 3. Il disegno — tre pezzi, un solo ramo

### ① Il cancello — la regola diventa di sola lettura

La regola `dpa_laboratorio` passa da `FOR ALL` a **`FOR SELECT`**, sul modello di `sdi_receipts` (M3). La condizione resta identica, **compreso `deleted_at IS NULL`**: ora che è **solo** una regola di lettura, quel filtro fa esattamente il mestiere per cui era stato scritto — nascondere le righe archiviate — invece di fare da lasciapassare in scrittura.

🔑 **Non serve un `WITH CHECK`:** senza un comando di scrittura ammesso, non c'è scrittura da controllare. Aggiungerlo darebbe l'impressione di una porta sorvegliata dove invece non c'è più porta.

⚠️ **Che cosa questo NON fa, e va scritto o la prossima sessione lo crede protetto:** il client di **servizio** scavalca la RLS per costruzione (M7, M10). Il cancello chiude la porta **laterale** — quella diretta dal dispositivo dell'utente, oggi inesistente e domani apribile per sbaglio. **La porta principale, quella del server, resta com'è**, ed è ciò di cui si occuperà P19-b.

### ② La traccia — da dieci tabelle a undici

Si aggancia `data_processing_agreements` al registro delle modifiche, con lo stesso automatismo generico delle altre dieci (`_audit_trigger_fn`, `AFTER INSERT OR DELETE OR UPDATE ... FOR EACH ROW`). La funzione è **generica**: legge `id` e `laboratorio_id` da `to_jsonb(NEW/OLD)` — entrambe presenti sulla tabella — e conserva la **fotografia completa** della riga prima e dopo.

### ③ Il chi — la colonna `emesso_da`

Colonna nuova: **`emesso_da UUID REFERENCES utenti(id)`**, **annullabile**, riempita al punto esatto in cui la riga nasce (`src/lib/pdf/generate-dpa.ts:284-303`, un `.insert({…})` normale — **nessuna funzione di database da attraversare**, verificato aprendo il file).

**Perché annullabile e non obbligatoria in banca dati:** le **2 righe** che esistono (M1) sono nate prima, e **non si sa chi le abbia emesse**. Riempirle a caso sarebbe inventare una prova; metterle `NOT NULL` richiederebbe di inventarla. Il vincolo vive **nel compilatore** (§4), non in un valore finto.

**Perché il nome:** la tabella ha già **`emesso_at`** — c'era il *quando*, mancava il *chi*. 🛑 **Non si chiama `firmato_da`, che esiste già ed è un'altra cosa** (M9): `firmato_da` è il **nome della controparte allo studio**, `emesso_da` è **l'utente di UÀ che ha premuto**. Due colonne che si leggono entrambe «chi» e indicano **parti diverse** sono il modo classico in cui, mesi dopo, qualcuno scrive la sbagliata dentro una prova.

#### 🛑 La chiave esterna: la clausola si SCEGLIE, non si eredita

Una chiave esterna senza `ON DELETE` vale `NO ACTION`: **cancellare l'utente fallisce** finché una riga lo nomina. Va deciso apposta, perché il difetto sarebbe di quelli che si vedono solo in produzione.

**Decisione: `REFERENCES utenti(id)` NUDA, come tutte le altre — e per due ragioni provate, non per abitudine.**

- `provato:` **nessuna** delle **18** chiavi esterne che puntano a `utenti` in tutto il progetto dichiara un `ON DELETE` (`tecnici` · `lavori` · `dichiarazioni_conformita` · `pagamenti` · `notifiche` · `messaggi` · `fascicoli_tecnici` · `risk_analyses` · … tutte nude). Fare l'eccezione qui sarebbe il vero pericolo.
- `provato:` **non esiste nessun percorso che cancelli un utente SINGOLO**: `from('utenti')` nel codice applicativo compare solo in **lettura**; gli utenti spariscono **unicamente** dentro `admin_delete_laboratorio`.
- 🔑 **E lì l'ordine tiene, ma da oggi è PORTANTE:** `provato:` in `supabase/migrations/20260727120200_lavori_colore_caso.sql` la riga `DELETE FROM data_processing_agreements` è alla **155**, `DELETE FROM utenti` alla **163** — le righe che nominano l'utente se ne vanno **otto istruzioni prima** di lui. ⚠️ **Chi in futuro riordina quella funzione deve saperlo**, e **T4** è la prova che lo tiene onesto.

🛑 **Scartato `ON DELETE SET NULL`**, che pure farebbe funzionare tutto: **cancellerebbe il «chi»** dalla riga nel momento in cui un tecnico lascia il laboratorio — cioè proprio quando serve sapere chi era. Contraddirebbe **D148** in silenzio.

⚠️ **E il precedente NON copre questo caso:** `dichiarazioni_conformita.generated_by` ha la chiave esterna **identica**, ma essendo **sempre vuota** (M6) quel cammino **non è mai stato percorso con un valore dentro**. Qui lo sarà. Per questo T4 non è una formalità.

---

## 4. 🔑 Il vincolo che rende ③ diverso dalla colonna morta della DdC

**Il terzo parametro di `generateDpa` è OBBLIGATORIO, non facoltativo.**

```
// oggi
generateDpa(laboratorio_id: string, cliente_id: string)
// dopo
generateDpa(laboratorio_id: string, cliente_id: string, emesso_da: string)
```
`non eseguito` — l'esecutore lo verifica con `npx tsc --noEmit`, che **deve** accendersi su ogni chiamata a due argomenti.

**La ragione sta in M6, ed è un fatto, non un timore.** Il registro **fratello** — le dichiarazioni di conformità — ha **già** la sua colonna «chi ha premuto», col commento nello schema. Nessuno la riempie. **5 righe, 0 con il chi.** Una colonna facoltativa è una colonna che qualcuno dimenticherà, e la dimenticanza **non fa rumore**.

Con il parametro obbligatorio, il rumore lo fa il **compilatore**: l'app non si costruisce finché ogni chiamante non dice chi ha premuto. La rete smette di essere una buona intenzione.

⚠️ **Il prezzo, dichiarato in anticipo e accettato da Francesco:** i test chiamano quella funzione in **una sessantina di punti** (`tests/unit/dpa-registro.test.ts` da solo ~50, più `generate-dpa.test.ts` e `dpa-route.test.ts`), tutti con **due** argomenti. Vanno aggiornati tutti. È **la parte più grossa** del cambiamento ed è lavoro meccanico — ma è il prezzo della rete, non uno spreco.

**L'unico chiamante applicativo** è `src/app/api/clienti/[id]/dpa/route.ts:49`, e **ha già** il dato: `getLabContextWithTimings()` restituisce un contesto che porta **`userId`** (`src/lib/supabase/lab-context.ts:12-13`). Non serve nessuna nuova lettura.

---

## 5. Come si prova che è fatta

🛑 **«La migration è andata a buon fine» non prova niente**: prova che il database ha accettato una frase. Ogni prova qui sotto richiede un **comportamento**, e due su tre richiedono un valore che **DEVE essere rifiutato** (R-P1).

| # | la prova | che cosa NON basta |
|---|---|---|
| **T1** | 🔴 **Il rifiuto vero.** Un client `authenticated` di un laboratorio tenta un `UPDATE` su una riga del **proprio** laboratorio e **viene respinto**, col messaggio incollato. E la **lettura** dello stesso client continua a funzionare | «`CREATE POLICY` è riuscita». Una regola creata prova la sintassi, non il comportamento |
| **T2** | 🔴 **La traccia esiste davvero.** Dopo un'emissione c'è **una riga nuova** in `audit_log` con `table_name = 'data_processing_agreements'`, l'operazione giusta e la fotografia dei valori | «il trigger risulta creato» |
| **T3a** | 🔴 **Il «chi» è riempito su un'emissione NUOVA.** Con `riemessa: true`, `emesso_da` della riga nuova **non è vuoto** e vale l'utente che ha premuto. **È ESATTAMENTE la prova che alla DdC è mancata** (M6) | «la colonna esiste» e «il tipo compila» — sono le due cose che la DdC ha **già** |
| **T3b** | 🛑 **Sul RIUSO il «chi» NON si tocca.** Con `riemessa: false` la funzione restituisce una riga esistente **senza scriverla** (`generate-dpa.ts:162-171`): `emesso_da` deve restare **quello di chi emise allora**, anche se a scaricare è un altro utente. Si asserisce che è **invariato**, non lo si lascia al caso | 🔑 **Perché questa prova esiste:** senza di lei un esecutore che legge solo T3a fa riscrivere `emesso_da` sul ramo di riuso «per coerenza» — cioè **riscrive un campo del registro delle prove**, che è **il difetto che P7 esiste per chiudere**. La colonna dice **chi ha emesso**, e l'emissione è avvenuta una volta sola |
| **T4** | 🔴 **La cancellazione di un laboratorio funziona ancora — con `emesso_da` DAVVERO RIEMPITO.** Cioè: emissione con un utente vero, poi `admin_delete_laboratorio`, e la funzione **arriva in fondo** | l'analisi di M7/M8 (sono argomenti, non esecuzioni) **e** una prova su righe con `emesso_da` vuoto: sarebbe il cammino che la DdC percorre da mesi senza mai esercitare la chiave esterna (§3 ③) |
| **T5** | **FASE 6b** — `npx supabase gen types typescript … > src/types/database.types.ts` poi `npx tsc --noEmit` | — |
| **T6** | **FASE 7 per intero**, output incollato: `npx tsc --noEmit` **0** · `npx vitest run` · `npx next build` uscita **0**. Riferimento di partenza: **4380 \| 19** prove | due comandi su tre |

**Forme d'input da enumerare prima delle asserzioni** (R-P4), sul terzo parametro: id valido · stringa vuota · `undefined` passato esplicitamente · id di un utente di **un altro laboratorio** · id inesistente (la chiave esterna deve mordere). Ognuna col suo caso o col suo «non coperta, perché».

---

## 6. Che cosa resta fuori, e DOVE va — nessun ritrovamento muore in chat

| ciò che resta fuori | destinazione |
|---|---|
| 🔴 La guardia «**una firma non si riscrive**», che vale anche contro il client di servizio | **P19-b** — va scritta come **vincolo dichiarato** nella sua spec, non ricordata (D147) |
| 🟠 Il «chi» **per le altre dieci tabelle** — 1.587 righe su 1.588 senza attore (M5) | **nuova voce di roadmap**, non toccata qui (D148, R-E2) |
| 🟠 `dichiarazioni_conformita.generated_by`: colonna viva, **zero scrittori**, 5 righe vuote (M6) | **nuova voce di roadmap** — è un difetto **fuori mandato**, si riferisce e non si corregge di nascosto (R-E2) |
| 🟡 `audit_log` ha la protezione di riga **attiva e ZERO regole** → nessun laboratorio può leggere la propria traccia | **si annota**: è fail-closed, quindi sicuro, ma è una scelta mai dichiarata. Non si tocca qui |

---

## 7. Che cosa resta NON VERIFICATO

- **Il comportamento di `_audit_trigger_fn` su questa tabella non è stato eseguito**, solo letto (`supabase/migrations/20260517000002_fix_audit_trigger_jsonb.sql`). L'analisi dice che è generica e che le due colonne che le servono ci sono; **T2 è ciò che lo prova**, non questa riga.
- **Non è stato misurato di quanto cresce `audit_log`** con undici tabelle invece di dieci. Il volume atteso è basso (le emissioni DPA sono rare), ma è una stima, non una misura.
- **Il «chi» resterà vuoto per le 2 righe esistenti**, per sempre e per scelta (§3 ③).
- 🛑 **Il cancello non protegge la prova dal laboratorio** finché la porta del server resta com'è. Questa spec lo dichiara in §3 ① e lo consegna a P19-b: **è una limitazione dichiarata, non un difetto scoperto dopo**.

---

## 8. Percorso di processo

**Percorso GRANDE d'ufficio** (`CLAUDE.md` §0C): la modifica tocca **RLS** e porta una **migration**, quindi l'override di dominio critico si applica indipendentemente dal numero di file.

`FASE 4` piano (`writing-plans`, coi registri R-P1 · R-P2 · R-P6) → `FASE 5` **branch nel repo principale**, 🛑 **mai un worktree** → `FASE 6` TDD → `FASE 6b` **migration gate** → `FASE 7` i tre comandi → `FASE 8` review → `FASE 10` deploy → `FASE 11` memoria e roadmap.
**FASE 9/9b non si applicano:** nessuna superficie UI cambia (§0).
