-- 20260727120200_lavori_colore_caso.sql — Ondata (a), parte 3/4.
-- Spec §3.2 (default di caso), §3.5 (congelamento), §8 passi 4-5. W23.
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration (N6).

-- ============ Il default di caso (spec §3.2) ============
-- Il colore che non ha denti NON si modella con una riga senza dente: si
-- modella come default del lavoro, e le righe di lavori_denti sono override.
-- È il pattern di exocad e 3Shape. Protesi totale → solo default, nessuna riga.
ALTER TABLE lavori
  ADD COLUMN colore_scala  text CHECK (colore_scala IS NULL OR colore_scala IN ('vita_classical','vita_3d_master','fuori_scala')),
  ADD COLUMN colore_codice text;

ALTER TABLE lavori
  ADD CONSTRAINT lavori_colore_caso_coppia_ck CHECK ((colore_scala IS NULL) = (colore_codice IS NULL)),
  ADD CONSTRAINT lavori_colore_caso_fk
    FOREIGN KEY (colore_scala, colore_codice) REFERENCES colori_dentali (scala, codice);

-- ============ 🔴 TRE BUCHI DEL TASK 4, CHIUSI QUI ============
-- Trovati provando la tabella appena creata, non leggendo il catalogo.

-- ① Le tre zone del ceramista accettavano QUALUNQUE STRINGA. Provato sul
--    database: 'ZZZ', 'pippo' e '###' sono entrati senza un lamento — su un
--    dato che finisce nella Dichiarazione di Conformità. Il commento della
--    migration diceva «il colore è una COPPIA, mai una stringa» mentre tre
--    colonne su cinque erano esattamente stringhe libere.
--    Le tre chiavi qui sotto legano ogni zona alla scala DICHIARATA nella
--    riga: con MATCH SIMPLE una zona NULL resta ammessa (il caso normale),
--    ma un codice inventato — o di un'altra scala — non passa più.
ALTER TABLE lavori_denti
  ADD CONSTRAINT lavori_denti_collo_fk    FOREIGN KEY (scala, codice_collo)    REFERENCES colori_dentali (scala, codice),
  ADD CONSTRAINT lavori_denti_corpo_fk    FOREIGN KEY (scala, codice_corpo)    REFERENCES colori_dentali (scala, codice),
  ADD CONSTRAINT lavori_denti_incisale_fk FOREIGN KEY (scala, codice_incisale) REFERENCES colori_dentali (scala, codice);

-- ② Indice duplicato: lavori_denti_lavoro_idx (lavoro_id, fdi) è identico a
--    quello creato d'ufficio dal vincolo unique omonimo. Costo puro in
--    scrittura, zero beneficio in lettura.
DROP INDEX IF EXISTS lavori_denti_lavoro_idx;

-- ③ `updated_at` ha solo DEFAULT now(), nessun trigger: senza questo resterebbe
--    congelato al momento dell'inserimento e mentirebbe per sempre. Le RPC del
--    Task 7 riscrivono le righe per intero (sostituzione integrale), quindi il
--    default basta per loro — ma un UPDATE futuro non lo toccherebbe. Il
--    trigger lo rende vero per costruzione, chiunque scriva.
CREATE OR REPLACE FUNCTION public.lavori_denti_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER lavori_denti_touch_trg BEFORE UPDATE ON lavori_denti
  FOR EACH ROW EXECUTE FUNCTION public.lavori_denti_touch();

-- ============ La fotografia (spec §3.5) ============
-- Lo SCHEMA nasce col primo giorno anche se il writer arriva nell'ondata (c):
-- se nel frattempo viene emessa una Dichiarazione che riporta il colore per
-- dente, quella resta valida e va conservata 10 anni. Lo schema non si aggiunge
-- dopo un documento a valore legale.
ALTER TABLE lavori
  ADD COLUMN denti_snapshot    jsonb,
  ADD COLUMN denti_snapshot_at timestamptz;

COMMENT ON COLUMN lavori.denti_snapshot IS
  'Fotografia dei denti+colore al momento della consegna. Writer nell''ondata (c); lo schema esiste dal primo giorno (spec §3.5).';

-- ============ W23: la colonna morta se ne va ============
-- «se serve usala sennò togli, il codice nella nostra pwa deve essere più
-- ordinato e pulito possibile» (Francesco, 27/07/2026). Col colore per-dente
-- non serve più a niente: la sostituisce il testo collassato in
-- prescrizione_caratteristiche (ondata c).
-- ⚠️ Prerequisito verificato sul database prima di applicare: 3 DdC totali,
--    ZERO con un valore in colore_dente. Nessun dipendente: nessuna vista,
--    nessuna policy, nessun vincolo, nessuna funzione PL/pgSQL la nomina
--    (crea_rifacimento_atomico nomina lavori.colore_dente, che NON si tocca).
ALTER TABLE dichiarazioni_conformita DROP COLUMN colore_dente;

-- ============ R5: il tenant deve restare cancellabile ============
-- Ogni tabella con laboratorio_id deve comparire nella purga, altrimenti
-- l'esercizio dell'art. 17 GDPR sbatte contro la FK e il tenant diventa
-- INCANCELLABILE. Precedente identico: la Parete delle Cassette, 21/07/2026.
--
-- Il corpo qui sotto è il testo VIGENTE (20260721090100, righe 120-202) copiato
-- integralmente — 48 DELETE, ognuno col suo GET DIAGNOSTICS — con la SOLA
-- aggiunta della riga di lavori_denti, che porta il conto a 49.
-- `CREATE OR REPLACE FUNCTION` sostituisce il corpo INTERO: un corpo riassunto
-- non sarebbe un file incompleto, sarebbe una purga che cancella metà tenant e
-- lascia l'altra metà orfana.
--
-- ⚠️ TRAPPOLA GIÀ DOCUMENTATA (20260721090100:108-115): CREATE OR REPLACE
--    AZZERA proconfig. L'hardening del search_path di questa funzione arrivava
--    da un ALTER FUNCTION separato (20260704190000:33): la clausola
--    `SET search_path = public, pg_temp` è ridichiarata nell'intestazione e NON
--    va rimossa. Verifica post-apply:
--      SELECT proconfig FROM pg_proc WHERE oid = 'public.admin_delete_laboratorio(uuid)'::regprocedure;
--      -- atteso: {search_path=public\, pg_temp}
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


  -- ⬇️ AGGIUNTA 27/07/2026 (ondata a del wizard «Nuovo lavoro»). DEVE stare PRIMA
  --    della cancellazione di lavori: lavori_denti la referenzia con FK composita
  --    (lavoro_id, laboratorio_id) → lavori (id, laboratorio_id), NO ACTION.
  DELETE FROM lavori_denti WHERE laboratorio_id = p_lab_id; GET DIAGNOSTICS v_n = ROW_COUNT; v_counts := v_counts || jsonb_build_object('lavori_denti', v_n);

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

-- Il CREATE OR REPLACE conserva l'ACL, ma la si ri-emette per non dipendere da
-- quel dettaglio (stessa scelta del 21/07, righe 206-207).
REVOKE ALL   ON FUNCTION public.admin_delete_laboratorio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_laboratorio(uuid) TO service_role;
