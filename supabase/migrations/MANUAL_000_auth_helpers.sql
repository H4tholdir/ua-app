-- ============================================================
-- MANUAL_000_auth_helpers.sql
-- STATO: NON NECESSARIO per questo progetto
--
-- Le policy RLS di UÀ usano public.current_lab_id() (schema public),
-- NON auth.current_lab_id() (schema auth).
--
-- public.current_lab_id() è già definita nel DB e funzionante.
-- public.get_lab_id() creata da migration 002 (alias per Management API).
--
-- Questo file è mantenuto solo come documentazione di fallback
-- nel caso si debba ricreare le funzioni su un DB da zero.
-- ============================================================

-- Eseguire SOLO se public.current_lab_id() non esiste:
-- SELECT routine_name FROM information_schema.routines WHERE routine_name = 'current_lab_id' AND routine_schema = 'public';
-- Se la query ritorna 0 righe, eseguire:

/*
CREATE OR REPLACE FUNCTION public.current_lab_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT laboratorio_id
    FROM public.utenti
    WHERE id = auth.uid()
      AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.lab_is_accessible()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.laboratori l
    JOIN public.utenti u ON u.laboratorio_id = l.id
    WHERE u.id = auth.uid()
      AND u.deleted_at IS NULL
      AND l.stato IN ('attivo', 'trial')
  );
END;
$$;
*/
