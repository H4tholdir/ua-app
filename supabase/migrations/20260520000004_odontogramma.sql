ALTER TABLE lavori
  ADD COLUMN IF NOT EXISTS denti_mancanti  INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS denti_impianti  INTEGER[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tipo_arco       TEXT CHECK (tipo_arco IN ('superiore','inferiore','entrambi'));
