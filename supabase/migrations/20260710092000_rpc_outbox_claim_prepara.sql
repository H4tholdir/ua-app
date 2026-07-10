-- supabase/migrations/20260710092000_rpc_outbox_claim_prepara.sql
-- Spec 4a §8 — claim SKIP LOCKED + preparazione draft transazionale (D3).

CREATE OR REPLACE FUNCTION public.outbox_claim_batch(
  p_limite integer, p_watchdog_min integer
) RETURNS SETOF public.fatture_outbox
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_limite IS NULL OR p_limite < 1 OR p_limite > 100 THEN
    RAISE EXCEPTION 'p_limite fuori range (1..100)';
  END IF;
  IF p_watchdog_min IS NULL OR p_watchdog_min < 1 OR p_watchdog_min > 60 THEN
    RAISE EXCEPTION 'p_watchdog_min fuori range (1..60)';
  END IF;

  -- Watchdog: entry incastrate (crash a metà batch) tornano in_attesa.
  -- NON incrementa tentativi: il conteggio riflette fallimenti reali, non timeout altrui.
  UPDATE fatture_outbox SET stato = 'in_attesa', updated_at = now()
  WHERE stato = 'in_lavorazione'
    AND updated_at < now() - make_interval(mins => p_watchdog_min);

  RETURN QUERY
  UPDATE fatture_outbox SET stato = 'in_lavorazione', updated_at = now()
  WHERE id IN (
    SELECT id FROM fatture_outbox
    WHERE stato = 'in_attesa' AND emetti_dopo <= now()
    ORDER BY emetti_dopo
    LIMIT p_limite
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_claim_batch(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_claim_batch(integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.outbox_prepara_draft(p_entry_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_entry record;
  v_lavoro record;
  v_rows int;
  v_anno int;
  v_prog int;
  v_numero text;
  v_fattura_id uuid;
BEGIN
  SELECT * INTO v_entry FROM fatture_outbox WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND OR v_entry.stato <> 'in_lavorazione' THEN
    RETURN json_build_object('esito', 'entry_non_claimata');
  END IF;

  -- Ripresa idempotente post-crash: il draft esiste già, riusalo.
  IF v_entry.fattura_id IS NOT NULL THEN
    RETURN json_build_object('esito', 'ok', 'fattura_id', v_entry.fattura_id, 'ripresa', true);
  END IF;

  SELECT id, stato, deleted_at, decisione_fatturazione, incluso_in_fattura, cliente_id INTO v_lavoro
  FROM lavori
  WHERE id = v_entry.lavoro_id AND laboratorio_id = v_entry.laboratorio_id
  FOR UPDATE;
  IF NOT FOUND OR v_lavoro.deleted_at IS NOT NULL OR v_lavoro.stato <> 'consegnato' THEN
    RETURN json_build_object('esito', 'lavoro_non_consegnato');
  END IF;

  -- D3 "emetti salvo rifiuto"
  IF v_lavoro.decisione_fatturazione = 'non_fatturare' THEN
    RETURN json_build_object('esito', 'saltata_decisione');
  END IF;

  -- Claim atomico anti doppia-fatturazione (pattern batch/route.ts)
  UPDATE lavori SET incluso_in_fattura = true
  WHERE id = v_lavoro.id AND laboratorio_id = v_entry.laboratorio_id
    AND incluso_in_fattura = false;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito', 'gia_fatturato');
  END IF;

  -- SOLO QUI si consuma il progressivo (P2-5); data/anno congelati sul draft.
  v_anno := EXTRACT(year FROM now())::int;
  v_prog := public.genera_progressivo(v_entry.laboratorio_id, 'fattura', v_anno);
  v_numero := v_anno::text || '-' || lpad(v_prog::text, 4, '0');

  INSERT INTO fatture (laboratorio_id, cliente_id, lavoro_id, numero, anno, progressivo,
                       data, tipo_documento, stato_sdi, imponibile, iva_importo, bollo, totale)
  VALUES (v_entry.laboratorio_id, v_lavoro.cliente_id, v_entry.lavoro_id, v_numero, v_anno, v_prog,
          CURRENT_DATE, 'TD01', 'draft', 0, 0, 0, 0)
  RETURNING id INTO v_fattura_id;

  UPDATE fatture_outbox SET fattura_id = v_fattura_id, updated_at = now() WHERE id = p_entry_id;

  RETURN json_build_object('esito', 'ok', 'fattura_id', v_fattura_id, 'ripresa', false);
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_prepara_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_prepara_draft(uuid) TO service_role;
