-- supabase/migrations/20260710180000_ondata1_portale_fatturazione_concordata.sql
-- Ondata 1 spec Portale Dentista v2 §4 — proposta dentista (D7), interruttore+PIN
-- per cliente (D2, D5, F1, F4), audit dettagliato (I-3, F9), retention 24 mesi
-- (F10), azzeramento proposta su annullo consegna (§8).

-- 1. lavori: la proposta del dentista (approccio A — D7).
--    Scrivibile SOLO dall'API portale; il congelamento sta nell'API (unica
--    scrittrice), nessun trigger.
ALTER TABLE public.lavori
  ADD COLUMN proposta_dentista text NULL
    CHECK (proposta_dentista IN ('fatturare','non_fatturare')),
  ADD COLUMN proposta_at timestamptz NULL;

-- 2. clienti: interruttore per-cliente (OFF di default) + PIN.
--    portale_pin_hash: formato scrypt$N$r$p$salt$hash, input peppered
--    (HMAC-SHA256 con PORTALE_PIN_PEPPER, env server-side — MAI nel DB).
ALTER TABLE public.clienti
  ADD COLUMN portale_fatturazione_attiva boolean NOT NULL DEFAULT false,
  ADD COLUMN portale_pin_hash text NULL,
  ADD COLUMN portale_pin_tentativi int NOT NULL DEFAULT 0,
  ADD COLUMN portale_pin_bloccato_fino_a timestamptz NULL,
  ADD COLUMN portale_pin_generation int NOT NULL DEFAULT 0;

-- 3. portale_accessi: dettaglio per gli eventi nuovi (I-3, F9).
ALTER TABLE public.portale_accessi
  ADD COLUMN lavoro_id uuid NULL REFERENCES public.lavori(id),
  ADD COLUMN dettaglio jsonb NULL;

-- Indice per il rate-limit per-IP del POST pin (F5): la query filtra
-- azione+ip+created_at. Parziale sulle sole azioni PIN per tenerlo piccolo.
CREATE INDEX idx_portale_accessi_pin_ip
  ON public.portale_accessi (ip_address, created_at)
  WHERE azione IN ('pin_ok','pin_errato','pin_bloccato');

-- 4. Incremento tentativi PIN atomico single-statement (F4 — mai
--    check-then-increment). Se un blocco precedente è scaduto, il ciclo
--    riparte da 1; al 5° errore scatta il blocco di 15 minuti.
CREATE FUNCTION public.portale_pin_tentativo_fallito(p_cliente_id uuid)
RETURNS TABLE(tentativi int, bloccato_fino_a timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  UPDATE clienti SET
    portale_pin_tentativi = CASE
      WHEN portale_pin_bloccato_fino_a IS NOT NULL AND portale_pin_bloccato_fino_a <= now()
        THEN 1
      ELSE portale_pin_tentativi + 1
    END,
    portale_pin_bloccato_fino_a = CASE
      WHEN portale_pin_bloccato_fino_a IS NOT NULL AND portale_pin_bloccato_fino_a <= now()
        THEN NULL
      WHEN portale_pin_tentativi + 1 >= 5
        THEN now() + interval '15 minutes'
      ELSE portale_pin_bloccato_fino_a
    END
  WHERE id = p_cliente_id AND deleted_at IS NULL
  RETURNING portale_pin_tentativi, portale_pin_bloccato_fino_a;
$$;
REVOKE ALL ON FUNCTION public.portale_pin_tentativo_fallito(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portale_pin_tentativo_fallito(uuid) TO service_role;

-- 5. annulla_consegna_atomica: al ripristino del lavoro in 'pronto' si azzera
--    anche la proposta del dentista (§8 — la decisione_fatturazione invece
--    SOPRAVVIVE, posizione esplicita M-4). Stessa firma (uuid,uuid,integer):
--    CREATE OR REPLACE ammesso, REVOKE/GRANT rifatti comunque.
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
    consegna_in_corso = false, consegna_tap_at = NULL,
    -- Ondata 1 (§8): il lavoro esce dalla lista del portale — la proposta
    -- pre-annullo non deve rinascere alla riconsegna. Resta in portale_accessi.
    proposta_dentista = NULL, proposta_at = NULL
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

-- 6. Retention log portale: 24 mesi con purge mensile (F10).
--    cron.schedule con jobname è idempotente (upsert) su pg_cron >= 1.4
--    (già attivo sul progetto: job refresh-dashboard-kpi).
SELECT cron.schedule(
  'portale-accessi-purge',
  '15 3 1 * *',
  $$DELETE FROM public.portale_accessi WHERE created_at < now() - interval '24 months'$$
);
