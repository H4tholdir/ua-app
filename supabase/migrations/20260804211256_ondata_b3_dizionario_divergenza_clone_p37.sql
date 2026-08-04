-- 20260804211256_ondata_b3_dizionario_divergenza_clone_p37.sql
-- Ondata B, sessione ③, Task 5 (M-T3-1 + D221). NON aggiungere BEGIN;/COMMIT;
-- — il runner Supabase avvolge già la migration (N6).
--
-- DUE `CREATE OR REPLACE` a **STESSA FIRMA**. La firma NON cambia in nessuno
-- dei due casi, quindi OR REPLACE è la forma giusta: il DROP esplicito serve
-- solo quando la firma cambia, altrimenti si crea un OVERLOAD (due funzioni
-- vive), provato in sonda S10 (scripts/tmp/sonda-lp-r-p1.mjs, sessione ②).
-- Catalogo vivo verificato PRIMA di scrivere: UNA definizione per nome
-- (pg_proc, 04/08/2026), corpo IDENTICO a 20260804152403.
--
-- ⚠️ CREATE OR REPLACE conserva l'ACL ma AZZERA proconfig (trappola
-- documentata in 20260721090100 e 20260728103000): `SET search_path` è
-- ridichiarato in entrambe le funzioni e REVOKE/GRANT sono ri-emessi in coda.

-- ============ 1. Il dizionario del CAMPO della divergenza (M-T3-1) ============
-- Corpo IDENTICO al vigente (20260804152403:265-314, verificato uguale al
-- catalogo vivo con pg_get_functiondef il 04/08/2026) con UNA aggiunta,
-- marcata «⬇️ AGGIUNTA B③»: la guardia sul dizionario di `p_campo`.
--
-- 🔴 IL BUCO CHE CHIUDE, provato a banco (sonda S3, sessione ③): fino a questa
--    migration `p_campo := 'pippo'` e perfino `p_campo := NULL` rispondevano
--    `ok`. Una divergenza registrata su un campo che non esiste è una riga che
--    nessuna schermata mostrerà mai e che nessuno saprà di avere — un dato
--    perso in silenzio. La route resta la PRIMA guardia (422 parlante); questa
--    è la seconda, e l'unica che vale anche per chi non passa dalla route.
--
-- 🔑 `tipo` RESTA nel dizionario della divergenza, e non è una svista: una
--    divergenza sul tipo di dispositivo sopravvive alla conferma di consegna
--    (D213 — la chiave `tipo` entra nello snapshot proprio lì). La restrizione
--    sul tipo è SOLO della route del typo, non di questa RPC.
--
-- 🔑 ORDINE DELLE GUARDIE: `campo` PRIMA di `motivo`, lo stesso ordine della
--    route (src/app/api/lavori/[id]/prescrizione/divergenza/route.ts) — con
--    campo E motivo entrambi sbagliati la risposta è `campo_non_valido` da
--    tutte e due le porte. Provato, non dedotto (collaudo T5, caso S3-f —
--    S3-d prova un'altra cosa: che `tipo` resti lecito).
CREATE OR REPLACE FUNCTION public.lavoro_prescrizione_registra_divergenza(
  p_lab    uuid,
  p_lavoro uuid,
  p_campo  text,
  p_motivo text,
  p_nota   text,
  p_utente uuid
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_n integer;
BEGIN
  PERFORM 1
    FROM lavori
   WHERE id = p_lavoro AND laboratorio_id = p_lab AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('esito', 'non_trovato');
  END IF;

  IF EXISTS (
       SELECT 1 FROM dichiarazioni_conformita
        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND stato <> 'annullata'
     ) THEN
    RETURN json_build_object('esito', 'congelata');
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM lavori_prescrizioni
        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab
     ) THEN
    RETURN json_build_object('esito', 'senza_prescrizione');
  END IF;

  -- ⬇️ AGGIUNTA B③ — M-T3-1: il dizionario del campo, chiuso anche in banca
  --    dati. Stessa lista di CAMPI_TYPO (src/lib/domain/prescrizione-costanti)
  --    e della guardia dentro lavoro_prescrizione_correggi_typo; la spia
  --    tests/unit/prescrizione-costanti-spia-migration.test.ts impedisce che
  --    i due elenchi divergano in silenzio.
  IF p_campo IS NULL OR p_campo NOT IN ('elementi','colore','tipo') THEN
    RETURN json_build_object('esito', 'campo_non_valido');
  END IF;

  IF p_motivo IS NULL OR p_motivo NOT IN ('richiesta_dentista','esigenza_tecnica','materiale_non_disponibile','altro') THEN
    RETURN json_build_object('esito', 'motivo_non_valido');
  END IF;

  UPDATE lavori_prescrizioni SET
    divergenze = divergenze || jsonb_build_object(
      'campo',         p_campo,
      'motivo',        p_motivo,
      'nota',          p_nota,
      'utente_id',     p_utente,
      'registrata_at', now())
   WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab
  RETURNING jsonb_array_length(divergenze) INTO v_n;

  RETURN json_build_object('esito', 'ok', 'divergenze', v_n);
END $$;

-- ============ 2. crea_rifacimento_atomico: il clone del prescrittore (D221) ============
-- Corpo IDENTICO al vigente (20260804152403:376-491, verificato uguale al
-- catalogo vivo con pg_get_functiondef il 04/08/2026) con UNA aggiunta,
-- marcata «⬇️ AGGIUNTA B③»: le DUE colonne del prescrittore nella
-- colonna-list del clone.
--
-- 🔴 IL DIFETTO CHE CHIUDE (D221): la colonna-list del clone non portava né
--    `richiedente_nome` né `istituzione_sanitaria`, quindi OGNI rifacimento
--    nasceva SENZA prescrittore — le due caselle dell'Allegato XIII punto 1
--    che la Dichiarazione di Conformità stampa. Il lavoro rifatto è lo stesso
--    documento del dentista applicato a un lavoro nuovo: se ne eredita la
--    trascrizione (clone della prescrizione, già qui dalla ②), a maggior
--    ragione ne eredita chi l'ha prescritto. Entrambe le colonne sono
--    nullable senza default (information_schema, 04/08/2026): un originale
--    senza prescrittore continua a produrre un rifacimento senza
--    prescrittore, come prima.
--
-- 🛑 SOLO QUESTO. Il lock senza tenant del SELECT ... FOR UPDATE, il tenant
--    come parametro e il contratto degli esiti NON si toccano qui: sono della
--    riga 12 della roadmap.
CREATE OR REPLACE FUNCTION public.crea_rifacimento_atomico(
  p_lavoro_originale_id uuid,
  p_motivo              text,
  p_rilevato_in         text DEFAULT NULL::text,
  p_costo_interno       numeric DEFAULT NULL::numeric,
  p_note                text DEFAULT NULL::text
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lavoro       lavori%ROWTYPE;
  v_anno         SMALLINT;
  v_progressivo  INTEGER;
  v_numero       TEXT;
  v_nuovo_id     UUID;
BEGIN
  SELECT * INTO v_lavoro FROM lavori WHERE id = p_lavoro_originale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lavoro % non trovato', p_lavoro_originale_id; END IF;

  IF v_lavoro.stato NOT IN ('consegnato', 'pronto', 'sospeso') THEN
    RAISE EXCEPTION 'Impossibile creare rifacimento per lavoro in stato "%"', v_lavoro.stato;
  END IF;

  v_anno := EXTRACT(YEAR FROM NOW())::SMALLINT;

  INSERT INTO progressivi_anno (laboratorio_id, tipo, anno, progressivo)
  VALUES (v_lavoro.laboratorio_id, 'lavoro', v_anno, 1)
  ON CONFLICT (laboratorio_id, tipo, anno)
  DO UPDATE SET progressivo = progressivi_anno.progressivo + 1
  RETURNING progressivo INTO v_progressivo;

  v_numero := v_anno::TEXT || '/' || LPAD(v_progressivo::TEXT, 4, '0');

  INSERT INTO lavori (
    laboratorio_id, numero_lavoro, anno_lavoro,
    cliente_id, paziente_id, tecnico_id,
    -- ⬇️ AGGIUNTA B③ — D221/P37: le DUE caselle del prescrittore
    --    dell'Allegato XIII punto 1. Mancavano ENTRAMBE.
    richiedente_nome, istituzione_sanitaria,
    tipo_dispositivo, descrizione, note_interne,
    colore_dente, denti_coinvolti, arcata,
    -- ⬇️ AGGIUNTA G1 — il default di caso dell'ondata (a). Senza queste due
    --    colonne il rifacimento per 'colore_sbagliato' nasceva senza colore.
    colore_scala, colore_codice,
    -- ⬇️ AGGIUNTA G1 — coerenza con le righe clonate qui sotto.
    denti_mancanti, denti_impianti,
    classe_rischio, norma_riferimento,
    da_conformare, conformato,
    stato, priorita,
    data_ingresso, data_consegna_prevista,
    codice_iva, natura_iva,
    is_rifacimento, rifacimento_motivo,
    listino_id, prezzo_unitario
  ) VALUES (
    v_lavoro.laboratorio_id, v_numero, v_anno,
    v_lavoro.cliente_id, v_lavoro.paziente_id, v_lavoro.tecnico_id,
    v_lavoro.richiedente_nome, v_lavoro.istituzione_sanitaria,
    v_lavoro.tipo_dispositivo, v_lavoro.descrizione, p_note,
    -- 🛑 `colore_dente` NON si toglie: `main` la legge ancora in produzione.
    --    La rimozione è dell'ondata (c). Vedi il cappello di 20260728103000.
    v_lavoro.colore_dente, v_lavoro.denti_coinvolti, v_lavoro.arcata,
    v_lavoro.colore_scala, v_lavoro.colore_codice,
    v_lavoro.denti_mancanti, v_lavoro.denti_impianti,
    v_lavoro.classe_rischio, v_lavoro.norma_riferimento,
    TRUE, FALSE,
    'ricevuto', v_lavoro.priorita,
    NOW(), v_lavoro.data_consegna_prevista,
    v_lavoro.codice_iva, v_lavoro.natura_iva,
    TRUE, p_motivo,
    v_lavoro.listino_id, v_lavoro.prezzo_unitario
  ) RETURNING id INTO v_nuovo_id;

  -- ⬇️ AGGIUNTA G1 — la clonazione delle righe dei denti. `provenienza` si
  -- CONSERVA, non si forza: un rifacimento eredita la storia del lavoro da cui
  -- nasce, non ne inventa una nuova (commento esteso in 20260728103000:149-168).
  INSERT INTO lavori_denti (
    laboratorio_id, lavoro_id, fdi, ruolo, gruppo, gruppo_ruolo,
    scala, codice, codice_collo, codice_corpo, codice_incisale, provenienza
  )
  SELECT
    d.laboratorio_id, v_nuovo_id, d.fdi, d.ruolo, d.gruppo, d.gruppo_ruolo,
    d.scala, d.codice, d.codice_collo, d.codice_corpo, d.codice_incisale, d.provenienza
  FROM lavori_denti d
  WHERE d.lavoro_id = p_lavoro_originale_id
    AND d.laboratorio_id = v_lavoro.laboratorio_id;

  -- ⚠️ Le tre colonne denormalizzate NON si ricalcolano dalle righe clonate: si
  --    COPIANO dall'originale (sopra). Ragione estesa: 20260728103000:180-188.

  -- ⬇️ AGGIUNTA B② — il clone della trascrizione (D214). Il rifacimento è lo
  --    STESSO documento del dentista applicato a un lavoro nuovo: contenuto,
  --    fonte (le tre colonne insieme: il CHECK fonte_ck regge per costruzione)
  --    e numero_prescrizione viaggiano; `divergenze` e la conferma NO — il
  --    rifacimento riparte da zero e riconferma guardando il foglio (default
  --    '[]' e NULL della tabella, D212). La FK composita dell'immagine regge:
  --    stesso fonte_immagine_id, stesso laboratorio_id. Se l'originale non ha
  --    la riga, la SELECT non produce nulla: nessuna riga vuota (V2).
  INSERT INTO lavori_prescrizioni (
    laboratorio_id, lavoro_id, contenuto,
    fonte_tipo, fonte_immagine_id, fonte_riferimento, numero_prescrizione
  )
  SELECT laboratorio_id, v_nuovo_id, contenuto,
         fonte_tipo, fonte_immagine_id, fonte_riferimento, numero_prescrizione
    FROM lavori_prescrizioni
   WHERE lavoro_id = p_lavoro_originale_id
     AND laboratorio_id = v_lavoro.laboratorio_id;

  INSERT INTO lavori_rifacimenti (
    laboratorio_id, lavoro_originale_id, lavoro_nuovo_id,
    motivo, rilevato_in, costo_interno, note
  ) VALUES (
    v_lavoro.laboratorio_id, p_lavoro_originale_id, v_nuovo_id,
    p_motivo, p_rilevato_in, p_costo_interno, p_note
  );

  RETURN json_build_object('lavoro_nuovo_id', v_nuovo_id, 'numero_lavoro', v_numero);
END;
$$;

-- ============ Commenti: il perché resta nel catalogo ============
COMMENT ON FUNCTION public.lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid) IS
  'Appende una divergenza prescritto/eseguito al registro (V9, D212): {campo, motivo, nota, utente_id, registrata_at}. DUE dizionari chiusi: campo (elementi/colore/tipo, esito campo_non_valido, M-T3-1) valutato PRIMA del motivo (richiesta_dentista/esigenza_tecnica/materiale_non_disponibile/altro, esito motivo_non_valido) — stesso ordine della route. `tipo` resta ammesso: una divergenza sul tipo sopravvive alla conferma (D213). Non tocca il contenuto. Con DdC attiva: congelata (V8).';
COMMENT ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) IS
  'Crea il lavoro di rifacimento copiando dal lavoro originale. QUARTA penna su lavori_prescrizioni insieme alle RPC lavoro_crea_atomico / lavoro_prescrizione_*: clona le righe dei denti conservando provenienza, copia colore_scala/colore_codice, copia il prescrittore richiedente_nome + istituzione_sanitaria (D221: prima ogni rifacimento nasceva senza le due caselle dell''Allegato XIII p.1), e clona la trascrizione della prescrizione (contenuto+fonte+numero) azzerando divergenze e conferma (D214). colore_dente resta copiata finché main la legge in produzione — si toglie nell''ondata (c).';

-- ============ Permessi: firme identiche alle definizioni ============
-- Modello 20260727120300:222-226. MAI GRANT a authenticated (l'hardening di
-- 20260704180000 non si disfa). Ri-emessi per entrambe: CREATE OR REPLACE
-- conserva l'ACL, ma non ci si appoggia a quel dettaglio.
REVOKE EXECUTE ON FUNCTION public.lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text)                   FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid)  TO service_role;
GRANT  EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text)                   TO service_role;
