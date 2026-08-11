-- ═══ PERCHÉ QUESTA MIGRATION ═════════════════════════════════════════════════
-- Dalla revisione finale del ramo code-58-59 (11/08/2026), l'unico Important:
-- `accept_invite_atomic` sposta un utente di laboratorio con
-- `ON CONFLICT (id) DO UPDATE SET laboratorio_id = EXCLUDED.laboratorio_id`,
-- e la FK composita della riga 59 (`avvisi_dentista_comunicato_da_fk`,
-- migration 20260811133440) BLOCCA quell'UPDATE quando l'utente ha firmato
-- avvisi chiusi nel laboratorio attuale. `provato:` sonda dal vivo, annullata:
-- `BLOCCATO 23503: update or delete on table "utenti" violates foreign key
-- constraint "avvisi_dentista_comunicato_da_fk"`. E il blocco non si scioglie
-- mai: gli avvisi chiusi sono congelati per costruzione (riga 58, trigger
-- one-way) — un solo avviso firmato rendeva l'invito verso un altro lab un
-- errore NON GESTITO, per sempre.
--
-- 🔑 IL BLOCCO È GIUSTO E RESTA. La firma è una prova (GDPR Art. 5(2)):
-- rispuntare il laboratorio del firmatario ricreerebbe esattamente la firma
-- cross-tenant che la riga 59 vieta. Questa migration cambia SOLO la
-- leggibilità del fallimento: niente eccezione opaca — l'invito torna
-- disponibile (accepted_at = NULL, come già fanno i rami email/lab della
-- stessa funzione) e la RPC risponde col suo jsonb `{ok:false, error:…}`.
--
-- 📌 Il flusso di prodotto per trasferire DAVVERO un collaboratore che ha
-- firmato (nuova identità utenti + soft-delete? divieto dichiarato?) è la
-- RIGA 62 della coda: panel + decisione di Francesco, non una riga di fix.
--
-- ⚠️ Il re-accept nello STESSO laboratorio resta possibile: Postgres non
-- ricontrolla la FK referenziata se la coppia (id, laboratorio_id) non cambia.
-- Il corpo qui sotto è identico a 20260703130000 (B7) salvo il blocco
-- BEGIN/EXCEPTION attorno all'upsert su utenti e la variabile v_vincolo.

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
  v_vincolo TEXT;
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

  BEGIN
    INSERT INTO utenti (id, laboratorio_id, nome, cognome, email, ruolo)
    VALUES (p_user_id, v_invite.laboratorio_id, p_nome, p_cognome, v_invite.email, v_invite.ruolo)
    ON CONFLICT (id) DO UPDATE SET
      laboratorio_id = EXCLUDED.laboratorio_id,
      nome = EXCLUDED.nome,
      cognome = EXCLUDED.cognome,
      ruolo = EXCLUDED.ruolo;
  EXCEPTION
    WHEN foreign_key_violation THEN
      GET STACKED DIAGNOSTICS v_vincolo = CONSTRAINT_NAME;
      IF v_vincolo = 'avvisi_dentista_comunicato_da_fk' THEN
        UPDATE inviti SET accepted_at = NULL WHERE id = v_invite.id;
        RETURN jsonb_build_object('ok', false, 'error',
          'Questo account ha firmato comunicazioni ai dentisti nel suo laboratorio attuale: la firma è una prova e non si trasferisce. Il passaggio a un altro laboratorio va gestito a parte (riga 62 della coda).');
      END IF;
      RAISE;
  END;

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

COMMENT ON FUNCTION accept_invite_atomic(TEXT, UUID, TEXT, TEXT, TEXT) IS
  'Accettazione invito atomica. Dal 11/08/2026: se l''utente ha firmato avvisi '
  'chiusi nel lab attuale, il cambio di laboratorio fallisce PULITO '
  '({ok:false}, invito ri-disponibile) — la FK composita '
  'avvisi_dentista_comunicato_da_fk lo vieta per costruzione (riga 59); il '
  'flusso di trasferimento vero è la riga 62 della coda.';
