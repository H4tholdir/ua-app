-- supabase/migrations/007_rpc_rifacimento.sql
-- RPC atomica per creare rifacimento MDR-compliant
-- Annulla originale + crea nuovo lavoro + registra non conformità in una singola transazione

CREATE OR REPLACE FUNCTION crea_rifacimento_atomico(
  p_lavoro_originale_id UUID,
  p_motivo              TEXT,
  p_rilevato_in         TEXT DEFAULT NULL,
  p_costo_interno       DECIMAL DEFAULT NULL,
  p_note                TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lab_id     UUID;
  v_originale  lavori%ROWTYPE;
  v_nuovo      lavori%ROWTYPE;
  v_anno       INTEGER;
  v_progressivo INTEGER;
  v_numero_lavoro TEXT;
BEGIN
  -- Carica lavoro originale
  SELECT * INTO v_originale FROM lavori WHERE id = p_lavoro_originale_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lavoro non trovato: %', p_lavoro_originale_id;
  END IF;
  v_lab_id := v_originale.laboratorio_id;
  v_anno := EXTRACT(YEAR FROM now());

  -- Genera progressivo per il nuovo lavoro
  SELECT COALESCE(MAX(anno_lavoro_seq), 0) + 1
  INTO v_progressivo
  FROM (
    SELECT CASE WHEN anno_lavoro = v_anno THEN progressivo ELSE 0 END AS anno_lavoro_seq
    FROM lavori
    WHERE laboratorio_id = v_lab_id
  ) sub;

  v_numero_lavoro := v_anno || '/' || LPAD(v_progressivo::TEXT, 4, '0');

  -- 1. Annulla il lavoro originale
  UPDATE lavori
    SET stato = 'annullato',
        note  = COALESCE('[RIFACIMENTO: ' || p_motivo || '] ', '') || COALESCE(v_originale.note, ''),
        updated_at = now()
    WHERE id = p_lavoro_originale_id;

  -- 2. Crea il nuovo lavoro rifacimento
  INSERT INTO lavori (
    laboratorio_id, cliente_id, paziente_id, paziente_nome_snapshot,
    tipo_dispositivo, data_consegna_prevista, tecnico_id,
    note, stato, anno_lavoro, progressivo, numero_lavoro,
    data_ingresso, classe_rischio, da_conformare
  ) VALUES (
    v_originale.laboratorio_id,
    v_originale.cliente_id,
    v_originale.paziente_id,
    v_originale.paziente_nome_snapshot,
    v_originale.tipo_dispositivo,
    v_originale.data_consegna_prevista,
    v_originale.tecnico_id,
    'Rifacimento di ' || v_originale.numero_lavoro || ' — ' || p_motivo,
    'ricevuto',
    v_anno,
    v_progressivo,
    v_numero_lavoro,
    CURRENT_DATE,
    v_originale.classe_rischio,
    v_originale.da_conformare
  ) RETURNING * INTO v_nuovo;

  -- 3. Registra nella tabella lavori_rifacimenti
  INSERT INTO lavori_rifacimenti (
    laboratorio_id, lavoro_originale_id, lavoro_nuovo_id,
    motivo, rilevato_in, costo_interno, note
  ) VALUES (
    v_lab_id, p_lavoro_originale_id, v_nuovo.id,
    p_motivo, p_rilevato_in, p_costo_interno, p_note
  );

  -- 4. Registra in incidenti_mdr (MDR obbligatorio per non conformità)
  -- NOTA: incidenti_mdr usa risolto (boolean), non stato (text)
  INSERT INTO incidenti_mdr (
    laboratorio_id, lavoro_id, tipo, descrizione, gravita,
    data_evento, risolto
  ) VALUES (
    v_lab_id,
    p_lavoro_originale_id,
    'non_conformita',
    'Non conformità: ' || p_motivo || ' — rilevato in: ' || COALESCE(p_rilevato_in, 'non specificato'),
    'bassa',
    CURRENT_DATE,
    false
  );

  RETURN json_build_object(
    'lavoro_nuovo_id', v_nuovo.id,
    'numero_lavoro', v_nuovo.numero_lavoro
  );
END;
$$;

-- Permessi: solo ruoli autenticati possono chiamarla
REVOKE ALL ON FUNCTION crea_rifacimento_atomico FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crea_rifacimento_atomico TO authenticated;
