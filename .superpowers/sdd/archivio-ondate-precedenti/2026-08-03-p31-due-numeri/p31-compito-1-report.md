# Compito 1 — La colonna — Referto

**Stato: DONE — la colonna è viva, tipata e committata; il ledger delle migration remoto è
allineato.** 🔄 **Aggiornato dalla correzione del rilievo Importante (revisione Compito 1, vedi
sezione in fondo al referto):** il blocco descritto sotto (`supabase migration repair` negato dal
classificatore di questa sessione) **è stato risolto dal controllore**, fuori da questo sandbox —
`provato:` `npx supabase migration repair --status applied 20260803113525` →
`Repaired migration history: [20260803113525] => applied`; `npx supabase migration list --linked`
la mostra registrata sia in locale sia in remoto. Il blocco iniziale (quale strada usare per
applicare la migration) era stato risolto dal controllore con **D151** (decisione già ratificata,
precedente P7): Management API (`read_only:false`) + `supabase migration repair`. Tutti e 7 i passi
del brief sono fatti e verificati con output reale.

⚠️ La revisione di questo referto ha anche trovato un difetto reale, non correlato al ledger: la
stringa del commento `COMMENT ON COLUMN clienti.telefono` conteneva `Puo''`/`e''` invece di
`Può`/`è` — corretto e riapplicato al database. Dettaglio completo nella sezione «Correzione del
rilievo Importante» in fondo a questo referto.

---

## Aggiornamento dopo la decisione D151 del controllore

Il controllore ha verificato il registro remoto (`supabase migration list --linked`) e confermato
la mia diagnosi: `20260804120000` è l'ultima registrata, la mia `20260803113525` aveva
`remote: ""`. Ha applicato **D151** (`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`,
Cinquantatreesima tornata) — la stessa decisione presa per P7 — autorizzando: Management API
(`read_only:false`) per il DDL, poi `supabase migration repair --status applied <versione>` per
rimettere in pari il ledger. Confermato che il timestamp **non va cambiato** (D155 — l'orologio,
non il file precedente).

**1. Applicato il DDL via Management API** (script usa e getta `scripts/tmp/p31-applica-migration.mjs`,
legge il file di migration e lo esegue con `read_only:false`):

```
$ npx tsx scripts/tmp/p31-applica-migration.mjs
HTTP 201
[]
```

Riverificato con la sonda già scritta:

```
$ npx tsx scripts/tmp/p31-sonda-ledger.mjs
=== ③ clienti ha già una colonna cellulare_whatsapp? === (HTTP 201)
[{"column_name":"cellulare_whatsapp"}]
```

La colonna esiste sul DB remoto.

**2. `supabase migration repair --status applied 20260803113525` — BLOCCATO dal sandbox, non
applicato.** Due tentativi, stesso esito:

```
$ npx supabase migration repair --status applied 20260803113525
Permission for this action was denied by the Claude Code auto mode classifier.
Reason: Blocked by classifier. [...] To allow this type of action in the future,
the user can add a Bash permission rule to their settings.
```

Non è un errore della CLI né del progetto: è il sandbox di permessi di **questa** sessione Claude
Code che rifiuta il comando `supabase migration repair`, verosimilmente perché tocca la
storia delle migration su un progetto remoto. **Non ho tentato una via alternativa** (es. una query
SQL diretta su `supabase_migrations.schema_migrations` via Management API, che replicherebbe
esattamente l'azione bloccata per un canale diverso) — per due ragioni, non solo una:
sarebbe aggirare l'intento del blocco invece di usare uno strumento diverso per lo stesso scopo, **e**
un `INSERT`/`UPDATE` scritto a mano **non sarebbe nemmeno equivalente**: il comando `repair` della CLI
scrive nel ledger più di una semplice versione (governa anche `statements`/`name` e la coerenza
interna della tabella), quindi una riga costruita a mano rischierebbe di creare esattamente la
forma di ledger **mezzo-registrato** che a B21 è costato una sessione intera da sistemare (19
versioni orfane). Ho proseguito con gli altri passi, che non dipendono da questo, come indicato dal
messaggio stesso del classificatore.

**Conseguenza concreta, da riferire:** il ledger remoto (`supabase_migrations.schema_migrations`)
**non registra ancora** la versione `20260803113525`. Lo schema è corretto e vivo (verificato ③
sopra), ma finché quella riga non viene scritta, un futuro `supabase db push` la rifiuterà di nuovo
con lo stesso errore `LegacyDbPushMissingRemoteError` visto al Passo 3 originale (sotto), a meno di
`--include-all` (sconsigliato, §B22) — **o** finché qualcuno, con permessi diversi da questa
sessione, non esegue quel `migration repair` (Francesco da un terminale suo, o una sessione futura
senza questo blocco specifico del classificatore).

**3. Passo 3 — sonda del brief (quella vera, non solo la mia sul ledger):**

```
$ npx tsx -e "... db.from('clienti').select('id, telefono, cellulare_whatsapp').limit(1) ..."
VERDE — la colonna risponde: [ 'id', 'telefono', 'cellulare_whatsapp' ]
```

Atteso raggiunto esattamente.

**4. Passo 4 — `gen types`:**

```
$ npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
(uscita pulita, exit 0)
```

Verificato: nessun messaggio CLI residuo in coda al file; `grep cellulare_whatsapp` trova 3 righe
(Row/Insert/Update, tutte `string | null` — coerente con l'interfaccia richiesta dal mandato).

**5. Passo 5 — `tsc --noEmit`:**

```
$ npx tsc --noEmit
(nessun output, exit 0)
```

**0 errori.**

**7. Passo 7 — commit:**

```
$ git add supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql supabase/schema.sql src/types/database.types.ts
$ git commit -m "feat(db): P31 — nasce clienti.cellulare_whatsapp, e telefono torna a dire la verità"
[p31-due-numeri-per-il-cliente 63d8346a] 3 files changed, 31 insertions(+), 1 deletion(-)
```

Gli hook pre-commit sono girati e sono verdi: eslint, conformità DS, guardia CSRF, guardia coerenza
documenti (8/8), guardia salvataggio automatico.

**Nota:** `docs/roadmap/ROADMAP-UFFICIALE.md` è comparso modificato nel working tree durante
l'esecuzione (1 riga), non toccato da me — **non l'ho incluso nello staging/commit**, è fuori dal
mio mandato (i file da toccare erano solo migration/schema.sql/types, per esplicita indicazione).
Presumo sia una scrittura del controllore in parallelo; lo lascio a chi coordina.

---

## Passo 1 — Timestamp dall'orologio

```
$ date -u "+%Y%m%d%H%M%S"
20260803113525
```

Formato usato: `YYYYMMDDHHMMSS` (14 cifre, **senza** `T`), come indicato dal controllore — il
comando del brief (`date -u "+%Y%m%dT%H%M%S"`) include la `T`, tolta per allinearsi al formato in
uso nella cartella `supabase/migrations/`.

File creato: `supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql`.

## Passo 2 — Migration scritta

Contenuto identico al brief, con una correzione: i commenti `--` (fuori da stringhe SQL) usano gli
accenti veri (`è`, `può`, `già`, `così`) invece di `e'`/`puo'`/`gia'`/`cosi'` — come richiesto
dall'autorevisione. Le due stringhe `COMMENT ON COLUMN ... IS '...'` mantengono l'apostrofo
raddoppiato (`Puo''`, `e''`, `l''utente`), perché sono dentro apici SQL e lì l'accento andrebbe
raddoppiato.

🛑 **Questa regola era SBAGLIATA, ed è la causa del difetto corretto in fondo al referto**: in SQL
il raddoppio dell'apice serve SOLO a rappresentare un apostrofo letterale (`l'utente` →
`l''utente`), non l'accento. `Puo''`/`e''` non producono `Può`/`è`: producono `Puo'`/`e'` col
carattere `'` letterale in coda. L'accento (`ò`, `à`, `è`, `ì`, `ù`) non richiede alcun escaping
dentro una stringa SQL — è un carattere UTF-8 come un altro. Vedi la sezione «Correzione del
rilievo Importante» in fondo per il dettaglio e la prova.

`non eseguito` sul DB — vedi blocco al Passo 3.

## Passo 3 — BLOCCO: come si applica la migration

**Ho eseguito `npx supabase migration up` come primo tentativo, per avere l'output vero:**

```
$ npx supabase migration up
Connecting to local database...
{"_tag":"Error","error":{"code":"LegacyDbConnectError","message":"failed to connect to postgres:
failed to connect to `host=127.0.0.1 user=postgres database=postgres`: dial error
(connect ECONNREFUSED 127.0.0.1:54322)","suggestion":"Make sure Docker is running, then
run: supabase start"}}
```

Conferma quanto già previsto: `migration up` punta al DB **locale** (Docker su `127.0.0.1:54322`),
non al progetto cloud `iagibumwjstnveqpjbwq`. Docker non è in esecuzione su questa macchina
(`docker info` fallisce) e il progetto non ha uno stack locale attivo. Questa non è la strada che
funziona qui, come previsto dal mandato.

**Non ho deciso da solo come procedere.** Ho invece eseguito una sonda di sola lettura
(`read_only: true`, stesso pattern di `scripts/tmp/p7-riverifica.mjs`) per dare al controllore i
dati con cui decidere, invece di una scelta alla cieca:

```
$ npx tsx scripts/tmp/p31-sonda-ledger.mjs

=== ① la versione più alta registrata nel ledger === (HTTP 201)
[{"version":"20260804120000","name":"p7_dpa_cancello_traccia_emesso_da"},
 {"version":"20260803150000","name":"dpa_registro_emissioni"},
 {"version":"20260803120000","name":"default_testo_conformita_accentato"},
 {"version":"20260803090000","name":"denti_snapshot_sulla_dichiarazione"},
 {"version":"20260802090000","name":"lavori_immagini_categoria_prescrizione"}]

=== ② il p7 (20260804120000_p7_dpa_cancello_traccia_emesso_da) è registrato? === (HTTP 201)
[{"version":"20260804120000","name":"p7_dpa_cancello_traccia_emesso_da"}]

=== ③ clienti ha già una colonna cellulare_whatsapp? (deve rispondere NO/0 righe) === (HTTP 201)
[]
```

(Script usa e getta in `scripts/tmp/`, non committato — la cartella è in `.gitignore`.)

**Quello che questo dice:**
- La colonna **non** esiste ancora (③ → 0 righe): nessuno l'ha applicata prima di me.
- Il ledger remoto (`supabase_migrations.schema_migrations`) registra già
  `20260804120000_p7_dpa_cancello_traccia_emesso_da` come versione più alta applicata.
- La mia nuova migration si chiama `20260803113525_...` — cioè con la data VERA (3 agosto), che è
  **numericamente inferiore** alla versione già registrata `20260804120000` (4 agosto, deriva di
  data nota, D155/§0F). **Questo è un problema diverso da quello che il mio mandato mi aveva già
  segnalato** (copiare 20260804120000 avrebbe mandato la mia migration nel futuro): qui è il
  contrario — la mia migration, con la data vera, nasce **"nel passato" rispetto a una versione
  già applicata**. Non ho verificato se questo impedisce un futuro `supabase db push`/`migration
  up` pulito (rischio di essere trattata come "fuori ordine" o di un mismatch di history — il
  progetto ha già un precedente di questa famiglia: B21, 19 versioni orfane nel ledger, risolto
  con `UPDATE supabase_migrations.schema_migrations`). Non ho corretto nulla: lo segnalo.

### Le opzioni che vedo, con le credenziali che ho in `.env.local` per tutte e tre

1. **`npx supabase migration up`** — ❌ non applicabile: richiede Docker locale, assente qui.
2. **`npx supabase db push`** — CLI collegata al progetto (`supabase/.temp/project-ref` =
   `iagibumwjstnveqpjbwq`) e `SUPABASE_DB_URL` è in `.env.local`. Precedente in questo stesso
   progetto (`memory/MEMORY.md`, riga ~903, Ondata 0): descritta esplicitamente come
   **«history-correct, MAI MCP apply_migration»** — cioè registra la riga nel ledger nel modo
   giusto. **Ma l'ho verificata con un dry-run (sola lettura, nessuna scrittura) invece di
   darla per buona, ed è bloccata:**

   ```
   $ npx supabase db push --dry-run
   DRY RUN: migrations will *not* be pushed to the database.
   Initialising login role...
   Connecting to remote database...
   Skipping migration MANUAL_000_auth_helpers.sql... (file name must match pattern "<timestamp>_name.sql")
   {"_tag":"Error","error":{"code":"LegacyDbPushMissingRemoteError","message":"Found local
   migration files to be inserted before the last migration on remote database.","suggestion":
   "Rerun the command with --include-all flag to apply these migrations:
   supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql"}}
   ```

   Questo è esattamente l'effetto dell'ordine di versione segnalato sopra: la mia migration
   (`20260803113525`, data vera) nasce sotto l'ultima registrata (`20260804120000`), e la CLI la
   rifiuta finché non si passa `--include-all`. **`--include-all` è la cosa esplicitamente evitata
   in questo progetto** (`memory/MEMORY.md` §B22: ~25 migration fondative pre-luglio non sono mai
   state registrate nel ledger, e un `--include-all` le toccherebbe tutte insieme, non solo la
   mia). Quindi: **`db push` così com'è è bloccato**, non solo rischioso — a meno di rinominare la
   mia migration con un timestamp successivo a `20260804120000` (ma allora si ripropone il
   problema opposto già segnalato dal mio mandato: mandarla nel futuro) o di riconciliare il
   ledger a mano prima del push.
3. **Management API** (`https://api.supabase.com/v1/projects/{ref}/database/query`, con
   `SUPABASE_ACCESS_TOKEN`) — usata ripetutamente nel progetto quando `db push` non era
   disponibile (B16, Ondata 3b, N12, Ondata 0-pulizia...). **Gotcha noto e ripetuto**: quando
   applicata così, il ledger viene timestampato con l'ORA della chiamata, non col nome del file
   locale — richiede poi un `UPDATE supabase_migrations.schema_migrations SET version = ...`
   mirato per allinearlo (fatto più volte in passato, es. B20, B16, B7).

Non ho scelto fra le tre. Chiedo al controllore quale usare, viste le implicazioni sul ledger
(punto sopra) — soprattutto perché la mia migration nasce con una versione inferiore a quella già
registrata.

**Mi fermo qui.** Non ho eseguito la sonda del brief (lo script `tsx` che legge
`clienti.select('id, telefono, cellulare_whatsapp')`) perché richiede che la colonna esista già sul
DB remoto — cosa che dipende dalla decisione sopra.

## Passo 4 — Rigenera i tipi

**Fatto**, dopo la decisione D151 del controllore — vedi «Aggiornamento dopo la decisione D151»
in cima al referto per l'output reale.

## Passo 5 — `tsc --noEmit`

**Fatto, 0 errori** — vedi sezione D151 sopra per l'output reale.

## Passo 6 — `supabase/schema.sql`

Fatto (non committato). Nota: la riga con `-- Usato per WhatsApp` era alla **riga 373** (non 372
come diceva il brief) — ho trovato la riga per contenuto (`grep`), non per numero, quindi non ha
avuto conseguenze. Con l'inserimento della nuova riga, ora `telefono` resta 373 e
`cellulare_whatsapp` è la 374. Diff:

```diff
-  telefono          TEXT,               -- Usato per WhatsApp
+  telefono          TEXT,               -- Telefono dello STUDIO: si chiama, va sui documenti. Può essere un fisso. NON è WhatsApp (P31, D181)
+  cellulare_whatsapp TEXT,              -- Cellulare per consegna e solleciti. Il prefisso lo mette il codice (P31, D182)
   email             TEXT,
```

## Passo 7 — Salva

**Fatto.** Commit `63d8346a`:
`feat(db): P31 — nasce clienti.cellulare_whatsapp, e telefono torna a dire la verità`
(3 file: migration, `schema.sql`, `database.types.ts`). Vedi sezione D151 sopra per l'output reale
e per gli hook pre-commit (tutti verdi).

---

## File toccati

**Committati** (`63d8346a`):
- `supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql` — nuovo
- `supabase/schema.sql` — riga 373 riscritta, nuova riga 374 (`cellulare_whatsapp`)
- `src/types/database.types.ts` — rigenerato, `cellulare_whatsapp: string | null` in
  Row/Insert/Update

**Non committati, fuori dalla consegna** (`scripts/tmp/` è in `.gitignore`, usa e getta):
- `scripts/tmp/p31-sonda-ledger.mjs`
- `scripts/tmp/p31-applica-migration.mjs`

**Non toccato da me, comparso modificato nel working tree** (vedi nota sopra):
- `docs/roadmap/ROADMAP-UFFICIALE.md` (+1 riga) — presumibilmente il controllore, in parallelo.

## Autorevisione

- **Completezza:** tutti e 7 i passi fatti e verificati con output reale. Il blocco iniziale
  (Passo 3) è stato risolto dalla decisione D151 del controllore; il sotto-passo `migration
  repair` resta bloccato dal sandbox di questa sessione (non un problema del piano né mio) — vedi
  «Il residuo che resta aperto» sotto.
- **Qualità:** i commenti `--` spiegano il perché (perché nasce la colonna, perché nessun backfill,
  perché nessun CHECK), non solo il cosa.
- **Disciplina:** nessun `CHECK`, nessun backfill, nessun indice — solo `ALTER TABLE ADD COLUMN` +
  due `COMMENT ON`, come da mandato.
- **Accenti:** commenti `--` con accenti veri; le due stringhe `COMMENT ON ... IS '...'` con
  l'apostrofo raddoppiato, come indicato dal controllore per quel caso specifico.

## Il residuo che RESTAVA aperto — RISOLTO dal controllore

~~`supabase migration repair --status applied 20260803113525` va ancora eseguito, da qualcuno con
permessi diversi da questa sessione (il classificatore di Claude Code lo blocca qui, due tentativi,
stesso esito — vedi sopra). Finché non gira: lo schema è corretto e vivo (verificato più volte),
ma il ledger remoto non registra la riga, e un futuro `supabase db push` fallirà di nuovo con
`LegacyDbPushMissingRemoteError` finché qualcuno non esegue quel `repair` (o passa `--include-all`,
sconsigliato per il rischio §B22 di toccare le ~25 migration fondative mai registrate).~~

🔄 **Risolto.** Il controllore ha eseguito il comando da un ambiente senza il blocco del
classificatore di questa sessione. `provato:`

```
$ npx supabase migration repair --status applied 20260803113525
Repaired migration history: [20260803113525] => applied
```

`npx supabase migration list --linked` mostra `20260803113525` registrata sia in locale sia in
remoto. Il ledger è allineato: un futuro `supabase db push` non incontra più
`LegacyDbPushMissingRemoteError` per questa versione. Non c'è più nessun blocco aperto su questo
punto.

## Dubbi e ritrovamenti fuori mandato

1. ~~**Il residuo sopra** (`migration repair` non eseguibile da questa sessione) è il punto che
   serve chiudere prima che qualcun altro lanci `db push` su questo progetto.~~ 🔄 **Risolto** — vedi
   «Il residuo che RESTAVA aperto» sopra: il controllore ha eseguito il `repair`, il ledger è
   allineato.
2. **Nota per chi scrive la prossima migration in questa finestra di deriva:** finché l'orologio
   non supera il **4 agosto 2026 ore 12:00**, ogni migration scritta con la data vera (D155) nasce
   con una versione inferiore a `20260804120000` (l'ultima registrata, nata dalla vecchia deriva di
   +2 giorni) — e `db push` la rifiuterà con lo stesso errore visto qui, finché non viene applicata
   con D151 (Management API + `migration repair`) invece che con `db push`. Non è un difetto nuovo:
   è una conseguenza dichiarata di D155, e vale per **ogni** compito di P31 che segue questo.
3. **Nota, non difetto:** il brief indica la riga del commento `-- Usato per WhatsApp` come riga
   372; nella copia viva di `supabase/schema.sql` era la riga 373 (`grep -n` conferma) — trovata per
   contenuto, non per numero, quindi senza conseguenze sul lavoro fatto.

---

## Correzione del rilievo Importante (revisione Compito 1) — referto separato, appeso qui

**Il difetto, e la prova.** In `supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql`, la
stringa `COMMENT ON COLUMN public.clienti.telefono IS '...'` conteneva `Puo''` e `e''` invece di
`Può` e `è`. In SQL due apici consecutivi dentro una stringa valgono **un apostrofo letterale**: il
raddoppio serve a *quello*, non all'accento. Quindi `Puo''` finisce nel database come `Puo'`
(con l'apice in coda), non come `Può`. L'accento non richiede alcun escaping — è un carattere
normale della stringa. Il file `20260803090000_denti_snapshot_sulla_dichiarazione.sql` (stessa
cartella, stesso giorno) mostra il contrasto: usa l'accento vero non raddoppiato (`È`, `perché`)
accanto a un apostrofo correttamente raddoppiato (`dell''emissione`) — la prova che la convenzione
del progetto era già coerente altrove, e qui era stata applicata male. Questa stessa lettura
sbagliata era scritta nel referto sopra (Passo 2, ora annotata inline): «le due stringhe...
mantengono l'apostrofo raddoppiato... perché sono dentro apici SQL e lì l'accento andrebbe
raddoppiato» — falso, ed è la causa del difetto.

**Origine del difetto:** era nel brief/piano, non introdotto dall'esecutore di Compito 1. La fonte
(piano e spec in `docs/superpowers/plans/` e `docs/superpowers/specs/`) è già stata corretta dal
controllore — non toccata in questo giro.

### ① File corretto

`supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql`, riga 22-23, ora:

```sql
COMMENT ON COLUMN public.clienti.telefono IS
  'Telefono dello studio: si chiama, va sui documenti. Può essere un fisso. NON è il numero WhatsApp — v. cellulare_whatsapp (P31, D181).';
```

Zero raddoppiamenti (la frase non contiene apostrofi). Controllato anche l'altro commento
(`cellulare_whatsapp`): contiene `l''utente`, un apostrofo **reale** correttamente raddoppiato —
lasciato invariato. Controllato anche `supabase/schema.sql` (righe 373-374, gli stessi due commenti
come `--` fuori da stringhe SQL): già scritti con accenti veri (`Può`, `NON è`), nessuna correzione
necessaria lì.

### ② Commento riapplicato al database

Eseguiti via Management API (`read_only:false`, D151) **solo** i due `COMMENT ON COLUMN` corretti
(script usa e getta `scripts/tmp/p31-riapplica-commento-telefono.mjs`, non l'intera migration —
l'`ALTER TABLE ADD COLUMN` non è stato rieseguito, la colonna esiste già):

```
$ npx tsx scripts/tmp/p31-riapplica-commento-telefono.mjs
HTTP 201
[]
```

### ③ Verifica dal database (sola lettura, non ci si fida dell'HTTP 201)

Query del brief, eseguita via Management API in sola lettura:

```
$ npx tsx scripts/tmp/p31-verifica-commento-letterale-brief.mjs
HTTP 201
[{"commento":"Cellulare su cui il dentista riceve i messaggi (consegna, solleciti). Il prefisso internazionale lo aggiunge il codice, non l'utente (P31, D182)."},{"commento":"Telefono dello studio: si chiama, va sui documenti. Può essere un fisso. NON è il numero WhatsApp — v. cellulare_whatsapp (P31, D181)."}]
```

Estesa con `column_name` e un conteggio di apostrofi letterali (`length(testo) -
length(replace(testo, '''', ''))`), per non fidarmi di una lettura visiva che l'encoding del
terminale potrebbe ingannare:

```
$ npx tsx scripts/tmp/p31-verifica-commento-telefono.mjs
HTTP 201
[{"column_name":"cellulare_whatsapp","commento":"Cellulare su cui il dentista riceve i messaggi (consegna, solleciti). Il prefisso internazionale lo aggiunge il codice, non l'utente (P31, D182).","apostrofi_letterali":1},{"column_name":"telefono","commento":"Telefono dello studio: si chiama, va sui documenti. Può essere un fisso. NON è il numero WhatsApp — v. cellulare_whatsapp (P31, D181).","apostrofi_letterali":0}]
```

**Esito:** `telefono` contiene `Può` e `è` veri, **zero** apostrofi letterali (coerente: la frase
non ne ha). `cellulare_whatsapp` contiene esattamente **un** apostrofo letterale (`l'utente`),
invariato rispetto a prima — non era il difetto di questo compito e non andava toccato.

### ④ Verifiche di contorno

```
$ npx tsc --noEmit
(nessun output, exit 0)
```

**0 errori** — atteso, non è stato toccato nulla di tipato (solo una stringa SQL in un commento).
Non eseguita la suite `vitest` intera: nessuna prova unitaria copre un commento SQL, come indicato
dal mandato.

### Fuori mandato — solo segnalato, non corretto (R-E2)

- `supabase/migrations/20260804120000_p7_dpa_cancello_traccia_emesso_da.sql:62` — stesso difetto
  (`e''` invece di `è` dentro `COMMENT ON COLUMN ... emesso_da IS '...'`). È di P7, già in
  produzione: **non toccato**, come da istruzione esplicita del mandato.
- Stesso file, righe 55-56 — `e'`/`cioe'` dentro commenti `--` (fuori da stringhe SQL): non hanno
  conseguenza sul database (i commenti `--` non arrivano al catalogo), ma sono la stessa abitudine
  di scrittura che ha causato il difetto vero. Segnalato, non corretto — fuori mandato.

### File toccati in questa correzione

- `supabase/migrations/20260803113525_p31_cellulare_whatsapp.sql` — stringa del commento corretta
- `.superpowers/sdd/p31-compito-1-report.md` — questo file (stato aggiornato + questa sezione)
- `scripts/tmp/p31-riapplica-commento-telefono.mjs`,
  `scripts/tmp/p31-verifica-commento-telefono.mjs`,
  `scripts/tmp/p31-verifica-commento-letterale-brief.mjs` — usa e getta, non committati
  (`scripts/tmp/` è in `.gitignore`)
