-- supabase/migrations/20260807174850_correzione_prima_immissione_finalizza_atomica.sql
-- Correzione del rilievo CRITICO della revisione sul Task 2 dell'ondata
-- «si deve sempre poter intervenire» (20260807172520_lavori_prima_immissione.sql,
-- già applicata). Non si tocca la migration precedente: il registro delle
-- migration si disallinea.
--
-- 🔴 CRITICO — una seconda funzione che segna consegne non scrive la colonna
-- nuova. public.consegna_finalizza_atomica(uuid,uuid), definita in
-- 20260710150000_ondata0_pulizia_outbox.sql:28-51, fa
--   UPDATE lavori SET stato='consegnato', ..., data_consegna_effettiva = now(), ...
-- e non tocca prima_immissione_at. Oggi è dormiente (nessuna chiamata
-- .rpc('consegna_finalizza_atomica'…) in src/), ma
-- 20260721090000_parete_cassette.sql:152-155 la descrive già come possibile
-- percorso di consegna futuro — una funzione che segna una consegna senza
-- scrivere la data della prima immissione lascerebbe il buco aperto proprio
-- sul percorso che conta.
--
-- Corpo ribattuto dal CATALOGO VIVO (pg_get_functiondef), non dal file di
-- migration: provato che i due coincidono, invocazione sotto in fondo al file
-- come nota. Unica differenza voluta: l'aggiunta della riga
-- prima_immissione_at = COALESCE(lavori.prima_immissione_at, now()),
-- simmetrica a src/lib/consegna/orchestrate.ts:337
-- (prima_immissione_at: lavoro.prima_immissione_at ?? now). Stessa firma
-- (uuid, uuid) → CREATE OR REPLACE, nessun overload orfano.
CREATE OR REPLACE FUNCTION public.consegna_finalizza_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE lavori SET
    stato = 'consegnato',
    consegna_in_corso = false,
    conformato = true,
    data_conformazione = now(),
    data_consegna_effettiva = now(),
    -- 🔑 Simmetrico a orchestrate.ts:337 — la prima immissione sul mercato
    -- si scrive UNA VOLTA SOLA (Allegato XIII p.4 + Art. 2(28)): se la
    -- colonna è già piena (riconsegna dopo una riapertura), il valore
    -- esistente vince sempre e il termine dei 10 anni non riparte da capo.
    prima_immissione_at = COALESCE(lavori.prima_immissione_at, now()),
    consegna_completata_at = now(),
    consegna_precheck_passato_al_primo_tentativo = true
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RAISE EXCEPTION 'consegna_finalizza: lavoro non trovato o eliminato';
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;
-- Rimessi esplicitamente (CREATE OR REPLACE conserva già l'ACL su Postgres,
-- ma li si riafferma per lo stesso motivo per cui la migration originale li
-- scriveva: dichiarati, non impliciti).
REVOKE ALL ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consegna_finalizza_atomica(uuid, uuid) TO service_role;
