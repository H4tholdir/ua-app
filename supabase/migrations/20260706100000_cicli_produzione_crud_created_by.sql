-- supabase/migrations/20260706100000_cicli_produzione_crud_created_by.sql
-- UÀ Migration — CRUD cicli_produzione: traccia il creatore + fix unicità codice.
--
-- 1. created_by: tracciamento esplicito di chi ha creato il ciclo (nullable,
--    i cicli storici restano senza creatore tracciato retroattivamente —
--    nessun backfill, coerente con updated_by già esistente da B3).
--
-- 2. Fix B18-style: cicli_produzione_laboratorio_id_codice_key è un UNIQUE
--    pieno su (laboratorio_id, codice), non parziale — dopo un soft-delete
--    (deleted_at impostato) il codice resta bloccato per sempre e non è mai
--    riusabile. Sostituito con indice UNIQUE parziale sulle sole righe attive,
--    stesso fix già applicato a fasi_produzione in
--    20260704140000_b18_fasi_produzione_partial_unique_index.sql.
--
-- Verificato prima dell'applicazione (06/07/2026, via Supabase MCP execute_sql
-- sul progetto iagibumwjstnveqpjbwq): 140 righe in cicli_produzione, 0
-- soft-deletate, nessun duplicato (laboratorio_id, codice) — nessun conflitto
-- possibile con i dati esistenti.

ALTER TABLE cicli_produzione
  ADD COLUMN created_by UUID REFERENCES utenti(id);

ALTER TABLE cicli_produzione
  DROP CONSTRAINT cicli_produzione_laboratorio_id_codice_key;

CREATE UNIQUE INDEX cicli_produzione_laboratorio_id_codice_active_key
  ON cicli_produzione (laboratorio_id, codice)
  WHERE deleted_at IS NULL;
