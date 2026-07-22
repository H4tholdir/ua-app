-- 20260721090300_cassette_crea_colore.sql
-- Parete delle Cassette — le due RPC che mancavano per sbloccare il Task 4:
--   · public.cassetta_crea_atomica          → POST   /api/cassette
--   · public.cassetta_imposta_colore_atomica → PATCH  /api/cassette/[id] {colore}
--
-- PERCHÉ ESISTONO. `service_role` ha **solo SELECT** su `cassette`
-- (20260721090000_parete_cassette.sql:148-150 — REVOKE ALL + GRANT SELECT; verificato
-- empiricamente: `42501 permission denied` su INSERT e UPDATE), e nessuna delle 8 RPC di quella
-- migration crea una cassetta **vuota** né cambia il **solo colore**. Il Task 4 si è perciò
-- bloccato. Panel advisor 3× unanime → opzione (a) «due RPC nuove»; ratificata da Francesco
-- il 21/07/2026. Motivazioni integrali: .superpowers/sdd/panel-task4-sintesi.md
-- (le alternative «GRANT pieno» e «GRANT per colonna» sono state respinte da tutti e tre:
--  `laboratorio_id`/`nome`/`posizione` sono NOT NULL senza default, quindi il GRANT per colonna
--  non è nemmeno eseguibile, e il GRANT di tabella renderebbe la creazione cross-tenant
--  permessa per costruzione, dato che sotto `service_role` (BYPASSRLS) non c'è nessun WITH CHECK).
--
-- Questa migration è **ADDITIVA**: non tocca le tre già applicate (…090000, …090100, …090200),
-- non tocca i privilegi delle **tabelle** (restano `REVOKE ALL` + `GRANT SELECT`), non aggiunge
-- policy RLS. Nessun `CREATE OR REPLACE`: sono due funzioni nuove — e va ricordato che un futuro
-- `CREATE OR REPLACE` su di esse **azzererebbe `SET search_path`** (trappola già costata una
-- migration di patch a quest'ondata: se lo si usa, il `SET search_path` va riscritto esplicitamente).
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration in una transazione.
--
-- ============================================================================
-- ORDINE DEI LOCK — perché queste due funzioni non possono chiudere un ciclo.
-- L'ordine canonico dell'ondata è `cassette → cassette_lavori → lavori → dashboard_kpi_cache`
-- (vedi la testata di …090000). **Nessuna delle due funzioni qui sotto tocca `cassette_lavori`
-- o `lavori`**, quindi non fanno scattare `trg_dashboard_lavori`.
--
-- La proprietà vera è più forte di «prendono un solo lock»: **ciascuna funzione acquisisce al
-- massimo UNA risorsa contesa e ritorna subito dopo averla acquisita, senza tenere nulla
-- mentre attende.** Non può quindi essere il nodo «tiene A, vuole B» di un ciclo: può essere
-- vittima o bloccante, mai entrambi. **Vale a condizione che 1 RPC = 1 transazione**, che è
-- regola d'ondata (mai incatenare due RPC della Parete nella stessa transazione).
-- Unica eccezione alla clausola «senza tenere nulla mentre attende»: in `crea` il controllo FK
-- gira a **fine statement**, quindi un INSERT riuscito attende il KEY SHARE su `laboratori`
-- **tenendo già** la chiave d'indice appena inserita. Non chiude comunque cicli, perché chi
-- blocca `laboratori` in esclusiva non attende mai `cassette`.
-- Se una modifica futura le facesse acquisire una seconda risorsa prima di ritornare, non è
-- una riga in più: è un contratto diverso, e va rifatto l'audit dei lock.
--
-- Precisazione su `crea` (la frase «un solo lock di riga su cassette» sarebbe imprecisa):
-- un INSERT riuscito prende anche un **`FOR KEY SHARE` sulla riga di `laboratori`** via
-- `cassette_laboratorio_id_fkey` — tabella **assente dall'ordine canonico**. Non è un arco
-- nuovo (`assegna` get-or-create, `riassegna_post_annullo`, `trasferisci_rifacimento` e il
-- backfill di …090200 lo prendono già) ed è **shared**, quindi conflitta solo con chi chiede
-- un lock esclusivo su quella riga: oggi `admin_delete_laboratorio` (DELETE) e
-- `pec_vault_upsert` (`20260518000002_pec_vault_upsert.sql:13`, `FOR UPDATE`). **Non chiudere nulla in
-- SQL**: è documentazione, non un difetto. `imposta_colore` invece rispetta la frase alla
-- lettera: un solo lock di riga su `cassette`, nessuna FK attraversata.
--
-- Resta la coda nota E5/E7 della testata di …090000: l'attesa su un **indice unico**
-- (`cassette_nome_vivo_uidx`) non passa da nessuna riga e quindi non rispetta nessun ordine.
-- `crea` è una **seconda sorgente di cassette nuove** oltre al get-or-create di `assegna`, e
-- riattiva perciò il caso #2 già documentato lì (`cassette_riordina` × creazione concorrente).
-- Misurato su 2.700 chiamate concorrenti: 9 deadlock, **tutti con `cassette_riordina` come
-- vittima**, nessuno dentro queste due funzioni.
-- ⇒ come le altre otto, queste due RPC vanno chiamate **sotto retry sul SQLSTATE 40P01**
--   (`callRpcWithRetry`), mai incatenate ad altre RPC della Parete nella stessa transazione.
--
-- `posizione` = `COALESCE(max(posizione)+1, 0)` sui vivi del lab, identico al get-or-create di
-- `cassetta_assegna_atomica` (…090000:268-269). La corsa che lascia due creazioni concorrenti
-- con la **stessa** `posizione` è **già accettata e documentata** (ibid.:42-46): la assorbe il
-- tie-break in lettura `ORDER BY posizione, created_at, id` (spec §4.1, implementato e assertato
-- dal Task 3). **Non chiuderla con lock nuovi**: sarebbe un tipo di lock nuovo in un file
-- auditato per l'ordine dei lock, per un difetto invisibile all'utente.
-- ============================================================================

-- ============================================================================
-- ⚠️ RIEPILOGO DEGLI ESITI — dove cercarlo adesso.
-- Il riepilogo canonizzato in `20260721090000_parete_cassette.sql:159-187` si dichiara
-- «elenco VERO E COMPLETO, funzione per funzione»: da questa migration in poi copre
-- **8 funzioni su 10**. Le due che mancano sono qui sotto, e i loro blocchi D5 hanno lo
-- stesso identico valore di fonte di verità per la mappatura esito→HTTP:
--   cassetta_crea_atomica            → nome_non_valido · nome_occupato · ok
--   cassetta_imposta_colore_atomica  → cassetta_non_trovata · ok
-- `…090000` **non va toccata**: è già applicata, e una migration applicata è immutabile.
-- Chi cerca il contratto completo della Parete deve leggere **i due file insieme**.
-- ============================================================================

-- ESITI (json, completi — D5, stesso contratto delle altre otto: **questo blocco, non la §4.3
-- della spec, è la fonte di verità** per la mappatura esito→HTTP del Task 4):
--   {"esito":"nome_non_valido"}                          p_nome ESPLICITO con btrim fuori da
--                                                        1..20 caratteri → 422
--   {"esito":"nome_occupato","nome":"<nome>"}            esiste già una cassetta viva con quel
--                                                        nome normalizzato → 409
--   {"esito":"ok","cassetta":{id,nome,colore,posizione}} creata → 201
-- RAISE: 'colore cassetta non valido: %'  (R-5: il colore lo valida la route, come in `assegna`;
--        se arriva qui sbagliato è un bug della route, non un esito di dominio — §3.9).
-- RAISE: 'p_lab obbligatorio'  (idem: p_lab viene dal contesto server, mai dal body —
--        stesso idioma di `utente_set_nav_pref` …090000:631 e `cassette_purge_lab` …090100:32).
--
-- NOME AUTOMATICO `C{maxN+1}` — vive QUI, non in route (punto ratificato).
-- Il *formato* è presentazione, ma *l'allocazione di un nome libero sotto un indice unico
-- parziale* è un'operazione di concorrenza e va dove vive l'indice: un read-modify-write
-- attraverso la rete non è rendibile corretto in route senza un loop di rilettura che nessuno
-- scriverà. Forma: `max(n)+1` sui nomi vivi che matchano il prefisso → `INSERT … ON CONFLICT
-- DO NOTHING` → ritenta, **massimo 5 giri**, fallthrough su `nome_occupato`.
--
-- ⚠️ IL FALLTHROUGH È RAGGIUNGIBILE — misurato, non stimato. La bozza di questo contratto lo
-- dava per «praticamente irraggiungibile»: è **falso** sopra le 4 sessioni concorrenti sullo
-- stesso laboratorio. Se k sessioni contendono lo stesso `C{n+1}`, una vince e le altre k−1
-- rifanno il giro; perdere 5 volte di fila non è raro. Misure su container (30 crea/sessione,
-- DB ricreato da template a ogni ripetizione, esiti aggregati su più ripetizioni):
--     1 sessione   0 / 60      2 sessioni  0 / 120     4 sessioni  0 / 240
--     8 sessioni   18 / 1.920  (0,94%)     16 sessioni  73 / 2.400  (3,0%)
--   Mai un nome duplicato, mai un buco nella sequenza C1..Cmax, mai un errore SQL.
--
-- ⇒ **LA ROUTE DEVE RITENTARE quando ha passato `p_nome` NULL.** In quel caso `nome_occupato`
--   NON è un 409: l'utente non ha digitato nessun nome, e restituirgli un conflitto su un nome
--   che ha generato il server è un errore di mappatura. La route sa distinguere i due casi
--   (sa se ha passato `p_nome`), ed è l'unica che può: l'esito è lo stesso.
--   Con `p_nome` valorizzato, invece, `nome_occupato` → 409 è corretto.
--   ⚠️ Non basta `callRpcWithRetry`: quello ritenta solo su `error.code === '40P01'`, mentre
--   `nome_occupato` arriva come **esito valido** con `error: null`. Serve una ritenta a livello
--   di payload, scritta nella route.
CREATE FUNCTION public.cassetta_crea_atomica(
  p_lab uuid, p_nome text DEFAULT NULL, p_colore text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  -- Il letterale del prefisso compare UNA VOLTA SOLA, qui: la regex di lettura e la
  -- generazione del nome lo derivano entrambe da questa costante (niente due verità).
  c_prefisso constant text := 'C';
  v_re       text;
  v_colore   text;
  v_nome     text;
  v_id       uuid; v_nome_out text; v_colore_out text; v_pos int;
BEGIN
  -- (-2) p_lab: senza questa guardia un p_lab NULL non produce un esito ma una **23502**
  -- (not-null violation su `laboratorio_id`) generata dall'INSERT, cioè un errore che il
  -- blocco D5 qui sopra non dichiara. Idioma già ratificato nell'ondata:
  -- `utente_set_nav_pref` (…090000:631) e `cassette_purge_lab` (…090100:32).
  IF p_lab IS NULL THEN RAISE EXCEPTION 'p_lab obbligatorio'; END IF;

  -- (-1) colore: la route lo valida (R-5, nessun esito nuovo). Se arriva qui sbagliato è un
  -- errore di programmazione: RAISE parlante — identica a quella di `cassetta_assegna_atomica`
  -- (…090000:249-253) — invece di una violazione di CHECK opaca.
  IF p_colore IS NOT NULL
     AND p_colore NOT IN ('bianca','azzurra','rossa','blu','verde','grigia')
     AND p_colore !~ '^#[0-9A-F]{6}$' THEN
    RAISE EXCEPTION 'colore cassetta non valido: %', p_colore;
  END IF;
  v_colore := COALESCE(p_colore, 'bianca');

  -- (1) NOME ESPLICITO
  IF p_nome IS NOT NULL THEN
    IF char_length(btrim(p_nome)) NOT BETWEEN 1 AND 20 THEN
      RETURN json_build_object('esito','nome_non_valido');
    END IF;
    -- ⚠️ `btrim` PRIMA di memorizzare, non solo per validare. Il CHECK di tabella valida
    -- `char_length(btrim(nome))` ma consentirebbe di **memorizzare** '  A1  ', e quel valore
    -- finisce copiato ALLA LETTERA in `lavori.numero_cassetta` (`RETURNING c.nome` in
    -- `cassetta_libera_atomica` …090000:210 e in `cassetta_assegna_atomica` :272).
    -- La canonicità va imposta in SQL — come già fa `cassetta_rinomina_atomica` (:401, :420) —
    -- non affidata a un `.trim()` in TypeScript che nessun vincolo difende.
    v_nome := btrim(p_nome);
    INSERT INTO cassette (laboratorio_id, nome, colore, posizione)
    VALUES (p_lab, v_nome, v_colore,
            COALESCE((SELECT max(posizione)+1 FROM cassette
                       WHERE laboratorio_id = p_lab AND deleted_at IS NULL), 0))
    ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL DO NOTHING
    RETURNING id, nome, colore, posizione INTO v_id, v_nome_out, v_colore_out, v_pos;
    IF v_id IS NULL THEN
      -- nessuna riga inserita: l'indice unico parziale ha respinto il nome.
      RETURN json_build_object('esito','nome_occupato','nome', v_nome);
    END IF;
    RETURN json_build_object('esito','ok','cassetta',
      json_build_object('id', v_id, 'nome', v_nome_out,
                        'colore', v_colore_out, 'posizione', v_pos));
  END IF;

  -- (2) NOME AUTOMATICO — `C{maxN+1}`, massimo 5 giri.
  -- La regex normalizza il nome **come fa l'indice unico** (`lower(btrim(nome))`): se il lab ha
  -- una cassetta 'c1' minuscola e nessuna maiuscola, un match case-sensitive leggerebbe max=0,
  -- genererebbe 'C1' e collidirebbe su `lower()` a ogni giro → `nome_occupato` in faccia
  -- all'utente per un nome che non ha digitato. Che è esattamente ciò che questo esito NON deve
  -- essere quando il nome lo generiamo noi.
  -- `[0-9]{1,18}` e non `[0-9]+`: 18 cifre stanno in bigint senza overflow, e il nome generato
  -- più lungo possibile ('C' + 19 cifre) resta dentro il CHECK di 20 caratteri. Un nome con più
  -- cifre di così viene semplicemente ignorato dal calcolo del massimo: non può far abortire
  -- la funzione.
  v_re := '^' || lower(c_prefisso) || '([0-9]{1,18})$';
  FOR i IN 1..5 LOOP
    -- snapshot nuovo a ogni giro (READ COMMITTED): se un'altra sessione ha appena committato
    -- il nome che stavamo per usare, al giro dopo lo vediamo e passiamo al successivo.
    SELECT c_prefisso || (COALESCE(max(substring(lower(btrim(nome)) FROM v_re)::bigint), 0) + 1)::text
      INTO v_nome
      FROM cassette WHERE laboratorio_id = p_lab AND deleted_at IS NULL;
    INSERT INTO cassette (laboratorio_id, nome, colore, posizione)
    VALUES (p_lab, v_nome, v_colore,
            COALESCE((SELECT max(posizione)+1 FROM cassette
                       WHERE laboratorio_id = p_lab AND deleted_at IS NULL), 0))
    ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL DO NOTHING
    RETURNING id, nome, colore, posizione INTO v_id, v_nome_out, v_colore_out, v_pos;
    IF v_id IS NOT NULL THEN
      RETURN json_build_object('esito','ok','cassetta',
        json_build_object('id', v_id, 'nome', v_nome_out,
                          'colore', v_colore_out, 'posizione', v_pos));
    END IF;
  END LOOP;
  -- 5 giri persi di fila: fallthrough onesto invece di un loop illimitato.
  RETURN json_build_object('esito','nome_occupato','nome', v_nome);
END $$;

-- ESITI (json, completi — D5):
--   {"esito":"cassetta_non_trovata"}    cassetta assente / di un ALTRO laboratorio /
--                                       soft-deleted → 404
--   {"esito":"ok","colore":"<colore>"}  colore impostato → 200
-- RAISE: 'colore cassetta non valido: %'  (R-5, come sopra).
--
-- Asimmetria voluta con `crea`: qui **non** c'è una guardia su `p_lab` NULL, perché non ce n'è
-- bisogno — `WHERE laboratorio_id = p_lab` con p_lab NULL non combacia mai e l'esito è
-- `cassetta_non_trovata`, che il blocco qui sopra **dichiara**. In `crea` la guardia serve
-- perché lì un p_lab NULL produrrebbe una 23502, cioè un errore non dichiarato.
--
-- ORDINE DEI LOCK: solo `cassette`, un lock di riga preso dall'UPDATE stesso. Nient'altro
-- (nessuna FK attraversata: l'UPDATE non tocca `laboratorio_id`).
CREATE FUNCTION public.cassetta_imposta_colore_atomica(
  p_lab uuid, p_cassetta_id uuid, p_colore text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_colore text;
BEGIN
  IF p_colore IS NULL
     OR (p_colore NOT IN ('bianca','azzurra','rossa','blu','verde','grigia')
         AND p_colore !~ '^#[0-9A-F]{6}$') THEN
    RAISE EXCEPTION 'colore cassetta non valido: %', p_colore;
  END IF;
  -- ⛔️ NON TOCCARE `updated_at` QUI — decisione R-4.2, ratificata.
  -- `updated_at` mentiva sull'uso recente della cassetta e l'ordinamento delle chip è stato
  -- spostato su `max(cassette_lavori.assegnato_at)`. Ricolorare una cassetta non è «usarla»:
  -- bumpare `updated_at` la farebbe risalire in una classifica che non le compete.
  -- Il piano scritto prima del panel dice il contrario (task-4-brief.md:99 «UPDATE
  -- colore/updated_at») ed è un errore del piano. Se qualcuno arriva qui per «riparare»
  -- la mancanza: è voluta, non è una dimenticanza. Idem per la route: il PATCH del colore
  -- non deve toccare `updated_at` per altre vie.
  UPDATE cassette SET colore = p_colore
   WHERE id = p_cassetta_id AND laboratorio_id = p_lab AND deleted_at IS NULL
  RETURNING colore INTO v_colore;
  -- La sentinella di «riga trovata» è `FOUND`, **non** `v_colore IS NULL`: un VALORE non deve
  -- mai fare da sentinella. Oggi reggerebbe (`colore` è NOT NULL e `p_colore` è validato
  -- non-NULL due statement sopra), ma se un domani si ammettesse `p_colore` NULL — per dire,
  -- «ripristina il default» — un UPDATE **riuscito** tornerebbe `cassetta_non_trovata`, cioè
  -- un 404 su una scrittura avvenuta. `FOUND` è invariante rispetto al valore ed è l'idioma
  -- di tutte le RPC di …090000.
  -- niente riga aggiornata = non esiste, non è di questo lab, o è eliminata: per il chiamante
  -- sono lo stesso 404 (e in nessuno dei tre casi è stato scritto alcunché).
  IF NOT FOUND THEN
    RETURN json_build_object('esito','cassetta_non_trovata');
  END IF;
  RETURN json_build_object('esito','ok','colore', v_colore);
END $$;

-- GRANT/REVOKE (firme identiche alle definizioni, default inclusi).
-- Nessun GRANT sulle TABELLE: `cassette` e `cassette_lavori` restano `REVOKE ALL` +
-- `GRANT SELECT` come le ha lasciate …090000. Le due funzioni scrivono perché sono
-- SECURITY DEFINER di proprietà dell'owner, esattamente come le altre otto.
REVOKE EXECUTE ON FUNCTION public.cassetta_crea_atomica(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_imposta_colore_atomica(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cassetta_crea_atomica(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_imposta_colore_atomica(uuid,uuid,text) TO service_role;
