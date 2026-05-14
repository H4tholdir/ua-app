-- UÀ Schema Migration v1.2.1 — Fix post-review
-- 2026-05-14

BEGIN;

-- Buono di consegna: salva url e numero direttamente sul lavoro
-- per il recupero idempotente nel percorso gia_consegnato
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS buono_pdf_url  TEXT,
  ADD COLUMN IF NOT EXISTS buono_numero   TEXT;

-- FatturaPA: salva il path storage (non ricostruirlo dal timestamp)
ALTER TABLE fatture
  ADD COLUMN IF NOT EXISTS xml_storage_path TEXT;

COMMIT;
