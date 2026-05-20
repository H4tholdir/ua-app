-- Migration: BOM materiali + Auto-scarico + Ordini fornitori
-- Sprint S7.2 + S7.3
-- Data: 2026-05-20

-- ───────────────────────────────────────────────────────────────
-- 1. richiedente_email su lavori (S7.2 prerequisito)
-- ───────────────────────────────────────────────────────────────
ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS richiedente_email TEXT;

-- ───────────────────────────────────────────────────────────────
-- 2. listino_materiali_auto — BOM: lavorazione → materiali
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listino_materiali_auto (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id     UUID NOT NULL REFERENCES laboratori(id),
  listino_id         UUID NOT NULL REFERENCES listino(id),
  magazzino_id       UUID NOT NULL REFERENCES magazzino(id),
  quantita_per_unita DECIMAL(10,4) NOT NULL DEFAULT 1,
  unita_misura       TEXT NOT NULL DEFAULT 'pz',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listino_id, magazzino_id)
);

ALTER TABLE listino_materiali_auto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bom_lab" ON listino_materiali_auto
  FOR ALL USING (laboratorio_id = public.current_lab_id());

CREATE POLICY "bom_insert" ON listino_materiali_auto
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

-- ───────────────────────────────────────────────────────────────
-- 3. scarichi_magazzino — Tracciabilità MDR Allegato XIII
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scarichi_magazzino (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id   UUID NOT NULL REFERENCES laboratori(id),
  lavoro_id        UUID NOT NULL REFERENCES lavori(id),
  magazzino_id     UUID NOT NULL REFERENCES magazzino(id),
  listino_id       UUID REFERENCES listino(id),
  quantita         DECIMAL(10,4) NOT NULL,
  unita_misura     TEXT NOT NULL DEFAULT 'pz',
  lotto_numero     TEXT,                        -- obbligatorio MDR Allegato XIII
  timestamp_scarico TIMESTAMPTZ NOT NULL DEFAULT now(),
  operatore_id     UUID REFERENCES utenti(id),
  note             TEXT
);

ALTER TABLE scarichi_magazzino ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scarichi_lab" ON scarichi_magazzino
  FOR ALL USING (laboratorio_id = public.current_lab_id());

CREATE POLICY "scarichi_insert" ON scarichi_magazzino
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());

CREATE INDEX IF NOT EXISTS idx_scarichi_lavoro    ON scarichi_magazzino(lavoro_id);
CREATE INDEX IF NOT EXISTS idx_scarichi_magazzino ON scarichi_magazzino(magazzino_id);

-- ───────────────────────────────────────────────────────────────
-- 4. ordini_fornitori (S7.3)
-- ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ordini_fornitori (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id   UUID NOT NULL REFERENCES laboratori(id),
  fornitore_id     UUID REFERENCES fornitori(id),
  magazzino_id     UUID REFERENCES magazzino(id),
  numero_ordine    TEXT NOT NULL,           -- progressivo: ORD/YYYY/NNN
  stato            TEXT NOT NULL DEFAULT 'bozza'
                   CHECK (stato IN ('bozza','inviato','evaso_parziale','evaso','annullato','archiviato')),
  quantita_ordinata  DECIMAL(10,4),
  unita_misura       TEXT DEFAULT 'pz',
  quantita_ricevuta  DECIMAL(10,4) DEFAULT 0,
  data_ordine        DATE,
  data_consegna_richiesta DATE,
  data_consegna_effettiva DATE,
  note               TEXT,
  whatsapp_inviato   BOOLEAN NOT NULL DEFAULT FALSE,
  email_inviato      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at         TIMESTAMPTZ,
  UNIQUE (laboratorio_id, numero_ordine)
);

ALTER TABLE ordini_fornitori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ordini_lab" ON ordini_fornitori
  FOR ALL USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);

CREATE POLICY "ordini_insert" ON ordini_fornitori
  FOR INSERT WITH CHECK (laboratorio_id = public.current_lab_id());
