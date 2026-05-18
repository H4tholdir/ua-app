-- Funzioni per gestire la password PEC nel Vault di Supabase
-- SECURITY: REVOKE EXECUTE prima della creazione per evitare accesso pubblico
REVOKE EXECUTE ON FUNCTION IF EXISTS upsert_pec_vault_secret(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION IF EXISTS get_pec_vault_secret(UUID) FROM PUBLIC, anon, authenticated;

-- Funzione per salvare/aggiornare password PEC nel Vault
CREATE OR REPLACE FUNCTION upsert_pec_vault_secret(
  p_lab_id   UUID,
  p_password TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_existing_key_id UUID;
  v_new_key_id      UUID;
BEGIN
  -- SELECT FOR UPDATE previene race condition su richieste parallele
  SELECT pec_vault_key_id INTO v_existing_key_id
  FROM laboratori WHERE id = p_lab_id FOR UPDATE;

  IF v_existing_key_id IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing_key_id, p_password);
  ELSE
    v_new_key_id := vault.create_secret(
      p_password,
      'pec_password_' || p_lab_id::text,
      'PEC SMTP password for lab ' || p_lab_id::text
    );
    UPDATE laboratori SET pec_vault_key_id = v_new_key_id WHERE id = p_lab_id;
  END IF;
END;
$$;

-- Funzione per leggere la password PEC dal Vault (solo server-side)
CREATE OR REPLACE FUNCTION get_pec_vault_secret(p_lab_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_key_id UUID;
  v_secret TEXT;
BEGIN
  SELECT pec_vault_key_id INTO v_key_id FROM laboratori WHERE id = p_lab_id;
  IF v_key_id IS NULL THEN RETURN NULL; END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_key_id;
  RETURN v_secret;
END;
$$;

-- Revoca accesso dopo la creazione (SECURITY DEFINER non eredita i permessi del chiamante)
REVOKE EXECUTE ON FUNCTION upsert_pec_vault_secret(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION get_pec_vault_secret(UUID) FROM PUBLIC, anon, authenticated;

-- Concedi accesso solo al service_role (usato da API server-side)
GRANT EXECUTE ON FUNCTION upsert_pec_vault_secret(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION get_pec_vault_secret(UUID) TO service_role;
