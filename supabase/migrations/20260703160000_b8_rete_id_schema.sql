-- supabase/migrations/20260703160000_b8_rete_id_schema.sql
-- UÀ Migration — B8 (5/5): schema per /rete/[id]
-- Introduce la tabella dedicata `inviti_rete` (un lab invita un altro lab a
-- una rete — diverso semanticamente dall'invito persona-in-lab di `inviti`,
-- usato da B7). Aggiunge anche una colonna di tracciabilità a `reti_membri`
-- per distinguere un membro entrato per invito accettato da uno aggiunto
-- forzatamente dal pannello /admin (Francesco).

CREATE TABLE IF NOT EXISTS inviti_rete (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rete_id         UUID NOT NULL REFERENCES reti(id) ON DELETE CASCADE,
  email           TEXT NOT NULL,
  token_hash      TEXT NOT NULL UNIQUE,
  invitato_da     UUID NOT NULL REFERENCES utenti(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at     TIMESTAMPTZ,
  revoked_at      TIMESTAMPTZ
);

-- Stesso pattern di `inviti` (001_commercial_infra.sql): RLS abilitata,
-- nessuna policy pubblica — solo service role legge/scrive questa tabella,
-- mai raggiunta da un client anon/browser diretto.
ALTER TABLE inviti_rete ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_inviti_rete_token_hash ON inviti_rete(token_hash);
CREATE INDEX IF NOT EXISTS idx_inviti_rete_rete_email ON inviti_rete(rete_id, lower(email));

ALTER TABLE reti_membri ADD COLUMN IF NOT EXISTS aggiunto_da_admin UUID REFERENCES utenti(id);
