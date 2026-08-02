# Referto — Task 3 (P7): le prove di COMPORTAMENTO sul database vivo

**Piano:** `docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md`
**Brief:** `.superpowers/sdd/task-3-brief.md`
**Ramo:** `p7-registro-dpa-cancello-traccia`
**Script (usa e getta, NON committato):** `scripts/tmp/p7-prove-comportamento.mjs` (+ due follow-up:
`scripts/tmp/p7-t4-followup.mjs`, `scripts/tmp/p7-t4-followup-c.mjs`, nati da un ritrovamento fuori
mandato durante T4, v. §6)

**Esito in una riga: 4 prove su 5 PROVATE, 1 (T3) eseguita ma non chiudibile oggi sul dato vivo — e
durante T4 trovato un difetto REALE, indipendente da questo piano, che OGGI blocca
`admin_delete_laboratorio()` sul laboratorio Filippo (misurato: l'unico con righe DPA che referenziano
ancora un cliente) e che, per costruzione del vincolo `dpa_emissione_coerente`, colpirà per lo stesso
motivo ogni futuro laboratorio che emetta una DdC/DPA a un dentista.**

---

## 0. Prima di scrivere qualunque cosa

Letto per intero: il brief (`task-3-brief.md`), la sezione Task 3 del piano (righe 407-486), i due
referti precedenti (`task-1-report.md`, `task-2-report.md`), e fatta una ricognizione **di sola
lettura** (`read_only:true`) sullo stato vivo del database prima di scrivere una sola riga di script
di prova:

- unico laboratorio con DPA reali: **Filippo Opromolla** (`971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c`),
  2 righe, entrambe con `emesso_da IS NULL` (confermato: nessuna emissione reale è mai passata dal
  codice del Task 2 da quando è stato scritto)
- regola di riga live: `dpa_laboratorio`, `polcmd='r'` (SELECT), `ha_with_check=false` — coerente
  col Task 1
- `_audit_data_processing_agreements` presente, `_audit_trigger_fn` è **SECURITY DEFINER**
  (`prosecdef=true`) — importante per il controllo positivo di T1 (v. §2)
- `current_lab_id()` legge `auth.uid()` da `public.utenti`; `auth.uid()` legge
  `request.jwt.claim.sub` o, in fallback, `request.jwt.claims->>'sub'`
- **la connessione della Management API con `read_only:false` gira come `postgres`** (superuser);
  con `read_only:true` gira come `supabase_read_only_user` — per questo ogni prova che impersona un
  utente o che deve vedere l'effetto DENTRO la transazione usa sempre `read_only:false`
- 🔑 **scoperta tecnica non anticipata dal brief:** una query con **più istruzioni** inviata in
  un'unica chiamata restituisce **solo il risultato dell'ULTIMA istruzione che produce righe**
  (verificato: `SELECT 1 AS uno; SELECT 2 AS due;` → risponde solo `{"due":2}`). Conseguenza
  progettuale: ogni prova che deve mostrare **più numeri insieme** (es. T1: righe lette + righe
  toccate) li unisce in un'**unica SELECT finale** con CTE, oppure usa un blocco `DO $$...$$` che
  scrive i risultati in una tabella temporanea letta come ultima istruzione. Senza questo
  accorgimento, metà dei numeri richiesti dal brief andrebbe persa.

**Prima di ogni prova distruttiva — verifica richiesta dal brief (§③):** sanity-check del ROLLBACK
sulla Management API, con un `UPDATE` innocuo (`updated_at`) dentro `BEGIN…ROLLBACK` in una sola
chiamata, poi rilettura **separata**, in sola lettura:

```
STEP 0a — updated_at PRIMA (sola lettura)
[{"id":"38390641-...","updated_at":"2026-08-01 22:56:21.371393+00"},
 {"id":"cea45305-...","updated_at":"2026-08-01 22:56:06.816654+00"}]

STEP 0b — update dentro BEGIN...ROLLBACK (una chiamata, read_only:false)
[{"id":"cea45305-...","updated_at":"2026-08-02 14:27:51.113475+00"},
 {"id":"38390641-...","updated_at":"2026-08-02 14:27:51.113475+00"}]

STEP 0c — updated_at DOPO (sola lettura, chiamata SEPARATA)
[{"id":"38390641-...","updated_at":"2026-08-01 22:56:21.371393+00"},
 {"id":"cea45305-...","updated_at":"2026-08-01 22:56:06.816654+00"}]
```

**0c è identico a 0a.** Il `ROLLBACK` mandato alla Management API annulla davvero, anche quando
l'intera sequenza `BEGIN…ROLLBACK` arriva in un'unica chiamata HTTP. ✅ **Via libera per T4.**

---

## T1 — il RIFIUTO vero — ✅ PROVATO (controllo positivo + rifiuto, entrambi confermati)

Due chiamate **separate** (non nella stessa stringa: altrimenti l'API restituirebbe solo l'ultimo
risultato e il controllo positivo sparirebbe). Utente impersonato: `eb161af4-0232-4e8e-b0e2-3283d551e2fd`
(titolare del laboratorio Filippo).

**(a) Controllo POSITIVO — regola VECCHIA (`FOR ALL`), ricreata in una transazione annullata:**

```sql
BEGIN;
  DROP POLICY "dpa_laboratorio" ON public.data_processing_agreements;
  CREATE POLICY "dpa_laboratorio" ON public.data_processing_agreements
    FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"eb161af4-...","role":"authenticated"}';
  WITH scrittura AS (
    UPDATE public.data_processing_agreements SET firmato_da = 'CONTROLLO-POSITIVO-T1' RETURNING 1
  )
  SELECT current_user AS ruolo, public.current_lab_id() AS lab_risolto,
         (SELECT count(*) FROM scrittura) AS righe_toccate;
ROLLBACK;
```

```
[{"ruolo":"authenticated","lab_risolto":"971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c","righe_toccate":2}]
```

**Righe toccate: 2 (≥1, atteso).** Con la regola vecchia l'`UPDATE` passa davvero.

**(b) Il RIFIUTO — regola ATTUALE (`FOR SELECT`), stessa identità impersonata:**

```sql
BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"sub":"eb161af4-...","role":"authenticated"}';
  WITH scrittura AS (
    UPDATE public.data_processing_agreements SET firmato_da = 'FALSIFICATO' RETURNING 1
  )
  SELECT current_user AS ruolo, public.current_lab_id() AS lab_risolto,
         (SELECT count(*) FROM public.data_processing_agreements) AS righe_lette,
         (SELECT count(*) FROM scrittura) AS righe_toccate;
ROLLBACK;
```

```
[{"ruolo":"authenticated","lab_risolto":"971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c",
  "righe_lette":2,"righe_toccate":0}]
```

**Righe lette: 2 (≥1, la SELECT funziona). Righe toccate: 0 — il rifiuto.** `current_lab_id()`
risolve al laboratorio giusto in entrambi i casi: non è un verde per la ragione sbagliata.
⚠️ **Come da brief: «0 righe toccate» non ha sollevato nessuna eccezione** — l'`UPDATE` è
riuscito, ha semplicemente trovato zero righe su cui scrivere. È il rifiuto, non un errore.

**Verifica post-hoc (sola lettura)** che il `DROP POLICY`/`CREATE POLICY` del controllo positivo
(a) non sia sopravvissuto al `ROLLBACK` e non abbia toccato la produzione:

```
[{"polname":"dpa_laboratorio","polcmd":"r","ha_with_check":false}]
```

La regola in produzione è rimasta quella attuale (SELECT-only). ✅

---

## T2 — la traccia esiste — ✅ PROVATO

Transazione annullata: conta `audit_log` PRIMA, esegue un `INSERT` che riproduce la forma reale di
un'emissione (stessi vincoli CHECK di `generateDpa`: `dpa_emissione_coerente`,
`dpa_impronte_esadecimali`, `dpa_percorso_nel_proprio_laboratorio`), conta DOPO, legge la riga di
`audit_log` appena scritta.

```
[{"audit_prima":0,"audit_dopo":1,"audit_operation":"INSERT","audit_new_data_id_ok":true,
  "riga_id":"65759a3d-30f4-4843-b944-e62c513d64a9",
  "riga_emesso_da":"eb161af4-0232-4e8e-b0e2-3283d551e2fd",
  "riga_numero_dpa":"DPA-2026-TEST-T2T3"}]
```

**`audit_prima`→`audit_dopo`: 0→1, esattamente +1.** `operation='INSERT'` ✅.

**Rafforzamento fatto dopo un giro dell'advisor** (il controllo iniziale, `new_data->>'id' = id`,
prova che punta alla riga giusta ma non che la contenga **per intero**): stessa transazione annullata,
stessa forma di riga, letto `jsonb_object_keys(new_data)` e `new_data->>'emesso_da'`:

```
[{"n_chiavi":23,"new_data_emesso_da":"eb161af4-0232-4e8e-b0e2-3283d551e2fd",
  "new_data_id":"574466c9-638e-4604-9afb-9068023ddbc2"}]
```

**23 chiavi — combacia col numero di colonne di `data_processing_agreements`** (verificato in
ricognizione: `information_schema.columns` ne conta 23) — e `new_data->>'emesso_da'` è esattamente
l'utente passato. `new_data` **contiene la riga intera**, non solo un puntatore. ✅

---

## T3 dal vivo — il «chi» c'è — ⚠️ ESEGUITA, non chiudibile oggi sul dato vivo (motivo sotto)

Query **letterale** del brief, in **sola lettura**, nessuna scrittura:

```sql
SELECT numero_dpa, emesso_da FROM public.data_processing_agreements
 WHERE emesso_da IS NOT NULL ORDER BY emesso_at DESC LIMIT 1;
```

```
[]
```

**Zero righe.** Il brief si aspetta «una riga»: su QUESTO database, oggi, non c'è. **Non è un errore
di esecuzione: è un fatto sul dato vivo**, verificato anche in ricognizione preliminare (§0): le
**due** righe DPA esistenti hanno entrambe `emesso_da = NULL`, perché il Task 2 ha cambiato solo il
codice — nessuna emissione reale è mai passata dalla rotta `/api/clienti/[id]/dpa` da quando
`generateDpa` ha imparato a scrivere `emesso_da`. Per di più il ramo di **riuso** dell'emissione
(quando esiste già una DdC/DPA valida) **non scrive `emesso_da`** (confermato in `task-2-report.md`
§4): anche se qualcuno avesse premuto il tasto oggi su un cliente con una DPA già valida, la riga NON
si sarebbe aggiornata.

🔑 **T3 non è chiudibile oggi, e il motivo non è un errore di esecuzione**: il brief è stato scritto
prima che il Task 2 girasse, e il Task 2 stesso (referto, §4) dichiara che il ramo di riuso non
scrive `emesso_da` e che nessuna emissione nuova è mai stata generata da quando la colonna esiste. Non
la classifico come un difetto del piano nello stesso senso dei 5 già trovati dai due esecutori
precedenti (quelli erano verificabili al momento in cui il piano è stato scritto — un numero di
riga, un grep che non può dare 0, un conteggio di asserzioni; questo dipende da un evento che accade
DOPO, nel mondo, non da un errore nel testo del brief). Resta però un fatto che chiude la prova con un
esito diverso da quello scritto, e va portato a Francesco per quello che è.

**Non l'ho forzata a mano:** produrre una riga vera con `emesso_da` valorizzato richiede o (a) una
emissione REALE attraverso l'app (un click vero su un cliente senza DPA valida, che lascerebbe una
riga **permanente** in banca dati — fuori dall'autorizzazione D151 di questo task, che vale solo per
scritture che finiscono in `ROLLBACK`), oppure (b) attendere che accada nel flusso normale. Entrambe
sono decisioni di Francesco, non mie.

**Prova supplementare fatta (NON è T3, e non la sostituisce — dichiarata come tale):** dentro la
STESSA transazione annullata di T2, la riga appena inserita porta `riga_emesso_da:
"eb161af4-0232-4e8e-b0e2-3283d551e2fd"` — cioè lo stesso id che le ho passato io. Questo prova che il
meccanismo (scrittura + lettura della colonna, con la FK verso `utenti`) fa un giro di andata e
ritorno corretto — **prova di comportamento della colonna**, non prova che «la DdC sa dire chi ha
premuto» su un dato reale. Le due cose sono diverse e non vanno confuse.

---

## T5 — la chiave esterna morde — ✅ PROVATO

```sql
BEGIN;
  UPDATE public.data_processing_agreements SET emesso_da = gen_random_uuid();
ROLLBACK;
```

```
HTTP 400
{"message":"Failed to run sql query: ERROR:  23503: insert or update on table
\"data_processing_agreements\" violates foreign key constraint
\"data_processing_agreements_emesso_da_fkey\"
DETAIL:  Key (emesso_da)=(ef68cac0-0cb9-4d4b-a0c5-d8b3bd5dc3d9) is not present in table \"utenti\".
"}
```

**Errore 23503, esattamente come atteso**, con il nome del vincolo (`data_processing_agreements_emesso_da_fkey`)
e la chiave rifiutata. La FK non è deferrable (confermato in ricognizione: nessun `DEFERRABLE` nella
definizione), quindi l'errore emerge sull'`UPDATE` stesso, non a fine transazione.

**Verifica post-hoc (sola lettura):** entrambe le righe DPA di Filippo hanno ancora `emesso_da: null`
— nessun residuo, il batch si è interrotto prima di modificare qualunque riga.

```
[{"id":"38390641-...","emesso_da":null},{"id":"cea45305-...","emesso_da":null}]
```

---

## T4 — la cancellazione del laboratorio, con `emesso_da` DAVVERO riempito — ⚠️ BLOCCATA da un difetto REALE, indipendente da questo piano (v. §6) — claim isolata comunque confermata

**Prova letterale (come da brief, sul laboratorio Filippo):**

```sql
BEGIN;
  UPDATE public.data_processing_agreements
     SET emesso_da = (SELECT id FROM public.utenti WHERE laboratorio_id = '971061a1-...' LIMIT 1)
   WHERE laboratorio_id = '971061a1-...';
  SELECT public.admin_delete_laboratorio('971061a1-...');
ROLLBACK;
```

```
HTTP 400
{"message":"Failed to run sql query: ERROR:  23503: update or delete on table \"clienti\" violates
foreign key constraint \"data_processing_agreements_dentista_id_fkey\" on table
\"data_processing_agreements\"
DETAIL:  Key (id)=(76115a50-aed8-4d54-b8ff-1d52c211ae5b) is still referenced from table
\"data_processing_agreements\".
CONTEXT:  SQL statement \"DELETE FROM clienti                 WHERE laboratorio_id = p_lab_id\"
PL/pgSQL function admin_delete_laboratorio(uuid) line 37 at SQL statement
"}
```

**NON è la FK che T4 vuole testare.** L'errore è su `data_processing_agreements.dentista_id →
clienti(id)`, durante `DELETE FROM clienti` (riga 37 della funzione) — **molto prima** di
`DELETE FROM data_processing_agreements` (riga ~155, quella che T1/T2/T3 riguardano). Vedi §6 per
l'analisi completa: è un difetto **preesistente** a questo piano, trovato **fuori mandato**.

**Verifica post-hoc (sola lettura):** il laboratorio Filippo è rimasto intatto (l'errore ha abortito
tutta la transazione prima del `ROLLBACK` esplicito):

```
[{"laboratorio_presente":1,"n_lavori":287,"n_dpa":2,"n_dpa_con_emesso_da":0,"n_utenti":2}]
```

**Per isolare comunque la domanda che T4 vuole davvero porre** («l'ordine DPA-prima-di-utenti
protegge la FK `emesso_da`, quando nient'altro a monte lo impedisce?») — v. §6, Follow-up C:
**sì, confermato**, su un laboratorio che non incappa nel bug di §6.

---

## 5. Riepilogo — una riga per prova

| Prova | Esito | Nota |
|---|---|---|
| **T1(a)** controllo positivo (regola vecchia) | ✅ PROVATO | 2 righe toccate (≥1 atteso) |
| **T1(b)** il rifiuto (regola attuale) | ✅ PROVATO | 2 righe lette, 0 toccate — il rifiuto è «0 righe», non un'eccezione |
| **T2** la traccia esiste | ✅ PROVATO | `audit_log` 0→1, `operation='INSERT'`, `new_data` con la riga intera |
| **T3** il «chi» dal vivo | ⚠️ ESEGUITA, non chiudibile oggi | 0 righe sul dato vivo — nessuna emissione reale è mai avvenuta da quando esiste `emesso_da`; motivo dichiarato (v. sopra); proxy di comportamento fatto ma dichiarato non equivalente |
| **T4** cancellazione con `emesso_da` riempito | ⚠️ BLOCCATA (bug reale, fuori mandato) — claim isolata ✅ CONFERMATA | `admin_delete_laboratorio` fallisce PRIMA di arrivare alla sezione DPA/utenti, per una FK diversa (`dentista_id→clienti`); isolando il bug (Follow-up C), l'ordine DPA-prima-di-utenti tiene |
| **T5** la chiave esterna morde | ✅ PROVATO | 23503 esatto, messaggio incollato, nessun residuo |

**4 prove su 5 pienamente confermate come da brief (T1 conta come una prova a due bracci, entrambi
verdi); T3 eseguita ma il suo esito reale contraddice l'«atteso» del brief per un fatto sul dato, non
per un errore di esecuzione; T4 letterale bloccata da un bug indipendente, ma la sua claim di fondo
verificata isolatamente.**

---

## 6. Difetti trovati FUORI mandato (R-E2) — riferiti, NON corretti

### F1 🔴 — `admin_delete_laboratorio()` fallisce oggi su ogni laboratorio con una riga DPA che referenzia ancora un cliente

**Trovato eseguendo T4, non cercato apposta.** La funzione cancella `clienti` (riga 37 del corpo)
**prima** di cancellare `data_processing_agreements` (riga ~155). Ma
`data_processing_agreements.dentista_id → clienti(id)` è una FK **NO ACTION** (nuda, come quella su
`emesso_da`): se una riga DPA con `dentista_id` non nullo sopravvive fino a quel punto, il `DELETE
FROM clienti` fallisce.

**Misurato, non ipotizzato — quanti laboratori sono colpiti OGGI (sola lettura):**

```sql
SELECT laboratorio_id, count(*) FROM public.data_processing_agreements
 WHERE dentista_id IS NOT NULL AND deleted_at IS NULL GROUP BY laboratorio_id;
```
```
[{"laboratorio_id":"971061a1-014f-4dc4-a2bf-a1fb5cbe3a5c","count":2}]
```

**Un solo laboratorio oggi (Filippo, 2 righe).** L'estensione a "ogni laboratorio futuro" è
un'**inferenza dal vincolo**, dichiarata come tale, non una misura: il CHECK `dpa_emissione_coerente`
impone che ogni DPA **emessa per davvero** (`numero_dpa` valorizzato) abbia anche `dentista_id`
obbligatoriamente valorizzato — quindi, per costruzione, **ogni futuro laboratorio che emetta almeno
una DdC/DPA verso un dentista** erediterà lo stesso blocco, indipendentemente da `emesso_da`.

**Verificato che NON è un effetto di questo piano** (Follow-up A, `scripts/tmp/p7-t4-followup.mjs`):
lo stesso errore, **identico**, si riproduce chiamando `admin_delete_laboratorio('971061a1-...')` **senza
toccare `emesso_da`**:

```
HTTP 400
{"message":"...ERROR:  23503: update or delete on table \"clienti\" violates foreign key constraint
\"data_processing_agreements_dentista_id_fkey\"...
CONTEXT: ...DELETE FROM clienti WHERE laboratorio_id = p_lab_id...
PL/pgSQL function admin_delete_laboratorio(uuid) line 37..."}
```

**Preesistente a P7, indipendente da `emesso_da`.** Oggi, in produzione, il laboratorio Filippo (che
ha 2 DPA emesse) **non può essere cancellato** da questa funzione. Qualunque altro laboratorio con
almeno una DPA emessa a un dentista avrà lo stesso problema.

**Non corretto:** non è il mandato di questo task riordinare `admin_delete_laboratorio()` (che tocca
~40 tabelle in un ordine che va rivisto con lo stesso rigore delle migration di schema, non come
un'appendice di questo referto). Segnalato per decisione di Francesco — probabilmente una migration
dedicata che sposta `DELETE FROM data_processing_agreements` prima di `DELETE FROM clienti`, o che
azzera `dentista_id`/`emesso_da` (`SET NULL`) prima del blocco `clienti`.

### F2 🟡 — la claim NARROW di T4 (DPA-prima-di-utenti) verificata isolatamente

Per completare comunque la domanda originaria di T4, ho isolato la parte che riguarda **solo**
`emesso_da`/`utenti`, usando la funzione **reale** (non un sottoinsieme scritto a mano — il primo
tentativo in questo senso, Follow-up B, ha prodotto un altro falso-negativo per una ragione diversa:
mancavano le altre ~38 `DELETE` della funzione vera, in particolare `lavori`, che referenzia
`utenti.id` via `lavori.segnalazione_by`). Ho usato **Lab Pepe** (`314cd040-0893-4e9d-9ad8-786e4eefd75f`),
che oggi non ha DPA né lavori, inserendo una riga DPA **sintetica** con `emesso_da` riempito ma
**senza** emissione (`numero_dpa` NULL, `tipo_controparte='sub_responsabile'`, `dentista_id` NULL —
evita apposta sia la CHECK `dpa_emissione_coerente` sia il bug F1), poi chiamando la funzione **vera**
e completa:

```
HTTP 201
[{"n_dpa_inserite":1,"risultato":{"ok":true,"nome":"Lab Pepe",
  "deleted":{"utenti":1,"clienti":20,"data_processing_agreements":1,"laboratori":1, …}}}]
```

`ok:true`, `data_processing_agreements:1`, `utenti:1`, `laboratori:1` — **arrivata in fondo**, con
`emesso_da` davvero riempito e referenziante un utente reale dello stesso laboratorio. **Verifica
post-hoc**: Lab Pepe intatto dopo il `ROLLBACK` (`n_clienti:20` invariato, `n_dpa:0`, `n_utenti:1`).

**Conclusione onesta:** la claim che T1 del Task 1 aveva scritto nel commento della migration («le
righe DPA se ne vanno alla 155, `utenti` alla 163 — ora PORTANTE») **regge**, isolatamente. Ma **non
è raggiungibile nel percorso reale** per un laboratorio che abbia già emesso una DPA a un dentista,
perché F1 blocca la funzione molto prima di arrivarci. I due fatti non si annullano a vicenda: sono
veri entrambi, su piani diversi.

### F3 🟢 — nessun altro ritrovamento fuori mandato

Nessun altro difetto di piano o di codice trovato oltre F1/F2 e l'esito di T3 (già in §T3, in
mandato perché riguarda direttamente la prova assegnata).

---

## 7. Meccanica delle prove — cose verificate prima di fidarmi dell'esito

- **`_audit_trigger_fn` è `SECURITY DEFINER`** (`prosecdef=true`): l'`INSERT` in `audit_log` (che ha
  RLS attiva ma **zero policy**) riesce comunque sotto il ruolo impersonato `authenticated`, perché la
  funzione gira come il suo proprietario. Verificato **prima** di scrivere T1(a), non dopo un fallimento
  inatteso.
- **`current_lab_id()` risolto correttamente** in ogni prova impersonata (`971061a1-...` per l'utente
  Filippo) — mai un «verde per la ragione sbagliata».
- **`read_only:false` per ogni prova che impersona un utente o osserva l'effetto dentro la
  transazione** — con `read_only:true` la connessione gira come `supabase_read_only_user` e i numeri
  sarebbero sbagliati per un motivo diverso da quello che si vuole misurare.
- **Nessun `COMMIT`** in nessuna delle chiamate scritte in `scripts/tmp/p7-prove-comportamento.mjs`:

  ```
  $ grep -v '^\s*//' scripts/tmp/p7-prove-comportamento.mjs | grep -c "COMMIT"
  0
  ```

- **Un residuo che il `ROLLBACK` non annulla, dichiarato e non nascosto:** l'avanzamento della
  sequenza di `audit_log.id` (colonna `bigint`, generata) per le righe inserite e poi annullate. Non è
  un dato che resta — è un buco nella numerazione, normale per qualunque sequenza Postgres dentro una
  transazione annullata, e non ha alcun effetto osservabile sul comportamento del sistema.

---

## 8. File toccati

- 🆕 `scripts/tmp/p7-prove-comportamento.mjs` (usa e getta, gitignored, NON committato)
- 🆕 `scripts/tmp/p7-t4-followup.mjs`, `scripts/tmp/p7-t4-followup-c.mjs` (idem, nati da F1/F2)
- 🆕 `docs/roadmap/2026-08-04-p7-referto-prove.md` (questo file — **committato**)

Nessun altro file del repo toccato. Nessuna riga del database è rimasta modificata: ogni scrittura di
questo referto è stata annullata con `ROLLBACK`, verificato con letture post-hoc separate per T1, T4,
T5 e i due follow-up di F1/F2.

---

## 9. Cosa resta aperto (per Francesco)

1. **F1 è un bug reale in produzione**, non solo un problema di questo piano: `admin_delete_laboratorio()`
   fallisce **oggi, misurato**, sul laboratorio Filippo (l'unico con righe DPA che referenziano ancora
   un cliente), e per costruzione del vincolo `dpa_emissione_coerente` colpirà lo stesso modo ogni
   futuro laboratorio che emetta una DdC/DPA a un dentista. Da decidere: quando e come riordinare la
   funzione (probabile candidato: spostare `DELETE FROM data_processing_agreements` prima del blocco
   `clienti`, o azzerare `dentista_id` con `SET NULL` a monte).
2. **T3 non ha ancora una riga vera da mostrare.** Per chiuderla per davvero serve o una emissione reale
   (permanente, fuori dalla mia autorizzazione per questo task) o attendere che accada nel flusso
   normale dell'app.
