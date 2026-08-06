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
--    dentro una finestra di 10 minuti dove una dichiarazione arriva a 'consegnata' solo
--    se qualcosa la porta lì prima che scada la finestra — improbabile. Qui è
--    diverso: questa RPC gira ad ARBITRARIA distanza di tempo, cioè esattamente
--    nel dominio dove una dichiarazione può essere legittimamente 'consegnata'. Con SOLO
--    tre stati, una riapertura su un lavoro con dichiarazione 'consegnata' NON annulla
--    quella riga (0 righe toccate), la conta totale è >0, e la funzione
--    SOLLEVA L'ECCEZIONE «dichiarazione in stato incoerente» — cioè BLOCCA
--    esattamente la correzione che D265 dice deve riuscire SEMPRE. Verificato
--    anche l'effetto collaterale: `ddc_lavoro_attiva_unique` è
--    `WHERE stato <> 'annullata'` (20260710090000:14-17) — una 'consegnata'
--    lasciata viva terrebbe occupato lo slot attivo, bloccando anche la
--    successiva riemissione (§8.1, annulla→riemetti).
--
--    ➡️ QUESTA MIGRATION NON ELENCA GLI STATI: usa `stato <> 'annullata'`.
--    🔑 È la STESSA definizione che l'indice `ddc_lavoro_attiva_unique` usa per
--    dire «viva» (`WHERE stato <> 'annullata'`, 20260710090000:14-17), ed è
--    l'idioma di casa: 20260804152403_ondata_b_prescrizioni_rpc.sql:11 lo dice
--    a parole («la STESSA definizione dell'indice») e lo usa in cinque punti
--    (:174, :230, :287, :349); così anche 20260804211256:60,
--    src/lib/pdf/generate-ddc.ts:103, src/lib/consegna/orchestrate.ts:112,
--    src/lib/dashboard/striscia.ts:323. L'elenco a enumerazione vive SOLO
--    nelle tre vecchie RPC di annullamento.
--    🛑 PERCHÉ L'ELENCO ERA FRAGILE, e il modo in cui si rompeva è proprio il
--    blocco che questa funzione nasce per togliere: il giorno in cui il
--    vocabolario cresce di uno stato, un elenco scritto a mano DIVENTA MUTO —
--    la riga nuova non viene annullata, la conta totale resta >0, e la
--    riapertura SOLLEVA L'ECCEZIONE. Provato in transazione annullata
--    allargando la CHECK a un sesto stato: con l'elenco la riapertura si
--    blocca, con `<> 'annullata'` passa. Sullo schema di OGGI i due sono
--    equivalenti (i cinque valori della CHECK lo rendono tale): il cambiamento
--    non altera nulla adesso, e regge da solo domani.
--    ⚠️ E il fail-closed così NON diventa «più severo» — diventa più ESATTO:
--    un filtro più largo aggiorna più righe, quindi il RAISE scatta più di
--    RADO. Perde un falso positivo (la dichiarazione 'consegnata', che è una
--    riapertura legittima che D265 impone di far passare) e tiene l'unico caso
--    vero: nessuna dichiarazione viva pur essendocene almeno una in archivio.
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
  -- ⚠️ RETE DIFENSIVA OGGI IRRAGGIUNGIBILE, e va detto invece di lasciarlo
  -- credere una guardia viva: l'UPDATE sopra non porta `AND stato =
  -- 'consegnato'` (il corpo vivo della funzione vecchia fa lo stesso), e la
  -- riga è già bloccata da FOR UPDATE con lo stato controllato dopo il lock —
  -- quindi v_rows non può essere 0. Resta perché il giorno in cui qualcuno
  -- aggiungesse una condizione a quell'UPDATE, questo RAISE tornerebbe vivo.
  IF v_rows = 0 THEN RAISE EXCEPTION 'riapertura: ripristino lavoro fallito'; END IF;

  -- Fail-closed sulla dichiarazione — GARANZIA CONSERVATA dal corpo vivo di
  -- annulla_consegna_atomica (righe 52-65 dello snapshot fresco).
  UPDATE dichiarazioni_conformita SET stato = 'annullata'
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato <> 'annullata';
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
