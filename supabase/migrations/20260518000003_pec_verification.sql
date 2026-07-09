ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS pec_verificata    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pec_verified_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pec_verify_token  UUID;

CREATE INDEX IF NOT EXISTS idx_laboratori_pec_verify_token
  ON laboratori(pec_verify_token)
  WHERE pec_verify_token IS NOT NULL;

UPDATE laboratori SET pec_verificata = false WHERE pec_smtp_configurata = true;
