-- Ondata 2 Portale Dentista v2 — storico fatture (spec §3 Ondata 2).
-- Additiva, zero backfill: al 11/07/2026 in prod esiste 1 sola fattura (draft),
-- 0 righe con xml_url o xml_storage_path valorizzati.

-- Copia di cortesia PDF della fattura: path nel bucket privato 'fatture-pdf',
-- scritta da generaFatturaPA nello stesso momento dell'XML (coerenza fiscale).
ALTER TABLE public.fatture ADD COLUMN IF NOT EXISTS pdf_storage_path text NULL;
COMMENT ON COLUMN public.fatture.pdf_storage_path IS
  'Path storage (bucket privato fatture-pdf) della copia di cortesia PDF, generata insieme all''XML da generaFatturaPA. Servita solo via signed URL.';

-- Igiene I-6: il bucket è privato, gli URL "pubblici" persistiti qui sono inerti.
-- Da questa migration nessun codice scrive o legge più xml_url.
COMMENT ON COLUMN public.fatture.xml_url IS
  'DEPRECATA dall''11/07/2026 (audit I-6): il bucket fatture-pdf è privato, gli URL pubblici sono inerti. Usare xml_storage_path + signed URL. Nessun writer/reader nel codice.';
