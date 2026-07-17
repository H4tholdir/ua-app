-- N12: atomicità route prove (spec R2 §D-5). SECURITY INVOKER: chiamate SOLO dal
-- service client (bypass RLS come oggi, service_role ha BYPASSRLS); niente
-- escalation DEFINER.
--
-- Archi copiati 1:1 dal SERVER (TRANSIZIONI_CONSENTITE in src/lib/lavori/transizioni.ts,
-- NON dalla UI):
--   manda_in_prova: sorgenti = { X : 'in_prova_esterna' IN TRANSIZIONI_CONSENTITE[X] }
--     = {in_lavorazione, in_ritardo} → in_prova_esterna.
--   registra_rientro: destinazioni ammesse da in_prova_esterna =
--     TRANSIZIONI_CONSENTITE['in_prova_esterna'] = {in_lavorazione, pronto, sospeso, annullato}
--     (route.ts oggi instrada solo verso in_lavorazione/sospeso/annullato in base a `esito`,
--     ma la whitelist qui rispecchia l'intera matrice server per non essere più restrittiva
--     di transizioneLavoro) + legacy in_ritardo → in_lavorazione
--     (TRANSIZIONI_CONSENTITE['in_ritardo'] include anche in_prova_esterna, non rilevante qui).
--
-- Correzioni rispetto alla bozza del brief (verificate contro
-- src/app/api/lavori/[id]/prove/route.ts, src/lib/lavori/transizioni.ts,
-- src/types/database.types.ts e supabase/migrations/005_v1_foundation.sql):
--   1) La tabella lavoro_prove NON ha colonne `istruzioni` né `note_rientro`.
--      Esiste una SOLA colonna testo libero: `note_dentista` (TEXT), riusata sia
--      per le istruzioni al mandato in prova sia per la nota di rientro — esattamente
--      come fa oggi route.ts. Corretto in entrambe le funzioni.
--   2) data_rientro_effettiva è DATE (non TIMESTAMPTZ): usato CURRENT_DATE invece di
--      now() per coerenza con data_uscita (DATE NOT NULL DEFAULT CURRENT_DATE) e con
--      la semantica "data" (non "istante") già usata da route.ts
--      (new Date().toISOString().split('T')[0]).
--   3) Whitelist destinazioni per v_stato = 'in_prova_esterna': aggiunto 'pronto',
--      presente nella matrice reale TRANSIZIONI_CONSENTITE['in_prova_esterna'] ma
--      assente nella bozza del brief.
--   4) numero_prova: MAX(numero_prova)+1 (bozza originale) anziché COUNT(*)+1 come in
--      route.ts — scelta mantenuta perché più robusta rispetto a eventuali gap e
--      comunque coperta dal backstop UNIQUE(lavoro_id, numero_prova)
--      (prova_numero_unique, migration 006), che NON viene toccato.
-- Nessun'altra divergenza di nome colonna trovata: created_by, data_rientro_prevista,
-- esito, updated_at (su lavori) corrispondono già alla bozza.

CREATE OR REPLACE FUNCTION public.manda_in_prova_atomico(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_data_rientro date,
  p_istruzioni text, p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stato text;
  v_numero int;
  v_prova lavoro_prove%ROWTYPE;
BEGIN
  -- Tenant isolation DENTRO la transazione (riserva appsec ALTA)
  SELECT stato INTO v_stato FROM lavori
   WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lavoro non trovato' USING ERRCODE = 'UA404';
  END IF;
  IF v_stato NOT IN ('in_lavorazione', 'in_ritardo') THEN
    RAISE EXCEPTION 'transizione non consentita da %', v_stato USING ERRCODE = 'UA409';
  END IF;

  UPDATE lavori SET stato = 'in_prova_esterna', updated_at = now() WHERE id = p_lavoro_id;

  SELECT COALESCE(MAX(numero_prova), 0) + 1 INTO v_numero
    FROM lavoro_prove WHERE lavoro_id = p_lavoro_id;

  -- data_uscita: colonna DATE NOT NULL DEFAULT CURRENT_DATE, omessa volutamente
  -- (stesso comportamento di route.ts che valorizza la data odierna).
  -- `istruzioni` (param) → colonna reale `note_dentista` (vedi correzione 1 sopra).
  INSERT INTO lavoro_prove (lavoro_id, laboratorio_id, numero_prova,
    data_rientro_prevista, note_dentista, created_by)
  VALUES (p_lavoro_id, p_laboratorio_id, v_numero, p_data_rientro, p_istruzioni, p_user_id)
  RETURNING * INTO v_prova;

  RETURN jsonb_build_object('prova', to_jsonb(v_prova), 'stato', 'in_prova_esterna');
END;
$$;

CREATE OR REPLACE FUNCTION public.registra_rientro_atomico(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_prova_id uuid,
  p_esito text, p_note text, p_stato_destinazione text, p_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stato text;
  v_lavoro record;
BEGIN
  SELECT l.stato, l.tecnico_id, l.numero_lavoro INTO v_lavoro FROM lavori l
   WHERE l.id = p_lavoro_id AND l.laboratorio_id = p_laboratorio_id AND l.deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lavoro non trovato' USING ERRCODE = 'UA404';
  END IF;
  v_stato := v_lavoro.stato;
  -- whitelist sorgenti-per-destinazione (parità 1:1 con TRANSIZIONI_CONSENTITE
  -- del server, incluso legacy in_ritardo e 'pronto' — correzione 3 sopra)
  IF NOT (
    (v_stato = 'in_prova_esterna' AND p_stato_destinazione IN ('in_lavorazione','pronto','sospeso','annullato'))
    OR (v_stato = 'in_ritardo' AND p_stato_destinazione = 'in_lavorazione')
  ) THEN
    RAISE EXCEPTION 'transizione non consentita da % a %', v_stato, p_stato_destinazione USING ERRCODE = 'UA409';
  END IF;

  -- `note_rientro` (bozza) → colonna reale `note_dentista` (vedi correzione 1 sopra);
  -- data_rientro_effettiva è DATE → CURRENT_DATE anziché now() (vedi correzione 2 sopra).
  UPDATE lavoro_prove
     SET data_rientro_effettiva = CURRENT_DATE, esito = p_esito, note_dentista = p_note
   WHERE id = p_prova_id AND lavoro_id = p_lavoro_id AND data_rientro_effettiva IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'prova non trovata o già chiusa' USING ERRCODE = 'UA409';
  END IF;

  UPDATE lavori SET stato = p_stato_destinazione, updated_at = now() WHERE id = p_lavoro_id;

  RETURN jsonb_build_object('stato', p_stato_destinazione,
    'tecnico_id', v_lavoro.tecnico_id, 'numero_lavoro', v_lavoro.numero_lavoro);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.manda_in_prova_atomico(uuid,uuid,date,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.registra_rientro_atomico(uuid,uuid,uuid,text,text,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manda_in_prova_atomico(uuid,uuid,date,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.registra_rientro_atomico(uuid,uuid,uuid,text,text,text,uuid) TO service_role;
