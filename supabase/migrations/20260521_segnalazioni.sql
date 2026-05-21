-- Migration: 20260521_segnalazioni
-- Aggiunge colonne segnalazione problemi in-app (tecnico → titolare)

ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS segnalazione_tipo    TEXT
    CHECK (segnalazione_tipo IN (
      'impronta_non_idonea',
      'colore_mancante',
      'istruzione_poco_chiara',
      'materiale_esaurito',
      'altro'
    )),
  ADD COLUMN IF NOT EXISTS segnalazione_nota    TEXT,
  ADD COLUMN IF NOT EXISTS segnalazione_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS segnalazione_by      UUID REFERENCES utenti(id),
  ADD COLUMN IF NOT EXISTS segnalazione_risolta BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_lavori_segnalazione
  ON lavori(laboratorio_id, segnalazione_risolta)
  WHERE segnalazione_tipo IS NOT NULL AND segnalazione_risolta = FALSE;
