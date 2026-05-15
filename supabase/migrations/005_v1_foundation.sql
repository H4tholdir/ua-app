-- supabase/migrations/005_v1_foundation.sql
-- UÀ V1 Foundation — aggiunge solo ciò che manca nel DB remoto
-- 2026-05-15
--
-- NOTA: Molte colonne del Piano A (stato_sdi, calo, logo_url, ecc.)
-- esistono già nel DB remoto — questa migration aggiunge solo il delta.

-- ============================================================
-- 1. LAVORI — stato_fisico (nuova colonna) + aggiornamento stati
-- ============================================================
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS stato_fisico VARCHAR(20)
    CHECK (stato_fisico IN (
      'in_lab','al_forno','al_cad_cam','alla_ceramica',
      'in_finitura','dal_dentista','in_spedizione'
    ));

-- Aggiorna il CHECK constraint di lavori.stato per includere nuovi valori
-- Mantiene valori esistenti (in_prova, in_ritardo) per compatibilità dati
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lavori'::regclass
      AND conname = 'lavori_stato_check'
  ) THEN
    ALTER TABLE lavori DROP CONSTRAINT lavori_stato_check;
  END IF;
END $$;

ALTER TABLE lavori
  ADD CONSTRAINT lavori_stato_check CHECK (
    stato IN (
      'ricevuto', 'in_lavorazione', 'in_prova', 'in_prova_esterna',
      'pronto', 'consegnato', 'sospeso', 'annullato', 'in_ritardo'
    )
  );

-- ============================================================
-- 2. NUOVA TABELLA: lavoro_prove
-- ============================================================
CREATE TABLE IF NOT EXISTS lavoro_prove (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id          UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id               UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  numero_prova            SMALLINT NOT NULL DEFAULT 1,
  data_uscita             DATE NOT NULL DEFAULT CURRENT_DATE,
  data_rientro_prevista   DATE,
  data_rientro_effettiva  DATE,
  esito                   VARCHAR(20)
                          CHECK (esito IN ('ok','modifiche','rifare','sospeso')),
  note_dentista           TEXT,
  foto_url                TEXT,
  created_by              UUID REFERENCES utenti(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lavoro_prove_lavoro_id ON lavoro_prove(lavoro_id);
CREATE INDEX IF NOT EXISTS idx_lavoro_prove_lab_id ON lavoro_prove(laboratorio_id);

ALTER TABLE lavoro_prove ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavoro_prove_lab_isolation" ON lavoro_prove
  FOR ALL USING (laboratorio_id = current_lab_id());

SELECT apply_updated_at_trigger('lavoro_prove');

-- ============================================================
-- 3. NUOVA TABELLA: lavori_rifacimenti
-- ============================================================
CREATE TABLE IF NOT EXISTS lavori_rifacimenti (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id       UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_originale_id  UUID NOT NULL REFERENCES lavori(id),
  lavoro_nuovo_id      UUID NOT NULL REFERENCES lavori(id),
  motivo               VARCHAR(60) NOT NULL
                       CHECK (motivo IN (
                         'colore_sbagliato','misura_errata','fusione_difettosa',
                         'rottura_produzione','non_confortevole','errore_prescrizione',
                         'altro'
                       )),
  rilevato_in          VARCHAR(30)
                       CHECK (rilevato_in IN (
                         'produzione','prova_1','prova_2','prova_3','post_consegna'
                       )),
  costo_interno        DECIMAL(10,2),
  note                 TEXT,
  created_by           UUID REFERENCES utenti(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lavori_rifacimenti_originale ON lavori_rifacimenti(lavoro_originale_id);
CREATE INDEX IF NOT EXISTS idx_lavori_rifacimenti_nuovo ON lavori_rifacimenti(lavoro_nuovo_id);

ALTER TABLE lavori_rifacimenti ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lavori_rifacimenti_lab_isolation" ON lavori_rifacimenti
  FOR ALL USING (laboratorio_id = current_lab_id());

-- ============================================================
-- 4. NUOVA TABELLA: listino_prezzi_tier
-- ============================================================
CREATE TABLE IF NOT EXISTS listino_prezzi_tier (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavorazione_id UUID NOT NULL REFERENCES listino(id) ON DELETE CASCADE,
  tier           SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 10),
  prezzo         DECIMAL(10,2) NOT NULL,
  UNIQUE (laboratorio_id, lavorazione_id, tier)
);

CREATE INDEX IF NOT EXISTS idx_listino_tier_lab ON listino_prezzi_tier(laboratorio_id);

ALTER TABLE listino_prezzi_tier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "listino_tier_lab_isolation" ON listino_prezzi_tier
  FOR ALL USING (laboratorio_id = current_lab_id());
