-- supabase/migrations/20260808103515_atto_unico_p_nuova_irrigidita.sql
-- Ondata «correggi e rifai la dichiarazione», Task C-bis — L'IRRIGIDIMENTO DI `p_nuova`.
-- Piano: docs/superpowers/plans/2026-08-08-correzione-e-riemissione-atto-unico.md, «Task C» (C0 · C1).
--
-- 🛑 MIGRATION NUOVA, e non una modifica a `20260808093513_correggi_e_riemetti_atomica.sql`:
--    quella è già applicata e registrata nel ledger, toccarla disallineerebbe il
--    ledger dal catalogo. Qui si ribatte la funzione INTERA (DROP → CREATE →
--    REVOKE → GRANT → COMMENT) perché `pg_get_functiondef` non conosce le
--    modifiche parziali: una funzione si sostituisce tutta o niente.
--
-- ═══ LE DUE PORTE CHE QUESTA MIGRATION CHIUDE ════════════════════════════════
--
-- La funzione validava `p_correzioni` con un'allowlist di otto nomi scritti a
-- mano, ma `p_nuova` no: lì il controllo ereditato chiedeva soltanto «è una
-- colonna di `dichiarazioni_conformita`?». Due colonne superavano quel controllo
-- e non avrebbero dovuto.
--
-- 🔴 C0 — `stato`. provato: sull'oggetto VIVO, in transazione annullata,
--    `p_nuova` con `{"stato":"annullata"}` rispondeva
--      {"esito":"ok","numero":"SONDA-2099-0002", …}
--      totali: 2 | vive: 0 | stato_lavoro: consegnato
--    cioè un lavoro CONSEGNATO senza NESSUNA dichiarazione viva, raggiunto dalla
--    porta principale invece che forzando. È lo stato che il commento della
--    funzione stessa dichiara non segnalabile da nessun indice, perché «zero
--    dichiarazioni» è legittimo per un lavoro mai consegnato
--    (`ddc_lavoro_attiva_unique` è parziale su `stato <> 'annullata'`: due righe
--    annullate non collidono).
--    📌 È EREDITATO da `riemetti_ddc_atomica`, che ha la costruzione identica e
--    OGGI NON È TOCCATA (v. il riquadro «ciò che resta aperto» in fondo).
--    📌 E oggi non ci passa nessuno: `costruisciDichiarazione` mette `stato` fra
--    le chiavi, ma questa RPC non ha ancora chiamanti (provato:
--    `grep -rn correggi_e_riemetti_atomica src/` → solo `database.types.ts`).
--    🔑 Si chiude lo stesso, perché un contratto si giudica per ciò che PERMETTE,
--    non per ciò che oggi gli si chiede.
--
-- 🔴 C1 — `numero_ddc`. provato: sull'oggetto VIVO, `p_nuova` con il numero della
--    VECCHIA e un progressivo nuovo rispondeva `ok` e lasciava
--      SONDA-2099-0001 | 999001 | annullata
--      SONDA-2099-0001 | 999002 | generata     ← STESSO NUMERO STAMPATO
--      numeri_distinti: 1 | righe: 2
--    Due documenti a valore legale con lo stesso numero. Nessun vincolo lo vede:
--    gli unici CHECK sono `ddc_no_self_ref`, `…_classe_rischio_check`,
--    `…_stato_check`, e l'unico indice unico è
--    `dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key` — NESSUNO
--    lega `numero_ddc` alla sua coppia. Omettere `progressivo_ddc` collide
--    rumorosamente; sbagliare `numero_ddc` non collide affatto.
--    🔑 La regola è la più stretta delle due possibili: non «il chiamante passi un
--    numero nuovo» (che va ricordato, quindi si dimentica), ma «`numero_ddc` si
--    DERIVA dalla coppia, dentro la funzione, e non si accetta MAI dal chiamante».
--
-- ═══ COME SI CHIUDONO, e perché in DUE modi e non in uno ═════════════════════
--
-- ① SI RIFIUTANO RUMOROSAMENTE se arrivano in `p_nuova` (non si sovrascrivono in
--    silenzio). Un override muto su `numero_ddc` sarebbe peggio del difetto per
--    un motivo misurabile: il PDF si rende e si carica PRIMA della transazione
--    (`generate-ddc.ts:457-460`) col numero già STAMPATO sopra. Sovrascriverlo
--    qui dentro produrrebbe una riga in banca dati che dice un numero e un file
--    che ne dice un altro — e nessuno se ne accorgerebbe. Rifiutare costringe il
--    chiamante a mandare la coppia con cui ha stampato.
-- ② E SI FORZANO COMUNQUE, perché rifiutare da solo non basta:
--    · `stato` — senza il valore forzato, `jsonb_populate_record` lo EREDITA
--      dalla vecchia (letta PRIMA dell'annullo). Se la vecchia era `firmata` o
--      `consegnata`, la nuova nascerebbe `firmata` con `firmata_at` NULL e
--      `firma_digitale_url` NULL: un documento che si dichiara firmato senza
--      firma. Sarebbe un difetto NUOVO, introdotto dalla chiusura di C0 — oggi
--      non si vede solo perché il chiamante manda `stato` esplicito. La nuova
--      nasce `generata`, che è ciò che `costruisciDichiarazione` scrive
--      (`generate-ddc.ts:323`) e l'unico stato coerente con i campi di firma
--      azzerati due righe più sotto.
--    · `numero_ddc` — si compone dalla coppia della riga NUOVA, dopo
--      `jsonb_populate_record`, così l'ereditarietà la decide una volta sola
--      quella funzione e non una seconda catena di COALESCE.
--
-- ⚠️ E LA COMPOSIZIONE DEVE DARE ESATTAMENTE LA STESSA STRINGA del TypeScript
--    (`generate-ddc.ts:225-226`: `DDC-${anno}-${String(progressivo).padStart(4,'0')}`),
--    o sarebbero due fonti della stessa verità. 🛑 `lpad(x, 4, '0')` NON è
--    `padStart(4,'0')`: lpad TRONCA quando la stringa è più lunga del bersaglio.
--    provato:  lpad('999002',4,'0') → '9990'        ← silenziosamente sbagliato
--              lpad('10000', 4,'0') → '1000'        ← e questo è peggio: sembra un numero
--    La forma equivalente è `greatest(4, length(…))`. provato: dieci valori
--    (0,1,7,42,999,1000,9999,10000,999002,-5) confrontati riga per riga fra
--    `node -e` e SQL → `diff` VUOTO.
--    📌 Il prefisso `DDC-` ora si compone in DUE posti (qui e
--    `generate-ddc.ts:226`), ed è una scelta dichiarata dal piano, non una svista:
--    la derivazione DEVE stare in SQL perché la RPC non conosce i suoi chiamanti
--    futuri. Chi un domani cambia il formato del numero deve cambiarlo in
--    entrambi — il `COMMENT` della funzione lo dice, così la prossima revisione
--    non «unifica» le due rompendo la stampa.
--
-- ═══ CIÒ CHE QUESTA MIGRATION NON TOCCA (R-E2) ═══════════════════════════════
--
-- Il resto del corpo è ribattuto IDENTICO al catalogo vivo: ordine annulla →
-- correggi → inserisci, fail-closed sull'annullo, allowlist delle otto voci,
-- chiamate alle penne, prova dell'atterraggio. Restano aperti e RIFERITI, non
-- corretti di nascosto:
--   · `riemetti_ddc_atomica` porta ENTRAMBI i buchi (C0 e C1) ed è quella con un
--     chiamante vivo (`riemettiDdC`, `generate-ddc.ts:463`). Da qui in poi le due
--     funzioni SEMBRANO gemelle e non lo sono più: è la cosa che una sessione
--     futura ha più probabilità di sbagliare.
--   · `p_correzioni` non rifiuta mai il VUOTO (C2, del Task C: `[]`, `null` e
--     stringhe vuote svuotano cinque voci con esito `ok`).
--   · in `p_nuova` restano accettate-e-poi-ignorate in silenzio `id`,
--     `laboratorio_id`, `lavoro_id`, `sostituisce_id`, `created_at`,
--     `updated_at`, `annullata_da_evento_id`, `firmata_at`, `firma_digitale_url`,
--     `inviata_al_dentista`, `inviata_al_dentista_at`, `deleted_at`: stessa
--     famiglia di C0/C1, ma solo due porte erano nel mandato.

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

  -- 🧬 LE DUE COLONNE CHE `p_nuova` NON PUÒ PORTARE (Task C-bis · C0 · C1).
  --    Sono colonne vere di `dichiarazioni_conformita`, quindi il controllo qui
  --    sotto («è una colonna?») le lasciava passare: è una LISTA A PARTE proprio
  --    perché il criterio che le esclude non è la loro esistenza, è chi ha il
  --    diritto di deciderle. Le decide questa funzione.
  c_nuova_vietate CONSTANT text[] := ARRAY['stato', 'numero_ddc'];

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

  -- ─── C0 · C1 · le due colonne che il chiamante NON decide ──────────────────
  -- 🛑 SI RIFIUTANO, non si sovrascrivono in silenzio.
  --    `stato`: accettarlo permetteva a `{"stato":"annullata"}` di far nascere la
  --    dichiarazione nuova GIÀ ANNULLATA, con esito `ok` — un lavoro consegnato
  --    senza nessuna dichiarazione viva, dalla porta principale.
  --    `numero_ddc`: non ha un vincolo unico proprio, quindi un numero incoerente
  --    con `anno_ddc`+`progressivo_ddc` non collide con niente e produce due
  --    documenti a valore legale con lo stesso numero stampato. Si DERIVA dalla
  --    coppia, più sotto.
  --    🔑 Perché rifiutare e non correggere zitti: il numero è già STAMPATO sul
  --    PDF, reso e caricato prima della transazione. Un override muto farebbe
  --    dire due cose diverse alla riga e al file.
  SELECT array_agg(k ORDER BY k) INTO v_ignote
    FROM jsonb_object_keys(p_nuova) AS k
   WHERE k = ANY (c_nuova_vietate);
  IF v_ignote IS NOT NULL THEN
    RAISE EXCEPTION 'atto unico: chiavi che la dichiarazione nuova NON accetta dal chiamante: % — stato lo decide questa funzione (la nuova nasce «generata»), numero_ddc si deriva da anno_ddc+progressivo_ddc', v_ignote;
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
           'updated_at',     now(),
           -- C0 — LA NUOVA NASCE `generata`, SEMPRE. Non si eredita dalla
           -- vecchia (che poteva essere `firmata`/`consegnata`: erediterebbe una
           -- firma che non c'è, visto che i campi di firma si azzerano qui
           -- sotto) e non si accetta dal chiamante (rifiutata più in alto).
           -- È il valore che scrive `costruisciDichiarazione` alla prima
           -- emissione: la riemessa nasce come nasce un documento nuovo.
           'stato',          'generata'
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

  -- ─── C1 · IL NUMERO SI DERIVA, DOPO che la riga nuova è completa ───────────
  -- 🔑 QUI e non nella catena di override: `anno_ddc` e `progressivo_ddc` della
  --    riga nuova possono venire da `p_nuova` OPPURE essere ereditati dalla
  --    vecchia, e a decidere quale dei due è `jsonb_populate_record`. Comporre
  --    il numero prima vorrebbe dire riscrivere quella regola di ereditarietà
  --    una seconda volta — cioè aprire la stessa porta che si sta chiudendo.
  --    ⚠️ E va assegnato PRIMA sia dell'INSERT sia del RETURN: il valore di
  --    ritorno `numero` legge `v_nuova.numero_ddc`, e derivarlo dentro l'INSERT
  --    farebbe scrivere il numero giusto e RIFERIRE quello vecchio.
  -- 🛑 STESSA FORMA del TypeScript (`generate-ddc.ts:226`), e non è un dettaglio:
  --    `lpad(x,4,'0')` TRONCA sopra le quattro cifre (provato: `lpad('10000',4,'0')`
  --    → `'1000'`), mentre `padStart(4,'0')` lascia intatto. `greatest(4, length(…))`
  --    è la forma equivalente — provata su dieci valori con `diff` vuoto.
  --    📌 Il formato del numero vive quindi in DUE posti: chi lo cambia li cambia
  --    tutti e due, o la riga in banca dati e il numero stampato sul PDF divergono.
  v_nuova.numero_ddc := 'DDC-' || v_nuova.anno_ddc::text || '-' ||
    lpad(v_nuova.progressivo_ddc::text,
         greatest(4, length(v_nuova.progressivo_ddc::text)), '0');

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
  'p_nuova accetta le colonne di dichiarazioni_conformita TRANNE DUE, che questa '
  'funzione decide da sé e RIFIUTA se arrivano dal chiamante (Task C-bis): '
  'stato — la nuova nasce sempre «generata», perché accettarlo permetteva a '
  '{"stato":"annullata"} di lasciare un lavoro consegnato senza NESSUNA '
  'dichiarazione viva con esito ok, e ereditarlo dalla vecchia farebbe nascere '
  'firmata una riga con firmata_at NULL; '
  'numero_ddc — si DERIVA da anno_ddc+progressivo_ddc («DDC-<anno>-<progressivo '
  'a >= 4 cifre>»), perché su quella colonna non esiste indice unico e un numero '
  'incoerente con la sua coppia non collide con niente: due documenti a valore '
  'legale con lo stesso numero stampato, ed esito ok. '
  '⚠️ Il formato del numero è lo STESSO di generate-ddc.ts:226 e vive in due '
  'posti: chi lo cambia li cambia entrambi, o la riga scritta e il numero '
  'stampato sul PDF divergono. '
  'Esiti gentili (tutti PRIMA di qualsiasi scrittura): non_trovato · conflitto · '
  'evento_non_valido · paziente_non_valido · senza_prescrizione · '
  'nessuna_dichiarazione_viva. Dopo l''annullo si alza soltanto.';
