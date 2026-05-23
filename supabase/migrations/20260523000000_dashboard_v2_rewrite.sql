-- Preferenza dashboard per utente
-- 'ibrido' (default) = mostra sempre tab Gestione/Produzione
-- 'gestione_solo' = titolare puro, vista singola senza tab
ALTER TABLE utenti
  ADD COLUMN IF NOT EXISTS preferenza_dashboard TEXT
    DEFAULT 'ibrido'
    CHECK (preferenza_dashboard IN ('ibrido', 'gestione_solo'));

COMMENT ON COLUMN utenti.preferenza_dashboard IS
  'Dashboard view preference: ibrido (default) | gestione_solo (opt-in in /impostazioni)';
