-- Migration: accettazione_ingresso
-- Aggiunge campi MDR Allegato XIII per l'accettazione in ingresso dei lavori
-- Data: 2026-05-20

ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS tipo_impronte               TEXT,
  ADD COLUMN IF NOT EXISTS disinfettante_usato         TEXT,
  ADD COLUMN IF NOT EXISTS lotto_disinfettante         TEXT,
  ADD COLUMN IF NOT EXISTS materiali_allegati          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS anamnesi_difficolta_manuali BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN lavori.tipo_impronte               IS 'Tipo di impronta ricevuta (MDR Allegato XIII tracciabilità)';
COMMENT ON COLUMN lavori.disinfettante_usato         IS 'Disinfettante usato per la decontaminazione dell''impronta';
COMMENT ON COLUMN lavori.lotto_disinfettante         IS 'Numero di lotto del disinfettante (tracciabilità MDR)';
COMMENT ON COLUMN lavori.materiali_allegati          IS 'Array di materiali fisici ricevuti con il lavoro';
COMMENT ON COLUMN lavori.anamnesi_difficolta_manuali IS 'Il paziente ha difficoltà manuali nella gestione del dispositivo';
