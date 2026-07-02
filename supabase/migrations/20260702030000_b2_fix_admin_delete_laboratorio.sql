-- Fix: admin_delete_laboratorio() — rimuove riferimento a lavori_partitario (tabella dropped)
-- Contesto: Task 9 (B2) ha eseguito `DROP TABLE lavori_partitario CASCADE` sul progetto
--           Supabase iagibumwjstnveqpjbwq (migration 20260702020000_b2_drop_lavori_partitario.sql).
--           La funzione admin_delete_laboratorio (definita in
--           20260517_fix_admin_delete_admin_sistema_fk.sql) conteneva ancora una riga
--           `DELETE FROM lavori_partitario WHERE laboratorio_id = p_lab_id;`, invisibile al
--           grep su src/ perché vive solo in una migration SQL. Con la tabella droppata,
--           qualunque chiamata a admin_delete_laboratorio (usata da
--           DELETE /api/admin/labs/[id]/hard-delete) fallisce con
--           "relation lavori_partitario does not exist", bloccando l'hard-delete dei lab.
-- Fix:      Questa migration ricrea la funzione IDENTICA alla versione precedente, con la
--           sola riga DELETE FROM lavori_partitario rimossa. Rimuoverla è sicuro: la tabella
--           non esiste più e comunque era sempre vuota (0 righe cancellate anche prima del
--           drop), quindi il comportamento della funzione non cambia in nessun altro aspetto.

CREATE OR REPLACE FUNCTION admin_delete_laboratorio(p_lab_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_nome TEXT;
  v_counts JSONB := '{}';
  v_n INT;
BEGIN
  SELECT nome INTO v_nome FROM laboratori WHERE id = p_lab_id;
  IF v_nome IS NULL THEN
    RETURN jsonb_build_object('error', 'Laboratorio non trovato');
  END IF;

  DELETE FROM lavori_materiali        WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_materiali', v_n);
  DELETE FROM lavori_fasi             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_fasi', v_n);
  DELETE FROM lavori_lavorazioni      WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_lavorazioni', v_n);
  DELETE FROM lavori_immagini         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_immagini', v_n);
  DELETE FROM lavori_rifacimenti      WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_rifacimenti', v_n);
  DELETE FROM lavori_appuntamenti     WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_appuntamenti', v_n);
  DELETE FROM lavoro_prove            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavoro_prove', v_n);
  DELETE FROM dichiarazioni_conformita WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('dichiarazioni_conformita', v_n);
  DELETE FROM buoni_consegna          WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('buoni_consegna', v_n);
  DELETE FROM appuntamenti            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('appuntamenti', v_n);
  DELETE FROM lavori                  WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori', v_n);
  DELETE FROM portale_accessi         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('portale_accessi', v_n);
  DELETE FROM prescrizioni_digitali   WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('prescrizioni_digitali', v_n);
  DELETE FROM pazienti                WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('pazienti', v_n);
  DELETE FROM clienti                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('clienti', v_n);
  DELETE FROM fatture_righe           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fatture_righe', v_n);
  DELETE FROM fatture_pagamenti       WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fatture_pagamenti', v_n);
  DELETE FROM sdi_receipts            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('sdi_receipts', v_n);
  DELETE FROM fatture                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fatture', v_n);
  DELETE FROM lotti_magazzino         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lotti_magazzino', v_n);
  DELETE FROM magazzino               WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('magazzino', v_n);
  DELETE FROM ordini_righe            WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('ordini_righe', v_n);
  DELETE FROM ordini_acquisto         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('ordini_acquisto', v_n);
  DELETE FROM fornitori               WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fornitori', v_n);
  DELETE FROM listino_prezzi_tier     WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('listino_prezzi_tier', v_n);
  DELETE FROM listino                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('listino', v_n);
  DELETE FROM rischi_tipo_dispositivo WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('rischi_tipo_dispositivo', v_n);
  DELETE FROM risk_analyses           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('risk_analyses', v_n);
  DELETE FROM incidenti_mdr           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('incidenti_mdr', v_n);
  DELETE FROM fascicoli_tecnici       WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fascicoli_tecnici', v_n);
  DELETE FROM psur                    WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('psur', v_n);
  DELETE FROM fasi_produzione         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('fasi_produzione', v_n);
  DELETE FROM cicli_produzione        WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cicli_produzione', v_n);
  DELETE FROM istruzioni_uso          WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('istruzioni_uso', v_n);
  DELETE FROM nomine_prrc             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('nomine_prrc', v_n);
  DELETE FROM prrc_nomine             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('prrc_nomine', v_n);
  DELETE FROM prima_nota              WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('prima_nota', v_n);
  DELETE FROM messaggi                WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('messaggi', v_n);
  DELETE FROM notifiche               WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('notifiche', v_n);
  DELETE FROM data_processing_agreements WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('data_processing_agreements', v_n);
  DELETE FROM reti_membri             WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('reti_membri', v_n);
  DELETE FROM tecnici                 WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('tecnici', v_n);
  DELETE FROM dashboard_kpi_cache     WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('dashboard_kpi_cache', v_n);
  DELETE FROM lab_stato_log           WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lab_stato_log', v_n);
  DELETE FROM lab_memberships         WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lab_memberships', v_n);
  DELETE FROM inviti                  WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('inviti', v_n);

  DELETE FROM utenti
    WHERE laboratorio_id = p_lab_id AND ruolo <> 'admin_sistema';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('utenti', v_n);

  -- Scollega admin_sistema dal lab (NULL) senza eliminarli
  UPDATE utenti
    SET laboratorio_id = NULL
    WHERE laboratorio_id = p_lab_id AND ruolo = 'admin_sistema';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('utenti_admin_scollegati', v_n);

  DELETE FROM laboratori WHERE id = p_lab_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  v_counts := v_counts || jsonb_build_object('laboratori', v_n);

  RETURN jsonb_build_object('ok', true, 'nome', v_nome, 'deleted', v_counts);
END;
$$;
