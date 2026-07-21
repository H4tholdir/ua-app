# Parete delle Cassette — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lo specchio digitale della parete fisica dei portalavori: tabella `cassette` + storico `cassette_lavori`, pagina `/cassette`, home a due stanze con preferenza per-utente, liberazione automatica alla consegna, miniature per tipo di lavoro.

**Architecture:** Verità dell'occupazione = riga viva di `cassette_lavori` (indici unici parziali); `lavori.numero_cassetta` resta come denormalizzazione sincronizzata SOLO dalle RPC SECURITY DEFINER (una sola penna, RLS SELECT-only + REVOKE). Route API pattern N13 completo. UI v3: pagina `/cassette` + pager scroll-snap in HomeV3.

**Tech Stack:** Next.js 16 App Router · Supabase (Postgres RLS + RPC plpgsql) · vitest · DS v3 (`src/components/ds/`, token `src/design-system/v3/*`).

**Spec (fonte di verità):** `docs/superpowers/specs/2026-07-21-parete-cassette-design.md` (rev.2, panel 3× integrato). Decisions: `docs/design/decisions/2026-07-20-mini-triage-e-parete.md`. Mockup fedeltà TOTALE: `docs/design/mockups/2026-07-20-parete-cassette-v2.html`.

## ⚠️ STATO AL 21/07 — LEGGERE PRIMA DI TUTTO

**Task 1 e Task 2 sono COMPLETI. La migration è APPLICATA al DB live.** Non rieseguirli.

Il Task 1 è stato **rifatto** dopo una review + un panel advisor 3× + due round di audit avversariale
(~40.000 statement concorrenti su Postgres usa-e-getta): 14 difetti del panel + 3 dei round successivi,
tutti chiusi e verificati in A/B. Esito: **3 migration** invece di una
(`…090000` DDL+RPC · `…090100` patch `admin_delete_laboratorio` · `…090200` backfill+audit),
applicate il 21/07, FASE 6b eseguita (`tsc --noEmit` exit 0), invarianti sul DB live tutti a zero.

**Documenti che sostituiscono il piano dove divergono** (leggerli, in quest'ordine):
1. `.superpowers/sdd/task-1-decisioni-ratificate.md` — R-1…R-6, ratificate da Francesco.
2. `.superpowers/sdd/audit-indipendente-completezza.md` §5 — l'elenco operativo per-task.
3. `.superpowers/sdd/progress.md` — ledger, decisioni dell'orchestratore, stato.

**Cinque cose che valgono per TUTTI i task da qui in avanti:**

1. **I test vanno in `tests/unit/`, MAI in `src/**/__tests__/`** (decisione D-O1). `vitest.config.ts`
   globba solo `tests/unit/**` e `tests/integration/**`: un test in `__tests__` dà «No test files
   found», cioè un **RED finto**. I path dei file *sorgente* restano quelli scritti nei task.
   `vitest.config.ts` **non si tocca**.
2. **Retry sul 40P01 è un contratto di route.** Alcune combinazioni concorrenti possono produrre
   deadlock che fanno rollback pulito (attese su indice unico, non coperte dall'ordine canonico dei
   lock). Sono **deliberatamente** non corretti in SQL: l'elenco e i tassi misurati sono nel commento
   d'intestazione di `20260721090000_parete_cassette.sql`. Le route che chiamano le RPC devono
   ritentare una volta sul 40P01 invece di restituire 500.
3. **`p_lab` sempre da `getFreshLabContext()` server-side, mai dal body. `p_user` sempre da
   `context.userId`.** Tutta la tenuta multi-tenant delle RPC poggia lì.
4. **`numero_cassetta` è NULL su tutti i 288 lavori in DB** (verificato dopo l'apply): il backfill ha
   operato su un insieme vuoto. Il **seed E2E del Task 19 è l'unica fonte di cassette per la QA** —
   senza, ogni superficie è vuota. Anticiparlo rispetto alla FASE 9.
5. **`cassette_lavori` è append-only: ogni DELETE viene rifiutato dal trigger.** Un reset di fixture
   con `.delete()` fallisce. L'unica via è `public.cassette_purge_lab(labId)`.
6. **Le tabelle della Parete sono in SOLA LETTURA anche per `service_role`** (`…090000:148-150`:
   `REVOKE ALL` + `GRANT SELECT`). Il service client bypassa **RLS**, **non** i GRANT di tabella: un
   `.insert()`/`.update()` diretto su `cassette` dà `42501 permission denied`. **Ogni scrittura passa
   da una RPC.** Il Task 4 si era bloccato proprio su questa premessa scritta al contrario, e da lì è
   nata una **quarta migration**, `20260721090300_cassette_crea_colore.sql` (Task 4a, panel 3×
   unanime + ratifica di Francesco), che aggiunge `cassetta_crea_atomica` e
   `cassetta_imposta_colore_atomica`. Se stai leggendo un task che descrive una scrittura diretta su
   `cassette`, quel testo è vecchio: **fermati e segnalalo.**

## Global Constraints

- **MAI committare/pushare senza richiesta esplicita di Francesco**; merge/deploy solo al gate finale.
- **Percorso GRANDE**: migration presente → FASE 6b obbligatoria dopo l'apply (`npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` + rimozione eventuale riga CLI in coda + `npx tsc --noEmit`).
- **RLS**: `public.current_lab_id()` (MAI `auth.`); tabelle nuove SELECT-only + `REVOKE INSERT, UPDATE, DELETE FROM anon, authenticated`.
- **RPC**: `SECURITY DEFINER` + `SET search_path = public, pg_temp` + `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE TO service_role`; esiti json (`{esito: …}`), MAI eccezioni come contratto (tranne violazioni unique catturate internamente).
- **Route API**: `isSameOrigin` → `getFreshLabContext` (401) → `laboratorioId` (403) → `assertLabOperativo(context, METHOD)` → `getServiceClient()` + `.eq('laboratorio_id', context.laboratorioId)` su OGNI query. PATCH = allowlist esplicita.
- **Motion SOLO da token** `src/design-system/v3/motion.ts` (`molla.smooth` snap/riordino, `molla.snappy` accensione); suoni/haptic da `v3/sound.ts`/`v3/haptic.ts` (palette chiusa: `tap` + `vibra('light')` a creazione cassetta, nessun suono nuovo).
- **Dizionario**: «Butta via» (MAI «Elimina»), «La parete ›», copy «nell'ordine del tuo muro» (MAI «identica al tuo muro»).
- **Componenti UI** SOLO in `src/components/ds/` (nuovi: `Cassetta`, `MiniaturaLavoro`) o `src/components/features/cassette/`; wrapper `[data-ds="v3"]`.
- **Pagine v2.3** (`/impostazioni`): la riga preferenza usa lo stile v2.3 (MAI token v3 lì).
- **Test**: vitest, RED→GREEN; `npx vitest run <file>` per singolo file.
- Lab E2E `00000000-0000-0000-0000-000000000001` per QA browser — MAI il lab Filippo `971061a1-…`.

## 🛑 Gates

- **Task 1** termina con l'apply della migration al DB live (gate esplicito: chiedere conferma a Francesco PRIMA di `db push`) + FASE 6b.
- **Task 18**: mockup legenda 4 miniature nuove → approvazione Francesco PRIMA del codice React delle 4 nuove (le 6 esistenti sono già ratificate e si implementano subito).
- **Fine piano**: FASE 7 (tsc+vitest+build) → review → QA browser → GATE ESTETICO L2 → STOP (niente merge senza conferma).

**Nota ratifiche (21/07):** spec rev.2 e **D-10 (rifacimento = trasferimento cassetta)** RATIFICATE da Francesco. Il gate condizionale su D-10 è caduto: la RPC `cassetta_trasferisci_rifacimento` è nel Task 1 e l'aggancio è il Task 9 (non più opzionale).

---

### Task 1: Migration — tabelle, trigger, RLS, RPC, backfill

**Files:**
- Create: `supabase/migrations/20260721090000_parete_cassette.sql`
- Modify (dopo apply): `src/types/database.types.ts` (rigenerato)

**Interfaces:**
- Produces (per i task successivi): tabelle `cassette` e `cassette_lavori`; RPC `cassetta_assegna_atomica(p_lab uuid, p_lavoro uuid, p_cassetta_id uuid, p_nome text, p_colore text) → json`, `cassetta_libera_atomica(p_lab uuid, p_lavoro uuid, p_motivo text) → json`, `cassetta_rinomina_atomica(p_lab uuid, p_cassetta_id uuid, p_nome text) → json`, `cassetta_elimina_atomica(p_lab uuid, p_cassetta_id uuid) → json`, `cassette_riordina(p_lab uuid, p_ordine uuid[]) → json`, `cassetta_riassegna_post_annullo(p_lab uuid, p_lavoro uuid) → json`, `cassetta_trasferisci_rifacimento(p_lab uuid, p_lavoro_vecchio uuid, p_lavoro_nuovo uuid) → json` (D-10 ratificata), `utente_set_nav_pref(p_user uuid, p_chiave text, p_valore jsonb) → void` (allowlist chiavi: `home` con enum validato, `parete_intro_vista` solo `true`).
- Esiti json: `{esito:'ok', …}` | `{esito:'occupata'|'cassetta_non_trovata'|'lavoro_non_valido'|'nome_occupato'|'ordine_non_valido'|'riassegnata'|'occupata_nel_frattempo'|'niente_da_riassegnare', …}`.

- [ ] **Step 1: Scrivi la migration completa**

```sql
-- 20260721090000_parete_cassette.sql
-- Parete delle Cassette: cassette + storico cassette_lavori + RPC (una sola penna) + backfill.
-- Spec: docs/superpowers/specs/2026-07-21-parete-cassette-design.md §4

-- ============ TABELLE ============
CREATE TABLE cassette (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES laboratori(id),
  nome           text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 20),
  colore         text NOT NULL DEFAULT 'bianca'
                 CHECK (colore IN ('bianca','azzurra','rossa','blu','verde','grigia')
                        OR colore ~ '^#[0-9A-F]{6}$'),
  posizione      integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
CREATE UNIQUE INDEX cassette_nome_vivo_uidx
  ON cassette (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL;
CREATE INDEX cassette_lab_pos_idx
  ON cassette (laboratorio_id, posizione) WHERE deleted_at IS NULL;

CREATE TABLE cassette_lavori (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES laboratori(id),
  cassetta_id    uuid NOT NULL REFERENCES cassette(id),
  lavoro_id      uuid NOT NULL REFERENCES lavori(id),
  assegnato_at   timestamptz NOT NULL DEFAULT now(),
  liberato_at    timestamptz,
  liberato_per   text CHECK (liberato_per IN ('consegna','manuale','spostamento','annullo_lavoro','rifacimento')),
  CHECK ((liberato_at IS NULL) = (liberato_per IS NULL))
);
CREATE UNIQUE INDEX cassette_lavori_cassetta_viva_uidx ON cassette_lavori (cassetta_id) WHERE liberato_at IS NULL;
CREATE UNIQUE INDEX cassette_lavori_lavoro_vivo_uidx  ON cassette_lavori (lavoro_id)  WHERE liberato_at IS NULL;
CREATE INDEX cassette_lavori_lab_lavoro_idx   ON cassette_lavori (laboratorio_id, lavoro_id, liberato_at);
CREATE INDEX cassette_lavori_lab_cassetta_idx ON cassette_lavori (laboratorio_id, cassetta_id, assegnato_at DESC);

-- ============ TRIGGER APPEND-ONLY (testo ratificato dal panel backend) ============
CREATE FUNCTION public.cassette_lavori_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'cassette_lavori è append-only: DELETE vietato';
  END IF;
  IF OLD.liberato_at IS NOT NULL THEN
    RAISE EXCEPTION 'assegnazione già chiusa, immutabile';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.laboratorio_id IS DISTINCT FROM OLD.laboratorio_id
     OR NEW.cassetta_id IS DISTINCT FROM OLD.cassetta_id
     OR NEW.lavoro_id IS DISTINCT FROM OLD.lavoro_id
     OR NEW.assegnato_at IS DISTINCT FROM OLD.assegnato_at THEN
    RAISE EXCEPTION 'solo liberato_at/liberato_per sono aggiornabili';
  END IF;
  IF NEW.liberato_at IS NULL THEN
    RAISE EXCEPTION 'la chiusura deve valorizzare liberato_at';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_cassette_lavori_append_only
  BEFORE UPDATE OR DELETE ON cassette_lavori
  FOR EACH ROW EXECUTE FUNCTION public.cassette_lavori_guard();

-- ============ RLS (SELECT-only, scrive solo il service role via RPC) ============
ALTER TABLE cassette ENABLE ROW LEVEL SECURITY;
CREATE POLICY cassette_select ON cassette FOR SELECT
  USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);
REVOKE INSERT, UPDATE, DELETE ON cassette FROM anon, authenticated;

ALTER TABLE cassette_lavori ENABLE ROW LEVEL SECURITY;
CREATE POLICY cassette_lavori_select ON cassette_lavori FOR SELECT
  USING (laboratorio_id = public.current_lab_id());
REVOKE INSERT, UPDATE, DELETE ON cassette_lavori FROM anon, authenticated;

-- ============ RPC ============
-- NOTA ARCHITETTURALE: la liberazione alla consegna è agganciata in
-- src/lib/consegna/orchestrate.ts (Step 5). Se una futura ondata attiva la RPC
-- dormiente consegna_finalizza_atomica come percorso di consegna, portare
-- la chiamata a cassetta_libera_atomica anche lì.

CREATE FUNCTION public.cassetta_libera_atomica(p_lab uuid, p_lavoro uuid, p_motivo text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_nome text;
BEGIN
  IF p_motivo NOT IN ('consegna','manuale','spostamento','annullo_lavoro','rifacimento') THEN
    RETURN json_build_object('esito','motivo_non_valido');
  END IF;
  UPDATE cassette_lavori cl SET liberato_at = now(), liberato_per = p_motivo
  FROM cassette c
  WHERE cl.lavoro_id = p_lavoro AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL
    AND c.id = cl.cassetta_id
  RETURNING c.nome INTO v_nome;
  UPDATE lavori SET numero_cassetta = NULL
  WHERE id = p_lavoro AND laboratorio_id = p_lab AND numero_cassetta IS NOT NULL;
  RETURN json_build_object('esito','ok','nome', v_nome);  -- v_nome NULL = niente da liberare (idempotente)
END $$;

CREATE FUNCTION public.cassetta_assegna_atomica(
  p_lab uuid, p_lavoro uuid, p_cassetta_id uuid DEFAULT NULL,
  p_nome text DEFAULT NULL, p_colore text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_cassetta_id uuid; v_nome text; v_occupante uuid; v_stato_occ text; v_del_occ timestamptz;
BEGIN
  -- (0) lavoro del lab, vivo, non chiuso
  PERFORM 1 FROM lavori WHERE id = p_lavoro AND laboratorio_id = p_lab
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
  IF NOT FOUND THEN RETURN json_build_object('esito','lavoro_non_valido'); END IF;

  IF p_cassetta_id IS NOT NULL THEN
    SELECT id, nome INTO v_cassetta_id, v_nome FROM cassette
    WHERE id = p_cassetta_id AND laboratorio_id = p_lab AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('esito','cassetta_non_trovata'); END IF;
  ELSIF p_nome IS NOT NULL AND char_length(btrim(p_nome)) BETWEEN 1 AND 20 THEN
    -- (1) get-or-create race-safe sull'indice parziale (inferenza con predicato)
    INSERT INTO cassette (laboratorio_id, nome, colore, posizione)
    VALUES (p_lab, btrim(p_nome), COALESCE(p_colore,'bianca'),
            COALESCE((SELECT max(posizione)+1 FROM cassette WHERE laboratorio_id = p_lab AND deleted_at IS NULL), 0))
    ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL
    DO UPDATE SET updated_at = now()
    RETURNING id, nome INTO v_cassetta_id, v_nome;
    PERFORM 1 FROM cassette WHERE id = v_cassetta_id FOR UPDATE;
  ELSE
    RETURN json_build_object('esito','cassetta_non_trovata');
  END IF;

  -- (2) auto-riparazione: riga viva che punta a lavoro chiuso/soft-deleted → chiudila
  SELECT cl.lavoro_id, l.stato, l.deleted_at INTO v_occupante, v_stato_occ, v_del_occ
  FROM cassette_lavori cl JOIN lavori l ON l.id = cl.lavoro_id
  WHERE cl.cassetta_id = v_cassetta_id AND cl.liberato_at IS NULL;
  IF v_occupante IS NOT NULL AND (v_stato_occ IN ('consegnato','annullato') OR v_del_occ IS NOT NULL) THEN
    UPDATE cassette_lavori SET liberato_at = now(), liberato_per = 'consegna'
    WHERE cassetta_id = v_cassetta_id AND liberato_at IS NULL;
    UPDATE lavori SET numero_cassetta = NULL WHERE id = v_occupante AND laboratorio_id = p_lab;
    v_occupante := NULL;
  END IF;

  -- (3) chiudi l'eventuale riga viva del lavoro (spostamento)
  UPDATE cassette_lavori SET liberato_at = now(), liberato_per = 'spostamento'
  WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND liberato_at IS NULL;

  -- (4) apri la riga viva; l'unico parziale arbitra la race
  BEGIN
    INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id)
    VALUES (p_lab, v_cassetta_id, p_lavoro);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);
  END;

  -- (5) denormalizzazione
  UPDATE lavori SET numero_cassetta = v_nome WHERE id = p_lavoro AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','ok','cassetta_id', v_cassetta_id,'nome', v_nome);
END $$;

CREATE FUNCTION public.cassetta_rinomina_atomica(p_lab uuid, p_cassetta_id uuid, p_nome text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_lavoro uuid;
BEGIN
  IF p_nome IS NULL OR char_length(btrim(p_nome)) NOT BETWEEN 1 AND 20 THEN
    RETURN json_build_object('esito','nome_non_valido');
  END IF;
  PERFORM 1 FROM cassette WHERE id = p_cassetta_id AND laboratorio_id = p_lab
    AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','cassetta_non_trovata'); END IF;
  BEGIN
    UPDATE cassette SET nome = btrim(p_nome), updated_at = now() WHERE id = p_cassetta_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','nome_occupato');
  END;
  SELECT lavoro_id INTO v_lavoro FROM cassette_lavori
  WHERE cassetta_id = p_cassetta_id AND liberato_at IS NULL;
  IF v_lavoro IS NOT NULL THEN
    UPDATE lavori SET numero_cassetta = btrim(p_nome) WHERE id = v_lavoro AND laboratorio_id = p_lab;
  END IF;
  RETURN json_build_object('esito','ok');
END $$;

CREATE FUNCTION public.cassetta_elimina_atomica(p_lab uuid, p_cassetta_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM 1 FROM cassette WHERE id = p_cassetta_id AND laboratorio_id = p_lab
    AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','cassetta_non_trovata'); END IF;
  PERFORM 1 FROM cassette_lavori WHERE cassetta_id = p_cassetta_id AND liberato_at IS NULL;
  IF FOUND THEN RETURN json_build_object('esito','occupata'); END IF;
  UPDATE cassette SET deleted_at = now(), updated_at = now() WHERE id = p_cassetta_id;
  RETURN json_build_object('esito','ok');
END $$;

CREATE FUNCTION public.cassette_riordina(p_lab uuid, p_ordine uuid[])
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_n int;
BEGIN
  IF p_ordine IS NULL OR array_length(p_ordine,1) IS NULL THEN
    RETURN json_build_object('esito','ordine_non_valido');
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_ordine) x) <> array_length(p_ordine,1) THEN
    RETURN json_build_object('esito','ordine_non_valido');  -- duplicati
  END IF;
  SELECT count(*) INTO v_n FROM cassette
  WHERE id = ANY(p_ordine) AND laboratorio_id = p_lab AND deleted_at IS NULL;
  IF v_n <> array_length(p_ordine,1) THEN
    RETURN json_build_object('esito','ordine_non_valido');  -- id estranei/morti
  END IF;
  UPDATE cassette c SET posizione = o.ord - 1, updated_at = now()
  FROM unnest(p_ordine) WITH ORDINALITY o(id, ord)
  WHERE c.id = o.id AND c.laboratorio_id = p_lab;
  -- politica tollerante: le vive non elencate scivolano in coda, ordine relativo conservato
  UPDATE cassette c SET posizione = array_length(p_ordine,1) + r.rk - 1, updated_at = now()
  FROM (SELECT id, row_number() OVER (ORDER BY posizione, created_at, id) rk
        FROM cassette WHERE laboratorio_id = p_lab AND deleted_at IS NULL
          AND NOT (id = ANY(p_ordine))) r
  WHERE c.id = r.id;
  RETURN json_build_object('esito','ok');
END $$;

CREATE FUNCTION public.cassetta_riassegna_post_annullo(p_lab uuid, p_lavoro uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_cassetta uuid; v_nome text;
BEGIN
  SELECT cl.cassetta_id, c.nome INTO v_cassetta, v_nome
  FROM cassette_lavori cl JOIN cassette c ON c.id = cl.cassetta_id
  WHERE cl.lavoro_id = p_lavoro AND cl.laboratorio_id = p_lab
    AND cl.liberato_per = 'consegna' AND c.deleted_at IS NULL
  ORDER BY cl.liberato_at DESC LIMIT 1;
  IF v_cassetta IS NULL THEN RETURN json_build_object('esito','niente_da_riassegnare'); END IF;
  BEGIN
    INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id)
    VALUES (p_lab, v_cassetta, p_lavoro);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','occupata_nel_frattempo','nome', v_nome);
  END;
  UPDATE lavori SET numero_cassetta = v_nome WHERE id = p_lavoro AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','riassegnata','nome', v_nome);
END $$;

CREATE FUNCTION public.cassetta_trasferisci_rifacimento(p_lab uuid, p_lavoro_vecchio uuid, p_lavoro_nuovo uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_cassetta uuid; v_nome text;
BEGIN
  -- D-10 (ratificata 21/07): al rifacimento la cassetta SI TRASFERISCE al lavoro nuovo
  -- (fisicamente il caso resta nella stessa cassetta). La RPC 007 crea_rifacimento_atomico NON si tocca.
  PERFORM 1 FROM lavori WHERE id = p_lavoro_nuovo AND laboratorio_id = p_lab AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN json_build_object('esito','lavoro_non_valido'); END IF;
  SELECT cl.cassetta_id, c.nome INTO v_cassetta, v_nome
  FROM cassette_lavori cl JOIN cassette c ON c.id = cl.cassetta_id
  WHERE cl.lavoro_id = p_lavoro_vecchio AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL
    AND c.deleted_at IS NULL
  FOR UPDATE OF cl;
  IF v_cassetta IS NULL THEN RETURN json_build_object('esito','niente_da_trasferire'); END IF;
  -- chiudi la riga viva del vecchio (motivo 'rifacimento') + azzera denorm
  UPDATE cassette_lavori SET liberato_at = now(), liberato_per = 'rifacimento'
  WHERE lavoro_id = p_lavoro_vecchio AND laboratorio_id = p_lab AND liberato_at IS NULL;
  UPDATE lavori SET numero_cassetta = NULL WHERE id = p_lavoro_vecchio AND laboratorio_id = p_lab;
  -- apri la riga viva sul nuovo (unique parziale arbitra: improbabile qui, il nuovo è appena creato)
  BEGIN
    INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id)
    VALUES (p_lab, v_cassetta, p_lavoro_nuovo);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);
  END;
  UPDATE lavori SET numero_cassetta = v_nome WHERE id = p_lavoro_nuovo AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','trasferita','nome', v_nome);
END $$;

CREATE FUNCTION public.utente_set_nav_pref(p_user uuid, p_chiave text, p_valore jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- allowlist chiavi + validazione valore per chiave (merge jsonb atomico, niente RMW raceable)
  IF p_chiave = 'home' THEN
    IF p_valore NOT IN ('"due_stanze"'::jsonb, '"pile"'::jsonb, '"parete"'::jsonb) THEN
      RAISE EXCEPTION 'home pref non valida';
    END IF;
  ELSIF p_chiave = 'parete_intro_vista' THEN
    IF p_valore <> 'true'::jsonb THEN
      RAISE EXCEPTION 'parete_intro_vista accetta solo true';
    END IF;
  ELSE
    RAISE EXCEPTION 'chiave nav_preferences non ammessa: %', p_chiave;
  END IF;
  UPDATE utenti SET nav_preferences =
    coalesce(nav_preferences,'{}'::jsonb) || jsonb_build_object(p_chiave, p_valore)
  WHERE id = p_user;
END $$;

-- GRANT/REVOKE su tutte le RPC
REVOKE EXECUTE ON FUNCTION public.cassetta_libera_atomica(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_assegna_atomica(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_rinomina_atomica(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_elimina_atomica(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassette_riordina(uuid,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_riassegna_post_annullo(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_trasferisci_rifacimento(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.utente_set_nav_pref(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cassetta_libera_atomica(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_assegna_atomica(uuid,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_rinomina_atomica(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_elimina_atomica(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassette_riordina(uuid,uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_riassegna_post_annullo(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_trasferisci_rifacimento(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.utente_set_nav_pref(uuid,text,jsonb) TO service_role;

-- ============ BACKFILL (idempotente, ri-eseguibile) ============
-- Cassette dai nomi distinti dei lavori APERTI; natural sort per la serie C.
WITH aperti AS (
  SELECT laboratorio_id, btrim(numero_cassetta) AS nome, max(updated_at) AS ult
  FROM lavori
  WHERE numero_cassetta IS NOT NULL AND btrim(numero_cassetta) <> ''
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato')
  GROUP BY laboratorio_id, btrim(numero_cassetta)
), norm AS (
  SELECT laboratorio_id, left(nome, 20) AS nome,
         row_number() OVER (
           PARTITION BY laboratorio_id
           ORDER BY CASE WHEN left(nome,20) ~ '^[Cc][0-9]+$'
                         THEN (substring(left(nome,20) from 2))::bigint END NULLS LAST,
                    lower(left(nome,20))
         ) - 1 AS pos
  FROM aperti
)
INSERT INTO cassette (laboratorio_id, nome, colore, posizione)
SELECT DISTINCT ON (laboratorio_id, lower(nome)) laboratorio_id, nome, 'bianca', pos
FROM norm
ORDER BY laboratorio_id, lower(nome), pos
ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL DO NOTHING;

-- Riga viva per il lavoro vincente (updated_at più recente per targa); idempotente.
WITH candidati AS (
  SELECT l.id AS lavoro_id, l.laboratorio_id, c.id AS cassetta_id, l.updated_at,
         row_number() OVER (PARTITION BY c.id ORDER BY l.updated_at DESC) AS rk
  FROM lavori l
  JOIN cassette c ON c.laboratorio_id = l.laboratorio_id
    AND lower(btrim(l.numero_cassetta)) = lower(btrim(c.nome)) AND c.deleted_at IS NULL
  WHERE l.numero_cassetta IS NOT NULL AND btrim(l.numero_cassetta) <> ''
    AND l.deleted_at IS NULL AND l.stato NOT IN ('consegnato','annullato')
)
INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id, assegnato_at)
SELECT laboratorio_id, cassetta_id, lavoro_id, updated_at FROM candidati
WHERE rk = 1
  AND NOT EXISTS (SELECT 1 FROM cassette_lavori v WHERE v.cassetta_id = candidati.cassetta_id AND v.liberato_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM cassette_lavori v WHERE v.lavoro_id  = candidati.lavoro_id  AND v.liberato_at IS NULL);

-- Perdenti delle collisioni → numero_cassetta NULL (card e parete raccontano la stessa cosa)
UPDATE lavori l SET numero_cassetta = NULL
WHERE l.numero_cassetta IS NOT NULL AND l.deleted_at IS NULL
  AND l.stato NOT IN ('consegnato','annullato')
  AND NOT EXISTS (SELECT 1 FROM cassette_lavori v WHERE v.lavoro_id = l.id AND v.liberato_at IS NULL);
```

- [ ] **Step 2: Lint di coerenza a freddo** — rileggi il file cercando: ogni `CREATE FUNCTION` ha `SECURITY DEFINER` + `SET search_path` (tranne il trigger guard che non è SECURITY DEFINER, corretto così); ogni RPC ha REVOKE+GRANT; i CHECK combaciano con la spec §4.
- [ ] **Step 3: 🛑 GATE — chiedi a Francesco conferma per l'apply** (`npx supabase db push` sul progetto `iagibumwjstnveqpjbwq`). NON procedere senza ok esplicito.
- [ ] **Step 4: Dopo l'apply — FASE 6b**

Run: `npx supabase gen types typescript --project-id iagibumwjstnveqpjbwq > src/types/database.types.ts` (rimuovi eventuale riga CLI in coda) poi `npx tsc --noEmit`
Expected: tsc 0 errori; `database.types.ts` contiene `cassette`, `cassette_lavori` e le 7 RPC.

- [ ] **Step 5: Verifica read-only su DB live** — `SELECT count(*) FROM cassette; SELECT count(*) FROM cassette_lavori;` via MCP/SQL editor: numeri coerenti col backfill atteso (nomi distinti dei lavori aperti con cassetta). Verifica che 2 lavori aperti con la stessa targa abbiano prodotto 1 cassetta + 1 riga viva + 1 `numero_cassetta` NULL.
- [ ] **Step 6: Commit** — `git add supabase/migrations/20260721090000_parete_cassette.sql src/types/database.types.ts && git commit -m "feat(cassette): migration parete cassette + storico + RPC + backfill"`

---

### Task 2: Mappa miniature (dominio puro)

**Files:**
- Create: `src/lib/domain/miniature-lavoro.ts`
- Test: `src/lib/domain/__tests__/miniature-lavoro.test.ts`

**Interfaces:**
- Consumes: `TIPI_LAVORO`, `cercaTipiLavoro`, `TipoDispositivo` da `src/lib/domain/tipi-lavoro.ts`.
- Produces: `type MiniaturaId = 'corona'|'provvisorio'|'impianto'|'ponte'|'totale'|'scheletrato'|'allineatore'|'mascherina'|'riparazione'|'generica'` e `miniaturaPerLavoro(descrizione: string | null, tipoDispositivo: string | null): MiniaturaId`.

- [ ] **Step 1: Test RED**

```typescript
import { describe, expect, it } from 'vitest'
import { miniaturaPerLavoro } from '../miniature-lavoro'

describe('miniaturaPerLavoro', () => {
  it('risolve il livello granulare dalla descrizione (aliases)', () => {
    expect(miniaturaPerLavoro('Corona su impianto', 'implantologia')).toBe('impianto')
    expect(miniaturaPerLavoro('Ponte', 'protesi_fissa')).toBe('ponte')
    expect(miniaturaPerLavoro('Provvisorio in resina', 'provvisorio')).toBe('provvisorio')
  })
  it('cade sul macro quando la descrizione non matcha', () => {
    expect(miniaturaPerLavoro('Lavoro strano', 'protesi_mobile')).toBe('totale')
    expect(miniaturaPerLavoro(null, 'scheletrato')).toBe('scheletrato')
    expect(miniaturaPerLavoro(null, 'ortodonzia')).toBe('allineatore')
    expect(miniaturaPerLavoro(null, 'bite_splint')).toBe('mascherina')
    expect(miniaturaPerLavoro(null, 'riparazione')).toBe('riparazione')
    expect(miniaturaPerLavoro(null, 'cad_cam')).toBe('corona')
  })
  it('fallback generico su macro sconosciuto o assente', () => {
    expect(miniaturaPerLavoro(null, null)).toBe('generica')
    expect(miniaturaPerLavoro(null, 'altro')).toBe('generica')
    expect(miniaturaPerLavoro(null, 'boh')).toBe('generica')
  })
})
```

- [ ] **Step 2: RED** — Run: `npx vitest run src/lib/domain/__tests__/miniature-lavoro.test.ts` → FAIL (modulo inesistente).
- [ ] **Step 3: Implementazione**

```typescript
// src/lib/domain/miniature-lavoro.ts
// Risoluzione miniatura a 3 livelli (spec §8): granulare → macro → generica.
import { cercaTipiLavoro } from './tipi-lavoro'

export type MiniaturaId =
  | 'corona' | 'provvisorio' | 'impianto' | 'ponte' | 'totale' | 'scheletrato'
  | 'allineatore' | 'mascherina' | 'riparazione' | 'generica'

// Livello 1: id granulare TIPI_LAVORO → miniatura (solo dove il granulare
// racconta più del macro; il resto cade sul macro).
const GRANULARE: Record<string, MiniaturaId> = {
  corona_zirconia: 'corona', corona_disilicato: 'corona', corona_metallo_ceramica: 'corona',
  ponte: 'ponte', ponte_zirconia: 'ponte', ponte_metallo_ceramica: 'ponte',
  corona_su_impianto: 'impianto', ponte_su_impianti: 'impianto', toronto: 'impianto',
  protesi_totale: 'totale', protesi_parziale: 'totale',
  scheletrato: 'scheletrato',
  provvisorio_resina: 'provvisorio', provvisorio: 'provvisorio',
}
// NB: allineare le chiavi agli id REALI di TIPI_LAVORO (tipi-lavoro.ts:31-70)
// in fase di implementazione; il test granulare usa le label del wizard.

const MACRO: Record<string, MiniaturaId> = {
  protesi_fissa: 'corona', protesi_mobile: 'totale', implantologia: 'impianto',
  cad_cam: 'corona', scheletrato: 'scheletrato', ortodonzia: 'allineatore',
  provvisorio: 'provvisorio', riparazione: 'riparazione', bite_splint: 'mascherina',
  altro: 'generica',
}

export function miniaturaPerLavoro(descrizione: string | null, tipoDispositivo: string | null): MiniaturaId {
  if (descrizione) {
    const match = cercaTipiLavoro(descrizione)[0]
    if (match && GRANULARE[match.id]) return GRANULARE[match.id]
  }
  if (tipoDispositivo && MACRO[tipoDispositivo]) return MACRO[tipoDispositivo]
  return 'generica'
}
```

- [ ] **Step 4: GREEN** — Run: `npx vitest run src/lib/domain/__tests__/miniature-lavoro.test.ts` → PASS. Se il livello granulare non matcha per differenze di label reali, correggi le chiavi di `GRANULARE` sugli id veri di `TIPI_LAVORO` (MAI ammorbidire i test sul fallback).
- [ ] **Step 5: Commit** — `git commit -m "feat(cassette): mappa miniatura per tipo di lavoro (3 livelli)"`

---

### Task 3: Lib parco — query parete, suggerite «dal parco», auto-riparazione

> **⚠️ CORREZIONI 21/07 — prevalgono sul testo del task qui sotto.**
> 1. **Le chip NON si ordinano più per `cassette.updated_at`** (decisione R-4.2, ratificata). Quel
>    campo viene bump-ato dal get-or-create e mente sull'uso recente. Si ordina per
>    **`max(cassette_lavori.assegnato_at)`** — la verità sull'uso, con l'indice già pronto
>    (`cassette_lavori_lab_cassetta_idx`). Firma nuova:
>    `derivaCassetteSuggerite(cassette: {id, nome, ultimoUso: string | null}[], occupate: Set<string>)`;
>    `getCassetteSuggerite` aggrega `cassette_lavori` per `cassetta_id`.
> 2. **`getParete` non deve chiamare la libera con `p_motivo:'consegna'` fisso.** È lo stesso difetto
>    che R-4.1 ha corretto dentro la RPC: una riga chiusa con `'consegna'` per un lavoro **annullato**
>    resta eleggibile alla riassegnazione. `deriveParete` già distingue lo stato per calcolare
>    `daRiparare`: far viaggiare il motivo insieme all'id costa una riga. Se scegli di non farlo,
>    scrivi perché nel report.
> 3. Test in `tests/unit/`, non in `src/lib/cassette/__tests__/` (D-O1).

**Files:**
- Create: `src/lib/cassette/parco.ts`
- Create: `src/lib/cassette/parco-shared.ts` (logica pura testabile)
- Modify: `src/lib/lavori/cassette-shared.ts` (riscrittura `derivaCassetteSuggerite`)
- Modify: `src/lib/lavori/cassette.ts` (`getCassetteSuggerite` legge dal parco)
- Test: `src/lib/cassette/__tests__/parco-shared.test.ts`, aggiorna `src/lib/lavori/__tests__/cassette-shared.test.ts` (se esiste; altrimenti crea)

**Interfaces:**
- Produces:
  - `type CassettaParete = { id: string; nome: string; colore: string; posizione: number; lavoro: { id: string; numero: string; dentista: string; paziente: string; tipoDispositivo: string | null; descrizione: string | null } | null }` (`numero` = `lavori.numero_lavoro`, che è **string** nel DB — come `LavoroPila.numero`)
  - `getParete(svc, labId): Promise<CassettaParete[]>` — cassette vive ordinate `posizione, created_at, id`, join riga viva→lavoro; **auto-riparazione**: righe vive con lavoro chiuso/soft-deleted → fire-and-forget `svc.rpc('cassetta_libera_atomica', {p_lab, p_lavoro, p_motivo:'consegna'})` e resa come libera già in questa risposta.
  - `deriveParete(cassette, righeVive, lavori): { parete: CassettaParete[]; daRiparare: string[] }` (pura, in parco-shared).
  - `derivaCassetteSuggerite(cassette: {id,nome,updated_at}[], occupateIds: Set<string>): {id,nome}[]` — libere, per uso recente, max 6.

- [ ] **Step 1: Test RED (parco-shared)**

```typescript
import { describe, expect, it } from 'vitest'
import { deriveParete } from '../parco-shared'

const cassetta = (id: string, nome: string, pos: number) =>
  ({ id, nome, colore: 'bianca', posizione: pos, created_at: '2026-07-21T00:00:00Z' })

describe('deriveParete', () => {
  it('unisce cassette e occupazioni vive, ordina per posizione', () => {
    const out = deriveParete(
      [cassetta('c2', 'C2', 1), cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'in_lavorazione', deleted_at: null,
         descrizione: 'Corona zirconia', tipo_dispositivo: 'protesi_fissa',
         clienti: { studio_nome: 'Bianchi', nome: null, cognome: null },
         pazienti: { codice_paziente: 'MAR-42' } }],
    )
    expect(out.parete.map(c => c.nome)).toEqual(['C1', 'C2'])
    expect(out.parete[0].lavoro?.numero).toBe('144')
    expect(out.parete[1].lavoro).toBeNull()
    expect(out.daRiparare).toEqual([])
  })
  it('segnala da riparare la riga viva con lavoro chiuso e la rende libera', () => {
    const out = deriveParete(
      [cassetta('c1', 'C1', 0)],
      [{ cassetta_id: 'c1', lavoro_id: 'l1' }],
      [{ id: 'l1', numero_lavoro: '144', stato: 'consegnato', deleted_at: null,
         descrizione: null, tipo_dispositivo: null, clienti: null, pazienti: null }],
    )
    expect(out.parete[0].lavoro).toBeNull()
    expect(out.daRiparare).toEqual(['l1'])
  })
})
```

- [ ] **Step 2: RED** — `npx vitest run src/lib/cassette/__tests__/parco-shared.test.ts` → FAIL.
- [ ] **Step 3: Implementa `parco-shared.ts` + `parco.ts`**

```typescript
// src/lib/cassette/parco-shared.ts — logica pura della parete (spec §5)
export type CassettaParete = {
  id: string; nome: string; colore: string; posizione: number
  lavoro: { id: string; numero: string; dentista: string; paziente: string
            tipoDispositivo: string | null; descrizione: string | null } | null
}
type RawCassetta = { id: string; nome: string; colore: string; posizione: number; created_at: string }
type RawViva = { cassetta_id: string; lavoro_id: string }
type RawLavoro = {
  id: string; numero_lavoro: string; stato: string; deleted_at: string | null
  descrizione: string | null; tipo_dispositivo: string | null
  clienti: { studio_nome: string | null; nome: string | null; cognome: string | null } | null
  pazienti: { codice_paziente: string | null } | null
}
const CHIUSI = new Set(['consegnato', 'annullato'])

export function deriveParete(cassette: RawCassetta[], vive: RawViva[], lavori: RawLavoro[]) {
  const perLavoro = new Map(lavori.map(l => [l.id, l]))
  const perCassetta = new Map(vive.map(v => [v.cassetta_id, v.lavoro_id]))
  const daRiparare: string[] = []
  const parete = [...cassette]
    .sort((a, b) => a.posizione - b.posizione || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
    .map(c => {
      const lavoroId = perCassetta.get(c.id)
      const l = lavoroId ? perLavoro.get(lavoroId) : undefined
      if (lavoroId && (!l || CHIUSI.has(l.stato) || l.deleted_at)) {
        daRiparare.push(lavoroId)
        return { id: c.id, nome: c.nome, colore: c.colore, posizione: c.posizione, lavoro: null }
      }
      return {
        id: c.id, nome: c.nome, colore: c.colore, posizione: c.posizione,
        lavoro: l ? {
          id: l.id, numero: l.numero_lavoro,
          dentista: l.clienti?.studio_nome ?? (`${l.clienti?.nome ?? ''} ${l.clienti?.cognome ?? ''}`.trim() || '—'),
          paziente: l.pazienti?.codice_paziente ?? '—',
          tipoDispositivo: l.tipo_dispositivo, descrizione: l.descrizione,
        } : null,
      }
    })
  return { parete, daRiparare }
}
```

```typescript
// src/lib/cassette/parco.ts — lettura server con auto-riparazione (spec §5, fail-soft §9.1b)
import type { SupabaseClient } from '@supabase/supabase-js'
import { deriveParete, type CassettaParete } from './parco-shared'

export async function getParete(svc: SupabaseClient, labId: string): Promise<CassettaParete[]> {
  const [{ data: cassette }, { data: vive }] = await Promise.all([
    svc.from('cassette').select('id, nome, colore, posizione, created_at')
      .eq('laboratorio_id', labId).is('deleted_at', null),
    svc.from('cassette_lavori').select('cassetta_id, lavoro_id')
      .eq('laboratorio_id', labId).is('liberato_at', null),
  ])
  const ids = (vive ?? []).map(v => v.lavoro_id)
  const { data: lavori } = ids.length
    ? await svc.from('lavori')
        .select('id, numero_lavoro, stato, deleted_at, descrizione, tipo_dispositivo, clienti(studio_nome, nome, cognome), pazienti(codice_paziente)')
        .eq('laboratorio_id', labId).in('id', ids)
    : { data: [] }
  const { parete, daRiparare } = deriveParete(cassette ?? [], vive ?? [], (lavori ?? []) as never)
  for (const lavoroId of daRiparare) {
    // fire-and-forget: la parete non aspetta la riparazione
    void svc.rpc('cassetta_libera_atomica', { p_lab: labId, p_lavoro: lavoroId, p_motivo: 'consegna' })
  }
  return parete
}
```

- [ ] **Step 4: Riscrivi `derivaCassetteSuggerite` (chips «dal parco»)** in `src/lib/lavori/cassette-shared.ts`: firma nuova `derivaCassetteSuggerite(cassette: {id: string; nome: string; updated_at: string}[], occupate: Set<string>): {id: string; nome: string}[]` — filtra `!occupate.has(id)`, ordina per `updated_at` desc, slice 6. Aggiorna `getCassetteSuggerite(svc, labId)` in `src/lib/lavori/cassette.ts`: 2 query (`cassette` vive; `cassette_lavori` vive) invece della scansione di `lavori`. Aggiorna/crea i test dei due file sul nuovo contratto (libere-only, recenti, max 6, il campo `id` ora presente).
- [ ] **Step 5: GREEN** — `npx vitest run src/lib/cassette src/lib/lavori` → PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(cassette): lib parco (parete, auto-riparazione, suggerite dal parco)"`

---

### Task 4: API `/api/cassette` (POST) + `/api/cassette/[id]` (PATCH, DELETE)

> **⚠️ CORREZIONI 21/07 (riscritte dopo il blocco) — prevalgono sul testo del task qui sotto.**
>
> **La versione precedente di questa nota affermava il falso e ha reso il task non implementabile.**
> Diceva: «il `PATCH` colore continua a fare `UPDATE` diretto sulla tabella: è lecito perché il
> service client bypassa RLS **e i REVOKE**». **Falso:** il service client bypassa **RLS**, non i
> **GRANT/REVOKE di tabella**. `20260721090000_parete_cassette.sql:148-150` fa
> `REVOKE ALL ON cassette, cassette_lavori FROM anon, authenticated, service_role` seguito da
> `GRANT SELECT … TO authenticated, service_role`: `service_role` ha **solo SELECT**. Un `.insert()`
> o `.update()` diretto ritorna `42501 permission denied for table cassette` — verificato in
> container, `.superpowers/sdd/task-4a-report.md` §2.3 prova C5.
>
> 1. **Niente scritture dirette su `cassette`: ogni scrittura passa da una RPC.** La migration
>    `20260721090300_cassette_crea_colore.sql` (Task 4a, panel 3× unanime + ratifica di Francesco)
>    ha aggiunto le due che mancavano: `cassetta_crea_atomica(p_lab, p_nome, p_colore)` e
>    `cassetta_imposta_colore_atomica(p_lab, p_cassetta_id, p_colore)`.
> 2. **Il nome automatico `C{maxN+1}` NON si calcola più in route: vive dentro `cassetta_crea_atomica`.**
>    Allocare un nome libero sotto un indice unico parziale è un'operazione di concorrenza e va dove
>    vive l'indice; un read-modify-write attraverso la rete non è rendibile corretto in route.
> 3. **`cassetta_imposta_colore_atomica` NON tocca `updated_at`** (decisione R-4.2: quel campo mentiva
>    sull'uso recente e l'ordinamento delle chip è stato spostato su `max(cassette_lavori.assegnato_at)`).
> 4. **Il `PATCH` accetta ESATTAMENTE UN campo per chiamata** — `{nome}` **oppure** `{colore}`, mai
>    entrambi; entrambi presenti o nessuno dei due → **422**. Decisione di Francesco del 21/07: una
>    chiamata = una RPC, e il vecchio passo doppio non atomico sparisce. (Il design system si chiama
>    «una cosa alla volta».)
> 5. **Il colore si normalizza in route** (`.toUpperCase()` sull'hex) **prima** di chiamare la RPC:
>    il `CHECK` di tabella vuole `A-F` maiuscole, quindi `#ff00aa` minuscolo farebbe `RAISE` (→ 500).
>    È il contratto R-5: il colore lo valida la route, la RPC solleva solo se la route ha sbagliato.
> 6. Il mapping `nome_non_valido → 422` **resta valido**: quell'esito esiste in
>    `cassetta_rinomina_atomica` e in `cassetta_crea_atomica` (è stato tolto solo da `assegna`).
> 7. **Tutte** le chiamate RPC vanno avvolte in `callRpcWithRetry` (`src/lib/supabase/rpc-retry.ts`,
>    retry sul SQLSTATE 40P01), le due nuove comprese. **Test in `tests/unit/`** (D-O1).
> 8bis. **Tre fatti osservati sul DB LIVE dopo l'apply di `090300`** (smoke via `/rest/v1/rpc/`,
>    `task-4a-report.md` Appendice 2) — non deducibili da un collaudo in container:
>    - **Tutti gli esiti tornano HTTP 200.** La route deve mappare il **payload** (`data.esito`),
>      **mai** lo status della chiamata RPC.
>    - **La `RAISE` del colore torna HTTP 400 con `P0001`.** Quindi `normalizzaColore()` **deve**
>      fare `.toUpperCase()` sull'hex **prima** di chiamare: un `#ff00aa` minuscolo diventa un 400,
>      non un esito. (È il contratto R-5 visto dal lato pratico.)
>    - **`anon` riceve 401**, non 403 né 404.
> 8. **`nome_occupato` quando il nome è AUTOMATICO non è un 409.** Se `body.nome` è **assente**,
>    l'utente non ha digitato alcun nome: rispondergli «nome occupato» sarebbe una bugia. Il
>    fallthrough dei 5 giri interni alla RPC **è raggiungibile** — misurato in collaudo: 0 su 210 fino
>    a 4 sessioni concorrenti, **0,75% a 8, 2,6% a 16** (`task-4a-report.md` §4 riserva 1). In quel
>    caso la route **ritenta la RPC una volta**. Con `body.nome` **presente**, invece,
>    `nome_occupato → 409` è la risposta giusta.

**Files:**
- Create: `src/app/api/cassette/route.ts`
- Create: `src/app/api/cassette/[id]/route.ts`
- Test: `tests/unit/cassette-route.test.ts`, `tests/unit/cassette-id-route.test.ts` (convenzione reale del repo, cfr. `cicli-route.test.ts` / `cicli-id-route.test.ts`; **non** `src/app/api/**/__tests__/`, che `vitest.config.ts` non scopre)

**Interfaces:**
- Consumes: RPC del Task 1 + le due del Task 4a; `callRpcWithRetry` da `src/lib/supabase/rpc-retry.ts`; pattern route `src/app/api/cicli/route.ts` e `src/app/api/cicli/[id]/route.ts` (CSRF/context/guard); `assertLabOperativo` da `src/lib/supabase/lab-guard.ts`. Import reali: `@/lib/utils/csrf` e `@/lib/supabase/server-service` (`@/lib/security/csrf` e `@/lib/supabase/service` **non esistono**).
- Produces — **una RPC per operazione**, esiti dalla fonte di verità (il blocco degli esiti in testa a ciascuna funzione nelle migration):

| Endpoint | RPC | Esiti → HTTP |
|---|---|---|
| `POST /api/cassette {nome?, colore?}` | `cassetta_crea_atomica(p_lab, p_nome, p_colore)` | `ok` → **201** `{cassetta}` · `nome_occupato` → **409** (ma vedi correzione 8 se il nome è automatico) · `nome_non_valido` → **422** |
| `PATCH /api/cassette/[id] {nome}` | `cassetta_rinomina_atomica(p_lab, p_cassetta_id, p_nome)` | `ok` → **200** · `nome_occupato` → **409** · `cassetta_non_trovata` → **404** · `nome_non_valido` → **422** |
| `PATCH /api/cassette/[id] {colore}` | `cassetta_imposta_colore_atomica(p_lab, p_cassetta_id, p_colore)` | `ok` → **200** · `cassetta_non_trovata` → **404** |
| `DELETE /api/cassette/[id]` | `cassetta_elimina_atomica(p_lab, p_cassetta_id)` | `ok` → **200** · `occupata` → **409** · `cassetta_non_trovata` → **404** |

  Più, su tutti: 401 senza contesto · 403 cross-origin, lab mancante o guard · **422 colore non valido** (validato in route, mai lasciato arrivare alla RPC) · **422 se il PATCH porta entrambi i campi o nessuno**.

- [ ] **Step 1: Test RED** — mock del service client col pattern reale del repo (`tests/unit/helpers/supabase-chain-mock.ts`, `createChain`; `vi.mock('server-only')` è già in `tests/setup.ts`). Casi minimi:

```typescript
// tests/unit/cassette-route.test.ts + tests/unit/cassette-id-route.test.ts — scheletro casi
// 1. POST senza nome → chiama rpc('cassetta_crea_atomica', {p_lab, p_nome: null, p_colore: 'bianca'}), 201
//    (il nome automatico C{n} lo calcola la RPC: la route NON legge più le cassette vive)
// 2. POST {nome:'Banco Ciro', colore:'#ff00aa'} → hex NORMALIZZATO '#FF00AA' nel payload della RPC, 201
// 3. POST colore 'fucsia' → 422 in route, la RPC NON viene chiamata (né slug né hex)
// 4. POST {nome:'C7'} con esito {esito:'nome_occupato'} → 409
// 4b. POST SENZA nome con esito {esito:'nome_occupato'} → la route RITENTA una volta (correzione 8);
//     se anche il secondo tentativo torna 'nome_occupato' → 409. Asserisci DUE chiamate alla RPC.
// 5. PATCH {nome} → rpc('cassetta_rinomina_atomica'); esito 'nome_occupato' → 409
// 5b. PATCH {colore} → rpc('cassetta_imposta_colore_atomica'); 'cassetta_non_trovata' → 404
// 5c. PATCH {nome, colore} insieme → 422, nessuna RPC chiamata. Idem PATCH {} → 422.
// 6. DELETE → rpc('cassetta_elimina_atomica'); esito 'occupata' → 409; 'ok' → 200
// 7. cross-origin (isSameOrigin false) → 403; context null → 401; lab blacklist → assertLabOperativo → 403
// 8. p_lab è SEMPRE context.laboratorioId, mai un valore del body: assertalo sugli argomenti della RPC
```

- [ ] **Step 2: RED** — `npx vitest run tests/unit/cassette-route.test.ts tests/unit/cassette-id-route.test.ts` → FAIL (guarda l'output: «No test files found» **non** è un RED).
- [ ] **Step 3: Implementa `route.ts`**

```typescript
// src/app/api/cassette/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { isSameOrigin } from '@/lib/utils/csrf'
import { getFreshLabContext } from '@/lib/supabase/lab-context'
import { assertLabOperativo } from '@/lib/supabase/lab-guard'
import { getServiceClient } from '@/lib/supabase/server-service'
import { callRpcWithRetry } from '@/lib/supabase/rpc-retry'

const COLORI = new Set(['bianca', 'azzurra', 'rossa', 'blu', 'verde', 'grigia'])
const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** Normalizza in route (R-5): l'hex va MAIUSCOLO perché il CHECK di tabella vuole A-F.
 *  Un colore non normalizzato che arriva alla RPC fa RAISE, cioè un 500 — non un esito. */
export function normalizzaColore(input: unknown): string | null {
  if (input == null) return 'bianca'
  if (typeof input !== 'string') return null
  if (COLORI.has(input)) return input
  if (HEX_RE.test(input)) return input.toUpperCase()
  return null
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'origin' }, { status: 403 })
  const context = await getFreshLabContext()
  if (!context) return NextResponse.json({ error: 'auth' }, { status: 401 })
  if (!context.laboratorioId) return NextResponse.json({ error: 'lab' }, { status: 403 })
  const guard = assertLabOperativo(context, 'POST')
  if (guard) return guard

  const body = await req.json().catch(() => ({}))
  const colore = normalizzaColore(body.colore)
  if (!colore) return NextResponse.json({ errore: 'colore_non_valido' }, { status: 422 })

  const nome: string | null = typeof body.nome === 'string' ? body.nome.trim() : null
  if (nome !== null && (nome.length < 1 || nome.length > 20))
    return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })

  const svc = getServiceClient()
  const chiama = () => svc.rpc('cassetta_crea_atomica', {
    p_lab: context.laboratorioId, p_nome: nome, p_colore: colore,
  })

  let { data, error } = await callRpcWithRetry(chiama)
  // Correzione 8: col nome AUTOMATICO, `nome_occupato` non è colpa dell'utente — non ha digitato
  // niente. È il fallthrough dei 5 giri interni alla RPC, misurato al 2,6% con 16 sessioni
  // concorrenti. Si ritenta una volta; solo se ricapita diventa un 409.
  if (!error && nome === null && data?.esito === 'nome_occupato') {
    ({ data, error } = await callRpcWithRetry(chiama))
  }
  if (error) return NextResponse.json({ errore: 'creazione_fallita' }, { status: 500 })
  if (data.esito === 'nome_occupato')
    return NextResponse.json({ errore: 'nome_occupato', nome: data.nome }, { status: 409 })
  if (data.esito === 'nome_non_valido')
    return NextResponse.json({ errore: 'nome_non_valido' }, { status: 422 })
  return NextResponse.json({ cassetta: data.cassetta }, { status: 201 })
}
```

NB: **nessuna scrittura diretta.** `service_role` ha solo SELECT su `cassette` (vedi le correzioni in
testa): creazione, rinomina, colore ed eliminazione passano **tutte** dalle RPC. In `[id]/route.ts`:

```typescript
// src/app/api/cassette/[id]/route.ts — PATCH {nome} XOR {colore} · DELETE
// Stessa testata guard del POST, e `p_lab` SEMPRE da context.laboratorioId. Poi:
// PATCH: esattamente UN campo (correzione 4). Entrambi presenti, o nessuno dei due → 422,
//        nessuna RPC chiamata. Qualsiasi altro campo del body è IGNORATO (allowlist, mai passthrough).
//   {nome}   → callRpcWithRetry(() => svc.rpc('cassetta_rinomina_atomica',
//                {p_lab, p_cassetta_id: id, p_nome: body.nome}))
//              nome_occupato→409 · cassetta_non_trovata→404 · nome_non_valido→422 · ok→200
//   {colore} → normalizzaColore PRIMA (422 se null), poi
//              callRpcWithRetry(() => svc.rpc('cassetta_imposta_colore_atomica',
//                {p_lab, p_cassetta_id: id, p_colore: colore}))
//              cassetta_non_trovata→404 · ok→200
//              La RPC NON tocca updated_at (R-4.2): non «ripararlo» in route.
// DELETE: callRpcWithRetry(() => svc.rpc('cassetta_elimina_atomica', {p_lab, p_cassetta_id: id}))
//         occupata→409 · cassetta_non_trovata→404 · ok→200
```

- [ ] **Step 4: GREEN** — `npx vitest run tests/unit/cassette-route.test.ts tests/unit/cassette-id-route.test.ts` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(cassette): API POST/PATCH/DELETE cassette col pattern guard completo"`

---

### Task 5: API riordino + assegnazione lavoro + sentinella PATCHABLE_FIELDS

> **⚠️ CORREZIONI 21/07 — prevalgono sul testo del task qui sotto.**
> 1. **Validare il nome in route è OBBLIGATORIO.** R-5 ha tolto `nome_non_valido` da
>    `cassetta_assegna_atomica`: un nome assente, vuoto o oltre 20 caratteri torna ora
>    **`cassetta_non_trovata`**. Se mappi quell'esito su 404 senza validare prima, chi digita una
>    targa di 25 caratteri legge «cassetta non trovata» — una bugia. Valida
>    `1 ≤ len(trim(nome)) ≤ 20` **prima** della RPC e rispondi 422.
> 2. **Un `p_colore` non validato solleva `RAISE`** (→ 500, non un esito). Oggi la route passa `null`;
>    se un domani lo inoltrerà, va validato a monte.
> 3. `ordine_non_valido` ora copre anche gli **elementi NULL** dell'array: il mapping 422 non cambia,
>    aggiungi il caso al test.
> 4. **Retry sul 40P01** su entrambe le route (vedi il blocco «STATO AL 21/07» in testa al piano).
> 5. Test in `tests/unit/` (D-O1).

**Files:**
- Create: `src/app/api/cassette/riordino/route.ts`
- Create: `src/app/api/lavori/[id]/cassetta/route.ts`
- Modify: `src/app/api/lavori/[id]/route.ts:64-73` (rimozione `'numero_cassetta'` da `PATCHABLE_FIELDS`)
- Test: `src/app/api/cassette/__tests__/riordino.test.ts`, `src/app/api/lavori/__tests__/cassetta-route.test.ts`, `src/app/api/lavori/__tests__/lavori-patch-sentinella-cassetta.test.ts`

**Interfaces:**
- Produces: `POST /api/cassette/riordino {ordine: string[]} → 200 | 422`; `POST /api/lavori/[id]/cassetta` con body `{cassetta_id}` | `{nome}` | `null` → 200 `{esito:'ok', nome}` | 409 `{errore:'occupata', nome}` | 404/422.
- Il body `null` (o `{}`) = liberazione manuale (`p_motivo:'manuale'`).

- [ ] **Step 1: Test sentinella (modello invariante D7)**

```typescript
// src/app/api/lavori/__tests__/lavori-patch-sentinella-cassetta.test.ts
import { describe, expect, it } from 'vitest'
import { PATCHABLE_FIELDS } from '../[id]/route'

describe('sentinella cassetta (spec parete §10)', () => {
  it('numero_cassetta NON è mai patchabile direttamente: scrive solo la RPC', () => {
    expect(PATCHABLE_FIELDS).not.toContain('numero_cassetta')
  })
})
```

- [ ] **Step 2: RED** — la sentinella FALLISCE finché `numero_cassetta` è nell'allowlist. Test riordino: `{ordine:[a,b]}` → chiama `rpc('cassette_riordina')`; esito `ordine_non_valido` → 422; ok → 200. Test cassetta-route: `{nome:'C9'}` → `rpc('cassetta_assegna_atomica', {p_lab, p_lavoro, p_cassetta_id: null, p_nome:'C9', p_colore: null})`; esito `occupata` → 409 con `nome`; body null → `rpc('cassetta_libera_atomica', {…, p_motivo:'manuale'})` → 200.
- [ ] **Step 3: Implementa** le due route (testata guard identica a Task 4; il POST cassetta lavoro verifica anche che il lavoro appartenga al lab con fetch `.eq('laboratorio_id',…)` prima della RPC — 404 se assente) e togli `'numero_cassetta'` dall'array `PATCHABLE_FIELDS` (route.ts:64-73). NON toccare altro dell'allowlist.
- [ ] **Step 4: GREEN + regressione** — `npx vitest run src/app/api` → PASS (i test esistenti della PATCH lavori non devono rompersi: se un test fissa `numero_cassetta` patchabile, va AGGIORNATO citando la spec §10).
- [ ] **Step 5: Commit** — `git commit -m "feat(cassette): riordino + assegnazione lavoro via RPC; numero_cassetta fuori da PATCHABLE_FIELDS (sentinella)"`

---

### Task 6: API preferenza «La tua home»

> **⚠️ CORREZIONI 21/07 — È IL TASK PIÙ IMPATTATO. Il codice del piano NON compila più.**
> 1. **`utente_set_nav_pref` ha 4 argomenti, non 3** (decisione R-4.3, ratificata). Lo Step 3 del task
>    passa `{ p_user, p_chiave, p_valore }`: va aggiunto **`p_lab: context.laboratorioId`**. Con 3
>    argomenti PostgREST non trova la funzione (`PGRST202`) e **fallisce**, non silenzia.
>    Vale per **entrambe** le chiavi: `home` e `parete_intro_vista` (quest'ultima usata dal Task 15).
> 2. `p_lab` **sempre** da `getFreshLabContext()` server-side, MAI dal body.
> 3. **Comportamento nuovo da testare — RISCRITTO 21/07 dopo la review, ratificato da Francesco.**
>    La versione precedente diceva «utente con `laboratorio_id` NULL (admin_sistema) → no-op
>    silenzioso, HTTP 200», e **collideva con il pattern-route**, che blocca `laboratorioId` NULL con
>    **403 prima** di qualunque RPC. Governa il pattern:
>    - **`admin_sistema` (`laboratorio_id` NULL) → 403.** È la risposta onesta: un 200 dichiarerebbe
>      salvata una preferenza che non è stata scritta. La migration stessa annota che questi utenti
>      «non usano la home di lab» (`…090000:649`).
>    - **«0 righe aggiornate ≠ errore» resta valido e va testato:** con `RETURNS void` qualunque
>      risoluzione senza `error` è un 200, e non c'è modo — né volontà — di dedurre il conteggio righe.
>    - **`p_lab` di un altro laboratorio → 200**, ma l'unico percorso che lo produce è una **race**
>      (riga soft-deletata, o lab cambiato fra il fetch del contesto e l'UPDATE): la route invia solo
>      il proprio `labId`.
>    La clausola `WHERE … AND laboratorio_id = p_lab AND deleted_at IS NULL` dentro la RPC **resta
>    indispensabile** a prescindere da questa route: è l'unico guard di tenancy a livello DB su una
>    superficie `SECURITY DEFINER` dove `auth.uid()` è NULL, e vale per ogni chiamante futuro.
> 4. `p_valore` NULL solleva `RAISE`: la route non deve mai inoltrare un valore assente.
> 5. Test in `tests/unit/` (D-O1).

**Files:**
- Create: `src/app/api/impostazioni/preferenze/route.ts`
- Create: `src/lib/preferenze/home.ts`
- Test: `src/app/api/impostazioni/__tests__/preferenze.test.ts`, `src/lib/preferenze/__tests__/home.test.ts`

**Interfaces:**
- Produces: `PATCH /api/impostazioni/preferenze {home: 'due_stanze'|'pile'|'parete'} → 200` (422 fuori enum); helper `homePrefDa(navPreferences: unknown): 'due_stanze'|'pile'|'parete'` e `pareteIntroVista(navPreferences: unknown): boolean` (parsing difensivo del Json).

- [ ] **Step 1: Test RED (helper)**

```typescript
import { describe, expect, it } from 'vitest'
import { homePrefDa, pareteIntroVista } from '../home'

describe('homePrefDa', () => {
  it('default due_stanze su null/garbage/valore ignoto', () => {
    expect(homePrefDa(null)).toBe('due_stanze')
    expect(homePrefDa('x')).toBe('due_stanze')
    expect(homePrefDa({ home: 'boh' })).toBe('due_stanze')
  })
  it('legge i 3 valori validi', () => {
    expect(homePrefDa({ home: 'pile' })).toBe('pile')
    expect(homePrefDa({ home: 'parete' })).toBe('parete')
    expect(homePrefDa({ home: 'due_stanze' })).toBe('due_stanze')
  })
})
describe('pareteIntroVista', () => {
  it('false di default, true solo se flag esplicito', () => {
    expect(pareteIntroVista(null)).toBe(false)
    expect(pareteIntroVista({ parete_intro_vista: true })).toBe(true)
  })
})
```

- [ ] **Step 2: RED → implementa**

```typescript
// src/lib/preferenze/home.ts
export type HomePref = 'due_stanze' | 'pile' | 'parete'
const VALIDE: readonly HomePref[] = ['due_stanze', 'pile', 'parete']

export function homePrefDa(navPreferences: unknown): HomePref {
  if (navPreferences && typeof navPreferences === 'object') {
    const v = (navPreferences as Record<string, unknown>).home
    if (typeof v === 'string' && (VALIDE as readonly string[]).includes(v)) return v as HomePref
  }
  return 'due_stanze'
}
export function pareteIntroVista(navPreferences: unknown): boolean {
  return !!(navPreferences && typeof navPreferences === 'object'
    && (navPreferences as Record<string, unknown>).parete_intro_vista === true)
}
```

- [ ] **Step 3: Route PATCH** — testata guard standard (Task 4). Body accettato: `{home}` OPPURE `{parete_intro_vista}` (una chiave alla volta; altre chiavi ignorate, body senza chiavi valide → 422). `{home}`: validato client-side con l'enum di `home.ts` (422 fuori enum) → `svc.rpc('utente_set_nav_pref', { p_user: context.userId, p_chiave: 'home', p_valore: body.home })`. `{parete_intro_vista: true}` → `svc.rpc('utente_set_nav_pref', { p_user: context.userId, p_chiave: 'parete_intro_vista', p_valore: true })`. SEMPRE `context.userId`, MAI id dal body.
- [ ] **Step 4: Test route** — `{home:'parete'}` → rpc con chiave `home`; `{home:'boh'}` → 422; `{parete_intro_vista:true}` → rpc con chiave flag; body vuoto → 422; guard 401/403.
- [ ] **Step 5: GREEN** — `npx vitest run src/lib/preferenze src/app/api/impostazioni` → PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(cassette): preferenza La tua home per-utente (nav_preferences via RPC)"`

---

### Task 7: Liberazione alla consegna + racconto L5

**Files:**
- Modify: `src/lib/consegna/orchestrate.ts` (dopo Step 5 update, ~riga 243; e ramo idempotente `gia_consegnato` ~righe 48-92)
- Modify: `src/components/features/lavori/consegna-v3/FlussoConsegna.tsx` (esito → prop)
- Modify: `src/components/features/lavori/consegna-v3/FrameConsegnato.tsx` (riga racconto)
- Test: aggiorna i test di orchestrate (`src/lib/consegna/__tests__/…`) + test FrameConsegnato

**Interfaces:**
- Consumes: `cassetta_libera_atomica` (Task 1).
- Produces: l'esito di `orchestraConsegna` include `cassettaLiberata: string | null` (nome, o null se niente liberato/fail-soft). `FrameConsegnato` accetta prop `cassettaLiberata?: string | null`.

- [ ] **Step 1: Test RED orchestrate** — casi: (a) consegna ok con riga viva → rpc chiamata con `p_motivo:'consegna'` e esito contiene `cassettaLiberata:'C12'`; (b) rpc fallisce (mock error) → consegna resta ok, `cassettaLiberata:null` (fail-soft, log); (c) lavoro senza cassetta → rpc ok con nome null → `cassettaLiberata:null`; (d) ramo `gia_consegnato` → rpc richiamata comunque (retry gratuito).
- [ ] **Step 2: Implementa in orchestrate.ts** — VINCOLO D'ORDINE (spec §9.1, panel R11): la chiamata va DOPO lo Step 5 riuscito, che è già dopo la generazione del Buono (Step 4: il Buono stampa `numero_cassetta` — `BuonoTemplate.tsx:341`). NON spostarla prima. NON aggiungere `numero_cassetta: null` all'update di Step 5 (azzeramento = solo RPC, una penna).

```typescript
// dopo lo Step 5 riuscito, prima del return dell'esito:
let cassettaLiberata: string | null = null
try {
  const { data } = await svc.rpc('cassetta_libera_atomica', {
    p_lab: laboratorioId, p_lavoro: lavoroId, p_motivo: 'consegna',
  })
  cassettaLiberata = (data as { esito?: string; nome?: string | null })?.nome ?? null
} catch (e) {
  console.error('[consegna] liberazione cassetta fail-soft', e)  // la consegna NON si annulla
}
// … e includere cassettaLiberata nell'oggetto di ritorno
```

Nel ramo `gia_consegnato` (idempotente): stessa chiamata try/catch prima del return (retry gratuito della riparazione).
- [ ] **Step 3: FrameConsegnato** — nuova prop `cassettaLiberata?: string | null`; se valorizzata, riga `CardUAHaFatto` aggiuntiva nella cascata esistente: testo `UÀ ha liberato la cassetta {nome}`. NIENTE riga se null (L5). Test: render con e senza prop.
- [ ] **Step 4: FlussoConsegna** — l'esito POST (route consegna ritorna l'esito orchestrate) passa `cassettaLiberata` al frame. Verifica che la route `consegna/route.ts` serializzi il campo nuovo (additivo).
- [ ] **Step 5: GREEN** — `npx vitest run src/lib/consegna src/components/features/lavori/consegna-v3` → PASS.
- [ ] **Step 6: Commit** — `git commit -m "feat(cassette): liberazione automatica alla consegna con racconto L5 fail-soft"`

---

### Task 8: Riassegnazione all'annullo consegna

> **⚠️ NOTA 21/07.** Un audit intermedio segnalava un **quarto esito** (`lavoro_non_valido`) da mappare
> qui: **è superato.** Francesco ha ratificato il riuso di `niente_da_riassegnare`, e la RPC applicata
> al DB ritorna solo i **tre** esiti che questo task già prevede
> (`riassegnata` · `occupata_nel_frattempo` · `niente_da_riassegnare`) — verificato sull'SQL applicato.
> Il task resta valido com'è scritto. Aggiungi solo il **retry sul 40P01** e metti i test in
> `tests/unit/` (D-O1).
> *(Il commento a `090000:306` attribuisce per sbaglio questa RPC al Task 9: è di questo task.)*

**Files:**
- Modify: `src/app/api/lavori/[id]/annulla-consegna/route.ts` (dopo esito `ok` della RPC fiscale)
- Modify: componente banner annullo esistente (individuato in `consegna-v3/`; riga quieta)
- Test: aggiorna i test della route annulla-consegna

**Interfaces:**
- Consumes: `cassetta_riassegna_post_annullo` (Task 1).
- Produces: response estesa ADDITIVA `{ ok, messaggio, cassetta?: { riassegnata: boolean, nome?: string } }`.

- [ ] **Step 1: Test RED** — dopo esito ok: (a) rpc → `{esito:'riassegnata', nome:'C12'}` → response `cassetta:{riassegnata:true,nome:'C12'}`; (b) `occupata_nel_frattempo` → `{riassegnata:false,nome:'C12'}`; (c) `niente_da_riassegnare` → campo `cassetta` ASSENTE; (d) rpc throw → response senza campo (fail-soft, log); (e) RPC fiscale `annulla_consegna_atomica` INTATTA (nessun cambiamento ai suoi test).
- [ ] **Step 2: Implementa** — chiamata try/catch nella route DOPO l'esito ok; mappa esiti come sopra. Nel banner annullo: se `riassegnata:false` con nome → riga quieta «La {nome} nel frattempo è occupata» (testo, niente allarme).
- [ ] **Step 3: GREEN** — `npx vitest run src/app/api/lavori` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(cassette): riassegnazione cassetta all'annullo consegna (fail-soft, response additiva)"`

---

### Task 9: Trasferimento cassetta al rifacimento (D-10 RATIFICATA 21/07)

> **⚠️ CORREZIONI 21/07.**
> 1. `cassetta_trasferisci_rifacimento` ha ora **4 esiti**: `trasferita` · `niente_da_trasferire` ·
>    `occupata` · `lavoro_non_valido`. Rispetto ai 4 casi di test del task, aggiungi: la RPC valida
>    anche lo **stato** del lavoro nuovo (non solo `deleted_at`) → `lavoro_non_valido`; e ha un
>    **pre-check anti-sfratto** che ritorna `occupata` se il lavoro nuovo ha già una riga viva.
> 2. Entrambi restano **fail-soft silenziosi** — il rifacimento è già committato, la response della
>    route non cambia — ma i due esiti vanno **loggati distintamente**.
> 3. Il commento a `090000:306` nomina «Task 9» parlando di `cassetta_riassegna_post_annullo`: è un
>    errore, quella RPC appartiene al **Task 8**. Non implementarla qui.
> 4. `crea_rifacimento_atomico` non si tocca (R-6). Test in `tests/unit/` (D-O1).

**Files:**
- Modify: `src/app/api/lavori/[id]/rifacimento/route.ts` (dopo l'esito ok della RPC `crea_rifacimento_atomico`, ~riga 97-108)
- Test: `src/app/api/lavori/__tests__/rifacimento-route.test.ts` (aggiorna/crea)

**Interfaces:**
- Consumes: RPC `cassetta_trasferisci_rifacimento` (già nel Task 1); esito route rifacimento `{ lavoro_nuovo_id: string; numero_lavoro: string }`.
- La RPC 007 `crea_rifacimento_atomico` NON si tocca (dominio critico MDR).

- [ ] **Step 1: Test RED** — dopo l'esito ok (`data.lavoro_nuovo_id` presente): (a) il vecchio aveva una cassetta → `rpc('cassetta_trasferisci_rifacimento', {p_lab, p_lavoro_vecchio: lavoro_id, p_lavoro_nuovo: data.lavoro_nuovo_id})` chiamata; esito `trasferita` → la response resta invariata (il trasferimento è silenzioso, non cambia il contratto della route); (b) vecchio senza cassetta → esito `niente_da_trasferire`, nessun errore; (c) rpc throw → fail-soft, la route ritorna comunque `{ lavoro_nuovo_id, numero_lavoro }` (il rifacimento è già committato, la cassetta è contorno); (d) la RPC fiscale `crea_rifacimento_atomico` è invariata (i suoi test non cambiano).
- [ ] **Step 2: Implementa** — in `rifacimento/route.ts`, subito prima del `return NextResponse.json(data …)` finale:

```typescript
try {
  await svc.rpc('cassetta_trasferisci_rifacimento', {
    p_lab: context.laboratorioId,
    p_lavoro_vecchio: lavoro_id,
    p_lavoro_nuovo: (data as { lavoro_nuovo_id: string }).lavoro_nuovo_id,
  })
} catch (e) {
  console.error('[rifacimento] trasferimento cassetta fail-soft', e)  // il rifacimento NON si annulla
}
```

- [ ] **Step 3: GREEN** — `npx vitest run src/app/api/lavori` → PASS.
- [ ] **Step 4: Commit** — `git commit -m "feat(cassette): trasferimento cassetta al rifacimento (D-10)"`

---

### Task 10: Componenti ds — `MiniaturaLavoro` + `Cassetta` (tray)

**Files:**
- Create: `src/components/ds/MiniaturaLavoro.tsx`
- Create: `src/components/ds/Cassetta.tsx`
- Test: `src/components/ds/__tests__/Cassetta.test.tsx`, `src/components/ds/__tests__/MiniaturaLavoro.test.tsx`

**Interfaces:**
- Consumes: `miniaturaPerLavoro` (Task 2); token `src/design-system/v3/tokens.ts`.
- Produces:
  - `MiniaturaLavoro({ id: MiniaturaId, height?: number })` — SVG inline materici; le 6 ratificate SUBITO dal mockup (`mk-corona/provvisorio/impianto/ponte/totale/scheletrato`, path 1:1 da `2026-07-20-parete-cassette-v2.html:167-202`); le 4 nuove (allineatore, mascherina, riparazione, generica) renderizzano la `generica` FINCHÉ il mockup legenda non è approvato (Task 18) — poi si sostituiscono i path.
  - `Cassetta({ id, nome, colore, lavoro, stato: 'normale'|'accesa'|'spenta', onTap, onLongPressSheet, draggable? })` — tray fedele al mockup: corpo gradiente (mappa slug→coppia gradiente FISSA dal mockup: rossa `#E8323B→#C3000F`, blu `#2E6FD0→#174A9C`, azzurra `#6FB1E8→#4187C6`, grigia `#9A948E→#6E675F`, bianca `#FFFEFA→#E4DCCB`, verde `#2E9C55→#166B39`; hex custom → `linear-gradient(180deg, {hex}, color-mix(in srgb, {hex} 72%, black))`), linguetta `::before`, cavità con `MiniaturaLavoro`, targa (troncamento CSS ellissi ~6ch, SR nome completo), riga `n.{numero} · {dentista}`, stato libera (targa outline, «libera» 60%), accesa (anello blu 3px + elevazione) / spenta (opacity .3 + saturate(.4), TAPPABILE).
  - **Regola luminanza**: `targaScura(colore: string): boolean` esportata — slug `bianca|azzurra` → true; hex → luminanza relativa > 0.55 → true. Test dedicato.

- [ ] **Step 1: Test RED** — `targaScura('bianca')===true`, `targaScura('#FFEE00')===true`, `targaScura('#173A9C')===false`; render occupata (`aria-label` = «Cassetta C12, occupata: lavoro n.144, Bianchi, corona zirconia»), libera («Cassetta C4, libera»), spenta resta `<button>` non-disabled.
- [ ] **Step 2: Implementa** — dark: shadow flat con inset ridotti (righe `[data-theme="dark"]` del mockup:71). CSS in `ds-v3.css` o CSS-module coerente con gli altri componenti ds (segui il pattern di `CardLavoro`). NIENTE animazioni inline: transizioni accesa/spenta via classi + token.
- [ ] **Step 3: GREEN** — `npx vitest run src/components/ds/__tests__/Cassetta.test.tsx src/components/ds/__tests__/MiniaturaLavoro.test.tsx` → PASS.
- [ ] **Step 4: Catalogo** — aggiungi sezione a `/ds-v3-catalogo` (pagina esistente): parete demo con i 6 colori + stati.
- [ ] **Step 5: Commit** — `git commit -m "feat(ds): Cassetta (tray) + MiniaturaLavoro §5.35/§5.36"`

---

### Task 11: Pagina `/cassette` — server + parete + ricerca che accende

**Files:**
- Create: `src/app/(app)/cassette/page.tsx`
- Create: `src/components/features/cassette/PareteClient.tsx`
- Create: `src/components/features/cassette/filtra-cassette.ts`
- Test: `src/components/features/cassette/__tests__/filtra-cassette.test.ts`, `src/components/features/cassette/__tests__/PareteClient.test.tsx`

**Interfaces:**
- Consumes: `getParete` (Task 3), `Cassetta`/`MiniaturaLavoro` (Task 10), `miniaturaPerLavoro` (Task 2), `normalizza` (riusa quella di `filtra-lavori-pila.ts` — esportala se serve).
- Produces: `filtraCassette(parete: CassettaParete[], query: string): Set<string>` (id accesi; query vuota → Set vuoto = nessun filtro attivo); `PareteClient({ parete })`.

- [ ] **Step 1: Test RED filtra-cassette**

```typescript
import { describe, expect, it } from 'vitest'
import { filtraCassette } from '../filtra-cassette'

const par = [
  { id: 'a', nome: 'C12', colore: 'rossa', posizione: 0,
    lavoro: { id: 'l1', numero: '144', dentista: 'Bianchi', paziente: 'MAR-42',
              tipoDispositivo: 'protesi_fissa', descrizione: 'Corona zirconia' } },
  { id: 'b', nome: 'C4', colore: 'grigia', posizione: 1, lavoro: null },
]
describe('filtraCassette', () => {
  it('query vuota → nessun filtro', () => expect(filtraCassette(par, '  ').size).toBe(0))
  it('matcha nome, numero, dentista, paziente, tipo (accenti-insensitive)', () => {
    expect(filtraCassette(par, 'zircònia')).toEqual(new Set(['a']))
    expect(filtraCassette(par, 'c4')).toEqual(new Set(['b']))
    expect(filtraCassette(par, '144')).toEqual(new Set(['a']))
    expect(filtraCassette(par, 'bianchi')).toEqual(new Set(['a']))
    expect(filtraCassette(par, 'mar-42')).toEqual(new Set(['a']))
  })
  it('zero match → Set vuoto MA query attiva (il client distingue con query.trim())', () => {
    expect(filtraCassette(par, 'xyz').size).toBe(0)
  })
})
```

- [ ] **Step 2: Implementa** `filtraCassette` (pagliaio per cassetta: `nome ∥ n.{numero} ∥ dentista ∥ paziente ∥ descrizione`, `normalizza` condivisa) → GREEN.
- [ ] **Step 3: page.tsx (server)** — pattern `tutto-il-resto/page.tsx`: `force-dynamic`, `getLabContext`, validazione ruoli `['titolare','admin_rete','tecnico','front_desk']`, `getParete(svc, labId)`, wrapper `<div data-ds="v3" className="ds-grana">`, render `<PareteClient parete={parete} />`.
- [ ] **Step 4: PareteClient** — chrome: TastoTondo ‹ (router.back? NO: `router.push('/dashboard')`, provenienza multipla) + titolo «Le cassette» + TastoTondo ☰ → `/tutto-il-resto`; campo ricerca inline (pillola mockup:39-49, input vero con placeholder «Cerca una cassetta o un lavoro…»); parete `--bg-deep` con doppia griglia (CSS mockup:52-64); grid colonne fisse 3/4/6 via media query; per ogni cassetta `<Cassetta stato={query attiva ? (accesi.has(id) ? 'accesa' : 'spenta') : 'normale'} onTap={occupata ? push scheda : apri sheet}/>`; tile `+ Nuova cassetta` in coda; zero match → riga quieta «Niente per “{query}”» sopra la parete tutta spenta; `aria-live="polite"` con «{n} cassette accese»; refetch su `visibilitychange`/focus (`router.refresh()`); Vuoto ds se zero cassette («La tua parete è vuota» + CTA che apre lo sheet nuova).
- [ ] **Step 5: Test PareteClient** — render con 2 cassette; digitazione query accende/spegne (classi + aria); tap occupata naviga; tap spenta FUNZIONA (mai pointer-events none).
- [ ] **Step 6: GREEN + commit** — `git commit -m "feat(cassette): pagina /cassette con parete e ricerca che accende"`

---

### Task 12: Sheet «Nuova cassetta» + sheet cassetta (rinomina/colore/sposta/libera/butta via)

**Files:**
- Create: `src/components/features/cassette/NuovaCassettaSheet.tsx`
- Create: `src/components/features/cassette/CassettaSheet.tsx`
- Modify: `src/components/features/cassette/PareteClient.tsx` (wiring)
- Test: `src/components/features/cassette/__tests__/NuovaCassettaSheet.test.tsx`, `__tests__/CassettaSheet.test.tsx`

**Interfaces:**
- Consumes: Sheet ds, Campo, TastoPrimario, LinkQuieto, DialogConferma, ChipScelta; API Task 4/5; `suona('tap')` + `vibra('light')` da `v3/sound.ts`/`v3/haptic.ts` alla creazione riuscita.
- Produces: `NuovaCassettaSheet({ aperto, onChiudi, prossimoNome, onCreata })`; `CassettaSheet({ cassetta, libere, aperto, onChiudi, onCambiata })`.

- [ ] **Step 1: Test RED NuovaCassettaSheet** — precompilato `prossimoNome` (es. «C22») + hint «suggerito · scrivi quello che vuoi»; CTA `Crea C22` si aggiorna col testo digitato; 6 swatches + swatch custom (apre `<input type="color">`); submit → POST `/api/cassette` con `{nome, colore}`; 409 → errore inline «Questo nome è già sulla parete»; successo → `onCreata` + suono/haptic.
- [ ] **Step 2: Implementa** — layout mockup:374-392 (titolo 27/800, label uppercase, campo, swatches 42px sel con outline blu, CTA H60). Il calcolo `prossimoNome` vive nel PareteClient (max serie C sui nomi vivi).
- [ ] **Step 3: Test RED CassettaSheet** — occupata: mostra «Dentro c'è il n.{numero}»; azioni: campo rinomina (PATCH; 409 → inline), swatches colore (PATCH), «Sposta il lavoro in…» (chips libere → POST `/api/lavori/[id]/cassetta {cassetta_id}`; 409 → riga bloccante + reload), «Segna come libera» (LinkQuieto + DialogConferma «Il n.{numero} esce dalla C12?» → POST `/api/lavori/[id]/cassetta` body `null`), «Butta via» DISABILITATA con riga «Dentro c'è il n.144». Libera: rinomina/colore/«Sposta» ▲▼ (voce visibile: due TastoTondo ▲▼ che POSTano `/api/cassette/riordino` con l'ordine ricalcolato; `aria-live` «C12 spostata al posto 3»)/«Butta via» attiva (DialogConferma «Butto via la cassetta C4?» → DELETE). MAI la parola «Elimina».
- [ ] **Step 4: Implementa + GREEN** — `npx vitest run src/components/features/cassette` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(cassette): sheet nuova cassetta e sheet gestione (sposta, libera, butta via)"`

---

### Task 13: Drag & drop riordino su `/cassette`

**Files:**
- Modify: `src/components/features/cassette/PareteClient.tsx`
- Create: `src/components/features/cassette/useDragRiordino.ts`
- Test: `src/components/features/cassette/__tests__/useDragRiordino.test.ts`

**Interfaces:**
- Produces: hook `useDragRiordino({ ordine, onDrop })` → gestisce long-press 300ms (touch) / HTML5 DnD (desktop); **semantica gesti spec §5.4**: long-press → sollevamento; movimento >8px → drag; rilascio senza movimento → callback `onSheet(id)` (apre CassettaSheet); tap semplice resta azione primaria.

- [ ] **Step 1: Test RED hook** (logica pura di stato: timer 300ms, soglia 8px, esiti `drag|sheet|tap`) — simula pointerdown/move/up con fake timers.
- [ ] **Step 2: Implementa** — riordino ottimistico dell'array locale durante il drag (`molla.smooth` via Motion `layout`), al drop `POST /api/cassette/riordino {ordine}` (lista COMPLETA di id vivi nell'ordine nuovo); PRIMA di attivare il drag: `router.refresh()`+riallineamento (mitigazione riordino concorrente); errore → rollback + riga quieta. `touch-action: manipulation` sui tray; il drag NON parte durante query di ricerca attiva (parete filtrata = ordine parziale).
- [ ] **Step 3: GREEN + commit** — `git commit -m "feat(cassette): drag & drop riordino con long-press e fallback Sposta"`

---

### Task 14: Home a due stanze — pager scroll-snap

**Files:**
- Modify: `src/components/features/home/HomeV3.tsx`
- Create: `src/components/features/home/StanzePager.tsx`
- Create: `src/components/features/home/StanzaParete.tsx`
- Modify: `src/components/ds/ProgressDots.tsx` (variante «stanze»)
- Modify: `src/app/(app)/dashboard/page.tsx` (dati + preferenza + searchParam)
- Test: `src/components/features/home/__tests__/StanzePager.test.tsx`, `__tests__/StanzaParete.test.tsx`

**Interfaces:**
- Consumes: `getParete` (Task 3), `homePrefDa` (Task 6), `Cassetta`+`MiniaturaLavoro` (Task 10), `ProgressDots`.
- Produces: `StanzePager({ stanzaIniziale: 'pile'|'parete', pile: ReactNode, parete: ReactNode })`; `StanzaParete({ parete: CassettaParete[], capN: number })`; `HomeV3` accetta props nuove `{ parete, homePref, stanzaParam }`.

- [ ] **Step 1: dashboard/page.tsx** — al `Promise.all` aggiungi `getParete(svc, labId)` e fetch `utenti.nav_preferences` (`.eq('id', userId).single()`); `searchParams.stanza` (`'pile'|'parete'`) vince sulla preferenza per la visita (ADR B6 server-driven). `homePref==='pile'` → non fetchare la parete (risparmio); `'parete'` → viceversa non serve? NO: le pile servono comunque a StrisciaStato — fetch SEMPRE pile, parete solo se `homePref!=='pile'` o `stanzaParam==='parete'`.
- [ ] **Step 2: Test RED StanzePager** — con `stanzaIniziale='pile'` la stanza pile è attiva (aria-hidden false) e la parete `inert`; dots `role="tablist"` con 2 tab, `aria-selected` corretto; click dot 2 → scroll-snap verso parete (mock scrollTo) + a fine snap inert invertito + focus sul primo elemento entrante; frecce ←→ sui dots cambiano stanza; render con UNA sola stanza (pref `pile`) → niente pager/dots/peek.
- [ ] **Step 3: Implementa StanzePager**

```tsx
// Struttura (CSS in ds-v3.css o module):
// .stanze-viewport { overflow-x: auto; scroll-snap-type: x mandatory; display: flex;
//   overscroll-behavior: contain; scrollbar-width: none; }
// .stanza { flex: 0 0 calc(100% - 28px); scroll-snap-align: start; }  /* peek 28px bilaterale */
// TastoPiù + dots: FUORI dal viewport, footer fisso sotto (un solo TastoPiù, mai doppione).
// Stato stanza attiva da IntersectionObserver (threshold .6) → setta inert/aria-hidden
// sull'altra + aggiorna dots. Tap dot → viewport.scrollTo({left, behavior:
// prefersReducedMotion ? 'auto' : 'smooth'}).
```

- [ ] **Step 4: HomeV3** — se `homePref==='due_stanze'` → `<StanzePager stanzaIniziale={stanzaParam ?? 'pile'} pile={<contenuto attuale>} parete={<StanzaParete …/>} />`; se `'pile'` → layout attuale invariato; se `'parete'` → solo `<StanzaParete/>` (con head saluto compresso). TastoPiù estratto nel footer comune. Il no-scroll verticale (`.ua-home{height:100dvh;overflow:hidden}`) resta.
- [ ] **Step 5: GREEN + commit** — `git commit -m "feat(cassette): home a due stanze (scroll-snap, peek 28px, dots tablist, inert)"`

---

### Task 15: Stanza Parete — cap N, racconto backfill, voce «I lavori»

**Files:**
- Modify: `src/components/features/home/StanzaParete.tsx`
- Modify: `src/lib/dashboard/striscia.ts` (+ segnale intro parete) e `src/components/ds/StrisciaStato.tsx` SOLO se serve un tono nuovo (NO: riusa il tono quieto esistente)
- Modify: `src/lib/dashboard/tutto-il-resto.ts` (voce condizionale «I lavori»)
- Test: `src/components/features/home/__tests__/StanzaParete.test.tsx`, aggiorna `src/lib/dashboard/__tests__/tutto-il-resto.test.ts` e test striscia

**Interfaces:**
- Consumes: `pareteIntroVista` (Task 6).
- Produces: `StanzaParete` renderizza: eyebrow «LE CASSETTE» + titolo «La parete ›» (link `/cassette`); prime `capN` cassette per posizione + tile «Tutte le cassette ›» quando `parete.length > capN`; tap occupata → scheda; tap libera/nuova/tile → `/cassette` (navigazione, MAI sheet in home — D-8). `getSezioniTuttoIlResto` accetta `homePref` e aggiunge `{chiave:'lavori', emoji:'📋', nome:'I lavori', sub:'Le quattro pile', href:'/dashboard?stanza=pile'}` SOLO quando `homePref==='parete'`.

- [ ] **Step 1: Test RED StanzaParete** — capN=5 con 8 cassette → 5 tray + tile «Tutte le cassette ›» con badge «+3»; con 4 → nessuna tile; tap tile → push `/cassette`; miniature a 22px (prop `height={22}`); titolo con ›.
- [ ] **Step 2: capN** — derivato dal viewport come la scala device-corti di HomeV3 (§7.1): default 5 (griglia 3×2 con tile) a 390×844, 8 a 768. Costante esportata `CAP_PARETE = { mobile: 5, tablet: 8 }` — niente misure runtime.
- [ ] **Step 3: Racconto backfill** — in `striscia.ts`: nuovo segnale quieto `parete_intro` («UÀ ha creato {n} cassette dai tuoi lavori — colorale e mettile in ordine ›», link `/cassette`) SOLO se `n>0 && !pareteIntroVista(navPrefs)`; precedenza: allarmi operativi > trial > parete_intro > sereni (aggiorna il comparatore esistente). Il tap sulla striscia naviga E scrive `PATCH /api/impostazioni/preferenze {parete_intro_vista:true}` (fire-and-forget client).
- [ ] **Step 4: tutto-il-resto** — voce condizionale + sub «{n} occupate · {m} libere» sulla voce «Le cassette» (Task 17 la crea: qui SOLO la logica `homePref`). Test: `homePref='parete'` → voce presente; altri → assente.
- [ ] **Step 5: GREEN + commit** — `git commit -m "feat(cassette): stanza parete con cap, racconto backfill una tantum, via alle pile"`

---

### Task 16: ConfermaCassettaSheet «dal parco» + morte del campo in TabAccettazione

**Files:**
- Modify: `src/components/features/pile/ConfermaCassettaSheet.tsx`
- Modify: `src/components/features/lavori/form/TabAccettazione.tsx:239-249`
- Test: aggiorna i test di entrambi

**Interfaces:**
- Consumes: `getCassetteSuggerite` riscritta (Task 3, ora ritorna `{id,nome}[]`), `POST /api/lavori/[id]/cassetta` (Task 5).

- [ ] **Step 1: Test RED ConfermaCassettaSheet** — chips da `{id,nome}[]`; chip scelta → POST `/api/lavori/[id]/cassetta {cassetta_id}`; campo libero → `{nome}` (trim); «Conferma senza cassetta» invariata (nessuna chiamata cassetta); 409 → riga bloccante «La {nome} è appena stata occupata» + reload chips (refetch endpoint suggerite); niente più PATCH `numero_cassetta`.
- [ ] **Step 2: Implementa** — la forma visiva NON cambia (mockup ondata A resta valido); cambia solo il data-layer. L'endpoint che serve le chips (individua chi fornisce oggi `getCassetteSuggerite` al client — server component o API) passa al nuovo dato.
- [ ] **Step 3: TabAccettazione** — il campo cassetta editabile MUORE (spec §10, riserva bloccante R1: l'allowlist ridotta lo perderebbe in silenzio). Al suo posto, SOLO se `lavoro.numero_cassetta` presente: riga read-only «Cassetta {nome}» + LinkQuieto «Cambia dalla parete» → `/cassette`. Rimuovi il campo dal payload PATCH del form. Test: il form NON invia mai `numero_cassetta`.
- [ ] **Step 4: GREEN** — `npx vitest run src/components/features/pile src/components/features/lavori/form` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(cassette): conferma-cassetta dal parco; campo cassetta fuori dal form (R1)"`

---

### Task 17: Accesso globale + riga preferenza in /impostazioni

**Files:**
- Modify: `public/manifest.json:32-52` (3ª shortcut)
- Modify: `src/lib/dashboard/tutto-il-resto.ts:66-73` (voce «Le cassette» + sub conteggi)
- Modify: `src/components/ds/NavDesk.tsx:86-91` (voce in `VOCI_ALTRE`)
- Modify: pagina `/impostazioni` (riga «La tua home», stile v2.3)
- Modify: `src/app/(app)/ds-v3-catalogo/…` (NavDesk aggiornato)
- Test: aggiorna test tutto-il-resto/NavDesk; test riga preferenza

**Steps:**
- [ ] **Step 1:** Manifest: `{"name": "Le cassette", "url": "/cassette", "icons": [{"src": "/icons/shortcut-cassette.png", "sizes": "192x192"}]}` — icona coerente con le 2 esistenti (guarda i loro file in `public/icons/`).
- [ ] **Step 2:** Voce Tutto il resto subito dopo «Dentisti»: `{ chiave: 'cassette', emoji: '🗄️', nome: 'Le cassette', sub: '{n} occupate · {m} libere', href: '/cassette' }` — i conteggi arrivano da `getSezioniTuttoIlResto` (2 count query su `cassette`/`cassette_lavori` vive). Test aggiornato (ordine voci + sub).
- [ ] **Step 3:** NavDesk: `{ nome: 'Le cassette', href: '/cassette' }` PRIMA di Agenda in `VOCI_ALTRE`; verifica riflesso in HomeDesktop; catalogo aggiornato.
- [ ] **Step 4:** `/impostazioni` — sezione Aspetto: riga «La tua home» con 3 radio v2.3: «Le due stanze — pile e parete» (default) · «Solo le pile — che cosa urge» · «Solo la parete — dove stanno». Sotto la terza, avvertenza quieta: «Le pile restano raggiungibili da ☰ → I lavori». PATCH `/api/impostazioni/preferenze {home}` al cambio, feedback salvato v2.3. STILE v2.3 (token `src/design-system/tokens.ts`) — MAI v3 qui.
- [ ] **Step 5:** GREEN + commit — `git commit -m "feat(cassette): accesso globale (manifest, tutto il resto, NavDesk) + preferenza La tua home"`

---

### Task 18: 🛑 Mockup legenda 4 miniature nuove → path definitivi

**Files:**
- Create: `docs/design/mockups/2026-07-21-miniature-estensione-legenda.html` (MAI /tmp)
- Create: `docs/design/mockups/screenshots/` (screenshot Playwright light+dark)
- Modify: `src/components/ds/MiniaturaLavoro.tsx` (path delle 4 nuove)

**Steps:**
- [ ] **Step 1:** Mockup HTML: SOLO la legenda estesa (stile `legenda-min` del mockup v2:111-117) con le 4 nuove: **allineatore** (mascherina trasparente sottile su arcata — resina traslucida tratteggiata), **mascherina/bite** (ferro di cavallo pieno traslucido), **riparazione** (protesi totale rosa con linea di frattura a zig-zag avorio), **generica** (dente singolo avorio semplice). Palette FISSA (§8). ≥2 varianti per simbolo dove c'è ambiguità.
- [ ] **Step 2:** Screenshot Playwright light+dark → `docs/design/mockups/screenshots/`.
- [ ] **Step 3: 🛑 GATE — approvazione Francesco** delle varianti. STOP senza ok.
- [ ] **Step 4:** Sostituisci i path placeholder in `MiniaturaLavoro` con i ratificati; test snapshot aggiornato; commit `feat(ds): 4 miniature nuove ratificate (allineatore, mascherina, riparazione, generica)`.

---

### Task 19: Seed E2E + emendamenti spec v3 + FASE 7

> **⚠️ CORREZIONI 21/07.**
> 1. **Lo Step 1 (seed) va ANTICIPATO**, prima della QA di FASE 9. Motivo: `numero_cassetta` è NULL su
>    tutti i 288 lavori in DB — il backfill ha operato su un insieme vuoto. **Senza il seed, ogni
>    superficie della Parete è vuota** e non c'è nulla da collaudare.
> 2. **Trappola per il seed e per ogni fixture:** `cassette_lavori` è append-only e il trigger
>    **rifiuta ogni DELETE**. Un reset del lab E2E con `.delete()` fallisce. L'unica via è
>    `public.cassette_purge_lab(labId)`, che apre la deroga per quel lab e per quella transazione.
> 3. **Lo Step 2 (emendamenti) si è allargato.** Oltre agli emendamenti di spec v3, vanno sanati i
>    disallineamenti elencati in `.superpowers/sdd/audit-indipendente-completezza.md` §6, più:
>    - spec §4.3: la tabella dei contratti è **incompleta dall'origine** — mancano `motivo_non_valido`,
>      `nome_non_valido`, `niente_da_trasferire`, `trasferita`, e la firma a 4 argomenti di
>      `utente_set_nav_pref`;
>    - spec §3 riga «Rollback»: precisazione R-2 (le targhe azzerate finiscono in
>      `cassette_backfill_audit`);
>    - spec §2 e §9.2: **la nota sui consegnati pre-cutoff DECADE** — non esiste nessun residuo
>      `numero_cassetta`, quindi il «Cerca» globale avrà **una sola fonte**, lo storico;
>    - spec §4.2: il DELETE non è più vietato senza condizioni (deroga di purga, R-3);
>    - la nota «mai concatenare due RPC della Parete nella stessa transazione».
> 4. **Aprire D-11** come decisione autonoma con panel proprio (architettura + sicurezza + normativa):
>    fix *di classe* per la purga per-tenant + le **3 tabelle già orfane oggi**
>    (`fatture_outbox`, `fatture_sdi_eventi`, `credito_clienti_movimenti`).
> 5. Test in `tests/unit/` (D-O1).

**Files:**
- Modify: `scripts/seed-e2e.ts` (cassette deterministiche per il lab E2E)
- Modify: `docs/superpowers/specs/2026-07-07-design-system-v3-una-cosa-alla-volta.md` (emendamenti §13 della spec parete)
- Modify: `docs/design/decisions/` — nuovo file `2026-07-21-parete-cassette-ratifiche.md` (esiti D-10 e gate)

**Steps:**
- [ ] **Step 1: Seed** — il seed crea per il lab E2E: 6 cassette (C1..C5 + «Banco Ciro», colori misti incluso un hex custom), 2 occupate da lavori aperti della fixture, 1 riga storico chiusa (`liberato_per='consegna'`) per lo scenario annullo. Idempotente (delete+insert scoped lab E2E).
- [ ] **Step 2: Emendamenti spec v3** (ADDITIVI, spec parete §13): §5.35 Cassetta · §5.36 MiniaturaLavoro · §5.32 variante stanze · §7.1 paragrafo due stanze · §7.17 pagina Le cassette · §8.3 coreografia accensione · §6.1 voce condizionale «I lavori» · dizionario. Testi coerenti con l'implementato.
- [ ] **Step 3: FASE 7 (output reali):**

Run: `npx tsc --noEmit` → 0 errori
Run: `npx vitest run` → tutte verdi (baseline 2319 + nuove)
Run: `npx next build` → OK
Run: `npm run check-ds 2>/dev/null || npx tsx scripts/check-ds*.ts` → OK (nessun leak token)

- [ ] **Step 4: Commit** — `git commit -m "chore(cassette): seed E2E, emendamenti spec v3, verifiche FASE 7"`

---

## Dopo i task (fuori piano-task, prassi §0C)

1. **FASE 8** — review: `/code-review` + `superpowers:requesting-code-review` (review finale whole-branch).
2. **FASE 9** — QA browser lab E2E `00000000-…-0001` (MAI lab Filippo): scenari spec §15 (crea/rinomina/butta via 409, assegna chip+nome+fuga, 409 occupata, consegna→liberazione+racconto, annullo→riassegnata/occupata-nel-frattempo, [D-10] rifacimento→trasferimento, segna-come-libera, sposta-in, ricerca accende, riordino, preferenza 3 modi + `?stanza=` + voce «I lavori», auto-riparazione, PWA iOS edge-swipe, text-zoom 200%). Cleanup a baseline.
3. **FASE 9b — GATE ESTETICO L2**: `/cassette` + stanza Parete + peek/dots (390 E 768) + sheets + ConfermaCassettaSheet + riga preferenza + miniature a 22px (fallback: solo targa+colore se illeggibili — pre-ratificato) + parete «molto rossa» vs TastoPiù — 390/768/1280 × light/dark, confronto col mockup v2 (fedeltà TOTALE). Screenshot in `docs/design/screenshots/2026-07-21-parete-cassette/`.
4. **🛑 STOP** — presentare a Francesco: review + QA + L2. Merge/push SOLO su richiesta esplicita.
5. **FASE 11 — BP-1**: MEMORY.md + ROADMAP-UFFICIALE.md.
