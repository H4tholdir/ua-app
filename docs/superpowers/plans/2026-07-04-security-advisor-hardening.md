# Hardening sicurezza Supabase Security Advisor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chiudere i 10 ERROR critici e i WARN di sicurezza selezionati segnalati dal Supabase Security Advisor sul progetto `iagibumwjstnveqpjbwq`, senza modificare codice applicativo TypeScript e senza rompere alcun flusso esistente (WebAuthn, PEC, audit trail).

**Architettura:** 4 migration Supabase discrete e indipendenti (RLS deny-all su 3 tabelle → security_invoker su 7 view → REVOKE/GRANT/DROP su funzioni SECURITY DEFINER → search_path fix su funzioni rimanenti), ciascuna applicata al DB live solo dopo conferma esplicita di Francesco, seguita da rigenerazione dei tipi TypeScript, verifica automatica, QA manuale mirata e aggiornamento memoria.

**Tech Stack:** PostgreSQL/Supabase (migration SQL), Supabase CLI (`supabase gen types`), TypeScript (`tsc --noEmit`), Vitest, Next.js build.

## Global Constraints

- Progetto Supabase: `iagibumwjstnveqpjbwq`. Repo: `/Users/hatholdir/Downloads/SOFTWARE FILIPPO`, codice in `ua-app/`.
- **Ogni migration va applicata al DB live SOLO dopo conferma esplicita di Francesco** — tocca lo schema di produzione (pattern B3/B8/B18, `ua-app/CLAUDE.md` FASE 6b).
- Nessun file TypeScript viene creato o modificato in questo piano, salvo `src/types/database.types.ts` (rigenerato automaticamente, mai a mano).
- Ogni file di migration va anche scritto in `ua-app/supabase/migrations/` con naming `YYYYMMDDHHMMSS_descrizione.sql` (convenzione esistente) — la migration esiste sia come file versionato sia applicata al DB live, mai solo l'uno o l'altro.
- Riferimento normativo/architetturale completo: `ua-app/docs/superpowers/specs/2026-07-04-security-advisor-hardening-design.md`.
- Non toccare mai le funzioni `current_lab_id()`, `get_lab_id()`, `has_role(text)`, `has_role_check(text)`, `lab_is_accessible()` con REVOKE — sono l'infrastruttura delle policy RLS, un REVOKE le romperebbe tutte.

---

### Task 1: Migration 1 — RLS deny-all su 3 tabelle

**Files:**
- Create: `ua-app/supabase/migrations/20260704160000_security_hardening_rls_tables.sql`

**Interfaces:**
- Consumes: nessuno (prima migration del piano).
- Produces: `audit_log`, `webauthn_challenges`, `sub_processors` con RLS abilitata e zero policy (deny-all implicito per `anon`/`authenticated`, `service_role` bypassa via `BYPASSRLS`).

**Verifica pre-flight già fatta (04/07/2026, vedi spec §2 punto 1):** `postgres` (owner di `_audit_trigger_fn`) e `service_role` (unico client applicativo per queste 3 tabelle) hanno entrambi `rolbypassrls=true` → RLS deny-all non blocca alcuna scrittura esistente. Verificato anche che oggi `anon`/`authenticated` hanno grant di tabella COMPLETI (SELECT/INSERT/UPDATE/DELETE/TRUNCATE) su tutte e 3 — il rischio pratico attuale è quindi lettura/scrittura/cancellazione libera via REST con la sola chiave `anon`.

- [ ] **Step 1: Scrivi la migration**

```sql
-- ua-app/supabase/migrations/20260704160000_security_hardening_rls_tables.sql
-- Security Advisor ERROR: rls_disabled_in_public.
-- postgres (owner _audit_trigger_fn) e service_role (unico client applicativo
-- per queste 3 tabelle) hanno rolbypassrls=true — RLS deny-all non blocca
-- alcuna scrittura esistente (verificato 2026-07-04).

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_processors ENABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Applica la migration al progetto live (`iagibumwjstnveqpjbwq`)**

Usa il tool MCP Supabase `apply_migration` (nome: `security_hardening_rls_tables`, contenuto: il file sopra). **Conferma esplicita con Francesco prima di eseguire** — tocca lo schema di produzione.

- [ ] **Step 3: Verifica RLS abilitata**

Query di verifica (via `execute_sql`, sola lettura):
```sql
select relname, relrowsecurity
from pg_class
where relname in ('audit_log','webauthn_challenges','sub_processors')
  and relnamespace = 'public'::regnamespace;
```
Atteso: 3 righe, `relrowsecurity = true` su tutte.

- [ ] **Step 4: Verifica che il deny-all funzioni per `anon` (lettura)**

```sql
SET ROLE anon;
SELECT count(*) FROM public.audit_log;
RESET ROLE;
```
Atteso: `count = 0`, nessun errore (RLS filtra silenziosamente in SELECT).

- [ ] **Step 5: Verifica che il deny-all funzioni per `anon` (scrittura)**

```sql
SET ROLE anon;
INSERT INTO public.audit_log (table_name, operation) VALUES ('__rls_test__', 'INSERT_TEST');
RESET ROLE;
```
Atteso: errore `new row violates row-level security policy for table "audit_log"`. Se l'INSERT va a buon fine, STOP — la migration non ha funzionato, non procedere oltre senza indagare.

- [ ] **Step 6: Verifica che le scritture applicative reali continuino a funzionare**

Non eseguire codice applicativo in questo step (nessun ambiente di test isolato per WebAuthn/audit in questa fase) — la verifica end-to-end reale è demandata al Task 7 (QA manuale) dopo che tutte le migration sono applicate. Qui limitarsi a confermare via query che `service_role` bypassa ancora RLS:
```sql
SET ROLE service_role;
SELECT count(*) FROM public.audit_log;
RESET ROLE;
```
Atteso: nessun errore, conteggio reale delle righe esistenti (bypassa RLS).

- [ ] **Step 7: Commit del file migration**

```bash
cd "ua-app"
git add supabase/migrations/20260704160000_security_hardening_rls_tables.sql
git commit -m "fix(security): enable RLS deny-all on audit_log, webauthn_challenges, sub_processors

Security Advisor ERROR rls_disabled_in_public. Verificato che postgres
(owner del trigger di audit) e service_role (unico client applicativo)
hanno rolbypassrls=true, quindi nessuna scrittura esistente si rompe."
```

---

### Task 2: Migration 2 — security_invoker su 7 Security Definer View

**Files:**
- Create: `ua-app/supabase/migrations/20260704170000_security_hardening_views_invoker.sql`

**Interfaces:**
- Consumes: nessuno (indipendente da Task 1).
- Produces: le 7 view (`lavori_dashboard`, `fatture_da_inviare`, `magazzino_sotto_scorta`, `dichiarazioni_in_scadenza`, `tracciabilita_lotto`, `partitario_clienti`, `statistiche_mensili`) con `security_invoker = on`.

**Verifica pre-flight già fatta (04/07/2026, vedi spec §2 punto 2 e §3.2):** nessun consumer applicativo usa queste view oggi (verificato con `grep -rn "\.from('<vista>')" ua-app/src`, zero risultati per tutte e 7). Tutte filtrano già `current_lab_id()` internamente nel body della view (invariato da questa migration).

- [ ] **Step 1: Scrivi la migration**

```sql
-- ua-app/supabase/migrations/20260704170000_security_hardening_views_invoker.sql
-- Security Advisor ERROR: security_definer_view su 7 viste.
-- Le viste filtrano già current_lab_id() internamente; nessun consumer
-- applicativo le usa oggi (verificato via grep in ua-app/src), zero rischio
-- di rottura.

ALTER VIEW public.lavori_dashboard SET (security_invoker = on);
ALTER VIEW public.fatture_da_inviare SET (security_invoker = on);
ALTER VIEW public.magazzino_sotto_scorta SET (security_invoker = on);
ALTER VIEW public.dichiarazioni_in_scadenza SET (security_invoker = on);
ALTER VIEW public.tracciabilita_lotto SET (security_invoker = on);
ALTER VIEW public.partitario_clienti SET (security_invoker = on);
ALTER VIEW public.statistiche_mensili SET (security_invoker = on);
```

- [ ] **Step 2: Applica la migration al progetto live**

Usa `apply_migration` (nome: `security_hardening_views_invoker`, contenuto: il file sopra). **Conferma esplicita con Francesco prima di eseguire.**

- [ ] **Step 3: Verifica `security_invoker` attivo su tutte e 7**

```sql
select c.relname,
  (c.reloptions is not null and 'security_invoker=on' = any(c.reloptions)) as invoker_on
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('lavori_dashboard','fatture_da_inviare','magazzino_sotto_scorta',
                     'dichiarazioni_in_scadenza','tracciabilita_lotto','partitario_clienti',
                     'statistiche_mensili');
```
Atteso: 7 righe, `invoker_on = true` su tutte.

- [ ] **Step 4: Verifica che il filtro tenant nella view funzioni ancora**

```sql
SET ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000"}', true);
SELECT count(*) FROM public.lavori_dashboard;
RESET ROLE;
```
Atteso: nessun errore SQL (la view deve continuare a eseguire `current_lab_id()` senza rompersi sotto invoker mode — il conteggio sarà 0 perché l'UUID di test non corrisponde a nessun utente reale, questo è atteso e corretto).

- [ ] **Step 5: Commit del file migration**

```bash
cd "ua-app"
git add supabase/migrations/20260704170000_security_hardening_views_invoker.sql
git commit -m "fix(security): set security_invoker on 7 dashboard/report views

Security Advisor ERROR security_definer_view. Nessun consumer applicativo
le usa oggi; il filtro current_lab_id() interno resta invariato sotto
invoker mode."
```

---

### Task 3: Migration 3 — REVOKE/GRANT su funzioni SECURITY DEFINER + rimozione funzioni orfane

**Files:**
- Create: `ua-app/supabase/migrations/20260704180000_security_hardening_functions_revoke_drop.sql`

**Interfaces:**
- Consumes: nessuno (indipendente da Task 1-2).
- Produces: `cleanup_expired_webauthn_challenges()` tracciata per la prima volta in una migration (corpo invariato). 8 funzioni con `EXECUTE` revocato a `PUBLIC`/`anon`/`authenticated` e concesso solo a `service_role`. 3 funzioni (`set_lab_claim(uuid)`, `soft_delete_lavoro(uuid)`, `stats_dashboard(uuid)`) rimosse dallo schema — **dopo questo task, `src/types/database.types.ts` non avrà più le loro voci in `Functions`** (rigenerato in Task 4, nessun caller applicativo le referenzia).

**Verifica pre-flight già fatta (04/07/2026, vedi spec §2 punto 3 e §3.3, §4):**
- Le 8 funzioni da REVOKE sono chiamate esclusivamente da `getServiceClient()` in `ua-app/src` (verificato con grep mirato per ciascuna).
- Le 3 funzioni da DROP non hanno trigger, cron job, né caller applicativo (verificato con query su `pg_trigger`/`cron.job` e grep `ua-app/src`); la storia git (`git log --all -S"<nome>"` in `ua-app/`) mostra che sono state introdotte una sola volta al bootstrap dello schema (commit `4b98482`/`828a4ac`/`f9c8202`) e mai più toccate; il body di ciascuna conferma che sono superate da approcci più recenti (`set_lab_claim` → `current_lab_id()`/`get_lab_id()`; `soft_delete_lavoro` → route API dirette; `stats_dashboard` → `refresh_dashboard_cache()`). Nessun Auth Hook nel repo referenzia `set_lab_claim` e la sua firma (`uuid → void`) non è comunque compatibile con la forma richiesta da un Custom Access Token Hook (`jsonb → jsonb`).
- Le definizioni complete delle 3 funzioni eliminate sono salvate come rollback in `ua-app/docs/superpowers/specs/2026-07-04-security-advisor-hardening-design.md` §3.3.

- [ ] **Step 1: Scrivi la migration**

```sql
-- ua-app/supabase/migrations/20260704180000_security_hardening_functions_revoke_drop.sql
-- Security Advisor WARN: 16 funzioni SECURITY DEFINER eseguibili da
-- anon/authenticated senza REVOKE esplicito. Trattamento in 3 categorie
-- (vedi design spec §3.3):
--   (a) 5 helper RLS: NON toccate in questa migration (current_lab_id,
--       get_lab_id, has_role, has_role_check, lab_is_accessible).
--   (b) 8 funzioni con caller solo service-role: REVOKE + GRANT service_role.
--   (c) 3 funzioni orfane confermate dead code: DROP.

-- (adozione) cleanup_expired_webauthn_challenges esisteva solo nel DB live,
-- mai in una migration tracciata. Ricreata identica (corpo invariato) per
-- chiudere il gap di tracciabilità prima di applicarle REVOKE.
CREATE OR REPLACE FUNCTION public.cleanup_expired_webauthn_challenges()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DELETE FROM public.webauthn_challenges WHERE expires_at < now();
$function$;

-- (b) REVOKE PUBLIC/anon/authenticated, GRANT solo service_role
REVOKE ALL ON FUNCTION public._audit_trigger_fn() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._audit_trigger_fn() TO service_role;

REVOKE ALL ON FUNCTION public.admin_delete_laboratorio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_laboratorio(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.cleanup_expired_webauthn_challenges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_webauthn_challenges() TO service_role;

REVOKE ALL ON FUNCTION public.consegna_lavoro_lock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_lavoro_lock(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.consegna_lavoro_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_lavoro_lock(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.crea_rifacimento_atomico(uuid, text, text, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid, text, text, numeric, text) TO service_role;

REVOKE ALL ON FUNCTION public.get_pec_password(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_pec_password(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.refresh_dashboard_cache(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_cache(uuid) TO service_role;

-- (c) Dead code confermato (vedi spec §4 per le verifiche fatte con Francesco).
-- Rollback: definizioni complete in
-- ua-app/docs/superpowers/specs/2026-07-04-security-advisor-hardening-design.md §3.3.
DROP FUNCTION public.set_lab_claim(uuid);
DROP FUNCTION public.soft_delete_lavoro(uuid);
DROP FUNCTION public.stats_dashboard(uuid);
```

- [ ] **Step 2: Applica la migration al progetto live**

Usa `apply_migration` (nome: `security_hardening_functions_revoke_drop`, contenuto: il file sopra). **Conferma esplicita con Francesco prima di eseguire** — include 3 `DROP FUNCTION` su schema di produzione.

- [ ] **Step 3: Verifica REVOKE/GRANT**

```sql
select proname,
  has_function_privilege('anon', oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', oid, 'EXECUTE') as auth_exec,
  has_function_privilege('service_role', oid, 'EXECUTE') as svc_exec
from pg_proc
where proname in ('_audit_trigger_fn','admin_delete_laboratorio',
                   'cleanup_expired_webauthn_challenges','consegna_lavoro_lock',
                   'crea_rifacimento_atomico','get_pec_password','refresh_dashboard_cache');
```
Atteso: `anon_exec = false` e `auth_exec = false` su tutte le righe, `svc_exec = true` su tutte le righe (9 righe totali: `consegna_lavoro_lock` compare 2 volte per i 2 overload).

- [ ] **Step 4: Verifica che le 5 helper RLS NON siano state toccate**

```sql
select proname,
  has_function_privilege('anon', oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', oid, 'EXECUTE') as auth_exec
from pg_proc
where proname in ('current_lab_id','get_lab_id','has_role','has_role_check','lab_is_accessible');
```
Atteso: `anon_exec = true` e `auth_exec = true` su tutte le 5 righe (invariato). Se una di queste risulta `false`, STOP — indica che il REVOKE ha toccato per errore una helper RLS, va investigato immediatamente prima di procedere (rischio di rottura totale delle policy RLS del progetto).

- [ ] **Step 5: Verifica DROP delle 3 funzioni orfane**

```sql
select proname from pg_proc where proname in ('set_lab_claim','soft_delete_lavoro','stats_dashboard');
```
Atteso: 0 righe.

- [ ] **Step 6: Commit del file migration**

```bash
cd "ua-app"
git add supabase/migrations/20260704180000_security_hardening_functions_revoke_drop.sql
git commit -m "fix(security): revoke anon/authenticated exec on 8 SECURITY DEFINER functions, drop 3 orphaned functions

Security Advisor WARN anon/authenticated_security_definer_function_executable.
set_lab_claim/soft_delete_lavoro/stats_dashboard confermate dead code
(nessun trigger/cron/caller, storia git mostra creazione al bootstrap
schema mai più toccata, superate da current_lab_id()/route API dirette/
refresh_dashboard_cache). Le 5 helper RLS (current_lab_id, get_lab_id,
has_role, has_role_check, lab_is_accessible) restano intenzionalmente
eseguibili da anon/authenticated — sono l'infrastruttura delle policy RLS."
```

---

### Task 4: Rigenera i tipi TypeScript e verifica non-regressione

**Files:**
- Modify: `ua-app/src/types/database.types.ts` (generato, non a mano)

**Interfaces:**
- Consumes: schema DB dopo Task 3 (funzioni cambiate/rimosse).
- Produces: `database.types.ts` aggiornato, senza le voci `Functions.set_lab_claim`/`Functions.soft_delete_lavoro`/`Functions.stats_dashboard`.

- [ ] **Step 1: Rigenera i tipi**

```bash
cd "ua-app"
npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts
```

- [ ] **Step 2: Rimuovi eventuale messaggio CLI in fondo al file**

Apri `src/types/database.types.ts`, controlla le ultime righe: se il CLI ha appeso un messaggio non-TypeScript (es. un avviso), rimuovilo manualmente (pattern già noto, vedi `ua-app/CLAUDE.md` §9 "Supabase types").

- [ ] **Step 3: Verifica TypeScript**

```bash
npx tsc --noEmit
```
Atteso: 0 errori. Se compaiono errori relativi a `set_lab_claim`/`soft_delete_lavoro`/`stats_dashboard`, significa che esiste un caller applicativo non trovato durante l'investigazione — STOP, non procedere con le migration successive, investigare prima.

- [ ] **Step 4: Verifica suite di test completa**

```bash
npx vitest run
```
Atteso: stesso numero di test verdi di prima di iniziare questo piano (nessun test copre direttamente queste tabelle/funzioni, questo è un controllo di non-regressione sul resto dell'app).

- [ ] **Step 5: Verifica build production**

```bash
npx next build
```
Atteso: build pulita, 0 errori.

- [ ] **Step 6: Commit dei tipi rigenerati**

```bash
cd "ua-app"
git add src/types/database.types.ts
git commit -m "chore(types): regenerate database.types.ts after security hardening migration

Rimosse le voci Functions per set_lab_claim/soft_delete_lavoro/stats_dashboard
(eliminate come dead code nella migration security_hardening_functions_revoke_drop)."
```

---

### Task 5: Migration 4 — search_path fix su 33 funzioni

**Files:**
- Create: `ua-app/supabase/migrations/20260704190000_security_hardening_search_path.sql`

**Interfaces:**
- Consumes: schema DB dopo Task 3 (le 3 funzioni orfane non esistono più, quindi non compaiono in questa lista).
- Produces: 33 funzioni con `search_path = public, pg_temp` fissato esplicitamente (operazione additiva, corpo delle funzioni invariato).

**Verifica pre-flight già fatta (04/07/2026, vedi spec §2 punto 2):** controllato il body di tutte e 33 le funzioni — nessuna referenzia oggetti fuori da `public` in modo non qualificato. I riferimenti a `vault.*` (in `get_pec_password`, `get_pec_vault_secret`, `upsert_pec_vault_secret`) e `auth.*` (in `_audit_trigger_fn`) sono già schema-qualificati nel codice SQL, quindi restringere il `search_path` non li rompe. `refresh_dashboard_cache` e `cleanup_expired_webauthn_challenges` hanno già `search_path=public` da lavori precedenti — non incluse in questa lista.

- [ ] **Step 1: Scrivi la migration**

```sql
-- ua-app/supabase/migrations/20260704190000_security_hardening_search_path.sql
-- Security Advisor WARN: function_search_path_mutable su 33 funzioni
-- (36 meno le 3 eliminate nella migration precedente). Operazione additiva,
-- non tocca il body delle funzioni. Verificato (2026-07-04) che nessuna
-- referenzia oggetti fuori da `public` in modo non qualificato — i
-- riferimenti a vault./auth. nelle funzioni PEC/audit sono già
-- schema-qualificati nel body.

ALTER FUNCTION public.trigger_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_updated_at_trigger(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_progressivo(uuid, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_lavoro_ritardo() SET search_path = public, pg_temp;
ALTER FUNCTION public.aggiorna_scorta_lotto() SET search_path = public, pg_temp;
ALTER FUNCTION public.calcola_bollo_fattura() SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_numero_lavoro(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_numero_fattura(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_numero_ddc(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calcola_imponibile_lavoro(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.richiede_bollo(numeric, numeric, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.genera_xml_fattura_pa(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.xmlescape(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.has_prrc_valido(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_paziente_nome_cognome() SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_refresh_dashboard() SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_lavoro() SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_lavoro_optional() SET search_path = public, pg_temp;
ALTER FUNCTION public.consegna_lavoro_lock(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.consegna_lavoro_lock(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_pec_password(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_rifacimento() SET search_path = public, pg_temp;
ALTER FUNCTION public.assert_same_lab_lavorazione() SET search_path = public, pg_temp;
ALTER FUNCTION public.crea_rifacimento_atomico(uuid, text, text, numeric, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_delete_laboratorio(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public._audit_trigger_fn() SET search_path = public, pg_temp;
ALTER FUNCTION public.upsert_pec_vault_secret(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_pec_vault_secret(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.decrementa_scorta(uuid, uuid, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.accept_invite_atomic(text, uuid, text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.ricalcola_pagamento_fattura(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.trg_ricalcola_pagamento_fattura() SET search_path = public, pg_temp;
```

- [ ] **Step 2: Applica la migration al progetto live**

Usa `apply_migration` (nome: `security_hardening_search_path`, contenuto: il file sopra). **Conferma esplicita con Francesco prima di eseguire.**

- [ ] **Step 3: Verifica search_path impostato su tutte e 33**

```sql
select proname, pg_get_function_identity_arguments(oid) as args, proconfig
from pg_proc
where proname in ('trigger_set_updated_at','apply_updated_at_trigger','genera_progressivo',
  'check_lavoro_ritardo','aggiorna_scorta_lotto','calcola_bollo_fattura','genera_numero_lavoro',
  'genera_numero_fattura','genera_numero_ddc','calcola_imponibile_lavoro','richiede_bollo',
  'genera_xml_fattura_pa','xmlescape','has_prrc_valido','sync_paziente_nome_cognome',
  'trg_refresh_dashboard','assert_same_lab_lavoro','assert_same_lab_lavoro_optional',
  'consegna_lavoro_lock','get_pec_password','assert_same_lab_rifacimento',
  'assert_same_lab_lavorazione','crea_rifacimento_atomico','admin_delete_laboratorio',
  '_audit_trigger_fn','upsert_pec_vault_secret','get_pec_vault_secret','set_updated_at',
  'decrementa_scorta','accept_invite_atomic','ricalcola_pagamento_fattura',
  'trg_ricalcola_pagamento_fattura')
order by proname;
```
Atteso: 33 righe (`consegna_lavoro_lock` compare 2 volte), tutte con `proconfig` contenente `search_path=public, pg_temp`. Nessuna riga con `proconfig` null.

- [ ] **Step 4: Verifica di non-regressione — funzioni PEC**

```sql
SET ROLE service_role;
SELECT public.get_pec_password('00000000-0000-0000-0000-000000000000'::uuid);
RESET ROLE;
```
Atteso: errore applicativo controllato `PEC non configurata per questo laboratorio` (non un errore di risoluzione schema/funzione tipo "schema vault does not exist" o "function vault.* does not exist" — se compare quel tipo di errore, il search_path ha rotto l'accesso a `vault`, STOP e indagare).

- [ ] **Step 5: Commit del file migration**

```bash
cd "ua-app"
git add supabase/migrations/20260704190000_security_hardening_search_path.sql
git commit -m "fix(security): pin search_path on 33 remaining functions

Security Advisor WARN function_search_path_mutable. Verificato che
nessuna funzione referenzia oggetti fuori da public in modo non
qualificato (vault./auth. nelle funzioni PEC/audit sono già
schema-qualificati nel body)."
```

---

### Task 6: Verifica finale con Security Advisor + QA manuale mirata

**Files:** nessuno (solo verifica).

**Interfaces:**
- Consumes: stato del DB dopo Task 1, 2, 3, 5.
- Produces: conferma che l'intervento ha chiuso i 10 ERROR + i WARN in scope.

- [ ] **Step 1: Ri-esegui il Security Advisor**

Usa il tool MCP Supabase `get_advisors` (project_id `iagibumwjstnveqpjbwq`, type `security`).

- [ ] **Step 2: Confronta con lo stato iniziale**

Atteso:
- 0 lint `rls_disabled_in_public` (erano 3).
- 0 lint `security_definer_view` (erano 7).
- 0 lint `anon_security_definer_function_executable` / `authenticated_security_definer_function_executable` **tranne** le 5 righe per `current_lab_id`, `get_lab_id`, `has_role`, `has_role_check`, `lab_is_accessible` (WARN accettato consapevolmente, vedi Global Constraints — se compaiono meno di 5 o più di 5 righe, indagare).
- 0 lint `function_search_path_mutable` per le 33 funzioni di Task 5.
- I lint di performance (`multiple_permissive_policies`, `auth_rls_initplan`, `unused_index`, `unindexed_foreign_keys`) sono **fuori scope**, ignorarli in questo confronto.

Se un ERROR risulta ancora presente dopo la migration corrispondente, STOP e non procedere al Task 7 — indagare prima.

- [ ] **Step 3: QA manuale — login con passkey/WebAuthn**

Avvia il dev server (`npm run dev` in `ua-app/`), esegui un login reale con passkey su un account di test (mai il lab Filippo — usa un account E2E esistente, es. `e2e-titolare@ua-test.local`, pattern già seguito in B8/B9/B10). Conferma che il flusso genera e consuma correttamente una riga in `webauthn_challenges` (query diretta pre/post login per verificare INSERT poi DELETE/consumo) — RLS deny-all non deve aver rotto nulla, dato che il client applicativo è sempre `service_role`.

- [ ] **Step 4: QA manuale — invio/dry-run PEC**

Se un laboratorio di test ha PEC configurata, esegui un invio reale o un dry-run che chiama `get_pec_password()` (via `send-pec.ts`). Conferma che la password viene recuperata correttamente da Vault (nessun errore di REVOKE o search_path).

- [ ] **Step 5: QA manuale — scrittura che genera una riga `audit_log`**

Esegui una modifica reale su un lavoro/cliente/fattura del lab E2E (mai il lab Filippo) e verifica con query diretta che una nuova riga compaia in `audit_log` con `table_name`/`operation`/`lab_id` corretti — conferma che RLS deny-all non ha bloccato il trigger.

```sql
select table_name, operation, lab_id, changed_at
from public.audit_log
order by changed_at desc
limit 5;
```

- [ ] **Step 6: Rimuovi eventuali dati di test**

Se la QA ha generato righe/dati temporanei nel lab E2E, rimuovili con query diretta (mai a mano dalla UI), coerente col pattern già seguito in B8/B9/B10.

---

### Task 7: Leaked password protection (toggle manuale)

**Files:** nessuno (impostazione Supabase Auth, non SQL).

- [ ] **Step 1: Chiedi a Francesco come vuole eseguire il toggle**

Due opzioni, nessun tool MCP lo espone direttamente:
1. Francesco lo attiva da solo: **Supabase Dashboard → Authentication → Policies (sezione Password) → abilita "Leaked password protection"**.
2. Claude lo esegue via `claude-in-chrome` se Francesco ha la sessione Chrome connessa (stesso meccanismo già usato per l'applicazione dei template email in S4) — solo se Francesco lo richiede esplicitamente, mai in autonomia su un pannello Auth di produzione.

- [ ] **Step 2: Verifica post-toggle**

Ri-esegui `get_advisors` (type `security`) e conferma che il lint `auth_leaked_password_protection` non compaia più.

---

### Task 8: Aggiornamento memoria (BP-1)

**Files:**
- Modify: `ua-app/memory/MEMORY.md`
- Modify: `ua-app/docs/roadmap/ROADMAP-UFFICIALE.md`
- Modify: `ua-app/docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`

- [ ] **Step 1: Aggiungi sezione in `BACKLOG-TECNICO-2026-07-02.md`**

Nuova voce (es. `B19` o prossimo identificatore libero) che documenta: origine (Security Advisor, non da audit precedente), i 10 ERROR + WARN risolti, le 3 funzioni eliminate, le 5 helper RLS come WARN accettato consapevolmente, riferimento allo spec e al piano.

- [ ] **Step 2: Aggiorna `MEMORY.md` sezione "0. STATO DEL PROGETTO"**

Aggiungi paragrafo con la stessa struttura delle voci B3/B8/B18 esistenti: cosa era rotto, fix applicato, verifica automatica, QA manuale, commit coinvolti (4 migration + rigenerazione tipi).

- [ ] **Step 3: Aggiorna `ROADMAP-UFFICIALE.md`**

Aggiungi la voce di chiusura in cima (stesso pattern delle voci B18/B3 esistenti), e ripristina la priorità successiva a **B4** (`as any` nei generatori PDF MDR) se non emergono altri blocker durante questo lavoro.

- [ ] **Step 4: Commit della memoria aggiornata**

```bash
cd "ua-app"
git add memory/MEMORY.md docs/roadmap/ROADMAP-UFFICIALE.md docs/roadmap/BACKLOG-TECNICO-2026-07-02.md
git commit -m "docs(security): document Supabase security advisor hardening completion

Chiusi 10 ERROR critici + WARN di sicurezza selezionati (RLS mancante,
security definer view, REVOKE mancanti, search_path mutabile). Prossima
priorità: B4."
```
