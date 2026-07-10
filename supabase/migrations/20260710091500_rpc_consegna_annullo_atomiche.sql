-- supabase/migrations/20260710091500_rpc_consegna_annullo_atomiche.sql
-- Spec 4a §5-§6 — transizioni fiscali atomiche.

CREATE OR REPLACE FUNCTION public.consegna_finalizza_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_cliente_fatturabile boolean, p_finestra_ms integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_rows int;
  v_emetti_dopo timestamptz;
BEGIN
  IF p_finestra_ms IS NULL OR p_finestra_ms < 1000 OR p_finestra_ms > 900000 THEN
    RAISE EXCEPTION 'p_finestra_ms fuori range (1s..15min)';
  END IF;

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

  IF p_cliente_fatturabile THEN
    v_emetti_dopo := now() + make_interval(secs => p_finestra_ms / 1000.0);
    INSERT INTO fatture_outbox (laboratorio_id, lavoro_id, emetti_dopo)
    VALUES (p_laboratorio_id, p_lavoro_id, v_emetti_dopo)
    ON CONFLICT (lavoro_id) WHERE stato IN ('in_attesa','in_lavorazione')
    DO UPDATE SET emetti_dopo = EXCLUDED.emetti_dopo, tentativi = 0, stato = 'in_attesa',
                  fattura_id = NULL, ultimo_errore = NULL, motivo_salto = NULL, updated_at = now();
    RETURN json_build_object('ok', true, 'fattura_programmata', true, 'emetti_dopo', v_emetti_dopo);
  END IF;

  RETURN json_build_object('ok', true, 'fattura_programmata', false);
END;
$$;
REVOKE ALL ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid, boolean, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.annulla_consegna_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms integer
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_lavoro record;
  v_entry record;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  IF p_finestra_ms IS NULL OR p_finestra_ms < 1000 OR p_finestra_ms > 900000 THEN
    RAISE EXCEPTION 'p_finestra_ms fuori range (1s..15min)';
  END IF;

  SELECT id, stato, data_consegna_effettiva INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;
  IF v_lavoro.data_consegna_effettiva IS NULL
     OR now() - v_lavoro.data_consegna_effettiva > make_interval(secs => p_finestra_ms / 1000.0) THEN
    RETURN json_build_object('esito', 'finestra_scaduta');
  END IF;

  -- Claim fiscale: l'arbitro tra annullo e cron è il lock di riga.
  -- 0 righe = nessuna entry (cliente non fatturabile) → l'annullo PROCEDE.
  -- Priorità esplicita agli stati bloccanti (emessa > in_lavorazione > in_attesa):
  -- una entry emessa/in_lavorazione coesistente non deve MAI essere oscurata
  -- da una in_attesa più recente (es. re-inserita da un retry), altrimenti
  -- l'annullo bypasserebbe il gate fattura_gia_emessa/fattura_in_emissione.
  SELECT id, stato, fattura_id INTO v_entry
  FROM fatture_outbox
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato IN ('in_attesa','in_lavorazione','emessa')
  ORDER BY CASE stato WHEN 'emessa' THEN 0 WHEN 'in_lavorazione' THEN 1 ELSE 2 END,
           created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF FOUND THEN
    IF v_entry.stato = 'in_lavorazione' THEN
      RETURN json_build_object('esito', 'fattura_in_emissione');
    END IF;
    IF v_entry.stato = 'emessa' OR v_entry.fattura_id IS NOT NULL THEN
      RETURN json_build_object('esito', 'fattura_gia_emessa');
    END IF;
    UPDATE fatture_outbox SET stato = 'annullata', updated_at = now() WHERE id = v_entry.id;
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
