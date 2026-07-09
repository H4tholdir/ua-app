-- Lookup tables globali: campionari colore, tipi lega, tipi pagamento, tipi impronte, ecc.
-- Usati da form/dropdown in tutta l'app. Non tenant-specific.
CREATE TABLE IF NOT EXISTS lookup_valori (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo        TEXT NOT NULL,     -- Es. 'campionario_colore', 'tipo_lega', 'tipo_pagamento'
  codice      TEXT NOT NULL,     -- Es. 'VITA', 'ORO_GIALLA', 'BONIFICO'
  valore_it   TEXT NOT NULL,     -- Label italiana visualizzata in UI
  ordine      SMALLINT NOT NULL DEFAULT 0,
  note        TEXT,
  attivo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tipo, codice)
);

-- Lookup è dati di sistema globali — accessibili in lettura a tutti gli utenti autenticati
ALTER TABLE lookup_valori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lookup_read_all" ON lookup_valori
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "lookup_service_write" ON lookup_valori
  FOR ALL USING (auth.role() = 'service_role');
