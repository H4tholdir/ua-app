-- Web Push subscriptions per utente/laboratorio
-- Task B7: notifiche push PWA

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  laboratorio_id   UUID        NOT NULL REFERENCES public.laboratori(id) ON DELETE CASCADE,
  subscription     JSONB       NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, laboratorio_id)
);

-- Indice per fan-out: recupero tutte le subscription di un lab (es. notifica a tutti i front-desk)
CREATE INDEX IF NOT EXISTS push_subscriptions_lab_idx
  ON push_subscriptions (laboratorio_id, user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Gli utenti gestiscono solo le proprie subscription
CREATE POLICY "Users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (user_id = auth.uid());

-- Trigger updated_at automatico
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
