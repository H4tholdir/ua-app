-- UÀ Schema Migration v1.2 — 2026-05-14
-- Eseguire su Supabase SQL Editor come Superadmin
-- NOTA: pec_password_encrypted è RIMOSSA — usare pec_vault_key_id con Supabase Vault

BEGIN;

-- ============================================================
-- A. laboratori — campi Fase 2
-- ============================================================
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS logo_print_url          TEXT,
  ADD COLUMN IF NOT EXISTS firma_ddc_url           TEXT,
  ADD COLUMN IF NOT EXISTS sfondo_ddc_url          TEXT,
  ADD COLUMN IF NOT EXISTS intestazione_ddc        TEXT,
  ADD COLUMN IF NOT EXISTS intestazione_fattura    TEXT,
  ADD COLUMN IF NOT EXISTS intestazione_buono      TEXT,
  ADD COLUMN IF NOT EXISTS pec_host                TEXT,
  ADD COLUMN IF NOT EXISTS pec_port                INTEGER DEFAULT 465,
  ADD COLUMN IF NOT EXISTS pec_user                TEXT,
  ADD COLUMN IF NOT EXISTS pec_vault_key_id        TEXT,
  ADD COLUMN IF NOT EXISTS pec_smtp_configurata    BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- B. lavori — campi Fase 2 + fix Codex
-- ============================================================
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS richiedente_nome TEXT,
  ADD COLUMN IF NOT EXISTS ora_consegna TIME,
  ADD COLUMN IF NOT EXISTS dispositivo_semilavorato BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anamnesi_bruxismo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS anamnesi_precauzioni TEXT,
  ADD COLUMN IF NOT EXISTS anamnesi_altri_dispositivi TEXT,
  ADD COLUMN IF NOT EXISTS colore_collo TEXT,
  ADD COLUMN IF NOT EXISTS colore_corpo TEXT,
  ADD COLUMN IF NOT EXISTS colore_incisale TEXT,
  ADD COLUMN IF NOT EXISTS effetti_speciali TEXT,
  ADD COLUMN IF NOT EXISTS tecnica_colore TEXT,
  ADD COLUMN IF NOT EXISTS colorazione_esterna TEXT,
  ADD COLUMN IF NOT EXISTS is_rifacimento BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rifacimento_motivo TEXT,
  ADD COLUMN IF NOT EXISTS consegna_in_corso BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consegna_tap_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS consegna_completata_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS post_consegna_correzioni SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consegna_precheck_passato_al_primo_tentativo BOOLEAN,
  ADD COLUMN IF NOT EXISTS spedizione_corriere TEXT
    CHECK (spedizione_corriere IN ('gls','brt','dhl','sda','ups','fedex','interno','altro')),
  ADD COLUMN IF NOT EXISTS spedizione_tracking TEXT,
  ADD COLUMN IF NOT EXISTS spedizione_stato TEXT
    CHECK (spedizione_stato IN ('da_spedire','spedito','consegnato_corriere','problema')),
  ADD COLUMN IF NOT EXISTS spedizione_data_prevista DATE,
  ADD COLUMN IF NOT EXISTS spedizione_note TEXT;

-- Stato 'ricevuto' come stato iniziale (Codex fix #11)
ALTER TABLE lavori DROP CONSTRAINT IF EXISTS lavori_stato_check;
ALTER TABLE lavori ADD CONSTRAINT lavori_stato_check
  CHECK (stato IN ('ricevuto','in_lavorazione','in_prova','pronto','consegnato','annullato','in_ritardo'));
ALTER TABLE lavori ALTER COLUMN stato SET DEFAULT 'ricevuto';

CREATE INDEX IF NOT EXISTS idx_lavori_spedizione
  ON lavori(laboratorio_id, spedizione_stato)
  WHERE deleted_at IS NULL AND spedizione_stato IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lavori_rifacimento
  ON lavori(laboratorio_id, is_rifacimento, data_ingresso)
  WHERE deleted_at IS NULL AND is_rifacimento = TRUE;

-- ============================================================
-- C. lavori_lavorazioni — maggiorazione, calo, esterna
-- ============================================================
ALTER TABLE lavori_lavorazioni
  ADD COLUMN IF NOT EXISTS maggiorazione DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calo          DECIMAL(8,3),
  ADD COLUMN IF NOT EXISTS esterna       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lab_esterno   TEXT;

-- ============================================================
-- D. pazienti — nome/cognome separati + campi aggiuntivi
-- ============================================================
ALTER TABLE pazienti
  ADD COLUMN IF NOT EXISTS nome           TEXT,
  ADD COLUMN IF NOT EXISTS cognome        TEXT,
  ADD COLUMN IF NOT EXISTS sesso          CHAR(1) CHECK (sesso IN ('M','F')),
  ADD COLUMN IF NOT EXISTS comune_nascita TEXT,
  ADD COLUMN IF NOT EXISTS partita_iva    TEXT,
  ADD COLUMN IF NOT EXISTS asl            TEXT,
  ADD COLUMN IF NOT EXISTS archiviato     BOOLEAN NOT NULL DEFAULT FALSE;

-- Trigger: sincronizza nome_cognome da nome+cognome
CREATE OR REPLACE FUNCTION sync_paziente_nome_cognome()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.nome IS NOT NULL AND NEW.cognome IS NOT NULL THEN
    NEW.nome_cognome := upper(NEW.cognome) || ' ' || upper(NEW.nome);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_paziente_nome_cognome ON pazienti;
CREATE TRIGGER trg_paziente_nome_cognome
  BEFORE INSERT OR UPDATE ON pazienti
  FOR EACH ROW EXECUTE FUNCTION sync_paziente_nome_cognome();

-- ============================================================
-- E. clienti — token portale con TTL
-- ============================================================
ALTER TABLE clienti
  ADD COLUMN IF NOT EXISTS portale_token_scade_at TIMESTAMPTZ
    DEFAULT (NOW() + INTERVAL '1 year');

-- ============================================================
-- F. fatture — stati SDI granulari + tracciamento PEC
-- ============================================================
ALTER TABLE fatture
  DROP CONSTRAINT IF EXISTS fatture_stato_sdi_check;

ALTER TABLE fatture
  ADD CONSTRAINT fatture_stato_sdi_check
  CHECK (stato_sdi IN (
    'draft','generata','smtp_inviata','pec_consegnata',
    'ricevuta_sdi','accettata','rifiutata','scaduta'
  ));

ALTER TABLE fatture
  ADD COLUMN IF NOT EXISTS tipo_documento   VARCHAR(4) NOT NULL DEFAULT 'TD01',
  ADD COLUMN IF NOT EXISTS codice_cup       TEXT,
  ADD COLUMN IF NOT EXISTS codice_cig       TEXT,
  ADD COLUMN IF NOT EXISTS progressivo_invio INTEGER,
  ADD COLUMN IF NOT EXISTS nome_file_xml    TEXT,
  ADD COLUMN IF NOT EXISTS xml_url          TEXT,
  ADD COLUMN IF NOT EXISTS xml_hash_sha256  TEXT,
  ADD COLUMN IF NOT EXISTS inviata_via      TEXT CHECK (inviata_via IN ('pec','sdi_coop')),
  ADD COLUMN IF NOT EXISTS inviata_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ricevuta_sdi_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS codice_esito_sdi TEXT,
  ADD COLUMN IF NOT EXISTS messaggio_esito_sdi TEXT,
  ADD COLUMN IF NOT EXISTS pec_message_id   TEXT,
  ADD COLUMN IF NOT EXISTS smtp_inviata_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pec_consegnata_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sdi_risposta_at  TIMESTAMPTZ;

-- ============================================================
-- G. dichiarazioni_conformita — snapshot immutabile + Allegato XIII
-- ============================================================
ALTER TABLE dichiarazioni_conformita
  ADD COLUMN IF NOT EXISTS uso_esclusivo_paziente TEXT NOT NULL
    DEFAULT 'Dispositivo fabbricato su misura esclusivamente per il paziente indicato',
  ADD COLUMN IF NOT EXISTS prescrizione_caratteristiche TEXT,
  ADD COLUMN IF NOT EXISTS contiene_sostanze_o_tessuti BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sostanze_tessuti_dettaglio TEXT,
  ADD COLUMN IF NOT EXISTS prescrizione_id TEXT,
  ADD COLUMN IF NOT EXISTS luogo_emissione TEXT NOT NULL DEFAULT 'Italia',
  ADD COLUMN IF NOT EXISTS prrc_qualifica TEXT,
  ADD COLUMN IF NOT EXISTS firma_ddc_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS firma_ddc_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS testo_conformita_snapshot TEXT NOT NULL DEFAULT
    'Il fabbricante dichiara che il presente dispositivo e'' conforme ai requisiti generali di sicurezza e prestazione di cui all''Allegato I e ai disposti dell''Allegato XIII del Reg. (UE) 2017/745.',
  ADD COLUMN IF NOT EXISTS paziente_cognome TEXT,
  ADD COLUMN IF NOT EXISTS storage_path_pdf TEXT,
  ADD COLUMN IF NOT EXISTS inviata_al_dentista BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inviata_al_dentista_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rischi_residui_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS pdf_generato_at TIMESTAMPTZ;

-- Unique constraint per idempotenza CONSEGNA (Codex fix #1)
ALTER TABLE dichiarazioni_conformita
  DROP CONSTRAINT IF EXISTS ddc_lavoro_unique;
ALTER TABLE dichiarazioni_conformita
  ADD CONSTRAINT ddc_lavoro_unique UNIQUE (laboratorio_id, lavoro_id);

-- ============================================================
-- H. fasi_produzione — campi aggiuntivi
-- ============================================================
ALTER TABLE fasi_produzione
  ADD COLUMN IF NOT EXISTS tempo_medio_lavoro      INTERVAL,
  ADD COLUMN IF NOT EXISTS misurazioni_da_rilevare BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS responsabile_id         UUID REFERENCES tecnici(id);

-- ============================================================
-- I. NUOVA TABELLA: lavori_appuntamenti
-- ============================================================
CREATE TABLE IF NOT EXISTS lavori_appuntamenti (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id     UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id          UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  data_appuntamento  DATE NOT NULL,
  ora_appuntamento   TIME,
  tipo               TEXT NOT NULL DEFAULT 'prova'
                     CHECK (tipo IN ('prova','consegna','ritiro','altro')),
  numero_prova       SMALLINT CHECK (numero_prova BETWEEN 1 AND 4),
  completato         BOOLEAN NOT NULL DEFAULT FALSE,
  esito              TEXT CHECK (esito IN ('ok','richiede_modifica','annullato')),
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ
);
SELECT apply_updated_at_trigger('lavori_appuntamenti');
ALTER TABLE lavori_appuntamenti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lav_app_lab" ON lavori_appuntamenti
  FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lav_app_insert" ON lavori_appuntamenti
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX IF NOT EXISTS idx_lav_app_lavoro
  ON lavori_appuntamenti(lavoro_id) WHERE deleted_at IS NULL;

-- ============================================================
-- J. NUOVA TABELLA: lavori_immagini
-- ============================================================
CREATE TABLE IF NOT EXISTS lavori_immagini (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id      UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  url            TEXT NOT NULL,
  nome_file      TEXT,
  descrizione    TEXT,
  data_scatto    DATE,
  tipo           TEXT NOT NULL DEFAULT 'foto'
                 CHECK (tipo IN ('foto','scan','rx','altro')),
  ordine         SMALLINT NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);
ALTER TABLE lavori_immagini ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lav_img_lab" ON lavori_immagini
  FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lav_img_insert" ON lavori_immagini
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX IF NOT EXISTS idx_lav_img_lavoro
  ON lavori_immagini(lavoro_id, ordine) WHERE deleted_at IS NULL;

-- ============================================================
-- K. NUOVA TABELLA: lavori_partitario
-- ============================================================
CREATE TABLE IF NOT EXISTS lavori_partitario (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id      UUID NOT NULL REFERENCES lavori(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  importo        DECIMAL(10,2) NOT NULL,
  modalita       TEXT NOT NULL DEFAULT 'contante'
                 CHECK (modalita IN ('contante','bonifico','assegno','pos','altro')),
  riferimento    TEXT,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);
ALTER TABLE lavori_partitario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lav_part_lab" ON lavori_partitario
  FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "lav_part_insert" ON lavori_partitario
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX IF NOT EXISTS idx_lav_part_lavoro
  ON lavori_partitario(lavoro_id) WHERE deleted_at IS NULL;

-- ============================================================
-- L. NUOVA TABELLA: dashboard_kpi_cache
-- ============================================================
CREATE TABLE IF NOT EXISTS dashboard_kpi_cache (
  laboratorio_id          UUID PRIMARY KEY REFERENCES laboratori(id),
  consegne_oggi           INTEGER NOT NULL DEFAULT 0,
  lavori_in_ritardo       INTEGER NOT NULL DEFAULT 0,
  pronti_non_fatturati    INTEGER NOT NULL DEFAULT 0,
  mdr_incompleti          INTEGER NOT NULL DEFAULT 0,
  spedizioni_in_ritardo   INTEGER NOT NULL DEFAULT 0,
  is_rifacimento_count    INTEGER NOT NULL DEFAULT 0,
  stl_non_assegnati       INTEGER NOT NULL DEFAULT 0,
  lavori_attivi           INTEGER NOT NULL DEFAULT 0,
  fatturato_mese          NUMERIC(12,2) NOT NULL DEFAULT 0,
  tecnico_saturo_id       UUID REFERENCES tecnici(id),
  tecnico_saturo_count    INTEGER NOT NULL DEFAULT 0,
  aggiornato_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE dashboard_kpi_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kpi_cache_select" ON dashboard_kpi_cache
  FOR SELECT USING (laboratorio_id = auth.current_lab_id());

-- Funzione refresh KPI cache
CREATE OR REPLACE FUNCTION refresh_dashboard_cache(p_lab_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dashboard_kpi_cache (
    laboratorio_id, consegne_oggi, lavori_in_ritardo,
    pronti_non_fatturati, mdr_incompleti, spedizioni_in_ritardo,
    is_rifacimento_count, stl_non_assegnati, lavori_attivi, aggiornato_at
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
        AND data_consegna_prevista < CURRENT_DATE - 2
    ),
    COUNT(*) FILTER (
      WHERE is_rifacimento = TRUE
        AND data_ingresso >= date_trunc('month', CURRENT_DATE)
    ),
    COUNT(*) FILTER (
      WHERE impronta_digitale = TRUE
        AND tecnico_id IS NULL
        AND stato = 'ricevuto'
    ),
    COUNT(*) FILTER (
      WHERE stato NOT IN ('consegnato','annullato','ricevuto')
    ),
    NOW()
  FROM lavori
  WHERE laboratorio_id = p_lab_id AND deleted_at IS NULL
  ON CONFLICT (laboratorio_id) DO UPDATE SET
    consegne_oggi         = EXCLUDED.consegne_oggi,
    lavori_in_ritardo     = EXCLUDED.lavori_in_ritardo,
    pronti_non_fatturati  = EXCLUDED.pronti_non_fatturati,
    mdr_incompleti        = EXCLUDED.mdr_incompleti,
    spedizioni_in_ritardo = EXCLUDED.spedizioni_in_ritardo,
    is_rifacimento_count  = EXCLUDED.is_rifacimento_count,
    stl_non_assegnati     = EXCLUDED.stl_non_assegnati,
    lavori_attivi         = EXCLUDED.lavori_attivi,
    aggiornato_at         = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION trg_refresh_dashboard()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  PERFORM refresh_dashboard_cache(
    COALESCE(NEW.laboratorio_id, OLD.laboratorio_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dashboard_lavori ON lavori;
CREATE TRIGGER trg_dashboard_lavori
  AFTER INSERT OR UPDATE OR DELETE ON lavori
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_dashboard();

-- ============================================================
-- M. NUOVA TABELLA: portale_accessi (GDPR audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS portale_accessi (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id),
  cliente_id     UUID NOT NULL REFERENCES clienti(id),
  ip_address     TEXT,
  user_agent     TEXT,
  azione         TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE portale_accessi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "portale_acc_select" ON portale_accessi
  FOR SELECT USING (laboratorio_id = auth.current_lab_id());

-- ============================================================
-- N. NUOVA TABELLA: incidenti_mdr (MDR Art. 87-88)
-- ============================================================
CREATE TABLE IF NOT EXISTS incidenti_mdr (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id      UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  lavoro_id           UUID REFERENCES lavori(id),
  tipo                TEXT NOT NULL DEFAULT 'anomalia'
                      CHECK (tipo IN ('anomalia','incidente','incidente_grave','azione_correttiva_sicurezza')),
  gravita             TEXT NOT NULL DEFAULT 'lieve'
                      CHECK (gravita IN ('lieve','moderata','grave','critica')),
  data_evento         DATE NOT NULL,
  descrizione         TEXT NOT NULL,
  causa_probabile     TEXT,
  azione_immediata    TEXT,
  azione_correttiva   TEXT,
  azione_preventiva   TEXT,
  risolto             BOOLEAN NOT NULL DEFAULT FALSE,
  data_risoluzione    DATE,
  segnalato_ministero BOOLEAN NOT NULL DEFAULT FALSE,
  data_segnalazione   DATE,
  numero_segnalazione TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);
SELECT apply_updated_at_trigger('incidenti_mdr');
ALTER TABLE incidenti_mdr ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incidenti_lab" ON incidenti_mdr
  FOR ALL USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL);
CREATE POLICY "incidenti_insert" ON incidenti_mdr
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());
CREATE INDEX IF NOT EXISTS idx_incidenti_lab
  ON incidenti_mdr(laboratorio_id, data_evento DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_incidenti_gravita
  ON incidenti_mdr(laboratorio_id, gravita)
  WHERE deleted_at IS NULL AND NOT risolto;

-- ============================================================
-- O. NUOVA TABELLA: rischi_tipo_dispositivo (analisi rischi MDR)
-- ============================================================
CREATE TABLE IF NOT EXISTS rischi_tipo_dispositivo (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id      UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  tipo_dispositivo    TEXT NOT NULL,
  rischi_json         JSONB NOT NULL DEFAULT '[]',
  rischi_residui      TEXT,
  misure_controllo    TEXT,
  responsabile_revisione TEXT,
  data_ultima_revisione DATE DEFAULT CURRENT_DATE,
  versione            SMALLINT NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (laboratorio_id, tipo_dispositivo)
);
SELECT apply_updated_at_trigger('rischi_tipo_dispositivo');
ALTER TABLE rischi_tipo_dispositivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rischi_lab" ON rischi_tipo_dispositivo
  FOR ALL USING (laboratorio_id = auth.current_lab_id());
CREATE POLICY "rischi_insert" ON rischi_tipo_dispositivo
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());

-- ============================================================
-- P. NUOVA TABELLA: nomine_prrc (nomina strutturata PRRC)
-- ============================================================
CREATE TABLE IF NOT EXISTS nomine_prrc (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id      UUID NOT NULL REFERENCES laboratori(id),
  prrc_nome           TEXT NOT NULL,
  prrc_cognome        TEXT NOT NULL,
  prrc_qualifica      TEXT,
  prrc_numero_albo    TEXT,
  data_nomina         DATE NOT NULL,
  firma_titolare_url  TEXT,
  firma_prrc_url      TEXT,
  prrc_ha_accettato   BOOLEAN NOT NULL DEFAULT FALSE,
  prrc_accettato_at   TIMESTAMPTZ,
  valida_dal          DATE NOT NULL,
  valida_al           DATE,
  revocata            BOOLEAN NOT NULL DEFAULT FALSE,
  revoca_data         DATE,
  pdf_url             TEXT,
  pdf_sha256          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at_trigger('nomine_prrc');
ALTER TABLE nomine_prrc ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nomine_prrc_lab" ON nomine_prrc
  FOR ALL USING (laboratorio_id = auth.current_lab_id());

-- ============================================================
-- Q. NUOVA TABELLA: psur (Periodic Safety Update Report)
-- ============================================================
CREATE TABLE IF NOT EXISTS psur (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id               UUID NOT NULL REFERENCES laboratori(id),
  anno_riferimento             SMALLINT NOT NULL,
  periodo_inizio               DATE NOT NULL,
  periodo_fine                 DATE NOT NULL,
  totale_dispositivi           INTEGER NOT NULL DEFAULT 0,
  totale_non_conformita        INTEGER NOT NULL DEFAULT 0,
  totale_incidenti             INTEGER NOT NULL DEFAULT 0,
  totale_reclami               INTEGER NOT NULL DEFAULT 0,
  totale_rifacimenti           INTEGER NOT NULL DEFAULT 0,
  valutazione_benefici_rischi  TEXT,
  conclusioni                  TEXT,
  misure_correttive            TEXT,
  pdf_url                      TEXT,
  pdf_sha256                   TEXT,
  firmato_at                   TIMESTAMPTZ,
  prrc_nome_snapshot           TEXT,
  stato                        TEXT NOT NULL DEFAULT 'bozza'
                               CHECK (stato IN ('bozza','completato','firmato')),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (laboratorio_id, anno_riferimento)
);
SELECT apply_updated_at_trigger('psur');
ALTER TABLE psur ENABLE ROW LEVEL SECURITY;
CREATE POLICY "psur_lab" ON psur
  FOR ALL USING (laboratorio_id = auth.current_lab_id());
CREATE POLICY "psur_insert" ON psur
  FOR INSERT WITH CHECK (laboratorio_id = auth.current_lab_id());

-- ============================================================
-- R. NUOVE TABELLE: reti + reti_membri (multi-sede €129)
-- ============================================================
CREATE TABLE IF NOT EXISTS reti (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  TEXT NOT NULL,
  admin_laboratorio_id  UUID NOT NULL REFERENCES laboratori(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT apply_updated_at_trigger('reti');
ALTER TABLE reti ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reti_admin_select" ON reti
  FOR SELECT USING (admin_laboratorio_id = auth.current_lab_id());

CREATE TABLE IF NOT EXISTS reti_membri (
  rete_id        UUID NOT NULL REFERENCES reti(id) ON DELETE CASCADE,
  laboratorio_id UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  ruolo          TEXT NOT NULL DEFAULT 'membro'
                 CHECK (ruolo IN ('admin_rete','membro')),
  joined_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rete_id, laboratorio_id)
);
ALTER TABLE reti_membri ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reti_membri_select" ON reti_membri
  FOR SELECT USING (laboratorio_id = auth.current_lab_id());
CREATE POLICY "reti_membri_admin" ON reti_membri
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM reti
      WHERE id = rete_id
        AND admin_laboratorio_id = auth.current_lab_id()
    )
  );

-- ============================================================
-- S. SECURITY FIXES (Codex adversarial review)
-- ============================================================

-- Fix #7: RLS lavori con deleted_at
DROP POLICY IF EXISTS "lavori_laboratorio_select" ON lavori;
CREATE POLICY "lavori_laboratorio_select" ON lavori
  FOR SELECT USING (
    laboratorio_id = auth.current_lab_id()
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS "lavori_laboratorio_update" ON lavori;
CREATE POLICY "lavori_laboratorio_update" ON lavori
  FOR UPDATE
  USING (laboratorio_id = auth.current_lab_id() AND deleted_at IS NULL)
  WITH CHECK (laboratorio_id = auth.current_lab_id());

-- Fix #8: Rimuovi DELETE diretto — soft delete solo via RPC
DROP POLICY IF EXISTS "lavori_laboratorio_delete" ON lavori;

CREATE OR REPLACE FUNCTION soft_delete_lavoro(p_lavoro_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT auth.has_role('titolare') THEN
    RAISE EXCEPTION 'Solo il titolare puo eliminare lavori';
  END IF;
  UPDATE lavori
  SET deleted_at = NOW()
  WHERE id = p_lavoro_id
    AND laboratorio_id = auth.current_lab_id();
END;
$$;

-- Fix #9: stripe_events RLS
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stripe_events_deny" ON stripe_events;
CREATE POLICY "stripe_events_deny" ON stripe_events
  FOR ALL USING (FALSE);

-- Fix #15: cross-tenant triggers per tutte le tabelle con lavoro_id
CREATE OR REPLACE FUNCTION assert_same_lab_lavoro()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lavori
    WHERE id = NEW.lavoro_id
      AND laboratorio_id = NEW.laboratorio_id
  ) THEN
    RAISE EXCEPTION 'Cross-tenant violation: lavoro_id non appartiene al laboratorio';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ddc_same_lab ON dichiarazioni_conformita;
CREATE TRIGGER trg_ddc_same_lab
  BEFORE INSERT ON dichiarazioni_conformita
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

DROP TRIGGER IF EXISTS trg_lav_lav_same_lab ON lavori_lavorazioni;
CREATE TRIGGER trg_lav_lav_same_lab
  BEFORE INSERT ON lavori_lavorazioni
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

DROP TRIGGER IF EXISTS trg_lav_fasi_same_lab ON lavori_fasi;
CREATE TRIGGER trg_lav_fasi_same_lab
  BEFORE INSERT ON lavori_fasi
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

DROP TRIGGER IF EXISTS trg_lav_mat_same_lab ON lavori_materiali;
CREATE TRIGGER trg_lav_mat_same_lab
  BEFORE INSERT ON lavori_materiali
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

DROP TRIGGER IF EXISTS trg_lav_app_same_lab ON lavori_appuntamenti;
CREATE TRIGGER trg_lav_app_same_lab
  BEFORE INSERT ON lavori_appuntamenti
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

DROP TRIGGER IF EXISTS trg_lav_img_same_lab ON lavori_immagini;
CREATE TRIGGER trg_lav_img_same_lab
  BEFORE INSERT ON lavori_immagini
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

DROP TRIGGER IF EXISTS trg_lav_part_same_lab ON lavori_partitario;
CREATE TRIGGER trg_lav_part_same_lab
  BEFORE INSERT ON lavori_partitario
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro();

-- Incidenti MDR (lavoro_id opzionale — trigger solo se non NULL)
CREATE OR REPLACE FUNCTION assert_same_lab_lavoro_optional()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.lavoro_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM lavori
      WHERE id = NEW.lavoro_id
        AND laboratorio_id = NEW.laboratorio_id
    ) THEN
      RAISE EXCEPTION 'Cross-tenant violation: lavoro_id non appartiene al laboratorio';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inc_same_lab ON incidenti_mdr;
CREATE TRIGGER trg_inc_same_lab
  BEFORE INSERT ON incidenti_mdr
  FOR EACH ROW EXECUTE FUNCTION assert_same_lab_lavoro_optional();

-- RPC idempotenza CONSEGNA
CREATE OR REPLACE FUNCTION consegna_lavoro_lock(p_lavoro_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lab_id UUID := auth.current_lab_id();
  v_locked BOOLEAN;
  v_stato  TEXT;
BEGIN
  SELECT consegna_in_corso, stato
  INTO   v_locked, v_stato
  FROM   lavori
  WHERE  id = p_lavoro_id
    AND  laboratorio_id = v_lab_id
  FOR UPDATE NOWAIT;

  IF v_stato = 'consegnato' THEN
    RETURN json_build_object('gia_consegnato', true);
  END IF;
  IF v_locked THEN
    RETURN json_build_object('gia_in_corso', true);
  END IF;

  UPDATE lavori
  SET    consegna_in_corso = TRUE,
         consegna_tap_at   = NOW()
  WHERE  id = p_lavoro_id;

  RETURN json_build_object('lock_acquisito', true);
END;
$$;

-- RPC get_pec_password (legge da Supabase Vault)
CREATE OR REPLACE FUNCTION get_pec_password(p_lab_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key_id  TEXT;
  v_password TEXT;
BEGIN
  IF auth.current_lab_id() != p_lab_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT pec_vault_key_id INTO v_key_id
  FROM laboratori WHERE id = p_lab_id;
  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'PEC non configurata per questo laboratorio';
  END IF;
  SELECT decrypted_secret INTO v_password
  FROM vault.decrypted_secrets
  WHERE id = v_key_id::UUID;
  RETURN v_password;
END;
$$;

COMMIT;
