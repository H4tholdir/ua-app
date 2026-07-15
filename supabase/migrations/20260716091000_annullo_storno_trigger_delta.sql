-- Spec R1 §3.3 + §6 (D-2): contro-movimento a DELTA al posto del DELETE.
-- I lettori TS sono già deployati (Task 1) — ordine spec §3.5.

-- 1. CHECK tipo (DROP+ADD: lock + revalidation, tabella piccola — spec §3.3)
ALTER TABLE public.credito_clienti_movimenti
  DROP CONSTRAINT credito_clienti_movimenti_tipo_check;
ALTER TABLE public.credito_clienti_movimenti
  ADD CONSTRAINT credito_clienti_movimenti_tipo_check
  CHECK (tipo IN ('eccedenza','applicazione','rimborso','storno','annullo_storno'));

-- 2. CHECK shape: ramo annullo_storno (stessa shape di storno)
ALTER TABLE public.credito_clienti_movimenti
  DROP CONSTRAINT credito_clienti_movimenti_check;
ALTER TABLE public.credito_clienti_movimenti
  ADD CONSTRAINT credito_clienti_movimenti_check CHECK (
    (tipo = 'eccedenza'      AND pagamento_id IS NOT NULL AND fattura_id IS NULL AND lavoro_id IS NULL) OR
    (tipo = 'applicazione'   AND pagamento_id IS NULL AND (fattura_id IS NOT NULL) <> (lavoro_id IS NOT NULL)) OR
    (tipo = 'rimborso'       AND pagamento_id IS NULL AND fattura_id IS NULL AND lavoro_id IS NULL AND metodo IS NOT NULL) OR
    (tipo = 'storno'         AND pagamento_id IS NULL AND fattura_id IS NOT NULL AND lavoro_id IS NULL) OR
    (tipo = 'annullo_storno' AND pagamento_id IS NULL AND fattura_id IS NOT NULL AND lavoro_id IS NULL)
  );

-- 3. Trigger function riscritta: identica alla 20260715140000 salvo il punto 2
--    (delta invece di DELETE) e la scrittura eventi. Rollback = ri-eseguire la
--    versione della migration 20260715140000.
CREATE OR REPLACE FUNCTION public.annulla_effetti_storno_td04()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_lavoro_id uuid;
  v_rows int;
  v_delta numeric;
  v_cliente_id uuid;
BEGIN
  -- 1. Ri-abilita lo storno dell'originale (INVARIATO dalla 20260715140000,
  --    guardia anti-collisione con fatture_lavoro_attiva_unique inclusa) —
  --    MA il caso collisione ora scrive un evento (spec §6.1).
  UPDATE public.fatture o SET stornata_at = NULL
   WHERE o.id = NEW.fattura_collegata_id
     AND o.laboratorio_id = NEW.laboratorio_id
     AND NOT EXISTS (
       SELECT 1 FROM public.fatture c
        WHERE c.laboratorio_id = o.laboratorio_id
          AND c.lavoro_id IS NOT NULL
          AND c.lavoro_id = o.lavoro_id
          AND c.id <> o.id
          AND c.stato_sdi <> 'rifiutata'
          AND c.stornata_at IS NULL
     );
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    INSERT INTO public.fatture_sdi_eventi
      (laboratorio_id, fattura_id, origine, motivo)
    VALUES
      (NEW.laboratorio_id, NEW.fattura_collegata_id, 'trigger_td04', 'collisione_rifatturazione');
  END IF;

  -- 2. Contro-movimento a DELTA (spec §6.2 — bloccante panel: il NOT EXISTS
  --    lascerebbe credito fantasma dal secondo ciclo storno→rifiuto in poi).
  SELECT COALESCE(SUM(CASE tipo WHEN 'storno' THEN importo WHEN 'annullo_storno' THEN -importo END), 0),
         (array_agg(cliente_id ORDER BY created_at))[1]  -- min(uuid) non esiste in PG: primo cliente_id deterministico
    INTO v_delta, v_cliente_id
    FROM public.credito_clienti_movimenti
   WHERE laboratorio_id = NEW.laboratorio_id
     AND tipo IN ('storno','annullo_storno')
     AND fattura_id = NEW.fattura_collegata_id;

  IF v_delta > 0 THEN
    INSERT INTO public.credito_clienti_movimenti
      (laboratorio_id, cliente_id, tipo, fattura_id, importo, note, registrato_da)
    VALUES
      (NEW.laboratorio_id, v_cliente_id, 'annullo_storno', NEW.fattura_collegata_id, v_delta,
       'Annullo credito storno: TD04 ' || NEW.numero || ' rifiutato da SdI', NULL);

    INSERT INTO public.fatture_sdi_eventi
      (laboratorio_id, fattura_id, origine, motivo, lista_errori)
    VALUES
      (NEW.laboratorio_id, NEW.fattura_collegata_id, 'trigger_td04', 'annullo_credito_storno',
       jsonb_build_object('importo', v_delta, 'td04_id', NEW.id));
  END IF;

  -- 3. Ripristina lo stato fiscale del lavoro (INVARIATO).
  SELECT o.lavoro_id INTO v_lavoro_id
    FROM public.fatture o
   WHERE o.id = NEW.fattura_collegata_id
     AND o.laboratorio_id = NEW.laboratorio_id;

  IF v_lavoro_id IS NOT NULL THEN
    UPDATE public.lavori
       SET incluso_in_fattura = true, decisione_fatturazione = 'fatturare'
     WHERE id = v_lavoro_id AND laboratorio_id = NEW.laboratorio_id;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.annulla_effetti_storno_td04() FROM PUBLIC, anon, authenticated;
-- Il trigger trg_fatture_td04_rifiutata esistente punta già a questa funzione:
-- CREATE OR REPLACE non richiede DROP/CREATE TRIGGER (nessuna finestra).
