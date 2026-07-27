-- 20260727120300_lavori_denti_rpc.sql — Ondata (a), parte 4/4.
-- Spec §4. NON aggiungere BEGIN;/COMMIT; — il runner Supabase avvolge già la
-- migration (N6).
--
-- Perché due RPC e non due UPDATE dalla route: lavori_denti è in REVOKE ALL
-- (service_role compreso, nota E8). Queste funzioni sono SECURITY DEFINER,
-- quindi girano coi privilegi dell'owner (postgres). Ogni funzione riceve p_lab
-- e lo applica in OGNI clausola WHERE: sui denti il tenant non si deduce, si
-- impone.
--
-- ⚠️ LIMITE NOTO, non chiuso qui (vale per lavoro_crea_atomico): le quattro
--    chiavi esterne del lavoro — cliente_id, paziente_id, tecnico_id, ciclo_id —
--    hanno FK SEMPLICI verso le rispettive tabelle, non composite con
--    laboratorio_id. Questa funzione NON verifica che appartengano a p_lab:
--    l'unica guardia è nella route (`FK_FIELDS_INSERT`, src/app/api/lavori/route.ts,
--    403 col nome del campo). Chiudere il buco richiede o quattro UNIQUE (id,
--    laboratorio_id) + FK composite, o quattro EXISTS qui dentro: è una
--    decisione di perimetro che non appartiene a questo task.
--
-- 🔎 TRE CORREZIONI AL PIANO, trovate provando lo schema reale (27/07/2026):
--    ① lavori.denti_mancanti e lavori.denti_impianti sono `integer[] NOT NULL
--      DEFAULT '{}'`. `array_agg(...)` su zero righe restituisce NULL, non '{}':
--      il testo del piano faceva quindi FALLIRE ogni chiamata che non contenesse
--      almeno un dente per OGNI ruolo — cioè il caso normale. Da qui i COALESCE.
--    ② lavori.data_ingresso è `timestamptz NOT NULL DEFAULT now()`. Inserire un
--      NULL esplicito NON ricade sul DEFAULT: la INSERT abortisce. Da qui il
--      COALESCE con now(). Il cast è a timestamptz e non a date per non
--      troncare a mezzanotte un istante completo (oggi la route manda
--      `oggiRomaISO()`, cioè YYYY-MM-DD: comportamento identico a prima).
--    ③ `CREATE OR REPLACE` invece di `CREATE`: convenzione del repo e ripresa
--      sicura se una push si interrompe a metà.

-- ============ 1. Sostituzione integrale dei denti di un lavoro ============
-- Idempotente per costruzione: 6 denti = 1 chiamata, non 6. Chi chiama manda
-- la lista che vuole vedere, non un delta.
CREATE OR REPLACE FUNCTION public.lavoro_denti_sostituisci_atomica(
  p_lab                uuid,
  p_lavoro             uuid,
  p_denti              jsonb,
  p_atteso_updated_at  timestamptz
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_updated_at timestamptz;
BEGIN
  -- Il lock sul lavoro ordina tutto il resto ed è anche il controllo di
  -- esistenza + appartenenza al tenant in un colpo solo: un lavoro di un altro
  -- laboratorio semplicemente non si trova.
  SELECT updated_at INTO v_updated_at
    FROM lavori
   WHERE id = p_lavoro AND laboratorio_id = p_lab AND deleted_at IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('esito', 'non_trovato');
  END IF;

  -- Controllo di concorrenza: due persone sullo stesso lavoro non si
  -- sovrascrivono in silenzio. Chi arriva secondo riceve indietro il timestamp
  -- corrente e può rileggere. ⚠️ È un pattern NUOVO per questo repo: introdotto
  -- qui deliberatamente (spec §4), non ereditato.
  IF p_atteso_updated_at IS NOT NULL AND v_updated_at IS DISTINCT FROM p_atteso_updated_at THEN
    RETURN json_build_object('esito', 'conflitto', 'updated_at', v_updated_at);
  END IF;

  DELETE FROM lavori_denti WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab;

  INSERT INTO lavori_denti (
    laboratorio_id, lavoro_id, fdi, ruolo,
    scala, codice, codice_collo, codice_corpo, codice_incisale, provenienza
  )
  SELECT
    p_lab,
    p_lavoro,
    (d->>'fdi')::smallint,
    COALESCE(d->>'ruolo', 'elemento'),
    d->>'scala',
    d->>'codice',
    d->>'codice_collo',
    d->>'codice_corpo',
    d->>'codice_incisale',
    COALESCE(d->>'provenienza', 'prescritto')
  FROM jsonb_array_elements(COALESCE(p_denti, '[]'::jsonb)) AS d;

  -- 🔴 DENORMALIZZAZIONE OBBLIGATORIA — non è una comodità, chiude un buco che
  -- il taglio in ondate creerebbe. Dopo il Task 10 nessuno scrive più
  -- `lavori.denti_coinvolti` dall'applicazione, ma TRE lettori la leggono
  -- ancora e restano tali fino all'ondata (c):
  --   · DdcTemplate.tsx:258      → la Dichiarazione stamperebbe zero denti
  --   · generate-ddc.ts:97       → lo snapshot congelerebbe un vuoto
  --   · SchedaLavoroV3.tsx:286   → la scheda del lavoro non li mostrerebbe più
  -- Un lavoro creato dopo l'ondata (a) e consegnato prima della (c) uscirebbe
  -- con un documento a valore legale privo di un elemento dell'Allegato XIII.
  -- La colonna resta quindi VIVA come denormalizzazione, tenuta in sincronia
  -- SOLO da questa RPC — stesso pattern di `numero_cassetta`. La sentinella del
  -- Task 10 non è in contraddizione: dice «nessuno la scrive a mano», non
  -- «nessuno la scrive».
  -- Muore nell'ondata (c), quando i lettori passano a `lavori_denti`.
  --
  -- 🔴 I COALESCE non sono cosmetici (correzione ① in testa al file):
  --    denti_mancanti e denti_impianti sono NOT NULL DEFAULT '{}'. Senza,
  --    qualunque lista priva di un impianto — cioè quasi tutte — farebbe
  --    abortire la funzione con una violazione di NOT NULL.
  --    denti_coinvolti è invece nullable: lo si porta a '{}' per coerenza con
  --    le altre due e con ciò che scrivono oggi TabClinica.tsx:31 e
  --    crea-lavoro.ts:195 (array vuoto, mai NULL). I tre lettori vivi
  --    reggono entrambe le forme (`?? []`, `?.length`).
  --
  -- ⚠️ `updated_at = now()` è OGGI ridondante: lavori ha già il trigger
  --    trg_lavori_updated_at → trigger_set_updated_at(), che fa esattamente
  --    `NEW.updated_at = now()` (stesso now(), stessa transazione: nessuna
  --    interazione col controllo di concorrenza qui sopra). Si tiene lo stesso,
  --    perché è QUI che il gettone di concorrenza deve avanzare: farlo dipendere
  --    da un trigger dichiarato in un'altra migration significherebbe che
  --    rimuovendo quel trigger si otterrebbero aggiornamenti persi in silenzio.
  UPDATE lavori SET
    denti_coinvolti = COALESCE((SELECT array_agg(fdi::text ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND ruolo = 'elemento'), '{}'::text[]),
    denti_mancanti  = COALESCE((SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND ruolo = 'mancante'), '{}'::integer[]),
    denti_impianti  = COALESCE((SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = p_lavoro AND laboratorio_id = p_lab AND ruolo = 'impianto'), '{}'::integer[]),
    updated_at = now()
   WHERE id = p_lavoro AND laboratorio_id = p_lab
  RETURNING updated_at INTO v_updated_at;

  RETURN json_build_object('esito', 'ok', 'updated_at', v_updated_at);
END $$;

-- ============ 2. Creazione atomica: lavoro + denti, o niente ============
-- Perimetro: SOLO lavoro + denti. Le fasi da ciclo restano fuori e fail-soft
-- (spec §4): sono correggibili dopo, un colore perso no.
CREATE OR REPLACE FUNCTION public.lavoro_crea_atomico(
  p_lab    uuid,
  p_lavoro jsonb,
  p_denti  jsonb
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
    colore_scala, colore_codice
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
    -- Correzione ② (v. testa del file): NOT NULL senza ricaduta sul DEFAULT.
    COALESCE(NULLIF(p_lavoro->>'data_ingresso', '')::timestamptz, now()),
    p_lavoro->>'colore_scala',
    p_lavoro->>'colore_codice'
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

  -- Stessa denormalizzazione della RPC sopra, e per la stessa ragione: la
  -- Dichiarazione di Conformità legge ancora `lavori.denti_coinvolti` fino
  -- all'ondata (c). Vedi il commento esteso in
  -- lavoro_denti_sostituisci_atomica: le due funzioni devono mantenere la
  -- colonna nello STESSO modo, o la scheda mostrerebbe una cosa e il documento
  -- un'altra a seconda di come il lavoro è nato — per questo qui compaiono sia
  -- i COALESCE sia il filtro su laboratorio_id, che il piano scriveva solo
  -- nell'altra funzione.
  UPDATE lavori SET
    denti_coinvolti = COALESCE((SELECT array_agg(fdi::text ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND laboratorio_id = p_lab AND ruolo = 'elemento'), '{}'::text[]),
    denti_mancanti  = COALESCE((SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND laboratorio_id = p_lab AND ruolo = 'mancante'), '{}'::integer[]),
    denti_impianti  = COALESCE((SELECT array_agg(fdi::integer ORDER BY fdi) FROM lavori_denti
                        WHERE lavoro_id = v_id AND laboratorio_id = p_lab AND ruolo = 'impianto'), '{}'::integer[])
   WHERE id = v_id AND laboratorio_id = p_lab;

  RETURN json_build_object('esito', 'ok', 'id', v_id, 'numero_lavoro', v_numero, 'stato', 'ricevuto');
END $$;

COMMENT ON FUNCTION public.lavoro_denti_sostituisci_atomica(uuid,uuid,jsonb,timestamptz) IS
  'Sostituzione integrale dei denti di un lavoro (spec §4). Unica penna su lavori_denti insieme a lavoro_crea_atomico. Mantiene in sincronia la denormalizzazione lavori.denti_coinvolti/mancanti/impianti, che la DdC legge fino all''ondata (c).';
COMMENT ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb) IS
  'Crea lavoro + denti in una sola transazione (spec §4, rischio R1): un colore perso in silenzio produrrebbe una Dichiarazione priva di un contenuto obbligatorio dell''Allegato XIII. NON verifica che cliente_id/paziente_id/tecnico_id/ciclo_id appartengano a p_lab: quella guardia è nella route.';

-- ============ Permessi: firme identiche alle definizioni ============
REVOKE EXECUTE ON FUNCTION public.lavoro_denti_sostituisci_atomica(uuid,uuid,jsonb,timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb)                          FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.lavoro_denti_sostituisci_atomica(uuid,uuid,jsonb,timestamptz) TO service_role;
GRANT  EXECUTE ON FUNCTION public.lavoro_crea_atomico(uuid,jsonb,jsonb)                          TO service_role;
