-- supabase/migrations/20260705200000_lavori_buono_storage_path.sql
-- Aggiunge il path di Storage del Buono di Consegna, sul modello di
-- dichiarazioni_conformita.storage_path_pdf — necessario per generare un
-- URL firmato on-demand dal portale dentista (B5). Colonna additiva,
-- nullable, nessun backfill necessario (i Buoni già generati non sono
-- scaricabili dal portale finché non vengono rigenerati — accettato,
-- fuori scope backfillare dati storici), nessuna nuova policy RLS
-- (lavori è già scoped su laboratorio_id).

ALTER TABLE lavori
  ADD COLUMN buono_storage_path TEXT NULL;

COMMENT ON COLUMN lavori.buono_storage_path IS
  'Path del Buono di Consegna su Storage (bucket documenti, privato) — usato per generare un URL firmato on-demand, mai salvato come URL diretto';
