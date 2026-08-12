# Task 1 — Report: Vincolo one-way sulla chiusura (riga 58)

**Stato:** DONE
**Commit:** `bc938e39` — feat(db): trigger one-way sulla chiusura degli avvisi — la prova non si riscrive (riga 58)
**Branch:** `code-58-59-prova-inalterabile` (verificato con `git branch --show-current` prima di iniziare)

## Cosa è stato implementato

Un trigger `BEFORE UPDATE ... FOR EACH ROW` su `public.avvisi_dentista`, con `WHEN (OLD.stato <> 'da_comunicare')`,
che chiama `public.avviso_chiusura_one_way()`. La funzione rifiuta (RAISE EXCEPTION, SQLSTATE P0001) qualunque
UPDATE che cambi una delle quattro colonne di chiusura (`stato`, `comunicato_at`, `comunicato_da`,
`testo_inviato`) su una riga già comunicata — per qualunque ruolo, `service_role` compreso (il suo BYPASSRLS
non passa da un GRANT per colonna: il trigger scatta comunque). `visto_dal_dentista_at` e `campi_corretti`
restano fuori dal controllo e continuano a essere scrivibili dopo la chiusura, di proposito.

File:
- `supabase/migrations/20260811132010_avvisi_chiusura_one_way.sql` (nuovo)
- `tests/integration/avvisi-chiusura-one-way.rpc.test.ts` (nuovo, 11 test)

## Step 1 — Timestamp

```
date -u "+%Y%m%d%H%M%S"
```
→ `20260811132010` (TS1). Supera il pavimento `20260810072748`.

## Verifica preliminare su `avvisi_segna_visti` (nota nel brief, ⑨)

```
node scripts/psql.mjs -c "SELECT prosrc FROM pg_proc WHERE proname='avvisi_segna_visti'"
```
Corpo vivo:
```
UPDATE public.avvisi_dentista
   SET visto_dal_dentista_at = now()
 WHERE id = ANY(p_ids)
   AND laboratorio_id = p_laboratorio_id
   AND visto_dal_dentista_at IS NULL;
GET DIAGNOSTICS v_rows = ROW_COUNT;
RETURN json_build_object('esito', 'ok', 'aggiornati', v_rows);
```
La chiave di ritorno è **`aggiornati`**, esattamente come scritto nel test del brief (`ris.r.aggiornati`).
**Nessun adattamento necessario** — il test ⑨ è stato trascritto senza modifiche.

## TDD — RED

```
cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-chiusura-one-way.rpc.test.ts
```

Risultato: **7 failed | 4 passed (11)** — esattamente l'atteso del brief («7 su 11»: 6 comportamento + 1
catalogo).

- ① riapertura → `ATTESO RIFIUTO, INVECE ACCETTATO: riapertura di un avviso comunicato`
- ② riattribuzione firma → `ATTESO RIFIUTO, INVECE ACCETTATO: cambio di comunicato_da su riga chiusa`
- ③ retrodatazione → `ATTESO RIFIUTO, INVECE ACCETTATO: retrodatazione della comunicazione`
- ④ riscrittura testo → `ATTESO RIFIUTO, INVECE ACCETTATO: riscrittura di testo_inviato`
- ⑤ scambio stati chiusi → `ATTESO RIFIUTO, INVECE ACCETTATO: comunicato_a_voce → comunicato_dall_app`
- ⑥ service_role → `ATTESO RIFIUTO, INVECE ACCETTATO: riapertura come service_role`
- ⑪ catalogo → `AssertionError: expected [] to have a length of 1 but got +0`

Passati subito (controprove, senza trigger): ⑦ chiusura a voce, ⑧ chiusura dall'app, ⑨ ricevuta di lettura,
⑩ correzione `campi_corretti`. Coerente col fatto che il banco, prima di questa migration, non aveva alcun
trigger su `avvisi_dentista` (il piano l'aveva già provato con una transazione annullata l'11/08).

Perché è il rosso giusto: i sei test di comportamento falliscono perché l'UPDATE **riesce** quando doveva
essere rifiutato (non un errore di connessione o di sintassi), e il test di catalogo fallisce perché la
query su `pg_trigger` restituisce zero righe — il trigger non esiste ancora. È il rosso "il banco accetta
tutto", non un rosso di ambiente.

## Step 4-5 — Migration + applicazione

`supabase/migrations/20260811132010_avvisi_chiusura_one_way.sql` trascritta verbatim dal brief.

```
cd "…/ua-app" && npx supabase db push --linked --yes
```
→ `Applying migration 20260811132010_avvisi_chiusura_one_way.sql...` →
`{"upToDate":false,"dryRun":false,"migrations":["20260811132010_avvisi_chiusura_one_way.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}`
Nessun errore.

## TDD — GREEN

```
cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-chiusura-one-way.rpc.test.ts
```
→ **Test Files 1 passed (1) — Tests 11 passed (11)**. Nessuno skippato (contato: 11 esecuzioni reali,
nessuna riga "skipped" nell'output — l'env era caricato).

Catalogo:
```
node scripts/psql.mjs -c "SELECT tgname FROM pg_trigger WHERE tgrelid='public.avvisi_dentista'::regclass AND NOT tgisinternal"
```
→ `trg_avviso_chiusura_one_way` (1 riga). Conferma indipendente dal file: il trigger è davvero nel banco.

## FASE 6b — Migration gate

```
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```
→ `git diff --stat src/types/database.types.ts` = **nessun output, nessun diff** (checksum md5 identico
prima/dopo: `8536abccf144ada5a35d147f4322ee46`). Confermato l'atteso: un trigger non appare nei types
generati.

```
npx tsc --noEmit
```
→ exit 0, nessun errore.

## Suite avvisi esistente (non deve rompersi)

```
cd "…/ua-app" && set -a && . ./.env.local; set +a && npx vitest run tests/integration/avvisi-dentista-schema.rpc.test.ts tests/integration/avvisi-segna-visti.rpc.test.ts
```
→ **Test Files 2 passed (2) — Tests 36 passed (36)**. Il trigger non rompe le prove esistenti.

## Commit

```
git status --short              # solo i 2 file nuovi + una modifica pre-esistente non mia (.gitignore)
git add supabase/migrations/20260811132010_avvisi_chiusura_one_way.sql tests/integration/avvisi-chiusura-one-way.rpc.test.ts
git commit -F <messaggio>
```
Commit `bc938e39`. Pre-commit hook: DS compliance OK, Guardia CSRF verde, Guardia coerenza documenti verde
(3 documenti vivi controllati), Guardia salvataggio automatico OK, eslint pulito su `.ts`. Nessun guard
bypassato.

## Self-review

- Test file e migration trascritti verbatim dal brief — confrontati riga per riga col brief prima del commit.
- `git status --short` prima dello staging mostrava una sola riga estranea (`M .superpowers/sdd/.gitignore`,
  pre-esistente, non toccata da questo task) — **non** aggiunta al commit (`git add` con path espliciti,
  mai `-A`).
- Nessun placeholder, nessun TODO lasciato nel codice.
- Output dei test riportato per intero (RED e GREEN), non solo il conteggio finale.
- Verifica indipendente del trigger sul catalogo (non solo "il file esiste"), come richiesto dal brief.

## Cosa NON ho trovato di sbagliato nel brief

Il brief è risultato accurato in ogni punto verificabile:
- Il conteggio RED previsto (7 rossi su 11, coi messaggi esatti) ha corrisposto esattamente.
- La chiave di ritorno di `avvisi_segna_visti` (`aggiornati`) era già quella giusta — nessun adattamento
  necessario, ma la verifica preliminare richiesta dal brief è stata comunque eseguita e documentata sopra.
- Nessun diff sui types generati, come previsto.
- Nessuna rottura nelle suite esistenti.

## Concerns

Nessuno. Task completato senza scostamenti dal brief.
