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
-- ORDINE DEI LOCK — perché queste due funzioni sono innocue.
-- L'ordine canonico dell'ondata è `cassette → cassette_lavori → lavori → dashboard_kpi_cache`
-- (vedi la testata di …090000). **Nessuna delle due funzioni qui sotto tocca `cassette_lavori`
-- o `lavori`**: prendono al massimo un lock di riga su `cassette`, che è il **primo** elemento
-- dell'ordine, e non proseguono. Quindi non fanno scattare `trg_dashboard_lavori` e **non
-- aggiungono alcun arco al grafo dei deadlock**. Se una modifica futura le facesse scendere più
-- in basso, non è una riga in più: è un contratto diverso, e va rifatto l'audit dei lock.
--
-- Resta la coda nota E5/E7 della testata di …090000: l'attesa su un **indice unico**
-- (`cassette_nome_vivo_uidx`) non passa da nessuna riga e quindi non rispetta nessun ordine.
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

-- ESITI (json, completi — D5, stesso contratto delle altre otto: **questo blocco, non la §4.3
-- della spec, è la fonte di verità** per la mappatura esito→HTTP del Task 4):
--   {"esito":"nome_non_valido"}                          p_nome ESPLICITO con btrim fuori da
--                                                        1..20 caratteri → 422
--   {"esito":"nome_occupato","nome":"<nome>"}            esiste già una cassetta viva con quel
--                                                        nome normalizzato → 409
--   {"esito":"ok","cassetta":{id,nome,colore,posizione}} creata → 201
-- RAISE: 'colore cassetta non valido: %'  (R-5: il colore lo valida la route, come in `assegna`;
--        se arriva qui sbagliato è un bug della route, non un esito di dominio — §3.9).
--
-- NOME AUTOMATICO `C{maxN+1}` — vive QUI, non in route (punto ratificato).
-- Il *formato* è presentazione, ma *l'allocazione di un nome libero sotto un indice unico
-- parziale* è un'operazione di concorrenza e va dove vive l'indice: un read-modify-write
-- attraverso la rete non è rendibile corretto in route senza un loop di rilettura che nessuno
-- scriverà. Forma: `max(n)+1` sui nomi vivi che matchano il prefisso → `INSERT … ON CONFLICT
-- DO NOTHING` → ritenta, **massimo 5 giri**, fallthrough su `nome_occupato` (praticamente
-- irraggiungibile: servirebbero 5 creazioni concorrenti vincenti di fila).
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
-- ORDINE DEI LOCK: solo `cassette`, un lock di riga preso dall'UPDATE stesso. Nient'altro.
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
  -- niente riga aggiornata = non esiste, non è di questo lab, o è eliminata: per il chiamante
  -- sono lo stesso 404 (e in nessuno dei tre casi è stato scritto alcunché).
  IF v_colore IS NULL THEN
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
