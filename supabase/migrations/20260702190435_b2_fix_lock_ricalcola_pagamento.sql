-- ============================================================
-- B2 fix — lost-update race condition in ricalcola_pagamento_fattura
-- (finding di review post-esecuzione su Task 2, migration
-- 20260702185348_b2_contabilita_clienti.sql).
--
-- Sotto READ COMMITTED, la SELECT totale FROM fatture senza lock
-- permette a due pagamenti concorrenti sulla stessa fattura (es.
-- titolare e front_desk quasi simultanei) di sommare da uno snapshot
-- che non vede ancora il commit dell'altro, risultando in un
-- importo_pagato finale sbagliato (perde uno dei due pagamenti).
--
-- Fix: FOR UPDATE sulla SELECT iniziale — il lock sulla riga viene
-- preso PRIMA di sommare i pagamenti, così il secondo trigger
-- concorrente si blocca fino al commit del primo, vedendo poi lo
-- stato corretto.
--
-- CREATE OR REPLACE, idempotente, applicabile come migration
-- incrementale senza toccare il resto dello schema B2.
-- ============================================================

CREATE OR REPLACE FUNCTION ricalcola_pagamento_fattura(p_fattura_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_totale NUMERIC(10,2);
  v_pagato NUMERIC(10,2);
BEGIN
  -- FOR UPDATE: prende il lock sulla riga PRIMA di sommare i pagamenti.
  -- Senza questo lock, due pagamenti concorrenti sulla stessa fattura
  -- (es. titolare + front_desk quasi simultanei) possono sommare da uno
  -- snapshot che non vede ancora il commit dell'altro — lost update su
  -- importo_pagato (finding di review pre-esecuzione su Task 2).
  SELECT totale INTO v_totale FROM fatture WHERE id = p_fattura_id FOR UPDATE;
  IF v_totale IS NULL THEN
    RETURN; -- fattura non trovata (già cancellata) — nessun ricalcolo
  END IF;

  SELECT
    COALESCE((SELECT SUM(importo) FROM pagamenti WHERE fattura_id = p_fattura_id AND stato = 'attivo'), 0)
    + COALESCE((SELECT SUM(importo) FROM credito_clienti_movimenti WHERE fattura_id = p_fattura_id AND tipo = 'applicazione'), 0)
  INTO v_pagato;

  UPDATE fatture
  SET importo_pagato = v_pagato,
      pagata = (v_pagato >= v_totale),
      updated_at = now()
  WHERE id = p_fattura_id;
END;
$$;
