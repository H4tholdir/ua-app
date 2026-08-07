# Referto — Task 1: la migration del registro DPA (cancello, traccia, emesso_da)

**Piano:** `docs/superpowers/plans/2026-08-04-p7-registro-dpa-cancello-traccia.md`
**Brief:** `.superpowers/sdd/task-1-brief.md`
**Ramo:** `p7-registro-dpa-cancello-traccia` (già creato, già sopra all'avvio)
**Decisioni applicate:** D151 (Claude applica la migration via Management API, `read_only:false`, autorizzato da Francesco)

⚠️ **Nota preliminare:** `.superpowers/sdd/task-1-report.md`, `task-2-brief.md`, `task-2-report.md`,
`task-3-brief.md`, `task-3-report.md` contenevano, prima di questo referto, materiale di un piano
**precedente e diverso** (`docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md`, PDF/versione
modello, `VERSIONE_MODELLO_DPA`) — non il piano P7 corrente. Dettaglio in §4 (R-E2, F1). Questo file
sostituisce integralmente il vecchio `task-1-report.md`.

---

## 0. Ricognizione iniziale

- `git status -sb` → già sul ramo `p7-registro-dpa-cancello-traccia`, working tree pulito.
- `.superpowers/` è **gitignored** (`.gitignore:113,130` → `git check-ignore -v` conferma): i file in
  `.superpowers/sdd/` sono scratch locale, non versionato — spiega perché file di un piano precedente
  possano restare sul disco senza che nessun commit li tocchi.
- `.env.local` contiene sia `SUPABASE_ACCESS_TOKEN` sia `SUPABASE_DB_URL` (verificato con `grep -c`,
  senza stampare i valori).
- Letto per intero: `task-1-brief.md`, la sezione Task 1 del piano (righe 92-266), lo script
  `scripts/tmp/p7-riverifica.mjs` (esiste già, è quello che il brief chiede di lanciare), e le sezioni
  circostanti di `supabase/schema.sql`.

---

## 1. Esecuzione passo per passo

### Step 0 — il ramo

Già fatto prima dell'avvio di questo esecutore. `git status -sb` → `## p7-registro-dpa-cancello-traccia`,
nessun file modificato. ✅

### Step 1 — rileggere il catalogo VIVO, in sola lettura, PRIMA di scrivere il file

```
provato: node scripts/tmp/p7-riverifica.mjs

=== ① quante righe, e quante FIRMATE === (HTTP 201)
[{"righe":2,"con_firmato_at":0,"con_firmato_da":0,"con_impronta":2}]

=== ③ la regola di riga — comando e presenza del controllo in SCRITTURA === (HTTP 201)
[{"tabella":"data_processing_agreements","regola":"dpa_laboratorio","comando":"*",
  "ha_using":true,"ha_with_check":false,"rls_attiva":true,"rls_forzata":false}, …]

=== ⑤ la tabella è fra quelle sorvegliate dal registro delle modifiche? === (HTTP 201)
[{"tabella":"data_processing_agreements","automatismo":"trg_data_processing_agreements_updated_at"}]
```

Confrontato con l'atteso del brief: **2 righe, 0 firmate** ✅ · `dpa_laboratorio` con **`cmd=ALL`
(`comando:"*"`) e `ha_with_check=false`** ✅ · nessun automatismo **di audit** (solo il trigger generico
`…_updated_at`, nessun `_audit_*`) ✅. La finestra a costo zero **è ancora aperta**. Procedo.

### Step 2 — scrivere la migration

File creato: `supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql`, **testo
identico** a quello del brief/piano (copiato dal documento approvato, non riscritto a memoria):
cancello (`DROP POLICY`/`CREATE POLICY … FOR SELECT`), traccia (`DROP TRIGGER`/`CREATE TRIGGER
_audit_data_processing_agreements … EXECUTE FUNCTION public._audit_trigger_fn()`), colonna
(`ADD COLUMN IF NOT EXISTS emesso_da UUID REFERENCES public.utenti(id)` + `COMMENT ON COLUMN`). ✅
Nessun `BEGIN;`/`COMMIT;` di transazione aggiunto (il runner li mette lui, come richiesto). ✅

### Step 3 — aggiornare `supabase/schema.sql` a mano

🛑 **Difetto trovato nel brief (vedi anche §4):** il brief cita «riga della regola: **2876-2878**».
Nel file reale, `CREATE POLICY "dpa_laboratorio"` **non era lì** — era a **riga 2936** (`grep -n
"CREATE POLICY \"dpa_laboratorio\""` → `2935:CREATE POLICY`, preceduta da `2935:ALTER TABLE …
ENABLE ROW LEVEL SECURITY;` e seguita da `2938:SELECT apply_updated_at_trigger(…)`). Le righe
2876-2878 nel file reale sono invece dentro la definizione delle colonne (`anno_dpa`,
`progressivo_dpa`, `storage_path_pdf`). Ho **localizzato il blocco per CONTENUTO** (grep sul testo
`CREATE POLICY "dpa_laboratorio"` e su `apply_updated_at_trigger(...)`), non per numero di riga, e ho
applicato la modifica lì. Il blocco colonne («intorno a 2864-2884») era invece **accurato**:
`emesso_at TIMESTAMPTZ,` è davvero a riga 2881.

Modifiche fatte, entrambe verificate con `Read` dopo l'edit:
1. Dopo `emesso_at TIMESTAMPTZ,` (riga 2881): aggiunta `emesso_da UUID REFERENCES utenti(id), --
   chi ha PREMUTO (≠ firmato_da, che e' la controparte)`.
2. Alla regola reale (righe 2935-2938 prima dell'edit): `CREATE POLICY "dpa_laboratorio" …
   USING (…);` → `FOR SELECT USING (…);` + commento + `CREATE TRIGGER
   _audit_data_processing_agreements …`. **Ho lasciato intatte** sia la riga
   `ALTER TABLE … ENABLE ROW LEVEL SECURITY;` sopra sia `SELECT
   apply_updated_at_trigger('data_processing_agreements');` sotto — nessuna delle due è toccata dalla
   migration, e il blocco «sostituendo il testo attuale» del brief mostra solo il testo che
   effettivamente cambia (non le righe di contesto invariate). Rimuoverle avrebbe reso lo `schema.sql`
   una fotografia FALSA (RLS spenta, trigger `updated_at` sparito) di un database dove entrambe restano
   accese.

### Step 4 — verificare che il file sia coerente con sé stesso

```
provato: grep -c "BEGIN;\|COMMIT;" supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql
  → 1        (atteso dal brief: 0)
```

🛑 **Difetto trovato nel brief** (dettaglio in §4): il conteggio non è 0 perché la riga di intestazione
**imposta dallo stesso Step 2** del brief — `-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase
avvolge gia' la migration.` — contiene **letteralmente** le sottostringhe `BEGIN;` e `COMMIT;` dentro un
commento. Non ho alterato quel commento (è testo approvato, dettato dal piano) solo per far tornare un
grep. Ho verificato il vero intento del passo — nessuna istruzione SQL reale di apertura/chiusura
transazione — escludendo le righe di commento:

```
provato: grep -v '^--' supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql \
           | grep -c "BEGIN;\|COMMIT;"
  → 0
```

Il file **è** coerente con sé stesso nel senso che conta (nessun `BEGIN;`/`COMMIT;` come istruzione
eseguibile); il grep letterale del brief no, per la ragione sopra.

### Step 5 — APPLICARE la migration — Management API, `read_only:false` (D151)

Scritto uno script usa-e-getta in scratchpad (`apply-p7-migration.mjs`, fuori dal repo) che legge il
SQL **dal file della migration** (non ricopiato a mano) e lo divide nei **tre blocchi** già delimitati
nel file stesso dai marcatori `① IL CANCELLO` / `② LA TRACCIA` / `③ IL «CHI»`, con **una chiamata per
blocco**, `read_only:false`. Prima di eseguire in rete, ho stampato i tre blocchi risultanti dallo split
in locale (nessuna chiamata di rete) per controllare che i confini non tagliassero un'istruzione a metà:
confermato, ogni blocco è autonomo e sintatticamente completo.

```
provato: node apply-p7-migration.mjs

=== BLOCCO ① IL CANCELLO === (HTTP 201)
[]
=== BLOCCO ② LA TRACCIA === (HTTP 201)
[]
=== BLOCCO ③ IL «CHI» === (HTTP 201)
[]
```

Tutti e tre HTTP 201, nessun errore. ✅ Nessun errore `functions in check constraint must be marked
IMMUTABLE` o altro — non applicabile comunque a questa migration (non ha CHECK, a differenza della
migration del 03/08 sulle emissioni).

Ledger:
```
provato: npx supabase migration repair --status applied 20260804120000
  → Repaired migration history: [20260804120000] => applied
    {"versions":["20260804120000"],"status":"applied","repairAll":false,
     "message":"Migration history repaired"}
```
Riuscito, nessun prompt interattivo. ✅

### Step 6 — verificare che il database sia DAVVERO cambiato — in sola lettura

```
provato: node scripts/tmp/p7-riverifica.mjs (dopo l'applicazione)

=== ③ === [{"tabella":"data_processing_agreements","regola":"dpa_laboratorio","comando":"r",
            "ha_using":true,"ha_with_check":false,"rls_attiva":true,"rls_forzata":false}, …]
=== ⑤ === [{"tabella":"data_processing_agreements","automatismo":"_audit_data_processing_agreements"},
           {"tabella":"data_processing_agreements","automatismo":"trg_data_processing_agreements_updated_at"}]
```

Le tre cose attese, tutte confermate: `comando` passato da `"*"` a **`"r"`** ✅ ·
`data_processing_agreements` **presente** fra gli automatismi, con `_audit_data_processing_agreements`
✅ · resta da vedere la colonna (il riverifica script non la controlla — verifica supplementare sotto).

Verifica supplementare, in sola lettura, per la colonna (non nello script esistente, aggiunta perché il
brief la richiede esplicitamente come terza cosa attesa):
```
provato: SELECT column_name, data_type, is_nullable FROM information_schema.columns
          WHERE table_schema='public' AND table_name='data_processing_agreements'
            AND column_name='emesso_da';
  → [{"column_name":"emesso_da","data_type":"uuid","is_nullable":"YES"}]
```
Colonna presente, tipo `uuid`, annullabile. ✅

Verifica supplementare della chiave esterna (non richiesta esplicitamente dal brief, fatta per
completezza dato che il commento della migration ne fa un punto centrale — «chiave esterna NUDA»):
```
provato: SELECT conname, confrelid::regclass, confdeltype FROM pg_constraint
          WHERE conrelid='public.data_processing_agreements'::regclass AND contype='f';
  → […, {"conname":"data_processing_agreements_emesso_da_fkey",
         "referenced_table":"utenti","confdeltype":"a"}]
```
`confdeltype:"a"` = `NO ACTION` (il default) — conferma che è una FK **nuda**, nessun `ON DELETE
CASCADE`/`SET NULL`, come dichiarato nel commento della migration.

### Step 7 — FASE 6b: rigenerare i tipi

```
provato: npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > /tmp/database.types.new.ts
  → exit 0, stderr vuoto, nessun messaggio CLI in coda al file generato (`tail -5` pulito)
provato: diff src/types/database.types.ts /tmp/database.types.new.ts
  → solo 3 punti: emesso_da in Row/Insert/Update + la nuova relazione FK verso utenti.
    Nessun'altra differenza — conferma che nessun altro drift di schema è stato introdotto.
```
File installato al posto del precedente.
```
provato: npx tsc --noEmit
  → TSC EXIT CODE: 0   (atteso: 0 errori — confermato: Task 1 non tocca firme di funzione,
    quella rottura a 54 errori TS2554 è prevista per il Task 2)
provato: grep -c "emesso_da" src/types/database.types.ts
  → 5   (atteso: ≥ 3)
```

### Step 8 — Commit

```
provato: git status -sb
  →  M src/types/database.types.ts
     M supabase/schema.sql
     ?? supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql
  (esattamente e SOLO i tre file del mandato — nessun git add -A)

provato: git add supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql \
                 supabase/schema.sql src/types/database.types.ts
         git commit -F <messaggio in scratchpad, fuori dal repo>
  → tutte le guardie pre-commit verdi: DS compliance OK · Guardia CSRF verde ·
    Guardia coerenza documenti verde (4 documenti vivi controllati) · Guardia salvataggio automatico OK
  → [p7-registro-dpa-cancello-traccia 0e7d1b6f] feat(db): P7 registro DPA — cancello, traccia,
     e chi ha emesso
     3 files changed, 79 insertions(+), 1 deletion(-)
provato: git status -sb → pulito (nessun file pendente)
```

---

## 2. Interfacce prodotte (verificate)

- ✅ Colonna `emesso_da UUID REFERENCES public.utenti(id)` su `public.data_processing_agreements`,
  applicata sul database vivo e presente in `supabase/schema.sql`.
- ✅ `src/types/database.types.ts` — `emesso_da` presente in `Row`, `Insert`, `Update` del tipo
  `data_processing_agreements`, più la relazione FK verso `utenti`. Il Task 2 può compilare contro
  questi tipi.

---

## 3. Verifiche extra fatte di mia iniziativa (dentro il mandato — dovute alla frase del commento
della migration, non richieste esplicitamente passo-per-passo dal brief)

La migration stessa dichiara: «nessun percorso cancella un utente singolo, e dentro
`admin_delete_laboratorio` le righe DPA se ne vanno alla 155, `utenti` alla 163» — e definisce
quell'ordine «ora PORTANTE» per giustificare la FK nuda (senza `ON DELETE`). Ho verificato:

```
provato: grep -n "CREATE OR REPLACE FUNCTION public.admin_delete_laboratorio\|DELETE FROM
          data_processing_agreements\|DELETE FROM utenti" supabase/migrations/*.sql
```
La ridefinizione **più recente** della funzione è in
`supabase/migrations/20260727120200_lavori_colore_caso.sql` (27/07, la più recente fra le quattro
migration che toccano `admin_delete_laboratorio`): lì `DELETE FROM data_processing_agreements` è
**riga 155**, `DELETE FROM utenti` è **riga 163**. **Il claim del commento è ESATTO, verificato sul
file vigente**, non su una versione superata della funzione (avevo controllato prima una versione
intermedia del 22/07 dove i numeri non tornavano — 176/184 — perché quella non è la ridefinizione più
recente; ho poi trovato quella del 27/07 e i numeri coincidono).

```
provato: grep -rl "DELETE FROM utenti" --include="*.ts" --include="*.sql" src supabase
  → solo i quattro file di migration che ridefiniscono admin_delete_laboratorio nel tempo.
```
Confermato: nessun percorso applicativo cancella un singolo utente al di fuori di
`admin_delete_laboratorio`. Il claim «nessun percorso cancella un utente singolo» regge.

---

## 3-bis. Verifiche aggiuntive fatte dopo un primo passaggio dell'advisor

Prima di dichiarare fatto, l'advisor ha segnalato tre controlli mancanti — tutti in sola lettura,
nessuno tocca il comportamento (che resta il Task 3). Fatti tutti e tre:

**(a) Il claim «`_audit_trigger_fn` è generica, legge `id`/`laboratorio_id`» — mai verificato sul
corpo reale della funzione, solo sull'esistenza del trigger.** Rischio: se la funzione avesse
richiesto colonne assenti su questa tabella, ogni scrittura di servizio su
`data_processing_agreements` fallirebbe da adesso in poi.

```
provato: SELECT prosrc FROM pg_proc WHERE proname='_audit_trigger_fn' AND pronamespace='public'::regnamespace;
  → legge id/laboratorio_id con l'operatore JSONB `->>'…'` (non un riferimento diretto a colonna),
    con COALESCE di fallback su laboratori (che non ha laboratorio_id, usa il proprio id).
    Se una chiave manca, `->>'` restituisce NULL — non solleva un errore. Inserisce poi in
    audit_log(table_name, operation, row_id, lab_id, actor_id, old_data, new_data): nessun
    riferimento a colonne specifiche di data_processing_agreements.
```
**Esito: il claim regge, ed è perfino più robusto del dichiarato** (non solleverebbe comunque, anche
se le colonne mancassero). Nessun rischio di scrittura rotta. ✅ Non blocca.

**(b) Come dichiarano `schema.sql` gli altri dieci audit trigger, per confronto con quello appena
aggiunto?**

```
provato: grep -n "_audit_trigger_fn\|AFTER INSERT OR DELETE OR UPDATE" supabase/schema.sql
  → SOLO la mia aggiunta (righe 2940-2942, _audit_data_processing_agreements).
provato (catalogo vivo): SELECT c.relname, t.tgname FROM pg_trigger t JOIN pg_class c […]
                          WHERE t.tgname LIKE '_audit_%' AND NOT t.tgisinternal;
  → 11 righe: cicli_produzione, clienti, data_processing_agreements, dichiarazioni_conformita,
    fasi_produzione, fatture, laboratori, lavori, listino, magazzino, utenti.
```
🔴 **Difetto reale, PREESISTENTE (non introdotto da me), fuori mandato: `schema.sql` non rispecchia
NESSUNO dei dieci audit trigger già in produzione — solo il mio, nuovo, li rende 1 su 11 visibili.**
Dettaglio e classificazione in §4, F4.

**(c) Il ledger delle migration mostra davvero la riga, non solo «il comando ha detto successo»?**

```
provato: npx supabase migration list
  → nell'elenco completo, {"local":"20260804120000","remote":"20260804120000", …} — local e
    remote coincidono, nessuna voce "missing" o asimmetrica in tutto l'elenco.
```
✅ Ledger davvero allineato.

---

## 4. Ritrovamenti FUORI mandato (R-E2) — riferiti, NON corretti

### F1 🟡 — cinque file scratch in `.superpowers/sdd/` appartengono a un piano DIVERSO e più vecchio

`task-1-report.md` (ora sovrascritto da questo referto), `task-2-brief.md`, `task-2-report.md`,
`task-3-brief.md`, `task-3-report.md` contenevano — prima che intervenissi — materiale del piano
`docs/superpowers/plans/2026-08-03-dpa-registro-emissioni.md` (03/08: versione del modello PDF,
`VERSIONE_MODELLO_DPA`, `dpa-modello.ts`, `improntaPayload`), **non** del piano P7 corrente
(`2026-08-04-p7-registro-dpa-cancello-traccia.md`), il cui Task 2 è «il parametro obbligatorio di
`generateDpa`» e il cui Task 3 è «le prove di comportamento sul database vivo» — argomenti
completamente diversi. Confermato leggendo entrambi i piani: la sezione Task 2/Task 3 del piano P7
(righe 267+ e 407+) non corrisponde per niente al contenuto degli attuali `task-2-brief.md`/
`task-3-brief.md` su disco.

**Perché è un problema:** questi file sono scratch **gitignored** (`.superpowers/` intero,
`.gitignore:113,130`), quindi nessun commit li ripulisce automaticamente fra un piano e il successivo.
Se l'esecutore del prossimo Task 2 viene indirizzato a leggere «`.superpowers/sdd/task-2-brief.md`»
allo stesso modo in cui io sono stato indirizzato a leggere `task-1-brief.md`, **troverebbe il brief
sbagliato** — un `task-2-report.md` da 254 righe che sembra già un lavoro completo, ma su un compito
diverso. `task-1-brief.md` (il mio) era invece corretto e allineato al piano P7: non tutti i file della
cartella sono aggiornati allo stesso modo, ed è esattamente il tipo di incoerenza silenziosa che
un'allowlist/elenco può nascondere.

**Non corretto:** non ho toccato `task-2-brief.md`, `task-2-report.md`, `task-3-brief.md`,
`task-3-report.md` — non è il mio mandato deciderne il destino (potrebbero dover essere rigenerati dal
piano P7 corrente, o è previsto che chi dispatcha il Task 2 li rigeneri comunque prima di consegnarli).
Ho sovrascritto **solo** `task-1-report.md`, che era esplicitamente il file che questo mandato mi chiede
di scrivere.

### F2 🟡 — Step 3 del brief cita righe sbagliate per la regola RLS

Il brief (e il piano, stessa formulazione) dice «Modifica: `supabase/schema.sql` (righe **2876-2878**
per la regola…)». Nel file reale quelle righe sono dentro il blocco colonne (`anno_dpa`,
`progressivo_dpa`, `storage_path_pdf`), non la regola. `CREATE POLICY "dpa_laboratorio"` era davvero a
riga **2935-2938** prima del mio intervento. Non ho fermato il task per questo (l'istruzione SQL di
cosa scrivere era comunque inequivocabile, e l'ho localizzata per contenuto, non per numero), ma il
numero di riga citato nel brief/piano **non torna** e andrebbe corretto nel documento sorgente per chi
lo rilegge in futuro.

### F3 🟢 — Step 4 del brief: il grep «atteso 0» non può mai dare 0 su questo file

Vedi dettaglio in §1, Step 4. Il commento obbligatorio dettato dallo stesso Step 2 del brief contiene
letteralmente le sottostringhe cercate. È un difetto di poco conto (il comando di verifica non misura
quello che pensa di misurare) ma vale la pena segnalarlo perché lo stesso comando, applicato senza
pensarci, farebbe credere che *qualcosa* non va nel file quando invece va tutto bene.

### F4 🔴 — `supabase/schema.sql` non rispecchia NESSUNO dei dieci audit trigger preesistenti

Trovato in §3-bis(b), su segnalazione dell'advisor. Il catalogo vivo ha **undici** trigger `_audit_*`
(dieci preesistenti + il mio nuovo su `data_processing_agreements`). `schema.sql` — il file che il
progetto tratta come «fotografia mantenuta a mano» del database — **ne mostra uno solo: il mio**. I
dieci storici (`_audit_cicli_produzione`, `_audit_clienti`, `_audit_dichiarazioni_conformita`,
`_audit_fasi_produzione`, `_audit_fatture`, `_audit_laboratori`, `_audit_lavori`, `_audit_listino`,
`_audit_magazzino`, `_audit_utenti`) non compaiono da nessuna parte nel file — né come
`CREATE TRIGGER` diretto né dietro un helper tipo `apply_updated_at_trigger`.

**Non l'ho causato io**: la drift è preesistente al mio intervento — ho solo verificato che il file
non li avesse MAI avuti, non che li abbia persi durante questo task. **Ma il mio commit lo rende più
visibile**: prima c'erano zero audit trigger nella fotografia (coerente almeno con se stesso, anche se
falso), ora ce n'è uno solo su undici — un elenco che sembra parziale perché lo È, esattamente il
pattern che §0A-bis di `../CLAUDE.md` chiama «un elenco che sembra completo e non lo è».
**Conseguenza pratica:** se `schema.sql` venisse mai rigiocato per ricostruire il database da zero
(come F1 del referto precedente aveva già segnalato per `apply_updated_at_trigger`), **dieci tabelle
perderebbero silenziosamente la propria traccia di controllo**, e nessun test lo noterebbe finché
qualcuno non cercasse esplicitamente quella riga in `audit_log`.

**Non corretto:** non è il Task 1 a dover riconciliare un'intera fotografia con dieci migration
storiche che non l'hanno mai aggiornata — è un lavoro suo, probabilmente una migration/ondata a parte
(rispecchiare i dieci `CREATE TRIGGER` mancanti, o introdurre un helper `apply_audit_trigger(nome)`
come esiste già per `updated_at`). Segnalato per decisione di Francesco.

---

## 5. Riepilogo

| | |
|---|---|
| **Stato** | `DONE_WITH_CONCERNS` — tutti gli Step 0-8 completati, migration applicata e verificata sul database vivo (compreso il corpo di `_audit_trigger_fn`, verificato su richiesta dell'advisor), tipi rigenerati, `tsc` a 0 errori, commit fatto con tutte le guardie verdi, ledger confermato allineato con `supabase migration list`. **Non è un `DONE` netto** per via di F1 e F4 (sotto) — nessuno dei due blocca il Task 2, ma entrambi sono trappole reali per chi lavora dopo di me |
| **Migration applicata?** | **SÌ**, via Management API con `read_only:false` (D151), tre blocchi, tutti HTTP 201. Ledger riparato con successo e poi RICONFERMATO con `supabase migration list` (local=remote) |
| **Commit** | `0e7d1b6f` — `feat(db): P7 registro DPA — cancello, traccia, e chi ha emesso` — 3 file, +79/-1 |
| **Difetti trovati nel brief/piano** | 2 (§1 Step 3 e Step 4 — vedi anche §4 F2/F3): un numero di riga sbagliato e un comando di verifica che non può dare l'esito che promette. Nessuno dei due bloccava l'esecuzione: risolti localizzando per contenuto e verificando l'intento reale |
| **Ritrovamenti fuori mandato (R-E2)** | **2 rilevanti**: **F1** — cinque file scratch di un piano precedente in `.superpowers/sdd/`, potenziale trappola per il Task 2/3 successivo; **F4** — `schema.sql` non rispecchia NESSUNO dei dieci audit trigger preesistenti (il mio è l'unico degli undici visibile nella fotografia) — trovato solo dopo un giro dell'advisor, non dal mio primo passaggio. + 2 minori (F2, F3) |
| **Interfacce per il Task 2** | colonna `emesso_da` presente sia nel database vivo sia in `database.types.ts` (Row/Insert/Update) — verificato con `tsc --noEmit` a 0 errori |
