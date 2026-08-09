-- Sonda — «un laboratorio con un accordo sul trattamento dei dati si può cancellare?»
-- Riga 42 della coda della roadmap. Trovata dalla revisione del Task 1 dell'avviso al
-- dentista (09/08/2026), difetto PREESISTENTE e vivo.
--
--   node scripts/psql.mjs scripts/sonde/2026-08-09-cancellazione-laboratorio-dpa.sql
--
-- Atteso oggi: FALLITA -> 23503 su data_processing_agreements_dentista_id_fkey.
-- Dentro `admin_delete_laboratorio`, `DELETE FROM clienti` sta alla riga 51 del corpo e
-- `DELETE FROM data_processing_agreements` alla 76: il figlio si cancella dopo il padre.
-- ⚠️ La sonda si ferma alla PRIMA chiave che scatta: se un giorno il DPA viene riordinato,
--    questa può tornare rossa su un altro vincolo — l'ordine giusto non è provato per intero.
-- 🛑 Gira in TRANSAZIONE ANNULLATA: nessun dato del banco viene toccato.
-- 📌 Il seguito di questa sonda è una prova d'integrazione che crea un laboratorio completo
--    e lo cancella: è ciò che chiuderebbe la famiglia D274 invece del singolo caso.
BEGIN;
CREATE TEMP TABLE esito(riga text) ON COMMIT DROP;
DO $$
DECLARE v_lab uuid; v_res jsonb;
BEGIN
  SELECT l.laboratorio_id INTO v_lab FROM lavori l
  WHERE l.cliente_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM dichiarazioni_conformita d WHERE d.laboratorio_id = l.laboratorio_id)
    AND EXISTS (SELECT 1 FROM utenti u WHERE u.laboratorio_id = l.laboratorio_id)
  LIMIT 1;
  INSERT INTO esito VALUES ('lab di prova: ' || v_lab
    || ' | avvisi presenti: ' || (SELECT count(*) FROM avvisi_dentista WHERE laboratorio_id = v_lab));
  BEGIN
    SELECT admin_delete_laboratorio(v_lab) INTO v_res;
    INSERT INTO esito VALUES ('ESITO: RIUSCITA senza avvisi -> il 23503 di prima era MIO');
  EXCEPTION WHEN others THEN
    INSERT INTO esito VALUES ('ESITO: FALLITA senza avvisi -> PREESISTENTE | ' || SQLSTATE || ' | ' || SQLERRM);
  END;
END $$;
SELECT * FROM esito;
ROLLBACK;
