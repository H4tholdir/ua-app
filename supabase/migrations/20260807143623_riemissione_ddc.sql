-- supabase/migrations/20260807143623_riemissione_ddc.sql
-- Ondata «si deve sempre poter intervenire», Task 5 — LA RIEMISSIONE.
-- Spec: docs/superpowers/specs/2026-08-06-intervento-post-consegna-design.md §8.1, §8.2
-- Verbale: D293 (`annullata` = SUPERATA, mai «nulla») · D299 (la riemissione NON
--          tocca `lavori.stato` e non chiama `riapri_lavoro_atomica`).
--
-- ═══ ① LE DUE COLONNE CHE MANCANO — e la spec ne dichiara DUE, non una ═══════
-- 🛑 Il piano (Task 5) ne elencava una sola, `sostituisce_id`: è sotto-specificato
--    rispetto alla spec §8.2 che esegue, dove sono «le due cose che mancano».
--    Riferito, e fatte entrambe: sono la stessa migration, e farne una sola ora
--    significherebbe una seconda migration dopo per l'altra metà.
--
--  · `sostituisce_id` — oggi il legame fra la nuova e l'annullata si DEDUCE dal
--    lavoro comune. A un ispettore va DETTO, non fatto dedurre (§8.2).
--  · `annullata_da_evento_id` — il MOTIVO dell'annullamento. `annulla_consegna_atomica`
--    non prende alcuna causale; con `eventi_qualita` la causale esiste già: si
--    COLLEGA, non si duplica (§8.2).
--
-- ⚠️ TRE percorsi portano una dichiarazione ad `annullata`, e solo DUE possono
--    scrivere la causale — lo dico invece di lasciarlo scoprire a chi trova la
--    colonna vuota:
--      · `annulla_consegna_atomica` — NON ha un evento (nasce dalla finestra dei
--        10 minuti) e non lo avrà: muore col Task 7;
--      · `riapri_lavoro_atomica` — ha già `p_evento_id` fra i parametri e da oggi
--        lo scrive (§③ qui sotto). Senza questa aggiunta la colonna sarebbe
--        popolata da UNO dei due percorsi vivi, e una causale mancante si
--        leggerebbe come «questo annullo non aveva un motivo» invece che «il
--        motivo non è stato registrato»;
--      · `riemetti_ddc_atomica` — questa, che nasce già con la causale.

ALTER TABLE public.dichiarazioni_conformita
  ADD COLUMN IF NOT EXISTS sostituisce_id         UUID REFERENCES public.dichiarazioni_conformita(id),
  ADD COLUMN IF NOT EXISTS annullata_da_evento_id UUID REFERENCES public.eventi_qualita(id);

COMMENT ON COLUMN public.dichiarazioni_conformita.sostituisce_id IS
  'La dichiarazione che questa SUPERA (D293: annullata = superata, mai «nulla»). '
  'Il filo va DETTO a un ispettore, non fatto dedurre dal lavoro comune (spec §8.2).';
COMMENT ON COLUMN public.dichiarazioni_conformita.annullata_da_evento_id IS
  'L''evento di qualità che ha causato l''annullamento. Si COLLEGA la causale, non '
  'si duplica (spec §8.2). Vuoto sugli annulli del vecchio percorso a 10 minuti.';

-- Nessuna dichiarazione supera sé stessa — stessa forma di `valutazione_no_self_ref`
-- (`20260806140823_eventi_qualita.sql`).
ALTER TABLE public.dichiarazioni_conformita
  DROP CONSTRAINT IF EXISTS ddc_no_self_ref;
ALTER TABLE public.dichiarazioni_conformita
  ADD CONSTRAINT ddc_no_self_ref CHECK (sostituisce_id IS NULL OR sostituisce_id <> id);

-- Una dichiarazione può essere superata da UNA SOLA successiva: due che
-- affermassero di superare la stessa renderebbero la catena illeggibile.
-- Stessa forma parziale di `valutazione_viva_unique` e `ddc_lavoro_attiva_unique`.
CREATE UNIQUE INDEX IF NOT EXISTS ddc_sostituisce_unique
  ON public.dichiarazioni_conformita (sostituisce_id) WHERE sostituisce_id IS NOT NULL;

-- ═══ ② LA RIEMISSIONE, ATOMICA ═══════════════════════════════════════════════
--
-- 🛑 PERCHÉ UNA RPC E NON DUE SCRITTURE DAL CODICE. `ddc_lavoro_attiva_unique`
--    (`laboratorio_id, lavoro_id` WHERE `stato <> 'annullata'`) impedisce due
--    dichiarazioni vive sullo stesso lavoro: la nuova non può nascere prima che
--    la vecchia sia annullata (spec §8.1). Fra i due passi, fatti dal codice, c'è
--    una finestra in cui il lavoro **non ha nessuna dichiarazione viva** — e su un
--    lavoro consegnato quello è uno stato che nessun CHECK e nessun indice possono
--    segnalare, perché «zero dichiarazioni» è legittimo per un lavoro mai
--    consegnato. ➡️ Le due scritture stanno in una transazione sola.
--    🔑 È la regola di casa già scritta per il rifacimento (`ua-app/CLAUDE.md` §9:
--    «usa RPC atomica — MAI 3 INSERT separati»), non una preferenza di oggi.
--    ⚠️ Il PDF si rende e si carica su Storage PRIMA, fuori da qui: quelle non
--    sono scritture in banca dati. Se questa funzione fallisce restano un file
--    orfano e un numero bruciato — nessuno dei due rompe niente, e per la
--    dichiarazione il numero non è nemmeno un contenuto dovuto (Allegato XIII
--    punto 1 non lo nomina; censimento D294).
--
-- 🔑 PERCHÉ `jsonb_populate_record` SU UNA RIGA BASE, e non un elenco di 58
--    colonne scritto a mano. Un elenco a mano vivrebbe in DUE posti (qui e nel
--    TypeScript) e divergerebbe: è la quarta volta che in questo progetto un
--    elenco scritto a mano sembra completo e non lo è. Con la riga vecchia come
--    BASE, le colonne che il codice non manda conservano il loro valore invece di
--    diventare `NULL` — che è il difetto per cui `jsonb_populate_record` va
--    evitato quando la base è vuota.
--    🛑 E IL SUO ALTRO DIFETTO — le chiavi senza colonna vengono IGNORATE IN
--    SILENZIO — è chiuso qui sotto dal controllo sul catalogo, non da una prova
--    che potrebbe invecchiare. È esattamente il caso R-P6 «un dato che smette di
--    salvarsi senza un errore».

CREATE OR REPLACE FUNCTION public.riemetti_ddc_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid, p_nuova jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_vecchia public.dichiarazioni_conformita%ROWTYPE;
  v_nuova   public.dichiarazioni_conformita%ROWTYPE;
  v_ignote  text[];
  v_rows    int;
BEGIN
  IF p_nuova IS NULL OR jsonb_typeof(p_nuova) <> 'object' THEN
    RAISE EXCEPTION 'riemissione: la dichiarazione nuova non è un oggetto';
  END IF;

  -- R-P6 — NESSUNA CHIAVE SI PERDE IN SILENZIO. Senza questo controllo una
  -- chiave scritta male (o una colonna rinominata) non finirebbe da nessuna
  -- parte, e la riemissione riuscirebbe con un dato in meno.
  SELECT array_agg(k ORDER BY k) INTO v_ignote
  FROM jsonb_object_keys(p_nuova) AS k
  WHERE k NOT IN (
    SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'dichiarazioni_conformita'
  );
  IF v_ignote IS NOT NULL THEN
    RAISE EXCEPTION 'riemissione: chiavi che non sono colonne di dichiarazioni_conformita: %', v_ignote;
  END IF;

  -- La riemissione non è mai senza motivo (D263) — stessa guardia di
  -- `riapri_lavoro_atomica`, e l'evento dev'essere di QUESTO lavoro e laboratorio.
  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  -- La dichiarazione VIVA. `<> 'annullata'` è la STESSA definizione che usa
  -- `ddc_lavoro_attiva_unique` per dire «viva»: mai un elenco di stati, che il
  -- giorno in cui il vocabolario cresce diventa muto.
  SELECT * INTO v_vecchia FROM dichiarazioni_conformita
   WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
     AND stato <> 'annullata'
   FOR UPDATE;
  -- 🔑 Non è un errore: è «non c'è niente da riemettere». Una riemissione
  -- presuppone qualcosa da superare — senza, sarebbe una PRIMA emissione, che è
  -- un altro atto e passa da un'altra strada.
  IF NOT FOUND THEN RETURN json_build_object('esito', 'nessuna_dichiarazione_viva'); END IF;

  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id, updated_at = now()
   WHERE id = v_vecchia.id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  -- 🛑 FAIL-CLOSED, e questo è IL controllo del compito. Se l'annullo non tocca
  -- nessuna riga e si tirasse dritto, l'inserimento sbatterebbe contro
  -- `ddc_lavoro_attiva_unique` — oppure, peggio, il codice a monte troverebbe la
  -- vecchia ancora viva e la restituirebbe come «riemessa». Cioè esattamente il
  -- difetto della spec §8.1: fallire dichiarando successo, con in mano il
  -- documento VECCHIO.
  IF v_rows <> 1 THEN
    RAISE EXCEPTION 'riemissione: annullo della dichiarazione % fallito (righe: %)', v_vecchia.id, v_rows;
  END IF;

  -- La nuova NASCE DALLA VECCHIA e ne sovrascrive i campi mandati.
  v_nuova := jsonb_populate_record(
    v_vecchia,
    p_nuova
      || jsonb_build_object(
           'id',             gen_random_uuid(),
           'laboratorio_id', p_laboratorio_id,
           'lavoro_id',      p_lavoro_id,
           -- il filo verso quella che supera (§8.2)
           'sostituisce_id', v_vecchia.id,
           'created_at',     now(),
           'updated_at',     now()
         )
      -- 🛑 AZZERATI A MANO, e ognuno per la sua ragione: descrivono la vita del
      -- documento VECCHIO e portarli avanti sarebbe affermare il falso sul nuovo.
      --   · `annullata_da_evento_id` — la nuova è viva, non annullata;
      --   · `firmata_at` / `firma_digitale_url` — il documento nuovo NON è firmato;
      --   · `inviata_al_dentista*` — non è ancora stato mandato a nessuno;
      --   · `deleted_at` — non nasce cancellato.
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
    'esito', 'ok',
    'nuova_id', v_nuova.id,
    'vecchia_id', v_vecchia.id,
    'numero', v_nuova.numero_ddc,
    'numero_superato', v_vecchia.numero_ddc
  );
END;
$$;

REVOKE ALL ON FUNCTION public.riemetti_ddc_atomica(uuid,uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.riemetti_ddc_atomica(uuid,uuid,uuid,jsonb) TO service_role;

COMMENT ON FUNCTION public.riemetti_ddc_atomica(uuid,uuid,uuid,jsonb) IS
  'Riemette la dichiarazione di un lavoro: annulla la viva (registrandone la '
  'causale) e ne inserisce una nuova che la SUPERA, in una transazione sola '
  '(spec §8.1). NON tocca lavori.stato (D299). Richiede un eventi_qualita valido.';

-- ═══ ③ `riapri_lavoro_atomica` SCRIVE LA CAUSALE ═════════════════════════════
-- Ha già `p_evento_id` fra i parametri e lo VALIDA; gli mancava solo di
-- registrarlo sulla riga che annulla. Senza questa riga la colonna nuova
-- nascerebbe popolata da un percorso su due — e una colonna vuota a metà è
-- peggio di una colonna assente: si legge come un fatto («non c'era un motivo»)
-- invece che come una lacuna.
-- 🛑 Il resto della funzione è INVARIATO rispetto a `20260806210400`, e va
-- riletto da lì: qui cambia UNA assegnazione dentro l'UPDATE della dichiarazione.
CREATE OR REPLACE FUNCTION public.riapri_lavoro_atomica(
  p_lavoro_id uuid, p_laboratorio_id uuid, p_evento_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_lavoro RECORD;
  v_rows int;
  v_ddc_tot int;
  v_ddc_assente boolean := false;
BEGIN
  SELECT id, stato INTO v_lavoro
  FROM lavori
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'non_trovato'); END IF;
  IF v_lavoro.stato <> 'consegnato' THEN RETURN json_build_object('esito', 'non_consegnato'); END IF;

  PERFORM 1 FROM eventi_qualita
   WHERE id = p_evento_id AND lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  IF NOT FOUND THEN RETURN json_build_object('esito', 'evento_non_valido'); END IF;

  UPDATE lavori SET
    stato = 'pronto', conformato = false, data_conformazione = NULL,
    data_consegna_effettiva = NULL, consegna_completata_at = NULL,
    consegna_in_corso = false, consegna_tap_at = NULL,
    proposta_dentista = NULL, proposta_at = NULL
  WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE EXCEPTION 'riapertura: ripristino lavoro fallito'; END IF;

  -- ⬇️ L'UNICA riga cambiata dal 06/08: la causale si registra.
  UPDATE dichiarazioni_conformita
     SET stato = 'annullata', annullata_da_evento_id = p_evento_id
  WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id
    AND stato <> 'annullata';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    SELECT count(*) INTO v_ddc_tot FROM dichiarazioni_conformita
    WHERE lavoro_id = p_lavoro_id AND laboratorio_id = p_laboratorio_id;
    IF v_ddc_tot = 0 THEN
      v_ddc_assente := true;
    ELSE
      RAISE EXCEPTION 'riapertura: dichiarazione in stato incoerente per lavoro %', p_lavoro_id;
    END IF;
  END IF;

  RETURN json_build_object('esito', 'ok', 'ddc_assente', v_ddc_assente);
END;
$$;

REVOKE ALL ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.riapri_lavoro_atomica(uuid,uuid,uuid) TO service_role;
