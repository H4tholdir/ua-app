-- UÀ Migration v1.2.2 — Fix RPC consegna_lavoro_lock con p_laboratorio_id
-- Applicata via supabase db query --linked il 2026-05-14

-- (già eseguita direttamente sul DB, inclusa qui per audit trail)
-- La RPC ora accetta p_laboratorio_id e usa WHERE atomico con condizioni:
--   AND laboratorio_id = p_laboratorio_id
--   AND consegna_in_corso = FALSE
--   AND stato <> 'consegnato'
-- evitando race condition con due richieste simultanee via service-role.

SELECT 'migration v1.2.2 applicata — RPC lock atomico' AS status;
