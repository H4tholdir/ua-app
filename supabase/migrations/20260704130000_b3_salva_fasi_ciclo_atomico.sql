-- supabase/migrations/20260704130000_b3_salva_fasi_ciclo_atomico.sql
-- UÀ Migration — B3: RPC atomica per il salvataggio batch delle fasi di un ciclo.
-- Sostituisce la logica insert/update/soft-delete non transazionale e senza
-- controllo errori di PATCH /api/cicli/[id]/fasi (finding Important della
-- review finale whole-branch: la route rispondeva 200 { ok: true } anche se
-- una scrittura falliva a metà batch). Essendo un'unica funzione plpgsql,
-- Postgres la esegue in un'unica transazione implicita: se una qualsiasi
-- istruzione fallisce, tutto viene annullato automaticamente.

CREATE OR REPLACE FUNCTION salva_fasi_ciclo_atomico(
  p_ciclo_id UUID,
  p_laboratorio_id UUID,
  p_user_id UUID,
  p_fasi JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ciclo_exists BOOLEAN;
  v_fase JSONB;
  v_index INT;
  v_fase_id UUID;
  v_kept_ids UUID[] := ARRAY[]::UUID[];
  v_existing_ids UUID[];
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM cicli_produzione
    WHERE id = p_ciclo_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  ) INTO v_ciclo_exists;

  IF NOT v_ciclo_exists THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ciclo non trovato');
  END IF;

  v_index := 0;
  FOR v_fase IN SELECT * FROM jsonb_array_elements(p_fasi)
  LOOP
    v_index := v_index + 1;
    IF coalesce(trim(v_fase->>'codice_fase'), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', format('Fase #%s: campo "codice_fase" obbligatorio', v_index));
    END IF;
    IF coalesce(trim(v_fase->>'descrizione'), '') = '' THEN
      RETURN jsonb_build_object('ok', false, 'error', format('Fase #%s: campo "descrizione" obbligatorio', v_index));
    END IF;
  END LOOP;

  SELECT array_agg(id) INTO v_existing_ids
  FROM fasi_produzione
  WHERE ciclo_id = p_ciclo_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL;

  v_index := 0;
  FOR v_fase IN SELECT * FROM jsonb_array_elements(p_fasi)
  LOOP
    v_index := v_index + 1;
    v_fase_id := NULLIF(v_fase->>'id', '')::UUID;

    IF v_fase_id IS NOT NULL AND v_fase_id = ANY(coalesce(v_existing_ids, ARRAY[]::UUID[])) THEN
      UPDATE fasi_produzione SET
        ordine = v_index,
        codice_fase = v_fase->>'codice_fase',
        descrizione = v_fase->>'descrizione',
        obbligatoria = coalesce((v_fase->>'obbligatoria')::BOOLEAN, true),
        attrezzatura = v_fase->>'attrezzatura',
        controllo_misura = v_fase->>'controllo_misura',
        esito_atteso = v_fase->>'esito_atteso',
        materiali_nota = v_fase->>'materiali_nota',
        updated_by = p_user_id
      WHERE id = v_fase_id AND laboratorio_id = p_laboratorio_id;

      v_kept_ids := array_append(v_kept_ids, v_fase_id);
    ELSE
      INSERT INTO fasi_produzione (
        ciclo_id, laboratorio_id, ordine, codice_fase, descrizione,
        obbligatoria, attrezzatura, controllo_misura, esito_atteso, materiali_nota, updated_by
      ) VALUES (
        p_ciclo_id, p_laboratorio_id, v_index, v_fase->>'codice_fase', v_fase->>'descrizione',
        coalesce((v_fase->>'obbligatoria')::BOOLEAN, true),
        v_fase->>'attrezzatura', v_fase->>'controllo_misura', v_fase->>'esito_atteso', v_fase->>'materiali_nota',
        p_user_id
      );
    END IF;
  END LOOP;

  UPDATE fasi_produzione SET
    deleted_at = NOW(),
    updated_by = p_user_id
  WHERE ciclo_id = p_ciclo_id
    AND laboratorio_id = p_laboratorio_id
    AND deleted_at IS NULL
    AND NOT (id = ANY(v_kept_ids));

  UPDATE cicli_produzione SET
    updated_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_ciclo_id AND laboratorio_id = p_laboratorio_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION salva_fasi_ciclo_atomico(UUID, UUID, UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION salva_fasi_ciclo_atomico(UUID, UUID, UUID, JSONB) TO service_role;
