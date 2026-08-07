# Task 2 — Migration A: strutture (tabella lavori_prescrizioni + P37) — Report

**Esecutore:** primo esecutore (R-E1), sessione fresca. Branch `ondata-b-sessione-2` (già attiva, nessun worktree).

## 1. Cosa ho implementato

Tutti gli step del brief, in ordine, senza deviazioni sulla DDL:

- **Step 2.1** — Scritto `supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql` con il timestamp letto dall'orologio (`date +%Y%m%d%H%M%S` → `20260804150306`, D155). Ho verificato programmaticamente (diff su stringa, dopo sostituzione di `<TS>`) che il contenuto del file è **byte-identico** alla DDL del brief: nessuna modifica, nessuna "correzione silenziosa".
- **Step 2.2** — Applicato con `npx supabase db push --yes`. **NON bloccato** (vedi §5 sotto — il brief anticipava un possibile blocco da classificatore, qui non si è verificato).
- **Step 2.3** — Collaudo con le tre query del brief, tutte sul DB vivo, sola lettura. Output reale incollato in §4.
- **Step 2.4** — Commit del solo file migration, messaggio esatto del brief.
- **FASE 6b** (obbligo di `ua-app/CLAUDE.md` §0C, non è nel brief ma è un gate permanente del workflow): rigenerato `src/types/database.types.ts` e verificato `tsc --noEmit` a zero errori. Commit separato per questo file (vedi §6 «deviazione»).

## 2. Verifica di presenza dei tre registri (R-E1, sopra)

Letto **solo** `docs/superpowers/plans/2026-08-04-ondata-b-sessione-2-migration-rpc.md` sezioni §A/§B/§C, come richiesto (presenza, non verità):

- **§A Registro delle prove (R-P1)** — presente, righe 24-87. Contiene: cancello §0① (conteggio DdC), catalogo vivo A.1, e le **11 sonde** (S1-S11) in transazione annullata con verifica post-rollback, ognuna con l'errore reale incollato per i vincoli istituiti (es. S4 `23514 violates check`, S6 `23503 violates foreign key`, S7 `23505 duplicate key`).
- **§B Registro delle letture (R-P2)** — presente, righe 90-131. Tabella con percorso → esito (letto/non letto) per 17 file, con citazioni di riga puntuali, più sezione "sorprese R-E2 dei lettori" (14 difetti fuori mandato censiti).
- **§C Censimento (R-P6)** — presente, righe 135-170. Tabella identificatore → hit → destinazione, per 13 identificatori, più elenco dei nomi nuovi istituiti dal dizionario.

**Esito: PRESENTI tutti e tre.** Nessun blocco necessario su questo fronte.

## 3. Output REALE del push

```
$ npx supabase db push --yes
Initialising login role...
Connecting to remote database...
Skipping migration MANUAL_000_auth_helpers.sql... (file name must match pattern "<timestamp>_name.sql")
Do you want to push these migrations to the remote database?
 • 20260804150306_ondata_b_lavori_prescrizioni.sql
 [Y/n] y
Applying migration 20260804150306_ondata_b_lavori_prescrizioni.sql...
{"upToDate":false,"dryRun":false,"migrations":["20260804150306_ondata_b_lavori_prescrizioni.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
```

Nessun errore, nessuna richiesta di credenziali oltre al prompt Y/n standard del CLI. **Non è stato bloccato da nessun classificatore.**

## 4. Output REALE del collaudo (Step 2.3 + estensioni)

### Query 1 — vincoli su `lavori_prescrizioni`
```
$ node scripts/tmp/sql.mjs "SELECT conname FROM pg_constraint WHERE conrelid='public.lavori_prescrizioni'::regclass ORDER BY conname"
[
  {"conname": "lavori_prescrizioni_conferma_ck"},
  {"conname": "lavori_prescrizioni_confermata_da_fkey"},
  {"conname": "lavori_prescrizioni_fonte_ck"},
  {"conname": "lavori_prescrizioni_fonte_img_fk"},
  {"conname": "lavori_prescrizioni_fonte_tipo_check"},
  {"conname": "lavori_prescrizioni_laboratorio_id_fkey"},
  {"conname": "lavori_prescrizioni_lavoro_fk"},
  {"conname": "lavori_prescrizioni_lavoro_uk"},
  {"conname": "lavori_prescrizioni_pkey"}
]
```
**9 vincoli**, non 8 come una lettura letterale di "5 vincoli + PK + FK lab/utenti" (=8) suggerirebbe. La riga in più è `lavori_prescrizioni_fonte_tipo_check`: il CHECK inline su `fonte_tipo` (`CHECK (fonte_tipo IN (...))` scritto dentro la definizione di colonna) prende un nome automatico da Postgres, distinto dai 5 vincoli **con nome esplicito** (`lavoro_uk`, `lavoro_fk`, `fonte_img_fk`, `fonte_ck`, `conferma_ck`). Il conteggio del brief è quindi corretto nella sostanza (sonda S4 del piano lo tratta già come vincolo a sé, col suo errore `23514 violates check "lavori_prescrizioni_fonte_tipo_check"`) ma la formula "5+PK+FK" nel testo dello step lo sottoconta di uno. **Non è un difetto della migration, è un'imprecisione descrittiva nel brief** — la realtà applicata è quella attesa dal disegno (spec + sonda S4).

### Query 2 — policy RLS
```
$ node scripts/tmp/sql.mjs "SELECT policyname, cmd FROM pg_policies WHERE tablename='lavori_prescrizioni'"
[
  {"policyname": "lavori_prescrizioni_tenant_select", "cmd": "SELECT"}
]
```
Esattamente come atteso: SOLO questa policy.

### Query 3 — colonna P37 su `lavori`
```
$ node scripts/tmp/sql.mjs "SELECT column_name FROM information_schema.columns WHERE table_name='lavori' AND column_name='istituzione_sanitaria'"
[
  {"column_name": "istituzione_sanitaria"}
]
```
1 riga, come atteso.

### Estensioni di self-review (non richieste dal brief, sola lettura)

```
$ node scripts/tmp/sql.mjs "SELECT conname FROM pg_constraint WHERE conrelid='public.lavori_immagini'::regclass AND conname='lavori_immagini_id_lab_uk'"
[{"conname": "lavori_immagini_id_lab_uk"}]

$ node scripts/tmp/sql.mjs "SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name='lavori_prescrizioni' ORDER BY grantee, privilege_type"
[
  {"grantee": "authenticated", "privilege_type": "SELECT"},
  {"grantee": "postgres", "privilege_type": "DELETE"},
  {"grantee": "postgres", "privilege_type": "INSERT"},
  {"grantee": "postgres", "privilege_type": "REFERENCES"},
  {"grantee": "postgres", "privilege_type": "SELECT"},
  {"grantee": "postgres", "privilege_type": "TRIGGER"},
  {"grantee": "postgres", "privilege_type": "TRUNCATE"},
  {"grantee": "postgres", "privilege_type": "UPDATE"},
  {"grantee": "service_role", "privilege_type": "SELECT"}
]
```
Nessuna riga per `anon`, nessuna riga INSERT/UPDATE/DELETE per `authenticated`/`service_role`: il pattern E8 (REVOKE ALL anche a `service_role`, GRANT SELECT a `authenticated`+`service_role`) è replicato esattamente come nel modello `lavori_denti`.

**Controllo aggiuntivo suggerito dall'advisor — il trigger `updated_at`**, non coperto dalle 3 query del brief (una `SELECT apply_updated_at_trigger(...)` riuscita prova solo che la funzione esiste, non che abbia creato il trigger — e il file modello `lavori_denti_tabella.sql` non chiama questo helper, quindi qui non c'era un precedente diretto nello stesso file):
```
$ node scripts/tmp/sql.mjs "SELECT tgname FROM pg_trigger WHERE tgrelid='public.lavori_prescrizioni'::regclass AND NOT tgisinternal"
[{"tgname": "trg_lavori_prescrizioni_updated_at"}]

$ node scripts/tmp/sql.mjs "SELECT relrowsecurity FROM pg_class WHERE oid='public.lavori_prescrizioni'::regclass"
[{"relrowsecurity": true}]
```
Trigger presente e RLS abilitata. Confrontato con l'uso dell'helper altrove nel repo (`grep -rn apply_updated_at_trigger supabase/migrations/`, 10 hit: `005_v1_foundation.sql`, `002_fase2_schema.sql` ×3, `20260514_mdr_qualita.sql` ×2, `20260803150000_dpa_registro_emissioni.sql`) — pattern consolidato, nessuna anomalia.

## 5. Push non bloccato — nota per il controllore

Il brief prevedeva la possibilità di un blocco da classificatore di permessi ("successo già visto in P31"). In questa esecuzione **il push è passato al primo tentativo**, senza richiesta di credenziali oltre al prompt Y/n standard di `supabase db push`. Lo segnalo esplicitamente perché il testo del compito lasciava aperta l'ipotesi di BLOCKED — qui non si è verificata.

## 6. File cambiati

- `supabase/migrations/20260804150306_ondata_b_lavori_prescrizioni.sql` (nuovo, 92 righe) — commit `85e41487`
- `src/types/database.types.ts` (rigenerato, +80 righe, diff puramente additivo verificato con `git diff --stat`) — commit `04578edd`, **separato**

**Deviazione dichiarata rispetto al brief:** lo Step 2.4 del brief indica `git add supabase/migrations/` (un solo file, un solo commit). Ho aggiunto un **secondo commit** per `database.types.ts`, richiesto da FASE 6b (`ua-app/CLAUDE.md` §0C — gate permanente, non opzionale, per ogni migration in sessione). Ho verificato che questo è il pattern consolidato nel repo (`git log --oneline -- src/types/database.types.ts` mostra commit `chore(db): FASE 6b — ...` distinti dal commit `feat(db)` della migration in più occasioni: es. `7027b093`, `30f6f3e7`, `9bd090a4`). Non ho alterato il commit richiesto dal brief; ho aggiunto quello dopo, con messaggio coerente allo stile del repo.

## 7. Self-review findings

- DDL verbatim: confermato programmaticamente (nessuna riga aggiunta/tolta/modificata rispetto al brief, a parte la sostituzione di `<TS>`).
- Tutti i vincoli, la policy, la colonna P37, il trigger `updated_at`, la RLS e i grant sono live sul DB e corrispondono al modello `lavori_denti` (E8 compreso: `service_role` è nel REVOKE, non ha scritture dirette).
- `tsc --noEmit`: 0 errori dopo la rigenerazione dei tipi.
- Non ho eseguito `vitest run` né `next build`: FASE 7 è un gate di fine-ondata (pre-merge), non per-singolo-task; questo task non tocca codice applicativo TypeScript oltre al file di tipi generato, quindi non c'era superficie nuova da testare con vitest.
- Non ho toccato `memory/MEMORY.md` né `docs/roadmap/ROADMAP-UFFICIALE.md` (BP-1): questo è il task 2 di 3 dell'ondata (R-E1, un compito alla volta); lascio l'aggiornamento della memoria al controllore/orchestratore a chiusura dell'intera ondata, per evitare collisioni con gli altri due task ancora da eseguire. Se l'hook `Stop` lo segnala, è una scelta deliberata, non una dimenticanza.

## 8. Difetti fuori mandato trovati (R-E2)

**Nessuno nuovo.** Durante l'esecuzione di questo task non ho trovato difetti fuori mandato oltre ai **14 già censiti** nel piano §B ("Sorprese R-E2 dei lettori", righe 117-131), che restano di competenza dell'handoff di chiusura ondata, non di questo task. L'unica osservazione originale di questo report — l'imprecisione del conteggio "5 vincoli+PK+FK" nel testo del brief (§4, Query 1) — riguarda il **brief stesso**, non del codice applicativo o dello schema: la segnalo qui per trasparenza ma non è un difetto del piano nel senso di R-E2 (nessun codice sbagliato, nessuna riga sbagliata da correggere), è solo un conteggio descrittivo leggermente approssimato che non ha causato nessuna azione errata.
