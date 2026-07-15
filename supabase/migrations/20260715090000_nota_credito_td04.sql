-- Nota di Credito TD04 — colonne collegamento + indice + backstop + shape check.
-- Spec: docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md

-- 1. Colonne (tutte NULL: nessun impatto sugli insert TD01 esistenti)
ALTER TABLE public.fatture
  ADD COLUMN fattura_collegata_id uuid NULL REFERENCES public.fatture(id),
  ADD COLUMN collegata_numero text NULL,
  ADD COLUMN collegata_data date NULL,
  ADD COLUMN causale_storno text NULL,
  ADD COLUMN stornata_at timestamptz NULL;

-- 2. Riscrittura indice unico lavoro: la stornata esce dal predicato -> lavoro ri-fatturabile
DROP INDEX IF EXISTS public.fatture_lavoro_attiva_unique;
CREATE UNIQUE INDEX fatture_lavoro_attiva_unique
  ON public.fatture (laboratorio_id, lavoro_id)
  WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata' AND stornata_at IS NULL;

-- 3. Backstop: un solo TD04 attivo per fattura originale
CREATE UNIQUE INDEX fatture_td04_collegata_unique
  ON public.fatture (laboratorio_id, fattura_collegata_id)
  WHERE fattura_collegata_id IS NOT NULL AND stato_sdi <> 'rifiutata';

-- 4. Shape: TD04 ben formato XOR TD01 senza collegamento (NOT VALID -> VALIDATE per evitare lock lungo)
ALTER TABLE public.fatture ADD CONSTRAINT fatture_td04_shape CHECK (
  (tipo_documento = 'TD04'
     AND fattura_collegata_id IS NOT NULL AND lavoro_id IS NULL
     AND collegata_numero IS NOT NULL AND collegata_data IS NOT NULL AND causale_storno IS NOT NULL)
  OR (tipo_documento <> 'TD04' AND fattura_collegata_id IS NULL)
) NOT VALID;
ALTER TABLE public.fatture VALIDATE CONSTRAINT fatture_td04_shape;
