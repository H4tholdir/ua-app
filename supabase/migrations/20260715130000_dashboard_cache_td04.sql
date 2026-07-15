-- Task 5 (audit letture storno TD04): refresh_dashboard_cache è storno-aware.
-- Spec: docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md
-- CREATE OR REPLACE additivo — sostituisce la definizione di
-- 20260702185348_b2_contabilita_clienti.sql (stessa firma, nessun DROP).
--
-- Due gruppi di letture nella stessa funzione:
--  - "pagamenti scaduti" (Gruppo A, dovuti/scadenzario): una TD01 stornata
--    non è più un dovuto scaduto e il TD04 non lo è mai (lavoro_id NULL) —
--    stesso invariante di getContabilitaCliente/getCreditoScadutoPerCliente
--    (src/lib/contabilita/queries.ts), altrimenti questo KPI in cache
--    disaccorderebbe con il widget Front Desk/scadenzario che leggono da lì.
--  - "fatturato mese/mese precedente" (Gruppo B, ricavo): il TD04 va
--    SOTTRATTO nel mese di emissione — l'originale stornato NON viene mai
--    filtrato via e resta nel proprio mese (il fatturato storico non si
--    riscrive, si compensa nel mese in cui la nota di credito è stata
--    emessa).
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
  -- B2: fatture non pagate (residuo = totale - importo_pagato, derivato via
  -- trigger) + lavori diretti (fatturare/non_fatturare) non ancora saldati,
  -- entrambi con oltre 30gg di ritardo. Sostituisce la vecchia sub-select su
  -- lavori_partitario (mai scritta in produzione).
  --
  -- Task 5: aggiunto `AND f.stornata_at IS NULL AND f.tipo_documento != 'TD04'`
  -- sul ramo fatture — senza, una TD01 stornata continuerebbe a contare come
  -- scaduta e il TD04 (sempre non pagato, sempre residuo positivo) verrebbe
  -- doppio-contato come un secondo dovuto per lo stesso importo.
  SELECT
    COALESCE(SUM(residuo), 0),
    COUNT(*)
  INTO v_pagamenti_scad_tot, v_pagamenti_scad_ct
  FROM (
    SELECT f.id, (f.totale - f.importo_pagato) AS residuo
    FROM fatture f
    WHERE f.laboratorio_id = p_lab_id
      AND f.deleted_at IS NULL
      AND f.pagata = FALSE
      AND f.stato_sdi != 'draft'
      AND f.stornata_at IS NULL
      AND f.tipo_documento != 'TD04'
      AND f.data < CURRENT_DATE - INTERVAL '30 days'

    UNION ALL

    SELECT l.id,
      COALESCE(l.prezzo_unitario, 0)
        - COALESCE((SELECT SUM(p.importo) FROM pagamenti p WHERE p.lavoro_id = l.id AND p.stato = 'attivo'), 0)
        - COALESCE((SELECT SUM(m.importo) FROM credito_clienti_movimenti m WHERE m.lavoro_id = l.id AND m.tipo = 'applicazione'), 0)
      AS residuo
    FROM lavori l
    WHERE l.laboratorio_id = p_lab_id
      AND l.deleted_at IS NULL
      AND l.stato NOT IN ('annullato')
      AND l.incluso_in_fattura = FALSE
      AND l.decisione_fatturazione IN ('fatturare', 'non_fatturare')
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
    tecnico_saturo_id,
    tecnico_saturo_count,
    aggiornato_at
  )
  SELECT
    p_lab_id,
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato')
        AND data_consegna_prevista = CURRENT_DATE
    ),
    COUNT(*) FILTER (WHERE stato = 'in_ritardo'),
    COUNT(*) FILTER (
      WHERE stato = 'pronto' AND incluso_in_fattura = FALSE
    ),
    COUNT(*) FILTER (
      WHERE stato = 'consegnato' AND conformato = FALSE
    ),
    COUNT(*) FILTER (
      WHERE spedizione_stato = 'spedito'
        AND data_consegna_prevista < CURRENT_DATE - INTERVAL '2 days'
    ),
    COUNT(*) FILTER (
      WHERE is_rifacimento = TRUE
        AND data_ingresso >= v_mese_corrente
    ),
    COUNT(*) FILTER (
      WHERE impronta_digitale = TRUE
        AND tecnico_id IS NULL
        AND stato = 'ricevuto'
    ),
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato','ricevuto')
    ),
    -- Task 5 (Gruppo B): TD04 sottratto nel mese di emissione — mai filtrare
    -- stornata_at (l'originale resta nel proprio mese, invariato).
    COALESCE((
      SELECT SUM(f.totale * (CASE WHEN f.tipo_documento = 'TD04' THEN -1 ELSE 1 END))
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_corrente
        AND f.stato_sdi NOT IN ('draft','rifiutata','scaduta')
    ), 0),
    COALESCE((
      SELECT SUM(f.totale * (CASE WHEN f.tipo_documento = 'TD04' THEN -1 ELSE 1 END))
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_precedente
        AND f.data <= v_mese_prec_fine
        AND f.stato_sdi NOT IN ('draft','rifiutata','scaduta')
    ), 0),
    v_pagamenti_scad_tot,
    v_pagamenti_scad_ct,
    (
      SELECT COUNT(*)
      FROM magazzino m
      WHERE m.laboratorio_id = p_lab_id
        AND m.deleted_at IS NULL
        AND m.attivo = TRUE
        AND m.scorta_attuale <= m.scorta_minima
        AND m.scorta_minima > 0
    ),
    COUNT(*) FILTER (WHERE stato = 'in_prova'),
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
    tecnico_saturo_id                = NULL,
    tecnico_saturo_count             = 0,
    aggiornato_at                    = NOW();
END;
$$;
