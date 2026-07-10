-- supabase/migrations/20260710091000_fatture_outbox.sql
-- Spec 4a §4 M4+M5 — coda emissione differita + osservabilità (E3, D4).

CREATE TABLE public.fatture_outbox (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES public.laboratori(id),
  lavoro_id      uuid NOT NULL REFERENCES public.lavori(id),
  stato          text NOT NULL DEFAULT 'in_attesa'
                 CHECK (stato IN ('in_attesa','in_lavorazione','emessa','annullata','saltata','errore')),
  emetti_dopo    timestamptz NOT NULL,
  tentativi      int  NOT NULL DEFAULT 0,
  ultimo_errore  text,
  motivo_salto   text,
  fattura_id     uuid NULL REFERENCES public.fatture(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Una sola emissione pendente per lavoro
CREATE UNIQUE INDEX outbox_lavoro_attiva
  ON public.fatture_outbox (lavoro_id)
  WHERE stato IN ('in_attesa','in_lavorazione');
-- Scan del cron
CREATE INDEX outbox_scan ON public.fatture_outbox (emetti_dopo) WHERE stato = 'in_attesa';
-- Watchdog
CREATE INDEX outbox_watchdog ON public.fatture_outbox (updated_at) WHERE stato = 'in_lavorazione';

-- Deny-all: accesso esclusivo via service_role (nessuna policy = nessun accesso anon/authenticated)
ALTER TABLE public.fatture_outbox ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.outbox_heartbeat (
  id                  smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_tick_at        timestamptz,
  entries_processate  int NOT NULL DEFAULT 0,
  errori_tick         int NOT NULL DEFAULT 0
);
INSERT INTO public.outbox_heartbeat (id) VALUES (1);
ALTER TABLE public.outbox_heartbeat ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.outbox_alerts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo       text NOT NULL CHECK (tipo IN ('coda_ferma','entry_stantia','entry_errore','lavoro_senza_fattura')),
  dettaglio  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  risolto_at timestamptz NULL
);
CREATE INDEX outbox_alerts_aperti ON public.outbox_alerts (tipo) WHERE risolto_at IS NULL;
ALTER TABLE public.outbox_alerts ENABLE ROW LEVEL SECURITY;
