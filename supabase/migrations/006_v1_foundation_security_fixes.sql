-- supabase/migrations/006_v1_foundation_security_fixes.sql
-- Fix critici post code-review della migration 005
-- 2026-05-15
--
-- Aggiunge: cross-tenant guards (trigger), constraint di integrità
-- e normalizza RLS policy a get_lab_id() in tutto il progetto.

BEGIN;

-- ============================================================
-- 1. RLS POLICY — normalizza current_lab_id() → get_lab_id()
-- ============================================================
DROP POLICY IF EXISTS "lavoro_prove_lab_isolation" ON lavoro_prove;
CREATE POLICY "lavoro_prove_lab_isolation" ON lavoro_prove
  FOR ALL USING (laboratorio_id = get_lab_id());

DROP POLICY IF EXISTS "lavori_rifacimenti_lab_isolation" ON lavori_rifacimenti;
CREATE POLICY "lavori_rifacimenti_lab_isolation" ON lavori_rifacimenti
  FOR ALL USING (laboratorio_id = get_lab_id());

DROP POLICY IF EXISTS "listino_tier_lab_isolation" ON listino_prezzi_tier;
CREATE POLICY "listino_tier_lab_isolation" ON listino_prezzi_tier
  FOR ALL USING (laboratorio_id = get_lab_id());

-- ============================================================
-- 2. TRIGGER cross-tenant su lavoro_prove
-- ============================================================
DROP TRIGGER IF EXISTS trg_prove_same_lab ON lavoro_prove;
CREATE TRIGGER trg_prove_same_lab
  BEFORE INSERT ON lavoro_prove
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

-- ============================================================
-- 3. FUNZIONE + TRIGGER cross-tenant su lavori_rifacimenti
-- (controlla sia lavoro_originale_id che lavoro_nuovo_id)
-- ============================================================
CREATE OR REPLACE FUNCTION assert_same_lab_rifacimento()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lavori
    WHERE id = NEW.lavoro_originale_id
      AND laboratorio_id = NEW.laboratorio_id
  ) THEN
    RAISE EXCEPTION 'Cross-tenant violation: lavoro_originale_id non appartiene al laboratorio';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM lavori
    WHERE id = NEW.lavoro_nuovo_id
      AND laboratorio_id = NEW.laboratorio_id
  ) THEN
    RAISE EXCEPTION 'Cross-tenant violation: lavoro_nuovo_id non appartiene al laboratorio';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rifacimenti_same_lab ON lavori_rifacimenti;
CREATE TRIGGER trg_rifacimenti_same_lab
  BEFORE INSERT ON lavori_rifacimenti
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_rifacimento();

-- ============================================================
-- 4. FUNZIONE + TRIGGER cross-tenant su listino_prezzi_tier
-- (valida che lavorazione_id appartenga allo stesso lab)
-- ============================================================
CREATE OR REPLACE FUNCTION assert_same_lab_lavorazione()
  RETURNS trigger
  LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM listino
    WHERE id = NEW.lavorazione_id
      AND laboratorio_id = NEW.laboratorio_id
  ) THEN
    RAISE EXCEPTION 'Cross-tenant violation: lavorazione_id non appartiene al laboratorio';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listino_tier_same_lab ON listino_prezzi_tier;
CREATE TRIGGER trg_listino_tier_same_lab
  BEFORE INSERT ON listino_prezzi_tier
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavorazione();

-- ============================================================
-- 5. CONSTRAINT integrità lavori_rifacimenti
-- ============================================================
ALTER TABLE lavori_rifacimenti
  ADD CONSTRAINT rifacimento_no_self_ref
    CHECK (lavoro_originale_id <> lavoro_nuovo_id);

ALTER TABLE lavori_rifacimenti
  ADD CONSTRAINT rifacimento_nuovo_unique
    UNIQUE (laboratorio_id, lavoro_nuovo_id);

-- ============================================================
-- 6. CONSTRAINT unicità lavoro_prove
-- ============================================================
ALTER TABLE lavoro_prove
  ADD CONSTRAINT prova_numero_unique
    UNIQUE (lavoro_id, numero_prova);

-- ============================================================
-- 7. INDICE su lavori.stato_fisico (query kanban/dashboard)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_lavori_stato_fisico
  ON lavori(laboratorio_id, stato_fisico)
  WHERE deleted_at IS NULL AND stato_fisico IS NOT NULL;

-- ============================================================
-- 8. RIMUOVI indice ridondante su listino_prezzi_tier
-- (la UNIQUE constraint copre già il leading column laboratorio_id)
-- ============================================================
DROP INDEX IF EXISTS idx_listino_tier_lab;

COMMIT;
