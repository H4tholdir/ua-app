-- Date fiscali Europe/Rome (fix 20/07/2026, panel advisor 3× CONFERMATA CON RISERVE):
-- EXTRACT(year FROM now()) e CURRENT_DATE sul DB (UTC) datavano draft fattura e
-- nota di credito al giorno/anno UTC — sbagliato tra le 00:00 e le 02:00 di
-- Roma, e a capodanno (23:00-00:00 UTC del 31/12) sbagliava anche l'anno del
-- numero e la serie progressiva. Ora: un solo now() → v_data (giorno civile
-- di Roma) → v_anno derivato da v_data (coerenza numero/serie/data garantita).
--
-- ROLLBACK = roll-forward (niente down): i body precedenti sono in git —
--   outbox_prepara_draft:        supabase/migrations/20260710092000_rpc_outbox_claim_prepara.sql (main c2df1a2)
--   emetti_nota_credito_atomica: supabase/migrations/20260715120000_cap_storno_totale_fattura.sql (main c2df1a2)
-- NB: outbox_claim_batch NON è toccata (nessuna data lì).

CREATE OR REPLACE FUNCTION public.outbox_prepara_draft(p_entry_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_entry record;
  v_lavoro record;
  v_rows int;
  v_data date;
  v_anno int;
  v_prog int;
  v_numero text;
  v_fattura_id uuid;
BEGIN
  SELECT * INTO v_entry FROM fatture_outbox WHERE id = p_entry_id FOR UPDATE;
  IF NOT FOUND OR v_entry.stato <> 'in_lavorazione' THEN
    RETURN json_build_object('esito', 'entry_non_claimata');
  END IF;

  -- Ripresa idempotente post-crash: il draft esiste già, riusalo.
  IF v_entry.fattura_id IS NOT NULL THEN
    RETURN json_build_object('esito', 'ok', 'fattura_id', v_entry.fattura_id, 'ripresa', true);
  END IF;

  SELECT id, stato, deleted_at, decisione_fatturazione, incluso_in_fattura, cliente_id INTO v_lavoro
  FROM lavori
  WHERE id = v_entry.lavoro_id AND laboratorio_id = v_entry.laboratorio_id
  FOR UPDATE;
  IF NOT FOUND OR v_lavoro.deleted_at IS NOT NULL OR v_lavoro.stato <> 'consegnato' THEN
    RETURN json_build_object('esito', 'lavoro_non_consegnato');
  END IF;

  -- D3 "emetti salvo rifiuto"
  IF v_lavoro.decisione_fatturazione = 'non_fatturare' THEN
    RETURN json_build_object('esito', 'saltata_decisione');
  END IF;

  -- Claim atomico anti doppia-fatturazione (pattern batch/route.ts)
  UPDATE lavori SET incluso_in_fattura = true
  WHERE id = v_lavoro.id AND laboratorio_id = v_entry.laboratorio_id
    AND incluso_in_fattura = false;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN json_build_object('esito', 'gia_fatturato');
  END IF;

  -- SOLO QUI si consuma il progressivo (P2-5); data/anno congelati sul draft.
  -- Fix 20/07: giorno civile di Roma, un solo now() — a capodanno l'anno UTC
  -- resterebbe indietro di 1-2h e la fattura finirebbe nella serie sbagliata.
  v_data := (now() AT TIME ZONE 'Europe/Rome')::date;
  v_anno := EXTRACT(year FROM v_data)::int;
  v_prog := public.genera_progressivo(v_entry.laboratorio_id, 'fattura', v_anno);
  v_numero := v_anno::text || '-' || lpad(v_prog::text, 4, '0');

  -- placeholder '' per draft: colonne NOT NULL senza default (pattern batch/route.ts)
  INSERT INTO fatture (laboratorio_id, cliente_id, lavoro_id, numero, anno, progressivo,
                       data, tipo_documento, stato_sdi, imponibile, iva_importo, bollo, totale,
                       cliente_denominazione, cliente_indirizzo)
  VALUES (v_entry.laboratorio_id, v_lavoro.cliente_id, v_entry.lavoro_id, v_numero, v_anno, v_prog,
          v_data, 'TD01', 'draft', 0, 0, 0, 0, '', '')
  RETURNING id INTO v_fattura_id;

  UPDATE fatture_outbox SET fattura_id = v_fattura_id, updated_at = now() WHERE id = p_entry_id;

  RETURN json_build_object('esito', 'ok', 'fattura_id', v_fattura_id, 'ripresa', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.emetti_nota_credito_atomica(
  p_originale_id uuid, p_causale text, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_orig public.fatture%ROWTYPE;
  v_rows int;
  v_prog int; v_data date; v_anno int; v_numero text; v_td04_id uuid;
  v_pagato numeric(10,2);
BEGIN
  -- 0. Claim winner-takes-all: gate stato_sdi pragmatico (spec §7.3).
  -- Il WHERE stornata_at IS NULL serializza i concorrenti sulla riga: solo
  -- il primo UPDATE vede la condizione vera, il secondo trova già stornata_at
  -- valorizzato e aggiorna 0 righe → non_stornabile.
  UPDATE public.fatture SET stornata_at = now()
   WHERE id = p_originale_id AND laboratorio_id = p_laboratorio_id
     AND stornata_at IS NULL AND tipo_documento = 'TD01'
     AND stato_sdi IN ('smtp_inviata','pec_consegnata','ricevuta_sdi','accettata','scaduta');
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    -- Distingue "non esiste/non è di questo laboratorio" da "esiste ma il
    -- gate/claim non è passato" (interfaccia Task 3: esiti ok/non_stornabile/non_trovato).
    IF NOT EXISTS (
      SELECT 1 FROM public.fatture WHERE id = p_originale_id AND laboratorio_id = p_laboratorio_id
    ) THEN
      RETURN json_build_object('esito', 'non_trovato');
    END IF;
    RETURN json_build_object('esito', 'non_stornabile');
  END IF;

  SELECT * INTO v_orig FROM public.fatture
   WHERE id = p_originale_id AND laboratorio_id = p_laboratorio_id;
  -- Fix 20/07: giorno civile di Roma, un solo now() (vedi outbox_prepara_draft).
  v_data := (now() AT TIME ZONE 'Europe/Rome')::date;
  v_anno := EXTRACT(year FROM v_data)::int;

  -- 1. Progressivo: stessa RPC/serie condivisa delle fatture TD01
  -- (public.genera_progressivo — upsert atomico su progressivi_anno, vedi
  -- supabase/schema.sql e uso identico in outbox_prepara_draft, Spec 4a §8).
  v_prog := public.genera_progressivo(p_laboratorio_id, 'fattura', v_anno);
  v_numero := v_anno::text || '-' || lpad(v_prog::text, 4, '0');

  -- 2. Insert draft TD04 (snapshot congelato dall'originale; lavoro_id NULL).
  -- data = v_data (la data dell'originale vive SOLO in collegata_data);
  -- imponibile = v_orig.imponibile (snapshot positivo, mai derivato dal lavoro).
  -- Nota: il trigger trg_fatture_bollo (BEFORE INSERT) ricalcola
  -- bollo/iva_importo/totale/imponibile_netto dalla configurazione per-lab
  -- (soglia_bollo/importo_bollo/bollo_default_attivo, default 77.47/2.00/true)
  -- e sovrascrive i valori qui sotto: per i laboratori a configurazione di
  -- default coincide con la formula esplicita richiesta dalla spec.
  INSERT INTO public.fatture (
    laboratorio_id, cliente_id, numero, anno, progressivo, data, tipo_documento,
    stato_sdi, imponibile, iva_percentuale, iva_importo, bollo, totale,
    codice_iva, natura_iva,
    fattura_collegata_id, collegata_numero, collegata_data, causale_storno,
    cliente_denominazione, cliente_piva, cliente_cf, cliente_indirizzo,
    cliente_codice_sdi, cliente_pec, lavoro_id
  ) VALUES (
    p_laboratorio_id, v_orig.cliente_id, v_numero, v_anno, v_prog, v_data, 'TD04',
    'draft', v_orig.imponibile, 0, 0,
    (CASE WHEN v_orig.imponibile > 77.47 THEN 2.00 ELSE 0 END),
    v_orig.imponibile + (CASE WHEN v_orig.imponibile > 77.47 THEN 2.00 ELSE 0 END),
    'N4', 'N4',
    p_originale_id, v_orig.numero, v_orig.data, p_causale,
    v_orig.cliente_denominazione, v_orig.cliente_piva, v_orig.cliente_cf, v_orig.cliente_indirizzo,
    v_orig.cliente_codice_sdi, v_orig.cliente_pec, NULL
  ) RETURNING id INTO v_td04_id;

  -- 3. Credito cliente se incassata (Task 4). Quanto il cliente ha realmente
  -- versato sull'originale — pagamenti ATTIVI (gli annullati/sostituiti non
  -- contano) + credito già applicato alla fattura (tornando credito, il
  -- cliente non lo perde) — diventa credito disponibile. Stessa formula del
  -- trigger ricalcola_pagamento_fattura (fonte di fatture.importo_pagato),
  -- ricalcolata inline per non dipendere dalla colonna derivata. MAI da
  -- fatture_pagamenti (scadenzario legacy, mai scritto dal flusso B2).
  SELECT COALESCE((SELECT SUM(p.importo) FROM public.pagamenti p
                    WHERE p.fattura_id = p_originale_id
                      AND p.laboratorio_id = p_laboratorio_id
                      AND p.stato = 'attivo'), 0)
       + COALESCE((SELECT SUM(m.importo) FROM public.credito_clienti_movimenti m
                    WHERE m.fattura_id = p_originale_id
                      AND m.laboratorio_id = p_laboratorio_id
                      AND m.tipo = 'applicazione'), 0)
    INTO v_pagato;

  -- Cap al totale (fix review Task 4): in caso di sovrapagamento il ledger
  -- registra il pagamento attivo per l'INTERO importo E un movimento
  -- 'eccedenza' per il surplus — che resta valido dopo lo storno (il
  -- pagamento sorgente è ancora attivo). Senza cap il surplus verrebbe
  -- contato due volte (dentro lo storno E come eccedenza).
  v_pagato := LEAST(v_pagato, v_orig.totale);

  IF v_pagato > 0 THEN
    -- Movimento DEDICATO 'storno' (mai 'eccedenza'): nessun pagamento
    -- sorgente (pagamento_id NULL → il filtro anti-credito-fantasma non lo
    -- gatea), fattura_id = originale stornata per audit, registrato_da NULL
    -- = sistema.
    INSERT INTO public.credito_clienti_movimenti (
      laboratorio_id, cliente_id, tipo, importo, fattura_id, note
    ) VALUES (
      p_laboratorio_id, v_orig.cliente_id, 'storno', v_pagato, p_originale_id,
      'Storno nota di credito ' || v_numero || ' su fattura ' || v_orig.numero
    );
  END IF;

  -- 4. Reset lavoro SOLO fiscale (se l'originale aveva un lavoro).
  -- MAI toccare stato/conformato/data_consegna_effettiva/dichiarazioni_conformita (MDR).
  IF v_orig.lavoro_id IS NOT NULL THEN
    UPDATE public.lavori
       SET incluso_in_fattura = false, decisione_fatturazione = 'in_attesa'
     WHERE id = v_orig.lavoro_id AND laboratorio_id = p_laboratorio_id;
  END IF;

  RETURN json_build_object('esito', 'ok', 'td04_id', v_td04_id);
END;
$$;

-- Difesa in profondità (idempotente — i grant sopravvivono al REPLACE ma si ribadiscono):
REVOKE ALL ON FUNCTION public.outbox_prepara_draft(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outbox_prepara_draft(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) TO service_role;
