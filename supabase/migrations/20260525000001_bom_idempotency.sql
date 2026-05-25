-- UÀ Migration — BOM scarico idempotency
-- Unique constraint su (lavoro_id, magazzino_id) per evitare doppio decremento scorta su retry consegna
-- + funzione atomic decrement per evitare read-modify-write race condition

-- Deduplicazione righe esistenti prima di aggiungere il constraint
-- (mantieni solo la prima per ogni coppia lavoro_id+magazzino_id)
DELETE FROM scarichi_magazzino
WHERE id NOT IN (
  SELECT MIN(id) FROM scarichi_magazzino
  GROUP BY lavoro_id, magazzino_id
);

-- Unique constraint: una sola riga di scarico per (lavoro, articolo magazzino)
ALTER TABLE scarichi_magazzino
  ADD CONSTRAINT scarichi_magazzino_lavoro_magazzino_unique
  UNIQUE (lavoro_id, magazzino_id);

-- Funzione atomic decrement: aggiorna scorta in un singolo statement SQL
-- Evita read-modify-write race condition (SELECT scorta + calcolo + UPDATE separati)
CREATE OR REPLACE FUNCTION decrementa_scorta(
  p_magazzino_id UUID,
  p_laboratorio_id UUID,
  p_quantita NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE magazzino
  SET scorta_attuale = GREATEST(0, scorta_attuale - p_quantita)
  WHERE id = p_magazzino_id
    AND laboratorio_id = p_laboratorio_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION decrementa_scorta(UUID, UUID, NUMERIC) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION decrementa_scorta(UUID, UUID, NUMERIC) TO service_role;
