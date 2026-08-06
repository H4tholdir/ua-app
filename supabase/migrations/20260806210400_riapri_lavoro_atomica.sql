-- supabase/migrations/20260806210400_riapri_lavoro_atomica.sql
-- Ondata «si deve sempre poter intervenire», Task 3.
-- Spec: docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md §7, §6
--
-- 🛑 PERCHÉ È UNA RPC NUOVA E NON UN ALLARGAMENTO DI annulla_consegna_atomica (§7):
-- quella RPC porta i CANCELLI FISCALI (fattura_gia_emessa — due volte — e
-- incluso_in_fattura, 20260710180000:88-101). Riusarla farebbe RIFIUTARE la
-- correzione di un dato su un lavoro già fatturato: il contrario di D265
-- («il documento sanitario si corregge SEMPRE, anche a fattura emessa»).
-- annulla_consegna_atomica resta in vita finché il vecchio percorso (finestra
-- 10 minuti) non è rimosso, e muore con lui.
--
-- 🔎 R-P2 — IL CORPO VIVO, NON IL FILE. Il file 20260710180000 diverge già una
-- volta dal catalogo (007, documentato il 28/07). Prima di scrivere questa
-- funzione il corpo vivo di annulla_consegna_atomica è stato riletto FRESCO dal
-- catalogo (pg_get_functiondef, scripts/tmp/sonda-t3-r-p1.mjs, esito in
-- scripts/tmp/sonda-t3-esito.txt) — non dal file di migration né dallo snapshot
-- di un task precedente, per lo stesso motivo per cui quello snapshot non basta
-- da solo. Due scoperte dalla lettura fresca, e la PRIMA delle due si risolve
-- DIVERGENDO deliberatamente dal corpo vivo (non copiandolo):
--
-- 1. 🛑 Il filtro `dichiarazioni_conformita` nel corpo vivo di
--    annulla_consegna_atomica è `stato IN ('bozza','generata','firmata')` — TRE
--    stati, non quattro: manca 'consegnata', che la CHECK della tabella ammette
--    (`dichiarazioni_conformita_stato_check` la include) e che oggi nessun
--    percorso applicativo scrive (dato reale nel DB, misurato: solo 'annullata'
--    e 'generata' esistono). Nella VECCHIA funzione l'omissione è inerte: gira
--    dentro una finestra di 10 minuti dove una DdC arriva a 'consegnata' solo
--    se qualcosa la porta lì prima che scada la finestra — improbabile. Qui è
--    diverso: questa RPC gira ad ARBITRARIA distanza di tempo, cioè esattamente
--    nel dominio dove una DdC può essere legittimamente 'consegnata'. Con SOLO
--    tre stati, una riapertura su un lavoro con DdC 'consegnata' NON annulla
--    quella riga (0 righe toccate), la conta totale è >0, e la funzione
--    SOLLEVA L'ECCEZIONE «dichiarazione in stato incoerente» — cioè BLOCCA
--    esattamente la correzione che D265 dice deve riuscire SEMPRE. Verificato
--    anche l'effetto collaterale: `ddc_lavoro_attiva_unique` è
--    `WHERE stato <> 'annullata'` (20260710090000:14-17) — una 'consegnata'
--    lasciata viva terrebbe occupato lo slot attivo, bloccando anche la
--    successiva riemissione (§8.1, annulla→riemetti). ➡️ Questa migration usa
--    QUATTRO stati (`'bozza','generata','firmata','consegnata'`), come il primo
--    abbozzo del brief — non perché il brief lo dicesse, ma perché la lettura
--    del corpo vivo E della CHECK E dell'indice, tutti e tre dal catalogo,
--    portano alla stessa conclusione: il fail-closed diventa PIÙ severo, non
--    più permissivo, con quattro stati — l'unico modo di raggiungere ancora il
--    RAISE è una DdC che non è in nessuno stato non-annullata del vocabolario,
--    cioè il vero caso incoerente. Prova nel test gemello (suite integrazione):
--    una DdC 'consegnata' viene annullata correttamente e lo slot resta libero.
-- 2. Il ripristino a 'pronto' nel corpo vivo azzera QUATTRO campi in più di
--    quelli elencati nel mandato («conformato/data_conformazione»):
--    `consegna_in_corso`, `consegna_tap_at` (lock/debounce del tap di consegna,
--    002_fase2_schema.sql:73) e `proposta_dentista`/`proposta_at` (proposta di
--    fatturazione del dentista via portale, 20260710180000:10-12) — col commento
--    vivo «la proposta pre-annullo non deve rinascere alla riconsegna». La
--    riapertura rimanda il lavoro a 'pronto' esattamente come l'annullo, e lo
--    stesso rischio di resurrezione si applica: un lavoro riaperto per un dato
--    sbagliato e poi riconsegnato non deve portare con sé la vecchia proposta di
--    fatturazione del dentista, fatta per una consegna che questa riapertura
--    ha appena invalidato. Il mandato elencava solo due campi come ESEMPIO
--    («conserva: ripristino a pronto, azzeramento di conformato/…») — non come
--    esclusione degli altri quattro, che restano parte dello stesso «ripristino
--    a pronto». Il filtro sul SELECT iniziale (`deleted_at IS NULL`) è
--    conservato per lo stesso motivo: un lavoro con soft-delete non va riaperto.
--
-- 🔑 LA GARANZIA CONSERVATA (mandato, punto 2): il controllo fail-closed sulla
-- dichiarazione. Se l'UPDATE non tocca nessuna riga, si conta quante
-- dichiarazioni esistono per il lavoro: 0 → dato legacy, si procede e si
-- segnala (`ddc_assente:true`); >0 → RAISE EXCEPTION, mai un successo silenzioso
-- su uno stato incoerente. Prova di rifiuto nel test di integrazione gemello.
--
-- ⚠️ NESSUN cancello fiscale (§7): niente `fattura_gia_emessa`, niente
-- `incluso_in_fattura`, niente `p_finestra_ms` (e il suo RAISE d'ingresso
-- 1s..15min). Il cancello commerciale vive a monte, dove si sceglie l'ESITO
-- della valutazione (Task 6+), non qui dove si cambia lo stato.
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

  -- L'evento deve esistere ed essere di QUESTO lavoro/laboratorio: la
  -- riapertura non è mai senza motivo (D263) — nessun override, nessuna scorciatoia.
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  -- 🛑 NESSUN cancello fiscale qui: il documento sanitario si corregge sempre
  --    (D265). Il cancello commerciale vive a monte, dove si sceglie l'esito (§7).
  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    -- la proposta di fatturazione pre-riapertura non deve rinascere alla
    -- riconsegna (stesso motivo del corpo vivo di annulla_consegna_atomica)
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'riapertura: ripristino lavoro fallito'; END IF;

  -- Fail-closed sulla dichiarazione — GARANZIA CONSERVATA dal corpo vivo di
  -- annulla_consegna_atomica (righe 52-65 dello snapshot fresco).
  UPDATE dichiarazioni_conformita SET stato = 'annullata'
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato IN ('bozza','generata','firmata','consegnata');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true; -- dato legacy/stub: consenti, segnala
    ELSE
      RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;

REVOKE ALL ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) TO service_role;

COMMENT ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) IS
  'Riapre un lavoro CONSEGNATO per correggerlo (D265/D269): riporta a pronto, '
  'annulla la dichiarazione (fail-closed se resta in stato incoerente), NESSUN '
  'cancello fiscale (quello vive dove si sceglie l''esito, §7). Richiede un '
  'eventi_qualita valido: la riapertura non è mai senza motivo (D263).';
