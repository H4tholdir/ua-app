-- RPC atomica: emissione Nota di Credito TD04 (claim-first + reset fiscale lavoro).
-- Spec: docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md
-- Dipende da: 20260715090000_nota_credito_td04.sql (colonne + shape check TD04)
--
-- NON genera XML (fuori RPC, Task 6). Blocco 3 (credito cliente se pagata)
-- resta TODO esplicito: Task 4 lo riempie con una migration additiva.

CREATE OR REPLACE FUNCTION public.emetti_nota_credito_atomica(
  p_originale_id uuid, p_causale text, p_laboratorio_id uuid
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_orig public.fatture%ROWTYPE;
  v_rows int;
  v_prog int; v_anno int; v_numero text; v_td04_id uuid;
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

  -- 3. Credito cliente se pagata (Task 4 riempie questo blocco).
  -- fatture NON ha una colonna importo_pagato: il campo booleano è
  -- v_orig.pagata, l'importo incassato vive per-scadenza in
  -- fatture_pagamenti.importo_pagato. Task 4: se v_orig.pagata, inserire un
  -- movimento tipo 'storno' sommando fatture_pagamenti.importo_pagato per
  -- v_orig.id (o v_orig.totale come fallback se lo storico rate non torna).

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
