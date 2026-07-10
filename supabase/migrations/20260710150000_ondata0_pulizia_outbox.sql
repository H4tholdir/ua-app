-- supabase/migrations/20260710150000_ondata0_pulizia_outbox.sql
-- Ondata 0 spec Portale Dentista v2 §3 punti 3-4 (audit I-1, SRE-2, F8).
-- Smonta l'infrastruttura outbox della 4a (mai usata da codice applicativo)
-- e adatta le RPC atomiche al modello "fatturazione concordata".
-- Ordine chirurgico VINCOLANTE: (a) unschedule guardato → (b) drop funzioni
-- outbox (claim_batch PRIMA del drop tabella: RETURNS SETOF fatture_outbox)
-- → (c) RPC nuove firme → (d) drop tabelle → (e) DROP EXTENSION pg_net.

-- (a) Unschedule GUARDATO dei job (in prod già rimossi a mano il 10/07:
-- un cron.unschedule('nome') nudo fallirebbe; il guardato è idempotente e
-- copre replay/ambienti nuovi dove i job rinascono dalla history 4a).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname IN ('outbox-emissione-tick', 'outbox-sorveglianza');

-- (b) Drop funzioni outbox. outbox_claim_batch PRIMA di DROP TABLE
-- fatture_outbox (dipendenza di catalogo: RETURNS SETOF fatture_outbox).
DROP FUNCTION IF EXISTS public.outbox_tick();
DROP FUNCTION IF EXISTS public.outbox_sorveglianza();
DROP FUNCTION IF EXISTS public.outbox_prepara_draft(uuid);
DROP FUNCTION IF EXISTS public.outbox_claim_batch(integer, integer);

-- (c1) consegna_finalizza_atomica: firma NUOVA senza parametri outbox.
-- DROP esplicito della vecchia firma — mai CREATE OR REPLACE con firma
-- diversa: creerebbe un overload orfano (lezione P2-9).
DROP FUNCTION IF EXISTS public.consegna_finalizza_atomica(uuid, uuid, boolean, integer);

CREATE FUNCTION public.consegna_finalizza_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE lavori SET
    stato = 'consegnato',
    consegna_in_corso = false,
    conformato = true,
    data_conformazione = now(),
    data_consegna_effettiva = now(),
    consegna_completata_at = now(),
    consegna_precheck_passato_al_primo_tentativo = true
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'consegna_finalizza: lavoro non trovato o eliminato';
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid) TO service_role;

-- (c2) annulla_consegna_atomica: stessa firma, corpo outbox-free.
-- Il claim outbox è sostituito dal DOPPIO GATE FISCALE (spec §3 punto 4):
--   (i)  esiste fattura non 'rifiutata' con lavoro_id = lavoro → fattura_gia_emessa
--   (ii) cintura: lavori.incluso_in_fattura = true → stesso esito
--        (copre fatture create da codice che non scrive ancora lavoro_id).
CREATE OR REPLACE FUNCTION public.annulla_consegna_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lavoro record;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  IF p_finestra_ms IS NULL OR p_finestra_ms < 1000 OR p_finestra_ms > 900000 THEN
    RAISE EXCEPTION 'p_finestra_ms fuori range (1s..15min)';
  END IF;

  SELECT id, stato, data_consegna_effettiva, incluso_in_fattura INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;
  IF v_lavoro.data_consegna_effettiva IS NULL
     OR now() - v_lavoro.data_consegna_effettiva > make_interval(secs => p_finestra_ms / 1000.0) THEN
    RETURN json_build_object('esito', 'finestra_scaduta');
  END IF;

  -- Doppio gate fiscale (i): fattura attiva collegata al lavoro
  PERFORM 1 FROM fatture
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato_sdi <> 'rifiutata';
  IF FOUND THEN
    RETURN json_build_object('esito', 'fattura_gia_emessa');
  END IF;

  -- Doppio gate fiscale (ii): cintura sul flag di claim
  IF v_lavoro.incluso_in_fattura THEN
    RETURN json_build_object('esito', 'fattura_gia_emessa');
  END IF;

  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'annullo: ripristino lavoro fallito'; END IF;

  -- P2-1: filtro corretto (include 'generata') + fail-closed sulla matrice esiti
  UPDATE dichiarazioni_conformita SET stato = 'annullata'
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato IN ('bozza','generata','firmata');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true; -- dato legacy/stub: consenti, segnala
    ELSE
      RAISE EXCEPTION 'annullo: DdC in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;
REVOKE ALL ON FUNCTION public.annulla_consegna_atomica(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.annulla_consegna_atomica(uuid, uuid, integer) TO service_role;

-- (d) Drop tabelle outbox (vuote sul DB live, mai usate da codice)
DROP TABLE public.fatture_outbox, public.outbox_heartbeat, public.outbox_alerts;

-- (e) DROP EXTENSION pg_net (audit F8): col modello concordato non serve a
-- nulla; eliminarla chiude alla radice il nodo dei grant non revocabili su
-- Supabase gestito (oggetti di supabase_admin — spec §10).
DROP EXTENSION IF EXISTS pg_net;
