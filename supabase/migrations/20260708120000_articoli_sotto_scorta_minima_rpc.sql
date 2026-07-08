-- supabase/migrations/20260708120000_articoli_sotto_scorta_minima_rpc.sql
-- B16: sostituisce la query colonna-contro-colonna non supportata da
-- PostgREST in ordini/page.tsx (scorta_attuale confrontato con
-- scorta_minima della stessa riga) e il fallback JS-side limitato a
-- 500 articoli. Filtra server-side, nessun limite di riga.
--
-- Nota: esiste già una view magazzino_sotto_scorta (schema.sql:2455)
-- ma non è utilizzabile da qui — filtra internamente su
-- current_lab_id()/auth.uid(), sempre NULL sotto getServiceClient()
-- (service-role, nessun JWT utente). Questa funzione è l'equivalente
-- parametrizzato e callable da service-role; non sostituisce la view
-- (usata potenzialmente da un futuro consumer con sessione utente).
CREATE OR REPLACE FUNCTION public.articoli_sotto_scorta_minima(p_lab_id uuid)
RETURNS SETOF magazzino
LANGUAGE sql
SET search_path TO 'public'
AS $$
  SELECT *
  FROM magazzino
  WHERE laboratorio_id = p_lab_id
    AND attivo = true
    AND scorta_attuale <= scorta_minima
  ORDER BY nome ASC;
$$;

REVOKE ALL ON FUNCTION public.articoli_sotto_scorta_minima(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.articoli_sotto_scorta_minima(uuid) TO service_role;
