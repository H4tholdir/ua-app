-- Ondata 3b: nota del dentista pulita + marcatore origine-portale + codice paziente
-- Additive, nullable/default → nessun impatto RLS (ereditano la policy di lavori).
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS note_dentista TEXT,
  ADD COLUMN IF NOT EXISTS da_portale BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paziente_codice_richiesta TEXT;

COMMENT ON COLUMN lavori.note_dentista IS 'Nota clinica scritta dal dentista alla richiesta (portale). Read-only per il lab.';
COMMENT ON COLUMN lavori.da_portale IS 'True se il lavoro nasce da richiesta portale dentista. Sostituisce il marcatore RICHIESTA_DENTISTA in note_interne.';
COMMENT ON COLUMN lavori.paziente_codice_richiesta IS 'Codice-paziente GDPR-safe indicato dal dentista (audit della richiesta, finché il lab non assegna paziente_id).';

-- Rate-limit portale: partial index (nice-to-have, il volume è basso)
CREATE INDEX IF NOT EXISTS idx_lavori_da_portale_created
  ON lavori (cliente_id, created_at) WHERE da_portale;
