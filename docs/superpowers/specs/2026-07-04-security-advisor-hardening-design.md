# Hardening sicurezza — Supabase Security Advisor (ERROR + WARN selezionati)

**Data:** 04/07/2026
**Origine:** Supabase Security Advisor (`iagibumwjstnveqpjbwq`), segnalato da Francesco navigando la dashboard — non era ancora tracciato in `BACKLOG-TECNICO-2026-07-02.md`.
**Scope:** i 10 ERROR critici + un sottoinsieme di WARN di sicurezza. **Fuori scope** (backlog separato futuro): le WARN/INFO di performance (`multiple_permissive_policies` ×240, `auth_rls_initplan` ×8, `unused_index` ×72, `unindexed_foreign_keys` ×63).

## 1. Problema

Il Security Advisor segnala 10 ERROR e 71 WARN su `iagibumwjstnveqpjbwq`. Verificato con `get_advisors` + query dirette sul DB live (non solo lo screenshot dashboard, che mostrava un elenco parziale):

**10 ERROR:**
- **RLS disabilitato (3 tabelle):** `sub_processors`, `webauthn_challenges` (schema `public`, non va confuso con `auth.webauthn_challenges` che è una tabella nativa Supabase Auth, separata e non nostra), `audit_log`. Con RLS spento, l'endpoint PostgREST pubblico è raggiungibile da chiunque abbia la chiave `anon` (spedita nel bundle browser), indipendentemente dal fatto che l'app usi solo `getServiceClient()`.
- **Security Definer View (7 viste):** `lavori_dashboard`, `fatture_da_inviare`, `magazzino_sotto_scorta`, `dichiarazioni_in_scadenza`, `tracciabilita_lotto`, `partitario_clienti`, `statistiche_mensili`. Filtrano già `current_lab_id()` internamente ma girano in modalità legacy "security definer" (bypass RLS del chiamante) invece di "security invoker".

**WARN selezionati per questo intervento:**
- 16 funzioni `SECURITY DEFINER` eseguibili da `anon` + 16 da `authenticated` senza `REVOKE` esplicito (violazione della regola già scritta in `CLAUDE.md`).
- 36 funzioni con `search_path` mutabile (9 già corrette da lavori precedenti B3/B8/hotfix).
- `auth_leaked_password_protection`: toggle Supabase Auth disattivato.

## 2. Verifiche empiriche (non assunzioni)

Prima di disegnare il fix, verificato con query dirette sul DB live che i tre punti più rischiosi del design NON rompano nulla:

1. **RLS su `audit_log` non blocca il trigger di scrittura.** `_audit_trigger_fn()` è owned da `postgres` (`rolbypassrls=true`); tutte le scritture applicative reali passano da `getServiceClient()` (ruolo `service_role`, anch'esso `rolbypassrls=true`). Nessuno dei due percorsi di scrittura è soggetto a RLS, quindi abilitare RLS deny-all su `audit_log`/`webauthn_challenges`/`sub_processors` non blocca alcuna scrittura esistente.
2. **`search_path = public, pg_temp` non rompe le funzioni che toccano `vault`/`auth`.** Controllato il body di tutte le 33 funzioni coinvolte (36 meno le 3 da eliminare, vedi §4): `get_pec_password`, `get_pec_vault_secret`, `upsert_pec_vault_secret` referenziano `vault.*` **già schema-qualificato** nel codice SQL; `_audit_trigger_fn` referenzia `auth.uid()` **già schema-qualificato**. Il `search_path` influenza solo la risoluzione di nomi *non* qualificati — nessuna delle 33 funzioni ne usa di non qualificati verso schemi esterni a `public` (verificato anche che nessuna chiama `digest()`/`crypt()`/`gen_salt()`/`uuid_generate_v4()` non qualificati, gli unici casi realistici di rottura per un progetto Supabase). Le estensioni `pg_trgm`/`unaccent` vivono peraltro già in `public` (altro WARN, `extension_in_public`, fuori scope in questa sessione), quindi anche eventuali chiamate non qualificate a quelle risolverebbero comunque.
3. **`set_lab_claim` non è agganciata a nessun Auth Hook.** Nessun `supabase/config.toml` nel repo referenzia hook custom; la firma della funzione (`user_id uuid → void`) non è comunque compatibile con la forma richiesta da un Custom Access Token Hook (`jsonb → jsonb`). Sicura da eliminare.

## 3. Architettura — 4 migration Supabase discrete

Ogni migration è indipendente e applicata al DB live solo dopo conferma esplicita di Francesco (pattern già seguito in B3/B8/B18). Tutte e 4 vanno anche **retro-portate come file in `ua-app/supabase/migrations/`** (oggi assenti per queste tabelle/viste/funzioni — stesso gap di tracciabilità già noto per `fasi_produzione`), non solo applicate a mano.

### 3.1 Migration 1 — RLS deny-all su 3 tabelle

```sql
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_processors ENABLE ROW LEVEL SECURITY;
```

Nessuna policy aggiunta (deny-all implicito by default in Postgres) — stesso pattern già in uso nel progetto per `inviti_rete`/`inviti`/`lab_stato_log`. `service_role` continua a bypassare via `BYPASSRLS` (verificato §2.1).

**Verifica pre-apply (gate, da eseguire subito prima):** ri-confermare `rolbypassrls` su `postgres`/`service_role` (query §2.1) non sia cambiato da quando verificato in questa sessione.
**Verifica post-apply:** query diretta con un client anon simulato (`SELECT` su ciascuna tabella con la sola anon key) → deve fallire/restituire 0 righe; una scrittura applicativa reale (es. login che genera una challenge WebAuthn) deve continuare a funzionare.

### 3.2 Migration 2 — Security invoker su 7 view

```sql
ALTER VIEW public.lavori_dashboard SET (security_invoker = on);
ALTER VIEW public.fatture_da_inviare SET (security_invoker = on);
ALTER VIEW public.magazzino_sotto_scorta SET (security_invoker = on);
ALTER VIEW public.dichiarazioni_in_scadenza SET (security_invoker = on);
ALTER VIEW public.tracciabilita_lotto SET (security_invoker = on);
ALTER VIEW public.partitario_clienti SET (security_invoker = on);
ALTER VIEW public.statistiche_mensili SET (security_invoker = on);
```

Nessun consumer applicativo oggi (verificato via grep in `src/`) → zero rischio di rottura. Le view restano disponibili per uso futuro, ora sicure per default.

### 3.3 Migration 3 — REVOKE/GRANT + rimozione funzioni orfane

**Non toccare** (helper RLS, l'infrastruttura stessa delle policy — un REVOKE romperebbe tutte le query `authenticated`/`anon`): `current_lab_id`, `get_lab_id`, `has_role`, `has_role_check`, `lab_is_accessible`. Il WARN dell'advisor su queste 5 resta **accettato consapevolmente** — documentato qui perché un futuro giro di "pulizia advisor" non le tocchi per errore.

**REVOKE `PUBLIC`/`anon`/`authenticated`, GRANT solo `service_role`** (tutte verificate chiamate solo da client service-role in `src/`):

```sql
REVOKE ALL ON FUNCTION public.admin_delete_laboratorio FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_laboratorio TO service_role;
-- idem per: consegna_lavoro_lock (entrambi gli overload), get_pec_password,
-- crea_rifacimento_atomico, refresh_dashboard_cache, _audit_trigger_fn
```

**`cleanup_expired_webauthn_challenges`** esiste solo nel DB live (mai in una migration tracciata): questa migration la "adotta" ricreandola identica (`CREATE OR REPLACE FUNCTION ...` con la definizione attuale) prima di applicarle REVOKE + `search_path`, chiudendo anche quel gap di tracciabilità.

**DROP** (dead code confermato — nessun trigger/cron/caller applicativo, storia git mostra creazione una tantum al bootstrap dello schema, funzionalità superate da approcci più recenti — vedi decisione con Francesco):

```sql
DROP FUNCTION public.stats_dashboard(uuid);       -- superata da refresh_dashboard_cache
DROP FUNCTION public.soft_delete_lavoro(uuid);    -- superata da API route dirette
DROP FUNCTION public.set_lab_claim(uuid);         -- superata da current_lab_id()/get_lab_id()
```

Le definizioni complete delle 3 funzioni sono salvate qui sotto come materiale di rollback (mai serviranno, ma la migration di rollback le ricrea 1:1 da qui se mai necessario):

<details>
<summary>Definizioni complete per rollback</summary>

```sql
CREATE OR REPLACE FUNCTION public.set_lab_claim(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = raw_app_meta_data ||
    jsonb_build_object('laboratorio_id',
      (SELECT laboratorio_id FROM utenti WHERE id = user_id LIMIT 1)
    )
  WHERE id = user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.soft_delete_lavoro(p_lavoro_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT public.has_role_check('titolare') THEN
    RAISE EXCEPTION 'Solo il titolare puo eliminare lavori';
  END IF;
  UPDATE lavori
  SET deleted_at = NOW()
  WHERE id = p_lavoro_id
    AND laboratorio_id = public.get_lab_id();
END;
$function$;

CREATE OR REPLACE FUNCTION public.stats_dashboard(p_lab uuid)
 RETURNS TABLE(lavori_oggi integer, lavori_in_ritardo integer, lavori_in_lavorazione integer, fatturato_mese numeric, fatturato_anno numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT
    (SELECT COUNT(*)::INTEGER FROM lavori
     WHERE laboratorio_id = p_lab AND data_consegna_prevista = CURRENT_DATE
       AND stato NOT IN ('consegnato','annullato') AND deleted_at IS NULL) AS lavori_oggi,
    (SELECT COUNT(*)::INTEGER FROM lavori
     WHERE laboratorio_id = p_lab AND (stato = 'in_ritardo'
            OR (stato = 'in_lavorazione' AND data_consegna_prevista < CURRENT_DATE))
       AND deleted_at IS NULL) AS lavori_in_ritardo,
    (SELECT COUNT(*)::INTEGER FROM lavori
     WHERE laboratorio_id = p_lab AND stato IN ('in_lavorazione','in_ritardo','in_prova')
       AND deleted_at IS NULL) AS lavori_in_lavorazione,
    (SELECT COALESCE(SUM(imponibile_netto), 0) FROM fatture
     WHERE laboratorio_id = p_lab AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
       AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM CURRENT_DATE)
       AND stato_sdi IN ('inviata','consegnata','accettata','decorrenza_termini') AND deleted_at IS NULL) AS fatturato_mese,
    (SELECT COALESCE(SUM(imponibile_netto), 0) FROM fatture
     WHERE laboratorio_id = p_lab AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM CURRENT_DATE)
       AND stato_sdi IN ('inviata','consegnata','accettata','decorrenza_termini') AND deleted_at IS NULL) AS fatturato_anno;
$function$;
```

</details>

Questa migration cambia le funzioni disponibili → **richiede** rigenerazione `database.types.ts` + `tsc --noEmit` (FASE 6b).

### 3.4 Migration 4 — `search_path` su 33 funzioni

`ALTER FUNCTION <nome>(<argtypes>) SET search_path = public, pg_temp;` per ciascuna delle 33 funzioni rimanenti (36 meno le 3 eliminate in 3.3). Operazione additiva, non richiede `CREATE OR REPLACE` del body. Verificato in §2 punto 2 che nessuna delle 33 ha riferimenti non qualificati a schemi esterni a `public` — zero rischio di rottura.

### 3.5 Leaked password protection

Non è SQL: toggle in **Supabase Dashboard → Authentication → Policies (o Providers) → Password Protection**. Da attivare manualmente da Francesco (nessun tool MCP lo espone) o da Claude via `claude-in-chrome` se Francesco preferisce farlo eseguire (stesso meccanismo già usato per S4 email template).

## 4. Decisioni prese con Francesco durante il brainstorming

- **`stats_dashboard`/`soft_delete_lavoro`/`set_lab_claim`:** prima ipotesi "solo REVOKE"; dopo investigazione (git history + verifica trigger/cron DB, nessun risultato) confermato dead code → **DROP**, non solo REVOKE.
- **`sub_processors`:** nessun consumer pubblico oggi (verificato), trattata come le altre 2 tabelle (RLS deny-all/service-role-only) invece di una policy SELECT pubblica — se in futuro serve una pagina di trasparenza GDPR sub-responsabili, si aggiunge una policy dedicata in un giro separato.
- **Le 5 funzioni helper RLS** restano intenzionalmente eseguibili da `anon`/`authenticated` (WARN accettato, non un fix mancato).

## 5. Testing e rollout

Non essendoci codice applicativo TypeScript modificato (solo migration SQL), non si applica TDD in senso stretto. Verifica per ogni migration:
1. Query diretta di verifica post-apply (vedi §3.1-3.4 per singolo caso).
2. `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + `npx tsc --noEmit` dopo Migration 3 (cambia le funzioni disponibili nei types).
3. `npx vitest run` completo dopo ogni migration (nessun test attualmente copre queste tabelle/funzioni direttamente, ma verifica non-regressione sul resto dell'app).
4. Al termine delle 4 migration: ri-eseguire `get_advisors` (security) e confermare che i 10 ERROR + i WARN in scope siano scomparsi, e che le 5 helper RLS restino come unico WARN residuo atteso.
5. QA manuale mirata: login con passkey/WebAuthn (verifica `webauthn_challenges` ancora funzionante), invio PEC reale o dry-run (verifica `get_pec_password` ancora funzionante), un'operazione che genera una riga di `audit_log` (es. modifica lavoro) e verifica che la riga sia scritta correttamente.

## 6. Aggiornamento memoria (BP-1)

A completamento: nuova sezione in `BACKLOG-TECNICO-2026-07-02.md` (o voce diretta in `MEMORY.md`/`ROADMAP-UFFICIALE.md` se il backlog non viene riaperto) che documenti l'intervento, le 3 funzioni eliminate, e le 5 helper RLS come WARN accettato — così un audit futuro non le confonda con un fix dimenticato.
