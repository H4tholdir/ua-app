-- ============================================================
-- B2 — Contabilità Clienti: ledger pagamenti polimorfico,
-- decisione fatturazione, credito cliente, dismissione lavori_partitario.
-- Vedi docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md
-- PREREQUISITO: Task 1 di questo piano già applicato (nessun riferimento
-- applicativo residuo a lavori_partitario).
-- ============================================================

-- ------------------------------------------------------------
-- 1. lavori.decisione_fatturazione
-- ------------------------------------------------------------
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS decisione_fatturazione TEXT NOT NULL DEFAULT 'in_attesa'
    CHECK (decisione_fatturazione IN ('in_attesa', 'fatturare', 'non_fatturare'));

COMMENT ON COLUMN lavori.decisione_fatturazione IS
  'Decisione se il lavoro va fatturato o saldato direttamente dal cliente. Immutabile una volta incluso_in_fattura=true — modificabile solo via PATCH /api/lavori/[id]/decisione-fatturazione.';

-- ------------------------------------------------------------
-- 2. pagamenti — ledger polimorfico (fattura XOR lavoro diretto)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagamenti (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id           UUID NOT NULL REFERENCES laboratori(id),
  fattura_id               UUID REFERENCES fatture(id),
  lavoro_id                UUID REFERENCES lavori(id),

  importo                  NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  metodo                   TEXT NOT NULL CHECK (metodo IN ('contanti','bonifico','pos','assegno','altro')),
  metodo_nota              TEXT,
  data_pagamento           DATE NOT NULL,

  stato                    TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo','annullato')),
  motivo_annullamento      TEXT,
  sostituisce_pagamento_id UUID REFERENCES pagamenti(id),

  registrato_da            UUID NOT NULL REFERENCES utenti(id),
  annullato_da             UUID REFERENCES utenti(id),
  annullato_at             TIMESTAMPTZ,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (fattura_id IS NOT NULL AND lavoro_id IS NULL) OR
    (fattura_id IS NULL AND lavoro_id IS NOT NULL)
  )
);

ALTER TABLE pagamenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagamenti_laboratorio_select" ON pagamenti;
CREATE POLICY "pagamenti_laboratorio_select" ON pagamenti
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

DROP POLICY IF EXISTS "pagamenti_laboratorio_insert" ON pagamenti;
CREATE POLICY "pagamenti_laboratorio_insert" ON pagamenti
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND (public.has_role('titolare') OR public.has_role('front_desk'))
  );

DROP POLICY IF EXISTS "pagamenti_laboratorio_update" ON pagamenti;
CREATE POLICY "pagamenti_laboratorio_update" ON pagamenti
  FOR UPDATE USING (laboratorio_id = public.current_lab_id())
  WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND (public.has_role('titolare') OR public.has_role('front_desk'))
  );

CREATE INDEX IF NOT EXISTS idx_pagamenti_fattura ON pagamenti(fattura_id) WHERE fattura_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagamenti_lavoro ON pagamenti(lavoro_id) WHERE lavoro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagamenti_laboratorio ON pagamenti(laboratorio_id);

-- ------------------------------------------------------------
-- 3. credito_clienti_movimenti
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credito_clienti_movimenti (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id),
  cliente_id     UUID NOT NULL REFERENCES clienti(id),
  tipo           TEXT NOT NULL CHECK (tipo IN ('eccedenza','applicazione','rimborso')),

  pagamento_id   UUID REFERENCES pagamenti(id),
  fattura_id     UUID REFERENCES fatture(id),
  lavoro_id      UUID REFERENCES lavori(id),

  importo        NUMERIC(10,2) NOT NULL CHECK (importo > 0),
  metodo         TEXT CHECK (metodo IN ('contanti','bonifico','pos','assegno','altro')),
  metodo_nota    TEXT,
  note           TEXT,

  registrato_da  UUID NOT NULL REFERENCES utenti(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (tipo = 'eccedenza'    AND pagamento_id IS NOT NULL AND fattura_id IS NULL AND lavoro_id IS NULL) OR
    (tipo = 'applicazione' AND pagamento_id IS NULL AND (fattura_id IS NOT NULL) <> (lavoro_id IS NOT NULL)) OR
    (tipo = 'rimborso'     AND pagamento_id IS NULL AND fattura_id IS NULL AND lavoro_id IS NULL AND metodo IS NOT NULL)
  )
);

ALTER TABLE credito_clienti_movimenti ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credito_movimenti_laboratorio_select" ON credito_clienti_movimenti;
CREATE POLICY "credito_movimenti_laboratorio_select" ON credito_clienti_movimenti
  FOR SELECT USING (laboratorio_id = public.current_lab_id());

DROP POLICY IF EXISTS "credito_movimenti_laboratorio_insert" ON credito_clienti_movimenti;
CREATE POLICY "credito_movimenti_laboratorio_insert" ON credito_clienti_movimenti
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND (public.has_role('titolare') OR public.has_role('front_desk'))
  );

CREATE INDEX IF NOT EXISTS idx_credito_mov_cliente ON credito_clienti_movimenti(cliente_id);
CREATE INDEX IF NOT EXISTS idx_credito_mov_fattura ON credito_clienti_movimenti(fattura_id) WHERE fattura_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credito_mov_lavoro ON credito_clienti_movimenti(lavoro_id) WHERE lavoro_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_credito_mov_laboratorio ON credito_clienti_movimenti(laboratorio_id);

-- ------------------------------------------------------------
-- 4. fatture.importo_pagato + trigger di ricalcolo pagata/importo_pagato
-- ------------------------------------------------------------
ALTER TABLE fatture ADD COLUMN IF NOT EXISTS importo_pagato NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN fatture.importo_pagato IS
  'Derivato via trigger da pagamenti attivi + applicazioni di credito collegate. Non impostare mai manualmente (vedi trg_ricalcola_pagamento_fattura).';

CREATE OR REPLACE FUNCTION ricalcola_pagamento_fattura(p_fattura_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v_totale NUMERIC(10,2);
  v_pagato NUMERIC(10,2);
BEGIN
  SELECT totale INTO v_totale FROM fatture WHERE id = p_fattura_id;
  IF v_totale IS NULL THEN
    RETURN; -- fattura non trovata (già cancellata) — nessun ricalcolo
  END IF;

  SELECT
    COALESCE((SELECT SUM(importo) FROM pagamenti WHERE fattura_id = p_fattura_id AND stato = 'attivo'), 0)
    + COALESCE((SELECT SUM(importo) FROM credito_clienti_movimenti WHERE fattura_id = p_fattura_id AND tipo = 'applicazione'), 0)
  INTO v_pagato;

  UPDATE fatture
  SET importo_pagato = v_pagato,
      pagata = (v_pagato >= v_totale),
      updated_at = now()
  WHERE id = p_fattura_id;
END;
$$;

-- Un'unica funzione trigger per entrambe le tabelle: sia `pagamenti` che
-- `credito_clienti_movimenti` hanno una colonna `fattura_id` con lo stesso
-- significato. Guardia esplicita: righe legate a un lavoro diretto
-- (fattura_id IS NULL) non toccano mai `fatture`.
CREATE OR REPLACE FUNCTION trg_ricalcola_pagamento_fattura()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.fattura_id IS NOT NULL THEN
      PERFORM ricalcola_pagamento_fattura(OLD.fattura_id);
    END IF;
    RETURN NULL;
  END IF;

  IF NEW.fattura_id IS NOT NULL THEN
    PERFORM ricalcola_pagamento_fattura(NEW.fattura_id);
  END IF;

  -- Se una UPDATE ha cambiato la fattura collegata (non dovrebbe succedere,
  -- ma per sicurezza) ricalcola anche la vecchia.
  IF TG_OP = 'UPDATE' AND OLD.fattura_id IS NOT NULL AND OLD.fattura_id IS DISTINCT FROM NEW.fattura_id THEN
    PERFORM ricalcola_pagamento_fattura(OLD.fattura_id);
  END IF;

  RETURN NULL;
END;
$$;

-- AFTER INSERT OR UPDATE OR DELETE: l'UPDATE copre il soft-cancel
-- (stato attivo→annullato) — il pagamento annullato smette di contare
-- perché la funzione sopra filtra sempre stato='attivo'.
DROP TRIGGER IF EXISTS trg_pagamenti_ricalcola_fattura ON pagamenti;
CREATE TRIGGER trg_pagamenti_ricalcola_fattura
  AFTER INSERT OR UPDATE OR DELETE ON pagamenti
  FOR EACH ROW EXECUTE FUNCTION trg_ricalcola_pagamento_fattura();

DROP TRIGGER IF EXISTS trg_credito_movimenti_ricalcola_fattura ON credito_clienti_movimenti;
CREATE TRIGGER trg_credito_movimenti_ricalcola_fattura
  AFTER INSERT OR UPDATE OR DELETE ON credito_clienti_movimenti
  FOR EACH ROW EXECUTE FUNCTION trg_ricalcola_pagamento_fattura();

-- ------------------------------------------------------------
-- 5. refresh_dashboard_cache() — KPI "pagamenti scaduti" (008),
--    sostituita la lettura di lavori_partitario (0 righe, mai scritta)
-- ------------------------------------------------------------
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
    COALESCE((
      SELECT SUM(f.totale)
      FROM fatture f
      WHERE f.laboratorio_id = p_lab_id
        AND f.deleted_at IS NULL
        AND f.data >= v_mese_corrente
        AND f.stato_sdi NOT IN ('draft','rifiutata','scaduta')
    ), 0),
    COALESCE((
      SELECT SUM(f.totale)
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
