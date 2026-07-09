ALTER TABLE laboratori ADD COLUMN IF NOT EXISTS onboarding_completato BOOLEAN NOT NULL DEFAULT false;
-- Lab già esistenti con ITCA: segnati come già configurati
UPDATE laboratori SET onboarding_completato = true WHERE codice_itca IS NOT NULL AND codice_itca != '';
