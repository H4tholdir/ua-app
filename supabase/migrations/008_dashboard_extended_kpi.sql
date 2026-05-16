-- supabase/migrations/008_dashboard_extended_kpi.sql
-- UÀ Plan C — Extended dashboard KPI + pg_cron
-- 2026-05-16
--
-- PREREQUISITI:
--   - Migration 002_fase2_schema.sql applicata (crea dashboard_kpi_cache)
--   - Migration 002 ridefinisce fatture.stato_sdi con valori:
--       'draft','generata','smtp_inviata','pec_consegnata',
--       'ricevuta_sdi','accettata','rifiutata','scaduta'
--   - pg_cron deve essere abilitato PRIMA di applicare questa migration:
--       Supabase Dashboard → Settings → Database → Extensions → pg_cron

-- ============================================================
-- 1. ESTENDE dashboard_kpi_cache con colonne mancanti
-- ============================================================
ALTER TABLE dashboard_kpi_cache
  ADD COLUMN IF NOT EXISTS fatturato_mese_precedente        NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagamenti_scaduti_totale         NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pagamenti_scaduti_clienti_count  INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materiali_esaurimento_count      INTEGER       NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS in_prova_count                   INTEGER       NOT NULL DEFAULT 0;

-- ============================================================
-- 2. RISCRIVE refresh_dashboard_cache() — calcola tutti i KPI
-- ============================================================
CREATE OR REPLACE FUNCTION refresh_dashboard_cache(p_lab_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mese_corrente      DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_mese_precedente    DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_mese_prec_fine     DATE := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  v_pagamenti_scad_tot NUMERIC(12,2) := 0;
  v_pagamenti_scad_ct  INTEGER := 0;
BEGIN
  -- Calcola saldo scaduto: lavori con data_consegna_prevista > 30gg fa
  -- e residuo (prezzo_unitario - totale_pagato) ancora positivo.
  SELECT
    COALESCE(SUM(residuo), 0),
    COUNT(*)
  INTO v_pagamenti_scad_tot, v_pagamenti_scad_ct
  FROM (
    SELECT
      l.id,
      COALESCE(l.prezzo_unitario, 0)
        - COALESCE((
            SELECT SUM(p.importo)
            FROM lavori_partitario p
            WHERE p.lavoro_id = l.id AND p.deleted_at IS NULL
          ), 0) AS residuo
    FROM lavori l
    WHERE l.laboratorio_id = p_lab_id
      AND l.deleted_at IS NULL
      AND l.stato NOT IN ('annullato')
      AND l.data_consegna_prevista < CURRENT_DATE - INTERVAL '30 days'
      AND COALESCE(l.prezzo_unitario, 0) > 0
  ) sub
  WHERE residuo > 0;

  INSERT INTO dashboard_kpi_cache (
    laboratorio_id,
    consegne_oggi,
    lavori_in_ritardo,
    pronti_non_fatturati,
    mdr_incompleti,
    spedizioni_in_ritardo,
    is_rifacimento_count,
    stl_non_assegnati,
    lavori_attivi,
    fatturato_mese,
    fatturato_mese_precedente,
    pagamenti_scaduti_totale,
    pagamenti_scaduti_clienti_count,
    materiali_esaurimento_count,
    in_prova_count,
    -- tecnico_saturo_id / tecnico_saturo_count: azzerati a ogni refresh,
    -- aggiornati da query separata in queries.ts (getTitolareKpi)
    tecnico_saturo_id,
    tecnico_saturo_count,
    aggiornato_at
  )
  SELECT
    p_lab_id,
    -- KPI 1: consegne previste oggi (escluse consegnate e annullate)
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato')
        AND data_consegna_prevista = CURRENT_DATE
    ),
    -- KPI 2: lavori in ritardo
    COUNT(*) FILTER (WHERE stato = 'in_ritardo'),
    -- KPI 3: pronti non ancora fatturati
    COUNT(*) FILTER (
      WHERE stato = 'pronto' AND incluso_in_fattura = FALSE
    ),
    -- KPI 4: MDR incompleti (consegnati senza DdC conforme)
    COUNT(*) FILTER (
      WHERE stato = 'consegnato' AND conformato = FALSE
    ),
    -- KPI 5: spedizioni in ritardo (spedite da >2gg senza segnale di consegna)
    COUNT(*) FILTER (
      WHERE spedizione_stato = 'spedito'
        AND data_consegna_prevista < CURRENT_DATE - INTERVAL '2 days'
    ),
    -- KPI 6: rifacimenti aperti nel mese corrente
    COUNT(*) FILTER (
      WHERE is_rifacimento = TRUE
        AND data_ingresso >= v_mese_corrente
    ),
    -- KPI 7: impronte digitali ricevute non ancora assegnate a un tecnico
    COUNT(*) FILTER (
      WHERE impronta_digitale = TRUE
        AND tecnico_id IS NULL
        AND stato = 'ricevuto'
    ),
    -- KPI 8: lavori in lavorazione attiva (esclusi ricevuto, consegnato, annullato)
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato','ricevuto')
    ),
    -- Fatturato mese corrente: somma fatture accettate o in corso di accettazione
    -- Esclude: 'draft' (bozze non inviate), 'rifiutata' (scartate da SDI),
    --          'scaduta' (nessuna risposta SDI dopo 5gg — fiscalmente incerte)
    COALESCE((
      SELECT SUM(f.totale)
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_corrente
        AND f.stato_sdi NOT IN ('draft','rifiutata','scaduta')
    ), 0),
    -- Fatturato mese precedente (stesso filtro)
    COALESCE((
      SELECT SUM(f.totale)
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_precedente
        AND f.data <= v_mese_prec_fine
        AND f.stato_sdi NOT IN ('draft','rifiutata','scaduta')
    ), 0),
    -- Pagamenti scaduti (calcolati nella sezione DECLARE sopra)
    v_pagamenti_scad_tot,
    v_pagamenti_scad_ct,
    -- Materiali in esaurimento (scorta sotto o uguale al minimo configurato)
    (
      SELECT COUNT(*)
      FROM magazzino m
      WHERE m.laboratorio_id = p_lab_id
        AND m.deleted_at IS NULL
        AND m.attivo = TRUE
        AND m.scorta_attuale <= m.scorta_minima
        AND m.scorta_minima > 0
    ),
    -- Lavori in prova esterna (attesa rientro dal dentista)
    COUNT(*) FILTER (WHERE stato = 'in_prova'),
    -- tecnico_saturo: azzerato — viene aggiornato da query separata nell'API
    NULL,
    0,
    NOW()
  FROM lavori
  WHERE laboratorio_id = p_lab_id AND deleted_at IS NULL
  ON CONFLICT (laboratorio_id) DO UPDATE SET
    consegne_oggi                    = EXCLUDED.consegne_oggi,
    lavori_in_ritardo                = EXCLUDED.lavori_in_ritardo,
    pronti_non_fatturati             = EXCLUDED.pronti_non_fatturati,
    mdr_incompleti                   = EXCLUDED.mdr_incompleti,
    spedizioni_in_ritardo            = EXCLUDED.spedizioni_in_ritardo,
    is_rifacimento_count             = EXCLUDED.is_rifacimento_count,
    stl_non_assegnati                = EXCLUDED.stl_non_assegnati,
    lavori_attivi                    = EXCLUDED.lavori_attivi,
    fatturato_mese                   = EXCLUDED.fatturato_mese,
    fatturato_mese_precedente        = EXCLUDED.fatturato_mese_precedente,
    pagamenti_scaduti_totale         = EXCLUDED.pagamenti_scaduti_totale,
    pagamenti_scaduti_clienti_count  = EXCLUDED.pagamenti_scaduti_clienti_count,
    materiali_esaurimento_count      = EXCLUDED.materiali_esaurimento_count,
    in_prova_count                   = EXCLUDED.in_prova_count,
    -- tecnico_saturo azzerato: l'API aggiunge il dato con una query JOIN separata
    tecnico_saturo_id                = NULL,
    tecnico_saturo_count             = 0,
    aggiornato_at                    = NOW();
END;
$$;

-- ============================================================
-- 3. pg_cron — aggiornamento automatico ogni 15 minuti
-- NOTA: pg_cron deve essere abilitato in Supabase Dashboard PRIMA
--       di applicare questa migration, altrimenti il blocco fallisce.
--       Dashboard → Settings → Database → Extensions → pg_cron
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Rimuovi job precedente se esiste (rende la migration idempotente)
DO $unsched$
BEGIN
  PERFORM cron.unschedule('refresh-dashboard-kpi');
EXCEPTION WHEN OTHERS THEN NULL;
END
$unsched$;

SELECT cron.schedule(
  'refresh-dashboard-kpi',
  '*/15 * * * *',
  $job$
  DO $body$
  DECLARE r RECORD;
  BEGIN
    FOR r IN
      SELECT id FROM laboratori
      WHERE deleted_at IS NULL
        AND stato IN ('attivo','trial')
    LOOP
      PERFORM refresh_dashboard_cache(r.id);
    END LOOP;
  END
  $body$;
  $job$
);

-- ============================================================
-- 4. Commenti documentativi
-- ============================================================
COMMENT ON COLUMN dashboard_kpi_cache.fatturato_mese_precedente IS
  'Fatturato del mese solare precedente a quello corrente (stesso filtro stato_sdi)';
COMMENT ON COLUMN dashboard_kpi_cache.pagamenti_scaduti_totale IS
  'Somma residuo non pagato su lavori con data_consegna_prevista > 30gg fa';
COMMENT ON COLUMN dashboard_kpi_cache.pagamenti_scaduti_clienti_count IS
  'Numero di lavori distinti con almeno un saldo scaduto (proxy per clienti morosi)';
COMMENT ON COLUMN dashboard_kpi_cache.materiali_esaurimento_count IS
  'Articoli magazzino con scorta_attuale <= scorta_minima e scorta_minima > 0';
COMMENT ON COLUMN dashboard_kpi_cache.in_prova_count IS
  'Lavori con stato = ''in_prova'' — in attesa di rientro dal dentista';
