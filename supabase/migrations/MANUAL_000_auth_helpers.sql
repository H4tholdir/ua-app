-- ============================================================
-- UA: Funzioni helper RLS — ESEGUIRE MANUALMENTE
-- Supabase Dashboard → SQL Editor → incolla e Run
-- Deve essere eseguito UNA SOLA VOLTA prima delle migration 002 e 003
-- ============================================================

-- Helper: recupera laboratorio_id dell'utente autenticato
CREATE OR REPLACE FUNCTION auth.current_lab_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT laboratorio_id
  FROM public.utenti
  WHERE id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
$$;

-- Helper: verifica ruolo utente corrente
CREATE OR REPLACE FUNCTION auth.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.utenti
    WHERE id = auth.uid()
      AND ruolo = required_role
      AND deleted_at IS NULL
  );
$$;

-- Helper: trigger updated_at automatico
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Helper: applica trigger updated_at a una tabella
CREATE OR REPLACE FUNCTION apply_updated_at_trigger(tbl TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
     CREATE TRIGGER trg_%I_updated_at
     BEFORE UPDATE ON %I
     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
    tbl, tbl, tbl, tbl
  );
END;
$$;

-- Verifica OK
SELECT 'Funzioni helper create correttamente' AS status;
