-- supabase/migrations/20260710092500_pg_net_tick_sorveglianza.sql
-- Spec 4a §4 M7-M9, §9-§10 — tick HTTP, dead-man's switch, pulizia P2-9.

-- M7a: pg_net + hardening grants NELLA STESSA MIGRATION (requisito sicurezza #3:
-- authenticated con net.http_post = SSRF dal database)
CREATE EXTENSION IF NOT EXISTS pg_net;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA net FROM anon, authenticated;

-- M7b: wrapper tick — secret e URL SOLO dal Vault a runtime (mai in cron.job.command,
-- mai in questa migration). EXECUTE a nessun ruolo applicativo, nemmeno service_role:
-- la invoca solo il job pg_cron (che gira come proprietario del job).
CREATE OR REPLACE FUNCTION public.outbox_tick()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'outbox_cron_secret';
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'outbox_cron_url';
  IF v_secret IS NULL OR v_url IS NULL THEN
    RAISE WARNING 'outbox_tick: outbox_cron_secret/outbox_cron_url mancanti nel Vault';
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('x-cron-secret', v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_tick() FROM PUBLIC, anon, authenticated, service_role;

-- M8: sorveglianza SQL pura (sopravvive alla rottura del canale HTTP), dedup su alert aperti
CREATE OR REPLACE FUNCTION public.outbox_sorveglianza()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  -- (a) coda ferma: heartbeat vecchio E lavoro in coda scaduto
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'coda_ferma', 'ultimo tick: ' || COALESCE(h.last_tick_at::text, 'mai')
  FROM outbox_heartbeat h
  WHERE h.id = 1
    AND (h.last_tick_at IS NULL OR h.last_tick_at < now() - interval '5 minutes')
    AND EXISTS (SELECT 1 FROM fatture_outbox WHERE stato = 'in_attesa' AND emetti_dopo <= now())
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'coda_ferma' AND risolto_at IS NULL);

  -- (b) entry stantie (> 15 min oltre emetti_dopo)
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'entry_stantia', count(*)::text || ' entry in attesa da oltre 15 minuti'
  FROM fatture_outbox
  WHERE stato = 'in_attesa' AND emetti_dopo < now() - interval '15 minutes'
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'entry_stantia' AND risolto_at IS NULL)
  HAVING count(*) > 0;

  -- (c) entry in errore definitivo
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'entry_errore', count(*)::text || ' entry in errore definitivo'
  FROM fatture_outbox
  WHERE stato = 'errore'
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'entry_errore' AND risolto_at IS NULL)
  HAVING count(*) > 0;

  -- (d) riconciliazione: consegnato fatturabile senza entry né fattura (rete di sicurezza P2-4)
  INSERT INTO outbox_alerts (tipo, dettaglio)
  SELECT 'lavoro_senza_fattura', 'lavori: ' || string_agg(l.numero_lavoro, ', ')
  FROM lavori l
  JOIN clienti c ON c.id = l.cliente_id
  WHERE l.stato = 'consegnato' AND l.deleted_at IS NULL
    AND l.consegna_completata_at < now() - interval '15 minutes'
    AND (c.codice_sdi IS NOT NULL OR c.pec IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM fatture_outbox o WHERE o.lavoro_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM fatture f WHERE f.lavoro_id = l.id)
    AND NOT EXISTS (SELECT 1 FROM outbox_alerts WHERE tipo = 'lavoro_senza_fattura' AND risolto_at IS NULL)
  HAVING count(*) > 0;
END;
$$;
REVOKE ALL ON FUNCTION public.outbox_sorveglianza() FROM PUBLIC, anon, authenticated, service_role;

-- Job pg_cron (comandi SENZA segreti)
SELECT cron.schedule('outbox-emissione-tick', '* * * * *', 'SELECT public.outbox_tick()');
SELECT cron.schedule('outbox-sorveglianza', '*/10 * * * *', 'SELECT public.outbox_sorveglianza()');

-- M9: pulizia P2-9 — overload orfano a 1 argomento (usa get_lab_id(), NULL sotto service_role)
DROP FUNCTION IF EXISTS public.consegna_lavoro_lock(uuid);
