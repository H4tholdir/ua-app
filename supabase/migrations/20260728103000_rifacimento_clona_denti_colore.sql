-- 20260728103000_rifacimento_clona_denti_colore.sql
-- Revisione pre-merge dell'ondata (a), rilievo G1.
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration (N6).
--
-- ============ IL DIFETTO ============
-- L'ondata (a) ha spostato i denti e il colore di un lavoro dalle colonne di
-- `lavori` a `lavori_denti` (una riga per dente) + il default di caso
-- `lavori.colore_scala`/`colore_codice`. Il censimento dell'ondata è stato fatto
-- sulle COLONNE e non su CHI LE SCRIVE (fallimento R-P6), e
-- `crea_rifacimento_atomico` — TERZA penna, accanto a `lavoro_crea_atomico` e
-- `lavoro_denti_sostituisci_atomica` — è rimasta indietro.
-- Verificato sul catalogo vivo PRIMA di questa migration:
--   prosrc ilike '%colore_dente%'  → true
--   prosrc ilike '%lavori_denti%'  → false
--   prosrc ilike '%colore_scala%'  → false
--
-- Cosa vedeva l'utente: `rifacimento/route.ts:9` elenca 'colore_sbagliato' come
-- PRIMO motivo ammesso. Il lavoro rifatto nasceva con l'odontogramma pieno
-- (dalla colonna `denti_coinvolti` copiata) e la casella del colore VUOTA —
-- proprio quando il colore è la ragione del rifacimento.
-- La metà latente era peggiore: il lavoro nuovo aveva `denti_coinvolti`
-- valorizzato e ZERO righe in `lavori_denti`; il cancello dell'impronta
-- (`useLavoroForm.ts:257`) fa sì che un salvataggio non clinico non spedisca mai
-- il PUT, quindi quelle righe restavano vuote per sempre. All'ondata (c), quando
-- la Dichiarazione di Conformità passerà a leggere le righe, ogni rifacimento
-- creato da oggi sarebbe un lavoro SENZA DENTI su un documento a valore legale.
--
-- ============ 🛑 PERCHÉ `colore_dente` RESTA COPIATA ============
-- Le migration dell'ondata (a) sono GIÀ APPLICATE sul database che serve anche
-- l'applicazione online, ma il codice del ramo `ondata-a-denti-colore` NON è mai
-- stato mergiato: in produzione gira `main`, che legge ancora
-- `lavori.colore_dente` (DdcTemplate.tsx, SchedaLavoroV3.tsx).
-- Questa funzione deve quindi funzionare per ENTRAMBI i codici. Si AGGIUNGE, non
-- si sostituisce: `colore_dente` continua a essere copiata, e IN PIÙ si copiano
-- `colore_scala`/`colore_codice` e si clonano le righe.
-- ⚠️ La rimozione di `colore_dente` da questa funzione appartiene all'ONDATA (c),
--    quando i lettori passeranno alle righe di `lavori_denti`. Toglierla oggi
--    farebbe perdere il colore ai rifacimenti fatti IN PRODUZIONE.
--
-- ============ 🛑 IL CORPO QUI SOTTO VIENE DAL CATALOGO, NON DA `007` ============
-- `supabase/migrations/007_rpc_rifacimento.sql` è registrata come applicata
-- (schema_migrations version '007') ma il suo testo NON corrisponde alla funzione
-- viva: progressivo diverso (MAX+1 su `lavori` invece dell'UPSERT su
-- `progressivi_anno`), ciclo di vita diverso (il file annulla l'originale e
-- scrive in `incidenti_mdr`, la funzione viva non fa né l'uno né l'altro),
-- permessi diversi (il file chiude con `GRANT ... TO authenticated`, che
-- disferebbe l'hardening di 20260704180000).
-- Il corpo qui sotto è quindi `pg_get_functiondef` della funzione VIVA, copiato
-- alla lettera, con le SOLE aggiunte marcate «⬇️ AGGIUNTA G1».
-- La divergenza del file `007` è riferita a parte: non si corregge qui.
--
-- ============ PERMESSI ============
-- `CREATE OR REPLACE` conserva l'ACL ma AZZERA proconfig (trappola già
-- documentata in 20260721090100:108-115). Da qui la clausola `SET search_path`
-- ridichiarata nell'intestazione, e REVOKE/GRANT ri-emessi in coda per non
-- dipendere da quel dettaglio.
-- Stato atteso, identico a prima:
--   prosecdef = true
--   proconfig = {search_path=public\, pg_temp}
--   proacl    = {postgres=X/postgres,service_role=X/postgres}
--
-- 🔑 `lavori_denti` è in REVOKE ALL, service_role compreso (nota E8,
--    20260727120100:87): le uniche penne sono le RPC SECURITY DEFINER. Questa
--    funzione può scrivere perché il suo owner è `postgres`, lo STESSO owner di
--    `lavoro_crea_atomico` che scrive quelle righe ogni giorno. Verificato sul
--    catalogo, non dedotto.

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
    tipo_dispositivo, descrizione, note_interne,
    colore_dente, denti_coinvolti, arcata,
    -- ⬇️ AGGIUNTA G1 — il default di caso dell'ondata (a). Senza queste due
    --    colonne il rifacimento per 'colore_sbagliato' nasceva senza colore.
    --    I due vincoli su `lavori` reggono per costruzione: la coppia arriva da
    --    un lavoro che li rispetta già — `lavori_colore_caso_coppia_ck`
    --    (entrambe null o entrambe valorizzate) è preservato dalla copia
    --    congiunta, e `lavori_colore_caso_fk` perché la coppia esiste in
    --    `colori_dentali` per il lavoro di partenza (entrambi i vincoli sono
    --    convalidated=true, quindi nessuna riga preesistente li viola).
    colore_scala, colore_codice,
    -- ⬇️ AGGIUNTA G1 — coerenza con le righe clonate qui sotto. La funzione
    --    copiava `denti_coinvolti` e NON queste due: prima non si notava perché
    --    non c'erano righe: ora una riga clonata con ruolo='mancante' contro un
    --    `lavori.denti_mancanti` vuoto sarebbe una contraddizione INTRODOTTA da
    --    questa stessa migration. Le tre colonne vanno mosse insieme, come già
    --    fanno le altre due RPC (20260727120300).
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
    v_lavoro.tipo_dispositivo, v_lavoro.descrizione, p_note,
    -- 🛑 `colore_dente` NON si toglie: `main` la legge ancora in produzione.
    --    La rimozione è dell'ondata (c). Vedi il cappello di questo file.
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

  -- ⬇️ AGGIUNTA G1 — LA CLONAZIONE DELLE RIGHE.
  -- Ogni colonna del dato clinico viaggia: `fdi`, `ruolo`, il ponte
  -- (`gruppo`/`gruppo_ruolo`, forma riservata dall'ondata (a)), la coppia del
  -- colore e le tre zone del ceramista.
  --
  -- 🔴 `provenienza` si CONSERVA, non si forza. La colonna esiste perché il
  --    precheck di consegna possa dire «questo colore non è mai stato
  --    confrontato con la prescrizione» (20260727120100:38-42): riscriverla a
  --    'prescritto' farebbe dichiarare al rifacimento che il dentista ha
  --    prescritto un colore che in realtà il laboratorio aveva eseguito, e
  --    riscriverla a 'eseguito' direbbe il contrario. Un rifacimento eredita la
  --    storia del lavoro da cui nasce; non ne inventa una nuova.
  --
  -- `id`, `created_at` e `updated_at` NON si copiano: sono righe nuove e i
  -- DEFAULT dicono la verità su quando sono nate.
  --
  -- La FK COMPOSITA (lavoro_id, laboratorio_id) → lavori (id, laboratorio_id)
  -- regge: il lavoro nuovo è stato appena creato con
  -- `v_lavoro.laboratorio_id`, lo stesso su cui filtra la WHERE qui sotto —
  -- una riga non può portare il laboratorio di un altro tenant.
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
  --    COPIANO dall'originale (sopra). Non è una scorciatoia, è l'unica opzione
  --    corretta finché convivono due mondi. Oggi in banca dati ci sono 294
  --    lavori e ZERO righe in `lavori_denti`: un ricalcolo produrrebbe '{}' e
  --    CANCELLEREBBE il `denti_coinvolti` che `main` stampa ancora sulla
  --    Dichiarazione. Dove le righe invece esistono, copia e ricalcolo danno lo
  --    stesso identico risultato — le altre due RPC mantengono quelle colonne
  --    esattamente come `array_agg(fdi ORDER BY fdi)` per ruolo. La copia è
  --    quindi il ramo strettamente più sicuro dei due.

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

COMMENT ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) IS
  'Crea il lavoro di rifacimento copiando dal lavoro originale. TERZA penna su lavori_denti insieme a lavoro_crea_atomico e lavoro_denti_sostituisci_atomica: clona le righe dei denti conservando provenienza, e copia il default di caso colore_scala/colore_codice. colore_dente resta copiata finché main la legge in produzione — si toglie nell''ondata (c).';

-- ============ Permessi: firma identica alla definizione ============
-- Ri-emessi per non dipendere dal fatto che CREATE OR REPLACE conservi l'ACL.
-- 🛑 MAI `GRANT ... TO authenticated` qui (come fa il testo stale di `007`):
--    disferebbe l'hardening di 20260704180000.
REVOKE EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) TO service_role;
