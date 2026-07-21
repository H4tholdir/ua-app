-- 20260721090100_admin_delete_laboratorio_cassette.sql
-- CO-REQUISITO BLOCCANTE di 20260721090000_parete_cassette.sql — stesso deploy (R-1, R-3).
--
-- Perché: cassette.laboratorio_id → laboratori(id) e cassette_lavori.{laboratorio_id, lavoro_id}
-- → laboratori/lavori sono FK NO ACTION. Dal primo istante dopo il backfill, ogni lab con dati
-- cassette diventerebbe INCANCELLABILE: `DELETE FROM lavori` dentro admin_delete_laboratorio
-- fallirebbe con «violates foreign key constraint "cassette_lavori_lavoro_id_fkey"» (verificato
-- in laboratorio dal panel backend). admin_delete_laboratorio è l'unico percorso di cancellazione
-- fisica di lavori/laboratori del repo (src/app/api/admin/labs/[id]/hard-delete/route.ts:39) ed è
-- l'unico percorso di erasure GDPR (docs/security/2026-07-17-gdpr-accesso-dati-lab-blacklist.md §7).
--
-- Dato normativo: cassette_lavori contiene dati personali pseudonimizzati in contesto sanitario
-- (lega un lavoro → paziente a una collocazione fisica, con timestamp) e NON gode dell'esenzione
-- art. 17.3.b — non è né fiscale né MDR: va cancellata col tenant.
--
-- PERIMETRO: solo le tabelle della Parete (R-3). Il fix DI CLASSE (funzione generalizzata +
-- asserzione da information_schema in CI) e le 3 tabelle già orfane oggi — fatture_outbox,
-- fatture_sdi_eventi, credito_clienti_movimenti — restano fuori, in D-11 con panel proprio,
-- da aprire subito dopo questa ondata.
--
-- NON aggiungere BEGIN;/COMMIT; (N6, verificato).

-- ============================================================================
-- 1) La Parete espone la propria purga: admin_delete_laboratorio non impara nulla
--    di nuovo (né la deroga, né l'ordine obbligato fra storico e cassette) e il
--    percorso privilegiato resta auditabile e grep-abile in un solo punto.
-- ============================================================================
CREATE FUNCTION public.cassette_purge_lab(p_lab uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_n int; v_counts jsonb := '{}'::jsonb;
BEGIN
  IF p_lab IS NULL THEN RAISE EXCEPTION 'cassette_purge_lab: p_lab obbligatorio'; END IF;

  -- Deroga all'append-only di cassette_lavori: LOCAL alla transazione (set_config …, true),
  -- vincolata a QUESTO laboratorio_id, e per la sola durata di questa funzione.
  -- L'invariante non si indebolisce: «la storia di un tenant ESISTENTE è immutabile» —
  -- qui il soggetto sparisce insieme alla sua storia.
  -- Scartate dal panel: session_replication_role='replica' (spegne TUTTI i trigger e la RI su
  -- 40+ DELETE → orfani silenziosi; ed è SUSET, il ruolo postgres di Supabase non è superuser),
  -- ALTER TABLE … DISABLE TRIGGER (DDL in un percorso dati, lock forte fino al COMMIT, e un
  -- RETURN anticipato lascerebbe l'append-only spento per sempre), ON DELETE CASCADE (la
  -- cascata fa comunque scattare il trigger di riga — verificato).
  PERFORM set_config('ua.purga_lab', p_lab::text, true);

  -- Ordine obbligato: prima lo storico (ha FK verso cassette E verso lavori), poi le cassette.
  DELETE FROM cassette_lavori WHERE laboratorio_id = p_lab;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cassette_lavori', v_n);

  DELETE FROM cassette        WHERE laboratorio_id = p_lab;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('cassette', v_n);

  -- Registro di audit del backfill (R-2): contiene lavoro_id → dato collegabile a persona,
  -- quindi va purgato col tenant. Non ha trigger: basta un DELETE normale.
  -- Il to_regclass NON è pigrizia: la tabella nasce nella migration successiva
  -- (20260721090200) e questa funzione deve reggere sia l'ordine di deploy, sia un deploy
  -- parziale, sia un drop futuro. È esattamente la guardia che mancava a lavori_partitario
  -- (vedi 20260702030000: tabella droppata → admin_delete_laboratorio rotta in produzione).
  IF to_regclass('public.cassette_backfill_audit') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.cassette_backfill_audit WHERE laboratorio_id = $1' USING p_lab;
    GET DIAGNOSTICS v_n = ROW_COUNT;
  ELSE
    v_n := 0;
  END IF;
  v_counts := v_counts || jsonb_build_object('cassette_backfill_audit', v_n);

  -- Richiude la deroga esplicitamente: fuori da qui l'append-only torna assoluto.
  -- (La clausola SET della funzione la revocherebbe comunque all'uscita — questa riga rende
  --  la finestra visibile a chi legge, e resta corretta anche se la clausola SET sparisse.)
  PERFORM set_config('ua.purga_lab', '', true);
  RETURN v_counts;
END $$;

REVOKE EXECUTE ON FUNCTION public.cassette_purge_lab(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cassette_purge_lab(uuid) TO service_role;

-- ============================================================================
-- 2) admin_delete_laboratorio — testo VIGENTE (20260702030000_b2_fix_admin_delete_laboratorio.sql)
--    con una sola aggiunta: la purga della Parete immediatamente PRIMA di DELETE FROM lavori.
--
-- ⚠️ TRAPPOLA VERIFICATA — CREATE OR REPLACE AZZERA proconfig.
--    Questa funzione riceveva l'hardening del search_path da un ALTER FUNCTION SEPARATO
--    (20260704190000_security_hardening_search_path.sql:33), non inline. Ricrearla senza
--    ridichiarare `SET search_path = public, pg_temp` cancellerebbe IN SILENZIO l'hardening
--    del 04/07. Qui la clausola è ridichiarata nell'intestazione: NON rimuoverla mai.
--    Verifica post-apply:
--      SELECT proconfig FROM pg_proc WHERE oid = 'public.admin_delete_laboratorio(uuid)'::regprocedure;
--      -- atteso: {search_path=public\, pg_temp}
--
--    Il CREATE OR REPLACE conserva l'ACL (REVOKE/GRANT di 20260704180000:26-27); li ri-emettiamo
--    comunque in coda, per rendere il file autosufficiente e non dipendere da quella proprietà.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_delete_laboratorio(p_lab_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

  -- ⬇️ AGGIUNTA 21/07/2026 (Parete delle Cassette). DEVE stare PRIMA di DELETE FROM lavori:
  --    cassette_lavori.lavoro_id → lavori(id) è NO ACTION.
  v_counts := v_counts || public.cassette_purge_lab(p_lab_id);

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

-- Ri-emissione difensiva dell'ACL già vigente (20260704180000:26-27): il CREATE OR REPLACE
-- la conserverebbe, ma qui non ci appoggiamo a nessuna proprietà implicita.
REVOKE ALL ON FUNCTION public.admin_delete_laboratorio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_laboratorio(uuid) TO service_role;
