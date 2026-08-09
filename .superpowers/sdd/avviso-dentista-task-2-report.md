# Resoconto — Task 2 dell'ondata «L'avviso al dentista»

**Quando:** 09/08/2026 (orologio letto in un comando separato). **Ramo:** `intervento-post-consegna`.
**Perimetro:** SOLO il Task 2 — `correggi_e_riemetti_atomica` crea l'avviso dentro la propria
transazione. **La firma non è cambiata** (sei parametri, `RETURNS json`): è cambiato il corpo, con
**una** istruzione in più.

| cosa | esito |
|---|---|
| Migration | `20260809133546_correggi_e_riemetti_con_avviso.sql` — applicata e registrata |
| `proacl` dopo il `DROP`+`CREATE` | `{postgres=X/postgres,service_role=X/postgres}` ✅ né `anon` né `authenticated` |
| Prove nuove | **8 su 8** in `tests/integration/correggi-e-riemetti-con-avviso.rpc.test.ts`, zero saltate |
| Le 27 del Task 1 | **27 su 27**, ancora verdi, file non toccato |
| `tsc --noEmit` | `TSC_EXIT=0` · `gen types` → **diff vuoto** (la firma non cambia) |
| `verify:full` | `VERIFY_EXIT=0` · **5867 passate su 5867 in 461 file**, zero saltate |
| R-P4 | **8 asserzioni su 49** si accendono contro l'abbozzo inerte |

---

## ① I difetti del piano

### I tre già noti dal brief — tutti e tre confermati

**① Il file di prova che il piano dice di creare esiste già.** `tests/integration/avvisi-dentista-schema.rpc.test.ts`
è del Task 1, 617 righe, **27 prove di schema**.
➡️ **Deciso: un file nuovo**, `tests/integration/correggi-e-riemetti-con-avviso.rpc.test.ts`.
**Il motivo non è la lunghezza, è il soggetto:** quel file prova proprietà della **tabella** (vincoli,
permessi, catalogo); queste provano il **comportamento di una funzione**. La convenzione
`<nome-rpc>.rpc.test.ts` è già quella degli altri sette file della cartella, e il nome dice quale
contratto si sta guardando. Le 27 non sono state toccate: rilanciate insieme alle mie, **27 su 27**.

**② `v_nuova_ddc_id` è un nome presunto — e il difetto è più grosso di un nome sbagliato.**
Nel corpo vivo **non esiste nessuna variabile scalare** con l'identificativo della dichiarazione nuova,
sotto nessun nome. L'id vive **dentro un record**. La riga vera del corpo vivo che lo porta è la voce
del `jsonb_build_object` dato in pasto a `jsonb_populate_record`:

```
  v_nuova := jsonb_populate_record(
    v_vecchia,
    p_nuova
      || jsonb_build_object(
           'id',             gen_random_uuid(),
```

(`v_nuova` è dichiarata `v_nuova public.dichiarazioni_conformita%ROWTYPE`.) Si rilegge come
**`v_nuova.id`** — la stessa espressione che il `RETURN` usa per `nuova_id`. È il nome che ho usato.

**③ «rossa perché la tabella è vuota» è la ragione sbagliata.** Confermato: il primo rosso è
`expected [] to have a length of 1 but got 0`, cioè **la funzione non inserisce**. Nessun «modulo non
trovato», nessuna «relazione inesistente».

### 🔴 Quattro difetti nuovi

**🔴 N1 — IL PIANO INDICA IL FILE SBAGLIATO DA CUI LEGGERE, E COSTA DUE DECISIONI NORMATIVE.**
Il Task 2 dice «**Apri PRIMA:** `supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql`».
Quel file è stato **superato quattro volte** (`20260808103515`, `20260808112700`, `20260808142358`,
`20260808154033`) e porta un'allowlist di **OTTO** chiavi:

```
149:  c_su_lavori CONSTANT text[] := ARRAY[
150-    'richiedente_nome', 'paziente_id', 'paziente_nome_snapshot',
151-    'numero_prescrizione', 'tipo_dispositivo', 'descrizione'];
```

Il vivo ne ha **quattro** (più le due delle penne = sei). Chi ricopia il corpo da lì **riapre
`numero_prescrizione` e `paziente_nome_snapshot`**, chiusi da D319 e D320 per una ragione normativa
(Allegato XIII punto 1), e rimette in vita la penna che D320 toglie. Il piano indica il primo file di
una catena di cinque come se fosse l'unico.
📌 `provato:` `diff` fra il corpo di `20260808154033` e `pg_get_functiondef` del catalogo vivo →
**0 righe di differenza su 354**. Il vivo e l'**ultimo** file coincidono; il vivo e il file **indicato
dal piano** no.

**🔴 N2 — IL BLOCCO DEL PIANO PUÒ INSERIRE ZERO RIGHE IN SILENZIO.** Il piano propone

```sql
  INSERT INTO public.avvisi_dentista (…)
  SELECT p_laboratorio_id, p_lavoro_id, l.cliente_id, v_nuova_ddc_id, …
    FROM public.lavori l
   WHERE l.id = p_lavoro_id AND l.laboratorio_id = p_laboratorio_id;
```

Un `INSERT … SELECT` che non trova la riga **inserisce zero righe e non alza niente**: una riemissione
senza il suo promemoria, con esito `ok` — esattamente ciò che il Task 2 esiste per rendere impossibile.
La riga del lavoro **è già stata letta e bloccata** al passo ① della funzione (`v_lavoro_prima`,
`FOR UPDATE`), e `cliente_id` non è fra le sei voci correggibili: non può cambiare dentro la
transazione. ➡️ Scritto con **`VALUES` e `v_lavoro_prima.cliente_id`**: così il caso «zero righe» non
esiste e non serve una guardia che lo cerchi.

**🔴 N3 — `ARRAY(SELECT jsonb_object_keys(…))` NON DÀ L'ORDINE CHE SEMBRA DARE.** `jsonb` conserva le
chiavi ordinate per **lunghezza** e poi per byte, quindi l'array esce nell'ordine di *come è fatto
jsonb*, non in un ordine scelto da qualcuno. E quell'elenco finisce in un messaggio a un dentista.

```
provato: ARRAY(SELECT jsonb_object_keys('{"denti_coinvolti":[],"descrizione":"x"}'::jsonb))
         → {descrizione,denti_coinvolti}          (11 caratteri prima di 15)
         ARRAY(SELECT k FROM jsonb_object_keys(…) AS k ORDER BY k)
         → {denti_coinvolti,descrizione}
```

➡️ Scritto con `ORDER BY k`. La prova ①-bis usa **proprio quella coppia**, quindi arrossisce se
l'`ORDER BY` sparisce.

**🔴 N4 — il piano usa `p_correzioni`, la funzione lavora su `v_correzioni`.** Il corpo vivo normalizza
(`v_correzioni := COALESCE(p_correzioni,'{}')`) e **tutti** i controlli girano su quella forma. Usare il
parametro grezzo scavalca la normalizzazione. In pratica l'esito coincide — `provato:`
`ARRAY(SELECT jsonb_object_keys(NULL::jsonb))` → `{}`, cardinalità 0, **non** `NULL`, quindi nessun
`23502` su `campi_corretti` — **ma la coincidenza è un fatto misurato, non una garanzia scritta**:
`campi_corretti` è un sottoinsieme delle sei *perché* i controlli e l'`INSERT` guardano lo stesso
oggetto. ➡️ Scritto con `v_correzioni`.

### 🟠 Un errore mio, trovato dalla prova e scritto per intero

La prima stesura della prova ③ ordinava i due avvisi con `ORDER BY created_at, id` e asseriva
`[['descrizione'], ['richiedente_nome']]`. **È arrossita, e aveva ragione lei:** `now()` è **costante
dentro una transazione**, quindi i due avvisi nascono con lo **stesso `created_at`** e il ripiego su
`id` è un uuid casuale. L'ordine fra due avvisi nati nella stessa transazione **non è definito**.
Riscritta appaiando **per dichiarazione** (`Map` da `dichiarazione_id` a `campi_corretti`): più forte,
perché lega ogni avviso alla *sua* riemissione, e indipendente dall'ordine.
📌 **Nota per chi ordinerà l'archivio (Task 5 e 7):** in esercizio le due riemissioni sono due
transazioni distinte e i `created_at` differiscono, quindi
`idx_avvisi_da_comunicare (laboratorio_id, created_at DESC)` regge. Ma l'indice **non** ha un
discriminante secondario: due avvisi con lo stesso istante escono in ordine arbitrario.

---

## ② Gli output reali

### Il timestamp, e il pavimento verificato

```
$ ls supabase/migrations | tail -3
20260809123206_avvisi_dentista.sql
20260809124517_avvisi_dentista_update_per_colonne.sql
MANUAL_000_auth_helpers.sql
$ date -u "+%Y%m%d%H%M%S"
20260809133546
```
`20260809133546` > `20260809124517` ✅ (il numero del piano, `20260808195344`, è scaduto da due
migration — come diceva il brief).

### Il corpo vivo: il `diff` PRIMA/DOPO, che è la misura che conta

Il corpo **non è stato ribattuto a mano**: la migration è stata costruita ricopiando meccanicamente le
righe 114-566 di `20260808154033` (già provate identiche al vivo) e innestando il blocco in **un punto
solo**. 🔑 **Il motivo è misurato, non prudenziale:** quel corpo porta **nove `RAISE` di difesa** e
**nessuno di essi ha una prova d'integrazione** (grep: solo `tests/unit/atto-unico-errori.test.ts` e
`tests/unit/correggi-e-riemetti.test.ts`). Ribattendo 354 righe per aggiungerne otto, **una difesa
persa non avrebbe fatto arrossire niente.**

```
$ diff scripts/tmp/def-prima.txt scripts/tmp/def-dopo.txt
352a353,395
> … 43 righe: il commento del blocco e l'INSERT nuovo …
$ diff … | wc -l
44
```
**Nient'altro è cambiato.** E la firma, controllata nome per nome perché
`src/lib/pdf/generate-ddc.ts:634-645` chiama per **nome di argomento** via PostgREST e `tsc` non vede
i nomi degli argomenti SQL:

```
p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid, p_correzioni jsonb,
p_nuova jsonb, p_atteso_updated_at timestamp with time zone
|| ret=json || secdef=true || config={"search_path=public, pg_temp"}
```

### Il blocco aggiunto, in chiaro

```sql
  INSERT INTO public.avvisi_dentista
    (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, campi_corretti)
  VALUES (
    p_laboratorio_id,
    p_lavoro_id,
    v_lavoro_prima.cliente_id,
    v_nuova.id,
    ARRAY(SELECT k FROM jsonb_object_keys(v_correzioni) AS k ORDER BY k)
  );
```

Sta **dopo** `INSERT INTO dichiarazioni_conformita SELECT v_nuova.*;` e **prima** del `RETURN`.
🛑 **Non è una preferenza:** tutte e cinque le chiavi esterne di `avvisi_dentista` sono
`condeferrable = false` (misurato in `pg_constraint`), quindi `dichiarazione_id` pretende che la
dichiarazione nuova sia già inserita. L'avviso **non può che essere l'ultima scrittura.**

### I permessi

```
$ node scripts/psql.mjs -c "SELECT proacl FROM pg_proc WHERE proname='correggi_e_riemetti_atomica';"
{postgres=X/postgres,service_role=X/postgres}

anon=false | authenticated=false | service_role=true
```
Il `REVOKE` non è saltato. E il **`COMMENT` è sopravvissuto al `DROP`**, che se lo sarebbe portato via:
catturato prima (5294 byte), riemesso e allungato (6067 byte nel catalogo), con il testo vecchio
**prefisso intatto** del nuovo — verificato con un confronto di stringhe, non a occhio.

### Le prove

```
$ set -a && . ./.env.local; set +a && npx vitest run \
    tests/integration/correggi-e-riemetti-con-avviso.rpc.test.ts \
    tests/integration/avvisi-dentista-schema.rpc.test.ts
 Test Files  2 passed (2)
      Tests  35 passed (35)          ← 8 nuove + 27 del Task 1, ZERO saltate
```
E l'intera cartella, dopo il ripristino del corpo (v. R-P4): `9 passed (9)` file, **119 passate**.

### FASE 6b e FASE 7

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
$ diff (prima) (dopo)   → DIFF VUOTO        ← la firma non cambia: nessun tipo si muove
$ npx tsc --noEmit ; echo TSC_EXIT=$?
TSC_EXIT=0

$ npm run verify:full ; ESITO=$? ; echo "VERIFY_EXIT=$ESITO"
VERIFY_EXIT=0
 Test Files  461 passed (461)
      Tests  5867 passed (5867)
✅ DS compliance · ✅ CSRF · ✅ reduced-motion · ✅ coerenza documenti ·
✅ salvataggio installato · ✅ progetti Playwright
```

📊 **La base delle prove, e chi aveva ragione.** Il piano dice `5725 | 84`, la chiusura di ieri
`5809/5809`, il Task 1 riferisce `5859/5859 su 460 file` — **quest'ultimo, che era «non verificato»,
torna:** 5859 + 8 prove nuove = **5867**, e 460 + 1 file = **461**. Misurato con `.env.local` caricato,
quindi con le prove d'integrazione **accese**: zero saltate.

---

## ③ R-P4 — l'abbozzo inerte, e il conteggio

**L'abbozzo:** lo stesso `INSERT`, ma con `dichiarazione_id = v_vecchia.id` (la dichiarazione
**superata** invece della nuova) e `campi_corretti = '{}'::text[]`. Applicato con `scripts/psql.mjs`,
che **non registra** la migration (R-P1: le sonde non passano dal ledger), e **rimosso subito dopo**.

**8 asserzioni su 49 si accendono.** Sono queste, e ognuna dice una cosa diversa:

| prova | riga | che cosa distingue |
|---|---|---|
| ① | 162 | `dichiarazione_id` è la **nuova** |
| ① | 163 | e non è la **vecchia** |
| ① | 164 | `campi_corretti` = le due chiavi mandate |
| ①-bis | 199 | e nell'ordine **scelto**, non in quello di `jsonb` |
| ③ | 277 | il **secondo** avviso porta la **seconda** dichiarazione |
| ③ | 287 | ogni avviso porta i campi della **propria** riemissione |
| ③ | 288 | idem, per la seconda |
| ④ | 327 | vale anche quando chiama `service_role` |

🛑 **Il numero è basso, e il motivo va detto invece che nascosto.** Tre prove su otto (②, ⑤, ⑦)
asseriscono un'**assenza** — «non resta nessun avviso» — e contro l'abbozzo passano **a vuoto**, perché
il guasto o il rifiuto arriva prima che l'`INSERT` sia raggiunto. Sono guardie contro una regressione
futura, non discriminanti di oggi: è una proprietà della *forma* di quelle prove, non un difetto da
correggere aggiungendo asserzioni. Le altre 41 asserzioni sono di forma (esito, conteggio, stato, i
quattro campi che devono restare `NULL`): un'implementazione plausibile-ma-sbagliata le passa.

**Le forme d'ingresso enumerate, ognuna col suo caso o col suo «non coperta, perché»:**

| forma | coperta da |
|---|---|
| `p_correzioni` con UNA chiave | ③ (due chiamate) |
| con DUE chiavi, entrambe colonne di `lavori` | ① |
| con una chiave che va a una **penna** (`denti_coinvolti`) | ①-bis |
| `{}` vuoto | ⑥(a) — l'avviso nasce comunque, `campi_corretti = {}` |
| `NULL` | ⑥(b) |
| una chiave **fuori** dalle sei | ⑤ — rifiutata prima di ogni scrittura |
| chiamante `service_role`, che **non** ha `INSERT` sulla tabella | ④ |
| guasto **dopo** due scritture vere | ② |
| rifiuto **gentile** (`evento_non_valido`) | ⑦ |
| `prescrizione_caratteristiche` come chiave | **non coperta:** serve una riga in `lavori_prescrizioni` e le sotto-chiavi valide della penna. Su `campi_corretti` il comportamento è identico a `denti_coinvolti` (l'altra voce di `c_su_penne`), già coperto dalla ①-bis |
| `p_correzioni` non-oggetto (array, scalare) | **non coperta:** la respinge un controllo di forma **preesistente**, prima di ogni scrittura — difesa fuori dal mandato del Task 2 |
| l'`INSERT` che tocca **zero** righe | **non coperta perché non esiste:** con `VALUES` sulla riga già bloccata il caso non è raggiungibile (v. N2) |
| `FORCE ROW LEVEL SECURITY` accesa su `avvisi_dentista` | **non coperta:** richiederebbe di modificare la tabella, fuori mandato — la fragilità è dichiarata nel corpo e qui sotto |

### Come ho fatto fallire la riemissione (prova ②), e il limite che resta

Il guasto si fabbrica con una coppia `(anno_ddc, progressivo_ddc)` **già presa da un altro lavoro dello
stesso laboratorio**: l'inserimento della dichiarazione nuova sbatte su
`dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key`. Arriva **dopo l'annullo della
vecchia e dopo l'`UPDATE` su `lavori`**, cioè dopo **due scritture vere**. La prova asserisce quattro
cose, e sono ciò che rende il rollback **osservabile**: zero avvisi · la vecchia ancora `generata` con
`annullata_da_evento_id` a `NULL` · `lavori.descrizione` tornata a `Corona ORIGINALE` · una sola
dichiarazione sul lavoro.
🛑 **Si nomina il VINCOLO, non il codice `23505`** — è il difetto ⑦ della revisione del Task 1: un
codice può arrivare da un vincolo diverso e la prova passerebbe per il motivo sbagliato.

🛑 **IL LIMITE, DICHIARATO INVECE CHE ADDOLCITO.** Non esiste, dal contratto pubblico, **nessun guasto
raggiungibile DOPO la nascita dell'avviso**, e non è una mancanza della prova: è una proprietà dello
schema. Le chiavi esterne di `avvisi_dentista` sono tutte `NOT DEFERRABLE`, quindi l'avviso deve venire
**dopo** la dichiarazione, cioè **ultimo**. Ho cercato le due strade per farne un guasto post-avviso e
**nessuna delle due esiste**: `lavori.cliente_id` è `NOT NULL` (misurato), quindi non si può fabbricare
una violazione di `NOT NULL` su `avvisi_dentista.cliente_id`; e `ARRAY(SELECT jsonb_object_keys(NULL))`
dà `{}` e non `NULL` (misurato), quindi nemmeno `campi_corretti` può fallire.
➡️ **Quello che la prova ② dimostra** è che riemissione e avviso stanno o cadono insieme, e che di due
scritture già avvenute non resta niente. **Quello che non può dimostrare** è «un avviso scritto e poi
tolto». Chi volesse quella prova deve rendere differibile la chiave verso la dichiarazione — che è una
decisione sulla tabella, non su questa funzione.

---

## ④ La decisione su `campi_corretti`

**`campi_corretti` resta LIBERO in banca dati: nessun vincolo nuovo.** Il brief chiedeva di scegliere
fra tre strade (lasciarlo libero · validarlo nella funzione · un vincolo in banca dati) e di motivare.

**① Il motivo che decide: un `CHECK` che elenca le sei voci di oggi romperebbe la STORIA.** Le voci
sono già passate da otto a sette a sei **in due giorni** (D319, D320). Il giorno in cui la settima
cade, ogni `UPDATE` su un avviso **vecchio** che la nomina fallirebbe — **compreso l'`UPDATE` che lo
segna «comunicato»**, cioè proprio il gesto per cui la tabella esiste. Un registro dell'Art. 19 GDPR
deve poter continuare a dire che cosa fu corretto **allora**, anche quando il vocabolario di oggi è più
corto. Un vincolo di vocabolario su un dato **storico** è un vincolo che invecchia contro i suoi dati.

**② Il cancello c'è già, e arriva prima di ogni scrittura.** La funzione **alza** su qualunque chiave
fuori da `c_su_lavori || c_su_penne`, molto prima dell'annullo (righe 64-70 del corpo vivo):
`campi_corretti` è un sottoinsieme delle sei **per costruzione**. Un `CHECK` sarebbe la **quarta** copia
dello stesso elenco (costante TypeScript · letterale in un test unitario · allowlist nella funzione ·
`CHECK`), e questo stesso corpo rifiuta per iscritto le seconde copie della stessa verità: «*L'allowlist
delle sotto-chiavi NON si ricopia qui: sarebbe una seconda fonte della stessa verità, e divergerebbe*».
Validare **di nuovo** dentro la funzione sarebbe la stessa duplicazione, un centimetro più in là.

**③ Al posto del vincolo, un legame MISURATO — ed è il buco vero che ho trovato.** Il commento di
`src/lib/dichiarazione/correzioni.ts` dice che le due liste «*si guardano in faccia in
`tests/unit/correzioni-documento.test.ts`*». **Non è così:** quel test (riga 67) confronta la costante
con un elenco **scritto a mano nel test stesso** — due copie che si aggiornano insieme solo se qualcuno
se ne ricorda. Nessuna delle due guarda la funzione.
➡️ La prova ⑤ legge le sei ammesse **dal messaggio d'errore della funzione VIVA** e le confronta con
`CAMPI_CORREGGIBILI_DOCUMENTO`, con un controllo di **cardinalità = 6 prima** del confronto, così una
lettura sbagliata del messaggio non può passare a vuoto. È il primo legame fra il TypeScript e il
catalogo che non passa per una terza trascrizione.

---

## ⑤ Ciò che resta `non provato`, col motivo

1. **Che l'`INSERT` fallisca se `FORCE ROW LEVEL SECURITY` viene accesa** su `avvisi_dentista`.
   L'inserimento riesce oggi perché la funzione è `SECURITY DEFINER` di `postgres`, **proprietario**
   della tabella, e `relforcerowsecurity = false` (misurato). Accendere quel flag per provarlo
   significa modificare la tabella: **fuori mandato**. La fragilità è scritta nel corpo, accanto alla
   riga che ne dipende. ✅ **Provato invece che il salto di ruolo avviene davvero:** la prova ④ chiama
   la funzione sotto `SET LOCAL ROLE service_role` — un ruolo che **non** ha `INSERT` sulla tabella
   (`permission denied` sull'inserimento diretto, nella stessa prova) — e l'avviso nasce.
2. **Il comportamento con un gettone (`p_atteso_updated_at`) valorizzato.** Tutte le mie chiamate
   passano `NULL`, che il contratto documenta come «non controllare». L'esito `conflitto` è un
   `RETURN` prima di ogni scrittura, quindi non può lasciare un avviso; ma **non l'ho eseguito**.
3. **`prescrizione_caratteristiche` che arriva in `campi_corretti`.** Motivo nella tabella delle forme
   d'ingresso: serve una fixture di prescrizione, e il comportamento è quello dell'altra voce di
   `c_su_penne`, già coperto.
4. **Che i lettori futuri (Task 5, 7, 8, 9) leggano ciò che questa riga scrive.** Non esistono ancora.
5. **Il `R-P4: 8 su 49`** è ripetibile — l'abbozzo, il comando e le righe sono qui sopra — ma
   l'abbozzo **non è committato** (R-P1: gli spike sono usa e getta).

---

## ⑥ I ritrovamenti fuori mandato (R-E2: riferiti, non corretti)

1. 🟠 **`cliente_id` e `dichiarazione_id` sono `ON DELETE CASCADE` nel vivo, dove il piano scriveva
   `RESTRICT`.** Il piano (Task 1, blocco della tabella) dice
   `cliente_id … ON DELETE RESTRICT` e `dichiarazione_id … ON DELETE RESTRICT`; il catalogo dice
   `CASCADE` per entrambe. **La revisione del Task 1 non l'ha visto** (contava le CASCADE, senza
   confrontarle col piano). **La conseguenza:** cancellare una dichiarazione **porta via in silenzio la
   prova che il dentista fu avvisato** — cioè il dato che la tabella esiste per conservare
   (GDPR Art. 5(2)). Va deciso da chi tocca la tabella, non da qui.
2. 🟠 **Il commento di `correzioni.ts` afferma una protezione che non c'è.** «*si guardano in faccia in
   `tests/unit/correzioni-documento.test.ts`*»: quel test confronta la costante con un letterale
   scritto a mano, non con la funzione (§④③). La riga del commento va corretta o il confronto va
   spostato sul vivo — la mia prova ⑤ lo fa **per `campi_corretti`**, non per il filtro davanti al
   render.
3. 🟠 **Nove `RAISE` di difesa senza nessuna prova d'integrazione.** Il corpo di
   `correggi_e_riemetti_atomica` ha nove guardie (chiavi ignote · le due colonne che `p_nuova` non
   decide · la coppia indivisibile · la forma del carico dei denti · il fail-closed dell'annullo · la
   prova d'atterraggio su `lavori`) e **nessuna** è coperta contro il database vero: solo prove
   unitarie sui *messaggi*. La mia ⑤ ne copre **una** di sponda. È il motivo per cui non ho ribattuto
   il corpo a mano, e resta un vuoto vero.
4. 📌 **Già noti dalla revisione del Task 1, riconfermati e non toccati:** `avvisi_dentista` non è
   nominata in `admin_delete_laboratorio` (il conteggio restituito tace su di essa) · `anon` e
   `authenticated` hanno `SELECT` sulla tabella, permesso che non serve a nessuno · e
   `admin_delete_laboratorio` **è rotta oggi** per l'ordine `clienti`/`data_processing_agreements`,
   difetto preesistente della famiglia D274.
5. ⚠️ **Un inciampo mio, non del piano, che vale come nota di casa.** Il primo `db push` è **abortito**
   con `42601` per un errore di generazione mio (l'ultima riga del `COMMENT` duplicata). Il ledger e
   il catalogo sono stati controllati **subito**: `20260809133546` **non** registrata, funzione,
   `COMMENT` e `proacl` intatti — il rollback della CLI è pulito. 📌 Ma la nota di `CLAUDE.md` §8
   («una migration che aborta lascia il ledger disallineato») **va verificata, non temuta**: qui non è
   accaduto.

---

## ⑦ Il salvataggio

**Ramo:** `intervento-post-consegna`. **`git add` per percorsi**, mai `-A`, e `git status` guardato
prima (albero condiviso: erano presenti solo i miei file più il brief del task).

File salvati:
- `supabase/migrations/20260809133546_correggi_e_riemetti_con_avviso.sql`
- `tests/integration/correggi-e-riemetti-con-avviso.rpc.test.ts`
- `.superpowers/sdd/avviso-dentista-task-2-brief.md` (era non tracciato)
- `.superpowers/sdd/avviso-dentista-task-2-report.md`

`src/types/database.types.ts` **non** compare: `gen types` ha prodotto un diff vuoto, perché la firma
non è cambiata. Niente `push`, niente `main`, niente worktree.

**Hash:** `HASH_DA_RIEMPIRE`
