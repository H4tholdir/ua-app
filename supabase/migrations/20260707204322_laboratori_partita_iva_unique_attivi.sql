-- Fix race condition: POST /api/admin/labs aveva un pre-check applicativo
-- ("blocca P.IVA già con abbonamento trial/attivo") senza alcun backstop a
-- livello DB. Due richieste concorrenti potevano entrambe superare il
-- pre-check e creare 2 laboratori attivi (+ 2 clienti Stripe distinti) per
-- la stessa partita_iva — rischio di doppia fatturazione reale, non solo un
-- errore mal gestito. Indice UNIQUE parziale che rispecchia esattamente il
-- predicato del pre-check applicativo (stato IN ('trial','attivo')), con
-- l'aggiunta di deleted_at IS NULL: DELETE /api/admin/labs/[id] è un soft
-- delete che non cambia stato, quindi un lab in stato 'trial' eliminato non
-- deve bloccare una futura ri-registrazione con la stessa P.IVA.
-- Precondizione verificata 07/07/2026: nessuna P.IVA duplicata esistente tra
-- i laboratori trial/attivo non eliminati.

CREATE UNIQUE INDEX IF NOT EXISTS laboratori_partita_iva_attivi_key
  ON laboratori (partita_iva)
  WHERE stato IN ('trial', 'attivo') AND deleted_at IS NULL;
