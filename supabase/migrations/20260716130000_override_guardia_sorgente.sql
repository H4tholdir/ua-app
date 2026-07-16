-- Finding 4 (review finale ondata Riconciliazioni R1, Task 17): incoerenza
-- tra i due writer di stato_sdi. applica_ricevuta_sdi (migration
-- 20260716100000_ricevute_sdi_rpc.sql) blocca esplicitamente «generata mai
-- inviata» (smtp_inviata_at IS NULL): una ricevuta può esistere solo se la
-- mail è partita. override_stato_sdi (migration
-- 20260716110000_override_sblocco_rpc.sql) guardava SOLO il rank
-- (draft(0)/generata(1) → accettata(6) passa la monotonia stretta), quindi
-- ammetteva un override da una fattura MAI inviata — incoerente col writer
-- gemello.
--
-- Fix: CREATE OR REPLACE della SOLA funzione public.override_stato_sdi,
-- ripartendo dal testo in 20260716110000_override_sblocco_rpc.sql, con una
-- guardia aggiuntiva PRIMA della monotonia: se lo stato corrente è ancora
-- "mai avanzato oltre l'invio" (rank < rank('smtp_inviata') = 2, cioè
-- draft/generata), l'override è ammesso SOLO se lo stato corrente è
-- 'generata' E smtp_inviata_at IS NOT NULL (claim orfano — prova d'invio
-- reale, stessa semantica D-3 di applica_ricevuta_sdi). In ogni altro caso
-- (draft, oppure generata senza smtp_inviata_at) l'esito è 'mai_inviata' —
-- distinto da 'stato_incompatibile' (che resta per la monotonia debole),
-- così la route può restituire un messaggio comprensibile invece di un
-- generico "transizione non valida".
--
-- NON applicare al DB in questo task — gate del proprietario, sarà applicata
-- col merge gate (vedi istruzioni Task 17).

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

  -- Guardia sorgente (Finding 4): uno stato che non ha mai superato l'invio
  -- (rank < rank('smtp_inviata')=2, cioè draft/generata) può essere portato
  -- avanti via override SOLO se è 'generata' con prova d'invio reale
  -- (smtp_inviata_at NOT NULL — claim orfano, stessa semantica D-3 di
  -- applica_ricevuta_sdi). 'draft' non è mai ammesso; 'generata' senza
  -- smtp_inviata_at è "mai inviata" e non è ammesso.
  IF public.rank_stato_sdi(v_fatt.stato_sdi) < public.rank_stato_sdi('smtp_inviata') THEN
    IF NOT (v_fatt.stato_sdi = 'generata' AND v_fatt.smtp_inviata_at IS NOT NULL) THEN
      RETURN json_build_object('esito','mai_inviata','stato_corrente',v_fatt.stato_sdi);
    END IF;
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
