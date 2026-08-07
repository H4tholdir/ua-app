-- supabase/migrations/20260807182614_riporta_a_pronto_atomica.sql
-- Ondata «si deve sempre poter intervenire» — §3 della spec (R9, riga 23 della coda).
-- Piano: docs/superpowers/plans/2026-08-07-torna-a-pronto-documento-intatto.md, Task 4.
--
-- 🔑 PERCHÉ DUE FUNZIONI PUBBLICHE E NON UN PARAMETRO. Un booleano
-- (p_annulla_ddc) che decide se un documento a valore legale viene annullato è la
-- «coppia incoerente (motivo, azione) che arriva a un atto distruttivo», comparsa
-- TRE volte in un giorno solo il 07/08. Qui l'atto distruttivo resta nel NOME
-- della funzione: chi legge la chiamata sa che cosa sta per succedere.
--
-- 🔑 PERCHÉ IL CORPO CONDIVISO SI ESTRAE. 20260807143623:205-257 ha già dovuto
-- RICOPIARE per intero il corpo di riapri_lavoro_atomica per cambiare UNA
-- assegnazione. Con una terza copia, ogni futuro campo da azzerare andrebbe
-- applicato in tre posti — e il giorno in cui uno dei tre resta indietro nessuno
-- se ne accorge.
--
-- ⚠️ IL RIPRISTINO È IDENTICO PER LE DUE, data_consegna_effettiva COMPRESA: la
-- memoria della prima immissione non sta più lì, sta in lavori.prima_immissione_at
-- (Task 2, 20260807172520), che nessuna riapertura tocca. Per questo il campo NON
-- compare fra quelli azzerati qui sotto, e non deve comparirci mai: da lì
-- decorrono i dieci anni di conservazione della dichiarazione (Allegato XIII
-- punto 4 MDR).

CREATE OR REPLACE FUNCTION public.ripristina_lavoro_a_pronto(
  p_lavoro_id uuid, p_laboratorio_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE v_rows int;
BEGIN
  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    -- la proposta di fatturazione pre-riapertura non deve rinascere alla
    -- riconsegna: è fatta per una consegna che questa riapertura ha invalidato
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'ripristino lavoro fallito'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.ripristina_lavoro_a_pronto(uuid,uuid) IS
  'SOLO USO INTERNO alle RPC di riapertura: riporta il lavoro a pronto e azzera i '
  'campi della consegna. NON tocca dichiarazioni_conformita — quella scelta la fa '
  'la funzione pubblica che la chiama, ed è nel suo nome.';

-- ── LA FUNZIONE NUOVA ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.riporta_a_pronto_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_lavoro RECORD;
  v_ddc_vive int;
BEGIN
  SELECT id, stato INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;

  -- La riapertura non è mai senza motivo (D263): l'evento deve esistere ed essere
  -- di QUESTO lavoro e di QUESTO laboratorio.
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  -- 🛑 LA DIFFERENZA CON LA GEMELLA, ED È TUTTA QUI: dichiarazioni_conformita NON
  -- si tocca. D293 — annullare il documento di una consegna realmente avvenuta
  -- cancella l'unica prova che quel manufatto è esistito ed è andato a un paziente.
  PERFORM public.ripristina_lavoro_a_pronto(p_lavoro_id, p_laboratorio_id);

  -- 🔑 «Resta valida» è una PROMESSA, e va verificata invece di essere affermata:
  -- se non c'è nessuna dichiarazione viva (già annullata prima, o mai emessa) la
  -- frase è falsa, e chi legge deve saperlo — alla riconsegna ne verrà generata
  -- una nuova, bruciando un progressivo (generate-ddc.ts:383-392).
  -- «Viva» = `stato <> 'annullata'`: la STESSA definizione dell'indice
  -- ddc_lavoro_attiva_unique, che è l'idioma di casa (mai un elenco di stati).
  SELECT count(*) INTO v_ddc_vive FROM dichiarazioni_conformita
   WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
     AND stato <> 'annullata';

  RETURN json_build_object('esito', 'ok', 'ddc_viva', v_ddc_vive > 0);
END;
$$;

REVOKE ALL ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.riporta_a_pronto_atomica(uuid,uuid,uuid) IS
  'Riporta un lavoro consegnato fra i pronti LASCIANDO VIVA la dichiarazione '
  '(D291 · D290 · D297 · D298): il manufatto è uscito davvero e il documento diceva '
  'il vero. È la gemella NON distruttiva di riapri_lavoro_atomica, che invece '
  'annulla — e la scelta fra le due si legge dal nome, mai da un parametro. '
  'Restituisce ddc_viva:false quando la promessa «resta valida» non ha oggetto.';

-- ── LA GEMELLA usa lo stesso corpo condiviso ───────────────────────────────
-- 🛑 IL CORPO QUI SOTTO È RIBATTUTO DAL CATALOGO VIVO (pg_get_functiondef letto
-- il 07/08/2026), non dal file 20260806210400, che è SUPERATO: l'UPDATE sulla
-- dichiarazione scrive anche annullata_da_evento_id dal 07/08 (20260807143623).
-- Rispetto al corpo vivo questa versione cambia SOLO per code motion (l'UPDATE
-- su lavori esce nella funzione condivisa) e per il testo del RAISE ormai
-- irraggiungibile, che perde il prefisso «riapertura: » perché la funzione
-- condivisa serve due chiamanti e non può nominarne uno solo.
CREATE OR REPLACE FUNCTION public.riapri_lavoro_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_lavoro RECORD;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  SELECT id, stato INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;

  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  PERFORM public.ripristina_lavoro_a_pronto(p_lavoro_id, p_laboratorio_id);

  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato <> 'annullata';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true;
    ELSE
      RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;
