-- supabase/migrations/20260808093513_correggi_e_riemetti_atomica.sql
-- Ondata «correggi e rifai la dichiarazione», Task B — L'ATTO UNICO IN BANCA DATI.
-- Piano: docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md
--
-- ═══ IL DIFETTO CHE QUESTA MIGRATION CHIUDE ══════════════════════════════════
-- Un lavoro consegnato ha una dichiarazione viva. Un refuso su un dato STAMPATO
-- oggi non si corregge in nessun momento: non PRIMA (il cancello D308 risponde
-- 422), non DURANTE (`riemetti_ddc_atomica` annulla e inserisce nella stessa
-- transazione), non DOPO (la nuova nasce già viva). L'unico percorso che
-- funziona dichiara «il manufatto non è mai uscito dal laboratorio» — cioè
-- MENTE su un manufatto realmente consegnato (D293).
-- ➡️ Serve un atto solo che apra la finestra e ci scriva dentro: annulla,
--    corregge, riemette. O tutto, o niente.

-- ═══ ① L'INDICE CHE RENDE L'EVENTO MONOUSO ═══════════════════════════════════
--
-- 🔑 PERCHÉ È EFFICACE, e la ragione è precisa: `riemetti_ddc_atomica` — e da
--    oggi anche la funzione qui sotto — scrive `annullata_da_evento_id =
--    p_evento_id` sulla dichiarazione VECCHIA. Un secondo tocco (o un
--    ritentativo dopo un timeout) annullerebbe un'ALTRA riga con lo STESSO
--    evento: con questo indice diventa un `23505` riconoscibile invece di una
--    seconda riemissione che brucia un secondo progressivo.
--    🛑 Se una funzione futura annullasse SENZA scrivere quella colonna,
--    l'indice tornerebbe decorativo: la colonna non è un ornamento, è il
--    gancio del vincolo.
--
-- ⚠️ CENSIMENTO PRIMA DI CREARLO — e la riga del piano andava CORRETTA.
--    Il piano diceva «P2: 0 doppioni → l'indice si crea». Misurato l'08/08/2026:
--    `annullata_da_evento_id` è NULL su TUTTE e 6 le righe (e `sostituisce_id`
--    pure), cioè `riemetti_ddc_atomica` non è MAI stata eseguita sul banco.
--    provato: SELECT count(*) FROM dichiarazioni_conformita
--             WHERE annullata_da_evento_id IS NOT NULL → 0 su 6.
--    ➡️ P2 era vera PER VACUITÀ: «zero doppioni» non provava l'applicabilità ai
--    dati, provava che dati non ce n'erano. L'indice resta la scelta giusta, ma
--    per la ragione scritta sopra, non perché i dati l'abbiano dimostrata.
--
-- ⚠️ PARZIALE, come `rifacimento_evento_unique` (20260807180314:46):
--    `annullata_da_evento_id` è nullable perché il vecchio percorso a 10 minuti
--    (`annulla_consegna_atomica`) non ha una causale e non l'avrà. Un UNIQUE
--    pieno non li disturberebbe comunque, ma il parziale DICHIARA l'intenzione
--    invece di appoggiarsi a un dettaglio della semantica dei NULL.
--
-- 🟠 EFFETTO SU UNA FUNZIONE FUORI DAL MIO MANDATO, dichiarato invece che
--    scoperto: `riapri_lavoro_atomica` scrive la stessa colonna. La sequenza
--    «riapri → riconsegna → riapri di nuovo CON LO STESSO evento» oggi
--    riesce, da qui in poi darebbe 23505. Rischio reale basso (l'interfaccia
--    conia un evento nuovo a ogni giro), e l'invariante che l'indice afferma —
--    UN evento annulla AL PIÙ UNA dichiarazione per laboratorio — è quella
--    voluta. Riferito nel resoconto del Task B, non «corretto» di nascosto.

CREATE UNIQUE INDEX IF NOT EXISTS ddc_evento_annulla_unique
  ON public.dichiarazioni_conformita (laboratorio_id, annullata_da_evento_id)
  WHERE annullata_da_evento_id IS NOT NULL;

COMMENT ON INDEX public.ddc_evento_annulla_unique IS
  'UN evento di qualità annulla AL PIÙ UNA dichiarazione per laboratorio. '
  'Rende monouso il tocco che riemette: un secondo invio con lo stesso evento '
  'è un 23505 invece di una seconda riemissione che brucia un progressivo. '
  'Vale per riemetti_ddc_atomica, correggi_e_riemetti_atomica e riapri_lavoro_atomica.';

-- ═══ ② L'ATTO UNICO ══════════════════════════════════════════════════════════
--
-- 🛑 PERCHÉ NON CHIAMA `riemetti_ddc_atomica` E NE RIBATTE IL CORPO.
--    Non è pigrizia né duplicazione gratuita: l'ordine dei passi lo IMPONE.
--    `lavoro_prescrizione_correggi_typo` contiene, misurato sul catalogo vivo
--    l'08/08/2026 con `pg_get_functiondef`:
--
--        IF EXISTS (SELECT 1 FROM dichiarazioni_conformita
--                    WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab
--                      AND stato <> 'annullata')
--          THEN RETURN json_build_object('esito', 'congelata');
--
--    col commento «il typo si corregge annullando la dichiarazione, non
--    riscrivendo la storia sotto di essa». ➡️ Le correzioni possono passare
--    SOLO nella finestra fra l'annullo e l'inserimento della nuova — perché
--    anche la nuova nasce VIVA. `riemetti_ddc_atomica` fa annullo e
--    inserimento nella stessa istruzione: non si può infilare niente in mezzo,
--    quindi non si può chiamare. Il suo corpo si ribatte, e questa nota dice
--    perché, così che la prossima revisione non «unifichi» le due rompendo tutto.
--
-- 🛑 LE VOCI FUORI DA `lavori` SI CHIAMANO, MAI SI RICOPIANO.
--    `denti_coinvolti` su `lavori` è una DENORMALIZZAZIONE: la fonte è
--    `lavori_denti`, e `20260727120300:218` dichiara
--    `lavoro_denti_sostituisci_atomica` + `lavoro_crea_atomico` UNICHE PENNE
--    responsabili di tenerla in sincronia. Un `UPDATE lavori SET denti_coinvolti`
--    scritto qui farebbe divergere la tabella dalla denormalizzazione CHE IL
--    DOCUMENTO STAMPA (DdcTemplate.tsx:258 · generate-ddc.ts:97), e la
--    divergenza sarebbe silenziosa.
--    `prescrizione_caratteristiche` non è nemmeno un campo di `lavori`: vive in
--    `lavori_prescrizioni.contenuto` (jsonb), e la sua penna è
--    `lavoro_prescrizione_correggi_typo`.
--    ⚠️ La chiamata annidata sta NELLA STESSA TRANSAZIONE: l'atomicità non si
--    perde (D315). Le tre funzioni sono `SECURITY DEFINER` di proprietà
--    `postgres`, quindi la chiamata da dentro passa (utente effettivo = definer)
--    — provato con una sonda come `service_role`, non assunto.
--
-- 🛑 IL GETTONE SI RINFRESCA, E VA PASSATO AVANTI.
--    `trg_lavori_updated_at` è BEFORE UPDATE su `lavori` e fa
--    `NEW.updated_at = now()`; entrambe le penne confrontano il gettone SU
--    `lavori` (non sulla propria tabella) e restituiscono quello nuovo. Perciò
--    ogni passaggio riceve il valore di ritorno del PRECEDENTE, mai
--    `p_atteso_updated_at` d'ingresso.
--    ⚠️ CORREZIONE A UNA RIGA DEL BRIEF, misurata: dentro UNA transazione
--    `now()` è `transaction_timestamp()`, cioè COSTANTE — quindi il gettone non
--    «si rinfresca a ogni passaggio»: si muove UNA volta sola, alla prima
--    scrittura su `lavori`, e poi resta fermo. L'istruzione operativa non
--    cambia (si passa avanti il valore restituito) ed è scritta così apposta:
--    resta corretta anche se un domani il trigger passasse a
--    `clock_timestamp()`.
--
-- 🛑 DOPO LA PRIMA SCRITTURA NON SI TORNA CON UN `RETURN`, SI ALZA UN'ECCEZIONE.
--    Un `RETURN` con un esito di errore NON annulla ciò che è già stato scritto:
--    chiamata via PostgREST, ogni `rpc()` è la sua transazione e quel `RETURN`
--    COMMITTA. Un annullo committato senza la nuova lascerebbe un lavoro
--    consegnato SENZA nessuna dichiarazione viva — lo stato che nessun indice
--    può segnalare, perché «zero dichiarazioni» è legittimo per un lavoro mai
--    consegnato. Ergo: tutti gli esiti «gentili» stanno PRIMA dell'annullo;
--    da lì in poi solo `RAISE`. È la stessa disciplina di `riemetti_ddc_atomica`.
--
-- 🛑 E LA RISPOSTA DI UNA PENNA NON SI BUTTA VIA.
--    Un `PERFORM lavoro_prescrizione_correggi_typo(…)` scarterebbe il json, e
--    `congelata` / `conflitto` / `campo_non_valido` diventerebbero un nulla di
--    fatto SILENZIOSO dentro una transazione che poi committa: l'utente
--    leggerebbe «corretto» su un documento che non lo è. È lo scarto muto di
--    `src/app/api/lavori/[id]/route.ts:259-264` rifatto dentro una RPC — cioè
--    esattamente ciò che quest'ondata combatte. Si cattura, e tutto ciò che non
--    è `ok` ALZA.

DROP FUNCTION IF EXISTS public.correggi_e_riemetti_atomica(uuid,uuid,uuid,jsonb,jsonb,timestamptz);

CREATE FUNCTION public.correggi_e_riemetti_atomica(
  p_lavoro_id         uuid,
  p_laboratorio_id    uuid,
  p_evento_id         uuid,
  p_correzioni        jsonb,
  p_nuova             jsonb,
  p_atteso_updated_at timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  -- 🧬 L'ALLOWLIST — OTTO NOMI SCRITTI A MANO, e il `COMMENT` in fondo porta la
  --    tabella chiave → destinazione. ⚠️ Qui NON si può usare il controllo del
  --    modello («le colonne di dichiarazioni_conformita»): due di queste voci
  --    non sono colonne di `lavori`, e nessuna è colonna della dichiarazione.
  c_su_lavori CONSTANT text[] := ARRAY[
    'richiedente_nome', 'paziente_id', 'paziente_nome_snapshot',
    'numero_prescrizione', 'tipo_dispositivo', 'descrizione'];
  c_su_penne  CONSTANT text[] := ARRAY['denti_coinvolti', 'prescrizione_caratteristiche'];

  v_correzioni   jsonb := COALESCE(p_correzioni, '{}'::jsonb);
  v_patch_lavori jsonb;
  v_ignote       text[];
  v_gettone      timestamptz;
  v_esito        json;
  v_campo        text;
  v_rows         int;
  v_lavoro_prima public.lavori%ROWTYPE;
  v_lavoro_atteso public.lavori%ROWTYPE;
  v_lavoro_dopo  public.lavori%ROWTYPE;
  v_vecchia      public.dichiarazioni_conformita%ROWTYPE;
  v_nuova        public.dichiarazioni_conformita%ROWTYPE;
BEGIN
  -- ─── forma degli ingressi ──────────────────────────────────────────────────
  IF p_nuova IS NULL OR jsonb_typeof(p_nuova) <> 'object' THEN
    RAISE EXCEPTION 'atto unico: la dichiarazione nuova non è un oggetto';
  END IF;
  IF jsonb_typeof(v_correzioni) <> 'object' THEN
    RAISE EXCEPTION 'atto unico: le correzioni non sono un oggetto';
  END IF;

  -- ─── R-P6 · nessuna chiave si perde muta, ed è metà del compito ────────────
  -- Una chiave accettata e instradata da NESSUNA PARTE è lo scarto silenzioso
  -- di route.ts:259-264 rifatto qui dentro: l'utente legge «Salvato» su un dato
  -- che non c'è, e su una carta a valore legale.
  SELECT array_agg(k ORDER BY k) INTO v_ignote
    FROM jsonb_object_keys(v_correzioni) AS k
   WHERE k <> ALL (c_su_lavori || c_su_penne);
  IF v_ignote IS NOT NULL THEN
    RAISE EXCEPTION 'atto unico: chiavi che non sono voci correggibili del documento: % (ammesse: %)',
      v_ignote, (c_su_lavori || c_su_penne);
  END IF;

  -- Stesso controllo del modello, sulla dichiarazione nuova: `jsonb_populate_record`
  -- IGNORA IN SILENZIO le chiavi senza colonna, ed è il difetto per cui va
  -- sempre accompagnato da questa guardia.
  SELECT array_agg(k ORDER BY k) INTO v_ignote
    FROM jsonb_object_keys(p_nuova) AS k
   WHERE k NOT IN (SELECT column_name FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'dichiarazioni_conformita');
  IF v_ignote IS NOT NULL THEN
    RAISE EXCEPTION 'atto unico: chiavi che non sono colonne di dichiarazioni_conformita: %', v_ignote;
  END IF;

  -- ─── forma delle due voci che vanno alle penne ─────────────────────────────
  -- 🔑 `denti_coinvolti` PORTA IL CARICO DELLA PENNA, non il valore della
  --    colonna denormalizzata: un array di OGGETTI `{fdi, ruolo, …}`, non un
  --    array di stringhe FDI. Il nome della chiave (uguale a quello della
  --    colonna) invita all'errore, quindi lo si intercetta qui con un messaggio
  --    invece di lasciarlo diventare una violazione di NOT NULL su
  --    `lavori_denti.fdi`.
  --    ⚠️ IL SOLO `jsonb_typeof(…) = 'array'` NON BASTA, ed è stato misurato:
  --    con `["21","22"]` il controllo passava e la penna arrivava a inserire
  --    `fdi = NULL`, morendo con
  --      23502 null value in column "fdi" of relation "lavori_denti"
  --    cioè fail-closed (niente resta scritto) ma con un messaggio che parla di
  --    una tabella che il chiamante non ha nominato. Si guarda anche DENTRO
  --    l'array — è un controllo di FORMA, non un validatore di schema: la penna
  --    resta l'unica a giudicare i valori.
  IF v_correzioni ? 'denti_coinvolti' THEN
    IF jsonb_typeof(v_correzioni -> 'denti_coinvolti') <> 'array' THEN
      RAISE EXCEPTION 'atto unico: denti_coinvolti dev''essere un array di oggetti {fdi, ruolo, …} (ricevuto: %)',
        jsonb_typeof(v_correzioni -> 'denti_coinvolti');
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(v_correzioni -> 'denti_coinvolti') AS d
                WHERE jsonb_typeof(d) <> 'object' OR NOT (d ? 'fdi')) THEN
      RAISE EXCEPTION 'atto unico: denti_coinvolti porta il CARICO DELLA PENNA (oggetti {fdi, ruolo, …}), non il valore della colonna denormalizzata (ricevuto: %)',
        v_correzioni -> 'denti_coinvolti';
    END IF;
  END IF;
  IF v_correzioni ? 'prescrizione_caratteristiche'
     AND jsonb_typeof(v_correzioni -> 'prescrizione_caratteristiche') <> 'object' THEN
    RAISE EXCEPTION 'atto unico: prescrizione_caratteristiche dev''essere un oggetto (ricevuto: %)',
      jsonb_typeof(v_correzioni -> 'prescrizione_caratteristiche');
  END IF;

  -- ─── ① il lock sul lavoro, che è anche il controllo di appartenenza ────────
  SELECT * INTO v_lavoro_prima FROM lavori
   WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  v_gettone := v_lavoro_prima.updated_at;

  -- ─── ② il gettone (modello `…/denti`: NULL = «non controllare») ────────────
  IF p_atteso_updated_at IS NOT NULL AND v_gettone IS DISTINCT FROM p_atteso_updated_at THEN
    RETURN json_build_object('esito', 'conflitto', 'updated_at', v_gettone);
  END IF;

  -- ─── l'evento: nessuna riemissione senza motivo (D263) ─────────────────────
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  -- ─── il paziente dev'essere di QUESTO laboratorio ──────────────────────────
  -- 🛑 Il controllo sta QUI e non solo nella rotta: questa funzione è
  --    `SECURITY DEFINER`, cioè SCAVALCA le RLS. Un `paziente_id` di un altro
  --    laboratorio scritto da qui sarebbe una fuga di tenant di questa
  --    funzione, non della rotta che l'ha chiamata.
  --    ⚠️ Non si filtra su `pazienti.deleted_at`: correggere l'identità del
  --    paziente su un documento vecchio può legittimamente puntare a
  --    un'anagrafica archiviata. Il confine è il TENANT, non lo stato.
  IF v_correzioni ? 'paziente_id' AND jsonb_typeof(v_correzioni -> 'paziente_id') <> 'null' THEN
    PERFORM 1 FROM pazienti
     WHERE id = (v_correzioni ->> 'paziente_id')::uuid AND laboratorio_id = p_laboratorio_id;
    IF NOT FOUND THEN RETURN json_build_object('esito', 'paziente_non_valido'); END IF;
  END IF;

  -- ─── la prescrizione dev'esserci, se la si vuole correggere ────────────────
  -- Pre-volo: senza, la penna risponderebbe `senza_prescrizione` DOPO l'annullo,
  -- e a quel punto l'unica uscita onesta sarebbe un'eccezione. Meglio un esito
  -- leggibile prima di toccare qualsiasi cosa.
  IF v_correzioni ? 'prescrizione_caratteristiche'
     AND NOT EXISTS (SELECT 1 FROM lavori_prescrizioni
                      WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id) THEN
    RETURN json_build_object('esito', 'senza_prescrizione');
  END IF;

  -- ─── la dichiarazione VIVA ─────────────────────────────────────────────────
  -- `<> 'annullata'` è la STESSA definizione di `ddc_lavoro_attiva_unique`: mai
  -- un elenco di stati, che il giorno in cui il vocabolario cresce diventa muto.
  SELECT * INTO v_vecchia FROM dichiarazioni_conformita
   WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
     AND stato <> 'annullata'
   FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'nessuna_dichiarazione_viva'); END IF;

  -- ╔══════════════════════════════════════════════════════════════════════════╗
  -- ║  DA QUI IN POI SI SCRIVE. Ogni fallimento è un RAISE, mai un RETURN.     ║
  -- ╚══════════════════════════════════════════════════════════════════════════╝

  -- ─── ③ L'ANNULLO, PRIMA DELLE CORREZIONI (e l'ordine è il compito) ─────────
  -- La riga `annullata_da_evento_id = p_evento_id` è quella che rende efficace
  -- `ddc_evento_annulla_unique`: toglierla renderebbe l'indice decorativo.
  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id, updated_at = now()
   WHERE id = v_vecchia.id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  -- FAIL-CLOSED: se l'annullo non tocca niente e si tirasse dritto,
  -- l'inserimento sbatterebbe su `ddc_lavoro_attiva_unique` — o peggio, il
  -- codice a monte troverebbe la vecchia ancora viva e la restituirebbe come
  -- «riemessa»: fallire dichiarando successo, col documento VECCHIO in mano.
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'atto unico: annullo della dichiarazione % fallito (righe: %)', v_vecchia.id, v_rows;
  END IF;

  -- ─── ④a le sei voci che vivono su `lavori` ─────────────────────────────────
  SELECT COALESCE(jsonb_object_agg(k, v_correzioni -> k), '{}'::jsonb) INTO v_patch_lavori
    FROM unnest(c_su_lavori) AS k
   WHERE v_correzioni ? k;

  IF v_patch_lavori <> '{}'::jsonb THEN
    -- La riga ATTESA nasce da quella vera + le sole chiavi mandate: le colonne
    -- non nominate conservano il loro valore invece di diventare NULL.
    v_lavoro_atteso := jsonb_populate_record(v_lavoro_prima, v_patch_lavori);

    UPDATE lavori SET
      richiedente_nome       = v_lavoro_atteso.richiedente_nome,
      paziente_id            = v_lavoro_atteso.paziente_id,
      paziente_nome_snapshot = v_lavoro_atteso.paziente_nome_snapshot,
      numero_prescrizione    = v_lavoro_atteso.numero_prescrizione,
      tipo_dispositivo       = v_lavoro_atteso.tipo_dispositivo,
      descrizione            = v_lavoro_atteso.descrizione
     WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    RETURNING * INTO v_lavoro_dopo;
    v_gettone := v_lavoro_dopo.updated_at;

    -- 🛑 LA PROVA DELL'ATTERRAGGIO, DENTRO LA FUNZIONE. L'allowlist e l'elenco
    --    del `SET` sono due scritture della stessa verità e potrebbero
    --    divergere: se domani qualcuno aggiunge un nome all'allowlist e scorda
    --    la riga del `SET`, quel dato smetterebbe di salvarsi IN SILENZIO.
    --    Il confronto è fra la riga ATTESA e quella SCRITTA — entrambe passate
    --    dallo stesso record tipizzato, quindi immune alla forma testuale del
    --    valore d'ingresso.
    SELECT array_agg(e.k ORDER BY e.k) INTO v_ignote
      FROM jsonb_each(v_patch_lavori) AS e(k, v)
     WHERE to_jsonb(v_lavoro_dopo) -> e.k IS DISTINCT FROM to_jsonb(v_lavoro_atteso) -> e.k;
    IF v_ignote IS NOT NULL THEN
      RAISE EXCEPTION 'atto unico: chiavi accettate ma NON atterrate su lavori: %', v_ignote;
    END IF;
  END IF;

  -- ─── ④b i denti: si CHIAMA la penna unica ──────────────────────────────────
  IF v_correzioni ? 'denti_coinvolti' THEN
    v_esito := lavoro_denti_sostituisci_atomica(
      p_laboratorio_id, p_lavoro_id, v_correzioni -> 'denti_coinvolti', v_gettone);
    IF v_esito ->> 'esito' <> 'ok' THEN
      RAISE EXCEPTION 'atto unico: la penna dei denti ha risposto %', v_esito::text;
    END IF;
    v_gettone := (v_esito ->> 'updated_at')::timestamptz;
  END IF;

  -- ─── ④c le caratteristiche prescritte: una chiamata per sotto-chiave ───────
  -- ⚠️ L'allowlist delle sotto-chiavi (`elementi` · `colore` · `tipo`) NON si
  --    ricopia qui: sarebbe una seconda fonte della stessa verità, e
  --    divergerebbe. Si passa la sotto-chiave alla penna e si lascia rispondere
  --    lei — `campo_non_valido` diventa un'eccezione che annulla tutto.
  IF v_correzioni ? 'prescrizione_caratteristiche' THEN
    FOR v_campo IN
      SELECT k FROM jsonb_object_keys(v_correzioni -> 'prescrizione_caratteristiche') AS k ORDER BY k
    LOOP
      v_esito := lavoro_prescrizione_correggi_typo(
        p_laboratorio_id, p_lavoro_id, v_campo,
        v_correzioni -> 'prescrizione_caratteristiche' -> v_campo, v_gettone);
      IF v_esito ->> 'esito' <> 'ok' THEN
        RAISE EXCEPTION 'atto unico: la penna della prescrizione ha risposto % sul campo %', v_esito::text, v_campo;
      END IF;
      v_gettone := (v_esito ->> 'updated_at')::timestamptz;
    END LOOP;
  END IF;

  -- ─── ⑤ la nuova dichiarazione, che SUPERA la vecchia ───────────────────────
  -- Nasce DALLA VECCHIA e ne sovrascrive i campi mandati (stessa tecnica e
  -- stesse ragioni di `riemetti_ddc_atomica`).
  v_nuova := jsonb_populate_record(
    v_vecchia,
    p_nuova
      || jsonb_build_object(
           'id',             gen_random_uuid(),
           'laboratorio_id', p_laboratorio_id,
           'lavoro_id',      p_lavoro_id,
           'sostituisce_id', v_vecchia.id,
           'created_at',     now(),
           'updated_at',     now()
         )
      -- AZZERATI A MANO, ognuno per la sua ragione: descrivono la vita del
      -- documento VECCHIO e portarli avanti sarebbe affermare il falso sul nuovo.
      || jsonb_build_object(
           'annullata_da_evento_id', NULL::uuid,
           'firmata_at',             NULL::timestamptz,
           'firma_digitale_url',     NULL::text,
           'inviata_al_dentista',    false,
           'inviata_al_dentista_at', NULL::timestamptz,
           'deleted_at',             NULL::timestamptz
         )
  );

  INSERT INTO dichiarazioni_conformita SELECT v_nuova.*;

  RETURN json_build_object(
    'esito',           'ok',
    'nuova_id',        v_nuova.id,
    'vecchia_id',      v_vecchia.id,
    'numero',          v_nuova.numero_ddc,
    'numero_superato', v_vecchia.numero_ddc,
    'updated_at',      v_gettone
  );
END;
$$;

REVOKE ALL ON FUNCTION public.correggi_e_riemetti_atomica(uuid,uuid,uuid,jsonb,jsonb,timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correggi_e_riemetti_atomica(uuid,uuid,uuid,jsonb,jsonb,timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.correggi_e_riemetti_atomica(uuid,uuid,uuid,jsonb,jsonb,timestamptz) IS
  'ATTO UNICO: in una transazione sola annulla la dichiarazione viva (scrivendone '
  'la causale), corregge i dati STAMPATI del lavoro e inserisce la dichiarazione '
  'nuova che SUPERA la vecchia. O tutto, o niente. '
  'L''ordine annullo → correzioni → inserimento NON è di stile: con la '
  'dichiarazione ancora viva lavoro_prescrizione_correggi_typo risponde '
  '«congelata» e non scrive. '
  'p_correzioni ammette OTTO chiavi, e ognuna ha una destinazione: '
  'richiedente_nome · paziente_id · paziente_nome_snapshot · numero_prescrizione · '
  'tipo_dispositivo · descrizione → colonne di lavori (UPDATE qui dentro); '
  'denti_coinvolti → lavoro_denti_sostituisci_atomica (array di OGGETTI '
  '{fdi, ruolo, …}, non di stringhe FDI: la colonna lavori.denti_coinvolti è '
  'una denormalizzazione e la penna la tiene in sincronia); '
  'prescrizione_caratteristiche → lavoro_prescrizione_correggi_typo, oggetto le '
  'cui sotto-chiavi la penna valida (elementi · colore · tipo). '
  'Ogni altra chiave ALZA: una chiave accettata e instradata da nessuna parte '
  'sarebbe un dato che smette di salvarsi in silenzio. '
  'Esiti gentili (tutti PRIMA di qualsiasi scrittura): non_trovato · conflitto · '
  'evento_non_valido · paziente_non_valido · senza_prescrizione · '
  'nessuna_dichiarazione_viva. Dopo l''annullo si alza soltanto.';
