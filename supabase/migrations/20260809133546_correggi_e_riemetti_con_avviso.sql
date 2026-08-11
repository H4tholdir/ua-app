-- supabase/migrations/20260809133546_correggi_e_riemetti_con_avviso.sql
-- Ondata «l'avviso al dentista», Task 2:
-- L'AVVISO NASCE DENTRO LA TRANSAZIONE DELLA RIEMISSIONE.
-- Piano: docs/superpowers/plans/2026-08-09-avviso-al-dentista.md, righe 192-251.
--
-- 🛑 LA FIRMA NON CAMBIA (sei parametri, `RETURNS json`): cambia il corpo, che
--    guadagna UN SOLO `INSERT` come ULTIMA scrittura. Verificato dopo
--    l'applicazione con `pg_get_function_arguments` nome per nome, perché
--    `src/lib/pdf/generate-ddc.ts:634-645` chiama per NOME di argomento via
--    PostgREST e `tsc` non vede i nomi degli argomenti di una funzione SQL.
--
-- 🛑 MIGRATION NUOVA, e non una modifica alle CINQUE già applicate e registrate
--    (20260808093513, 20260808103515, 20260808112700, 20260808142358,
--    20260808154033): toccarle disallineerebbe i file dal catalogo vivo.
--
-- 📌 IDIOMA: `DROP` -> `CREATE` -> `REVOKE` -> `GRANT` -> `COMMENT`, lo stesso
--    delle cinque precedenti. Il `REVOKE` è PORTANTE: dopo un `DROP`+`CREATE`
--    Postgres concede `EXECUTE` a `PUBLIC`. Il `COMMENT` va RIEMESSO perché il
--    `DROP` se lo porta via, e questo `COMMENT` è dichiarato portante dal corpo
--    stesso della funzione («*il `COMMENT` in fondo porta la tabella
--    chiave -> destinazione*»): perderlo cancellerebbe la mappa delle sei voci.
--
-- ═══ COME È STATO COSTRUITO QUESTO FILE, E PERCHÉ COSÌ ═══════════════════════
--
-- Il corpo NON è stato ribattuto a mano. È stato ricopiato meccanicamente dalla
-- migration 20260808154033 con un innesto in un punto solo, e la prova che il
-- risultato non ha perso niente è un `diff` fra il catalogo vivo PRIMA e DOPO
-- l'applicazione: le sole righe aggiunte sono quelle dell'`INSERT` nuovo.
-- 🔑 Il motivo è misurato, non prudenziale: il corpo porta NOVE `RAISE` di
--    difesa (chiavi ignote, le due colonne che `p_nuova` non decide, la coppia
--    anno+progressivo indivisibile, la forma del carico dei denti, il
--    fail-closed dell'annullo, la prova d'atterraggio su `lavori`) e NESSUNO di
--    essi ha una prova d'integrazione. Ribattendo 354 righe per aggiungerne
--    otto, una difesa persa non avrebbe fatto arrossire niente.
--
-- 🔴 IL PIANO INDICA IL FILE SBAGLIATO DA CUI LEGGERE. Il Task 2 dice «apri
--    prima 20260808093513_correggi_e_riemetti_atomica.sql»: quel file è stato
--    SUPERATO quattro volte e porta un'allowlist di OTTO chiavi
--    (`paziente_nome_snapshot` e `numero_prescrizione` compresi). Ricopiare il
--    corpo da lì avrebbe RIAPERTO due voci chiuse da D319 e D320 per ragioni
--    normative (Allegato XIII punto 1) e rimesso in vita la penna che D320
--    toglie. La verità è il catalogo vivo; fra i file, l'ultimo è
--    20260808154033.
--    provato: `diff` fra il corpo di 20260808154033 e `pg_get_functiondef` del
--             catalogo vivo → 0 righe di differenza su 354.
--
-- 🔴 E IL PIANO PRESUME UNA VARIABILE CHE NON ESISTE. Il Passo 4 propone
--    `v_nuova_ddc_id`: nel corpo vivo NON c'è nessuna variabile scalare con
--    l'identificativo della dichiarazione nuova, sotto nessun nome. L'id vive
--    dentro il record `v_nuova public.dichiarazioni_conformita%ROWTYPE`, gli
--    viene messo dalla voce `'id', gen_random_uuid()` del `jsonb_build_object`
--    dato in pasto a `jsonb_populate_record`, e si rilegge come `v_nuova.id`
--    (la stessa espressione che il `RETURN` usa per `nuova_id`).
--
-- ═══ CHE COSA CAMBIA ════════════════════════════════════════════════════════
--
-- Un `INSERT` in `public.avvisi_dentista`, ULTIMA istruzione prima del `RETURN`.
-- Il resto è identico. Le ragioni di ogni scelta stanno accanto al blocco.
--
-- ⚖️ `campi_corretti` RESTA LIBERO IN BANCA DATI — decisione di questo task, e
--    il motivo NON è «meno vincoli è meglio»:
--    ① UN `CHECK` CHE ELENCA LE SEI VOCI DI OGGI ROMPEREBBE LA STORIA. Le voci
--       sono già passate da otto a sette a sei in due giorni (D319, D320). Il
--       giorno in cui la settima cade, ogni `UPDATE` su un avviso VECCHIO che
--       la nomina fallirebbe — compreso l'`UPDATE` che lo segna «comunicato».
--       Un registro dell'Art. 19 GDPR deve poter continuare a dire che cosa fu
--       corretto ALLORA, anche quando il vocabolario di oggi è più corto.
--    ② IL CANCELLO C'È GIÀ, E ARRIVA PRIMA DI OGNI SCRITTURA. Questa stessa
--       funzione ALZA su qualunque chiave fuori da `c_su_lavori || c_su_penne`,
--       molto prima dell'annullo: `campi_corretti` è un sottoinsieme delle sei
--       per costruzione. Un `CHECK` sarebbe la QUARTA copia dello stesso elenco
--       (costante TypeScript, letterale in un test unitario, allowlist qui) —
--       e questo corpo rifiuta per iscritto le seconde copie della stessa
--       verità (v. il commento su ④c).
--    ➡️ Al posto del vincolo, una prova che guarda il VIVO: la ⑤ di
--       `tests/integration/correggi-e-riemetti-con-avviso.rpc.test.ts` legge le
--       sei ammesse dal messaggio d'errore della funzione VERA e le confronta
--       con `CAMPI_CORREGGIBILI_DOCUMENTO`. Finora il confronto esisteva solo
--       fra la costante e un elenco scritto a mano in
--       `tests/unit/correzioni-documento.test.ts:67`, cioè fra due copie che si
--       aggiornano insieme solo se qualcuno se ne ricorda.
--
-- ⚠️ FUORI MANDATO, RIFERITO E NON TOCCATO (R-E2):
--   · `avvisi_dentista` non è nominata in `admin_delete_laboratorio`, quindi il
--     conteggio che quella funzione restituisce tace su di essa (già nella
--     revisione del Task 1).
--   · `cliente_id` e `dichiarazione_id` di `avvisi_dentista` sono `ON DELETE
--     CASCADE` nel catalogo vivo, dove il piano (riga ~100) scriveva `RESTRICT`:
--     cancellare una dichiarazione porta via in silenzio la prova che il
--     dentista fu avvisato.
--   · `anon` e `authenticated` hanno `SELECT` su `avvisi_dentista` (§2① della
--     revisione del Task 1): resta aperto.

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
  -- 🧬 L'ALLOWLIST — SETTE NOMI SCRITTI A MANO, e il `COMMENT` in fondo porta la
  --    tabella chiave -> destinazione. ⚠️ Qui NON si puo' usare il controllo del
  --    modello («le colonne di dichiarazioni_conformita»): due di queste voci
  --    non sono colonne di `lavori`, e nessuna e' colonna della dichiarazione.
  -- ⚖️ ERANO OTTO FINO A D319 (`numero_prescrizione`) E SETTE FINO A D320
  --    (`paziente_nome_snapshot`, 08/08/2026): ogni nome e' uscito da
  --    `c_su_lavori` con la sua riga dall'`UPDATE` piu' sotto. I due posti si
  --    tolgono INSIEME: togliere il nome e lasciare la riga del `SET`
  --    lascerebbe un'assegnazione morta (innocua ma bugiarda, perche' riscrive
  --    la colonna col proprio valore), togliere la riga e lasciare il nome
  --    farebbe alzare la prova d'atterraggio piu' sotto a ogni chiamata che lo
  --    mandasse — cioe' un dato accettato e mai salvato.
  -- 🎯 D320 — la destinazione di `paziente_nome_snapshot` e' `pazienti.nome` /
  --    `pazienti.cognome` via `PATCH /api/pazienti/[id]`: il nome si corregge
  --    dove vive, e da li' arriva al documento col ripiego di generate-ddc.ts:304.
  c_su_lavori CONSTANT text[] := ARRAY[
    'richiedente_nome', 'paziente_id',
    'tipo_dispositivo', 'descrizione'];
  c_su_penne  CONSTANT text[] := ARRAY['denti_coinvolti', 'prescrizione_caratteristiche'];

  -- 🧬 LE DUE COLONNE CHE `p_nuova` NON PUO' PORTARE (Task C-bis · C0 · C1).
  --    Sono colonne vere di `dichiarazioni_conformita`, quindi il controllo qui
  --    sotto («e' una colonna?») le lasciava passare: e' una LISTA A PARTE proprio
  --    perche' il criterio che le esclude non e' la loro esistenza, e' chi ha il
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
  -- ⚖️ Da D319 è QUESTA riga a rifiutare `numero_prescrizione` e da D320
  --    `paziente_nome_snapshot`, e il messaggio porta con sé l'elenco delle SEI
  --    ammesse: chi li manda legge subito che non sono più voci del documento,
  --    invece di vederli sparire.
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

  -- ─── C1-bis · LA COPPIA DA CUI IL NUMERO SI DERIVA È INDIVISIBILE ──────────
  -- 🛑 O tutte e due le chiavi, o nessuna. Non «pretendi l'anno quando c'è il
  --    progressivo»: il difetto ha DUE versi e quella regola ne chiuderebbe uno.
  --    Chi ne manda una sola si prende l'altra dalla dichiarazione VECCHIA, in
  --    silenzio, e ottiene un numero plausibile e sbagliato — con `esito: ok`.
  --    provato: vecchia a 2098/998001 → `{'progressivo_ddc':999005}` da solo
  --    produceva `DDC-2098-999005` (anno ereditato); `{'anno_ddc':2099}` da solo
  --    produceva `DDC-2099-998001`, un progressivo mai prenotato per il 2099 e
  --    che non collide con niente.
  -- 📌 Il caso «nessuna delle due» NON passa di qui e non deve: la nuova eredita
  --    entrambe, e l'INSERT sbatte rumorosamente su
  --    `dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key` (23505).
  --    Questa guardia sorveglia la mezza mandata, che è l'unica muta.
  -- ⚠️ Guarda la PRESENZA delle chiavi, non i loro valori: `?` è vero anche per
  --    una chiave che vale `null`. Quel caso muore più sotto, fail-closed, su
  --    `23502` in `numero_ddc` (rilievo M2 della revisione del C-bis, fuori da
  --    questo mandato e riferito).
  IF (p_nuova ? 'anno_ddc') IS DISTINCT FROM (p_nuova ? 'progressivo_ddc') THEN
    RAISE EXCEPTION 'atto unico: anno_ddc e progressivo_ddc sono INDIVISIBILI, e ne è arrivata una sola (%). Da quella coppia si deriva numero_ddc: mandandone una sola, l''altra si eredita in silenzio dalla dichiarazione superata e il numero che ne esce è plausibile e sbagliato, con esito ok. ➡️ Manda TUTTE E DUE le chiavi, coi valori con cui hai STAMPATO il PDF — è ciò che costruisciDichiarazione già produce insieme (src/lib/pdf/generate-ddc.ts:234-236)',
      CASE WHEN p_nuova ? 'anno_ddc' THEN 'anno_ddc' ELSE 'progressivo_ddc' END;
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

  -- ─── ④a le QUATTRO voci che vivono su `lavori` ────────────────────────────
  -- ⚖️ Erano SEI fino a D319 (`numero_prescrizione`) e CINQUE fino a D320
  --    (`paziente_nome_snapshot`): ogni nome è uscito dall'allowlist e da questo
  --    `SET` nello stesso gesto.
  -- 🛑 E la riga tolta NON era una scrittura di una correzione: `v_lavoro_atteso`
  --    nasce da `jsonb_populate_record(v_lavoro_prima, v_patch_lavori)`, quindi
  --    con la chiave fuori dall'allowlist quel valore è SEMPRE quello già in riga
  --    — la copia del valore su sé stesso. Toglierla è sicuro perché la prova
  --    d'atterraggio qui sotto scorre `jsonb_each(v_patch_lavori)`, cioè le sole
  --    chiavi ARRIVATE: una chiave che non può più arrivare non viene guardata.
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
  --    📌 E da C-ter in poi l'ereditarietà della coppia è o TOTALE o NULLA: la
  --    guardia in alto rifiuta la mezza mandata, che era l'unica muta.
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

  -- ─── ⑥ IL PROMEMORIA AL DENTISTA, DENTRO QUESTA STESSA TRANSAZIONE ─────────
  -- 🛑 QUI E NON PRIMA, e non è una preferenza: `avvisi_dentista.dichiarazione_id`
  --    punta alla dichiarazione NUOVA e la chiave esterna NON è differibile
  --    (misurato: `pg_constraint.condeferrable = false` su tutte e cinque le
  --    chiavi di quella tabella). Inserire l'avviso prima della riga qui sopra
  --    darebbe `23503`. Conseguenza da tenere presente leggendo le prove: NON
  --    esiste, dal contratto pubblico, un guasto raggiungibile DOPO questa riga.
  -- 🔑 PERCHÉ `VALUES` E NON `INSERT … SELECT FROM lavori`. La riga del lavoro è
  --    già stata letta e BLOCCATA a ① (`v_lavoro_prima`, `FOR UPDATE`), e
  --    `cliente_id` non è fra le sei voci correggibili, quindi non può essere
  --    cambiato da questa transazione. Un secondo `SELECT` sarebbe non solo
  --    inutile: se non trovasse la riga inserirebbe **ZERO righe in silenzio** —
  --    cioè una riemissione senza il suo promemoria, con esito `ok`, che è
  --    esattamente ciò che questo blocco esiste per rendere impossibile. Con
  --    `VALUES` il caso non esiste e non serve una guardia che lo cerchi.
  -- 🔑 `ORDER BY k` NON È COSMETICA. `jsonb` conserva le chiavi ordinate per
  --    LUNGHEZZA e poi per byte, quindi `ARRAY(SELECT jsonb_object_keys(…))`
  --    restituisce l'ordine di come è fatto jsonb, non un ordine scelto.
  --    provato: ARRAY(SELECT jsonb_object_keys('{"denti_coinvolti":[],"descrizione":"x"}'))
  --             → {descrizione,denti_coinvolti}   (lunghezza: 11 prima di 15)
  --             con ORDER BY k                    → {denti_coinvolti,descrizione}
  --    Quell'elenco finisce in un messaggio a un dentista: il suo ordine non può
  --    dipendere da un dettaglio di memorizzazione.
  -- 🔑 `v_correzioni` E NON `p_correzioni`: è la forma normalizzata
  --    (`COALESCE(p_correzioni,'{}')`) e passa dai controlli qui sopra, che hanno
  --    già rifiutato ogni chiave fuori dalle sei ammesse. `campi_corretti` è
  --    quindi un sottoinsieme delle sei per costruzione, senza un secondo elenco.
  -- ⚠️ FRAGILITÀ DICHIARATA: l'inserimento riesce perché questa funzione è
  --    `SECURITY DEFINER` di `postgres`, proprietario della tabella, e
  --    `avvisi_dentista` NON ha `FORCE ROW LEVEL SECURITY`
  --    (misurato: `relforcerowsecurity = false`). Accenderlo romperebbe questa
  --    riga, perché una politica di `INSERT` non esiste per scelta (piano riga
  --    148). Chi la accende deve aggiungere quella politica nello stesso gesto.
  INSERT INTO public.avvisi_dentista
    (laboratorio_id, lavoro_id, cliente_id, dichiarazione_id, campi_corretti)
  VALUES (
    p_laboratorio_id,
    p_lavoro_id,
    v_lavoro_prima.cliente_id,
    v_nuova.id,
    ARRAY(SELECT k FROM jsonb_object_keys(v_correzioni) AS k ORDER BY k)
  );

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
  'p_correzioni ammette SEI chiavi, e ognuna ha una destinazione: '
  'richiedente_nome · paziente_id · tipo_dispositivo · descrizione → colonne '
  'di lavori (UPDATE qui dentro); '
  'denti_coinvolti → lavoro_denti_sostituisci_atomica (array di OGGETTI '
  '{fdi, ruolo, …}, non di stringhe FDI: la colonna lavori.denti_coinvolti è '
  'una denormalizzazione e la penna la tiene in sincronia); '
  'prescrizione_caratteristiche → lavoro_prescrizione_correggi_typo, oggetto le '
  'cui sotto-chiavi la penna valida (elementi · colore · tipo). '
  'Ogni altra chiave ALZA: una chiave accettata e instradata da nessuna parte '
  'sarebbe un dato che smette di salvarsi in silenzio. '
  '⚖️ ERANO OTTO FINO A D319 (08/08/2026): numero_prescrizione è USCITO, e la '
  'ragione è normativa — l''Allegato XIII punto 1, sulla prescrizione, chiede il '
  'NOME di chi ha prescritto (e, se del caso, dell''istituzione sanitaria) e le '
  'CARATTERISTICHE indicate nella prescrizione: un numero non compare fra gli '
  'otto trattini, quindi non sta sul documento e non c''è niente da correggere. '
  'La sua destinazione è NESSUNA, e per scelta: lavori.numero_prescrizione resta '
  'in banca dati e da oggi non ha più né lettori né scrittori (l''ultimo lettore '
  'era generate-ddc.ts, l''ultimo scrittore era l''UPDATE di questa funzione); '
  'lavori_prescrizioni.numero_prescrizione resta invece SCRIVIBILE da POST '
  '/api/lavori e clonata dal rifacimento — non alimenta più la dichiarazione, ma '
  'non è orfana, e chiuderle la porta è una decisione a sé; '
  'dichiarazioni_conformita.prescrizione_id perde il suo unico scrittore e resta '
  'orfana (0 righe valorizzate su 6). '
  '⚖️ ED ERANO SETTE FINO A D320 (08/08/2026): paziente_nome_snapshot è USCITO, '
  'e la ragione è che LO SNAPSHOT VINCE. generate-ddc.ts:304 legge '
  'paziente_nome_snapshot ?? paziente.nome_cognome ?? paziente.codice_paziente: '
  'scriverlo da qui congelerebbe sul lavoro un nome che l''anagrafica non governa '
  'più, e ogni correzione futura in anagrafica non arriverebbe su quel documento. '
  '🎯 LA SUA DESTINAZIONE È SCRITTA: pazienti.nome / pazienti.cognome via PATCH '
  '/api/pazienti/[id] (la via dell''Art. 16 GDPR, a schermo PazienteEditSheet su '
  '/pazienti/[id]) — chi ha sbagliato PERSONA continua a usare paziente_id, che '
  'resta qui; chi ha sbagliato a SCRIVERE IL NOME lo corregge dove il nome vive. '
  '⚠️ E quella destinazione vale esattamente quando lo snapshot è NULLO (298 '
  'lavori su 299 l''08/08/2026): dove lo snapshot c''è, la correzione in '
  'anagrafica non arriva perché lo snapshot vince e nessun trigger propaga — '
  'riferito, non chiuso qui, perché togliere il ripiego è una decisione a sé. '
  '📌 La colonna NON è un cimitero come lavori.numero_prescrizione: ha ~40 lettori '
  'vivi (dichiarazione, precheck MDR, etichetta, buono, ricevuta, IFU, portale, '
  'agenda, esportazione, indice GIN di ricerca). Perde l''ULTIMA PENNA: da questa '
  'migration nessuna funzione del catalogo e nessuna rotta la scrive più. '
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
  '🛑 E LA COPPIA anno_ddc + progressivo_ddc È INDIVISIBILE (Task C-ter): o si '
  'mandano tutte e due, o nessuna delle due — chi ne manda UNA SOLA viene '
  'rifiutato. Ereditarne una sola dalla dichiarazione superata produce un numero '
  'plausibile e sbagliato con esito ok, e in nessuno dei due versi collide con '
  'un vincolo: provato, con la vecchia a 2098/998001, il solo progressivo_ddc '
  'dava DDC-2098-999005 (anno vecchio) e il solo anno_ddc dava DDC-2099-998001 '
  '(progressivo mai prenotato per quell''anno). Mandarne ZERO invece fallisce da '
  'sé, rumorosamente, su '
  'dichiarazioni_conformita_laboratorio_id_anno_ddc_progressiv_key (23505): per '
  'questo la regola è «o entrambe o nessuna» e non «entrambe sempre». '
  '⚠️ La guardia guarda la PRESENZA delle chiavi, non i valori: {"anno_ddc":null} '
  'la supera e muore più sotto su 23502 in numero_ddc — fail-closed, ma con un '
  'messaggio che nomina una colonna che il chiamante non ha toccato. '
  'Esiti gentili (tutti PRIMA di qualsiasi scrittura): non_trovato · conflitto · '
  'evento_non_valido · paziente_non_valido · senza_prescrizione · '
  'nessuna_dichiarazione_viva. Dopo l''annullo si alza soltanto. '
  '⑥ E DAL 09/08/2026 LA FUNZIONE FA NASCERE ANCHE IL PROMEMORIA AL DENTISTA: '
  'una riga in avvisi_dentista (stato «da_comunicare», dichiarazione_id = la '
  'NUOVA, campi_corretti = le chiavi di p_correzioni ORDINATE con ORDER BY, '
  'perché l''ordine naturale di jsonb è per lunghezza e finirebbe in un messaggio '
  'a un dentista). Sta DENTRO questa transazione per un motivo sostanziale: non '
  'può esistere una riemissione senza il suo promemoria (GDPR Art. 19 + Art. 5(2); '
  'D317, D331-D339). È l''ULTIMA scrittura, e non per stile: la chiave esterna '
  'verso la dichiarazione nuova non è differibile, quindi l''avviso non può '
  'precederla — e quindi nessun guasto del contratto pubblico è raggiungibile '
  'dopo di essa. Usa la riga di lavori GIÀ BLOCCATA a ① e non un secondo SELECT: '
  'un INSERT…SELECT che non trovasse la riga inserirebbe ZERO righe IN SILENZIO, '
  'cioè una riemissione senza avviso con esito ok.';
