-- 20260804152403_ondata_b_prescrizioni_rpc.sql — Ondata B, sessione ②, parte 2/3.
-- Spec §4-§7 (D212, D213, D214). NON aggiungere BEGIN;/COMMIT; — il runner
-- Supabase avvolge già la migration (N6).
--
-- `lavori_prescrizioni` è in REVOKE ALL, service_role compreso (Task 2,
-- 20260804150306:79): le UNICHE penne sono le funzioni qui sotto, tutte
-- SECURITY DEFINER SET search_path = public, pg_temp, col tenant imposto in
-- OGNI clausola WHERE (modello 20260727120300).
--
-- «DdC attiva» in questo file = esiste una riga di dichiarazioni_conformita
-- del lavoro con stato <> 'annullata' — la STESSA definizione dell'indice
-- ddc_lavoro_attiva_unique (20260710090000:16-17) e del guard di idempotenza
-- generate-ddc.ts:102. Nessun filtro su deleted_at: non lo usa nessuno dei due.
--
-- Ordine dei lock: ogni funzione prende PRIMA il FOR UPDATE sulla riga di
-- `lavori` (esistenza + tenant + serializzazione in un colpo solo, come
-- lavoro_denti_sostituisci_atomica): la riga di lavori_prescrizioni non ha
-- bisogno di un secondo lock perché ogni penna passa da qui.

-- ============ 1. lavoro_crea_atomico: firma nuova, DROP esplicito ============
-- 🛑 MAI `CREATE OR REPLACE` con firma diversa: crea un OVERLOAD (2 funzioni),
-- provato in sonda S10 (scripts/tmp/sonda-lp-r-p1.mjs). Il DROP della firma a
-- 3 parametri PRIMA del CREATE a 4 lascia UNA sola funzione; le chiamate
-- esistenti a 3 argomenti (src/app/api/lavori/route.ts:225) risolvono col
-- DEFAULT NULL del quarto parametro.
DROP FUNCTION public.lavoro_crea_atomico(uuid, jsonb, jsonb);

-- Corpo IDENTICO al vigente (20260727120300:136-215, verificato uguale al
-- catalogo vivo con pg_get_functiondef il 04/08/2026) con DUE aggiunte,
-- marcate «⬇️ AGGIUNTA B②»: istituzione_sanitaria (P37) e lo snapshot della
-- prescrizione (D214).
CREATE FUNCTION public.lavoro_crea_atomico(
  p_lab           uuid,
  p_lavoro        jsonb,
  p_denti         jsonb,
  p_prescrizione  jsonb DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_anno        integer := (p_lavoro->>'anno_lavoro')::integer;
  v_progressivo integer;
  v_numero      text;
  v_id          uuid;
BEGIN
  -- Il progressivo è race-safe e vive già in casa: si riusa, non si reinventa.
  v_progressivo := public.genera_progressivo(p_lab, 'lavoro', v_anno);
  IF v_progressivo IS NULL THEN
    RETURN json_build_object('esito', 'errore', 'dettaglio', 'progressivo non generato');
  END IF;
  v_numero := v_anno::text || '/' || lpad(v_progressivo::text, 4, '0');

  INSERT INTO lavori (
    laboratorio_id, numero_lavoro, anno_lavoro, stato,
    tipo_dispositivo, descrizione, data_consegna_prevista, ora_consegna,
    richiedente_nome, priorita, dispositivo_semilavorato, note_interne,
    cliente_id, paziente_id, tecnico_id, ciclo_id,
    classe_rischio, da_conformare, codice_iva, natura_iva, data_ingresso,
    colore_scala, colore_codice,
    -- ⬇️ AGGIUNTA B② — P37: la seconda casella dell'Allegato XIII p.1
    --    (istituzione sanitaria «se del caso»; colonna nata nel Task 2).
    istituzione_sanitaria
  ) VALUES (
    p_lab, v_numero, v_anno, 'ricevuto',
    p_lavoro->>'tipo_dispositivo',
    p_lavoro->>'descrizione',
    (p_lavoro->>'data_consegna_prevista')::date,
    NULLIF(p_lavoro->>'ora_consegna', '')::time,
    p_lavoro->>'richiedente_nome',
    COALESCE(p_lavoro->>'priorita', 'normale'),
    COALESCE((p_lavoro->>'dispositivo_semilavorato')::boolean, false),
    p_lavoro->>'note_interne',
    (p_lavoro->>'cliente_id')::uuid,
    NULLIF(p_lavoro->>'paziente_id', '')::uuid,
    NULLIF(p_lavoro->>'tecnico_id', '')::uuid,
    NULLIF(p_lavoro->>'ciclo_id', '')::uuid,
    COALESCE(p_lavoro->>'classe_rischio', 'classe_i'),
    COALESCE((p_lavoro->>'da_conformare')::boolean, true),
    COALESCE(p_lavoro->>'codice_iva', 'N4'),
    COALESCE(p_lavoro->>'natura_iva', 'N4'),
    -- Correzione ② (20260727120300, testa del file): NOT NULL senza ricaduta sul DEFAULT.
    COALESCE(NULLIF(p_lavoro->>'data_ingresso', '')::timestamptz, now()),
    p_lavoro->>'colore_scala',
    p_lavoro->>'colore_codice',
    p_lavoro->>'istituzione_sanitaria'
  ) RETURNING id INTO v_id;

  -- 🔑 Nessun BEGIN/EXCEPTION qui intorno: se questo INSERT fallisce, l'intera
  -- funzione fallisce e il lavoro NON resta orfano. È il rischio R1, ed è il
  -- motivo per cui questa funzione esiste.
  INSERT INTO lavori_denti (
    laboratorio_id, lavoro_id, fdi, ruolo,
    scala, codice, codice_collo, codice_corpo, codice_incisale, provenienza
  )
  SELECT
    p_lab, v_id,
    (d->>'fdi')::smallint,
    COALESCE(d->>'ruolo', 'elemento'),
    d->>'scala', d->>'codice',
    d->>'codice_collo', d->>'codice_corpo', d->>'codice_incisale',
    COALESCE(d->>'provenienza', 'prescritto')
  FROM jsonb_array_elements(COALESCE(p_denti, '[]'::jsonb)) AS d;

  -- Stessa denormalizzazione della RPC di sostituzione, e per la stessa
  -- ragione: la Dichiarazione di Conformità legge ancora
  -- `lavori.denti_coinvolti` fino all'ondata (c). Vedi il commento esteso in
  -- lavoro_denti_sostituisci_atomica (20260727120300:84-114).
  UPDATE lavori SET
    denti_coinvolti = COALESCE((SELECT array_agg(fdi::text ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND laboratorio_id = p_lab AND ruolo = 'elemento'), '{}'::text[]),
    denti_mancanti  = COALESCE((SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND laboratorio_id = p_lab AND ruolo = 'mancante'), '{}'::integer[]),
    denti_impianti  = COALESCE((SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND laboratorio_id = p_lab AND ruolo = 'impianto'), '{}'::integer[])
   WHERE id = v_id AND laboratorio_id = p_lab;

  -- ⬇️ AGGIUNTA B② — lo snapshot della prescrizione (D214): chiave presente =
  --    trascritta; il valore del colore resta COME DIGITATO (mai normalizzato);
  --    la chiave `tipo` NON entra qui — entra SOLO alla conferma di consegna
  --    (D213). NULL = wizard senza trascrizione: nessuna riga, non una riga
  --    vuota (V2: l'assenza è un'informazione).
  IF p_prescrizione IS NOT NULL THEN
    INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, contenuto, numero_prescrizione)
    VALUES (p_lab, v_id,
            COALESCE(p_prescrizione->'contenuto', '{}'::jsonb),
            p_prescrizione->>'numero_prescrizione');
  END IF;

  RETURN json_build_object('esito', 'ok', 'id', v_id, 'numero_lavoro', v_numero, 'stato', 'ricevuto');
END $$;

-- ============ 2. Allega/sostituisce la fonte della trascrizione ============
-- UPSERT deliberato: i lavori nati PRIMA dell'ondata B non hanno la riga di
-- lavori_prescrizioni — allegare la fonte a posteriori la crea (contenuto '{}'
-- di default: nessuna caratteristica trascritta, D101).
-- V8: senza DdC attiva la sostituzione è LIBERA; con DdC attiva la fonte già
-- presente non si cancella né si sostituisce ('fonte_congelata'); una riga
-- ANCORA senza fonte resta invece completabile anche dopo (la pezza
-- documentale non è una riscrittura).
-- «Fonte senza corpo» (fonte_tipo valorizzato, immagine e riferimento NULL)
-- NON si intercetta qui: la respinge il CHECK lavori_prescrizioni_fonte_ck
-- (23514) — fail-loud, il precheck V1 morde prima in route.
CREATE FUNCTION public.lavoro_prescrizione_allega_fonte(
  p_lab               uuid,
  p_lavoro            uuid,
  p_fonte_tipo        text,
  p_fonte_immagine_id uuid,
  p_fonte_riferimento text
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_ha_fonte boolean;
BEGIN
  PERFORM 1
    FROM lavori
   WHERE id = p_lavoro AND laboratorio_id = p_lab AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('esito', 'non_trovato');
  END IF;

  -- Le 4 forme di D202; NULL è legittimo (V7: riferimento in attesa di
  -- conferma scritta). Stessa lista del CHECK di tabella, qui per dare un
  -- esito parlante invece di un errore.
  IF p_fonte_tipo IS NOT NULL AND p_fonte_tipo NOT IN ('foglio','email','modulo','piattaforma') THEN
    RETURN json_build_object('esito', 'fonte_tipo_non_valido');
  END IF;

  SELECT (fonte_tipo IS NOT NULL OR fonte_immagine_id IS NOT NULL OR fonte_riferimento IS NOT NULL)
    INTO v_ha_fonte
    FROM lavori_prescrizioni
   WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab;

  IF COALESCE(v_ha_fonte, false) AND EXISTS (
       SELECT 1 FROM dichiarazioni_conformita
        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND stato <> 'annullata'
     ) THEN
    RETURN json_build_object('esito', 'fonte_congelata');
  END IF;

  -- Il WHERE sul tenant nel DO UPDATE è cintura e bretelle: la FK composita
  -- garantisce già che la riga di questo lavoro_id porti il laboratorio del
  -- lavoro, e il lock sopra ha già verificato che quel lavoro sia di p_lab.
  INSERT INTO lavori_prescrizioni (laboratorio_id, lavoro_id, fonte_tipo, fonte_immagine_id, fonte_riferimento)
  VALUES (p_lab, p_lavoro, p_fonte_tipo, p_fonte_immagine_id, p_fonte_riferimento)
  ON CONFLICT (lavoro_id) DO UPDATE SET
    fonte_tipo        = EXCLUDED.fonte_tipo,
    fonte_immagine_id = EXCLUDED.fonte_immagine_id,
    fonte_riferimento = EXCLUDED.fonte_riferimento
  WHERE lavori_prescrizioni.laboratorio_id = p_lab;

  RETURN json_build_object('esito', 'ok');
END $$;

-- ============ 3. Correzione di un typo della trascrizione ============
-- Gettone di concorrenza sul MODELLO ESATTO di lavoro_denti_sostituisci_atomica
-- (20260727120300:61-63): il gettone è `lavori.updated_at`, letto dal lock;
-- NULL = nessun controllo; diverso → 'conflitto' col valore corrente. E come
-- nel modello, è QUI che il gettone deve avanzare: l'UPDATE finale su lavori
-- non si delega al trigger di un'altra migration.
-- Il valore jsonb 'null' RIMUOVE la chiave («non era sulla prescrizione»,
-- contenuto - campo); anche il NULL SQL rimuove: passato a jsonb_set
-- annienterebbe l'INTERO contenuto (jsonb_set con new_value NULL restituisce
-- NULL), e un typo non può mai costare la trascrizione.
CREATE FUNCTION public.lavoro_prescrizione_correggi_typo(
  p_lab               uuid,
  p_lavoro            uuid,
  p_campo             text,
  p_valore            jsonb,
  p_atteso_updated_at timestamptz
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_updated_at timestamptz;
BEGIN
  SELECT updated_at INTO v_updated_at
    FROM lavori
   WHERE id = p_lavoro AND laboratorio_id = p_lab AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('esito', 'non_trovato');
  END IF;

  IF p_atteso_updated_at IS NOT NULL AND v_updated_at IS DISTINCT FROM p_atteso_updated_at THEN
    RETURN json_build_object('esito', 'conflitto', 'updated_at', v_updated_at);
  END IF;

  -- V8: con una DdC attiva lo snapshot è congelato — il typo si corregge
  -- annullando la dichiarazione, non riscrivendo la storia sotto di essa.
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

  IF p_campo IS NULL OR p_campo NOT IN ('elementi','colore','tipo') THEN
    RETURN json_build_object('esito', 'campo_non_valido');
  END IF;

  UPDATE lavori_prescrizioni SET
    contenuto = CASE
      WHEN p_valore IS NULL OR jsonb_typeof(p_valore) = 'null'
        THEN contenuto - p_campo
      ELSE jsonb_set(contenuto, ARRAY[p_campo], p_valore)
    END
   WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab;

  UPDATE lavori SET updated_at = now()
   WHERE id = p_lavoro AND laboratorio_id = p_lab
  RETURNING updated_at INTO v_updated_at;

  RETURN json_build_object('esito', 'ok', 'updated_at', v_updated_at);
END $$;

-- ============ 4. Registrazione di una divergenza prescritto/eseguito ============
-- V9 + D212: la divergenza NON riscrive il contenuto (quello resta ciò che il
-- dentista ha prescritto) — si APPENDE al registro, col motivo da dizionario
-- chiuso, chi e quando.
CREATE FUNCTION public.lavoro_prescrizione_registra_divergenza(
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

-- ============ 5. Conferma della trascrizione alla consegna (V5) ============
-- D213: la chiave `tipo` entra nello snapshot QUI, copiata dalla riga VIVA di
-- lavori (tipo_dispositivo, NOT NULL per schema): fino alla consegna il tipo è
-- correggibile sul lavoro e lo snapshot non deve inseguirlo; alla conferma la
-- fotografia si completa. La riconferma sovrascrive (ultima conferma vince)
-- finché non c'è una DdC attiva.
CREATE FUNCTION public.lavoro_prescrizione_conferma_consegna(
  p_lab    uuid,
  p_lavoro uuid,
  p_utente uuid
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tipo text;
  v_at   timestamptz;
BEGIN
  SELECT tipo_dispositivo INTO v_tipo
    FROM lavori
   WHERE id = p_lavoro AND laboratorio_id = p_lab AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('esito', 'non_trovato');
  END IF;

  IF NOT EXISTS (
       SELECT 1 FROM lavori_prescrizioni
        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab
     ) THEN
    RETURN json_build_object('esito', 'senza_prescrizione');
  END IF;

  IF EXISTS (
       SELECT 1 FROM dichiarazioni_conformita
        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND stato <> 'annullata'
     ) THEN
    RETURN json_build_object('esito', 'congelata');
  END IF;

  -- Il "chi" e il "quando" viaggiano insieme (lavori_prescrizioni_conferma_ck):
  -- un p_utente NULL abortisce con 23514, fail-loud — una conferma anonima non
  -- esiste.
  UPDATE lavori_prescrizioni SET
    confermata_da = p_utente,
    confermata_at = now(),
    contenuto     = jsonb_set(contenuto, '{tipo}', to_jsonb(v_tipo))
   WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab
  RETURNING confermata_at INTO v_at;

  RETURN json_build_object('esito', 'ok', 'confermata_at', v_at);
END $$;

-- ============ 6. crea_rifacimento_atomico: il clone dello snapshot ============
-- STESSA firma → CREATE OR REPLACE è corretto qui (nessun overload). Corpo
-- IDENTICO al vigente (20260728103000:78-200, verificato uguale al catalogo
-- vivo con pg_get_functiondef il 04/08/2026) con UNA aggiunta, marcata
-- «⬇️ AGGIUNTA B②»: il clone della trascrizione, FRA il clone delle righe dei
-- denti e il registro del rifacimento.
-- ⚠️ CREATE OR REPLACE conserva l'ACL ma AZZERA proconfig (trappola documentata
-- in 20260721090100 e 20260728103000): SET search_path ridichiarato qui e
-- REVOKE/GRANT ri-emessi in coda.
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
COMMENT ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb,jsonb) IS
  'Crea lavoro + denti + (se trascritta) snapshot prescrizione in una sola transazione (spec §4 rischio R1 + ondata B D214). Il quarto parametro ha DEFAULT NULL: le chiamate a 3 argomenti restano valide. NON verifica che cliente_id/paziente_id/tecnico_id/ciclo_id appartengano a p_lab: quella guardia è nella route.';
COMMENT ON FUNCTION public.lavoro_prescrizione_allega_fonte(uuid,uuid,text,uuid,text) IS
  'Allega o sostituisce la fonte della trascrizione (D202). UPSERT: i lavori nati prima dell''ondata B non hanno la riga. Con DdC attiva una fonte gia'' presente e'' congelata (V8, esito fonte_congelata); la fonte senza corpo la respinge il CHECK fonte_ck.';
COMMENT ON FUNCTION public.lavoro_prescrizione_correggi_typo(uuid,uuid,text,jsonb,timestamptz) IS
  'Corregge un typo della trascrizione (elementi/colore/tipo). Gettone di concorrenza su lavori.updated_at (modello lavoro_denti_sostituisci_atomica); jsonb null rimuove la chiave (non era sulla prescrizione). Con DdC attiva: congelata (V8).';
COMMENT ON FUNCTION public.lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid) IS
  'Appende una divergenza prescritto/eseguito al registro (V9, D212): {campo, motivo, nota, utente_id, registrata_at}, motivo da dizionario chiuso. Non tocca il contenuto. Con DdC attiva: congelata (V8).';
COMMENT ON FUNCTION public.lavoro_prescrizione_conferma_consegna(uuid,uuid,uuid) IS
  'Conferma della trascrizione alla consegna (V5): confermata_da/at server-side e chiave tipo copiata da lavori.tipo_dispositivo nello snapshot (D213). Con DdC attiva: congelata (V8).';
COMMENT ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text) IS
  'Crea il lavoro di rifacimento copiando dal lavoro originale. QUARTA penna su lavori_prescrizioni insieme alle RPC lavoro_crea_atomico / lavoro_prescrizione_*: clona le righe dei denti conservando provenienza, copia colore_scala/colore_codice, e clona la trascrizione della prescrizione (contenuto+fonte+numero) azzerando divergenze e conferma (D214). colore_dente resta copiata finche'' main la legge in produzione — si toglie nell''ondata (c).';

-- ============ Permessi: firme identiche alle definizioni ============
-- Modello 20260727120300:222-226. MAI GRANT a authenticated (l'hardening di
-- 20260704180000 non si disfa). Ri-emessi anche per crea_rifacimento_atomico:
-- CREATE OR REPLACE conserva l'ACL, ma non ci si appoggia a quel dettaglio.
REVOKE EXECUTE ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb,jsonb)                             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lavoro_prescrizione_allega_fonte(uuid,uuid,text,uuid,text)              FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lavoro_prescrizione_correggi_typo(uuid,uuid,text,jsonb,timestamptz)     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lavoro_prescrizione_conferma_consegna(uuid,uuid,uuid)                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text)                   FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb,jsonb)                             TO service_role;
GRANT  EXECUTE ON FUNCTION public.lavoro_prescrizione_allega_fonte(uuid,uuid,text,uuid,text)              TO service_role;
GRANT  EXECUTE ON FUNCTION public.lavoro_prescrizione_correggi_typo(uuid,uuid,text,jsonb,timestamptz)     TO service_role;
GRANT  EXECUTE ON FUNCTION public.lavoro_prescrizione_registra_divergenza(uuid,uuid,text,text,text,uuid)  TO service_role;
GRANT  EXECUTE ON FUNCTION public.lavoro_prescrizione_conferma_consegna(uuid,uuid,uuid)                   TO service_role;
GRANT  EXECUTE ON FUNCTION public.crea_rifacimento_atomico(uuid,text,text,numeric,text)                   TO service_role;
