-- ============================================================
-- UÀ Migration 001: Commercial Infrastructure
-- ============================================================

-- 1. Aggiungi ruolo admin_sistema a utenti
ALTER TABLE utenti DROP CONSTRAINT IF EXISTS utenti_ruolo_check;
ALTER TABLE utenti ADD CONSTRAINT utenti_ruolo_check
  CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete','admin_sistema'));

-- 2. Aggiungi colonne Stripe + lifecycle a laboratori
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS stato                   TEXT DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS stripe_price_id         TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS suspended_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_at              TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS export_until            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stripe_event_id    TEXT,
  ADD COLUMN IF NOT EXISTS last_stripe_event_at    TIMESTAMPTZ;

-- stripe_customer_id e stripe_subscription_id già esistono — aggiungi solo se mancano
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT;
ALTER TABLE laboratori
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Aggiungi UNIQUE su stripe_customer_id e stripe_subscription_id se non già presenti
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'laboratori'::regclass
      AND conname = 'laboratori_stripe_customer_id_key'
  ) THEN
    ALTER TABLE laboratori ADD CONSTRAINT laboratori_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'laboratori'::regclass
      AND conname = 'laboratori_stripe_subscription_id_key'
  ) THEN
    ALTER TABLE laboratori ADD CONSTRAINT laboratori_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
  END IF;
END;
$$;

-- Aggiorna stato default per nuovi lab
ALTER TABLE laboratori ALTER COLUMN stato SET DEFAULT 'trial';

-- 3. Membership table per Rete plan e admin_rete
CREATE TABLE IF NOT EXISTS lab_memberships (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  ruolo           TEXT NOT NULL CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, laboratorio_id)
);

ALTER TABLE lab_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_memberships" ON lab_memberships
  FOR SELECT USING (user_id = auth.uid());

-- 4. Invite tokens
CREATE TABLE IF NOT EXISTS inviti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash      TEXT NOT NULL UNIQUE,
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  ruolo           TEXT NOT NULL CHECK (ruolo IN ('titolare','tecnico','front_desk','admin_rete')),
  created_by      UUID REFERENCES auth.users(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE inviti ENABLE ROW LEVEL SECURITY;
-- Nessuna policy pubblica su inviti — solo service role può leggere/scrivere

-- 5. Audit log transizioni stato
CREATE TABLE IF NOT EXISTS lab_stato_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id  UUID NOT NULL REFERENCES laboratori(id) ON DELETE CASCADE,
  stato_from      TEXT,
  stato_to        TEXT NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('stripe_webhook','admin','system')),
  actor           TEXT,
  stripe_event_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE lab_stato_log ENABLE ROW LEVEL SECURITY;
-- Nessuna policy pubblica — solo service role

-- 6. Idempotency table per eventi Stripe
CREATE TABLE IF NOT EXISTS stripe_events (
  id              TEXT PRIMARY KEY,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Nessuna policy — solo service role

-- 7. Indici
CREATE INDEX IF NOT EXISTS idx_laboratori_stripe_customer ON laboratori(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_laboratori_stripe_sub ON laboratori(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_laboratori_stato ON laboratori(stato);
CREATE INDEX IF NOT EXISTS idx_inviti_token_hash ON inviti(token_hash);
CREATE INDEX IF NOT EXISTS idx_inviti_email ON inviti(lower(email));
CREATE INDEX IF NOT EXISTS idx_lab_memberships_user ON lab_memberships(user_id);

-- 8. Funzione helper: verifica se lab è accessibile (attivo o trial valido)
CREATE OR REPLACE FUNCTION public.lab_is_accessible()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.laboratori
    WHERE id = public.current_lab_id()
      AND stato IN ('attivo', 'trial')
      AND (stato != 'trial' OR trial_ends_at IS NULL OR trial_ends_at > now())
  );
END;
$$;

-- 9. Aggiorna RLS su lavori con pattern corretto (tenant + stato)
-- Rimuovi policy esistenti (sia nomi vecchi che nomi nuovi)
DROP POLICY IF EXISTS "tenant_read" ON lavori;
DROP POLICY IF EXISTS "tenant_write" ON lavori;
DROP POLICY IF EXISTS "tenant_update" ON lavori;
DROP POLICY IF EXISTS "tenant_delete" ON lavori;
DROP POLICY IF EXISTS "lavori_laboratorio_select" ON lavori;
DROP POLICY IF EXISTS "lavori_laboratorio_insert" ON lavori;
DROP POLICY IF EXISTS "lavori_laboratorio_update" ON lavori;
DROP POLICY IF EXISTS "lavori_laboratorio_delete" ON lavori;

ALTER TABLE lavori ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read" ON lavori
  FOR SELECT USING (
    laboratorio_id = public.current_lab_id()
    AND public.lab_is_accessible()
  );

CREATE POLICY "tenant_write" ON lavori
  FOR INSERT WITH CHECK (
    laboratorio_id = public.current_lab_id()
    AND public.lab_is_accessible()
  );

CREATE POLICY "tenant_update" ON lavori
  FOR UPDATE USING (laboratorio_id = public.current_lab_id() AND public.lab_is_accessible())
  WITH CHECK (laboratorio_id = public.current_lab_id() AND public.lab_is_accessible());

CREATE POLICY "tenant_delete" ON lavori
  FOR DELETE USING (
    laboratorio_id = public.current_lab_id()
    AND public.lab_is_accessible()
  );
