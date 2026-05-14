-- ============================================================
-- MDR Quality tables: incidenti_mdr + rischi_tipo_dispositivo
-- Task 23 — Fase 2 Core
-- ============================================================

-- Tabella incidenti MDR (Allegato XIII MDR 2017/745)
CREATE TABLE IF NOT EXISTS incidenti_mdr (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id        UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  tipo                  TEXT NOT NULL CHECK (tipo IN ('malfunzionamento', 'evento_avverso', 'near_miss', 'reclamo')),
  gravita               TEXT NOT NULL CHECK (gravita IN ('lieve', 'moderata', 'grave', 'critica')),
  data_evento           DATE NOT NULL,
  descrizione           TEXT NOT NULL,
  azioni_correttive     TEXT,
  risolto               BOOLEAN NOT NULL DEFAULT FALSE,
  data_risoluzione      DATE,
  segnalato_ministero   BOOLEAN NOT NULL DEFAULT FALSE,
  data_segnalazione     DATE,
  riferimento_lavoro_id UUID REFERENCES lavori(id) ON DELETE SET NULL,
  created_by            UUID REFERENCES utenti(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);

SELECT apply_updated_at_trigger('incidenti_mdr');

ALTER TABLE incidenti_mdr ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incidenti_mdr_laboratorio" ON incidenti_mdr
  FOR ALL USING (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_incidenti_mdr_lab ON incidenti_mdr(laboratorio_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_incidenti_mdr_data ON incidenti_mdr(data_evento DESC)
  WHERE deleted_at IS NULL;

-- Tabella analisi rischi per tipo dispositivo (UNI EN ISO 14971)
CREATE TABLE IF NOT EXISTS rischi_tipo_dispositivo (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id        UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  tipo_dispositivo      TEXT NOT NULL,
  versione              TEXT NOT NULL DEFAULT '1.0',
  data_ultima_revisione DATE NOT NULL DEFAULT CURRENT_DATE,
  approvato_da          TEXT,
  rischi_json           JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (laboratorio_id, tipo_dispositivo)
);

SELECT apply_updated_at_trigger('rischi_tipo_dispositivo');

ALTER TABLE rischi_tipo_dispositivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rischi_tipo_dispositivo_laboratorio" ON rischi_tipo_dispositivo
  FOR ALL USING (laboratorio_id = public.current_lab_id());

CREATE INDEX idx_rischi_tipo_lab ON rischi_tipo_dispositivo(laboratorio_id);
