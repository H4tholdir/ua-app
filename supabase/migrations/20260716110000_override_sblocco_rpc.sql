-- Task 12b: atomicità UPDATE fattura + INSERT evento audit per
-- override/sblocco-claim (finding review post-Task 12, commit 460b14c+
-- 9892177: due round-trip separati potevano lasciare uno stato fiscale
-- cambiato senza traccia audit se l'INSERT falliva dopo l'UPDATE riuscito —
-- dominio ITCA). Pattern ricalcato da public.applica_ricevuta_sdi
-- (migration 20260716100000_ricevute_sdi_rpc.sql): writer transazionale
-- SECURITY DEFINER, guardie difensive replicate anche qui benché la route
-- le esegua già pre-RPC (difesa in profondità).

-- ─── override_stato_sdi ─────────────────────────────────────────────────
-- Override manuale titolare-only di uno stato SdI (Task 12). La route resta
-- responsabile di: ruolo titolare, rank client-side, doppia conferma TD04
-- (conferma_effetti_storno) — qui solo le guardie sul dato persistito.
CREATE OR REPLACE FUNCTION public.override_stato_sdi(
  p_fattura_id uuid,
  p_laboratorio_id uuid,
  p_stato_atteso text,
  p_nuovo_stato text,
  p_motivo text,
  p_registrato_da uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_fatt public.fatture%ROWTYPE;
  v_rows int;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RETURN json_build_object('esito','motivo_mancante');
  END IF;

  IF p_nuovo_stato NOT IN ('pec_consegnata','accettata','rifiutata') THEN
    RETURN json_build_object('esito','non_ammesso');
  END IF;

  SELECT * INTO v_fatt FROM public.fatture
   WHERE id = p_fattura_id AND laboratorio_id = p_laboratorio_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_trovato'); END IF;

  IF v_fatt.stato_sdi <> p_stato_atteso THEN
    RETURN json_build_object('esito','stato_stantio','stato_corrente',v_fatt.stato_sdi);
  END IF;

  -- Monotonia STRETTA (spec §4.4, stessa mappa di public.rank_stato_sdi).
  IF public.rank_stato_sdi(p_nuovo_stato) <= public.rank_stato_sdi(v_fatt.stato_sdi) THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_corrente',v_fatt.stato_sdi);
  END IF;

  -- UPDATE guardato sullo stato letto (FOR UPDATE tiene il lock; la guardia
  -- è difesa in profondità + ROW_COUNT verificato).
  UPDATE public.fatture SET stato_sdi = p_nuovo_stato
   WHERE id = v_fatt.id AND laboratorio_id = p_laboratorio_id
     AND stato_sdi = v_fatt.stato_sdi;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito','stato_stantio','stato_corrente',v_fatt.stato_sdi);
  END IF;

  INSERT INTO public.fatture_sdi_eventi (
    laboratorio_id, fattura_id, origine, stato_da, stato_a, motivo, registrato_da
  ) VALUES (
    p_laboratorio_id, v_fatt.id, 'override_manuale', v_fatt.stato_sdi, p_nuovo_stato, p_motivo, p_registrato_da
  );

  RETURN json_build_object('esito','applicato','stato_da',v_fatt.stato_sdi,'stato_a',p_nuovo_stato);
END;
$$;

REVOKE ALL ON FUNCTION public.override_stato_sdi(uuid, uuid, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.override_stato_sdi(uuid, uuid, text, text, text, uuid) TO service_role;

-- ─── sblocca_claim_fattura ──────────────────────────────────────────────
-- Sblocco titolare-only del claim anti-doppio-invio PEC su claim orfano
-- (Task 12). La route resta responsabile di: ruolo titolare, conferma
-- esplicita verificata_cartella_inviata.
CREATE OR REPLACE FUNCTION public.sblocca_claim_fattura(
  p_fattura_id uuid,
  p_laboratorio_id uuid,
  p_motivo text,
  p_registrato_da uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_fatt public.fatture%ROWTYPE;
  v_rows int;
BEGIN
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN
    RETURN json_build_object('esito','motivo_mancante');
  END IF;

  SELECT * INTO v_fatt FROM public.fatture
   WHERE id = p_fattura_id AND laboratorio_id = p_laboratorio_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_trovato'); END IF;

  IF v_fatt.stato_sdi <> 'generata' OR v_fatt.smtp_inviata_at IS NULL THEN
    RETURN json_build_object('esito','non_in_claim','stato_corrente',v_fatt.stato_sdi);
  END IF;

  UPDATE public.fatture SET smtp_inviata_at = NULL
   WHERE id = v_fatt.id AND laboratorio_id = p_laboratorio_id
     AND stato_sdi = 'generata' AND smtp_inviata_at IS NOT NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito','non_in_claim','stato_corrente',v_fatt.stato_sdi);
  END IF;

  INSERT INTO public.fatture_sdi_eventi (
    laboratorio_id, fattura_id, origine, motivo, registrato_da
  ) VALUES (
    p_laboratorio_id, v_fatt.id, 'sblocco_claim', p_motivo, p_registrato_da
  );

  RETURN json_build_object('esito','sbloccato');
END;
$$;

REVOKE ALL ON FUNCTION public.sblocca_claim_fattura(uuid, uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sblocca_claim_fattura(uuid, uuid, text, uuid) TO service_role;
