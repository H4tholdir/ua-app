-- Sonda — «la chiave dell'autore di un avviso morde davvero?»
-- Riga 43 della coda della roadmap. Revisione del Task 1 dell'avviso al dentista (09/08/2026).
--
--   node scripts/psql.mjs scripts/sonde/2026-08-09-avviso-chiave-autore.sql
--
-- `avvisi_dentista.comunicato_da -> utenti(id)` è senza `ON DELETE`, cioè NO ACTION.
-- Atteso: 23503 su avvisi_dentista_comunicato_da_fkey.
-- 🔑 Dentro `admin_delete_laboratorio` oggi NON morde, perché `DELETE FROM lavori` (riga 47
--    del corpo) porta via gli avvisi a cascata prima che si arrivi a `utenti` (riga 84).
--    Questa sonda serve a provare che la salvezza sta nell'ORDINE e non nella tabella —
--    e la funzione non nomina `avvisi_dentista`, quindi un riordino la riapre in silenzio.
-- ⚠️ `SET NULL` non è il rimedio: sarebbe un UPDATE che rivaluta il CHECK sull'autore e
--    morirebbe con un 23514 al posto del 23503.
-- 🛑 Gira in TRANSAZIONE ANNULLATA: nessun dato del banco viene toccato.
BEGIN;
CREATE TEMP TABLE esito(riga text) ON COMMIT DROP;
DO $$
DECLARE v_lab uuid; v_lavoro uuid; v_cliente uuid; v_ddc uuid; v_utente uuid;
BEGIN
  SELECT l.laboratorio_id INTO v_lab FROM lavori l
  WHERE l.cliente_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM dichiarazioni_conformita d WHERE d.laboratorio_id = l.laboratorio_id)
    AND EXISTS (SELECT 1 FROM utenti u WHERE u.laboratorio_id = l.laboratorio_id)
  LIMIT 1;
  SELECT id, cliente_id INTO v_lavoro, v_cliente FROM lavori
    WHERE laboratorio_id = v_lab AND cliente_id IS NOT NULL LIMIT 1;
  SELECT id INTO v_ddc FROM dichiarazioni_conformita WHERE laboratorio_id = v_lab LIMIT 1;
  SELECT id INTO v_utente FROM utenti WHERE laboratorio_id = v_lab LIMIT 1;

  INSERT INTO avvisi_dentista
    (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, stato, comunicato_at, comunicato_da)
  VALUES (v_lab, v_lavoro, v_cliente, v_ddc, 'comunicato_a_voce', now(), v_utente);
  INSERT INTO esito VALUES ('premessa: avviso vivo con autore ' || v_utente);

  BEGIN
    DELETE FROM utenti WHERE id = v_utente;
    INSERT INTO esito VALUES ('C) nessun errore -> la chiave comunicato_da NON morde');
  EXCEPTION WHEN others THEN
    INSERT INTO esito VALUES ('C) ' || SQLSTATE || ' | ' || SQLERRM);
  END;
END $$;
SELECT * FROM esito;
ROLLBACK;
