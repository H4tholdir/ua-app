-- ============================================================
-- B1 — Tracciabilità MDR materiali/lotti
-- Cattura lavori_materiali nelle migration tracciate (era solo
-- in supabase/schema.sql, creata fuori dal flusso migration).
-- Idempotente: sicura da rieseguire su un DB dove la tabella esiste già.
-- ============================================================

CREATE TABLE IF NOT EXISTS lavori_materiali (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id    UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id         UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  lotto_id          UUID NOT NULL REFERENCES lotti_magazzino(id),
  magazzino_id      UUID NOT NULL REFERENCES magazzino(id),

  quantita_usata    NUMERIC(12,4) NOT NULL,
  unita_misura      TEXT NOT NULL,
  data_uso          TIMESTAMPTZ NOT NULL DEFAULT now(),

  numero_lotto_snapshot TEXT NOT NULL,
  nome_materiale_snapshot TEXT NOT NULL,
  produttore_snapshot TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

ALTER TABLE lavori_materiali ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lavori_mat_laboratorio" ON lavori_materiali;
CREATE POLICY "lavori_mat_laboratorio" ON lavori_materiali
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "lavori_mat_insert" ON lavori_materiali;
CREATE POLICY "lavori_mat_insert" ON lavori_materiali
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX IF NOT EXISTS idx_lavori_mat_lavoro ON lavori_materiali(lavoro_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lavori_mat_lotto ON lavori_materiali(lotto_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_lavori_mat_laboratorio ON lavori_materiali(laboratorio_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------
-- Trigger decremento scorte — CORRETTO con guardia GREATEST(0, ...)
-- Prima non aveva guardia su lotti_magazzino.quantita_residua
-- (a differenza di decrementa_scorta su magazzino, che ce l'ha già):
-- un lotto poteva andare negativo.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION aggiorna_scorta_lotto()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lotti_magazzino
    SET quantita_residua = GREATEST(0, quantita_residua - NEW.quantita_usata),
        updated_at = now()
    WHERE id = NEW.lotto_id;

    UPDATE magazzino
    SET scorta_attuale = GREATEST(0, scorta_attuale - NEW.quantita_usata),
        updated_at = now()
    WHERE id = NEW.magazzino_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE lotti_magazzino
    SET quantita_residua = quantita_residua + OLD.quantita_usata,
        updated_at = now()
    WHERE id = OLD.lotto_id;

    UPDATE magazzino
    SET scorta_attuale = scorta_attuale + OLD.quantita_usata,
        updated_at = now()
    WHERE id = OLD.magazzino_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_lavori_materiali_scorta ON lavori_materiali;
CREATE TRIGGER trg_lavori_materiali_scorta
  AFTER INSERT OR DELETE ON lavori_materiali
  FOR EACH ROW EXECUTE FUNCTION aggiorna_scorta_lotto();

-- ------------------------------------------------------------
-- Flag "tracciabilità incompleta" su lavori
-- ------------------------------------------------------------
ALTER TABLE lavori ADD COLUMN IF NOT EXISTS tracciabilita_materiali_ok BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE lavori ADD COLUMN IF NOT EXISTS materiali_incompleti_dettaglio JSONB;

COMMENT ON COLUMN lavori.tracciabilita_materiali_ok IS
  'FALSE se almeno un materiale MDR-rilevante (traccia_lotto=true) non ha trovato un lotto disponibile, o una lavorazione non ha BOM definita in listino_materiali_auto. Vedi materiali_incompleti_dettaglio per il dettaglio.';
COMMENT ON COLUMN lavori.materiali_incompleti_dettaglio IS
  'Array JSON di {magazzino_id, nome_materiale, motivo} con motivo in (lotto_assente, bom_mancante). NULL se tracciabilita_materiali_ok = true.';
