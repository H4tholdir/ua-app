-- supabase/migrations/20260705090000_rischi_tipo_dispositivo_norme_json.sql
-- Estende rischi_tipo_dispositivo con l'elenco delle normative armonizzate
-- applicate per tipo di dispositivo (MDR 2017/745 — Fascicolo Tecnico Art.
-- 10(4)/Allegato II-III). Colonna additiva, default '[]', nessun backfill
-- necessario, nessuna nuova policy RLS (la tabella è già scoped su
-- laboratorio_id).

ALTER TABLE rischi_tipo_dispositivo
  ADD COLUMN norme_json JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN rischi_tipo_dispositivo.norme_json IS
  'Array: [{codice, titolo, anno}] — normative armonizzate applicate al tipo di dispositivo';
