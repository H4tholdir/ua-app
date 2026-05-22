-- supabase/migrations/20260522120000_dashboard_v2.sql

-- Index per query dashboard tecnico (dato reale, non hardcoded)
CREATE INDEX IF NOT EXISTS idx_lavori_tecnico_stato_data
  ON lavori(tecnico_id, stato, data_consegna_prevista)
  WHERE deleted_at IS NULL;

-- Index per calcolo completamento_perc da lavori_fasi
CREATE INDEX IF NOT EXISTS idx_lavori_fasi_lavoro_eseguita
  ON lavori_fasi(lavoro_id)
  WHERE eseguita_at IS NOT NULL;

-- Preferenze navigazione per utente (drag&drop, pin)
ALTER TABLE utenti
  ADD COLUMN IF NOT EXISTS nav_preferences JSONB DEFAULT NULL;

COMMENT ON COLUMN utenti.nav_preferences IS
  'Nav pill preferences: {"tabs":["dashboard","lavori",null,"clienti","altro"],"pinned":["tecnici"]}';
