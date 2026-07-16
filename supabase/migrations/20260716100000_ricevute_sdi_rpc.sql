-- Spec R1 §3.1 + §4.4
ALTER TABLE public.fatture ADD COLUMN IF NOT EXISTS identificativo_sdi text;
CREATE INDEX IF NOT EXISTS fatture_identificativo_sdi_idx
  ON public.fatture (laboratorio_id, identificativo_sdi)
  WHERE identificativo_sdi IS NOT NULL;

ALTER TABLE public.laboratori ADD COLUMN IF NOT EXISTS pec_sdi_address text;
COMMENT ON COLUMN public.laboratori.pec_sdi_address IS
  'Indirizzo PEC sdiNN comunicato da SdI dopo il primo invio (spec R1 D-6). NULL = usare sdi01@pec.fatturapa.it.';

-- Rank macchina a stati (spec §4.4) — monotonia STRETTA, 8 stati del CHECK live.
CREATE OR REPLACE FUNCTION public.rank_stato_sdi(p_stato text)
RETURNS int LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_stato
    WHEN 'draft' THEN 0 WHEN 'generata' THEN 1 WHEN 'smtp_inviata' THEN 2
    WHEN 'pec_consegnata' THEN 3 WHEN 'ricevuta_sdi' THEN 4 WHEN 'scaduta' THEN 5
    WHEN 'accettata' THEN 6 WHEN 'rifiutata' THEN 6 ELSE -1 END
$$;

-- Writer unico post-invio (spec §4.4). Nessun altro percorso applicativo
-- scrive stato_sdi oltre smtp_inviata.
CREATE OR REPLACE FUNCTION public.applica_ricevuta_sdi(
  p_evento_id uuid, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_ev public.fatture_sdi_eventi%ROWTYPE;
  v_fatt public.fatture%ROWTYPE;
  v_stato_a text;
  v_rows int;
BEGIN
  SELECT * INTO v_ev FROM public.fatture_sdi_eventi
   WHERE id = p_evento_id AND laboratorio_id = p_laboratorio_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_trovato'); END IF;

  IF v_ev.stato_a IS NOT NULL THEN
    RETURN json_build_object('esito','duplicata','stato_da',v_ev.stato_da,'stato_a',v_ev.stato_a);
  END IF;
  IF v_ev.origine <> 'upload_verificato' OR v_ev.esito_verifica_firma IS DISTINCT FROM 'valida' THEN
    RETURN json_build_object('esito','quarantena');
  END IF;
  IF v_ev.fattura_id IS NULL THEN RETURN json_build_object('esito','non_matchata'); END IF;

  SELECT * INTO v_fatt FROM public.fatture
   WHERE id = v_ev.fattura_id AND laboratorio_id = p_laboratorio_id
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','non_matchata'); END IF;

  -- Conferma identificativo (spec §4.3): mismatch = fail-closed.
  IF v_fatt.identificativo_sdi IS NOT NULL
     AND v_ev.identificativo_sdi IS NOT NULL
     AND v_fatt.identificativo_sdi <> v_ev.identificativo_sdi THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- Transizione RICALCOLATA dallo stato corrente (mai dal payload — spec §4.4).
  v_stato_a := CASE v_ev.tipo_ricevuta
    WHEN 'RC' THEN 'accettata'
    WHEN 'MC' THEN 'accettata'
    WHEN 'NS' THEN 'rifiutata'
    WHEN 'NE' THEN CASE v_ev.esito_committente WHEN 'EC01' THEN 'accettata' ELSE NULL END
    ELSE NULL END;               -- EC02 / DT / AT: mai transizione automatica (D-5)
  IF v_stato_a IS NULL THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- Monotonia STRETTA + gate «mai inviata»: una ricevuta può esistere solo se
  -- la mail è partita. generata + smtp_inviata_at NOT NULL = claim orfano →
  -- avanzabile (prova d'invio, D-3); generata + NULL = mai inviata → rifiuta.
  IF v_fatt.stato_sdi = 'generata' AND v_fatt.smtp_inviata_at IS NULL THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;
  IF public.rank_stato_sdi(v_stato_a) <= public.rank_stato_sdi(v_fatt.stato_sdi) THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- UPDATE guardato sullo stato letto (FOR UPDATE tiene il lock; la guardia è
  -- difesa in profondità + ROW_COUNT verificato — spec §4.4).
  UPDATE public.fatture SET
    stato_sdi = v_stato_a,
    identificativo_sdi = COALESCE(identificativo_sdi, v_ev.identificativo_sdi),
    ricevuta_sdi_at = CASE WHEN v_ev.tipo_ricevuta IN ('RC','MC','NE') THEN COALESCE(ricevuta_sdi_at, now()) ELSE ricevuta_sdi_at END,
    sdi_risposta_at = now(),
    codice_esito_sdi = CASE WHEN v_ev.tipo_ricevuta = 'NE' THEN v_ev.esito_committente ELSE v_ev.tipo_ricevuta END,
    messaggio_esito_sdi = CASE WHEN v_ev.tipo_ricevuta = 'NS'
      THEN 'Scartata da SdI — vedi dettaglio errori' ELSE messaggio_esito_sdi END,
    xml_errori_sdi = CASE WHEN v_ev.tipo_ricevuta = 'NS' THEN v_ev.lista_errori::text ELSE xml_errori_sdi END,
    -- riparazione claim orfano (D-3): la ricevuta è prova d'invio
    inviata_via = COALESCE(inviata_via, 'pec'),
    inviata_at = COALESCE(inviata_at, now())
  WHERE id = v_fatt.id AND laboratorio_id = p_laboratorio_id
    AND stato_sdi = v_fatt.stato_sdi;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito','stato_incompatibile','stato_da',v_fatt.stato_sdi);
  END IF;

  -- Completa l'evento (unico UPDATE ammesso dal guard trigger Task 2).
  UPDATE public.fatture_sdi_eventi
     SET stato_da = v_fatt.stato_sdi, stato_a = v_stato_a
   WHERE id = p_evento_id;

  RETURN json_build_object('esito','applicata','stato_da',v_fatt.stato_sdi,'stato_a',v_stato_a);
END;
$$;

REVOKE ALL ON FUNCTION public.applica_ricevuta_sdi(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.applica_ricevuta_sdi(uuid, uuid) TO service_role;
REVOKE ALL ON FUNCTION public.rank_stato_sdi(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rank_stato_sdi(text) TO service_role;
