-- 20260721090000_parete_cassette.sql
-- Parete delle Cassette: cassette + storico cassette_lavori + RPC (una sola penna).
-- Spec: docs/superpowers/specs/2026-07-21-parete-cassette-design.md §4
--
-- VERSIONE CORRETTA dopo il panel advisor del 21/07/2026 (.superpowers/sdd/panel-backend.md §3,
-- panel-security.md, panel-architetto.md) e le decisioni ratificate da Francesco
-- (.superpowers/sdd/task-1-decisioni-ratificate.md R-1…R-6). Sostituisce integralmente la
-- prima stesura (commit e1fa4fd), che conteneva 1 Critical + 7 Important + 2 deadlock riproducibili.
--
-- Questo file NON contiene il backfill: sta in 20260721090200_parete_cassette_backfill.sql (R-1).
-- Co-requisito bloccante dello stesso deploy: 20260721090100_admin_delete_laboratorio_cassette.sql (R-3).
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration in una transazione
-- e un COMMIT interno la chiuderebbe prima della registrazione in supabase_migrations (N6, verificato).
--
-- ============================================================================
-- ORDINE CANONICO DEI LOCK (convenzione di questa ondata — non facoltativa):
--   cassette → cassette_lavori → lavori → (trigger) dashboard_kpi_cache
--
-- REGOLA D'ORO: chiunque apra una riga viva su una cassetta deve PRIMA prendere
--   SELECT … FROM cassette WHERE id=… AND laboratorio_id=p_lab AND deleted_at IS NULL FOR UPDATE.
-- Motivo: la FK cassette_lavori.cassetta_id → cassette.id prende comunque FOR KEY SHARE sulla
-- riga padre a fine statement. Chi inserisce SENZA aver preso il lock prima lo prende DOPO aver
-- già scritto l'entry di indice → inversione d'ordine → deadlock 40P01 (riprodotto dal panel).
-- ============================================================================

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

-- ============ TRIGGER APPEND-ONLY (§3.0 panel-backend, con la deroga di purga di R-3) ============
-- L'invariante non è «le righe sono eterne» ma «la storia di un tenant ESISTENTE è immutabile»:
-- la purga amministrativa non riscrive la storia, la fa sparire insieme al soggetto (art. 17 GDPR).
CREATE FUNCTION public.cassette_lavori_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- varco unico, tracciabile e grep-abile: purga amministrativa del lab
    -- (public.cassette_purge_lab, chiamata da admin_delete_laboratorio).
    -- set_config(..., true) = LOCAL alla transazione: non sopravvive al commit,
    -- non passa ad altre sessioni, ed è vincolato a QUESTO laboratorio_id.
    IF coalesce(current_setting('ua.purga_lab', true), '') = OLD.laboratorio_id::text THEN
      RETURN OLD;
    END IF;
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
-- R-4.4: REVOKE ALL (chiude anche TRUNCATE/REFERENCES/TRIGGER) + GRANT SELECT esplicito
-- (senza, la lettura resterebbe appesa ai default privileges di Supabase).
ALTER TABLE cassette ENABLE ROW LEVEL SECURITY;
CREATE POLICY cassette_select ON cassette FOR SELECT TO authenticated
  USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);

ALTER TABLE cassette_lavori ENABLE ROW LEVEL SECURITY;
CREATE POLICY cassette_lavori_select ON cassette_lavori FOR SELECT TO authenticated
  USING (laboratorio_id = public.current_lab_id());

REVOKE ALL ON cassette        FROM anon, authenticated;
REVOKE ALL ON cassette_lavori FROM anon, authenticated;
GRANT SELECT ON cassette, cassette_lavori TO authenticated;

-- ============ RPC ============
-- NOTA ARCHITETTURALE: la liberazione alla consegna è agganciata in
-- src/lib/consegna/orchestrate.ts (Step 5). Se una futura ondata attiva la RPC
-- dormiente consegna_finalizza_atomica come percorso di consegna, portare
-- la chiamata a cassetta_libera_atomica anche lì.
--
-- R-5 (ratificata): nessun esito nuovo rispetto alla tabella dei contratti §4.3.
-- Nome e colore si validano IN ROUTE; qui l'unica reazione a un input impossibile
-- è un errore di programmazione (RAISE) o l'esito già previsto `cassetta_non_trovata`.

CREATE FUNCTION public.cassetta_libera_atomica(p_lab uuid, p_lavoro uuid, p_motivo text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_nome text;
BEGIN
  -- p_motivo NULL scavalcava il NOT IN (NULL → UNKNOWN → nessun ramo) e finiva in
  -- violazione di CHECK invece che in un esito (finding #3, riprodotto).
  IF p_motivo IS NULL
     OR p_motivo NOT IN ('consegna','manuale','spostamento','annullo_lavoro','rifacimento') THEN
    RETURN json_build_object('esito','motivo_non_valido');
  END IF;
  UPDATE cassette_lavori cl SET liberato_at = now(), liberato_per = p_motivo
  FROM cassette c
  WHERE cl.lavoro_id = p_lavoro AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL
    AND c.id = cl.cassetta_id
  RETURNING c.nome INTO v_nome;
  -- azzera la denorm SOLO se davvero non resta nessuna riga viva (altrimenti si cancella
  -- l'assegnazione che un'altra transazione ha appena creato: desync N4, riprodotto a 2 sessioni)
  UPDATE lavori l SET numero_cassetta = NULL
  WHERE l.id = p_lavoro AND l.laboratorio_id = p_lab AND l.numero_cassetta IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM cassette_lavori cl2
                    WHERE cl2.lavoro_id = p_lavoro AND cl2.liberato_at IS NULL);
  RETURN json_build_object('esito','ok','nome', v_nome);  -- nome NULL = niente da liberare (idempotente)
END $$;

CREATE FUNCTION public.cassetta_assegna_atomica(
  p_lab uuid, p_lavoro uuid, p_cassetta_id uuid DEFAULT NULL,
  p_nome text DEFAULT NULL, p_colore text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_cassetta_id uuid; v_nome text; v_occupante uuid; v_stato_occ text; v_del_occ timestamptz;
BEGIN
  -- (-1) colore: la route lo valida (R-5, nessun esito nuovo). Se arriva qui sbagliato è un
  -- errore di programmazione: RAISE parlante invece di una violazione di CHECK opaca (m3).
  IF p_colore IS NOT NULL
     AND p_colore NOT IN ('bianca','azzurra','rossa','blu','verde','grigia')
     AND p_colore !~ '^#[0-9A-F]{6}$' THEN
    RAISE EXCEPTION 'colore cassetta non valido: %', p_colore;
  END IF;

  -- (0) lavoro del lab, vivo, non chiuso
  PERFORM 1 FROM lavori WHERE id = p_lavoro AND laboratorio_id = p_lab
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
  IF NOT FOUND THEN RETURN json_build_object('esito','lavoro_non_valido'); END IF;

  -- (1) cassetta: SEMPRE con FOR UPDATE prima di qualunque scrittura sullo storico (regola d'oro)
  IF p_cassetta_id IS NOT NULL THEN
    SELECT id, nome INTO v_cassetta_id, v_nome FROM cassette
    WHERE id = p_cassetta_id AND laboratorio_id = p_lab AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('esito','cassetta_non_trovata'); END IF;
  ELSIF p_nome IS NOT NULL AND char_length(btrim(p_nome)) BETWEEN 1 AND 20 THEN
    -- get-or-create race-safe sull'indice parziale a espressione (inferenza con predicato)
    INSERT INTO cassette (laboratorio_id, nome, colore, posizione)
    VALUES (p_lab, btrim(p_nome), COALESCE(p_colore,'bianca'),
            COALESCE((SELECT max(posizione)+1 FROM cassette WHERE laboratorio_id = p_lab AND deleted_at IS NULL), 0))
    ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL
    DO UPDATE SET updated_at = now()
    RETURNING id, nome INTO v_cassetta_id, v_nome;
    -- ridondante (ON CONFLICT DO UPDATE ha già bloccato la riga) ma esplicita la disciplina di lock
    PERFORM 1 FROM cassette WHERE id = v_cassetta_id AND laboratorio_id = p_lab FOR UPDATE;
  ELSE
    -- nome assente/vuoto/>20: la route lo valida prima (R-5). Esito già previsto dal contratto.
    RETURN json_build_object('esito','cassetta_non_trovata');
  END IF;

  -- (2) chi c'è dentro adesso (sotto il lock della cassetta)
  SELECT cl.lavoro_id, l.stato, l.deleted_at INTO v_occupante, v_stato_occ, v_del_occ
  FROM cassette_lavori cl JOIN lavori l ON l.id = cl.lavoro_id
  WHERE cl.cassetta_id = v_cassetta_id AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL;

  -- (2b) auto-riparazione: occupante chiuso/soft-deleted → chiudi con il motivo GIUSTO (R-4.1).
  -- Con l'etichetta fissa 'consegna' un lavoro ANNULLATO restava eleggibile per
  -- cassetta_riassegna_post_annullo (esito `riassegnata` riprodotto su lavoro annullato).
  IF v_occupante IS NOT NULL AND (v_stato_occ IN ('consegnato','annullato') OR v_del_occ IS NOT NULL) THEN
    UPDATE cassette_lavori SET liberato_at = now(),
      liberato_per = CASE WHEN v_stato_occ = 'consegnato' THEN 'consegna' ELSE 'annullo_lavoro' END
    WHERE cassetta_id = v_cassetta_id AND laboratorio_id = p_lab AND liberato_at IS NULL;
    UPDATE lavori SET numero_cassetta = NULL WHERE id = v_occupante AND laboratorio_id = p_lab;
    v_occupante := NULL;
  END IF;

  -- (3) PRE-CHECK sotto il lock: nessuna scrittura prima di sapere che si può entrare (finding #1)
  IF v_occupante = p_lavoro THEN                 -- già dentro: idempotente, niente riga spuria (m5)
    UPDATE lavori SET numero_cassetta = v_nome
    WHERE id = p_lavoro AND laboratorio_id = p_lab AND numero_cassetta IS DISTINCT FROM v_nome;
    RETURN json_build_object('esito','ok','cassetta_id', v_cassetta_id,'nome', v_nome);
  END IF;
  IF v_occupante IS NOT NULL THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);
  END IF;

  -- (4) sfratto + ingresso NELLO STESSO blocco: o passano insieme o fanno rollback insieme.
  -- Un sotto-blocco EXCEPTION è una subtransazione: quello che sta FUORI resta committato.
  BEGIN
    UPDATE cassette_lavori SET liberato_at = now(), liberato_per = 'spostamento'
    WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND liberato_at IS NULL;
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
    UPDATE cassette SET nome = btrim(p_nome), updated_at = now()
    WHERE id = p_cassetta_id AND laboratorio_id = p_lab;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','nome_occupato');
  END;
  SELECT lavoro_id INTO v_lavoro FROM cassette_lavori
  WHERE cassetta_id = p_cassetta_id AND laboratorio_id = p_lab AND liberato_at IS NULL;
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
  PERFORM 1 FROM cassette_lavori
   WHERE cassetta_id = p_cassetta_id AND laboratorio_id = p_lab AND liberato_at IS NULL;
  IF FOUND THEN RETURN json_build_object('esito','occupata'); END IF;
  UPDATE cassette SET deleted_at = now(), updated_at = now()
   WHERE id = p_cassetta_id AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','ok');
END $$;

CREATE FUNCTION public.cassette_riordina(p_lab uuid, p_ordine uuid[])
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_n int;
BEGIN
  IF p_ordine IS NULL OR array_length(p_ordine,1) IS NULL THEN
    RETURN json_build_object('esito','ordine_non_valido');
  END IF;
  IF array_position(p_ordine, NULL) IS NOT NULL THEN
    RETURN json_build_object('esito','ordine_non_valido');            -- elementi NULL
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_ordine) x) <> array_length(p_ordine,1) THEN
    RETURN json_build_object('esito','ordine_non_valido');            -- duplicati
  END IF;
  -- lock deterministico (LockRows sopra Sort ⇒ acquisizione in ordine di id): due riordini
  -- concorrenti in senso opposto non possono più incrociarsi (deadlock N3, riprodotto 2/3).
  -- FOR NO KEY UPDATE, non FOR UPDATE: cambiamo solo colonne non-chiave, così non blocchiamo
  -- le FK degli INSERT su cassette_lavori.
  PERFORM 1 FROM cassette
   WHERE laboratorio_id = p_lab AND deleted_at IS NULL
   ORDER BY id FOR NO KEY UPDATE;
  SELECT count(*) INTO v_n FROM cassette
  WHERE id = ANY(p_ordine) AND laboratorio_id = p_lab AND deleted_at IS NULL;
  IF v_n <> array_length(p_ordine,1) THEN
    RETURN json_build_object('esito','ordine_non_valido');            -- id estranei/morti
  END IF;
  UPDATE cassette c SET posizione = (o.ord - 1)::int, updated_at = now()
  FROM unnest(p_ordine) WITH ORDINALITY o(id, ord)
  WHERE c.id = o.id AND c.laboratorio_id = p_lab AND c.deleted_at IS NULL;
  -- politica tollerante: le vive non elencate scivolano in coda, ordine relativo conservato
  UPDATE cassette c SET posizione = (array_length(p_ordine,1) + r.rk - 1)::int, updated_at = now()
  FROM (SELECT id, row_number() OVER (ORDER BY posizione, created_at, id) rk
        FROM cassette WHERE laboratorio_id = p_lab AND deleted_at IS NULL
          AND NOT (id = ANY(p_ordine))) r
  WHERE c.id = r.id AND c.laboratorio_id = p_lab;
  RETURN json_build_object('esito','ok');
END $$;

CREATE FUNCTION public.cassetta_riassegna_post_annullo(p_lab uuid, p_lavoro uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_cassetta uuid; v_nome text;
BEGIN
  -- (finding #6) senza questa guardia si apriva una riga viva per un lavoro annullato.
  -- `lavoro_non_valido` non è un esito «di comodo» (R-5 vieta quelli): è il fix di un finding
  -- Important e NON è risolvibile in route. La route del Task 9 lo racconta come
  -- `niente_da_riassegnare` ma lo LOGGA: significa che l'annullo consegna non ha riaperto il lavoro.
  PERFORM 1 FROM lavori WHERE id = p_lavoro AND laboratorio_id = p_lab
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
  IF NOT FOUND THEN RETURN json_build_object('esito','lavoro_non_valido'); END IF;

  SELECT cl.cassetta_id INTO v_cassetta
  FROM cassette_lavori cl JOIN cassette c ON c.id = cl.cassetta_id
  WHERE cl.lavoro_id = p_lavoro AND cl.laboratorio_id = p_lab
    AND cl.liberato_per = 'consegna' AND c.deleted_at IS NULL
  ORDER BY cl.liberato_at DESC LIMIT 1;
  IF v_cassetta IS NULL THEN RETURN json_build_object('esito','niente_da_riassegnare'); END IF;

  -- regola d'oro: lock della cassetta PRIMA dell'INSERT, con ricontrollo deleted_at
  -- (sotto READ COMMITTED chi si sblocca rilegge la riga e la scarta se non soddisfa più il WHERE)
  SELECT nome INTO v_nome FROM cassette
  WHERE id = v_cassetta AND laboratorio_id = p_lab AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','niente_da_riassegnare'); END IF;

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
DECLARE v_cassetta uuid; v_nome text; v_occupante uuid;
BEGIN
  -- D-10 (ratificata 21/07): al rifacimento la cassetta SI TRASFERISCE al lavoro nuovo
  -- (fisicamente il caso resta nella stessa cassetta). La RPC 007 crea_rifacimento_atomico NON si tocca.
  -- N5: si valida anche lo stato del lavoro nuovo, non solo deleted_at.
  PERFORM 1 FROM lavori WHERE id = p_lavoro_nuovo AND laboratorio_id = p_lab
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
  IF NOT FOUND THEN RETURN json_build_object('esito','lavoro_non_valido'); END IF;

  -- 1) trova la cassetta SENZA lock, 2) prendi il lock sulla cassetta, 3) poi blocca la riga storico:
  --    è l'ordine canonico cassette → cassette_lavori (l'inverso è il deadlock N2)
  SELECT cl.cassetta_id INTO v_cassetta
  FROM cassette_lavori cl
  WHERE cl.lavoro_id = p_lavoro_vecchio AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL;
  IF v_cassetta IS NULL THEN RETURN json_build_object('esito','niente_da_trasferire'); END IF;

  SELECT nome INTO v_nome FROM cassette
  WHERE id = v_cassetta AND laboratorio_id = p_lab AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','niente_da_trasferire'); END IF;

  SELECT cl.lavoro_id INTO v_occupante FROM cassette_lavori cl
  WHERE cl.cassetta_id = v_cassetta AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL
  FOR UPDATE OF cl;
  IF v_occupante IS DISTINCT FROM p_lavoro_vecchio THEN
    RETURN json_build_object('esito','niente_da_trasferire');   -- è cambiato tutto nel frattempo
  END IF;

  IF EXISTS (SELECT 1 FROM cassette_lavori
             WHERE lavoro_id = p_lavoro_nuovo AND liberato_at IS NULL) THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);  -- pre-check: nessuno sfratto (finding #4)
  END IF;

  BEGIN
    UPDATE cassette_lavori SET liberato_at = now(), liberato_per = 'rifacimento'
    WHERE lavoro_id = p_lavoro_vecchio AND laboratorio_id = p_lab AND liberato_at IS NULL;
    INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id)
    VALUES (p_lab, v_cassetta, p_lavoro_nuovo);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);
  END;
  UPDATE lavori SET numero_cassetta = NULL   WHERE id = p_lavoro_vecchio AND laboratorio_id = p_lab;
  UPDATE lavori SET numero_cassetta = v_nome WHERE id = p_lavoro_nuovo  AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','trasferita','nome', v_nome);
END $$;

-- R-4.3: firma con p_lab. L'UPDATE si chiude su laboratorio_id = p_lab AND deleted_at IS NULL:
-- una route bacata può al massimo toccare utenti del PROPRIO lab (difesa in profondità —
-- auth.uid() è NULL sotto service_role, quindi il vincolo «solo self» non è esprimibile qui).
-- Il Task 6 deve passare context.laboratorioId oltre a context.userId.
-- Le RAISE restano: sono errori di programmazione, non esiti di dominio (la route non deve produrli).
CREATE FUNCTION public.utente_set_nav_pref(p_lab uuid, p_user uuid, p_chiave text, p_valore jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_lab   IS NULL THEN RAISE EXCEPTION 'p_lab obbligatorio'; END IF;
  IF p_user  IS NULL THEN RAISE EXCEPTION 'p_user obbligatorio'; END IF;
  -- p_valore NULL scriveva {"home": null} scavalcando l'allowlist (finding #3, riprodotto);
  -- 'null'::jsonb era invece già respinto correttamente.
  IF p_valore IS NULL THEN RAISE EXCEPTION 'valore nav_preferences non valido: NULL'; END IF;
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
  -- Nessuna RAISE sul «0 righe aggiornate»: R-4.3 ratifica esplicitamente il NO-OP SILENZIOSO per
  -- gli utenti con laboratorio_id NULL (admin_sistema — non usano la home di lab). Una RAISE qui
  -- sarebbe raggiungibile dalla route, contro il principio di §3.9 («la route non deve mai produrle»).
  UPDATE utenti SET nav_preferences =
    coalesce(nav_preferences,'{}'::jsonb) || jsonb_build_object(p_chiave, p_valore)
  WHERE id = p_user AND laboratorio_id = p_lab AND deleted_at IS NULL;
END $$;

-- GRANT/REVOKE su tutte le RPC (firme identiche alle definizioni, default inclusi)
REVOKE EXECUTE ON FUNCTION public.cassetta_libera_atomica(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_assegna_atomica(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_rinomina_atomica(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_elimina_atomica(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassette_riordina(uuid,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_riassegna_post_annullo(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_trasferisci_rifacimento(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.utente_set_nav_pref(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cassetta_libera_atomica(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_assegna_atomica(uuid,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_rinomina_atomica(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_elimina_atomica(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassette_riordina(uuid,uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_riassegna_post_annullo(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_trasferisci_rifacimento(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.utente_set_nav_pref(uuid,uuid,text,jsonb) TO service_role;
