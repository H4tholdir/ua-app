-- supabase/migrations/20260710090500_fatture_lavoro_id_unique.sql
-- Spec 4a §4 M3 — cintura strutturale: ogni doppia emissione per lavoro = 23505.
-- Nessun backfill: le fatture esistenti restano lavoro_id NULL.

ALTER TABLE public.fatture
  ADD COLUMN lavoro_id uuid NULL REFERENCES public.lavori(id);

CREATE UNIQUE INDEX fatture_lavoro_attiva_unique
  ON public.fatture (laboratorio_id, lavoro_id)
  WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata';

CREATE INDEX idx_fatture_lavoro ON public.fatture (lavoro_id) WHERE lavoro_id IS NOT NULL;
