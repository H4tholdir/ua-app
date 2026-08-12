# Task 2 — Report: La firma non può puntare a un altro laboratorio (riga 59)

**Stato:** DONE (scostamenti dal brief indagati e chiusi con prova — v. §Concerns; nessuno blocca)
**Commit:** `8f4976a7` — feat(db): la firma dell'avviso è dello stesso laboratorio — FK composita (riga 59)
**Branch:** `code-58-59-prova-inalterabile` (verificato con `git branch --show-current` prima di iniziare)

## Cosa è stato implementato

`comunicato_da` su `public.avvisi_dentista` era una FK semplice verso `utenti(id)`: la chiusura
di un avviso poteva essere attribuita a un utente di un ALTRO laboratorio (o a un `admin_sistema`
con `laboratorio_id` NULL), perché la RLS vincola solo `laboratorio_id`, non la coppia
(autore, laboratorio dell'avviso). Rimedio, stesso modello già applicato tre volte in
`20260806142910`:
1. `utenti_id_lab_uk UNIQUE (id, laboratorio_id)` su `utenti` — il bersaglio.
2. `avvisi_dentista_comunicato_da_fk (comunicato_da, laboratorio_id) → utenti (id, laboratorio_id)`
   al posto della `_fkey` semplice, MATCH SIMPLE (righe aperte con `comunicato_da` NULL non
   vincolate) e NO ACTION.

File:
- `supabase/migrations/20260811133440_avvisi_firma_stesso_laboratorio.sql` (nuovo)
- `tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts` (nuovo, 7 test)
- `tests/integration/avvisi-dentista-schema.rpc.test.ts:349` (1 riga: nome della FK atteso
  nel messaggio d'errore, `_fkey` → `_fk`)
- `src/types/database.types.ts` (rigenerato)

## Step 1 — Timestamp

```
date -u "+%Y%m%d%H%M%S"
```
→ `20260811133440` (TS2). Supera il pavimento `20260811132010` (TS1, Task 1).

## Step 2-3 — Test nuovo + riga 349

Helper locali (`riferimentiVeri`, `attesoRifiuto`, `inserisci`) copiati VERBATIM da
`tests/integration/avvisi-chiusura-one-way.rpc.test.ts` (confrontati carattere per carattere
prima del commit), come richiesto dal brief e dalla convenzione viva di `tests/integration/`.

`git diff` sulla riga 349 — l'UNICA riga toccata nel file esistente:
```diff
-        expect(e.message).toMatch(/avvisi_dentista_comunicato_da_fkey/)
+        expect(e.message).toMatch(/"avvisi_dentista_comunicato_da_fk"/)
```

## TDD — RED (R-P4)

Comando dal brief:
```
cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run \
  tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts \
  tests/integration/avvisi-dentista-schema.rpc.test.ts
```

**Nella corsa COMBINATA (i due file insieme) sono usciti 8 rossi, non 6.** I 6 attesi c'erano
tutti — ①②③④⑤ nel file nuovo + riga 349 nell'esistente — ma sono comparsi ANCHE 2 timeout
da 15000ms su due test dell'esistente NON toccati da questo task (`(p7) l'UPDATE è concesso
SOLO...` e `cancellare un laboratorio che ha un avviso arriva in fondo...`).

Ho isolato la causa eseguendo i due file SEPARATAMENTE:
- `tests/integration/avvisi-dentista-schema.rpc.test.ts` da solo → **esattamente 1 rosso**
  (riga 349), 26 verdi. Nessun timeout.
- `tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts` da solo → **esattamente
  5 rossi su 7** (①②③④⑤), ⑥⑦ verdi. Nessun timeout.

Conclusione: i 2 timeout sono un artefatto di CONCORRENZA fra i due file quando girano insieme
contro il banco Supabase remoto condiviso (più connessioni/transazioni aperte in parallelo →
più contesa di lock/round-trip di rete) — non un difetto del mio lavoro né una rottura reale.
`vitest.config.ts` stesso documenta questa classe di flakiness (commento sopra `testTimeout: 15000`
nel progetto `integration`, che cita tre episodi precedenti della stessa natura, l'ultimo proprio
l'11/08). **Conteggio da scrivere, come richiesto: 5 su 7 nel file nuovo + 1 nell'esistente**
(isolati; la corsa combinata resta soggetta a flake di rete non imputabile allo schema).

Eccerpt dei rossi (isolati):

File nuovo — ①②③ (catalogo):
```
① AssertionError: expected [] to have a length of 1 but got +0   (utenti_id_lab_uk non esiste ancora)
② AssertionError: expected [] to have a length of 1 but got +0   (avvisi_dentista_comunicato_da_fk non esiste ancora)
③ AssertionError: expected [ { '?column?': 1 } ] to have a length of +0 but got 1   (la _fkey vecchia c'è ancora)
```
File nuovo — ④⑤ (comportamento):
```
④ Error: ATTESO RIFIUTO, INVECE ACCETTATO: avviso del lab A firmato dal lab B
⑤ Error: ATTESO RIFIUTO, INVECE ACCETTATO: avviso firmato da un admin senza lab
```
File esistente — riga 349:
```
AssertionError: expected 'update or delete on table "utenti" vi…' to match /"avvisi_dentista_comunicato_da_fk"/
+ Received: "...violates foreign key constraint \"avvisi_dentista_comunicato_da_fkey\"..."
```

## Probe pre-migration (R-P1)

Prima di applicare la `ADD CONSTRAINT`, verificato che non esistano righe cross-tenant nei dati
vivi (altrimenti la ADD CONSTRAINT sarebbe abortita):
```sql
SELECT count(*) FROM public.avvisi_dentista a JOIN public.utenti u ON u.id = a.comunicato_da
 WHERE a.comunicato_da IS NOT NULL AND u.laboratorio_id IS DISTINCT FROM a.laboratorio_id
```
→ `0` (su 3 avvisi chiusi totali nel banco). Confermata anche la claim della migration
("`admin_delete_laboratorio` porta via gli avvisi in cascata prima di toccare utenti"): letto
`20260809123206_avvisi_dentista.sql:24-25` — `dichiarazione_id` e `lavoro_id` sono
`ON DELETE CASCADE`, e `admin_delete_laboratorio` (`20260806170700_d274...sql`) cancella
`dichiarazioni_conformita` (riga 67) e `lavori` ben prima di `utenti` (riga 132) — confermato.

## Step 5-6 — Migration + GREEN

```
cd "…/ua-app" && npx supabase db push --linked --yes
```
→ `Applying migration 20260811133440_avvisi_firma_stesso_laboratorio.sql...` →
`{"upToDate":false,"dryRun":false,"migrations":["20260811133440_..."],...,"message":"Finished supabase db push."}`

```
cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run \
  tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts \
  tests/integration/avvisi-dentista-schema.rpc.test.ts
```
→ **Test Files 2 passed (2) — Tests 34 passed (34)**. Nessuno skippato (env caricato, 34
esecuzioni reali). Riverificato anche il solo file nuovo isolato: **7 passed (7)**.

## FASE 6b — Migration gate

```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```
Nessuna riga di rumore CLI in coda (verificato: le ultime righe sono `export const Constants = {...}`).

`git diff src/types/database.types.ts` — SOLO la Relationship di `comunicato_da`, come previsto:
```diff
           {
-            foreignKeyName: "avvisi_dentista_comunicato_da_fkey"
-            columns: ["comunicato_da"]
+            foreignKeyName: "avvisi_dentista_comunicato_da_fk"
+            columns: ["comunicato_da", "laboratorio_id"]
             isOneToOne: false
             referencedRelation: "utenti"
-            referencedColumns: ["id"]
+            referencedColumns: ["id", "laboratorio_id"]
           },
```

```
npx tsc --noEmit
```
→ nessun output, exit pulito.

## Censimento finale

```
grep -rn "comunicato_da_fkey" src tests supabase --include="*.ts" --include="*.sql"
```
Il brief prevedeva **0 hit**. Sono usciti **2 hit** — entrambi nei DUE FILE che questo stesso
task ha creato:
1. `tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts:123` — test ③, l'asserzione
   che PROVA l'assenza del vecchio nome (deve nominarlo per cercarlo).
2. `supabase/migrations/20260811133440_avvisi_firma_stesso_laboratorio.sql:39` — la
   `DROP CONSTRAINT avvisi_dentista_comunicato_da_fkey`, che deve nominare ciò che rimuove.

Riverificato filtrando via questi due file:
```
grep -rn "comunicato_da_fkey" src tests supabase --include="*.ts" --include="*.sql" \
  | grep -v "avvisi-firma-stesso-laboratorio.rpc.test.ts\|20260811133440_..."
```
→ nessun hit (exit 1). L'invariante VERO che il censimento vuole proteggere — nessun
riferimento ORFANO/vivo al nome ritirato altrove nel codice — è verificato. Il testo del brief
("0 hit") era impreciso perché non teneva conto che il suo stesso Step 5 (DROP CONSTRAINT) e il
suo stesso Step 2 (test ③) devono per forza nominare la stringa che dichiarano ritirata.

## Verifica post-implementazione (sollecitata dall'advisor, non nel brief)

La FK composita rende `laboratorio_id` parte della chiave REFERENZIATA — a differenza della
`_fkey` semplice (che puntava solo a `id`, immutabile), un `UPDATE` che cambi `laboratorio_id`
di un `utenti` firmatario ora può sollevare 23503 (NO ACTION vale anche on-update, non solo
on-delete). Due controlli non coperti dai test né dal censimento originale:

1. **Esiste un altro scrittore di `utenti.laboratorio_id` oltre `admin_delete_laboratorio`?**
   `grep -rn "from('utenti')" src --include="*.ts" -A2` → tutte le occorrenze in `src/` sono
   `.select(...)`, ZERO `.update(`/`.upsert(` su `utenti` lato client.
   `grep -rn "UPDATE.*utenti\b" supabase/migrations/*.sql` → ogni hit è una revisione storica
   della STESSA istruzione (`SET laboratorio_id = NULL WHERE laboratorio_id = p_lab_id AND
   ruolo = 'admin_sistema'`, dentro `admin_delete_laboratorio`, l'ultima in
   `20260806170700_d274_difetti_vivi_intervento.sql:138-139`). Nessun altro punto del codice
   scrive `laboratorio_id` su `utenti`. Quell'unico UPDATE gira DOPO che gli avvisi del
   laboratorio sono già spariti (cascata da `dichiarazioni_conformita`/`lavori`, verificato
   sopra) — e comunque tocca solo `admin_sistema`, un ruolo che RUOLI_CHIUSURA_AVVISO esclude
   per nome dalla firma: non avrebbe mai potuto essere in `comunicato_da`. **Nessun percorso
   vivo rompe sotto la nuova FK.**

2. **Un embed PostgREST (`utenti!comunicato_da(...)` o simile) dipende dalla vecchia forma a
   una colonna?** `grep -rn "comunicato_da" src --include="*.ts"` → l'unico punto che risolve
   l'autore in un nome (`src/lib/avvisi/archivio.ts:107-121`, `nomiComunicatori`) NON usa un
   embed: fa una query `.from('utenti').select('id, nome, cognome').in('id', …).eq('laboratorio_id',
   laboratorioId)` separata, per scelta di difesa in profondità già documentata nel commento
   della funzione (righe 81-86). **Zero consumatori di un embed via questa FK, oggi.**

Anche i due timeout di concorrenza nella corsa RED combinata sono stati confermati non
sistemici: la corsa GREEN combinata (stesso comando, stessi due file) è risultata
**34 passed (34)** — cioè comprende ANCHE gli stessi due test che avevano fatto timeout in
RED, ora verdi, nella stessa configurazione di concorrenza. Non solo inferenza da un commento
di configurazione: è una misura diretta sullo stesso paio di file.

## Files modificati (commit)

```
supabase/migrations/20260811133440_avvisi_firma_stesso_laboratorio.sql   (nuovo)
tests/integration/avvisi-firma-stesso-laboratorio.rpc.test.ts            (nuovo)
tests/integration/avvisi-dentista-schema.rpc.test.ts                     (1 riga, 349)
src/types/database.types.ts                                              (rigenerato)
```

`git status --short` prima dello staging mostrava anche 3 righe estranee, PRE-esistenti e non
mie (`M .superpowers/sdd/.gitignore`, `.superpowers/sdd/progress.md`,
`.superpowers/sdd/task-1-report.md` — bookkeeping del Task 1, fuori dal mio mandato) —
**non** aggiunte al commit (`git add` con path espliciti, mai `-A`), coerenti con R-E2.

Guard pre-commit: DS compliance OK, Guardia CSRF verde, Guardia coerenza documenti verde
(3 documenti vivi), Guardia salvataggio automatico OK, eslint pulito, lint-staged pulito.
Nessun guard bypassato.

## Self-review

- Helper copiati verbatim, confrontati riga per riga col file del Task 1 prima del commit.
- Migration trascritta verbatim dal brief; probato prima di applicare (0 righe cross-tenant nei
  dati vivi, claim sulla cascata di `admin_delete_laboratorio` verificata leggendo il codice).
- RED e GREEN misurati sia in corsa combinata sia isolati per file, per separare il segnale
  vero (conteggio atteso) dal rumore di concorrenza di rete.
- Diff dei types letto per intero e riportato: tocca SOLO la Relationship di `comunicato_da`.
- Census riverificato con esclusione dei due file propri del task: zero hit altrove.
- Nessun placeholder, nessun TODO lasciato nel codice.

## Concerns

1. **Timeout di concorrenza nella corsa combinata (chiuso con prova diretta, non bloccante):**
   eseguendo insieme i due file di test contro il banco remoto condiviso sono comparsi 2 timeout
   in più rispetto ai 6 rossi previsti dal brief, su test NON toccati da questo task. Isolando i
   file il conteggio torna esattamente quello atteso (5/7 + 1). E la corsa GREEN, STESSA coppia
   di file, STESSA concorrenza, è risultata 34/34 verdi — inclusi proprio i due test che avevano
   fatto timeout in RED: non è un'inferenza da un commento di configurazione, è una misura
   diretta che il timeout non è sistemico. Attribuibile a contesa di rete/lock sul banco remoto
   condiviso, categoria già documentata in `vitest.config.ts` (tre episodi precedenti citati nel
   commento sopra `testTimeout: 15000`). Nessuna azione correttiva presa: fuori mandato (R-E2).
2. **Census "0 hit" del brief era impreciso** (dettaglio sopra): il vero invariante (nessun
   riferimento orfano al nome ritirato FUORI dai due file che lo ritirano) è verificato pulito.
   Nessuna azione richiesta, solo segnalazione per accuratezza del piano futuro.
3. **Due controlli non richiesti dal brief, fatti dopo un confronto con un secondo revisore**
   (dettaglio sopra, §Verifica post-implementazione): la FK composita rende `laboratorio_id`
   parte della chiave referenziata, quindi un futuro `UPDATE utenti SET laboratorio_id = ...`
   su un utente firmatario potrebbe fallire con 23503 dove prima non falliva. Verificato:
   l'UNICO scrittore vivo di `utenti.laboratorio_id` è dentro `admin_delete_laboratorio`
   (`SET ... = NULL` solo per `admin_sistema`, dopo che gli avvisi del lab sono già cascata-
   cancellati, e comunque un ruolo escluso per nome dalla firma) — nessun percorso rotto.
   Verificato anche che nessun embed PostgREST (`utenti!comunicato_da(...)`) dipenda dalla FK:
   l'unico punto che risolve l'autore in un nome fa una query separata filtrata per
   `laboratorio_id`, per scelta già documentata nel codice. Nessuna azione richiesta.

Nessun altro scostamento. Il resto del brief è risultato accurato in ogni punto verificabile
(timestamp, precedente `20260806142910`, `RUOLI_CHIUSURA_AVVISO`/`ruoli.ts:72`,
`utenti_lab_required_for_non_admin`, cascata di `admin_delete_laboratorio`).
