-- 20260721090000_parete_cassette.sql
-- Parete delle Cassette: cassette + storico cassette_lavori + RPC (una sola penna).
-- Spec: docs/superpowers/specs/2026-07-21-parete-cassette-design.md §4
--
-- VERSIONE CORRETTA dopo il panel advisor del 21/07/2026 (.superpowers/sdd/panel-backend.md §3,
-- panel-security.md, panel-architetto.md) e le decisioni ratificate da Francesco
-- (.superpowers/sdd/task-1-decisioni-ratificate.md R-1…R-6). Sostituisce integralmente la
-- prima stesura (commit e1fa4fd), che conteneva 1 Critical + 7 Important + 2 deadlock riproducibili.
--
-- Questo file NON contiene il backfill: sta in 20260721090200_parete_cassette_backfill.sql (R-1).
-- Co-requisito bloccante dello stesso deploy: 20260721090100_admin_delete_laboratorio_cassette.sql (R-3).
-- NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la migration in una transazione
-- e un COMMIT interno la chiuderebbe prima della registrazione in supabase_migrations (N6, verificato).
--
-- ============================================================================
-- ORDINE CANONICO DEI LOCK (convenzione di questa ondata — non facoltativa):
--   cassette → cassette_lavori → lavori → (trigger) dashboard_kpi_cache
--
-- REGOLA D'ORO: chiunque apra una riga viva su una cassetta deve PRIMA prendere
--   SELECT … FROM cassette WHERE id=… AND laboratorio_id=p_lab AND deleted_at IS NULL FOR UPDATE.
-- Motivo: la FK cassette_lavori.cassetta_id → cassette.id prende comunque FOR KEY SHARE sulla
-- riga padre a fine statement. Chi inserisce SENZA aver preso il lock prima lo prende DOPO aver
-- già scritto l'entry di indice → inversione d'ordine → deadlock 40P01 (riprodotto dal panel).
--
-- ⚠️ PERIMETRO DI QUESTA CONVENZIONE — leggere prima di dare la caccia a un 40P01.
-- L'ordine qui sopra copre i **lock di riga** (FOR UPDATE / FOR NO KEY UPDATE / FOR KEY SHARE
-- e i lock impliciti di UPDATE/DELETE). **NON copre le attese sugli indici unici**: chi inserisce
-- o aggiorna una chiave già presente in un indice unico si mette in attesa sulla *transazione*
-- che la detiene (XactLockTableWait), e quell'attesa non passa da nessuna riga e quindi non
-- rispetta nessun ordine. Il rilevatore di deadlock la vede comunque: il risultato è un 40P01.
--
-- Tre punti NOTI e DELIBERATAMENTE non chiusi in SQL (audit round 2, E5/E7/E9). Sono coda, non
-- difetti di ordine: chiuderli in SQL costerebbe lock di tabella o indici nuovi, e la cura è
-- **il retry in route**:
--   1) `cassetta_rinomina_atomica` × `cassetta_rinomina_atomica` — ciclo sui NOMI su
--      `cassette_nome_vivo_uidx` (A rinomina X in 'N2' mentre B rinomina Y in 'N1', con X='N1'
--      e Y='N2'). Misurato: 33/4.800 a 4 sessioni, 0/2.400 a 2. Anche riordina × rinomina: 9/4.800.
--   2) `cassette_riordina` × `cassetta_assegna_atomica` in get-or-create **con nomi nuovi** — il
--      `PERFORM … ORDER BY id FOR NO KEY UPDATE` pre-blocca solo le cassette visibili al proprio
--      snapshot; la seconda UPDATE (politica tollerante) usa uno snapshot nuovo e può incrociare
--      cassette nate DOPO il pre-lock. Misurato: 3/2.700 (0/2.700 senza nomi nuovi nel mix).
--   3) `cassetta_assegna_atomica` get-or-create × get-or-create — `max(posizione)+1` è calcolato
--      senza lock e `(laboratorio_id, posizione)` non è unico: due creazioni concorrenti nascono
--      con la stessa `posizione`. Non è un 40P01 ma è la stessa classe (nessun lock ordina il
--      calcolo). Conseguenza: ordine della parete instabile fra un refresh e l'altro ⇒ le letture
--      DEVONO applicare davvero il tie-break di spec §4.1 `ORDER BY posizione, created_at, id`.
--
-- ⇒ **CONTRATTO PER LE ROUTE (Task 4/5/8/9): ogni chiamata a queste RPC va avvolta in un retry
--    sul SQLSTATE 40P01** (1-2 tentativi, backoff breve). Un 40P01 qui non è un bug da inseguire
--    in SQL: è la coda prevista di questa architettura. Vedi anche: mai incatenare due RPC della
--    Parete nella stessa transazione (l'ordine canonico vale PER RPC, non per transazione).
-- ============================================================================

-- ============ TABELLE ============
CREATE TABLE cassette (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES laboratori(id),
  nome           text NOT NULL CHECK (char_length(btrim(nome)) BETWEEN 1 AND 20),
  colore         text NOT NULL DEFAULT 'bianca'
                 CHECK (colore IN ('bianca','azzurra','rossa','blu','verde','grigia')
                        OR colore ~ '^#[0-9A-F]{6}$'),
  posizione      integer NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);
CREATE UNIQUE INDEX cassette_nome_vivo_uidx
  ON cassette (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL;
CREATE INDEX cassette_lab_pos_idx
  ON cassette (laboratorio_id, posizione) WHERE deleted_at IS NULL;

CREATE TABLE cassette_lavori (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laboratorio_id uuid NOT NULL REFERENCES laboratori(id),
  cassetta_id    uuid NOT NULL REFERENCES cassette(id),
  lavoro_id      uuid NOT NULL REFERENCES lavori(id),
  assegnato_at   timestamptz NOT NULL DEFAULT now(),
  liberato_at    timestamptz,
  liberato_per   text CHECK (liberato_per IN ('consegna','manuale','spostamento','annullo_lavoro','rifacimento')),
  CHECK ((liberato_at IS NULL) = (liberato_per IS NULL))
);
CREATE UNIQUE INDEX cassette_lavori_cassetta_viva_uidx ON cassette_lavori (cassetta_id) WHERE liberato_at IS NULL;
CREATE UNIQUE INDEX cassette_lavori_lavoro_vivo_uidx  ON cassette_lavori (lavoro_id)  WHERE liberato_at IS NULL;
CREATE INDEX cassette_lavori_lab_lavoro_idx   ON cassette_lavori (laboratorio_id, lavoro_id, liberato_at);
CREATE INDEX cassette_lavori_lab_cassetta_idx ON cassette_lavori (laboratorio_id, cassetta_id, assegnato_at DESC);

-- ============ TRIGGER APPEND-ONLY (§3.0 panel-backend, con la deroga di purga di R-3) ============
-- L'invariante non è «le righe sono eterne» ma «la storia di un tenant ESISTENTE è immutabile»:
-- la purga amministrativa non riscrive la storia, la fa sparire insieme al soggetto (art. 17 GDPR).
CREATE FUNCTION public.cassette_lavori_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- varco unico, tracciabile e grep-abile: purga amministrativa del lab
    -- (public.cassette_purge_lab, chiamata da admin_delete_laboratorio).
    -- set_config(..., true) = LOCAL alla transazione: non sopravvive al commit,
    -- non passa ad altre sessioni, ed è vincolato a QUESTO laboratorio_id.
    IF coalesce(current_setting('ua.purga_lab', true), '') = OLD.laboratorio_id::text THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'cassette_lavori è append-only: DELETE vietato';
  END IF;
  IF OLD.liberato_at IS NOT NULL THEN
    RAISE EXCEPTION 'assegnazione già chiusa, immutabile';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.laboratorio_id IS DISTINCT FROM OLD.laboratorio_id
     OR NEW.cassetta_id IS DISTINCT FROM OLD.cassetta_id
     OR NEW.lavoro_id IS DISTINCT FROM OLD.lavoro_id
     OR NEW.assegnato_at IS DISTINCT FROM OLD.assegnato_at THEN
    RAISE EXCEPTION 'solo liberato_at/liberato_per sono aggiornabili';
  END IF;
  IF NEW.liberato_at IS NULL THEN
    RAISE EXCEPTION 'la chiusura deve valorizzare liberato_at';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_cassette_lavori_append_only
  BEFORE UPDATE OR DELETE ON cassette_lavori
  FOR EACH ROW EXECUTE FUNCTION public.cassette_lavori_guard();

-- ============ RLS (SELECT-only, scrive solo l'owner via RPC SECURITY DEFINER) ============
-- R-4.4: REVOKE ALL (chiude anche TRUNCATE/REFERENCES/TRIGGER) + GRANT SELECT esplicito
-- (senza, la lettura resterebbe appesa ai default privileges di Supabase).
--
-- ⚠️ E8 — `service_role` va nella lista del REVOKE, esattamente come si è dovuto fare per
-- `cassette_purge_lab` (D3). Le default privileges di Supabase
-- (`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon,
-- authenticated, service_role`) assegnano a `service_role` `arwdDxt` da sole al CREATE TABLE:
-- senza questo REVOKE il relacl resta `{postgres=arwdDxt, service_role=arwdDxt, authenticated=r}`
-- e un `SET LOCAL ROLE service_role` + `DELETE FROM cassette_lavori` azzera lo storico di un
-- laboratorio qualunque (riprodotto: «DELETE 2»). Non è raggiungibile via PostgREST — da lì non
-- si esegue `SET`/`set_config` — ma è la stessa classe di difetto, e si chiude allo stesso modo.
--
-- Il `GRANT SELECT … TO service_role` che segue NON è una svista che riapre il buco: la lettura
-- deve restare aperta (Task 3 `getParete` interroga queste tabelle col service client) mentre
-- la scrittura DIRETTA si chiude. Le 8 RPC continuano a scrivere perché sono SECURITY DEFINER
-- di proprietà dell'owner: dentro di esse `current_user` è l'owner, che ha `arwdDxt`.
-- Idem `cassette_purge_lab`/`admin_delete_laboratorio` (090100).
ALTER TABLE cassette ENABLE ROW LEVEL SECURITY;
CREATE POLICY cassette_select ON cassette FOR SELECT TO authenticated
  USING (laboratorio_id = public.current_lab_id() AND deleted_at IS NULL);

ALTER TABLE cassette_lavori ENABLE ROW LEVEL SECURITY;
CREATE POLICY cassette_lavori_select ON cassette_lavori FOR SELECT TO authenticated
  USING (laboratorio_id = public.current_lab_id());

REVOKE ALL ON cassette        FROM anon, authenticated, service_role;
REVOKE ALL ON cassette_lavori FROM anon, authenticated, service_role;
GRANT SELECT ON cassette, cassette_lavori TO authenticated, service_role;

-- ============ RPC ============
-- NOTA ARCHITETTURALE: la liberazione alla consegna è agganciata in
-- src/lib/consegna/orchestrate.ts (Step 5). Se una futura ondata attiva la RPC
-- dormiente consegna_finalizza_atomica come percorso di consegna, portare
-- la chiamata a cassetta_libera_atomica anche lì.
--
-- ============================================================================
-- CONTRATTO DEGLI ESITI — elenco VERO E COMPLETO, funzione per funzione (D5).
--
-- Il commento precedente diceva «R-5: nessun esito nuovo rispetto alla tabella §4.3»:
-- era FALSO e va letto come corretto qui. R-5 resta la politica (non si inventano esiti
-- di comodo: nome e colore si validano IN ROUTE), ma i fix dei finding #3 e #6 hanno
-- reso inevitabili alcuni esiti che la tabella §4.3 della spec non elenca — e §4.3 è
-- comunque incompleta a monte (difetto noto e tracciato: non elenca nemmeno `ok`,
-- `cassetta_non_trovata` di elimina/rinomina, né la RPC cassetta_trasferisci_rifacimento).
--
-- **QUESTO BLOCCO, NON §4.3, È LA FONTE DI VERITÀ per la mappatura esito→HTTP
--   dei Task 4/5/8/9.** Ogni funzione ha sopra di sé l'elenco esatto dei propri esiti;
--   qui il riepilogo. `[nuovo]` = assente dalla tabella §4.3.
--
--   cassetta_libera_atomica            → motivo_non_valido [nuovo] · ok
--   cassetta_assegna_atomica           → lavoro_non_valido [nuovo] · cassetta_non_trovata ·
--                                        occupata · ok
--   cassetta_rinomina_atomica          → nome_non_valido [nuovo] · cassetta_non_trovata [nuovo] ·
--                                        nome_occupato · ok
--   cassetta_elimina_atomica           → cassetta_non_trovata [nuovo] · occupata · ok
--   cassette_riordina                  → ordine_non_valido · ok
--   cassetta_riassegna_post_annullo    → niente_da_riassegnare · occupata_nel_frattempo ·
--                                        riassegnata   (esattamente i 3 di §4.3)
--   cassetta_trasferisci_rifacimento   → lavoro_non_valido · niente_da_trasferire ·
--                                        occupata · trasferita   (RPC intera nuova, D-10)
--   utente_set_nav_pref                → nessun esito: RETURNS void
--
-- Le RAISE elencate sotto ogni funzione NON sono contratto: sono errori di programmazione
-- (§3.9 — la route non deve mai produrle). Se una route le vede, è un bug della route.
-- ============================================================================

-- ESITI (json, completi — D5):
--   {"esito":"motivo_non_valido"}                p_motivo NULL o fuori enum → 422 [nuovo vs §4.3]
--   {"esito":"ok","nome":"<nome>"}               liberata: `nome` = cassetta appena liberata
--   {"esito":"ok","nome":null}                   nessuna riga viva: idempotente, non è un errore
-- RAISE: nessuna.
-- Nota (D12, INFO): con un p_lavoro di un ALTRO lab l'esito è {"ok",null}, indistinguibile
-- dall'idempotenza. Nessuna scrittura cross-tenant (verificato): è solo poco informativo.
CREATE FUNCTION public.cassetta_libera_atomica(p_lab uuid, p_lavoro uuid, p_motivo text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_nome text;
BEGIN
  -- p_motivo NULL scavalcava il NOT IN (NULL → UNKNOWN → nessun ramo) e finiva in
  -- violazione di CHECK invece che in un esito (finding #3, riprodotto).
  IF p_motivo IS NULL
     OR p_motivo NOT IN ('consegna','manuale','spostamento','annullo_lavoro','rifacimento') THEN
    RETURN json_build_object('esito','motivo_non_valido');
  END IF;
  UPDATE cassette_lavori cl SET liberato_at = now(), liberato_per = p_motivo
  FROM cassette c
  WHERE cl.lavoro_id = p_lavoro AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL
    AND c.id = cl.cassetta_id
  RETURNING c.nome INTO v_nome;
  -- azzera la denorm SOLO se davvero non resta nessuna riga viva (altrimenti si cancella
  -- l'assegnazione che un'altra transazione ha appena creato: desync N4, riprodotto a 2 sessioni)
  UPDATE lavori l SET numero_cassetta = NULL
  WHERE l.id = p_lavoro AND l.laboratorio_id = p_lab AND l.numero_cassetta IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM cassette_lavori cl2
                    WHERE cl2.lavoro_id = p_lavoro AND cl2.liberato_at IS NULL);
  RETURN json_build_object('esito','ok','nome', v_nome);  -- nome NULL = niente da liberare (idempotente)
END $$;

-- ESITI (json, completi — D5):
--   {"esito":"lavoro_non_valido"}                     lavoro assente/di altro lab/soft-deleted/
--                                                     consegnato/annullato → 422 [nuovo vs §4.3]
--   {"esito":"cassetta_non_trovata"}                  p_cassetta_id assente/di altro lab/eliminata,
--                                                     OPPURE p_nome NULL/vuoto/>20 char → 404-422
--   {"esito":"occupata","nome":"<nome>"}              la cassetta ha già dentro un altro lavoro → 409
--   {"esito":"ok","cassetta_id":"<uuid>","nome":"…"}  assegnata (o già dentro: idempotente)
-- RAISE: 'colore cassetta non valido: %'  (R-5: il colore lo valida la route; se arriva qui
--        sbagliato è un bug della route, non un esito di dominio).
--
-- ORDINE DEI LOCK (D2 + E2 — vale come contratto, non come commento decorativo):
--   cassette(FOR UPDATE) → cassette_lavori(occupante, FOR UPDATE OF cl) →
--   lavori(occupante, FOR NO KEY UPDATE) → cassette_lavori(entrante) → lavori(entrante)
--   → dashboard_kpi_cache[lab] → lavori(occupante)
-- cioè: TUTTE le righe di `lavori` che questa RPC toccherà sono bloccate PRIMA che
-- trg_dashboard_lavori prenda dashboard_kpi_cache[lab]. Vedi il commento a (2b).
-- L'ordine NON cambia con il lock aggiunto in (2): è sulla stessa tabella e sulla stessa riga che
-- (2b) bloccava comunque con la sua UPDATE, solo preso una statement prima. Vedi il commento a (2).
CREATE FUNCTION public.cassetta_assegna_atomica(
  p_lab uuid, p_lavoro uuid, p_cassetta_id uuid DEFAULT NULL,
  p_nome text DEFAULT NULL, p_colore text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_cassetta_id uuid; v_nome text; v_occupante uuid; v_stato_occ text; v_del_occ timestamptz;
  v_occ_denorm uuid;            -- occupante sfrattato da (2b): la sua denorm si azzera in (6)
  v_conflitto boolean := false; -- unique_violation in (4): l'esito si rimanda dopo (6)
BEGIN
  -- (-1) colore: la route lo valida (R-5, nessun esito nuovo). Se arriva qui sbagliato è un
  -- errore di programmazione: RAISE parlante invece di una violazione di CHECK opaca (m3).
  IF p_colore IS NOT NULL
     AND p_colore NOT IN ('bianca','azzurra','rossa','blu','verde','grigia')
     AND p_colore !~ '^#[0-9A-F]{6}$' THEN
    RAISE EXCEPTION 'colore cassetta non valido: %', p_colore;
  END IF;

  -- (0) lavoro del lab, vivo, non chiuso
  PERFORM 1 FROM lavori WHERE id = p_lavoro AND laboratorio_id = p_lab
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
  IF NOT FOUND THEN RETURN json_build_object('esito','lavoro_non_valido'); END IF;

  -- (1) cassetta: SEMPRE con FOR UPDATE prima di qualunque scrittura sullo storico (regola d'oro)
  IF p_cassetta_id IS NOT NULL THEN
    SELECT id, nome INTO v_cassetta_id, v_nome FROM cassette
    WHERE id = p_cassetta_id AND laboratorio_id = p_lab AND deleted_at IS NULL FOR UPDATE;
    IF NOT FOUND THEN RETURN json_build_object('esito','cassetta_non_trovata'); END IF;
  ELSIF p_nome IS NOT NULL AND char_length(btrim(p_nome)) BETWEEN 1 AND 20 THEN
    -- get-or-create race-safe sull'indice parziale a espressione (inferenza con predicato)
    INSERT INTO cassette (laboratorio_id, nome, colore, posizione)
    VALUES (p_lab, btrim(p_nome), COALESCE(p_colore,'bianca'),
            COALESCE((SELECT max(posizione)+1 FROM cassette WHERE laboratorio_id = p_lab AND deleted_at IS NULL), 0))
    ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL
    DO UPDATE SET updated_at = now()
    RETURNING id, nome INTO v_cassetta_id, v_nome;
    -- ridondante (ON CONFLICT DO UPDATE ha già bloccato la riga) ma esplicita la disciplina di lock
    PERFORM 1 FROM cassette WHERE id = v_cassetta_id AND laboratorio_id = p_lab FOR UPDATE;
  ELSE
    -- nome assente/vuoto/>20: la route lo valida prima (R-5). Esito già previsto dal contratto.
    RETURN json_build_object('esito','cassetta_non_trovata');
  END IF;

  -- (2) chi c'è dentro adesso (sotto il lock della cassetta)
  -- ⚠️ E2 — il `FOR UPDATE OF cl` NON è ridondante con il lock sulla cassetta preso in (1).
  -- È la stessa classe di D1, chiusa in cassetta_rinomina_atomica (vedi il commento lì) e
  -- lasciata aperta qui: il lock su `cassette` non ferma né cassetta_libera_atomica (che non
  -- tocca mai `cassette`) né cassetta_assegna_atomica(occupante → un'ALTRA cassetta) (che blocca
  -- la cassetta di DESTINAZIONE). Senza questo lock l'occupante letto qui è già vecchio quando
  -- lo step (3) lo usa, e il ramo idempotente ristampa `numero_cassetta` ALLA CIECA su un lavoro
  -- che nel frattempo è stato liberato o spostato:
  --   · liberato   → targa orfana su un lavoro APERTO (I3) — permanente: la lettura
  --                  auto-riparante di spec §9.2 chiude le righe vive dei lavori CHIUSI,
  --                  non ripara un lavoro aperto con la targa di una cassetta vuota;
  --   · spostato   → targa disallineata (I4): la card dice A1, il lavoro è in A2.
  -- Entrambe riprodotte (audit round 2, E2; I3 osservata anche naturalmente sotto stress).
  -- Il lock è su `cassette_lavori`, cioè cassette → cassette_lavori → lavori: ordine canonico,
  -- nessun ciclo nuovo. `OF cl` e non secco: `lavori` NON va bloccata qui, altrimenti si prende
  -- un FOR UPDATE (key-level) sull'occupante che bloccherebbe il FOR KEY SHARE delle FK di
  -- cassette_lavori altrui; la riga di `lavori` dell'occupante si prende in (2b), e solo quando
  -- serve davvero, con FOR NO KEY UPDATE.
  SELECT cl.lavoro_id, l.stato, l.deleted_at INTO v_occupante, v_stato_occ, v_del_occ
  FROM cassette_lavori cl JOIN lavori l ON l.id = cl.lavoro_id
  WHERE cl.cassetta_id = v_cassetta_id AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL
  FOR UPDATE OF cl;

  -- (2b) auto-riparazione: occupante chiuso/soft-deleted → chiudi con il motivo GIUSTO (R-4.1).
  -- Con l'etichetta fissa 'consegna' un lavoro ANNULLATO restava eleggibile per
  -- cassetta_riassegna_post_annullo (esito `riassegnata` riprodotto su lavoro annullato).
  IF v_occupante IS NOT NULL AND (v_stato_occ IN ('consegnato','annullato') OR v_del_occ IS NOT NULL) THEN
    UPDATE cassette_lavori SET liberato_at = now(),
      liberato_per = CASE WHEN v_stato_occ = 'consegnato' THEN 'consegna' ELSE 'annullo_lavoro' END
    WHERE cassetta_id = v_cassetta_id AND laboratorio_id = p_lab AND liberato_at IS NULL;
    -- ⚠️ D2 — QUI stava `UPDATE lavori SET numero_cassetta = NULL WHERE id = v_occupante`.
    -- Quell'UPDATE fa scattare trg_dashboard_lavori → refresh_dashboard_cache → INSERT … ON
    -- CONFLICT su dashboard_kpi_cache: prendeva il lock per-lab dei KPI PRIMA che lo step (4)
    -- toccasse la riga storico dell'entrante. cassetta_libera_atomica prende gli stessi due
    -- nell'ordine opposto (cassette_lavori → lavori → kpi) ⇒ ciclo ⇒ deadlock 40P01
    -- (riprodotto 5× su ~25.150 chiamate concorrenti, e in forma deterministica).
    -- L'UPDATE è spostato allo step (6), DOPO lo step (5).
    --
    -- Spostarlo e basta però non basta: allo step (6) ci arriveremmo tenendo GIÀ
    -- dashboard_kpi_cache[lab] (preso dallo step 5) e chiedendo POI la riga di `lavori`
    -- dell'occupante — cioè kpi → lavori, di nuovo l'inverso di chiunque scriva su `lavori`.
    -- Il deadlock si sposterebbe, non si chiuderebbe (verificato: si riproduce).
    -- Perciò il lock di riga sull'occupante si prende ADESSO, con FOR NO KEY UPDATE:
    --   · non è DML ⇒ NON fa scattare trg_dashboard_lavori ⇒ non tocca i KPI;
    --   · è compatibile con il FOR KEY SHARE che le FK di cassette_lavori prendono su lavori,
    --     quindi non blocca gli INSERT di storico altrui;
    --   · conflitta con qualunque UPDATE su quella riga, che è esattamente ciò che serve.
    -- Risultato: cassette → cassette_lavori → lavori → kpi, l'ordine canonico dichiarato
    -- in testa al file, senza eccezioni.
    PERFORM 1 FROM lavori WHERE id = v_occupante AND laboratorio_id = p_lab FOR NO KEY UPDATE;
    v_occ_denorm := v_occupante;
    v_occupante  := NULL;
  END IF;

  -- (3) PRE-CHECK sotto il lock: nessuna scrittura prima di sapere che si può entrare (finding #1)
  IF v_occupante = p_lavoro THEN                 -- già dentro: idempotente, niente riga spuria (m5)
    UPDATE lavori SET numero_cassetta = v_nome
    WHERE id = p_lavoro AND laboratorio_id = p_lab AND numero_cassetta IS DISTINCT FROM v_nome;
    RETURN json_build_object('esito','ok','cassetta_id', v_cassetta_id,'nome', v_nome);
  END IF;
  IF v_occupante IS NOT NULL THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);
  END IF;

  -- (4) sfratto + ingresso NELLO STESSO blocco: o passano insieme o fanno rollback insieme.
  -- Un sotto-blocco EXCEPTION è una subtransazione: quello che sta FUORI resta committato.
  BEGIN
    UPDATE cassette_lavori SET liberato_at = now(), liberato_per = 'spostamento'
    WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND liberato_at IS NULL;
    INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id)
    VALUES (p_lab, v_cassetta_id, p_lavoro);
  EXCEPTION WHEN unique_violation THEN
    -- niente RETURN qui: lo step (6) deve girare comunque. La chiusura della riga
    -- dell'occupante fatta in (2b) sta FUORI da questo sotto-blocco, quindi resta
    -- committata anche quando la subtransazione fa rollback: senza (6) l'occupante
    -- resterebbe con la targa stampata e nessuna riga viva (I3_targa_orfana).
    v_conflitto := true;
  END;

  -- (5) denormalizzazione dell'entrante
  IF NOT v_conflitto THEN
    UPDATE lavori SET numero_cassetta = v_nome WHERE id = p_lavoro AND laboratorio_id = p_lab;
  END IF;

  -- (6) denormalizzazione dell'occupante sfrattato in (2b) — spostata qui da D2.
  -- La riga di `lavori` è già bloccata da (2b) (FOR NO KEY UPDATE), quindi questo UPDATE
  -- non aspetta nessuno mentre tiene dashboard_kpi_cache[lab].
  -- Il NOT EXISTS è la stessa guardia di cassetta_libera_atomica (N4): se nel frattempo
  -- l'occupante ha ottenuto una riga viva altrove, la sua targa è di QUELLA cassetta e
  -- azzerarla sarebbe il desync che stiamo prevenendo. `numero_cassetta IS NOT NULL`
  -- evita un UPDATE a vuoto e con esso un ricalcolo KPI inutile (N1).
  IF v_occ_denorm IS NOT NULL THEN
    UPDATE lavori l SET numero_cassetta = NULL
    WHERE l.id = v_occ_denorm AND l.laboratorio_id = p_lab AND l.numero_cassetta IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM cassette_lavori cl2
                      WHERE cl2.lavoro_id = v_occ_denorm AND cl2.liberato_at IS NULL);
  END IF;

  IF v_conflitto THEN RETURN json_build_object('esito','occupata','nome', v_nome); END IF;
  RETURN json_build_object('esito','ok','cassetta_id', v_cassetta_id,'nome', v_nome);
END $$;

-- ESITI (json, completi — D5):
--   {"esito":"nome_non_valido"}        p_nome NULL/vuoto/solo spazi/>20 char → 422 [nuovo vs §4.3]
--   {"esito":"cassetta_non_trovata"}   cassetta assente/di altro lab/eliminata → 404 [nuovo vs §4.3]
--   {"esito":"nome_occupato"}          esiste già una cassetta viva con quel nome normalizzato → 409
--   {"esito":"ok"}                     rinominata (anche quando il nome non cambia)
-- RAISE: nessuna.
--
-- ORDINE DEI LOCK: cassette(FOR UPDATE) → cassette_lavori(FOR UPDATE) → lavori → kpi. Canonico.
CREATE FUNCTION public.cassetta_rinomina_atomica(p_lab uuid, p_cassetta_id uuid, p_nome text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_lavoro uuid;
BEGIN
  IF p_nome IS NULL OR char_length(btrim(p_nome)) NOT BETWEEN 1 AND 20 THEN
    RETURN json_build_object('esito','nome_non_valido');
  END IF;
  PERFORM 1 FROM cassette WHERE id = p_cassetta_id AND laboratorio_id = p_lab
    AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','cassetta_non_trovata'); END IF;
  BEGIN
    UPDATE cassette SET nome = btrim(p_nome), updated_at = now()
    WHERE id = p_cassetta_id AND laboratorio_id = p_lab;
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','nome_occupato');
  END;
  -- ⚠️ D1 — il FOR UPDATE qui NON è ridondante con quello della cassetta (riga sopra).
  -- Né cassetta_libera_atomica né cassetta_assegna_atomica(L → un'ALTRA cassetta) prendono
  -- il lock su QUESTA cassetta: la prima non tocca mai `cassette`, la seconda blocca la
  -- cassetta di DESTINAZIONE. Senza questo lock potevano liberare o spostare l'occupante
  -- mentre la rinomina era ferma sul lock di riga di `lavori`; alla EPQ recheck il
  -- `WHERE id = v_lavoro` combaciava ancora e la targa veniva ristampata su un lavoro che
  -- non è più lì → targa orfana (I3) o targa disallineata (I4), entrambe riprodotte in
  -- forma deterministica e la seconda osservata anche naturalmente sotto stress.
  -- Il lock è su cassette_lavori, cioè cassette → cassette_lavori → lavori: ordine canonico,
  -- nessun nuovo ciclo.
  SELECT lavoro_id INTO v_lavoro FROM cassette_lavori
  WHERE cassetta_id = p_cassetta_id AND laboratorio_id = p_lab AND liberato_at IS NULL
  FOR UPDATE;
  IF v_lavoro IS NOT NULL THEN
    UPDATE lavori SET numero_cassetta = btrim(p_nome) WHERE id = v_lavoro AND laboratorio_id = p_lab;
  END IF;
  RETURN json_build_object('esito','ok');
END $$;

-- ESITI (json, completi — D5):
--   {"esito":"cassetta_non_trovata"}   cassetta assente/di altro lab/già eliminata → 404 [nuovo vs §4.3]
--   {"esito":"occupata"}               c'è dentro un lavoro (riga viva) → 409
--   {"esito":"ok"}                     soft-delete eseguito
-- RAISE: nessuna.
--
-- ORDINE DEI LOCK: cassette(FOR UPDATE) → (lettura senza lock di cassette_lavori) → cassette.
CREATE FUNCTION public.cassetta_elimina_atomica(p_lab uuid, p_cassetta_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM 1 FROM cassette WHERE id = p_cassetta_id AND laboratorio_id = p_lab
    AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','cassetta_non_trovata'); END IF;
  PERFORM 1 FROM cassette_lavori
   WHERE cassetta_id = p_cassetta_id AND laboratorio_id = p_lab AND liberato_at IS NULL;
  IF FOUND THEN RETURN json_build_object('esito','occupata'); END IF;
  UPDATE cassette SET deleted_at = now(), updated_at = now()
   WHERE id = p_cassetta_id AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','ok');
END $$;

-- ESITI (json, completi — D5):
--   {"esito":"ordine_non_valido"}  array NULL/vuoto · elementi NULL · duplicati ·
--                                  id estranei al lab o di cassette eliminate → 422
--   {"esito":"ok"}                 riordino applicato (politica tollerante: le vive non
--                                  elencate scivolano in coda conservando l'ordine relativo)
-- RAISE: nessuna.
--
-- ORDINE DEI LOCK: solo cassette, e in ordine di id (LockRows sopra Sort — verificato con EXPLAIN).
CREATE FUNCTION public.cassette_riordina(p_lab uuid, p_ordine uuid[])
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_n int;
BEGIN
  IF p_ordine IS NULL OR array_length(p_ordine,1) IS NULL THEN
    RETURN json_build_object('esito','ordine_non_valido');
  END IF;
  IF array_position(p_ordine, NULL) IS NOT NULL THEN
    RETURN json_build_object('esito','ordine_non_valido');            -- elementi NULL
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_ordine) x) <> array_length(p_ordine,1) THEN
    RETURN json_build_object('esito','ordine_non_valido');            -- duplicati
  END IF;
  -- lock deterministico (LockRows sopra Sort ⇒ acquisizione in ordine di id): due riordini
  -- concorrenti in senso opposto non possono più incrociarsi (deadlock N3, riprodotto 2/3).
  -- FOR NO KEY UPDATE, non FOR UPDATE: cambiamo solo colonne non-chiave, così non blocchiamo
  -- le FK degli INSERT su cassette_lavori.
  PERFORM 1 FROM cassette
   WHERE laboratorio_id = p_lab AND deleted_at IS NULL
   ORDER BY id FOR NO KEY UPDATE;
  SELECT count(*) INTO v_n FROM cassette
  WHERE id = ANY(p_ordine) AND laboratorio_id = p_lab AND deleted_at IS NULL;
  IF v_n <> array_length(p_ordine,1) THEN
    RETURN json_build_object('esito','ordine_non_valido');            -- id estranei/morti
  END IF;
  UPDATE cassette c SET posizione = (o.ord - 1)::int, updated_at = now()
  FROM unnest(p_ordine) WITH ORDINALITY o(id, ord)
  WHERE c.id = o.id AND c.laboratorio_id = p_lab AND c.deleted_at IS NULL;
  -- politica tollerante: le vive non elencate scivolano in coda, ordine relativo conservato
  UPDATE cassette c SET posizione = (array_length(p_ordine,1) + r.rk - 1)::int, updated_at = now()
  FROM (SELECT id, row_number() OVER (ORDER BY posizione, created_at, id) rk
        FROM cassette WHERE laboratorio_id = p_lab AND deleted_at IS NULL
          AND NOT (id = ANY(p_ordine))) r
  WHERE c.id = r.id AND c.laboratorio_id = p_lab;
  RETURN json_build_object('esito','ok');
END $$;

-- ESITI (json, completi — D5): esattamente i 3 della tabella §4.3, nessuno in più.
--   {"esito":"niente_da_riassegnare"}                      nulla da fare (vedi sotto i 3 casi)
--   {"esito":"occupata_nel_frattempo","nome":"<nome>"}     qualcun altro è entrato → 409
--   {"esito":"riassegnata","nome":"<nome>"}                riaperta la riga viva sulla cassetta
-- RAISE: nessuna. Fail-soft: è chiamata subito dopo un annullo consegna già riuscito, quindi
-- non deve MAI far fallire l'operazione che la precede.
--
-- ORDINE DEI LOCK: (letture senza lock) → cassette(FOR UPDATE) → cassette_lavori(INSERT)
--                  → lavori → kpi. Canonico.
CREATE FUNCTION public.cassetta_riassegna_post_annullo(p_lab uuid, p_lavoro uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_cassetta uuid; v_nome text;
BEGIN
  -- (finding #6) senza questa guardia si apriva una riga viva per un lavoro annullato.
  -- RATIFICATA da Francesco (21/07/2026): l'esito è `niente_da_riassegnare`, NON un
  -- `lavoro_non_valido` nuovo. Riusare un esito esistente tiene il contratto §4.3 a 3 esiti
  -- invece di allargarlo a 4, e il comportamento è identico: la RPC è fail-soft e viene
  -- chiamata subito dopo un annullo riuscito, quindi «il lavoro non è (più) riassegnabile»
  -- e «non c'è niente da riassegnare» sono la stessa cosa per il chiamante.
  -- Il Task 9 LOGGA comunque l'esito: `niente_da_riassegnare` su un lavoro che dovrebbe
  -- essere stato riaperto significa che l'annullo consegna non ha riaperto il lavoro.
  PERFORM 1 FROM lavori WHERE id = p_lavoro AND laboratorio_id = p_lab
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
  IF NOT FOUND THEN RETURN json_build_object('esito','niente_da_riassegnare'); END IF;

  SELECT cl.cassetta_id INTO v_cassetta
  FROM cassette_lavori cl JOIN cassette c ON c.id = cl.cassetta_id
  WHERE cl.lavoro_id = p_lavoro AND cl.laboratorio_id = p_lab
    AND cl.liberato_per = 'consegna' AND c.deleted_at IS NULL
  ORDER BY cl.liberato_at DESC LIMIT 1;
  IF v_cassetta IS NULL THEN RETURN json_build_object('esito','niente_da_riassegnare'); END IF;

  -- regola d'oro: lock della cassetta PRIMA dell'INSERT, con ricontrollo deleted_at
  -- (sotto READ COMMITTED chi si sblocca rilegge la riga e la scarta se non soddisfa più il WHERE)
  SELECT nome INTO v_nome FROM cassette
  WHERE id = v_cassetta AND laboratorio_id = p_lab AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','niente_da_riassegnare'); END IF;

  BEGIN
    INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id)
    VALUES (p_lab, v_cassetta, p_lavoro);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','occupata_nel_frattempo','nome', v_nome);
  END;
  UPDATE lavori SET numero_cassetta = v_nome WHERE id = p_lavoro AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','riassegnata','nome', v_nome);
END $$;

-- ESITI (json, completi — D5): RPC INTERA assente dalla tabella §4.3 (nasce da D-10,
-- ratificata il 21/07) — l'intero contratto qui sotto è nuovo per chi mappa esito→HTTP.
--   {"esito":"lavoro_non_valido"}                  p_lavoro_nuovo assente/di altro lab/
--                                                  soft-deleted/consegnato/annullato → 422
--   {"esito":"niente_da_trasferire"}               il vecchio non è in nessuna cassetta ·
--                                                  la cassetta è stata eliminata nel frattempo ·
--                                                  l'occupante è cambiato sotto il lock
--   {"esito":"occupata","nome":"<nome>"}           il nuovo ha già una riga viva altrove → 409
--   {"esito":"trasferita","nome":"<nome>"}         trasferimento eseguito
-- RAISE: nessuna.
--
-- ORDINE DEI LOCK (E1 — chiuso): (letture senza lock) → cassette(FOR UPDATE) →
--   cassette_lavori(FOR UPDATE OF cl) → lavori(nuovo, FOR NO KEY UPDATE) →
--   cassette_lavori(UPDATE+INSERT) → lavori(vecchio) → kpi → lavori(nuovo, già tenuta).
-- Canonico. Come in `assegna` (2b): TUTTE le righe di `lavori` che questa RPC toccherà sono
-- bloccate PRIMA che trg_dashboard_lavori prenda dashboard_kpi_cache[lab].
CREATE FUNCTION public.cassetta_trasferisci_rifacimento(p_lab uuid, p_lavoro_vecchio uuid, p_lavoro_nuovo uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_cassetta uuid; v_nome text; v_occupante uuid;
BEGIN
  -- D-10 (ratificata 21/07): al rifacimento la cassetta SI TRASFERISCE al lavoro nuovo
  -- (fisicamente il caso resta nella stessa cassetta). La RPC 007 crea_rifacimento_atomico NON si tocca.
  -- N5: si valida anche lo stato del lavoro nuovo, non solo deleted_at.
  PERFORM 1 FROM lavori WHERE id = p_lavoro_nuovo AND laboratorio_id = p_lab
    AND deleted_at IS NULL AND stato NOT IN ('consegnato','annullato');
  IF NOT FOUND THEN RETURN json_build_object('esito','lavoro_non_valido'); END IF;

  -- 1) trova la cassetta SENZA lock, 2) prendi il lock sulla cassetta, 3) poi blocca la riga storico:
  --    è l'ordine canonico cassette → cassette_lavori (l'inverso è il deadlock N2)
  SELECT cl.cassetta_id INTO v_cassetta
  FROM cassette_lavori cl
  WHERE cl.lavoro_id = p_lavoro_vecchio AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL;
  IF v_cassetta IS NULL THEN RETURN json_build_object('esito','niente_da_trasferire'); END IF;

  SELECT nome INTO v_nome FROM cassette
  WHERE id = v_cassetta AND laboratorio_id = p_lab AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito','niente_da_trasferire'); END IF;

  SELECT cl.lavoro_id INTO v_occupante FROM cassette_lavori cl
  WHERE cl.cassetta_id = v_cassetta AND cl.laboratorio_id = p_lab AND cl.liberato_at IS NULL
  FOR UPDATE OF cl;
  IF v_occupante IS DISTINCT FROM p_lavoro_vecchio THEN
    RETURN json_build_object('esito','niente_da_trasferire');   -- è cambiato tutto nel frattempo
  END IF;

  IF EXISTS (SELECT 1 FROM cassette_lavori
             WHERE lavoro_id = p_lavoro_nuovo AND liberato_at IS NULL) THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);  -- pre-check: nessuno sfratto (finding #4)
  END IF;

  -- ⚠️ E1 — pre-lock della riga di `lavori` del NUOVO, identico a quello di assegna (2b).
  -- Senza, questa RPC conserva esattamente l'inversione `kpi → lavori` che D2 ha chiuso in
  -- `assegna`: l'`UPDATE lavori(vecchio)` qui sotto prende dashboard_kpi_cache[lab] a fine
  -- statement (trg_dashboard_lavori è AFTER … FOR EACH ROW) e SOLO DOPO si chiede la riga di
  -- `lavori(nuovo)` — l'inverso di chiunque scriva su `lavori`, che fa lavori → kpi dentro la
  -- stessa statement. Era l'UNICA delle 8 RPC a chiedere un lock di riga dopo aver preso i KPI
  -- (audit round 2, E1: 4 lenti su 4, deadlock 40P01 riprodotto 6/6 in forma deterministica,
  -- con la RPC stessa come vittima ⇒ 500 al posto di 200/409 su un percorso dichiarato atomico).
  -- `FOR NO KEY UPDATE` per gli stessi tre motivi elencati in assegna (2b): non è DML quindi non
  -- fa scattare trg_dashboard_lavori; è compatibile con il FOR KEY SHARE che le FK di
  -- cassette_lavori prendono su `lavori`; conflitta con qualunque UPDATE su quella riga.
  PERFORM 1 FROM lavori WHERE id = p_lavoro_nuovo AND laboratorio_id = p_lab FOR NO KEY UPDATE;

  BEGIN
    UPDATE cassette_lavori SET liberato_at = now(), liberato_per = 'rifacimento'
    WHERE lavoro_id = p_lavoro_vecchio AND laboratorio_id = p_lab AND liberato_at IS NULL;
    INSERT INTO cassette_lavori (laboratorio_id, cassetta_id, lavoro_id)
    VALUES (p_lab, v_cassetta, p_lavoro_nuovo);
  EXCEPTION WHEN unique_violation THEN
    RETURN json_build_object('esito','occupata','nome', v_nome);
  END;
  UPDATE lavori SET numero_cassetta = NULL   WHERE id = p_lavoro_vecchio AND laboratorio_id = p_lab;
  UPDATE lavori SET numero_cassetta = v_nome WHERE id = p_lavoro_nuovo  AND laboratorio_id = p_lab;
  RETURN json_build_object('esito','trasferita','nome', v_nome);
END $$;

-- ESITI (D5): NESSUNO — questa RPC è `RETURNS void`, non produce json. Per il Task 6 la
-- mappatura è: ritorno normale → 204/200; qualunque eccezione → 500 (è un bug della route).
-- RAISE possibili (tutte errori di programmazione, §3.9 — la route non deve mai produrle):
--   'p_lab obbligatorio' · 'p_user obbligatorio' · 'valore nav_preferences non valido: NULL' ·
--   'home pref non valida' · 'parete_intro_vista accetta solo true' ·
--   'chiave nav_preferences non ammessa: %'
-- 0 righe aggiornate = NO-OP SILENZIOSO (utente di un altro lab, o soft-deleted): non è un errore.
--
-- R-4.3: firma con p_lab. L'UPDATE si chiude su laboratorio_id = p_lab AND deleted_at IS NULL:
-- una route bacata può al massimo toccare utenti del PROPRIO lab (difesa in profondità —
-- auth.uid() è NULL sotto service_role, quindi il vincolo «solo self» non è esprimibile qui).
-- Il Task 6 deve passare context.laboratorioId oltre a context.userId.
-- Le RAISE restano: sono errori di programmazione, non esiti di dominio (la route non deve produrli).
CREATE FUNCTION public.utente_set_nav_pref(p_lab uuid, p_user uuid, p_chiave text, p_valore jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF p_lab   IS NULL THEN RAISE EXCEPTION 'p_lab obbligatorio'; END IF;
  IF p_user  IS NULL THEN RAISE EXCEPTION 'p_user obbligatorio'; END IF;
  -- p_valore NULL scriveva {"home": null} scavalcando l'allowlist (finding #3, riprodotto);
  -- 'null'::jsonb era invece già respinto correttamente.
  IF p_valore IS NULL THEN RAISE EXCEPTION 'valore nav_preferences non valido: NULL'; END IF;
  -- allowlist chiavi + validazione valore per chiave (merge jsonb atomico, niente RMW raceable)
  IF p_chiave = 'home' THEN
    IF p_valore NOT IN ('"due_stanze"'::jsonb, '"pile"'::jsonb, '"parete"'::jsonb) THEN
      RAISE EXCEPTION 'home pref non valida';
    END IF;
  ELSIF p_chiave = 'parete_intro_vista' THEN
    IF p_valore <> 'true'::jsonb THEN
      RAISE EXCEPTION 'parete_intro_vista accetta solo true';
    END IF;
  ELSE
    RAISE EXCEPTION 'chiave nav_preferences non ammessa: %', p_chiave;
  END IF;
  -- Nessuna RAISE sul «0 righe aggiornate»: R-4.3 ratifica esplicitamente il NO-OP SILENZIOSO per
  -- gli utenti con laboratorio_id NULL (admin_sistema — non usano la home di lab). Una RAISE qui
  -- sarebbe raggiungibile dalla route, contro il principio di §3.9 («la route non deve mai produrle»).
  UPDATE utenti SET nav_preferences =
    coalesce(nav_preferences,'{}'::jsonb) || jsonb_build_object(p_chiave, p_valore)
  WHERE id = p_user AND laboratorio_id = p_lab AND deleted_at IS NULL;
END $$;

-- GRANT/REVOKE su tutte le RPC (firme identiche alle definizioni, default inclusi)
REVOKE EXECUTE ON FUNCTION public.cassetta_libera_atomica(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_assegna_atomica(uuid,uuid,uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_rinomina_atomica(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_elimina_atomica(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassette_riordina(uuid,uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_riassegna_post_annullo(uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cassetta_trasferisci_rifacimento(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.utente_set_nav_pref(uuid,uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cassetta_libera_atomica(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_assegna_atomica(uuid,uuid,uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_rinomina_atomica(uuid,uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_elimina_atomica(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassette_riordina(uuid,uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_riassegna_post_annullo(uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.cassetta_trasferisci_rifacimento(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.utente_set_nav_pref(uuid,uuid,text,jsonb) TO service_role;
