-- 20260805201640_rifacimento_clona_tinta.sql — D42, Task 6 di 9.
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration.
--
-- 🛑 IL NOME DI QUESTO FILE NON È QUELLO DEL BRIEF (`20260803140200`), ed è
--    voluto. Quella data è ANTERIORE all'ultima migration applicata.
--    `provato:` `SELECT version FROM supabase_migrations.schema_migrations
--    ORDER BY version DESC LIMIT 1` → **20260805174500**. Il nome porta
--    l'orologio (D155: `date "+%Y%m%d%H%M%S"` → 20260805201640), non la data
--    scritta nel piano.
--
-- ============ IL DIFETTO CHE QUESTO TASK CHIUDE ============
-- I Task 1-5 dell'ondata hanno dato a `lavori` la coppia `tinta_famiglia` /
-- `tinta_codice` (catalogo `tinte_manufatto`, 34 righe: 17 sport + 17
-- resina_ortodontica) e la normalizzazione server-side su creazione/PATCH.
-- `crea_rifacimento_atomico` — la QUARTA/QUINTA penna su `lavori`, insieme a
-- `lavoro_crea_atomico` e al PATCH — è rimasta indietro: senza questa
-- migration un rifacimento di un lavoro con tinta nasceva SENZA tinta, esatto
-- gemello del difetto G1 (colore_scala/colore_codice) già chiuso il
-- 28/07/2026 in 20260728103000 — e quel precedente diceva esplicitamente
-- «il difetto più grave del collaudo dell'ondata (a) era esattamente questo».
--
-- Letta dal CATALOGO VIVO (R-P2 — non dalla migration che l'ha creata, può
-- essere stata riscritta dopo):
--   SELECT prosrc FROM pg_proc WHERE proname = 'crea_rifacimento_atomico';
-- Nessuna migration successiva a 20260804211256 tocca questa funzione, quindi
-- il testo vivo letto qui coincide con quello dell'ultima migration che la
-- riscrive — ma è il catalogo, non il file, ad aver deciso.
--
-- `tinta_famiglia`/`tinta_codice` si aggiungono NELLA STESSA POSIZIONE
-- RELATIVA nelle due liste (colonne e valori si corrispondono per indice: uno
-- scivolamento le disallinea in silenzio, senza errore a runtime perché i tipi
-- di `colore_scala text NOT NULL a caso` non coincidono comunque con
-- `tinta_codice text` — ma un ordine sbagliato fra le altre colonne text
-- avrebbe potuto passare silenzioso; il Passo 3 qui sotto prova l'accoppiamento
-- vero, non solo che la migration gira). Subito dopo `colore_scala,
-- colore_codice`: stessa famiglia concettuale (il colore/tinta del caso), e la
-- lettura del diff resta minima.
--
-- Il vincolo `lavori_tinta_tipo_ck` regge per costruzione: si copia
-- `v_lavoro.tipo_dispositivo` (già nell'INSERT) insieme a
-- `v_lavoro.tinta_famiglia`/`tinta_codice` dalla STESSA riga sorgente, che
-- essendo già in banca dati rispettava già l'accoppiamento famiglia↔tipo.
CREATE OR REPLACE FUNCTION public.crea_rifacimento_atomico(p_lavoro_originale_id uuid, p_motivo text, p_rilevato_in text DEFAULT NULL::text, p_costo_interno numeric DEFAULT NULL::numeric, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    -- ⬇️ AGGIUNTA D42/Task 6 — la tinta del manufatto (bite_splint/ortodonzia).
    --    Stesso difetto di G1, gemello: senza queste due colonne il
    --    rifacimento perdeva la tinta scelta sul lavoro originale.
    tinta_famiglia, tinta_codice,
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
    v_lavoro.tinta_famiglia, v_lavoro.tinta_codice,
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
$function$;

COMMENT ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) IS
  'Crea il lavoro di rifacimento copiando dal lavoro originale. QUARTA penna su lavori_prescrizioni insieme alle RPC lavoro_crea_atomico / lavoro_prescrizione_*: clona le righe dei denti conservando provenienza, copia colore_scala/colore_codice, copia tinta_famiglia/tinta_codice (D42, Task 6 — la tinta del manufatto: stesso difetto gemello di G1, chiuso qui), copia il prescrittore richiedente_nome + istituzione_sanitaria (D221: prima ogni rifacimento nasceva senza le due caselle dell''Allegato XIII p.1), e clona la trascrizione della prescrizione (contenuto+fonte+numero) azzerando divergenze e conferma (D214). colore_dente resta copiata finché main la legge in produzione — si toglie nell''ondata (c).';

-- ============ Permessi: firma identica alla definizione ============
-- Ri-emessi per non dipendere dal fatto che CREATE OR REPLACE conservi l'ACL
-- (stessa cautela di 20260728103000). `provato:` prima di questa migration
-- information_schema.routine_privileges dava solo service_role+postgres in
-- EXECUTE — nessun anon, nessun authenticated.
-- 🛑 MAI `GRANT ... TO authenticated` qui: disferebbe l'hardening di
--    20260704180000.
REVOKE EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) TO service_role;
