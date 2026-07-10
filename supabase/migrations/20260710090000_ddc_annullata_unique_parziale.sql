-- supabase/migrations/20260710090000_ddc_annullata_unique_parziale.sql
-- Spec 4a §4 M1+M2 (B2 + P2-3, decisione D2 "annulla + rigenera").

-- M1: la CHECK ammette anche 'annullata' (oggi: bozza/generata/firmata/consegnata)
ALTER TABLE public.dichiarazioni_conformita
  DROP CONSTRAINT dichiarazioni_conformita_stato_check;
ALTER TABLE public.dichiarazioni_conformita
  ADD CONSTRAINT dichiarazioni_conformita_stato_check
  CHECK (stato IN ('bozza','generata','firmata','consegnata','annullata'));

-- M2: da UNIQUE pieno a UNIQUE parziale — le DdC annullate restano come storia,
-- la riconsegna genera una DdC nuova (una sola ATTIVA per lavoro).
ALTER TABLE public.dichiarazioni_conformita
  DROP CONSTRAINT ddc_lavoro_unique;
CREATE UNIQUE INDEX ddc_lavoro_attiva_unique
  ON public.dichiarazioni_conformita (laboratorio_id, lavoro_id)
  WHERE stato <> 'annullata';
