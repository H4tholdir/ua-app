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
