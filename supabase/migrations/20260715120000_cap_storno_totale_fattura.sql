-- Fix review Task 4 (Nota di Credito TD04): cap del credito 'storno' al
-- totale della fattura originale.
--
-- Bug: in caso di SOVRAPAGAMENTO (totale=100, cliente paga 150) il flusso
-- registra-pagamento.ts salva il pagamento attivo per l'intero importo (150)
-- E un movimento 'eccedenza' per il surplus (50). Il Blocco 3 senza cap
-- sommava 150 → storno 150 + eccedenza 50 ancora valida (pagamento attivo)
-- = credito 200 a fronte di 150 realmente incassati.
-- Fix: v_pagato = LEAST(incassato, v_orig.totale) — il surplus resta
-- rappresentato UNA volta sola, dal movimento 'eccedenza' originario.
--
-- Additiva rispetto a 20260715110000_credito_storno_nota_credito.sql (già
-- applicata in prod): solo CREATE OR REPLACE della funzione, corpo completo,
-- unica differenza il cap. Nessun CHECK toccato.

CREATE OR REPLACE FUNCTION public.emetti_nota_credito_atomica(
  p_originale_id uuid, p_causale text, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_orig public.fatture%ROWTYPE;
  v_rows int;
  v_prog int; v_anno int; v_numero text; v_td04_id uuid;
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
  v_anno := EXTRACT(YEAR FROM now())::int;

  -- 1. Progressivo: stessa RPC/serie condivisa delle fatture TD01
  -- (public.genera_progressivo — upsert atomico su progressivi_anno, vedi
  -- supabase/schema.sql e uso identico in outbox_prepara_draft, Spec 4a §8).
  v_prog := public.genera_progressivo(p_laboratorio_id, 'fattura', v_anno);
  v_numero := v_anno::text || '-' || lpad(v_prog::text, 4, '0');

  -- 2. Insert draft TD04 (snapshot congelato dall'originale; lavoro_id NULL).
  -- data = current_date (la data dell'originale vive SOLO in collegata_data);
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
    p_laboratorio_id, v_orig.cliente_id, v_numero, v_anno, v_prog, current_date, 'TD04',
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

REVOKE ALL ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.emetti_nota_credito_atomica(uuid, text, uuid) TO service_role;
