-- supabase/migrations/20260808154033_atto_unico_snapshot_paziente_fuori.sql
-- Ondata «correggi e rifai la dichiarazione», Task C-sexies — D320:
-- LO SNAPSHOT DEL NOME DEL PAZIENTE ESCE DALLE VOCI CORREGGIBILI.
-- Decisione: docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md,
--            centotrentanovesima tornata (D320).
--
-- 🛑 MIGRATION NUOVA, e non una modifica alle QUATTRO gia' applicate e registrate
--    nel ledger (20260808093513, 20260808103515, 20260808112700, 20260808142358):
--    toccarle disallineerebbe i file dal catalogo vivo.
--    provato: il corpo qui sotto e' ribattuto dal file 20260808142358, che a sua
--    volta e' stato riletto da `pg_get_functiondef` e confrontato riga per riga —
--    `diff` vuoto sul corpo, differenti solo la formattazione della firma e il tag
--    del dollaro (`$$` contro `$function$`), che Postgres normalizza.
--
-- 📌 IDIOMA: `DROP` -> `CREATE` -> `REVOKE` -> `GRANT` -> `COMMENT`, lo stesso
--    delle quattro precedenti. (1) `pg_get_functiondef` non conosce le modifiche
--    parziali: una funzione si sostituisce tutta o niente, quindi il file porta
--    il corpo INTERO ed e' leggibile come la verita' di quella funzione.
--    (2) Il `REVOKE` e' PORTANTE e non cerimoniale: dopo un `DROP`+`CREATE`
--    Postgres concede `EXECUTE` a `PUBLIC`, `anon` e `authenticated` per
--    impostazione predefinita — misurato dalla revisione del C-ter.
--
-- ═══ CHE COSA CAMBIA, E PERCHE' ══════════════════════════════════════════════
--
-- `p_correzioni` passa da SETTE chiavi a SEI: esce `paziente_nome_snapshot`.
-- Con le parole di Francesco (08/08/2026): «*se ho sbagliato anagrafica di
-- paziente, e' giusto cambiare l'anagrafica, ma se il nome in anagrafica e'
-- sbagliato, non va cambiato da qua, ma va cambiato in anagrafica e poi tutto si
-- deve aggiornare di conseguenza*». Sono DUE cose diverse, e solo la prima resta
-- una voce del documento:
--   · ho sbagliato PERSONA  -> `paziente_id`, che punta a un'altra anagrafica.
--     RESTA correggibile da qui.
--   · il NOME e' scritto male -> si corregge DOVE IL NOME VIVE, cioe' in
--     anagrafica.
--
-- 🔑 IL MOTIVO TECNICO, ed e' tutta la decisione: `src/lib/pdf/generate-ddc.ts:304`
--    legge `paziente_nome_snapshot ?? paziente?.nome_cognome ??
--    paziente?.codice_paziente ?? ''`. LO SNAPSHOT VINCE. Scriverlo dal foglio
--    congelerebbe su quel lavoro un nome che l'anagrafica non governa piu': ogni
--    correzione futura in anagrafica NON arriverebbe su quel documento — cioe'
--    l'opposto di «e poi tutto si deve aggiornare di conseguenza».
--
-- ⚠️ E UN CONTRATTO SI GIUDICA PER CIO' CHE PERMETTE, non per cio' che oggi gli si
--    chiede: nessuna schermata manda quella chiave (il foglio del Task D non
--    esiste ancora, e `DevoIntervenire.tsx` non la nomina). Finche' la porta e'
--    aperta, l'unica cosa che la tiene chiusa e' una schermata.
--
-- ═══ R-P6 · IL NOME ESCE DA UN'ALLOWLIST, QUINDI PORTA LA SUA DESTINAZIONE ═══
--
-- 🎯 DESTINAZIONE: `pazienti.nome` / `pazienti.cognome`, via
--    `PATCH /api/pazienti/[id]` (src/app/api/pazienti/[id]/route.ts:99-145) — la
--    via scritta per l'ART. 16 GDPR, a schermo `PazienteEditSheet` montata su
--    `/pazienti/[id]`. Da li' il nome corretto arriva sul documento attraverso il
--    ripiego `paziente?.nome_cognome` di generate-ddc.ts:304.
--
-- 🛑 E LA DESTINAZIONE VALE ESATTAMENTE QUANDO LO SNAPSHOT E' NULLO, che oggi
--    sono 298 lavori su 299 (misurato l'08/08/2026:
--    `SELECT count(*), count(paziente_nome_snapshot) FROM lavori` -> 299 · 1).
--    Sul lavoro che uno snapshot ce l'ha (`TEST-DdC-001`, snapshot `F.R.`,
--    `paziente_id` NULL) la correzione in anagrafica NON arriva: lo snapshot
--    vince, e nessun trigger propaga da `pazienti` a `lavori`
--    (`pg_trigger` su `pazienti`: solo `sync_paziente_nome_cognome` e
--    `trigger_set_updated_at`). ➡️ RIFERITO, non corretto qui: togliere il
--    ripiego e' una decisione a se' (brief §4), e questo compito non tocca il
--    generatore.
--
-- 📌 LA COLONNA NON SI CANCELLA, e non e' un cimitero come
--    `lavori.numero_prescrizione` di D319: `lavori.paziente_nome_snapshot` ha
--    ~40 LETTORI VIVI (generatore della dichiarazione, precheck MDR, etichetta,
--    buono, ricevuta di consegna, IFU, portale del dentista, agenda, esportazione
--    CSV, ricerca a testo pieno — l'indice GIN di schema.sql:1020 la include).
--    Cio' che perde e' l'ULTIMA PENNA: dopo questa migration nessuna funzione del
--    catalogo e nessuna rotta la scrive piu'.
--    provato: `SELECT proname FROM pg_proc WHERE prosrc ILIKE '%paziente_nome_snapshot%'`
--    -> UNA SOLA riga, `correggi_e_riemetti_atomica` (questa). Il clone del
--    rifacimento NON la copia piu': il corpo vivo di `crea_rifacimento_atomico`
--    non la nomina affatto — il file `007_rpc_rifacimento.sql:52-60`, che la
--    nomina, e' una versione superata.
--
-- ═══ LA RIGA DELL'UPDATE ESCE INSIEME AL NOME, E IL VERSO CONTA ══════════════
--
-- La riga `paziente_nome_snapshot = v_lavoro_atteso.paziente_nome_snapshot` NON
-- era una scrittura di una correzione: `v_lavoro_atteso` nasce da
-- `jsonb_populate_record(v_lavoro_prima, v_patch_lavori)`, quindi con la chiave
-- fuori dall'allowlist quel valore e' SEMPRE quello gia' in riga — cioe' la copia
-- del valore su se' stesso. Lasciarla sarebbe un'assegnazione morta e BUGIARDA
-- (dice che questa funzione scrive quella colonna, e non e' piu' vero).
-- 🔑 E toglierla e' SICURO perche' la prova d'atterraggio piu' sotto scorre
--    `jsonb_each(v_patch_lavori)`, cioe' SOLO le chiavi arrivate: una chiave che
--    non puo' piu' arrivare non viene mai guardata. Il verso opposto (togliere il
--    nome e lasciare la riga) sarebbe innocuo ma bugiardo; il verso sbagliato
--    (togliere la riga e lasciare il nome) farebbe alzare quella prova a ogni
--    chiamata che lo mandasse — un dato accettato e mai salvato. ➡️ TOLTI INSIEME.
--
-- ═══ IL RESTO DEL CORPO NON SI TOCCA (R-E2) ══════════════════════════════════
--
-- Ribattuto IDENTICO alla migration precedente. Restano aperti e RIFERITI, non
-- corretti di nascosto:
--   · `riemetti_ddc_atomica` porta ancora i buchi del C-bis e del C-ter, ed e'
--     quella con un chiamante vivo (`riemettiDdC`, `generate-ddc.ts`). Le due
--     funzioni SEMBRANO gemelle e non lo sono: roadmap, la riga 26 della coda.
--   · `p_correzioni` non rifiuta mai il VUOTO in SQL (C2 vive nel TypeScript).
--   · `{"anno_ddc": null, "progressivo_ddc": N}` supera la guardia della coppia —
--     le chiavi CI SONO — e muore piu' sotto su `23502 … column "numero_ddc"`:
--     fail-closed, ma con un messaggio che nomina una colonna che il chiamante
--     non ha toccato (rilievo M2 della revisione del C-bis).
--   · in `p_nuova` restano accettate-e-poi-ignorate in silenzio `id`,
--     `laboratorio_id`, `lavoro_id`, `sostituisce_id`, `created_at`,
--     `updated_at`, `annullata_da_evento_id`, `firmata_at`, `firma_digitale_url`,
--     `inviata_al_dentista`, `inviata_al_dentista_at`, `deleted_at`.
--   · la porta d'idempotenza della rotta ha UNA SOLA asserzione (I3).
--   · `POST /api/lavori` scrive ancora `lavori_prescrizioni.numero_prescrizione`
--     (ritrovamento B2 del C-quinquies, roadmap riga 27).
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
  'nessuna_dichiarazione_viva. Dopo l''annullo si alza soltanto.';
