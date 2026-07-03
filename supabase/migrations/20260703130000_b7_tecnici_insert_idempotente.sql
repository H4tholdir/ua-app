-- supabase/migrations/20260703130000_b7_tecnici_insert_idempotente.sql
-- UÀ Migration — B7 fix: rende idempotente l'INSERT INTO tecnici dentro
-- accept_invite_atomic(). Senza questa guardia, un tecnico re-invitato (es.
-- ri-ingaggiato dopo una pausa collaborativa) e che accetta di nuovo un
-- secondo invito genera una riga duplicata in tecnici — non esiste un
-- vincolo UNIQUE su (laboratorio_id, utente_id) in questa tabella, quindi
-- il secondo INSERT non falliva: creava silenziosamente una seconda riga,
-- facendo comparire la stessa persona due volte in /tecnici e in ogni
-- selettore di assegnazione lavori. Fix: WHERE NOT EXISTS invece di un
-- INSERT incondizionato — nessuna modifica di schema/vincoli necessaria.

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

  -- B7: se il ruolo è 'tecnico', crea il profilo tecnici — ma solo se non ne
  -- esiste già uno attivo per questo utente in questo lab (idempotente: un
  -- re-invito accettato di nuovo non deve duplicare la riga).
  IF v_invite.ruolo = 'tecnico' THEN
    INSERT INTO tecnici (laboratorio_id, utente_id, nome, cognome)
    SELECT v_invite.laboratorio_id, p_user_id, p_nome, p_cognome
    WHERE NOT EXISTS (
      SELECT 1 FROM tecnici
      WHERE laboratorio_id = v_invite.laboratorio_id
        AND utente_id = p_user_id
        AND deleted_at IS NULL
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'laboratorio_id', v_invite.laboratorio_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invite_atomic(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION accept_invite_atomic(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;
