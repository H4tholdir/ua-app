-- supabase/migrations/20260703120000_b7_accept_invite_tecnico.sql
-- UÀ Migration — B7: crea automaticamente il profilo tecnici all'accettazione
-- di un invito con ruolo 'tecnico'. Senza questo fix, un tecnico invitato e
-- accettato non compare mai in /tecnici né è assegnabile ai lavori (tecnici
-- è un profilo separato da utenti — ANALISI/23_ua_database_schema.md §2.3).

CREATE OR REPLACE FUNCTION accept_invite_atomic(
  p_token_hash TEXT,
  p_user_id UUID,
  p_user_email TEXT,
  p_nome TEXT,
  p_cognome TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite RECORD;
  v_lab_stato TEXT;
BEGIN
  UPDATE inviti
  SET accepted_at = NOW()
  WHERE token_hash = p_token_hash
    AND accepted_at IS NULL
    AND expires_at > NOW()
  RETURNING id, email, ruolo, laboratorio_id, expires_at
  INTO v_invite;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invito non valido, già usato o scaduto');
  END IF;

  IF lower(trim(p_user_email)) <> lower(trim(v_invite.email)) THEN
    UPDATE inviti SET accepted_at = NULL WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Email non corrisponde');
  END IF;

  SELECT stato INTO v_lab_stato FROM laboratori WHERE id = v_invite.laboratorio_id;
  IF v_lab_stato NOT IN ('trial', 'attivo') THEN
    UPDATE inviti SET accepted_at = NULL WHERE id = v_invite.id;
    RETURN jsonb_build_object('ok', false, 'error', 'Il laboratorio non è più accessibile');
  END IF;

  INSERT INTO utenti (id, laboratorio_id, nome, cognome, email, ruolo)
  VALUES (p_user_id, v_invite.laboratorio_id, p_nome, p_cognome, v_invite.email, v_invite.ruolo)
  ON CONFLICT (id) DO UPDATE SET
    laboratorio_id = EXCLUDED.laboratorio_id,
    nome = EXCLUDED.nome,
    cognome = EXCLUDED.cognome,
    ruolo = EXCLUDED.ruolo;

  INSERT INTO lab_memberships (user_id, laboratorio_id, ruolo)
  VALUES (p_user_id, v_invite.laboratorio_id, v_invite.ruolo)
  ON CONFLICT (user_id, laboratorio_id) DO UPDATE SET ruolo = EXCLUDED.ruolo;

  -- B7: se il ruolo è 'tecnico', crea anche il profilo tecnici — altrimenti
  -- il tecnico invitato non comparirebbe mai in /tecnici né sarebbe
  -- assegnabile ai lavori. Nessun profilo per front_desk/titolare.
  IF v_invite.ruolo = 'tecnico' THEN
    INSERT INTO tecnici (laboratorio_id, utente_id, nome, cognome)
    VALUES (v_invite.laboratorio_id, p_user_id, p_nome, p_cognome);
  END IF;

  RETURN jsonb_build_object('ok', true, 'laboratorio_id', v_invite.laboratorio_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invite_atomic(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invite_atomic(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;
