-- supabase/migrations/20260703170000_b8_rete_id_accept_rpc.sql
-- UÀ Migration — B8 (5/5): RPC di accettazione invito rete.
-- Claim atomico anti-race (stesso pattern di accept_invite_atomic, B7),
-- verifica email case-insensitive e che il lab accettante non sia già
-- admin o membro di un'altra rete prima di inserire in reti_membri.

CREATE OR REPLACE FUNCTION accept_invito_rete_atomic(
  p_token_hash TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invito RECORD;
  v_lab_id UUID;
  v_lab_email TEXT;
  v_gia_in_rete BOOLEAN;
BEGIN
  UPDATE inviti_rete
  SET accepted_at = NOW()
  WHERE token_hash = p_token_hash
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > NOW()
  RETURNING id, rete_id, email
  INTO v_invito;

  IF v_invito IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invito non valido, già usato o scaduto');
  END IF;

  SELECT laboratorio_id, email INTO v_lab_id, v_lab_email
  FROM utenti WHERE id = p_user_id;

  IF v_lab_id IS NULL THEN
    UPDATE inviti_rete SET accepted_at = NULL WHERE id = v_invito.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Utente non associato a un laboratorio');
  END IF;

  IF v_lab_email IS NULL OR lower(trim(v_lab_email)) <> lower(trim(v_invito.email)) THEN
    UPDATE inviti_rete SET accepted_at = NULL WHERE id = v_invito.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Email non corrisponde');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM reti WHERE admin_laboratorio_id = v_lab_id
    UNION
    SELECT 1 FROM reti_membri WHERE laboratorio_id = v_lab_id
  ) INTO v_gia_in_rete;

  IF v_gia_in_rete THEN
    UPDATE inviti_rete SET accepted_at = NULL WHERE id = v_invito.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Il laboratorio è già in un''altra rete');
  END IF;

  INSERT INTO reti_membri (rete_id, laboratorio_id, ruolo)
  VALUES (v_invito.rete_id, v_lab_id, 'membro');

  RETURN jsonb_build_object('ok', true, 'rete_id', v_invito.rete_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invito_rete_atomic(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invito_rete_atomic(TEXT, UUID) TO service_role;
